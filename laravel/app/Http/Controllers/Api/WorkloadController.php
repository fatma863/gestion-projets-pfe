<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Services\WorkloadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class WorkloadController extends Controller
{
    public function __construct(private WorkloadService $workloadService) {}

    public function project(Project $project): JsonResponse
    {
        Gate::authorize('view', $project);

        $result = $this->workloadService->analyzeProject($project);

        return response()->json($result);
    }
}
