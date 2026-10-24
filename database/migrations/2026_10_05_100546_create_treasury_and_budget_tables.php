<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('donors', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('code')->unique();
            $table->text('description')->nullable();
            $table->timestamps();
        });

        Schema::create('daily_exchange_rates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->date('date_taux')->unique();
            $table->decimal('taux_eur_usd', 15, 6);
            $table->decimal('taux_eur_cdf', 15, 4);
            $table->foreignUuid('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('budget_lines', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('project_id')->constrained('projects')->cascadeOnDelete();
            $table->foreignUuid('donor_id')->nullable()->constrained('donors')->nullOnDelete();

            $table->string('code');
            $table->string('category_code')->nullable();
            $table->string('subcategory_code')->nullable();
            $table->string('descript_code')->nullable();
            $table->string('split_code')->nullable();
            $table->string('libelle');
            $table->string('devise')->default('EUR');

            $table->decimal('budget_initial', 15, 2)->default(0);
            $table->decimal('montant_engage', 15, 2)->default(0);
            $table->decimal('montant_decaisse', 15, 2)->default(0);
            $table->decimal('solde', 15, 2)->default(0);
            $table->timestamps();
            $table->unique(['code', 'project_id']);
        });

        Schema::create('cash_registers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('code')->unique();
            $table->string('devise')->default('USD');
            $table->decimal('solde_actuel', 15, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('cash_register_user', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('cash_register_id')->constrained('cash_registers')->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
        });

        Schema::create('cash_register_sessions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('cash_register_id')->constrained('cash_registers')->cascadeOnDelete();
            $table->foreignUuid('cashier_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('authorized_by')->nullable()->constrained('users')->nullOnDelete();

            $table->date('date_session');
            $table->decimal('solde_ouverture', 15, 2)->default(0);
            $table->decimal('solde_fermeture', 15, 2)->nullable();
            $table->decimal('total_entrees', 15, 2)->default(0);
            $table->decimal('total_sorties', 15, 2)->default(0);

            $table->string('status')->default('en_attente_autorisation');
            $table->timestamp('opened_at')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->text('observation_ouverture')->nullable();
            $table->text('observation_cloture')->nullable();
            $table->timestamps();
        });

        Schema::create('cash_movements', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('cash_register_id')->constrained('cash_registers')->cascadeOnDelete();
            $table->foreignUuid('session_id')->nullable()->constrained('cash_register_sessions')->nullOnDelete();
            $table->foreignUuid('cashier_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('requisition_id')->nullable()->constrained('requisitions')->nullOnDelete();
            $table->foreignUuid('budget_line_id')->nullable()->constrained('budget_lines')->nullOnDelete();

            $table->string('type');
            $table->string('numero_piece')->unique();
            $table->date('date_mouvement');

            $table->string('tiers_nom');
            $table->decimal('montant', 15, 2);
            $table->string('devise');
            $table->string('montant_en_lettres');
            $table->string('motif');
            $table->string('imputation');

            $table->string('mode_paiement')->default('Espèces');
            $table->string('reference_externe')->nullable();

            $table->string('signature_tiers')->nullable();
            $table->string('signature_caissier')->nullable();
            $table->string('signature_responsable')->nullable();

            $table->timestamps();
        });

        Schema::create('expense_justifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('requisition_id')->constrained('requisitions')->cascadeOnDelete();
            $table->foreignUuid('cash_movement_id')->nullable()->constrained('cash_movements')->nullOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('project_manager_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('cashier_id')->nullable()->constrained('users')->nullOnDelete();

            $table->string('numero_return_form')->unique();
            $table->string('code_activite')->nullable();
            $table->string('imputation');
            $table->string('reference_bon_sortie')->nullable();

            $table->decimal('montant_recu', 15, 2);
            $table->decimal('montant_utilise', 15, 2)->default(0);
            $table->decimal('solde', 15, 2)->default(0);
            $table->string('devise')->default('FC');

            $table->string('status')->default('brouillon');
            $table->timestamp('apure_at')->nullable();
            $table->timestamps();
        });

        Schema::create('expense_justification_lines', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('justification_id')->constrained('expense_justifications')->cascadeOnDelete();
            $table->date('date_depense');
            $table->text('description');
            $table->decimal('montant_usd', 15, 2)->default(0);
            $table->decimal('montant_cdf', 15, 2)->default(0);
            $table->text('remarques')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expense_justification_lines');
        Schema::dropIfExists('expense_justifications');
        Schema::dropIfExists('cash_movements');
        Schema::dropIfExists('cash_register_sessions');
        Schema::dropIfExists('cash_register_user');
        Schema::dropIfExists('cash_registers');
        Schema::dropIfExists('budget_lines');
        Schema::dropIfExists('daily_exchange_rates');
        Schema::dropIfExists('donors');
    }
};
