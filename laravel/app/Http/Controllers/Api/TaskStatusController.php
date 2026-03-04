<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\TaskStatusResource;
use App\Models\Project;
use App\Models\TaskStatus;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class TaskStatusController extends Controller
{
    public function index(Project $project): JsonResponse
    {
        Gate::authorize('view', $project);

        $statuses = $project->statuses()
            ->withCount('tasks')
            ->orderBy('order')
            ->get();

        return response()->json([
            'statuses' => TaskStatusResource::collection($statuses),
        ]);
    }

    public function store(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('update', $project);

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'color' => 'sometimes|string|max:7',
        ]);

        $maxOrder = $project->statuses()->max('order') ?? -1;
        $data['order'] = $maxOrder + 1;

        $status = $project->statuses()->create($data);

        return response()->json([
            'message' => 'Statut créé.',
            'status' => new TaskStatusResource($status),
        ], 201);
    }

    public function update(Request $request, TaskStatus $status): JsonResponse
    {
        Gate::authorize('update', $status->project);

        $data = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'color' => 'sometimes|string|max:7',
        ]);

        $status->update($data);

        return response()->json([
            'message' => 'Statut mis à jour.',
            'status' => new TaskStatusResource($status),
        ]);
    }

    public function destroy(TaskStatus $status): JsonResponse
    {
        Gate::authorize('update', $status->project);

        if ($status->tasks()->exists()) {
            return response()->json([
                'message' => 'Impossible de supprimer un statut qui contient des tâches.',
            ], 422);
        }

        $status->delete();

        return response()->json(['message' => 'Statut supprimé.']);
    }

    public function reorder(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('update', $project);

        $data = $request->validate([
            'order' => 'required|array',
            'order.*' => 'integer|exists:task_statuses,id',
        ]);

        foreach ($data['order'] as $index => $statusId) {
            TaskStatus::where('id', $statusId)
                ->where('project_id', $project->id)
                ->update(['order' => $index]);
        }

        return response()->json([
            'message' => 'Ordre mis à jour.',
            'statuses' => TaskStatusResource::collection(
                $project->statuses()->orderBy('order')->get()
            ),
        ]);
    }
}
