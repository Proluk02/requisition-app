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

interface SplitItem {
    id: string;
    code_allocation: string;
    libelle_allocation?: string | null;
    montant: number;
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
        reference_paiement?: string | null;
        mode_paiement?: string | null;
        date_decaissement?: string | null;
        signatures?: SignatureOffi[];
        articles: (RequisitionSuivi['articles'][number] & {
            splits?: SplitItem[];
        })[];
    };
}

export default function OfficialPrintSheet({ requisition }: Props) {
    const { auth } = usePage<PageProps>().props;

    const isService = requisition.nature === 'Service';
    const isCDF = requisition.devise === 'FC' || (requisition.devise as string) === 'CDF';
    const isUSD = requisition.devise === 'USD';
    const isEUR = requisition.devise === 'EUR';

    const isDecaissee = requisition.statusCode === 'decaisse';

    const nomDemandeur =
        requisition.demandeurNom ||
        requisition.initiateurNom ||
        requisition.user?.name ||
        auth?.user?.name ||
        '';

    const dateEcheance = isService
        ? (requisition.date_paiement || '......../......../202.....')
        : (requisition.date_livraison || '......../......../202.....');

    // Récupération fidèle des visas certifiés selon le nouvel ordre
    const sigMP = requisition.signatures?.find(
        (s) => s.role === 'project_manager' && s.action === 'approved'
    );
    const sigAdmin = requisition.signatures?.find(
        (s) => s.role === 'admin_manager' && s.action === 'approved'
    );
    const sigFinance = requisition.signatures?.find(
        (s) => s.role === 'finance' && s.action === 'approved'
    );
    const sigDirectrice = requisition.signatures?.find(
        (s) => s.role === 'director' && s.action === 'approved'
    );
    const sigCaissier = requisition.signatures?.find(
        (s) => s.role === 'cashier' && s.action === 'disbursed'
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
        <div className="w-full bg-white text-black font-sans text-xs leading-normal print-sheet relative">
            
            {/* SCEAU OFFICIEL PAID / DÉCAISSÉ (RECOMMANDATION 6) */}
            {isDecaissee && (
                <div className="absolute right-12 top-20 border-4 border-red-700 text-red-700 rounded-lg px-4 py-1.5 rotate-[-12deg] opacity-85 pointer-events-none select-none text-center shadow-sm">
                    <span className="text-xl font-black tracking-widest block uppercase">PAID / PAYÉ</span>
                    <span className="text-[9px] font-mono font-bold block">
                        Réf : {requisition.reference_paiement || 'BSC-VALIDÉ'}
                    </span>
                    <span className="text-[8px] block">
                        Guichet : {requisition.caisse}
                    </span>
                </div>
            )}

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

            {/* 2. DEMANDEUR, PROJET, DATES */}
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

            {/* 3. TABLEAU DES ARTICLES AVEC AFFICHAGE DES VENTILATIONS (SPLITTING) */}
            <div className="mb-4">
                <table className="w-full border-collapse border border-black text-[10px]">
                    <thead className="print:table-header-group">
                        <tr className="bg-gray-100 text-center font-bold">
                            <th rowSpan={2} className="border border-black p-1.5 w-8">N°</th>
                            <th rowSpan={2} className="border border-black p-1.5 w-24">Code d'activité</th>
                            <th rowSpan={2} className="border border-black p-1.5 min-w-[130px]">
                                Code d'allocation / Ventilation
                            </th>
                            <th rowSpan={2} className="border border-black p-1.5">
                                {isService ? 'Nature de service' : 'Description'}
                            </th>
                            <th rowSpan={2} className="border border-black p-1.5 w-12">
                                {isService ? 'Durée' : 'Qté'}
                            </th>
                            <th rowSpan={2} className="border border-black p-1.5 w-12">Unité</th>
                            <th colSpan={3} className="border border-black p-1 text-center">P.U ({requisition.devise})</th>
                            <th colSpan={3} className="border border-black p-1 text-center">P.T ({requisition.devise})</th>
                            <th rowSpan={2} className="border border-black p-1.5 w-16">OBS</th>
                        </tr>
                        <tr className="bg-gray-100 text-center font-bold">
                            <th className="border border-black p-1 w-14">EUR</th>
                            <th className="border border-black p-1 w-14">USD</th>
                            <th className="border border-black p-1 w-14">CDF</th>
                            <th className="border border-black p-1 w-16">EUR</th>
                            <th className="border border-black p-1 w-16">USD</th>
                            <th className="border border-black p-1 w-16">CDF</th>
                        </tr>
                    </thead>
                    <tbody>
                        {requisition.articles.map((art, index) => {
                            const montantEUR = isEUR ? art.total : 0;
                            const montantUSD = isUSD ? art.total : 0;
                            const montantCDF = isCDF ? art.total : 0;

                            const puEUR = isEUR ? art.prixUnitaire : 0;
                            const puUSD = isUSD ? art.prixUnitaire : 0;
                            const puCDF = isCDF ? art.prixUnitaire : 0;

                            const splits = (art as typeof art & { splits?: SplitItem[] }).splits;
                            const hasSplits = splits && splits.length > 0;

                            return (
                                <tr key={art.id} className="text-center print:break-inside-avoid">
                                    <td className="border border-black p-1.5 font-mono">{index + 1}</td>
                                    <td className="border border-black p-1.5 font-mono">
                                        {(art as any).codeActivite || '—'}
                                    </td>
                                    
                                    {/* COLONNE IMPUTATION : AFFICHAGE DU CODE UNIQUE OU DES SPLITS MULTIPLES */}
                                    <td className="border border-black p-1.5 text-left font-mono">
                                        {hasSplits ? (
                                            <div className="space-y-0.5">
                                                <span className="text-[8px] uppercase font-bold text-gray-500 block border-b border-gray-300 pb-0.5">
                                                    Ventilé ({splits!.length}) :
                                                </span>
                                                {splits!.map((sp) => (
                                                    <div key={sp.id} className="flex justify-between items-center text-[9px]">
                                                        <strong className="text-[#04326D]">{sp.code_allocation}</strong>
                                                        <span className="text-gray-700 font-bold ml-1">
                                                            {sp.montant.toLocaleString('fr-FR')} {requisition.devise}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <strong className="font-bold text-[#04326D]">
                                                {(art as any).codeAllocation || art.codeBudget || '—'}
                                            </strong>
                                        )}
                                    </td>

                                    <td className="border border-black p-1.5 text-left font-medium">
                                        {art.activite}
                                    </td>
                                    <td className="border border-black p-1.5 font-bold font-mono">
                                        {art.quantiteOuDuree}
                                    </td>
                                    <td className="border border-black p-1.5">{art.unite || '—'}</td>
                                    
                                    {/* P.U */}
                                    <td className="border border-black p-1.5 text-right font-mono">
                                        {puEUR > 0 ? puEUR.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) : '—'}
                                    </td>
                                    <td className="border border-black p-1.5 text-right font-mono">
                                        {puUSD > 0 ? puUSD.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) : '—'}
                                    </td>
                                    <td className="border border-black p-1.5 text-right font-mono">
                                        {puCDF > 0 ? puCDF.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) : '—'}
                                    </td>

                                    {/* P.T */}
                                    <td className="border border-black p-1.5 text-right font-mono font-bold">
                                        {montantEUR > 0 ? montantEUR.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) : '—'}
                                    </td>
                                    <td className="border border-black p-1.5 text-right font-mono font-bold">
                                        {montantUSD > 0 ? montantUSD.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) : '—'}
                                    </td>
                                    <td className="border border-black p-1.5 text-right font-mono font-bold">
                                        {montantCDF > 0 ? montantCDF.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) : '—'}
                                    </td>

                                    <td className="border border-black p-1.5 text-[8px] text-gray-500">
                                        {art.justificatifsCount > 0 ? `${art.justificatifsCount} devis` : '—'}
                                    </td>
                                </tr>
                            );
                        })}
                        <tr className="font-bold bg-gray-100 print:break-inside-avoid">
                            <td colSpan={9} className="border border-black p-1.5 text-right uppercase tracking-wider">
                                Total Général :
                            </td>
                            <td className="border border-black p-1.5 text-right font-mono text-xs">
                                {isEUR ? requisition.montantTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) : '—'}
                            </td>
                            <td className="border border-black p-1.5 text-right font-mono text-xs">
                                {isUSD ? requisition.montantTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) : '—'}
                            </td>
                            <td className="border border-black p-1.5 text-right font-mono text-xs">
                                {isCDF ? requisition.montantTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) : '—'}
                            </td>
                            <td className="border border-black p-1.5" />
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* 4. MONTANT TOTAL EN TOUTES LETTRES */}
            <div className="text-[11px] mb-6 p-2.5 border border-black bg-gray-50/50 print:break-inside-avoid flex justify-between items-center">
                <p>
                    <strong>Montant total en lettres :</strong>{' '}
                    <em className="font-serif ml-1 text-[12px] font-bold">
                        {requisition.montantLettres || 'Selon arrêté réglementaire'}
                    </em>
                </p>
                {isDecaissee && requisition.date_decaissement && (
                    <span className="font-mono text-[10px] font-bold text-gray-600">
                        Payé le : {requisition.date_decaissement} ({requisition.mode_paiement || 'Espèces'})
                    </span>
                )}
            </div>

            {/* 5. CASES DE SIGNATURES OFFICIELLES RÉALIGNÉES : PM -> PAM -> FINANCE -> DIRECTION */}
            <div className="print:break-inside-avoid">
                <div className="grid grid-cols-4 border border-black bg-white">
                    <SignatureBox
                        label="1. Manager Projet"
                        roleTitle="Manager de Projet"
                        sig={sigMP}
                        pendingLabel="En attente visa MP"
                    />
                    <SignatureBox
                        label="2. Administration (PAM)"
                        roleTitle="Manager d'Admin. (PAM)"
                        sig={sigAdmin}
                        pendingLabel="En attente visa PAM"
                    />
                    <SignatureBox
                        label="3. Manager Finances"
                        roleTitle="Manager des Finances"
                        sig={sigFinance}
                        pendingLabel="En attente visa Finances"
                    />
                    <SignatureBox
                        label="4. Direction Générale"
                        roleTitle="Directrice Générale"
                        sig={sigDirectrice}
                        pendingLabel="En attente Bon à Payer"
                    />
                </div>
            </div>

        </div>
    );
}