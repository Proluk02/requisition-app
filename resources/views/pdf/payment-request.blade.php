<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Payment Request {{ $requisition->numero_requisition }}</title>
    <style>
        @page { size: A4 portrait; margin: 24px 28px 26px; }
        body { margin: 0; color: #111; font-family: "Times New Roman", serif; font-size: 9px; }
        table { width: 100%; border-collapse: collapse; }
        .header { margin-bottom: 5px; border-bottom: 2px solid #111; }
        .header td { vertical-align: middle; padding: 2px 3px 6px; }
        .brand { width: 42%; }
        .brand-inner { width: 100%; }
        .brand-inner td { border: 0; padding: 0 3px; vertical-align: middle; }
        .logo { width: 42px; height: 42px; }
        .organization { font-size: 7px; line-height: 1.3; }
        .organization strong { display: block; font-size: 8px; margin-bottom: 4px; }
        .heading { width: 34%; text-align: center; }
        .heading strong { display: block; font-size: 14px; margin-bottom: 5px; }
        .heading span { display: block; font-size: 9px; font-weight: bold; line-height: 1.45; }
        .right-heading { width: 24%; text-align: center; font-size: 9px; }
        .payment-layout { margin: 4px 0 10px; page-break-inside: avoid; }
        .payment-layout > tbody > tr > td { vertical-align: top; }
        .payable { width: 62%; padding-right: 17px; }
        .accounting { width: 38%; }
        .payable-title { color: #b51e23; font-weight: bold; margin: 3px 0 7px; }
        .payable-fields td { padding: 3px 2px; vertical-align: bottom; }
        .payable-fields .field-label { width: 68px; font-weight: bold; white-space: nowrap; }
        .payable-fields .field-value { border-bottom: 1px solid #555; font-weight: bold; padding-left: 5px; }
        .payable-fields .amount { color: #1496ae; }
        .subnote { font-size: 8px; padding: 1px 2px 3px !important; }
        .accounting-box { table-layout: fixed; }
        .accounting-box th, .accounting-box td { border: 1px solid #111; padding: 3px 4px; }
        .accounting-box th { font-size: 9px; text-align: center; }
        .accounting-box td:first-child { width: 56%; font-weight: bold; }
        .accounting-box td:last-child { width: 44%; font-weight: bold; }
        .accounting-value { color: #1496ae; }
        .items { table-layout: fixed; font-size: 7.5px; }
        .items th, .items td { border: 1px solid #111; padding: 3px 2px; }
        .items th { text-align: center; font-weight: bold; line-height: 1.15; }
        .items td { height: 14px; vertical-align: middle; }
        .items .description { width: 37%; }
        .items .charge-name { width: 12%; }
        .items .donor { width: 9%; }
        .items .project { width: 9%; }
        .items .budget-code { width: 12%; }
        .items .request-type { width: 11%; }
        .items .amount { width: 10%; }
        .items .amount-cell { text-align: right; white-space: nowrap; }
        .items tfoot td { font-weight: bold; height: 15px; }
        .items .total-label { text-align: right; }
        .supporting { margin: 3px 0 13px; font-weight: bold; font-size: 8px; }
        .signatures { table-layout: fixed; page-break-inside: avoid; font-size: 8.5px; }
        .signatures td { width: 33.333%; vertical-align: top; padding: 0 10px 0 2px; }
        .signatures td:last-child { padding-left: 10px; padding-right: 2px; }
        .signatures-centered { width: 66.666%; margin-top: 20px; margin: 0 auto; table-layout: fixed; page-break-inside: avoid; font-size: 8.5px; }
        .signatures-centered td { width: 50%; vertical-align: top; padding: 0 10px 0 2px; }
        .signatures-centered td:last-child { padding-left: 10px; padding-right: 2px; }
        .signature-block { margin-bottom: 12px; }
        .signature-line { margin-top: 4px; line-height: 1.5; }
        .signature-name { font-weight: bold; }
        .position { color: #1496ae; font-weight: bold; }
        .line { display: inline-block; height: 9px; border-bottom: 1px solid #444; vertical-align: bottom; }
        .name-line { width: 72%; }
        .signature-space { width: 47%; }
        .date-line { width: 20%; }
        .approved-line { width: 55%; }
    </style>
</head>
<body>
@php
    $currency = $requisition->devise === 'CDF' ? 'FC' : $requisition->devise;
    $amount = number_format((float) $requisition->montant_total, 2, '.', ',');
    $itemsToPad = max(0, 17 - $paymentRequestItems->count());
    $preparedName = $requisition->user?->name ?: '____________________________';
    $pmName = $pmSignature?->nom_signataire ?: '____________________________';
    $pamName = $pamSignature?->nom_signataire ?: '____________________________';
    $financeName = $financeSignature?->nom_signataire ?: '____________________________';
    $directorName = $directorSignature?->nom_signataire ?: '____________________________';

    
    $pmDate = $pmSignature?->signed_at ?: '____________________________';
    $pamDate = $pamSignature?->signed_at ?: '____________________________';
    $financeDate = $financeSignature?->signed_at ?: '____________________________';
    $directorDate = $directorSignature?->signed_at ?: '____________________________';
@endphp

<table class="header">
    <tr>
        <td class="brand">
            <table class="brand-inner">
                <tr>
                    <td style="width: 46px;">
                        <img class="logo" src="{{ public_path('assets/images/logo.png') }}" alt="Bon Pasteur">
                    </td>
                    <td class="organization">
                        <strong>Bon Pasteur A.S.B.L</strong>
                        N° 04, Avenue Bon Pasteur contre Sendwe,<br>
                        Quartier Kanina, Commune Dilala,<br>
                        Ville de Kolwezi, Province du Lualaba/RDC<br>
                        Référence : Concession Domaine Mariale
                    </td>
                </tr>
            </table>
        </td>
        <td class="heading">
            <strong>PAYMENT REQUEST</strong>
            <span>Check Request Voucher<br>D.R. Congo BP</span>
        </td>
        <td class="right-heading">{{ $requisition->caisse_decaissement ?: ' ' }}</td>
    </tr>
</table>

<table class="payment-layout">
    <tr>
        <td class="payable">
            <div class="payable-title">Payable To:</div>
            <table class="payable-fields">
                <tr>
                    <td class="field-label">Name :</td>
                    <td class="field-value">{{ $requisition->beneficiaire_nom ?: ' ' }}</td>
                </tr>
                <tr>
                    <td class="field-label">Address :</td>
                    <td class="field-value">{{ $requisition->beneficiaire_adresse ?: ' ' }}</td>
                </tr>
                <tr>
                    <td class="field-label">No Tel :</td>
                    <td class="field-value">{{ $requisition->beneficiaire_telephone ?: ' ' }}</td>
                </tr>
                <tr>
                    <td class="field-label">Mail :</td>
                    <td class="field-value">{{ $requisition->beneficiaire_email ?: ' ' }}</td>
                </tr>
                <tr>
                    <td class="field-label">Payment Mode:</td>
                    <td class="field-value">{{ $requisition->mode_paiement ?: ' ' }}</td>
                </tr>
                <tr>
                    <td class="field-label">Cash Register:</td>
                    <td class="field-value">{{ $requisition->caisse_decaissement ?: ' ' }}</td>
                </tr>
                <tr>
                    <td class="field-label">Amount in {{ $currency }}:</td>
                    <td class="field-value amount">{{ $amount }}</td>
                </tr>
                <tr>
                    <td class="field-label">Date needed:</td>
                    <td class="field-value">{{ $requisition->date_paiement?->format('d/m/Y') ?: ' ' }}</td>
                </tr>
            </table>
        </td>
        <td class="accounting">
            <table class="accounting-box">
                <thead><tr><th colspan="2">Accounting Use Only</th></tr></thead>
                <tbody>
                    <tr><td>Voucher #</td><td>{{ $requisition->numero_requisition }}</td></tr>
                    <tr><td>Debited Acct.</td><td>1083607771018 USD</td></tr>
                    <tr><td>Credit Acct.</td><td>1083607771018 USD</td></tr>
                    <tr><td>Invoice #:</td><td>{{ $requisition->numero_facture ?: '—' }}</td></tr>
                    <tr><td>Invoice Date:</td><td>{{ $requisition->date_facture?->format('d/m/Y') ?: '—' }}</td></tr>
                    <tr><td>Due Date:</td><td>{{ $dateEcheance?->format('d-M-y') ?: '—' }}</td></tr>
                    <tr><td>Amount:</td><td class="accounting-value">{{ $amount }}</td></tr>
                    <tr><td>Currency:</td><td class="accounting-value">{{ $currency }}</td></tr>
                </tbody>
            </table>
        </td>
    </tr>
</table>

<table class="items">
    <thead>
        <tr>
            <th class="description" rowspan="2">In Payment of</th>
            <th class="charge-name" rowspan="2">Charge Name</th>
            <th class="donor" rowspan="2">Donor</th>
            <th class="project" rowspan="2">Project</th>
            <th colspan="2">Charge Number</th>
            <th class="amount" rowspan="2">Amount</th>
        </tr>
        <tr>
            <th class="budget-code">Budget Code</th>
            <th class="request-type">Expenditure Type</th>
        </tr>
    </thead>
    <tbody>
        @foreach ($paymentRequestItems as $item)
            <tr>
                <td>{{ $item['libelle'] }}</td>
                <td style="text-align: center;">{{ $item['entreprise'] }}</td>
                <td style="text-align: center;">{{ $item['donneur'] }}</td>
                <td style="text-align: center;">{{ $item['projet'] }}</td>
                <td style="text-align: center;">{{ $item['code_allocation'] }}</td>
                <td style="text-align: center;">{{ $item['type_demande'] }}</td>
                <td class="amount-cell">{{ number_format($item['montant'], 2, '.', ',') }}</td>
            </tr>
        @endforeach
        @for ($row = 0; $row < $itemsToPad; $row++)
            <tr>
                <td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td>
            </tr>
        @endfor
    </tbody>
    <tfoot>
        <tr>
            <td colspan="5" style="border-right: 0;"></td>
            <td class="total-label" style="border-left: 0;">Total</td>
            <td class="amount-cell">{{ $amount }}</td>
        </tr>
    </tfoot>
</table>

<div class="supporting">Supporting documentation must be attached.</div>

<table class="signatures">
    <tr>
        <td>
            <div class="signature-block">
                <div class="signature-name">Prepared by : {{ $preparedName }}</div>
                <div class="signature-line">Position: <span class="position">{{ $initiatorPosition }}</span></div>
                <div class="signature-line">Date: {{ $requisition->created_at ?: '—' }}</div>
            </div>
        </td>
        <td>
            <div class="signature-block">
                <div class="signature-name">Reviewed by : {{ $pmName }}</div>
                <div class="signature-line">Position: <span class="position">Project Manager</span></div>
                <div class="signature-line"> Date: {{ $pmDate }}</div>
            </div>
        </td>
        <td>
            <div class="signature-block">
                <div class="signature-name">Reviewed by : {{ $financeName }}</div>
                <div class="signature-line">Position: <span class="position">Finance Manager</span></div>
                <div class="signature-line"> Date: {{ $financeDate }}</div>
            </div>
        </td>
    </tr>
</table>

<table class="signatures-centered">
    <tr>
        <td>
            <div class="signature-block">
                <div class="signature-name">Reviewed by : {{ $pamName }}</div>
                <div class="signature-line">Position: <span class="position">Project Administrator Manager</span></div>
                <div class="signature-line"> Date: {{ $pamDate }}</div>
            </div>
        </td>
        <td>
            <div class="signature-block">
                <div class="signature-name">Approved by : {{ $directorName }}</div>
                <div class="signature-line">Position: <span class="position">BP Director</span></div>
                <div class="signature-line">Date: {{ $directorDate }}</div>
            </div>
        </td>
    </tr>
</table>
</body>
</html>
