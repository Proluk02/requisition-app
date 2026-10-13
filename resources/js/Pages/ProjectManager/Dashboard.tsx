import { useState, useMemo, useRef, useEffect } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import RequisitionCorrectionForm, { type RequisitionCorrectionData } from '@/Components/RequisitionCorrectionForm';
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
    Search,
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
    numero: string;
    projet: string;
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
    normalizedCode: string;
    solde: number;
    devise: string;
    budget_initial: number;
}

export default function ProjectManagerDashboard({
    requisitions = [],
    cashRegisters = [],
    budgetLines = [],
}: {
    requisitions?: RequisitionMP[];
    cashRegisters?: CashRegisterOption[];
    budgetLines?: BudgetLineOption[];
}) {
    const { auth } = usePage<PageProps>().props;
    const user = auth.user;

    const [demandes, setDemandes] = useState<RequisitionMP[]>(requisitions);
    const [filterStatut, setFilterStatut] = useState<string>('all');

    const [selectedReq, setSelectedReq] = useState<RequisitionMP | null>(null);
    const [caisseChoisie, setCaisseChoisie] = useState<string>('');
    const [allocations, setAllocations] = useState<Record<string, string>>({});
    const [modeRejet, setModeRejet] = useState<boolean>(false);
    const [motifRejet, setMotifRejet] = useState<string>('');

    // Autocomplete dropdown state
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

    const getBudgetLineObject = (code: string) => {
        if (!code.trim()) return null;
        const normalized = code.trim().toLowerCase();
        return budgetLines.find((l) => l.normalizedCode === normalized) || null;
    };

    const demandesFiltrees = useMemo(() => {
        if (filterStatut === 'all') return demandes;
        if (filterStatut === 'a_corriger') return demandes.filter((d) => d.needsCorrection);
        return demandes.filter((d) => d.statut === filterStatut);
    }, [demandes, filterStatut]);

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
                'En tant que Manager de Projet, vous devez attribuer un code budgétaire valide à chaque ligne.'
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
                                      lignes: d.lignes.map((ligne) => {
                                          const allocation = allocationsArray.find(
                                              (item) => item.demande_id === ligne.id
                                          );
                                          const matched = allocation ? getBudgetLineObject(allocation.code_allocation) : null;

                                          return allocation
                                              ? {
                                                    ...ligne,
                                                    code_allocation: allocation.code_allocation,
                                                    codeAllBudget: allocation.code_allocation,
                                                    libelleAllocation: matched?.libelle || 'code non specifie',
                                                    budget_solde_actuel: matched ? matched.solde : null,
                                                }
                                              : ligne;
                                      }),
                                  }
                                : d
                        )
                    );
                    showToast(
                        'success',
                        `Visa Manager de Projet apposé avec succès sur ${selectedReq.numero}.`
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
                    showToast('error', `Réquisition ${selectedReq.numero} rejetée.`);
                    setSelectedReq(null);
                    setModeRejet(false);
                    setMotifRejet('');
                },
            }
        );
    };

    const openEditModal = (req: RequisitionMP) => {
        setEditingReq({
            id: req.id,
            numero: req.numero,
            nature: req.nature,
            devise: req.devise,
            caisse: req.caisseAttribuee || req.caisseSouhaitee,
            observation: req.observation ?? null,
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
                <div
                    className={`fixed bottom-6 right-6 z-[90] p-4 rounded-lg shadow-modal border flex items-center gap-3 text-xs font-semibold ${
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
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E2E8F0] pb-5">
                <div>
                    <h1 className="text-xl font-bold text-[#0B192C] flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-[#04326D]" />
                        Validation des Réquisitions —{' '}
                        <span className="text-[#04326D]">{user.project?.name || 'Projet'}</span>
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">
                        Manager de Projet : <strong className="text-[#0B192C]">{user.name}</strong>{' '}
                        • Contrôle des besoins, recherche analytique et imputation budgétaire certifiée.
                    </p>
                </div>

                <Link
                    href={route('requisitions.create')}
                    className="inline-flex items-center gap-2 bg-[#04326D] hover:bg-[#06428f] text-white px-4 py-2.5 rounded text-xs font-bold shadow-sm transition"
                >
                    <Plus className="w-4 h-4" strokeWidth={2.5} />
                    <span>Initier Réquisition Projet</span>
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border-2 border-amber-300 rounded p-4 shadow-sm">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-amber-900 block mb-1">
                        En attente de Visa MP
                    </span>
                    <p className="text-2xl font-black text-amber-700">
                        {demandes.filter((d) => d.canDecide).length}{' '}
                        <span className="text-xs font-normal text-gray-500">dossier(s)</span>
                    </p>
                    <p className="text-[11px] text-gray-500 mt-1">Attribution budgétaire requise</p>
                </div>

                <div className="bg-white border border-[#B2BED6] rounded p-4 shadow-sm">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block mb-1">
                        Validées (Transmises Finances)
                    </span>
                    <p className="text-2xl font-black text-emerald-700">
                        {demandes.filter((d) => d.statut === 'valide_mp').length}{' '}
                        <span className="text-xs font-normal text-gray-500">dossier(s)</span>
                    </p>
                    <p className="text-[11px] text-gray-500 mt-1">Signées électroniquement</p>
                </div>

                <div className="bg-white border border-[#B2BED6] rounded p-4 shadow-sm">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block mb-1">
                        À corriger
                    </span>
                    <p className="text-2xl font-black text-red-700">
                        {demandes.filter((d) => d.needsCorrection).length}{' '}
                        <span className="text-xs font-normal text-gray-500">dossier(s)</span>
                    </p>
                    <p className="text-[11px] text-gray-500 mt-1">Nécessite révision</p>
                </div>
            </div>

            <div className="bg-white border border-[#B2BED6] rounded shadow-sm overflow-hidden">
                <div className="p-4 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-gray-50/50">
                    <h2 className="text-xs font-bold text-[#0B192C] uppercase tracking-wider">
                        Demandes du Projet : {user.project?.name}
                    </h2>

                    <div className="flex items-center gap-2 text-xs">
                        <Filter className="w-3.5 h-3.5 text-gray-400" />
                        <select
                            value={filterStatut}
                            onChange={(e) => setFilterStatut(e.target.value)}
                            className="border border-[#B2BED6] rounded px-2.5 py-1 text-xs bg-white text-[#0B192C]"
                        >
                            <option value="all">Toutes</option>
                            <option value="en_attente_mp">À arbitrer (Visa MP)</option>
                            <option value="valide_mp">Validées (Transmises)</option>
                            <option value="a_corriger">À corriger</option>
                            <option value="rejete_mp">Rejetées</option>
                        </select>
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
                                        Aucune réquisition trouvée.
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
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-[#04326D]">
                                                {req.statusLabel}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-1">
                                                {req.canEdit && (
                                                    <button
                                                        type="button"
                                                        onClick={() => openEditModal(req)}
                                                        className="px-2.5 py-1.5 border border-[#04326D] text-[#04326D] rounded font-semibold text-xs hover:bg-blue-50 transition"
                                                    >
                                                        Corriger
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => handleOuvrirArbitrage(req)}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#04326D] hover:bg-[#06428f] text-white rounded font-bold text-xs transition"
                                                >
                                                    {req.canDecide ? (
                                                        <>
                                                            <ShieldCheck className="w-3.5 h-3.5" />
                                                            <span>Arbitrer & Viser</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Eye className="w-3.5 h-3.5" />
                                                            <span>Détails</span>
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

            {/* MODALE D'ARBITRAGE AVEC AUTOCOMPLÉTION & SOLDE DYNAMIQUE */}
            {selectedReq && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
                    <div className="bg-white rounded border border-[#B2BED6] shadow-2xl max-w-4xl w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto animate-slide-down">
                        <header className="flex items-start justify-between border-b pb-3">
                            <div>
                                <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">
                                    Contrôle Opérationnel & Attribution Budgétaire
                                </span>
                                <h2 className="text-base font-bold text-[#0B192C]">
                                    Réquisition N° {selectedReq.numero} ({selectedReq.nature})
                                </h2>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Initiateur : <strong>{selectedReq.initiateurNom}</strong> • Date : {selectedReq.dateSoumission}
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

                        <div>
                            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                                Imputation des Lignes de Dépenses
                            </h3>
                            <div className="overflow-x-auto border border-[#B2BED6] rounded">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-[#0B192C] text-white font-bold">
                                        <tr>
                                            <th className="p-2.5">Désignation</th>
                                            <th className="p-2.5 w-72">Code Allocation & Recherche</th>
                                            <th className="p-2.5 text-right">Solde Actuel</th>
                                            <th className="p-2.5 text-right">Total Ligne</th>
                                            <th className="p-2.5 text-center">Faisabilité</th>
                                            <th className="p-2.5">Pièces</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y text-gray-700">
                                        {selectedReq.lignes.map((ligne) => {
                                            const currentCode = allocations[ligne.id] || '';
                                            const matchedLine = getBudgetLineObject(currentCode);
                                            const soldeDispo = matchedLine ? matchedLine.solde : ligne.budget_solde_actuel;
                                            const depassement = soldeDispo !== null && soldeDispo !== undefined && ligne.total > soldeDispo;

                                            const filteredSuggestions = budgetLines.filter((b) => {
                                                const q = currentCode.trim().toLowerCase();
                                                if (!q) return false;
                                                return b.code.toLowerCase().includes(q) || b.libelle.toLowerCase().includes(q);
                                            });

                                            return (
                                                <tr key={ligne.id} className={depassement ? 'bg-red-50/60' : ''}>
                                                    <td className="p-2.5 font-medium max-w-xs">{ligne.activite}</td>
                                                    <td className="p-2.5 relative">
                                                        {selectedReq.canDecide ? (
                                                            <div className="relative">
                                                                <input
                                                                    type="text"
                                                                    placeholder="Tapez (ex: 2.2)..."
                                                                    value={currentCode}
                                                                    onFocus={() => setActiveInputId(ligne.id)}
                                                                    onChange={(e) => {
                                                                        setAllocations({
                                                                            ...allocations,
                                                                            [ligne.id]: e.target.value,
                                                                        });
                                                                        setActiveInputId(ligne.id);
                                                                    }}
                                                                    className="w-full border border-[#04326D] rounded p-1.5 text-xs font-mono font-bold text-[#04326D] bg-white focus:outline-none"
                                                                    required
                                                                />

                                                                {/* Dropdown autocomplétion dynamique */}
                                                                {activeInputId === ligne.id && filteredSuggestions.length > 0 && (
                                                                    <div className="absolute left-0 top-full mt-1 w-80 bg-white border border-[#04326D] rounded shadow-xl z-30 max-h-48 overflow-y-auto divide-y text-xs">
                                                                        {filteredSuggestions.map((sug) => (
                                                                            <button
                                                                                key={sug.id}
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setAllocations({
                                                                                        ...allocations,
                                                                                        [ligne.id]: sug.code,
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
                                                                    {matchedLine ? matchedLine.libelle : (ligne.libelleAllocation || 'Aucune ligne sélectionnée')}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <div>
                                                                <span className="font-mono font-bold text-[#04326D] block">
                                                                    {ligne.code_allocation || ligne.codeAllBudget}
                                                                </span>
                                                                <span className="text-[10px] text-gray-500 block truncate">
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
                                                            <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-800 text-[10px] font-bold">
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
                                                            <span className="text-[11px] font-semibold text-[#04326D]">
                                                                {ligne.justif.length} pièce(s)
                                                            </span>
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

                        {selectedReq.canDecide && (
                            <div className="border-t border-[#E2E8F0] pt-4 space-y-4">
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

                                        <div className="flex items-center justify-between pt-2">
                                            <button
                                                type="button"
                                                onClick={() => setModeRejet(true)}
                                                className="px-3 py-2 border border-red-300 text-red-600 rounded text-xs font-bold hover:bg-red-50"
                                            >
                                                Rejeter la demande
                                            </button>

                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedReq(null)}
                                                    className="px-3 py-2 border rounded text-xs font-semibold text-gray-600 hover:bg-gray-50"
                                                >
                                                    Fermer
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleDeclencherApprobation}
                                                    disabled={!caisseChoisie}
                                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#04326D] hover:bg-[#06428f] text-white rounded text-xs font-bold shadow"
                                                >
                                                    <ShieldCheck className="w-4 h-4" />
                                                    <span>Valider & Signer (Visa MP)</span>
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="p-4 bg-red-50 border border-red-200 rounded space-y-3 text-xs">
                                        <h4 className="font-bold text-red-800 uppercase">
                                            Motif du Rejet (Obligatoire)
                                        </h4>
                                        <textarea
                                            rows={3}
                                            value={motifRejet}
                                            onChange={(e) => setMotifRejet(e.target.value)}
                                            placeholder="Précisez le motif du rejet..."
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
                                                className="px-4 py-1.5 bg-red-600 text-white rounded font-bold shadow hover:bg-red-700"
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

            {/* MODALE SIGNATURE (PIN) */}
            {passwordModalOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 animate-fade-in">
                    <div className="bg-white rounded border-2 border-[#04326D] shadow-2xl max-w-sm w-full p-6 space-y-4 animate-slide-down">
                        <div className="text-center border-b pb-3">
                            <Lock className="w-8 h-8 text-[#04326D] mx-auto mb-1" />
                            <h3 className="text-sm font-bold uppercase text-[#0B192C]">
                                Signature Certifiée du Visa MP
                            </h3>
                            <p className="text-[11px] text-gray-500">
                                Signataire : <strong>{user.name}</strong> (Manager de Projet)
                            </p>
                        </div>

                        {pinError && (
                            <div className="p-2 bg-red-50 border border-red-300 text-red-800 rounded text-xs">
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
                                    placeholder="Code PIN"
                                    value={passwordSaisi}
                                    onChange={(e) => setPasswordSaisi(e.target.value)}
                                    className="w-full border border-[#B2BED6] rounded p-2 text-xs font-mono text-center tracking-widest focus:outline-none focus:border-[#04326D]"
                                    autoFocus
                                    required
                                />
                            </div>

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
                                    className="px-4 py-1.5 bg-[#04326D] hover:bg-[#06428f] text-white rounded text-xs font-bold shadow"
                                >
                                    {signingLoading ? 'Signature…' : 'Signer & Valider'}
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
                    onClose={() => setEditingReq(null)}
                    onSuccess={() => {
                        showToast('success', `Réquisition ${editingReq.numero} corrigée et transmise aux Finances.`);
                        setEditingReq(null);
                    }}
                />
            )}
        </AppLayout>
    );
}