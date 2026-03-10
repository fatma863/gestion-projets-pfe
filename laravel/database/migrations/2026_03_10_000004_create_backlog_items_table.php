<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('backlog_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('backlog_items')->cascadeOnDelete();
            $table->enum('type', ['epic', 'story']);
            $table->string('title');
            $table->text('description')->nullable();
            $table->unsignedTinyInteger('priority')->default(0);
            $table->unsignedSmallInteger('story_points')->nullable();
            $table->enum('status', ['open', 'in_progress', 'done'])->default('open');
            $table->unsignedInteger('order')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['project_id', 'type']);
            $table->index('parent_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('backlog_items');
    }
};
