<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\Task;
use App\Models\TaskStatus;
use App\Models\Team;
use App\Models\User;
use Database\Seeders\RoleAndPermissionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RbacTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $manager;
    private User $member;
    private User $viewer;
    private Team $team;
    private Project $project;
    private TaskStatus $status;
    private Task $task;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleAndPermissionSeeder::class);

        $this->admin   = User::factory()->create();
        $this->manager = User::factory()->create();
        $this->member  = User::factory()->create();
        $this->viewer  = User::factory()->create();

        $this->admin->assignRole('admin');
        $this->manager->assignRole('manager');
        $this->member->assignRole('member');
        $this->viewer->assignRole('viewer');

        $this->team = Team::create(['name' => 'Test Team']);
        $this->team->members()->attach($this->manager->id, ['role_in_team' => 'lead', 'capacity_hours_per_week' => 40]);
        $this->team->members()->attach($this->member->id, ['role_in_team' => 'developer', 'capacity_hours_per_week' => 40]);
        $this->team->members()->attach($this->viewer->id, ['role_in_team' => 'member', 'capacity_hours_per_week' => 40]);

        $this->project = Project::create([
            'name'       => 'Test Project',
            'code'       => 'TST',
            'owner_id'   => $this->manager->id,
            'created_by' => $this->manager->id,
            'team_id'    => $this->team->id,
        ]);
        $this->project->members()->attach($this->manager->id, ['project_role' => 'owner']);
        $this->project->members()->attach($this->member->id, ['project_role' => 'developer']);
        $this->project->members()->attach($this->viewer->id, ['project_role' => 'viewer']);

        $this->status = TaskStatus::create([
            'project_id' => $this->project->id,
            'name'       => 'À faire',
            'color'      => '#6B7280',
            'order'      => 0,
            'is_default' => true,
        ]);

        $this->task = Task::create([
            'project_id' => $this->project->id,
            'title'      => 'Test Task',
            'status_id'  => $this->status->id,
            'priority'   => 'medium',
            'created_by' => $this->member->id,
        ]);
    }

    // ════════════════════════════════════════════════════
    // ADMIN ROUTES
    // ════════════════════════════════════════════════════

    public function test_admin_can_access_admin_stats(): void
    {
        $response = $this->actingAs($this->admin)->getJson('/api/admin/stats');
        $response->assertOk();
        $response->assertJsonStructure(['total_users', 'total_teams', 'total_projects', 'total_tasks']);
    }

    public function test_manager_cannot_access_admin_stats(): void
    {
        $response = $this->actingAs($this->manager)->getJson('/api/admin/stats');
        $response->assertForbidden();
    }

    public function test_member_cannot_access_admin_stats(): void
    {
        $response = $this->actingAs($this->member)->getJson('/api/admin/stats');
        $response->assertForbidden();
    }

    public function test_admin_can_list_users(): void
    {
        $response = $this->actingAs($this->admin)->getJson('/api/admin/users');
        $response->assertOk();
        $response->assertJsonStructure(['users', 'meta']);
    }

    public function test_manager_cannot_list_admin_users(): void
    {
        $response = $this->actingAs($this->manager)->getJson('/api/admin/users');
        $response->assertForbidden();
    }

    public function test_admin_can_change_user_role(): void
    {
        $response = $this->actingAs($this->admin)->postJson("/api/admin/users/{$this->member->id}/role", [
            'role' => 'manager',
        ]);
        $response->assertOk();
        $this->assertTrue($this->member->fresh()->hasRole('manager'));
    }

    // ════════════════════════════════════════════════════
    // TEAM ROUTES (manager+)
    // ════════════════════════════════════════════════════

    public function test_admin_can_create_team(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/api/teams', ['name' => 'New Team']);
        $response->assertCreated();
    }

    public function test_manager_can_create_team(): void
    {
        $response = $this->actingAs($this->manager)->postJson('/api/teams', ['name' => 'Manager Team']);
        $response->assertCreated();
    }

    public function test_member_cannot_create_team(): void
    {
        $response = $this->actingAs($this->member)->postJson('/api/teams', ['name' => 'Fail Team']);
        $response->assertForbidden();
    }

    public function test_viewer_cannot_create_team(): void
    {
        $response = $this->actingAs($this->viewer)->postJson('/api/teams', ['name' => 'Fail Team']);
        $response->assertForbidden();
    }

    // ════════════════════════════════════════════════════
    // PROJECT ROUTES
    // ════════════════════════════════════════════════════

    public function test_admin_can_create_project(): void
    {
        $response = $this->actingAs($this->admin)->postJson('/api/projects', [
            'name' => 'Admin Project',
            'code' => 'ADM',
        ]);
        $response->assertCreated();
    }

    public function test_manager_can_create_project(): void
    {
        $response = $this->actingAs($this->manager)->postJson('/api/projects', [
            'name' => 'Manager Project',
            'code' => 'MGR',
        ]);
        $response->assertCreated();
    }

    public function test_member_cannot_create_project(): void
    {
        $response = $this->actingAs($this->member)->postJson('/api/projects', [
            'name' => 'Fail Project',
            'code' => 'FAIL',
        ]);
        $response->assertForbidden();
    }

    public function test_all_roles_can_read_project(): void
    {
        foreach ([$this->admin, $this->manager, $this->member, $this->viewer] as $user) {
            $response = $this->actingAs($user)->getJson("/api/projects/{$this->project->id}");
            $response->assertOk();
        }
    }

    public function test_member_can_list_only_own_projects(): void
    {
        $otherProject = Project::create([
            'name'       => 'Other Project',
            'code'       => 'OTH',
            'owner_id'   => $this->admin->id,
            'created_by' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->member)->getJson('/api/projects');
        $response->assertOk();

        $ids = collect($response->json('data'))->pluck('id')->toArray();
        $this->assertContains($this->project->id, $ids);
        $this->assertNotContains($otherProject->id, $ids);
    }

    public function test_admin_sees_all_projects(): void
    {
        $otherProject = Project::create([
            'name'       => 'Other Project',
            'code'       => 'OTH',
            'owner_id'   => $this->admin->id,
            'created_by' => $this->admin->id,
        ]);

        $response = $this->actingAs($this->admin)->getJson('/api/projects');
        $response->assertOk();

        $ids = collect($response->json('data'))->pluck('id')->toArray();
        $this->assertContains($this->project->id, $ids);
        $this->assertContains($otherProject->id, $ids);
    }

    // ════════════════════════════════════════════════════
    // TASK ROUTES + VIEWER RESTRICTIONS
    // ════════════════════════════════════════════════════

    public function test_member_can_create_task(): void
    {
        $response = $this->actingAs($this->member)->postJson("/api/projects/{$this->project->id}/tasks", [
            'title'     => 'Member Task',
            'status_id' => $this->status->id,
        ]);
        $response->assertCreated();
    }

    public function test_viewer_cannot_create_task(): void
    {
        $response = $this->actingAs($this->viewer)->postJson("/api/projects/{$this->project->id}/tasks", [
            'title'     => 'Fail Task',
            'status_id' => $this->status->id,
        ]);
        $response->assertForbidden();
    }

    public function test_viewer_cannot_update_task(): void
    {
        $response = $this->actingAs($this->viewer)->putJson("/api/tasks/{$this->task->id}", [
            'title' => 'Hacked Title',
        ]);
        $response->assertForbidden();
    }

    public function test_viewer_cannot_delete_task(): void
    {
        $response = $this->actingAs($this->viewer)->deleteJson("/api/tasks/{$this->task->id}");
        $response->assertForbidden();
    }

    public function test_viewer_can_read_task(): void
    {
        $response = $this->actingAs($this->viewer)->getJson("/api/tasks/{$this->task->id}");
        $response->assertOk();
    }

    public function test_viewer_cannot_add_comment(): void
    {
        $response = $this->actingAs($this->viewer)->postJson("/api/tasks/{$this->task->id}/comments", [
            'body' => 'Viewer comment',
        ]);
        $response->assertForbidden();
    }

    public function test_member_can_add_comment(): void
    {
        $response = $this->actingAs($this->member)->postJson("/api/tasks/{$this->task->id}/comments", [
            'body' => 'Member comment',
        ]);
        $response->assertCreated();
    }

    public function test_viewer_cannot_add_time_entry(): void
    {
        $response = $this->actingAs($this->viewer)->postJson("/api/tasks/{$this->task->id}/time-entries", [
            'date'    => '2026-03-07',
            'minutes' => 30,
        ]);
        $response->assertForbidden();
    }

    public function test_viewer_can_read_comments(): void
    {
        $response = $this->actingAs($this->viewer)->getJson("/api/tasks/{$this->task->id}/comments");
        $response->assertOk();
    }

    // ════════════════════════════════════════════════════
    // MY TASKS ROUTE
    // ════════════════════════════════════════════════════

    public function test_my_tasks_returns_user_tasks(): void
    {
        $response = $this->actingAs($this->member)->getJson('/api/tasks');
        $response->assertOk();
        $response->assertJsonStructure(['tasks']);
    }

    // ════════════════════════════════════════════════════
    // NOTIFICATION SCOPING
    // ════════════════════════════════════════════════════

    public function test_notifications_are_scoped_to_user(): void
    {
        $response = $this->actingAs($this->member)->getJson('/api/notifications');
        $response->assertOk();
        $response->assertJsonStructure(['notifications', 'unread_count']);
    }

    // ════════════════════════════════════════════════════
    // AI ROUTES BY ROLE
    // ════════════════════════════════════════════════════

    public function test_viewer_cannot_access_ai_estimate(): void
    {
        // Viewer doesn't have 'use-ai-features' permission
        $response = $this->actingAs($this->viewer)->getJson("/api/ai/estimate/{$this->task->id}");
        $response->assertForbidden();
    }

    public function test_member_can_access_ai_estimate(): void
    {
        $response = $this->actingAs($this->member)->getJson("/api/ai/estimate/{$this->task->id}");
        // Should pass permission check (may fail on AI service, but not 403)
        $this->assertNotEquals(403, $response->getStatusCode());
    }

    public function test_member_cannot_access_ai_suggest_assignment(): void
    {
        $response = $this->actingAs($this->member)->getJson("/api/ai/suggest-assignment/{$this->task->id}");
        $response->assertForbidden();
    }

    public function test_manager_can_access_ai_suggest_assignment(): void
    {
        $response = $this->actingAs($this->manager)->getJson("/api/ai/suggest-assignment/{$this->task->id}");
        $this->assertNotEquals(403, $response->getStatusCode());
    }

    public function test_manager_cannot_access_ai_optimize(): void
    {
        $response = $this->actingAs($this->manager)->getJson("/api/ai/optimize-assignments/{$this->project->id}");
        $response->assertForbidden();
    }

    public function test_admin_can_access_ai_optimize(): void
    {
        $response = $this->actingAs($this->admin)->getJson("/api/ai/optimize-assignments/{$this->project->id}");
        $this->assertNotEquals(403, $response->getStatusCode());
    }

    // ════════════════════════════════════════════════════
    // STATUS MANAGEMENT (manager+)
    // ════════════════════════════════════════════════════

    public function test_manager_can_create_status(): void
    {
        $response = $this->actingAs($this->manager)->postJson("/api/projects/{$this->project->id}/statuses", [
            'name' => 'New Status',
        ]);
        $response->assertCreated();
    }

    public function test_member_cannot_create_status(): void
    {
        $response = $this->actingAs($this->member)->postJson("/api/projects/{$this->project->id}/statuses", [
            'name' => 'Fail Status',
        ]);
        $response->assertForbidden();
    }

    // ════════════════════════════════════════════════════
    // GANTT ROUTES
    // ════════════════════════════════════════════════════

    public function test_member_can_read_gantt(): void
    {
        $response = $this->actingAs($this->member)->getJson("/api/projects/{$this->project->id}/gantt");
        $response->assertOk();
    }

    public function test_member_cannot_update_gantt(): void
    {
        $response = $this->actingAs($this->member)->putJson("/api/projects/{$this->project->id}/gantt", [
            'tasks' => [],
        ]);
        $response->assertForbidden();
    }

    public function test_manager_can_update_gantt(): void
    {
        $response = $this->actingAs($this->manager)->putJson("/api/projects/{$this->project->id}/gantt", [
            'tasks' => [],
        ]);
        // Should not be 403 (might be 422 due to empty array validation, but not 403)
        $this->assertNotEquals(403, $response->getStatusCode());
    }

    // ════════════════════════════════════════════════════
    // UNAUTHENTICATED ACCESS
    // ════════════════════════════════════════════════════

    public function test_unauthenticated_cannot_access_api(): void
    {
        $this->getJson('/api/projects')->assertUnauthorized();
        $this->getJson('/api/tasks')->assertUnauthorized();
        $this->getJson('/api/admin/stats')->assertUnauthorized();
        $this->getJson('/api/notifications')->assertUnauthorized();
    }

    // ════════════════════════════════════════════════════
    // ADDITIONAL COVERAGE — Viewer / Attachment / Project membership
    // ════════════════════════════════════════════════════

    public function test_viewer_cannot_add_attachment(): void
    {
        $response = $this->actingAs($this->viewer)->postJson("/api/tasks/{$this->task->id}/attachments", [
            'file' => 'fake',
        ]);
        $response->assertForbidden();
    }

    public function test_viewer_cannot_create_project(): void
    {
        $response = $this->actingAs($this->viewer)->postJson('/api/projects', [
            'name' => 'Viewer Project',
            'code' => 'VPR',
        ]);
        $response->assertForbidden();
    }

    public function test_non_member_cannot_create_task_in_project(): void
    {
        $outsider = User::factory()->create();
        $outsider->assignRole('member');

        $response = $this->actingAs($outsider)->postJson("/api/projects/{$this->project->id}/tasks", [
            'title'     => 'Outsider Task',
            'status_id' => $this->status->id,
        ]);
        $response->assertForbidden();
    }

    public function test_manager_only_sees_own_teams(): void
    {
        $otherTeam = Team::create(['name' => 'Other Team']);

        $response = $this->actingAs($this->manager)->getJson('/api/teams');
        $response->assertOk();

        $ids = collect($response->json('data'))->pluck('id')->toArray();
        $this->assertContains($this->team->id, $ids);
        $this->assertNotContains($otherTeam->id, $ids);
    }

    public function test_admin_sees_all_teams(): void
    {
        $otherTeam = Team::create(['name' => 'Other Team']);

        $response = $this->actingAs($this->admin)->getJson('/api/teams');
        $response->assertOk();

        $ids = collect($response->json('data'))->pluck('id')->toArray();
        $this->assertContains($otherTeam->id, $ids);
    }

    public function test_member_cannot_access_ai_delay_risk_project(): void
    {
        $response = $this->actingAs($this->member)->getJson("/api/ai/delay-risk/project/{$this->project->id}");
        $response->assertForbidden();
    }

    public function test_manager_can_access_ai_delay_risk_project(): void
    {
        $response = $this->actingAs($this->manager)->getJson("/api/ai/delay-risk/project/{$this->project->id}");
        $this->assertNotEquals(403, $response->getStatusCode());
    }

    public function test_project_store_rejects_non_team_member(): void
    {
        $response = $this->actingAs($this->manager)->postJson('/api/projects', [
            'name'    => 'Stranger Project',
            'code'    => 'STR',
            'team_id' => Team::create(['name' => 'Foreign Team'])->id,
        ]);
        $response->assertForbidden();
    }

    public function test_viewer_cannot_move_task(): void
    {
        $response = $this->actingAs($this->viewer)->patchJson("/api/tasks/{$this->task->id}/move", [
            'status_id'   => $this->status->id,
            'kanban_order' => 0,
        ]);
        $response->assertForbidden();
    }

    public function test_login_returns_user_with_roles(): void
    {
        $user = User::factory()->create(['password' => bcrypt('secret123')]);
        $user->assignRole('manager');

        $response = $this->postJson('/api/auth/login', [
            'email'    => $user->email,
            'password' => 'secret123',
        ]);

        $response->assertOk();
        $response->assertJsonStructure(['user' => ['roles', 'permissions'], 'token']);
        $this->assertContains('manager', $response->json('user.roles'));
    }
}
