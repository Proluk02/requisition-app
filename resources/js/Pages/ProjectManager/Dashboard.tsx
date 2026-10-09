import { useState, useMemo, useEffect } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { PageProps } from '@/types';
import {
    ShieldCheck,
    Plus,
    Eye,
    Pencil,
    X,
    AlertCircle,
    CheckCircle2,
    Clock,
    FileText,
    Paperclip,
    Download,
    Ban,
    Lock,
    KeyRound,
    Loader2,
    Filter,
    AlertTriangle,
    Printer,
    ChevronDown,
    Check,
} from 'lucide-react';

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
    nature: string;
    quantiteOuDuree: number;
    unite: string;
    frais: number;
    total: number;
    justif: Justificatif[];
}

interface RequisitionMP {
    id: string;
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
    is_urgent: boolean;
    statut: string;
    statusCode: string;
    statusLabel: string;
    canDecide: boolean;
    canEdit: boolean;
    financeReturned: boolean;
    needsCorrection: boolean;
    dateSoumission: string;
    lignes: LigneDemande[];
}

interface CashRegisterOption {
    id: string;
    name: string;
    devise: string;
}

interface BudgetLineOption {
    id: string;
    code: string;
    libelle: string;
    devise: string;
    solde: number;
    budget_initial: number;
}

