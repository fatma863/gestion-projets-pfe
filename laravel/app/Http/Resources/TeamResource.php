<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TeamResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'members_count' => $this->whenCounted('members'),
            'members' => TeamMemberResource::collection($this->whenLoaded('members')),
            'projects_count' => $this->whenCounted('projects'),
            'projects' => $this->whenLoaded('projects', fn () => $this->projects->map(fn ($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'code' => $p->code,
                'status' => $p->status,
                'start_date' => $p->start_date?->toISOString(),
                'end_date' => $p->end_date?->toISOString(),
            ])),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
