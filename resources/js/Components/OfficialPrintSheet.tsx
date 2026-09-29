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
        is_urgent?: boolean;
        date_paiement?: string;
        date_livraison?: string;
        signatures?: SignatureOffi[];
    };
}

/**
 * Repère d'audit vectoriel — motif géométrique unique dérivé du hash SHA-256.
 * 100% offline, aucun appel réseau. Joué le rôle d'un QR code d'authenticité.
 */
function LocalQrSvg({ code, hash }: { code: string; hash: string }) {
    const seed = hash || 'BONPASTEUR';
    const rects: boolean[] = [];
    for (let i = 0; i < 64; i++) {
        const charCode = seed.charCodeAt(i % seed.length);
        rects.push((charCode + i) % 2 === 0);
    }

    return (
        <div className="flex flex-col items-center justify-center p-0.5 border border-black bg-white shrink-0">
            <svg viewBox="0 0 32 32" className="w-11 h-11" fill="black">
                {/* Repères d'angle */}
                <rect x="1" y="1" width="8" height="8" fill="none" stroke="black" strokeWidth="1.5" />
                <rect x="3" y="3" width="4" height="4" fill="black" />

                <rect x="23" y="1" width="8" height="8" fill="none" stroke="black" strokeWidth="1.5" />
                <rect x="25" y="3" width="4" height="4" fill="black" />

                <rect x="1" y="23" width="8" height="8" fill="none" stroke="black" strokeWidth="1.5" />
                <rect x="3" y="25" width="4" height="4" fill="black" />

                {/* Motif matriciel dérivé du hash */}
                {rects.slice(0, 36).map((val, idx) => {
                    const row = Math.floor(idx / 6) + 10;
                    const col = (idx % 6) * 3 + 2;
                    return val ? (
                        <rect key={idx} x={col} y={row} width="2" height="2" fill="black" />
                    ) : null;
                })}
            </svg>
            <span className="text-[6px] font-mono tracking-tighter text-gray-500 font-bold mt-0.5">
                CERTIFIÉ
            </span>
        </div>
    );
}

