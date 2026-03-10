<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\BacklogItemResource;
use App\Http\Resources\SprintResource;
use App\Models\BacklogItem;
use App\Models\Project;
use App\Models\Sprint;
use App\Services\AI\ScrumGeneratorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class ScrumGeneratorController extends Controller
{
    public function __construct(
        private ScrumGeneratorService $generatorService,
    ) {}

    /**
     * AI-generate a full Scrum structure for a project.
     */
    public function generate(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('update', $project);

        $validated = $request->validate([
            'description' => 'nullable|string|max:2000',
        ]);

        $result = $this->generatorService->generate($project, $validated['description'] ?? null);

        // Re-load structured data for response
        $epics = BacklogItem::where('project_id', $project->id)
            ->where('type', 'epic')
            ->with(['children.tasks.status', 'children.tasks.assignees'])
            ->orderBy('order')
            ->get();

        $sprints = $project->sprints()
            ->withCount('tasks')
            ->orderBy('start_date')
            ->get();

        return response()->json([
            'epics'   => BacklogItemResource::collection($epics),
            'sprints' => SprintResource::collection($sprints),
            'summary' => $result['summary'],
        ], 201);
    }

    /**
     * List all backlog items (epics with stories) for a project.
     */
    public function backlogItems(Project $project): JsonResponse
    {
        Gate::authorize('view', $project);

        $items = BacklogItem::where('project_id', $project->id)
            ->where('type', 'epic')
            ->with(['children.tasks.status', 'children.tasks.assignees'])
            ->orderBy('order')
            ->get();

        return response()->json([
            'backlog_items' => BacklogItemResource::collection($items),
        ]);
    }

    /**
     * Update a backlog item (epic or story).
     */
    public function updateBacklogItem(Request $request, BacklogItem $backlogItem): JsonResponse
    {
        $project = $backlogItem->project;
        Gate::authorize('update', $project);

        $validated = $request->validate([
            'title'        => 'sometimes|string|max:255',
            'description'  => 'nullable|string',
            'priority'     => 'sometimes|integer|min:0|max:10',
            'story_points' => 'nullable|integer|min:0',
            'status'       => 'sometimes|in:open,in_progress,done',
            'order'        => 'sometimes|integer|min:0',
        ]);

        $backlogItem->update($validated);

        return response()->json([
            'backlog_item' => new BacklogItemResource($backlogItem->load('children.tasks')),
        ]);
    }

    /**
     * Delete a backlog item (cascade deletes children + unlinks tasks).
     */
    public function deleteBacklogItem(BacklogItem $backlogItem): JsonResponse
    {
        $project = $backlogItem->project;
        Gate::authorize('update', $project);

        // Unlink tasks from stories being deleted
        if ($backlogItem->type === 'epic') {
            $storyIds = $backlogItem->children()->pluck('id');
            \App\Models\Task::whereIn('backlog_item_id', $storyIds)
                ->update(['backlog_item_id' => null]);
        } else {
            $backlogItem->tasks()->update(['backlog_item_id' => null]);
        }

        $backlogItem->delete();

        return response()->json(['message' => 'Élément du backlog supprimé.']);
    }

    /**
     * Sprint health analysis (AI).
     */
    public function sprintAnalytics(Sprint $sprint): JsonResponse
    {
        Gate::authorize('view', $sprint);

        $health = $this->generatorService->analyzeSprintHealth($sprint);
        $velocity = $this->generatorService->velocityHistory($sprint->project);

        return response()->json([
            'health'   => $health,
            'velocity' => $velocity,
        ]);
    }

    /**
     * AI suggestions for sprint improvement.
     */
    public function sprintSuggestions(Sprint $sprint): JsonResponse
    {
        Gate::authorize('view', $sprint);

        $suggestions = $this->generatorService->sprintSuggestions($sprint);

        return response()->json([
            'suggestions' => $suggestions,
        ]);
    }
}
