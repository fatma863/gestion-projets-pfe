<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Task\StoreTaskRequest;
use App\Http\Requests\Task\UpdateTaskRequest;
use App\Http\Resources\AttachmentResource;
use App\Http\Resources\CommentResource;
use App\Http\Resources\TaskAssigneeResource;
use App\Http\Resources\TaskDependencyResource;
use App\Http\Resources\TaskResource;
use App\Http\Resources\TimeEntryResource;
use App\Models\Attachment;
use App\Models\Project;
use App\Models\Task;
use App\Models\TaskAssignment;
use App\Models\TaskComment;
use App\Models\TimeEntry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use App\Services\NotificationService;
use App\Services\ActivityLogService;
use App\Services\AI\TaskEstimationService;
use App\Services\AI\DelayRiskService;

class TaskController extends Controller
{
    // ─── ALL USER TASKS (cross-project) ─────────────────

    public function myTasks(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Task::with(['status', 'creator', 'assignees', 'project:id,name,code'])
            ->when($request->filled('priority'), fn ($q) => $q->where('priority', $request->priority))
            ->when($request->filled('search'), fn ($q) => $q->where('title', 'like', "%{$request->search}%"))
            ->orderByDesc('updated_at');

        if ($user->hasRole('admin')) {
            // Admin sees all tasks
        } else {
            // Other roles: tasks from their projects or assigned to them
            $query->where(function ($q) use ($user) {
                $q->whereHas('assignees', fn ($q2) => $q2->where('users.id', $user->id))
                  ->orWhere('created_by', $user->id)
                  ->orWhereHas('project', fn ($q2) =>
                      $q2->whereHas('members', fn ($q3) => $q3->where('user_id', $user->id))
                  );
            });
        }

        $tasks = $query->get();

        return response()->json(['tasks' => TaskResource::collection($tasks)]);
    }

    // ─── CRUD ────────────────────────────────────────────

    public function index(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('view', $project);

        $query = $project->tasks()
            ->with(['status', 'creator', 'assignees', 'parent']);

        if ($request->filled('status_id')) {
            $query->where('status_id', $request->status_id);
        }
        if ($request->filled('priority')) {
            $query->where('priority', $request->priority);
        }
        if ($request->filled('assignee_id')) {
            $query->whereHas('assignees', fn ($q) => $q->where('users.id', $request->assignee_id));
        }
        if ($request->filled('parent_id')) {
            $query->where('parent_id', $request->parent_id);
        }
        if ($request->boolean('root_only')) {
            $query->whereNull('parent_id');
        }
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $sortField = $request->input('sort', 'kanban_order');
        $sortDir = $request->input('direction', 'asc');
        $query->orderBy($sortField, $sortDir);

        $tasks = $request->boolean('all')
            ? $query->get()
            : $query->paginate($request->input('per_page', 20));

        return response()->json([
            'tasks' => TaskResource::collection($tasks),
            'meta' => $request->boolean('all') ? null : [
                'current_page' => $tasks->currentPage(),
                'last_page' => $tasks->lastPage(),
                'total' => $tasks->total(),
            ],
        ]);
    }

    public function store(StoreTaskRequest $request, Project $project): JsonResponse
    {
        Gate::authorize('view', $project);

        $data = $request->validated();

        $maxOrder = $project->tasks()
            ->where('status_id', $data['status_id'])
            ->max('kanban_order') ?? -1;

        $data['created_by'] = Auth::id();
        $data['kanban_order'] = $maxOrder + 1;

        $task = $project->tasks()->create($data);
        $task->load(['status', 'creator', 'assignees']);

        // Auto AI estimation if no estimated_hours provided
        if (!$task->estimated_hours) {
            try {
                $estimation = app(TaskEstimationService::class)->estimate($task);
                $task->update(['estimated_hours' => $estimation['estimated_hours']]);
                $task->refresh();
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning('Auto estimation failed', ['task_id' => $task->id, 'error' => $e->getMessage()]);
            }
        }

        ActivityLogService::taskCreated($task);

        return response()->json([
            'task' => new TaskResource($task),
        ], 201);
    }

    public function show(Task $task): JsonResponse
    {
        Gate::authorize('view', $task);

        $task->load([
            'status', 'creator', 'updater', 'parent', 'subtasks.status',
            'assignees', 'assignments.user', 'dependencies.status',
            'dependents.status', 'comments.user', 'attachments.user',
            'timeEntries.user',
        ]);

        return response()->json(['task' => new TaskResource($task)]);
    }

