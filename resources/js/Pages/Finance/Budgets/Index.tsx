import { useMemo, useState } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { PageProps } from '@/types';
import {
    PieChart,
    FileSpreadsheet,
    Plus,
    Search,
    Users,
    CheckCircle2,
    AlertCircle,
    AlertTriangle,
    X,
    Upload,
    Layers,
    Pencil,
    Trash2,
    CheckSquare,
    Square,
    MinusSquare,
    Loader2,
} from 'lucide-react';

interface ProjectOption {
    id: string;
    name: string;
    full_name: string;
}

interface DonorOption {
    id: string;
    name: string;
    code: string;
    description?: string | null;
}

interface DonorSummary {
    id: string;
    name: string;
    code: string;
    description?: string | null;
    lines_count: number;
    total_budget_usd: number;
    montant_engage_usd: number;
    montant_decaisse_usd: number;
    solde_usd: number;
    taux_consommation: number;
}

interface BudgetLineItem {
    id: string;
    code: string;
    category_code?: string | null;
    subcategory_code?: string | null;
    descript_code?: string | null;
    split_code?: string | null;
    libelle: string;
    devise: string;
    project_id: string;
    project_name: string;
    donor_id: string | null;
    donor_name: string;
    budget_initial: number;
    montant_engage: number;
    montant_decaisse: number;
    solde: number;
    taux_consommation: number;
}

interface StatsBudgets {
    totalInitialUSD: number;
    totalEngageUSD: number;
    totalDecaisseUSD: number;
    totalSoldeUSD: number;
    totalLinesCount: number;
}

interface Props extends PageProps {
    selectedProject: string;
    selectedDonor: string;
    search: string;
    projects: ProjectOption[];
    donors: DonorOption[];
    donorsSummary: DonorSummary[];
    budgetLines: BudgetLineItem[];
    stats: StatsBudgets;
}

type DeleteTarget =
    | { type: 'single_line'; line: BudgetLineItem }
    | { type: 'bulk_lines'; lines: BudgetLineItem[] }
    | { type: 'donor'; donor: DonorSummary };

const money = (n: number, currency = '$') =>
    `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${currency}`;

