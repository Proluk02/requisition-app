import { useState, useMemo } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import {
    mockRequisitionsStaff,
    RequisitionSuivi,
    WorkflowStep,
    DetailArticle,
} from '@/types/requisitionsList';
import { numberToWordsFR } from '@/lib/numberToWords';
import OfficialPrintSheet from '@/Components/OfficialPrintSheet';
import {
    Search,
    Plus,
    Eye,
    Printer,
    Pencil,
    Trash2,
    X,
    FileText,
    RotateCcw,
    ChevronRight,
    Paperclip,
    Download,
} from 'lucide-react';

interface RequisitionIndexProps {
    requisitions?: RequisitionSuivi[];
}

const WORKFLOW_STEPS: { key: WorkflowStep; label: string; role: string }[] = [
    { key: 'brouillon', label: 'Brouillon', role: 'Staff' },
    { key: 'visa_mp', label: 'Visa MP', role: 'Manager Projet' },
    { key: 'controle_finance', label: 'Finances', role: 'Manager Finances' },
    { key: 'visa_admin', label: 'Administration', role: 'Manager Admin' },
    { key: 'approbation_direction', label: 'Direction', role: 'Directrice' },
    { key: 'decaissement_caisse', label: 'Caisse', role: 'Caisse / Banque' },
    { key: 'cloture', label: 'Clôture', role: 'Return Form' },
];

const CAISSES_DISPONIBLES = [
    'EU',
    'Caisse principale',
    'Saint Jean Eudes',
    'Local Fund 1 (Boulangerie)',
    'Local Fund 2',
];