export default function ProjectManagerDashboard({
    requisitions = [],
    cashRegisters = [],
    projectBudgetLines = [],
}: {
    requisitions?: RequisitionMP[];
    cashRegisters?: CashRegisterOption[];
    projectBudgetLines?: BudgetLineOption[];
}) {
    const { auth } = usePage<PageProps>().props;
    const user = auth.user;

    const [demandes, setDemandes] = useState<RequisitionMP[]>(requisitions);
    const [filterStatut, setFilterStatut] = useState<string>('all');
    const [filterCaisse, setFilterCaisse] = useState<string>('all');
    const [search, setSearch] = useState<string>('');

    const [selectedReq, setSelectedReq] = useState<RequisitionMP | null>(null);
    const [caisseChoisie, setCaisseChoisie] = useState<string>('');
    const [allocations, setAllocations] = useState<Record<string, string>>({});
    const [modeRejet, setModeRejet] = useState<boolean>(false);
    const [motifRejet, setMotifRejet] = useState<string>('');

    // Dropdowns d'autocomplétion prédictive
    const [activeArbitrageLineId, setActiveArbitrageLineId] = useState<string | null>(null);
    const [activeEditLineId, setActiveEditLineId] = useState<string | null>(null);

    const [passwordModalOpen, setPasswordModalOpen] = useState<boolean>(false);
    const [passwordSaisi, setPasswordSaisi] = useState<string>('');
    const [signingLoading, setSigningLoading] = useState<boolean>(false);
    const [pinError, setPinError] = useState<string | null>(null);

    const [editingReq, setEditingReq] = useState<RequisitionMP | null>(null);
    const [savingEdit, setSavingEdit] = useState(false);
    const [editError, setEditError] = useState<string | null>(null);
    const [editFiles, setEditFiles] = useState<Record<string, File[]>>({});

    const [toast, setToast] = useState<{
        type: 'success' | 'error';
        message: string;
    } | null>(null);

    const showToast = (type: 'success' | 'error', message: string) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 5000);
    };

    const budgetLinesMap = useMemo(() => {
        const map = new Map<string, BudgetLineOption>();
        projectBudgetLines.forEach((line) => {
            map.set(line.code.trim().toLowerCase(), line);
        });
        return map;
    }, [projectBudgetLines]);

    // Moteur de suggestions prédictives instantanées (commence par "2", "2.3", "6"...)
    const getCodeSuggestions = (query: string) => {
        const q = (query || '').trim().toLowerCase();
        if (!q) {
            return projectBudgetLines.slice(0, 8);
        }

        const startsWith = projectBudgetLines.filter((b) =>
            b.code.toLowerCase().startsWith(q)
        );

        const contains = projectBudgetLines.filter(
            (b) =>
                !b.code.toLowerCase().startsWith(q) &&
                (b.code.toLowerCase().includes(q) || b.libelle.toLowerCase().includes(q))
        );

        return [...startsWith, ...contains].slice(0, 10);
    };

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            const target = event.target as HTMLElement;
            if (!target.closest('.budget-combobox-wrapper')) {
                setActiveArbitrageLineId(null);
                setActiveEditLineId(null);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const demandesFiltrees = useMemo(() => {
        return demandes.filter((d) => {
            if (filterStatut === 'a_corriger' && !d.needsCorrection) return false;
            if (filterStatut !== 'all' && filterStatut !== 'a_corriger' && d.statut !== filterStatut) return false;

            if (filterCaisse !== 'all') {
                const caisse = d.caisseAttribuee || d.caisseSouhaitee;
                if (caisse !== filterCaisse) return false;
            }

            if (search.trim() !== '') {
                const q = search.trim().toLowerCase();
                const matchNum = d.numero.toLowerCase().includes(q);
                const matchNom = d.initiateurNom.toLowerCase().includes(q);
                const matchObs = (d.observation || '').toLowerCase().includes(q);
                if (!matchNum && !matchNom && !matchObs) return false;
            }

            return true;
        });
    }, [demandes, filterStatut, filterCaisse, search]);

    const statsFiltrees = useMemo(() => {
        return {
            totalUSD: demandesFiltrees.filter((d) => d.devise === 'USD').reduce((acc, d) => acc + d.montantTotal, 0),
            totalFC: demandesFiltrees.filter((d) => d.devise === 'FC').reduce((acc, d) => acc + d.montantTotal, 0),
            count: demandesFiltrees.length,
            decaissees: demandesFiltrees.filter((d) => d.statusCode === 'decaisse').length,
        };
    }, [demandesFiltrees]);

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
        setActiveArbitrageLineId(null);

        const initialAllocations: Record<string, string> = {};
        req.lignes.forEach((ligne) => {
            initialAllocations[ligne.id] = ligne.code_allocation || ligne.codeAllBudget || '';
        });
        setAllocations(initialAllocations);
    };

    const handleDeclencherApprobation = () => {
        if (!selectedReq) return;

        const allocationsArray = Object.entries(allocations).map(([demande_id, code_allocation]) => ({
            demande_id,
            code_allocation: code_allocation.trim(),
        }));

        const ligneSansCode = allocationsArray.find((a) => !a.code_allocation);
        if (ligneSansCode) {
            showToast(
                'error',
                'En tant que Manager de Projet, vous devez attribuer un code budgétaire à chaque article.'
            );
            return;
        }

        setPasswordSaisi('');
        setPinError(null);
        setPasswordModalOpen(true);
    };

    const handleConfirmerSignature = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedReq || !passwordSaisi.trim()) return;

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
                caisse_decaissement: caisseChoisie,
                allocations: allocationsArray,
            },
            {
                preserveScroll: true,
                onFinish: () => setSigningLoading(false),
                onSuccess: () => {
                    setPasswordModalOpen(false);
                    setDemandes((prev) =>
                        prev.map((d) =>
                            d.id === selectedReq.id
                                ? {
                                      ...d,
                                      statut: 'valide_mp',
                                      statusLabel: 'Validé MP',
                                      canDecide: false,
                                  }
                                : d
                        )
                    );
                    showToast(
                        'success',
                        `Visa Manager de Projet apposé avec succès sur ${selectedReq.numero}. Les crédits budgétaires sont réservés.`
                    );
                    setSelectedReq(null);
                    setPasswordSaisi('');
                },
                onError: (errors) => {
                    const message =
                        (errors as any).pin ||
                        (errors as any).password ||
                        Object.values(errors)[0] ||
                        'Échec de la signature : Code PIN ou mot de passe incorrect.';
                    setPinError(message);
                    showToast('error', message);
                },
            }
        );
    };

    const handleRejeter = () => {
        if (!selectedReq) return;
        if (!motifRejet.trim()) {
            showToast('error', 'Veuillez spécifier le motif du rejet.');
            return;
        }

        router.patch(
            route('requisitions.manager-decision', selectedReq.id),
            {
                decision: 'reject',
                password: 'skip',
                pin: 'skip',
                motif_rejet: motifRejet,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setDemandes((prev) =>
                        prev.map((d) =>
                            d.id === selectedReq.id
                                ? {
                                      ...d,
                                      statut: 'rejete_mp',
                                      statusLabel: 'Rejeté',
                                      canDecide: false,
                                  }
                                : d
                        )
                    );
                    showToast('error', `Réquisition ${selectedReq.numero} renvoyée pour correction.`);
                    setSelectedReq(null);
                    setModeRejet(false);
                    setMotifRejet('');
                },
            }
        );
    };

    const openEditModal = (req: RequisitionMP) => {
        setEditingReq({ ...req, lignes: req.lignes.map((l) => ({ ...l })) });
        setEditFiles({});
        setEditError(null);
        setActiveEditLineId(null);
    };

    const updateEditingLine = (lineId: string, changes: Partial<LigneDemande>) => {
        setEditingReq((current) => {
            if (!current) return current;
            return {
                ...current,
                lignes: current.lignes.map((line) => {
                    if (line.id !== lineId) return line;
                    const updated = { ...line, ...changes };
                    updated.total =
                        Number(updated.quantiteOuDuree || 0) * Number(updated.frais || 0);
                    return updated;
                }),
                montantTotal: current.lignes.reduce((sum, line) => {
                    if (line.id !== lineId) return sum + line.total;
                    const updated = { ...line, ...changes };
                    return (
                        sum + Number(updated.quantiteOuDuree || 0) * Number(updated.frais || 0)
                    );
                }, 0),
            };
        });
    };

    const handleSaveEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingReq) return;

        router.post(
            route('requisitions.update', editingReq.id),
            {
                _method: 'patch',
                nature_requisition: editingReq.nature,
                caisse_decaissement: editingReq.caisseSouhaitee,
                devise: editingReq.devise,
                observation: editingReq.observation || null,
                articles: editingReq.lignes.map((line) => ({
                    id: line.id,
                    activite: line.activite,
                    code_all_budget: line.codeAllBudget,
                    nature: line.nature,
                    quantiteOuDuree: line.quantiteOuDuree,
                    unite: line.unite,
                    prixUnitaire: line.frais,
                    justificatifs: (editFiles[line.id] ?? []).map((file) => ({
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
                onError: (errs) =>
                    setEditError(Object.values(errs)[0] ?? 'Erreur lors de la mise à jour.'),
                onSuccess: (page) => {
                    const refreshed = (page.props as any).requisitions as
                        | RequisitionMP[]
                        | undefined;
                    if (refreshed) setDemandes(refreshed);
                    showToast('success', 'Corrections enregistrées avec succès.');
                    setEditingReq(null);
                },
            }
        );
    };

    const renderStatutBadge = (req: RequisitionMP) => {
        let cls = 'bg-gray-100 text-gray-700';
        if (req.canDecide) cls = 'bg-amber-100 text-amber-900 border border-amber-300';
        else if (req.statut === 'valide_mp') cls = 'bg-blue-100 text-[#04326D]';
        else if (req.needsCorrection) cls = 'bg-red-100 text-red-800';
        return (
            <span className={`${cls} px-2.5 py-1 rounded-full text-[10px] font-bold`}>
                {req.statusLabel}
            </span>
        );
    };

    return (
        <AppLayout>
            <Head title="Validation Manager de Projet" />

            <style>{`
                @media print {
                    nav, aside, header, .no-print-area, button, select, input {
                        display: none !important;
                    }
                    #pm-filtered-report-sheet {
                        display: block !important;
                        position: fixed;
                        left: 0;
                        top: 0;
                        width: 100vw;
                        height: auto;
                        padding: 24px;
                        background: white !important;
                        color: black !important;
                    }
                }
                @media screen {
                    #pm-filtered-report-sheet { display: none; }
                }
            `}</style>

            <div className="space-y-6 no-print-area">
                {toast && (
                    <div
                        className={`fixed bottom-6 right-6 z-[90] p-4 rounded-lg shadow-modal border flex items-center gap-3 text-xs font-semibold animate-slide-in-right ${
                            toast.type === 'success'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-red-600 text-white'
                        }`}
                    >
                        {toast.type === 'success' ? (
                            <CheckCircle2 className="w-4 h-4" />
                        ) : (
                            <AlertCircle className="w-4 h-4" />
                        )}
                        <p>{toast.message}</p>
                        <button
                            onClick={() => setToast(null)}
                            className="ml-2 p-0.5 rounded hover:bg-white/20 transition"
                            aria-label="Fermer"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}

                {/* En-tête avec bouton direct d'impression de rapport */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
                    <div>
                        <h1 className="text-xl font-bold text-[#0B192C] flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-[#04326D]" />
                            <span>Validation des Réquisitions — {user.project?.name || 'Projet'}</span>
                        </h1>
                        <p className="text-xs text-gray-500 mt-1">
                            Manager de Projet : <strong className="text-gray-900">{user.name}</strong> • Contrôle opérationnel, sélection prédictive des lignes budgétaires et filtrage par caisse.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="inline-flex items-center gap-1.5 bg-white border border-[#B2BED6] hover:bg-gray-50 text-[#0B192C] px-3.5 py-2 rounded font-bold text-xs shadow-sm transition"
                        >
                            <Printer className="w-4 h-4 text-[#04326D]" />
                            <span>Générer Rapport ({demandesFiltrees.length})</span>
                        </button>

                        <Link
                            href={route('requisitions.create')}
                            className="inline-flex items-center gap-2 bg-[#04326D] hover:bg-[#06428f] text-white px-4 py-2 rounded text-xs font-bold shadow-sm transition"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Initier Réquisition</span>
                        </Link>
                    </div>
                </div>

                {/* Compteurs KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white border-2 border-[#F58F20]/40 rounded p-5 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-[#0B192C]">
                                En attente de Visa MP
                            </span>
                            <div className="w-8 h-8 rounded bg-amber-50 flex items-center justify-center">
                                <Clock className="w-4 h-4 text-[#F58F20]" />
                            </div>
                        </div>
                        <p className="text-2xl font-black text-[#F58F20]">
                            {demandes.filter((d) => d.canDecide).length}{' '}
                            <span className="text-base font-bold text-gray-500">dossier(s)</span>
                        </p>
                        <p className="text-[11px] text-gray-500 mt-1">Prêts pour validation</p>
                    </div>

                    <div className="bg-white border border-[#B2BED6] rounded p-5 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                Validées MP (Transmises)
                            </span>
                            <div className="w-8 h-8 rounded bg-blue-50 flex items-center justify-center">
                                <CheckCircle2 className="w-4 h-4 text-[#04326D]" />
                            </div>
                        </div>
                        <p className="text-2xl font-black text-[#04326D]">
                            {demandes.filter((d) => d.statut === 'valide_mp').length}{' '}
                            <span className="text-base font-bold text-gray-500">dossier(s)</span>
                        </p>
                        <p className="text-[11px] text-gray-500 mt-1">Crédits engagés en base</p>
                    </div>

                    <div className="bg-white border border-[#B2BED6] rounded p-5 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                                À corriger / Renvoyées
                            </span>
                            <div className="w-8 h-8 rounded bg-red-50 flex items-center justify-center">
                                <AlertCircle className="w-4 h-4 text-red-600" />
                            </div>
                        </div>
                        <p className="text-2xl font-black text-red-600">
                            {demandes.filter((d) => d.needsCorrection).length}{' '}
                            <span className="text-base font-bold text-gray-500">dossier(s)</span>
                        </p>
                        <p className="text-[11px] text-gray-500 mt-1">Nécessitent correction</p>
                    </div>
                </div>

                {/* Filtres multiples : Statut + Caisse + Recherche libre */}
                <div className="bg-white border border-[#B2BED6] rounded shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50">
                        <div>
                            <h2 className="text-xs font-bold text-[#0B192C] uppercase tracking-wider">
                                Demandes de l'Équipe ({user.project?.name})
                            </h2>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                                Filtrage par caisse assignée et recherche instantanée.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs">
                            <div className="flex items-center gap-1.5 bg-white border border-[#B2BED6] rounded px-2.5 py-1">
                                <Filter className="w-3.5 h-3.5 text-gray-400" />
                                <select
                                    value={filterStatut}
                                    onChange={(e) => setFilterStatut(e.target.value)}
                                    className="border-none bg-transparent text-xs p-0 text-gray-700 font-semibold focus:ring-0"
                                >
                                    <option value="all">Tous les statuts</option>
                                    <option value="en_attente_mp">À arbitrer (Visa MP)</option>
                                    <option value="valide_mp">Validées MP (Transmises)</option>
                                    <option value="a_corriger">À corriger</option>
                                    <option value="rejete_mp">Rejetées</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-1.5 bg-white border border-[#B2BED6] rounded px-2.5 py-1">
                                <span className="font-bold text-gray-500 text-[11px]">Caisse :</span>
                                <select
                                    value={filterCaisse}
                                    onChange={(e) => setFilterCaisse(e.target.value)}
                                    className="border-none bg-transparent text-xs p-0 text-gray-700 font-semibold focus:ring-0"
                                >
                                    <option value="all">Toutes les caisses</option>
                                    {cashRegisters.map((c) => (
                                        <option key={c.id} value={c.name}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <input
                                type="text"
                                placeholder="Recherche numéro, initiateur..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="border border-[#B2BED6] rounded px-2.5 py-1 text-xs bg-white w-48 focus:outline-none focus:border-[#04326D]"
                            />
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
                                    <th className="py-3 px-4">Caisse Assignée</th>
                                    <th className="py-3 px-4 text-right">Montant Total</th>
                                    <th className="py-3 px-4 text-center">Urgence</th>
                                    <th className="py-3 px-4 text-center">Statut</th>
                                    <th className="py-3 px-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 text-gray-700">
                                {demandesFiltrees.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="py-12 text-center text-gray-400 italic">
                                            Aucune réquisition ne correspond aux filtres appliqués.
                                        </td>
                                    </tr>
                                ) : (
                                    demandesFiltrees.map((req) => (
                                        <tr key={req.id} className="hover:bg-[#F9F9FF] transition">
                                            <td className="py-3.5 px-4 font-mono font-bold text-[#04326D] whitespace-nowrap">
                                                {req.numero}
                                            </td>
                                            <td className="py-3.5 px-4 whitespace-nowrap text-gray-600">
                                                {req.dateSoumission}
                                            </td>
                                            <td className="py-3.5 px-4 whitespace-nowrap">
                                                <p className="font-semibold text-gray-900">{req.initiateurNom}</p>
                                                <p className="text-[10px] text-gray-400">{req.initiateurRole}</p>
                                            </td>
                                            <td className="py-3.5 px-4 whitespace-nowrap">
                                                <span
                                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                        req.nature === 'Achat' ? 'bg-blue-50 text-[#04326D]' : 'bg-amber-50 text-amber-800'
                                                    }`}
                                                >
                                                    {req.nature}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 font-bold text-gray-700">
                                                {req.caisseAttribuee || req.caisseSouhaitee || '—'}
                                            </td>
                                            <td className="py-3.5 px-4 text-right font-mono font-bold text-sm text-[#0B192C] whitespace-nowrap">
                                                {req.montantTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {req.devise}
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
                                                {renderStatutBadge(req)}
                                            </td>
                                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1">
                                                    {req.canEdit && (
                                                        <button
                                                            type="button"
                                                            onClick={() => openEditModal(req)}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-[#04326D] text-[#04326D] rounded font-bold text-xs hover:bg-blue-50 transition"
                                                        >
                                                            <Pencil className="w-3 h-3" />
                                                            <span>Corriger</span>
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOuvrirArbitrage(req)}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#04326D] hover:bg-[#06428f] text-white rounded font-bold text-xs transition shadow-sm"
                                                    >
                                                        {req.canDecide ? (
                                                            <>
                                                                <ShieldCheck className="w-3.5 h-3.5" />
                                                                <span>Viser</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Eye className="w-3.5 h-3.5" />
                                                                <span>Consulter</span>
                                                            </>
                                                        )}
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

            {/* MODALE CORRECTION (AVEC AUTOCOMPLÉTION PRÉDICTIVE DES LIGNES BUDGÉTAIRES) */}
            {editingReq && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <form
                        onSubmit={handleSaveEdit}
                        className="w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-white border border-[#B2BED6] shadow-modal rounded p-6 space-y-4 animate-slide-down"
                    >
                        <header className="flex items-start justify-between border-b pb-3">
                            <div>
                                <span className="text-[10px] font-bold uppercase text-[#04326D]">Correction Réquisition</span>
                                <h2 className="text-lg font-bold text-[#0B192C]">Dossier N° {editingReq.numero}</h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEditingReq(null)}
                                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </header>

                        <div className="space-y-4 text-xs">
                            {editError && (
                                <div className="border border-red-300 bg-red-50 p-3 text-red-800 rounded flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>{editError}</span>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Nature</label>
                                    <select
                                        value={editingReq.nature}
                                        onChange={(e) => setEditingReq({ ...editingReq, nature: e.target.value as any })}
                                        className="w-full border border-[#B2BED6] rounded p-2 text-xs focus:outline-none focus:border-[#04326D]"
                                    >
                                        <option value="Achat">Achat</option>
                                        <option value="Service">Service</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Caisse Assignée</label>
                                    <select
                                        value={editingReq.caisseSouhaitee}
                                        onChange={(e) => setEditingReq({ ...editingReq, caisseSouhaitee: e.target.value })}
                                        className="w-full border border-[#B2BED6] rounded p-2 text-xs font-bold focus:outline-none focus:border-[#04326D]"
                                        required
                                    >
                                        <option value="">Sélectionner une caisse active</option>
                                        {cashRegisters.map((c) => (
                                            <option key={c.id} value={c.name}>
                                                {c.name} ({c.devise})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Devise</label>
                                    <select
                                        value={editingReq.devise}
                                        onChange={(e) => setEditingReq({ ...editingReq, devise: e.target.value as any })}
                                        className="w-full border border-[#B2BED6] rounded p-2 text-xs font-bold focus:outline-none focus:border-[#04326D]"
                                    >
                                        <option value="USD">USD</option>
                                        <option value="FC">FC</option>
                                        <option value="EUR">EUR</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Observation / Contexte</label>
                                <textarea
                                    rows={2}
                                    value={editingReq.observation ?? ''}
                                    onChange={(e) => setEditingReq({ ...editingReq, observation: e.target.value })}
                                    className="w-full border border-[#B2BED6] rounded p-2 text-xs focus:outline-none focus:border-[#04326D]"
                                />
                            </div>

                            <div className="space-y-3">
                                <h3 className="font-bold text-gray-800 uppercase tracking-wider text-[11px] border-b pb-1">
                                    Lignes d'Articles & Saisie Prédictive Budgétaire
                                </h3>
                                {editingReq.lignes.map((line) => {
                                    const codeTrim = (line.codeAllBudget || '').trim().toLowerCase();
                                    const matched = budgetLinesMap.get(codeTrim);
                                    const isDropdownOpen = activeEditLineId === line.id;
                                    const suggestions = getCodeSuggestions(line.codeAllBudget || '');
                                    const isOverdraft = matched ? line.total > matched.solde : false;

                                    return (
                                        <div key={line.id} className="border border-gray-200 p-3 rounded bg-gray-50 space-y-2.5">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block font-bold text-gray-700 mb-1">Désignation</label>
                                                    <input
                                                        value={line.activite}
                                                        onChange={(e) => updateEditingLine(line.id, { activite: e.target.value })}
                                                        className="w-full border border-[#B2BED6] rounded p-2 text-xs bg-white focus:outline-none focus:border-[#04326D]"
                                                        required
                                                    />
                                                </div>

                                                {/* Autocomplétion prédictive lors de la correction */}
                                                <div className="relative budget-combobox-wrapper">
                                                    <label className="block font-bold text-[#04326D] mb-1">
                                                        Code Budgétaire (Taper pour suggestions)
                                                    </label>
                                                    <div className="relative">
                                                        <input
                                                            value={line.codeAllBudget || ''}
                                                            onChange={(e) => {
                                                                updateEditingLine(line.id, { codeAllBudget: e.target.value });
                                                                setActiveEditLineId(line.id);
                                                            }}
                                                            onFocus={() => setActiveEditLineId(line.id)}
                                                            placeholder="ex: 1.1, 6.112.a..."
                                                            className="w-full border border-primary rounded p-2 pr-7 text-xs font-mono font-bold text-primary bg-white focus:outline-none focus:border-[#04326D]"
                                                            required
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setActiveEditLineId(isDropdownOpen ? null : line.id)}
                                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
                                                        >
                                                            <ChevronDown className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>

                                                    {isDropdownOpen && (
                                                        <div className="absolute left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto bg-white border border-[#B2BED6] rounded shadow-xl py-1 text-xs divide-y divide-gray-100">
                                                            {suggestions.map((b) => (
                                                                <div
                                                                    key={b.id}
                                                                    onClick={() => {
                                                                        updateEditingLine(line.id, { codeAllBudget: b.code });
                                                                        setActiveEditLineId(null);
                                                                    }}
                                                                    className="p-2 cursor-pointer hover:bg-blue-50 flex items-center justify-between"
                                                                >
                                                                    <div>
                                                                        <span className="font-mono font-bold text-[#04326D]">{b.code}</span>
                                                                        <p className="text-[10px] text-gray-600 truncate">{b.libelle}</p>
                                                                    </div>
                                                                    <span className="text-[10px] font-mono font-bold text-emerald-700">
                                                                        {b.solde.toLocaleString()} {b.devise}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {matched && (
                                                        <div className={`mt-1 p-1.5 rounded border text-[10px] ${isOverdraft ? 'bg-red-50 border-red-300 text-red-900' : 'bg-blue-50 border-blue-200 text-gray-800'}`}>
                                                            <p className="font-bold truncate">{matched.libelle}</p>
                                                            <p className="font-mono">Solde dispo : <strong>{matched.solde.toLocaleString()} {matched.devise}</strong></p>
                                                            {isOverdraft && (
                                                                <p className="text-red-700 font-bold uppercase mt-0.5">Dépassement de solde détecté</p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-3 gap-3 items-end">
                                                <div>
                                                    <label className="block font-bold text-gray-700 mb-1">Quantité / Durée</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0.01"
                                                        value={line.quantiteOuDuree}
                                                        onChange={(e) => updateEditingLine(line.id, { quantiteOuDuree: Number(e.target.value) })}
                                                        className="w-full border rounded p-1.5 text-xs text-center bg-white"
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block font-bold text-gray-700 mb-1">Prix Unitaire</label>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={line.frais}
                                                        onChange={(e) => updateEditingLine(line.id, { frais: Number(e.target.value) })}
                                                        className="w-full border rounded p-1.5 text-xs text-right font-mono bg-white"
                                                        required
                                                    />
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-[10px] text-gray-500 block">Total Ligne :</span>
                                                    <strong className="text-sm font-mono text-[#04326D]">
                                                        {line.total.toLocaleString()} {editingReq.devise}
                                                    </strong>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-3 border-t">
                            <button
                                type="button"
                                onClick={() => setEditingReq(null)}
                                className="px-3.5 py-1.5 border rounded text-xs text-gray-600 hover:bg-gray-50"
                            >
                                Annuler
                            </button>
                            <button
                                type="submit"
                                disabled={savingEdit}
                                className="px-4 py-1.5 bg-[#04326D] hover:bg-[#06428f] text-white rounded text-xs font-bold shadow"
                            >
                                {savingEdit ? 'Enregistrement...' : 'Enregistrer les corrections'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* MODALE D'ARBITRAGE ET ATTRIBUTION DES CODES AVEC SÉLECTION PRÉDICTIVE */}
            {selectedReq && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded border border-[#B2BED6] shadow-modal max-w-4xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto animate-slide-down">
                        <div className="flex items-start justify-between border-b pb-3">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded bg-blue-50 flex items-center justify-center shrink-0">
                                    <ShieldCheck className="w-5 h-5 text-[#04326D]" />
                                </div>
                                <div>
                                    <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">
                                        Arbitrage Opérationnel & Attribution Budgétaire
                                    </span>
                                    <h2 className="text-base font-bold text-[#0B192C]">
                                        Réquisition N° {selectedReq.numero} ({selectedReq.nature})
                                    </h2>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Demandeur : <strong className="text-[#0B192C]">{selectedReq.initiateurNom}</strong> • Date : {selectedReq.dateSoumission}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedReq(null)}
                                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {selectedReq.observation && (
                            <div className="p-3 bg-gray-50 border rounded text-xs text-gray-700">
                                <strong>Observation :</strong> {selectedReq.observation}
                            </div>
                        )}

                        <div>
                            <h3 className="text-xs font-bold text-[#0B192C] uppercase tracking-wider mb-2">
                                Articles & Saisie Prédictive de l'Imputation Budgétaire
                            </h3>
                            <table className="w-full text-left text-xs border border-gray-200 rounded overflow-hidden">
                                <thead className="bg-gray-100 font-bold text-gray-700">
                                    <tr>
                                        <th className="p-2 w-1/4">Désignation</th>
                                        <th className="p-2 w-2/5 text-[#04326D]">Code Budgétaire (Taper pour suggestions)</th>
                                        <th className="p-2 text-right">Total Ligne</th>
                                        <th className="p-2">Pièces Jointes</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {selectedReq.lignes.map((ligne) => {
                                        const codeSaisi = (allocations[ligne.id] || '').trim();
                                        const matchedLine = budgetLinesMap.get(codeSaisi.toLowerCase());
                                        const isDepassement = matchedLine ? ligne.total > matchedLine.solde : false;
                                        const isDropdownOpen = activeArbitrageLineId === ligne.id;
                                        const suggestions = getCodeSuggestions(allocations[ligne.id] || '');

                                        return (
                                            <tr key={ligne.id} className={isDepassement ? 'bg-red-50/70' : ''}>
                                                <td className="p-2 font-medium">
                                                    <p>{ligne.activite}</p>
                                                    <span className="text-[10px] text-gray-400">
                                                        {ligne.quantiteOuDuree} {ligne.unite} à {ligne.frais.toLocaleString()} {selectedReq.devise}
                                                    </span>
                                                </td>

                                                {/* Saisie prédictive instantanée */}
                                                <td className="p-2">
                                                    {selectedReq.canDecide ? (
                                                        <div className="relative budget-combobox-wrapper space-y-1">
                                                            <div className="relative">
                                                                <input
                                                                    type="text"
                                                                    placeholder="Taper le code (ex: 2, 6.112.a)..."
                                                                    value={allocations[ligne.id] || ''}
                                                                    onChange={(e) => {
                                                                        setAllocations({
                                                                            ...allocations,
                                                                            [ligne.id]: e.target.value,
                                                                        });
                                                                        setActiveArbitrageLineId(ligne.id);
                                                                    }}
                                                                    onFocus={() => setActiveArbitrageLineId(ligne.id)}
                                                                    className="w-full border border-[#04326D] rounded p-1.5 pr-7 text-xs font-mono font-bold text-[#04326D] bg-white focus:outline-none focus:ring-1 focus:ring-[#04326D]"
                                                                    required
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setActiveArbitrageLineId(isDropdownOpen ? null : ligne.id)}
                                                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400"
                                                                >
                                                                    <ChevronDown className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>

                                                            {isDropdownOpen && (
                                                                <div className="absolute left-0 right-0 z-50 mt-1 max-h-52 overflow-y-auto bg-white border border-[#B2BED6] rounded shadow-xl py-1 text-xs divide-y divide-gray-100">
                                                                    {suggestions.map((b) => (
                                                                        <div
                                                                            key={b.id}
                                                                            onClick={() => {
                                                                                setAllocations({
                                                                                    ...allocations,
                                                                                    [ligne.id]: b.code,
                                                                                });
                                                                                setActiveArbitrageLineId(null);
                                                                            }}
                                                                            className="p-2 cursor-pointer hover:bg-blue-50 flex items-center justify-between"
                                                                        >
                                                                            <div>
                                                                                <span className="font-mono font-bold text-[#04326D]">{b.code}</span>
                                                                                <p className="text-[10px] text-gray-600 truncate">{b.libelle}</p>
                                                                            </div>
                                                                            <span className="text-[10px] font-mono font-bold text-emerald-700">
                                                                                {b.solde.toLocaleString()} {b.devise}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}

                                                            {matchedLine ? (
                                                                <div className={`p-1.5 rounded border text-[10px] ${isDepassement ? 'bg-red-50 border-red-300 text-red-900' : 'bg-blue-50 border-blue-200 text-gray-800'}`}>
                                                                    <p className="font-bold truncate">{matchedLine.libelle}</p>
                                                                    <div className="flex justify-between font-mono">
                                                                        <span>Solde de la ligne :</span>
                                                                        <strong className={isDepassement ? 'text-red-700 font-bold' : 'text-emerald-700 font-bold'}>
                                                                            {matchedLine.solde.toLocaleString()} {matchedLine.devise}
                                                                        </strong>
                                                                    </div>
                                                                    {isDepassement && (
                                                                        <p className="text-red-700 font-bold uppercase mt-0.5">Dépassement de solde détecté</p>
                                                                    )}
                                                                </div>
                                                            ) : codeSaisi ? (
                                                                <p className="text-[10px] text-gray-400 italic">Code libre non répertorié</p>
                                                            ) : null}
                                                        </div>
                                                    ) : (
                                                        <span className="font-mono font-bold text-[#04326D]">
                                                            {ligne.code_allocation || ligne.codeAllBudget}
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="p-2 text-right font-mono font-bold">
                                                    {ligne.total.toLocaleString()} {selectedReq.devise}
                                                </td>

                                                <td className="p-2">
                                                    {ligne.justif && ligne.justif.length > 0 ? (
                                                        <div className="space-y-1">
                                                            {ligne.justif.map((j) => (
                                                                <div key={j.id} className="text-[10px] bg-blue-50 text-[#04326D] px-2 py-0.5 rounded flex items-center justify-between">
                                                                    <span className="truncate max-w-[100px]">{j.scan}</span>
                                                                    {j.fileUrl && (
                                                                        <a href={j.fileUrl} target="_blank" rel="noreferrer" className="underline font-bold">
                                                                            Voir
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400 italic text-[10px]">Aucun devis</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot className="bg-gray-50 font-bold border-t">
                                    <tr>
                                        <td colSpan={2} className="p-2 text-right">Total Général :</td>
                                        <td className="p-2 text-right text-sm font-mono text-[#04326D]">
                                            {selectedReq.montantTotal.toLocaleString()} {selectedReq.devise}
                                        </td>
                                        <td />
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {selectedReq.canDecide && (
                            <div className="border-t pt-4 space-y-4">
                                {!modeRejet ? (
                                    <>
                                        <div className="bg-blue-50/60 p-3 rounded border border-blue-200 space-y-1.5">
                                            <label className="block text-xs font-bold text-[#04326D] uppercase tracking-wider">
                                                Attribution Officielle de la Caisse de Décaissement *
                                            </label>
                                            <select
                                                value={caisseChoisie}
                                                onChange={(e) => setCaisseChoisie(e.target.value)}
                                                className="w-full border border-[#B2BED6] rounded p-2 text-xs font-bold text-[#0B192C] bg-white focus:outline-none focus:border-[#04326D]"
                                                required
                                            >
                                                <option value="">Sélectionner une caisse active</option>
                                                {cashRegisters.map((c) => (
                                                    <option key={c.id} value={c.name}>
                                                        {c.name} ({c.devise})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="flex items-center justify-between pt-2">
                                            <button
                                                type="button"
                                                onClick={() => setModeRejet(true)}
                                                className="px-3.5 py-2 border border-red-300 text-red-600 hover:bg-red-50 rounded text-xs font-bold transition"
                                            >
                                                <Ban className="w-3.5 h-3.5 inline mr-1" />
                                                Rejeter la demande
                                            </button>

                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedReq(null)}
                                                    className="px-3.5 py-2 border rounded text-xs text-gray-600 hover:bg-gray-50"
                                                >
                                                    Fermer
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleDeclencherApprobation}
                                                    disabled={!caisseChoisie}
                                                    className="px-4 py-2 bg-[#10B981] hover:bg-[#059669] text-white rounded text-xs font-bold shadow transition"
                                                >
                                                    <ShieldCheck className="w-4 h-4 inline mr-1" />
                                                    Accorder Visa MP
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="bg-red-50 p-4 rounded border border-red-200 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <h4 className="text-xs font-bold text-red-800 uppercase">
                                                Motif du Rejet (Obligatoire)
                                            </h4>
                                            <button
                                                type="button"
                                                onClick={() => setModeRejet(false)}
                                                className="text-xs text-gray-500 hover:underline"
                                            >
                                                Annuler
                                            </button>
                                        </div>
                                        <textarea
                                            rows={3}
                                            value={motifRejet}
                                            onChange={(e) => setMotifRejet(e.target.value)}
                                            placeholder="Indiquez clairement la correction requise..."
                                            className="w-full border border-red-300 rounded p-2 text-xs bg-white focus:outline-none"
                                            required
                                        />
                                        <div className="flex justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={handleRejeter}
                                                className="px-4 py-1.5 bg-[#DC2626] hover:bg-[#b91c1c] text-white rounded text-xs font-bold shadow"
                                            >
                                                Confirmer le Rejet
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {!selectedReq.canDecide && (
                            <div className="border-t pt-3 flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => setSelectedReq(null)}
                                    className="px-4 py-2 bg-[#0B192C] text-white rounded text-xs font-bold"
                                >
                                    Fermer
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MODALE SIGNATURE (PIN OU MOT DE PASSE) */}
            {passwordModalOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded border-2 border-[#04326D] shadow-2xl max-w-sm w-full p-6 space-y-4 animate-slide-down">
                        <div className="text-center border-b pb-3">
                            <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 flex items-center justify-center mb-2">
                                <Lock className="w-5 h-5 text-[#04326D]" />
                            </div>
                            <h3 className="text-sm font-black uppercase text-[#0B192C] tracking-wider">
                                Signature Certifiée du Visa MP
                            </h3>
                            <p className="text-[11px] text-gray-500 mt-1">
                                Signataire : <strong>{user.name}</strong> (Manager de Projet)
                            </p>
                        </div>

                        {pinError && (
                            <div className="p-2.5 bg-red-50 border border-red-300 text-red-800 rounded text-xs">
                                {pinError}
                            </div>
                        )}

                        <form onSubmit={handleConfirmerSignature} className="space-y-3">
                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 mb-1.5">
                                    Code PIN personnel (ou mot de passe) *
                                </label>
                                <div className="relative">
                                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                    <input
                                        type="password"
                                        placeholder="••••"
                                        value={passwordSaisi}
                                        onChange={(e) => setPasswordSaisi(e.target.value)}
                                        className="w-full border border-[#B2BED6] rounded p-2.5 pl-9 text-sm focus:outline-none focus:border-[#04326D]"
                                        autoFocus
                                        required
                                    />
                                </div>
                            </div>

                            <p className="text-[10px] text-gray-400 leading-tight">
                                Les crédits budgétaires seront immédiatement réservés en base et transmis au Manager Financier.
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
                                    disabled={signingLoading}
                                    className="px-4 py-1.5 bg-[#10B981] hover:bg-[#059669] text-white font-bold text-xs rounded shadow"
                                >
                                    {signingLoading ? 'Validation...' : 'Signer & Valider'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* FEUILLE D'IMPRESSION DU RAPPORT PAR CAISSE ET PAR STATUT */}
            <div id="pm-filtered-report-sheet" className="p-8 font-sans text-black text-xs space-y-4">
                <div className="flex justify-between items-start border-b-2 border-black pb-3">
                    <div>
                        <h1 className="text-base font-black uppercase">Bon Pasteur A.S.B.L. — Kolwezi</h1>
                        <p className="text-xs font-bold text-gray-700">Synthèse Filtrée des Réquisitions Projet : {user.project?.name}</p>
                    </div>
                    <div className="text-right text-[11px]">
                        <p><strong>Caisse filtrée :</strong> {filterCaisse === 'all' ? 'Toutes les caisses' : filterCaisse}</p>
                        <p><strong>Statut filtré :</strong> {filterStatut.toUpperCase()}</p>
                        <p><strong>Date d'édition :</strong> {new Date().toLocaleDateString('fr-FR')}</p>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3 border border-black p-3 font-mono text-xs">
                    <div>
                        <span className="text-[10px] uppercase text-gray-600 block">Dossiers</span>
                        <strong>{statsFiltrees.count} réquisition(s)</strong>
                    </div>
                    <div>
                        <span className="text-[10px] uppercase text-gray-600 block">Volume Total USD</span>
                        <strong>{statsFiltrees.totalUSD.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} $</strong>
                    </div>
                    <div>
                        <span className="text-[10px] uppercase text-gray-600 block">Volume Total CDF</span>
                        <strong>{statsFiltrees.totalFC.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} FC</strong>
                    </div>
                </div>

                <table className="w-full text-left border border-black text-xs border-collapse">
                    <thead>
                        <tr className="bg-gray-100 border-b border-black font-bold">
                            <th className="p-1.5 border-r border-black">N° Réquisition</th>
                            <th className="p-1.5 border-r border-black">Date</th>
                            <th className="p-1.5 border-r border-black">Demandeur</th>
                            <th className="p-1.5 border-r border-black">Nature</th>
                            <th className="p-1.5 border-r border-black">Caisse</th>
                            <th className="p-1.5 border-r border-black text-right">Montant</th>
                            <th className="p-1.5">Statut</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-black">
                        {demandesFiltrees.map((r) => (
                            <tr key={r.id}>
                                <td className="p-1.5 border-r border-black font-mono font-bold">{r.numero}</td>
                                <td className="p-1.5 border-r border-black">{r.dateSoumission}</td>
                                <td className="p-1.5 border-r border-black">{r.initiateurNom}</td>
                                <td className="p-1.5 border-r border-black">{r.nature}</td>
                                <td className="p-1.5 border-r border-black">{r.caisseAttribuee || r.caisseSouhaitee || '—'}</td>
                                <td className="p-1.5 border-r border-black text-right font-mono font-bold">
                                    {r.montantTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {r.devise}
                                </td>
                                <td className="p-1.5 font-bold">{r.statusLabel}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="pt-10 flex justify-between text-center">
                    <div className="space-y-8">
                        <p className="font-bold underline uppercase">Le Manager de Projet</p>
                        <p>{user.name}</p>
                    </div>
                    <div className="space-y-8">
                        <p className="font-bold underline uppercase">La Direction</p>
                        <p>Pour Visa et Classement</p>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}