<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('demandes', function (Blueprint $table) {
            $table->string('code_allocation')->nullable()->after('code_all_budget');
        });
    }

    public function down(): void
    {
        Schema::table('demandes', function (Blueprint $table) {
            $table->dropColumn('code_allocation');
        });
    }
};
