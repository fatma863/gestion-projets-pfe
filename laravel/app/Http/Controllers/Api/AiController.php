<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Task;
use App\Services\AI\AssignmentOptimizerService;
use App\Services\AI\DelayRiskService;
use App\Services\AI\TaskEstimationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class AiController extends Controller
{
    public function __construct(
        private TaskEstimationService $estimationService,
        private DelayRiskService $delayRiskService,
        private AssignmentOptimizerService $assignmentService,
    ) {}

    // ─── ESTIMATION ─────────────────────────────────────

    public function estimateTask(Task $task): JsonResponse
    {
        Gate::authorize('view', $task);

        $result = $this->estimationService->estimate($task);

        return response()->json([
            'task_id' => $task->id,
            'title'   => $task->title,
            ...$result,
        ]);
    }

    // ─── DELAY RISK ─────────────────────────────────────

    public function delayRiskTask(Task $task): JsonResponse
    {
        Gate::authorize('view', $task);

        $result = $this->delayRiskService->analyzeTask($task);

        return response()->json([
            'task_id' => $task->id,
            'title'   => $task->title,
            ...$result,
        ]);
    }

    public function delayRiskProject(Project $project): JsonResponse
    {
        Gate::authorize('view', $project);

        $result = $this->delayRiskService->analyzeProject($project);

        return response()->json($result);
    }

    // ─── ASSIGNMENT OPTIMIZER ───────────────────────────

    public function suggestAssignment(Task $task): JsonResponse
    {
        Gate::authorize('update', $task);

        $result = $this->assignmentService->suggest($task);

        return response()->json([
            'task_id' => $task->id,
            'title'   => $task->title,
            ...$result,
        ]);
    }

    public function optimizeProjectAssignments(Project $project): JsonResponse
    {
        Gate::authorize('update', $project);

        $result = $this->assignmentService->optimizeProject($project);

        return response()->json($result);
    }
}
