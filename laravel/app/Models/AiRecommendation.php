<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiRecommendation extends Model
{
    protected $fillable = [
        'task_id',
        'project_id',
        'type',
        'input_data',
        'result_data',
        'confidence',
    ];

    protected function casts(): array
    {
        return [
            'input_data' => 'array',
            'result_data' => 'array',
            'confidence' => 'decimal:2',
        ];
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }
}
