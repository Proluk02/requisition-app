import { usePage } from '@inertiajs/react';
import { PageProps } from '@/types';
import { RequisitionSuivi } from '@/types/requisitionsList';

interface SignatureOffi {
    role: string;
    nom: string;
    action: string;
    code?: string;
    date: string;
    hash: string;
}

interface Props {
    requisition: RequisitionSuivi & {
        demandeurNom?: string;
        initiateurNom?: string;
        initiateurRole?: string;
        user?: {
            name: string;
            role?: string;
        };
        is_urgent?: boolean;
        date_paiement?: string;
        date_livraison?: string;
        signatures?: SignatureOffi[];
    };
}

function LocalQrSvg({ code, hash }: { code: string; hash: string }) {
    const seed = hash || 'BONPASTEUR';
    const rects: boolean[] = [];
    for (let i = 0; i < 64; i++) {
        const charCode = seed.charCodeAt(i % seed.length);
        rects.push((charCode + i) % 2 === 0);
    }

    return (
        <div className="flex flex-col items-center justify-center p-1 border border-black bg-white shrink-0">
            <svg viewBox="0 0 32 32" className="w-10 h-10" fill="black">
                <rect x="1" y="1" width="8" height="8" fill="none" stroke="black" strokeWidth="1.5" />
                <rect x="3" y="3" width="4" height="4" fill="black" />

                <rect x="23" y="1" width="8" height="8" fill="none" stroke="black" strokeWidth="1.5" />
                <rect x="25" y="3" width="4" height="4" fill="black" />

                <rect x="1" y="23" width="8" height="8" fill="none" stroke="black" strokeWidth="1.5" />
                <rect x="3" y="25" width="4" height="4" fill="black" />

                {rects.slice(0, 36).map((val, idx) => {
                    const row = Math.floor(idx / 6) + 10;
                    const col = (idx % 6) * 3 + 2;
                    return val ? (
                        <rect key={idx} x={col} y={row} width="2" height="2" fill="black" />
                    ) : null;
                })}
            </svg>
            <span className="text-[6px] font-mono tracking-tighter text-gray-800 font-bold leading-none mt-0.5">
                CERTIFIÉ
            </span>
        </div>
    );
}

