<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $users = User::with('roles')
            ->when($request->search, fn ($q, $s) => $q->where(function ($q2) use ($s) {
                $q2->where('name', 'like', "%{$s}%")
                   ->orWhere('email', 'like', "%{$s}%");
            }))
            ->when($request->role, fn ($q, $r) => $q->role($r))
            ->orderBy('name')
            ->paginate($request->per_page ?? 15);

        return response()->json([
            'users' => UserResource::collection($users),
            'meta' => [
                'current_page' => $users->currentPage(),
                'last_page'    => $users->lastPage(),
                'total'        => $users->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'role'     => 'required|string|in:admin,manager,member,viewer',
            'avatar'   => 'sometimes|image|mimes:jpg,jpeg,png,webp|max:2048',
        ]);

        $createData = [
            'name'     => $data['name'],
            'email'    => $data['email'],
            'password' => Hash::make($data['password']),
        ];

        if ($request->hasFile('avatar')) {
            $createData['avatar'] = $request->file('avatar')->store('avatars', 'public');
        }

        $user = User::create($createData);

        $user->assignRole($data['role']);

        return response()->json([
            'message' => 'Utilisateur créé avec succès.',
            'user'    => new UserResource($user->load('roles')),
        ], 201);
    }

    public function show(User $user): JsonResponse
    {
        $user->load('roles', 'teams', 'projects');

        return response()->json(['user' => new UserResource($user)]);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'name'  => 'sometimes|required|string|max:255',
            'email' => ['sometimes', 'required', 'email', Rule::unique('users')->ignore($user->id)],
            'password' => 'sometimes|nullable|string|min:8',
            'avatar'   => 'sometimes|image|mimes:jpg,jpeg,png,webp|max:2048',
        ]);

        if (!empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }

        if ($request->hasFile('avatar')) {
            if ($user->avatar) {
                Storage::disk('public')->delete($user->avatar);
            }
            $data['avatar'] = $request->file('avatar')->store('avatars', 'public');
        }

        $user->update($data);

        return response()->json([
            'message' => 'Utilisateur mis à jour.',
            'user'    => new UserResource($user->load('roles')),
        ]);
    }

    public function destroy(User $user): JsonResponse
    {
        if ($user->id === auth()->id()) {
            return response()->json(['message' => 'Impossible de supprimer votre propre compte.'], 422);
        }

        $user->delete();

        return response()->json(['message' => 'Utilisateur supprimé.']);
    }

    public function changeRole(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'role' => 'required|string|in:admin,manager,member,viewer',
        ]);

        if ($user->id === auth()->id()) {
            return response()->json(['message' => 'Impossible de changer votre propre rôle.'], 422);
        }

        $user->syncRoles([$data['role']]);

        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        return response()->json([
            'message' => 'Rôle mis à jour.',
            'user'    => new UserResource($user->fresh()->load('roles')),
        ]);
    }
}
