import { useState, useMemo } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { PageProps } from '@/types';

interface EtapeWorkflow {
    nom: string;
    statut: string;
    validateurActuel: string;
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

interface StaffDashboardProps {
    stats?: StaffStats;
    requisitions?: RequisitionItem[];
}

export default function StaffDashboard({ stats: initialStats, requisitions: initialReqs }: StaffDashboardProps) {
    const { auth } = usePage<PageProps>().props;
    const user = auth.user;

    const [filtreEtat, setFiltreEtat] = useState<string>('all');
    const [requisitions] = useState<RequisitionItem[]>(initialReqs ?? []);
    
    // Statistiques réelles envoyées par DashboardController
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
        return requisitions.filter(r => r.etapeWorkflow.statut === filtreEtat);
    }, [requisitions, filtreEtat]);

    return (
        <AppLayout>
            <Head title="Espace Collaborateur - Mes Demandes & Activités" />

            {/* Breadcrumb + Titre principal */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-[#E2E8F0] pb-4">
                <div>
                    <nav className="text-[11px] text-gray-500 font-medium mb-1 flex items-center gap-1">
                        <span>Espace Opérationnel</span> <span>&rsaquo;</span> <span>{user.project?.name || 'Projets Kolwezi'}</span>
                    </nav>
                    <h1 className="text-xl font-bold text-[#0B192C] tracking-tight">
                        Espace Collaborateur - Mes Demandes & Activités
                    </h1>
                    <p className="text-xs text-gray-600 mt-0.5">
                        Suivi rigoureux des décaissements, engagements d'activités et apurements de fonds sur site.
                    </p>
                </div>

                {/* Actions rapides */}
                <div className="flex flex-col sm:flex-row gap-2">
                    <Link
                        href={route('requisitions.create')}
                        className="bg-[#04326D] hover:bg-[#06428f] text-white px-3.5 py-2 rounded text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition"
                    >
                        <svg className="w-4 h-4 text-[#F58F20]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Nouvelle Réquisition</span>
                    </Link>
                    <Link
                        href={route('transport.index')}
                        className="bg-white border border-[#B2BED6] text-[#0B192C] hover:bg-gray-50 px-3.5 py-2 rounded text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition"
                    >
                        <svg className="w-4 h-4 text-[#04326D]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        <span>Transport & Petits Cash</span>
                    </Link>
                </div>
            </div>

            {/* BENTO GRID - 4 CARTES KPI STATS RÉELLES DE MYSQL */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-[#B2BED6] rounded p-4 flex flex-col justify-between shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Demandes en cours</span>
                        <div className="w-6 h-6 rounded bg-blue-50 text-[#04326D] flex items-center justify-center">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                    </div>
                    <div className="my-2">
                        <span className="text-2xl font-black text-[#0B192C]">{stats.enCoursCount} réquisition(s)</span>
                    </div>
                    <p className="text-[11px] text-gray-500">En circuit d'approbation</p>
                </div>

                <div className="bg-white border border-[#B2BED6] rounded p-4 flex flex-col justify-between shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Validées & Prêtes</span>
                        <div className="w-6 h-6 rounded bg-emerald-50 text-[#10B981] flex items-center justify-center">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                    </div>
                    <div className="my-2">
                        <span className="text-2xl font-black text-[#0B192C]">{stats.valideesPretesCount} prête(s)</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                        <span className="bg-emerald-50 text-[#065F46] font-bold px-1.5 py-0.5 rounded text-[10px]">
                            ${stats.valideesPretesMontantUSD.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} USD
                        </span>
                        <span className="text-gray-400">Guichet Caisse</span>
                    </div>
                </div>

                <div className="bg-white border border-[#B2BED6] rounded p-4 flex flex-col justify-between shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Vouchers Petite Caisse</span>
                        <div className="w-6 h-6 rounded bg-blue-50 text-[#04326D] flex items-center justify-center">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                    <div className="my-2">
                        <span className="text-2xl font-black text-[#0B192C]">{stats.vouchersMoisCount} ce mois</span>
                    </div>
                    <p className="text-[11px] text-gray-500">
                        Plafond : <strong className="text-gray-700">&le; 20$ ou 30 000 FC</strong>
                    </p>
                </div>

                <div className="bg-white border-2 border-[#F58F20] rounded p-4 flex flex-col justify-between shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[#0B192C] uppercase tracking-wider">Justificatifs à déposer</span>
                        <div className="w-6 h-6 rounded bg-orange-100 text-[#F58F20] flex items-center justify-center">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                    </div>
                    <div className="my-2 flex items-baseline gap-2">
                        <span className="text-2xl font-black text-[#0B192C]">{stats.justificatifsADeposerCount} retour(s)</span>
                        <span className="bg-red-100 text-red-700 font-bold text-[10px] px-1.5 py-0.5 rounded">délai 48h</span>
                    </div>
                    <p className="text-[11px] text-gray-600 truncate">
                        Décharge : {stats.dechargeRef}
                    </p>
                </div>
            </div>

            {/* TABLEAU HISTORIQUE DES RÉQUISITIONS */}
            <div className="bg-white border border-[#B2BED6] rounded shadow-sm overflow-hidden">
                <div className="p-4 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
                    <div>
                        <h2 className="text-sm font-bold text-[#0B192C]">
                            Historique de mes réquisitions et suivi temps-réel
                        </h2>
                        <p className="text-[11px] text-gray-500">
                            Tracez chaque signature hiérarchique avant déblocage par le caissier principal.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Filtrer par étape :</span>
                        <select
                            value={filtreEtat}
                            onChange={(e) => setFiltreEtat(e.target.value)}
                            className="text-xs border border-[#B2BED6] rounded px-2.5 py-1 bg-white text-gray-700 focus:outline-none focus:border-[#04326D]"
                        >
                            <option value="all">Toutes les étapes</option>
                            <option value="chef_projet">Visa Manager Projet</option>
                            <option value="finance_budget">Finance & Budget</option>
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
                                <th className="py-3 px-4">Montant</th>
                                <th className="py-3 px-4 text-center">Demandes</th>
                                <th className="py-3 px-4">Étape Actuelle (Workflow)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2E8F0] text-gray-700">
                            {filteredReqs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-8 text-center text-gray-400 italic">
                                        Aucune réquisition enregistrée pour le moment.
                                    </td>
                                </tr>
                            ) : (
                                filteredReqs.map((req) => (
                                    <tr key={req.id} className="hover:bg-[#F9F9FF] transition">
                                        <td className="py-4 px-4 font-mono font-bold text-[#04326D] whitespace-nowrap">
                                            {req.code}
                                            {req.is_urgent && (
                                                <span className="ml-2 bg-red-100 text-red-700 text-[9px] px-1.5 py-0.5 rounded font-black uppercase">
                                                    URGENT
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-4 px-4 max-w-xs">
                                            <p className="font-bold text-[#0B192C] leading-snug">{req.motif}</p>
                                            <p className="text-[10px] text-gray-500 mt-0.5">{req.projet}</p>
                                        </td>
                                        <td className="py-4 px-4 whitespace-nowrap text-gray-600">
                                            {req.dateSoumission}
                                        </td>
                                        <td className="py-4 px-4 font-bold text-[#0B192C] whitespace-nowrap font-mono">
                                            {req.montant}
                                        </td>
                                        <td className="py-4 px-4 text-center whitespace-nowrap">
                                            <span className="bg-blue-50 text-[#04326D] font-bold px-2 py-0.5 rounded text-[10px]">
                                                {req.articlesCount} ligne(s)
                                            </span>
                                        </td>
                                        <td className="py-4 px-4 whitespace-nowrap">
                                            <div>
                                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#04326D]">
                                                    <span className="w-2 h-2 rounded-full bg-[#04326D]"></span>
                                                    {req.etapeWorkflow.nom}
                                                </span>
                                                <p className="text-[10px] text-gray-400 mt-0.5">
                                                    {req.etapeWorkflow.validateurActuel}
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AppLayout>
    );
}