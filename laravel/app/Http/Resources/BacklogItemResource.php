<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BacklogItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'           => $this->id,
            'project_id'   => $this->project_id,
            'parent_id'    => $this->parent_id,
            'type'         => $this->type,
            'title'        => $this->title,
            'description'  => $this->description,
            'priority'     => $this->priority,
            'story_points' => $this->story_points,
            'status'       => $this->status,
            'order'        => $this->order,
            'children'     => BacklogItemResource::collection($this->whenLoaded('children')),
            'tasks'        => TaskResource::collection($this->whenLoaded('tasks')),
            'creator'      => new UserResource($this->whenLoaded('creator')),
            'created_by'   => $this->created_by,
            'created_at'   => $this->created_at?->toISOString(),
            'updated_at'   => $this->updated_at?->toISOString(),
        ];
    }
}
