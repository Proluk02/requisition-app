<?php

namespace App\Http\Controllers;

use App\Models\RequisitionSignature;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SignatureVerificationController extends Controller
{
    /**
     * Page publique de vérification d'une signature.
     * Accessible en scannant le QR code du document PDF.
     */
    public function verify(string $hash)
    {
        $signature = RequisitionSignature::with(['requisition', 'user'])
            ->where('signature_hash', $hash)
            ->first();

        if (!$signature) {
            return Inertia::render('Signature/Verify', [
                'valid' => false,
                'message' => 'Aucune signature ne correspond à ce code.',
                'signature' => null,
            ]);
        }

        return Inertia::render('Signature/Verify', [
            'valid' => true,
            'message' => 'Signature authentifiée et valide.',
            'signature' => [
                'nom_signataire' => $signature->nom_signataire,
                'role_signataire' => $signature->role_signataire,
                'action' => $signature->action,
                'signed_at' => $signature->signed_at?->format('d/m/Y H:i:s'),
                'signature_code' => $signature->signature_code,
                'signature_hash' => $signature->signature_hash,
                'requisition' => [
                    'numero' => $signature->requisition->numero_requisition,
                    'projet' => $signature->requisition->projet,
                    'montant' => $signature->requisition->montant_total,
                    'devise' => $signature->requisition->devise,
                    'nature' => $signature->requisition->nature_requisition,
                ],
            ],
        ]);
    }
}