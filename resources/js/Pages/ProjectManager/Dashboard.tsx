import { useState, useMemo, useEffect } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import RequisitionCorrectionForm, { type RequisitionCorrectionData } from '@/Components/RequisitionCorrectionForm';
import { PageProps } from '@/types';
import {
    ShieldCheck, Plus, Eye, X, AlertCircle, CheckCircle2,
    Paperclip, Filter, PieChart, BarChart3, Search, Check, UserCheck, LayoutTemplate, AlertTriangle
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

interface Justificatif {
    id: string;
    date: string;
    description: string;
    montant: number;
    scan: string;
    fileUrl: string | null;
}

interface LigneDemande {
    id: string;
    activite: string;
    codeAllBudget: string;
    code_allocation?: string;
    libelleAllocation: string;
    nature: string;
    quantiteOuDuree: number;
    unite: string;
    frais: number;
    total: number;
    budget_solde_actuel?: number | null;
    justif: Justificatif[];
}

interface RequisitionMP {
    id: string;
    user_id: string;
    numero: string;
    projet: string;
    project_id?: string;
    initiateurNom: string;
    initiateurRole: string;
    nature: 'Achat' | 'Service';
    devise: 'USD' | 'FC' | 'EUR';
    montantTotal: number;
    caisseSouhaitee: string;
    caisseAttribuee?: string;
    observation?: string;
    derniere_observation?: string | null;
    motifRejet?: string | null;
    is_urgent: boolean;
    statut: string;
    statusCode: string;
    statusLabel: string;
    canDecide: boolean;
    canCorrect: boolean;
    canEdit?: boolean;
    financeReturned: boolean;
    needsCorrection: boolean;
    dateSoumission: string;
    signatures: Signature[];
    lignes: LigneDemande[];
}

interface CashRegisterOption {
    id: string;
    name: string;
    devise: string;
}

interface BudgetLineOption {
    id: string;
    project_id?: string;
    code: string;
    libelle: string;
    normalizedCode: string;
    solde: number;
    devise: string;
    budget_initial: number;
}

interface PmStats {
    budget_total_usd: number;
    budget_solde_usd: number;
    budget_consomme_usd: number;
    budget_total_fc: number;
    budget_solde_fc: number;
    budget_consomme_fc: number;
    req_en_attente: number;
    req_validees: number;
    req_a_corriger: number;
}

export default function ProjectManagerDashboard({
    requisitions = [],
    cashRegisters = [],
    budgetLines = [],
    pmStats = {
        budget_total_usd: 0,
        budget_solde_usd: 0,
        budget_consomme_usd: 0,
        budget_total_fc: 0,
        budget_solde_fc: 0,
        budget_consomme_fc: 0,
        req_en_attente: 0,
        req_validees: 0,
        req_a_corriger: 0,
    },
    projectUsers = [],
}: {
    requisitions?: RequisitionMP[];
    cashRegisters?: CashRegisterOption[];
    budgetLines?: BudgetLineOption[];
    pmStats?: PmStats;
    projectUsers?: { id: string; name: string; email: string }[];
}) {
    const { auth } = usePage<PageProps>().props;
    const user = auth.user;

    const [demandes, setDemandes] = useState<RequisitionMP[]>(requisitions);
    const [filterStatut, setFilterStatut] = useState<string>('all');
    const [filterUserId, setFilterUserId] = useState<string>('all');

    const [selectedReq, setSelectedReq] = useState<RequisitionMP | null>(null);
    const [directorPreviewReq, setDirectorPreviewReq] = useState<RequisitionMP | null>(null);
    const [caisseChoisie, setCaisseChoisie] = useState<string>('');
    const [allocations, setAllocations] = useState<Record<string, string>>({});
    const [modeRejet, setModeRejet] = useState<boolean>(false);
    const [motifRejet, setMotifRejet] = useState<string>('');
    const [observationPM, setObservationPM] = useState<string>('');
    const [activeInputId, setActiveInputId] = useState<string | null>(null);

    const [passwordModalOpen, setPasswordModalOpen] = useState<boolean>(false);
    const [passwordSaisi, setPasswordSaisi] = useState<string>('');
    const [signingLoading, setSigningLoading] = useState<boolean>(false);
    const [pinError, setPinError] = useState<string | null>(null);

    const [editingReq, setEditingReq] = useState<RequisitionCorrectionData | null>(null);

    const [toast, setToast] = useState<{
        type: 'success' | 'error';
        message: string;
    } | null>(null);

    useEffect(() => {
        setDemandes(requisitions);
    }, [requisitions]);

    const showToast = (type: 'success' | 'error', message: string) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 5000);
    };

    const getBudgetLineObject = (code: string, projectId?: string) => {
        if (!code.trim()) return null;
        const normalized = code.trim().toLowerCase();
        return budgetLines.find(
            (l) => l.normalizedCode === normalized && (!projectId || l.project_id === projectId)
        ) || null;
    };

    const demandesFiltrees = useMemo(() => {
        return demandes.filter((d) => {
            const matchStatut =
                filterStatut === 'all'
                    ? true
                    : filterStatut === 'a_corriger'
                    ? d.statut === 'a_corriger'
                    : d.statut === filterStatut;
            const matchUser = filterUserId === 'all' ? true : d.user_id === filterUserId;
            return matchStatut && matchUser;
        });
    }, [demandes, filterStatut, filterUserId]);

    const donutData = useMemo(() => {
        const total = pmStats.req_en_attente + pmStats.req_validees + pmStats.req_a_corriger || 1;
        const pctValidees = Math.round((pmStats.req_validees / total) * 100);
        return { total, pctValidees, isEmpty: total === 1 && pmStats.req_validees === 0 && pmStats.req_en_attente === 0 };
    }, [pmStats]);

    const gaugeData = useMemo(() => {
        const total = pmStats.budget_total_usd || 1;
        const pctConsomme = Math.min(100, Math.round((pmStats.budget_consomme_usd / total) * 100));
        const pctRestant = 100 - pctConsomme;
        return { pctConsomme, pctRestant, isEmpty: pmStats.budget_total_usd === 0 };
    }, [pmStats]);

    const handleOuvrirArbitrage = (req: RequisitionMP) => {
        setSelectedReq(req);
        const requestedRegister = req.caisseAttribuee || req.caisseSouhaitee;
        setCaisseChoisie(
            cashRegisters.some((register) => register.name === requestedRegister)
                ? requestedRegister
                : cashRegisters[0]?.name ?? ''
        );
        setModeRejet(false);
        setMotifRejet('');
        setObservationPM('');

        const initialAllocations: Record<string, string> = {};
        req.lignes.forEach((ligne) => {
            initialAllocations[ligne.id] = ligne.code_allocation || ligne.codeAllBudget || '';
        });
        setAllocations(initialAllocations);
    };

    // DÉTECTION STRICTE DES DÉPASSEMENTS BUDGÉTAIRES
    const hasDepassement = useMemo(() => {
        if (!selectedReq) return false;
        return selectedReq.lignes.some((ligne) => {
            const code = allocations[ligne.id] || '';
            const bLine = getBudgetLineObject(code, selectedReq.project_id);
            const solde = bLine ? bLine.solde : ligne.budget_solde_actuel;
            return solde !== null && solde !== undefined && ligne.total > solde;
        });
    }, [selectedReq, allocations, budgetLines]);

    const handleDeclencherApprobation = () => {
        if (!selectedReq) return;

        const allocationsArray = Object.entries(allocations).map(([demande_id, code_allocation]) => ({
            demande_id,
            code_allocation: code_allocation.trim(),
        }));

        const ligneSansCode = allocationsArray.find((a) => !a.code_allocation);
        if (ligneSansCode) {
            showToast('error', 'Vous devez attribuer un code budgétaire valide à chaque ligne.');
            return;
        }

        // BLOCAGE AUTOMATIQUE EN CAS DE DÉPASSEMENT BUDGÉTAIRE
        if (hasDepassement) {
            showToast('error', 'Blocage strict : Une ou plusieurs lignes dépassent le solde budgétaire disponible. Vous devez ajuster les montants ou rejeter la demande.');
            return;
        }

        setPasswordSaisi('');
        setPinError(null);
        setPasswordModalOpen(true);
    };

    const handleConfirmerSignature = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedReq || !passwordSaisi.trim()) return;

        // VÉRIFICATION DE SÉCURITÉ SUPPLÉMENTAIRE
        if (hasDepassement) {
            setPinError('Approbation bloquée : dépassement du budget disponible constaté.');
            return;
        }

        setSigningLoading(true);
        setPinError(null);

        const allocationsArray = Object.entries(allocations).map(([demande_id, code_allocation]) => ({
            demande_id,
            code_allocation: code_allocation.trim(),
        }));

        router.patch(
            route('requisitions.manager-decision', selectedReq.id),
            {
                decision: 'approve',
                pin: passwordSaisi.trim(),
                password: passwordSaisi.trim(),
                observation: observationPM.trim() || null,
                caisse_decaissement: caisseChoisie,
                allocations: allocationsArray,
            },
            {
                preserveScroll: true,
                onFinish: () => setSigningLoading(false),
                onSuccess: () => {
                    setPasswordModalOpen(false);
                    showToast('success', `Visa MP apposé avec succès sur ${selectedReq.numero}. Transmis au PAM.`);
                    setSelectedReq(null);
                    setPasswordSaisi('');
                    setObservationPM('');
                    router.reload();
                },
                onError: (errors) => {
                    const message = (errors as any).pin || (errors as any).password || (errors as any).general || Object.values(errors)[0] || 'Code PIN ou mot de passe incorrect.';
                    setPinError(message);
                    showToast('error', message);
                },
            }
        );
    };

    const handleRejeter = () => {
        if (!selectedReq) return;
        if (!motifRejet.trim()) {
            showToast('error', 'Veuillez obligatoirement spécifier le motif du rejet.');
            return;
        }

        router.patch(
            route('requisitions.manager-decision', selectedReq.id),
            {
                decision: 'reject',
                password: 'skip',
                pin: 'skip',
                motif_rejet: motifRejet.trim(),
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    showToast('error', `Réquisition ${selectedReq.numero} retournée à l'initiateur pour correction.`);
                    setSelectedReq(null);
                    setModeRejet(false);
                    setMotifRejet('');
                    router.reload();
                },
            }
        );
    };

    const openEditModal = (req: RequisitionMP) => {
        setEditingReq({
            id: req.id,
            numero: req.numero,
            project_id: req.project_id,
            nature: req.nature,
            devise: req.devise,
            caisse: req.caisseAttribuee || req.caisseSouhaitee,
            observation: req.observation ?? null,
            motifRejet: req.motifRejet,
            lignes: req.lignes.map((line) => ({
                id: line.id,
                activite: line.activite,
                codeBudget: line.code_allocation || line.codeAllBudget,
                nature: line.nature,
                quantiteOuDuree: line.quantiteOuDuree,
                unite: line.unite,
                prixUnitaire: line.frais,
            })),
        });
    };

    return (
        <AppLayout>
            <Head title="Validation Manager de Projet" />

            {toast && (
                <div className={`fixed bottom-6 right-6 z-[90] p-4 rounded-lg shadow-modal border flex items-center gap-3 text-xs font-semibold ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
                    {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    <p>{toast.message}</p>
                    <button onClick={() => setToast(null)} className="ml-2 p-0.5 rounded hover:bg-white/20 transition">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E2E8F0] pb-5 mb-6">
                <div>
                    <h1 className="text-xl font-bold text-[#0B192C] flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-[#04326D]" />
                        Validation des Réquisitions —{' '}
                        <span className="text-[#04326D]">{user.project?.name || 'Projet'}</span>
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">
                        Manager de Projet : <strong className="text-[#0B192C]">{user.name}</strong>{' '}
                        • Contrôle analytique et imputation budgétaire.
                    </p>
                </div>

                <Link
                    href={route('requisitions.create')}
                    className="inline-flex items-center gap-2 bg-[#04326D] hover:bg-[#06428f] text-white px-4 py-2.5 rounded text-xs font-bold shadow-sm transition"
                >
                    <Plus className="w-4 h-4" strokeWidth={2.5} />
                    <span>Initier Réquisition</span>
                </Link>
            </div>

            {/* SECTIONS GRAPHIQUES */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                <div className="bg-white border border-[#B2BED6] rounded p-5 shadow-sm space-y-3 flex items-center gap-6">
                    <div className="flex-1">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B192C] flex items-center gap-1.5 border-b pb-2 mb-3">
                            <PieChart className="w-4 h-4 text-[#04326D]" />
                            <span>Statut des Opérations</span>
                        </h3>
                        <div className="space-y-2 text-[11px]">
                            <div className="flex justify-between items-center">
                                <span className="flex items-center gap-1.5 text-gray-600"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" />En attente (Arbitrage) :</span>
                                <strong className="font-mono text-amber-800">{pmStats.req_en_attente}</strong>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="flex items-center gap-1.5 text-gray-600"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />Validées :</span>
                                <strong className="font-mono text-emerald-800">{pmStats.req_validees}</strong>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="flex items-center gap-1.5 text-gray-600"><span className="w-2.5 h-2.5 rounded-full bg-red-500" />À Arbitrer / Corriger :</span>
                                <strong className="font-mono text-red-800">{pmStats.req_a_corriger}</strong>
                            </div>
                        </div>
                    </div>
                    
                    <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                            <path className={donutData.isEmpty ? "text-gray-200" : "text-amber-500"} strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            {!donutData.isEmpty && (
                                <path className="text-emerald-500 transition-all duration-700 ease-out" strokeDasharray={`${donutData.pctValidees}, 100`} strokeWidth="4" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            )}
                        </svg>
                        <div className="absolute text-center">
                            <span className="text-xs font-black font-mono text-[#0B192C] block">{donutData.isEmpty ? '-' : `${donutData.pctValidees}%`}</span>
                            <span className="text-[7.5px] font-bold uppercase text-gray-400 block -mt-0.5">Validées</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-[#B2BED6] rounded p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b pb-2.5">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B192C] flex items-center gap-1.5">
                            <BarChart3 className="w-4 h-4 text-emerald-700" />
                            <span>Exécution Budgétaire du Projet (USD)</span>
                        </h3>
                        <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                            {pmStats.budget_total_fc.toLocaleString()} FC
                        </span>
                    </div>
                    <div className="space-y-3 pt-1 text-xs">
                        <div className="flex justify-between items-center text-[11px]">
                            <span className="text-gray-600">Taux de consommation :</span>
                            <strong className="font-mono text-sm text-[#04326D]">{gaugeData.pctConsomme}%</strong>
                        </div>

                        <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden flex relative">
                            <div className={`${gaugeData.isEmpty ? 'bg-gray-300' : 'bg-emerald-500'} transition-all duration-700`} style={{ width: `${gaugeData.pctConsomme}%` }} title={`Consommé: ${gaugeData.pctConsomme}%`} />
                            <div className={`${gaugeData.isEmpty ? 'bg-gray-200' : 'bg-[#04326D]'} transition-all duration-700`} style={{ width: `${gaugeData.pctRestant}%` }} title={`Reste: ${gaugeData.pctRestant}%`} />
                        </div>

                        <div className="flex items-center gap-4 text-[11px]">
                            <div className="flex-1 p-2 bg-gray-50 border border-gray-100 rounded text-center">
                                <span className="block text-gray-500 mb-0.5">Budget Initial</span>
                                <strong className="font-mono text-[#04326D]">${pmStats.budget_total_usd.toLocaleString()}</strong>
                            </div>
                            <div className="flex-1 p-2 bg-emerald-50 border border-emerald-100 rounded text-center">
                                <span className="block text-emerald-700 mb-0.5">Consommé</span>
                                <strong className="font-mono text-emerald-900">${pmStats.budget_consomme_usd.toLocaleString()}</strong>
                            </div>
                            <div className="flex-1 p-2 bg-blue-50 border border-blue-100 rounded text-center">
                                <span className="block text-[#04326D] mb-0.5">Solde Dispo.</span>
                                <strong className="font-mono text-[#04326D]">${pmStats.budget_solde_usd.toLocaleString()}</strong>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-[#B2BED6] rounded shadow-sm overflow-hidden">
                <div className="p-4 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50">
                    <h2 className="text-xs font-bold text-[#0B192C] uppercase tracking-wider">
                        Liste des Réquisitions
                    </h2>

                    <div className="flex flex-wrap items-center gap-3 text-xs">
                        <div className="flex items-center gap-1.5">
                            <Filter className="w-3.5 h-3.5 text-gray-400" />
                            <select
                                value={filterStatut}
                                onChange={(e) => setFilterStatut(e.target.value)}
                                className="border border-[#B2BED6] rounded px-2.5 py-1 text-xs bg-white text-[#0B192C] font-semibold focus:outline-none"
                            >
                                <option value="all">Toutes</option>
                                <option value="en_attente_mp">À arbitrer (Visa MP)</option>
                                <option value="valide_mp">Validées (Transmises)</option>
                                <option value="a_corriger">À arbitrer / corriger</option>
                            </select>
                        </div>

                        {projectUsers && projectUsers.length > 0 && (
                            <div className="flex items-center gap-1.5">
                                <UserCheck className="w-3.5 h-3.5 text-gray-400" />
                                <select
                                    value={filterUserId}
                                    onChange={(e) => setFilterUserId(e.target.value)}
                                    className="border border-[#B2BED6] rounded px-2.5 py-1 text-xs bg-white text-[#0B192C] font-semibold focus:outline-none"
                                >
                                    <option value="all">Tous les collaborateurs</option>
                                    {projectUsers.map((u) => (
                                        <option key={u.id} value={u.id}>
                                            {u.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="bg-[#0B192C] text-white uppercase text-[10px] font-bold tracking-wider">
                                <th className="py-3 px-4">Numéro</th>
                                <th className="py-3 px-4">Date</th>
                                <th className="py-3 px-4">Initiateur</th>
                                <th className="py-3 px-4">Nature</th>
                                <th className="py-3 px-4">Observation</th>
                                <th className="py-3 px-4 text-right">Montant Total</th>
                                <th className="py-3 px-4 text-center">Urgence</th>
                                <th className="py-3 px-4 text-center">Statut</th>
                                <th className="py-3 px-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2E8F0] text-gray-700">
                            {demandesFiltrees.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="py-12 text-center text-gray-400 italic">
                                        Aucune réquisition trouvée pour ces filtres.
                                    </td>
                                </tr>
                            ) : (
                                demandesFiltrees.map((req) => {
                                    const isDecidable = req.canDecide || req.statut === 'en_attente_mp';

                                    return (
                                        <tr key={req.id} className="hover:bg-[#F9F9FF] transition">
                                            <td className="py-3.5 px-4 font-mono font-bold text-[#04326D] whitespace-nowrap">
                                                {req.numero}
                                            </td>
                                            <td className="py-3.5 px-4 whitespace-nowrap text-gray-600">
                                                {req.dateSoumission}
                                            </td>
                                            <td className="py-3.5 px-4 whitespace-nowrap">
                                                <p className="font-bold text-[#0B192C]">{req.initiateurNom}</p>
                                                <p className="text-[10px] text-gray-400">{req.initiateurRole}</p>
                                            </td>
                                            <td className="py-3.5 px-4 whitespace-nowrap font-semibold">
                                                {req.nature}
                                            </td>
                                            <td className="py-3.5 px-4 max-w-xs truncate" title={req.observation}>
                                                {req.observation || '—'}
                                            </td>
                                            <td className="py-3.5 px-4 text-right font-mono font-bold text-sm text-[#0B192C] whitespace-nowrap">
                                                {req.montantTotal.toLocaleString()} {req.devise}
                                            </td>
                                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                                {req.is_urgent ? (
                                                    <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded font-black text-[9px] uppercase">
                                                        URGENT
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 text-[10px]">Normal</span>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                    req.canCorrect
                                                        ? 'bg-red-100 text-red-800'
                                                        : req.statut === 'en_attente_mp'
                                                          ? 'bg-amber-100 text-amber-800'
                                                          : ['decaisse', 'cloture'].includes(req.statusCode)
                                                            ? 'bg-emerald-100 text-emerald-800'
                                                            : 'bg-blue-100 text-[#04326D]'
                                                }`}>
                                                    {req.statusLabel}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => setDirectorPreviewReq(req)}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-semibold transition"
                                                        title="Aperçu des signatures (Vue Direction)"
                                                    >
                                                        <LayoutTemplate className="w-3.5 h-3.5 text-[#04326D]" />
                                                        <span className="hidden xl:inline">Détails</span>
                                                    </button>

                                                    {req.canCorrect && (
                                                        <button
                                                            type="button"
                                                            onClick={() => openEditModal(req)}
                                                            className="px-2.5 py-1.5 border border-red-600 bg-red-50 text-red-700 rounded font-bold text-xs hover:bg-red-100 transition"
                                                        >
                                                            Corriger
                                                        </button>
                                                    )}

                                                    <button
                                                        type="button"
                                                        onClick={() => handleOuvrirArbitrage(req)}
                                                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded font-bold text-xs text-white transition ${
                                                            isDecidable ? 'bg-[#04326D] hover:bg-[#06428f]' : 'bg-gray-700 hover:bg-gray-800'
                                                        }`}
                                                    >
                                                        {isDecidable ? (
                                                            <>
                                                                <ShieldCheck className="w-3.5 h-3.5" />
                                                                <span>Arbitrer & Viser</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Eye className="w-3.5 h-3.5" />
                                                                <span>Lignes</span>
                                                            </>
                                                        )}
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

            {/* APERÇU CONSOLIDÉ */}
            {directorPreviewReq && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 animate-fade-in">
                    <div className="bg-white rounded border border-[#B2BED6] shadow-2xl max-w-4xl w-full p-6 space-y-4 max-h-[95vh] overflow-y-auto">
                        <header className="flex items-start justify-between border-b pb-3">
                            <div>
                                <span className="text-[10px] bg-blue-100 text-[#04326D] font-bold uppercase px-2 py-0.5 rounded">
                                    Aperçu des Visas & Historique
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
                                    Projet : <strong>{directorPreviewReq.projet}</strong> • Caisse : <strong>{directorPreviewReq.caisseAttribuee || directorPreviewReq.caisseSouhaitee}</strong>
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

                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2 mt-4">
                                Lignes de Dépenses ({directorPreviewReq.lignes.length})
                            </h3>
                            <table className="w-full text-left text-xs border border-gray-200">
                                <thead className="bg-[#0B192C] text-white">
                                    <tr>
                                        <th className="p-2">Désignation</th>
                                        <th className="p-2">Code Imputation</th>
                                        <th className="p-2 text-right">P.U.</th>
                                        <th className="p-2 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y text-gray-700">
                                    {directorPreviewReq.lignes.map((l) => (
                                        <tr key={l.id}>
                                            <td className="p-2 font-medium">{l.activite}</td>
                                            <td className="p-2 font-mono text-[#04326D]">{l.code_allocation || l.codeAllBudget || '—'}</td>
                                            <td className="p-2 text-right font-mono">{l.frais.toLocaleString()} {directorPreviewReq.devise}</td>
                                            <td className="p-2 text-right font-mono font-bold text-[#0B192C]">{l.total.toLocaleString()} {directorPreviewReq.devise}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-gray-50 font-bold border-t">
                                    <tr>
                                        <td colSpan={3} className="p-2 text-right">Total Général :</td>
                                        <td className="p-2 text-right text-sm font-mono text-[#04326D]">
                                            {directorPreviewReq.montantTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {directorPreviewReq.devise}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        <div className="flex justify-end pt-3 border-t">
                            <button
                                type="button"
                                onClick={() => setDirectorPreviewReq(null)}
                                className="px-4 py-2 bg-gray-800 hover:bg-black text-white rounded text-xs font-semibold transition"
                            >
                                Fermer l'aperçu
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODALE D'ARBITRAGE DU PM AVEC DÉTECTION DE BLOCAGE DÉPASSEMENT */}
            {selectedReq && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
                    <div className="bg-white rounded border border-[#B2BED6] shadow-2xl max-w-5xl w-full p-6 space-y-4 max-h-[95vh] flex flex-col animate-slide-down">
                        <header className="flex items-start justify-between border-b pb-3 shrink-0">
                            <div>
                                <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">
                                    Étape 1 : Contrôle Opérationnel & Attribution Budgétaire
                                </span>
                                <h2 className="text-base font-bold text-[#0B192C]">
                                    Réquisition N° {selectedReq.numero} ({selectedReq.nature})
                                </h2>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Initiateur : <strong>{selectedReq.initiateurNom}</strong> • Date : {selectedReq.dateSoumission}
                                    {' '}• Statut : <strong>{selectedReq.statusLabel}</strong>
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setSelectedReq(null);
                                    setActiveInputId(null);
                                }}
                                className="text-gray-400 hover:text-gray-600 font-bold"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </header>

                        {/* BANNIÈRE DE BLOCAGE SI DÉPASSEMENT DÉTECTÉ */}
                        {hasDepassement && (
                            <div className="p-3 bg-red-100 border-2 border-red-500 rounded text-xs text-red-900 font-bold flex items-center gap-2 shadow-sm animate-pulse">
                                <AlertTriangle className="w-5 h-5 text-red-700 shrink-0" />
                                <span>
                                    BLOCAGE AUTOMATIQUE : Le crédit budgétaire disponible sur au moins une des lignes est dépassé. La signature du visa est strictement interdite. Veuillez rejeter le dossier ou ajuster les imputations.
                                </span>
                            </div>
                        )}

                        {selectedReq.motifRejet && (
                            <div className="rounded border border-red-200 bg-red-50 p-3 text-xs text-red-900 shrink-0">
                                <strong>Motif du rejet / retour hiérarchique :</strong>
                                <p className="mt-1 whitespace-pre-wrap">{selectedReq.motifRejet}</p>
                            </div>
                        )}

                        <div className="flex-1 overflow-visible min-h-0 flex flex-col">
                            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 shrink-0">
                                Imputation des Lignes de Dépenses
                            </h3>
                            <div className="border border-[#B2BED6] rounded flex-1 overflow-visible">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-[#0B192C] text-white font-bold">
                                        <tr>
                                            <th className="p-2.5">Désignation</th>
                                            <th className="p-2.5 w-[500px]">Code Allocation & Recherche</th>
                                            <th className="p-2.5 text-right">Solde Actuel</th>
                                            <th className="p-2.5 text-right">Total Ligne</th>
                                            <th className="p-2.5 text-center">Faisabilité</th>
                                            <th className="p-2.5">Pièces</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y text-gray-700">
                                        {selectedReq.lignes.map((ligne) => {
                                            const currentCode = allocations[ligne.id] || '';
                                            const matchedLine = getBudgetLineObject(currentCode, selectedReq.project_id);
                                            const soldeDispo = matchedLine ? matchedLine.solde : ligne.budget_solde_actuel;
                                            const depassement = soldeDispo !== null && soldeDispo !== undefined && ligne.total > soldeDispo;

                                            const filteredSuggestions = budgetLines.filter((b) => {
                                                if (selectedReq.project_id && b.project_id && b.project_id !== selectedReq.project_id) {
                                                    return false;
                                                }
                                                const q = currentCode.trim().toLowerCase();
                                                if (!q) return false;
                                                return b.code.toLowerCase().includes(q) || b.libelle.toLowerCase().includes(q);
                                            });

                                            const isDecidable = selectedReq.canDecide || selectedReq.statut === 'en_attente_mp';

                                            return (
                                                <tr key={ligne.id} className={depassement ? 'bg-red-50/80 font-semibold' : ''}>
                                                    <td className="p-2.5 font-medium max-w-[200px] truncate" title={ligne.activite}>{ligne.activite}</td>
                                                    <td className="p-2.5 relative">
                                                        {isDecidable ? (
                                                            <div className="relative">
                                                                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2 top-2 pointer-events-none" />
                                                                <input
                                                                    type="text"
                                                                    placeholder="Tapez (ex: 2.2)..."
                                                                    value={currentCode}
                                                                    onFocus={() => setActiveInputId(ligne.id)}
                                                                    onChange={(e) => {
                                                                        setAllocations({ ...allocations, [ligne.id]: e.target.value });
                                                                        setActiveInputId(ligne.id);
                                                                    }}
                                                                    className="w-full pl-7 pr-2 border border-[#04326D] rounded p-1.5 text-xs font-mono font-bold text-[#04326D] bg-white focus:outline-none"
                                                                    required
                                                                />

                                                                {activeInputId === ligne.id && filteredSuggestions.length > 0 && (
                                                                    <div className="absolute left-0 top-full mt-1 w-full bg-white border-2 border-[#04326D] rounded shadow-2xl z-[200] max-h-72 overflow-y-auto divide-y text-xs">
                                                                        {filteredSuggestions.map((sug) => (
                                                                            <button
                                                                                key={sug.id}
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setAllocations({ ...allocations, [ligne.id]: sug.code });
                                                                                    setActiveInputId(null);
                                                                                }}
                                                                                className="w-full p-2.5 text-left hover:bg-blue-50 flex flex-col justify-between transition"
                                                                            >
                                                                                <div className="flex items-center justify-between mb-1">
                                                                                    <div className="flex items-center gap-1.5">
                                                                                        <span className="font-mono font-black text-[#04326D] text-[13px]">{sug.code}</span>
                                                                                        {sug.code === currentCode && <Check className="w-3 h-3 text-[#04326D]" />}
                                                                                    </div>
                                                                                    <span className="font-mono text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                                                                        Solde: {sug.solde.toLocaleString()} {sug.devise}
                                                                                    </span>
                                                                                </div>
                                                                                <span className="text-[11px] text-gray-700 font-medium break-words">
                                                                                    {sug.libelle}
                                                                                </span>
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                )}

                                                                <span className="text-[10px] text-gray-500 block truncate mt-1" title={matchedLine ? matchedLine.libelle : (ligne.libelleAllocation || '')}>
                                                                    {matchedLine ? <span className="text-emerald-700">✓ {matchedLine.libelle}</span> : (ligne.libelleAllocation || 'Aucune ligne sélectionnée')}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <div>
                                                                <span className="font-mono font-bold text-[#04326D] block">
                                                                    {ligne.code_allocation || ligne.codeAllBudget}
                                                                </span>
                                                                <span className="text-[10px] text-gray-500 block truncate" title={ligne.libelleAllocation}>
                                                                    {ligne.libelleAllocation}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-2.5 text-right font-mono font-bold whitespace-nowrap">
                                                        {soldeDispo !== null && soldeDispo !== undefined ? (
                                                            `${soldeDispo.toLocaleString()} ${selectedReq.devise}`
                                                        ) : (
                                                            <span className="text-gray-400 font-normal">Non défini</span>
                                                        )}
                                                    </td>
                                                    <td className="p-2.5 text-right font-mono font-bold text-[#0B192C] whitespace-nowrap">
                                                        {ligne.total.toLocaleString()} {selectedReq.devise}
                                                    </td>
                                                    <td className="p-2.5 text-center whitespace-nowrap">
                                                        {soldeDispo === null || soldeDispo === undefined ? (
                                                            <span className="text-[10px] text-gray-400">À vérifier</span>
                                                        ) : depassement ? (
                                                            <span className="px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-black uppercase shadow-sm">
                                                                Dépassement crédit
                                                            </span>
                                                        ) : (
                                                            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                                                Solde suffisant
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="p-2.5">
                                                        {ligne.justif && ligne.justif.length > 0 ? (
                                                            <ul className="space-y-1">
                                                                {ligne.justif.map((file) => (
                                                                    <li key={file.id} className="text-[10px]">
                                                                        {file.fileUrl ? (
                                                                            <a
                                                                                href={file.fileUrl}
                                                                                target="_blank"
                                                                                rel="noreferrer"
                                                                                className="inline-flex items-center gap-1 font-semibold text-[#04326D] underline hover:text-blue-800"
                                                                            >
                                                                                <Paperclip className="h-3 w-3 shrink-0" />
                                                                                <span className="truncate max-w-[100px]">{file.scan}</span>
                                                                            </a>
                                                                        ) : (
                                                                            <span className="text-gray-500 truncate max-w-[100px] block">{file.scan}</span>
                                                                        )}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        ) : (
                                                            <span className="text-gray-400 text-[10px]">Aucune</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot className="bg-gray-50 font-bold border-t">
                                        <tr>
                                            <td colSpan={3} className="p-2.5 text-right">
                                                Montant Total :
                                            </td>
                                            <td className="p-2.5 text-right text-[#04326D] text-sm font-mono">
                                                {selectedReq.montantTotal.toLocaleString()} {selectedReq.devise}
                                            </td>
                                            <td colSpan={2} />
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        {(selectedReq.canDecide || selectedReq.statut === 'en_attente_mp') && (
                            <div className="border-t border-[#E2E8F0] pt-4 space-y-4 shrink-0">
                                {!modeRejet ? (
                                    <>
                                        <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs space-y-1">
                                            <label className="block font-bold text-[#04326D] uppercase text-[11px]">
                                                Caisse de Décaissement Ciblée *
                                            </label>
                                            <select
                                                value={caisseChoisie}
                                                onChange={(e) => setCaisseChoisie(e.target.value)}
                                                className="w-full border border-[#B2BED6] rounded p-2 text-xs font-semibold bg-white"
                                                required
                                            >
                                                {cashRegisters.map((c) => (
                                                    <option key={c.id} value={c.name}>
                                                        {c.name} ({c.devise})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-bold text-gray-700 mb-1">
                                                Observation / Commentaire du PM (Optionnel lors de la validation) :
                                            </label>
                                            <textarea
                                                rows={2}
                                                value={observationPM}
                                                onChange={(e) => setObservationPM(e.target.value)}
                                                placeholder="Ajouter une observation pour le PAM et la Finance..."
                                                className="w-full border border-gray-300 rounded p-2 text-xs focus:outline-none focus:border-[#04326D]"
                                            />
                                        </div>

                                        <div className="flex items-center justify-between pt-2">
                                            <button
                                                type="button"
                                                onClick={() => setModeRejet(true)}
                                                className="px-3 py-2 border border-red-300 text-red-600 rounded text-xs font-bold hover:bg-red-50 transition"
                                            >
                                                Renvoyer à l’initiateur (Rejet)
                                            </button>

                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedReq(null)}
                                                    className="px-3 py-2 border rounded text-xs font-semibold text-gray-600 hover:bg-gray-50"
                                                >
                                                    Fermer
                                                </button>
                                                
                                                {/* BOUTON DÉSACTIVÉ EN CAS DE DÉPASSEMENT */}
                                                <button
                                                    type="button"
                                                    onClick={handleDeclencherApprobation}
                                                    disabled={!caisseChoisie || hasDepassement}
                                                    className={`inline-flex items-center gap-1.5 px-4 py-2 text-white rounded text-xs font-bold shadow transition ${
                                                        hasDepassement 
                                                            ? 'bg-gray-400 cursor-not-allowed opacity-60' 
                                                            : 'bg-[#04326D] hover:bg-[#06428f]'
                                                    }`}
                                                    title={hasDepassement ? "Validation bloquée : dépassement budgétaire sur une ou plusieurs lignes" : "Valider et transmettre au PAM"}
                                                >
                                                    <ShieldCheck className="w-4 h-4" />
                                                    <span>{hasDepassement ? 'Validation Bloquée (Dépassement)' : 'Valider & Transmettre au PAM'}</span>
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="p-4 bg-red-50 border border-red-200 rounded space-y-3 text-xs">
                                        <h4 className="font-bold text-red-800 uppercase">
                                            Motif du Rejet (Obligatoire pour l'initiateur) *
                                        </h4>
                                        <textarea
                                            rows={3}
                                            value={motifRejet}
                                            onChange={(e) => setMotifRejet(e.target.value)}
                                            placeholder="Précisez obligatoirement les motifs ou corrections demandées à l'initiateur..."
                                            className="w-full border border-red-300 rounded p-2 text-xs bg-white focus:outline-none"
                                            required
                                        />
                                        <div className="flex justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setModeRejet(false)}
                                                className="px-3 py-1.5 border rounded bg-white text-gray-700"
                                            >
                                                Annuler
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleRejeter}
                                                disabled={!motifRejet.trim()}
                                                className="px-4 py-1.5 bg-red-600 text-white rounded font-bold shadow hover:bg-red-700 disabled:opacity-50"
                                            >
                                                Confirmer le Renvoi à l’Initiateur
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MODALE SIGNATURE (PIN) DU PM */}
            {passwordModalOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 animate-fade-in">
                    <div className="bg-white rounded border-2 border-[#04326D] shadow-2xl max-w-sm w-full p-6 space-y-4 animate-slide-down">
                        <div className="text-center border-b pb-3">
                            <ShieldCheck className="w-8 h-8 text-[#04326D] mx-auto mb-1" />
                            <h3 className="text-sm font-bold uppercase text-[#0B192C]">
                                Signature Certifiée du Visa MP
                            </h3>
                            <p className="text-[11px] text-gray-500">
                                Signataire : <strong>{user.name}</strong>
                            </p>
                        </div>

                        {pinError && (
                            <div className="p-2 bg-red-50 border border-red-300 text-red-800 rounded text-xs font-bold text-center">
                                {pinError}
                            </div>
                        )}

                        <form onSubmit={handleConfirmerSignature} className="space-y-3 text-xs">
                            <div>
                                <label className="block font-bold text-gray-700 mb-1">
                                    Code PIN personnel (ou mot de passe) *
                                </label>
                                <input
                                    type="password"
                                    placeholder="••••"
                                    value={passwordSaisi}
                                    onChange={(e) => setPasswordSaisi(e.target.value)}
                                    className="w-full border border-[#B2BED6] rounded p-2 text-xl font-mono text-center tracking-widest focus:outline-none focus:border-[#04326D]"
                                    autoFocus
                                    required
                                />
                            </div>

                            <p className="text-[10px] text-gray-400 leading-tight">
                                Le visa transmettra immédiatement la réquisition au PAM pour examen administratif.
                            </p>

                            <div className="flex justify-end gap-2 pt-2 border-t">
                                <button
                                    type="button"
                                    onClick={() => setPasswordModalOpen(false)}
                                    className="px-3 py-1.5 border rounded text-xs text-gray-600 hover:bg-gray-50"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={signingLoading || hasDepassement}
                                    className="px-4 py-1.5 bg-[#04326D] hover:bg-[#06428f] text-white rounded text-xs font-bold shadow disabled:opacity-50"
                                >
                                    {signingLoading ? 'Signature en cours…' : 'Signer & Transmettre au PAM'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            {editingReq && (
                <RequisitionCorrectionForm
                    key={editingReq.id}
                    requisition={editingReq}
                    budgetLines={budgetLines}
                    onClose={() => setEditingReq(null)}
                    onSuccess={() => {
                        showToast('success', `Réquisition corrigée et resoumise au PAM.`);
                        setEditingReq(null);
                        router.reload();
                    }}
                />
            )}
        </AppLayout>
    );
}