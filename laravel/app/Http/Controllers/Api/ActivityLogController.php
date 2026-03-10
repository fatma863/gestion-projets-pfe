<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class ActivityLogController extends Controller
{
    public function index(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('view', $project);

        $logs = ActivityLog::where('project_id', $project->id)
            ->with('user:id,name,email')
            ->orderByDesc('created_at')
            ->limit($request->input('limit', 50))
            ->get()
            ->map(fn ($log) => [
                'id'           => $log->id,
                'action'       => $log->action,
                'user'         => $log->user ? ['id' => $log->user->id, 'name' => $log->user->name] : null,
                'properties'   => $log->properties,
                'created_at'   => $log->created_at->toISOString(),
                'human_time'   => $log->created_at->diffForHumans(),
            ]);

        return response()->json(['activities' => $logs]);
    }

    /**
     * Recent activities across all projects the user can access.
     */
    public function recent(Request $request): JsonResponse
    {
        $user = $request->user();
        $limit = min((int) $request->input('limit', 15), 50);

        // Get project IDs the user can access
        if ($user->hasRole('admin')) {
            $projectIds = Project::pluck('id');
        } else {
            $projectIds = Project::where('manager_id', $user->id)
                ->orWhereHas('members', fn ($q) => $q->where('users.id', $user->id))
                ->pluck('id');
        }

        $logs = ActivityLog::whereIn('project_id', $projectIds)
            ->with(['user:id,name,email,avatar', 'project:id,name,code'])
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get()
            ->map(fn ($log) => [
                'id'         => $log->id,
                'action'     => $log->action,
                'user'       => $log->user ? ['id' => $log->user->id, 'name' => $log->user->name, 'avatar' => $log->user->avatar] : null,
                'project'    => $log->project ? ['id' => $log->project->id, 'name' => $log->project->name, 'code' => $log->project->code] : null,
                'properties' => $log->properties,
                'created_at' => $log->created_at->toISOString(),
                'human_time' => $log->created_at->diffForHumans(),
            ]);

        return response()->json(['activities' => $logs]);
    }
}
