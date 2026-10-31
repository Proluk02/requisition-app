import { useState, useMemo, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Head, router, usePage, Link } from '@inertiajs/react';
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
    Activity,
    Wallet,
    FolderKanban,
    Building2,
    TrendingUp,
    AlertTriangle
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
    project_id?: number | string | null;
    initiateurNom: string;
    initiateurRole: string;
    nature: 'Achat' | 'Service';
    devise: 'USD' | 'FC' | 'EUR';
    montantTotal: number;
    caisseAttribuee?: string;
    observation: string | null;
    derniere_observation?: string | null;
    is_urgent?: boolean;
    is_delayed?: boolean; // NOUVEAU: Pour la gestion des 48h
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
    project_id?: number | string | null;
    initiateurNom: string;
    nature: 'Achat' | 'Service';
    devise: 'USD' | 'FC' | 'EUR';
    montantTotal: number;
    caisseAttribuee: string;
    statusCode: string;
    statusLabel: string;
    is_urgent: boolean;
    dateSoumission?: string;
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

interface AdminStats {
    en_attente_visa: number;
    urgences_count: number;
    total_dossiers: number;
    validees_count: number;
    renvoyees_finance_count: number;
    total_usd: number;
    total_fc: number;
    decaisse_usd: number;
    decaisse_fc: number;
}

interface ProjectStat {
    id: number | string;
    name: string;
    full_name?: string | null;
    count: number;
    en_attente_pam: number;
    total_usd: number;
    total_fc: number;
}

interface CaisseStat {
    id: number | string;
    name: string;
    code?: string;
    devise: string;
    solde_actuel: number;
    is_ouverte: boolean;
    total_dossiers: number;
    total_usd: number;
    total_fc: number;
    decaisse_usd: number;
}

interface Props extends PageProps {
    requisitions?: RequisitionAdmin[];
    historyRequisitions?: HistoryRequisition[];
    adminStats?: AdminStats;
    projectsStats?: ProjectStat[];
    caissesStats?: CaisseStat[];
    isInterim?: boolean;
}

