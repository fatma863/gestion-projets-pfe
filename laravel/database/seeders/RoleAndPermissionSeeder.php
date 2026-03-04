<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RoleAndPermissionSeeder extends Seeder
{
    public function run(): void
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Permissions
        $permissions = [
            'manage-users',
            'manage-teams',
            'manage-projects',
            'manage-all-projects',
            'view-projects',
            'manage-tasks',
            'view-tasks',
            'manage-time-entries',
            'view-reports',
            'use-ai-features',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        // Roles
        $admin = Role::firstOrCreate(['name' => 'admin']);
        $admin->syncPermissions($permissions);

        $manager = Role::firstOrCreate(['name' => 'manager']);
        $manager->syncPermissions([
            'manage-teams',
            'manage-projects',
            'view-projects',
            'manage-tasks',
            'view-tasks',
            'manage-time-entries',
            'view-reports',
            'use-ai-features',
        ]);

        $member = Role::firstOrCreate(['name' => 'member']);
        $member->syncPermissions([
            'view-projects',
            'manage-tasks',
            'view-tasks',
            'manage-time-entries',
            'view-reports',
            'use-ai-features',
        ]);

        $viewer = Role::firstOrCreate(['name' => 'viewer']);
        $viewer->syncPermissions([
            'view-projects',
            'view-tasks',
            'view-reports',
        ]);
    }
}
