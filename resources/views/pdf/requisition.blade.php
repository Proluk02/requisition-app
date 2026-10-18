<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Réquisition {{ $requisition->numero_requisition }}</title>
    <style>
        @page {
            size: A4 landscape;
            margin: 30px 40px 40px 40px; /* Marges confortables */
        }

        body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            font-size: 10px;
            color: #000;
            margin: 0;
            padding: 0;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        /* --- EN-TÊTE --- */
        .header-table {
            margin-bottom: 12px;
            border-bottom: 2px solid #000;
            padding-bottom: 8px;
        }
        .header-logo {
            width: 80px;
            height: auto;
        }

        /* --- INFO BOX --- */
        .info-box {
            margin-bottom: 15px;
            font-size: 10px;
        }
        .info-box td {
            border: 1px solid #000;
            padding: 6px 8px;
            vertical-align: middle;
        }
        .label {
            color: #4b5563;
            text-transform: uppercase;
        }
        .valeur {
            font-weight: bold;
            text-transform: uppercase;
        }

        /* --- TABLEAU DES ARTICLES --- */
        .data-table th, .data-table td {
            border: 1px solid #000;
            padding: 5px;
            font-size: 10.5px;
        }
        .data-table th {
            background-color: #f9fafb;
            font-weight: bold;
            text-align: center;
        }

        /* --- TOTAL LETTRES --- */
        .total-letters {
            border: 1px solid #000;
            background-color: #f9fafb;
            padding: 10px;
            margin-top: 15px;
            font-size: 11px;
        }

        /* --- ESPACE FLEXIBLE : empêche de coller les signatures direct après le total --- */
        .flex-spacer {
            height: 40px; 
        }

        /* --- SIGNATURES --- */
        .signatures-wrapper {
            width: 100%;
            page-break-inside: avoid; /* Cette règle DomPDF empêche les signatures de se couper sur 2 pages */
            margin-top: 10px;
        }
        .signatures-box {
            table-layout: fixed;
            width: 100%;
        }
        .signatures-box td.sig-cell {
            border: 1px solid #000;
            padding: 8px;
            vertical-align: top;
            height: 110px; /* Hauteur ajustée pour un meilleur rendu paysage */
            width: 25%;
        }
        .sig-header {
            text-align: left;
            font-weight: bold;
            font-size: 9px;
            text-transform: uppercase;
            margin-bottom: 6px;
        }
        .sig-approved {
            border: 1px solid #10b981;
            background-color: #ecfdf5;
            padding: 5px;
        }
        .sig-empty {
            color: #9ca3af;
            font-style: italic;
            font-size: 9px;
            text-align: center;
            margin-top: 30px;
        }
        .sig-footer {
            border-top: 1px solid #000;
            padding-top: 4px;
            font-size: 8.5px;
            font-weight: 600;
            margin-top: 6px;
        }

        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .text-left { text-align: left; }
        .font-bold { font-weight: bold; }
        .italic { font-style: italic; }
        .font-mono { font-family: 'Courier New', monospace; }
    </style>
</head>
<body>

