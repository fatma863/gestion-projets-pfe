<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TimeEntry extends Model
{
    protected $fillable = [
        'task_id',
        'user_id',
        'date',
        'minutes',
        'note',
        'source',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'minutes' => 'integer',
        ];
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function getHoursAttribute(): float
    {
        return round($this->minutes / 60, 2);
    }
}
