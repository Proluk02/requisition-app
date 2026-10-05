<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('petty_cash_vouchers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('requisition_id')->nullable()->constrained('requisitions')->nullOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('numero_voucher')->unique();
            $table->string('company_name')->default('ASBL BON PASTEUR');
            $table->date('date_voucher');
            $table->string('account_code')->nullable();
            $table->text('description');
            $table->decimal('montant_cdf', 15, 2)->default(0);
            $table->decimal('montant_usd', 15, 2)->default(0);
            $table->string('montant_en_lettres');

            $table->string('checked_by')->nullable();
            $table->timestamp('checked_at')->nullable();
            $table->string('authorized_by')->nullable();
            $table->timestamp('authorized_at')->nullable();
            $table->string('recipient_signature')->nullable();
            $table->timestamp('recipient_signed_at')->nullable();

            $table->string('status')->default('en_attente');
            $table->timestamps();
        });

        Schema::create('notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('type');
            $table->uuidMorphs('notifiable');
            $table->text('data');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('petty_cash_vouchers');
    }
};