export default function OfficialPrintSheet({ requisition }: Props) {
    const isService = requisition.nature === 'Service';
    const isCDF = requisition.devise === 'FC';
    const isUSD = requisition.devise === 'USD';

    // Extraction des signatures officielles
    const sigMP = requisition.signatures?.find(
        (s) => s.role === 'project_manager' && s.action === 'approved',
    );
    const sigFinance = requisition.signatures?.find(
        (s) => s.role === 'finance' && s.action === 'approved',
    );
    const sigAdmin = requisition.signatures?.find(
        (s) => s.role === 'admin_manager' && s.action === 'approved',
    );
    const sigDirectrice = requisition.signatures?.find(
        (s) => s.role === 'director' && s.action === 'approved',
    );

    /**
     * Case signature réutilisable : libellé officiel + bloc signé OU ligne d'attente.
     */
    const SignatureBox = ({
        label,
        sig,
        pendingLabel,
    }: {
        label: string;
        sig?: SignatureOffi;
        pendingLabel: string;
    }) => (
        <div className="p-1.5 flex flex-col justify-between min-h-[110px]">
            <p className="font-bold leading-tight">{label}</p>
            {sig ? (
                <div className="my-1 p-1 bg-green-50/90 border border-green-700 rounded text-left flex items-center justify-between gap-1.5">
                    <div className="leading-tight overflow-hidden">
                        <p className="font-bold text-green-950 truncate text-[9px]">{sig.nom}</p>
                        <p className="font-serif italic font-bold text-blue-900 text-[10px] my-0.5">
                            ~ {sig.nom} ~
                        </p>
                        <p className="font-mono text-[7px] text-gray-800 font-bold">
                            {sig.code || 'BP-SIG'}
                        </p>
                        <p className="text-[7px] text-gray-500">{sig.date}</p>
                        <p
                            className="font-mono text-[6px] text-gray-500 truncate"
                            title={sig.hash}
                        >
                            SHA-256: {sig.hash ? sig.hash.substring(0, 16) + '…' : 'VALIDE'}
                        </p>
                    </div>
                    <LocalQrSvg code={sig.code || ''} hash={sig.hash} />
                </div>
            ) : (
                <p className="text-gray-300 italic text-[8px] my-auto">{pendingLabel}</p>
            )}
            <p className="border-t border-black pt-0.5 font-medium">
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
                        background: white !important;
                        color: black !important;
                        font-family: 'Inter', Arial, sans-serif !important;
                    }
                    #bon-pasteur-official-sheet {
                        width: 100% !important;
                        padding: 0 !important;
                        display: block !important;
                    }
                }
            `}</style>

            <div className="w-full text-black font-sans text-[11px] leading-tight">
                {/* 1. EN-TÊTE INSTITUTIONNEL */}
                <div className="flex justify-between items-start border-b-2 border-black pb-2 mb-3">
                    <div className="flex items-center gap-3">
                        <img
                            src="/assets/images/logo.png"
                            alt="Logo Bon Pasteur ASBL"
                            className="w-16 h-16 object-contain"
                            onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
                        />
                        <div className="text-[9px] leading-tight">
                            <h1 className="font-bold text-[11px] uppercase">
                                Bon Pasteur A.S.B.L.
                            </h1>
                            <p>
                                N° 04, Avenue Bon Pasteur contre Sendwe, Quartier Kanina, Commune
                                Dilala,
                            </p>
                            <p>Ville de Kolwezi, Province du Lualaba/RDC</p>
                            <p>Référence : Concession Domaine Mariale</p>
                        </div>
                    </div>

                    <div className="text-right">
                        <h2 className="text-sm font-black uppercase tracking-wider">
                            {isService ? 'RÉQUISITION DE SERVICES' : "RÉQUISITION D'ACHAT"}
                        </h2>
                        {requisition.is_urgent && (
                            <span className="inline-block border-2 border-black font-black px-2 py-0.5 text-[9px] uppercase mt-0.5 bg-yellow-100">
                                ** URGENT **
                            </span>
                        )}
                        <p className="font-mono font-bold text-xs mt-0.5">
                            N° : {requisition.numero}
                        </p>
                    </div>
                </div>

                {/* 2. DEMANDEUR & PROJET */}
                <div className="grid grid-cols-2 border border-black text-[10px] mb-3">
                    <div className="p-1.5 border-r border-black space-y-0.5">
                        <p>
                            <strong>Demandé(e) par :</strong>{' '}
                            {requisition.projet ? requisition.projet.split('(')[0] : 'Agent'}
                        </p>
                        <p>
                            <strong>Projet :</strong> {requisition.projet}
                        </p>
                    </div>
                    <div className="p-1.5 space-y-0.5">
                        <p>
                            <strong>Date de la demande :</strong> {requisition.dateSoumission}
                        </p>
                        <p>
                            <strong>Caisse de décaissement :</strong> {requisition.caisse}
                        </p>
                    </div>
                </div>

                {/* 3. TABLEAU OFFICIEL — CONFORME AUX 2 PHOTOS (Achat + Service) */}
                <table className="w-full border-collapse border border-black text-[9px] mb-2.5">
                    <thead>
                        <tr className="bg-gray-100 text-center font-bold">
                            <th rowSpan={2} className="border border-black p-1 w-6">
                                N°
                            </th>
                            <th rowSpan={2} className="border border-black p-1 w-20">
                                Code d'activité
                            </th>
                            <th rowSpan={2} className="border border-black p-1 w-24">
                                Code d'allocation budgétaire
                            </th>
                            <th rowSpan={2} className="border border-black p-1">
                                {isService ? 'Nature de service' : 'Description'}
                            </th>
                            <th rowSpan={2} className="border border-black p-1 w-10">
                                {isService ? 'Durée' : 'Qté'}
                            </th>
                            <th rowSpan={2} className="border border-black p-1 w-12">
                                Unité
                            </th>
                            <th colSpan={2} className="border border-black p-0.5 text-center">
                                {isService ? 'Frais de Prestation unitaire' : 'PU'}
                            </th>
                            <th colSpan={2} className="border border-black p-0.5 text-center">
                                {isService ? 'Frais de Prestation totale' : 'PT'}
                            </th>
                            <th rowSpan={2} className="border border-black p-1 w-14">
                                OBS
                            </th>
                        </tr>
                        <tr className="bg-gray-100 text-center font-bold">
                            <th className="border border-black p-0.5 w-16">CDF</th>
                            <th className="border border-black p-0.5 w-16">USD</th>
                            <th className="border border-black p-0.5 w-16">CDF</th>
                            <th className="border border-black p-0.5 w-16">USD</th>
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
                                    <td className="border border-black p-1">{index + 1}</td>

                                    <td className="border border-black p-1 font-mono">
                                        {(art as any).codeActivite || ''}
                                    </td>

                                    <td className="border border-black p-1 font-mono font-bold text-center">
                                        {(art as any).codeAllocation || art.codeBudget || '—'}
                                    </td>

                                    <td className="border border-black p-1 text-left font-medium">
                                        {art.activite}
                                    </td>
                                    <td className="border border-black p-1 font-bold">
                                        {art.quantiteOuDuree}
                                    </td>
                                    <td className="border border-black p-1">{art.unite}</td>
                                    <td className="border border-black p-1 text-right font-mono">
                                        {puCDF > 0 ? puCDF.toLocaleString() : '—'}
                                    </td>
                                    <td className="border border-black p-1 text-right font-mono">
                                        {puUSD > 0 ? puUSD.toLocaleString() : '—'}
                                    </td>
                                    <td className="border border-black p-1 text-right font-mono font-bold">
                                        {montantCDF > 0 ? montantCDF.toLocaleString() : '—'}
                                    </td>
                                    <td className="border border-black p-1 text-right font-mono font-bold">
                                        {montantUSD > 0 ? montantUSD.toLocaleString() : '—'}
                                    </td>
                                    <td className="border border-black p-1 text-[8px] text-gray-500">
                                        {art.justificatifsCount > 0
                                            ? `${art.justificatifsCount} devis`
                                            : '—'}
                                    </td>
                                </tr>
                            );
                        })}
                        <tr className="font-bold bg-gray-50">
                            <td
                                colSpan={8}
                                className="border border-black p-1 text-right uppercase"
                            >
                                Total :
                            </td>
                            <td className="border border-black p-1 text-right font-mono text-[10px]">
                                {isCDF ? requisition.montantTotal.toLocaleString() : '—'}
                            </td>
                            <td className="border border-black p-1 text-right font-mono text-[10px]">
                                {isUSD ? requisition.montantTotal.toLocaleString() : '—'}
                            </td>
                            <td className="border border-black p-1"></td>
                        </tr>
                    </tbody>
                </table>

                {/* 4. MENTIONS EN TOUTES LETTRES */}
                <div className="space-y-1 text-[10px] mb-4">
                    <p>
                        <strong>Montant total en lettres :</strong>{' '}
                        <em>
                            {requisition.montantLettres || 'Selon conversion réglementaire'}
                        </em>
                    </p>
                    <p>
                        {isService ? (
                            <span>
                                <strong>Date de paiement :</strong>{' '}
                                {requisition.date_paiement || '......../......../202.....'}
                            </span>
                        ) : (
                            <span>
                                <strong>À livrer le :</strong>{' '}
                                {requisition.date_livraison || '......../......../202.....'}
                            </span>
                        )}
                    </p>
                </div>

                {/* 5. CASES DE SIGNATURES OFFICIELLES — LIBELLÉS DES 2 PHOTOS */}
                <div className="grid grid-cols-4 border border-black divide-x divide-black text-center text-[9px]">
                    <SignatureBox
                        label="Nom et signature du Manager projet"
                        sig={sigMP}
                        pendingLabel="En attente de signature"
                    />
                    <SignatureBox
                        label="Vérifié par (Nom et signature du Manager chargé de finance)"
                        sig={sigFinance}
                        pendingLabel="En attente de visa"
                    />
                    <SignatureBox
                        label={
                            isService
                                ? "Nom et signature du Manager d'Administration"
                                : 'Nom et signature du Responsable des achats'
                        }
                        sig={sigAdmin}
                        pendingLabel="En attente de visa"
                    />
                    <SignatureBox
                        label="Autorisée par (Nom et signature de la Directrice)"
                        sig={sigDirectrice}
                        pendingLabel="En attente d'approbation"
                    />
                </div>
            </div>
        </div>
    );
}