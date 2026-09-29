import { useState, useMemo } from 'react';
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
    Send,
    Ban,
    Lock,
    KeyRound,
    Loader2,
    Filter,
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

const CAISSES_DISPONIBLES = [
    'EU',
    'Caisse principale',
    'Saint Jean Eudes',
    'Local Fund 1 (Boulangerie)',
    'Local Fund 2',
];

export default function ProjectManagerDashboard({
    requisitions = [],
}: {
    requisitions?: RequisitionMP[];
}) {
    const { auth } = usePage<PageProps>().props;
    const user = auth.user;

    const [demandes, setDemandes] = useState<RequisitionMP[]>(requisitions);
    const [filterStatut, setFilterStatut] = useState<string>('all');

    // Modale d'arbitrage
    const [selectedReq, setSelectedReq] = useState<RequisitionMP | null>(null);
    const [caisseChoisie, setCaisseChoisie] = useState<string>('Caisse principale');
    const [allocations, setAllocations] = useState<Record<string, string>>({});
    const [modeRejet, setModeRejet] = useState<boolean>(false);
    const [motifRejet, setMotifRejet] = useState<string>('');

    // Signature électronique
    const [passwordModalOpen, setPasswordModalOpen] = useState<boolean>(false);
    const [passwordSaisi, setPasswordSaisi] = useState<string>('');
    const [signingLoading, setSigningLoading] = useState<boolean>(false);

    // Modale correction
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

    // Filtrage
    const demandesFiltrees = useMemo(() => {
        if (filterStatut === 'all') return demandes;
        if (filterStatut === 'a_corriger') return demandes.filter((d) => d.needsCorrection);
        return demandes.filter((d) => d.statut === filterStatut);
    }, [demandes, filterStatut]);

    // Ouvrir arbitrage
    const handleOuvrirArbitrage = (req: RequisitionMP) => {
        setSelectedReq(req);
        setCaisseChoisie(req.caisseAttribuee || req.caisseSouhaitee || 'Caisse principale');
        setModeRejet(false);
        setMotifRejet('');

        const initialAllocations: Record<string, string> = {};
        req.lignes.forEach((ligne) => {
            initialAllocations[ligne.id] = ligne.code_allocation || ligne.codeAllBudget || '';
        });
        setAllocations(initialAllocations);
    };

    // Déclencher signature
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
                'En tant que Manager de Projet, vous devez attribuer un code budgétaire à chaque ligne.',
            );
            return;
        }

        setPasswordSaisi('');
        setPasswordModalOpen(true);
    };

    // Confirmer signature
    const handleConfirmerSignatureAvecMotDePasse = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedReq || !passwordSaisi) return;

        setSigningLoading(true);

        const allocationsArray = Object.entries(allocations).map(([demande_id, code_allocation]) => ({
            demande_id,
            code_allocation: code_allocation.trim(),
        }));

        router.patch(
            route('requisitions.manager-decision', selectedReq.id),
            {
                decision: 'approve',
                password: passwordSaisi,
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
                                : d,
                        ),
                    );
                    showToast(
                        'success',
                        `Visa Manager de Projet apposé avec succès sur ${selectedReq.numero}.`,
                    );
                    setSelectedReq(null);
                    setPasswordSaisi('');
                },
                onError: (errors) => {
                    showToast(
                        'error',
                        (errors as any).password ||
                            'Échec de la signature : mot de passe incorrect.',
                    );
                },
            },
        );
    };

    // Rejet
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
                                : d,
                        ),
                    );
                    showToast('error', `Réquisition ${selectedReq.numero} rejetée.`);
                    setSelectedReq(null);
                    setModeRejet(false);
                    setMotifRejet('');
                },
            },
        );
    };

    // Ouvrir correction
    const openEditModal = (req: RequisitionMP) => {
        setEditingReq({ ...req, lignes: req.lignes.map((l) => ({ ...l })) });
        setEditFiles({});
        setEditError(null);
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
            },
        );
    };

    const renderStatutBadge = (req: RequisitionMP) => {
        let cls = 'bg-gray-100 text-gray-700';
        if (req.canDecide) cls = 'bg-tertiary-soft text-tertiary-dark';
        else if (req.statut === 'valide_mp') cls = 'bg-success-soft text-success-dark';
        else if (req.needsCorrection) cls = 'bg-error-soft text-error-dark';
        return (
            <span className={`${cls} px-2.5 py-1 rounded-full text-[10px] font-bold`}>
                {req.statusLabel}
            </span>
        );
    };

    return (
        <AppLayout>
            <Head title="Validation Manager de Projet" />

            {/* Toast */}
            {toast && (
                <div
                    className={`fixed bottom-6 right-6 z-[90] p-4 rounded-lg shadow-modal border flex items-center gap-3 text-xs font-semibold animate-slide-in-right ${
                        toast.type === 'success'
                            ? 'bg-success text-white border-success-dark'
                            : 'bg-error text-white border-error-dark'
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

            {/* En-tête */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-soft pb-5">
                <div>
                    <h1 className="text-xl font-bold text-on-surface flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-primary" />
                        Validation des Réquisitions —{' '}
                        <span className="text-primary">{user.project?.name || 'Projet'}</span>
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">
                        Manager de Projet : <strong className="text-on-surface">{user.name}</strong>{' '}
                        • Contrôle opérationnel, attribution des codes budgétaires et signature
                        électronique.
                    </p>
                </div>

                <Link
                    href={route('requisitions.create')}
                    className="inline-flex items-center gap-2 bg-primary hover:bg-primary-light text-white px-4 py-2.5 rounded-md text-xs font-semibold shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
                >
                    <Plus className="w-4 h-4" strokeWidth={2.5} />
                    <span>Initier Réquisition Projet</span>
                </Link>
            </div>

            {/* KPI */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border-2 border-tertiary/40 rounded-lg p-5 shadow-card hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface">
                            En attente de Visa MP
                        </span>
                        <div className="w-8 h-8 rounded-md bg-tertiary-soft flex items-center justify-center">
                            <Clock className="w-4 h-4 text-tertiary" />
                        </div>
                    </div>
                    <p className="text-2xl font-black text-tertiary">
                        {demandes.filter((d) => d.canDecide).length}{' '}
                        <span className="text-base font-bold text-gray-500">dossier(s)</span>
                    </p>
                    <p className="text-[11px] text-gray-500 mt-1">
                        Nécessite attribution des codes budgétaires
                    </p>
                </div>

                <div className="bg-white border border-outline-soft rounded-lg p-5 shadow-card hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                            Validées (Transmises Finances)
                        </span>
                        <div className="w-8 h-8 rounded-md bg-success-soft flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4 text-success" />
                        </div>
                    </div>
                    <p className="text-2xl font-black text-success">
                        {demandes.filter((d) => d.statut === 'valide_mp').length}{' '}
                        <span className="text-base font-bold text-gray-500">dossier(s)</span>
                    </p>
                    <p className="text-[11px] text-gray-500 mt-1">Signées électroniquement</p>
                </div>

                <div className="bg-white border border-outline-soft rounded-lg p-5 shadow-card hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                            À corriger (Renvoyées Finance)
                        </span>
                        <div className="w-8 h-8 rounded-md bg-error-soft flex items-center justify-center">
                            <AlertCircle className="w-4 h-4 text-error" />
                        </div>
                    </div>
                    <p className="text-2xl font-black text-error">
                        {demandes.filter((d) => d.needsCorrection).length}{' '}
                        <span className="text-base font-bold text-gray-500">dossier(s)</span>
                    </p>
                    <p className="text-[11px] text-gray-500 mt-1">
                        Nécessite correction par le MP
                    </p>
                </div>
            </div>

            {/* Tableau */}
            <div className="bg-white border border-outline-soft rounded-lg shadow-card overflow-hidden">
                <div className="p-4 border-b border-outline-soft flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <h2 className="text-xs font-bold text-on-surface uppercase tracking-wider">
                            Demandes de l'Équipe du Projet ({user.project?.name})
                        </h2>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                            Consultez et validez les réquisitions soumises par votre équipe.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                        <Filter className="w-3.5 h-3.5 text-gray-400" />
                        <select
                            value={filterStatut}
                            onChange={(e) => setFilterStatut(e.target.value)}
                            className="border border-outline-variant rounded-md px-2.5 py-1.5 text-xs bg-white text-gray-700 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
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
                            <tr className="bg-sidebar text-white uppercase text-[10px] font-bold tracking-wider">
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
                        <tbody className="divide-y divide-outline-soft text-gray-700">
                            {demandesFiltrees.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="py-12 text-center">
                                        <FileText
                                            className="w-10 h-10 mx-auto text-gray-300 mb-2"
                                            strokeWidth={1.5}
                                        />
                                        <p className="text-gray-500 font-medium text-sm">
                                            Aucune réquisition à afficher
                                        </p>
                                        <p className="text-gray-400 text-[11px] mt-1">
                                            Modifiez vos filtres ou attendez une nouvelle demande.
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                demandesFiltrees.map((req) => (
                                    <tr
                                        key={req.id}
                                        className="hover:bg-primary-soft/40 transition-colors"
                                    >
                                        <td className="py-3.5 px-4 font-mono font-bold text-primary whitespace-nowrap">
                                            {req.numero}
                                        </td>
                                        <td className="py-3.5 px-4 whitespace-nowrap text-gray-600">
                                            {req.dateSoumission}
                                        </td>
                                        <td className="py-3.5 px-4 whitespace-nowrap">
                                            <p className="font-semibold text-on-surface">
                                                {req.initiateurNom}
                                            </p>
                                            <p className="text-[10px] text-gray-400">
                                                {req.initiateurRole}
                                            </p>
                                        </td>
                                        <td className="py-3.5 px-4 whitespace-nowrap">
                                            <span
                                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                    req.nature === 'Achat'
                                                        ? 'bg-primary-soft text-primary'
                                                        : 'bg-tertiary-soft text-tertiary'
                                                }`}
                                            >
                                                {req.nature}
                                            </span>
                                        </td>
                                        <td
                                            className="py-3.5 px-4 max-w-xs truncate"
                                            title={req.observation}
                                        >
                                            {req.observation || 'Sans observation'}
                                        </td>
                                        <td className="py-3.5 px-4 text-right font-mono font-bold text-sm text-on-surface whitespace-nowrap">
                                            {req.montantTotal.toLocaleString()} {req.devise}
                                        </td>
                                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                            {req.is_urgent ? (
                                                <span className="bg-error-soft text-error-dark px-2 py-0.5 rounded font-black text-[9px] uppercase">
                                                    URGENT
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 text-[10px]">
                                                    Normal
                                                </span>
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
                                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-primary text-primary rounded-md font-semibold text-xs hover:bg-primary-soft transition"
                                                    >
                                                        <Pencil className="w-3 h-3" />
                                                        Corriger
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => handleOuvrirArbitrage(req)}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary hover:bg-primary-light text-white rounded-md font-semibold text-xs transition"
                                                >
                                                    {req.canDecide ? (
                                                        <>
                                                            <ShieldCheck className="w-3 h-3" />
                                                            Viser
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Eye className="w-3 h-3" />
                                                            Consulter
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

            {/* ============ MODALE CORRECTION ============ */}
            {editingReq && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <form
                        onSubmit={handleSaveEdit}
                        className="w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-white border border-outline-soft shadow-modal rounded-lg animate-slide-down"
                    >
                        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 p-5 border-b border-outline-soft bg-white rounded-t-lg">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-lg bg-tertiary-soft flex items-center justify-center shrink-0">
                                    <Pencil className="w-5 h-5 text-tertiary" />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-tertiary">
                                        Correction Réquisition
                                    </p>
                                    <h2 className="text-lg font-bold text-on-surface">
                                        Dossier N° {editingReq.numero}
                                    </h2>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEditingReq(null)}
                                className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition"
                                aria-label="Fermer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </header>

                        <div className="p-5 space-y-4 text-xs">
                            {editError && (
                                <div className="border border-error/30 bg-error-soft p-3 text-error-dark rounded-md flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                    <span>{editError}</span>
                                </div>
                            )}
                            {editingReq.financeReturned && (
                                <div className="border-l-4 border-error bg-error-soft p-3 text-error-dark rounded-r-md">
                                    <strong className="block mb-1">
                                        Motif renvoyé par la Finance :
                                    </strong>
                                    <p className="mt-1 whitespace-pre-line text-[11px]">
                                        {editingReq.observation}
                                    </p>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">
                                        Nature
                                    </label>
                                    <select
                                        value={editingReq.nature}
                                        onChange={(e) =>
                                            setEditingReq({
                                                ...editingReq,
                                                nature: e.target.value as any,
                                            })
                                        }
                                        className="w-full border border-outline-variant rounded-md p-2 text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                                    >
                                        <option value="Achat">Achat</option>
                                        <option value="Service">Service</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">
                                        Caisse
                                    </label>
                                    <select
                                        value={editingReq.caisseSouhaitee}
                                        onChange={(e) =>
                                            setEditingReq({
                                                ...editingReq,
                                                caisseSouhaitee: e.target.value,
                                            })
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
                                        value={editingReq.devise}
                                        onChange={(e) =>
                                            setEditingReq({
                                                ...editingReq,
                                                devise: e.target.value as any,
                                            })
                                        }
                                        className="w-full border border-outline-variant rounded-md p-2 text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                                    >
                                        <option value="USD">USD</option>
                                        <option value="FC">FC</option>
                                        <option value="EUR">EUR</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">
                                    Observation
                                </label>
                                <textarea
                                    rows={2}
                                    value={editingReq.observation ?? ''}
                                    onChange={(e) =>
                                        setEditingReq({
                                            ...editingReq,
                                            observation: e.target.value,
                                        })
                                    }
                                    className="w-full border border-outline-variant rounded-md p-2 text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                                />
                            </div>

                            <div className="space-y-3">
                                <h3 className="font-bold text-gray-800 uppercase tracking-wider text-[11px]">
                                    Lignes de la demande
                                </h3>
                                {editingReq.lignes.map((line) => (
                                    <div
                                        key={line.id}
                                        className="border border-outline-soft p-3 rounded-md bg-surface-muted space-y-2"
                                    >
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block font-semibold text-gray-700 mb-1">
                                                    Désignation
                                                </label>
                                                <input
                                                    value={line.activite}
                                                    onChange={(e) =>
                                                        updateEditingLine(line.id, {
                                                            activite: e.target.value,
                                                        })
                                                    }
                                                    className="w-full border border-outline-variant rounded-md p-2 text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block font-semibold text-gray-700 mb-1">
                                                    Code Budget
                                                </label>
                                                <input
                                                    value={line.codeAllBudget}
                                                    onChange={(e) =>
                                                        updateEditingLine(line.id, {
                                                            codeAllBudget: e.target.value,
                                                        })
                                                    }
                                                    className="w-full border border-outline-variant rounded-md p-2 text-xs font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div>
                                                <label className="block font-semibold text-gray-700 mb-1">
                                                    Quantité / Durée
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0.01"
                                                    step="0.01"
                                                    value={line.quantiteOuDuree}
                                                    onChange={(e) =>
                                                        updateEditingLine(line.id, {
                                                            quantiteOuDuree: Number(
                                                                e.target.value,
                                                            ),
                                                        })
                                                    }
                                                    className="w-full border border-outline-variant rounded-md p-2 text-xs text-center focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block font-semibold text-gray-700 mb-1">
                                                    Prix Unitaire
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={line.frais}
                                                    onChange={(e) =>
                                                        updateEditingLine(line.id, {
                                                            frais: Number(e.target.value),
                                                        })
                                                    }
                                                    className="w-full border border-outline-variant rounded-md p-2 text-xs text-right font-bold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                                                    required
                                                />
                                            </div>
                                            <div className="flex flex-col justify-end text-right">
                                                <span className="text-[10px] text-gray-500">
                                                    Total Ligne :
                                                </span>
                                                <span className="font-mono font-bold text-sm text-primary">
                                                    {line.total.toLocaleString()}{' '}
                                                    {editingReq.devise}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <footer className="sticky bottom-0 flex justify-end gap-2 border-t border-outline-soft p-4 bg-white rounded-b-lg">
                            <button
                                type="button"
                                onClick={() => setEditingReq(null)}
                                className="px-3 py-2 border border-outline-variant rounded-md text-gray-700 text-xs hover:bg-gray-50 transition"
                            >
                                Annuler
                            </button>
                            <button
                                type="submit"
                                disabled={savingEdit}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-xs font-semibold rounded-md hover:bg-primary-light transition disabled:opacity-60"
                            >
                                {savingEdit && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                {savingEdit ? 'Enregistrement…' : 'Enregistrer les corrections'}
                            </button>
                        </footer>
                    </form>
                </div>
            )}

            {/* ============ MODALE ARBITRAGE ============ */}
            {selectedReq && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-lg border border-outline-soft shadow-modal max-w-3xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto animate-slide-down">
                        <div className="flex items-start justify-between border-b border-outline-soft pb-3">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-lg bg-primary-soft flex items-center justify-center shrink-0">
                                    <ShieldCheck className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">
                                        Contrôle Opérationnel & Attribution Budgétaire
                                    </span>
                                    <h2 className="text-base font-bold text-on-surface">
                                        Réquisition N° {selectedReq.numero}{' '}
                                        <span className="text-xs font-normal text-gray-500">
                                            ({selectedReq.nature})
                                        </span>
                                    </h2>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Initiateur :{' '}
                                        <strong className="text-on-surface">
                                            {selectedReq.initiateurNom}
                                        </strong>{' '}
                                        • Date : {selectedReq.dateSoumission}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedReq(null)}
                                className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition"
                                aria-label="Fermer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {selectedReq.observation && (
                            <div className="p-3 bg-surface-muted border border-outline-soft rounded-md text-xs text-gray-700">
                                <strong className="text-on-surface">
                                    Observation de l'initiateur :
                                </strong>{' '}
                                {selectedReq.observation}
                            </div>
                        )}

                        {/* Tableau lignes */}
                        <div>
                            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                                Articles, Prestations & Devis Attachés
                            </h3>
                            <table className="w-full text-left text-xs border border-outline-soft rounded-md overflow-hidden">
                                <thead className="bg-surface-muted font-bold text-gray-600">
                                    <tr>
                                        <th className="p-2">Désignation</th>
                                        <th className="p-2 text-primary">
                                            Code Allocation Budgétaire
                                        </th>
                                        <th className="p-2 text-center">
                                            {selectedReq.nature === 'Achat' ? 'Qté' : 'Durée'}
                                        </th>
                                        <th className="p-2 text-right">Prix Unitaire</th>
                                        <th className="p-2 text-right">Total</th>
                                        <th className="p-2">Devis / Pièces</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-outline-soft text-gray-700">
                                    {selectedReq.lignes.map((ligne) => (
                                        <tr key={ligne.id}>
                                            <td className="p-2 font-medium">{ligne.activite}</td>
                                            <td className="p-2">
                                                {selectedReq.canDecide ? (
                                                    <input
                                                        type="text"
                                                        placeholder="ex : 6012 / 2.1.04"
                                                        value={allocations[ligne.id] || ''}
                                                        onChange={(e) =>
                                                            setAllocations({
                                                                ...allocations,
                                                                [ligne.id]: e.target.value,
                                                            })
                                                        }
                                                        className="w-32 border border-primary rounded-md p-1.5 text-xs font-mono font-bold text-primary bg-primary-soft/30 focus:outline-none focus:ring-1 focus:ring-primary/30 transition"
                                                        required
                                                    />
                                                ) : (
                                                    <span className="font-mono font-bold text-primary">
                                                        {ligne.code_allocation ||
                                                            ligne.codeAllBudget}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-2 text-center">
                                                {ligne.quantiteOuDuree} {ligne.unite}
                                            </td>
                                            <td className="p-2 text-right">
                                                {ligne.frais.toLocaleString()}{' '}
                                                {selectedReq.devise}
                                            </td>
                                            <td className="p-2 text-right font-bold">
                                                {ligne.total.toLocaleString()}{' '}
                                                {selectedReq.devise}
                                            </td>
                                            <td className="p-2">
                                                {ligne.justif && ligne.justif.length > 0 ? (
                                                    <div className="space-y-1">
                                                        {ligne.justif.map((j) => (
                                                            <div
                                                                key={j.id}
                                                                className="bg-primary-soft text-primary px-2 py-1 rounded-md text-[10px] flex items-center justify-between gap-1"
                                                            >
                                                                <span
                                                                    className="truncate max-w-[120px] flex items-center gap-1"
                                                                    title={j.description}
                                                                >
                                                                    <Paperclip className="w-2.5 h-2.5 shrink-0" />
                                                                    {j.scan}
                                                                </span>
                                                                {j.fileUrl && (
                                                                    <a
                                                                        href={j.fileUrl}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="inline-flex items-center gap-0.5 font-bold hover:underline"
                                                                    >
                                                                        <Download className="w-2.5 h-2.5" />
                                                                        Voir
                                                                    </a>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 italic text-[10px]">
                                                        Aucun devis
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-surface-muted font-bold border-t border-outline-soft">
                                    <tr>
                                        <td colSpan={4} className="p-2 text-right">
                                            Montant Total Général :
                                        </td>
                                        <td className="p-2 text-right text-primary text-sm font-mono">
                                            {selectedReq.montantTotal.toLocaleString()}{' '}
                                            {selectedReq.devise}
                                        </td>
                                        <td />
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Zone arbitrage */}
                        {selectedReq.canDecide && (
                            <div className="border-t border-outline-soft pt-4 space-y-4">
                                {!modeRejet ? (
                                    <>
                                        <div className="bg-primary-soft/60 p-3 rounded-md border border-primary/20 space-y-2">
                                            <label className="block text-xs font-bold text-primary uppercase tracking-wider">
                                                Attribution Officielle de la Caisse
                                            </label>
                                            <select
                                                value={caisseChoisie}
                                                onChange={(e) => setCaisseChoisie(e.target.value)}
                                                className="w-full border border-primary rounded-md p-2 text-xs font-semibold text-on-surface bg-white focus:outline-none focus:ring-1 focus:ring-primary/30 transition"
                                            >
                                                {CAISSES_DISPONIBLES.map((c) => (
                                                    <option key={c} value={c}>
                                                        {c}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                                            <button
                                                type="button"
                                                onClick={() => setModeRejet(true)}
                                                className="inline-flex items-center gap-1.5 px-3 py-2 border border-error/40 text-error rounded-md text-xs font-semibold hover:bg-error-soft transition"
                                            >
                                                <Ban className="w-3.5 h-3.5" />
                                                Rejeter la demande
                                            </button>

                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedReq(null)}
                                                    className="px-3 py-2 border border-outline-variant rounded-md text-xs text-gray-600 hover:bg-gray-50 transition"
                                                >
                                                    Fermer
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleDeclencherApprobation}
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-success hover:bg-success-dark text-white rounded-md text-xs font-semibold shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
                                                >
                                                    <ShieldCheck className="w-4 h-4" />
                                                    Accorder Visa MP
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="bg-error-soft p-4 rounded-md border border-error/20 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <h4 className="text-xs font-bold text-error-dark uppercase flex items-center gap-1.5">
                                                <AlertCircle className="w-3.5 h-3.5" />
                                                Motif du Rejet (obligatoire)
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
                                            placeholder="Indiquez clairement le motif du refus…"
                                            className="w-full border border-error/30 rounded-md p-2 text-xs focus:outline-none focus:border-error focus:ring-1 focus:ring-error/20 bg-white transition"
                                            required
                                        />
                                        <div className="flex justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={handleRejeter}
                                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-error hover:bg-error-dark text-white rounded-md text-xs font-semibold shadow-sm transition"
                                            >
                                                <Ban className="w-3.5 h-3.5" />
                                                Confirmer le Rejet
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {!selectedReq.canDecide && (
                            <div className="border-t border-outline-soft pt-3 flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => setSelectedReq(null)}
                                    className="px-4 py-2 bg-sidebar text-white rounded-md text-xs font-semibold hover:bg-primary transition"
                                >
                                    Fermer
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ============ MODALE SIGNATURE ÉLECTRONIQUE ============ */}
            {passwordModalOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-lg border-2 border-primary shadow-modal max-w-sm w-full p-6 space-y-4 animate-slide-down">
                        <div className="text-center border-b border-outline-soft pb-3">
                            <div className="w-12 h-12 mx-auto rounded-full bg-primary-soft flex items-center justify-center mb-2">
                                <Lock className="w-5 h-5 text-primary" />
                            </div>
                            <h3 className="text-sm font-black uppercase text-on-surface tracking-wider">
                                Signature Électronique
                            </h3>
                            <p className="text-[11px] text-gray-500 mt-1">
                                Signataire :{' '}
                                <strong className="text-on-surface">{user.name}</strong> (Manager
                                de Projet)
                            </p>
                        </div>

                        <form
                            onSubmit={handleConfirmerSignatureAvecMotDePasse}
                            className="space-y-3"
                        >
                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 mb-1.5">
                                    Saisissez votre mot de passe pour signer :
                                </label>
                                <div className="relative">
                                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        value={passwordSaisi}
                                        onChange={(e) => setPasswordSaisi(e.target.value)}
                                        className="w-full border border-outline-variant rounded-md p-2.5 pl-9 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                                        autoFocus
                                        required
                                    />
                                </div>
                            </div>

                            <p className="text-[10px] text-gray-400 leading-relaxed flex items-start gap-1.5">
                                <ShieldCheck className="w-3 h-3 shrink-0 mt-0.5" />
                                Un code unique infalsifiable et un QR code d'audit seront générés
                                et rattachés à cette réquisition.
                            </p>

                            <div className="flex justify-end gap-2 pt-2 border-t border-outline-soft">
                                <button
                                    type="button"
                                    onClick={() => setPasswordModalOpen(false)}
                                    className="px-3 py-2 border border-outline-variant rounded-md text-xs text-gray-600 hover:bg-gray-50 transition"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={signingLoading}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-success hover:bg-success-dark text-white font-semibold text-xs rounded-md shadow-sm transition disabled:opacity-50"
                                >
                                    {signingLoading ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            Signature…
                                        </>
                                    ) : (
                                        <>
                                            <ShieldCheck className="w-3.5 h-3.5" />
                                            Signer & Valider
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}