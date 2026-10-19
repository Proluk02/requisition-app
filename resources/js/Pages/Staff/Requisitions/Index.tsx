import { useState, useMemo, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { RequisitionSuivi, WorkflowStep, DetailArticle } from '@/types/requisitionsList';
import { numberToWordsFR } from '@/lib/numberToWords';
import OfficialPrintSheet from '@/Components/OfficialPrintSheet';
import SignatureHistory from '@/Components/Director/SignatureHistory';
import WorkflowStepper from '@/Components/Director/WorkflowStepper';
import { openPrintPreview } from '@/lib/printPreview';
import {
    Search,
    Plus,
    Eye,
    Printer,
    Pencil,
    X,
    FileText,
    RotateCcw,
    ChevronRight,
    Paperclip,
    Download,
    AlertCircle
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

    const handlePrintPreview = (req: RequisitionSuivi) => {
        setPrintReq(req);
    };

    useEffect(() => {
        if (!printReq) return;
        void openPrintPreview('bon-pasteur-print-zone')
            .then(() => setPrintReq(null));
    }, [printReq]);

    const handleDownloadPdf = (req: RequisitionSuivi) => {
        const url = route('requisitions.pdf', req.id);
        const link = document.createElement('a');
        link.href = url;
        link.download = `requisition-${req.numero}.pdf`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

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

    const renderEtapeBadge = (etape: string, isUrgent: boolean, statusCode?: string) => {
        if (statusCode?.startsWith('returned_to_')) {
            return (
                <span className="inline-block rounded px-2.5 py-1 text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                    À Corriger
                </span>
            );
        }
        
        const badges: Record<string, string> = {
            brouillon: 'bg-gray-100 text-gray-700 border-gray-200',
            visa_mp: 'bg-amber-50 text-[#F58F20] border-amber-200',
            controle_finance: 'bg-purple-50 text-purple-700 border-purple-200',
            visa_admin: 'bg-amber-50 text-amber-600 border-amber-200',
            approbation_direction: 'bg-blue-50 text-blue-700 border-blue-200',
            decaissement_caisse: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
            cloture: 'bg-gray-800 text-white border border-gray-800',
        };
        const labels: Record<string, string> = {
            brouillon: 'Brouillon',
            visa_mp: 'Visa Chef Projet',
            controle_finance: 'Contrôle Finances',
            visa_admin: 'Administration',
            approbation_direction: 'Approbation Direction',
            decaissement_caisse: 'Prêt pour Caisse',
            cloture: 'Clôturé',
        };
        return (
            <span className={`inline-block border px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${badges[etape] || 'bg-gray-100 text-gray-700'}`}>
                {labels[etape] || etape}
            </span>
        );
    };

    return (
        <AppLayout>
            <Head title="Mes Réquisitions" />
            
            <style>{`
                @media screen {
                    #bon-pasteur-print-zone { display: none; }
                }
                @media print {
                    body * { visibility: hidden !important; }
                    #bon-pasteur-print-zone,
                    #bon-pasteur-print-zone * { visibility: visible !important; }
                    #bon-pasteur-print-zone {
                        display: block !important;
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        background: white !important;
                        z-index: 2147483647 !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    @page { size: A4 landscape; margin: 8mm 10mm; }
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
                                        const canEdit = req.statusCode === 'draft' || req.statusCode?.startsWith('returned_to_') === true;

                                        function handleTriggerPrint(req: RequisitionSuivi): void {
                                            handlePrintPreview(req);
                                        }

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
                                                    {renderEtapeBadge(req.etapeActuelle, req.is_urgent ?? false, req.statusCode)}
                                                </td>
                                                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                                    <div className="inline-flex items-center gap-1 justify-end">
                                                        {canEdit && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setEditReq(JSON.parse(JSON.stringify(req)));
                                                                    setEditAttachments({});
                                                                    setEditError(null);
                                                                }}
                                                                className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded transition border border-transparent hover:border-amber-200"
                                                                title="Corriger la demande"
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        
                                                        <button
                                                            type="button"
                                                            onClick={() => setViewReq(req)}
                                                            className="p-1.5 text-gray-500 hover:text-[#04326D] hover:bg-blue-50 rounded transition"
                                                            title="Consulter l'historique et les signatures"
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
                                                            className="p-1.5 text-gray-500 hover:text-[#04326D] hover:bg-gray-100 rounded transition"
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 no-print-zone animate-fade-in" onClick={() => setViewReq(null)}>
                    <div className="bg-white rounded border border-[#B2BED6] shadow-2xl max-w-3xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto animate-slide-down" onClick={e => e.stopPropagation()}>
                        <div className="flex items-start justify-between border-b border-[#E2E8F0] pb-3">
                            <div>
                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                                    Consultation Workflow
                                </span>
                                <h2 className="text-lg font-bold text-[#0B192C] flex items-center gap-2 mt-1">
                                    <span>N° {viewReq.numero}</span>
                                    <span className="text-xs px-2 py-0.5 rounded bg-gray-100 border border-gray-200 text-[#0B192C] font-mono">
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

                        {/* Motif de rejet affiché dans la consultation si applicable */}
                        {viewReq.statusCode?.startsWith('returned_') && (
                            <div className="bg-red-50 border border-red-200 p-3.5 rounded flex gap-3 items-start shadow-sm">
                                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
                                <div>
                                    <strong className="block uppercase tracking-wider text-[11px] mb-1 font-black text-red-800">
                                        Dossier renvoyé pour correction
                                    </strong>
                                    <p className="font-medium text-sm text-red-900 whitespace-pre-wrap">
                                        {(viewReq as any).motifRejet || viewReq.signatures?.filter(s => s.action === 'rejected').pop()?.commentaire || 'Aucun motif spécifié. Veuillez revoir votre demande.'}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div>
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
                                Circuit d'approbation actuel
                            </h3>
                            <WorkflowStepper statusCode={viewReq.statusCode ?? ''} isUrgent={!!viewReq.is_urgent} />
                        </div>

                        <div>
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                Historique des Signatures & Visas
                            </h3>
                            <div className="bg-gray-50 rounded border border-gray-200 p-3 shadow-inner">
                                <SignatureHistory signatures={viewReq.signatures} />
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                Articles Demandés
                            </h3>
                            <div className="border border-[#B2BED6] rounded overflow-hidden shadow-sm">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-[#0B192C] text-white font-bold uppercase tracking-wider text-[10px]">
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
                                            <tr key={art.id} className="hover:bg-gray-50 transition">
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

            {/* MODALE EDIT (FORMULAIRE DE CORRECTION) */}
            {editReq && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 no-print-zone animate-fade-in">
                    <div className="bg-white rounded border border-[#B2BED6] shadow-2xl max-w-4xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-slide-down">
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

                            {/* AFFICHAGE EXPLICITE DU MOTIF DE REJET DANS LE FORMULAIRE */}
                            {editReq.statusCode?.startsWith('returned_') && (
                                <div className="bg-red-50 border border-red-200 p-3.5 rounded flex gap-3 items-start shadow-sm">
                                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
                                    <div>
                                        <strong className="block uppercase tracking-wider text-[11px] mb-1 font-black text-red-800">
                                            Motif du renvoi pour correction :
                                        </strong>
                                        <p className="font-medium text-sm text-red-900 whitespace-pre-wrap">
                                            {(editReq as any).motifRejet || editReq.signatures?.filter(s => s.action === 'rejected').pop()?.commentaire || 'Aucun motif spécifié. Veuillez revoir votre demande et la resoumettre.'}
                                        </p>
                                    </div>
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
                                        className="w-full border border-[#B2BED6] rounded p-2 text-xs font-semibold focus:outline-none focus:border-[#04326D] bg-white shadow-sm"
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
                                        className="w-full border border-[#B2BED6] rounded p-2 text-xs font-semibold focus:outline-none focus:border-[#04326D] bg-white shadow-sm"
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
                                        className="w-full border border-[#B2BED6] rounded p-2 text-xs focus:outline-none focus:border-[#04326D] bg-white shadow-sm"
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
                                            className="p-3 border border-[#B2BED6] rounded bg-white shadow-sm grid grid-cols-1 md:grid-cols-12 gap-3 items-center hover:shadow-md transition"
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
                                            <label className="block text-xs font-semibold text-gray-700 md:col-span-12 border-t pt-2 mt-1 cursor-pointer group">
                                                <span className="group-hover:text-[#04326D] transition">Ajouter / Remplacer les justificatifs (PDF/IMG, 10 Mo max)</span>
                                                <input
                                                    type="file"
                                                    accept=".pdf,.jpg,.jpeg,.png"
                                                    multiple
                                                    onChange={(event) => setEditAttachments((current) => ({
                                                        ...current,
                                                        [art.id]: Array.from(event.target.files ?? []),
                                                    }))}
                                                    className="mt-1 block w-full rounded border border-gray-300 bg-gray-50 p-2 font-normal focus:outline-none focus:border-[#04326D] cursor-pointer"
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

                            <div className="flex justify-between items-center bg-gray-50 p-4 border border-[#E2E8F0] rounded mt-4 shadow-sm">
                                <span className="font-bold text-gray-600 uppercase tracking-widest text-[11px]">Total de la Réquisition :</span>
                                <span className="text-xl font-mono font-black text-[#04326D]">
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
                                    {savingEdit ? 'Enregistrement en cours…' : 'Enregistrer les Modifications et Resoumettre'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ZONE D'IMPRESSION CACHÉE */}
            {printReq && (
                <div id="bon-pasteur-print-zone">
                    <OfficialPrintSheet requisition={printReq as any} />
                </div>
            )}
        </AppLayout>
    );
}