import { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { PageProps } from '@/types';
import {
    BarChart3,
    Calendar,
    Printer,
    FolderKanban,
    Layers,
    ShoppingCart,
    Wrench,
} from 'lucide-react';

interface ProjectInfo {
    id: string;
    name: string;
    full_name: string;
}

interface ReportingFilters {
    annee: number;
    type_periode: 'monthly' | 'quarterly' | 'annual';
    mois: number;
    trimestre: number;
    labelPeriode: string;
}

interface ReportingStats {
    countTotal: number;
    countDecaissees: number;
    countEnCours: number;
    countRejetees: number;
    totalSoumisUSD: number;
    totalSoumisFC: number;
    totalDecaisseUSD: number;
    totalDecaisseFC: number;
    totalEnCoursUSD: number;
    totalEnCoursFC: number;
    totalRejeteUSD: number;
    countAchats: number;
    countServices: number;
    totalAchatsUSD: number;
    totalServicesUSD: number;
}

interface LigneVentilation {
    code: string;
    nombre_lignes: number;
    total_montant: number;
    activites: string[];
}

interface RequisitionRow {
    id: string;
    numero: string;
    date: string;
    demandeur: string;
    nature: 'Achat' | 'Service';
    montant: number;
    devise: string;
    caisse: string;
    status: string;
    is_decaissee: boolean;
    mode_paiement?: string | null;
    reference_paiement?: string | null;
    date_decaissement?: string | null;
}

interface Props extends PageProps {
    project: ProjectInfo | null;
    filters: ReportingFilters;
    stats: ReportingStats;
    lignesVentilation: LigneVentilation[];
    requisitions: RequisitionRow[];
    availableProjects?: ProjectInfo[];
}

const money = (n: number, dev: string) =>
    `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${dev}`;

export default function ReportingIndex({
    project,
    filters,
    stats,
    lignesVentilation = [],
    requisitions = [],
    availableProjects = [],
}: Props) {
    const { auth } = usePage<PageProps>().props;
    const user = auth.user;
    const isAdmin = user.role === 'admin';

    const [typePeriode, setTypePeriode] = useState(filters.type_periode);
    const [annee, setAnnee] = useState(filters.annee);
    const [mois, setMois] = useState(filters.mois);
    const [trimestre, setTrimestre] = useState(filters.trimestre);
    const [selectedProjectId, setSelectedProjectId] = useState(project?.id ?? '');

    const handleApplyFilter = (t = typePeriode, y = annee, m = mois, q = trimestre, pId = selectedProjectId) => {
        router.get(
            route('pm.reporting.index'),
            {
                type_periode: t,
                annee: y,
                mois: m,
                trimestre: q,
                project_id: pId,
            },
            { preserveState: true, preserveScroll: true }
        );
    };

    return (
        <AppLayout>
            <Head title={`Rapport d'Activités — ${filters.labelPeriode}`} />

            <style>{`
                @media print {
                    nav, aside, header, .no-print-area, button, select {
                        display: none !important;
                    }
                    #pm-reporting-print-sheet {
                        display: block !important;
                        position: fixed;
                        left: 0;
                        top: 0;
                        width: 100vw;
                        height: auto;
                        padding: 20px;
                        background: white !important;
                        color: black !important;
                    }
                }
                @media screen {
                    #pm-reporting-print-sheet { display: none; }
                }
            `}</style>

            <div className="space-y-6 no-print-area">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
                    <div>
                        <nav className="text-[10px] font-bold uppercase tracking-widest text-[#B2BED6] mb-1.5 flex items-center gap-1.5">
                            <BarChart3 className="w-3.5 h-3.5 text-[#04326D]" />
                            <span>Chef de Projet</span>
                            <span className="mx-1">/</span>
                            <span className="text-[#04326D]">Rapports Périodiques</span>
                        </nav>
                        <h1 className="text-xl font-bold text-[#0B192C]">
                            Rapport d'Engagement & Décaissements — {project?.name ?? 'Projet'}
                        </h1>
                        <p className="text-[12px] text-gray-500 mt-1">
                            Synthèse consolidée des réquisitions pour la période : <strong className="text-[#0B192C]">{filters.labelPeriode}</strong>.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {isAdmin && availableProjects.length > 0 && (
                            <select
                                value={selectedProjectId}
                                onChange={(e) => {
                                    setSelectedProjectId(e.target.value);
                                    handleApplyFilter(typePeriode, annee, mois, trimestre, e.target.value);
                                }}
                                className="border border-[#B2BED6] rounded px-2.5 py-1.5 text-xs bg-white text-[#0B192C] font-semibold"
                            >
                                {availableProjects.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name}
                                    </option>
                                ))}
                            </select>
                        )}

                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0B192C] hover:bg-[#1B2B44] text-white rounded text-xs font-bold shadow transition"
                        >
                            <Printer className="w-4 h-4 text-emerald-400" />
                            <span>Imprimer Rapport Officiel</span>
                        </button>
                    </div>
                </header>

                {/* Filtres de Périodicité */}
                <div className="bg-white border border-[#B2BED6] rounded p-4 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-700 flex items-center gap-1">
                            <Calendar className="w-4 h-4 text-[#04326D]" />
                            Période :
                        </span>
                        <div className="flex border border-[#B2BED6] rounded overflow-hidden">
                            <button
                                type="button"
                                onClick={() => {
                                    setTypePeriode('monthly');
                                    handleApplyFilter('monthly', annee, mois, trimestre);
                                }}
                                className={`px-3 py-1.5 font-bold text-[11px] transition ${
                                    typePeriode === 'monthly' ? 'bg-[#04326D] text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
                                }`}
                            >
                                Mensuel
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setTypePeriode('quarterly');
                                    handleApplyFilter('quarterly', annee, mois, trimestre);
                                }}
                                className={`px-3 py-1.5 font-bold text-[11px] transition ${
                                    typePeriode === 'quarterly' ? 'bg-[#04326D] text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
                                }`}
                            >
                                Trimestriel
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setTypePeriode('annual');
                                    handleApplyFilter('annual', annee, mois, trimestre);
                                }}
                                className={`px-3 py-1.5 font-bold text-[11px] transition ${
                                    typePeriode === 'annual' ? 'bg-[#04326D] text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
                                }`}
                            >
                                Annuel
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {typePeriode === 'monthly' && (
                            <select
                                value={mois}
                                onChange={(e) => {
                                    const m = parseInt(e.target.value);
                                    setMois(m);
                                    handleApplyFilter(typePeriode, annee, m, trimestre);
                                }}
                                className="border border-[#B2BED6] rounded px-2.5 py-1 text-xs bg-white font-semibold"
                            >
                                {[
                                    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                                    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
                                ].map((nom, idx) => (
                                    <option key={idx + 1} value={idx + 1}>
                                        {nom}
                                    </option>
                                ))}
                            </select>
                        )}

                        {typePeriode === 'quarterly' && (
                            <select
                                value={trimestre}
                                onChange={(e) => {
                                    const q = parseInt(e.target.value);
                                    setTrimestre(q);
                                    handleApplyFilter(typePeriode, annee, mois, q);
                                }}
                                className="border border-[#B2BED6] rounded px-2.5 py-1 text-xs bg-white font-semibold"
                            >
                                <option value="1">1er Trimestre (Jan - Mar)</option>
                                <option value="2">2ème Trimestre (Avr - Juin)</option>
                                <option value="3">3ème Trimestre (Juil - Sept)</option>
                                <option value="4">4ème Trimestre (Oct - Déc)</option>
                            </select>
                        )}

                        <select
                            value={annee}
                            onChange={(e) => {
                                const y = parseInt(e.target.value);
                                setAnnee(y);
                                handleApplyFilter(typePeriode, y, mois, trimestre);
                            }}
                            className="border border-[#B2BED6] rounded px-2.5 py-1 text-xs bg-white font-mono font-bold"
                        >
                            {[2024, 2025, 2026, 2027, 2028].map((y) => (
                                <option key={y} value={y}>
                                    {y}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Synthèse chiffrée */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-white p-4 rounded border border-[#B2BED6] shadow-sm flex flex-col justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                            Total Réquisitions Soumises
                        </span>
                        <p className="text-2xl font-black text-[#0B192C] mt-1 font-mono">
                            {money(stats.totalSoumisUSD, '$')}
                        </p>
                        <span className="text-[10px] text-gray-400 mt-1">
                            {stats.countTotal} dossier(s) • + {money(stats.totalSoumisFC, 'FC')}
                        </span>
                    </div>

                    <div className="bg-white p-4 rounded border border-[#B2BED6] shadow-sm flex flex-col justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                            Décaissements Effectifs (Caisse)
                        </span>
                        <p className="text-2xl font-black text-emerald-700 mt-1 font-mono">
                            {money(stats.totalDecaisseUSD, '$')}
                        </p>
                        <span className="text-[10px] text-emerald-700 mt-1">
                            {stats.countDecaissees} dossier(s) décaissé(s)
                        </span>
                    </div>

                    <div className="bg-white p-4 rounded border border-[#B2BED6] shadow-sm flex flex-col justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#F58F20]">
                            En Circuit d'Approbation
                        </span>
                        <p className="text-2xl font-black text-[#F58F20] mt-1 font-mono">
                            {money(stats.totalEnCoursUSD, '$')}
                        </p>
                        <span className="text-[10px] text-gray-400 mt-1">
                            {stats.countEnCours} dossier(s) en attente
                        </span>
                    </div>

                    <div className="bg-white p-4 rounded border border-[#B2BED6] shadow-sm flex flex-col justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                            Répartition Achat / Service
                        </span>
                        <div className="mt-1 space-y-0.5 text-xs font-mono">
                            <p className="flex justify-between">
                                <span className="text-gray-500">Achats :</span>
                                <strong className="text-[#04326D]">{money(stats.totalAchatsUSD, '$')} ({stats.countAchats})</strong>
                            </p>
                            <p className="flex justify-between">
                                <span className="text-gray-500">Services :</span>
                                <strong className="text-[#F58F20]">{money(stats.totalServicesUSD, '$')} ({stats.countServices})</strong>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Ventilation analytique par code budgétaire */}
                <div className="bg-white border border-[#B2BED6] rounded shadow-sm overflow-hidden">
                    <header className="p-4 border-b bg-gray-50 flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B192C] flex items-center gap-1.5">
                            <Layers className="w-4 h-4 text-[#04326D]" />
                            <span>Ventilation des Dépenses par Code d'Imputation Budgétaire</span>
                        </h3>
                        <span className="text-xs font-mono text-gray-500 font-bold">
                            {lignesVentilation.length} code(s) mobilisé(s)
                        </span>
                    </header>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-[#0B192C] text-white uppercase text-[10px] font-bold tracking-wider">
                                    <th className="py-2.5 px-4">Code Imputation</th>
                                    <th className="py-2.5 px-4">Activités / Désignations Concernées</th>
                                    <th className="py-2.5 px-4 text-center">Nombre Lignes</th>
                                    <th className="py-2.5 px-4 text-right">Volume Financier</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 text-gray-700">
                                {lignesVentilation.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="py-8 text-center text-gray-400 italic">
                                            Aucune dépense imputée sur cette période.
                                        </td>
                                    </tr>
                                ) : (
                                    lignesVentilation.map((v, idx) => (
                                        <tr key={idx} className="hover:bg-[#F9F9FF]">
                                            <td className="py-3 px-4 font-mono font-bold text-[#04326D]">
                                                {v.code}
                                            </td>
                                            <td className="py-3 px-4 text-gray-600 max-w-md truncate">
                                                {v.activites.join(' • ')}
                                            </td>
                                            <td className="py-3 px-4 text-center font-bold">
                                                {v.nombre_lignes}
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono font-bold text-[#0B192C]">
                                                {v.total_montant.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Liste détaillée des réquisitions */}
                <div className="bg-white border border-[#B2BED6] rounded shadow-sm overflow-hidden">
                    <header className="p-4 border-b bg-gray-50">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B192C]">
                            Détail Chronologique des Réquisitions de la Période ({requisitions.length})
                        </h3>
                    </header>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-[#0B192C] text-white uppercase text-[10px] font-bold tracking-wider">
                                    <th className="py-3 px-4">N° Réquisition</th>
                                    <th className="py-3 px-4">Date</th>
                                    <th className="py-3 px-4">Demandeur</th>
                                    <th className="py-3 px-4">Nature</th>
                                    <th className="py-3 px-4">Caisse</th>
                                    <th className="py-3 px-4 text-right">Montant</th>
                                    <th className="py-3 px-4 text-center">Statut</th>
                                    <th className="py-3 px-4">Décaissement (BSC)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 text-gray-700">
                                {requisitions.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-8 text-center text-gray-400 italic">
                                            Aucune réquisition enregistrée pour cette période.
                                        </td>
                                    </tr>
                                ) : (
                                    requisitions.map((r) => (
                                        <tr key={r.id} className="hover:bg-[#F9F9FF]">
                                            <td className="py-3 px-4 font-mono font-bold text-[#04326D]">
                                                {r.numero}
                                            </td>
                                            <td className="py-3 px-4 whitespace-nowrap text-gray-600">
                                                {r.date}
                                            </td>
                                            <td className="py-3 px-4 font-semibold text-gray-800">
                                                {r.demandeur}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold ${
                                                    r.nature === 'Achat' ? 'bg-blue-50 text-[#04326D]' : 'bg-amber-50 text-amber-800'
                                                }`}>
                                                    {r.nature}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-gray-600">
                                                {r.caisse}
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono font-bold whitespace-nowrap text-[#0B192C]">
                                                {money(r.montant, r.devise)}
                                            </td>
                                            <td className="py-3 px-4 text-center whitespace-nowrap">
                                                <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold ${
                                                    r.is_decaissee ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-700'
                                                }`}>
                                                    {r.is_decaissee ? 'Décaissé' : r.status}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-xs font-mono">
                                                {r.reference_paiement ? (
                                                    <span className="text-[#04326D] font-bold">
                                                        {r.reference_paiement} ({r.date_decaissement})
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 italic">Non décaissé</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* FEUILLE OFFICIELLE D'IMPRESSION A4 DU RAPPORT */}
            <div id="pm-reporting-print-sheet" className="p-8 font-sans text-black space-y-6">
                <div className="flex items-start justify-between border-b-2 border-black pb-4">
                    <div className="space-y-1">
                        <p className="text-xs font-bold uppercase tracking-wider">Bon Pasteur A.S.B.L. — Kolwezi</p>
                        <h1 className="text-lg font-black uppercase">
                            Rapport d'Activités & Engagements Financiers
                        </h1>
                        <p className="text-xs">
                            Projet : <strong>{project?.name} ({project?.full_name})</strong>
                        </p>
                    </div>
                    <div className="text-right text-xs">
                        <p><strong>Période :</strong> {filters.labelPeriode}</p>
                        <p><strong>Date d'édition :</strong> {new Date().toLocaleDateString('fr-FR')}</p>
                    </div>
                </div>

                <div className="grid grid-cols-4 gap-4 border border-black p-3 text-xs">
                    <div>
                        <span className="block text-gray-600 uppercase text-[9px]">Total Réquisitions</span>
                        <strong className="text-sm font-mono">{stats.countTotal} dossier(s)</strong>
                    </div>
                    <div>
                        <span className="block text-gray-600 uppercase text-[9px]">Volume Engagé USD</span>
                        <strong className="text-sm font-mono">{money(stats.totalSoumisUSD, '$')}</strong>
                    </div>
                    <div>
                        <span className="block text-gray-600 uppercase text-[9px]">Volume Décaissé USD</span>
                        <strong className="text-sm font-mono text-emerald-800">{money(stats.totalDecaisseUSD, '$')}</strong>
                    </div>
                    <div>
                        <span className="block text-gray-600 uppercase text-[9px]">En Circuit USD</span>
                        <strong className="text-sm font-mono text-amber-800">{money(stats.totalEnCoursUSD, '$')}</strong>
                    </div>
                </div>

                <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider border-b border-black pb-1 mb-2">
                        Ventilation Analytique des Dépenses par Code Budgétaire
                    </h3>
                    <table className="w-full text-left border border-black text-xs border-collapse">
                        <thead>
                            <tr className="bg-gray-100 border-b border-black">
                                <th className="p-1.5 border-r border-black">Code Imputation</th>
                                <th className="p-1.5 border-r border-black">Description Sommaire</th>
                                <th className="p-1.5 border-r border-black text-center">Lignes</th>
                                <th className="p-1.5 text-right">Montant Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-black">
                            {lignesVentilation.map((v, i) => (
                                <tr key={i}>
                                    <td className="p-1.5 border-r border-black font-mono font-bold">{v.code}</td>
                                    <td className="p-1.5 border-r border-black">{v.activites.join(', ')}</td>
                                    <td className="p-1.5 border-r border-black text-center">{v.nombre_lignes}</td>
                                    <td className="p-1.5 text-right font-mono font-bold">{v.total_montant.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="grid grid-cols-2 gap-8 pt-12 text-center text-xs">
                    <div className="space-y-12">
                        <p className="font-bold underline uppercase">Le Manager de Projet</p>
                        <p className="font-bold">{user.name}</p>
                    </div>
                    <div className="space-y-12">
                        <p className="font-bold underline uppercase">La Direction Générale</p>
                        <p className="font-bold">Pour réception et classement</p>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}