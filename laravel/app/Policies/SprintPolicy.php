<?php

namespace App\Policies;

use App\Models\Sprint;
use App\Models\User;

class SprintPolicy
{
    public function viewAny(User $user): bool { return true; }

    public function view(User $user, Sprint $sprint): bool
    {
        if ($user->hasRole('admin')) return true;
        $project = $sprint->project;
        return $project->manager_id === $user->id
            || $project->owner_id === $user->id
            || $project->members()->where('user_id', $user->id)->exists();
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('manage-projects');
    }

    public function update(User $user, Sprint $sprint): bool
    {
        if ($user->hasRole('admin')) return true;
        $project = $sprint->project;
        return $project->manager_id === $user->id
            || $project->owner_id === $user->id;
    }

    public function delete(User $user, Sprint $sprint): bool
    {
        if ($user->hasRole('admin')) return true;
        $project = $sprint->project;
        return $project->manager_id === $user->id
            || $project->owner_id === $user->id;
    }
}
