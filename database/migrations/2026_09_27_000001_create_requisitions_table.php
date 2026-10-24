<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('requisitions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('project_id')->nullable()->constrained('projects')->nullOnDelete();
            $table->string('numero_requisition');
            $table->string('nature_requisition');
            $table->string('projet');
            $table->string('project_code')->nullable();
            $table->string('caisse_decaissement')->nullable();
            $table->string('devise')->default('EUR');
            $table->text('observation')->nullable();
            $table->text('derniere_observation')->nullable();
            $table->decimal('montant_total', 15, 2)->default(0);

            $table->decimal('taux_eur_usd', 15, 6)->nullable();
            $table->decimal('taux_eur_cdf', 15, 4)->nullable();
            $table->decimal('montant_total_eur', 15, 2)->default(0);

            $table->string('status')->default('draft');
            $table->boolean('is_urgent')->default(false);
            $table->date('date_paiement')->nullable();
            $table->date('date_livraison')->nullable();

            $table->foreignUuid('cashier_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('mode_paiement')->nullable();
            $table->string('reference_paiement')->nullable();
            $table->timestamp('date_decaissement')->nullable();

            $table->timestamps();
        });

        Schema::create('demandes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('requisition_id')->constrained('requisitions')->cascadeOnDelete();
            $table->string('activite');
            $table->string('code_all_budget');
            $table->string('code_allocation')->nullable();
            $table->string('libelle_allocation')->nullable();
            $table->string('nature')->nullable();
            $table->decimal('quantite', 15, 2)->nullable();
            $table->decimal('duree', 15, 2)->nullable();
            $table->string('unite')->nullable();
            $table->decimal('frais_unitaire', 15, 2)->default(0);
            $table->decimal('total_ligne', 15, 2)->default(0);
            $table->timestamps();
        });

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

        Schema::create('requisition_signatures', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('requisition_id')->constrained('requisitions')->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('role_signataire');
            $table->string('nom_signataire');
            $table->string('action');
            $table->text('commentaire')->nullable();
            $table->string('signature_code')->nullable();
            $table->string('signature_hash');
            $table->timestamp('signed_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('requisition_signatures');
        Schema::dropIfExists('demande_justificatifs');
        Schema::dropIfExists('demandes');
        Schema::dropIfExists('requisitions');
    }
};
