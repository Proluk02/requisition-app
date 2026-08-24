<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sites', function (Blueprint $table) {
            $table->uuid('id')->primary(); 
            $table->string('name'); 
            $table->string('location')->nullable();
            $table->timestamps();
        });

        Schema::create('projects', function (Blueprint $table) {
            $table->uuid('id')->primary(); 
            $table->string('name'); 
            $table->string('full_name');
            $table->text('description')->nullable();
            $table->timestamps();
        });

        Schema::create('project_site', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('project_id')->constrained()->onDelete('cascade'); 
            $table->foreignUuid('site_id')->constrained()->onDelete('cascade');    
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_site');
        Schema::dropIfExists('projects');
        Schema::dropIfExists('sites');
    }
};