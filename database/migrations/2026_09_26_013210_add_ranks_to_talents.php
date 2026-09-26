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
        // Verbatim per-rank texts (array of strings, one per rank) plus the
        // active-ability block (cost/type/cd/range/description) when present.
        // Nullable: hand-written rows (Paladin) only carry `description`.
        Schema::table('talents', function (Blueprint $table) {
            $table->json('ranks')->nullable()->after('description');
            $table->json('skill')->nullable()->after('ranks');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('talents', function (Blueprint $table) {
            $table->dropColumn(['ranks', 'skill']);
        });
    }
};
