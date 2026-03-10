<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BacklogItem extends Model
{
    protected $fillable = [
        'project_id',
        'parent_id',
        'type',
        'title',
        'description',
        'priority',
        'story_points',
        'status',
        'order',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'priority' => 'integer',
            'story_points' => 'integer',
            'order' => 'integer',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(BacklogItem::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(BacklogItem::class, 'parent_id');
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class, 'backlog_item_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
