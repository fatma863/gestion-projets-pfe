<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TaskDependencyResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->pivot?->id ?? $this->id,
            'task_id' => $this->pivot ? $this->pivot->task_id : $this->id,
            'depends_on_task_id' => $this->id,
            'title' => $this->title,
            'type' => $this->pivot?->type ?? 'FS',
            'status_id' => $this->status_id,
        ];
    }
}
