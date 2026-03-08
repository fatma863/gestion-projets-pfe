<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\TeamResource;
use App\Http\Resources\TeamMemberResource;
use App\Models\Team;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class TeamController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Team::withCount('members', 'projects')
            ->when($request->search, fn ($q, $s) => $q->where('name', 'like', "%{$s}%"))
            ->orderBy('name');

        // Filtrage par rôle
        if (!$user->hasAnyRole(['admin', 'manager'])) {
            $query->whereHas('members', fn ($q) => $q->where('user_id', $user->id));
        }

        $teams = $query->paginate($request->per_page ?? 15);

        return response()->json(TeamResource::collection($teams)->response()->getData(true));
    }

    public function store(Request $request): JsonResponse
    {
        Gate::authorize('create', Team::class);
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $team = Team::create($data);
        $team->members()->attach($request->user()->id, [
            'role_in_team' => 'lead',
            'capacity_hours_per_week' => 40,
        ]);

        return response()->json([
            'message' => 'Équipe créée avec succès.',
            'team' => new TeamResource($team->load('members')),
        ], 201);
    }

    public function show(Team $team): JsonResponse
    {
        Gate::authorize('view', $team);

        $team->loadCount('members', 'projects');
        $team->load('members');

        return response()->json(['team' => new TeamResource($team)]);
    }

    public function update(Request $request, Team $team): JsonResponse
    {
        Gate::authorize('update', $team);

        $data = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $team->update($data);

        return response()->json([
            'message' => 'Équipe mise à jour.',
            'team' => new TeamResource($team),
        ]);
    }

    public function destroy(Team $team): JsonResponse
    {
        Gate::authorize('delete', $team);

        $team->delete();

        return response()->json(['message' => 'Équipe supprimée.']);
    }

    public function addMember(Request $request, Team $team): JsonResponse
    {
        Gate::authorize('manageMember', $team);

        $data = $request->validate([
            'user_id' => 'required|exists:users,id',
            'role_in_team' => 'sometimes|string|in:lead,manager,developer,designer,tester,member',
            'capacity_hours_per_week' => 'sometimes|numeric|min:0|max:60',
            'skills' => 'sometimes|array',
        ]);

        $team->members()->syncWithoutDetaching([
            $data['user_id'] => [
                'role_in_team' => $data['role_in_team'] ?? 'member',
                'capacity_hours_per_week' => $data['capacity_hours_per_week'] ?? 40,
                'skills' => isset($data['skills']) ? json_encode($data['skills']) : null,
                'is_active' => true,
            ],
        ]);

        return response()->json([
            'message' => 'Membre ajouté à l\'équipe.',
            'members' => TeamMemberResource::collection($team->load('members')->members),
        ]);
    }

    public function removeMember(Team $team, int $userId): JsonResponse
    {
        Gate::authorize('manageMember', $team);

        $team->members()->detach($userId);

        return response()->json(['message' => 'Membre retiré de l\'équipe.']);
    }
}
