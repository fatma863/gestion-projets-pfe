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

        return $project->members()->where('user_id', $user->id)->exists()
            || $project->owner_id === $user->id;
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

        $memberRole = $project->members()
            ->where('user_id', $user->id)
            ->first()?->pivot?->project_role;

        return in_array($memberRole, ['owner', 'manager'])
            || $project->owner_id === $user->id;
    }

    public function delete(User $user, Project $project): bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        return $project->owner_id === $user->id;
    }
}
