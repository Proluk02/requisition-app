<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. On crée d'abord la table SITES
        Schema::create('sites', function (Blueprint $table) {
            $table->id();
            $table->string('name'); 
            $table->string('location')->nullable();
            $table->timestamps();
        });

        // 2. Ensuite on crée la table PROJECTS
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->string('name'); 
            $table->string('full_name');
            $table->text('description')->nullable();
            $table->timestamps();
        });

        // 3. Enfin on crée la table PIVOT (car les deux tables au-dessus existent maintenant)
        Schema::create('project_site', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->onDelete('cascade');
            $table->foreignId('site_id')->constrained()->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_site');
        Schema::dropIfExists('projects');
        Schema::dropIfExists('sites');
    }
};