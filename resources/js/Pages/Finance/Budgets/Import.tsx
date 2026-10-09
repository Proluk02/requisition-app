import { Head, useForm, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { PageProps } from '@/types';
import {
    AlertCircle,
    CheckCircle2,
    FileSpreadsheet,
    FolderKanban,
    ShieldCheck,
    Upload,
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
    'CATEGORY',
    'SUBCATEGORY',
    'DESCRIPT',
    'SPLIT',
    'CODE',
    'LIBELLE',
    'DEVISE',
    'BUDGET_INITIAL',
    'DONATEUR',
];

export default function ImportBudgetLines({ projects = [] }: Props) {
    const { flash } = usePage<PageProps>().props;
    const form = useForm<{ project_id: string; file: File | null }>({
        project_id: projects[0]?.id ?? '',
        file: null,
    });

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        form.post(route('finance.budgets.import'), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => form.reset('file'),
        });
    };

    return (
        <AppLayout>
            <Head title="Importer les lignes budgétaires" />

            <div className="mx-auto max-w-5xl space-y-6">
                <header className="overflow-hidden rounded-xl bg-gradient-to-r from-[#06244A] to-[#0B477E] p-6 text-white shadow-sm sm:p-8">
                    <nav className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-100/75">
                        <span>Direction Financière</span>
                        <span>/</span>
                        <span className="text-white">Import budgétaire</span>
                    </nav>
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                        <div className="flex items-start gap-4">
                            <div className="rounded-xl bg-white/10 p-3">
                                <FileSpreadsheet className="h-7 w-7 text-emerald-300" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight">
                                    Importer les lignes budgétaires
                                </h1>
                                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-blue-100/80">
                                    Chargez la maquette de référence pour enregistrer les codes
                                    d’allocation et les budgets dans la base de données.
                                </p>
                            </div>
                        </div>
                        <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-blue-50">
                            <FolderKanban className="h-4 w-4 text-emerald-300" />
                            {projects.length} projet{projects.length === 1 ? '' : 's'} disponible
                            {projects.length === 1 ? '' : 's'}
                        </div>
                    </div>
                </header>

                {flash?.success && (
                    <div className="flex items-center gap-2 rounded border border-emerald-300 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-900">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
                        <span>{flash.success}</span>
                    </div>
                )}
                {flash?.error && (
                    <div className="flex items-center gap-2 rounded border border-red-300 bg-red-50 p-3.5 text-xs font-semibold text-red-900">
                        <AlertCircle className="h-4 w-4 shrink-0 text-red-700" />
                        <span>{flash.error}</span>
                    </div>
                )}

                <form
                    onSubmit={handleSubmit}
                    className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]"
                >
                    <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-[#04326D]">1</span>
                            <div>
                                <h2 className="text-sm font-bold text-slate-900">Choisir le projet et le fichier</h2>
                                <p className="mt-0.5 text-xs text-slate-500">Les projets proposés sont chargés depuis la base de données.</p>
                            </div>
                        </div>

                        <div>
                            <label
                                htmlFor="budget-project"
                                className="mb-1.5 block text-xs font-bold text-slate-700"
                            >
                                Projet de rattachement *
                            </label>
                            <select
                                id="budget-project"
                                value={form.data.project_id}
                                onChange={(event) => form.setData('project_id', event.target.value)}
                                className="w-full rounded-lg border-slate-300 p-3 text-sm focus:border-[#04326D] focus:ring-[#04326D]"
                                required
                                disabled={projects.length === 0}
                            >
                                {projects.length === 0 && <option value="">Aucun projet disponible</option>}
                                {projects.map((project) => (
                                    <option key={project.id} value={project.id}>
                                        {project.name}{project.full_name ? ` — ${project.full_name}` : ''}
                                    </option>
                                ))}
                            </select>
                            {form.errors.project_id && (
                                <p className="mt-1 text-xs text-red-600">{form.errors.project_id}</p>
                            )}
                        </div>

                        <div>
                            <label
                                htmlFor="budget-file"
                                className="mb-1.5 block text-xs font-bold text-slate-700"
                            >
                                Fichier Excel ou CSV *
                            </label>
                            <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-5 transition hover:border-blue-400 hover:bg-blue-50/40">
                                <input
                                    id="budget-file"
                                    type="file"
                                    accept=".xlsx,.xls,.csv"
                                    onChange={(event) =>
                                        form.setData('file', event.target.files?.[0] ?? null)
                                    }
                                    className="block w-full cursor-pointer text-xs text-slate-600 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-[#04326D] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-[#06428f]"
                                    required
                                />
                                <p className="mt-2 text-[11px] text-slate-500">Formats acceptés : .xlsx, .xls, .csv · Taille maximale : 10 Mo</p>
                                {form.data.file && (
                                    <p className="mt-3 truncate rounded-md bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                                        {form.data.file.name}
                                    </p>
                                )}
                            </div>
                            {form.errors.file && (
                                <p className="mt-1 text-xs text-red-600">{form.errors.file}</p>
                            )}
                        </div>

                        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-[11px] text-slate-500">Vérifiez le projet sélectionné avant l’import.</p>
                            <button
                                type="submit"
                                disabled={form.processing || projects.length === 0}
                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#04326D] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#06428f] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Upload className="h-4 w-4" />
                                <span>
                                    {form.processing ? 'Importation en cours...' : 'Importer le fichier'}
                                </span>
                            </button>
                        </div>
                    </section>

                    <aside className="space-y-4">
                        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="mb-4 flex items-center gap-2">
                                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                                <h2 className="text-sm font-bold text-slate-900">Format du fichier</h2>
                            </div>
                            <p className="mb-3 text-xs leading-relaxed text-slate-600">
                                La première ligne doit contenir les neuf en-têtes suivants :
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {requiredColumns.map((column) => (
                                    <span
                                        key={column}
                                        className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-[10px] font-semibold text-slate-700"
                                    >
                                        {column}
                                    </span>
                                ))}
                            </div>
                        </section>

                        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                            <div className="mb-2 flex items-center gap-2 text-emerald-800">
                                <ShieldCheck className="h-4 w-4" />
                                <h2 className="text-xs font-bold">Enregistrement sécurisé</h2>
                            </div>
                            <p className="text-[11px] leading-relaxed text-emerald-900/80">
                                Le code <strong>CODE</strong> est utilisé comme code d’allocation.
                                Les lignes importées sont associées au projet choisi et les lignes
                                existantes sont mises à jour.
                            </p>
                        </section>
                    </aside>
                </form>
            </div>
        </AppLayout>
    );
}