    public function update(UpdateTaskRequest $request, Task $task): JsonResponse
    {
        $data = $request->validated();
        $data['updated_by'] = Auth::id();

        $changed = array_keys(array_diff_assoc($data, $task->only(array_keys($data))));
        $task->update($data);
        $task->load(['status', 'creator', 'assignees']);

        ActivityLogService::taskUpdated($task, $changed);

        // Auto risk analysis on meaningful changes
        $riskTriggers = ['progress_percent', 'due_date', 'planned_end', 'estimated_hours', 'status_id'];
        if (array_intersect($changed, $riskTriggers)) {
            try {
                $risk = app(DelayRiskService::class)->analyzeTask($task);
                if (in_array($risk['risk_level'] ?? '', ['high', 'critical'])) {
                    NotificationService::delayRiskDetected($task, $risk['risk_level'], $risk['risk_score'] ?? 0);
                }
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning('Auto risk analysis failed', ['task_id' => $task->id, 'error' => $e->getMessage()]);
            }
        }

        return response()->json([
            'message' => 'Tâche mise à jour.',
            'task' => new TaskResource($task),
        ]);
    }

    public function destroy(Task $task): JsonResponse
    {
        Gate::authorize('delete', $task);
        ActivityLogService::taskDeleted($task);
        $task->delete();
        return response()->json(['message' => 'Tâche supprimée.']);
    }

    // ─── KANBAN MOVE ────────────────────────────────────

    public function move(Request $request, Task $task): JsonResponse
    {
        Gate::authorize('update', $task);

        $data = $request->validate([
            'status_id'    => 'required|exists:task_statuses,id',
            'kanban_order'   => 'required|integer|min:0',
        ]);

        // Re-order other tasks in the target column
        Task::where('project_id', $task->project_id)
            ->where('status_id', $data['status_id'])
            ->where('kanban_order', '>=', $data['kanban_order'])
            ->increment('kanban_order');

        $oldStatusName = $task->status?->name ?? '?';

        $task->update([
            'status_id'    => $data['status_id'],
            'kanban_order'   => $data['kanban_order'],
            'updated_by'     => Auth::id(),
        ]);

        $newStatusName = $task->fresh('status')->status?->name ?? '?';
        ActivityLogService::taskMoved($task, $oldStatusName, $newStatusName);

        return response()->json([
            'message' => 'Tâche déplacée.',
            'task' => new TaskResource($task->fresh(['status', 'assignees'])),
        ]);
    }

    // ─── ASSIGNEES ──────────────────────────────────────

    public function assignees(Task $task): JsonResponse
    {
        Gate::authorize('view', $task);
        $task->load('assignees');

        return response()->json([
            'assignees' => TaskAssigneeResource::collection($task->assignees),
        ]);
    }

    public function assign(Request $request, Task $task): JsonResponse
    {
        Gate::authorize('update', $task);

        $data = $request->validate([
            'user_id'            => 'required|exists:users,id',
            'allocation_percent' => 'sometimes|integer|min:1|max:100',
        ]);

        $assignment = TaskAssignment::updateOrCreate(
            ['task_id' => $task->id, 'user_id' => $data['user_id']],
            [
                'allocation_percent' => $data['allocation_percent'] ?? 100,
                'assigned_at'        => now(),
            ]
        );

        NotificationService::taskAssigned($task, $data['user_id']);

        return response()->json([
            'message' => 'Assignation effectuée.',
            'assignment' => new TaskAssigneeResource($assignment->load('user')),
        ]);
    }

    public function unassign(Task $task, int $userId): JsonResponse
    {
        Gate::authorize('update', $task);

        TaskAssignment::where('task_id', $task->id)
            ->where('user_id', $userId)
            ->delete();

        return response()->json(['message' => 'Désassignation effectuée.']);
    }

    // ─── DEPENDENCIES ───────────────────────────────────

    public function dependencies(Task $task): JsonResponse
    {
        Gate::authorize('view', $task);
        $task->load(['dependencies', 'dependents']);

        return response()->json([
            'dependencies' => $task->dependencies->map(fn ($dep) => [
                'id' => $dep->id,
                'title' => $dep->title,
                'type' => $dep->pivot->type,
            ]),
            'dependents' => $task->dependents->map(fn ($dep) => [
                'id' => $dep->id,
                'title' => $dep->title,
                'type' => $dep->pivot->type,
            ]),
        ]);
    }

    public function addDependency(Request $request, Task $task): JsonResponse
    {
        Gate::authorize('update', $task);

        $data = $request->validate([
            'depends_on_task_id' => 'required|exists:tasks,id',
            'type'               => 'sometimes|in:FS,SS,FF,SF',
        ]);

        if ($data['depends_on_task_id'] == $task->id) {
            return response()->json(['message' => 'Une tâche ne peut pas dépendre d\'elle-même.'], 422);
        }

        $task->dependencies()->syncWithoutDetaching([
            $data['depends_on_task_id'] => ['type' => $data['type'] ?? 'FS'],
        ]);

        return response()->json(['message' => 'Dépendance ajoutée.'], 201);
    }

    public function removeDependency(Task $task, int $dependencyId): JsonResponse
    {
        Gate::authorize('update', $task);
        $task->dependencies()->detach($dependencyId);
        return response()->json(['message' => 'Dépendance supprimée.']);
    }

    // ─── COMMENTS ───────────────────────────────────────

