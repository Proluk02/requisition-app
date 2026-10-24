import { useState, useMemo } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { PageProps } from '@/types';
import {
    ClipboardList,
    CheckCircle2,
    Wallet,
    AlertTriangle,
    Plus,
    Truck,
    ChevronRight,
    Filter,
    AlertCircle,
    Eye,
    LayoutTemplate,
    X
} from 'lucide-react';

interface EtapeWorkflow {
    nom: string;
    statut: string;
    validateurActuel: string;
}

interface Signature {
    role: string;
    nom: string;
    action: string;
    commentaire?: string | null;
    date: string;
    hash: string;
    code: string;
}

interface RequisitionItem {
    id: string;
    code: string;
    motif: string;
    projet: string;
    is_urgent?: boolean;
    dateSoumission: string;
    montant: string;
    devise: string;
    articlesCount: number;
    etapeWorkflow: EtapeWorkflow;
    statusCode: string;
    statusLabel?: string;
    motifRejet?: string | null;
    signatures: Signature[];
}

interface StaffStats {
    enCoursCount: number;
    valideesPretesCount: number;
    valideesPretesMontantUSD: number;
    valideesPretesMontantFC: number;
    vouchersMoisCount: number;
    vouchersMoisTotalUSD: number;
    justificatifsADeposerCount: number;
    activiteEnSouffrance: string;
    dechargeRef: string;
}

interface StaffDashboardProps extends PageProps {
    stats?: StaffStats;
    requisitions?: RequisitionItem[];
}

