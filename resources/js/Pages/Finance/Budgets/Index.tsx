import { useMemo, useState } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { PageProps } from '@/types';
import {
    PieChart,
    FileSpreadsheet,
    Plus,
    Search,
    Building2,
    Users,
    CheckCircle2,
    AlertCircle,
    X,
    Upload,
    ArrowUpRight,
    FolderKanban,
    Layers,
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
}

interface DonorSummary {
    id: string;
    name: string;
    code: string;
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

    const [importModalOpen, setImportModalOpen] = useState(false);
    const [donorModalOpen, setDonorModalOpen] = useState(false);
    const [lineModalOpen, setLineModalOpen] = useState(false);

    const importForm = useForm<{
        project_id: string;
        file: File | null;
    }>({
        project_id: projects[0]?.id ?? '',
        file: null,
    });

    const donorForm = useForm({
        name: '',
        code: '',
        description: '',
    });

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

    const handleApplyFilters = (p = projectFilter, d = donorFilter, s = search) => {
        router.get(
            route('finance.budgets.index'),
            { project_id: p, donor_id: d, search: s },
            { preserveState: true, preserveScroll: true }
        );
    };

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

    const handleDonorSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        donorForm.post(route('finance.donors.store'), {
            preserveScroll: true,
            onSuccess: () => {
                setDonorModalOpen(false);
                donorForm.reset();
            },
        });
    };

    const handleLineSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        lineForm.post(route('finance.budgets.lines.store'), {
            preserveScroll: true,
            onSuccess: () => {
                setLineModalOpen(false);
                lineForm.reset();
            },
        });
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
                            onClick={() => setDonorModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-[#B2BED6] hover:bg-gray-50 text-[#0B192C] rounded font-bold text-xs shadow-sm transition"
                        >
                            <Users className="w-4 h-4 text-[#04326D]" />
                            <span>Nouveau Donateur</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setLineModalOpen(true)}
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
                                        <th className="py-3 px-4">Code Ligne</th>
                                        <th className="py-3 px-4">Libellé / Activité</th>
                                        <th className="py-3 px-4">Projet & Donateur</th>
                                        <th className="py-3 px-4 text-right">Budget Initial</th>
                                        <th className="py-3 px-4 text-right">Engagé</th>
                                        <th className="py-3 px-4 text-right">Décaissé</th>
                                        <th className="py-3 px-4 text-right">Solde Dispo</th>
                                        <th className="py-3 px-4 text-center">Taux Consommation</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E2E8F0] text-gray-700">
                                    {budgetLines.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="py-12 text-center text-gray-400 italic">
                                                Aucune ligne budgétaire trouvée. Cliquez sur « Importer Budget Excel » pour charger la maquette de référence.
                                            </td>
                                        </tr>
                                    ) : (
                                        budgetLines.map((line) => (
                                            <tr key={line.id} className="hover:bg-[#F9F9FF] transition">
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
                                            </tr>
                                        ))
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
                                                <p className="text-[10.5px] text-gray-500">{donor.lines_count} ligne(s) financée(s)</p>
                                            </div>
                                            <span className="text-xs font-mono font-bold text-gray-700">
                                                {donor.taux_consommation}%
                                            </span>
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

            {donorModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
                    <div className="bg-white rounded border border-[#B2BED6] shadow-2xl max-w-sm w-full p-6 space-y-4 animate-slide-down">
                        <header className="flex items-start justify-between border-b pb-3">
                            <div className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-[#04326D]" />
                                <h3 className="text-sm font-bold text-[#0B192C] uppercase tracking-wide">
                                    Nouveau Donateur
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setDonorModalOpen(false)}
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
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t">
                                <button
                                    type="button"
                                    onClick={() => setDonorModalOpen(false)}
                                    className="px-3 py-1.5 border border-[#B2BED6] rounded text-xs font-semibold text-gray-600 hover:bg-gray-50"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={donorForm.processing}
                                    className="px-4 py-1.5 bg-[#04326D] text-white rounded text-xs font-bold shadow hover:bg-[#06428f]"
                                >
                                    Enregistrer
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {lineModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
                    <div className="bg-white rounded border border-[#B2BED6] shadow-2xl max-w-lg w-full p-6 space-y-4 animate-slide-down">
                        <header className="flex items-start justify-between border-b pb-3">
                            <div className="flex items-center gap-2">
                                <Plus className="w-5 h-5 text-[#04326D]" />
                                <h3 className="text-sm font-bold text-[#0B192C] uppercase tracking-wide">
                                    Ajouter une Ligne Budgétaire
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setLineModalOpen(false)}
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
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t">
                                <button
                                    type="button"
                                    onClick={() => setLineModalOpen(false)}
                                    className="px-3.5 py-1.5 border border-[#B2BED6] rounded text-xs font-semibold text-gray-600 hover:bg-gray-50"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={lineForm.processing}
                                    className="px-4 py-1.5 bg-[#04326D] text-white rounded text-xs font-bold shadow hover:bg-[#06428f]"
                                >
                                    Créer la Ligne
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}