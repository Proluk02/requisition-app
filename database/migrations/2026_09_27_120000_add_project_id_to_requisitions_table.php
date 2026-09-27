<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('requisitions', function (Blueprint $table) {
            $table->foreignUuid('project_id')->nullable()->after('user_id')->constrained('projects')->nullOnDelete();
        });

        DB::table('projects')
            ->select('id', 'name')
            ->orderBy('id')
            ->get()
            ->each(function ($project) {
                DB::table('requisitions')
                    ->whereNull('project_id')
                    ->where('projet', $project->name)
                    ->update(['project_id' => $project->id]);
            });
    }

    public function down(): void
    {
        Schema::table('requisitions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('project_id');
        });
    }
};
