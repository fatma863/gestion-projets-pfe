<?php

namespace App\Http\Requests\Task;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class UpdateTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('update', $this->route('task'));
    }

    public function rules(): array
    {
        $projectId = $this->route('task')->project_id;

        return [
            'title'            => 'sometimes|required|string|max:255',
            'description'      => 'nullable|string',
            'status_id'        => "sometimes|exists:task_statuses,id,project_id,{$projectId}",
            'priority'         => 'sometimes|in:low,medium,high,urgent',
            'complexity'       => 'nullable|integer|min:1|max:10',
            'story_points'     => 'nullable|integer|min:0',
            'planned_start'    => 'nullable|date',
            'planned_end'      => 'nullable|date|after_or_equal:planned_start',
            'due_date'         => 'nullable|date',
            'estimated_hours'  => 'nullable|numeric|min:0',
            'actual_hours'     => 'nullable|numeric|min:0',
            'progress_percent' => 'nullable|integer|min:0|max:100',
            'parent_id'        => "nullable|exists:tasks,id,project_id,{$projectId}",
        ];
    }

    public function messages(): array
    {
        return [
            'title.required'             => 'Le titre est obligatoire.',
            'title.max'                  => 'Le titre ne peut pas dépasser 255 caractères.',
            'status_id.exists'           => 'Le statut sélectionné n\'appartient pas à ce projet.',
            'priority.in'                => 'La priorité doit être : low, medium, high ou urgent.',
            'complexity.min'             => 'La complexité doit être entre 1 et 10.',
            'complexity.max'             => 'La complexité doit être entre 1 et 10.',
            'story_points.min'           => 'Les story points doivent être positifs.',
            'planned_end.after_or_equal' => 'La fin planifiée doit être après le début.',
            'estimated_hours.min'        => 'Les heures estimées doivent être positives.',
            'progress_percent.min'       => 'La progression doit être entre 0 et 100.',
            'progress_percent.max'       => 'La progression doit être entre 0 et 100.',
            'parent_id.exists'           => 'La tâche parente sélectionnée n\'appartient pas à ce projet.',
        ];
    }
}