@php
    $isService = strtolower($requisition->nature_requisition) === 'service';
    $isCDF = $requisition->devise === 'FC';
    $isUSD = $requisition->devise === 'USD';

    $nomDemandeur = $requisition->user->name ?? 'Inconnu';

    $dateEcheance = $isService
        ? ($requisition->date_paiement ? \Carbon\Carbon::parse($requisition->date_paiement)->format('d/m/Y') : '......../......../202.....')
        : ($requisition->date_livraison ? \Carbon\Carbon::parse($requisition->date_livraison)->format('d/m/Y') : '......../......../202.....');

    $sigMP = $requisition->signatures->where('role_signataire', 'project_manager')->where('action', 'approved')->first();
    $sigFinance = $requisition->signatures->where('role_signataire', 'finance')->where('action', 'approved')->first();
    $sigAdmin = $requisition->signatures->where('role_signataire', 'admin_manager')->where('action', 'approved')->first();
    $sigDirectrice = $requisition->signatures->where('role_signataire', 'director')->where('action', 'approved')->first();

    // ---------------------------------------------------------------------
    // GÉNÉRATION D'UN VRAI QR CODE (endroid/qr-code)
    // ---------------------------------------------------------------------
    if (!function_exists('renderRealQr')) {
        function renderRealQr(string $hash): string {
            try {
                $verificationUrl = route('signature.verify', ['hash' => $hash]);

                $qrCode = new \Endroid\QrCode\QrCode(
                    data: $verificationUrl,
                    encoding: new \Endroid\QrCode\Encoding\Encoding('UTF-8'),
                    errorCorrectionLevel: \Endroid\QrCode\ErrorCorrectionLevel::Medium,
                    size: 180,
                    margin: 2,
                    roundBlockSizeMode: \Endroid\QrCode\RoundBlockSizeMode::Margin,
                );

                $writer = new \Endroid\QrCode\Writer\PngWriter();
                $result = $writer->write($qrCode);

                return $result->getDataUri();
            } catch (\Throwable $e) {
                \Log::error('QR generation failed: ' . $e->getMessage());
                return '';
            }
        }
    }

    // ---------------------------------------------------------------------
    // BLOC SIGNATURE COMPLET avec vrai QR
    // ---------------------------------------------------------------------
    if (!function_exists('renderSignature')) {
        function renderSignature($sig, $roleTitle, $pendingLabel) {
            if (!$sig) {
                return '<div class="sig-empty">' . $pendingLabel . '</div>';
            }

            $date = \Carbon\Carbon::parse($sig->signed_at)->format('d/m/Y H:i');
            $hashShort = substr($sig->signature_hash, 0, 16) . '…';
            $qrDataUri = renderRealQr($sig->signature_hash);

            $qrHtml = $qrDataUri
                ? '<img src="' . $qrDataUri . '" width="40" height="40" alt="QR" style="display:block;" />'
                : '<div style="width:40px;height:40px;background:#eee;border:1px solid #999;"></div>';

            return '
            <div class="sig-approved">
                <table style="width: 100%; border: none; padding: 0; margin: 0; border-collapse: collapse;">
                    <tr>
                        <td style="border: none; padding: 0; vertical-align: top; text-align: left;">
                            <div style="color: #064e3b; font-size: 10px; font-weight: bold;">' . htmlspecialchars($sig->nom_signataire) . '</div>
                            <div style="color: #1e40af; font-family: serif; font-style: italic; font-size: 11px; margin: 2px 0; font-weight: bold;">~ ' . htmlspecialchars($sig->nom_signataire) . ' ~</div>
                            <div style="color: #374151; font-size: 7.5px; font-weight: bold; text-transform: uppercase;">' . $roleTitle . '</div>
                            <div style="color: #111827; font-family: monospace; font-size: 8px; font-weight: bold; margin-top: 2px;">' . htmlspecialchars($sig->signature_code) . '</div>
                            <div style="color: #4b5563; font-size: 7.5px; margin-top: 1px;">' . $date . '</div>
                            <div style="color: #6b7280; font-family: monospace; font-size: 6px; margin-top: 1px;">SHA: ' . $hashShort . '</div>
                        </td>
                        <td style="border: none; padding: 0; width: 45px; vertical-align: top; text-align: right;">
                            <div style="border: 1px solid #000; background: #fff; padding: 2px; text-align: center; display: inline-block;">
                                ' . $qrHtml . '
                                <div style="font-size: 5px; font-weight: bold; font-family: monospace; margin-top: 1px; letter-spacing: -0.5px;">CERTIFIÉ</div>
                            </div>
                        </td>
                    </tr>
                </table>
            </div>';
        }
    }

    $montantEnLettres = 'Selon arrêté réglementaire';
    if (extension_loaded('intl')) {
        $fmt = new NumberFormatter('fr', NumberFormatter::SPELLOUT);
        $montantEnLettres = ucfirst($fmt->format($requisition->montant_total)) . ' ' . $requisition->devise;
    }
