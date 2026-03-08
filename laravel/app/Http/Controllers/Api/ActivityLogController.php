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
}
