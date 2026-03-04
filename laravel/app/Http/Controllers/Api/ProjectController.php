<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProjectResource;
use App\Http\Resources\ProjectMemberResource;
use App\Models\Project;
use App\Models\TaskStatus;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class ProjectController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Project::with('owner')
            ->withCount('members', 'tasks')
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->team_id, fn ($q, $t) => $q->where('team_id', $t))
            ->when($request->search, fn ($q, $s) => $q->where(function ($q2) use ($s) {
                $q2->where('name', 'like', "%{$s}%")
                   ->orWhere('code', 'like', "%{$s}%");
            }))
            ->orderByDesc('updated_at');

        if (!$user->hasRole('admin')) {
            $query->where(function ($q) use ($user) {
                $q->where('owner_id', $user->id)
                  ->orWhereHas('members', fn ($q2) => $q2->where('user_id', $user->id));
            });
        }

        $projects = $query->paginate($request->per_page ?? 15);

        return response()->json(ProjectResource::collection($projects)->response()->getData(true));
    }

    public function store(Request $request): JsonResponse
    {
        Gate::authorize('create', Project::class);

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:10|unique:projects,code',
            'description' => 'nullable|string',
            'team_id' => 'nullable|exists:teams,id',
            'status' => 'sometimes|in:planning,active,on_hold,completed,cancelled',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        $data['owner_id'] = $request->user()->id;
        $data['created_by'] = $request->user()->id;

        $project = Project::create($data);

        // Add creator as project owner member
        $project->members()->attach($request->user()->id, ['project_role' => 'owner']);

        // Create default Kanban statuses
        $defaultStatuses = [
            ['name' => 'À faire', 'color' => '#6B7280', 'order' => 0, 'is_default' => true],
            ['name' => 'En cours', 'color' => '#3B82F6', 'order' => 1],
            ['name' => 'En revue', 'color' => '#F59E0B', 'order' => 2],
            ['name' => 'Terminé', 'color' => '#10B981', 'order' => 3],
        ];
        foreach ($defaultStatuses as $status) {
            $project->statuses()->create($status);
        }

        $project->load('owner', 'members', 'statuses');

        return response()->json([
            'message' => 'Projet créé avec succès.',
            'project' => new ProjectResource($project),
        ], 201);
    }

    public function show(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('view', $project);

        $project->load('owner', 'team', 'members', 'statuses')
                ->loadCount('members', 'tasks');

        return response()->json(['project' => new ProjectResource($project)]);
    }

    public function update(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('update', $project);

        $data = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'code' => 'sometimes|required|string|max:10|unique:projects,code,' . $project->id,
            'description' => 'nullable|string',
            'team_id' => 'nullable|exists:teams,id',
            'status' => 'sometimes|in:planning,active,on_hold,completed,cancelled',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'owner_id' => 'sometimes|exists:users,id',
        ]);

        $project->update($data);
        $project->load('owner', 'team', 'members', 'statuses');

        return response()->json([
            'message' => 'Projet mis à jour.',
            'project' => new ProjectResource($project),
        ]);
    }

    public function destroy(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('delete', $project);

        $project->delete();

        return response()->json(['message' => 'Projet supprimé.']);
    }

    public function dashboard(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('view', $project);

        $tasks = $project->tasks()->with('status', 'assignees')->get();
        $statuses = $project->statuses;

        $totalTasks = $tasks->count();
        $completedTasks = $tasks->where('progress_percent', 100)->count();
        $overdueTasks = $tasks->filter(fn ($t) => $t->isOverdue())->count();
        $totalEstimated = $tasks->sum('estimated_hours');
        $totalActual = $tasks->sum('actual_hours');
        $avgProgress = $totalTasks > 0 ? round($tasks->avg('progress_percent'), 1) : 0;

        $tasksByStatus = $statuses->map(fn ($s) => [
            'status' => $s->name,
            'color' => $s->color,
            'count' => $tasks->where('status_id', $s->id)->count(),
        ]);

        $tasksByPriority = collect(['urgent', 'high', 'medium', 'low'])->map(fn ($p) => [
            'priority' => $p,
            'count' => $tasks->where('priority', $p)->count(),
        ]);

        return response()->json([
            'total_tasks' => $totalTasks,
            'completed_tasks' => $completedTasks,
            'overdue_tasks' => $overdueTasks,
            'avg_progress' => $avgProgress,
            'total_estimated_hours' => round($totalEstimated, 1),
            'total_actual_hours' => round($totalActual, 1),
            'tasks_by_status' => $tasksByStatus,
            'tasks_by_priority' => $tasksByPriority,
        ]);
    }

    public function members(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('view', $project);

        return response()->json([
            'members' => ProjectMemberResource::collection($project->members),
        ]);
    }

    public function addMember(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('update', $project);

        $data = $request->validate([
            'user_id' => 'required|exists:users,id',
            'project_role' => 'sometimes|string|in:owner,manager,developer,designer,tester,viewer',
        ]);

        $project->members()->syncWithoutDetaching([
            $data['user_id'] => ['project_role' => $data['project_role'] ?? 'member'],
        ]);

        return response()->json([
            'message' => 'Membre ajouté au projet.',
            'members' => ProjectMemberResource::collection($project->load('members')->members),
        ]);
    }

    public function removeMember(Request $request, Project $project, int $userId): JsonResponse
    {
        Gate::authorize('update', $project);

        if ($project->owner_id === $userId) {
            return response()->json(['message' => 'Impossible de retirer le propriétaire du projet.'], 422);
        }

        $project->members()->detach($userId);

        return response()->json(['message' => 'Membre retiré du projet.']);
    }
}
