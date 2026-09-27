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
        Schema::create('requisitions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('numero_requisition');
            $table->string('nature_requisition');
            $table->string('projet');
            $table->string('project_code')->nullable();
            $table->string('caisse_decaissement')->nullable();
            $table->string('devise');
            $table->text('observation')->nullable();
            $table->decimal('montant_total', 15, 2)->default(0);
            $table->string('status')->default('draft');
            $table->timestamps();
        });

        Schema::create('demandes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('requisition_id')->constrained('requisitions')->cascadeOnDelete();
            $table->string('activite');
            $table->string('code_all_budget');
            $table->string('nature')->nullable();
            $table->decimal('quantite', 15, 2)->nullable();
            $table->decimal('duree', 15, 2)->nullable();
            $table->string('unite')->nullable();
            $table->decimal('frais_unitaire', 15, 2)->default(0);
            $table->decimal('total_ligne', 15, 2)->default(0);
            $table->json('justificatifs')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('demandes');
        Schema::dropIfExists('requisitions');
    }
};
