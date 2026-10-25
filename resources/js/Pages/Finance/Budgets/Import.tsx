import { Link, Head, useForm, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import AppLayout from '@/Layouts/AppLayout';
import { PageProps } from '@/types';
import {
    PieChart,
    FileSpreadsheet,
    ArrowLeft,
    Upload,
    CheckCircle2,
    AlertCircle,
    Layers,
    FolderKanban,
    Info,
    FileCheck2,
    X,
    Download,
    Copy,
    Check,
    AlertTriangle,
    Table2,
} from 'lucide-react';

interface ProjectOption {
    id: string;
    name: string;
    full_name: string;
}

interface Props extends PageProps {
    projects: ProjectOption[];
}

const requiredColumns = [
    { name: 'CATEGORY', desc: 'Code catégorie analytique (ex: 1)' },
    { name: 'SUBCATEGORY', desc: 'Sous-catégorie budgétaire (ex: 1)' },
    { name: 'DESCRIPT', desc: 'Code descriptif (ex: 3)' },
    { name: 'SPLIT', desc: 'Code split ou variante (ex: a)' },
    { name: 'CODE', desc: 'Code complet (ex: 1.1.3.a) ou calculé' },
    { name: 'LIBELLE', desc: 'Intitulé / désignation de l’activité' },
    { name: 'DEVISE', desc: 'Devise monétaire (USD, FC, EUR)' },
    { name: 'BUDGET_INITIAL', desc: 'Montant alloué (chiffre décimal)' },
    { name: 'DONATEUR', desc: 'Nom ou code du bailleur de fonds' },
];

const MAX_SIZE_BYTES = 10 * 1024 * 1024;

export default function ImportBudgetLines({ projects = [] }: Props) {
    const { flash } = usePage<PageProps>().props;

    const form = useForm<{ project_id: string; file: File | null }>({
        project_id: projects.length > 0 ? projects[0].id : '',
        file: null,
    });

    const [copyDone, setCopyDone] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        setLocalError(null);

        // Validation locale taille
        if (form.data.file && form.data.file.size > MAX_SIZE_BYTES) {
            setLocalError(
                `Le fichier dépasse la limite de 10 Mo (${(form.data.file.size / 1024 / 1024).toFixed(1)} Mo).`
            );
            return;
        }

        form.post(route('finance.budgets.import'), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => form.reset('file'),
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files ? e.target.files[0] : null;
        setLocalError(null);
        if (f && f.size > MAX_SIZE_BYTES) {
            setLocalError(
                `Le fichier « ${f.name} » dépasse la limite de 10 Mo (${(f.size / 1024 / 1024).toFixed(1)} Mo).`
            );
        }
        form.setData('file', f);
    };

    const handleCopyHeaders = async () => {
        const headers = requiredColumns.map((c) => c.name).join(',');
        try {
            await navigator.clipboard.writeText(headers);
            setCopyDone(true);
            setTimeout(() => setCopyDone(false), 2200);
        } catch {
            // clipboard peut échouer silencieusement
        }
    };

    const handleDownloadTemplate = () => {
        const headers = requiredColumns.map((c) => c.name).join(',');
        const example = '1,1,3,a,1.1.3.a,Exemple activité,USD,1500.50,Bailleur Exemple';
        const csv = `${headers}\n${example}\n`;
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'maquette-budget-modele.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const selectedProject = useMemo(
        () => projects.find((p) => p.id === form.data.project_id),
        [projects, form.data.project_id]
    );

    const canSubmit =
        !!form.data.project_id && !!form.data.file && !form.processing && !localError;

    return (
        <AppLayout>
            <Head title="Importer la Maquette Budgétaire" />

            <div className="space-y-6">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
                    <div>
                        <nav className="text-[10px] font-bold uppercase tracking-widest text-[#B2BED6] mb-1.5 flex items-center gap-1.5">
                            <PieChart className="w-3.5 h-3.5 text-[#04326D]" />
                            <span>Direction Financière</span>
                            <span className="mx-1">/</span>
                            <Link
                                href={route('finance.budgets.index')}
                                className="hover:text-[#04326D] transition"
                            >
                                Centre Budgétaire
                            </Link>
                            <span className="mx-1">/</span>
                            <span className="text-[#04326D]">Importation</span>
                        </nav>
                        <h1 className="text-xl font-bold text-[#0B192C]">
                            Importer la Maquette Budgétaire
                        </h1>
                        <p className="text-[12px] text-gray-500 mt-1">
                            Chargement en masse des lignes budgétaires, codifications analytiques et affectations bailleurs depuis Excel ou CSV.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link
                            href={route('finance.budgets.index')}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-[#B2BED6] hover:bg-gray-50 text-[#0B192C] rounded font-bold text-xs shadow-sm transition"
                        >
                            <ArrowLeft className="w-4 h-4 text-[#04326D]" />
                            <span>Retour au Centre Budgétaire</span>
                        </Link>
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
                {localError && (
                    <div className="p-3.5 rounded bg-red-50 border border-red-300 text-red-900 text-xs font-semibold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-700 shrink-0" />
                        <span>{localError}</span>
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-white p-4 rounded border border-[#B2BED6] shadow-sm flex items-center justify-between">
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                Projets Disponibles
                            </span>
                            <p className="text-2xl font-black text-[#0B192C] mt-1 font-mono">
                                {projects.length}
                            </p>
                        </div>
                        <div className="p-2.5 rounded bg-blue-50 border border-blue-100 text-[#04326D]">
                            <FolderKanban className="w-5 h-5" />
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded border border-[#B2BED6] shadow-sm flex items-center justify-between">
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                Formats Acceptés
                            </span>
                            <p className="text-sm font-black text-[#0B192C] mt-1 font-mono uppercase">
                                .XLSX · .CSV · .TXT
                            </p>
                            <span className="text-[10px] text-gray-400">Taille max : 10 Mo</span>
                        </div>
                        <div className="p-2.5 rounded bg-emerald-50 border border-emerald-100 text-emerald-700">
                            <FileSpreadsheet className="w-5 h-5" />
                        </div>
                    </div>

                    <div className="bg-[#0B192C] p-4 rounded text-white shadow-sm flex items-center justify-between">
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#B2BED6]">
                                Mode d’Intégration
                            </span>
                            <p className="text-sm font-bold text-white mt-1">
                                Mise à jour automatique (Upsert)
                            </p>
                            <span className="text-[10px] text-[#B2BED6]">Codes existants réajustés</span>
                        </div>
                        <div className="p-2.5 rounded bg-white/10 text-white">
                            <Layers className="w-5 h-5" />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                    {/* FORMULAIRE */}
                    <div className="lg:col-span-7 bg-white border border-[#B2BED6] rounded shadow-sm overflow-hidden">
                        <div className="border-b border-[#E2E8F0] px-4 py-3 bg-[#F9F9FF] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Upload className="w-4 h-4 text-[#04326D]" />
                                <h2 className="text-xs font-bold uppercase tracking-wider text-[#0B192C]">
                                    Paramètres du Fichier d'Import
                                </h2>
                            </div>
                            <span className="text-[10px] font-bold text-[#04326D] bg-blue-100 px-2 py-0.5 rounded">
                                Étape Obligatoire
                            </span>
                        </div>

                        <form onSubmit={handleSubmit} className="p-5 space-y-5 text-xs">
                            <div>
                                <label className="block font-bold text-gray-700 mb-1.5">
                                    Projet de Rattachement *
                                </label>
                                <select
                                    value={form.data.project_id}
                                    onChange={(e) => form.setData('project_id', e.target.value)}
                                    className="w-full border border-[#B2BED6] rounded p-2 text-xs font-semibold bg-white focus:outline-none focus:border-[#04326D]"
                                >
                                    {projects.length === 0 && <option value="">Aucun projet disponible</option>}
                                    {projects.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name}
                                        </option>
                                    ))}
                                </select>
                                {selectedProject && (
                                    <p className="text-[10.5px] text-gray-500 mt-1 italic">
                                        {selectedProject.full_name}
                                    </p>
                                )}
                                {form.errors.project_id && (
                                    <p className="text-[11px] text-red-600 mt-1">{form.errors.project_id}</p>
                                )}
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">
                                    Fichier de Maquette (.xlsx, .xls, .csv) *
                                </label>
                                <div className="border-2 border-dashed border-[#B2BED6] rounded p-4 bg-gray-50/50 hover:bg-gray-50 transition">
                                    <input
                                        type="file"
                                        accept=".xlsx,.xls,.csv,.txt"
                                        onChange={handleFileChange}
                                        className="w-full text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-bold file:bg-[#04326D] file:text-white hover:file:bg-[#06428f] cursor-pointer"
                                        required
                                    />
                                    {form.data.file && (
                                        <div className="mt-3 p-2 bg-white border border-[#B2BED6] rounded flex items-center justify-between text-xs shadow-sm">
                                            <div className="flex items-center gap-2 truncate">
                                                <FileCheck2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                                <span className="font-mono font-semibold text-gray-800 truncate">
                                                    {form.data.file.name}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0 ml-2">
                                                <span className="text-[10px] text-gray-500 font-mono">
                                                    {(form.data.file.size / 1024).toFixed(1)} Ko
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => form.setData('file', null)}
                                                    className="text-gray-400 hover:text-red-600 transition"
                                                    aria-label="Retirer le fichier"
                                                    title="Retirer le fichier"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    {form.progress && (
                                        <div className="mt-3 w-full bg-gray-200 rounded h-1.5 overflow-hidden">
                                            <div
                                                className="bg-[#04326D] h-full transition-all"
                                                style={{ width: `${form.progress.percentage}%` }}
                                            />
                                        </div>
                                    )}
                                </div>
                                {form.errors.file && (
                                    <p className="text-[11px] text-red-600 mt-1">{form.errors.file}</p>
                                )}
                            </div>

                            <div className="p-3 bg-blue-50 border border-blue-200 rounded text-[11px] text-gray-700 leading-relaxed space-y-1">
                                <div className="flex items-center gap-1.5 font-bold text-[#04326D]">
                                    <Info className="w-3.5 h-3.5" />
                                    <span>Traitement des Donateurs et Codes</span>
                                </div>
                                <p>
                                    Si le bailleur mentionné dans la colonne <strong>DONATEUR</strong> n'existe pas encore, il sera créé automatiquement. Si la colonne <strong>CODE</strong> est vide, le système reconstituera le code à partir des 4 segments (Category.Subcat.Descript.Split).
                                </p>
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-[#E2E8F0]">
                                <Link
                                    href={route('finance.budgets.index')}
                                    className="px-3.5 py-1.5 border border-[#B2BED6] rounded text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"
                                >
                                    Annuler
                                </Link>

                                <button
                                    type="submit"
                                    disabled={!canSubmit}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#04326D] hover:bg-[#06428f] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-xs font-bold shadow-sm transition"
                                >
                                    <Upload className="w-4 h-4" />
                                    <span>
                                        {form.processing ? 'Importation en cours...' : 'Lancer l’importation'}
                                    </span>
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* STRUCTURE DES COLONNES */}
                    <div className="lg:col-span-5 bg-white border border-[#B2BED6] rounded shadow-sm overflow-hidden">
                        <div className="border-b border-[#E2E8F0] px-4 py-3 bg-[#F9F9FF] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Table2 className="w-4 h-4 text-emerald-700" />
                                <h2 className="text-xs font-bold uppercase tracking-wider text-[#0B192C]">
                                    Structure des 9 Colonnes Obligatoires
                                </h2>
                            </div>
                            <span className="text-[10px] font-mono font-bold text-gray-500">
                                Ligne 1 = En-têtes
                            </span>
                        </div>

                        <div className="p-4 space-y-3 text-xs">
                            <p className="text-[11px] text-gray-500">
                                Votre fichier Excel ou CSV doit impérativement respecter cette nomenclature exacte sur la première ligne :
                            </p>

                            <div className="divide-y divide-gray-100 border border-[#E2E8F0] rounded overflow-hidden">
                                {requiredColumns.map((col) => (
                                    <div
                                        key={col.name}
                                        className="p-2.5 flex items-center justify-between hover:bg-gray-50/70 transition"
                                    >
                                        <span className="font-mono font-bold text-[11px] text-[#04326D] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                            {col.name}
                                        </span>
                                        <span className="text-[11px] text-gray-600 text-right">
                                            {col.desc}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Actions utiles */}
                            <div className="grid grid-cols-2 gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={handleCopyHeaders}
                                    className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-white border border-[#B2BED6] hover:bg-gray-50 text-[#04326D] rounded text-[11px] font-bold transition"
                                    title="Copier les en-têtes dans le presse-papier"
                                >
                                    {copyDone ? (
                                        <>
                                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                                            <span>Copié !</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-3.5 h-3.5" />
                                            <span>Copier les en-têtes</span>
                                        </>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDownloadTemplate}
                                    className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-white border border-[#B2BED6] hover:bg-gray-50 text-[#04326D] rounded text-[11px] font-bold transition"
                                    title="Télécharger un modèle CSV pré-rempli"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Télécharger modèle</span>
                                </button>
                            </div>

                            <div className="p-3 bg-gray-50 border border-gray-200 rounded text-[11px] text-gray-600 space-y-1">
                                <strong className="text-[#0B192C] block">Format monétaire :</strong>
                                <p>
                                    Les montants de la colonne <strong>BUDGET_INITIAL</strong> doivent être numériques (ex : <span className="font-mono font-bold text-gray-800">1500.50</span>). Les séparateurs de milliers ou symboles ($) sont automatiquement nettoyés.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}