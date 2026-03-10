<?php

namespace App\Policies;

use App\Models\Team;
use App\Models\User;

class TeamPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Team $team): bool
    {
        if ($user->hasAnyRole(['admin', 'manager'])) {
            return true;
        }

        return $team->members()->where('user_id', $user->id)->exists();
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('manage-teams');
    }

    public function update(User $user, Team $team): bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        $role = $team->members()
            ->where('user_id', $user->id)
            ->first()?->pivot?->role_in_team;

        return in_array($role, ['lead', 'manager']);
    }

    public function delete(User $user, Team $team): bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }

        $role = $team->members()
            ->where('user_id', $user->id)
            ->first()?->pivot?->role_in_team;

        return $role === 'lead';
    }

    public function manageMember(User $user, Team $team): bool
    {
        if ($user->hasAnyRole(['admin', 'manager'])) {
            return true;
        }

        $role = $team->members()
            ->where('user_id', $user->id)
            ->first()?->pivot?->role_in_team;

        return in_array($role, ['lead', 'manager']);
    }
}
