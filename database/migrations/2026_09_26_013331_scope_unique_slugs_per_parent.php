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
        // Slugs repeat across classes (Paladin and Warrior both have a
        // 'protection' tree; talents like 'precision' may repeat too), so
        // uniqueness moves from the bare slug to the (slug, parent) pair.
        Schema::table('talents', function (Blueprint $table) {
            $table->dropUnique(['slug']);
            $table->unique(['slug', 'tree_id']);
        });
        Schema::table('talent_trees', function (Blueprint $table) {
            $table->unique(['slug', 'class_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('talent_trees', function (Blueprint $table) {
            $table->dropUnique(['slug', 'class_id']);
        });
        Schema::table('talents', function (Blueprint $table) {
            $table->dropUnique(['slug', 'tree_id']);
            $table->unique(['slug']);
        });
    }
};
