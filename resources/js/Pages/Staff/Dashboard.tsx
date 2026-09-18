import { useState } from 'react';
import { Head } from '@inertiajs/react';
import StaffLayout from '@/Layouts/StaffLayout';
import { mockStaffStats, mockStaffRequisitions, RequisitionItem } from '@/types/staff';

export default function StaffDashboard() {
    const [filtreEtat, setFiltreEtat] = useState<string>('all');
    const [requisitions] = useState<RequisitionItem[]>(mockStaffRequisitions);
    const stats = mockStaffStats;

    const filteredReqs = filtreEtat === 'all'
        ? requisitions
        : requisitions.filter(r => r.etapeWorkflow.statut === filtreEtat);

    return (
        <StaffLayout>
            <Head title="Espace Collaborateur - Mes Demandes & Activités" />

            {/* Breadcrumb + Titre principal */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                    <nav className="text-[11px] text-gray-500 font-medium mb-1">
                        <span>Espace Opérationnel</span> <span className="mx-1">&rsaquo;</span> <span>Terrain & Projets Kolwezi</span>
                    </nav>
                    <h1 className="text-2xl font-bold text-[#0B192C] tracking-tight">
                        Espace Collaborateur - Mes Demandes & Activités
                    </h1>
                    <p className="text-xs text-gray-600 mt-1">
                        Suivi rigoureux des décaissements, engagements d'activités et apurements de fonds sur site.
                    </p>
                </div>

                {/* Boutons d'actions rapides (Haut Droite) */}
                <div className="flex flex-col sm:flex-row gap-2">
                    <button className="bg-[#0B192C] text-white hover:bg-[#152842] px-3.5 py-2 rounded text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition">
                        <svg className="w-4 h-4 text-[#F58F20]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Nouvelle Réquisition (Standard / Multi-articles)
                    </button>
                    <button className="bg-white border border-[#B2BED6] text-[#0B192C] hover:bg-gray-50 px-3.5 py-2 rounded text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition">
                        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Nouveau Voucher Petite Caisse (&le; 20 USD / 30 000 FC)
                    </button>
                    <button className="bg-white border border-[#B2BED6] text-[#0B192C] hover:bg-gray-50 px-3.5 py-2 rounded text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition">
                        <svg className="w-4 h-4 text-[#F58F20]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Déclarer un Retour de Pièces de Caisse (Décharge)
                    </button>
                </div>
            </div>

            {/* BENTO GRID - 4 CARTES KPI STATS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Demandes en cours */}
                <div className="bg-white border border-[#B2BED6] rounded p-4 flex flex-col justify-between shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Demandes en cours</span>
                        <div className="w-6 h-6 rounded bg-blue-50 text-[#04326D] flex items-center justify-center">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                    </div>
                    <div className="my-3">
                        <span className="text-2xl font-bold text-[#0B192C]">{stats.enCoursCount} réquisitions</span>
                    </div>
                    <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
                        <span className="text-gray-400">&#x21bb;</span> En circuit de signatures hiérarchiques
                    </p>
                </div>

                {/* 2. Validées & Prêtes */}
                <div className="bg-white border border-[#B2BED6] rounded p-4 flex flex-col justify-between shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Validées & Prêtes</span>
                        <div className="w-6 h-6 rounded bg-emerald-50 text-[#10B981] flex items-center justify-center">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                    </div>
                    <div className="my-3">
                        <span className="text-2xl font-bold text-[#0B192C]">{stats.valideesPretesCount} réquisition</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                        <span className="bg-[#D1FAE5] text-[#065F46] font-bold px-1.5 py-0.5 rounded text-[10px]">
                            ${stats.valideesPretesMontantUSD.toFixed(2)} USD à retirer
                        </span>
                        <span className="text-gray-500">Guichet Caisse</span>
                    </div>
                </div>

                {/* 3. Vouchers Petite Caisse */}
                <div className="bg-white border border-[#B2BED6] rounded p-4 flex flex-col justify-between shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Vouchers Petite Caisse</span>
                        <div className="w-6 h-6 rounded bg-blue-50 text-[#04326D] flex items-center justify-center">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                    <div className="my-3">
                        <span className="text-2xl font-bold text-[#0B192C]">{stats.vouchersMoisCount} ce mois</span>
                    </div>
                    <p className="text-[11px] text-gray-500">
                        Cumul: <span className="font-semibold text-gray-800">${stats.vouchersMoisTotalUSD} USD total</span> (Fournitures atelier)
                    </p>
                </div>

                {/* 4. Justificatifs à déposer (Urgent / Orange) */}
                <div className="bg-white border-2 border-[#F58F20] rounded p-4 flex flex-col justify-between shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[#0B192C] uppercase tracking-wider">Justificatifs à déposer</span>
                        <div className="w-6 h-6 rounded bg-orange-100 text-[#F58F20] flex items-center justify-center">
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                        </div>
                    </div>
                    <div className="my-2 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-[#0B192C]">{stats.justificatifsADeposerCount} retour</span>
                        <span className="bg-[#FEE2E2] text-[#DC2626] font-bold text-[10px] px-1.5 py-0.5 rounded">délai 48h</span>
                    </div>
                    <p className="text-[11px] text-gray-600 truncate">
                        Activité: {stats.activiteEnSouffrance}
                    </p>
                    <p className="text-[10px] text-gray-400">
                        (Décharge {stats.dechargeRef})
                    </p>
                </div>
            </div>

            {/* GRILLE 2 COLONNES : TABLEAU HISTORIQUE (GAUCHE) & GUIDE DE PROCÉDURES (DROITE) */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                
                {/* TABLEAU HISTORIQUE - Span 8 ou 9 */}
                <div className="xl:col-span-8 bg-white border border-[#B2BED6] rounded shadow-sm overflow-hidden">
                    {/* Header de table + filtre */}
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
                            <span className="text-xs text-gray-500">Statut:</span>
                            <select
                                value={filtreEtat}
                                onChange={(e) => setFiltreEtat(e.target.value)}
                                className="text-xs border border-[#B2BED6] rounded px-2.5 py-1 bg-white text-gray-700 focus:outline-none focus:border-[#04326D]"
                            >
                                <option value="all">Tous les états</option>
                                <option value="caisse_pret">Caisse (Prêt)</option>
                                <option value="finance_budget">Finance & Budget</option>
                                <option value="chef_projet">Chef Projet</option>
                            </select>
                        </div>
                    </div>

                    {/* Table des demandes */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-[#0B192C] text-white uppercase text-[10px] font-bold tracking-wider">
                                    <th className="py-3 px-4">Code Réquisition</th>
                                    <th className="py-3 px-4">Motif / Activité</th>
                                    <th className="py-3 px-4">Date Soumission</th>
                                    <th className="py-3 px-4">Montant Estimé</th>
                                    <th className="py-3 px-4 text-center">Multi-articles</th>
                                    <th className="py-3 px-4">Étape Actuelle (Workflow)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E2E8F0] text-gray-700">
                                {filteredReqs.map((req) => (
                                    <tr key={req.id} className="hover:bg-[#F9F9FF] transition">
                                        {/* Code Réquisition */}
                                        <td className="py-4 px-4 font-bold text-[#04326D] whitespace-nowrap">
                                            {req.code}
                                        </td>

                                        {/* Motif & Projet */}
                                        <td className="py-4 px-4 max-w-xs">
                                            <p className="font-bold text-[#0B192C] leading-snug">{req.motif}</p>
                                            <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{req.projet}</p>
                                        </td>

                                        {/* Date */}
                                        <td className="py-4 px-4 whitespace-nowrap text-gray-600">
                                            {req.dateSoumission}
                                        </td>

                                        {/* Montant Estimé */}
                                        <td className="py-4 px-4 font-bold text-[#0B192C] whitespace-nowrap">
                                            {req.montant}
                                        </td>

                                        {/* Tag Multi-Articles */}
                                        <td className="py-4 px-4 text-center whitespace-nowrap">
                                            <span className="bg-[#E7EEFF] text-[#04326D] font-bold px-2 py-0.5 rounded text-[10px]">
                                                {req.articlesCount} {req.articlesCount > 1 ? 'articles' : 'article'}
                                            </span>
                                        </td>

                                        {/* Workflow Statut Pilule */}
                                        <td className="py-4 px-4 whitespace-nowrap">
                                            {req.etapeWorkflow.statut === 'caisse_pret' && (
                                                <div>
                                                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#10B981]">
                                                        <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
                                                        {req.etapeWorkflow.nom}
                                                    </span>
                                                    <p className="text-[10px] text-gray-400 mt-0.5">{req.etapeWorkflow.validateurActuel}</p>
                                                </div>
                                            )}

                                            {req.etapeWorkflow.statut === 'finance_budget' && (
                                                <div>
                                                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#F58F20]">
                                                        <span className="w-2 h-2 rounded-full bg-[#F58F20]"></span>
                                                        {req.etapeWorkflow.nom}
                                                    </span>
                                                    <p className="text-[10px] text-gray-400 mt-0.5">{req.etapeWorkflow.validateurActuel}</p>
                                                </div>
                                            )}

                                            {req.etapeWorkflow.statut === 'chef_projet' && (
                                                <div>
                                                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#3B82F6]">
                                                        <span className="w-2 h-2 rounded-full bg-[#3B82F6]"></span>
                                                        {req.etapeWorkflow.nom}
                                                    </span>
                                                    <p className="text-[10px] text-gray-400 mt-0.5">{req.etapeWorkflow.validateurActuel}</p>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* PANNEAU DE DROITE : GUIDE RAPIDE & PROCÉDURES - Span 4 */}
                <div className="xl:col-span-4 bg-white border border-[#B2BED6] rounded shadow-sm overflow-hidden">
                    <div className="bg-[#0B192C] text-white p-4 flex items-center gap-2.5">
                        <svg className="w-5 h-5 text-[#F58F20]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <h3 className="font-bold text-sm tracking-wide">Guide Rapide & Procédures</h3>
                    </div>

                    <div className="p-4 space-y-4 text-xs">
                        <p className="text-gray-500 text-[11px] leading-relaxed">
                            Règles de conformité administrative pour les agents de terrain de l'ASBL Bon Pasteur Kolwezi.
                        </p>

                        {/* Règle 1 */}
                        <div className="flex gap-3 items-start border-b border-gray-100 pb-3">
                            <span className="w-6 h-6 rounded-full bg-[#04326D] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                                1
                            </span>
                            <div>
                                <h4 className="font-bold text-[#0B192C]">Petite Caisse (&le; 20 USD)</h4>
                                <p className="text-gray-500 text-[11px] mt-1 leading-snug">
                                    Pour achats imprévus immédiats &le; 30 000 FC. Décaissement direct au guichet avec visa chef projet.
                                </p>
                            </div>
                        </div>

                        {/* Règle 2 */}
                        <div className="flex gap-3 items-start border-b border-gray-100 pb-3">
                            <span className="w-6 h-6 rounded-full bg-[#04326D] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                                2
                            </span>
                            <div>
                                <h4 className="font-bold text-[#0B192C]">Réquisitions Multi-articles</h4>
                                <p className="text-gray-500 text-[11px] mt-1 leading-snug">
                                    Nécessite 3 devis comparatifs pour toute ligne d'équipement dépassant 150 USD.
                                </p>
                            </div>
                        </div>

                        {/* Règle 3 (Alerte / Orange) */}
                        <div className="flex gap-3 items-start bg-orange-50 p-2.5 rounded border border-[#F58F20]/30">
                            <span className="w-6 h-6 rounded-full bg-[#F58F20] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                                3
                            </span>
                            <div>
                                <h4 className="font-bold text-[#0B192C]">Règle d'or de Décharge (48h)</h4>
                                <p className="text-gray-600 text-[11px] mt-1 leading-snug">
                                    Factures certifiées et pièces originales (reçus d'achat, listes d'émargement) obligatoires sous 48h ouvrées.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </StaffLayout>
    );
}