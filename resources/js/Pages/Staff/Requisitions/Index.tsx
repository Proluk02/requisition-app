import { useState, useMemo, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import {
    RequisitionSuivi,
    WorkflowStep,
    DetailArticle,
} from '@/types/requisitionsList';
import { numberToWordsFR } from '@/lib/numberToWords';
import OfficialPrintSheet from '@/Components/OfficialPrintSheet';
import { openPrintPreview } from '@/lib/printPreview';
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
    AlertCircle,
} from 'lucide-react';

interface CaisseOption {
    id: string;
    name: string;
    devise: string;
}

interface RequisitionIndexProps {
    requisitions?: RequisitionSuivi[];
    caisses?: CaisseOption[];
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

export default function RequisitionsIndex({
    requisitions: initialRequisitions,
    caisses = [],
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
    const [editAttachments, setEditAttachments] = useState<Record<string, File[]>>({});
    const [editError, setEditError] = useState<string | null>(null);
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

    // SUPPRESSION
    const handleDelete = (id: string, numero: string) => {
        if (confirm(`Confirmez-vous la suppression irréversible de la réquisition ${numero} ?`)) {
            router.delete(route('requisitions.destroy', id), {
                preserveScroll: true,
                onSuccess: () => {
                    setRequisitions((prev) => prev.filter((r) => r.id !== id));
                    if (viewReq?.id === id) setViewReq(null);
                    if (editReq?.id === id) setEditReq(null);
                    if (printReq?.id === id) setPrintReq(null);
                }
            });
        }
    };

    // APERÇU IMPRESSION (VIA COMPOSANT REACT)
    const handleTriggerPrint = (req: RequisitionSuivi) => {
        setPrintReq(req);
    };

    // TÉLÉCHARGEMENT PDF (VIA BACKEND LARAVEL DOMPDF)
    const handleDownloadPdf = (req: RequisitionSuivi) => {
        window.open(route('requisitions.pdf', req.id), '_blank');
    };

    useEffect(() => {
        if (!printReq) return;
        void openPrintPreview('bon-pasteur-print-zone').then(() => setPrintReq(null));
    }, [printReq]);

    // SAUVEGARDE CORRECTION
    const handleSaveEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editReq) return;

        const total = editReq.articles.reduce((acc, a) => acc + (Number(a.total) || 0), 0);
        const enLettres = numberToWordsFR(total, editReq.devise);

        const resubmittedUrgent = editReq.statusCode === 'returned_to_urgent_initiator';
        const updated: RequisitionSuivi = {
            ...editReq,
            montantTotal: total,
            montantLettres: enLettres,
            statusCode: resubmittedUrgent ? 'urgent_direction' : 'draft',
            statusLabel: resubmittedUrgent ? 'En attente de la Directrice (urgence)' : 'En attente du Manager de Projet',
            etapeActuelle: resubmittedUrgent ? 'approbation_direction' : 'brouillon',
        };

        router.post(
            route('requisitions.update', updated.id),
            {
                _method: 'patch',
                caisse_decaissement: updated.caisse,
                devise: updated.devise,
                observation: updated.observation || null,
                articles: updated.articles.map((article) => ({
                    id: article.id,
                    activite: article.activite,
                    quantiteOuDuree: article.quantiteOuDuree,
                    prixUnitaire: article.prixUnitaire,
                    justificatifs: (editAttachments[article.id] ?? []).map((file) => ({
                        description: file.name,
                        date: new Date().toISOString().slice(0, 10),
                        montant: 0,
                        file,
                    })),
                })),
            },
            {
                preserveScroll: true,
                forceFormData: true,
                onStart: () => setSavingEdit(true),
                onFinish: () => setSavingEdit(false),
                onError: (errors) => setEditError(Object.values(errors)[0] ?? 'Erreur lors de la correction.'),
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

    const getStepClasses = (currentStep: WorkflowStep, stepIndex: number, isUrgent = false, isFinal = false) => {
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
        const urgentRoute = isUrgent && ['approbation_direction', 'decaissement_caisse', 'cloture'].includes(currentStep);

        if (urgentRoute && stepIndex < 4) return 'bg-gray-100 text-gray-400 border-gray-200';
        if (isFinal) return 'bg-emerald-500 text-white border-emerald-500';

        if (stepIndex < currentIndex) return 'bg-emerald-500 text-white border-emerald-500';
        if (stepIndex === currentIndex)
            return 'bg-[#04326D] text-white border-[#04326D] ring-4 ring-[#04326D]/20';
        return 'bg-gray-100 text-gray-400 border-gray-200';
    };

    const renderEtapeBadge = (etape: string) => {
        const badges: Record<string, string> = {
            brouillon: 'bg-gray-100 text-gray-700',
            visa_mp: 'bg-blue-50 text-[#04326D] border border-blue-200',
            controle_finance: 'bg-purple-50 text-purple-800 border border-purple-200',
            visa_admin: 'bg-indigo-50 text-indigo-800 border border-indigo-200',
            approbation_direction: 'bg-amber-50 text-amber-900 border border-amber-200',
            decaissement_caisse: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
            cloture: 'bg-gray-800 text-white border border-gray-800',
        };
        const labels: Record<string, string> = {
            brouillon: 'Brouillon / À corriger',
            visa_mp: 'Visa Chef Projet',
            controle_finance: 'Contrôle Finances',
            visa_admin: 'Administration',
            approbation_direction: 'Approbation Direction',
            decaissement_caisse: 'Prêt pour Caisse',
            cloture: 'Clôturé',
        };
        return (
            <span
                className={`${badges[etape] || 'bg-gray-100 text-gray-700'} px-2.5 py-0.5 rounded text-[10px] font-bold`}
            >
                {labels[etape] || etape}
            </span>
        );
    };

    return (
        <AppLayout>
            <Head title="Mes Réquisitions" />
            
            {/* CSS pour gérer le comportement de la modale d'impression d'aperçu */}
            <style>{`
                @media screen {
                    #bon-pasteur-print-zone { display: none; }
                }
                @media print {
                    body * { visibility: hidden; }
                    #bon-pasteur-print-zone, #bon-pasteur-print-zone * { visibility: visible; }
                    #bon-pasteur-print-zone {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        margin: 0;
                        padding: 0;
                    }
                    @page { 
                        size: A4 landscape; 
                        margin: 8mm 10mm; 
                    }
                }
            `}</style>

            <div className="space-y-6 no-print-zone">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E2E8F0] pb-5">
                    <div>
                        <nav className="text-[10px] font-bold uppercase tracking-widest text-[#B2BED6] mb-1 flex items-center gap-1">
                            <Link href={route('dashboard')} className="hover:text-[#04326D] transition">
                                Dashboard
                            </Link>
                            <ChevronRight className="w-3 h-3" />
                            <span className="text-[#04326D]">Mes Réquisitions</span>
                        </nav>
                        <h1 className="text-xl font-bold text-[#0B192C] tracking-tight">
                            Suivi des Réquisitions & Workflow
                        </h1>
                        <p className="text-xs text-gray-500 mt-1">
                            Visualisez l'état d'avancement des signatures et gérez vos bons de demande.
                        </p>
                    </div>

                    <Link
                        href={route('requisitions.create')}
                        className="inline-flex items-center gap-2 bg-[#04326D] hover:bg-[#06428f] text-white px-4 py-2.5 rounded text-xs font-bold shadow-sm transition-all"
                    >
                        <Plus className="w-4 h-4" strokeWidth={2.5} />
                        <span>Nouvelle Réquisition</span>
                    </Link>
                </div>

                {/* Filtres */}
                <div className="bg-white border border-[#B2BED6] rounded shadow-sm p-4 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Rechercher numéro, caisse, motif…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 border border-[#B2BED6] rounded text-xs focus:outline-none focus:border-[#04326D] transition"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                        <select
                            value={filterEtape}
                            onChange={(e) => setFilterEtape(e.target.value)}
                            className="border border-[#B2BED6] rounded px-2.5 py-1.5 bg-white text-[#0B192C] font-semibold text-xs focus:outline-none focus:border-[#04326D] transition"
                        >
                            <option value="all">Toutes les étapes</option>
                            <option value="brouillon">Brouillon / À corriger</option>
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
                            className="border border-[#B2BED6] rounded px-2.5 py-1.5 bg-white text-[#0B192C] font-semibold text-xs focus:outline-none focus:border-[#04326D] transition"
                        >
                            <option value="all">Toutes natures</option>
                            <option value="Achat">Achat</option>
                            <option value="Service">Service</option>
                        </select>

                        <select
                            value={filterDevise}
                            onChange={(e) => setFilterDevise(e.target.value)}
                            className="border border-[#B2BED6] rounded px-2.5 py-1.5 bg-white text-[#0B192C] font-semibold text-xs focus:outline-none focus:border-[#04326D] transition"
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
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 px-2.5 py-1.5 rounded transition"
                            >
                                <RotateCcw className="w-3 h-3" />
                                Réinitialiser
                            </button>
                        )}
                    </div>
                </div>

                {/* Tableau de résultats */}
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
                                        <td colSpan={7} className="text-center py-12">
                                            <FileText className="w-10 h-10 mx-auto text-gray-300 mb-2" strokeWidth={1.5} />
                                            <p className="text-gray-500 font-medium text-sm">
                                                Aucune réquisition trouvée
                                            </p>
                                            <p className="text-gray-400 text-[11px] mt-1">
                                                Modifiez vos filtres ou créez une nouvelle demande.
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredList.map((req) => {
                                        // Vérification de l'autorisation de modification/suppression
                                        const canEditOrDelete = req.statusCode === 'draft' || (req.statusCode?.startsWith('returned_to_') ?? false);

                                        return (
                                            <tr key={req.id} className="hover:bg-[#F9F9FF] transition-colors">
                                                <td className="py-3.5 px-4 font-mono font-bold text-[#04326D] whitespace-nowrap">
                                                    {req.numero}
                                                </td>
                                                <td className="py-3.5 px-4 whitespace-nowrap">
                                                    <p className="font-semibold text-[#0B192C]">
                                                        {req.dateSoumission}
                                                    </p>
                                                    <span
                                                        className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold mt-0.5 uppercase tracking-wider ${
                                                            req.nature === 'Achat'
                                                                ? 'bg-blue-100 text-blue-800'
                                                                : 'bg-amber-100 text-amber-800'
                                                        }`}
                                                    >
                                                        {req.nature}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-4 max-w-[180px]">
                                                    <p className="font-bold text-[#0B192C] truncate">
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
                                                        {req.articles.reduce((acc, a) => acc + a.justificatifsCount, 0)} pièce(s) jointe(s)
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono font-bold text-sm text-[#0B192C]">
                                                    {req.montantTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {req.devise}
                                                </td>
                                                <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                                    {req.statusCode?.startsWith('returned_to_') ? (
                                                        <span className="inline-block rounded px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                                                            À Corriger
                                                        </span>
                                                    ) : renderEtapeBadge(req.etapeActuelle)}
                                                </td>
                                                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                                    <div className="inline-flex items-center gap-1 justify-end">
                                                        {/* Boutons d'Action Conditionnels */}
                                                        {canEditOrDelete && (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setEditReq(JSON.parse(JSON.stringify(req)));
                                                                        setEditAttachments({});
                                                                        setEditError(null);
                                                                    }}
                                                                    className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded transition"
                                                                    title="Corriger la demande"
                                                                >
                                                                    <Pencil className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDelete(req.id, req.numero)}
                                                                    className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition"
                                                                    title="Supprimer la demande"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </>
                                                        )}
                                                        
                                                        {/* Boutons d'Action Permanents */}
                                                        <button
                                                            type="button"
                                                            onClick={() => setViewReq(req)}
                                                            className="p-1.5 text-gray-500 hover:text-[#04326D] hover:bg-blue-50 rounded transition"
                                                            title="Consulter"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleTriggerPrint(req)}
                                                            className="p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded transition"
                                                            title="Aperçu avant Impression"
                                                        >
                                                            <Printer className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDownloadPdf(req)}
                                                            className="p-1.5 text-gray-500 hover:text-[#04326D] hover:bg-blue-50 rounded transition"
                                                            title="Télécharger le PDF Officiel"
                                                        >
                                                            <Download className="w-4 h-4" />
                                                        </button>
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
            </div>

            {/* MODALE VIEW */}
            {viewReq && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 no-print-zone animate-fade-in">
                    <div className="bg-white rounded-lg border border-[#B2BED6] shadow-2xl max-w-3xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto animate-slide-down">
                        <div className="flex items-start justify-between border-b border-[#E2E8F0] pb-3">
                            <div>
                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                                    Consultation Workflow
                                </span>
                                <h2 className="text-lg font-bold text-[#0B192C] flex items-center gap-2 mt-1">
                                    <span>N° {viewReq.numero}</span>
                                    <span className="text-xs px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-[#04326D] font-mono">
                                        {viewReq.nature}
                                    </span>
                                </h2>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleDownloadPdf(viewReq)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#04326D] text-white rounded text-xs font-bold hover:bg-[#06428f] transition shadow-sm"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    Télécharger PDF
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewReq(null)}
                                    className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition"
                                    aria-label="Fermer"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
                                Circuit d'approbation actuel
                            </h3>
                            <div className="flex items-center justify-between relative px-2">
                                <div className="absolute left-0 top-3.5 h-0.5 w-full bg-gray-200 -z-0" />
                                {WORKFLOW_STEPS.map((step, idx) => (
                                    <div
                                        key={step.key}
                                        className="flex flex-col items-center text-center z-10 w-16"
                                    >
                                        <div
                                            className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs border-2 transition ${getStepClasses(
                                                viewReq.etapeActuelle,
                                                idx,
                                                viewReq.is_urgent,
                                                viewReq.statusCode === 'decaisse' || viewReq.statusCode === 'cloture',
                                            )}`}
                                        >
                                            {idx + 1}
                                        </div>
                                        <span className="text-[9px] font-bold text-[#0B192C] mt-2 leading-tight">
                                            {step.label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {viewReq.statusLabel?.toLowerCase().includes('corriger') && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-900 flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                                <div>
                                    <strong className="block uppercase text-[10px] mb-0.5">Motif de rejet :</strong>
                                    <span className="font-semibold">{viewReq.statusLabel}</span> - Veuillez modifier la demande pour la resoumettre.
                                </div>
                            </div>
                        )}

                        <div>
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                Articles Demandés
                            </h3>
                            <div className="border border-[#B2BED6] rounded overflow-hidden">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-[#0B192C] text-white font-bold">
                                        <tr>
                                            <th className="p-2.5">Désignation</th>
                                            <th className="p-2.5">Code Budget</th>
                                            <th className="p-2.5 text-center">
                                                {viewReq.nature === 'Achat' ? 'Qté' : 'Durée'}
                                            </th>
                                            <th className="p-2.5 text-right">P.U</th>
                                            <th className="p-2.5 text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y text-gray-700 bg-white">
                                        {viewReq.articles.map((art) => (
                                            <tr key={art.id}>
                                                <td className="p-2.5 font-medium">{art.activite}</td>
                                                <td className="p-2.5 font-mono text-gray-500">
                                                    {art.codeBudget || '—'}
                                                </td>
                                                <td className="p-2.5 text-center font-bold">
                                                    {art.quantiteOuDuree} {art.unite}
                                                </td>
                                                <td className="p-2.5 text-right font-mono">
                                                    {art.prixUnitaire.toLocaleString()} {viewReq.devise}
                                                </td>
                                                <td className="p-2.5 text-right font-bold font-mono text-[#0B192C]">
                                                    {art.total.toLocaleString()} {viewReq.devise}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-gray-50 font-bold border-t">
                                        <tr>
                                            <td colSpan={4} className="p-2.5 text-right uppercase text-gray-600">
                                                Total Général :
                                            </td>
                                            <td className="p-2.5 text-right text-[#04326D] text-sm font-mono font-bold">
                                                {viewReq.montantTotal.toLocaleString()} {viewReq.devise}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        <div className="space-y-3 border-t pt-4">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                <Paperclip className="w-3.5 h-3.5" />
                                Fichiers joints (Devis, factures proforma...)
                            </h3>
                            {viewReq.articles.some((art) => (art.justificatifs ?? []).length > 0) ? (
                                <div className="space-y-3">
                                    {viewReq.articles.map((art) => (
                                        <div
                                            key={art.id}
                                            className="border border-[#E2E8F0] rounded p-3 bg-gray-50"
                                        >
                                            <div className="flex items-center justify-between gap-3 mb-2">
                                                <p className="text-xs font-bold text-[#0B192C] truncate">
                                                    {art.activite}
                                                </p>
                                                <span className="text-[10px] text-gray-500 bg-white px-1.5 rounded border">
                                                    {art.justificatifs?.length ?? 0} fichier(s)
                                                </span>
                                            </div>
                                            <div className="space-y-2">
                                                {(art.justificatifs ?? []).map((justif) => (
                                                    <div
                                                        key={justif.id}
                                                        className="flex items-center justify-between gap-3 bg-white border border-[#B2BED6] rounded px-3 py-2 shadow-sm"
                                                    >
                                                        <div className="min-w-0">
                                                            <p className="text-[11px] font-semibold text-[#0B192C] truncate">
                                                                {justif.originalName || justif.description}
                                                            </p>
                                                            <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                                                                {justif.date}
                                                            </p>
                                                        </div>
                                                        {justif.fileUrl ? (
                                                            <a
                                                                href={justif.fileUrl}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#04326D] text-white text-[10px] font-bold rounded hover:bg-[#06428f] transition shadow-sm"
                                                            >
                                                                <Download className="w-3 h-3" />
                                                                Ouvrir
                                                            </a>
                                                        ) : (
                                                            <span className="text-[10px] text-gray-400 italic">
                                                                Fichier indisponible
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="border border-dashed border-[#B2BED6] rounded p-4 text-[11px] text-gray-500 text-center bg-gray-50">
                                    Aucun fichier justificatif joint pour le moment.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODALE EDIT */}
            {editReq && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 no-print-zone animate-fade-in">
                    <div className="bg-white rounded-lg border border-[#B2BED6] shadow-2xl max-w-4xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-slide-down">
                        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                            <div>
                                <span className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">Mode Correction</span>
                                <h2 className="text-base font-bold text-[#0B192C]">
                                    Modifier Réquisition N° {editReq.numero}
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEditReq(null)}
                                className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition"
                                aria-label="Fermer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
                            {editError && (
                                <div className="rounded bg-red-100 p-3 text-xs text-red-800 font-bold border border-red-200">
                                    {editError}
                                </div>
                            )}
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 border border-[#E2E8F0] rounded">
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1.5 uppercase text-[10px]">
                                        Caisse de Décaissement *
                                    </label>
                                    <select
                                        value={editReq.caisse}
                                        onChange={(e) =>
                                            setEditReq({ ...editReq, caisse: e.target.value })
                                        }
                                        className="w-full border border-[#B2BED6] rounded p-2 text-xs font-semibold focus:outline-none focus:border-[#04326D] bg-white"
                                        required
                                    >
                                        {caisses.map((c) => (
                                            <option key={c.id} value={c.name}>
                                                {c.name} ({c.devise})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1.5 uppercase text-[10px]">
                                        Devise du document *
                                    </label>
                                    <select
                                        value={editReq.devise}
                                        onChange={(e) =>
                                            setEditReq({ ...editReq, devise: e.target.value as any })
                                        }
                                        className="w-full border border-[#B2BED6] rounded p-2 text-xs font-semibold focus:outline-none focus:border-[#04326D] bg-white"
                                    >
                                        <option value="USD">USD ($)</option>
                                        <option value="FC">Francs Congolais (FC)</option>
                                        <option value="EUR">Euro (€)</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block font-bold text-gray-700 mb-1.5 uppercase text-[10px]">
                                        Observation globale (Optionnel)
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={editReq.observation || ''}
                                        onChange={(e) =>
                                            setEditReq({ ...editReq, observation: e.target.value })
                                        }
                                        placeholder="Note ou justification générale..."
                                        className="w-full border border-[#B2BED6] rounded p-2 text-xs focus:outline-none focus:border-[#04326D] bg-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <h3 className="font-bold text-[#0B192C] uppercase tracking-wider mb-2">
                                    Lignes d'Articles ou Services
                                </h3>
                                <div className="space-y-3">
                                    {editReq.articles.map((art) => (
                                        <div
                                            key={art.id}
                                            className="p-3 border border-[#B2BED6] rounded bg-white shadow-sm grid grid-cols-1 md:grid-cols-12 gap-3 items-center"
                                        >
                                            <div className="md:col-span-12">
                                                <label className="block text-[10px] font-bold text-gray-500 mb-1">Désignation *</label>
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
                                                    className="w-full border border-gray-300 rounded p-1.5 text-xs focus:outline-none focus:border-[#04326D]"
                                                    required
                                                />
                                            </div>
                                            <div className="md:col-span-3">
                                                <label className="block text-[10px] font-bold text-gray-500 mb-1">Qté / Durée *</label>
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
                                                    className="w-full border border-gray-300 rounded p-1.5 text-xs text-center focus:outline-none focus:border-[#04326D]"
                                                />
                                            </div>
                                            <div className="md:col-span-3">
                                                <label className="block text-[10px] font-bold text-gray-500 mb-1">Prix Unitaire *</label>
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
                                                    className="w-full border border-gray-300 rounded p-1.5 text-xs text-right focus:outline-none focus:border-[#04326D]"
                                                />
                                            </div>
                                            <div className="md:col-span-6 flex flex-col justify-end text-right">
                                                <span className="block text-[10px] font-bold text-gray-500 mb-1">Total Ligne</span>
                                                <span className="font-mono font-black text-sm text-[#0B192C] bg-gray-50 px-2 py-1.5 rounded border border-gray-200">
                                                    {art.total.toLocaleString()} {editReq.devise}
                                                </span>
                                            </div>
                                            <label className="block text-xs font-semibold text-gray-700 md:col-span-12 border-t pt-2 mt-1">
                                                Ajouter / Remplacer les justificatifs (PDF/IMG, 10 Mo max)
                                                <input
                                                    type="file"
                                                    accept=".pdf,.jpg,.jpeg,.png"
                                                    multiple
                                                    onChange={(event) => setEditAttachments((current) => ({
                                                        ...current,
                                                        [art.id]: Array.from(event.target.files ?? []),
                                                    }))}
                                                    className="mt-1 block w-full rounded border border-gray-300 bg-gray-50 p-2 font-normal focus:outline-none focus:border-[#04326D]"
                                                />
                                                {(editAttachments[art.id] ?? []).length > 0 && (
                                                    <span className="mt-1.5 block font-bold text-[#04326D] bg-blue-50 px-2 py-1 rounded border border-blue-200">
                                                        {(editAttachments[art.id] ?? []).length} fichier(s) sélectionné(s) : {(editAttachments[art.id] ?? []).map((file) => file.name).join(', ')}
                                                    </span>
                                                )}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-between items-center bg-gray-50 p-3 border border-[#E2E8F0] rounded mt-4">
                                <span className="font-bold text-gray-600 uppercase">Total de la Réquisition :</span>
                                <span className="text-lg font-mono font-black text-[#04326D]">
                                    {editReq.montantTotal.toLocaleString()} {editReq.devise}
                                </span>
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t border-[#E2E8F0]">
                                <button
                                    type="button"
                                    onClick={() => setEditReq(null)}
                                    className="px-4 py-2 border border-[#B2BED6] rounded text-xs font-bold text-gray-600 hover:bg-gray-50 transition"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingEdit}
                                    className="px-6 py-2 bg-[#04326D] text-white rounded text-xs font-bold shadow hover:bg-[#06428f] disabled:opacity-60 transition"
                                >
                                    {savingEdit ? 'Enregistrement en cours…' : 'Enregistrer les Modifications'}
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