export default function OfficialPrintSheet({ requisition }: Props) {
    const { auth } = usePage<PageProps>().props;

    const isService = requisition.nature === 'Service';
    const isCDF = requisition.devise === 'FC';
    const isUSD = requisition.devise === 'USD';

    const nomDemandeur =
        requisition.demandeurNom ||
        requisition.initiateurNom ||
        requisition.user?.name ||
        auth?.user?.name ||
        '';

    const dateEcheance = isService
        ? (requisition.date_paiement || '......../......../202.....')
        : (requisition.date_livraison || '......../......../202.....');

    const sigMP = requisition.signatures?.find(
        (s) => s.role === 'project_manager' && s.action === 'approved'
    );
    const sigFinance = requisition.signatures?.find(
        (s) => s.role === 'finance' && s.action === 'approved'
    );
    const sigAdmin = requisition.signatures?.find(
        (s) => s.role === 'admin_manager' && s.action === 'approved'
    );
    const sigDirectrice = requisition.signatures?.find(
        (s) => s.role === 'director' && s.action === 'approved'
    );

    const SignatureBox = ({
        label,
        roleTitle,
        sig,
        pendingLabel,
    }: {
        label: string;
        roleTitle: string;
        sig?: SignatureOffi;
        pendingLabel: string;
    }) => (
        <div className="p-2 flex flex-col justify-between h-[125px] border-r border-black last:border-r-0">
            <p className="font-bold leading-tight text-[9px] uppercase">{label}</p>
            {sig ? (
                <div className="my-1 p-1.5 bg-green-50/90 border border-green-700 rounded text-left flex items-center justify-between gap-1.5">
                    <div className="leading-tight overflow-hidden">
                        <p className="font-bold text-green-950 truncate text-[10px]">
                            {sig.nom}
                        </p>
                        <p className="font-serif italic font-bold text-blue-900 text-[11px] my-0.5">
                            ~ {sig.nom} ~
                        </p>
                        <p className="text-[7.5px] text-gray-700 font-semibold uppercase">
                            {roleTitle}
                        </p>
                        <p className="font-mono text-[7px] text-gray-800 font-bold mt-0.5">
                            {sig.code || 'BP-SIG'}
                        </p>
                        <p className="text-[7px] text-gray-600">{sig.date}</p>
                        <p
                            className="font-mono text-[6px] text-gray-500 truncate"
                            title={sig.hash}
                        >
                            SHA: {sig.hash ? sig.hash.substring(0, 16) + '…' : 'VALIDE'}
                        </p>
                    </div>
                    <LocalQrSvg code={sig.code || ''} hash={sig.hash} />
                </div>
            ) : (
                <p className="text-gray-400 italic text-[9px] my-auto">{pendingLabel}</p>
            )}
            <p className="border-t border-black pt-1 text-[8.5px] font-semibold">
                Date : {sig ? sig.date.split(' ')[0] : '..../..../202..'}
            </p>
        </div>
    );

    return (
        <div id="bon-pasteur-official-sheet">
            <style>{`
                @page {
                    size: A4 landscape !important;
                    margin: 8mm 10mm !important;
                }
                @media print {
                    html, body {
                        width: 297mm !important;
                        height: 210mm !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                        color: black !important;
                        font-family: 'Inter', Arial, sans-serif !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    #bon-pasteur-official-sheet {
                        width: 100% !important;
                        height: 100% !important;
                        max-height: 194mm !important;
                        display: flex !important;
                        flex-direction: column !important;
                        justify-content: space-between !important;
                        box-sizing: border-box !important;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                        page-break-after: avoid !important;
                        break-after: avoid !important;
                    }
                }
            `}</style>

            <div className="w-full text-black font-sans text-xs leading-normal flex flex-col justify-between h-full">
                {/* 1. EN-TÊTE INSTITUTIONNEL */}
                <div className="flex justify-between items-start border-b-2 border-black pb-2 mb-2.5">
                    <div className="flex items-center gap-3.5">
                        <img
                            src="/assets/images/logo.png"
                            alt="Logo Bon Pasteur ASBL"
                            className="w-16 h-16 object-contain shrink-0"
                            onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
                        />
                        <div className="text-[10px] leading-snug">
                            <h1 className="font-bold text-sm uppercase tracking-wide">
                                Bon Pasteur A.S.B.L.
                            </h1>
                            <p className="mt-0.5">
                                N° 04, Avenue Bon Pasteur contre Sendwe, Quartier Kanina, Commune Dilala,
                            </p>
                            <p>Ville de Kolwezi, Province du Lualaba/RDC</p>
                            <p className="italic font-medium">Référence : Concession Domaine Mariale</p>
                        </div>
                    </div>

                    <div className="text-right leading-tight">
                        <h2 className="text-base font-black uppercase tracking-wider underline">
                            {isService ? 'RÉQUISITION DE SERVICES' : "RÉQUISITION D'ACHAT"}
                        </h2>
                        {requisition.is_urgent && (
                            <span className="inline-block border-2 border-red-700 text-red-800 font-black px-2 py-0.5 text-[9px] uppercase mt-1 bg-red-50">
                                ** CIRCUIT URGENT **
                            </span>
                        )}
                        <p className="font-mono font-bold text-sm mt-1">
                            N° : {requisition.numero}
                        </p>
                    </div>
                </div>

                {/* 2. DEMANDEUR, PROJET, DATE DE DEMANDE ET DATE DE LIVRAISON SUR LA MÊME LIGNE */}
                <div className="border border-black text-xs mb-3 bg-gray-50/50 divide-y divide-black">
                    <div className="grid grid-cols-2 divide-x divide-black p-2">
                        <p>
                            <strong className="uppercase text-gray-700">Demandé(e) par :</strong>{' '}
                            <span className="font-bold text-black text-sm uppercase underline ml-1">
                                {nomDemandeur}
                            </span>
                        </p>
                        <div className="pl-2 flex items-center justify-between">
                            <p>
                                <strong className="uppercase text-gray-700">Date de la demande :</strong>{' '}
                                <span className="font-mono font-semibold ml-1">{requisition.dateSoumission}</span>
                            </p>
                            <p className="border-l border-black pl-2">
                                <strong className="uppercase text-gray-700">
                                    {isService ? 'Date de paiement :' : 'À livrer le :'}
                                </strong>{' '}
                                <span className="font-mono font-bold ml-1">{dateEcheance}</span>
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 divide-x divide-black p-2">
                        <p>
                            <strong className="uppercase text-gray-700">Projet :</strong>{' '}
                            <span className="font-bold ml-1">{requisition.projet}</span>
                        </p>
                        <p className="pl-2">
                            <strong className="uppercase text-gray-700">Caisse de décaissement :</strong>{' '}
                            <span className="font-bold ml-1">{requisition.caisse}</span>
                        </p>
                    </div>
                </div>

                {/* 3. TABLEAU DES ARTICLES */}
                <div className="flex-1 mb-3">
                    <table className="w-full border-collapse border border-black text-[10.5px]">
                        <thead>
                            <tr className="bg-gray-100 text-center font-bold">
                                <th rowSpan={2} className="border border-black p-1.5 w-8">
                                    N°
                                </th>
                                <th rowSpan={2} className="border border-black p-1.5 w-24">
                                    Code d'activité
                                </th>
                                <th rowSpan={2} className="border border-black p-1.5 w-28">
                                    Code d'allocation budgétaire
                                </th>
                                <th rowSpan={2} className="border border-black p-1.5">
                                    {isService ? 'Nature de service' : 'Description'}
                                </th>
                                <th rowSpan={2} className="border border-black p-1.5 w-14">
                                    {isService ? 'Durée' : 'Qté'}
                                </th>
                                <th rowSpan={2} className="border border-black p-1.5 w-14">
                                    Unité
                                </th>
                                <th colSpan={2} className="border border-black p-1 text-center">
                                    {isService ? 'Frais Prestation unitaire' : 'PU'}
                                </th>
                                <th colSpan={2} className="border border-black p-1 text-center">
                                    {isService ? 'Frais Prestation totale' : 'PT'}
                                </th>
                                <th rowSpan={2} className="border border-black p-1.5 w-20">
                                    OBS
                                </th>
                            </tr>
                            <tr className="bg-gray-100 text-center font-bold">
                                <th className="border border-black p-1 w-20">CDF</th>
                                <th className="border border-black p-1 w-20">USD</th>
                                <th className="border border-black p-1 w-20">CDF</th>
                                <th className="border border-black p-1 w-20">USD</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requisition.articles.map((art, index) => {
                                const montantCDF = isCDF ? art.total : 0;
                                const montantUSD = isUSD ? art.total : 0;
                                const puCDF = isCDF ? art.prixUnitaire : 0;
                                const puUSD = isUSD ? art.prixUnitaire : 0;

                                return (
                                    <tr key={art.id} className="text-center">
                                        <td className="border border-black p-2 font-mono">{index + 1}</td>

                                        <td className="border border-black p-2 font-mono">
                                            {(art as any).codeActivite || ''}
                                        </td>

                                        <td className="border border-black p-2 font-mono font-bold text-center">
                                            {(art as any).codeAllocation || art.codeBudget || '—'}
                                        </td>

                                        <td className="border border-black p-2 text-left font-medium">
                                            {art.activite}
                                        </td>
                                        <td className="border border-black p-2 font-bold font-mono">
                                            {art.quantiteOuDuree}
                                        </td>
                                        <td className="border border-black p-2">{art.unite}</td>
                                        <td className="border border-black p-2 text-right font-mono">
                                            {puCDF > 0 ? puCDF.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) : '—'}
                                        </td>
                                        <td className="border border-black p-2 text-right font-mono">
                                            {puUSD > 0 ? puUSD.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) : '—'}
                                        </td>
                                        <td className="border border-black p-2 text-right font-mono font-bold">
                                            {montantCDF > 0 ? montantCDF.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) : '—'}
                                        </td>
                                        <td className="border border-black p-2 text-right font-mono font-bold">
                                            {montantUSD > 0 ? montantUSD.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) : '—'}
                                        </td>
                                        <td className="border border-black p-2 text-[9px] text-gray-600">
                                            {art.justificatifsCount > 0
                                                ? `${art.justificatifsCount} devis`
                                                : '—'}
                                        </td>
                                    </tr>
                                );
                            })}
                            <tr className="font-bold bg-gray-100">
                                <td
                                    colSpan={8}
                                    className="border border-black p-2 text-right uppercase tracking-wider"
                                >
                                    Total :
                                </td>
                                <td className="border border-black p-2 text-right font-mono text-xs">
                                    {isCDF ? requisition.montantTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) : '—'}
                                </td>
                                <td className="border border-black p-2 text-right font-mono text-xs">
                                    {isUSD ? requisition.montantTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) : '—'}
                                </td>
                                <td className="border border-black p-2" />
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* 4. MONTANT TOTAL EN TOUTES LETTRES */}
                <div className="text-xs mb-3 p-2.5 border border-black bg-gray-50/30">
                    <p>
                        <strong>Montant total en lettres :</strong>{' '}
                        <em className="font-serif ml-1 text-sm">
                            {requisition.montantLettres || 'Selon arrêté réglementaire'}
                        </em>
                    </p>
                </div>

                {/* 5. CASES DE SIGNATURES OFFICIELLES (4 VISAS LISIBLES ET ÉQUILIBRÉS) */}
                <div className="grid grid-cols-4 border border-black text-center text-xs bg-white">
                    <SignatureBox
                        label="Manager projet"
                        roleTitle="Manager de Projet"
                        sig={sigMP}
                        pendingLabel="En attente de visa MP"
                    />
                    <SignatureBox
                        label="Manager chargé de finance"
                        roleTitle="Manager des Finances"
                        sig={sigFinance}
                        pendingLabel="En attente de visa financier"
                    />
                    <SignatureBox
                        label="Manager d'Administration"
                        roleTitle="Manager d'Administration (PAM)"
                        sig={sigAdmin}
                        pendingLabel="En attente de visa administratif"
                    />
                    <SignatureBox
                        label="Directrice"
                        roleTitle="Directrice Générale"
                        sig={sigDirectrice}
                        pendingLabel="En attente d'approbation finale"
                    />
                </div>
            </div>
        </div>
    );
}