<?php

namespace App\Services;

use App\Models\ActivityLog;
use Illuminate\Support\Facades\Auth;

class ActivityLogService
{
    public static function log(int $projectId, string $action, $subject = null, array $properties = []): ActivityLog
    {
        return ActivityLog::create([
            'project_id'   => $projectId,
            'user_id'      => Auth::id(),
            'action'       => $action,
            'subject_type' => $subject ? get_class($subject) : null,
            'subject_id'   => $subject?->id,
            'properties'   => $properties ?: null,
        ]);
    }

    // ── Convenience helpers ──

    public static function projectCreated($project): void
    {
        static::log($project->id, 'project_created', $project, [
            'name' => $project->name,
        ]);
    }

    public static function memberAdded($project, $user, string $role): void
    {
        static::log($project->id, 'member_added', $project, [
            'user_id'   => $user->id ?? $user,
            'user_name' => is_object($user) ? $user->name : null,
            'role'      => $role,
        ]);
    }

    public static function memberRemoved($project, $userId): void
    {
        static::log($project->id, 'member_removed', $project, [
            'user_id' => $userId,
        ]);
    }

    public static function taskCreated($task): void
    {
        static::log($task->project_id, 'task_created', $task, [
            'title'    => $task->title,
            'priority' => $task->priority,
        ]);
    }

    public static function taskUpdated($task, array $changes = []): void
    {
        static::log($task->project_id, 'task_updated', $task, [
            'title'   => $task->title,
            'changes' => $changes,
        ]);
    }

    public static function taskDeleted($task): void
    {
        static::log($task->project_id, 'task_deleted', $task, [
            'title' => $task->title,
        ]);
    }

    public static function taskMoved($task, string $fromStatus, string $toStatus): void
    {
        static::log($task->project_id, 'task_moved', $task, [
            'title' => $task->title,
            'from'  => $fromStatus,
            'to'    => $toStatus,
        ]);
    }

    public static function commentAdded($task, $comment): void
    {
        static::log($task->project_id, 'comment_added', $task, [
            'task_title' => $task->title,
            'excerpt'    => mb_substr($comment->content ?? '', 0, 100),
        ]);
    }

    public static function attachmentAdded($task, $attachment): void
    {
        static::log($task->project_id, 'attachment_added', $task, [
            'task_title' => $task->title,
            'filename'   => $attachment->original_name ?? $attachment->filename,
        ]);
    }

    public static function timeEntryAdded($task, $entry): void
    {
        static::log($task->project_id, 'time_entry_added', $task, [
            'task_title' => $task->title,
            'minutes'    => $entry->minutes,
        ]);
    }
}
