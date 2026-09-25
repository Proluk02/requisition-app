import { useState, useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { mockRequisitionsStaff, RequisitionSuivi, WorkflowStep, DetailArticle } from '@/types/requisitionsList';
import { numberToWordsFR } from '@/lib/numberToWords';

const WORKFLOW_STEPS: { key: WorkflowStep; label: string; role: string }[] = [
    { key: 'brouillon', label: 'Brouillon', role: 'Staff' },
    { key: 'visa_mp', label: 'Visa MP', role: 'Manager Projet' },
    { key: 'controle_finance', label: 'Finances', role: 'Manager Finances' },
    { key: 'visa_admin', label: 'Administration', role: 'Manager Admin' },
    { key: 'approbation_direction', label: 'Direction', role: 'Directrice' },
    { key: 'decaissement_caisse', label: 'Caisse', role: 'Caisse / Banque' },
    { key: 'cloture', label: 'Clôture', role: 'Return Form' }
];

const CAISSES_DISPONIBLES = [
    'EU',
    'Caisse principale',
    'Saint Jean Eudes',
    'Local Fund 1 (Boulangerie)',
    'Local Fund 2'
];

export default function RequisitionsIndex() {
    const [requisitions, setRequisitions] = useState<RequisitionSuivi[]>(mockRequisitionsStaff);

    const [search, setSearch] = useState('');
    const [filterEtape, setFilterEtape] = useState<string>('all');
    const [filterDevise, setFilterDevise] = useState<string>('all');
    const [filterNature, setFilterNature] = useState<string>('all');

    const [viewReq, setViewReq] = useState<RequisitionSuivi | null>(null);
    const [editReq, setEditReq] = useState<RequisitionSuivi | null>(null);
    const [printReq, setPrintReq] = useState<RequisitionSuivi | null>(null);

    const filteredList = useMemo(() => {
        return requisitions.filter(r => {
            const matchesSearch = r.numero.toLowerCase().includes(search.toLowerCase()) ||
                (r.observation && r.observation.toLowerCase().includes(search.toLowerCase())) ||
                r.caisse.toLowerCase().includes(search.toLowerCase());

            const matchesEtape = filterEtape === 'all' || r.etapeActuelle === filterEtape;
            const matchesDevise = filterDevise === 'all' || r.devise === filterDevise;
            const matchesNature = filterNature === 'all' || r.nature === filterNature;

            return matchesSearch && matchesEtape && matchesDevise && matchesNature;
        });
    }, [requisitions, search, filterEtape, filterDevise, filterNature]);

    const handleDelete = (id: string, numero: string) => {
        if (confirm(`Confirmez-vous la suppression de la réquisition ${numero} ?`)) {
            setRequisitions(prev => prev.filter(r => r.id !== id));
            if (viewReq?.id === id) setViewReq(null);
            if (editReq?.id === id) setEditReq(null);
            if (printReq?.id === id) setPrintReq(null);
        }
    };

    const handleTriggerPrint = (req: RequisitionSuivi) => {
        setPrintReq(req);
        setTimeout(() => {
            window.print();
        }, 350);
    };

    const handleSaveEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editReq) return;

        const total = editReq.articles.reduce((acc, a) => acc + (Number(a.total) || 0), 0);
        const enLettres = numberToWordsFR(total, editReq.devise);

        const updated: RequisitionSuivi = {
            ...editReq,
            montantTotal: total,
            montantLettres: enLettres
        };

        setRequisitions(prev => prev.map(r => r.id === updated.id ? updated : r));
        if (viewReq?.id === updated.id) setViewReq(updated);
        setEditReq(null);
    };

    const handleUpdateEditArticle = (artId: string, field: keyof DetailArticle, val: any) => {
        if (!editReq) return;
        const newArticles = editReq.articles.map(art => {
            if (art.id !== artId) return art;
            const item = { ...art, [field]: val };
            if (field === 'quantiteOuDuree' || field === 'prixUnitaire') {
                item.total = Number(item.quantiteOuDuree) * Number(item.prixUnitaire);
            }
            return item;
        });
        const newTotal = newArticles.reduce((acc, a) => acc + a.total, 0);
        setEditReq({
            ...editReq,
            articles: newArticles,
            montantTotal: newTotal,
            montantLettres: numberToWordsFR(newTotal, editReq.devise)
        });
    };

    const getStepClasses = (currentStep: WorkflowStep, stepIndex: number) => {
        const order: WorkflowStep[] = ['brouillon', 'visa_mp', 'controle_finance', 'visa_admin', 'approbation_direction', 'decaissement_caisse', 'cloture'];
        const currentIndex = order.indexOf(currentStep);

        if (stepIndex < currentIndex) return 'bg-[#10B981] text-white border-[#10B981]';
        if (stepIndex === currentIndex) return 'bg-[#F58F20] text-white border-[#F58F20] ring-4 ring-[#F58F20]/20';
        return 'bg-gray-100 text-gray-400 border-gray-200';
    };

    return (
        <AppLayout>
            <Head title="Suivi des Réquisitions" />

            <style>{`
                @media print {
                    nav, aside, header, .no-print-zone, button {
                        display: none !important;
                    }
                    #bon-pasteur-print-zone {
                        display: block !important;
                        position: fixed;
                        left: 0;
                        top: 0;
                        width: 100vw;
                        height: auto;
                        padding: 24px;
                        background: white;
                        color: black;
                        font-family: 'Inter', serif;
                        z-index: 999999;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
                @media screen {
                    #bon-pasteur-print-zone {
                        display: none;
                    }
                }
            `}</style>

            <div className="space-y-6 no-print-zone">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
                    <div>
                        <nav className="text-[11px] text-gray-500 font-medium mb-1 flex items-center gap-1">
                            <Link href={route('dashboard')} className="hover:underline">Dashboard</Link>
                            <span>&rsaquo;</span>
                            <span className="text-[#0B192C] font-bold">Mes Réquisitions</span>
                        </nav>
                        <h1 className="text-xl font-bold text-[#0B192C] tracking-tight">
                            Suivi des Réquisitions & Workflow
                        </h1>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Visualisez l'état d'avancement des signatures hiérarchiques et gérez vos bons de demande.
                        </p>
                    </div>

                    <Link
                        href={route('requisitions.create')}
                        className="bg-[#04326D] hover:bg-[#06428f] text-white px-4 py-2 rounded text-xs font-bold flex items-center gap-2 shadow-sm transition"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Nouvelle Réquisition</span>
                    </Link>
                </div>

                {/* Filtres */}
                <div className="bg-white border border-[#B2BED6] rounded p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
                    <div className="relative w-full md:w-80">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 pointer-events-none">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </span>
                        <input
                            type="text"
                            placeholder="Rechercher numéro, caisse, motif..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 border border-[#B2BED6] rounded text-xs focus:outline-none focus:border-[#04326D]"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                        <select
                            value={filterEtape}
                            onChange={(e) => setFilterEtape(e.target.value)}
                            className="border border-[#B2BED6] rounded px-2.5 py-1.5 bg-white text-gray-700 text-xs focus:outline-none focus:border-[#04326D]"
                        >
                            <option value="all">Toutes les étapes (Workflow)</option>
                            <option value="brouillon">Brouillon</option>
                            <option value="visa_mp">Visa Manager Projet</option>
                            <option value="controle_finance">Contrôle Finances</option>
                            <option value="visa_admin">Visa Administration</option>
                            <option value="approbation_direction">Approbation Direction</option>
                            <option value="decaissement_caisse">Caisse (Prêt)</option>
                            <option value="cloture">Clôturé</option>
                        </select>

                        <select
                            value={filterNature}
                            onChange={(e) => setFilterNature(e.target.value)}
                            className="border border-[#B2BED6] rounded px-2.5 py-1.5 bg-white text-gray-700 text-xs focus:outline-none focus:border-[#04326D]"
                        >
                            <option value="all">Toutes Natures</option>
                            <option value="Achat">Achat</option>
                            <option value="Service">Service</option>
                        </select>

                        <select
                            value={filterDevise}
                            onChange={(e) => setFilterDevise(e.target.value)}
                            className="border border-[#B2BED6] rounded px-2.5 py-1.5 bg-white text-gray-700 text-xs focus:outline-none focus:border-[#04326D]"
                        >
                            <option value="all">Toutes Devises</option>
                            <option value="USD">USD ($)</option>
                            <option value="FC">FC (CDF)</option>
                            <option value="EUR">EUR (€)</option>
                        </select>

                        {(search || filterEtape !== 'all' || filterDevise !== 'all' || filterNature !== 'all') && (
                            <button
                                onClick={() => { setSearch(''); setFilterEtape('all'); setFilterDevise('all'); setFilterNature('all'); }}
                                className="text-[11px] font-semibold text-red-600 hover:underline px-2"
                            >
                                Réinitialiser
                            </button>
                        )}
                    </div>
                </div>

                {/* Tableau des réquisitions */}
                <div className="bg-white border border-[#B2BED6] rounded shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-[#0B192C] text-white uppercase text-[10px] font-bold tracking-wider">
                                    <th className="py-3 px-4">Numéro</th>
                                    <th className="py-3 px-4">Date & Nature</th>
                                    <th className="py-3 px-4">Projet / Caisse</th>
                                    <th className="py-3 px-4">Observation / Lignes</th>
                                    <th className="py-3 px-4 text-right">Montant Total</th>
                                    <th className="py-3 px-4 text-center">Étape Workflow</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E2E8F0] text-gray-700">
                                {filteredList.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-10 text-gray-400 italic">
                                            Aucune réquisition trouvée.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredList.map((req) => (
                                        <tr key={req.id} className="hover:bg-[#F9F9FF] transition">
                                            <td className="py-3.5 px-4 font-mono font-bold text-[#04326D] whitespace-nowrap">
                                                {req.numero}
                                            </td>
                                            <td className="py-3.5 px-4 whitespace-nowrap">
                                                <p className="font-semibold text-gray-800">{req.dateSoumission}</p>
                                                <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold mt-0.5 ${
                                                    req.nature === 'Achat' ? 'bg-blue-100 text-[#04326D]' : 'bg-orange-100 text-[#F58F20]'
                                                }`}>
                                                    {req.nature}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 max-w-[180px]">
                                                <p className="font-bold text-[#0B192C] truncate">{req.projet}</p>
                                                <p className="text-[10px] text-gray-500 truncate">{req.caisse}</p>
                                            </td>
                                            <td className="py-3.5 px-4 max-w-xs">
                                                <p className="text-gray-800 font-medium truncate">{req.observation || 'Sans observation'}</p>
                                                <span className="text-[10px] text-gray-400">
                                                    {req.articles.length} article(s) • {req.articles.reduce((acc, a) => acc + a.justificatifsCount, 0)} justificatif(s)
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono font-bold text-sm text-[#0B192C]">
                                                {req.montantTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {req.devise}
                                            </td>
                                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                                {req.etapeActuelle === 'brouillon' && <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full text-[10px] font-bold">Brouillon</span>}
                                                {req.etapeActuelle === 'visa_mp' && <span className="bg-blue-100 text-[#04326D] px-2.5 py-1 rounded-full text-[10px] font-bold">Visa Chef Projet</span>}
                                                {req.etapeActuelle === 'controle_finance' && <span className="bg-purple-100 text-purple-800 px-2.5 py-1 rounded-full text-[10px] font-bold">Contrôle Finances</span>}
                                                {req.etapeActuelle === 'visa_admin' && <span className="bg-indigo-100 text-indigo-800 px-2.5 py-1 rounded-full text-[10px] font-bold">Administration</span>}
                                                {req.etapeActuelle === 'approbation_direction' && <span className="bg-amber-100 text-amber-900 px-2.5 py-1 rounded-full text-[10px] font-bold">Approbation Direction</span>}
                                                {req.etapeActuelle === 'decaissement_caisse' && <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full text-[10px] font-bold">Caisse (Prêt)</span>}
                                                {req.etapeActuelle === 'cloture' && <span className="bg-gray-800 text-white px-2.5 py-1 rounded-full text-[10px] font-bold">Clôturé</span>}
                                            </td>
                                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                                <div className="inline-flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => setViewReq(req)}
                                                        className="p-1.5 text-gray-600 hover:text-[#04326D] hover:bg-blue-50 rounded"
                                                        title="Consulter"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleTriggerPrint(req)}
                                                        className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                                                        title="Imprimer"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                                        </svg>
                                                    </button>
                                                    {req.etapeActuelle === 'brouillon' && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => setEditReq(JSON.parse(JSON.stringify(req)))}
                                                                className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded"
                                                                title="Modifier"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                </svg>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDelete(req.id, req.numero)}
                                                                className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                                                                title="Supprimer"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* MODALE VIEW */}
            {viewReq && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 no-print-zone">
                    <div className="bg-white rounded border border-[#B2BED6] shadow-2xl max-w-3xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-start justify-between border-b pb-3">
                            <div>
                                <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Consultation Workflow</span>
                                <h2 className="text-lg font-bold text-[#0B192C] flex items-center gap-2">
                                    <span>N° {viewReq.numero}</span>
                                    <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-[#04326D] font-mono">
                                        {viewReq.nature}
                                    </span>
                                </h2>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleTriggerPrint(viewReq)}
                                    className="px-3 py-1.5 bg-[#04326D] text-white rounded text-xs font-bold hover:bg-[#06428f] flex items-center gap-1.5"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                    </svg>
                                    Imprimer
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewReq(null)}
                                    className="text-gray-400 hover:text-gray-600 text-xl font-bold p-1 leading-none"
                                >
                                    &times;
                                </button>
                            </div>
                        </div>

                        {/* STEPPER */}
                        <div>
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Circuit d'approbation</h3>
                            <div className="flex items-center justify-between relative">
                                <div className="absolute left-0 top-3.5 h-0.5 w-full bg-gray-200 -z-0"></div>
                                {WORKFLOW_STEPS.map((step, idx) => (
                                    <div key={step.key} className="flex flex-col items-center text-center z-10">
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs border-2 transition ${getStepClasses(viewReq.etapeActuelle, idx)}`}>
                                            {idx + 1}
                                        </div>
                                        <span className="text-[10px] font-bold text-[#0B192C] mt-1.5">{step.label}</span>
                                        <span className="text-[9px] text-gray-400">{step.role}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ARTICLES */}
                        <div>
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Articles</h3>
                            <table className="w-full text-left text-xs border border-gray-200">
                                <thead className="bg-gray-50 font-bold text-gray-600">
                                    <tr>
                                        <th className="p-2">Désignation</th>
                                        <th className="p-2">Code Budget</th>
                                        <th className="p-2 text-center">{viewReq.nature === 'Achat' ? 'Qté' : 'Durée'}</th>
                                        <th className="p-2 text-right">Prix Unitaire</th>
                                        <th className="p-2 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y text-gray-700">
                                    {viewReq.articles.map(art => (
                                        <tr key={art.id}>
                                            <td className="p-2 font-medium">{art.activite}</td>
                                            <td className="p-2 font-mono text-gray-500">{art.codeBudget}</td>
                                            <td className="p-2 text-center">{art.quantiteOuDuree} {art.unite}</td>
                                            <td className="p-2 text-right">{art.prixUnitaire.toLocaleString()} {viewReq.devise}</td>
                                            <td className="p-2 text-right font-bold">{art.total.toLocaleString()} {viewReq.devise}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-gray-50 font-bold border-t">
                                    <tr>
                                        <td colSpan={4} className="p-2 text-right text-gray-600">Total Général :</td>
                                        <td className="p-2 text-right text-[#04326D] text-sm font-mono font-bold">
                                            {viewReq.montantTotal.toLocaleString()} {viewReq.devise}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* MODALE EDIT */}
            {editReq && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 no-print-zone">
                    <div className="bg-white rounded border border-[#B2BED6] shadow-2xl max-w-3xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b pb-3">
                            <h2 className="text-base font-bold text-[#0B192C]">
                                Modifier Réquisition : {editReq.numero}
                            </h2>
                            <button
                                type="button"
                                onClick={() => setEditReq(null)}
                                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
                            >
                                &times;
                            </button>
                        </div>

                        <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">Caisse</label>
                                    <select
                                        value={editReq.caisse}
                                        onChange={(e) => setEditReq({ ...editReq, caisse: e.target.value })}
                                        className="w-full border border-gray-300 rounded p-1.5 text-xs focus:outline-none"
                                    >
                                        {CAISSES_DISPONIBLES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">Devise</label>
                                    <select
                                        value={editReq.devise}
                                        onChange={(e) => setEditReq({ ...editReq, devise: e.target.value as any })}
                                        className="w-full border border-gray-300 rounded p-1.5 text-xs font-bold focus:outline-none"
                                    >
                                        <option value="USD">USD ($)</option>
                                        <option value="FC">FC (CDF)</option>
                                        <option value="EUR">EUR (€)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">Observation</label>
                                <textarea
                                    rows={2}
                                    value={editReq.observation || ''}
                                    onChange={(e) => setEditReq({ ...editReq, observation: e.target.value })}
                                    className="w-full border border-gray-300 rounded p-1.5 text-xs focus:outline-none"
                                />
                            </div>

                            <div>
                                <h3 className="font-bold text-gray-700 uppercase tracking-wider mb-2">Modifier les articles</h3>
                                <div className="space-y-2">
                                    {editReq.articles.map(art => (
                                        <div key={art.id} className="p-3 border border-gray-200 rounded bg-gray-50 grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                                            <div className="md:col-span-5">
                                                <input
                                                    type="text"
                                                    value={art.activite}
                                                    onChange={(e) => handleUpdateEditArticle(art.id, 'activite', e.target.value)}
                                                    className="w-full border border-gray-300 rounded p-1 text-xs"
                                                    required
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={art.quantiteOuDuree}
                                                    onChange={(e) => handleUpdateEditArticle(art.id, 'quantiteOuDuree', Number(e.target.value))}
                                                    className="w-full border border-gray-300 rounded p-1 text-xs text-center"
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={art.prixUnitaire}
                                                    onChange={(e) => handleUpdateEditArticle(art.id, 'prixUnitaire', Number(e.target.value))}
                                                    className="w-full border border-gray-300 rounded p-1 text-xs text-right"
                                                />
                                            </div>
                                            <div className="md:col-span-3 text-right font-mono font-bold text-xs text-[#0B192C]">
                                                {art.total.toLocaleString()} {editReq.devise}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t">
                                <button
                                    type="button"
                                    onClick={() => setEditReq(null)}
                                    className="px-3 py-1.5 border rounded text-xs text-gray-600 hover:bg-gray-50"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-1.5 bg-[#04326D] text-white rounded font-bold hover:bg-[#06428f]"
                                >
                                    Enregistrer
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ZONE D'IMPRESSION OFFICIELLE */}
            {printReq && (
                <div id="bon-pasteur-print-zone">
                    <div style={{ borderBottom: '2px solid black', paddingBottom: '12px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                            <h1 style={{ fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase', margin: 0 }}>
                                ASBL BON PASTEUR KOLWEZI
                            </h1>
                            <p style={{ fontSize: '11px', margin: '3px 0 0 0' }}>
                                Service des Finances & Budget • Projet : {printReq.projet}
                            </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <h2 style={{ fontSize: '15px', fontWeight: 'bold', margin: 0 }}>
                                BON DE RÉQUISITION
                            </h2>
                            <p style={{ fontSize: '13px', fontWeight: 'bold', margin: '3px 0 0 0', fontFamily: 'monospace' }}>
                                N° {printReq.numero}
                            </p>
                        </div>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '20px' }}>
                        <thead>
                            <tr style={{ background: '#f0f0f0', textTransform: 'uppercase', textAlign: 'left' }}>
                                <th style={{ border: '1px solid black', padding: '6px', textAlign: 'center' }}>#</th>
                                <th style={{ border: '1px solid black', padding: '6px' }}>Désignation</th>
                                <th style={{ border: '1px solid black', padding: '6px', textAlign: 'center' }}>Code</th>
                                <th style={{ border: '1px solid black', padding: '6px', textAlign: 'center' }}>{printReq.nature === 'Achat' ? 'Qté' : 'Durée'}</th>
                                <th style={{ border: '1px solid black', padding: '6px', textAlign: 'right' }}>Prix U.</th>
                                <th style={{ border: '1px solid black', padding: '6px', textAlign: 'right' }}>Total ({printReq.devise})</th>
                            </tr>
                        </thead>
                        <tbody>
                            {printReq.articles.map((art, idx) => (
                                <tr key={art.id}>
                                    <td style={{ border: '1px solid black', padding: '6px', textAlign: 'center' }}>{idx + 1}</td>
                                    <td style={{ border: '1px solid black', padding: '6px' }}>{art.activite}</td>
                                    <td style={{ border: '1px solid black', padding: '6px', textAlign: 'center', fontFamily: 'monospace' }}>{art.codeBudget}</td>
                                    <td style={{ border: '1px solid black', padding: '6px', textAlign: 'center' }}>{art.quantiteOuDuree} {art.unite}</td>
                                    <td style={{ border: '1px solid black', padding: '6px', textAlign: 'right' }}>{art.prixUnitaire.toLocaleString()}</td>
                                    <td style={{ border: '1px solid black', padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>{art.total.toLocaleString()}</td>
                                </tr>
                            ))}
                            <tr>
                                <td colSpan={5} style={{ border: '1px solid black', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>
                                    TOTAL GÉNÉRAL :
                                </td>
                                <td style={{ border: '1px solid black', padding: '8px', textAlign: 'right', fontWeight: 'bold', fontSize: '13px' }}>
                                    {printReq.montantTotal.toLocaleString()} {printReq.devise}
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <p style={{ fontSize: '11px', marginBottom: '35px' }}>
                        <strong>Montant certifié :</strong> <em>{printReq.montantLettres}</em>
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', textAlign: 'center', fontSize: '10px' }}>
                        <div style={{ border: '1px solid black', padding: '8px', minHeight: '80px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                            <p style={{ fontWeight: 'bold', margin: 0 }}>1. L'Initiateur</p>
                            <p style={{ borderTop: '1px dashed black', paddingTop: '4px', margin: 0 }}>Signature</p>
                        </div>
                        <div style={{ border: '1px solid black', padding: '8px', minHeight: '80px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                            <p style={{ fontWeight: 'bold', margin: 0 }}>2. Manager Projet</p>
                            <p style={{ borderTop: '1px dashed black', paddingTop: '4px', margin: 0 }}>Visa & Date</p>
                        </div>
                        <div style={{ border: '1px solid black', padding: '8px', minHeight: '80px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                            <p style={{ fontWeight: 'bold', margin: 0 }}>3. Finances</p>
                            <p style={{ borderTop: '1px dashed black', paddingTop: '4px', margin: 0 }}>Visa & Imputation</p>
                        </div>
                        <div style={{ border: '1px solid black', padding: '8px', minHeight: '80px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                            <p style={{ fontWeight: 'bold', margin: 0 }}>4. Direction</p>
                            <p style={{ borderTop: '1px dashed black', paddingTop: '4px', margin: 0 }}>Bon à Payer</p>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}