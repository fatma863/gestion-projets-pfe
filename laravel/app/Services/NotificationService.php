<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\Project;
use App\Models\Task;
use App\Models\TaskComment;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

class NotificationService
{
    /**
     * Notify a user that they've been assigned to a task.
     */
    public static function taskAssigned(Task $task, int $assignedUserId): void
    {
        $currentUserId = Auth::id();
        if ($assignedUserId === $currentUserId) {
            return;
        }

        $task->loadMissing('project');

        Notification::create([
            'user_id' => $assignedUserId,
            'type'    => 'task_assigned',
            'title'   => 'Nouvelle assignation',
            'message' => "Vous avez été assigné(e) à la tâche « {$task->title} » dans le projet « {$task->project->name} ».",
            'data'    => [
                'task_id'    => $task->id,
                'project_id' => $task->project_id,
            ],
        ]);
    }

    /**
     * Notify task assignees and creator about a new comment.
     */
    public static function taskCommented(Task $task, TaskComment $comment): void
    {
        $currentUserId = Auth::id();
        $task->loadMissing(['assignees', 'project']);

        $recipientIds = $task->assignees->pluck('id')->toArray();
        if ($task->created_by) {
            $recipientIds[] = $task->created_by;
        }

        $recipientIds = array_unique($recipientIds);
        $recipientIds = array_filter($recipientIds, fn ($id) => $id !== $currentUserId);

        $commenterName = $comment->user?->name ?? 'Quelqu\'un';

        foreach ($recipientIds as $userId) {
            Notification::create([
                'user_id' => $userId,
                'type'    => 'task_commented',
                'title'   => 'Nouveau commentaire',
                'message' => "{$commenterName} a commenté la tâche « {$task->title} ».",
                'data'    => [
                    'task_id'    => $task->id,
                    'project_id' => $task->project_id,
                    'comment_id' => $comment->id,
                ],
            ]);
        }
    }

    /**
     * Notify project members about a newly created project.
     */
    public static function projectCreated(Project $project): void
    {
        if (!$project->team_id) {
            return;
        }

        $project->loadMissing('team.members');
        $currentUserId = Auth::id();

        foreach ($project->team->members as $member) {
            if ($member->id === $currentUserId) {
                continue;
            }

            Notification::create([
                'user_id' => $member->id,
                'type'    => 'project_created',
                'title'   => 'Nouveau projet',
                'message' => "Le projet « {$project->name} » a été créé.",
                'data'    => [
                    'project_id' => $project->id,
                ],
            ]);
        }
    }

    /**
     * Notify project members about a project update.
     */
    public static function projectUpdated(Project $project): void
    {
        $project->loadMissing('members');
        $currentUserId = Auth::id();

        foreach ($project->members as $member) {
            if ($member->id === $currentUserId) {
                continue;
            }

            Notification::create([
                'user_id' => $member->id,
                'type'    => 'project_updated',
                'title'   => 'Projet mis à jour',
                'message' => "Le projet « {$project->name} » a été mis à jour.",
                'data'    => [
                    'project_id' => $project->id,
                ],
            ]);
        }
    }

    /**
     * Notify task assignees when AI detects high delay risk.
     */
    public static function delayRiskDetected(Task $task, string $riskLevel, float $riskScore): void
    {
        if (!in_array($riskLevel, ['high', 'critical'])) {
            return;
        }

        $task->loadMissing(['assignees', 'project']);

        $label = $riskLevel === 'critical' ? 'critique' : 'élevé';

        foreach ($task->assignees as $user) {
            Notification::create([
                'user_id' => $user->id,
                'type'    => 'delay_risk',
                'title'   => 'Risque de retard',
                'message' => "La tâche « {$task->title} » présente un risque de retard {$label} (score : {$riskScore}).",
                'data'    => [
                    'task_id'    => $task->id,
                    'project_id' => $task->project_id,
                    'risk_level' => $riskLevel,
                    'risk_score' => $riskScore,
                ],
            ]);
        }
    }

    /**
     * Notify users about tasks with approaching deadlines.
     * Intended to be called from a scheduled command.
     */
    public static function deadlineApproaching(Task $task): void
    {
        $task->loadMissing(['assignees', 'project']);

        $dueDate = $task->due_date?->format('d/m/Y') ?? '?';

        $recipientIds = $task->assignees->pluck('id')->toArray();
        if ($task->created_by) {
            $recipientIds[] = $task->created_by;
        }
        $recipientIds = array_unique($recipientIds);

        foreach ($recipientIds as $userId) {
            Notification::create([
                'user_id' => $userId,
                'type'    => 'deadline_approaching',
                'title'   => 'Échéance proche',
                'message' => "La tâche « {$task->title} » arrive à échéance le {$dueDate}.",
                'data'    => [
                    'task_id'    => $task->id,
                    'project_id' => $task->project_id,
                    'due_date'   => $task->due_date?->toISOString(),
                ],
            ]);
        }
    }
}