@endphp

<!-- 1. EN-TÊTE -->
<table class="header-table">
    <tr>
        <td style="width: 90px; vertical-align: top;">
            @if(file_exists(public_path('assets/images/logo.png')))
                <img src="{{ public_path('assets/images/logo.png') }}" class="header-logo" alt="Logo">
            @endif
        </td>
        <td style="vertical-align: top; padding-top: 5px;">
            <div class="font-bold uppercase" style="font-size: 15px;">Bon Pasteur A.S.B.L.</div>
            <div style="font-size: 9.5px; color: #374151; margin-top: 3px; line-height: 1.35;">
                N° 04, Avenue Bon Pasteur contre Sendwe, Quartier Kanina, Commune Dilala,<br>
                Ville de Kolwezi, Province du Lualaba/RDC<br>
                <span class="italic font-bold" style="color: #000;">Référence : Concession Domaine Mariale</span>
            </div>
        </td>
        <td class="text-right" style="vertical-align: top; padding-top: 5px;">
            <div style="font-size: 16px; font-weight: bold; text-decoration: underline; text-transform: uppercase;">
                {{ $isService ? 'RÉQUISITION DE SERVICES' : "RÉQUISITION D'ACHAT" }}
            </div>

            @if($requisition->is_urgent)
                <div style="display: inline-block; border: 2px solid #b91c1c; color: #b91c1c; padding: 2px 5px; font-size: 10px; font-weight: bold; margin-top: 5px; background-color: #fef2f2;">
                    ** CIRCUIT URGENT **
                </div>
            @endif

            <div class="font-bold font-mono" style="font-size: 13px; margin-top: 8px;">
                N° : {{ $requisition->numero_requisition }}
            </div>
        </td>
    </tr>
</table>

<!-- 2. INFO BOX -->
<table class="info-box">
    <tr>
        <td style="width: 50%;">
            <span class="label">DEMANDÉ(E) PAR :</span>
            <span class="valeur" style="text-decoration: underline; margin-left: 5px;">{{ $nomDemandeur }}</span>
        </td>
        <td style="width: 25%;">
            <span class="label">DATE :</span>
            <span class="valeur">{{ $requisition->created_at->format('d/m/Y') }}</span>
        </td>
        <td style="width: 25%;">
            <span class="label">{{ $isService ? 'DATE PAIEMENT :' : 'À LIVRER LE :' }}</span>
            <span class="valeur">{{ $dateEcheance }}</span>
        </td>
    </tr>
    <tr>
        <td>
            <span class="label">PROJET :</span>
            <span class="valeur">{{ $requisition->projet }}</span>
        </td>
        <td colspan="2">
            <span class="label">CAISSE DE DÉCAISSEMENT :</span>
            <span class="valeur">{{ $requisition->caisse_decaissement }}</span>
        </td>
    </tr>
</table>

