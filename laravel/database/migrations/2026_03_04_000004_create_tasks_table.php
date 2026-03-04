<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('tasks')->nullOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->foreignId('status_id')->nullable()->constrained('task_statuses')->nullOnDelete();
            $table->enum('priority', ['low', 'medium', 'high', 'urgent'])->default('medium');
            $table->unsignedTinyInteger('complexity')->default(3);
            $table->unsignedInteger('story_points')->nullable();
            $table->date('planned_start')->nullable();
            $table->date('planned_end')->nullable();
            $table->date('due_date')->nullable();
            $table->decimal('estimated_hours', 8, 2)->nullable();
            $table->decimal('actual_hours', 8, 2)->default(0);
            $table->unsignedTinyInteger('progress_percent')->default(0);
            $table->unsignedInteger('kanban_order')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('archived_at')->nullable();
            $table->softDeletes();
            $table->timestamps();

            $table->index('project_id');
            $table->index('status_id');
            $table->index('due_date');
            $table->index('priority');
            $table->index('parent_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tasks');
    }
};
