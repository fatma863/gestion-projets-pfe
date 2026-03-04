<?php

namespace App\Policies;

use App\Models\Task;
use App\Models\User;

class TaskPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Task $task): bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        return $task->project->members()->where('user_id', $user->id)->exists();
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('manage-tasks');
    }

    public function update(User $user, Task $task): bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        $project = $task->project;
        $member = $project->members()->where('user_id', $user->id)->first();

        if (!$member) {
            return false;
        }

        return in_array($member->pivot->project_role, ['owner', 'manager'])
            || $task->assignees()->where('user_id', $user->id)->exists()
            || $task->created_by === $user->id;
    }

    public function delete(User $user, Task $task): bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        $project = $task->project;
        $memberRole = $project->members()
            ->where('user_id', $user->id)
            ->first()?->pivot?->project_role;

        return in_array($memberRole, ['owner', 'manager'])
            || $task->created_by === $user->id;
    }
}
