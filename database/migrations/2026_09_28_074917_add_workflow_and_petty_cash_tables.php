<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Colonnes officielles sur requisitions
        Schema::table('requisitions', function (Blueprint $table) {
            $table->boolean('is_urgent')->default(false)->after('status');
            $table->date('date_paiement')->nullable()->after('is_urgent'); 
            $table->date('date_livraison')->nullable()->after('date_paiement'); 
        });

        // 2. Table des Signatures Électroniques Certifiées
        Schema::create('requisition_signatures', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('requisition_id')->constrained('requisitions')->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('role_signataire'); // project_manager, finance, admin_manager, director
            $table->string('nom_signataire');
            $table->string('action'); // approved, rejected
            $table->text('commentaire')->nullable();
            $table->string('signature_code')->nullable(); // Code d'authenticité unique : BP-SIG-MP-JL-260928-8F2A
            $table->string('signature_hash'); // Empreinte SHA-256 infalsifiable
            $table->timestamp('signed_at');
            $table->timestamps();
        });

        // 3. Table des Vouchers Petite Caisse (Photo 3)
        Schema::create('petty_cash_vouchers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('requisition_id')->nullable()->constrained('requisitions')->nullOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('numero_voucher')->unique(); // Ex: PCV-2026-001
            $table->string('company_name')->default('ASBL BON PASTEUR');
            $table->date('date_voucher');
            $table->string('account_code')->nullable(); // A/C CODE
            $table->text('description'); // Dépense sans facture <= 20$ ou <= 30000 FC
            $table->decimal('montant_cdf', 15, 2)->default(0);
            $table->decimal('montant_usd', 15, 2)->default(0);
            $table->string('montant_en_lettres');
            
            // Signatures officielles Voucher (Photo 3)
            $table->string('checked_by')->nullable(); // Manager de Projet
            $table->timestamp('checked_at')->nullable();
            $table->string('authorized_by')->nullable(); // Finance / Caisse
            $table->timestamp('authorized_at')->nullable();
            $table->string('recipient_signature')->nullable(); // Bénéficiaire
            $table->timestamp('recipient_signed_at')->nullable();

            $table->string('status')->default('en_attente'); // en_attente, valide_mp, apure
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('petty_cash_vouchers');
        Schema::dropIfExists('requisition_signatures');

        Schema::table('requisitions', function (Blueprint $table) {
            $table->dropColumn(['is_urgent', 'date_paiement', 'date_livraison']);
        });
    }
};