export default function StaffDashboard({
    stats: initialStats,
    requisitions: initialReqs,
}: StaffDashboardProps) {
    const { auth } = usePage<PageProps>().props;
    const user = auth.user;

    const [filtreEtat, setFiltreEtat] = useState<string>('all');
    const [requisitions] = useState<RequisitionItem[]>(initialReqs ?? []);
    
    const [directorPreviewReq, setDirectorPreviewReq] = useState<RequisitionItem | null>(null);

    const stats: StaffStats = initialStats ?? {
        enCoursCount: 0,
        valideesPretesCount: 0,
        valideesPretesMontantUSD: 0,
        valideesPretesMontantFC: 0,
        vouchersMoisCount: 0,
        vouchersMoisTotalUSD: 0,
        justificatifsADeposerCount: 0,
        activiteEnSouffrance: 'Aucune',
        dechargeRef: '#DCH-000',
    };

    const filteredReqs = useMemo(() => {
        if (filtreEtat === 'all') return requisitions;
        return requisitions.filter((r) => r.etapeWorkflow.statut === filtreEtat);
    }, [requisitions, filtreEtat]);

    return (
        <AppLayout>
            <Head title="Espace Collaborateur — Mes Demandes & Activités" />

            {/* En-tête */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-[#E2E8F0] pb-5">
                <div>
                    <nav className="text-[11px] text-gray-500 font-medium mb-1 flex items-center gap-1">
                        <span>Espace Opérationnel</span>
                        <ChevronRight className="w-3 h-3" />
                        <span className="text-[#0B192C] font-semibold">
                            {user.project?.name || 'Projets Généraux'}
                        </span>
                    </nav>
                    <h1 className="text-xl font-bold text-[#0B192C] tracking-tight">
                        Espace Collaborateur — Mes Demandes & Activités
                    </h1>
                    <p className="text-xs text-gray-600 mt-1">
                        Suivi rigoureux des décaissements, engagements d'activités et apurements de fonds sur site.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                    <Link
                        href={route('requisitions.create')}
                        className="inline-flex items-center justify-center gap-2 bg-[#04326D] hover:bg-[#06428f] text-white px-3.5 py-2 rounded-md text-xs font-semibold shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
                    >
                        <Plus className="w-4 h-4 text-emerald-400" strokeWidth={2.5} />
                        <span>Nouvelle Réquisition</span>
                    </Link>
                    <Link
                        href={route('transport.index')}
                        className="inline-flex items-center justify-center gap-2 bg-white border border-[#B2BED6] text-[#0B192C] hover:bg-gray-50 px-3.5 py-2 rounded-md text-xs font-semibold shadow-sm transition"
                    >
                        <Truck className="w-4 h-4 text-[#04326D]" />
                        <span>Transport & Petits Cash</span>
                    </Link>
                </div>
            </div>

            {/* KPI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                <div className="bg-white border border-[#B2BED6] rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                            Demandes en cours
                        </span>
                        <div className="w-8 h-8 rounded-md bg-blue-50 flex items-center justify-center">
                            <ClipboardList className="w-4 h-4 text-[#04326D]" />
                        </div>
                    </div>
                    <p className="text-2xl font-black text-[#0B192C]">
                        {stats.enCoursCount}{' '}
                        <span className="text-base font-bold text-gray-500">dossier(s)</span>
                    </p>
                    <p className="text-[11px] text-gray-500 mt-1">En circuit d'approbation</p>
                </div>

                <div className="bg-white border border-[#B2BED6] rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                            Validées & Prêtes
                        </span>
                        <div className="w-8 h-8 rounded-md bg-emerald-50 flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        </div>
                    </div>
                    <p className="text-2xl font-black text-[#0B192C] mb-1">
                        {stats.valideesPretesCount}{' '}
                        <span className="text-base font-bold text-gray-500">prête(s)</span>
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px] font-mono">
                            ${stats.valideesPretesMontantUSD.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-emerald-800 font-bold text-[10px] font-mono">
                            {stats.valideesPretesMontantFC.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} FC
                        </span>
                    </div>
                </div>

                <div className="bg-white border border-[#B2BED6] rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                            Vouchers Petite Caisse
                        </span>
                        <div className="w-8 h-8 rounded-md bg-blue-50 flex items-center justify-center">
                            <Wallet className="w-4 h-4 text-[#04326D]" />
                        </div>
                    </div>
                    <p className="text-2xl font-black text-[#0B192C]">
                        {stats.vouchersMoisCount}{' '}
                        <span className="text-base font-bold text-gray-500">ce mois</span>
                    </p>
                    <p className="text-[11px] text-gray-500 mt-1">
                        Plafond : <strong className="text-gray-700">≤ 20$ ou 30 000 FC</strong>
                    </p>
                </div>

                <div className="bg-white border-2 border-[#F58F20]/40 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold text-[#0B192C] uppercase tracking-widest">
                            Justificatifs à déposer
                        </span>
                        <div className="w-8 h-8 rounded-md bg-amber-50 flex items-center justify-center">
                            <AlertTriangle className="w-4 h-4 text-[#F58F20]" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-black text-[#0B192C]">
                            {stats.justificatifsADeposerCount}{' '}
                            <span className="text-base font-bold text-gray-500">retour(s)</span>
                        </p>
                        <span className="bg-red-50 text-red-800 font-bold text-[10px] px-1.5 py-0.5 rounded">
                            délai 48h
                        </span>
                    </div>
                    <p className="text-[11px] text-gray-600 truncate mt-1">
                        Décharge : {stats.dechargeRef}
                    </p>
                </div>
            </div>

            {/* Tableau */}
            <div className="bg-white border border-[#B2BED6] rounded-lg shadow-sm overflow-hidden mt-6">
                <div className="p-4 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50">
                    <div>
                        <h2 className="text-sm font-bold text-[#0B192C]">
                            Aperçu de mes réquisitions récentes
                        </h2>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                            Tracez chaque signature hiérarchique avant le déblocage des fonds.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Filter className="w-3.5 h-3.5 text-gray-400" />
                        <select
                            value={filtreEtat}
                            onChange={(e) => setFiltreEtat(e.target.value)}
                            className="text-xs border border-[#B2BED6] rounded-md px-2.5 py-1.5 bg-white text-gray-700 font-semibold focus:outline-none focus:border-[#04326D] focus:ring-1 focus:ring-[#04326D]/20 transition"
                        >
                            <option value="all">Toutes les étapes</option>
                            <option value="brouillon">Brouillon / À corriger</option>
                            <option value="visa_mp">Visa Manager Projet</option>
                            <option value="visa_pam">Examen PAM</option>
                            <option value="controle_finance">Contrôle Finances</option>
                            <option value="approbation_direction">Direction Générale</option>
                            <option value="caisse_pret">Caisse (Prêt)</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="bg-[#0B192C] text-white uppercase text-[10px] font-bold tracking-wider">
                                <th className="py-3 px-4">Code Réquisition</th>
                                <th className="py-3 px-4">Motif / Contexte</th>
                                <th className="py-3 px-4">Date Soumission</th>
                                <th className="py-3 px-4 text-right">Montant</th>
                                <th className="py-3 px-4">Étape Actuelle (Workflow)</th>
                                <th className="py-3 px-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2E8F0] text-gray-700">
                            {filteredReqs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center">
                                        <ClipboardList
                                            className="w-10 h-10 mx-auto text-gray-300 mb-2"
                                            strokeWidth={1.5}
                                        />
                                        <p className="text-gray-500 font-medium text-sm">
                                            Aucune réquisition trouvée pour ce filtre.
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                filteredReqs.map((req) => {
                                    const isRejected = req.statusCode === 'returned_to_beneficiary' || req.statusCode === 'returned_to_urgent_initiator';
                                    const isInternalRevision = req.statusCode === 'returned_to_project_manager' || req.statusCode === 'returned_to_finance';
                                    
                                    return (
                                        <tr key={req.id} className="hover:bg-blue-50/40 transition-colors">
                                            <td className="py-4 px-4 font-mono font-bold text-[#04326D] whitespace-nowrap">
                                                {req.code}
                                                {req.is_urgent && (
                                                    <span className="ml-2 bg-red-100 text-red-800 text-[9px] px-1.5 py-0.5 rounded font-black uppercase">
                                                        URGENT
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-4 px-4 max-w-xs">
                                                <p className="font-semibold text-[#0B192C] leading-snug">
                                                    {req.motif}
                                                </p>
                                                <p className="text-[10px] text-gray-500 mt-0.5 font-bold">
                                                    {req.projet} • {req.articlesCount} ligne(s)
                                                </p>
                                            </td>
                                            <td className="py-4 px-4 whitespace-nowrap text-gray-600">
                                                {req.dateSoumission}
                                            </td>
                                            <td className="py-4 px-4 font-bold text-[#0B192C] whitespace-nowrap font-mono text-right">
                                                {req.montant}
                                            </td>
                                            <td className="py-4 px-4">
                                                {isRejected ? (
                                                    <div className="bg-red-50 border border-red-200 text-red-800 p-2 rounded max-w-xs shadow-sm">
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-red-700 mb-0.5">
                                                            <AlertCircle className="w-3 h-3" />
                                                            À CORRIGER PAR VOUS
                                                        </span>
                                                        <p className="text-[10px] font-medium leading-tight">
                                                            {req.motifRejet || 'Veuillez corriger votre demande et la resoumettre.'}
                                                        </p>
                                                    </div>
                                                ) : isInternalRevision ? (
                                                    <div className="bg-amber-50 border border-amber-200 text-amber-800 p-2 rounded max-w-xs shadow-sm">
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 mb-0.5">
                                                            <AlertCircle className="w-3 h-3" />
                                                            EN ARBITRAGE HIÉRARCHIQUE
                                                        </span>
                                                        <p className="text-[10px] font-medium leading-tight">
                                                            Le dossier est en révision auprès du Chef de Projet.
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#04326D] bg-blue-50 px-2 py-0.5 rounded">
                                                            {req.etapeWorkflow.nom}
                                                        </span>
                                                        <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wide font-semibold">
                                                            En attente : {req.etapeWorkflow.validateurActuel}
                                                        </p>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-4 px-4 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => setDirectorPreviewReq(req)}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-semibold transition"
                                                        title="Aperçu des signatures"
                                                    >
                                                        <LayoutTemplate className="w-3.5 h-3.5 text-[#04326D]" />
                                                        <span className="hidden xl:inline">Détails</span>
                                                    </button>

                                                    <Link 
                                                        href={route('requisitions.index')}
                                                        className="inline-flex items-center gap-1 bg-white border border-[#04326D] text-[#04326D] hover:bg-blue-50 px-3 py-1.5 rounded font-bold text-xs shadow-sm transition"
                                                        title="Ouvrir dans Mes Réquisitions pour corriger ou suivre"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                        <span>Gérer</span>
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* APERÇU CONSOLIDÉ */}
            {directorPreviewReq && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
                    <div className="bg-white rounded border border-[#B2BED6] shadow-2xl max-w-4xl w-full p-6 space-y-4 max-h-[95vh] overflow-y-auto">
                        <header className="flex items-start justify-between border-b pb-3">
                            <div>
                                <span className="text-[10px] bg-blue-100 text-[#04326D] font-bold uppercase px-2 py-0.5 rounded">
                                    Aperçu & Historique des Visas
                                </span>
                                <h2 className="text-base font-bold text-[#0B192C] mt-1 flex items-center gap-2">
                                    Réquisition {directorPreviewReq.code}
                                    {directorPreviewReq.is_urgent && (
                                        <span className="bg-red-100 text-red-800 text-[9px] px-1.5 py-0.5 rounded font-black uppercase">
                                            URGENT
                                        </span>
                                    )}
                                </h2>
                                <p className="text-xs text-gray-500">
                                    Projet : <strong>{directorPreviewReq.projet}</strong>
                                </p>
                            </div>
                            <button onClick={() => setDirectorPreviewReq(null)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </header>

                        <div className="space-y-2">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                Chaîne des Visas & Signatures Numériques
                            </h3>
                            {directorPreviewReq.signatures.length === 0 ? (
                                <p className="text-xs text-gray-400 italic">Aucune signature enregistrée pour le moment.</p>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                    {directorPreviewReq.signatures.map((sig, idx) => (
                                        <div key={idx} className="p-2.5 rounded border border-gray-200 bg-gray-50 text-[11px] space-y-1">
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold uppercase text-[#04326D]">{sig.role}</span>
                                                <span className="text-[9px] text-gray-400 font-mono">{sig.date}</span>
                                            </div>
                                            <p className="font-semibold text-gray-800">{sig.nom}</p>
                                            <p className="text-[10px] text-gray-500 font-mono truncate" title={sig.hash}>
                                                {sig.code}
                                            </p>
                                            {sig.commentaire && (
                                                <p className="text-[10px] italic text-gray-600 bg-white p-1 rounded border mt-1">
                                                    « {sig.commentaire} »
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end pt-3 border-t">
                            <button
                                type="button"
                                onClick={() => setDirectorPreviewReq(null)}
                                className="px-4 py-2 bg-gray-800 text-white rounded text-xs font-semibold hover:bg-black transition"
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}