import { usePage } from '@inertiajs/react';
import { QRCodeSVG } from 'qrcode.react';
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
        date_paiement?: string | null;
        date_livraison?: string | null;
        signatures?: SignatureOffi[];
    };
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
        <div className="flex flex-col border-r border-black last:border-r-0 min-h-[90px] h-[105px]">
            <div className="text-center font-bold text-[9px] uppercase border-b border-black py-1">
                {label}
            </div>
            <div className="p-1.5 flex-1">
                {sig ? (
                    <div className="border border-emerald-500 bg-emerald-50 p-1 flex justify-between items-start h-full gap-1">
                        <div className="leading-tight overflow-hidden text-left flex-1 min-w-0">
                            <p className="font-bold text-emerald-900 text-[10px] truncate">{sig.nom}</p>
                            <p className="font-serif italic font-bold text-blue-900 text-[9px] my-0.5 truncate">
                                ~ {sig.nom} ~
                            </p>
                            <p className="text-[6.5px] text-gray-700 font-bold uppercase truncate">{roleTitle}</p>
                            <p className="font-mono text-[7px] text-gray-900 font-bold mt-1 truncate">
                                {sig.code || 'BP-SIG'}
                            </p>
                            <p className="text-[7px] text-gray-600 mt-0.5 truncate">{sig.date}</p>
                            <p className="font-mono text-[5.5px] text-gray-500 mt-0.5 break-all leading-tight line-clamp-2" title={sig.hash}>
                                SHA: {sig.hash ? sig.hash.substring(0, 16) + '…' : 'VALIDE'}
                            </p>
                        </div>

                        <div className="flex flex-col items-center justify-center p-0.5 border border-black bg-white shrink-0">
                            <QRCodeSVG
                                value={`${window.location.origin}/verify/signature/${sig.hash}`}
                                size={28}
                                level="M"
                                bgColor="#ffffff"
                                fgColor="#000000"
                            />
                            <span className="text-[4.5px] font-mono tracking-tighter text-gray-800 font-bold leading-none mt-0.5">
                                CERTIFIÉ
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-gray-400 italic text-[10px] text-center">
                            {pendingLabel}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        // Le flux de bloc standard est utilisé pour l'impression
        <div className="w-full bg-white text-black font-sans text-xs leading-normal print-sheet">
            
            {/* 1. EN-TÊTE INSTITUTIONNEL */}
            <div className="flex justify-between items-start border-b-2 border-black pb-3 mb-4 print:break-inside-avoid">
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
                        <h1 className="font-bold text-[14px] uppercase tracking-wide">
                            Bon Pasteur A.S.B.L.
                        </h1>
                        <p className="mt-1 text-gray-800">
                            N° 04, Avenue Bon Pasteur contre Sendwe, Quartier Kanina, Commune Dilala,
                        </p>
                        <p className="text-gray-800">Ville de Kolwezi, Province du Lualaba/RDC</p>
                        <p className="italic font-bold mt-0.5 text-black">Référence : Concession Domaine Mariale</p>
                    </div>
                </div>

                <div className="text-right leading-tight">
                    <h2 className="text-[15px] font-black uppercase tracking-wider underline">
                        {isService ? 'RÉQUISITION DE SERVICES' : "RÉQUISITION D'ACHAT"}
                    </h2>
                    {requisition.is_urgent && (
                        <div className="inline-block border-2 border-red-700 text-red-800 font-black px-2 py-0.5 text-[10px] uppercase mt-2 bg-red-50">
                            ** CIRCUIT URGENT **
                        </div>
                    )}
                    <p className="font-bold text-[13px] mt-2">
                        N° : {requisition.numero}
                    </p>
                </div>
            </div>

            {/* 2. DEMANDEUR, PROJET, DATE DE DEMANDE ET DATE DE LIVRAISON */}
            <div className="border border-black text-[10px] mb-4 bg-gray-50/50 divide-y divide-black print:break-inside-avoid">
                <div className="grid grid-cols-2 divide-x divide-black p-2">
                    <p>
                        <span className="uppercase text-gray-600 font-bold">Demandé(e) par :</span>{' '}
                        <span className="font-bold text-black uppercase underline ml-1">
                            {nomDemandeur}
                        </span>
                    </p>
                    <div className="pl-2 flex items-center justify-between">
                        <p>
                            <span className="uppercase text-gray-600 font-bold">Date :</span>{' '}
                            <span className="font-bold ml-1">{requisition.dateSoumission}</span>
                        </p>
                        <p className="border-l border-black pl-2">
                            <span className="uppercase text-gray-600 font-bold">
                                {isService ? 'Date de paiement :' : 'À livrer le :'}
                            </span>{' '}
                            <span className="font-bold ml-1">{dateEcheance}</span>
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 divide-x divide-black p-2">
                    <p>
                        <span className="uppercase text-gray-600 font-bold">Projet :</span>{' '}
                        <span className="font-bold ml-1">{requisition.projet}</span>
                    </p>
                    <p className="pl-2">
                        <span className="uppercase text-gray-600 font-bold">Caisse de décaissement :</span>{' '}
                        <span className="font-bold ml-1">{requisition.caisse}</span>
                    </p>
                </div>
            </div>

            {/* 3. TABLEAU DES ARTICLES */}
            <div className="mb-4">
                <table className="w-full border-collapse border border-black text-[10px]">
                    <thead className="print:table-header-group">
                        <tr className="bg-gray-100 text-center font-bold">
                            <th rowSpan={2} className="border border-black p-1.5 w-8">N°</th>
                            <th rowSpan={2} className="border border-black p-1.5 w-24">Code d'activité</th>
                            <th rowSpan={2} className="border border-black p-1.5 w-28">Code d'allocation</th>
                            <th rowSpan={2} className="border border-black p-1.5">
                                {isService ? 'Nature de service' : 'Description'}
                            </th>
                            <th rowSpan={2} className="border border-black p-1.5 w-12">
                                {isService ? 'Durée' : 'Qté'}
                            </th>
                            <th rowSpan={2} className="border border-black p-1.5 w-12">Unité</th>
                            <th colSpan={2} className="border border-black p-1 text-center">PU</th>
                            <th colSpan={2} className="border border-black p-1 text-center">PT</th>
                            <th rowSpan={2} className="border border-black p-1.5 w-16">OBS</th>
                        </tr>
                        <tr className="bg-gray-100 text-center font-bold">
                            <th className="border border-black p-1 w-14">CDF</th>
                            <th className="border border-black p-1 w-14">USD</th>
                            <th className="border border-black p-1 w-16">CDF</th>
                            <th className="border border-black p-1 w-16">USD</th>
                        </tr>
                    </thead>
                    <tbody>
                        {requisition.articles.map((art, index) => {
                            const montantCDF = isCDF ? art.total : 0;
                            const montantUSD = isUSD ? art.total : 0;
                            const puCDF = isCDF ? art.prixUnitaire : 0;
                            const puUSD = isUSD ? art.prixUnitaire : 0;

                            return (
                                <tr key={art.id} className="text-center print:break-inside-avoid">
                                    <td className="border border-black p-1.5 font-mono">{index + 1}</td>
                                    <td className="border border-black p-1.5 font-mono">
                                        {(art as any).codeActivite || '—'}
                                    </td>
                                    <td className="border border-black p-1.5 font-mono font-bold">
                                        {(art as any).codeAllocation || art.codeBudget || '—'}
                                    </td>
                                    <td className="border border-black p-1.5 text-left font-medium">
                                        {art.activite}
                                    </td>
                                    <td className="border border-black p-1.5 font-bold font-mono">
                                        {art.quantiteOuDuree}
                                    </td>
                                    <td className="border border-black p-1.5">{art.unite || '—'}</td>
                                    <td className="border border-black p-1.5 text-right font-mono">
                                        {puCDF > 0 ? puCDF.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) : '—'}
                                    </td>
                                    <td className="border border-black p-1.5 text-right font-mono">
                                        {puUSD > 0 ? puUSD.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) : '—'}
                                    </td>
                                    <td className="border border-black p-1.5 text-right font-mono font-bold">
                                        {montantCDF > 0 ? montantCDF.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) : '—'}
                                    </td>
                                    <td className="border border-black p-1.5 text-right font-mono font-bold">
                                        {montantUSD > 0 ? montantUSD.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) : '—'}
                                    </td>
                                    <td className="border border-black p-1.5 text-[8px] text-gray-500">
                                        {art.justificatifsCount > 0 ? `${art.justificatifsCount} devis` : '—'}
                                    </td>
                                </tr>
                            );
                        })}
                        <tr className="font-bold bg-gray-100 print:break-inside-avoid">
                            <td colSpan={8} className="border border-black p-1.5 text-right uppercase tracking-wider">
                                Total :
                            </td>
                            <td className="border border-black p-1.5 text-right font-mono text-xs">
                                {isCDF ? requisition.montantTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) : '—'}
                            </td>
                            <td className="border border-black p-1.5 text-right font-mono text-xs">
                                {isUSD ? requisition.montantTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) : '—'}
                            </td>
                            <td className="border border-black p-1.5" />
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* 4. MONTANT TOTAL EN TOUTES LETTRES */}
            <div className="text-[11px] mb-8 p-2.5 border border-black bg-gray-50/50 print:break-inside-avoid">
                <p>
                    <strong>Montant total en lettres :</strong>{' '}
                    <em className="font-serif ml-1 text-[12px] font-bold">
                        {requisition.montantLettres || 'Selon arrêté réglementaire'}
                    </em>
                </p>
            </div>

            {/* 5. CASES DE SIGNATURES OFFICIELLES */}
            <div className="print:break-inside-avoid">
                <div className="grid grid-cols-4 border border-black bg-white">
                    <SignatureBox
                        label="Manager Projet"
                        roleTitle="Manager de Projet"
                        sig={sigMP}
                        pendingLabel="En attente de visa MP"
                    />
                    <SignatureBox
                        label="Manager Finances"
                        roleTitle="Manager des Finances"
                        sig={sigFinance}
                        pendingLabel="En attente de visa financier"
                    />
                    <SignatureBox
                        label="Manager Administration"
                        roleTitle="Manager d'Admin. (PAM)"
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