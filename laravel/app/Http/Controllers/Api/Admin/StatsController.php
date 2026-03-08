<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Task;
use App\Models\Team;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class StatsController extends Controller
{
    public function index(): JsonResponse
    {
        $totalUsers    = User::count();
        $totalTeams    = Team::count();
        $totalProjects = Project::count();
        $totalTasks    = Task::count();

        $projectsByStatus = Project::selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        $tasksByPriority = Task::selectRaw('priority, COUNT(*) as count')
            ->groupBy('priority')
            ->pluck('count', 'priority');

        $recentUsers = User::with('roles')
            ->orderByDesc('created_at')
            ->limit(5)
            ->get()
            ->map(fn ($u) => [
                'id'    => $u->id,
                'name'  => $u->name,
                'email' => $u->email,
                'role'  => $u->getRoleNames()->first(),
                'created_at' => $u->created_at->toDateTimeString(),
            ]);

        $usersByRole = User::with('roles')->get()
            ->groupBy(fn ($u) => $u->getRoleNames()->first() ?? 'sans-rôle')
            ->map(fn ($group) => $group->count());

        // Projets en retard
        $overdueProjects = Project::where('status', 'active')
            ->whereNotNull('end_date')
            ->where('end_date', '<', now())
            ->count();

        // Tâches en retard globalement
        $overdueTasks = Task::where('progress_percent', '<', 100)
            ->whereNotNull('due_date')
            ->where('due_date', '<', now())
            ->count();

        // Tâches terminées vs total
        $completedTasks = Task::where('progress_percent', 100)->count();

        return response()->json([
            'total_users'        => $totalUsers,
            'total_teams'        => $totalTeams,
            'total_projects'     => $totalProjects,
            'total_tasks'        => $totalTasks,
            'overdue_projects'   => $overdueProjects,
            'overdue_tasks'      => $overdueTasks,
            'completed_tasks'    => $completedTasks,
            'projects_by_status' => $projectsByStatus,
            'tasks_by_priority'  => $tasksByPriority,
            'users_by_role'      => $usersByRole,
            'recent_users'       => $recentUsers,
        ]);
    }
}
