<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action'); // project_created, task_created, task_updated, task_moved, member_added, member_removed, comment_added, attachment_added, time_entry_added, status_changed
            $table->string('subject_type')->nullable(); // App\Models\Task, App\Models\Project, etc.
            $table->unsignedBigInteger('subject_id')->nullable();
            $table->json('properties')->nullable(); // extra context (old values, new values, etc.)
            $table->timestamps();

            $table->index(['project_id', 'created_at']);
            $table->index(['subject_type', 'subject_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};
