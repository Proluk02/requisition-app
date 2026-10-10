import { useState, useMemo } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { PageProps } from '@/types';
import RequisitionCorrectionForm, { type RequisitionCorrectionData } from '@/Components/RequisitionCorrectionForm';
import {
    Wallet,
    ShieldCheck,
    AlertCircle,
    CheckCircle2,
    X,
    Ban,
    Lock,
    KeyRound,
    Building2,
    PieChart,
    AlertTriangle,
} from 'lucide-react';

interface FinanceJustificatif {
    id: string;
    nom: string;
    description: string;
    montant: number;
    fileUrl: string | null;
}

interface FinanceLine {
    id: string;
    activite: string;
    codeBudget: string;
    codeAllocation: string | null;
    libelleAllocation?: string | null;
    nature: 'Achat' | 'Service';
    quantiteOuDuree: number;
    unite: string;
    prixUnitaire: number;
    total: number;
    budget_solde_actuel?: number | null;
    budget_initial?: number | null;
    justificatifs: FinanceJustificatif[];
}

interface FinanceRequisition {
    id: string;
    numero: string;
    projet: string;
    project_id?: string;
    user_id?: string;
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
    financeRejected: boolean;
    dateSoumission: string;
    lignes: FinanceLine[];
}

interface ProjectItem {
    id: string;
    name: string;
}

interface UserItem {
    id: string;
    name: string;
    email: string;
}

interface CaisseSummaryItem {
    id: string;
    name: string;
    code: string;
    devise: string;
    solde_actuel: number;
    is_ouverte: boolean;
    cashiers_names: string;
}

interface CashRegisterOption {
    id: string;
    name: string;
    devise: string;
}

interface BudgetLineClientItem {
    id: string;
    project_id: string;
    code: string;
    libelle: string;
    normalizedCode: string;
    solde: number;
    devise: string;
    budget_initial: number;
}

interface PendingSessionItem {
    id: string;
    caisse_name: string;
    caisse_devise: string;
    cashier_name: string;
    solde_ouverture: number;
    date_session: string;
    observation?: string;
}

interface Props extends PageProps {
    scopeLabel?: string;
    requisitions?: FinanceRequisition[];
    projects?: ProjectItem[];
    usersList?: UserItem[];
    caisses?: CaisseSummaryItem[];
    cashRegisters?: CashRegisterOption[];
    allBudgetLines?: BudgetLineClientItem[];
    pendingSessions?: PendingSessionItem[];
}

const money = (amount: number, currency: string) =>
    `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${currency}`;

