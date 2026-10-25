import { useState, useMemo, useRef, useEffect } from 'react';
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
    Search,
    Check,
    Coins,
    BarChart3,
    Activity,
    LayoutTemplate,
    Layers,
    Plus,
    Trash2,
    FileText
} from 'lucide-react';

interface Signature {
    role: string;
    nom: string;
    action: string;
    commentaire?: string;
    date: string;
    code: string;
    hash: string;
}

interface FinanceJustificatif {
    id: string;
    nom: string;
    description: string;
    montant: number;
    fileUrl: string | null;
}

interface SplitItem {
    id?: string;
    code_allocation: string;
    montant: number;
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
    splits?: SplitItem[];
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
    derniere_observation?: string | null;
    is_urgent?: boolean;
    statusCode: string;
    statusLabel: string;
    canDecide: boolean;
    canCorrect?: boolean;
    financeRejected?: boolean;
    motifRejet?: string | null;
    dateSoumission: string;
    signatures: Signature[];
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

// Composant réutilisable pour rechercher un code budgétaire (utilisé pour lignes simples ET ventilations)
function BudgetLineSearchPicker({
    currentCode,
    projectId,
    allBudgetLines,
    lineTotal,
    devise,
    onSelectCode,
}: {
    currentCode: string;
    projectId?: string;
    allBudgetLines: BudgetLineClientItem[];
    lineTotal: number;
    devise: string;
    onSelectCode: (code: string) => void;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState(currentCode);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setSearchTerm(currentCode);
    }, [currentCode]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const matchingLines = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        return allBudgetLines.filter((line) => {
            if (projectId && line.project_id !== projectId) return false;
            if (!query) return true;
            return (
                line.code.toLowerCase().includes(query) ||
                line.libelle.toLowerCase().includes(query)
            );
        });
    }, [allBudgetLines, projectId, searchTerm]);

    const activeLine = useMemo(() => {
        const norm = currentCode.trim().toLowerCase();
        return allBudgetLines.find(
            (l) => l.normalizedCode === norm && (!projectId || l.project_id === projectId)
        ) || null;
    }, [allBudgetLines, currentCode, projectId]);

    const solde = activeLine ? activeLine.solde : null;
    const soldeRestant = solde !== null ? solde - lineTotal : null;
    const isOverdraft = soldeRestant !== null && soldeRestant < 0;

    return (
        <div ref={containerRef} className="relative w-full space-y-1">
            <div className="relative">
                <input
                    type="text"
                    placeholder="Tapez un code (ex: 2.2)..."
                    value={searchTerm}
                    onFocus={() => setIsOpen(true)}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        onSelectCode(e.target.value);
                        setIsOpen(true);
                    }}
                    className="w-full pl-8 pr-3 py-1.5 border border-[#04326D] rounded text-xs font-mono font-bold text-[#04326D] bg-white focus:outline-none focus:ring-1 focus:ring-[#04326D]"
                    required
                />
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                {searchTerm && (
                    <button
                        type="button"
                        onClick={() => {
                            setSearchTerm('');
                            onSelectCode('');
                            setIsOpen(true);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-3 h-3" />
                    </button>
                )}
            </div>

            {isOpen && (
                <div className="absolute left-0 top-full mt-1 w-[400px] bg-white border-2 border-[#04326D] rounded-lg shadow-2xl z-[9999] max-h-72 overflow-y-auto divide-y divide-gray-100 text-xs">
                    <div className="p-2 bg-gray-50 text-[10px] text-gray-500 font-bold uppercase tracking-wider flex justify-between sticky top-0 z-10 shadow-sm">
                        <span>Lignes trouvées ({matchingLines.length})</span>
                        <span>Solde dispo.</span>
                    </div>
                    {matchingLines.length === 0 ? (
                        <div className="p-3 text-center text-gray-400 italic">
                            Aucune ligne ne correspond à « {searchTerm} »
                        </div>
                    ) : (
                        matchingLines.map((line) => {
                            const isEnough = line.solde >= lineTotal;
                            const isSelected = line.code === currentCode;
                            return (
                                <button
                                    key={line.id}
                                    type="button"
                                    onClick={() => {
                                        setSearchTerm(line.code);
                                        onSelectCode(line.code);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full p-2.5 text-left transition flex flex-col gap-1 ${
                                        isSelected ? 'bg-blue-50/80' : 'hover:bg-slate-50'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-mono font-black text-[#04326D] text-[13px]">
                                                {line.code}
                                            </span>
                                            {isSelected && <Check className="w-3.5 h-3.5 text-[#04326D]" />}
                                        </div>
                                        <span
                                            className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded ${
                                                isEnough ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                                            }`}
                                        >
                                            {money(line.solde, line.devise || devise)}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-gray-700 whitespace-normal leading-tight">
                                        {line.libelle}
                                    </p>
                                </button>
                            );
                        })
                    )}
                </div>
            )}

            {activeLine ? (
                <div className="p-1.5 rounded bg-gray-50 border border-gray-200 text-[10.5px] space-y-0.5 mt-1">
                    <p className="font-semibold text-gray-800 line-clamp-1" title={activeLine.libelle}>
                        {activeLine.libelle}
                    </p>
                    <div className="flex items-center justify-between text-gray-600 pt-0.5 border-t border-gray-200">
                        <span>Solde : <strong className="font-mono text-[#0B192C]">{money(activeLine.solde, devise)}</strong></span>
                        <span className={isOverdraft ? 'text-red-700 font-bold' : 'text-emerald-700 font-bold'}>
                            {isOverdraft
                                ? `⚠️ Déficit : ${money(Math.abs(soldeRestant!), devise)}`
                                : `✓ Reste : ${money(soldeRestant!, devise)}`}
                        </span>
                    </div>
                </div>
            ) : (
                <span className="text-[10px] text-gray-400 italic block mt-1">
                    Aucun code sélectionné
                </span>
            )}
        </div>
    );
}

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

    useEffect(() => {
        setRequisitions(initialRequisitions);
    }, [initialRequisitions]);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProject, setSelectedProject] = useState<string>('all');
    const [selectedCaisse, setSelectedCaisse] = useState<string>('all');
    const [selectedNature, setSelectedNature] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState('all');

    const [selected, setSelected] = useState<FinanceRequisition | null>(null);
    const [directorPreviewReq, setDirectorPreviewReq] = useState<FinanceRequisition | null>(null);
    const [correcting, setCorrecting] = useState<RequisitionCorrectionData | null>(null);
    const [rejecting, setRejecting] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [observationFinance, setObservationFinance] = useState('');
    const [activeInputId, setActiveInputId] = useState<string | null>(null);

    const [financeCaisse, setFinanceCaisse] = useState<string>('');
    const [editedArticles, setEditedArticles] = useState<FinanceLine[]>([]);

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

    const round = (num: number, decimals: number) => {
        return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
    };

    const getBudgetLineObject = (code: string, projectId?: string) => {
        if (!code.trim()) return null;
        const normalized = code.trim().toLowerCase();
        return allBudgetLines.find(
            (l) => l.normalizedCode === normalized && (!projectId || l.project_id === projectId)
        ) || null;
    };

    const pendingCount = requisitions.filter((item) => item.canDecide).length;
    const decaissementPretCount = requisitions.filter((item) => item.statusCode === 'decaissement_caisse').length;
    const decaisseCount = requisitions.filter((item) => item.statusCode === 'decaisse').length;

    const chartData = useMemo(() => {
        const total = requisitions.length || 1;
        const pending = requisitions.filter((item) => item.canDecide).length;
        const processed = requisitions.length - pending;

        const pctProcessed = requisitions.length > 0 ? Math.min(100, Math.round((processed / total) * 100)) : 0;
        const pctPending = requisitions.length > 0 ? Math.max(0, 100 - pctProcessed) : 0;
        const isEmpty = requisitions.length === 0;

        return { total, pending, processed, pctProcessed, pctPending, isEmpty };
    }, [requisitions]);

    const gaugeData = useMemo(() => {
        const total = requisitions.length || 1;
        const paid = requisitions.filter(r => r.statusCode === 'decaisse').length;
        const ready = requisitions.filter(r => r.statusCode === 'decaissement_caisse').length;
        
        const pctPaid = requisitions.length > 0 ? Math.round((paid / total) * 100) : 0;
        const pctReady = requisitions.length > 0 ? Math.round((ready / total) * 100) : 0;
        
        return { paid, ready, pctPaid, pctReady, isEmpty: requisitions.length === 0 };
    }, [requisitions]);

    const recentReqs = useMemo(() => {
        return [...requisitions].slice(0, 10).reverse();
    }, [requisitions]);

    const maxReqAmount = useMemo(() => {
        if (!recentReqs.length) return 1;
        return Math.max(...recentReqs.map(r => r.montantTotal));
    }, [recentReqs]);

    const filteredRequisitions = useMemo(() => {
        return requisitions.filter((item) => {
            if (statusFilter === 'pending' && !item.canDecide) return false;
            if (statusFilter === 'controle_finance' && item.statusCode !== 'controle_finance' && item.statusCode !== 'visa_admin') return false;
            if (statusFilter === 'decaissement_caisse' && item.statusCode !== 'decaissement_caisse') return false;
            if (statusFilter === 'decaisse' && item.statusCode !== 'decaisse') return false;
            if (statusFilter === 'returned' && item.statusCode !== 'returned_to_project_manager') return false;

            if (selectedProject !== 'all' && item.project_id !== selectedProject && item.projet !== selectedProject) {
                return false;
            }

            if (selectedCaisse !== 'all' && item.caisseAttribuee !== selectedCaisse) {
                return false;
            }

            if (selectedNature !== 'all' && item.nature !== selectedNature) {
                return false;
            }

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchNum = item.numero.toLowerCase().includes(q);
                const matchUser = item.initiateurNom.toLowerCase().includes(q);
                const matchProj = item.projet.toLowerCase().includes(q);
                const matchObs = item.observation?.toLowerCase().includes(q) ?? false;
                const matchLigne = item.lignes.some((l) =>
                    (l.codeAllocation || l.codeBudget || '').toLowerCase().includes(q) ||
                    l.activite.toLowerCase().includes(q)
                );
                if (!matchNum && !matchUser && !matchProj && !matchObs && !matchLigne) {
                    return false;
                }
            }

            return true;
        });
    }, [requisitions, statusFilter, selectedProject, selectedCaisse, selectedNature, searchQuery]);

    const handleOpenExamen = (item: FinanceRequisition) => {
        setSelected(item);
        setRejecting(false);
        setRejectionReason('');
        setObservationFinance('');
        
        // Restriction stricte de la devise pour l'affectation de la caisse
        const matchedCaisses = cashRegisters.filter(c => c.devise === item.devise);
        const initialCaisse = matchedCaisses.some(c => c.name === item.caisseAttribuee)
            ? item.caisseAttribuee
            : matchedCaisses[0]?.name || '';
        setFinanceCaisse(initialCaisse || '');

        // Copie de travail (édition de l'activité, codes, et des ventilations)
        setEditedArticles(item.lignes.map(l => ({
            ...l,
            splits: l.splits ? l.splits.map(s => ({ ...s })) : []
        })));
    };

    // --- LOGIQUE D'ÉDITION POUR LE FINANCIER ---
    const updateArticleField = (index: number, field: keyof FinanceLine, value: any) => {
        // Restriction formelle : Le Financier ne modifie ni Qté, ni P.U., ni Total.
        if (field === 'quantiteOuDuree' || field === 'prixUnitaire' || field === 'total') return;

        setEditedArticles((prev) => {
            const next = [...prev];
            (next[index] as any)[field] = value;
            return next;
        });
    };

    const addSplitToArticle = (artIndex: number) => {
        setEditedArticles((prev) => {
            const next = [...prev];
            const currentSplits = next[artIndex].splits ? [...next[artIndex].splits!] : [];
            const dejaVentile = currentSplits.reduce((acc, s) => acc + s.montant, 0);
            const reste = Math.max(0, next[artIndex].total - dejaVentile);

            currentSplits.push({
                code_allocation: '',
                montant: reste,
            });
            next[artIndex].splits = currentSplits;
            return next;
        });
    };

    const removeSplitFromArticle = (artIndex: number, splitIndex: number) => {
        setEditedArticles((prev) => {
            const next = [...prev];
            const currentSplits = [...next[artIndex].splits!];
            currentSplits.splice(splitIndex, 1);
            next[artIndex].splits = currentSplits;
            return next;
        });
    };

    const updateSplitField = (artIndex: number, splitIndex: number, field: 'code_allocation' | 'montant', val: any) => {
        setEditedArticles((prev) => {
            const next = [...prev];
            const currentSplits = [...next[artIndex].splits!];
            (currentSplits[splitIndex] as any)[field] = field === 'montant' ? Number(val) : val;
            next[artIndex].splits = currentSplits;
            return next;
        });
    };

    // DÉTECTION STRICTE DES DÉPASSEMENTS BUDGÉTAIRES (Lignes et Splits)
    const hasDepassement = useMemo(() => {
        if (!selected) return false;
        return editedArticles.some((ligne) => {
            if (ligne.splits && ligne.splits.length > 0) {
                // Vérifier si un des splits dépasse son propre solde disponible
                return ligne.splits.some(split => {
                    const bLine = getBudgetLineObject(split.code_allocation, selected.project_id);
                    if (!bLine) return false;
                    return split.montant > bLine.solde;
                });
            }
            const code = ligne.codeAllocation || ligne.codeBudget || '';
            const bLine = getBudgetLineObject(code, selected.project_id);
            const solde = bLine ? bLine.solde : ligne.budget_solde_actuel;
            return solde !== null && solde !== undefined && ligne.total > solde;
        });
    }, [selected, editedArticles, allBudgetLines]);

    const handleTriggerApprove = () => {
        if (!selected) return;

        if (!financeCaisse) {
            showToast('error', `Veuillez sélectionner une caisse physique valide en ${selected.devise}.`);
            return;
        }

        // Vérification rigoureuse des splits et des codes budgétaires
        for (let i = 0; i < editedArticles.length; i++) {
            const art = editedArticles[i];
            if (art.splits && art.splits.length > 0) {
                const sum = round(art.splits.reduce((acc, s) => acc + s.montant, 0), 2);
                if (Math.abs(sum - art.total) > 0.05) {
                    showToast('error', `Erreur de ventilation sur « ${art.activite} » : La somme répartie (${sum}) doit correspondre au total de la ligne (${art.total}).`);
                    return;
                }
                if (art.splits.some(s => !s.code_allocation.trim())) {
                    showToast('error', `Veuillez spécifier un code budgétaire pour chaque part sur « ${art.activite} ».`);
                    return;
                }
            } else if (!(art.codeAllocation?.trim() || art.codeBudget?.trim())) {
                showToast('error', `Veuillez attribuer un code budgétaire valide à la ligne « ${art.activite} ».`);
                return;
            }
        }

        if (hasDepassement) {
            showToast('error', 'Blocage strict : Une ou plusieurs lignes dépassent le solde budgétaire disponible. Veuillez ajuster les imputations ou rejeter le dossier.');
            return;
        }

        setPinSaisi('');
        setPinError(null);
        setPinModalOpen(true);
    };

    const handleConfirmSignature = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selected || !pinSaisi) return;
        if (hasDepassement) return;

        setProcessing(true);
        setPinError(null);

        const articlesPayload = editedArticles.map((art) => ({
            id: art.id,
            activite: art.activite, // Le financier a le droit de reformuler l'activité
            quantiteOuDuree: art.quantiteOuDuree,
            prixUnitaire: art.prixUnitaire,
            code_allocation: art.codeAllocation || art.codeBudget || '',
            splits: art.splits && art.splits.length > 0
                ? art.splits.map((split) => ({
                    id: split.id,
                    code_allocation: split.code_allocation,
                    montant: split.montant,
                }))
                : null,
        }));

        const currentNumero = selected.numero;

        router.patch(
            route('requisitions.finance-decision', selected.id),
            {
                decision: 'approve',
                pin: pinSaisi.trim(),
                observation: observationFinance.trim() || null,
                caisse_decaissement: financeCaisse,
                articles: articlesPayload,
            },
            {
                preserveScroll: true,
                onFinish: () => setProcessing(false),
                onSuccess: () => {
                    setPinModalOpen(false);
                    setSelected(null);
                    setPinSaisi('');
                    setObservationFinance('');
                    router.reload();
                    showToast('success', `Visa Financier validé avec succès sur ${currentNumero}. Transmis à la Direction.`);
                },
                onError: (errors) => {
                    setPinError((errors as any).pin || 'Code PIN financier incorrect ou non configuré.');
                },
            }
        );
    };

    const handleRejectFinance = () => {
        if (!selected || !rejectionReason.trim()) {
            showToast('error', 'Veuillez obligatoirement spécifier le motif du rejet financier.');
            return;
        }

        setProcessing(true);
        const currentNumero = selected.numero;

        router.patch(
            route('requisitions.finance-decision', selected.id),
            {
                decision: 'reject',
                pin: '0000',
                motif_rejet: rejectionReason.trim(),
            },
            {
                preserveScroll: true,
                onFinish: () => setProcessing(false),
                onSuccess: () => {
                    setSelected(null);
                    setRejecting(false);
                    setRejectionReason('');
                    router.reload({ preserveUrl: true });
                    showToast('error', `Réquisition ${currentNumero} retournée au Chef de Projet pour arbitrage.`);
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
        const caisseName = sessionToAuthorize.caisse_name;

        router.patch(
            route('cashier.session.authorize-opening', sessionToAuthorize.id),
            { pin: sessionPin.trim() },
            {
                preserveScroll: true,
                onFinish: () => setAuthorizingSession(false),
                onSuccess: () => {
                    setSessionToAuthorize(null);
                    setSessionPin('');
                    router.reload();
                    showToast('success', `Guichet ${caisseName} ouvert avec succès.`);
                },
                onError: (errs) => {
                    setSessionPinError(errs.pin || 'Code PIN financier incorrect.');
                },
            }
        );
    };

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
                            <span className="text-[#04326D]">Étape 3 : Contrôle Budgétaire & Visa Financier</span>
                        </nav>
                        <h1 className="text-xl font-bold text-[#0B192C]">
                            Contrôle Budgétaire, Caisses & Visas
                        </h1>
                        <p className="text-[12px] text-gray-500 mt-1">
                            Financier : <strong className="text-[#0B192C]">{user.name}</strong> • Examen des dossiers après le visa du PAM.
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

                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-white p-4 rounded border border-[#B2BED6] shadow-sm flex flex-col justify-between border-l-4 border-l-[#F58F20]">
                        <span className="text-[10.5px] font-bold uppercase tracking-wider text-gray-500">
                            En attente de Visa Finance (après PAM)
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

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Donut Graphique */}
                    <div className="bg-white border border-[#B2BED6] rounded-lg p-5 shadow-sm space-y-3">
                        <div className="flex items-center justify-between border-b pb-2.5">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B192C] flex items-center gap-1.5">
                                <PieChart className="w-4 h-4 text-[#04326D]" />
                                <span>Statut Global des Dossiers</span>
                            </h3>
                            <span className="text-[10px] font-mono text-gray-500 font-bold">
                                {requisitions.length} Total
                            </span>
                        </div>

                        <div className="flex items-center justify-center gap-6 pt-2">
                            <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                    <path
                                        className={chartData.isEmpty ? "text-gray-200" : "text-[#F58F20]"}
                                        strokeWidth="4"
                                        stroke="currentColor"
                                        fill="none"
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                    {!chartData.isEmpty && (
                                        <path
                                            className="text-emerald-500 transition-all duration-700 ease-out"
                                            strokeDasharray={`${chartData.pctProcessed}, 100`}
                                            strokeWidth="4"
                                            strokeLinecap="round"
                                            stroke="currentColor"
                                            fill="none"
                                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                        />
                                    )}
                                </svg>
                                <div className="absolute text-center">
                                    <span className="text-xs font-black font-mono text-[#0B192C] block">
                                        {chartData.isEmpty ? '-' : `${chartData.pctProcessed}%`}
                                    </span>
                                    <span className="text-[8px] font-bold uppercase text-gray-400 block -mt-0.5">
                                        Traité
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-1.5 text-[11px] flex-1">
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-1.5 text-gray-600">
                                        <span className={`w-2.5 h-2.5 rounded-full ${chartData.isEmpty ? 'bg-gray-300' : 'bg-emerald-500'}`} />
                                        Traités :
                                    </span>
                                    <strong className="font-mono text-emerald-800">
                                        {chartData.processed}
                                    </strong>
                                </div>
                                <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                                    <span className="flex items-center gap-1.5 text-gray-600">
                                        <span className={`w-2.5 h-2.5 rounded-full ${chartData.isEmpty ? 'bg-gray-300' : 'bg-[#F58F20]'}`} />
                                        En attente Finance :
                                    </span>
                                    <strong className="font-mono text-[#F58F20]">
                                        {chartData.pending}
                                    </strong>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Jauge Progression */}
                    <div className="bg-white border border-[#B2BED6] rounded-lg p-5 shadow-sm space-y-3">
                        <div className="flex items-center justify-between border-b pb-2.5">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B192C] flex items-center gap-1.5">
                                <BarChart3 className="w-4 h-4 text-emerald-700" />
                                <span>Progression des Paiements</span>
                            </h3>
                            <span className="text-[10px] font-mono text-gray-500 font-bold">
                                Global
                            </span>
                        </div>

                        <div className="space-y-2 pt-1 text-xs">
                            <div className="flex justify-between items-center text-[11px]">
                                <span className="text-gray-600">Taux de décaissement (Payés) :</span>
                                <strong className="font-mono text-sm text-[#04326D]">
                                    {gaugeData.pctPaid}%
                                </strong>
                            </div>

                            <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden flex relative">
                                <div
                                    className={`${gaugeData.isEmpty ? 'bg-gray-300' : 'bg-emerald-500'} transition-all duration-700`}
                                    style={{ width: `${gaugeData.pctPaid}%` }}
                                    title={`Décaissés: ${gaugeData.pctPaid}%`}
                                />
                                <div
                                    className={`${gaugeData.isEmpty ? 'bg-gray-200' : 'bg-[#04326D]'} transition-all duration-700`}
                                    style={{ width: `${gaugeData.pctReady}%` }}
                                    title={`Prêts pour Caisse: ${gaugeData.pctReady}%`}
                                />
                            </div>

                            <div className="p-2.5 bg-gray-50 rounded border border-gray-100 space-y-1 text-[11px]">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Prêts pour la caisse (Bon à Payer) :</span>
                                    <strong className="font-mono text-[#04326D]">{gaugeData.ready}</strong>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Déjà décaissés physiquement :</span>
                                    <strong className="font-mono text-emerald-700">{gaugeData.paid}</strong>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Diagramme à barres */}
                    <div className="bg-white border border-[#B2BED6] rounded-lg p-5 shadow-sm space-y-3">
                        <div className="flex items-center justify-between border-b pb-2.5">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B192C] flex items-center gap-1.5">
                                <Activity className="w-4 h-4 text-[#04326D]" />
                                <span>Flux (10 Dernières)</span>
                            </h3>
                            <span className="text-[10px] font-mono text-gray-500 font-bold">
                                Max: {money(maxReqAmount, 'USD/FC')}
                            </span>
                        </div>

                        <div className="pt-5 flex items-end justify-between h-40 gap-2 relative">
                            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20 pb-5">
                                {[1,2,3,4].map(i => <div key={i} className="border-b border-gray-400 w-full h-0"></div>)}
                            </div>

                            {recentReqs.length === 0 ? (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs italic pb-5">
                                    Aucune donnée disponible.
                                </div>
                            ) : (
                                recentReqs.map((req) => {
                                    const heightPct = Math.max((req.montantTotal / maxReqAmount) * 100, 2);
                                    
                                    let barColor = 'bg-gray-400';
                                    if (req.statusCode === 'decaisse') barColor = 'bg-emerald-500';
                                    else if (req.statusCode === 'decaissement_caisse') barColor = 'bg-[#04326D]';
                                    else if (req.canDecide) barColor = 'bg-[#F58F20]'; 
                                    else if (req.statusCode === 'returned_to_project_manager') barColor = 'bg-red-500';

                                    return (
                                        <div key={req.id} className="relative group flex-1 flex flex-col items-center justify-end h-full">
                                            <div className="absolute bottom-[calc(100%+0.5rem)] mb-0 hidden group-hover:block z-10 w-max max-w-[160px] bg-gray-900 text-white text-[10px] p-2.5 rounded shadow-lg text-center animate-fade-in">
                                                <span className="font-bold border-b border-gray-700 pb-1 mb-1 block">
                                                    {req.numero}
                                                </span>
                                                <span className="font-mono text-xs block text-blue-300">
                                                    {money(req.montantTotal, req.devise)}
                                                </span>
                                                <span className="text-gray-300 block mt-1">{req.statusLabel}</span>
                                            </div>
                                            
                                            <div
                                                className={`w-full max-w-[2rem] rounded-t-sm transition-all duration-700 ease-out hover:opacity-80 cursor-pointer ${barColor}`}
                                                style={{ height: `calc(${heightPct}% - 20px)` }}
                                            />
                                            <span className="text-[9px] font-mono mt-2 text-gray-500 truncate w-full text-center h-4">
                                                ...{req.numero.split('-').pop()}
                                            </span>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* État des caisses */}
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
                            <div key={c.id} className="p-3 bg-gray-50 border border-gray-200 rounded flex flex-col justify-between space-y-2">
                                <div className="flex items-start justify-between">
                                    <strong className="text-[#0B192C]">{c.name}</strong>
                                    {c.is_ouverte ? (
                                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                            Ouverte
                                        </span>
                                    ) : (
                                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">
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

                {/* Liste des réquisitions */}
                <div className="bg-white border border-[#B2BED6] rounded shadow-sm overflow-hidden">
                    <div className="border-b px-4 py-3 bg-gray-50 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative">
                                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                    type="text"
                                    placeholder="Recherche instantanée (N°, agent...)"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-8 pr-3 py-1 border border-[#B2BED6] rounded text-xs bg-white text-[#0B192C] w-64 focus:outline-none focus:border-[#04326D]"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                )}
                            </div>

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
                                <option value="returned">Renvoyées au PM</option>
                            </select>
                        </div>

                        <span className="text-[11px] font-bold text-gray-500 font-mono">
                            {filteredRequisitions.length} dossier(s) trouvé(s)
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
                            <tbody className="divide-y divide-[#E2E8F0] text-gray-700">
                                {filteredRequisitions.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-12 text-center text-gray-400 italic">
                                            Aucune réquisition ne correspond à la recherche et aux filtres.
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
                                                    <span className="px-2 py-0.5 rounded bg-red-50 border border-red-200 text-red-700 font-bold text-[9px] uppercase">
                                                        Urgent
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 text-[10px]">Normal</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                                <span
                                                    className={`px-2.5 py-0.5 border rounded text-[10px] font-bold ${
                                                        item.canDecide
                                                            ? 'bg-amber-50 text-[#F58F20] border-amber-200'
                                                            : item.statusCode === 'decaisse'
                                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                            : item.statusCode === 'decaissement_caisse'
                                                            ? 'bg-blue-50 text-[#04326D] border-blue-200'
                                                            : 'bg-amber-50 text-[#F58F20] border-amber-200'
                                                    }`}
                                                >
                                                    {item.canDecide ? 'À Viser' : item.statusLabel}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => setDirectorPreviewReq(item)}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-semibold transition"
                                                        title="Aperçu de l'historique des signatures"
                                                    >
                                                        <LayoutTemplate className="w-3.5 h-3.5 text-[#04326D]" />
                                                        <span className="hidden xl:inline">Historique Visas</span>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenExamen(item)}
                                                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded font-bold text-xs shadow-sm transition ${
                                                            item.canDecide ? 'bg-[#04326D] hover:bg-[#06428f] text-white' : 'bg-gray-700 hover:bg-gray-800 text-white'
                                                        }`}
                                                    >
                                                        <ShieldCheck className="w-3.5 h-3.5" />
                                                        <span>{item.canDecide ? 'Examiner & Viser' : 'Imputations'}</span>
                                                    </button>
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

            {/* APERÇU CONSOLIDÉ (Historique des signatures et lignes de dépenses) */}
            {directorPreviewReq && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 animate-fade-in">
                    <div className="bg-white rounded border border-[#B2BED6] shadow-2xl max-w-5xl w-full p-6 space-y-4 max-h-[95vh] overflow-y-auto">
                        <header className="flex items-start justify-between border-b pb-3">
                            <div>
                                <span className="text-[10px] bg-blue-100 text-[#04326D] font-bold uppercase px-2 py-0.5 rounded">
                                    Historique des Visas & Approbations
                                </span>
                                <h2 className="text-base font-bold text-[#0B192C] mt-1 flex items-center gap-2">
                                    Réquisition {directorPreviewReq.numero} ({directorPreviewReq.nature})
                                    {directorPreviewReq.is_urgent && (
                                        <span className="bg-red-100 text-red-800 text-[9px] px-1.5 py-0.5 rounded font-black uppercase">
                                            URGENT
                                        </span>
                                    )}
                                </h2>
                                <p className="text-xs text-gray-500">
                                    Projet : <strong>{directorPreviewReq.projet}</strong> • Caisse : <strong>{directorPreviewReq.caisseAttribuee || 'Non assignée'}</strong>
                                </p>
                            </div>
                            <button onClick={() => setDirectorPreviewReq(null)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </header>

                        <div className="space-y-2">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                Chaîne des Visas & Signatures Numériques
                            </h3>
                            {directorPreviewReq.signatures && directorPreviewReq.signatures.length === 0 ? (
                                <p className="text-xs text-gray-400 italic">Aucune signature enregistrée pour le moment.</p>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                    {directorPreviewReq.signatures?.map((sig, idx) => (
                                        <div key={idx} className="p-2.5 rounded border border-gray-200 bg-gray-50 text-[11px] space-y-1">
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold uppercase text-[#04326D]">{sig.role}</span>
                                                <span className="text-[9px] text-gray-400 font-mono">{sig.date}</span>
                                            </div>
                                            <p className="font-semibold text-gray-800">{sig.nom}</p>
                                            <p className="text-[10px] text-gray-500 font-mono truncate" title={sig.hash}>
                                                {sig.code}
                                            </p>
                                            {sig.commentaire && (
                                                <p className="text-[10px] italic text-gray-600 bg-white p-1 rounded border mt-1">
                                                    « {sig.commentaire} »
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Lignes de dépenses */}
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2 mt-4">
                                Détail des Lignes de Dépenses ({directorPreviewReq.lignes.length})
                            </h3>
                            <table className="w-full text-left text-xs border border-gray-200">
                                <thead className="bg-[#0B192C] text-white">
                                    <tr>
                                        <th className="p-2 w-1/3">Désignation</th>
                                        <th className="p-2 w-1/3">Code Imputation / Ventilation</th>
                                        <th className="p-2 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y text-gray-700">
                                    {directorPreviewReq.lignes.map((l) => (
                                        <tr key={l.id}>
                                            <td className="p-2 font-medium">{l.activite}</td>
                                            <td className="p-2 font-mono text-[#04326D]">
                                                {l.splits && l.splits.length > 0 ? (
                                                    <div className="space-y-1">
                                                        {l.splits.map((s, i) => (
                                                            <div key={i} className="flex justify-between items-center bg-blue-50/50 p-1 rounded text-[10px]">
                                                                <span className="font-bold">{s.code_allocation}</span>
                                                                <span className="text-gray-600">{money(s.montant, directorPreviewReq.devise)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    l.codeAllocation || l.codeBudget || '—'
                                                )}
                                            </td>
                                            <td className="p-2 text-right font-mono font-bold text-[#0B192C]">
                                                {money(l.total, directorPreviewReq.devise)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-gray-50 font-bold border-t">
                                    <tr>
                                        <td colSpan={2} className="p-2 text-right">Total Général :</td>
                                        <td className="p-2 text-right text-sm font-mono text-[#04326D]">
                                            {money(directorPreviewReq.montantTotal, directorPreviewReq.devise)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        <div className="flex justify-end pt-3 border-t">
                            <button
                                type="button"
                                onClick={() => setDirectorPreviewReq(null)}
                                className="px-4 py-2 bg-gray-800 text-white rounded text-xs font-semibold hover:bg-black transition"
                            >
                                Fermer l'historique
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODALE D'EXAMEN & D'IMPUTATION FINANCIÈRE */}
            {selected && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in"
                    onClick={() => setActiveInputId(null)}
                >
                    <div 
                        className="w-full max-w-[95vw] lg:max-w-7xl max-h-[95vh] overflow-y-auto bg-white border border-[#B2BED6] shadow-2xl rounded p-6 space-y-4 animate-slide-down flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <header className="flex items-start justify-between border-b pb-3 shrink-0">
                            <div>
                                <span className="text-[10px] uppercase font-bold text-[#F58F20] bg-amber-50 border border-amber-200 px-2 py-0.5 rounded tracking-wider">
                                    Étape 3 : Contrôle Budgétaire & Visa Financier (Après PAM)
                                </span>
                                <h2 className="text-base font-bold text-[#0B192C] mt-1.5">
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

                        {/* BANNIÈRE DE BLOCAGE SI DÉPASSEMENT DÉTECTÉ */}
                        {hasDepassement && (
                            <div className="p-3 bg-red-100 border-2 border-red-500 rounded text-xs text-red-900 font-bold flex items-center gap-2 shadow-sm animate-pulse shrink-0">
                                <AlertTriangle className="w-5 h-5 text-red-700 shrink-0" />
                                <span>
                                    BLOCAGE AUTOMATIQUE : Le crédit budgétaire disponible sur au moins une des lignes est dépassé. La signature du visa est strictement interdite. Veuillez rejeter le dossier ou ajuster les imputations.
                                </span>
                            </div>
                        )}

                        {selected.canDecide && (
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shrink-0">
                                <div>
                                    <strong className="text-[#F58F20] block">Caisse d'imputation et de décaissement</strong>
                                    <span className="text-amber-900 text-[11px]">
                                        Vous devez sélectionner une caisse physique dont la devise correspond ({selected.devise}).
                                    </span>
                                </div>
                                <select
                                    value={financeCaisse}
                                    onChange={(e) => setFinanceCaisse(e.target.value)}
                                    className="border border-amber-300 rounded px-3 py-1.5 text-xs font-bold text-[#0B192C] bg-white min-w-[200px] focus:outline-none focus:border-[#F58F20]"
                                >
                                    {cashRegisters.filter(c => c.devise === selected.devise).length === 0 && (
                                        <option value="">-- Aucune caisse en {selected.devise} --</option>
                                    )}
                                    {cashRegisters.filter(c => c.devise === selected.devise).map((c) => (
                                        <option key={c.id} value={c.name}>
                                            {c.name} ({c.devise})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {selected.observation && (
                            <div className="p-3 bg-amber-50 border-l-4 border-[#F58F20] text-xs text-gray-800 rounded-r shrink-0">
                                <strong>Observation initiale :</strong> {selected.observation}
                            </div>
                        )}

                        {selected.derniere_observation && (
                            <div className="p-3 bg-blue-50 border-l-4 border-[#04326D] text-xs text-gray-800 rounded-r shrink-0">
                                <strong>Observation formulée par le PAM :</strong> {selected.derniere_observation}
                            </div>
                        )}

                        {/* Tableau des lignes */}
                        <div className="flex-1 overflow-visible min-h-0 flex flex-col">
                            <div className="flex items-center justify-between mb-2 shrink-0">
                                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                                    Contrôle et Ajustement des Imputations Budgétaires
                                </h3>
                                {selected.canDecide && (
                                    <span className="text-[10px] text-[#04326D] font-bold flex items-center gap-1 bg-blue-50 px-2 py-1 rounded">
                                        <Coins className="w-3.5 h-3.5 text-[#04326D]" />
                                        Vous pouvez modifier la désignation, les imputations et la ventilation (les montants globaux sont bloqués).
                                    </span>
                                )}
                            </div>

                            <div className="border border-[#B2BED6] rounded flex-1 overflow-visible">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-[#0B192C] text-white font-bold">
                                        <tr>
                                            <th className="p-2.5">Désignation</th>
                                            <th className="p-2.5 w-20 text-center">Qté/Durée</th>
                                            <th className="p-2.5 w-24 text-right">P.U.</th>
                                            <th className="p-2.5 min-w-[340px]">Code Imputé & Ventilation (Splits)</th>
                                            <th className="p-2.5 text-right">Solde Dispo</th>
                                            <th className="p-2.5 text-right">Total Ligne</th>
                                            <th className="p-2.5 text-center">Faisabilité</th>
                                            <th className="p-2.5">Justificatifs</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#E2E8F0] text-gray-700">
                                        {editedArticles.map((line, artIdx) => {
                                            const hasSplits = line.splits && line.splits.length > 0;
                                            const currentCode = line.codeAllocation ?? line.codeBudget ?? '';
                                            const matchedLine = getBudgetLineObject(currentCode, selected.project_id);
                                            const soldeDispo = matchedLine ? matchedLine.solde : line.budget_solde_actuel;
                                            const depassement = soldeDispo !== null && soldeDispo !== undefined && line.total > soldeDispo && !hasSplits;

                                            const sumSplits = hasSplits ? round(line.splits!.reduce((acc, s) => acc + s.montant, 0), 2) : 0;
                                            const splitDifference = hasSplits ? round(line.total - sumSplits, 2) : 0;
                                            const isSplitExact = hasSplits && Math.abs(splitDifference) <= 0.05;

                                            return (
                                                <tr key={line.id} className={depassement && !hasSplits ? 'bg-red-50/60 font-semibold' : ''}>
                                                    <td className="p-2.5 align-top min-w-[150px]">
                                                        {selected.canDecide ? (
                                                            <textarea
                                                                rows={2}
                                                                value={line.activite}
                                                                onChange={(e) => updateArticleField(artIdx, 'activite', e.target.value)}
                                                                className="w-full border border-gray-300 rounded p-1.5 text-xs font-semibold focus:border-[#04326D] resize-none focus:ring-1 focus:ring-[#04326D]"
                                                            />
                                                        ) : (
                                                            <span className="font-medium max-w-[200px] truncate block" title={line.activite}>{line.activite}</span>
                                                        )}
                                                    </td>
                                                    <td className="p-2.5 align-top text-center font-mono text-gray-600 bg-gray-50 cursor-not-allowed">
                                                        {line.quantiteOuDuree}
                                                    </td>
                                                    <td className="p-2.5 align-top text-right font-mono text-gray-600 bg-gray-50 cursor-not-allowed">
                                                        {money(line.prixUnitaire, selected.devise)}
                                                    </td>
                                                    <td className="p-2.5 align-top relative">
                                                        {!hasSplits ? (
                                                            <div className="space-y-1.5">
                                                                {selected.canDecide ? (
                                                                    <div className="flex gap-2 items-start">
                                                                        <div className="flex-1 relative">
                                                                            <BudgetLineSearchPicker
                                                                                currentCode={currentCode}
                                                                                projectId={selected.project_id}
                                                                                allBudgetLines={allBudgetLines}
                                                                                lineTotal={line.total}
                                                                                devise={selected.devise}
                                                                                onSelectCode={(code) => {
                                                                                    const newArticles = [...editedArticles];
                                                                                    newArticles[artIdx].codeAllocation = code;
                                                                                    setEditedArticles(newArticles);
                                                                                }}
                                                                            />
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => addSplitToArticle(artIdx)}
                                                                            className="px-2 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded text-[11px] font-bold flex items-center gap-1 shrink-0 transition"
                                                                        >
                                                                            <Layers className="w-3.5 h-3.5" />
                                                                            <span>Ventiler</span>
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <div>
                                                                        <span className="font-mono font-bold text-[#04326D] block">
                                                                            {line.codeAllocation || line.codeBudget || 'Non attribué'}
                                                                        </span>
                                                                        <span className="text-[10px] text-gray-500 block truncate" title={line.libelleAllocation || ''}>
                                                                            {line.libelleAllocation || 'Non assigné'}
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="p-2.5 bg-purple-50/60 border border-purple-200 rounded-lg space-y-2 relative">
                                                                <div className="flex items-center justify-between text-[11px] font-bold">
                                                                    <span className="text-purple-900 uppercase flex items-center gap-1">
                                                                        <Layers className="w-3.5 h-3.5" /> Ventilation ({line.splits!.length} codes)
                                                                    </span>
                                                                    <span className={isSplitExact ? 'text-emerald-700 font-bold' : 'text-red-700 font-bold'}>
                                                                        {isSplitExact ? '✓ Répartition exacte' : `⚠️ Reste : ${money(splitDifference, selected.devise)}`}
                                                                    </span>
                                                                </div>

                                                                {line.splits!.map((split, spIdx) => {
                                                                    return (
                                                                        <div key={spIdx} className="flex gap-2 items-start">
                                                                            {selected.canDecide ? (
                                                                                <div className="flex-1 relative min-w-[200px]">
                                                                                    <BudgetLineSearchPicker
                                                                                        currentCode={split.code_allocation}
                                                                                        projectId={selected.project_id}
                                                                                        allBudgetLines={allBudgetLines}
                                                                                        lineTotal={split.montant}
                                                                                        devise={selected.devise}
                                                                                        onSelectCode={(code) => updateSplitField(artIdx, spIdx, 'code_allocation', code)}
                                                                                    />
                                                                                </div>
                                                                            ) : (
                                                                                <span className="font-mono font-bold text-[#04326D] flex-1 block truncate pt-1">
                                                                                    {split.code_allocation}
                                                                                </span>
                                                                            )}
                                                                            
                                                                            <div className="flex items-center gap-1">
                                                                                <input
                                                                                    type="number"
                                                                                    step="any"
                                                                                    placeholder="Montant"
                                                                                    value={split.montant}
                                                                                    onChange={(e) => updateSplitField(artIdx, spIdx, 'montant', e.target.value)}
                                                                                    className="w-24 border border-purple-300 rounded p-1.5 text-xs font-mono font-bold text-right bg-white focus:outline-none focus:border-purple-500"
                                                                                    disabled={!selected.canDecide}
                                                                                />
                                                                                <span className="text-[11px] font-bold text-gray-500 w-6 pt-1">{selected.devise}</span>

                                                                                {selected.canDecide && (
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => removeSplitFromArticle(artIdx, spIdx)}
                                                                                        className="p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 rounded transition"
                                                                                        title="Supprimer cette part"
                                                                                    >
                                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}

                                                                {selected.canDecide && (
                                                                    <div className="flex justify-between items-center pt-1.5 mt-1 border-t border-purple-200">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => addSplitToArticle(artIdx)}
                                                                            className="text-[10.5px] font-bold text-purple-700 hover:bg-purple-100 px-1.5 py-1 rounded flex items-center gap-1 transition"
                                                                        >
                                                                            <Plus className="w-3 h-3" /> Ajouter un autre code
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => updateArticleField(artIdx, 'splits', [])}
                                                                            className="text-[10.5px] font-semibold text-red-600 hover:bg-red-50 px-1.5 py-1 rounded transition"
                                                                        >
                                                                            Annuler la ventilation
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-2.5 align-top text-right font-mono font-bold whitespace-nowrap">
                                                        {hasSplits ? (
                                                            <span className="text-[10px] text-gray-500">Multi-soldes</span>
                                                        ) : soldeDispo !== null && soldeDispo !== undefined ? (
                                                            money(soldeDispo, selected.devise)
                                                        ) : (
                                                            <span className="text-gray-400 font-normal">Non défini</span>
                                                        )}
                                                    </td>
                                                    <td className="p-2.5 align-top text-right font-mono font-black whitespace-nowrap text-[#0B192C] bg-gray-50">
                                                        {money(line.total, selected.devise)}
                                                    </td>
                                                    <td className="p-2.5 align-top text-center whitespace-nowrap">
                                                        {hasSplits ? (
                                                            <span className="px-2 py-0.5 rounded bg-purple-100 border border-purple-200 text-purple-800 text-[10px] font-bold">
                                                                Géré en backend
                                                            </span>
                                                        ) : soldeDispo === null || soldeDispo === undefined ? (
                                                            <span className="text-[10px] text-gray-400">À vérifier</span>
                                                        ) : depassement ? (
                                                            <span className="px-2 py-0.5 rounded bg-red-50 border border-red-200 text-red-800 text-[10px] font-bold">
                                                                Dépassement crédit
                                                            </span>
                                                        ) : (
                                                            <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                                                                Crédit suffisant
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-2.5 align-top">
                                                        {line.justificatifs.length > 0 ? (
                                                            <div className="space-y-1">
                                                                {line.justificatifs.map((f) => (
                                                                    <div key={f.id} className="flex items-center justify-between text-[10px] bg-gray-50 border border-gray-200 text-[#0B192C] px-2 py-0.5 rounded">
                                                                        <span className="truncate max-w-[110px]">{f.nom}</span>
                                                                        {f.fileUrl && (
                                                                            <a href={f.fileUrl} target="_blank" rel="noreferrer" className="text-[#04326D] underline font-bold ml-1">
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
                                    <tfoot className="bg-gray-50 font-bold border-t border-[#E2E8F0]">
                                        <tr>
                                            <td colSpan={5} className="p-2.5 text-right">Total Dossier :</td>
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
                            <div className="border-t pt-4 space-y-3 shrink-0">
                                {!rejecting ? (
                                    <div className="space-y-3">
                                        {/* Champ d'observation optionnel pour la Finance */}
                                        <div>
                                            <label className="block text-[11px] font-bold text-gray-700 mb-1">
                                                Observation / Note financière (Optionnel lors de la validation) :
                                            </label>
                                            <textarea
                                                rows={2}
                                                value={observationFinance}
                                                onChange={(e) => setObservationFinance(e.target.value)}
                                                placeholder="Ajouter une observation ou remarque pour la Direction Générale..."
                                                className="w-full border border-gray-300 rounded p-2 text-xs focus:outline-none focus:border-[#04326D] focus:ring-1 focus:ring-[#04326D]"
                                            />
                                        </div>

                                        <div className="flex items-center justify-between pt-2">
                                            <button
                                                type="button"
                                                onClick={() => setRejecting(true)}
                                                className="px-3.5 py-2 border border-red-300 text-red-600 hover:bg-red-50 rounded text-xs font-bold transition"
                                            >
                                                <Ban className="w-3.5 h-3.5 inline mr-1" />
                                                Rejeter (Renvoi au Manager Projet)
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
                                                    disabled={!financeCaisse || hasDepassement}
                                                    className={`px-4 py-2 text-white rounded text-xs font-bold shadow transition ${
                                                        !financeCaisse || hasDepassement ? 'bg-gray-400 cursor-not-allowed opacity-60' : 'bg-[#04326D] hover:bg-[#06428f]'
                                                    }`}
                                                    title={hasDepassement ? "Validation bloquée : dépassement budgétaire" : !financeCaisse ? "Veuillez sélectionner une caisse" : "Valider"}
                                                >
                                                    {!financeCaisse ? 'Caisse manquante' : hasDepassement ? 'Validation Bloquée' : 'Enregistrer & Viser aux Finances (PIN)'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-red-50 p-4 rounded border border-red-200 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <h4 className="text-xs font-bold text-red-800 uppercase">
                                                Motif du Rejet (Retour au Manager de Projet) *
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
                                            placeholder="Précisez obligatoirement le motif financier (dépassement, code non valide, etc.). Le dossier sera renvoyé au Chef de Projet."
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
                                                disabled={processing || !rejectionReason.trim()}
                                                className="px-4 py-1.5 bg-[#DC2626] hover:bg-[#b91c1c] text-white rounded text-xs font-bold shadow disabled:opacity-50"
                                            >
                                                Confirmer le Rejet au Chef de Projet
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MODALE DU PIN FINANCIER AVEC RÉCAPITULATIF DES IMPUTATIONS */}
            {pinModalOpen && selected && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 animate-fade-in">
                    <div className="bg-white rounded border-2 border-[#04326D] shadow-2xl max-w-md w-full p-6 space-y-4 animate-slide-down">
                        <div className="text-center border-b pb-3">
                            <div className="w-12 h-12 mx-auto rounded bg-blue-50 border border-blue-100 flex items-center justify-center mb-2">
                                <Lock className="w-5 h-5 text-[#04326D]" />
                            </div>
                            <h3 className="text-sm font-bold uppercase text-[#0B192C] tracking-wide">
                                Signature Finale & Visa Financier
                            </h3>
                            <p className="text-[11px] text-gray-500 mt-1">
                                Réquisition N° <strong className="font-mono text-[#04326D]">{selected.numero}</strong>
                            </p>
                        </div>

                        {/* --- NOUVEAU : RÉCAPITULATIF COMPLET AVANT DE VALIDER --- */}
                        <div className="bg-gray-50 border border-gray-200 rounded p-3 text-xs max-h-52 overflow-y-auto">
                            <h4 className="font-bold text-gray-700 flex items-center gap-1.5 uppercase tracking-wider text-[10px] mb-2 border-b border-gray-200 pb-1">
                                <FileText className="w-3.5 h-3.5" />
                                Récapitulatif des Imputations (Validation Finale)
                            </h4>
                            <ul className="space-y-3">
                                {editedArticles.map((art, idx) => (
                                    <li key={idx} className="flex flex-col">
                                        <span className="font-semibold text-gray-800 text-[11px] mb-0.5 leading-tight">{art.activite}</span>
                                        {art.splits && art.splits.length > 0 ? (
                                            <div className="pl-3 border-l-2 border-purple-300 space-y-1 mt-0.5">
                                                {art.splits.map((s, i) => (
                                                    <div key={i} className="flex justify-between items-center text-[10px]">
                                                        <span className="font-mono font-bold text-purple-700 bg-purple-50 px-1 rounded">{s.code_allocation || 'Code manquant'}</span>
                                                        <span className="text-gray-600">{money(s.montant, selected.devise)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex justify-between items-center text-[10px] pl-3 border-l-2 border-[#04326D] mt-0.5">
                                                <span className="font-mono font-bold text-[#04326D] bg-blue-50 px-1 rounded">
                                                    {art.codeAllocation || art.codeBudget || 'Non attribué'}
                                                </span>
                                                <span className="text-gray-600">{money(art.total, selected.devise)}</span>
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-3 pt-2 border-t border-gray-200 flex flex-col gap-1.5">
                                <div className="flex justify-between items-center text-[11px] text-gray-600">
                                    <span>Caisse Sélectionnée :</span>
                                    <span className="font-bold text-[#0B192C]">{financeCaisse}</span>
                                </div>
                                <div className="flex justify-between items-center font-bold text-[#0B192C]">
                                    <span>Total à décaisser :</span>
                                    <span className="text-[#04326D] font-mono text-sm">{money(selected.montantTotal, selected.devise)}</span>
                                </div>
                            </div>
                        </div>
                        {/* -------------------------------------------------------- */}

                        {pinError && (
                            <div className="p-2.5 bg-red-50 border border-red-300 text-red-800 rounded text-xs text-center font-semibold">
                                {pinError}
                            </div>
                        )}

                        <form onSubmit={handleConfirmSignature} className="space-y-3 text-xs pt-1">
                            <div>
                                <label className="block font-bold text-gray-700 mb-1">
                                    Saisissez votre Code PIN personnel financier *
                                </label>
                                <div className="relative">
                                    <KeyRound className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    <input
                                        type="password"
                                        maxLength={6}
                                        placeholder="••••"
                                        value={pinSaisi}
                                        onChange={(e) => setPinSaisi(e.target.value)}
                                        className="w-full pl-8 pr-3 py-2 border border-[#B2BED6] rounded text-lg font-mono tracking-widest text-center text-[#0B192C] focus:outline-none focus:border-[#04326D]"
                                        autoFocus
                                        required
                                    />
                                </div>
                            </div>

                            <p className="text-[10px] text-gray-400 leading-tight text-center">
                                En signant, vous validez définitivement ces imputations (et leurs ventilations) pour le décaissement et l'examen final par la DG.
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
                                    className="px-4 py-1.5 bg-[#04326D] hover:bg-[#06428f] text-white rounded text-xs font-bold shadow transition disabled:opacity-50"
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
                    budgetLines={allBudgetLines}
                    onClose={() => setCorrecting(null)}
                    onSuccess={() => {
                        setCorrecting(null);
                        router.reload({ preserveUrl: true });
                        showToast('success', `Réquisition ${correcting.numero} corrigée.`);
                    }}
                />
            )}
        </AppLayout>
    );
}