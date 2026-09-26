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
        // Presentation per tree: full background URL (Blizzard artwork hotlink)
        // and zamimg short name for the spec icon. Nullable so old rows keep working.
        Schema::table('talent_trees', function (Blueprint $table) {
            $table->string('background')->nullable()->after('order');
            $table->string('spec_icon')->nullable()->after('background');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('talent_trees', function (Blueprint $table) {
            $table->dropColumn(['background', 'spec_icon']);
        });
    }
};
