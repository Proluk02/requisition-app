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
    Eye
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
    statusLabel: string;
    motifRejet?: string | null;
    signatures: Signature[];
}

interface StaffStats {
    enCoursCount: number;
    valideesPretesCount: number;
    valideesPretesMontantUSD: number;
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

    const stats: StaffStats = initialStats ?? {
        enCoursCount: 0,
        valideesPretesCount: 0,
        valideesPretesMontantUSD: 0,
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
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-outline-soft pb-5">
                <div>
                    <nav className="text-[11px] text-gray-500 font-medium mb-1 flex items-center gap-1">
                        <span>Espace Opérationnel</span>
                        <ChevronRight className="w-3 h-3" />
                        <span className="text-on-surface font-semibold">
                            {user.project?.name || 'Projets Généraux'}
                        </span>
                    </nav>
                    <h1 className="text-xl font-bold text-on-surface tracking-tight">
                        Espace Collaborateur — Mes Demandes & Activités
                    </h1>
                    <p className="text-xs text-gray-600 mt-1">
                        Suivi rigoureux des décaissements, engagements d'activités et apurements de fonds sur site.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                    <Link
                        href={route('requisitions.create')}
                        className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-light text-white px-3.5 py-2 rounded-md text-xs font-semibold shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
                    >
                        <Plus className="w-4 h-4 text-tertiary" strokeWidth={2.5} />
                        <span>Nouvelle Réquisition</span>
                    </Link>
                    <Link
                        href={route('transport.index')}
                        className="inline-flex items-center justify-center gap-2 bg-white border border-outline-variant text-on-surface hover:bg-surface-muted px-3.5 py-2 rounded-md text-xs font-semibold shadow-sm transition"
                    >
                        <Truck className="w-4 h-4 text-primary" />
                        <span>Transport & Petits Cash</span>
                    </Link>
                </div>
            </div>

            {/* KPI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                <div className="bg-white border border-outline-soft rounded-lg p-5 shadow-card hover:shadow-md transition-shadow flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                            Demandes en cours
                        </span>
                        <div className="w-8 h-8 rounded-md bg-primary-soft flex items-center justify-center">
                            <ClipboardList className="w-4 h-4 text-primary" />
                        </div>
                    </div>
                    <p className="text-2xl font-black text-on-surface">
                        {stats.enCoursCount}{' '}
                        <span className="text-base font-bold text-gray-500">réquisition(s)</span>
                    </p>
                    <p className="text-[11px] text-gray-500 mt-1">En circuit d'approbation</p>
                </div>

                <div className="bg-white border border-outline-soft rounded-lg p-5 shadow-card hover:shadow-md transition-shadow flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                            Validées & Prêtes
                        </span>
                        <div className="w-8 h-8 rounded-md bg-success-soft flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4 text-success" />
                        </div>
                    </div>
                    <p className="text-2xl font-black text-on-surface">
                        {stats.valideesPretesCount}{' '}
                        <span className="text-base font-bold text-gray-500">prête(s)</span>
                    </p>
                    <div className="flex items-center justify-between mt-1">
                        <span className="bg-success-soft text-success-dark font-bold px-2 py-0.5 rounded text-[10px]">
                            ${stats.valideesPretesMontantUSD.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} USD
                        </span>
                        <span className="text-[10px] text-gray-400">Guichet Caisse</span>
                    </div>
                </div>

                <div className="bg-white border border-outline-soft rounded-lg p-5 shadow-card hover:shadow-md transition-shadow flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                            Vouchers Petite Caisse
                        </span>
                        <div className="w-8 h-8 rounded-md bg-primary-soft flex items-center justify-center">
                            <Wallet className="w-4 h-4 text-primary" />
                        </div>
                    </div>
                    <p className="text-2xl font-black text-on-surface">
                        {stats.vouchersMoisCount}{' '}
                        <span className="text-base font-bold text-gray-500">ce mois</span>
                    </p>
                    <p className="text-[11px] text-gray-500 mt-1">
                        Plafond : <strong className="text-gray-700">≤ 20$ ou 30 000 FC</strong>
                    </p>
                </div>

                <div className="bg-white border-2 border-tertiary/40 rounded-lg p-5 shadow-card hover:shadow-md transition-shadow flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold text-on-surface uppercase tracking-widest">
                            Justificatifs à déposer
                        </span>
                        <div className="w-8 h-8 rounded-md bg-tertiary-soft flex items-center justify-center">
                            <AlertTriangle className="w-4 h-4 text-tertiary" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-black text-on-surface">
                            {stats.justificatifsADeposerCount}{' '}
                            <span className="text-base font-bold text-gray-500">retour(s)</span>
                        </p>
                        <span className="bg-error-soft text-error-dark font-bold text-[10px] px-1.5 py-0.5 rounded">
                            délai 48h
                        </span>
                    </div>
                    <p className="text-[11px] text-gray-600 truncate mt-1">
                        Décharge : {stats.dechargeRef}
                    </p>
                </div>
            </div>

            {/* Tableau */}
            <div className="bg-white border border-outline-soft rounded-lg shadow-card overflow-hidden mt-6">
                <div className="p-4 border-b border-outline-soft flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
                    <div>
                        <h2 className="text-sm font-bold text-on-surface">
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
                            className="text-xs border border-outline-variant rounded-md px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                        >
                            <option value="all">Toutes les étapes</option>
                            <option value="brouillon">Brouillon / À corriger</option>
                            <option value="visa_mp">Visa Manager Projet</option>
                            <option value="controle_finance">Contrôle Finances</option>
                            <option value="visa_admin">Contrôle Administratif</option>
                            <option value="caisse_pret">Caisse (Prêt)</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="bg-sidebar text-white uppercase text-[10px] font-bold tracking-wider">
                                <th className="py-3 px-4">Code Réquisition</th>
                                <th className="py-3 px-4">Motif / Contexte</th>
                                <th className="py-3 px-4">Date Soumission</th>
                                <th className="py-3 px-4 text-right">Montant</th>
                                <th className="py-3 px-4">Étape Actuelle (Workflow)</th>
                                <th className="py-3 px-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-soft text-gray-700">
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
                                    const isRejected = req.statusCode?.startsWith('returned_');
                                    
                                    return (
                                        <tr key={req.id} className="hover:bg-primary-soft/40 transition-colors">
                                            <td className="py-4 px-4 font-mono font-bold text-primary whitespace-nowrap">
                                                {req.code}
                                                {req.is_urgent && (
                                                    <span className="ml-2 bg-error-soft text-error-dark text-[9px] px-1.5 py-0.5 rounded font-black uppercase">
                                                        URGENT
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-4 px-4 max-w-xs">
                                                <p className="font-semibold text-on-surface leading-snug">
                                                    {req.motif}
                                                </p>
                                                <p className="text-[10px] text-gray-500 mt-0.5">
                                                    {req.projet} • {req.articlesCount} ligne(s)
                                                </p>
                                            </td>
                                            <td className="py-4 px-4 whitespace-nowrap text-gray-600">
                                                {req.dateSoumission}
                                            </td>
                                            <td className="py-4 px-4 font-bold text-on-surface whitespace-nowrap font-mono text-right">
                                                {req.montant}
                                            </td>
                                            <td className="py-4 px-4">
                                                {isRejected ? (
                                                    <div className="bg-red-50 border border-red-200 text-red-800 p-2 rounded max-w-xs shadow-sm">
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-red-700 mb-0.5">
                                                            <AlertCircle className="w-3 h-3" />
                                                            À CORRIGER
                                                        </span>
                                                        <p className="text-[10px] font-medium leading-tight">
                                                            {req.motifRejet || 'Veuillez corriger votre demande et la resoumettre.'}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary bg-primary-soft px-2 py-0.5 rounded">
                                                            {req.etapeWorkflow.nom}
                                                        </span>
                                                        <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wide">
                                                            En attente : {req.etapeWorkflow.validateurActuel}
                                                        </p>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-4 px-4 text-center">
                                                <Link 
                                                    href={route('requisitions.index')}
                                                    className="inline-flex items-center gap-1 text-primary hover:text-primary-dark hover:bg-primary-soft px-2 py-1 rounded transition"
                                                    title="Ouvrir dans Mes Réquisitions pour corriger ou suivre"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                    <span className="text-[10px] font-bold uppercase">Gérer</span>
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AppLayout>
    );
}