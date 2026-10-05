<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Bailleurs de fonds / Donateurs
        Schema::create('donors', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name'); // Ex: Union Européenne, Misean Cara, etc.
            $table->string('code')->unique();
            $table->text('description')->nullable();
            $table->timestamps();
        });

        // 2. Lignes Budgétaires de référence (Format: 6.112.a ou 1.1.3.a)
        Schema::create('budget_lines', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('project_id')->constrained('projects')->cascadeOnDelete();
            $table->foreignUuid('donor_id')->nullable()->constrained('donors')->nullOnDelete();
            $table->string('code')->index(); // Code complet: 6.112.a
            $table->string('category_code')->nullable();
            $table->string('subcategory_code')->nullable();
            $table->string('descript_code')->nullable();
            $table->string('split_code')->nullable();
            $table->string('libelle');
            $table->string('devise')->default('USD'); // USD ou FC
            $table->decimal('budget_initial', 15, 2)->default(0);
            $table->decimal('montant_engage', 15, 2)->default(0);
            $table->decimal('montant_decaisse', 15, 2)->default(0);
            $table->decimal('solde', 15, 2)->default(0);
            $table->timestamps();
        });

        // 3. Entités Caisses (Guichets physiques / bancaires)
        Schema::create('cash_registers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name'); // Ex: Caisse principale, EU, Saint Jean Eudes...
            $table->string('code')->unique(); // Ex: CP-KANINA, CAISSE-EU
            $table->string('devise')->default('USD'); // USD ou FC
            $table->decimal('solde_actuel', 15, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // 4. Affectation des caissiers aux caisses (1 caissier peut avoir plusieurs caisses)
        Schema::create('cash_register_user', function (Blueprint $table) {
            $table->id();
            $table->foreignUuid('cash_register_id')->constrained('cash_registers')->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
        });

        // 5. Sessions Journalières de Guichet (Ouverture / Clôture comme à la banque)
        Schema::create('cash_register_sessions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('cash_register_id')->constrained('cash_registers')->cascadeOnDelete();
            $table->foreignUuid('cashier_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('authorized_by')->nullable()->constrained('users')->nullOnDelete(); // Manager Finance

            $table->date('date_session');
            $table->decimal('solde_ouverture', 15, 2)->default(0);
            $table->decimal('solde_fermeture', 15, 2)->nullable();
            $table->decimal('total_entrees', 15, 2)->default(0);
            $table->decimal('total_sorties', 15, 2)->default(0);

            $table->string('status')->default('en_attente_autorisation'); // en_attente_autorisation, ouverte, fermee
            $table->timestamp('opened_at')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->text('observation_ouverture')->nullable();
            $table->text('observation_cloture')->nullable();
            $table->timestamps();
        });

        // 6. Mouvements de caisse : BONS D'ENTRÉE (Photos 1/7) et BONS DE SORTIE (Photos 3/4)
        Schema::create('cash_movements', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('cash_register_id')->constrained('cash_registers')->cascadeOnDelete();
            $table->foreignUuid('session_id')->nullable()->constrained('cash_register_sessions')->nullOnDelete();
            $table->foreignUuid('cashier_id')->constrained('users')->cascadeOnDelete();
            $table->foreignUuid('requisition_id')->nullable()->constrained('requisitions')->nullOnDelete();
            $table->foreignUuid('budget_line_id')->nullable()->constrained('budget_lines')->nullOnDelete();

            $table->string('type'); // 'entree' (Bon d'Entrée) ou 'sortie' (Bon de Sortie)
            $table->string('numero_piece')->unique(); // Ex: BEC-2026-936 ou BSC-2026-461
            $table->date('date_mouvement');

            // Bénéficiaire ou Déposant
            $table->string('tiers_nom'); // "Reçu de" (Entrée) ou "Payer à" (Sortie)
            $table->decimal('montant', 15, 2);
            $table->string('devise'); // USD ou FC
            $table->string('montant_en_lettres');
            $table->string('motif'); // "En règlement de..." ou "Retour en caisse Cfr..."
            $table->string('imputation'); // Code budgétaire (ex: 6.112.a)

            $table->string('mode_paiement')->default('Espèces'); // Espèces, Chèque, etc.
            $table->string('reference_externe')->nullable(); // N° Chèque ou Cfr BSC N°...

            // Signatures
            $table->string('signature_tiers')->nullable();
            $table->string('signature_caissier')->nullable();
            $table->string('signature_responsable')->nullable();

            $table->timestamps();
        });

        // 7. Formulaire de justification des dépenses / Return Form (Photos 5 & 6 - Appendice 2)
        Schema::create('expense_justifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('requisition_id')->constrained('requisitions')->cascadeOnDelete();
            $table->foreignUuid('cash_movement_id')->nullable()->constrained('cash_movements')->nullOnDelete(); // Lié au Bon de Sortie
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete(); // Utilisateur / Demandeur
            $table->foreignUuid('project_manager_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('cashier_id')->nullable()->constrained('users')->nullOnDelete();

            $table->string('numero_return_form')->unique(); // Ex: RET-2026-001
            $table->string('code_activite')->nullable();
            $table->string('imputation'); // Code budget ex: 6.112.a
            $table->string('reference_bon_sortie')->nullable(); // Ex: CHA 107/08/461

            $table->decimal('montant_recu', 15, 2);
            $table->decimal('montant_utilise', 15, 2)->default(0);
            $table->decimal('solde', 15, 2)->default(0);
            $table->string('devise')->default('FC');

            $table->string('status')->default('brouillon'); // brouillon, valide_mp, apure
            $table->timestamp('apure_at')->nullable();
            $table->timestamps();
        });

        // 8. Lignes de détail de la justification (Tableau Appendice 2)
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
        Schema::dropIfExists('donors');
    }
};