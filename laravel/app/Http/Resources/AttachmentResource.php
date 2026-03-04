<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AttachmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'task_id' => $this->task_id,
            'user' => new UserResource($this->whenLoaded('user')),
            'type' => $this->type,
            'path_or_url' => $this->type === 'link'
                ? $this->path_or_url
                : url('storage/' . $this->path_or_url),
            'filename' => $this->filename,
            'mime' => $this->mime,
            'size' => $this->size,
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
