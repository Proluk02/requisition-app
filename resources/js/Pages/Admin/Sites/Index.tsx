import { useState } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { PageProps } from '@/types';
import {
    MapPin,
    Plus,
    Pencil,
    Trash2,
    FolderKanban,
    CheckCircle2,
    AlertCircle,
    X,
} from 'lucide-react';

interface ProjectItem {
    id: string;
    name: string;
    full_name: string;
}

interface SiteItem {
    id: string;
    name: string;
    location: string | null;
    projects: ProjectItem[];
    projects_count: number;
    users_count: number;
}

interface Props extends PageProps {
    sites: SiteItem[];
    availableProjects: ProjectItem[];
}

export default function SitesIndex({ sites = [], availableProjects = [] }: Props) {
    const { flash } = usePage<PageProps>().props;

    const [modalOpen, setModalOpen] = useState(false);
    const [editingSite, setEditingSite] = useState<SiteItem | null>(null);

    const form = useForm<{
        name: string;
        location: string;
        project_ids: string[];
    }>({
        name: '',
        location: '',
        project_ids: [],
    });

    const handleOpenCreate = () => {
        setEditingSite(null);
        form.setData({
            name: '',
            location: '',
            project_ids: [],
        });
        setModalOpen(true);
    };

    const handleOpenEdit = (site: SiteItem) => {
        setEditingSite(site);
        form.setData({
            name: site.name,
            location: site.location ?? '',
            project_ids: site.projects.map((p) => p.id),
        });
        setModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingSite) {
            form.put(route('admin.sites.update', editingSite.id), {
                preserveScroll: true,
                onSuccess: () => setModalOpen(false),
            });
        } else {
            form.post(route('admin.sites.store'), {
                preserveScroll: true,
                onSuccess: () => setModalOpen(false),
            });
        }
    };

    const handleDelete = (site: SiteItem) => {
        if (confirm(`Confirmez-vous la suppression du site ${site.name} ?`)) {
            router.delete(route('admin.sites.destroy', site.id), {
                preserveScroll: true,
            });
        }
    };

    const toggleProjectSelection = (projectId: string) => {
        const current = [...form.data.project_ids];
        const index = current.indexOf(projectId);
        if (index > -1) {
            current.splice(index, 1);
        } else {
            current.push(projectId);
        }
        form.setData('project_ids', current);
    };

    return (
        <AppLayout>
            <Head title="Administration — Sites Opérationnels" />

            <div className="space-y-6">
                <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
                    <div>
                        <nav className="text-[10px] font-bold uppercase tracking-widest text-[#B2BED6] mb-1.5 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-[#04326D]" />
                            <span>Administration</span>
                            <span className="mx-1">/</span>
                            <span className="text-[#04326D]">Sites</span>
                        </nav>
                        <h1 className="text-xl font-bold text-[#0B192C]">
                            Sites Opérationnels & Centres de Terrain
                        </h1>
                        <p className="text-[12px] text-gray-500 mt-1">
                            Référentiel des localisations (Kanina, Tshala, etc.) et des projets qui s'y déploient.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleOpenCreate}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#04326D] hover:bg-[#06428f] text-white rounded font-bold text-xs shadow-sm transition"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Nouveau Site</span>
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
                                    <th className="py-3 px-4">Nom du Site</th>
                                    <th className="py-3 px-4">Localisation / Commune</th>
                                    <th className="py-3 px-4">Projets en Activité</th>
                                    <th className="py-3 px-4 text-center">Agents Affectés</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E2E8F0] text-gray-700">
                                {sites.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center text-gray-400 italic">
                                            Aucun site opérationnel enregistré pour le moment.
                                        </td>
                                    </tr>
                                ) : (
                                    sites.map((s) => (
                                        <tr key={s.id} className="hover:bg-[#F9F9FF] transition">
                                            <td className="py-3.5 px-4 font-bold text-[#04326D] whitespace-nowrap">
                                                {s.name}
                                            </td>
                                            <td className="py-3.5 px-4 text-gray-600">
                                                {s.location || '—'}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {s.projects.length === 0 ? (
                                                        <span className="text-[10px] text-gray-400 italic">
                                                            Aucun projet affecté
                                                        </span>
                                                    ) : (
                                                        s.projects.map((p) => (
                                                            <span
                                                                key={p.id}
                                                                className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded"
                                                            >
                                                                <FolderKanban className="w-2.5 h-2.5" />
                                                                {p.name}
                                                            </span>
                                                        ))
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4 text-center font-bold text-gray-700">
                                                {s.users_count}
                                            </td>
                                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                                <div className="inline-flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenEdit(s)}
                                                        className="p-1.5 text-gray-500 hover:text-[#04326D] hover:bg-gray-100 rounded transition"
                                                        title="Modifier"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(s)}
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
                    <div className="bg-white rounded border border-[#B2BED6] shadow-2xl max-w-md w-full p-6 space-y-4 animate-slide-down">
                        <header className="flex items-start justify-between border-b pb-3">
                            <h3 className="text-sm font-bold text-[#0B192C] uppercase tracking-wide">
                                {editingSite ? `Modifier Site : ${editingSite.name}` : 'Nouveau Site Opérationnel'}
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
                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Nom du Site *</label>
                                <input
                                    type="text"
                                    placeholder="ex: Kanina, Tshala, Dilala"
                                    value={form.data.name}
                                    onChange={(e) => form.setData('name', e.target.value)}
                                    className="w-full border border-[#B2BED6] rounded p-2 text-xs font-bold focus:outline-none focus:border-[#04326D]"
                                    required
                                />
                                {form.errors.name && (
                                    <p className="text-[10px] text-red-600 mt-1">{form.errors.name}</p>
                                )}
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Localisation / Commune</label>
                                <input
                                    type="text"
                                    placeholder="ex: Commune de Dilala, Ville de Kolwezi"
                                    value={form.data.location}
                                    onChange={(e) => form.setData('location', e.target.value)}
                                    className="w-full border border-[#B2BED6] rounded p-2 text-xs focus:outline-none focus:border-[#04326D]"
                                />
                            </div>

                            <div className="p-3 bg-gray-50 border border-gray-200 rounded space-y-2">
                                <label className="block text-[11px] font-bold text-[#0B192C] uppercase tracking-wider">
                                    Affecter les Projets Actifs sur ce Site
                                </label>
                                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                                    {availableProjects.map((project) => {
                                        const checked = form.data.project_ids.includes(project.id);
                                        return (
                                            <label
                                                key={project.id}
                                                className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition ${
                                                    checked
                                                        ? 'bg-emerald-50 border-emerald-600 text-emerald-800 font-bold'
                                                        : 'bg-white border-gray-200 text-gray-700'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => toggleProjectSelection(project.id)}
                                                    className="rounded border-gray-300 text-emerald-700 focus:ring-emerald-700"
                                                />
                                                <span className="text-[11px] truncate">{project.name}</span>
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