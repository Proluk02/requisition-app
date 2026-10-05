import { useState } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { PageProps } from '@/types';
import {
    FolderKanban,
    Plus,
    Pencil,
    Trash2,
    MapPin,
    CheckCircle2,
    AlertCircle,
    X,
} from 'lucide-react';

interface SiteItem {
    id: string;
    name: string;
    location?: string;
}

interface ProjectItem {
    id: string;
    name: string;
    full_name: string;
    description: string | null;
    sites: SiteItem[];
    sites_count: number;
    users_count: number;
    requisitions_count: number;
    budget_lines_count: number;
}

interface Props extends PageProps {
    projects: ProjectItem[];
    availableSites: SiteItem[];
}

export default function ProjectsIndex({ projects = [], availableSites = [] }: Props) {
    const { flash } = usePage<PageProps>().props;

    const [modalOpen, setModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<ProjectItem | null>(null);

    const form = useForm<{
        name: string;
        full_name: string;
        description: string;
        site_ids: string[];
    }>({
        name: '',
        full_name: '',
        description: '',
        site_ids: [],
    });

    const handleOpenCreate = () => {
        setEditingProject(null);
        form.setData({
            name: '',
            full_name: '',
            description: '',
            site_ids: [],
        });
        setModalOpen(true);
    };

    const handleOpenEdit = (project: ProjectItem) => {
        setEditingProject(project);
        form.setData({
            name: project.name,
            full_name: project.full_name,
            description: project.description ?? '',
            site_ids: project.sites.map((s) => s.id),
        });
        setModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingProject) {
            form.put(route('admin.projects.update', editingProject.id), {
                preserveScroll: true,
                onSuccess: () => setModalOpen(false),
            });
        } else {
            form.post(route('admin.projects.store'), {
                preserveScroll: true,
                onSuccess: () => setModalOpen(false),
            });
        }
    };

    const handleDelete = (project: ProjectItem) => {
        if (confirm(`Confirmez-vous la suppression du projet ${project.name} ?`)) {
            router.delete(route('admin.projects.destroy', project.id), {
                preserveScroll: true,
            });
        }
    };

    const toggleSiteSelection = (siteId: string) => {
        const current = [...form.data.site_ids];
        const index = current.indexOf(siteId);
        if (index > -1) {
            current.splice(index, 1);
        } else {
            current.push(siteId);
        }
        form.setData('site_ids', current);
    };

    return (
        <AppLayout>
            <Head title="Administration — Projets Institutionnels" />

            <div className="space-y-6">
                <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
                    <div>
                        <nav className="text-[10px] font-bold uppercase tracking-widest text-[#B2BED6] mb-1.5 flex items-center gap-1.5">
                            <FolderKanban className="w-3.5 h-3.5 text-[#04326D]" />
                            <span>Administration</span>
                            <span className="mx-1">/</span>
                            <span className="text-[#04326D]">Projets</span>
                        </nav>
                        <h1 className="text-xl font-bold text-[#0B192C]">
                            Projets Institutionnels & Affectation des Sites
                        </h1>
                        <p className="text-[12px] text-gray-500 mt-1">
                            Configuration des sigles projets, intitulés et rattachement des zones d'intervention.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleOpenCreate}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#04326D] hover:bg-[#06428f] text-white rounded font-bold text-xs shadow-sm transition"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Nouveau Projet</span>
                    </button>
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

                <div className="bg-white border border-[#B2BED6] rounded shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-[#0B192C] text-white uppercase text-[10px] font-bold tracking-wider">
                                    <th className="py-3 px-4">Sigle Projet</th>
                                    <th className="py-3 px-4">Intitulé Complet</th>
                                    <th className="py-3 px-4">Sites Rattachés</th>
                                    <th className="py-3 px-4 text-center">Agents</th>
                                    <th className="py-3 px-4 text-center">Réquisitions</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E2E8F0] text-gray-700">
                                {projects.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-12 text-center text-gray-400 italic">
                                            Aucun projet enregistré pour le moment.
                                        </td>
                                    </tr>
                                ) : (
                                    projects.map((p) => (
                                        <tr key={p.id} className="hover:bg-[#F9F9FF] transition">
                                            <td className="py-3.5 px-4 font-mono font-bold text-[#04326D] whitespace-nowrap">
                                                {p.name}
                                            </td>
                                            <td className="py-3.5 px-4 font-semibold text-[#0B192C]">
                                                {p.full_name}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {p.sites.length === 0 ? (
                                                        <span className="text-[10px] text-gray-400 italic">
                                                            Aucun site
                                                        </span>
                                                    ) : (
                                                        p.sites.map((s) => (
                                                            <span
                                                                key={s.id}
                                                                className="inline-flex items-center gap-1 text-[10px] font-semibold bg-blue-50 text-[#04326D] border border-blue-200 px-1.5 py-0.5 rounded"
                                                            >
                                                                <MapPin className="w-2.5 h-2.5" />
                                                                {s.name}
                                                            </span>
                                                        ))
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4 text-center font-bold text-gray-700">
                                                {p.users_count}
                                            </td>
                                            <td className="py-3.5 px-4 text-center font-bold text-gray-700">
                                                {p.requisitions_count}
                                            </td>
                                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                                <div className="inline-flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenEdit(p)}
                                                        className="p-1.5 text-gray-500 hover:text-[#04326D] hover:bg-gray-100 rounded transition"
                                                        title="Modifier"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(p)}
                                                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition"
                                                        title="Supprimer"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
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

            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
                    <div className="bg-white rounded border border-[#B2BED6] shadow-2xl max-w-lg w-full p-6 space-y-4 animate-slide-down">
                        <header className="flex items-start justify-between border-b pb-3">
                            <h3 className="text-sm font-bold text-[#0B192C] uppercase tracking-wide">
                                {editingProject ? `Modifier Projet : ${editingProject.name}` : 'Nouveau Projet Institutionnel'}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </header>

                        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-1">
                                    <label className="block font-bold text-gray-700 mb-1">Sigle (Code) *</label>
                                    <input
                                        type="text"
                                        placeholder="ex: UB, CB, HB"
                                        value={form.data.name}
                                        onChange={(e) => form.setData('name', e.target.value)}
                                        className="w-full border border-[#B2BED6] rounded p-2 text-xs font-mono font-bold uppercase focus:outline-none focus:border-[#04326D]"
                                        required
                                    />
                                    {form.errors.name && (
                                        <p className="text-[10px] text-red-600 mt-1">{form.errors.name}</p>
                                    )}
                                </div>
                                <div className="col-span-2">
                                    <label className="block font-bold text-gray-700 mb-1">Intitulé Officiel *</label>
                                    <input
                                        type="text"
                                        placeholder="ex: USIMAMIZI BORA (Bonne Gouvernance)"
                                        value={form.data.full_name}
                                        onChange={(e) => form.setData('full_name', e.target.value)}
                                        className="w-full border border-[#B2BED6] rounded p-2 text-xs font-semibold focus:outline-none focus:border-[#04326D]"
                                        required
                                    />
                                    {form.errors.full_name && (
                                        <p className="text-[10px] text-red-600 mt-1">{form.errors.full_name}</p>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Description / Contexte</label>
                                <textarea
                                    rows={2}
                                    placeholder="Objectifs et cadre opérationnel..."
                                    value={form.data.description}
                                    onChange={(e) => form.setData('description', e.target.value)}
                                    className="w-full border border-[#B2BED6] rounded p-2 text-xs focus:outline-none focus:border-[#04326D]"
                                />
                            </div>

                            <div className="p-3 bg-gray-50 border border-gray-200 rounded space-y-2">
                                <label className="block text-[11px] font-bold text-[#0B192C] uppercase tracking-wider">
                                    Affecter les Sites d'Exécution du Projet
                                </label>
                                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                                    {availableSites.map((site) => {
                                        const checked = form.data.site_ids.includes(site.id);
                                        return (
                                            <label
                                                key={site.id}
                                                className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition ${
                                                    checked
                                                        ? 'bg-blue-50 border-[#04326D] text-[#04326D] font-bold'
                                                        : 'bg-white border-gray-200 text-gray-700'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => toggleSiteSelection(site.id)}
                                                    className="rounded border-gray-300 text-[#04326D] focus:ring-[#04326D]"
                                                />
                                                <span className="text-[11px] truncate">{site.name}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="px-3.5 py-1.5 border border-[#B2BED6] rounded text-xs font-semibold text-gray-600 hover:bg-gray-50"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={form.processing}
                                    className="px-4 py-1.5 bg-[#04326D] text-white rounded text-xs font-bold shadow hover:bg-[#06428f]"
                                >
                                    Enregistrer
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}