    public function comments(Task $task): JsonResponse
    {
        Gate::authorize('view', $task);

        $comments = $task->comments()
            ->with('user')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'comments' => CommentResource::collection($comments),
        ]);
    }

    public function addComment(Request $request, Task $task): JsonResponse
    {
        Gate::authorize('view', $task);

        if (Auth::user()->hasRole('viewer')) {
            abort(403, 'Les viewers ne peuvent pas ajouter de commentaires.');
        }

        $data = $request->validate([
            'body' => 'required|string',
        ]);

        $comment = $task->comments()->create([
            'user_id' => Auth::id(),
            'body'    => $data['body'],
        ]);

        NotificationService::taskCommented($task, $comment->load('user'));
        ActivityLogService::commentAdded($task, $comment);

        return response()->json([
            'message' => 'Commentaire ajouté.',
            'comment' => new CommentResource($comment->load('user')),
        ], 201);
    }

    public function deleteComment(Task $task, TaskComment $comment): JsonResponse
    {
        if ($comment->task_id !== $task->id) {
            abort(404);
        }
        if ($comment->user_id !== Auth::id() && !Auth::user()->hasRole('admin')) {
            abort(403);
        }

        $comment->delete();
        return response()->json(['message' => 'Commentaire supprimé.']);
    }

    // ─── ATTACHMENTS ────────────────────────────────────

    public function attachments(Task $task): JsonResponse
    {
        Gate::authorize('view', $task);

        return response()->json([
            'attachments' => AttachmentResource::collection(
                $task->attachments()->with('user')->get()
            ),
        ]);
    }

    public function addAttachment(Request $request, Task $task): JsonResponse
    {
        Gate::authorize('view', $task);

        if (Auth::user()->hasRole('viewer')) {
            abort(403, 'Les viewers ne peuvent pas ajouter de pièces jointes.');
        }

        $data = $request->validate([
            'type' => 'required|in:file,link',
            'file' => 'required_if:type,file|file|max:10240',
            'url'  => 'required_if:type,link|nullable|url|max:2048',
            'filename' => 'required_if:type,link|nullable|string|max:255',
        ]);

        if ($data['type'] === 'file') {
            $file = $request->file('file');
            $path = $file->store("tasks/{$task->id}/attachments", 'local');

            $attachment = $task->attachments()->create([
                'user_id'    => Auth::id(),
                'type'       => 'file',
                'path_or_url'=> $path,
                'filename'   => $file->getClientOriginalName(),
                'mime'       => $file->getMimeType(),
                'size'       => $file->getSize(),
            ]);
        } else {
            $attachment = $task->attachments()->create([
                'user_id'    => Auth::id(),
                'type'       => 'link',
                'path_or_url'=> $data['url'],
                'filename'   => $data['filename'] ?? null,
            ]);
        }

        return response()->json([
            'message' => 'Pièce jointe ajoutée.',
            'attachment' => new AttachmentResource($attachment->load('user')),
        ], 201);
    }

    public function deleteAttachment(Task $task, Attachment $attachment): JsonResponse
    {
        if ($attachment->task_id !== $task->id) {
            abort(404);
        }
        if ($attachment->user_id !== Auth::id() && !Auth::user()->hasRole('admin')) {
            abort(403);
        }

        if ($attachment->type === 'file' && $attachment->path_or_url) {
            Storage::disk('local')->delete($attachment->path_or_url);
        }

        $attachment->delete();
        return response()->json(['message' => 'Pièce jointe supprimée.']);
    }

    // ─── TIME ENTRIES ───────────────────────────────────

    public function timeEntries(Task $task): JsonResponse
    {
        Gate::authorize('view', $task);

        return response()->json([
            'time_entries' => TimeEntryResource::collection(
                $task->timeEntries()->with('user')->orderByDesc('started_at')->get()
            ),
        ]);
    }

    public function addTimeEntry(Request $request, Task $task): JsonResponse
    {
        Gate::authorize('view', $task);

        if (Auth::user()->hasRole('viewer')) {
            abort(403, 'Les viewers ne peuvent pas ajouter de temps.');
        }

        $data = $request->validate([
            'source'  => 'sometimes|in:manual,timer',
            'date'    => 'required|date',
            'minutes' => 'required|integer|min:1',
            'note'    => 'nullable|string|max:500',
        ]);

        $data['user_id'] = Auth::id();

        $entry = $task->timeEntries()->create($data);

        ActivityLogService::timeEntryAdded($task, $entry);

        return response()->json([
            'message' => 'Entrée de temps ajoutée.',
            'time_entry' => new TimeEntryResource($entry->load('user')),
        ], 201);
    }

    public function deleteTimeEntry(Task $task, TimeEntry $timeEntry): JsonResponse
    {
        if ($timeEntry->task_id !== $task->id) {
            abort(404);
        }
        if ($timeEntry->user_id !== Auth::id() && !Auth::user()->hasRole('admin')) {
            abort(403);
        }

        $timeEntry->delete();
        return response()->json(['message' => 'Entrée de temps supprimée.']);
    }
}