<!-- 3. TABLEAU DES ARTICLES -->
<table class="data-table">
    <thead>
        <tr>
            <th rowspan="2" style="width: 20px;">N°</th>
            <th rowspan="2" style="width: 80px;">Code d'activité</th>
            <th rowspan="2" style="width: 95px;">Code d'allocation budgétaire</th>
            <th rowspan="2">{{ $isService ? 'Nature de service' : 'Description' }}</th>
            <th rowspan="2" style="width: 40px;">{{ $isService ? 'Durée' : 'Qté' }}</th>
            <th rowspan="2" style="width: 40px;">Unité</th>
            <th colspan="2" class="text-center">{{ $isService ? 'Frais Prestation unitaire' : 'PU' }}</th>
            <th colspan="2" class="text-center">{{ $isService ? 'Frais Prestation totale' : 'PT' }}</th>
            <th rowspan="2" style="width: 50px;">OBS</th>
        </tr>
        <tr>
            <th style="width: 55px;">CDF</th>
            <th style="width: 55px;">USD</th>
            <th style="width: 65px;">CDF</th>
            <th style="width: 65px;">USD</th>
        </tr>
    </thead>
    <tbody>
        @foreach($requisition->demandes as $index => $art)
            @php
                $montantCDF = $isCDF ? $art->total_ligne : 0;
                $montantUSD = $isUSD ? $art->total_ligne : 0;
                $puCDF = $isCDF ? $art->frais_unitaire : 0;
                $puUSD = $isUSD ? $art->frais_unitaire : 0;
                $qte = $art->quantite > 0 ? $art->quantite : $art->duree;
            @endphp
            <tr class="text-center">
                <td class="font-mono">{{ $index + 1 }}</td>
                <td class="font-mono">{{ $art->code_activite ?? '' }}</td>
                <td class="font-mono font-bold">{{ $art->code_allocation ?? $art->code_all_budget ?? '—' }}</td>
                <td class="text-left font-medium">{{ $art->activite }}</td>
                <td class="font-bold font-mono">{{ $qte }}</td>
                <td>{{ $art->unite ?? '—' }}</td>
                <td class="text-right font-mono">{{ $puCDF > 0 ? number_format($puCDF, 2, ',', ' ') : '—' }}</td>
                <td class="text-right font-mono">{{ $puUSD > 0 ? number_format($puUSD, 2, ',', ' ') : '—' }}</td>
                <td class="text-right font-mono font-bold">{{ $montantCDF > 0 ? number_format($montantCDF, 2, ',', ' ') : '—' }}</td>
                <td class="text-right font-mono font-bold">{{ $montantUSD > 0 ? number_format($montantUSD, 2, ',', ' ') : '—' }}</td>
                <td style="font-size: 9px; color: #4b5563;">{{ $art->justificatifs->count() > 0 ? $art->justificatifs->count() . ' devis' : '—' }}</td>
            </tr>
        @endforeach
        <tr style="background-color: #f9fafb;">
            <td colspan="8" class="text-right font-bold uppercase">Total :</td>
            <td class="text-right font-bold font-mono">{{ $isCDF ? number_format($requisition->montant_total, 2, ',', ' ') : '—' }}</td>
            <td class="text-right font-bold font-mono">{{ $isUSD ? number_format($requisition->montant_total, 2, ',', ' ') : '—' }}</td>
            <td></td>
        </tr>
    </tbody>
</table>

<!-- 4. TOTAL LETTRES -->
<div class="total-letters">
    <strong>Montant total en lettres :</strong>
    <em class="font-bold italic" style="margin-left: 5px; font-family: serif; font-size: 12px;">{{ $montantEnLettres }}</em>
</div>

<!-- 5. ESPACE FLEXIBLE (pousse les signatures vers le bas de page en évitant les coupures) -->
<div class="flex-spacer"></div>

<!-- 6. SIGNATURES -->
<div class="signatures-wrapper">
    <table class="signatures-box">
        <tr>
            <!-- VISA MP -->
            <td class="sig-cell">
                <div class="sig-header">Manager projet</div>
                {!! renderSignature($sigMP, "Manager de Projet", "En attente de visa MP") !!}
            </td>

            <!-- VISA FINANCE -->
            <td class="sig-cell">
                <div class="sig-header">Manager chargé de finance</div>
                {!! renderSignature($sigFinance, "Manager des Finances", "En attente de visa financier") !!}
            </td>

            <!-- VISA ADMIN -->
            <td class="sig-cell">
                <div class="sig-header">Manager d'Administration</div>
                {!! renderSignature($sigAdmin, "Manager d'Administration (PAM)", "En attente de visa administratif") !!}
            </td>

            <!-- VISA DIRECTRICE -->
            <td class="sig-cell">
                <div class="sig-header">Directrice</div>
                {!! renderSignature($sigDirectrice, "Directrice Générale", "En attente d'approbation finale") !!}
            </td>
        </tr>
    </table>
</div>

</body>
</html>