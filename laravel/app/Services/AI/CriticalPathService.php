<?php

namespace App\Services\AI;

use App\Models\Project;
use App\Models\Task;
use Illuminate\Support\Collection;

class CriticalPathService
{
    /**
     * Calculate the critical path for a project using dependency graph analysis.
     * Returns task IDs on the critical path and total project duration.
     */
    public function analyze(Project $project): array
    {
        $tasks = $project->tasks()
            ->where('progress_percent', '<', 100)
            ->with(['dependencies'])
            ->get()
            ->keyBy('id');

        if ($tasks->isEmpty()) {
            return ['critical_path' => [], 'total_duration_days' => 0, 'tasks' => []];
        }

        // Build adjacency: task -> depends on tasks (predecessors)
        $predecessors = [];
        $successors = [];
        foreach ($tasks as $task) {
            $predecessors[$task->id] = [];
            if (!isset($successors[$task->id])) {
                $successors[$task->id] = [];
            }
            foreach ($task->dependencies as $dep) {
                if ($tasks->has($dep->id)) {
                    $predecessors[$task->id][] = $dep->id;
                    $successors[$dep->id][] = $task->id;
                }
            }
        }

        // Calculate duration in days for each task
        $durations = [];
        foreach ($tasks as $task) {
            $start = $task->planned_start ?? $task->created_at;
            $end = $task->planned_end ?? $task->due_date ?? $task->created_at;
            $durations[$task->id] = max(1, $start->diffInDays($end));
        }

        // Forward pass: earliest start (ES) and earliest finish (EF)
        $es = [];
        $ef = [];
        $sorted = $this->topologicalSort($tasks->keys()->toArray(), $predecessors);

        foreach ($sorted as $id) {
            if (empty($predecessors[$id])) {
                $es[$id] = 0;
            } else {
                $es[$id] = 0;
                foreach ($predecessors[$id] as $predId) {
                    $es[$id] = max($es[$id], $ef[$predId] ?? 0);
                }
            }
            $ef[$id] = $es[$id] + $durations[$id];
        }

        // Project total duration
        $totalDuration = !empty($ef) ? max($ef) : 0;

        // Backward pass: latest start (LS) and latest finish (LF)
        $lf = [];
        $ls = [];
        foreach (array_reverse($sorted) as $id) {
            if (empty($successors[$id] ?? [])) {
                $lf[$id] = $totalDuration;
            } else {
                $lf[$id] = $totalDuration;
                foreach ($successors[$id] as $succId) {
                    $lf[$id] = min($lf[$id], $ls[$succId] ?? $totalDuration);
                }
            }
            $ls[$id] = $lf[$id] - $durations[$id];
        }

        // Critical path: tasks where slack (LS - ES) == 0
        $criticalTaskIds = [];
        $taskDetails = [];
        foreach ($sorted as $id) {
            $slack = ($ls[$id] ?? 0) - ($es[$id] ?? 0);
            $isCritical = abs($slack) < 0.001;
            if ($isCritical) {
                $criticalTaskIds[] = $id;
            }
            $task = $tasks->get($id);
            $taskDetails[] = [
                'task_id' => $id,
                'title' => $task->title,
                'duration_days' => $durations[$id],
                'es' => $es[$id] ?? 0,
                'ef' => $ef[$id] ?? 0,
                'ls' => $ls[$id] ?? 0,
                'lf' => $lf[$id] ?? 0,
                'slack' => $slack,
                'is_critical' => $isCritical,
            ];
        }

        return [
            'critical_path' => $criticalTaskIds,
            'total_duration_days' => $totalDuration,
            'tasks' => $taskDetails,
        ];
    }

    /**
     * Topological sort using Kahn's algorithm.
     */
    private function topologicalSort(array $nodeIds, array $predecessors): array
    {
        $inDegree = [];
        foreach ($nodeIds as $id) {
            $inDegree[$id] = count($predecessors[$id] ?? []);
        }

        $queue = [];
        foreach ($inDegree as $id => $deg) {
            if ($deg === 0) {
                $queue[] = $id;
            }
        }

        $sorted = [];
        $successorsMap = [];
        foreach ($nodeIds as $id) {
            foreach ($predecessors[$id] ?? [] as $predId) {
                $successorsMap[$predId][] = $id;
            }
        }

        while (!empty($queue)) {
            $current = array_shift($queue);
            $sorted[] = $current;
            foreach ($successorsMap[$current] ?? [] as $succId) {
                $inDegree[$succId]--;
                if ($inDegree[$succId] === 0) {
                    $queue[] = $succId;
                }
            }
        }

        // If cycle detected, add remaining nodes
        foreach ($nodeIds as $id) {
            if (!in_array($id, $sorted)) {
                $sorted[] = $id;
            }
        }

        return $sorted;
    }
}
