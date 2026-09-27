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
        Schema::create('demande_justificatifs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('demande_id')->constrained('demandes')->cascadeOnDelete();
            $table->string('description');
            $table->date('date')->nullable();
            $table->decimal('montant', 15, 2)->default(0);
            $table->string('file_path');
            $table->string('original_name');
            $table->string('mime_type')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('demande_justificatifs');
    }
};
