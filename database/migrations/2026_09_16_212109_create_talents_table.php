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
            $table->tree_id()->foreign('talent_trees');
            $table->row(1, 2, 3, 4, 5, 6, 7);
            $table->col(1, 2, 3, 4);
            $table->name();
            $table->max_rank()->default(5);
            $table->is_gold()->default(false);
            $table->requires_talent_id()->nullable()->foreign('talents');
            $table->status('unchanged', 'new', 'changed', 'removed', 'now_baseline', 'moved');
            $table->description();
            $table->icon();
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
