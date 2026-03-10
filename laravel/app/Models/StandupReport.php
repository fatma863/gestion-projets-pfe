<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StandupReport extends Model
{
    protected $fillable = [
        'sprint_id', 'user_id', 'yesterday', 'today', 'blockers',
    ];

    public function sprint(): BelongsTo { return $this->belongsTo(Sprint::class); }
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
}
