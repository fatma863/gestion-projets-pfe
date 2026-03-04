<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TaskResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'project_id' => $this->project_id,
            'parent_id' => $this->parent_id,
            'title' => $this->title,
            'description' => $this->description,
            'status_id' => $this->status_id,
            'status' => new TaskStatusResource($this->whenLoaded('status')),
            'priority' => $this->priority,
            'complexity' => $this->complexity,
            'story_points' => $this->story_points,
            'planned_start' => $this->planned_start?->toDateString(),
            'planned_end' => $this->planned_end?->toDateString(),
            'due_date' => $this->due_date?->toDateString(),
            'estimated_hours' => $this->estimated_hours ? (float) $this->estimated_hours : null,
            'actual_hours' => (float) $this->actual_hours,
            'progress_percent' => $this->progress_percent,
            'kanban_order' => $this->kanban_order,
            'is_overdue' => $this->isOverdue(),
            'assignees' => TaskAssigneeResource::collection($this->whenLoaded('assignees')),
            'subtasks' => TaskResource::collection($this->whenLoaded('subtasks')),
            'subtasks_count' => $this->whenCounted('subtasks'),
            'dependencies' => TaskDependencyResource::collection($this->whenLoaded('dependencies')),
            'comments_count' => $this->whenCounted('comments'),
            'attachments_count' => $this->whenCounted('attachments'),
            'time_entries_count' => $this->whenCounted('timeEntries'),
            'creator' => new UserResource($this->whenLoaded('creator')),
            'created_by' => $this->created_by,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
