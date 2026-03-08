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
use App\Services\NotificationService;
use App\Services\ActivityLogService;

class ProjectController extends Controller
{
    /**
     * List users with manager role — for admin project form dropdown.
     */
    public function managers(Request $request): JsonResponse
    {
        $managers = \App\Models\User::role('manager')
            ->select('id', 'name', 'email')
            ->orderBy('name')
            ->get();

        return response()->json(['managers' => $managers]);
    }

    /**
     * Search users — for member addition dropdown.
     */
    public function searchUsers(Request $request): JsonResponse
    {
        $query = \App\Models\User::select('id', 'name', 'email')
            ->orderBy('name');

        if ($request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        return response()->json(['users' => $query->limit(50)->get()]);
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Project::with('owner', 'manager')
            ->withCount('members', 'tasks')
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->team_id, fn ($q, $t) => $q->where('team_id', $t))
            ->when($request->search, fn ($q, $s) => $q->where(function ($q2) use ($s) {
                $q2->where('name', 'like', "%{$s}%")
                   ->orWhere('code', 'like', "%{$s}%");
            }))
            ->orderByDesc('updated_at');

        if ($user->hasRole('admin')) {
            // Admin sees all projects
        } elseif ($user->hasRole('manager')) {
            // Manager sees projects they manage or are a member of
            $query->where(function ($q) use ($user) {
                $q->where('manager_id', $user->id)
                  ->orWhere('owner_id', $user->id)
                  ->orWhereHas('members', fn ($q2) => $q2->where('user_id', $user->id));
            });
        } else {
            // Member / viewer sees only projects they belong to
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

        $user = $request->user();
        $isAdmin = $user->hasRole('admin');

        $rules = [
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:10|unique:projects,code',
            'description' => 'nullable|string',
            'team_id' => 'nullable|exists:teams,id',
            'status' => 'sometimes|in:planning,active,on_hold,completed,cancelled',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'member_ids' => 'nullable|array',
            'member_ids.*' => 'exists:users,id',
        ];

        // Admin must choose a manager; manager auto-assigns
        if ($isAdmin) {
            $rules['manager_id'] = 'required|exists:users,id';
        } else {
            $rules['manager_id'] = 'nullable';
        }

        $data = $request->validate($rules);

        // Validate that manager_id actually references a user with manager role
        if ($isAdmin && !empty($data['manager_id'])) {
            $managerUser = \App\Models\User::find($data['manager_id']);
            if (!$managerUser || !$managerUser->hasRole('manager')) {
                return response()->json([
                    'message' => 'Le manager sélectionné n\'est pas valide.',
                    'errors' => ['manager_id' => ['L\'utilisateur sélectionné n\'a pas le rôle manager.']],
                ], 422);
            }
        }

        // For non-admin (manager), auto-assign themselves
        if (!$isAdmin) {
            $data['manager_id'] = $user->id;
        }

        $memberIds = $data['member_ids'] ?? [];
        unset($data['member_ids']);

        if (!empty($data['team_id'])) {
            $isMember = $user->hasRole('admin')
                || $user->teams()->where('teams.id', $data['team_id'])->exists();
            if (!$isMember) {
                abort(403, 'Vous n\'êtes pas membre de cette équipe.');
            }
        }

        $data['owner_id'] = $user->id;
        $data['created_by'] = $user->id;

        $project = Project::create($data);

        // Add creator as project owner member
        $project->members()->attach($user->id, ['project_role' => 'owner']);

        // If admin created for a different manager, add that manager as member too
        if ($isAdmin && $data['manager_id'] && (int) $data['manager_id'] !== $user->id) {
            $project->members()->syncWithoutDetaching([
                $data['manager_id'] => ['project_role' => 'manager'],
            ]);
        }

        // Add selected members
        foreach ($memberIds as $memberId) {
            if ((int) $memberId !== $user->id && (int) $memberId !== (int) ($data['manager_id'] ?? 0)) {
                $project->members()->syncWithoutDetaching([
                    $memberId => ['project_role' => 'developer'],
                ]);
            }
        }

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

        $project->load('owner', 'manager', 'members', 'statuses');

        NotificationService::projectCreated($project);
        ActivityLogService::projectCreated($project);

        return response()->json([
            'message' => 'Projet créé avec succès.',
            'project' => new ProjectResource($project),
        ], 201);
    }

    public function show(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('view', $project);

        $project->load('owner', 'manager', 'team', 'members', 'statuses')
                ->loadCount('members', 'tasks');

        return response()->json(['project' => new ProjectResource($project)]);
    }

    public function update(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('update', $project);

        $user = $request->user();
        $isAdmin = $user->hasRole('admin');

        $rules = [
            'name' => 'sometimes|required|string|max:255',
            'code' => 'sometimes|required|string|max:10|unique:projects,code,' . $project->id,
            'description' => 'nullable|string',
            'team_id' => 'nullable|exists:teams,id',
            'status' => 'sometimes|in:planning,active,on_hold,completed,cancelled',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'owner_id' => 'sometimes|exists:users,id',
        ];

        // Only admin can change the manager
        if ($isAdmin) {
            $rules['manager_id'] = 'sometimes|exists:users,id';
        }

        $data = $request->validate($rules);

        // Validate manager role if changing manager_id
        if ($isAdmin && !empty($data['manager_id'])) {
            $managerUser = \App\Models\User::find($data['manager_id']);
            if (!$managerUser || !$managerUser->hasRole('manager')) {
                return response()->json([
                    'message' => 'Le manager sélectionné n\'est pas valide.',
                    'errors' => ['manager_id' => ['L\'utilisateur sélectionné n\'a pas le rôle manager.']],
                ], 422);
            }
        }

        // Non-admin cannot change manager_id
        if (!$isAdmin) {
            unset($data['manager_id']);
        }

        $project->update($data);
        $project->load('owner', 'manager', 'team', 'members', 'statuses');

        NotificationService::projectUpdated($project);

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

        ActivityLogService::memberAdded($project, $data['user_id'], $data['project_role'] ?? 'member');

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

        ActivityLogService::memberRemoved($project, $userId);

        return response()->json(['message' => 'Membre retiré du projet.']);
    }
}
