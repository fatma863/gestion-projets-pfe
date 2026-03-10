<?php

namespace App\Services\AI;

use App\Models\BacklogItem;
use App\Models\Project;
use App\Models\Sprint;
use App\Models\Task;
use App\Models\TaskStatus;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ScrumGeneratorService
{
    /**
     * Generate a full Scrum structure for a project:
     * - Task statuses (if missing)
     * - Epics → Stories → Tasks (BacklogItems + Tasks)
     * - Sprints with tasks distributed
     */
    public function generate(Project $project, ?string $description = null): array
    {
        $keywords = $this->extractKeywords($project->name, $description ?? $project->description);
        $templates = $this->selectTemplates($keywords);
        $sprintDuration = 14; // 2-week sprints
        $pointsPerSprint = 35;

        return DB::transaction(function () use ($project, $templates, $sprintDuration, $pointsPerSprint) {
            // Ensure project has Scrum statuses
            $statuses = $this->ensureStatuses($project);

            $allTasks = [];
            $epics = [];
            $epicOrder = 0;

            foreach ($templates as $template) {
                $epic = BacklogItem::create([
                    'project_id' => $project->id,
                    'type'       => 'epic',
                    'title'      => $template['epic'],
                    'description'=> $template['epic_description'],
                    'priority'   => $template['priority'],
                    'order'      => $epicOrder++,
                    'created_by' => Auth::id(),
                ]);

                $storyOrder = 0;
                foreach ($template['stories'] as $storyData) {
                    $story = BacklogItem::create([
                        'project_id'  => $project->id,
                        'parent_id'   => $epic->id,
                        'type'        => 'story',
                        'title'       => $storyData['title'],
                        'description' => $storyData['description'],
                        'story_points'=> $storyData['story_points'],
                        'priority'    => $storyData['priority'],
                        'order'       => $storyOrder++,
                        'created_by'  => Auth::id(),
                    ]);

                    foreach ($storyData['tasks'] as $taskData) {
                        $defaultStatus = $statuses->first();
                        $task = Task::create([
                            'project_id'      => $project->id,
                            'backlog_item_id'  => $story->id,
                            'title'           => $taskData['title'],
                            'description'     => $taskData['description'] ?? null,
                            'priority'        => $taskData['priority'],
                            'complexity'      => $taskData['complexity'],
                            'story_points'    => $taskData['story_points'],
                            'estimated_hours' => $taskData['estimated_hours'],
                            'status_id'       => $defaultStatus?->id,
                            'kanban_order'    => count($allTasks),
                            'created_by'      => Auth::id(),
                        ]);
                        $allTasks[] = $task;
                    }
                }

                $epic->load('children.tasks');
                $epics[] = $epic;
            }

            // Distribute tasks into sprints
            $sprints = $this->createSprints($project, $allTasks, $sprintDuration, $pointsPerSprint);

            return [
                'epics'   => $epics,
                'sprints' => $sprints,
                'summary' => [
                    'epics_count'   => count($epics),
                    'stories_count' => collect($templates)->sum(fn ($t) => count($t['stories'])),
                    'tasks_count'   => count($allTasks),
                    'sprints_count' => count($sprints),
                    'total_points'  => collect($allTasks)->sum('story_points'),
                ],
            ];
        });
    }

    /**
     * AI sprint analysis: velocity, health, prediction.
     */
    public function analyzeSprintHealth(Sprint $sprint): array
    {
        $sprint->load(['tasks.status', 'tasks.assignees', 'project.statuses']);
        $tasks = $sprint->tasks;

        $doneStatusIds = $sprint->project->statuses()
            ->orderByDesc('order')
            ->limit(1)
            ->pluck('id')
            ->toArray();

        $totalPoints = $tasks->sum('story_points') ?: $tasks->count();
        $completedPoints = $tasks->filter(fn ($t) => in_array($t->status_id, $doneStatusIds))
            ->sum(fn ($t) => $t->story_points ?: 1);
        $totalTasks = $tasks->count();
        $completedTasks = $tasks->filter(fn ($t) => in_array($t->status_id, $doneStatusIds))->count();

        $today = now()->startOfDay();
        $daysTotal = max(1, $sprint->start_date->diffInDays($sprint->end_date));
        $daysElapsed = max(0, $sprint->start_date->diffInDays(min($today, $sprint->end_date)));
        $daysRemaining = max(0, $today->diffInDays($sprint->end_date, false));

        // Velocity = points per day
        $velocity = $daysElapsed > 0 ? $completedPoints / $daysElapsed : 0;
        $expectedProgress = $daysTotal > 0 ? ($daysElapsed / $daysTotal) : 0;
        $actualProgress = $totalPoints > 0 ? ($completedPoints / $totalPoints) : 0;

        // Predict completion
        $remainingPoints = $totalPoints - $completedPoints;
        $predictedDaysToComplete = $velocity > 0 ? ceil($remainingPoints / $velocity) : null;
        $predictedCompletion = $predictedDaysToComplete
            ? $today->copy()->addDays($predictedDaysToComplete)->toDateString()
            : null;

        $health = 'on-track';
        if ($actualProgress < $expectedProgress - 0.2) {
            $health = 'behind';
        } elseif ($actualProgress < $expectedProgress - 0.1) {
            $health = 'at-risk';
        }

        // Team workload
        $workload = [];
        foreach ($tasks->groupBy(fn ($t) => $t->assignees->pluck('id')->join(',')) as $key => $group) {
            if (!$key) continue;
            $user = $group->first()->assignees->first();
            if (!$user) continue;
            $workload[] = [
                'user_id' => $user->id,
                'name'    => $user->name,
                'tasks'   => $group->count(),
                'points'  => $group->sum('story_points'),
                'completed' => $group->filter(fn ($t) => in_array($t->status_id, $doneStatusIds))->count(),
            ];
        }

        return [
            'total_tasks'      => $totalTasks,
            'completed_tasks'  => $completedTasks,
            'total_points'     => $totalPoints,
            'completed_points' => $completedPoints,
            'days_total'       => $daysTotal,
            'days_elapsed'     => $daysElapsed,
            'days_remaining'   => $daysRemaining,
            'velocity'         => round($velocity, 2),
            'health'           => $health,
            'progress'         => round($actualProgress * 100, 1),
            'predicted_completion' => $predictedCompletion,
            'team_workload'    => $workload,
        ];
    }

    /**
     * Velocity history for a project (completed sprints).
     */
    public function velocityHistory(Project $project): array
    {
        $sprints = $project->sprints()
            ->where('status', 'completed')
            ->withCount('tasks')
            ->with('tasks')
            ->orderBy('start_date')
            ->get();

        $doneStatusIds = $project->statuses()
            ->orderByDesc('order')
            ->limit(1)
            ->pluck('id')
            ->toArray();

        return $sprints->map(function ($sprint) use ($doneStatusIds) {
            $committed = $sprint->tasks->sum('story_points') ?: $sprint->tasks->count();
            $completed = $sprint->tasks
                ->filter(fn ($t) => in_array($t->status_id, $doneStatusIds))
                ->sum(fn ($t) => $t->story_points ?: 1);

            return [
                'sprint_id'   => $sprint->id,
                'sprint_name' => $sprint->name,
                'committed'   => $committed,
                'completed'   => $completed,
            ];
        })->values()->toArray();
    }

    /**
     * AI suggestions for a sprint.
     */
    public function sprintSuggestions(Sprint $sprint): array
    {
        $sprint->load(['tasks.status', 'tasks.assignees', 'project.statuses']);
        $tasks = $sprint->tasks;
        $suggestions = [];

        $doneStatusIds = $sprint->project->statuses()
            ->orderByDesc('order')
            ->limit(1)
            ->pluck('id')
            ->toArray();

        // 1. Overloaded developers
        $userTaskCounts = [];
        foreach ($tasks as $task) {
            foreach ($task->assignees as $user) {
                $userTaskCounts[$user->id] = ($userTaskCounts[$user->id] ?? 0) + 1;
            }
        }
        foreach ($userTaskCounts as $userId => $count) {
            if ($count > 5) {
                $user = $tasks->flatMap->assignees->firstWhere('id', $userId);
                $suggestions[] = [
                    'type'    => 'overload',
                    'severity'=> 'warning',
                    'message' => "{$user->name} a {$count} tâches dans ce sprint. Redistribuez la charge.",
                ];
            }
        }

        // 2. Unassigned tasks
        $unassigned = $tasks->filter(fn ($t) => $t->assignees->isEmpty() && !in_array($t->status_id, $doneStatusIds));
        if ($unassigned->count() > 0) {
            $suggestions[] = [
                'type'    => 'unassigned',
                'severity'=> 'info',
                'message' => "{$unassigned->count()} tâche(s) n'ont pas encore été assignées.",
            ];
        }

        // 3. Blocked tasks (high complexity, no progress)
        $blocked = $tasks->filter(fn ($t) => ($t->complexity ?? 0) >= 7 && ($t->progress_percent ?? 0) === 0 && !in_array($t->status_id, $doneStatusIds));
        if ($blocked->count() > 0) {
            $suggestions[] = [
                'type'    => 'blocked',
                'severity'=> 'warning',
                'message' => "{$blocked->count()} tâche(s) complexe(s) n'ont pas encore commencé. Priorisez-les.",
            ];
        }

        // 4. Sprint scope
        $totalPoints = $tasks->sum('story_points') ?: $tasks->count();
        if ($totalPoints > 50) {
            $suggestions[] = [
                'type'    => 'scope',
                'severity'=> 'warning',
                'message' => "Le sprint contient {$totalPoints} points, ce qui est élevé. Envisagez de réduire la portée.",
            ];
        }

        // 5. Completion prediction
        $today = now()->startOfDay();
        $daysRemaining = max(0, $today->diffInDays($sprint->end_date, false));
        $completedPoints = $tasks->filter(fn ($t) => in_array($t->status_id, $doneStatusIds))
            ->sum(fn ($t) => $t->story_points ?: 1);
        $remainingPoints = $totalPoints - $completedPoints;

        if ($daysRemaining > 0 && $remainingPoints > 0) {
            $daysElapsed = max(1, $sprint->start_date->diffInDays($today));
            $velocity = $completedPoints / $daysElapsed;
            $needed = $remainingPoints / $daysRemaining;

            if ($velocity > 0 && $needed > $velocity * 1.3) {
                $suggestions[] = [
                    'type'    => 'prediction',
                    'severity'=> 'danger',
                    'message' => "Le rythme actuel ne permettra probablement pas de terminer le sprint à temps.",
                ];
            } elseif ($velocity > 0 && $needed > $velocity) {
                $suggestions[] = [
                    'type'    => 'prediction',
                    'severity'=> 'warning',
                    'message' => "Le sprint est serré. Il faut accélérer le rythme pour respecter la deadline.",
                ];
            }
        }

        if (empty($suggestions)) {
            $suggestions[] = [
                'type'    => 'success',
                'severity'=> 'success',
                'message' => "Le sprint est en bonne voie. Continuez ainsi !",
            ];
        }

        return $suggestions;
    }

    // ──────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ──────────────────────────────────────────────────────────────

    private function extractKeywords(string $name, ?string $description): array
    {
        $text = strtolower($name . ' ' . ($description ?? ''));
        $text = preg_replace('/[^a-z0-9àâäéèêëïîôùûüÿçæœ\s\-]/', ' ', $text);
        $words = array_unique(preg_split('/\s+/', $text));
        return array_values(array_filter($words, fn ($w) => mb_strlen($w) > 2));
    }

    private function selectTemplates(array $keywords): array
    {
        $all = $this->getTemplateLibrary();
        $scored = [];

        foreach ($all as $key => $template) {
            $score = 0;
            foreach ($keywords as $word) {
                foreach ($template['keywords'] as $kw) {
                    if (str_contains($kw, $word) || str_contains($word, $kw)) {
                        $score += 3;
                    }
                }
                if (str_contains(strtolower($template['epic']), $word)) {
                    $score += 2;
                }
            }
            $scored[$key] = $score;
        }

        arsort($scored);

        // Always include foundation epics
        $foundation = ['authentication', 'ui_foundation'];
        $selected = [];
        foreach ($foundation as $fKey) {
            if (isset($all[$fKey])) {
                $selected[] = $all[$fKey];
            }
        }

        // Pick top scored (exclude already-selected foundation)
        $count = 0;
        foreach ($scored as $key => $score) {
            if (in_array($key, $foundation)) continue;
            if ($count >= 4) break;
            $selected[] = $all[$key];
            $count++;
        }

        // Assign priority ordering
        foreach ($selected as $i => &$tmpl) {
            $tmpl['priority'] = max(1, 5 - $i);
        }

        return $selected;
    }

    private function ensureStatuses(Project $project): \Illuminate\Database\Eloquent\Collection
    {
        $existing = $project->statuses()->get();
        if ($existing->count() >= 3) {
            return $existing;
        }

        $defaults = [
            ['name' => 'Backlog',     'color' => '#94a3b8', 'order' => 0, 'is_default' => true],
            ['name' => 'À faire',     'color' => '#3b82f6', 'order' => 1, 'is_default' => false],
            ['name' => 'En cours',    'color' => '#f59e0b', 'order' => 2, 'is_default' => false],
            ['name' => 'En test',     'color' => '#8b5cf6', 'order' => 3, 'is_default' => false],
            ['name' => 'Terminé',     'color' => '#22c55e', 'order' => 4, 'is_default' => false],
        ];

        foreach ($defaults as $status) {
            $project->statuses()->create($status);
        }

        return $project->statuses()->get();
    }

    private function createSprints(Project $project, array $tasks, int $durationDays, int $pointsPerSprint): array
    {
        if (empty($tasks)) return [];

        // Sort tasks by priority desc (urgent first)
        $priorityOrder = ['urgent' => 4, 'high' => 3, 'medium' => 2, 'low' => 1];
        usort($tasks, fn ($a, $b) => ($priorityOrder[$b->priority] ?? 0) - ($priorityOrder[$a->priority] ?? 0));

        $sprintBuckets = [];
        $currentPoints = 0;
        $bucketIndex = 0;

        foreach ($tasks as $task) {
            $points = $task->story_points ?: 1;
            if ($currentPoints + $points > $pointsPerSprint && $currentPoints > 0) {
                $bucketIndex++;
                $currentPoints = 0;
            }
            $sprintBuckets[$bucketIndex][] = $task;
            $currentPoints += $points;
        }

        $sprints = [];
        $startDate = $project->start_date ?? now()->addDay();

        foreach ($sprintBuckets as $i => $bucket) {
            $sprintStart = $startDate->copy()->addDays($i * $durationDays);
            $sprintEnd = $sprintStart->copy()->addDays($durationDays - 1);

            $sprintGoals = collect($bucket)->pluck('title')->take(3)->implode(', ');

            $sprint = Sprint::create([
                'project_id' => $project->id,
                'name'       => 'Sprint ' . ($i + 1),
                'goal'       => $sprintGoals,
                'start_date' => $sprintStart->toDateString(),
                'end_date'   => $sprintEnd->toDateString(),
                'status'     => $i === 0 ? 'active' : 'planned',
                'created_by' => Auth::id(),
            ]);

            foreach ($bucket as $task) {
                $task->update(['sprint_id' => $sprint->id]);
            }

            $sprint->loadCount('tasks');
            $sprints[] = $sprint;
        }

        return $sprints;
    }

    // ──────────────────────────────────────────────────────────────
    // TEMPLATE LIBRARY — Software domain knowledge base
    // ──────────────────────────────────────────────────────────────

    private function getTemplateLibrary(): array
    {
        return [
            'authentication' => [
                'keywords' => ['auth', 'login', 'sécurité', 'security', 'user', 'utilisateur', 'compte', 'account', 'password', 'mot de passe', 'inscription', 'register'],
                'epic' => 'Authentification & Sécurité',
                'epic_description' => "Mise en place du système d'authentification sécurisé avec gestion des comptes utilisateurs.",
                'priority' => 5,
                'stories' => [
                    [
                        'title' => "En tant qu'utilisateur, je souhaite m'inscrire de manière sécurisée",
                        'description' => "Formulaire d'inscription avec validation des données et vérification email.",
                        'story_points' => 8,
                        'priority' => 5,
                        'tasks' => [
                            ['title' => 'Créer le endpoint API d\'inscription', 'priority' => 'high', 'complexity' => 5, 'story_points' => 3, 'estimated_hours' => 6, 'description' => 'Endpoint POST /register avec validation.'],
                            ['title' => 'Construire le formulaire d\'inscription (UI)', 'priority' => 'high', 'complexity' => 4, 'story_points' => 2, 'estimated_hours' => 4, 'description' => 'Formulaire React avec validation côté client.'],
                            ['title' => 'Implémenter la validation des données', 'priority' => 'high', 'complexity' => 3, 'story_points' => 2, 'estimated_hours' => 3, 'description' => 'Validation email, mot de passe fort, unicité.'],
                            ['title' => 'Ajouter la vérification par email', 'priority' => 'medium', 'complexity' => 4, 'story_points' => 1, 'estimated_hours' => 3, 'description' => 'Envoi de mail de confirmation.'],
                        ],
                    ],
                    [
                        'title' => "En tant qu'utilisateur, je souhaite me connecter de manière sécurisée",
                        'description' => "Système de login avec JWT et gestion des sessions.",
                        'story_points' => 8,
                        'priority' => 5,
                        'tasks' => [
                            ['title' => 'Créer le endpoint API de connexion', 'priority' => 'high', 'complexity' => 5, 'story_points' => 3, 'estimated_hours' => 6, 'description' => 'Endpoint POST /login avec génération de token.'],
                            ['title' => 'Construire le formulaire de connexion (UI)', 'priority' => 'high', 'complexity' => 3, 'story_points' => 2, 'estimated_hours' => 4, 'description' => 'Page de login responsive.'],
                            ['title' => 'Implémenter l\'authentification JWT/Sanctum', 'priority' => 'high', 'complexity' => 6, 'story_points' => 2, 'estimated_hours' => 5, 'description' => 'Middleware d\'authentification et guard.'],
                            ['title' => 'Ajouter la gestion des rôles et permissions', 'priority' => 'high', 'complexity' => 6, 'story_points' => 1, 'estimated_hours' => 4, 'description' => 'RBAC avec Spatie Permission.'],
                        ],
                    ],
                    [
                        'title' => "En tant qu'utilisateur, je souhaite réinitialiser mon mot de passe",
                        'description' => "Flux de réinitialisation par email avec token sécurisé.",
                        'story_points' => 5,
                        'priority' => 3,
                        'tasks' => [
                            ['title' => 'Créer le endpoint de demande de réinitialisation', 'priority' => 'medium', 'complexity' => 4, 'story_points' => 2, 'estimated_hours' => 4, 'description' => 'Envoyer un lien sécurisé par email.'],
                            ['title' => 'Créer la page de réinitialisation (UI)', 'priority' => 'medium', 'complexity' => 3, 'story_points' => 2, 'estimated_hours' => 3, 'description' => 'Formulaire de nouveau mot de passe.'],
                            ['title' => 'Implémenter la validation du token', 'priority' => 'medium', 'complexity' => 4, 'story_points' => 1, 'estimated_hours' => 3, 'description' => 'Vérification expiration et usage unique.'],
                        ],
                    ],
                ],
            ],

            'ui_foundation' => [
                'keywords' => ['ui', 'interface', 'design', 'frontend', 'layout', 'theme', 'navigation', 'responsive', 'mobile'],
                'epic' => 'Interface Utilisateur & Navigation',
                'epic_description' => "Mise en place de l'interface utilisateur de base, navigation et thème.",
                'priority' => 4,
                'stories' => [
                    [
                        'title' => "En tant qu'utilisateur, je souhaite une interface responsive",
                        'description' => "L'application doit s'adapter à toutes les tailles d'écran.",
                        'story_points' => 5,
                        'priority' => 4,
                        'tasks' => [
                            ['title' => 'Mettre en place le layout principal', 'priority' => 'high', 'complexity' => 4, 'story_points' => 2, 'estimated_hours' => 5, 'description' => 'Layout avec sidebar, topbar, zone de contenu.'],
                            ['title' => 'Créer les composants UI de base', 'priority' => 'high', 'complexity' => 5, 'story_points' => 2, 'estimated_hours' => 6, 'description' => 'Button, Card, Modal, Input, Select, Badge.'],
                            ['title' => 'Configurer le système de thème', 'priority' => 'medium', 'complexity' => 3, 'story_points' => 1, 'estimated_hours' => 3, 'description' => 'Variables CSS, dark/light mode.'],
                        ],
                    ],
                    [
                        'title' => "En tant qu'utilisateur, je souhaite naviguer facilement",
                        'description' => "Navigation intuitive avec sidebar et breadcrumbs.",
                        'story_points' => 5,
                        'priority' => 4,
                        'tasks' => [
                            ['title' => 'Créer la sidebar de navigation', 'priority' => 'high', 'complexity' => 4, 'story_points' => 2, 'estimated_hours' => 5, 'description' => 'Sidebar avec sections et items actifs.'],
                            ['title' => 'Implémenter le routing React', 'priority' => 'high', 'complexity' => 4, 'story_points' => 2, 'estimated_hours' => 4, 'description' => 'Routes protégées par rôle.'],
                            ['title' => 'Ajouter les pages d\'erreur', 'priority' => 'low', 'complexity' => 2, 'story_points' => 1, 'estimated_hours' => 2, 'description' => 'Pages 404, 403, 500.'],
                        ],
                    ],
                ],
            ],

            'dashboard' => [
                'keywords' => ['dashboard', 'tableau de bord', 'analytics', 'statistiques', 'stats', 'metrics', 'kpi', 'graphique', 'chart'],
                'epic' => 'Tableau de Bord & Analytics',
                'epic_description' => "Création des tableaux de bord avec métriques, graphiques et indicateurs clés.",
                'priority' => 4,
                'stories' => [
                    [
                        'title' => "En tant que manager, je souhaite voir les KPIs du projet",
                        'description' => "Vue d'ensemble avec métriques clés et graphiques de performance.",
                        'story_points' => 8,
                        'priority' => 4,
                        'tasks' => [
                            ['title' => 'Créer les endpoints API de statistiques', 'priority' => 'high', 'complexity' => 6, 'story_points' => 3, 'estimated_hours' => 8, 'description' => 'Agrégation des données projet.'],
                            ['title' => 'Construire les composants MetricCard', 'priority' => 'high', 'complexity' => 3, 'story_points' => 2, 'estimated_hours' => 4, 'description' => 'Cartes avec icônes et valeurs.'],
                            ['title' => 'Intégrer les graphiques Recharts', 'priority' => 'medium', 'complexity' => 5, 'story_points' => 2, 'estimated_hours' => 5, 'description' => 'Graphiques camembert, courbes, barres.'],
                            ['title' => 'Ajouter les tâches urgentes et en retard', 'priority' => 'medium', 'complexity' => 4, 'story_points' => 1, 'estimated_hours' => 3, 'description' => 'Liste des tâches à risque.'],
                        ],
                    ],
                    [
                        'title' => "En tant que développeur, je souhaite voir mes tâches du jour",
                        'description' => "Dashboard personnel avec tâches assignées et progression.",
                        'story_points' => 5,
                        'priority' => 3,
                        'tasks' => [
                            ['title' => 'Créer l\'endpoint tasks personnelles', 'priority' => 'medium', 'complexity' => 4, 'story_points' => 2, 'estimated_hours' => 4, 'description' => 'Filtrer les tâches de l\'utilisateur.'],
                            ['title' => 'Construire la vue développeur', 'priority' => 'medium', 'complexity' => 4, 'story_points' => 2, 'estimated_hours' => 5, 'description' => 'Page dashboard développeur.'],
                            ['title' => 'Afficher la progression personnelle', 'priority' => 'low', 'complexity' => 3, 'story_points' => 1, 'estimated_hours' => 3, 'description' => 'Barre de progression et stats.'],
                        ],
                    ],
                ],
            ],

            'project_management' => [
                'keywords' => ['projet', 'project', 'manage', 'gestion', 'équipe', 'team', 'milestone', 'jalon', 'planning', 'timeline'],
                'epic' => 'Gestion de Projets',
                'epic_description' => "CRUD complet des projets avec gestion d'équipe, jalons et timeline.",
                'priority' => 4,
                'stories' => [
                    [
                        'title' => "En tant que manager, je souhaite créer et gérer des projets",
                        'description' => "CRUD des projets avec informations, dates et membres.",
                        'story_points' => 8,
                        'priority' => 4,
                        'tasks' => [
                            ['title' => 'Créer les endpoints CRUD projet', 'priority' => 'high', 'complexity' => 5, 'story_points' => 3, 'estimated_hours' => 7, 'description' => 'API REST complète pour les projets.'],
                            ['title' => 'Construire le formulaire de création projet', 'priority' => 'high', 'complexity' => 4, 'story_points' => 2, 'estimated_hours' => 5, 'description' => 'Modal avec nom, description, dates, équipe.'],
                            ['title' => 'Implémenter la liste des projets', 'priority' => 'high', 'complexity' => 3, 'story_points' => 2, 'estimated_hours' => 4, 'description' => 'Grille de projets avec filtres et recherche.'],
                            ['title' => 'Ajouter la gestion des membres', 'priority' => 'medium', 'complexity' => 5, 'story_points' => 1, 'estimated_hours' => 4, 'description' => 'Ajout/suppression de membres avec rôles.'],
                        ],
                    ],
                    [
                        'title' => "En tant que membre, je souhaite voir le détail du projet",
                        'description' => "Page détaillée avec kanban, membres et activité.",
                        'story_points' => 5,
                        'priority' => 3,
                        'tasks' => [
                            ['title' => 'Créer la page détail projet', 'priority' => 'high', 'complexity' => 5, 'story_points' => 2, 'estimated_hours' => 5, 'description' => 'Page avec onglets kanban/membres/activité.'],
                            ['title' => 'Implémenter le log d\'activité', 'priority' => 'medium', 'complexity' => 4, 'story_points' => 2, 'estimated_hours' => 4, 'description' => 'Historique des actions sur le projet.'],
                            ['title' => 'Afficher les statistiques projet', 'priority' => 'low', 'complexity' => 3, 'story_points' => 1, 'estimated_hours' => 3, 'description' => 'Progression, deadlines, health.'],
                        ],
                    ],
                ],
            ],

            'task_management' => [
                'keywords' => ['tâche', 'task', 'kanban', 'board', 'assignation', 'assign', 'priority', 'deadline', 'sprint', 'backlog', 'scrum'],
                'epic' => 'Gestion des Tâches',
                'epic_description' => "Système complet de gestion des tâches avec kanban, assignation et suivi.",
                'priority' => 5,
                'stories' => [
                    [
                        'title' => "En tant que manager, je souhaite créer et assigner des tâches",
                        'description' => "CRUD des tâches avec priorité, complexité et assignation.",
                        'story_points' => 8,
                        'priority' => 5,
                        'tasks' => [
                            ['title' => 'Créer les endpoints CRUD tâches', 'priority' => 'high', 'complexity' => 6, 'story_points' => 3, 'estimated_hours' => 8, 'description' => 'API complète avec filtres et tri.'],
                            ['title' => 'Construire le formulaire de tâche', 'priority' => 'high', 'complexity' => 5, 'story_points' => 2, 'estimated_hours' => 5, 'description' => 'Modal avec champs titre, desc, priorité, etc.'],
                            ['title' => 'Implémenter le tableau kanban', 'priority' => 'high', 'complexity' => 7, 'story_points' => 2, 'estimated_hours' => 8, 'description' => 'Board drag-and-drop par statut.'],
                            ['title' => 'Ajouter le système d\'assignation', 'priority' => 'high', 'complexity' => 4, 'story_points' => 1, 'estimated_hours' => 4, 'description' => 'Assigner/désassigner des développeurs.'],
                        ],
                    ],
                    [
                        'title' => "En tant que développeur, je souhaite mettre à jour mes tâches",
                        'description' => "Changer le statut, ajouter des commentaires, log du temps.",
                        'story_points' => 5,
                        'priority' => 4,
                        'tasks' => [
                            ['title' => 'Implémenter le move kanban (changement de statut)', 'priority' => 'high', 'complexity' => 5, 'story_points' => 2, 'estimated_hours' => 5, 'description' => 'Drag-and-drop ou click pour changer le statut.'],
                            ['title' => 'Ajouter les commentaires de tâche', 'priority' => 'medium', 'complexity' => 4, 'story_points' => 2, 'estimated_hours' => 4, 'description' => 'Fil de discussion par tâche.'],
                            ['title' => 'Implémenter le suivi du temps', 'priority' => 'medium', 'complexity' => 4, 'story_points' => 1, 'estimated_hours' => 4, 'description' => 'Time tracking par tâche.'],
                        ],
                    ],
                ],
            ],

            'communication' => [
                'keywords' => ['notification', 'email', 'chat', 'message', 'comment', 'communication', 'alerte', 'alert', 'mention'],
                'epic' => 'Notifications & Communication',
                'epic_description' => "Système de notifications temps réel et communication d'équipe.",
                'priority' => 3,
                'stories' => [
                    [
                        'title' => "En tant qu'utilisateur, je souhaite recevoir des notifications",
                        'description' => "Notifications pour assignations, mises à jour, risques.",
                        'story_points' => 5,
                        'priority' => 3,
                        'tasks' => [
                            ['title' => 'Créer le système de notifications backend', 'priority' => 'medium', 'complexity' => 5, 'story_points' => 2, 'estimated_hours' => 5, 'description' => 'Service de création et envoi de notifications.'],
                            ['title' => 'Construire le centre de notifications (UI)', 'priority' => 'medium', 'complexity' => 4, 'story_points' => 2, 'estimated_hours' => 4, 'description' => 'Dropdown et page de notifications.'],
                            ['title' => 'Ajouter le marquage lu/non-lu', 'priority' => 'low', 'complexity' => 2, 'story_points' => 1, 'estimated_hours' => 2, 'description' => 'Mark as read individuel et groupé.'],
                        ],
                    ],
                ],
            ],

            'file_management' => [
                'keywords' => ['fichier', 'file', 'upload', 'pièce jointe', 'attachment', 'document', 'image', 'photo', 'stockage', 'storage'],
                'epic' => 'Gestion des Fichiers',
                'epic_description' => "Upload, stockage et gestion des fichiers et pièces jointes.",
                'priority' => 2,
                'stories' => [
                    [
                        'title' => "En tant qu'utilisateur, je souhaite joindre des fichiers aux tâches",
                        'description' => "Upload de fichiers et liens vers les tâches.",
                        'story_points' => 5,
                        'priority' => 2,
                        'tasks' => [
                            ['title' => 'Créer l\'endpoint d\'upload de fichiers', 'priority' => 'medium', 'complexity' => 5, 'story_points' => 2, 'estimated_hours' => 5, 'description' => 'Upload sécurisé avec validation de type.'],
                            ['title' => 'Construire le composant d\'upload (UI)', 'priority' => 'medium', 'complexity' => 4, 'story_points' => 2, 'estimated_hours' => 4, 'description' => 'Drag-and-drop ou clic pour uploader.'],
                            ['title' => 'Ajouter la prévisualisation des fichiers', 'priority' => 'low', 'complexity' => 3, 'story_points' => 1, 'estimated_hours' => 3, 'description' => 'Preview images et icônes par type.'],
                        ],
                    ],
                ],
            ],

            'api_integration' => [
                'keywords' => ['api', 'rest', 'webhook', 'integration', 'intégration', 'third-party', 'tiers', 'service', 'externe', 'external'],
                'epic' => 'API & Intégrations',
                'epic_description' => "Développement des APIs RESTful et intégrations avec services tiers.",
                'priority' => 3,
                'stories' => [
                    [
                        'title' => "En tant que développeur, je souhaite une API RESTful documentée",
                        'description' => "Endpoints cohérents avec documentation et versioning.",
                        'story_points' => 5,
                        'priority' => 3,
                        'tasks' => [
                            ['title' => 'Concevoir la structure des endpoints API', 'priority' => 'high', 'complexity' => 5, 'story_points' => 2, 'estimated_hours' => 5, 'description' => 'Routes, controllers, resources.'],
                            ['title' => 'Implémenter la gestion des erreurs API', 'priority' => 'medium', 'complexity' => 4, 'story_points' => 2, 'estimated_hours' => 4, 'description' => 'Réponses d\'erreur standardisées.'],
                            ['title' => 'Ajouter la pagination et filtrage', 'priority' => 'medium', 'complexity' => 3, 'story_points' => 1, 'estimated_hours' => 3, 'description' => 'Pagination, recherche, tri.'],
                        ],
                    ],
                ],
            ],

            'search_filtering' => [
                'keywords' => ['recherche', 'search', 'filtre', 'filter', 'tri', 'sort', 'pagination', 'full-text'],
                'epic' => 'Recherche & Filtrage',
                'epic_description' => "Système de recherche avancée avec filtres multiples.",
                'priority' => 2,
                'stories' => [
                    [
                        'title' => "En tant qu'utilisateur, je souhaite rechercher et filtrer les données",
                        'description' => "Recherche textuelle et filtres combinables.",
                        'story_points' => 5,
                        'priority' => 2,
                        'tasks' => [
                            ['title' => 'Implémenter la recherche full-text backend', 'priority' => 'medium', 'complexity' => 5, 'story_points' => 2, 'estimated_hours' => 5, 'description' => 'Recherche SQL LIKE ou scout.'],
                            ['title' => 'Créer les composants de filtre (UI)', 'priority' => 'medium', 'complexity' => 4, 'story_points' => 2, 'estimated_hours' => 4, 'description' => 'Filter bar avec multi-select.'],
                            ['title' => 'Ajouter le tri et la pagination', 'priority' => 'low', 'complexity' => 3, 'story_points' => 1, 'estimated_hours' => 3, 'description' => 'Tri par colonnes, pagination serveur.'],
                        ],
                    ],
                ],
            ],

            'ecommerce' => [
                'keywords' => ['ecommerce', 'commerce', 'boutique', 'shop', 'produit', 'product', 'panier', 'cart', 'paiement', 'payment', 'commande', 'order', 'checkout', 'achat'],
                'epic' => 'E-commerce & Paiements',
                'epic_description' => "Module e-commerce avec catalogue produits, panier et paiement.",
                'priority' => 4,
                'stories' => [
                    [
                        'title' => "En tant qu'utilisateur, je souhaite parcourir les produits",
                        'description' => "Catalogue avec recherche, filtres et fiches produits.",
                        'story_points' => 8,
                        'priority' => 4,
                        'tasks' => [
                            ['title' => 'Créer le modèle et l\'API produits', 'priority' => 'high', 'complexity' => 5, 'story_points' => 3, 'estimated_hours' => 7, 'description' => 'CRUD produits avec catégories.'],
                            ['title' => 'Construire la grille de produits (UI)', 'priority' => 'high', 'complexity' => 4, 'story_points' => 2, 'estimated_hours' => 5, 'description' => 'Grille responsive avec filtres.'],
                            ['title' => 'Créer la fiche produit détaillée', 'priority' => 'high', 'complexity' => 4, 'story_points' => 2, 'estimated_hours' => 4, 'description' => 'Page produit avec images et options.'],
                            ['title' => 'Implémenter le panier d\'achat', 'priority' => 'high', 'complexity' => 6, 'story_points' => 1, 'estimated_hours' => 6, 'description' => 'Gestion du panier avec persistance.'],
                        ],
                    ],
                    [
                        'title' => "En tant qu'utilisateur, je souhaite passer commande",
                        'description' => "Processus de checkout avec paiement sécurisé.",
                        'story_points' => 8,
                        'priority' => 5,
                        'tasks' => [
                            ['title' => 'Créer le flux de checkout', 'priority' => 'high', 'complexity' => 7, 'story_points' => 3, 'estimated_hours' => 8, 'description' => 'Étapes adresse, livraison, paiement.'],
                            ['title' => 'Intégrer le système de paiement', 'priority' => 'high', 'complexity' => 8, 'story_points' => 3, 'estimated_hours' => 10, 'description' => 'Stripe/PayPal integration.'],
                            ['title' => 'Créer le suivi de commande', 'priority' => 'medium', 'complexity' => 4, 'story_points' => 2, 'estimated_hours' => 5, 'description' => 'Page historique et suivi.'],
                        ],
                    ],
                ],
            ],

            'content_management' => [
                'keywords' => ['contenu', 'content', 'cms', 'article', 'blog', 'page', 'média', 'media', 'seo', 'publication', 'publish'],
                'epic' => 'Gestion de Contenu',
                'epic_description' => "Système de gestion de contenu avec articles, pages et médias.",
                'priority' => 3,
                'stories' => [
                    [
                        'title' => "En tant qu'admin, je souhaite créer du contenu",
                        'description' => "Éditeur de contenu riche avec prévisualisation.",
                        'story_points' => 8,
                        'priority' => 3,
                        'tasks' => [
                            ['title' => 'Créer le modèle et l\'API de contenu', 'priority' => 'high', 'complexity' => 5, 'story_points' => 3, 'estimated_hours' => 7, 'description' => 'CRUD avec statuts publication.'],
                            ['title' => 'Intégrer un éditeur WYSIWYG', 'priority' => 'high', 'complexity' => 5, 'story_points' => 3, 'estimated_hours' => 6, 'description' => 'TipTap ou Quill editor.'],
                            ['title' => 'Ajouter la gestion des médias', 'priority' => 'medium', 'complexity' => 4, 'story_points' => 2, 'estimated_hours' => 5, 'description' => 'Upload et bibliothèque de médias.'],
                        ],
                    ],
                ],
            ],

            'social_features' => [
                'keywords' => ['social', 'feed', 'like', 'follow', 'partage', 'share', 'profil', 'profile', 'communauté', 'community', 'réseau'],
                'epic' => 'Fonctionnalités Sociales',
                'epic_description' => "Interactions sociales avec profils, likes, follows et partage.",
                'priority' => 2,
                'stories' => [
                    [
                        'title' => "En tant qu'utilisateur, je souhaite interagir socialement",
                        'description' => "Système de likes, commentaires et abonnements.",
                        'story_points' => 8,
                        'priority' => 2,
                        'tasks' => [
                            ['title' => 'Créer le système de profils publics', 'priority' => 'medium', 'complexity' => 4, 'story_points' => 2, 'estimated_hours' => 5, 'description' => 'Page profil avec bio et activité.'],
                            ['title' => 'Implémenter les likes et réactions', 'priority' => 'medium', 'complexity' => 4, 'story_points' => 2, 'estimated_hours' => 4, 'description' => 'Like/unlike avec compteur.'],
                            ['title' => 'Ajouter le système d\'abonnements', 'priority' => 'medium', 'complexity' => 5, 'story_points' => 2, 'estimated_hours' => 5, 'description' => 'Follow/unfollow avec feed.'],
                            ['title' => 'Créer le fil d\'actualité', 'priority' => 'low', 'complexity' => 6, 'story_points' => 2, 'estimated_hours' => 7, 'description' => 'Feed agrégé des abonnements.'],
                        ],
                    ],
                ],
            ],

            'reporting' => [
                'keywords' => ['rapport', 'report', 'export', 'pdf', 'csv', 'excel', 'bilan', 'summary', 'analyse', 'analysis'],
                'epic' => 'Rapports & Exports',
                'epic_description' => "Génération de rapports et export de données.",
                'priority' => 2,
                'stories' => [
                    [
                        'title' => "En tant que manager, je souhaite générer des rapports",
                        'description' => "Rapports de performance, progression et bilans.",
                        'story_points' => 5,
                        'priority' => 2,
                        'tasks' => [
                            ['title' => 'Créer le service de génération de rapports', 'priority' => 'medium', 'complexity' => 6, 'story_points' => 2, 'estimated_hours' => 6, 'description' => 'Agrégation des données par période.'],
                            ['title' => 'Ajouter l\'export CSV/Excel', 'priority' => 'medium', 'complexity' => 4, 'story_points' => 2, 'estimated_hours' => 4, 'description' => 'Téléchargement des données filtrées.'],
                            ['title' => 'Générer des rapports PDF', 'priority' => 'low', 'complexity' => 5, 'story_points' => 1, 'estimated_hours' => 5, 'description' => 'Rapport formaté en PDF.'],
                        ],
                    ],
                ],
            ],

            'testing_qa' => [
                'keywords' => ['test', 'testing', 'qa', 'quality', 'qualité', 'ci', 'cd', 'pipeline', 'bug', 'debug'],
                'epic' => 'Tests & Assurance Qualité',
                'epic_description' => "Mise en place des tests automatisés et CI/CD.",
                'priority' => 3,
                'stories' => [
                    [
                        'title' => "En tant que développeur, je souhaite des tests automatisés",
                        'description' => "Tests unitaires, intégration et pipeline CI.",
                        'story_points' => 8,
                        'priority' => 3,
                        'tasks' => [
                            ['title' => 'Configurer PHPUnit et les factories', 'priority' => 'medium', 'complexity' => 4, 'story_points' => 2, 'estimated_hours' => 4, 'description' => 'Setup des tests Laravel.'],
                            ['title' => 'Écrire les tests CRUD principaux', 'priority' => 'medium', 'complexity' => 5, 'story_points' => 3, 'estimated_hours' => 8, 'description' => 'Tests API pour chaque resource.'],
                            ['title' => 'Configurer le pipeline CI/CD', 'priority' => 'low', 'complexity' => 5, 'story_points' => 2, 'estimated_hours' => 5, 'description' => 'GitHub Actions ou GitLab CI.'],
                            ['title' => 'Ajouter les tests frontend', 'priority' => 'low', 'complexity' => 5, 'story_points' => 1, 'estimated_hours' => 6, 'description' => 'Tests composants React.'],
                        ],
                    ],
                ],
            ],

            'data_management' => [
                'keywords' => ['donnée', 'data', 'import', 'export', 'backup', 'sauvegarde', 'archive', 'migration', 'sync', 'base de données', 'database'],
                'epic' => 'Gestion des Données',
                'epic_description' => "Import/export, sauvegarde et archivage des données.",
                'priority' => 2,
                'stories' => [
                    [
                        'title' => "En tant qu'admin, je souhaite gérer les données du système",
                        'description' => "Import, export et sauvegarde des données critiques.",
                        'story_points' => 5,
                        'priority' => 2,
                        'tasks' => [
                            ['title' => 'Créer le système d\'import de données', 'priority' => 'medium', 'complexity' => 6, 'story_points' => 2, 'estimated_hours' => 6, 'description' => 'Import CSV avec mapping de colonnes.'],
                            ['title' => 'Implémenter l\'export multi-format', 'priority' => 'medium', 'complexity' => 4, 'story_points' => 2, 'estimated_hours' => 4, 'description' => 'Export en CSV, JSON, Excel.'],
                            ['title' => 'Ajouter le système de backup automatique', 'priority' => 'low', 'complexity' => 5, 'story_points' => 1, 'estimated_hours' => 5, 'description' => 'Scheduled backup des données.'],
                        ],
                    ],
                ],
            ],

            'gantt_planning' => [
                'keywords' => ['gantt', 'planning', 'calendrier', 'calendar', 'timeline', 'échéancier', 'schedule', 'dépendance', 'dependency'],
                'epic' => 'Planification & Gantt',
                'epic_description' => "Visualisation Gantt et planification temporelle des tâches.",
                'priority' => 3,
                'stories' => [
                    [
                        'title' => "En tant que manager, je souhaite visualiser le planning",
                        'description' => "Diagramme de Gantt interactif avec dépendances.",
                        'story_points' => 8,
                        'priority' => 3,
                        'tasks' => [
                            ['title' => 'Créer l\'API de données Gantt', 'priority' => 'high', 'complexity' => 5, 'story_points' => 2, 'estimated_hours' => 5, 'description' => 'Endpoint avec tâches et dépendances.'],
                            ['title' => 'Construire le composant Gantt Chart', 'priority' => 'high', 'complexity' => 8, 'story_points' => 3, 'estimated_hours' => 10, 'description' => 'Rendu SVG interactif.'],
                            ['title' => 'Ajouter le drag-and-drop des dates', 'priority' => 'medium', 'complexity' => 6, 'story_points' => 2, 'estimated_hours' => 6, 'description' => 'Modifier les dates par glisser.'],
                            ['title' => 'Afficher les dépendances (flèches)', 'priority' => 'low', 'complexity' => 5, 'story_points' => 1, 'estimated_hours' => 4, 'description' => 'Lignes de liaison entre tâches.'],
                        ],
                    ],
                ],
            ],
        ];
    }
}
