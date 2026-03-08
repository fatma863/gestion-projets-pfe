<?php

namespace App\Services;

use App\Models\User;
use App\Models\Task;
use App\Models\Project;
use Illuminate\Support\Collection;

class WorkloadService
{
    /**
     * Analyze workload for all members of a project's team.
     */
    public function analyzeProject(Project $project): array
    {
        $project->load('team.activeMembers');
        if (!$project->team) {
            return ['members' => [], 'alerts' => []];
        }

        $members = $project->team->activeMembers;
        $results = $members->map(fn (User $u) => $this->analyzeUser($u));

        $alerts = $results->filter(fn ($r) => $r['overloaded'])->values()->toArray();

        return [
            'members' => $results->values()->toArray(),
            'alerts'  => $alerts,
            'summary' => [
                'total_members'      => $members->count(),
                'overloaded_count'   => count($alerts),
                'avg_utilization'    => $results->avg('utilization_percent'),
            ],
        ];
    }

    /**
     * Analyze workload for a single user.
     */
    public function analyzeUser(User $user): array
    {
        $activeTasks = $user->assignedTasks()
            ->where('progress_percent', '<', 100)
            ->with('project:id,name,code')
            ->get();

        $capacity = (float) ($user->pivot->capacity_hours_per_week ?? $user->capacity_hours_per_week ?? 40);
        $totalEstimated = $activeTasks->sum(fn ($t) => $t->estimated_hours ?? 8);
        $weeklyLoad = $totalEstimated / 4; // rough monthly → weekly

        $utilization = $capacity > 0 ? round(($weeklyLoad / $capacity) * 100) : 0;

        // Count upcoming deadlines (next 7 days)
        $now = now();
        $upcomingDeadlines = $activeTasks->filter(function ($t) use ($now) {
            return $t->due_date && $t->due_date->between($now, $now->copy()->addDays(7));
        })->count();

        // Overdue count
        $overdueCount = $activeTasks->filter(function ($t) use ($now) {
            return $t->due_date && $t->due_date->lt($now);
        })->count();

        // Overload detection
        $reasons = [];
        if ($activeTasks->count() >= 8) {
            $reasons[] = 'Trop de tâches actives (' . $activeTasks->count() . ')';
        }
        if ($utilization > 100) {
            $reasons[] = 'Charge estimée dépasse la capacité (' . $utilization . '%)';
        }
        if ($upcomingDeadlines >= 3) {
            $reasons[] = $upcomingDeadlines . ' échéances dans les 7 prochains jours';
        }
        if ($overdueCount > 0) {
            $reasons[] = $overdueCount . ' tâche(s) en retard';
        }

        $overloaded = !empty($reasons);

        return [
            'user_id'              => $user->id,
            'name'                 => $user->name,
            'email'                => $user->email,
            'capacity_hours'       => $capacity,
            'active_tasks_count'   => $activeTasks->count(),
            'estimated_hours'      => round($totalEstimated, 1),
            'weekly_load_hours'    => round($weeklyLoad, 1),
            'utilization_percent'  => min($utilization, 200),
            'upcoming_deadlines'   => $upcomingDeadlines,
            'overdue_count'        => $overdueCount,
            'overloaded'           => $overloaded,
            'overload_reasons'     => $reasons,
        ];
    }
}
