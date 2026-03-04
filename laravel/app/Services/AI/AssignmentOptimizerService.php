<?php

namespace App\Services\AI;

use App\Models\AiRecommendation;
use App\Models\Project;
use App\Models\Task;
use App\Models\User;
use Illuminate\Support\Collection;

class AssignmentOptimizerService
{
    /**
     * Suggest the best assignee(s) for a given task
     * based on workload, skills and performance history.
     */
    public function suggest(Task $task): array
    {
        $project = $task->project()->with('team.activeMembers')->first();

        if (!$project || !$project->team) {
            return $this->emptyResult($task, 'Aucune équipe associée au projet.');
        }

        $candidates = $project->team->activeMembers;

        if ($candidates->isEmpty()) {
            return $this->emptyResult($task, 'Aucun membre actif dans l\'équipe.');
        }

        $scored = $candidates->map(function (User $user) use ($task, $project) {
            $scores = [];

            // 1. Workload score (lower workload = higher score)
            $workloadScore = $this->workloadScore($user, $project);
            $scores['workload'] = $workloadScore;

            // 2. Skill match score
            $skillScore = $this->skillMatchScore($user, $task);
            $scores['skill_match'] = $skillScore;

            // 3. Experience score (completed similar tasks in this project)
            $experienceScore = $this->experienceScore($user, $task);
            $scores['experience'] = $experienceScore;

            // 4. Availability score (capacity vs current allocation)
            $availabilityScore = $this->availabilityScore($user);
            $scores['availability'] = $availabilityScore;

            // Weighted total
            $total = round(
                $workloadScore * 0.30 +
                $skillScore * 0.25 +
                $experienceScore * 0.25 +
                $availabilityScore * 0.20,
                1
            );

            return [
                'user_id'    => $user->id,
                'name'       => $user->name,
                'email'      => $user->email,
                'scores'     => $scores,
                'total'      => $total,
                'capacity_hours' => (float) $user->pivot->capacity_hours_per_week,
                'skills'     => json_decode($user->pivot->skills ?? '[]', true),
            ];
        });

        // Sort by total score descending
        $ranked = $scored->sortByDesc('total')->values()->toArray();

        $confidence = $this->calculateConfidence($ranked, $candidates->count());

        $result = [
            'suggestions'  => array_slice($ranked, 0, 5),
            'best_match'   => $ranked[0] ?? null,
            'confidence'   => $confidence,
            'criteria'     => [
                'workload_weight'     => '30%',
                'skill_match_weight'  => '25%',
                'experience_weight'   => '25%',
                'availability_weight' => '20%',
            ],
        ];

        AiRecommendation::create([
            'task_id'     => $task->id,
            'project_id'  => $task->project_id,
            'type'        => 'assignment',
            'input_data'  => [
                'task_id'    => $task->id,
                'title'      => $task->title,
                'complexity' => $task->complexity,
                'priority'   => $task->priority,
            ],
            'result_data' => $result,
            'confidence'  => $confidence,
        ]);

        return $result;
    }

    /**
     * Optimize assignments for all unassigned tasks in a project.
     */
    public function optimizeProject(Project $project): array
    {
        $unassigned = $project->tasks()
            ->where('progress_percent', '<', 100)
            ->whereDoesntHave('assignees')
            ->orderByDesc('priority')
            ->orderByDesc('complexity')
            ->get();

        $suggestions = [];
        foreach ($unassigned as $task) {
            $result = $this->suggest($task);
            $suggestions[] = [
                'task_id'   => $task->id,
                'title'     => $task->title,
                'priority'  => $task->priority,
                'complexity'=> $task->complexity,
                'best_match'=> $result['best_match'],
                'confidence'=> $result['confidence'],
            ];
        }

        return [
            'unassigned_count' => $unassigned->count(),
            'suggestions'      => $suggestions,
        ];
    }

    /**
     * Workload: fewer active tasks = higher score.
     */
    private function workloadScore(User $user, Project $project): float
    {
        $activeTasks = $user->assignedTasks()
            ->where('progress_percent', '<', 100)
            ->count();

        // 0 tasks = 100, 1 = 85, 2 = 70, ... max 10+
        return max(0, 100 - ($activeTasks * 15));
    }

    /**
     * Skill match: how well user skills match task title/description keywords.
     */
    private function skillMatchScore(User $user, Task $task): float
    {
        $userSkills = collect(json_decode($user->pivot->skills ?? '[]', true))
            ->map(fn ($s) => mb_strtolower($s));

        if ($userSkills->isEmpty()) {
            return 40; // neutral when no skills defined
        }

        $taskText = mb_strtolower($task->title . ' ' . ($task->description ?? ''));

        $matches = $userSkills->filter(function ($skill) use ($taskText) {
            return str_contains($taskText, $skill);
        })->count();

        if ($matches === 0) {
            return 20;
        }

        return min(100, 40 + ($matches / max(1, $userSkills->count())) * 60);
    }

    /**
     * Experience: has the user completed similar tasks (same complexity range)?
     */
    private function experienceScore(User $user, Task $task): float
    {
        $completedSimilar = $user->assignedTasks()
            ->where('progress_percent', 100)
            ->whereBetween('complexity', [max(1, $task->complexity - 2), $task->complexity + 2])
            ->count();

        return min(100, $completedSimilar * 25);
    }

    /**
     * Availability: capacity hours vs hours already allocated this week.
     */
    private function availabilityScore(User $user): float
    {
        $capacity = (float) ($user->pivot->capacity_hours_per_week ?? 40);

        $allocatedHours = $user->assignedTasks()
            ->where('progress_percent', '<', 100)
            ->get()
            ->sum(fn ($t) => ($t->estimated_hours ?? 8) * ($t->pivot->allocation_percent / 100));

        // Weekly allocation ratio
        $weeklyEstimate = $allocatedHours / 4; // rough month->week

        if ($capacity <= 0) {
            return 0;
        }

        $utilizationRatio = $weeklyEstimate / $capacity;

        if ($utilizationRatio >= 1) {
            return 0;
        }

        return round((1 - $utilizationRatio) * 100);
    }

    private function calculateConfidence(array $ranked, int $teamSize): float
    {
        if (empty($ranked)) {
            return 0.1;
        }

        $topScore = $ranked[0]['total'];
        $secondScore = $ranked[1]['total'] ?? 0;
        $gap = $topScore - $secondScore;

        // More confidence when: clear winner + bigger team + higher scores
        $confidence = 0.3;
        $confidence += min(0.3, $gap / 100);
        $confidence += min(0.2, $teamSize * 0.04);
        $confidence += min(0.2, $topScore / 500);

        return round(min(0.95, $confidence), 2);
    }

    private function emptyResult(Task $task, string $reason): array
    {
        return [
            'suggestions' => [],
            'best_match'  => null,
            'confidence'  => 0,
            'message'     => $reason,
        ];
    }
}
