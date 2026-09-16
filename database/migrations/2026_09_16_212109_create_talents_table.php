<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('talents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tree_id')->constrained('talent_trees')->cascadeOnDelete();
            $table->integer('row');
            $table->integer('col');
            $table->string('name');
            $table->string('slug')->unique();
            $table->integer('max_rank')->default(5);
            $table->boolean('is_gold')->default(false);
            $table->foreignId('requires_talent_id')->nullable()->constrained('talents')->nullOnDelete();
            $table->enum('status', ['unchanged', 'new', 'changed', 'removed', 'now_baseline', 'moved']);
            $table->text('description')->nullable();
            $table->string('icon')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('talents');
    }
};
