<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cash_registers', function (Blueprint $table) {
            $table->decimal('solde_initial_dotation', 15, 2)->default(0)->after('devise')
                ->comment('Fond de dotation initial figé');
            $table->boolean('is_approvisionnee')->default(false)->after('solde_initial_dotation')
                ->comment('Indique si la dotation initiale a été validée par le MF');
        });

        DB::table('cash_registers')->get()->each(function ($caisse) {
            DB::table('cash_registers')->where('id', $caisse->id)->update([
                'is_approvisionnee' => true,
                'solde_initial_dotation' => $caisse->solde_actuel ?? 0,
            ]);
        });

        Schema::table('cash_movements', function (Blueprint $table) {
            $table->boolean('is_approvisionnement_initial')->default(false)->after('type')
                ->comment('Marque le premier BEC de dotation');
            $table->boolean('is_approvisionnement')->default(false)->after('is_approvisionnement_initial')
                ->comment('Marque tout versement d’alimentation bancaire vers la caisse');
            $table->string('status_validation', 30)->default('valide')->after('is_approvisionnement')
                ->comment('en_attente_finance, valide, rejete');
            $table->uuid('validated_by')->nullable()->after('status_validation');
            $table->timestamp('validated_at')->nullable()->after('validated_by');
            $table->boolean('pin_validated')->default(false)->after('validated_at');

            $table->string('bordereau_banque_ref')->nullable()->after('reference_externe')
                ->comment('N° de bordereau bancaire');
            $table->string('bordereau_file_path')->nullable()->after('bordereau_banque_ref')
                ->comment('Chemin du scan/preuve du bordereau de banque (PDF/Image)');
            $table->json('billetage')->nullable()->after('bordereau_file_path')
                ->comment('Détail des coupures de billets physiques');
        });

        DB::table('cash_movements')->update([
            'status_validation' => 'valide',
            'pin_validated' => true,
        ]);

        Schema::table('cash_register_sessions', function (Blueprint $table) {
            $table->decimal('solde_theorique_cloture', 15, 2)->nullable()->after('solde_ouverture')
                ->comment('Ouverture + Entrées - Sorties');
            $table->decimal('ecart_caisse', 15, 2)->nullable()->after('solde_fermeture')
                ->comment('Physique compté - Théorique');
            $table->text('justification_ecart')->nullable()->after('ecart_caisse')
                ->comment('Obligatoire si ecart_caisse <> 0');

            $table->uuid('previous_session_id')->nullable()->after('cash_register_id')
                ->comment('Session fermée précédente');
            $table->string('origine_ouverture', 40)->default('report_veille')->after('previous_session_id')
                ->comment('report_veille ou approvisionnement_initial');
            $table->uuid('approvisionnement_movement_id')->nullable()->after('origine_ouverture')
                ->comment('ID du BEC de dotation si 1ère ouverture');

            $table->foreign('previous_session_id')->references('id')->on('cash_register_sessions')->nullOnDelete();
            $table->foreign('approvisionnement_movement_id')->references('id')->on('cash_movements')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('cash_register_sessions', function (Blueprint $table) {
            $table->dropForeign(['previous_session_id']);
            $table->dropForeign(['approvisionnement_movement_id']);
            $table->dropColumn([
                'solde_theorique_cloture',
                'ecart_caisse',
                'justification_ecart',
                'previous_session_id',
                'origine_ouverture',
                'approvisionnement_movement_id',
            ]);
        });

        Schema::table('cash_movements', function (Blueprint $table) {
            $table->dropColumn([
                'is_approvisionnement_initial',
                'is_approvisionnement',
                'status_validation',
                'validated_by',
                'validated_at',
                'pin_validated',
                'bordereau_banque_ref',
                'bordereau_file_path',
                'billetage',
            ]);
        });

        Schema::table('cash_registers', function (Blueprint $table) {
            $table->dropColumn(['solde_initial_dotation', 'is_approvisionnee']);
        });
    }
};
