<?php

use App\Http\Controllers\Api\Admin\StatsController;
use App\Http\Controllers\Api\Admin\UserController;
use App\Http\Controllers\Api\AiController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\GanttController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\Api\TaskStatusController;
use App\Http\Controllers\Api\TeamController;
use App\Http\Controllers\Api\ActivityLogController;
use App\Http\Controllers\Api\WorkloadController;
use Illuminate\Support\Facades\Route;

// ─── Routes publiques ───────────────────────────────────
Route::get('/', function () {
    return response()->json([
        'app' => 'Gestion Projets PFE',
        'version' => '1.0.0',
    ]);
});

Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);

// ─── Routes communes (tout utilisateur authentifié) ─────
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Notifications
    Route::get('notifications', [NotificationController::class, 'index']);
    Route::patch('notifications/{notification}/read', [NotificationController::class, 'markAsRead']);
    Route::post('notifications/read-all', [NotificationController::class, 'markAllAsRead']);
});

// ─── Routes Admin (admin uniquement) ────────────────────
Route::middleware(['auth:sanctum', 'role:admin'])->prefix('admin')->group(function () {
    Route::get('stats', [StatsController::class, 'index']);
    Route::apiResource('users', UserController::class);
    Route::post('users/{user}/role', [UserController::class, 'changeRole']);
});

// ─── Routes Manager+ (admin OU manager) ─────────────────
Route::middleware(['auth:sanctum', 'role:admin|manager'])->group(function () {
    // Équipes — écriture (create, update, delete, membres)
    Route::post('teams', [TeamController::class, 'store']);
    Route::put('teams/{team}', [TeamController::class, 'update']);
    Route::delete('teams/{team}', [TeamController::class, 'destroy']);
    Route::post('teams/{team}/members', [TeamController::class, 'addMember']);
    Route::delete('teams/{team}/members/{user}', [TeamController::class, 'removeMember']);

    // Projets — création, modification, suppression
    Route::get('projects/managers', [ProjectController::class, 'managers']);
    Route::get('projects/search-users', [ProjectController::class, 'searchUsers']);
    Route::post('projects', [ProjectController::class, 'store']);
    Route::put('projects/{project}', [ProjectController::class, 'update']);
    Route::delete('projects/{project}', [ProjectController::class, 'destroy']);

    // Membres projet — gestion
    Route::post('projects/{project}/members', [ProjectController::class, 'addMember']);
    Route::delete('projects/{project}/members/{user}', [ProjectController::class, 'removeMember']);

    // Statuts — création, modification, suppression, réordonnement
    Route::post('projects/{project}/statuses', [TaskStatusController::class, 'store']);
    Route::put('statuses/{status}', [TaskStatusController::class, 'update']);
    Route::delete('statuses/{status}', [TaskStatusController::class, 'destroy']);
    Route::post('projects/{project}/statuses/reorder', [TaskStatusController::class, 'reorder']);

    // Tâches — assignation, dépendances
    Route::post('tasks/{task}/assign', [TaskController::class, 'assign']);
    Route::delete('tasks/{task}/unassign/{user}', [TaskController::class, 'unassign']);
    Route::post('tasks/{task}/dependencies', [TaskController::class, 'addDependency']);
    Route::delete('tasks/{task}/dependencies/{dependency}', [TaskController::class, 'removeDependency']);

    // IA avancée (manager+)
    Route::get('ai/delay-risk/project/{project}', [AiController::class, 'delayRiskProject']);
    Route::get('ai/suggest-assignment/{task}', [AiController::class, 'suggestAssignment']);

    // Gantt — modification
    Route::put('projects/{project}/gantt', [GanttController::class, 'updateDates']);
    Route::put('projects/{project}/gantt/tasks/{task}', [GanttController::class, 'updateTask']);

    // Workload (manager+ only)
    Route::get('projects/{project}/workload', [WorkloadController::class, 'project']);
});

// ─── Routes Admin uniquement — IA optimisation ──────────
Route::middleware(['auth:sanctum', 'role:admin'])->group(function () {
    Route::get('ai/optimize-assignments/{project}', [AiController::class, 'optimizeProjectAssignments']);
});

// ─── Routes tous rôles authentifiés (lecture + actions de base) ──
Route::middleware('auth:sanctum')->group(function () {
    // Tâches — toutes mes tâches (cross-projet, pour dashboard)
    Route::get('tasks', [TaskController::class, 'myTasks']);

    // Équipes — lecture (protégé par Policy)
    Route::get('teams', [TeamController::class, 'index']);
    Route::get('teams/{team}', [TeamController::class, 'show']);

    // Projets — lecture
    Route::get('projects', [ProjectController::class, 'index']);
    Route::get('projects/{project}', [ProjectController::class, 'show']);
    Route::get('projects/{project}/dashboard', [ProjectController::class, 'dashboard']);
    Route::get('projects/{project}/members', [ProjectController::class, 'members']);
    Route::get('projects/{project}/statuses', [TaskStatusController::class, 'index']);

    // Tâches — CRUD (protegé par Policy)
    Route::get('projects/{project}/tasks', [TaskController::class, 'index']);
    Route::post('projects/{project}/tasks', [TaskController::class, 'store']);
    Route::get('tasks/{task}', [TaskController::class, 'show']);
    Route::put('tasks/{task}', [TaskController::class, 'update']);
    Route::delete('tasks/{task}', [TaskController::class, 'destroy']);
    Route::patch('tasks/{task}/move', [TaskController::class, 'move']);

    // Tâches — sous-ressources
    Route::get('tasks/{task}/assignees', [TaskController::class, 'assignees']);
    Route::get('tasks/{task}/dependencies', [TaskController::class, 'dependencies']);
    Route::get('tasks/{task}/comments', [TaskController::class, 'comments']);
    Route::post('tasks/{task}/comments', [TaskController::class, 'addComment']);
    Route::delete('tasks/{task}/comments/{comment}', [TaskController::class, 'deleteComment']);
    Route::get('tasks/{task}/attachments', [TaskController::class, 'attachments']);
    Route::post('tasks/{task}/attachments', [TaskController::class, 'addAttachment']);
    Route::delete('tasks/{task}/attachments/{attachment}', [TaskController::class, 'deleteAttachment']);
    Route::get('tasks/{task}/time-entries', [TaskController::class, 'timeEntries']);
    Route::post('tasks/{task}/time-entries', [TaskController::class, 'addTimeEntry']);
    Route::delete('tasks/{task}/time-entries/{timeEntry}', [TaskController::class, 'deleteTimeEntry']);

    // Gantt — lecture
    Route::get('projects/{project}/gantt', [GanttController::class, 'show']);

    // Activity log
    Route::get('projects/{project}/activities', [ActivityLogController::class, 'index']);

    // IA basique (member+, avec permission)
    Route::middleware('permission:use-ai-features')->prefix('ai')->group(function () {
        Route::get('estimate/{task}', [AiController::class, 'estimateTask']);
        Route::get('delay-risk/task/{task}', [AiController::class, 'delayRiskTask']);
        Route::get('dashboard-summary', [AiController::class, 'dashboardSummary']);
    });
});
