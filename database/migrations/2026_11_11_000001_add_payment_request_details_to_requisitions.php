<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('requisitions', function (Blueprint $table) {
            $table->string('beneficiaire_nom')->nullable();
            $table->text('beneficiaire_adresse')->nullable();
            $table->string('beneficiaire_telephone')->nullable();
            $table->string('beneficiaire_email')->nullable();
            $table->string('numero_facture')->nullable();
            $table->date('date_facture')->nullable();
        });

        Schema::table('demandes', function (Blueprint $table) {
            $table->string('entreprise')->default('BON PASTEUR');
            $table->string('donneur')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('requisitions', function (Blueprint $table) {
            $table->dropColumn([
                'beneficiaire_nom',
                'beneficiaire_adresse',
                'beneficiaire_telephone',
                'beneficiaire_email',
                'numero_facture',
                'date_facture',
            ]);
        });

        Schema::table('demandes', function (Blueprint $table) {
            $table->dropColumn(['entreprise', 'donneur']);
        });
    }
};
