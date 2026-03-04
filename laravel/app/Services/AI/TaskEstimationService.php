<?php

namespace App\Services\AI;

use App\Models\AiRecommendation;
use App\Models\Task;
use Illuminate\Support\Facades\DB;

class TaskEstimationService
{
    /**
     * Estimate hours and duration for a task based on historical data
     * from similar tasks (same project, similar complexity/priority).
     */
    public function estimate(Task $task): array
    {
        $input = [
            'task_id'    => $task->id,
            'title'      => $task->title,
            'complexity' => $task->complexity,
            'priority'   => $task->priority,
            'project_id' => $task->project_id,
        ];

        // Find completed similar tasks in the same project
        $similarTasks = Task::where('project_id', $task->project_id)
            ->where('id', '!=', $task->id)
            ->where('progress_percent', 100)
            ->whereNotNull('actual_hours')
            ->where('actual_hours', '>', 0)
            ->get();

        // Also gather tasks from all projects for broader sample
        $allCompleted = Task::where('id', '!=', $task->id)
            ->where('progress_percent', 100)
            ->whereNotNull('actual_hours')
            ->where('actual_hours', '>', 0)
            ->get();

        $confidence = 0.3; // Base confidence
        $estimatedHours = null;
        $estimatedDays = null;
        $method = 'default';

        // Strategy 1: Same complexity in same project (highest confidence)
        $sameComplexity = $similarTasks->where('complexity', $task->complexity);
        if ($sameComplexity->count() >= 2) {
            $estimatedHours = round($sameComplexity->avg('actual_hours'), 1);
            $confidence = min(0.9, 0.6 + ($sameComplexity->count() * 0.05));
            $method = 'same_complexity_same_project';
        }
        // Strategy 2: Same complexity across all projects
        elseif ($allCompleted->where('complexity', $task->complexity)->count() >= 2) {
            $pool = $allCompleted->where('complexity', $task->complexity);
            $estimatedHours = round($pool->avg('actual_hours'), 1);
            $confidence = min(0.75, 0.45 + ($pool->count() * 0.03));
            $method = 'same_complexity_all_projects';
        }
        // Strategy 3: Same priority in same project
        elseif ($similarTasks->where('priority', $task->priority)->count() >= 2) {
            $pool = $similarTasks->where('priority', $task->priority);
            $estimatedHours = round($pool->avg('actual_hours'), 1);
            $confidence = min(0.65, 0.4 + ($pool->count() * 0.03));
            $method = 'same_priority_same_project';
        }
        // Strategy 4: Global average scaled by complexity
        elseif ($allCompleted->count() >= 3) {
            $globalAvg = $allCompleted->avg('actual_hours');
            $complexityFactor = $this->complexityFactor($task->complexity);
            $estimatedHours = round($globalAvg * $complexityFactor, 1);
            $confidence = 0.35;
            $method = 'global_average_scaled';
        }
        // Fallback: Complexity-based default
        else {
            $estimatedHours = $this->defaultEstimate($task->complexity);
            $confidence = 0.2;
            $method = 'complexity_default';
        }

        // Estimate days (assuming 6h productive per day)
        $estimatedDays = max(1, round($estimatedHours / 6, 1));

        $result = [
            'estimated_hours' => $estimatedHours,
            'estimated_days'  => $estimatedDays,
            'confidence'      => round($confidence, 2),
            'method'          => $method,
            'sample_size'     => $this->getSampleSize($method, $task, $similarTasks, $allCompleted),
            'comparable_range' => $this->getRange($method, $task, $similarTasks, $allCompleted),
        ];

        // Save recommendation
        AiRecommendation::create([
            'task_id'     => $task->id,
            'project_id'  => $task->project_id,
            'type'        => 'estimation',
            'input_data'  => $input,
            'result_data' => $result,
            'confidence'  => $result['confidence'],
        ]);

        return $result;
    }

    private function complexityFactor(int $complexity): float
    {
        // Scale: complexity 1-10, factor 0.3x to 3.0x
        return match(true) {
            $complexity <= 2 => 0.4,
            $complexity <= 4 => 0.7,
            $complexity <= 6 => 1.0,
            $complexity <= 8 => 1.6,
            default => 2.5,
        };
    }

    private function defaultEstimate(int $complexity): float
    {
        return match(true) {
            $complexity <= 2 => 4,
            $complexity <= 4 => 8,
            $complexity <= 6 => 16,
            $complexity <= 8 => 32,
            default => 60,
        };
    }

    private function getSampleSize(string $method, Task $task, $similar, $all): int
    {
        return match($method) {
            'same_complexity_same_project' => $similar->where('complexity', $task->complexity)->count(),
            'same_complexity_all_projects' => $all->where('complexity', $task->complexity)->count(),
            'same_priority_same_project'   => $similar->where('priority', $task->priority)->count(),
            'global_average_scaled'        => $all->count(),
            default => 0,
        };
    }

    private function getRange(string $method, Task $task, $similar, $all): ?array
    {
        $pool = match($method) {
            'same_complexity_same_project' => $similar->where('complexity', $task->complexity),
            'same_complexity_all_projects' => $all->where('complexity', $task->complexity),
            'same_priority_same_project'   => $similar->where('priority', $task->priority),
            'global_average_scaled'        => $all,
            default => collect(),
        };

        if ($pool->isEmpty()) {
            return null;
        }

        return [
            'min' => round($pool->min('actual_hours'), 1),
            'max' => round($pool->max('actual_hours'), 1),
        ];
    }
}
