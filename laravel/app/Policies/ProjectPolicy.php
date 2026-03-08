<?php

namespace App\Policies;

use App\Models\Project;
use App\Models\User;

class ProjectPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Project $project): bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        return $project->manager_id === $user->id
            || $project->owner_id === $user->id
            || $project->members()->where('user_id', $user->id)->exists();
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('manage-projects');
    }

    public function update(User $user, Project $project): bool
    {
        if ($user->hasRole('admin') || $user->hasPermissionTo('manage-all-projects')) {
            return true;
        }

        if ($project->manager_id === $user->id || $project->owner_id === $user->id) {
            return true;
        }

        $memberRole = $project->members()
            ->where('user_id', $user->id)
            ->first()?->pivot?->project_role;

        return in_array($memberRole, ['owner', 'manager']);
    }

    public function delete(User $user, Project $project): bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        return $project->owner_id === $user->id
            || $project->manager_id === $user->id;
    }
}
