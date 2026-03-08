<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Task;
use App\Services\AI\CriticalPathService;
use App\Services\AI\DelayRiskService;
use App\Services\WorkloadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;

class GanttController extends Controller
{
    public function __construct(
        private CriticalPathService $criticalPathService,
        private DelayRiskService $delayRiskService,
        private WorkloadService $workloadService,
    ) {}

    public function show(Project $project): JsonResponse
    {
        Gate::authorize('view', $project);

        $tasks = $project->tasks()
            ->with(['status', 'assignees', 'dependencies'])
            ->orderByRaw('COALESCE(planned_start, due_date, created_at) ASC')
            ->get();

        // Critical path analysis
        try {
            $criticalPath = $this->criticalPathService->analyze($project);
        } catch (\Throwable $e) {
            Log::warning('Critical path analysis failed', ['project_id' => $project->id, 'error' => $e->getMessage()]);
            $criticalPath = ['critical_path' => [], 'total_duration_days' => 0, 'tasks' => []];
        }
        $criticalIds = $criticalPath['critical_path'];

        // Per-task risk scores (lightweight: use latest ai_recommendations if available)
        $riskScores = \App\Models\AiRecommendation::where('project_id', $project->id)
            ->where('type', 'delay_risk')
            ->whereNotNull('task_id')
            ->orderBy('created_at', 'desc')
            ->get()
            ->unique('task_id')
            ->keyBy('task_id')
            ->map(fn ($r) => $r->result_data['risk_score'] ?? 0);

        $ganttTasks = $tasks->map(function ($task) use ($criticalIds, $riskScores) {
            $start = $task->planned_start?->toDateString()
                ?? $task->due_date?->toDateString()
                ?? $task->created_at?->toDateString();
            $end = $task->planned_end?->toDateString()
                ?? $task->due_date?->toDateString()
                ?? $start;

            return [
                'id'           => $task->id,
                'name'         => $task->title,
                'start'        => $start,
                'end'          => $end,
                'progress'     => $task->progress_percent ?? 0,
                'priority'     => $task->priority,
                'status'       => $task->status?->name,
                'status_color' => $task->status?->color,
                'parent_id'    => $task->parent_id,
                'has_dates'    => $task->planned_start !== null,
                'assignees'    => $task->assignees->pluck('name'),
                'estimated_hours' => $task->estimated_hours,
                'actual_hours' => $task->actual_hours,
                'complexity'   => $task->complexity,
                'is_critical'  => in_array($task->id, $criticalIds),
                'risk_score'   => $riskScores[$task->id] ?? null,
                'dependencies' => $task->dependencies->map(fn ($d) => [
                    'id'   => $d->id,
                    'type' => $d->pivot->type,
                ]),
            ];
        });

        // Workload summary
        try {
            $workload = $this->workloadService->analyzeProject($project);
        } catch (\Throwable $e) {
            $workload = ['members' => [], 'alerts' => [], 'summary' => null];
        }

        return response()->json([
            'gantt'         => $ganttTasks,
            'critical_path' => $criticalPath,
            'workload'      => $workload,
        ]);
    }

    public function updateTask(Project $project, Task $task, Request $request): JsonResponse
    {
        Gate::authorize('update', $project);

        if ($task->project_id !== $project->id) {
            abort(404);
        }

        $data = $request->validate([
            'planned_start' => 'required|date',
            'planned_end'   => 'required|date|after_or_equal:planned_start',
        ]);

        $task->update($data);

        return response()->json([
            'message' => 'Tâche mise à jour.',
            'task' => [
                'id'    => $task->id,
                'start' => $task->planned_start->toDateString(),
                'end'   => $task->planned_end->toDateString(),
            ],
        ]);
    }

    public function updateDates(Project $project, Request $request): JsonResponse
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
