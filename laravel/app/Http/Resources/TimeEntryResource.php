<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TimeEntryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'task_id' => $this->task_id,
            'user' => new UserResource($this->whenLoaded('user')),
            'date' => $this->date?->toDateString(),
            'minutes' => $this->minutes,
            'hours' => $this->hours,
            'note' => $this->note,
            'source' => $this->source,
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