const money = (amount: number, currency: string) =>
    `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;

export default function AdminManagerDashboard({
    requisitions: initialRequisitions = [],
    historyRequisitions = [],
    adminStats,
    projectsStats = [],
    caissesStats = [],
    isInterim = false,
}: Props) {
    const { auth } = usePage<PageProps>().props;
    const user = auth.user;

    const [requisitions, setRequisitions] = useState<RequisitionAdmin[]>(initialRequisitions);
    
    // Filtres table à viser
    const [search, setSearch] = useState('');
    const [filterNature, setFilterNature] = useState<string>('All');
    const [filterUrgency, setFilterUrgency] = useState<string>('All');
    const [filterProject, setFilterProject] = useState<string>('All');
    
    // Filtres table historique
    const [historySearch, setHistorySearch] = useState('');
    const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('All');

    // Modales & États
    const [selected, setSelected] = useState<RequisitionAdmin | null>(null);
    const [historySelected, setHistorySelected] = useState<HistoryRequisition | null>(null);
    const [correcting, setCorrecting] = useState<RequisitionCorrectionData | null>(null);
    const [rejecting, setRejecting] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [observationApprobation, setObservationApprobation] = useState('');

    // Impression / téléchargement
    const [printReq, setPrintReq] = useState<RequisitionAdmin | null>(null);

    // Sécurité Visa
    const [passwordModalOpen, setPasswordModalOpen] = useState(false);
    const [passwordSaisi, setPasswordSaisi] = useState('');
    const [processing, setProcessing] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // --- STATISTIQUES ---
    const stats = useMemo(() => {
        const pendingCount = requisitions.length;
        const urgentCount = requisitions.filter(r => r.is_urgent).length;
        const totalUSD = requisitions.filter(r => r.devise === 'USD').reduce((acc, r) => acc + r.montantTotal, 0);
        const totalFC = requisitions.filter(r => r.devise === 'FC' || (r.devise as string) === 'CDF').reduce((acc, r) => acc + r.montantTotal, 0);
        
        return {
            pendingCount: adminStats?.en_attente_visa ?? pendingCount,
            urgentCount: adminStats?.urgences_count ?? urgentCount,
            totalDossiers: adminStats?.total_dossiers ?? historyRequisitions.length,
            valideesCount: adminStats?.validees_count ?? 0,
            renvoyeesFinanceCount: adminStats?.renvoyees_finance_count ?? 0,
            totalUSD: adminStats?.total_usd ?? totalUSD,
            totalFC: adminStats?.total_fc ?? totalFC,
        };
    }, [requisitions, adminStats, historyRequisitions]);

    // Projets disponibles pour filtre
    const projectOptions = useMemo(() => {
        const set = new Set<string>();
        requisitions.forEach(r => { if (r.projet) set.add(r.projet); });
        projectsStats.forEach(p => { if (p.name) set.add(p.name); });
        return Array.from(set).sort();
    }, [requisitions, projectsStats]);

    // Filtrage des dossiers à viser
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
            const matchesProject = filterProject === 'All' || item.projet === filterProject;

            return matchesSearch && matchesNature && matchesUrgency && matchesProject;
        });
    }, [requisitions, search, filterNature, filterUrgency, filterProject]);

    // Filtrage de l'historique
    const filteredHistory = useMemo(() => {
        const q = historySearch.toLowerCase();
        return historyRequisitions.filter(item => {
            const matchesSearch = item.numero.toLowerCase().includes(q) ||
                item.projet.toLowerCase().includes(q) ||
                item.initiateurNom.toLowerCase().includes(q);
            
            let matchesStatus = true;
            if (historyStatusFilter === 'Rejeté') matchesStatus = item.statusCode.startsWith('returned_') || item.statusCode === 'rejetee';
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
            observation: observationApprobation.trim() || null,
        }, {
            preserveScroll: true,
            onFinish: () => setProcessing(false),
            onSuccess: () => {
                const updatedId = selected.id;
                setPasswordModalOpen(false);
                setSelected(null);
                setPasswordSaisi('');
                setObservationApprobation('');

                setRequisitions(prev => prev.filter(item => item.id !== updatedId));

                setToast({
                    type: 'success',
                    message: `Visa PAM accordé avec succès sur ${selected.numero}. Transmis au service Finance.`
                });
                setTimeout(() => setToast(null), 5000);
            },
            onError: (errors) => {
                setToast({
                    type: 'error',
                    message: errors.password || errors.pin || 'Erreur lors de la signature administrative.'
                });
            }
        });
    };

    const handleReject = () => {
        if (!selected || !rejectionReason.trim()) {
            setToast({ type: 'error', message: 'Veuillez spécifier obligatoirement le motif du rejet administratif.' });
            return;
        }

        setProcessing(true);

        router.patch(route('requisitions.admin-decision', selected.id), {
            decision: 'reject',
            password: 'skip',
            motif_rejet: rejectionReason.trim(),
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
                    message: `Réquisition ${selected.numero} retournée au Chef de Projet pour arbitrage.`
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

    // Impression
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
            <Head title="Contrôle Administratif & PAM" />
            
            <style>{`
                #bon-pasteur-print-zone { display: none; }
                @media print {
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
                {/* BANNIÈRE SI INTÉRIM DIRECTION ACTIF */}
                {isInterim && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-500 text-white rounded shadow-sm">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-wider text-amber-900">
                                    Intérim Direction Générale Actif (Pour Ordre / P.O.)
                                </h3>
                                <p className="text-[11px] text-amber-800 mt-0.5">
                                    Vous disposez des prérogatives officielles d'approbation finale des bons à payer pour la Direction Générale.
                                </p>
                            </div>
                        </div>
                        <Link
                            href={route('director.dashboard')}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded shadow transition whitespace-nowrap"
                        >
                            Accéder au Dashboard Direction &rarr;
                        </Link>
                    </div>
                )}

                {/* En-tête */}
                <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E2E8F0] pb-4">
                    <div>
                        <nav className="text-[10px] font-bold uppercase tracking-widest text-[#B2BED6] mb-1.5 flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-[#F58F20]" />
                            <span className="text-[#F58F20]">Étape 2 du Workflow</span>
                            <span className="mx-1">/</span>
                            <span className="text-[#04326D]">PAM (Programme Administration Manager)</span>
                        </nav>
                        <h1 className="text-xl font-bold text-[#0B192C]">
                            Supervision & Contrôle Administratif (PAM)
                        </h1>
                        <p className="text-[12px] text-gray-500 mt-1">
                            Manager Admin : <strong className="text-[#0B192C]">{user.name}</strong> • Examen administratif avant le contrôle financier.
                        </p>
                    </div>
                </header>

                {/* 4 CARTES KPI STATISTIQUES */}
                <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white border border-[#B2BED6] rounded shadow-sm p-4 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Dossiers à Viser</h3>
                                <div className="text-2xl font-black text-[#04326D] mt-1">{stats.pendingCount}</div>
                            </div>
                            <div className="p-2 bg-blue-50 rounded-full">
                                <Activity className="w-4 h-4 text-[#04326D]" />
                            </div>
                        </div>
                        <div className="mt-3 text-[11px] text-gray-500 flex items-center justify-between">
                            <span>Urgences :</span>
                            <span className="font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                                {stats.urgentCount} dossier(s)
                            </span>
                        </div>
                    </div>

                    <div className="bg-white border border-[#B2BED6] rounded shadow-sm p-4 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Volume Global USD</h3>
                                <div className="text-lg font-black text-[#0B192C] mt-1 font-mono">
                                    {money(stats.totalUSD, 'USD')}
                                </div>
                            </div>
                            <div className="p-2 bg-emerald-50 rounded-full">
                                <TrendingUp className="w-4 h-4 text-emerald-600" />
                            </div>
                        </div>
                        <div className="mt-3 text-[11px] text-gray-500 flex items-center justify-between">
                            <span>Décaissements effectués :</span>
                            <span className="font-bold text-emerald-700">
                                {money(adminStats?.decaisse_usd ?? 0, 'USD')}
                            </span>
                        </div>
                    </div>

                    <div className="bg-white border border-[#B2BED6] rounded shadow-sm p-4 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Volume Global FC</h3>
                                <div className="text-lg font-black text-[#0B192C] mt-1 font-mono">
                                    {money(stats.totalFC, 'FC')}
                                </div>
                            </div>
                            <div className="p-2 bg-amber-50 rounded-full">
                                <Wallet className="w-4 h-4 text-[#F58F20]" />
                            </div>
                        </div>
                        <div className="mt-3 text-[11px] text-gray-500 flex items-center justify-between">
                            <span>Total réquisitions :</span>
                            <span className="font-bold text-gray-700">{stats.totalDossiers} dossiers</span>
                        </div>
                    </div>

                    <div className="bg-white border border-[#B2BED6] rounded shadow-sm p-4 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Flux Administratif</h3>
                                <div className="text-lg font-black text-gray-800 mt-1">
                                    {stats.valideesCount} <span className="text-xs font-normal text-gray-500">visés</span>
                                </div>
                            </div>
                            <div className="p-2 bg-purple-50 rounded-full">
                                <ShieldCheck className="w-4 h-4 text-purple-600" />
                            </div>
                        </div>
                        <div className="mt-3 text-[11px] text-gray-500 flex items-center justify-between">
                            <span>Renvoyés au Chef de Projet :</span>
                            <span className="font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                                {stats.renvoyeesFinanceCount}
                            </span>
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

                {/* TABLE PRINCIPALE : DOSSIERS EN ATTENTE DE VISA PAM */}
                <div className="bg-white border border-[#B2BED6] rounded shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-[#E2E8F0] flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-gray-50/50">
                        <div>
                            <h2 className="text-sm font-bold text-[#0B192C] uppercase tracking-wider flex items-center gap-2">
                                Dossiers en Attente de Visa PAM
                                <span className="bg-[#04326D] text-white px-2 py-0.5 rounded-full text-[10px]">{filteredRequisitions.length}</span>
                            </h2>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-1.5 bg-white border border-[#B2BED6] rounded px-2 py-1">
                                <FolderKanban className="w-3.5 h-3.5 text-gray-400" />
                                <select 
                                    value={filterProject}
                                    onChange={(e) => setFilterProject(e.target.value)}
                                    className="text-xs border-none bg-transparent focus:ring-0 py-0.5 pl-1 pr-6 cursor-pointer text-gray-700 font-medium"
                                >
                                    <option value="All">Tous Projets</option>
                                    {projectOptions.map(p => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>
                            </div>
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
                                            Aucun dossier en attente de visa du PAM.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRequisitions.map((item) => (
                                        <tr key={item.id} className={`transition ${item.is_delayed ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-[#F9F9FF]'}`}>
                                            <td className="px-4 py-3.5 whitespace-nowrap">
                                                <div className="flex items-center gap-1.5">
                                                    {item.is_delayed && (
                                                        <AlertTriangle className="w-4 h-4 text-red-600 animate-pulse" aria-label="Délai de traitement dépassé (> 48h)" />
                                                    )}
                                                    <span className={`font-mono font-bold ${item.is_delayed ? 'text-red-700' : 'text-[#04326D]'}`}>
                                                        {item.numero}
                                                    </span>
                                                </div>
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
                                                                setObservationApprobation('');
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

                {/* SYNTHÈSE COMPACTE : PROJETS ET CAISSES */}
                {(projectsStats.length > 0 || caissesStats.length > 0) && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="bg-white border border-[#B2BED6] rounded shadow-sm overflow-hidden">
                            <div className="p-3 border-b border-[#E2E8F0] bg-gray-50 flex justify-between items-center">
                                <h3 className="text-xs font-bold text-[#0B192C] uppercase flex items-center gap-1.5">
                                    <Building2 className="w-3.5 h-3.5 text-[#04326D]" />
                                    Synthèse par Projet
                                </h3>
                                <span className="text-[10px] text-gray-500 font-semibold">{projectsStats.length} projets</span>
                            </div>
                            <div className="max-h-56 overflow-y-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-[#0B192C] text-white text-[9px] uppercase font-bold sticky top-0">
                                        <tr>
                                            <th className="px-3 py-2">Projet</th>
                                            <th className="px-3 py-2 text-center">Dossiers</th>
                                            <th className="px-3 py-2 text-center">À Viser</th>
                                            <th className="px-3 py-2 text-right">Total USD</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-gray-700 text-[11px]">
                                        {projectsStats.map((p) => (
                                            <tr key={p.id} className="hover:bg-gray-50">
                                                <td className="px-3 py-2 font-bold text-[#04326D] truncate max-w-[140px]" title={p.name}>
                                                    {p.name}
                                                </td>
                                                <td className="px-3 py-2 text-center">{p.count}</td>
                                                <td className="px-3 py-2 text-center">
                                                    {p.en_attente_pam > 0 ? (
                                                        <span className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                                            {p.en_attente_pam}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400">0</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-right font-mono font-bold">{money(p.total_usd, 'USD')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="bg-white border border-[#B2BED6] rounded shadow-sm overflow-hidden">
                            <div className="p-3 border-b border-[#E2E8F0] bg-gray-50 flex justify-between items-center">
                                <h3 className="text-xs font-bold text-[#0B192C] uppercase flex items-center gap-1.5">
                                    <Wallet className="w-3.5 h-3.5 text-[#04326D]" />
                                    Situation des Caisses
                                </h3>
                                <span className="text-[10px] text-gray-500 font-semibold">{caissesStats.length} caisses</span>
                            </div>
                            <div className="max-h-56 overflow-y-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-[#0B192C] text-white text-[9px] uppercase font-bold sticky top-0">
                                        <tr>
                                            <th className="px-3 py-2">Caisse</th>
                                            <th className="px-3 py-2 text-center">Statut</th>
                                            <th className="px-3 py-2 text-right">Solde Actuel</th>
                                            <th className="px-3 py-2 text-center">Dossiers</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-gray-700 text-[11px]">
                                        {caissesStats.map((c) => (
                                            <tr key={c.id} className="hover:bg-gray-50">
                                                <td className="px-3 py-2 font-bold text-[#0B192C] truncate max-w-[140px]" title={c.name}>
                                                    {c.name}
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                    {c.is_ouverte ? (
                                                        <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded text-[9px] font-bold">
                                                            Ouverte
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-500 text-[9px]">Fermée</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-right font-mono font-bold text-[#04326D]">
                                                    {money(c.solde_actuel, c.devise)}
                                                </td>
                                                <td className="px-3 py-2 text-center">{c.total_dossiers}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* HISTORIQUE GLOBAL DES RÉQUISITIONS */}
                <section className="bg-white border border-[#B2BED6] rounded shadow-sm overflow-hidden mt-6">
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
            </div>

            {/* MODALE D'EXAMEN ET VISA ADMINISTRATIF PAM */}
            {selected && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in no-print">
                    <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-white border border-[#B2BED6] shadow-2xl rounded p-6 space-y-5 animate-slide-down">
                        <header className="flex items-start justify-between border-b pb-3">
                            <div>
                                <span className="text-[10px] uppercase font-bold text-[#F58F20] tracking-wider flex items-center gap-1.5">
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    VISA 2 : EXAMEN & CONTRÔLE ADMINISTRATIF (PAM)
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

                        {selected.derniere_observation && (
                            <div className="p-3 bg-blue-50 border-l-4 border-[#04326D] text-xs text-gray-800 rounded-r shadow-sm">
                                <strong>Dernière remarque enregistrée :</strong> {selected.derniere_observation}
                            </div>
                        )}

                        {/* TABLEAU DES DEMANDES ET JUSTIFICATIFS */}
                        <div>
                            <h3 className="text-xs font-bold text-[#0B192C] uppercase tracking-wider mb-2">
                                Articles & Devis Attachés (Conformité Administrative)
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

                        {/* ACTIONS DE DÉCISION DU PAM */}
                        {selected.canDecide && (
                            <div className="border-t pt-4 space-y-3">
                                {!rejecting ? (
                                    <div className="space-y-3">
                                        {/* Champ d'observation optionnel du PAM à l'approbation */}
                                        <div>
                                            <label className="block text-[11px] font-bold text-gray-700 mb-1">
                                                Observations du PAM (Optionnel lors de la validation) :
                                            </label>
                                            <textarea
                                                rows={2}
                                                value={observationApprobation}
                                                onChange={(e) => setObservationApprobation(e.target.value)}
                                                placeholder="Ajouter une observation ou recommandation administrative pour la Finance et la Direction..."
                                                className="w-full border border-gray-300 rounded p-2 text-xs focus:outline-none focus:border-[#04326D] focus:ring-1 focus:ring-[#04326D]"
                                            />
                                        </div>

                                        <div className="flex items-center justify-between pt-2">
                                            <button
                                                type="button"
                                                onClick={() => setRejecting(true)}
                                                className="px-3.5 py-1.5 border border-red-300 text-red-600 hover:bg-red-50 rounded text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                                            >
                                                <Ban className="w-3.5 h-3.5" />
                                                Rejeter / Renvoyer au Chef de Projet
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
                                                    <span>Accorder Visa PAM</span>
                                                    <span>&rarr;</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-red-50 p-4 rounded border border-red-200 space-y-3 shadow-inner">
                                        <div className="flex justify-between items-center">
                                            <h4 className="text-xs font-bold text-red-800 uppercase flex items-center gap-1.5">
                                                <Ban className="w-3.5 h-3.5" /> Motif du Rejet Administratif (Retour au Chef de Projet) *
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
                                            placeholder="Précisez obligatoirement le motif du rejet administratif qui sera transmis au Project Manager..."
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
                                                disabled={processing || !rejectionReason.trim()}
                                                className="px-4 py-1.5 bg-[#DC2626] hover:bg-[#b91c1c] text-white rounded text-xs font-bold shadow transition disabled:opacity-50"
                                            >
                                                {processing ? 'Renvoi en cours...' : 'Confirmer le Rejet au Chef de Projet'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MODALE D'AUTHENTIFICATION MOT DE PASSE DU PAM */}
            {passwordModalOpen && selected && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 animate-fade-in no-print">
                    <div className="bg-white rounded border-2 border-[#04326D] shadow-2xl max-w-sm w-full p-6 space-y-4 animate-slide-down">
                        <div className="text-center border-b pb-3">
                            <div className="w-10 h-10 mx-auto rounded-full bg-blue-50 flex items-center justify-center mb-2 shadow-sm">
                                <Lock className="w-5 h-5 text-[#04326D]" />
                            </div>
                            <h3 className="text-[13px] font-black uppercase text-[#0B192C] tracking-wider">
                                Visa Administratif du PAM
                            </h3>
                            <p className="text-[10px] text-gray-500 mt-1">
                                Signataire : <strong>{user.name}</strong> (PAM)
                            </p>
                        </div>

                        <form onSubmit={handleConfirmSignature} className="space-y-4">
                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 mb-1.5">
                                    Mot de passe pour signer le visa du PAM :
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
                                Un certificat électronique unique sera apposé et la demande sera transmise au service Finance pour contrôle budgétaire.
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
                                message: `Réquisition ${correcting.numero} corrigée et resoumise avec succès.`,
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