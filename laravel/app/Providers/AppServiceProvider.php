<?php

namespace App\Providers;

use App\Models\Project;
use App\Models\Task;
use App\Models\Team;
use App\Policies\ProjectPolicy;
use App\Policies\TaskPolicy;
use App\Policies\TeamPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Gate::policy(Project::class, ProjectPolicy::class);
        Gate::policy(Task::class, TaskPolicy::class);
        Gate::policy(Team::class, TeamPolicy::class);
    }
}
