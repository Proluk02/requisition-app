import { useState, useMemo, useEffect } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { PageProps } from '@/types';
import BudgetCodeCombobox, { BudgetLineItem } from '@/Components/BudgetCodeCombobox';
import RequisitionCorrectionForm, { type RequisitionCorrectionData } from '@/Components/RequisitionCorrectionForm';
import {
    Wallet,
    ShieldCheck,
    AlertCircle,
    CheckCircle2,
    Clock,
    FileText,
    X,
    Paperclip,
    Download,
    Ban,
    Lock,
    KeyRound,
    Loader2,
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

interface Props extends PageProps {
    scopeLabel?: string;
    requisitions?: FinanceRequisition[];
    projects?: ProjectItem[];
    usersList?: UserItem[];
    caisses?: CaisseSummaryItem[];
    allBudgetLines?: BudgetLineItem[];
}

const money = (amount: number, currency: string) =>
    `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${currency}`;

export default function FinanceDashboard({
    requisitions: initialRequisitions = [],
    projects = [],
    caisses = [],
    allBudgetLines = [],
}: Props) {
    const { auth } = usePage<PageProps>().props;
    const user = auth.user;

    const [requisitions, setRequisitions] = useState<FinanceRequisition[]>(initialRequisitions);

    const [selectedProject, setSelectedProject] = useState<string>('all');
    const [selectedCaisse, setSelectedCaisse] = useState<string>('all');
    const [selectedNature, setSelectedNature] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState('all');

    // Réquisition en cours d'examen
    const [selected, setSelected] = useState<FinanceRequisition | null>(null);

    // État d'édition complet pour le Manager Finance
    const [editCaisse, setEditCaisse] = useState<string>('');
    const [editLignes, setEditLignes] = useState<{
        id: string;
        activite: string;
        code_allocation: string;
        quantiteOuDuree: number;
        prixUnitaire: number;
        unite: string;
        total: number;
        justificatifs: FinanceJustificatif[];
    }[]>([]);

    const [correcting, setCorrecting] = useState<RequisitionCorrectionData | null>(null);
    const [rejecting, setRejecting] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');

    const [pinModalOpen, setPinModalOpen] = useState(false);
    const [pinSaisi, setPinSaisi] = useState('');
    const [pinError, setPinError] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);

    const [toast, setToast] = useState<{
        type: 'success' | 'error';
        message: string;
    } | null>(null);

    const showToast = (type: 'success' | 'error', message: string) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 5000);
    };

    // Lignes budgétaires du projet de la réquisition sélectionnée
    const currentProjectBudgetLines = useMemo(() => {
        if (!selected) return allBudgetLines;
        if (!selected.project_id) return allBudgetLines;
        const projectSpecific = allBudgetLines.filter((b) => b.project_id === selected.project_id);
        return projectSpecific.length > 0 ? projectSpecific : allBudgetLines;
    }, [allBudgetLines, selected]);

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

    // Initialisation des données éditables dès l'ouverture de l'examen par le MF
    const handleOpenExamen = (item: FinanceRequisition) => {
        setSelected(item);
        setEditCaisse(item.caisseAttribuee || 'Caisse principale');
        setRejecting(false);
        setRejectionReason('');
        setEditLignes(
            item.lignes.map((l) => ({
                id: l.id,
                activite: l.activite,
                code_allocation: l.codeAllocation || l.codeBudget || '',
                quantiteOuDuree: l.quantiteOuDuree,
                prixUnitaire: l.prixUnitaire,
                unite: l.unite,
                total: l.total,
                justificatifs: l.justificatifs,
            }))
        );
    };

    const updateEditLigne = (id: string, field: string, val: any) => {
        setEditLignes((prev) =>
            prev.map((ligne) => {
                if (ligne.id !== id) return ligne;
                const updated = { ...ligne, [field]: val };
                if (field === 'quantiteOuDuree' || field === 'prixUnitaire') {
                    updated.total = roundTwo((Number(updated.quantiteOuDuree) || 0) * (Number(updated.prixUnitaire) || 0));
                }
                return updated;
            })
        );
    };

    function roundTwo(num: number) {
        return Math.round((num + Number.EPSILON) * 100) / 100;
    }

    const editTotalRequisition = useMemo(() => {
        return editLignes.reduce((sum, l) => sum + (Number(l.total) || 0), 0);
    }, [editLignes]);

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

        // Transmission de la validation avec les corrections apportées par le MF
        router.patch(
            route('requisitions.finance-decision', selected.id),
            {
                decision: 'approve',
                pin: pinSaisi.trim(),
                password: pinSaisi.trim(),
                caisse_decaissement: editCaisse,
                articles: editLignes.map((l) => ({
                    id: l.id,
                    activite: l.activite,
                    code_allocation: l.code_allocation.trim(),
                    quantiteOuDuree: l.quantiteOuDuree,
                    prixUnitaire: l.prixUnitaire,
                })),
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
                                    statusCode: 'controle_finance',
                                    statusLabel: 'Validée par Finance',
                                    canDecide: false,
                                    montantTotal: editTotalRequisition,
                                    caisseAttribuee: editCaisse,
                                };
                            }
                            return item;
                        })
                    );

                    showToast(
                        'success',
                        `Visa Financier certifié apposé sur ${selected.numero}. Dossier transmis au PAM.`
                    );
                },
                onError: (errors) => {
                    setPinError((errors as any).pin || (errors as any).password || 'Code PIN financier incorrect.');
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
                password: 'skip',
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

                    showToast('error', `Réquisition ${selected.numero} renvoyée au Chef de Projet pour correction budgétaire.`);
                },
                onError: (errors) => {
                    showToast('error', (errors as any).motif_rejet || 'Erreur lors du renvoi.');
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
                            Financier : <strong className="text-[#0B192C]">{user.name}</strong> • Contrôle d'imputation en direct, plein pouvoir de correction budgétaire et visas certifiés.
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

                {/* Synthèse des caisses physiques */}
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

                {/* Tableau principal des réquisitions */}
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
                                                        className="mr-2 rounded border border-amber-600 px-3 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-50"
                                                    >
                                                        Corriger
                                                    </button>
                                                )}
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

            {/* MODALE D'EXAMEN AVEC PLEIN POUVOIR DE MODIFICATION PAR LE MANAGER FINANCE */}
            {selected && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
                    <div className="w-full max-w-5xl max-h-[92vh] overflow-y-auto bg-white border border-[#B2BED6] shadow-2xl rounded p-6 space-y-5 animate-slide-down">
                        <header className="flex items-start justify-between border-b pb-3">
                            <div>
                                <span className="text-[10px] uppercase font-bold text-[#F58F20] tracking-wider">
                                    Contrôle Budgétaire & Visa Financier (Plein pouvoir de correction)
                                </span>
                                <h2 className="text-base font-bold text-[#0B192C]">
                                    Réquisition N° {selected.numero} ({selected.nature})
                                </h2>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Demandeur : <strong className="text-gray-900">{selected.initiateurNom}</strong> • Projet : {selected.projet}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelected(null)}
                                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </header>

                        {/* Modification de la Caisse attribuée */}
                        {selected.canDecide && (
                            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                <label className="font-bold text-[#04326D] uppercase text-[11px] flex items-center gap-1.5">
                                    <Building2 className="w-4 h-4" />
                                    <span>Caisse de Décaissement Attribuée :</span>
                                </label>
                                <select
                                    value={editCaisse}
                                    onChange={(e) => setEditCaisse(e.target.value)}
                                    className="border border-[#B2BED6] rounded px-3 py-1.5 font-bold text-[#0B192C] bg-white focus:outline-none focus:border-[#04326D] text-xs"
                                >
                                    {caisses.map((c) => (
                                        <option key={c.id} value={c.name}>
                                            {c.name} ({c.devise})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Tableau des Lignes Budgétaires Entièrement Éditables par le Financier */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                                    Articles & Contrôle des Imputations (Saisie prédictive et correction des prix)
                                </h3>
                                <span className="text-[11px] text-gray-500">
                                    {currentProjectBudgetLines.length} ligne(s) budgétaire(s) disponible(s) dans ce projet
                                </span>
                            </div>

                            <div className="border border-gray-200 rounded overflow-hidden">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead className="bg-[#0B192C] text-white font-bold text-[10px] uppercase tracking-wider">
                                        <tr>
                                            <th className="p-2.5 w-1/4">Désignation</th>
                                            <th className="p-2.5 w-1/3">Imputation Budgétaire (Taper le code)</th>
                                            <th className="p-2.5 w-20 text-center">Qté</th>
                                            <th className="p-2.5 w-24 text-right">P.U. ({selected.devise})</th>
                                            <th className="p-2.5 w-28 text-right">Total Ligne</th>
                                            <th className="p-2.5 w-24">Pièces</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 text-gray-700">
                                        {editLignes.map((line) => (
                                            <tr key={line.id} className="hover:bg-gray-50">
                                                <td className="p-2">
                                                    {selected.canDecide ? (
                                                        <input
                                                            type="text"
                                                            value={line.activite}
                                                            onChange={(e) => updateEditLigne(line.id, 'activite', e.target.value)}
                                                            className="w-full border rounded p-1.5 text-xs font-medium"
                                                        />
                                                    ) : (
                                                        <span className="font-medium">{line.activite}</span>
                                                    )}
                                                </td>

                                                {/* Composant prédictif avec recherche en direct et affichage du solde */}
                                                <td className="p-2">
                                                    {selected.canDecide ? (
                                                        <BudgetCodeCombobox
                                                            value={line.code_allocation}
                                                            onChange={(code) => updateEditLigne(line.id, 'code_allocation', code)}
                                                            budgetLines={currentProjectBudgetLines}
                                                            montantLigne={line.total}
                                                            deviseRequisition={selected.devise}
                                                            placeholder="Taper 1.1, 6.112..."
                                                            required
                                                        />
                                                    ) : (
                                                        <span className="font-mono font-bold text-[#04326D]">
                                                            {line.code_allocation || 'Non attribué'}
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="p-2 text-center">
                                                    {selected.canDecide ? (
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            value={line.quantiteOuDuree}
                                                            onChange={(e) => updateEditLigne(line.id, 'quantiteOuDuree', e.target.value)}
                                                            className="w-16 border rounded p-1.5 text-xs text-center font-bold"
                                                        />
                                                    ) : (
                                                        <span>{line.quantiteOuDuree} {line.unite}</span>
                                                    )}
                                                </td>

                                                <td className="p-2 text-right">
                                                    {selected.canDecide ? (
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            value={line.prixUnitaire}
                                                            onChange={(e) => updateEditLigne(line.id, 'prixUnitaire', e.target.value)}
                                                            className="w-24 border rounded p-1.5 text-xs text-right font-mono font-bold"
                                                        />
                                                    ) : (
                                                        <span className="font-mono">{money(line.prixUnitaire, selected.devise)}</span>
                                                    )}
                                                </td>

                                                <td className="p-2 text-right font-mono font-bold text-sm text-[#0B192C]">
                                                    {money(line.total, selected.devise)}
                                                </td>

                                                <td className="p-2">
                                                    {line.justificatifs && line.justificatifs.length > 0 ? (
                                                        <div className="space-y-1">
                                                            {line.justificatifs.map((f) => (
                                                                <div key={f.id} className="text-[10px] bg-blue-50 text-[#04326D] px-1.5 py-0.5 rounded flex items-center justify-between">
                                                                    <span className="truncate max-w-[80px]">{f.nom}</span>
                                                                    {f.fileUrl && (
                                                                        <a href={f.fileUrl} target="_blank" rel="noreferrer" className="underline font-bold">
                                                                            Voir
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400 italic text-[10px]">Aucun</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-gray-100 font-bold border-t">
                                        <tr>
                                            <td colSpan={4} className="p-2.5 text-right uppercase">
                                                Montant Total Ajusté :
                                            </td>
                                            <td className="p-2.5 text-right font-mono text-sm text-[#0B192C]">
                                                {money(editTotalRequisition, selected.devise)}
                                            </td>
                                            <td />
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
                                                onClick={() => setSelected(null)}
                                                className="px-3.5 py-2 border rounded text-xs font-semibold text-gray-600 hover:bg-gray-50"
                                            >
                                                Fermer
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleTriggerApprove}
                                                className="px-4 py-2 bg-[#10B981] hover:bg-[#059669] text-white rounded text-xs font-bold shadow transition"
                                            >
                                                Accorder Visa Financier (PIN)
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
                                            placeholder="Précisez le problème budgétaire constaté..."
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

            {/* MODALE SIGNATURE PAR CODE PIN FINANCIER */}
            {pinModalOpen && selected && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 animate-fade-in">
                    <div className="bg-white rounded border-2 border-[#04326D] shadow-2xl max-w-sm w-full p-6 space-y-4 animate-slide-down">
                        <div className="text-center border-b pb-3">
                            <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 flex items-center justify-center mb-2">
                                <Lock className="w-5 h-5 text-[#04326D]" />
                            </div>
                            <h3 className="text-sm font-bold uppercase text-[#0B192C] tracking-wide">
                                Signature du Visa Financier
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
                                    Code PIN personnel du Manager Finance *
                                </label>
                                <div className="relative">
                                    <KeyRound className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    <input
                                        type="password"
                                        maxLength={6}
                                        placeholder="••••"
                                        value={pinSaisi}
                                        onChange={(e) => setPinSaisi(e.target.value)}
                                        className="w-full pl-8 pr-3 py-2 border border-[#B2BED6] rounded text-xs font-mono tracking-widest text-[#0B192C] focus:outline-none focus:border-[#04326D]"
                                        autoFocus
                                        required
                                    />
                                </div>
                            </div>

                            <p className="text-[10px] text-gray-400 leading-tight">
                                Les corrections et les imputations budgétaires validées seront enregistrées et transmises à l'Administration.
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
                                    className="px-4 py-1.5 bg-[#10B981] hover:bg-[#059669] text-white rounded text-xs font-bold shadow transition"
                                >
                                    {processing ? 'Validation...' : 'Signer & Valider'}
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
                        showToast('success', `Réquisition ${correcting.numero} corrigée et transmise.`);
                    }}
                />
            )}
        </AppLayout>
    );
}