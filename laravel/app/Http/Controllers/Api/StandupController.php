<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\StandupReportResource;
use App\Models\Sprint;
use App\Models\StandupReport;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;

class StandupController extends Controller
{
    /**
     * List standup reports for a sprint.
     */
    public function index(Request $request, Sprint $sprint): JsonResponse
    {
        Gate::authorize('view', $sprint);

        $query = $sprint->standupReports()->with('user');

        if ($request->filled('date')) {
            $query->whereDate('created_at', $request->date);
        }

        $reports = $query->orderByDesc('created_at')->get();

        return response()->json(['standups' => StandupReportResource::collection($reports)]);
    }

    /**
     * Submit a standup report.
     */
    public function store(Request $request, Sprint $sprint): JsonResponse
    {
        Gate::authorize('view', $sprint);

        $validated = $request->validate([
            'yesterday' => 'required|string|max:2000',
            'today' => 'required|string|max:2000',
            'blockers' => 'nullable|string|max:2000',
        ]);

        // Check if user already submitted today
        $existing = $sprint->standupReports()
            ->where('user_id', Auth::id())
            ->whereDate('created_at', today())
            ->first();

        if ($existing) {
            $existing->update($validated);
            $existing->load('user');
            return response()->json(['standup' => new StandupReportResource($existing)]);
        }

        $validated['user_id'] = Auth::id();
        $report = $sprint->standupReports()->create($validated);
        $report->load('user');

        return response()->json(['standup' => new StandupReportResource($report)], 201);
    }

    /**
     * Check if current user has submitted today.
     */
    public function myStatus(Sprint $sprint): JsonResponse
    {
        Gate::authorize('view', $sprint);

        $report = $sprint->standupReports()
            ->where('user_id', Auth::id())
            ->whereDate('created_at', today())
            ->with('user')
            ->first();

        return response()->json([
            'submitted' => (bool) $report,
            'standup' => $report ? new StandupReportResource($report) : null,
        ]);
    }
}
