<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class GanttController extends Controller
{
    public function show(Project $project): JsonResponse
    {
        Gate::authorize('view', $project);

        $tasks = $project->tasks()
            ->with(['status', 'assignees', 'dependencies'])
            ->whereNotNull('planned_start')
            ->orderBy('planned_start')
            ->get()
            ->map(function ($task) {
                return [
                    'id'          => $task->id,
                    'name'        => $task->title,
                    'start'       => $task->planned_start?->toDateString(),
                    'end'         => $task->planned_end?->toDateString() ?? $task->planned_start?->toDateString(),
                    'progress'    => $task->progress_percent ?? 0,
                    'priority'    => $task->priority,
                    'status'      => $task->status?->name,
                    'status_color'=> $task->status?->color,
                    'parent_id'   => $task->parent_id,
                    'assignees'   => $task->assignees->pluck('name'),
                    'dependencies'=> $task->dependencies->map(fn ($d) => [
                        'id'   => $d->id,
                        'type' => $d->pivot->type,
                    ]),
                ];
            });

        return response()->json(['gantt' => $tasks]);
    }

    public function updateDates(Project $project, \Illuminate\Http\Request $request): JsonResponse
    {
        Gate::authorize('update', $project);

        $data = $request->validate([
            'tasks'                => 'required|array',
            'tasks.*.id'           => 'required|exists:tasks,id',
            'tasks.*.planned_start'=> 'required|date',
            'tasks.*.planned_end'  => 'required|date|after_or_equal:tasks.*.planned_start',
        ]);

        foreach ($data['tasks'] as $item) {
            $project->tasks()
                ->where('id', $item['id'])
                ->update([
                    'planned_start' => $item['planned_start'],
                    'planned_end'   => $item['planned_end'],
                ]);
        }

        return response()->json(['message' => 'Dates Gantt mises à jour.']);
    }
}
