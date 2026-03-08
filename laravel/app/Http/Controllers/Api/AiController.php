<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Task;
use App\Services\AI\AssignmentOptimizerService;
use App\Services\AI\DelayRiskService;
use App\Services\AI\TaskEstimationService;
use App\Models\AiRecommendation;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use App\Services\NotificationService;

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

        try {
            $result = $this->estimationService->estimate($task);

            return response()->json([
                'task_id' => $task->id,
                'title'   => $task->title,
                ...$result,
            ]);
        } catch (\Throwable $e) {
            Log::error('AI estimation failed', ['task_id' => $task->id, 'error' => $e->getMessage()]);
            return response()->json([
                'task_id'         => $task->id,
                'title'           => $task->title,
                'estimated_hours' => $this->fallbackEstimate($task),
                'estimated_days'  => max(1, round($this->fallbackEstimate($task) / 6, 1)),
                'confidence'      => 0.1,
                'method'          => 'emergency_fallback',
                'sample_size'     => 0,
                'comparable_range'=> null,
                'warning'         => 'Estimation de secours utilisée.',
            ]);
        }
    }

    // ─── DELAY RISK ─────────────────────────────────────

    public function delayRiskTask(Task $task): JsonResponse
    {
        Gate::authorize('view', $task);

        try {
            $result = $this->delayRiskService->analyzeTask($task);

            if (in_array($result['risk_level'] ?? '', ['high', 'critical'])) {
                NotificationService::delayRiskDetected($task, $result['risk_level'], $result['risk_score'] ?? 0);
            }

            return response()->json([
                'task_id' => $task->id,
                'title'   => $task->title,
                ...$result,
            ]);
        } catch (\Throwable $e) {
            Log::error('AI delay risk (task) failed', ['task_id' => $task->id, 'error' => $e->getMessage()]);
            return response()->json([
                'task_id'         => $task->id,
                'title'           => $task->title,
                'risk_score'      => 0,
                'risk_level'      => 'none',
                'risk_factors'    => [],
                'recommendations' => [],
                'warning'         => 'Analyse de risque indisponible.',
            ]);
        }
    }

    public function delayRiskProject(Project $project): JsonResponse
    {
        Gate::authorize('view', $project);

        try {
            $result = $this->delayRiskService->analyzeProject($project);
            return response()->json($result);
        } catch (\Throwable $e) {
            Log::error('AI delay risk (project) failed', ['project_id' => $project->id, 'error' => $e->getMessage()]);
            return response()->json([
                'summary' => [
                    'total_analyzed' => 0, 'at_risk' => 0,
                    'critical' => 0, 'high' => 0, 'medium' => 0, 'low' => 0,
                ],
                'tasks'   => [],
                'warning' => 'Analyse de risque indisponible.',
            ]);
        }
    }

    // ─── ASSIGNMENT OPTIMIZER ───────────────────────────

    public function suggestAssignment(Task $task): JsonResponse
    {
        Gate::authorize('update', $task);

        try {
            $result = $this->assignmentService->suggest($task);

            return response()->json([
                'task_id' => $task->id,
                'title'   => $task->title,
                ...$result,
            ]);
        } catch (\Throwable $e) {
            Log::error('AI suggest assignment failed', ['task_id' => $task->id, 'error' => $e->getMessage()]);
            return response()->json([
                'task_id'     => $task->id,
                'title'       => $task->title,
                'suggestions' => [],
                'best_match'  => null,
                'confidence'  => 0,
                'message'     => 'Suggestion d\'assignation indisponible.',
            ]);
        }
    }

    public function optimizeProjectAssignments(Project $project): JsonResponse
    {
        Gate::authorize('update', $project);

        try {
            $result = $this->assignmentService->optimizeProject($project);
            return response()->json($result);
        } catch (\Throwable $e) {
            Log::error('AI optimize assignments failed', ['project_id' => $project->id, 'error' => $e->getMessage()]);
            return response()->json([
                'unassigned_count' => 0,
                'suggestions'      => [],
                'warning'          => 'Optimisation indisponible.',
            ]);
        }
    }

    private function fallbackEstimate(Task $task): float
    {
        $complexity = $task->complexity ?? 5;
        return match(true) {
            $complexity <= 2 => 4,
            $complexity <= 4 => 8,
            $complexity <= 6 => 16,
            $complexity <= 8 => 32,
            default => 60,
        };
    }

    /**
     * AI dashboard summary: latest risk data across user-visible projects.
     */
    public function dashboardSummary(): JsonResponse
    {
        $user = auth()->user();

        // Get recent delay_risk recommendations
        $query = AiRecommendation::where('type', 'delay_risk')
            ->whereNotNull('task_id')
            ->where('created_at', '>=', now()->subDays(7));

        if (!$user->hasRole('admin')) {
            $projectIds = $user->hasRole('manager')
                ? \App\Models\Project::pluck('id')
                : \App\Models\Project::whereHas('members', fn ($q) => $q->where('user_id', $user->id))->pluck('id');
            $query->whereIn('project_id', $projectIds);
        }

        $riskData = $query->orderBy('created_at', 'desc')
            ->get()
            ->unique('task_id');

        $criticalCount = $riskData->filter(fn ($r) => ($r->result_data['risk_level'] ?? '') === 'critical')->count();
        $highCount = $riskData->filter(fn ($r) => ($r->result_data['risk_level'] ?? '') === 'high')->count();
        $mediumCount = $riskData->filter(fn ($r) => ($r->result_data['risk_level'] ?? '') === 'medium')->count();

        $topRisks = $riskData->sortByDesc(fn ($r) => $r->result_data['risk_score'] ?? 0)
            ->take(5)
            ->map(fn ($r) => [
                'task_id'    => $r->task_id,
                'project_id' => $r->project_id,
                'title'      => $r->input_data['title'] ?? 'Tâche #' . $r->task_id,
                'risk_score' => $r->result_data['risk_score'] ?? 0,
                'risk_level' => $r->result_data['risk_level'] ?? 'none',
            ])->values();

        return response()->json([
            'total_analyzed' => $riskData->count(),
            'critical' => $criticalCount,
            'high'     => $highCount,
            'medium'   => $mediumCount,
            'top_risks' => $topRisks,
        ]);
    }
}
