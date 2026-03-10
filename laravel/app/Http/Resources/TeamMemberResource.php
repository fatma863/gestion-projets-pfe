<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TeamMemberResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'avatar' => $this->avatar ? asset('storage/' . $this->avatar) : null,
            'role_in_team' => $this->pivot?->role_in_team,
            'capacity_hours_per_week' => (float) ($this->pivot?->capacity_hours_per_week ?? 40),
            'skills' => json_decode($this->pivot?->skills ?? '[]', true),
            'is_active' => (bool) ($this->pivot?->is_active ?? true),
        ];
    }
}
