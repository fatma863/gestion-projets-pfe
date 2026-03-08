<?php

namespace Database\Seeders;

use App\Models\Attachment;
use App\Models\Notification;
use App\Models\Project;
use App\Models\Task;
use App\Models\TaskComment;
use App\Models\TaskStatus;
use App\Models\Team;
use App\Models\TimeEntry;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DemoDataSeeder extends Seeder
{
    public function run(): void
    {
        // ── Users ───────────────────────────────────────
        $admin = User::firstOrCreate(
            ['email' => 'admin@gestion-projets.local'],
            [
                'name' => 'Fatma Rejeb',
                'password' => Hash::make('password'),
                'timezone' => 'Africa/Tunis',
            ]
        );
        $admin->assignRole('admin');

        $manager = User::firstOrCreate(
            ['email' => 'manager@gestion-projets.local'],
            [
                'name' => 'Ahmed Ben Ali',
                'password' => Hash::make('password'),
                'timezone' => 'Africa/Tunis',
            ]
        );
        $manager->assignRole('manager');

        $dev1 = User::firstOrCreate(
            ['email' => 'dev1@gestion-projets.local'],
            [
                'name' => 'Sami Trabelsi',
                'password' => Hash::make('password'),
                'timezone' => 'Africa/Tunis',
            ]
        );
        $dev1->assignRole('member');

        $dev2 = User::firstOrCreate(
            ['email' => 'dev2@gestion-projets.local'],
            [
                'name' => 'Ines Bouazizi',
                'password' => Hash::make('password'),
                'timezone' => 'Africa/Tunis',
            ]
        );
        $dev2->assignRole('member');

        $dev3 = User::firstOrCreate(
            ['email' => 'dev3@gestion-projets.local'],
            [
                'name' => 'Mohamed Gharbi',
                'password' => Hash::make('password'),
                'timezone' => 'Africa/Tunis',
            ]
        );
        $dev3->assignRole('member');

        // ── Team ────────────────────────────────────────
        $team = Team::firstOrCreate(
            ['name' => 'Équipe Développement'],
            ['description' => 'Équipe principale de développement logiciel']
        );

        $team->members()->syncWithoutDetaching([
            $admin->id => ['role_in_team' => 'lead', 'capacity_hours_per_week' => 40, 'skills' => json_encode(['PHP', 'React', 'MySQL', 'DevOps'])],
            $manager->id => ['role_in_team' => 'manager', 'capacity_hours_per_week' => 35, 'skills' => json_encode(['Gestion', 'Scrum', 'PHP'])],
            $dev1->id => ['role_in_team' => 'developer', 'capacity_hours_per_week' => 40, 'skills' => json_encode(['PHP', 'Laravel', 'MySQL'])],
            $dev2->id => ['role_in_team' => 'developer', 'capacity_hours_per_week' => 35, 'skills' => json_encode(['React', 'TypeScript', 'CSS'])],
            $dev3->id => ['role_in_team' => 'developer', 'capacity_hours_per_week' => 40, 'skills' => json_encode(['PHP', 'React', 'Testing'])],
        ]);

        // ── Project 1 ──────────────────────────────────
        $project1 = Project::firstOrCreate(
            ['code' => 'GPFE'],
            [
                'team_id' => $team->id,
                'name' => 'Gestion des Projets PFE',
                'description' => 'Application de gestion de projets intelligente avec IA pour estimation et optimisation.',
                'status' => 'active',
                'start_date' => '2026-01-15',
                'end_date' => '2026-06-30',
                'owner_id' => $admin->id,
                'created_by' => $admin->id,
            ]
        );

        $project1->members()->syncWithoutDetaching([
            $admin->id => ['project_role' => 'owner'],
            $manager->id => ['project_role' => 'manager'],
            $dev1->id => ['project_role' => 'developer'],
            $dev2->id => ['project_role' => 'developer'],
            $dev3->id => ['project_role' => 'developer'],
        ]);

        // ── Task Statuses (Kanban columns) ──────────────
        $statusTodo = TaskStatus::firstOrCreate(
            ['project_id' => $project1->id, 'name' => 'À faire'],
            ['color' => '#6B7280', 'order' => 0, 'is_default' => true]
        );
        $statusInProgress = TaskStatus::firstOrCreate(
            ['project_id' => $project1->id, 'name' => 'En cours'],
            ['color' => '#3B82F6', 'order' => 1]
        );
        $statusReview = TaskStatus::firstOrCreate(
            ['project_id' => $project1->id, 'name' => 'En revue'],
            ['color' => '#F59E0B', 'order' => 2]
        );
        $statusDone = TaskStatus::firstOrCreate(
            ['project_id' => $project1->id, 'name' => 'Terminé'],
            ['color' => '#10B981', 'order' => 3]
        );

        // ── Tasks ───────────────────────────────────────
        $tasks = [
            [
                'title' => 'Mise en place de l\'architecture backend',
                'description' => 'Configurer Laravel, Sanctum, Spatie, migrations et seeders.',
                'status_id' => $statusDone->id,
                'priority' => 'high',
                'complexity' => 3,
                'planned_start' => '2026-01-15',
                'planned_end' => '2026-01-25',
                'due_date' => '2026-01-25',
                'estimated_hours' => 16,
                'actual_hours' => 14,
                'progress_percent' => 100,
                'created_by' => $admin->id,
                'assignees' => [$dev1->id, $dev3->id],
            ],
            [
                'title' => 'Conception de la base de données',
                'description' => 'Créer le schéma de données complet : users, teams, projects, tasks, dépendances, commentaires, etc.',
                'status_id' => $statusDone->id,
                'priority' => 'high',
                'complexity' => 4,
                'planned_start' => '2026-01-20',
                'planned_end' => '2026-02-01',
                'due_date' => '2026-02-01',
                'estimated_hours' => 24,
                'actual_hours' => 20,
                'progress_percent' => 100,
                'created_by' => $admin->id,
                'assignees' => [$dev1->id],
            ],
            [
                'title' => 'API Authentification (Login/Register)',
                'description' => 'Implémenter les endpoints d\'authentification avec Sanctum.',
                'status_id' => $statusInProgress->id,
                'priority' => 'high',
                'complexity' => 2,
                'planned_start' => '2026-02-01',
                'planned_end' => '2026-02-10',
                'due_date' => '2026-02-10',
                'estimated_hours' => 8,
                'actual_hours' => 3,
                'progress_percent' => 40,
                'created_by' => $admin->id,
                'assignees' => [$dev1->id],
            ],
            [
                'title' => 'CRUD Projets (API)',
                'description' => 'Endpoints REST pour créer, lire, modifier, supprimer des projets.',
                'status_id' => $statusTodo->id,
                'priority' => 'high',
                'complexity' => 3,
                'planned_start' => '2026-02-10',
                'planned_end' => '2026-02-20',
                'due_date' => '2026-02-20',
                'estimated_hours' => 12,
                'progress_percent' => 0,
                'created_by' => $manager->id,
                'assignees' => [$dev1->id, $dev3->id],
            ],
            [
                'title' => 'CRUD Tâches (API)',
                'description' => 'Endpoints REST pour la gestion des tâches : création, modification, suppression, filtrage, pagination.',
                'status_id' => $statusTodo->id,
                'priority' => 'high',
                'complexity' => 4,
                'planned_start' => '2026-02-15',
                'planned_end' => '2026-03-01',
                'due_date' => '2026-03-01',
                'estimated_hours' => 20,
                'progress_percent' => 0,
                'created_by' => $manager->id,
                'assignees' => [$dev3->id],
            ],
            [
                'title' => 'Interface Kanban (Frontend)',
                'description' => 'Développer le composant Kanban avec drag & drop et persistance.',
                'status_id' => $statusTodo->id,
                'priority' => 'high',
                'complexity' => 4,
                'planned_start' => '2026-03-01',
                'planned_end' => '2026-03-15',
                'due_date' => '2026-03-15',
                'estimated_hours' => 24,
                'progress_percent' => 0,
                'created_by' => $manager->id,
                'assignees' => [$dev2->id],
            ],
            [
                'title' => 'Diagramme de Gantt',
                'description' => 'Vue Gantt avec timeline, dépendances, jalons et chemin critique.',
                'status_id' => $statusTodo->id,
                'priority' => 'medium',
                'complexity' => 5,
                'planned_start' => '2026-03-10',
                'planned_end' => '2026-03-25',
                'due_date' => '2026-03-25',
                'estimated_hours' => 32,
                'progress_percent' => 0,
                'created_by' => $manager->id,
                'assignees' => [$dev2->id],
            ],
            [
                'title' => 'Module IA - Estimation des tâches',
                'description' => 'Service d\'estimation automatique du temps basé sur l\'historique et PERT.',
                'status_id' => $statusTodo->id,
                'priority' => 'high',
                'complexity' => 5,
                'planned_start' => '2026-03-15',
                'planned_end' => '2026-04-01',
                'due_date' => '2026-04-01',
                'estimated_hours' => 24,
                'progress_percent' => 0,
                'created_by' => $admin->id,
                'assignees' => [$dev1->id, $dev3->id],
            ],
            [
                'title' => 'Module IA - Détection des retards',
                'description' => 'Service de calcul du score de risque de retard avec explications.',
                'status_id' => $statusTodo->id,
                'priority' => 'high',
                'complexity' => 5,
                'planned_start' => '2026-04-01',
                'planned_end' => '2026-04-15',
                'due_date' => '2026-04-15',
                'estimated_hours' => 20,
                'progress_percent' => 0,
                'created_by' => $admin->id,
                'assignees' => [$dev3->id],
            ],
            [
                'title' => 'Module IA - Optimisation répartition',
                'description' => 'Service d\'optimisation de l\'assignation des tâches pour équilibrer la charge.',
                'status_id' => $statusTodo->id,
                'priority' => 'medium',
                'complexity' => 5,
                'planned_start' => '2026-04-10',
                'planned_end' => '2026-04-25',
                'due_date' => '2026-04-25',
                'estimated_hours' => 24,
                'progress_percent' => 0,
                'created_by' => $admin->id,
                'assignees' => [$dev1->id],
            ],
            [
                'title' => 'Dashboard et KPIs',
                'description' => 'Tableau de bord avec avancement, retards, charge, tâches par statut.',
                'status_id' => $statusTodo->id,
                'priority' => 'medium',
                'complexity' => 3,
                'planned_start' => '2026-04-15',
                'planned_end' => '2026-05-01',
                'due_date' => '2026-05-01',
                'estimated_hours' => 16,
                'progress_percent' => 0,
                'created_by' => $manager->id,
                'assignees' => [$dev2->id],
            ],
            [
                'title' => 'Time tracking et timesheets',
                'description' => 'Saisie du temps passé par tâche + timer simple.',
                'status_id' => $statusTodo->id,
                'priority' => 'medium',
                'complexity' => 3,
                'planned_start' => '2026-05-01',
                'planned_end' => '2026-05-10',
                'due_date' => '2026-05-10',
                'estimated_hours' => 12,
                'progress_percent' => 0,
                'created_by' => $manager->id,
                'assignees' => [$dev2->id, $dev3->id],
            ],
        ];

        $createdTasks = [];
        foreach ($tasks as $index => $taskData) {
            $assignees = $taskData['assignees'] ?? [];
            unset($taskData['assignees']);

            $task = Task::firstOrCreate(
                ['project_id' => $project1->id, 'title' => $taskData['title']],
                array_merge($taskData, [
                    'project_id' => $project1->id,
                    'kanban_order' => $index,
                ])
            );

            foreach ($assignees as $userId) {
                $task->assignees()->syncWithoutDetaching([$userId => ['allocation_percent' => 100]]);
            }

            $createdTasks[] = $task;
        }

        // ── Dependencies ────────────────────────────────
        // Task 3 (Auth API) depends on Task 1 (Architecture)
        if (isset($createdTasks[2], $createdTasks[0])) {
            $createdTasks[2]->dependencies()->syncWithoutDetaching([
                $createdTasks[0]->id => ['type' => 'FS'],
            ]);
        }
        // Task 4 (CRUD Projets) depends on Task 3 (Auth)
        if (isset($createdTasks[3], $createdTasks[2])) {
            $createdTasks[3]->dependencies()->syncWithoutDetaching([
                $createdTasks[2]->id => ['type' => 'FS'],
            ]);
        }
        // Task 5 (CRUD Tâches) depends on Task 4 (CRUD Projets)
        if (isset($createdTasks[4], $createdTasks[3])) {
            $createdTasks[4]->dependencies()->syncWithoutDetaching([
                $createdTasks[3]->id => ['type' => 'FS'],
            ]);
        }
        // Task 6 (Kanban) depends on Task 5 (CRUD Tâches)
        if (isset($createdTasks[5], $createdTasks[4])) {
            $createdTasks[5]->dependencies()->syncWithoutDetaching([
                $createdTasks[4]->id => ['type' => 'FS'],
            ]);
        }
        // Task 7 (Gantt) depends on Task 5 (CRUD Tâches)
        if (isset($createdTasks[6], $createdTasks[4])) {
            $createdTasks[6]->dependencies()->syncWithoutDetaching([
                $createdTasks[4]->id => ['type' => 'FS'],
            ]);
        }

        // ── Comments ────────────────────────────────────
        if (isset($createdTasks[0])) {
            TaskComment::firstOrCreate(
                ['task_id' => $createdTasks[0]->id, 'user_id' => $admin->id, 'body' => 'Architecture initiale terminée avec Sanctum + Spatie. Prêt pour le développement des features.'],
            );
            TaskComment::firstOrCreate(
                ['task_id' => $createdTasks[0]->id, 'user_id' => $dev1->id, 'body' => 'Migrations créées et testées. Tous les modèles sont en place.'],
            );
        }

        // ── Time Entries ────────────────────────────────
        if (isset($createdTasks[0])) {
            TimeEntry::firstOrCreate(
                ['task_id' => $createdTasks[0]->id, 'user_id' => $dev1->id, 'date' => '2026-01-16'],
                ['minutes' => 480, 'note' => 'Setup Laravel, Sanctum, migrations initiales', 'source' => 'manual']
            );
            TimeEntry::firstOrCreate(
                ['task_id' => $createdTasks[0]->id, 'user_id' => $dev3->id, 'date' => '2026-01-17'],
                ['minutes' => 360, 'note' => 'Configuration Spatie, rôles et permissions', 'source' => 'manual']
            );
        }
        if (isset($createdTasks[2])) {
            TimeEntry::firstOrCreate(
                ['task_id' => $createdTasks[2]->id, 'user_id' => $dev1->id, 'date' => '2026-02-02'],
                ['minutes' => 180, 'note' => 'Endpoints login/register', 'source' => 'manual']
            );
        }

        // ── Project 2 (secondary) ──────────────────────
        $project2 = Project::firstOrCreate(
            ['code' => 'SITE'],
            [
                'team_id' => $team->id,
                'name' => 'Site Web Entreprise',
                'description' => 'Refonte du site web corporate avec nouveau design.',
                'status' => 'planning',
                'start_date' => '2026-04-01',
                'end_date' => '2026-08-31',
                'owner_id' => $manager->id,
                'created_by' => $manager->id,
            ]
        );

        $project2->members()->syncWithoutDetaching([
            $manager->id => ['project_role' => 'owner'],
            $dev2->id => ['project_role' => 'developer'],
        ]);

        $p2StatusTodo = TaskStatus::firstOrCreate(
            ['project_id' => $project2->id, 'name' => 'À faire'],
            ['color' => '#6B7280', 'order' => 0, 'is_default' => true]
        );
        $p2StatusInProgress = TaskStatus::firstOrCreate(
            ['project_id' => $project2->id, 'name' => 'En cours'],
            ['color' => '#3B82F6', 'order' => 1]
        );
        $p2StatusDone = TaskStatus::firstOrCreate(
            ['project_id' => $project2->id, 'name' => 'Terminé'],
            ['color' => '#10B981', 'order' => 2]
        );

        Task::firstOrCreate(
            ['project_id' => $project2->id, 'title' => 'Maquettes UI/UX'],
            [
                'description' => 'Créer les maquettes du nouveau site.',
                'status_id' => $p2StatusTodo->id,
                'priority' => 'high',
                'complexity' => 3,
                'planned_start' => '2026-04-01',
                'planned_end' => '2026-04-15',
                'due_date' => '2026-04-15',
                'estimated_hours' => 16,
                'created_by' => $manager->id,
                'kanban_order' => 0,
            ]
        );

        // ── Notifications ───────────────────────────────
        $notifSamples = [
            [
                'user_id' => $admin->id,
                'type'    => 'task_assigned',
                'title'   => 'Nouvelle assignation',
                'message' => "Vous avez été assigné(e) à la tâche « Conception de la base de données » dans le projet « {$project1->name} ».",
                'data'    => ['task_id' => 2, 'project_id' => $project1->id],
            ],
            [
                'user_id' => $admin->id,
                'type'    => 'task_commented',
                'title'   => 'Nouveau commentaire',
                'message' => "{$manager->name} a commenté la tâche « CRUD Projets (API) ».",
                'data'    => ['task_id' => 4, 'project_id' => $project1->id, 'comment_id' => 1],
            ],
            [
                'user_id' => $admin->id,
                'type'    => 'project_updated',
                'title'   => 'Projet mis à jour',
                'message' => "Le projet « {$project2->name} » a été mis à jour.",
                'data'    => ['project_id' => $project2->id],
            ],
            [
                'user_id' => $admin->id,
                'type'    => 'delay_risk',
                'title'   => 'Risque de retard',
                'message' => "La tâche « API Authentification » présente un risque de retard élevé (score : 72).",
                'data'    => ['task_id' => 3, 'project_id' => $project1->id, 'risk_level' => 'high', 'risk_score' => 72],
            ],
            [
                'user_id' => $admin->id,
                'type'    => 'deadline_approaching',
                'title'   => 'Échéance proche',
                'message' => "La tâche « CRUD Tâches (API) » arrive à échéance le 10/03/2026.",
                'data'    => ['task_id' => 5, 'project_id' => $project1->id],
            ],
            [
                'user_id' => $dev1->id,
                'type'    => 'task_assigned',
                'title'   => 'Nouvelle assignation',
                'message' => "Vous avez été assigné(e) à la tâche « Mise en place de l'architecture backend » dans le projet « {$project1->name} ».",
                'data'    => ['task_id' => 1, 'project_id' => $project1->id],
            ],
            [
                'user_id' => $manager->id,
                'type'    => 'project_updated',
                'title'   => 'Projet mis à jour',
                'message' => "Le projet « {$project1->name} » a été mis à jour.",
                'data'    => ['project_id' => $project1->id],
            ],
        ];

        foreach ($notifSamples as $notif) {
            Notification::firstOrCreate(
                ['user_id' => $notif['user_id'], 'type' => $notif['type'], 'message' => $notif['message']],
                $notif,
            );
        }
    }
}
