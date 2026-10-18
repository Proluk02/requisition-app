import { useState, useMemo, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { PageProps } from '@/types';
import RequisitionCorrectionForm, { type RequisitionCorrectionData } from '@/Components/RequisitionCorrectionForm';
import SignatureHistory from '@/Components/Director/SignatureHistory';
import WorkflowStepper from '@/Components/Director/WorkflowStepper';
import OfficialPrintSheet from '@/Components/OfficialPrintSheet';
import { numberToWordsFR } from '@/lib/numberToWords';
import { openPrintPreview } from '@/lib/printPreview';
import type { RequisitionSuivi } from '@/types/requisitionsList';
import { 
    Search, 
    Printer, 
    Download, 
    CheckCircle2, 
    AlertCircle, 
    ShieldCheck, 
    Ban, 
    Lock, 
    Eye,
    Filter,
    BarChart3,
    Activity,
    PieChart
} from 'lucide-react';

interface Justificatif {
    id: string;
    nom: string;
    description: string;
    montant: number;
    fileUrl: string | null;
}

interface LigneRequisition {
    id: string;
    activite: string;
    codeBudget: string;
    codeAllocation: string | null;
    nature: string;
    quantiteOuDuree: number;
    unite: string;
    prixUnitaire: number;
    total: number;
    justificatifs: Justificatif[];
}

interface RequisitionAdmin {
    id: string;
    numero: string;
    projet: string;
    initiateurNom: string;
    initiateurRole: string;
    nature: 'Achat' | 'Service';
    devise: 'USD' | 'FC' | 'EUR';
    montantTotal: number;
    caisseAttribuee?: string;
    observation: string | null;
    is_urgent?: boolean;
    statusCode: string;
    statusLabel: string;
    canDecide: boolean;
    canCorrect?: boolean;
    motifRejet?: string | null;
    dateSoumission: string;
    lignes: LigneRequisition[];
}

interface HistoryRequisition {
    id: string;
    numero: string;
    projet: string;
    initiateurNom: string;
    nature: 'Achat' | 'Service';
    devise: 'USD' | 'FC' | 'EUR';
    montantTotal: number;
    caisseAttribuee: string;
    statusCode: string;
    statusLabel: string;
    is_urgent: boolean;
    signatures: {
        role: string;
        nom: string;
        action: string;
        date: string;
        code?: string;
        hash: string;
        commentaire?: string | null;
    }[];
}

interface Props extends PageProps {
    requisitions?: RequisitionAdmin[];
    historyRequisitions?: HistoryRequisition[];
}

const money = (amount: number, currency: string) =>
    `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${currency}`;

export default function AdminManagerDashboard({
    requisitions: initialRequisitions = [],
    historyRequisitions = [],
}: Props) {
    const { auth } = usePage<PageProps>().props;
    const user = auth.user;

    const [requisitions, setRequisitions] = useState<RequisitionAdmin[]>(initialRequisitions);
    
    // États pour les filtres
    const [search, setSearch] = useState('');
    const [filterNature, setFilterNature] = useState<string>('All');
    const [filterUrgency, setFilterUrgency] = useState<string>('All');
    
    const [historySearch, setHistorySearch] = useState('');
    const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('All');

    // Modales & États
    const [selected, setSelected] = useState<RequisitionAdmin | null>(null);
    const [historySelected, setHistorySelected] = useState<HistoryRequisition | null>(null);
    const [correcting, setCorrecting] = useState<RequisitionCorrectionData | null>(null);
    const [rejecting, setRejecting] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');

    // État pour l'impression / téléchargement
    const [printReq, setPrintReq] = useState<RequisitionAdmin | null>(null);

    // Sécurité : Visa Administratif
    const [passwordModalOpen, setPasswordModalOpen] = useState(false);
    const [passwordSaisi, setPasswordSaisi] = useState('');
    const [processing, setProcessing] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // --- CALCUL DES STATISTIQUES (Analytics) ---
    const stats = useMemo(() => {
        const pendingCount = requisitions.length;
        const urgentCount = requisitions.filter(r => r.is_urgent).length;
        const achatsCount = requisitions.filter(r => r.nature === 'Achat').length;
        const servicesCount = requisitions.filter(r => r.nature === 'Service').length;
        
        const historyCount = historyRequisitions.length;
        const decaisseCount = historyRequisitions.filter(r => r.statusCode === 'decaisse').length;
        const rejetsCount = historyRequisitions.filter(r => r.statusCode.startsWith('returned_')).length;
        
        return { pendingCount, urgentCount, achatsCount, servicesCount, historyCount, decaisseCount, rejetsCount };
    }, [requisitions, historyRequisitions]);

    // --- FILTRAGES ---
    const filteredRequisitions = useMemo(() => {
        const q = search.toLowerCase();
        return requisitions.filter(item => {
            const matchesSearch = item.numero.toLowerCase().includes(q) ||
                item.projet.toLowerCase().includes(q) ||
                item.initiateurNom.toLowerCase().includes(q) ||
                (item.observation && item.observation.toLowerCase().includes(q));
            
            const matchesNature = filterNature === 'All' || item.nature === filterNature;
            const matchesUrgency = filterUrgency === 'All' || 
                (filterUrgency === 'Urgent' && item.is_urgent) || 
                (filterUrgency === 'Normal' && !item.is_urgent);

            return matchesSearch && matchesNature && matchesUrgency;
        });
    }, [requisitions, search, filterNature, filterUrgency]);

    const filteredHistory = useMemo(() => {
        const q = historySearch.toLowerCase();
        return historyRequisitions.filter(item => {
            const matchesSearch = item.numero.toLowerCase().includes(q) ||
                item.projet.toLowerCase().includes(q) ||
                item.initiateurNom.toLowerCase().includes(q);
            
            let matchesStatus = true;
            if (historyStatusFilter === 'Rejeté') matchesStatus = item.statusCode.startsWith('returned_');
            else if (historyStatusFilter === 'Décaissé') matchesStatus = item.statusCode === 'decaisse';
            else if (historyStatusFilter === 'En cours') matchesStatus = !item.statusCode.startsWith('returned_') && item.statusCode !== 'decaisse';

            return matchesSearch && matchesStatus;
        });
    }, [historyRequisitions, historySearch, historyStatusFilter]);

    const handleTriggerApprove = () => {
        if (!selected) return;
        setPasswordSaisi('');
        setPasswordModalOpen(true);
    };

    const handleConfirmSignature = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selected || !passwordSaisi) return;

        setProcessing(true);

        router.patch(route('requisitions.admin-decision', selected.id), {
            decision: 'approve',
            password: passwordSaisi,
        }, {
            preserveScroll: true,
            onFinish: () => setProcessing(false),
            onSuccess: () => {
                const updatedId = selected.id;
                setPasswordModalOpen(false);
                setSelected(null);
                setPasswordSaisi('');

                setRequisitions(prev => prev.filter(item => item.id !== updatedId));

                setToast({
                    type: 'success',
                    message: `Visa Administratif accordé avec succès sur ${selected.numero}. Transmis à la Directrice Générale.`
                });
                setTimeout(() => setToast(null), 5000);
            },
            onError: (errors) => {
                setToast({
                    type: 'error',
                    message: errors.password || 'Erreur lors de la signature administrative.'
                });
            }
        });
    };

    const handleReject = () => {
        if (!selected || !rejectionReason.trim()) {
            setToast({ type: 'error', message: 'Veuillez spécifier le motif du rejet.' });
            return;
        }

        setProcessing(true);

        router.patch(route('requisitions.admin-decision', selected.id), {
            decision: 'reject',
            password: 'skip',
            motif_rejet: rejectionReason,
        }, {
            preserveScroll: true,
            onFinish: () => setProcessing(false),
            onSuccess: () => {
                const updatedId = selected.id;
                setSelected(null);
                setRejecting(false);
                setRejectionReason('');

                setRequisitions(prev => prev.filter(item => item.id !== updatedId));

                setToast({
                    type: 'error',
                    message: `Réquisition ${selected.numero} renvoyée pour non-conformité administrative.`
                });
                setTimeout(() => setToast(null), 5000);
            },
            onError: (errors) => {
                setToast({
                    type: 'error',
                    message: errors.motif_rejet || 'Erreur lors du rejet.'
                });
            }
        });
    };

    // --- LOGIQUE D'IMPRESSION ET TÉLÉCHARGEMENT ---
    const handlePrintPreview = (req: RequisitionAdmin) => {
        setPrintReq(req);
    };

    const handleDownloadPdf = (id: string, numero: string) => {
        const url = route('requisitions.pdf', id);
        const link = document.createElement('a');
        link.href = url;
        link.download = `requisition-${numero}.pdf`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    useEffect(() => {
        if (!printReq) return;
        void openPrintPreview('bon-pasteur-print-zone')
            .then(() => setPrintReq(null));
    }, [printReq]);

    // Formatage temporaire pour OfficialPrintSheet
    const printRequisition = printReq ? {
        id: printReq.id,
        numero: printReq.numero,
        projet: printReq.projet,
        site: '',
        nature: printReq.nature,
        caisse: printReq.caisseAttribuee || 'Caisse principale',
        devise: printReq.devise,
        montantTotal: printReq.montantTotal,
        montantLettres: numberToWordsFR(printReq.montantTotal, printReq.devise),
        dateSoumission: printReq.dateSoumission,
        observation: printReq.observation ?? undefined,
        is_urgent: !!printReq.is_urgent,
        etapeActuelle: 'visa_admin' as const,
        articles: printReq.lignes.map((line) => ({
            id: line.id,
            activite: line.activite,
            codeBudget: line.codeAllocation || line.codeBudget || '',
            nature: printReq.nature,
            quantiteOuDuree: line.quantiteOuDuree,
            unite: line.unite,
            prixUnitaire: line.prixUnitaire,
            total: line.total,
            justificatifsCount: line.justificatifs.length,
            justificatifs: line.justificatifs.map((file) => ({
                id: file.id,
                description: file.nom,
                originalName: file.nom,
                date: '',
                montant: 0,
                fileUrl: file.fileUrl,
            })),
        })),
        signatures: [] as any, 
        initiateurNom: printReq.initiateurNom,
    } as unknown as RequisitionSuivi : null;

    return (
        <AppLayout>
            <Head title="Contrôle Administratif (Visa 3)" />
            
            <style>{`
                #bon-pasteur-print-zone { display: none; }
                @media print {
                    /* Impression en mode paysage exigée */
                    @page { size: landscape; }
                    body * { visibility: hidden !important; }
                    #bon-pasteur-print-zone,
                    #bon-pasteur-print-zone * { visibility: visible !important; }
                    #bon-pasteur-print-zone {
                        display: block !important;
                        position: absolute !important;
                        inset: 0 !important;
                        width: 100% !important;
                        min-height: 194mm !important;
                        background: white !important;
                        z-index: 2147483647 !important;
                    }
                    #bon-pasteur-official-sheet { width: 100% !important; }
                }
            `}</style>

            <div className="space-y-6 no-print">
                {/* En-tête */}
                <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E2E8F0] pb-4">
                    <div>
                        <nav className="text-[10px] font-bold uppercase tracking-widest text-[#B2BED6] mb-1.5 flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-[#F58F20]" />
                            <span className="text-[#F58F20]">Étape 3 du Workflow</span>
                            <span className="mx-1">/</span>
                            <span className="text-[#04326D]">PAM</span>
                        </nav>
                        <h1 className="text-xl font-bold text-[#0B192C]">
                            Contrôle Administratif & Visa
                        </h1>
                        <p className="text-[12px] text-gray-500 mt-1">
                            Manager Admin : <strong className="text-[#0B192C]">{user.name}</strong> • Vérification de la conformité institutionnelle.
                        </p>
                    </div>
                </header>

                {/* CHARTES GRAPHIQUES ET STATISTIQUES */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Carte 1: Dossiers en Attente */}
                    <div className="bg-white border border-[#B2BED6] rounded shadow-sm p-4 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Dossiers en attente</h3>
                                <div className="text-2xl font-black text-[#04326D] mt-1">{stats.pendingCount}</div>
                            </div>
                            <div className="p-2 bg-blue-50 rounded-full">
                                <Activity className="w-4 h-4 text-[#04326D]" />
                            </div>
                        </div>
                        <div className="mt-3 text-[11px] text-gray-500">
                            Dont <strong className="text-red-600">{stats.urgentCount}</strong> dossier(s) urgent(s)
                        </div>
                    </div>

                    {/* Carte 2: Répartition Achat vs Service */}
                    <div className="bg-white border border-[#B2BED6] rounded shadow-sm p-4 flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Répartition (En attente)</h3>
                            <PieChart className="w-4 h-4 text-gray-400" />
                        </div>
                        <div>
                            <div className="flex justify-between text-[11px] mb-1 font-semibold">
                                <span className="text-[#04326D]">Achats ({stats.achatsCount})</span>
                                <span className="text-[#F58F20]">Services ({stats.servicesCount})</span>
                            </div>
                            <div className="flex h-2 w-full rounded-full overflow-hidden bg-gray-100">
                                <div 
                                    style={{ width: stats.pendingCount ? `${(stats.achatsCount / stats.pendingCount) * 100}%` : '50%' }} 
                                    className="bg-[#04326D]" 
                                    title="Achats"
                                ></div>
                                <div 
                                    style={{ width: stats.pendingCount ? `${(stats.servicesCount / stats.pendingCount) * 100}%` : '50%' }} 
                                    className="bg-[#F58F20]" 
                                    title="Services"
                                ></div>
                            </div>
                        </div>
                    </div>

                    {/* Carte 3: Historique Global */}
                    <div className="bg-white border border-[#B2BED6] rounded shadow-sm p-4 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Volume Traité</h3>
                                <div className="text-2xl font-black text-gray-800 mt-1">{stats.historyCount}</div>
                            </div>
                            <div className="p-2 bg-gray-50 rounded-full border border-gray-100">
                                <BarChart3 className="w-4 h-4 text-gray-500" />
                            </div>
                        </div>
                        <div className="mt-3 flex gap-3 text-[11px] font-medium">
                            <span className="text-emerald-600 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>{stats.decaisseCount} décaissés</span>
                            <span className="text-red-600 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>{stats.rejetsCount} renvoyés</span>
                        </div>
                    </div>
                </section>

                {toast && (
                    <div className={`p-3.5 rounded text-xs font-semibold flex justify-between items-center gap-3 border shadow-sm ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-300' : 'bg-red-50 text-red-900 border-red-300'}`}>
                        <div className="flex items-center gap-2">
                            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-700" /> : <AlertCircle className="w-4 h-4 text-red-700" />}
                            <span>{toast.message}</span>
                        </div>
                        <button type="button" onClick={() => setToast(null)} className="underline text-[11px] hover:text-gray-900">Fermer</button>
                    </div>
                )}

                {/* TABLEAU DES RÉQUISITIONS À VISER */}
                <div className="bg-white border border-[#B2BED6] rounded shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-[#E2E8F0] flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-gray-50/50">
                        <div>
                            <h2 className="text-sm font-bold text-[#0B192C] uppercase tracking-wider flex items-center gap-2">
                                Dossiers en Attente de Visa Administratif
                                <span className="bg-[#04326D] text-white px-2 py-0.5 rounded-full text-[10px]">{filteredRequisitions.length}</span>
                            </h2>
                        </div>

                        {/* Filtres Actifs */}
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-1.5 bg-white border border-[#B2BED6] rounded px-2 py-1">
                                <Filter className="w-3.5 h-3.5 text-gray-400" />
                                <select 
                                    value={filterNature}
                                    onChange={(e) => setFilterNature(e.target.value)}
                                    className="text-xs border-none bg-transparent focus:ring-0 py-0.5 pl-1 pr-6 cursor-pointer text-gray-700 font-medium"
                                >
                                    <option value="All">Toutes Natures</option>
                                    <option value="Achat">Achats</option>
                                    <option value="Service">Services</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-1.5 bg-white border border-[#B2BED6] rounded px-2 py-1">
                                <AlertCircle className="w-3.5 h-3.5 text-gray-400" />
                                <select 
                                    value={filterUrgency}
                                    onChange={(e) => setFilterUrgency(e.target.value)}
                                    className="text-xs border-none bg-transparent focus:ring-0 py-0.5 pl-1 pr-6 cursor-pointer text-gray-700 font-medium"
                                >
                                    <option value="All">Toutes Urgences</option>
                                    <option value="Urgent">Urgents Uniquement</option>
                                    <option value="Normal">Normals</option>
                                </select>
                            </div>
                            <div className="relative">
                                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                    type="text"
                                    placeholder="Recherche rapide..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-8 pr-3 py-1.5 border border-[#B2BED6] rounded text-xs focus:outline-none focus:border-[#04326D] focus:ring-1 focus:ring-[#04326D] w-52 bg-white transition-all shadow-sm"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-[#0B192C] text-white uppercase text-[10px] font-bold tracking-wider">
                                    <th className="px-4 py-3">Numéro</th>
                                    <th className="px-4 py-3">Demandeur</th>
                                    <th className="px-4 py-3">Projet</th>
                                    <th className="px-4 py-3">Observation</th>
                                    <th className="px-4 py-3 text-right">Montant</th>
                                    <th className="px-4 py-3 text-center">Urgence</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E2E8F0] text-gray-700">
                                {filteredRequisitions.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-10 text-center text-gray-400 italic">
                                            Aucun dossier ne correspond à vos filtres.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRequisitions.map((item) => (
                                        <tr key={item.id} className="hover:bg-[#F9F9FF] transition">
                                            <td className="px-4 py-3.5 font-mono font-bold text-[#04326D] whitespace-nowrap">
                                                {item.numero}
                                            </td>
                                            <td className="px-4 py-3.5 whitespace-nowrap">
                                                <p className="font-bold text-[#0B192C]">{item.initiateurNom}</p>
                                                <p className="text-[10px] text-gray-400">{item.initiateurRole}</p>
                                            </td>
                                            <td className="px-4 py-3.5 font-semibold text-gray-700">
                                                {item.projet}
                                            </td>
                                            <td className="px-4 py-3.5 max-w-xs truncate" title={item.observation || ''}>
                                                {item.observation || item.lignes.map(l => l.activite).join(', ')}
                                            </td>
                                            <td className="px-4 py-3.5 text-right font-mono font-bold whitespace-nowrap text-[#0B192C]">
                                                {money(item.montantTotal, item.devise)}
                                            </td>
                                            <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                                {item.is_urgent ? (
                                                    <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded font-black text-[9px] uppercase shadow-sm">
                                                        URGENT
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 text-[10px] font-medium">Normal</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1">
                                                    {item.canCorrect && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setCorrecting({
                                                                id: item.id,
                                                                numero: item.numero,
                                                                nature: item.nature,
                                                                devise: item.devise,
                                                                caisse: item.caisseAttribuee || 'Caisse principale',
                                                                observation: item.observation,
                                                                motifRejet: item.motifRejet,
                                                                lignes: item.lignes.map((line) => ({
                                                                    id: line.id,
                                                                    activite: line.activite,
                                                                    codeBudget: line.codeBudget,
                                                                    nature: line.nature,
                                                                    quantiteOuDuree: line.quantiteOuDuree,
                                                                    unite: line.unite,
                                                                    prixUnitaire: line.prixUnitaire,
                                                                })),
                                                            })}
                                                            className="rounded border border-amber-600 px-2.5 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-50 transition"
                                                        >
                                                            Corriger
                                                        </button>
                                                    )}
                                                    {item.canDecide && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setSelected(item);
                                                                setRejecting(false);
                                                                setRejectionReason('');
                                                            }}
                                                            className="px-2.5 py-1 bg-[#04326D] hover:bg-[#06428f] text-white rounded font-bold text-[11px] shadow-sm transition"
                                                        >
                                                            Examiner & Viser
                                                        </button>
                                                    )}
                                                    <div className="w-px h-4 bg-gray-300 mx-1"></div>
                                                    <IconButton
                                                        title="Aperçu avant impression (Paysage)"
                                                        onClick={() => handlePrintPreview(item)}
                                                        icon={<Printer className="w-4 h-4" />}
                                                    />
                                                    <IconButton
                                                        title="Télécharger le PDF"
                                                        onClick={() => handleDownloadPdf(item.id, item.numero)}
                                                        icon={<Download className="w-4 h-4" />}
                                                    />
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

            {/* HISTORIQUE GLOBAL */}
            <section className="bg-white border border-[#B2BED6] rounded shadow-sm overflow-hidden mt-6 no-print">
                <header className="p-4 border-b border-[#E2E8F0] flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50/50">
                    <div>
                        <h2 className="text-[13px] font-bold text-[#0B192C] uppercase tracking-wider flex items-center gap-2">
                            Historique Global des Réquisitions
                            <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-[10px]">{filteredHistory.length}</span>
                        </h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1.5 bg-white border border-[#B2BED6] rounded px-2 py-1">
                            <Filter className="w-3.5 h-3.5 text-gray-400" />
                            <select 
                                value={historyStatusFilter}
                                onChange={(e) => setHistoryStatusFilter(e.target.value)}
                                className="text-xs border-none bg-transparent focus:ring-0 py-0.5 pl-1 pr-6 cursor-pointer text-gray-700 font-medium"
                            >
                                <option value="All">Tous les statuts</option>
                                <option value="En cours">En cours de traitement</option>
                                <option value="Décaissé">Décaissés</option>
                                <option value="Rejeté">Renvoyés / Rejetés</option>
                            </select>
                        </div>
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Rechercher historique..."
                                value={historySearch}
                                onChange={(e) => setHistorySearch(e.target.value)}
                                className="pl-8 pr-3 py-1.5 border border-[#B2BED6] rounded text-xs focus:outline-none focus:border-[#04326D] focus:ring-1 focus:ring-[#04326D] w-52 bg-white transition shadow-sm"
                            />
                        </div>
                    </div>
                </header>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="bg-[#0B192C] text-white uppercase text-[10px] font-bold tracking-wider">
                                <th className="px-4 py-3">Numéro</th>
                                <th className="px-4 py-3">Initiateur</th>
                                <th className="px-4 py-3">Projet</th>
                                <th className="px-4 py-3 text-right">Montant</th>
                                <th className="px-4 py-3">Statut</th>
                                <th className="px-4 py-3 text-right">Historique & PDF</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2E8F0] text-gray-700">
                            {filteredHistory.map((item) => (
                                <tr key={item.id} className="hover:bg-[#F9F9FF] transition">
                                    <td className="px-4 py-3 font-mono font-bold text-[#04326D]">{item.numero}</td>
                                    <td className="px-4 py-3 font-semibold">{item.initiateurNom}</td>
                                    <td className="px-4 py-3">{item.projet}</td>
                                    <td className="px-4 py-3 text-right font-mono font-bold">{money(item.montantTotal, item.devise)}</td>
                                    <td className="px-4 py-3">
                                        <span className={`rounded px-2.5 py-1 text-[10px] font-bold border ${
                                            item.statusCode.startsWith('returned_')
                                                ? 'bg-red-50 text-red-800 border-red-200'
                                                : item.statusCode === 'decaisse'
                                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                : 'bg-blue-50 text-[#04326D] border-blue-200'
                                        }`}>
                                            {item.is_urgent ? 'URGENT · ' : ''}{item.statusLabel}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right whitespace-nowrap">
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                type="button"
                                                onClick={() => setHistorySelected(item)}
                                                className="rounded border border-[#04326D] px-2.5 py-1 text-[11px] font-bold text-[#04326D] hover:bg-blue-50 transition"
                                            >
                                                Consulter Visas
                                            </button>
                                            <div className="w-px h-4 bg-gray-300 mx-1"></div>
                                            <IconButton
                                                title="Télécharger le PDF"
                                                onClick={() => handleDownloadPdf(item.id, item.numero)}
                                                icon={<Download className="w-4 h-4" />}
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredHistory.length === 0 && (
                                <tr><td colSpan={6} className="py-8 text-center text-gray-400 italic">Aucune réquisition dans l'historique selon vos critères.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* MODALE D'EXAMEN ET VISA ADMINISTRATIF */}
            {selected && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in no-print">
                    <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-white border border-[#B2BED6] shadow-2xl rounded p-6 space-y-5 animate-slide-down">
                        <header className="flex items-start justify-between border-b pb-3">
                            <div>
                                <span className="text-[10px] uppercase font-bold text-[#F58F20] tracking-wider flex items-center gap-1.5">
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    VISA 3 : CONTRÔLE ADMINISTRATIF
                                </span>
                                <h2 className="text-base font-bold text-[#0B192C] mt-1">
                                    Réquisition N° {selected.numero} ({selected.nature})
                                </h2>
                                <p className="text-[11px] text-gray-500 mt-0.5">
                                    Initiée par <strong className="text-gray-800">{selected.initiateurNom}</strong> • Projet : {selected.projet} • Date : {selected.dateSoumission}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelected(null)}
                                className="text-gray-400 hover:text-gray-600 font-bold transition"
                            >
                                <Eye className="w-5 h-5 hidden" />
                                &times;
                            </button>
                        </header>

                        {selected.observation && (
                            <div className="p-3 bg-amber-50 border-l-4 border-[#F58F20] text-xs text-gray-800 rounded-r shadow-sm">
                                <strong>Observation / Contexte :</strong> {selected.observation}
                            </div>
                        )}

                        {/* TABLEAU DES DEMANDES AVEC LES DEVIS */}
                        <div>
                            <h3 className="text-xs font-bold text-[#0B192C] uppercase tracking-wider mb-2">
                                Articles & Devis Attachés (Conformité)
                            </h3>
                            <div className="border border-[#B2BED6] rounded overflow-hidden shadow-sm">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-[#0B192C] text-white font-bold tracking-wider uppercase text-[10px]">
                                        <tr>
                                            <th className="p-2.5">Désignation</th>
                                            <th className="p-2.5">Code Budget (MP)</th>
                                            <th className="p-2.5 text-right">Qté/Durée</th>
                                            <th className="p-2.5 text-right">Prix Unitaire</th>
                                            <th className="p-2.5 text-right">Total</th>
                                            <th className="p-2.5">Pièces Jointes</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 text-gray-700">
                                        {selected.lignes.map((line) => (
                                            <tr key={line.id} className="hover:bg-gray-50 transition">
                                                <td className="p-2.5 font-medium">{line.activite}</td>
                                                <td className="p-2.5 font-mono font-bold text-[#04326D]">
                                                    {line.codeAllocation || line.codeBudget || '—'}
                                                </td>
                                                <td className="p-2.5 text-right">{line.quantiteOuDuree} {line.unite}</td>
                                                <td className="p-2.5 text-right">{money(line.prixUnitaire, selected.devise)}</td>
                                                <td className="p-2.5 text-right font-bold text-[#0B192C]">{money(line.total, selected.devise)}</td>
                                                <td className="p-2.5">
                                                    {line.justificatifs.length > 0 ? (
                                                        <div className="space-y-1">
                                                            {line.justificatifs.map(f => (
                                                                <div key={f.id} className="bg-blue-50 text-[#04326D] px-2 py-1 rounded text-[10px] flex items-center justify-between border border-blue-100">
                                                                    <span className="truncate max-w-[120px] font-semibold" title={f.description}>{f.nom}</span>
                                                                    {f.fileUrl && (
                                                                        <a href={f.fileUrl} target="_blank" rel="noreferrer" className="underline font-bold ml-2">
                                                                            Ouvrir
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400 italic text-[10px]">Aucun justificatif</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-gray-50 font-bold border-t border-gray-200">
                                        <tr>
                                            <td colSpan={4} className="p-2.5 text-right uppercase tracking-wider text-[10px] text-gray-500">Montant Total Général :</td>
                                            <td className="p-2.5 text-right text-[#04326D] text-sm font-mono">
                                                {money(selected.montantTotal, selected.devise)}
                                            </td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        {/* ACTIONS */}
                        {selected.canDecide && <div className="border-t pt-4 space-y-3">
                            {!rejecting ? (
                                <div className="flex items-center justify-between">
                                    <button
                                        type="button"
                                        onClick={() => setRejecting(true)}
                                        className="px-3.5 py-1.5 border border-red-300 text-red-600 hover:bg-red-50 rounded text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                                    >
                                        <Ban className="w-3.5 h-3.5" />
                                        Rejeter (Non-conformité)
                                    </button>

                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setSelected(null)}
                                            className="px-4 py-1.5 border rounded text-xs font-semibold text-gray-600 hover:bg-gray-50 transition shadow-sm"
                                        >
                                            Fermer
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleTriggerApprove}
                                            className="px-4 py-1.5 bg-[#10B981] hover:bg-[#059669] text-white rounded text-xs font-bold shadow flex items-center gap-1.5 transition"
                                        >
                                            <span>Accorder Visa (Visa 3)</span>
                                            <span>&rarr;</span>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-red-50 p-4 rounded border border-red-200 space-y-3 shadow-inner">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-xs font-bold text-red-800 uppercase flex items-center gap-1.5">
                                            <Ban className="w-3.5 h-3.5" /> Motif du Rejet Administratif
                                        </h4>
                                        <button
                                            type="button"
                                            onClick={() => setRejecting(false)}
                                            className="text-xs text-gray-500 hover:text-gray-800 font-semibold transition"
                                        >
                                            Annuler
                                        </button>
                                    </div>
                                    <textarea
                                        rows={3}
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        placeholder="Précisez le problème administratif ou institutionnel..."
                                        className="w-full border border-red-300 rounded p-2 text-xs focus:outline-none focus:ring-1 focus:ring-red-500 bg-white shadow-sm"
                                        required
                                    ></textarea>
                                    <div className="flex justify-end gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setRejecting(false)}
                                            className="px-3 py-1.5 border border-red-200 rounded text-xs bg-white text-gray-700 hover:bg-gray-50 transition"
                                        >
                                            Annuler
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleReject}
                                            disabled={processing}
                                            className="px-4 py-1.5 bg-[#DC2626] hover:bg-[#b91c1c] text-white rounded text-xs font-bold shadow transition"
                                        >
                                            {processing ? 'Renvoi en cours...' : 'Confirmer le Rejet Administratif'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>}
                    </div>
                </div>
            )}

            {/* MODALE D'AUTHENTIFICATION DE MOT DE PASSE POUR SIGNER */}
            {passwordModalOpen && selected && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 animate-fade-in no-print">
                    <div className="bg-white rounded border-2 border-[#04326D] shadow-2xl max-w-sm w-full p-6 space-y-4 animate-slide-down">
                        <div className="text-center border-b pb-3">
                            <div className="w-10 h-10 mx-auto rounded-full bg-blue-50 flex items-center justify-center mb-2 shadow-sm">
                                <Lock className="w-5 h-5 text-[#04326D]" />
                            </div>
                            <h3 className="text-[13px] font-black uppercase text-[#0B192C] tracking-wider">
                                Visa de Contrôle Administratif
                            </h3>
                            <p className="text-[10px] text-gray-500 mt-1">
                                Signataire : <strong>{user.name}</strong> (PAM)
                            </p>
                        </div>

                        <form onSubmit={handleConfirmSignature} className="space-y-4">
                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 mb-1.5">
                                    Mot de passe pour signer le visa 3 :
                                </label>
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    value={passwordSaisi}
                                    onChange={(e) => setPasswordSaisi(e.target.value)}
                                    className="w-full border border-gray-300 rounded p-2 text-sm tracking-widest text-center focus:outline-none focus:border-[#04326D] focus:ring-1 focus:ring-[#04326D] transition shadow-sm"
                                    autoFocus
                                    required
                                />
                            </div>

                            <p className="text-[10px] text-gray-500 leading-tight bg-gray-50 p-2 rounded border border-gray-100">
                                Un certificat électronique unique sera émis et la demande sera transmise à la Directrice Générale.
                            </p>

                            <div className="flex justify-end gap-2 pt-2 border-t">
                                <button
                                    type="button"
                                    onClick={() => setPasswordModalOpen(false)}
                                    className="px-3.5 py-1.5 border border-gray-300 rounded text-xs font-semibold text-gray-600 hover:bg-gray-50 transition shadow-sm"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="px-4 py-1.5 bg-[#10B981] hover:bg-[#059669] text-white font-bold text-xs rounded shadow transition disabled:opacity-50"
                                >
                                    {processing ? 'Signature...' : 'Signer & Valider'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Formulaire de Correction */}
            {correcting && (
                <div className="no-print">
                    <RequisitionCorrectionForm
                        key={correcting.id}
                        requisition={correcting}
                        onClose={() => setCorrecting(null)}
                        onSuccess={() => {
                            setRequisitions((items) => items.filter((item) => item.id !== correcting.id));
                            setCorrecting(null);
                            setToast({
                                type: 'success',
                                message: `Réquisition ${correcting.numero} corrigée et resoumise à la Direction.`,
                            });
                        }}
                    />
                </div>
            )}

            {/* Historique Modal */}
            {historySelected && (
                <div
                    className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 animate-fade-in no-print"
                    onClick={() => setHistorySelected(null)}
                >
                    <div
                        className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded border border-[#B2BED6] bg-white p-6 shadow-2xl space-y-5 animate-slide-down"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <header className="flex items-start justify-between border-b pb-3">
                            <div>
                                <h2 className="text-base font-bold text-[#0B192C]">Réquisition {historySelected.numero}</h2>
                                <p className="mt-1 text-xs text-gray-500">
                                    Initiateur: <strong>{historySelected.initiateurNom}</strong> · Projet: <strong>{historySelected.projet}</strong> · Montant: <strong className="text-[#04326D] font-mono">{money(historySelected.montantTotal, historySelected.devise)}</strong>
                                </p>
                            </div>
                            <button type="button" onClick={() => setHistorySelected(null)} aria-label="Fermer" className="text-gray-400 hover:text-gray-600 transition">
                                <Eye className="w-5 h-5 hidden" />
                                <span className="text-2xl leading-none">&times;</span>
                            </button>
                        </header>
                        <div>
                            <h3 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-[#F58F20]">Circuit d’approbation</h3>
                            <WorkflowStepper statusCode={historySelected.statusCode} isUrgent={historySelected.is_urgent} />
                        </div>
                        <div>
                            <h3 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-[#F58F20]">Historique des visas électroniques</h3>
                            <SignatureHistory signatures={historySelected.signatures} />
                        </div>
                    </div>
                </div>
            )}

            {/* ZONE D'IMPRESSION CACHÉE */}
            {printRequisition && (
                <div id="bon-pasteur-print-zone">
                    <OfficialPrintSheet requisition={printRequisition} />
                </div>
            )}

        </AppLayout>
    );
}

// Bouton Icône réutilisable (Design standardisé)
function IconButton({ title, onClick, icon }: { title: string; onClick: () => void; icon: ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={title}
            className="p-1.5 text-gray-500 hover:text-[#04326D] hover:bg-blue-50 rounded transition duration-200"
        >
            {icon}
        </button>
    );
}