export default function RequisitionsIndex({
    requisitions: initialRequisitions,
}: RequisitionIndexProps) {
    const [requisitions, setRequisitions] = useState<RequisitionSuivi[]>(
        (initialRequisitions ?? []).map((req) => ({
            ...req,
            montantLettres: req.montantLettres || numberToWordsFR(req.montantTotal, req.devise),
        })),
    );

    const [search, setSearch] = useState('');
    const [filterEtape, setFilterEtape] = useState<string>('all');
    const [filterDevise, setFilterDevise] = useState<string>('all');
    const [filterNature, setFilterNature] = useState<string>('all');

    const [viewReq, setViewReq] = useState<RequisitionSuivi | null>(null);
    const [editReq, setEditReq] = useState<RequisitionSuivi | null>(null);
    const [printReq, setPrintReq] = useState<RequisitionSuivi | null>(null);
    const [savingEdit, setSavingEdit] = useState(false);

    const filteredList = useMemo(() => {
        return requisitions.filter((r) => {
            const matchesSearch =
                r.numero.toLowerCase().includes(search.toLowerCase()) ||
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
            setRequisitions((prev) => prev.filter((r) => r.id !== id));
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
            montantLettres: enLettres,
        };

        router.patch(
            route('requisitions.update', updated.id),
            {
                caisse_decaissement: updated.caisse,
                devise: updated.devise,
                observation: updated.observation || null,
                articles: updated.articles.map((article) => ({
                    id: article.id,
                    activite: article.activite,
                    quantiteOuDuree: article.quantiteOuDuree,
                    prixUnitaire: article.prixUnitaire,
                })),
            },
            {
                preserveScroll: true,
                onStart: () => setSavingEdit(true),
                onFinish: () => setSavingEdit(false),
                onSuccess: () => {
                    setRequisitions((prev) =>
                        prev.map((r) => (r.id === updated.id ? updated : r)),
                    );
                    if (viewReq?.id === updated.id) setViewReq(updated);
                    setEditReq(null);
                },
            },
        );
    };

    const handleUpdateEditArticle = (artId: string, field: keyof DetailArticle, val: any) => {
        if (!editReq) return;
        const newArticles = editReq.articles.map((art) => {
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
            montantLettres: numberToWordsFR(newTotal, editReq.devise),
        });
    };

    const getStepClasses = (currentStep: WorkflowStep, stepIndex: number) => {
        const order: WorkflowStep[] = [
            'brouillon',
            'visa_mp',
            'controle_finance',
            'visa_admin',
            'approbation_direction',
            'decaissement_caisse',
            'cloture',
        ];
        const currentIndex = order.indexOf(currentStep);

        if (stepIndex < currentIndex) return 'bg-success text-white border-success';
        if (stepIndex === currentIndex)
            return 'bg-tertiary text-white border-tertiary ring-4 ring-tertiary/20';
        return 'bg-gray-100 text-gray-400 border-gray-200';
    };

    const renderEtapeBadge = (etape: string) => {
        const badges: Record<string, string> = {
            brouillon: 'bg-gray-100 text-gray-700',
            visa_mp: 'bg-primary-soft text-primary',
            controle_finance: 'bg-purple-100 text-purple-800',
            visa_admin: 'bg-indigo-100 text-indigo-800',
            approbation_direction: 'bg-amber-100 text-amber-900',
            decaissement_caisse: 'bg-success-soft text-success-dark',
            cloture: 'bg-sidebar text-white',
        };
        const labels: Record<string, string> = {
            brouillon: 'Brouillon',
            visa_mp: 'Visa Chef Projet',
            controle_finance: 'Contrôle Finances',
            visa_admin: 'Administration',
            approbation_direction: 'Approbation Direction',
            decaissement_caisse: 'Caisse (Prêt)',
            cloture: 'Clôturé',
        };
        return (
            <span
                className={`${badges[etape] || 'bg-gray-100 text-gray-700'} px-2.5 py-1 rounded-full text-[10px] font-bold`}
            >
                {labels[etape] || etape}
            </span>
        );
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
                    #bon-pasteur-print-zone { display: none; }
                }
            `}</style>

            <div className="space-y-6 no-print-zone">
                {/* En-tête */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-soft pb-5">
                    <div>
                        <nav className="text-[11px] text-gray-500 font-medium mb-1 flex items-center gap-1">
                            <Link href={route('dashboard')} className="hover:text-primary transition">
                                Dashboard
                            </Link>
                            <ChevronRight className="w-3 h-3" />
                            <span className="text-on-surface font-bold">Mes Réquisitions</span>
                        </nav>
                        <h1 className="text-xl font-bold text-on-surface tracking-tight">
                            Suivi des Réquisitions & Workflow
                        </h1>
                        <p className="text-xs text-gray-500 mt-1">
                            Visualisez l'état d'avancement des signatures hiérarchiques et gérez vos
                            bons de demande.
                        </p>
                    </div>

                    <Link
                        href={route('requisitions.create')}
                        className="inline-flex items-center gap-2 bg-primary hover:bg-primary-light text-white px-4 py-2.5 rounded-md text-xs font-semibold shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
                    >
                        <Plus className="w-4 h-4" strokeWidth={2.5} />
                        <span>Nouvelle Réquisition</span>
                    </Link>
                </div>

                {/* Filtres */}
                <div className="bg-white border border-outline-soft rounded-lg p-4 shadow-card flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Rechercher numéro, caisse, motif…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 border border-outline-variant rounded-md text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                        <select
                            value={filterEtape}
                            onChange={(e) => setFilterEtape(e.target.value)}
                            className="border border-outline-variant rounded-md px-2.5 py-2 bg-white text-gray-700 text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                        >
                            <option value="all">Toutes les étapes</option>
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
                            className="border border-outline-variant rounded-md px-2.5 py-2 bg-white text-gray-700 text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                        >
                            <option value="all">Toutes natures</option>
                            <option value="Achat">Achat</option>
                            <option value="Service">Service</option>
                        </select>

                        <select
                            value={filterDevise}
                            onChange={(e) => setFilterDevise(e.target.value)}
                            className="border border-outline-variant rounded-md px-2.5 py-2 bg-white text-gray-700 text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                        >
                            <option value="all">Toutes devises</option>
                            <option value="USD">USD ($)</option>
                            <option value="FC">FC (CDF)</option>
                            <option value="EUR">EUR (€)</option>
                        </select>

                        {(search || filterEtape !== 'all' || filterDevise !== 'all' || filterNature !== 'all') && (
                            <button
                                onClick={() => {
                                    setSearch('');
                                    setFilterEtape('all');
                                    setFilterDevise('all');
                                    setFilterNature('all');
                                }}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-error hover:bg-error-soft px-2.5 py-1.5 rounded-md transition"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Réinitialiser
                            </button>
                        )}
                    </div>
                </div>

                {/* Tableau */}
                <div className="bg-white border border-outline-soft rounded-lg shadow-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-sidebar text-white uppercase text-[10px] font-bold tracking-wider">
                                    <th className="py-3 px-4">Numéro</th>
                                    <th className="py-3 px-4">Date & Nature</th>
                                    <th className="py-3 px-4">Projet / Caisse</th>
                                    <th className="py-3 px-4">Observation / Lignes</th>
                                    <th className="py-3 px-4 text-right">Montant Total</th>
                                    <th className="py-3 px-4 text-center">Étape Workflow</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-outline-soft text-gray-700">
                                {filteredList.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-12">
                                            <FileText
                                                className="w-10 h-10 mx-auto text-gray-300 mb-2"
                                                strokeWidth={1.5}
                                            />
                                            <p className="text-gray-500 font-medium text-sm">
                                                Aucune réquisition trouvée
                                            </p>
                                            <p className="text-gray-400 text-[11px] mt-1">
                                                Modifiez vos filtres ou créez une nouvelle demande.
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredList.map((req) => (
                                        <tr key={req.id} className="hover:bg-primary-soft/40 transition-colors">
                                            <td className="py-3.5 px-4 font-mono font-bold text-primary whitespace-nowrap">
                                                {req.numero}
                                            </td>
                                            <td className="py-3.5 px-4 whitespace-nowrap">
                                                <p className="font-semibold text-gray-800">
                                                    {req.dateSoumission}
                                                </p>
                                                <span
                                                    className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold mt-0.5 ${
                                                        req.nature === 'Achat'
                                                            ? 'bg-primary-soft text-primary'
                                                            : 'bg-tertiary-soft text-tertiary'
                                                    }`}
                                                >
                                                    {req.nature}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 max-w-[180px]">
                                                <p className="font-bold text-on-surface truncate">
                                                    {req.projet}
                                                </p>
                                                <p className="text-[10px] text-gray-500 truncate">
                                                    {req.caisse}
                                                </p>
                                            </td>
                                            <td className="py-3.5 px-4 max-w-xs">
                                                <p className="text-gray-800 font-medium truncate">
                                                    {req.observation || 'Sans observation'}
                                                </p>
                                                <span className="text-[10px] text-gray-400">
                                                    {req.articles.length} demande(s) •{' '}
                                                    {req.articles.reduce(
                                                        (acc, a) => acc + a.justificatifsCount,
                                                        0,
                                                    )}{' '}
                                                    pièce(s) jointe(s)
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono font-bold text-sm text-on-surface">
                                                {req.montantTotal.toLocaleString('fr-FR', {
                                                    minimumFractionDigits: 2,
                                                })}{' '}
                                                {req.devise}
                                            </td>
                                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                                {renderEtapeBadge(req.etapeActuelle)}
                                            </td>
                                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                                <div className="inline-flex items-center gap-0.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => setViewReq(req)}
                                                        className="p-1.5 text-gray-600 hover:text-primary hover:bg-primary-soft rounded-md transition"
                                                        title="Consulter"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleTriggerPrint(req)}
                                                        className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition"
                                                        title="Imprimer"
                                                    >
                                                        <Printer className="w-4 h-4" />
                                                    </button>
                                                    {req.etapeActuelle === 'brouillon' && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setEditReq(JSON.parse(JSON.stringify(req)))
                                                                }
                                                                className="p-1.5 text-tertiary hover:text-tertiary-dark hover:bg-tertiary-soft rounded-md transition"
                                                                title="Modifier"
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDelete(req.id, req.numero)}
                                                                className="p-1.5 text-error hover:bg-error-soft rounded-md transition"
                                                                title="Supprimer"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 no-print-zone animate-fade-in">
                    <div className="bg-white rounded-lg border border-outline-soft shadow-modal max-w-3xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto animate-slide-down">
                        <div className="flex items-start justify-between border-b border-outline-soft pb-3">
                            <div>
                                <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">
                                    Consultation Workflow
                                </span>
                                <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
                                    <span>N° {viewReq.numero}</span>
                                    <span className="text-xs px-2 py-0.5 rounded bg-primary-soft text-primary font-mono">
                                        {viewReq.nature}
                                    </span>
                                </h2>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleTriggerPrint(viewReq)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-md text-xs font-semibold hover:bg-primary-light transition"
                                >
                                    <Printer className="w-3.5 h-3.5" />
                                    Imprimer
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewReq(null)}
                                    className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition"
                                    aria-label="Fermer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* STEPPER */}
                        <div>
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                                Circuit d'approbation
                            </h3>
                            <div className="flex items-center justify-between relative">
                                <div className="absolute left-0 top-3.5 h-0.5 w-full bg-gray-200 -z-0" />
                                {WORKFLOW_STEPS.map((step, idx) => (
                                    <div
                                        key={step.key}
                                        className="flex flex-col items-center text-center z-10"
                                    >
                                        <div
                                            className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs border-2 transition ${getStepClasses(
                                                viewReq.etapeActuelle,
                                                idx,
                                            )}`}
                                        >
                                            {idx + 1}
                                        </div>
                                        <span className="text-[10px] font-bold text-on-surface mt-1.5">
                                            {step.label}
                                        </span>
                                        <span className="text-[9px] text-gray-400">{step.role}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* DEMANDES */}
                        <div>
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                Demandes
                            </h3>
                            <table className="w-full text-left text-xs border border-outline-soft rounded-md overflow-hidden">
                                <thead className="bg-surface-muted font-bold text-gray-600">
                                    <tr>
                                        <th className="p-2">Désignation</th>
                                        <th className="p-2">Code Budget</th>
                                        <th className="p-2 text-center">
                                            {viewReq.nature === 'Achat' ? 'Qté' : 'Durée'}
                                        </th>
                                        <th className="p-2 text-right">Prix Unitaire</th>
                                        <th className="p-2 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-outline-soft text-gray-700">
                                    {viewReq.articles.map((art) => (
                                        <tr key={art.id}>
                                            <td className="p-2 font-medium">{art.activite}</td>
                                            <td className="p-2 font-mono text-gray-500">
                                                {art.codeBudget}
                                            </td>
                                            <td className="p-2 text-center">
                                                {art.quantiteOuDuree} {art.unite}
                                            </td>
                                            <td className="p-2 text-right">
                                                {art.prixUnitaire.toLocaleString()} {viewReq.devise}
                                            </td>
                                            <td className="p-2 text-right font-bold">
                                                {art.total.toLocaleString()} {viewReq.devise}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-surface-muted font-bold border-t border-outline-soft">
                                    <tr>
                                        <td colSpan={4} className="p-2 text-right text-gray-600">
                                            Total Général :
                                        </td>
                                        <td className="p-2 text-right text-primary text-sm font-mono font-bold">
                                            {viewReq.montantTotal.toLocaleString()} {viewReq.devise}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        <div className="space-y-3">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                <Paperclip className="w-3.5 h-3.5" />
                                Fichiers joints par demande
                            </h3>
                            {viewReq.articles.some((art) => (art.justificatifs ?? []).length > 0) ? (
                                <div className="space-y-3">
                                    {viewReq.articles.map((art) => (
                                        <div
                                            key={art.id}
                                            className="border border-outline-soft rounded-md p-3 bg-surface-muted"
                                        >
                                            <div className="flex items-center justify-between gap-3 mb-2">
                                                <p className="text-xs font-bold text-on-surface">
                                                    {art.activite}
                                                </p>
                                                <span className="text-[10px] text-gray-500">
                                                    {art.justificatifs?.length ?? 0} fichier(s)
                                                </span>
                                            </div>
                                            <div className="space-y-2">
                                                {(art.justificatifs ?? []).map((justif) => (
                                                    <div
                                                        key={justif.id}
                                                        className="flex items-center justify-between gap-3 bg-white border border-outline-soft rounded-md px-2 py-2"
                                                    >
                                                        <div className="min-w-0">
                                                            <p className="text-[11px] font-semibold text-gray-700 truncate">
                                                                {justif.originalName || justif.description}
                                                            </p>
                                                            <p className="text-[10px] text-gray-500">
                                                                {justif.date} •{' '}
                                                                {justif.montant.toLocaleString('fr-FR', {
                                                                    minimumFractionDigits: 2,
                                                                })}{' '}
                                                                {viewReq.devise}
                                                            </p>
                                                        </div>
                                                        {justif.fileUrl ? (
                                                            <a
                                                                href={justif.fileUrl}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="inline-flex items-center gap-1 px-2 py-1 bg-primary text-white text-[10px] font-semibold rounded-md hover:bg-primary-light transition"
                                                            >
                                                                <Download className="w-3 h-3" />
                                                                Consulter
                                                            </a>
                                                        ) : (
                                                            <span className="text-[10px] text-gray-400">
                                                                Indisponible
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="border border-dashed border-outline-variant rounded-md p-3 text-[11px] text-gray-500 text-center">
                                    Aucun fichier joint sur cette réquisition.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODALE EDIT */}
            {editReq && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 no-print-zone animate-fade-in">
                    <div className="bg-white rounded-lg border border-outline-soft shadow-modal max-w-3xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-slide-down">
                        <div className="flex items-center justify-between border-b border-outline-soft pb-3">
                            <h2 className="text-base font-bold text-on-surface">
                                Modifier Réquisition : {editReq.numero}
                            </h2>
                            <button
                                type="button"
                                onClick={() => setEditReq(null)}
                                className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition"
                                aria-label="Fermer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">
                                        Caisse
                                    </label>
                                    <select
                                        value={editReq.caisse}
                                        onChange={(e) =>
                                            setEditReq({ ...editReq, caisse: e.target.value })
                                        }
                                        className="w-full border border-outline-variant rounded-md p-2 text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                                    >
                                        {CAISSES_DISPONIBLES.map((c) => (
                                            <option key={c} value={c}>
                                                {c}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">
                                        Devise
                                    </label>
                                    <select
                                        value={editReq.devise}
                                        onChange={(e) =>
                                            setEditReq({ ...editReq, devise: e.target.value as any })
                                        }
                                        className="w-full border border-outline-variant rounded-md p-2 text-xs font-bold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                                    >
                                        <option value="USD">USD ($)</option>
                                        <option value="FC">FC (CDF)</option>
                                        <option value="EUR">EUR (€)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">
                                    Observation
                                </label>
                                <textarea
                                    rows={2}
                                    value={editReq.observation || ''}
                                    onChange={(e) =>
                                        setEditReq({ ...editReq, observation: e.target.value })
                                    }
                                    className="w-full border border-outline-variant rounded-md p-2 text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                                />
                            </div>

                            <div>
                                <h3 className="font-bold text-gray-700 uppercase tracking-wider mb-2">
                                    Modifier les articles
                                </h3>
                                <div className="space-y-2">
                                    {editReq.articles.map((art) => (
                                        <div
                                            key={art.id}
                                            className="p-3 border border-outline-soft rounded-md bg-surface-muted grid grid-cols-1 md:grid-cols-12 gap-2 items-center"
                                        >
                                            <div className="md:col-span-5">
                                                <input
                                                    type="text"
                                                    value={art.activite}
                                                    onChange={(e) =>
                                                        handleUpdateEditArticle(
                                                            art.id,
                                                            'activite',
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="w-full border border-outline-variant rounded-md p-1.5 text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                                                    required
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={art.quantiteOuDuree}
                                                    onChange={(e) =>
                                                        handleUpdateEditArticle(
                                                            art.id,
                                                            'quantiteOuDuree',
                                                            Number(e.target.value),
                                                        )
                                                    }
                                                    className="w-full border border-outline-variant rounded-md p-1.5 text-xs text-center focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={art.prixUnitaire}
                                                    onChange={(e) =>
                                                        handleUpdateEditArticle(
                                                            art.id,
                                                            'prixUnitaire',
                                                            Number(e.target.value),
                                                        )
                                                    }
                                                    className="w-full border border-outline-variant rounded-md p-1.5 text-xs text-right focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                                                />
                                            </div>
                                            <div className="md:col-span-3 text-right font-mono font-bold text-xs text-on-surface">
                                                {art.total.toLocaleString()} {editReq.devise}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-outline-soft">
                                <button
                                    type="button"
                                    onClick={() => setEditReq(null)}
                                    className="px-3 py-2 border border-outline-variant rounded-md text-xs text-gray-600 hover:bg-gray-50 transition"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingEdit}
                                    className="px-4 py-2 bg-primary text-white rounded-md font-semibold hover:bg-primary-light disabled:opacity-60 transition"
                                >
                                    {savingEdit ? 'Enregistrement…' : 'Enregistrer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {printReq && (
                <div id="bon-pasteur-print-zone">
                    <OfficialPrintSheet requisition={printReq as any} />
                </div>
            )}
        </AppLayout>
    );
}