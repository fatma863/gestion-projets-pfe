<?php

namespace App\Services\AI;

use App\Models\AiRecommendation;
use App\Models\Project;
use App\Models\Task;
use Carbon\Carbon;

class DelayRiskService
{
    /**
     * Analyze delay risk for a single task.
     */
    public function analyzeTask(Task $task): array
    {
        $input = [
            'task_id'     => $task->id,
            'title'       => $task->title,
            'project_id'  => $task->project_id,
        ];

        $riskFactors = [];
        $riskScore = 0;

        // Factor 1: Overdue check
        if ($task->due_date && $task->due_date->isPast() && $task->progress_percent < 100) {
            $daysOverdue = $task->due_date->diffInDays(now());
            $riskScore += min(40, 20 + $daysOverdue * 2);
            $riskFactors[] = [
                'factor' => 'overdue',
                'detail' => "En retard de {$daysOverdue} jours",
                'impact' => 'critical',
            ];
        }
        // Approaching deadline with low progress
        elseif ($task->due_date && $task->progress_percent < 100) {
            $daysLeft = now()->diffInDays($task->due_date, false);
            $expectedProgress = $this->expectedProgress($task);

            if ($task->progress_percent < $expectedProgress - 20) {
                $gap = round($expectedProgress - $task->progress_percent);
                $riskScore += min(30, 10 + $gap * 0.5);
                $riskFactors[] = [
                    'factor' => 'slow_progress',
                    'detail' => "Progression ({$task->progress_percent}%) en dessous de l'attendu ({$expectedProgress}%) — écart de {$gap}%",
                    'impact' => $gap > 40 ? 'high' : 'medium',
                ];
            }

            if ($daysLeft <= 2 && $task->progress_percent < 80) {
                $riskScore += 20;
                $riskFactors[] = [
                    'factor' => 'deadline_imminent',
                    'detail' => "Échéance dans {$daysLeft} jour(s), progression à {$task->progress_percent}%",
                    'impact' => 'high',
                ];
            }
        }

        // Factor 2: No assignee
        if ($task->assignees()->count() === 0) {
            $riskScore += 15;
            $riskFactors[] = [
                'factor' => 'no_assignee',
                'detail' => 'Aucun membre assigné à cette tâche',
                'impact' => 'medium',
            ];
        }

        // Factor 3: High complexity with no estimated hours
        if ($task->complexity >= 7 && !$task->estimated_hours) {
            $riskScore += 10;
            $riskFactors[] = [
                'factor' => 'high_complexity_no_estimate',
                'detail' => "Complexité élevée ({$task->complexity}/10) sans estimation d'heures",
                'impact' => 'medium',
            ];
        }

        // Factor 4: Actual hours exceeding estimated
        if ($task->estimated_hours && $task->actual_hours > 0) {
            $ratio = $task->actual_hours / $task->estimated_hours;
            if ($ratio > 1.5) {
                $overrun = round(($ratio - 1) * 100);
                $riskScore += min(25, 10 + $overrun * 0.1);
                $riskFactors[] = [
                    'factor' => 'hours_overrun',
                    'detail' => "Heures réelles ({$task->actual_hours}h) dépassent l'estimation ({$task->estimated_hours}h) de {$overrun}%",
                    'impact' => $ratio > 2 ? 'high' : 'medium',
                ];
            }
        }

        // Factor 5: Blocked by incomplete dependency
        $blockers = $task->dependencies()
            ->where('progress_percent', '<', 100)
            ->get();
        if ($blockers->count() > 0) {
            $riskScore += min(25, $blockers->count() * 12);
            $names = $blockers->pluck('title')->implode(', ');
            $riskFactors[] = [
                'factor' => 'blocked_dependencies',
                'detail' => "Bloquée par {$blockers->count()} dépendance(s) non terminée(s): {$names}",
                'impact' => 'high',
            ];
        }

        $riskScore = (int) min(100, $riskScore);
        $riskLevel = $this->riskLevel($riskScore);

        $result = [
            'risk_score'   => $riskScore,
            'risk_level'   => $riskLevel,
            'risk_factors' => $riskFactors,
            'recommendations' => $this->generateRecommendations($riskFactors),
        ];

        $confidence = count($riskFactors) > 0
            ? min(0.9, 0.5 + count($riskFactors) * 0.1)
            : 0.4;

        AiRecommendation::create([
            'task_id'     => $task->id,
            'project_id'  => $task->project_id,
            'type'        => 'delay_risk',
            'input_data'  => $input,
            'result_data' => $result,
            'confidence'  => round($confidence, 2),
        ]);

        return $result;
    }

    /**
     * Analyze all at-risk tasks in a project.
     */
    public function analyzeProject(Project $project): array
    {
        $tasks = $project->tasks()
            ->where('progress_percent', '<', 100)
            ->with(['assignees', 'dependencies'])
            ->get();

        $results = [];
        foreach ($tasks as $task) {
            $analysis = $this->analyzeTask($task);
            if ($analysis['risk_score'] > 0) {
                $results[] = [
                    'task_id'    => $task->id,
                    'title'      => $task->title,
                    'priority'   => $task->priority,
                    'due_date'   => $task->due_date?->toDateString(),
                    'progress'   => $task->progress_percent,
                    ...$analysis,
                ];
            }
        }

        // Sort by risk score descending
        usort($results, fn ($a, $b) => $b['risk_score'] <=> $a['risk_score']);

        $summary = [
            'total_analyzed' => $tasks->count(),
            'at_risk'        => count($results),
            'critical'       => count(array_filter($results, fn ($r) => $r['risk_level'] === 'critical')),
            'high'           => count(array_filter($results, fn ($r) => $r['risk_level'] === 'high')),
            'medium'         => count(array_filter($results, fn ($r) => $r['risk_level'] === 'medium')),
            'low'            => count(array_filter($results, fn ($r) => $r['risk_level'] === 'low')),
        ];

        return [
            'summary' => $summary,
            'tasks'   => $results,
        ];
    }

    private function expectedProgress(Task $task): int
    {
        if (!$task->planned_start || !$task->due_date) {
            return 50; // default when no dates
        }

        $totalDays = $task->planned_start->diffInDays($task->due_date) ?: 1;
        $elapsed = $task->planned_start->diffInDays(now());
        $ratio = $elapsed / $totalDays;

        return (int) min(100, round($ratio * 100));
    }

    private function riskLevel(int $score): string
    {
        return match(true) {
            $score >= 70 => 'critical',
            $score >= 45 => 'high',
            $score >= 20 => 'medium',
            $score > 0   => 'low',
            default      => 'none',
        };
    }

    private function generateRecommendations(array $factors): array
    {
        $recs = [];

        foreach ($factors as $f) {
            $recs[] = match($f['factor']) {
                'overdue' => 'Revoir la date d\'échéance ou augmenter les ressources.',
                'slow_progress' => 'Identifier les blocages et réallouer les efforts.',
                'deadline_imminent' => 'Prioriser cette tâche immédiatement ou reporter l\'échéance.',
                'no_assignee' => 'Assigner un membre à cette tâche.',
                'high_complexity_no_estimate' => 'Estimer les heures nécessaires pour mieux planifier.',
                'hours_overrun' => 'Réévaluer le périmètre ou ajouter des ressources.',
                'blocked_dependencies' => 'Prioriser la résolution des dépendances bloquantes.',
                default => 'Analyser la situation.',
            };
        }

        return array_values(array_unique($recs));
    }
}