export default function FinanceDashboard({
    requisitions: initialRequisitions = [],
    projects = [],
    caisses = [],
    cashRegisters = [],
    allBudgetLines = [],
    pendingSessions = [],
}: Props) {
    const { auth } = usePage<PageProps>().props;
    const user = auth.user;

    const [requisitions, setRequisitions] = useState<FinanceRequisition[]>(initialRequisitions);

    const [selectedProject, setSelectedProject] = useState<string>('all');
    const [selectedCaisse, setSelectedCaisse] = useState<string>('all');
    const [selectedNature, setSelectedNature] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState('all');

    const [selected, setSelected] = useState<FinanceRequisition | null>(null);
    const [correcting, setCorrecting] = useState<RequisitionCorrectionData | null>(null);
    const [rejecting, setRejecting] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');

    // Édition directe du MF pendant l'examen de la réquisition
    const [financeCaisse, setFinanceCaisse] = useState<string>('');
    const [financeAllocations, setFinanceAllocations] = useState<Record<string, string>>({});
    const [activeInputId, setActiveInputId] = useState<string | null>(null);

    const [pinModalOpen, setPinModalOpen] = useState(false);
    const [pinSaisi, setPinSaisi] = useState('');
    const [pinError, setPinError] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);

    const [sessionToAuthorize, setSessionToAuthorize] = useState<PendingSessionItem | null>(null);
    const [sessionPin, setSessionPin] = useState('');
    const [sessionPinError, setSessionPinError] = useState<string | null>(null);
    const [authorizingSession, setAuthorizingSession] = useState(false);

    const [toast, setToast] = useState<{
        type: 'success' | 'error';
        message: string;
    } | null>(null);

    const showToast = (type: 'success' | 'error', message: string) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 5000);
    };

    const getBudgetLineObject = (code: string, projectId?: string) => {
        if (!code.trim()) return null;
        const normalized = code.trim().toLowerCase();
        return allBudgetLines.find(
            (l) => l.normalizedCode === normalized && (!projectId || l.project_id === projectId)
        ) || null;
    };

    const filteredRequisitions = useMemo(() => {
        return requisitions.filter((item) => {
            if (statusFilter === 'pending' && !item.canDecide) return false;
            if (statusFilter === 'controle_finance' && item.statusCode !== 'controle_finance') return false;
            if (statusFilter === 'decaissement_caisse' && item.statusCode !== 'decaissement_caisse') return false;
            if (statusFilter === 'decaisse' && item.statusCode !== 'decaisse') return false;
            if (statusFilter === 'returned' && !item.canCorrect && !item.financeRejected) return false;

            if (selectedProject !== 'all' && item.project_id !== selectedProject && item.projet !== selectedProject) {
                return false;
            }

            if (selectedCaisse !== 'all' && item.caisseAttribuee !== selectedCaisse) {
                return false;
            }

            if (selectedNature !== 'all' && item.nature !== selectedNature) {
                return false;
            }

            return true;
        });
    }, [requisitions, statusFilter, selectedProject, selectedCaisse, selectedNature]);

    const handleOpenExamen = (item: FinanceRequisition) => {
        setSelected(item);
        setRejecting(false);
        setRejectionReason('');
        setFinanceCaisse(item.caisseAttribuee || 'Caisse principale');

        const initialAllocations: Record<string, string> = {};
        item.lignes.forEach((ligne) => {
            initialAllocations[ligne.id] = ligne.codeAllocation || ligne.codeBudget || '';
        });
        setFinanceAllocations(initialAllocations);
    };

    const handleTriggerApprove = () => {
        if (!selected) return;
        setPinSaisi('');
        setPinError(null);
        setPinModalOpen(true);
    };

    const handleConfirmSignature = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selected || !pinSaisi) return;

        setProcessing(true);
        setPinError(null);

        const allocationsArray = Object.entries(financeAllocations).map(([demande_id, code_allocation]) => ({
            demande_id,
            code_allocation: code_allocation.trim(),
        }));

        router.patch(
            route('requisitions.finance-decision', selected.id),
            {
                decision: 'approve',
                pin: pinSaisi.trim(),
                caisse_decaissement: financeCaisse,
                allocations: allocationsArray,
            },
            {
                preserveScroll: true,
                onFinish: () => setProcessing(false),
                onSuccess: () => {
                    const updatedId = selected.id;
                    setPinModalOpen(false);
                    setSelected(null);
                    setPinSaisi('');

                    setRequisitions((prev) =>
                        prev.map((item) => {
                            if (item.id === updatedId) {
                                return {
                                    ...item,
                                    caisseAttribuee: financeCaisse,
                                    statusCode: 'controle_finance',
                                    statusLabel: 'Validée par Finance',
                                    canDecide: false,
                                    lignes: item.lignes.map((l) => {
                                        const alloc = allocationsArray.find((a) => a.demande_id === l.id);
                                        const matched = alloc ? getBudgetLineObject(alloc.code_allocation, item.project_id) : null;
                                        return alloc
                                            ? {
                                                  ...l,
                                                  codeAllocation: alloc.code_allocation,
                                                  codeBudget: alloc.code_allocation,
                                                  libelleAllocation: matched?.libelle || l.libelleAllocation,
                                                  budget_solde_actuel: matched ? matched.solde : l.budget_solde_actuel,
                                              }
                                            : l;
                                    }),
                                };
                            }
                            return item;
                        })
                    );

                    showToast(
                        'success',
                        `Visa Financier certifié apposé sur ${selected.numero}. Transmis au Manager Administratif.`
                    );
                },
                onError: (errors) => {
                    setPinError((errors as any).pin || 'Code PIN financier incorrect ou non configuré.');
                },
            }
        );
    };

    const handleRejectFinance = () => {
        if (!selected || !rejectionReason.trim()) {
            showToast('error', 'Veuillez spécifier le motif du rejet financier.');
            return;
        }

        setProcessing(true);

        router.patch(
            route('requisitions.finance-decision', selected.id),
            {
                decision: 'reject',
                pin: '0000',
                motif_rejet: rejectionReason,
            },
            {
                preserveScroll: true,
                onFinish: () => setProcessing(false),
                onSuccess: () => {
                    const updatedId = selected.id;
                    setSelected(null);
                    setRejecting(false);
                    setRejectionReason('');

                    setRequisitions((prev) =>
                        prev.map((item) => {
                            if (item.id === updatedId) {
                                return {
                                    ...item,
                                    statusCode: 'returned_to_project_manager',
                                    statusLabel: 'Renvoyée au Manager de Projet',
                                    canDecide: false,
                                    canCorrect: false,
                                    financeRejected: true,
                                };
                            }
                            return item;
                        })
                    );

                    showToast('error', `Réquisition ${selected.numero} renvoyée pour correction budgétaire.`);
                },
                onError: (errors) => {
                    showToast('error', (errors as any).motif_rejet || 'Erreur lors du renvoi.');
                },
            }
        );
    };

    const handleAuthorizeSession = (e: React.FormEvent) => {
        e.preventDefault();
        if (!sessionToAuthorize || !sessionPin) return;

        setAuthorizingSession(true);
        setSessionPinError(null);

        router.patch(
            route('cashier.session.authorize-opening', sessionToAuthorize.id),
            { pin: sessionPin.trim() },
            {
                preserveScroll: true,
                onFinish: () => setAuthorizingSession(false),
                onSuccess: () => {
                    setSessionToAuthorize(null);
                    setSessionPin('');
                    showToast('success', `Guichet ${sessionToAuthorize.caisse_name} ouvert avec succès.`);
                },
                onError: (errs) => {
                    setSessionPinError(errs.pin || 'Code PIN financier incorrect.');
                },
            }
        );
    };

    const pendingCount = requisitions.filter((item) => item.canDecide).length;
    const decaissementPretCount = requisitions.filter((item) => item.statusCode === 'decaissement_caisse').length;
    const decaisseCount = requisitions.filter((item) => item.statusCode === 'decaisse').length;

    return (
        <AppLayout>
            <Head title="Direction Financière — Centre Financier" />

            <div className="space-y-6">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
                    <div>
                        <nav className="text-[10px] font-bold uppercase tracking-widest text-[#B2BED6] mb-1.5 flex items-center gap-1.5">
                            <Wallet className="w-3.5 h-3.5 text-[#04326D]" />
                            <span>Direction Financière</span>
                            <span className="mx-1">/</span>
                            <span className="text-[#04326D]">Centre Financier</span>
                        </nav>
                        <h1 className="text-xl font-bold text-[#0B192C]">
                            Contrôle Budgétaire, Caisses & Visas
                        </h1>
                        <p className="text-[12px] text-gray-500 mt-1">
                            Financier : <strong className="text-[#0B192C]">{user.name}</strong> • Vérification et ajustement des lignes budgétaires, contrôle de trésorerie et autorisations en direct.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link
                            href={route('finance.budgets.index')}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#04326D] hover:bg-[#06428f] text-white rounded font-bold text-xs shadow-sm transition"
                        >
                            <PieChart className="w-4 h-4 text-emerald-400" />
                            <span>Centre Budgétaire & Donateurs</span>
                        </Link>
                    </div>
                </header>

                {pendingSessions.length > 0 && (
                    <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
                                <div>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-950">
                                        Demande d'Ouverture de Guichet en Attente ({pendingSessions.length})
                                    </h3>
                                    <p className="text-[11px] text-amber-900 mt-0.5">
                                        Un caissier a demandé l'ouverture de sa caisse pour la journée. Votre autorisation par PIN est requise pour démarrer les opérations.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                            {pendingSessions.map((session) => (
                                <div key={session.id} className="p-3 bg-white border border-amber-300 rounded flex justify-between items-center text-xs">
                                    <div>
                                        <strong className="text-[#0B192C] block">{session.caisse_name}</strong>
                                        <span className="text-[11px] text-gray-500 block">
                                            Caissier : {session.cashier_name}
                                        </span>
                                        <span className="text-[11px] font-mono font-bold text-amber-800">
                                            Fond initial : {money(session.solde_ouverture, session.caisse_devise)}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSessionToAuthorize(session);
                                            setSessionPin('');
                                            setSessionPinError(null);
                                        }}
                                        className="px-3 py-1.5 bg-[#04326D] hover:bg-[#06428f] text-white rounded font-bold text-xs shadow transition shrink-0"
                                    >
                                        Autoriser
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {toast && (
                    <div
                        className={`p-3.5 rounded text-xs font-semibold flex justify-between items-center gap-3 border ${
                            toast.type === 'success'
                                ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                                : 'bg-red-50 text-red-900 border-red-300'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            {toast.type === 'success' ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                            ) : (
                                <AlertCircle className="w-4 h-4 text-red-700" />
                            )}
                            <span>{toast.message}</span>
                        </div>
                        <button type="button" onClick={() => setToast(null)} className="underline text-[11px]">
                            Fermer
                        </button>
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-white p-4 rounded border border-[#B2BED6] shadow-sm flex flex-col justify-between border-l-4 border-l-[#F58F20]">
                        <span className="text-[10.5px] font-bold uppercase tracking-wider text-gray-500">
                            En attente de Visa Finance
                        </span>
                        <p className="text-2xl font-black text-[#F58F20] mt-2">
                            {pendingCount} <span className="text-xs font-normal text-gray-500">dossier(s)</span>
                        </p>
                    </div>

                    <div className="bg-white p-4 rounded border border-[#B2BED6] shadow-sm flex flex-col justify-between border-l-4 border-l-[#04326D]">
                        <span className="text-[10.5px] font-bold uppercase tracking-wider text-gray-500">
                            Prêtes pour Caisse (Bon à Payer)
                        </span>
                        <p className="text-2xl font-black text-[#04326D] mt-2">
                            {decaissementPretCount} <span className="text-xs font-normal text-gray-500">dossier(s)</span>
                        </p>
                    </div>

                    <div className="bg-white p-4 rounded border border-[#B2BED6] shadow-sm flex flex-col justify-between border-l-4 border-l-emerald-600">
                        <span className="text-[10.5px] font-bold uppercase tracking-wider text-gray-500">
                            Dossiers Décaissés au Guichet
                        </span>
                        <p className="text-2xl font-black text-emerald-700 mt-2">
                            {decaisseCount} <span className="text-xs font-normal text-gray-500">dossier(s)</span>
                        </p>
                    </div>
                </div>

                <div className="bg-white border border-[#B2BED6] rounded shadow-sm p-4 space-y-3">
                    <header className="flex items-center justify-between border-b pb-2">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-[#0B192C] flex items-center gap-1.5">
                            <Building2 className="w-4 h-4 text-[#04326D]" />
                            <span>Situation des Caisses Physiques</span>
                        </h2>
                        <span className="text-[10px] text-gray-400 uppercase font-mono font-bold">
                            Temps réel MySQL
                        </span>
                    </header>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                        {caisses.map((c) => (
                            <div key={c.id} className="p-3 bg-gray-50 border rounded flex flex-col justify-between space-y-2">
                                <div className="flex items-start justify-between">
                                    <strong className="text-[#0B192C]">{c.name}</strong>
                                    {c.is_ouverte ? (
                                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                            Ouverte
                                        </span>
                                    ) : (
                                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-gray-200 text-gray-600">
                                            Fermée
                                        </span>
                                    )}
                                </div>
                                <div>
                                    <span className="text-[10px] text-gray-500 block">Solde en caisse :</span>
                                    <span className="text-base font-black font-mono text-[#04326D]">
                                        {money(c.solde_actuel, c.devise)}
                                    </span>
                                </div>
                                <span className="text-[10px] text-gray-500 truncate" title={c.cashiers_names}>
                                    Caissier : {c.cashiers_names || 'Non assigné'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white border border-[#B2BED6] rounded shadow-sm overflow-hidden">
                    <div className="border-b px-4 py-3 bg-gray-50 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                            <select
                                value={selectedProject}
                                onChange={(e) => setSelectedProject(e.target.value)}
                                className="border border-[#B2BED6] rounded px-2.5 py-1 text-xs bg-white text-[#0B192C] font-semibold"
                            >
                                <option value="all">Tous les projets</option>
                                {projects.map((p) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>

                            <select
                                value={selectedCaisse}
                                onChange={(e) => setSelectedCaisse(e.target.value)}
                                className="border border-[#B2BED6] rounded px-2.5 py-1 text-xs bg-white text-[#0B192C] font-semibold"
                            >
                                <option value="all">Toutes les caisses</option>
                                {caisses.map((c) => (
                                    <option key={c.id} value={c.name}>{c.name}</option>
                                ))}
                            </select>

                            <select
                                value={selectedNature}
                                onChange={(e) => setSelectedNature(e.target.value)}
                                className="border border-[#B2BED6] rounded px-2.5 py-1 text-xs bg-white text-[#0B192C] font-semibold"
                            >
                                <option value="all">Achat & Service</option>
                                <option value="Achat">Achat</option>
                                <option value="Service">Service</option>
                            </select>

                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="border border-[#B2BED6] rounded px-2.5 py-1 text-xs bg-white text-[#0B192C] font-semibold"
                            >
                                <option value="all">Tous les statuts</option>
                                <option value="pending">En attente Visa Finance</option>
                                <option value="controle_finance">Validées Finance</option>
                                <option value="decaissement_caisse">Bon à Payer Accordé</option>
                                <option value="decaisse">Décaissées au Guichet</option>
                                <option value="returned">Renvoyées en correction</option>
                            </select>
                        </div>

                        <span className="text-[11px] font-bold text-gray-500 font-mono">
                            {filteredRequisitions.length} dossier(s)
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-[#0B192C] text-white uppercase text-[10px] font-bold tracking-wider">
                                    <th className="px-4 py-3">Numéro</th>
                                    <th className="px-4 py-3">Demandeur</th>
                                    <th className="px-4 py-3">Projet / Caisse</th>
                                    <th className="px-4 py-3">Observation</th>
                                    <th className="px-4 py-3 text-right">Montant</th>
                                    <th className="px-4 py-3 text-center">Urgence</th>
                                    <th className="px-4 py-3 text-center">Statut</th>
                                    <th className="px-4 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 text-gray-700">
                                {filteredRequisitions.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-12 text-center text-gray-400 italic">
                                            Aucune réquisition ne correspond aux filtres appliqués.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRequisitions.map((item) => (
                                        <tr key={item.id} className="hover:bg-[#F9F9FF] transition">
                                            <td className="px-4 py-3.5 font-mono font-bold text-[#04326D] whitespace-nowrap">
                                                {item.numero}
                                            </td>
                                            <td className="px-4 py-3.5 whitespace-nowrap">
                                                <p className="font-bold text-gray-800">{item.initiateurNom}</p>
                                                <p className="text-[10px] text-gray-400">{item.initiateurRole}</p>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <p className="font-bold text-[#0B192C]">{item.projet}</p>
                                                <p className="text-[10px] text-gray-500">{item.caisseAttribuee}</p>
                                            </td>
                                            <td className="px-4 py-3.5 max-w-xs truncate" title={item.observation || ''}>
                                                {item.observation || '—'}
                                            </td>
                                            <td className="px-4 py-3.5 text-right font-mono font-bold text-[#0B192C] whitespace-nowrap">
                                                {money(item.montantTotal, item.devise)}
                                            </td>
                                            <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                                {item.is_urgent ? (
                                                    <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-black text-[9px] uppercase">
                                                        Urgent
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 text-[10px]">Normal</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                                <span
                                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                        item.canDecide
                                                            ? 'bg-amber-100 text-amber-900'
                                                            : item.statusCode === 'decaisse'
                                                            ? 'bg-emerald-100 text-emerald-800'
                                                            : 'bg-blue-50 text-[#04326D]'
                                                    }`}
                                                >
                                                    {item.canDecide ? 'À Viser' : item.statusLabel}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 text-right whitespace-nowrap">
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenExamen(item)}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#04326D] hover:bg-[#06428f] text-white rounded font-bold text-xs shadow-sm transition"
                                                >
                                                    <ShieldCheck className="w-3.5 h-3.5" />
                                                    <span>{item.canDecide ? 'Examiner & Viser' : 'Détails'}</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* MODALE D'EXAMEN ET D'ÉDITION POUR LE MANAGER FINANCIER */}
            {selected && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
                    <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-white border border-[#B2BED6] shadow-2xl rounded p-6 space-y-4 animate-slide-down">
                        <header className="flex items-start justify-between border-b pb-3">
                            <div>
                                <span className="text-[10px] uppercase font-bold text-[#F58F20] tracking-wider">
                                    Contrôle Budgétaire & Visa Financier (Étape 2)
                                </span>
                                <h2 className="text-base font-bold text-[#0B192C]">
                                    Réquisition N° {selected.numero} ({selected.nature})
                                </h2>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Demandeur : <strong>{selected.initiateurNom}</strong> • Projet : {selected.projet}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setSelected(null);
                                    setActiveInputId(null);
                                }}
                                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </header>

                        {/* Choix et Modification de la Caisse par le MF */}
                        {selected.canDecide && (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                <div>
                                    <strong className="text-[#04326D] block">Caisse d'imputation et de décaissement</strong>
                                    <span className="text-gray-600 text-[11px]">
                                        En tant que Manager Finance, vous pouvez réaffecter la caisse si nécessaire avant validation.
                                    </span>
                                </div>
                                <select
                                    value={financeCaisse}
                                    onChange={(e) => setFinanceCaisse(e.target.value)}
                                    className="border border-[#04326D] rounded px-3 py-1.5 text-xs font-bold text-[#0B192C] bg-white min-w-[200px]"
                                >
                                    {cashRegisters.map((c) => (
                                        <option key={c.id} value={c.name}>
                                            {c.name} ({c.devise})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {selected.observation && (
                            <div className="p-3 bg-amber-50 border-l-4 border-[#F58F20] text-xs text-gray-800 rounded-r">
                                <strong>Observation :</strong> {selected.observation}
                            </div>
                        )}

                        {/* Tableau des lignes avec modification & autocomplétion des codes budgétaires */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                                    Contrôle et Ajustement des Imputations Budgétaires
                                </h3>
                                {selected.canDecide && (
                                    <span className="text-[10px] text-gray-500 italic">
                                        Tapez un code (ex: 2.2) pour afficher les suggestions et soldes disponibles
                                    </span>
                                )}
                            </div>

                            <div className="overflow-x-auto border border-gray-200 rounded">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-[#0B192C] text-white font-bold">
                                        <tr>
                                            <th className="p-2.5">Désignation</th>
                                            <th className="p-2.5 w-72">Code Imputé & Recherche</th>
                                            <th className="p-2.5 text-right">Solde Disponible</th>
                                            <th className="p-2.5 text-right">Total Ligne</th>
                                            <th className="p-2.5 text-center">Faisabilité</th>
                                            <th className="p-2.5">Justificatifs</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y text-gray-700">
                                        {selected.lignes.map((line) => {
                                            const currentCode = financeAllocations[line.id] ?? line.codeAllocation ?? line.codeBudget ?? '';
                                            const matchedLine = getBudgetLineObject(currentCode, selected.project_id);
                                            const soldeDispo = matchedLine ? matchedLine.solde : line.budget_solde_actuel;
                                            const depassement = soldeDispo !== null && soldeDispo !== undefined && line.total > soldeDispo;

                                            const filteredSuggestions = allBudgetLines.filter((b) => {
                                                if (selected.project_id && b.project_id !== selected.project_id) return false;
                                                const q = currentCode.trim().toLowerCase();
                                                if (!q) return false;
                                                return b.code.toLowerCase().includes(q) || b.libelle.toLowerCase().includes(q);
                                            });

                                            return (
                                                <tr key={line.id} className={depassement ? 'bg-red-50/60' : ''}>
                                                    <td className="p-2.5 font-medium max-w-xs">{line.activite}</td>
                                                    <td className="p-2.5 relative">
                                                        {selected.canDecide ? (
                                                            <div className="relative">
                                                                <input
                                                                    type="text"
                                                                    placeholder="Recherche (ex: 2.2)..."
                                                                    value={currentCode}
                                                                    onFocus={() => setActiveInputId(line.id)}
                                                                    onChange={(e) => {
                                                                        setFinanceAllocations({
                                                                            ...financeAllocations,
                                                                            [line.id]: e.target.value,
                                                                        });
                                                                        setActiveInputId(line.id);
                                                                    }}
                                                                    className="w-full border border-[#04326D] rounded p-1.5 text-xs font-mono font-bold text-[#04326D] bg-white focus:outline-none"
                                                                    required
                                                                />

                                                                {/* Menu d'autocomplétion Front-End instantané */}
                                                                {activeInputId === line.id && filteredSuggestions.length > 0 && (
                                                                    <div className="absolute left-0 top-full mt-1 w-80 bg-white border border-[#04326D] rounded shadow-2xl z-30 max-h-48 overflow-y-auto divide-y text-xs">
                                                                        {filteredSuggestions.map((sug) => (
                                                                            <button
                                                                                key={sug.id}
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setFinanceAllocations({
                                                                                        ...financeAllocations,
                                                                                        [line.id]: sug.code,
                                                                                    });
                                                                                    setActiveInputId(null);
                                                                                }}
                                                                                className="w-full p-2 text-left hover:bg-blue-50 flex flex-col justify-between"
                                                                            >
                                                                                <div className="flex items-center justify-between">
                                                                                    <span className="font-mono font-black text-[#04326D]">
                                                                                        {sug.code}
                                                                                    </span>
                                                                                    <span className="font-mono text-[10px] font-bold text-emerald-700">
                                                                                        Solde: {sug.solde.toLocaleString()} {sug.devise}
                                                                                    </span>
                                                                                </div>
                                                                                <span className="text-[10px] text-gray-600 truncate mt-0.5">
                                                                                    {sug.libelle}
                                                                                </span>
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                )}

                                                                <span className="text-[10px] text-gray-500 block truncate mt-1">
                                                                    {matchedLine ? matchedLine.libelle : (line.libelleAllocation || 'Non assigné')}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <div>
                                                                <span className="font-mono font-bold text-[#04326D] block">
                                                                    {line.codeAllocation || line.codeBudget || 'Non attribué'}
                                                                </span>
                                                                <span className="text-[10px] text-gray-500 block truncate">
                                                                    {line.libelleAllocation || 'Non assigné'}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-2.5 text-right font-mono font-bold whitespace-nowrap">
                                                        {soldeDispo !== null && soldeDispo !== undefined ? (
                                                            money(soldeDispo, selected.devise)
                                                        ) : (
                                                            <span className="text-gray-400 font-normal">Non défini</span>
                                                        )}
                                                    </td>
                                                    <td className="p-2.5 text-right font-mono font-bold whitespace-nowrap">
                                                        {money(line.total, selected.devise)}
                                                    </td>
                                                    <td className="p-2.5 text-center whitespace-nowrap">
                                                        {soldeDispo === null || soldeDispo === undefined ? (
                                                            <span className="text-[10px] text-gray-400">À vérifier</span>
                                                        ) : depassement ? (
                                                            <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-800 text-[10px] font-bold">
                                                                Dépassement crédit
                                                            </span>
                                                        ) : (
                                                            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                                                Crédit suffisant
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-2.5">
                                                        {line.justificatifs.length > 0 ? (
                                                            <div className="space-y-1">
                                                                {line.justificatifs.map((f) => (
                                                                    <div key={f.id} className="flex items-center justify-between text-[10px] bg-blue-50 text-[#04326D] px-2 py-0.5 rounded">
                                                                        <span className="truncate max-w-[110px]">{f.nom}</span>
                                                                        {f.fileUrl && (
                                                                            <a href={f.fileUrl} target="_blank" rel="noreferrer" className="underline font-bold ml-1">
                                                                                Voir
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
                                            );
                                        })}
                                    </tbody>
                                    <tfoot className="bg-gray-50 font-bold border-t">
                                        <tr>
                                            <td colSpan={3} className="p-2.5 text-right">Total Dossier :</td>
                                            <td className="p-2.5 text-right font-mono text-sm text-[#0B192C]">
                                                {money(selected.montantTotal, selected.devise)}
                                            </td>
                                            <td colSpan={2} />
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        {selected.canDecide && (
                            <div className="border-t pt-4 space-y-3">
                                {!rejecting ? (
                                    <div className="flex items-center justify-between">
                                        <button
                                            type="button"
                                            onClick={() => setRejecting(true)}
                                            className="px-3.5 py-2 border border-red-300 text-red-600 hover:bg-red-50 rounded text-xs font-bold transition"
                                        >
                                            <Ban className="w-3.5 h-3.5 inline mr-1" />
                                            Rejeter (Problème Budgétaire)
                                        </button>

                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelected(null);
                                                    setActiveInputId(null);
                                                }}
                                                className="px-3.5 py-2 border rounded text-xs font-semibold text-gray-600 hover:bg-gray-50"
                                            >
                                                Fermer
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleTriggerApprove}
                                                className="px-4 py-2 bg-[#04326D] hover:bg-[#06428f] text-white rounded text-xs font-bold shadow transition"
                                            >
                                                Enregistrer Corrections & Viser (PIN)
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-red-50 p-4 rounded border border-red-200 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <h4 className="text-xs font-bold text-red-800 uppercase">
                                                Motif du Rejet Financier (Obligatoire)
                                            </h4>
                                            <button
                                                type="button"
                                                onClick={() => setRejecting(false)}
                                                className="text-xs text-gray-500 hover:underline"
                                            >
                                                Annuler
                                            </button>
                                        </div>
                                        <textarea
                                            rows={3}
                                            value={rejectionReason}
                                            onChange={(e) => setRejectionReason(e.target.value)}
                                            placeholder="Précisez le motif comptable : dépassement de crédit, ligne erronée..."
                                            className="w-full border border-red-300 rounded p-2 text-xs bg-white focus:outline-none"
                                            required
                                        />
                                        <div className="flex justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setRejecting(false)}
                                                className="px-3 py-1.5 border rounded text-xs bg-white text-gray-700"
                                            >
                                                Annuler
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleRejectFinance}
                                                disabled={processing}
                                                className="px-4 py-1.5 bg-[#DC2626] hover:bg-[#b91c1c] text-white rounded text-xs font-bold shadow"
                                            >
                                                Confirmer le Rejet
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MODALE DU PIN FINANCIER */}
            {pinModalOpen && selected && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 animate-fade-in">
                    <div className="bg-white rounded border-2 border-[#04326D] shadow-2xl max-w-sm w-full p-6 space-y-4 animate-slide-down">
                        <div className="text-center border-b pb-3">
                            <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 flex items-center justify-center mb-2">
                                <Lock className="w-5 h-5 text-[#04326D]" />
                            </div>
                            <h3 className="text-sm font-bold uppercase text-[#0B192C] tracking-wide">
                                Signature Électronique du Visa Financier
                            </h3>
                            <p className="text-[11px] text-gray-500 mt-1">
                                Réquisition N° <strong className="font-mono text-[#04326D]">{selected.numero}</strong>
                            </p>
                        </div>

                        {pinError && (
                            <div className="p-2.5 bg-red-50 border border-red-300 text-red-800 rounded text-xs">
                                {pinError}
                            </div>
                        )}

                        <form onSubmit={handleConfirmSignature} className="space-y-3 text-xs">
                            <div>
                                <label className="block font-bold text-gray-700 mb-1">
                                    Saisissez votre Code PIN personnel financier *
                                </label>
                                <div className="relative">
                                    <KeyRound className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    <input
                                        type="password"
                                        maxLength={6}
                                        placeholder="Code PIN (4 à 6 chiffres)"
                                        value={pinSaisi}
                                        onChange={(e) => setPinSaisi(e.target.value)}
                                        className="w-full pl-8 pr-3 py-2 border border-[#B2BED6] rounded text-xs font-mono tracking-widest text-[#0B192C] focus:outline-none focus:border-[#04326D]"
                                        autoFocus
                                        required
                                    />
                                </div>
                            </div>

                            <p className="text-[10px] text-gray-400 leading-tight">
                                Cette signature infalsifiable atteste de la disponibilité des crédits budgétaires et enregistre vos imputations.
                            </p>

                            <div className="flex justify-end gap-2 pt-2 border-t">
                                <button
                                    type="button"
                                    onClick={() => setPinModalOpen(false)}
                                    className="px-3.5 py-1.5 border border-[#B2BED6] rounded text-xs text-gray-600 hover:bg-gray-50"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="px-4 py-1.5 bg-[#04326D] hover:bg-[#06428f] text-white rounded text-xs font-bold shadow transition"
                                >
                                    {processing ? 'Signature...' : 'Signer & Valider'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {sessionToAuthorize && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 animate-fade-in">
                    <div className="bg-white rounded border border-[#B2BED6] shadow-2xl max-w-sm w-full p-6 space-y-4 animate-slide-down">
                        <header className="border-b pb-2">
                            <h3 className="text-sm font-bold text-[#0B192C] uppercase tracking-wide">
                                Autoriser l'Ouverture de Caisse
                            </h3>
                            <p className="text-[11px] text-gray-500">
                                Guichet : <strong>{sessionToAuthorize.caisse_name}</strong> • Caissier : <strong>{sessionToAuthorize.cashier_name}</strong>
                            </p>
                        </header>

                        <div className="p-3 bg-amber-50 border border-amber-300 rounded text-xs">
                            <span className="text-[10px] font-bold text-gray-500 uppercase block">Fond de caisse déclaré :</span>
                            <span className="text-base font-black font-mono text-[#0B192C]">
                                {money(sessionToAuthorize.solde_ouverture, sessionToAuthorize.caisse_devise)}
                            </span>
                        </div>

                        {sessionPinError && (
                            <div className="p-2.5 bg-red-50 border border-red-300 text-red-800 rounded text-xs">
                                {sessionPinError}
                            </div>
                        )}

                        <form onSubmit={handleAuthorizeSession} className="space-y-3 text-xs">
                            <div>
                                <label className="block font-bold text-gray-700 mb-1">
                                    Confirmez avec votre Code PIN financier *
                                </label>
                                <input
                                    type="password"
                                    maxLength={6}
                                    placeholder="Code PIN"
                                    value={sessionPin}
                                    onChange={(e) => setSessionPin(e.target.value)}
                                    className="w-full border border-[#B2BED6] rounded p-2 text-xs font-mono tracking-widest text-[#0B192C] focus:outline-none focus:border-[#04326D]"
                                    autoFocus
                                    required
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t">
                                <button
                                    type="button"
                                    onClick={() => setSessionToAuthorize(null)}
                                    className="px-3 py-1.5 border rounded text-xs text-gray-600 hover:bg-gray-50"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={authorizingSession}
                                    className="px-4 py-1.5 bg-[#04326D] hover:bg-[#06428f] text-white rounded text-xs font-bold shadow"
                                >
                                    {authorizingSession ? 'Autorisation...' : 'Autoriser l’Ouverture'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {correcting && (
                <RequisitionCorrectionForm
                    key={correcting.id}
                    requisition={correcting}
                    onClose={() => setCorrecting(null)}
                    onSuccess={() => {
                        setRequisitions((items) => items.filter((item) => item.id !== correcting.id));
                        setCorrecting(null);
                        showToast('success', `Réquisition ${correcting.numero} corrigée et transmise au PAM.`);
                    }}
                />
            )}
        </AppLayout>
    );
}