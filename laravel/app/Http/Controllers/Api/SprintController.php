<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\SprintResource;
use App\Http\Resources\TaskResource;
use App\Models\Project;
use App\Models\Sprint;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;

class SprintController extends Controller
{
    /**
     * List sprints for a project.
     */
    public function index(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('view', $project);

        $sprints = $project->sprints()
            ->withCount('tasks')
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['sprints' => SprintResource::collection($sprints)]);
    }

    /**
     * Show a single sprint with its tasks.
     */
    public function show(Sprint $sprint): JsonResponse
    {
        Gate::authorize('view', $sprint);

        $sprint->load(['tasks.status', 'tasks.assignees', 'creator']);
        $sprint->loadCount('tasks');

        return response()->json(['sprint' => new SprintResource($sprint)]);
    }

    /**
     * Create a sprint.
     */
    public function store(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('update', $project);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'goal' => 'nullable|string',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'status' => 'sometimes|in:planned,active,completed',
        ]);

        $validated['created_by'] = Auth::id();

        $sprint = $project->sprints()->create($validated);
        $sprint->loadCount('tasks');

        return response()->json(['sprint' => new SprintResource($sprint)], 201);
    }

    /**
     * Update a sprint.
     */
    public function update(Request $request, Sprint $sprint): JsonResponse
    {
        Gate::authorize('update', $sprint);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'goal' => 'nullable|string',
            'start_date' => 'sometimes|date',
            'end_date' => 'sometimes|date|after_or_equal:start_date',
            'status' => 'sometimes|in:planned,active,completed',
        ]);

        $sprint->update($validated);
        $sprint->loadCount('tasks');

        return response()->json(['sprint' => new SprintResource($sprint)]);
    }

    /**
     * Delete a sprint. Tasks are unlinked (sprint_id set to null).
     */
    public function destroy(Sprint $sprint): JsonResponse
    {
        Gate::authorize('delete', $sprint);

        // Unlink tasks before deleting
        $sprint->tasks()->update(['sprint_id' => null]);
        $sprint->delete();

        return response()->json(['message' => 'Sprint supprimé']);
    }

    /**
     * Get backlog tasks (tasks with no sprint) for a project.
     */
    public function backlog(Project $project): JsonResponse
    {
        Gate::authorize('view', $project);

        $tasks = $project->tasks()
            ->whereNull('sprint_id')
            ->with(['status', 'assignees', 'creator'])
            ->orderBy('priority')
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['tasks' => TaskResource::collection($tasks)]);
    }

    /**
     * Add tasks to a sprint.
     */
    public function addTasks(Request $request, Sprint $sprint): JsonResponse
    {
        Gate::authorize('update', $sprint);

        $validated = $request->validate([
            'task_ids' => 'required|array',
            'task_ids.*' => 'exists:tasks,id',
        ]);

        // Only allow tasks from same project
        Task::where('project_id', $sprint->project_id)
            ->whereIn('id', $validated['task_ids'])
            ->update(['sprint_id' => $sprint->id]);

        $sprint->loadCount('tasks');

        return response()->json(['sprint' => new SprintResource($sprint)]);
    }

    /**
     * Remove a task from a sprint (back to backlog).
     */
    public function removeTask(Sprint $sprint, Task $task): JsonResponse
    {
        Gate::authorize('update', $sprint);

        if ($task->sprint_id === $sprint->id) {
            $task->update(['sprint_id' => null]);
        }

        return response()->json(['message' => 'Tâche retirée du sprint']);
    }

    /**
     * Burndown chart data for a sprint.
     * Returns daily ideal vs actual remaining story points.
     */
    public function burndown(Sprint $sprint): JsonResponse
    {
        Gate::authorize('view', $sprint);

        $tasks = $sprint->tasks()->with('status')->get();
        $totalPoints = $tasks->sum('story_points') ?: $tasks->count();

        $startDate = $sprint->start_date->copy();
        $endDate = $sprint->end_date->copy();
        $totalDays = $startDate->diffInDays($endDate);

        if ($totalDays === 0) {
            return response()->json(['burndown' => []]);
        }

        // Build ideal line
        $pointsPerDay = $totalPoints / $totalDays;
        $burndown = [];

        // Get project statuses that are "done" (last status by order)
        $project = $sprint->project()->with('statuses')->first();
        $doneStatusIds = $project->statuses()
            ->orderByDesc('order')
            ->limit(1)
            ->pluck('id')
            ->toArray();

        $today = now()->startOfDay();

        for ($day = 0; $day <= $totalDays; $day++) {
            $date = $startDate->copy()->addDays($day);
            $ideal = max(0, $totalPoints - ($pointsPerDay * $day));

            $actual = null;
            if ($date->lte($today)) {
                // Count remaining points: tasks not in done status as of this date
                $completedPoints = $tasks->filter(function ($task) use ($doneStatusIds, $date) {
                    return in_array($task->status_id, $doneStatusIds)
                        && $task->updated_at->startOfDay()->lte($date);
                })->sum(fn ($t) => $t->story_points ?: 1);

                $actual = $totalPoints - $completedPoints;
            }

            $burndown[] = [
                'date' => $date->toDateString(),
                'ideal' => round($ideal, 1),
                'actual' => $actual !== null ? round($actual, 1) : null,
            ];
        }

        return response()->json([
            'burndown' => $burndown,
            'total_points' => $totalPoints,
        ]);
    }
}