export default function BudgetIndex({
    selectedProject = 'all',
    selectedDonor = 'all',
    search: initialSearch = '',
    projects = [],
    donors = [],
    donorsSummary = [],
    budgetLines = [],
    stats,
}: Props) {
    const { flash } = usePage<PageProps>().props;

    const [activeTab, setActiveTab] = useState<'lignes' | 'donateurs'>('lignes');
    const [projectFilter, setProjectFilter] = useState(selectedProject);
    const [donorFilter, setDonorFilter] = useState(selectedDonor);
    const [search, setSearch] = useState(initialSearch);

    // Sélection multiple de lignes
    const [selectedLineIds, setSelectedLineIds] = useState<string[]>([]);

    // États des Modales
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [donorModalOpen, setDonorModalOpen] = useState(false);
    const [lineModalOpen, setLineModalOpen] = useState(false);

    // Modale moderne de confirmation de suppression
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // États d'édition
    const [editingLine, setEditingLine] = useState<BudgetLineItem | null>(null);
    const [editingDonor, setEditingDonor] = useState<DonorSummary | DonorOption | null>(null);

    // Formulaire Import
    const importForm = useForm<{
        project_id: string;
        file: File | null;
    }>({
        project_id: projects[0]?.id ?? '',
        file: null,
    });

    // Formulaire Donateur
    const donorForm = useForm({
        name: '',
        code: '',
        description: '',
    });

    // Formulaire Ligne Budgétaire
    const lineForm = useForm({
        project_id: projects[0]?.id ?? '',
        donor_id: '',
        category_code: '',
        subcategory_code: '',
        descript_code: '',
        split_code: '',
        code: '',
        libelle: '',
        devise: 'USD',
        budget_initial: '',
    });

    /* =========================================================================
     *  FILTRES
     * ========================================================================= */
    const handleApplyFilters = (p = projectFilter, d = donorFilter, s = search) => {
        router.get(
            route('finance.budgets.index'),
            { project_id: p, donor_id: d, search: s },
            { preserveState: true, preserveScroll: true }
        );
    };

    /* =========================================================================
     *  SÉLECTION MULTIPLE
     * ========================================================================= */
    const isAllSelected =
        budgetLines.length > 0 && selectedLineIds.length === budgetLines.length;
    const isSomeSelected =
        selectedLineIds.length > 0 && selectedLineIds.length < budgetLines.length;

    const handleToggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedLineIds([]);
        } else {
            setSelectedLineIds(budgetLines.map((l) => l.id));
        }
    };

    const handleToggleSelectLine = (id: string) => {
        setSelectedLineIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const selectedLinesObjects = useMemo(() => {
        return budgetLines.filter((l) => selectedLineIds.includes(l.id));
    }, [budgetLines, selectedLineIds]);

    /* =========================================================================
     *  OUVERTURE MODALE DE SUPPRESSION (MODERNE)
     * ========================================================================= */
    const triggerDeleteSingleLine = (line: BudgetLineItem) => {
        setDeleteTarget({ type: 'single_line', line });
        setDeleteModalOpen(true);
    };

    const triggerDeleteBulkLines = () => {
        if (selectedLinesObjects.length === 0) return;
        setDeleteTarget({ type: 'bulk_lines', lines: selectedLinesObjects });
        setDeleteModalOpen(true);
    };

    const triggerDeleteDonor = (donor: DonorSummary) => {
        setDeleteTarget({ type: 'donor', donor });
        setDeleteModalOpen(true);
    };

    const handleConfirmDelete = () => {
        if (!deleteTarget) return;

        setIsDeleting(true);

        if (deleteTarget.type === 'single_line') {
            router.delete(
                route('finance.budgets.lines.destroy', { budgetLine: deleteTarget.line.id }),
                {
                    preserveScroll: true,
                    onFinish: () => {
                        setIsDeleting(false);
                        setDeleteModalOpen(false);
                        setDeleteTarget(null);
                        setSelectedLineIds((prev) =>
                            prev.filter((id) => id !== deleteTarget.line.id)
                        );
                    },
                }
            );
        } else if (deleteTarget.type === 'bulk_lines') {
            // Suppression groupée : boucle sécurisée sur les lignes supprimables
            const deletableLines = deleteTarget.lines.filter(
                (l) => l.montant_engage === 0 && l.montant_decaisse === 0
            );

            if (deletableLines.length === 0) {
                setIsDeleting(false);
                setDeleteModalOpen(false);
                return;
            }

            // Envoi des suppressions
            let completed = 0;
            deletableLines.forEach((l) => {
                router.delete(
                    route('finance.budgets.lines.destroy', { budgetLine: l.id }),
                    {
                        preserveScroll: true,
                        onFinish: () => {
                            completed++;
                            if (completed === deletableLines.length) {
                                setIsDeleting(false);
                                setDeleteModalOpen(false);
                                setDeleteTarget(null);
                                setSelectedLineIds([]);
                            }
                        },
                    }
                );
            });
        } else if (deleteTarget.type === 'donor') {
            router.delete(
                route('finance.donors.destroy', { donor: deleteTarget.donor.id }),
                {
                    preserveScroll: true,
                    onFinish: () => {
                        setIsDeleting(false);
                        setDeleteModalOpen(false);
                        setDeleteTarget(null);
                    },
                }
            );
        }
    };

    /* =========================================================================
     *  SOUMISSIONS FORMULAIRES
     * ========================================================================= */
    const handleImportSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        importForm.post(route('finance.budgets.import'), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setImportModalOpen(false);
                importForm.reset('file');
            },
        });
    };

    const openCreateDonorModal = () => {
        setEditingDonor(null);
        donorForm.reset();
        donorForm.clearErrors();
        setDonorModalOpen(true);
    };

    const openEditDonorModal = (donor: DonorSummary | DonorOption) => {
        setEditingDonor(donor);
        donorForm.clearErrors();
        donorForm.setData({
            name: donor.name,
            code: donor.code,
            description: donor.description ?? '',
        });
        setDonorModalOpen(true);
    };

    const handleDonorSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingDonor) {
            donorForm.put(route('finance.donors.update', { donor: editingDonor.id }), {
                preserveScroll: true,
                onSuccess: () => {
                    setDonorModalOpen(false);
                    donorForm.reset();
                    setEditingDonor(null);
                },
            });
        } else {
            donorForm.post(route('finance.donors.store'), {
                preserveScroll: true,
                onSuccess: () => {
                    setDonorModalOpen(false);
                    donorForm.reset();
                },
            });
        }
    };

    const openCreateLineModal = () => {
        setEditingLine(null);
        lineForm.reset();
        lineForm.clearErrors();
        lineForm.setData({
            project_id: projects[0]?.id ?? '',
            donor_id: '',
            category_code: '',
            subcategory_code: '',
            descript_code: '',
            split_code: '',
            code: '',
            libelle: '',
            devise: 'USD',
            budget_initial: '',
        });
        setLineModalOpen(true);
    };

    const openEditLineModal = (line: BudgetLineItem) => {
        setEditingLine(line);
        lineForm.clearErrors();
        lineForm.setData({
            project_id: line.project_id,
            donor_id: line.donor_id ?? '',
            category_code: line.category_code ?? '',
            subcategory_code: line.subcategory_code ?? '',
            descript_code: line.descript_code ?? '',
            split_code: line.split_code ?? '',
            code: line.code,
            libelle: line.libelle,
            devise: line.devise,
            budget_initial: line.budget_initial.toString(),
        });
        setLineModalOpen(true);
    };

    const handleLineSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingLine) {
            lineForm.put(route('finance.budgets.lines.update', { budgetLine: editingLine.id }), {
                preserveScroll: true,
                onSuccess: () => {
                    setLineModalOpen(false);
                    lineForm.reset();
                    setEditingLine(null);
                },
            });
        } else {
            lineForm.post(route('finance.budgets.lines.store'), {
                preserveScroll: true,
                onSuccess: () => {
                    setLineModalOpen(false);
                    lineForm.reset();
                },
            });
        }
    };

    const calculatedCodePreview = useMemo(() => {
        if (lineForm.data.code.trim()) return lineForm.data.code.trim();
        const parts = [
            lineForm.data.category_code,
            lineForm.data.subcategory_code,
            lineForm.data.descript_code,
            lineForm.data.split_code,
        ].filter((p) => p && p.trim() !== '');
        return parts.join('.');
    }, [
        lineForm.data.code,
        lineForm.data.category_code,
        lineForm.data.subcategory_code,
        lineForm.data.descript_code,
        lineForm.data.split_code,
    ]);

    return (
        <AppLayout>
            <Head title="Centre Budgétaire & Suivi Donateurs" />

            <div className="space-y-6">
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
                    <div>
                        <nav className="text-[10px] font-bold uppercase tracking-widest text-[#B2BED6] mb-1.5 flex items-center gap-1.5">
                            <PieChart className="w-3.5 h-3.5 text-[#04326D]" />
                            <span>Direction Financière</span>
                            <span className="mx-1">/</span>
                            <span className="text-[#04326D]">Centre Budgétaire</span>
                        </nav>
                        <h1 className="text-xl font-bold text-[#0B192C]">
                            Gestion des Budgets & Donateurs
                        </h1>
                        <p className="text-[12px] text-gray-500 mt-1">
                            Maquette budgétaire de référence, codification analytique stricte et suivi de consommation par bailleur de fonds.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={openCreateDonorModal}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-[#B2BED6] hover:bg-gray-50 text-[#0B192C] rounded font-bold text-xs shadow-sm transition"
                        >
                            <Users className="w-4 h-4 text-[#04326D]" />
                            <span>Nouveau Donateur</span>
                        </button>

                        <button
                            type="button"
                            onClick={openCreateLineModal}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-[#B2BED6] hover:bg-gray-50 text-[#0B192C] rounded font-bold text-xs shadow-sm transition"
                        >
                            <Plus className="w-4 h-4 text-[#04326D]" />
                            <span>Nouvelle Ligne</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setImportModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#04326D] hover:bg-[#06428f] text-white rounded font-bold text-xs shadow-sm transition"
                        >
                            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                            <span>Importer Budget Excel</span>
                        </button>
                    </div>
                </header>

                {/* Messages Flash */}
                {flash?.success && (
                    <div className="p-3.5 rounded bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                        <span>{flash.success}</span>
                    </div>
                )}
                {flash?.error && (
                    <div className="p-3.5 rounded bg-red-50 border border-red-300 text-red-900 text-xs font-semibold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-700 shrink-0" />
                        <span>{flash.error}</span>
                    </div>
                )}

                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-white p-4 rounded border border-[#B2BED6] shadow-sm flex flex-col justify-between">
                        <span className="text-[10.5px] font-bold uppercase tracking-wider text-gray-500">
                            Budget Alloué Total
                        </span>
                        <p className="text-2xl font-black text-[#0B192C] mt-2 font-mono tabular-nums">
                            {money(stats.totalInitialUSD, 'USD')}
                        </p>
                        <span className="text-[10px] text-gray-400 mt-1">
                            Sur {stats.totalLinesCount} ligne(s) budgétaire(s)
                        </span>
                    </div>

                    <div className="bg-white p-4 rounded border border-[#B2BED6] shadow-sm flex flex-col justify-between">
                        <span className="text-[10.5px] font-bold uppercase tracking-wider text-gray-500">
                            Montant Engagé (Visas)
                        </span>
                        <p className="text-2xl font-black text-[#F58F20] mt-2 font-mono tabular-nums">
                            {money(stats.totalEngageUSD, 'USD')}
                        </p>
                        <span className="text-[10px] text-gray-400 mt-1">
                            En circuit d'approbation
                        </span>
                    </div>

                    <div className="bg-white p-4 rounded border border-[#B2BED6] shadow-sm flex flex-col justify-between">
                        <span className="text-[10.5px] font-bold uppercase tracking-wider text-gray-500">
                            Montant Décaissé (Caisse)
                        </span>
                        <p className="text-2xl font-black text-emerald-700 mt-2 font-mono tabular-nums">
                            {money(stats.totalDecaisseUSD, 'USD')}
                        </p>
                        <span className="text-[10px] text-gray-400 mt-1">
                            Fonds remis au guichet
                        </span>
                    </div>

                    <div className="bg-[#0B192C] p-4 rounded text-white shadow-sm flex flex-col justify-between">
                        <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#B2BED6]">
                            Solde Budgétaire Disponible
                        </span>
                        <p className="text-2xl font-black text-white mt-2 font-mono tabular-nums">
                            {money(stats.totalSoldeUSD, 'USD')}
                        </p>
                        <span className="text-[10px] text-[#B2BED6] mt-1">
                            Reliquat net non engagé
                        </span>
                    </div>
                </div>

                {/* Barre d'action contextuelle pour sélection multiple */}
                {selectedLineIds.length > 0 && activeTab === 'lignes' && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between shadow-sm animate-fade-in">
                        <div className="flex items-center gap-2">
                            <CheckSquare className="w-4 h-4 text-[#04326D]" />
                            <span className="text-xs font-bold text-[#0B192C]">
                                {selectedLineIds.length} ligne{selectedLineIds.length > 1 ? 's' : ''} sélectionnée{selectedLineIds.length > 1 ? 's' : ''}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setSelectedLineIds([])}
                                className="px-2.5 py-1 text-xs text-gray-600 hover:text-gray-900 font-semibold"
                            >
                                Désélectionner
                            </button>
                            <button
                                type="button"
                                onClick={triggerDeleteBulkLines}
                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold shadow-sm transition"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Supprimer la sélection</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Section Table & Onglets */}
                <div className="bg-white border border-[#B2BED6] rounded shadow-sm overflow-hidden">
                    <div className="border-b border-[#E2E8F0] px-4 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setActiveTab('lignes')}
                                className={`inline-flex items-center gap-2 pb-3 px-3 border-b-2 text-xs font-bold uppercase tracking-wider transition ${
                                    activeTab === 'lignes'
                                        ? 'border-[#04326D] text-[#04326D]'
                                        : 'border-transparent text-gray-400 hover:text-gray-700'
                                }`}
                            >
                                <Layers className="w-3.5 h-3.5" />
                                <span>Lignes Budgétaires</span>
                                <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 text-[#04326D] font-bold">
                                    {budgetLines.length}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setActiveTab('donateurs')}
                                className={`inline-flex items-center gap-2 pb-3 px-3 border-b-2 text-xs font-bold uppercase tracking-wider transition ${
                                    activeTab === 'donateurs'
                                        ? 'border-[#04326D] text-[#04326D]'
                                        : 'border-transparent text-gray-400 hover:text-gray-700'
                                }`}
                            >
                                <Users className="w-3.5 h-3.5" />
                                <span>Suivi par Donateur</span>
                                <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                                    {donorsSummary.length}
                                </span>
                            </button>
                        </div>

                        {activeTab === 'lignes' && (
                            <div className="flex flex-wrap items-center gap-2 pb-2 sm:pb-0">
                                <select
                                    value={projectFilter}
                                    onChange={(e) => {
                                        setProjectFilter(e.target.value);
                                        handleApplyFilters(e.target.value, donorFilter, search);
                                    }}
                                    className="border border-[#B2BED6] rounded px-2.5 py-1 text-xs bg-white text-[#0B192C] font-semibold"
                                >
                                    <option value="all">Tous les projets</option>
                                    {projects.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name}
                                        </option>
                                    ))}
                                </select>

                                <select
                                    value={donorFilter}
                                    onChange={(e) => {
                                        setDonorFilter(e.target.value);
                                        handleApplyFilters(projectFilter, e.target.value, search);
                                    }}
                                    className="border border-[#B2BED6] rounded px-2.5 py-1 text-xs bg-white text-[#0B192C] font-semibold"
                                >
                                    <option value="all">Tous les donateurs</option>
                                    {donors.map((d) => (
                                        <option key={d.id} value={d.id}>
                                            {d.name}
                                        </option>
                                    ))}
                                </select>

                                <div className="relative">
                                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    <input
                                        type="text"
                                        placeholder="Code (ex: 1.1.3.a) ou libellé..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters(projectFilter, donorFilter, search)}
                                        className="pl-8 pr-3 py-1 border border-[#B2BED6] rounded text-xs focus:outline-none focus:border-[#04326D] w-52"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {activeTab === 'lignes' && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-[#0B192C] text-white uppercase text-[10px] font-bold tracking-wider">
                                        <th className="py-3 px-3 text-center w-10">
                                            <button
                                                type="button"
                                                onClick={handleToggleSelectAll}
                                                className="text-white hover:text-blue-300 transition"
                                                title={isAllSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
                                            >
                                                {isAllSelected ? (
                                                    <CheckSquare className="w-4 h-4" />
                                                ) : isSomeSelected ? (
                                                    <MinusSquare className="w-4 h-4 text-blue-300" />
                                                ) : (
                                                    <Square className="w-4 h-4 opacity-60" />
                                                )}
                                            </button>
                                        </th>
                                        <th className="py-3 px-4">Code Ligne</th>
                                        <th className="py-3 px-4">Libellé / Activité</th>
                                        <th className="py-3 px-4">Projet & Donateur</th>
                                        <th className="py-3 px-4 text-right">Budget Initial</th>
                                        <th className="py-3 px-4 text-right">Engagé</th>
                                        <th className="py-3 px-4 text-right">Décaissé</th>
                                        <th className="py-3 px-4 text-right">Solde Dispo</th>
                                        <th className="py-3 px-4 text-center">Taux Consommation</th>
                                        <th className="py-3 px-4 text-center w-20">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E2E8F0] text-gray-700">
                                    {budgetLines.length === 0 ? (
                                        <tr>
                                            <td colSpan={10} className="py-12 text-center text-gray-400 italic">
                                                Aucune ligne budgétaire trouvée. Cliquez sur « Importer Budget Excel » pour charger la maquette de référence.
                                            </td>
                                        </tr>
                                    ) : (
                                        budgetLines.map((line) => {
                                            const isSelected = selectedLineIds.includes(line.id);
                                            return (
                                                <tr
                                                    key={line.id}
                                                    className={`transition ${
                                                        isSelected
                                                            ? 'bg-blue-50/70 hover:bg-blue-50'
                                                            : 'hover:bg-[#F9F9FF]'
                                                    }`}
                                                >
                                                    <td className="py-3 px-3 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleToggleSelectLine(line.id)}
                                                            className="text-gray-500 hover:text-[#04326D] transition"
                                                        >
                                                            {isSelected ? (
                                                                <CheckSquare className="w-4 h-4 text-[#04326D]" />
                                                            ) : (
                                                                <Square className="w-4 h-4 text-gray-300" />
                                                            )}
                                                        </button>
                                                    </td>
                                                    <td className="py-3 px-4 font-mono font-bold text-[#04326D] whitespace-nowrap">
                                                        {line.code}
                                                    </td>
                                                    <td className="py-3 px-4 font-medium text-gray-800 max-w-xs truncate" title={line.libelle}>
                                                        {line.libelle}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <p className="font-bold text-[#0B192C] truncate">{line.project_name}</p>
                                                        <p className="text-[10px] text-gray-500 font-semibold">{line.donor_name}</p>
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-[#0B192C] whitespace-nowrap">
                                                        {money(line.budget_initial, line.devise)}
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[#F58F20] font-bold whitespace-nowrap">
                                                        {money(line.montant_engage, line.devise)}
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-700 font-bold whitespace-nowrap">
                                                        {money(line.montant_decaisse, line.devise)}
                                                    </td>
                                                    <td className="py-3 px-4 text-right font-mono tabular-nums font-bold whitespace-nowrap">
                                                        <span className={line.solde < 0 ? 'text-red-700 font-black' : 'text-[#0B192C]'}>
                                                            {money(line.solde, line.devise)}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-center whitespace-nowrap">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full ${
                                                                        line.taux_consommation > 90
                                                                            ? 'bg-red-600'
                                                                            : line.taux_consommation > 60
                                                                            ? 'bg-[#F58F20]'
                                                                            : 'bg-emerald-600'
                                                                    }`}
                                                                    style={{ width: `${Math.min(line.taux_consommation, 100)}%` }}
                                                                />
                                                            </div>
                                                            <span className="font-mono text-[10.5px] font-bold tabular-nums">
                                                                {line.taux_consommation}%
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 text-center whitespace-nowrap">
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            <button
                                                                type="button"
                                                                onClick={() => openEditLineModal(line)}
                                                                className="p-1 text-[#04326D] hover:bg-blue-100/60 rounded transition"
                                                                title="Modifier la ligne"
                                                            >
                                                                <Pencil className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => triggerDeleteSingleLine(line)}
                                                                className="p-1 text-red-600 hover:bg-red-100/60 rounded transition"
                                                                title="Supprimer la ligne"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
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
                    )}

                    {activeTab === 'donateurs' && (
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {donorsSummary.length === 0 ? (
                                <p className="col-span-full py-12 text-center text-gray-400 italic">
                                    Aucun bailleur de fonds configuré.
                                </p>
                            ) : (
                                donorsSummary.map((donor) => (
                                    <div
                                        key={donor.id}
                                        className="p-4 rounded border border-[#B2BED6] bg-[#F9F9FF] flex flex-col justify-between space-y-3"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <span className="text-[10px] font-mono font-bold uppercase text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                                                    {donor.code}
                                                </span>
                                                <h3 className="text-sm font-bold text-[#0B192C] mt-1">{donor.name}</h3>
                                                {donor.description && (
                                                    <p className="text-[11px] text-gray-500 italic mt-0.5 line-clamp-1">
                                                        {donor.description}
                                                    </p>
                                                )}
                                                <p className="text-[10.5px] text-gray-500 mt-1">{donor.lines_count} ligne(s) financée(s)</p>
                                            </div>

                                            <div className="flex flex-col items-end gap-1.5">
                                                <span className="text-xs font-mono font-bold text-gray-700">
                                                    {donor.taux_consommation}%
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => openEditDonorModal(donor)}
                                                        className="p-1 text-[#04326D] hover:bg-blue-100 rounded transition"
                                                        title="Modifier le donateur"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => triggerDeleteDonor(donor)}
                                                        className="p-1 text-red-600 hover:bg-red-100 rounded transition"
                                                        title="Supprimer le donateur"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5 text-xs">
                                            <div className="flex justify-between text-gray-600">
                                                <span>Budget Alloué :</span>
                                                <strong className="font-mono">{money(donor.total_budget_usd, '$')}</strong>
                                            </div>
                                            <div className="flex justify-between text-emerald-800">
                                                <span>Décaissé :</span>
                                                <strong className="font-mono">{money(donor.montant_decaisse_usd, '$')}</strong>
                                            </div>
                                            <div className="flex justify-between text-[#F58F20]">
                                                <span>Engagé :</span>
                                                <strong className="font-mono">{money(donor.montant_engage_usd, '$')}</strong>
                                            </div>
                                            <div className="flex justify-between border-t pt-1 font-bold text-[#0B192C]">
                                                <span>Solde :</span>
                                                <strong className="font-mono">{money(donor.solde_usd, '$')}</strong>
                                            </div>
                                        </div>

                                        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-emerald-600"
                                                style={{ width: `${Math.min(donor.taux_consommation, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* =========================================================================
             *  MODALE MODERNE DE SUPPRESSION (SINGLE & BULK)
             * ========================================================================= */}
            {deleteModalOpen && deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-scale-in">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-[#0B192C]">
                                    {deleteTarget.type === 'bulk_lines'
                                        ? 'Supprimer les lignes sélectionnées'
                                        : deleteTarget.type === 'donor'
                                        ? 'Supprimer le donateur'
                                        : 'Supprimer la ligne budgétaire'}
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Cette opération est irréversible.
                                </p>
                            </div>
                        </div>

                        {/* Corps informatif */}
                        {deleteTarget.type === 'single_line' && (
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-gray-500 font-semibold">Code :</span>
                                    <strong className="font-mono text-[#04326D]">{deleteTarget.line.code}</strong>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 font-semibold">Désignation :</span>
                                    <span className="text-gray-800 truncate max-w-[220px]">{deleteTarget.line.libelle}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 font-semibold">Budget Initial :</span>
                                    <strong className="font-mono">{money(deleteTarget.line.budget_initial, deleteTarget.line.devise)}</strong>
                                </div>
                            </div>
                        )}

                        {deleteTarget.type === 'bulk_lines' && (
                            <div className="space-y-2 text-xs">
                                <p className="text-gray-700">
                                    Vous vous apprêtez à supprimer <strong>{deleteTarget.lines.length}</strong> ligne(s) budgétaire(s).
                                </p>
                                <div className="max-h-32 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-lg space-y-1 font-mono text-[11px]">
                                    {deleteTarget.lines.map((l) => {
                                        const isLocked = l.montant_engage > 0 || l.montant_decaisse > 0;
                                        return (
                                            <div key={l.id} className="flex items-center justify-between">
                                                <span className={isLocked ? 'text-red-600 line-through' : 'text-[#04326D] font-bold'}>
                                                    {l.code}
                                                </span>
                                                {isLocked && (
                                                    <span className="text-[10px] text-red-600 font-sans italic">
                                                        (Engagé/décaissé - ignoré)
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {deleteTarget.type === 'donor' && (
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-gray-500 font-semibold">Bailleur :</span>
                                    <strong className="text-[#0B192C]">{deleteTarget.donor.name}</strong>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 font-semibold">Code :</span>
                                    <strong className="font-mono text-emerald-700">{deleteTarget.donor.code}</strong>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 font-semibold">Lignes associées :</span>
                                    <span>{deleteTarget.donor.lines_count}</span>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                            <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() => {
                                    setDeleteModalOpen(false);
                                    setDeleteTarget(null);
                                }}
                                className="px-3.5 py-1.5 border border-slate-300 rounded text-xs font-semibold text-gray-700 hover:bg-slate-50 transition"
                            >
                                Annuler
                            </button>
                            <button
                                type="button"
                                disabled={isDeleting}
                                onClick={handleConfirmDelete}
                                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded text-xs font-bold shadow-sm transition"
                            >
                                {isDeleting ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>Suppression...</span>
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Confirmer la suppression</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL IMPORT EXCEL */}
            {importModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
                    <div className="bg-white rounded border border-[#B2BED6] shadow-2xl max-w-md w-full p-6 space-y-4 animate-slide-down">
                        <header className="flex items-start justify-between border-b pb-3">
                            <div className="flex items-center gap-2">
                                <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
                                <h3 className="text-sm font-bold text-[#0B192C] uppercase tracking-wide">
                                    Importer le Budget de Référence
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setImportModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </header>

                        <form onSubmit={handleImportSubmit} className="space-y-3.5 text-xs">
                            <div>
                                <label className="block font-bold text-gray-700 mb-1">
                                    Projet de Rattachement *
                                </label>
                                <select
                                    value={importForm.data.project_id}
                                    onChange={(e) => importForm.setData('project_id', e.target.value)}
                                    className="w-full border border-[#B2BED6] rounded p-2 text-xs font-semibold focus:outline-none focus:border-[#04326D]"
                                    required
                                >
                                    {projects.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} ({p.full_name})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">
                                    Fichier Excel (.xlsx, .xls) ou CSV (.csv) *
                                </label>
                                <input
                                    type="file"
                                    accept=".xlsx,.xls,.csv"
                                    onChange={(e) => importForm.setData('file', e.target.files ? e.target.files[0] : null)}
                                    className="w-full border border-dashed border-[#B2BED6] rounded p-3 text-xs bg-gray-50 focus:outline-none"
                                    required
                                />
                                {importForm.errors.file && (
                                    <p className="text-[11px] text-red-600 mt-1">{importForm.errors.file}</p>
                                )}
                            </div>

                            <div className="p-3 bg-blue-50 border border-blue-200 rounded text-[11px] text-gray-700 leading-relaxed space-y-1">
                                <strong className="text-[#04326D] block">Format attendu :</strong>
                                <span>Colonnes obligatoires : CATEGORY, SUBCATEGORY, DESCRIPT, SPLIT, CODE, LIBELLE, DEVISE, BUDGET_INITIAL, DONATEUR.</span>
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t">
                                <button
                                    type="button"
                                    onClick={() => setImportModalOpen(false)}
                                    className="px-3.5 py-1.5 border border-[#B2BED6] rounded text-xs font-semibold text-gray-600 hover:bg-gray-50"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={importForm.processing}
                                    className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#04326D] hover:bg-[#06428f] disabled:opacity-50 text-white rounded text-xs font-bold shadow transition"
                                >
                                    <Upload className="w-4 h-4" />
                                    <span>{importForm.processing ? 'Importation en cours...' : 'Lancer l’importation'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL CRÉATION / MODIFICATION DONATEUR */}
            {donorModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
                    <div className="bg-white rounded border border-[#B2BED6] shadow-2xl max-w-sm w-full p-6 space-y-4 animate-slide-down">
                        <header className="flex items-start justify-between border-b pb-3">
                            <div className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-[#04326D]" />
                                <h3 className="text-sm font-bold text-[#0B192C] uppercase tracking-wide">
                                    {editingDonor ? 'Modifier le Donateur' : 'Nouveau Donateur'}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setDonorModalOpen(false);
                                    setEditingDonor(null);
                                }}
                                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </header>

                        <form onSubmit={handleDonorSubmit} className="space-y-3 text-xs">
                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Nom du Donateur *</label>
                                <input
                                    type="text"
                                    placeholder="ex: Union Européenne"
                                    value={donorForm.data.name}
                                    onChange={(e) => donorForm.setData('name', e.target.value)}
                                    className="w-full border border-[#B2BED6] rounded p-2 text-xs focus:outline-none focus:border-[#04326D]"
                                    required
                                />
                                {donorForm.errors.name && (
                                    <p className="text-[11px] text-red-600 mt-1">{donorForm.errors.name}</p>
                                )}
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Code Donateur *</label>
                                <input
                                    type="text"
                                    placeholder="ex: EU, MISEAN, BM"
                                    value={donorForm.data.code}
                                    onChange={(e) => donorForm.setData('code', e.target.value)}
                                    className="w-full border border-[#B2BED6] rounded p-2 text-xs font-mono uppercase focus:outline-none focus:border-[#04326D]"
                                    required
                                />
                                {donorForm.errors.code && (
                                    <p className="text-[11px] text-red-600 mt-1">{donorForm.errors.code}</p>
                                )}
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Description</label>
                                <textarea
                                    rows={2}
                                    placeholder="Convention de financement..."
                                    value={donorForm.data.description}
                                    onChange={(e) => donorForm.setData('description', e.target.value)}
                                    className="w-full border border-[#B2BED6] rounded p-2 text-xs focus:outline-none focus:border-[#04326D]"
                                />
                                {donorForm.errors.description && (
                                    <p className="text-[11px] text-red-600 mt-1">{donorForm.errors.description}</p>
                                )}
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setDonorModalOpen(false);
                                        setEditingDonor(null);
                                    }}
                                    className="px-3 py-1.5 border border-[#B2BED6] rounded text-xs font-semibold text-gray-600 hover:bg-gray-50"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={donorForm.processing}
                                    className="px-4 py-1.5 bg-[#04326D] text-white rounded text-xs font-bold shadow hover:bg-[#06428f]"
                                >
                                    {editingDonor ? 'Mettre à jour' : 'Enregistrer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL CRÉATION / MODIFICATION LIGNE BUDGÉTAIRE */}
            {lineModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
                    <div className="bg-white rounded border border-[#B2BED6] shadow-2xl max-w-lg w-full p-6 space-y-4 animate-slide-down">
                        <header className="flex items-start justify-between border-b pb-3">
                            <div className="flex items-center gap-2">
                                <Plus className="w-5 h-5 text-[#04326D]" />
                                <h3 className="text-sm font-bold text-[#0B192C] uppercase tracking-wide">
                                    {editingLine ? 'Modifier la Ligne Budgétaire' : 'Ajouter une Ligne Budgétaire'}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setLineModalOpen(false);
                                    setEditingLine(null);
                                }}
                                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </header>

                        <form onSubmit={handleLineSubmit} className="space-y-3.5 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Projet *</label>
                                    <select
                                        value={lineForm.data.project_id}
                                        onChange={(e) => lineForm.setData('project_id', e.target.value)}
                                        className="w-full border border-[#B2BED6] rounded p-2 text-xs font-semibold focus:outline-none focus:border-[#04326D]"
                                        required
                                    >
                                        {projects.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name}
                                            </option>
                                        ))}
                                    </select>
                                    {lineForm.errors.project_id && (
                                        <p className="text-[11px] text-red-600 mt-1">{lineForm.errors.project_id}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Donateur</label>
                                    <select
                                        value={lineForm.data.donor_id}
                                        onChange={(e) => lineForm.setData('donor_id', e.target.value)}
                                        className="w-full border border-[#B2BED6] rounded p-2 text-xs font-semibold focus:outline-none focus:border-[#04326D]"
                                    >
                                        <option value="">Fonds Propres</option>
                                        {donors.map((d) => (
                                            <option key={d.id} value={d.id}>
                                                {d.name}
                                            </option>
                                        ))}
                                    </select>
                                    {lineForm.errors.donor_id && (
                                        <p className="text-[11px] text-red-600 mt-1">{lineForm.errors.donor_id}</p>
                                    )}
                                </div>
                            </div>

                            <div className="p-3 bg-gray-50 border border-gray-200 rounded space-y-2">
                                <span className="text-[10.5px] font-bold text-gray-700 uppercase tracking-wider block">
                                    Codification Stricte (Formule Excel)
                                </span>
                                <div className="grid grid-cols-4 gap-2">
                                    <div>
                                        <label className="block text-[10px] text-gray-500 mb-0.5">Category</label>
                                        <input
                                            type="text"
                                            placeholder="1"
                                            value={lineForm.data.category_code}
                                            onChange={(e) => lineForm.setData('category_code', e.target.value)}
                                            className="w-full border border-gray-300 rounded p-1.5 text-xs text-center font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-gray-500 mb-0.5">Subcat</label>
                                        <input
                                            type="text"
                                            placeholder="1"
                                            value={lineForm.data.subcategory_code}
                                            onChange={(e) => lineForm.setData('subcategory_code', e.target.value)}
                                            className="w-full border border-gray-300 rounded p-1.5 text-xs text-center font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-gray-500 mb-0.5">Descript</label>
                                        <input
                                            type="text"
                                            placeholder="3"
                                            value={lineForm.data.descript_code}
                                            onChange={(e) => lineForm.setData('descript_code', e.target.value)}
                                            className="w-full border border-gray-300 rounded p-1.5 text-xs text-center font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-gray-500 mb-0.5">Split</label>
                                        <input
                                            type="text"
                                            placeholder="a"
                                            value={lineForm.data.split_code}
                                            onChange={(e) => lineForm.setData('split_code', e.target.value)}
                                            className="w-full border border-gray-300 rounded p-1.5 text-xs text-center font-mono"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between pt-1">
                                    <span className="text-[10px] text-gray-500">Code Reconstitué :</span>
                                    <strong className="text-xs font-mono font-black text-[#04326D]">
                                        {calculatedCodePreview || '—'}
                                    </strong>
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Libellé / Désignation *</label>
                                <input
                                    type="text"
                                    placeholder="ex: Achat semences maraîchères"
                                    value={lineForm.data.libelle}
                                    onChange={(e) => lineForm.setData('libelle', e.target.value)}
                                    className="w-full border border-[#B2BED6] rounded p-2 text-xs focus:outline-none focus:border-[#04326D]"
                                    required
                                />
                                {lineForm.errors.libelle && (
                                    <p className="text-[11px] text-red-600 mt-1">{lineForm.errors.libelle}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Devise *</label>
                                    <select
                                        value={lineForm.data.devise}
                                        onChange={(e) => lineForm.setData('devise', e.target.value)}
                                        className="w-full border border-[#B2BED6] rounded p-2 text-xs font-bold text-[#0B192C] focus:outline-none focus:border-[#04326D]"
                                    >
                                        <option value="USD">USD ($)</option>
                                        <option value="FC">FC (CDF)</option>
                                        <option value="EUR">EUR (€)</option>
                                    </select>
                                    {lineForm.errors.devise && (
                                        <p className="text-[11px] text-red-600 mt-1">{lineForm.errors.devise}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Budget Initial Alloué *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                        value={lineForm.data.budget_initial}
                                        onChange={(e) => lineForm.setData('budget_initial', e.target.value)}
                                        className="w-full border border-[#B2BED6] rounded p-2 text-xs font-mono font-bold text-[#0B192C] focus:outline-none focus:border-[#04326D]"
                                        required
                                    />
                                    {lineForm.errors.budget_initial && (
                                        <p className="text-[11px] text-red-600 mt-1">{lineForm.errors.budget_initial}</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setLineModalOpen(false);
                                        setEditingLine(null);
                                    }}
                                    className="px-3.5 py-1.5 border border-[#B2BED6] rounded text-xs font-semibold text-gray-600 hover:bg-gray-50"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={lineForm.processing}
                                    className="px-4 py-1.5 bg-[#04326D] text-white rounded text-xs font-bold shadow hover:bg-[#06428f]"
                                >
                                    {editingLine ? 'Mettre à jour la Ligne' : 'Créer la Ligne'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}