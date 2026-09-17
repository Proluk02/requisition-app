import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { PageProps, User } from '@/types';
import { useEffect, useRef, useState } from 'react';

interface Role { id: number; name: string; }
interface Project { id: string; name: string; }
interface Site { id: string; name: string; }

interface PaginatedUsers {
    data: User[];
    links: { url: string | null; label: string; active: boolean }[];
    from: number;
    to: number;
    total: number;
}

interface Filters {
    search?: string;
    role?: string;
    status?: string;
    project_id?: string;
    site_id?: string;
}

interface Props extends PageProps {
    users: PaginatedUsers;
    filters: Filters;
    roles: Role[];
    projects: Project[];
    sites: Site[];
}

export default function Index({ users, filters, roles, projects, sites }: Props) {
    const { auth } = usePage<PageProps>().props;
    const [search, setSearch] = useState(filters.search || '');
    const [role, setRole] = useState(filters.role || '');
    const [status, setStatus] = useState(filters.status || '');
    const [projectId, setProjectId] = useState(filters.project_id || '');
    const [siteId, setSiteId] = useState(filters.site_id || '');

    const isFirstRender = useRef(true);
    const debounceRef = useRef<ReturnType<typeof setTimeout>>();

    // Filtres automatiques : tout changement déclenche la requête, avec debounce sur la recherche texte
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            router.get(
                route('admin.users.index'),
                {
                    search: search || undefined,
                    role: role || undefined,
                    status: status || undefined,
                    project_id: projectId || undefined,
                    site_id: siteId || undefined,
                },
                { preserveState: true, preserveScroll: true, replace: true },
            );
        }, 350);

        return () => clearTimeout(debounceRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, role, status, projectId, siteId]);

    const resetFilters = () => {
        setSearch('');
        setRole('');
        setStatus('');
        setProjectId('');
        setSiteId('');
    };

    const handleToggleStatus = (user: User) => {
        router.patch(route('admin.users.toggle-status', user.id), {}, { preserveScroll: true });
    };

    const handleDelete = (user: User) => {
        if (confirm(`Supprimer définitivement ${user.name} ? Cette action est irréversible.`)) {
            router.delete(route('admin.users.destroy', user.id), { preserveScroll: true });
        }
    };

    const hasActiveFilters = search || role || status || projectId || siteId;

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Gestion des Utilisateurs</h2>}>
            <Head title="Gestion des Utilisateurs" />

            <div className="flex flex-col gap-6">
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-on-surface dark:text-gray-100">Gestion des Utilisateurs</h2>
                        <p className="text-sm text-on-surface-variant dark:text-gray-400">
                            {users.total} utilisateur{users.total > 1 ? 's' : ''} au total
                        </p>
                    </div>
                    <Link
                        href={route('admin.users.create')}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark"
                    >
                        + Nouvel Utilisateur
                    </Link>
                </div>

                <div className="rounded-xl border border-outline-variant bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    {/* Barre de filtres */}
                    <div className="flex flex-wrap items-center gap-3 border-b border-outline-variant p-4 dark:border-gray-700">
                        <input
                            type="text"
                            placeholder="Rechercher (nom, email)..."
                            className="min-w-[220px] flex-1 rounded-lg border-gray-300 bg-surface-container-low text-sm focus:border-primary focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />

                        <select
                            className="rounded-lg border-gray-300 bg-surface-container-low text-sm focus:border-primary focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                        >
                            <option value="">Tous les rôles</option>
                            {roles.map((r) => (
                                <option key={r.id} value={r.name}>{r.name.toUpperCase()}</option>
                            ))}
                        </select>

                        <select
                            className="rounded-lg border-gray-300 bg-surface-container-low text-sm focus:border-primary focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                        >
                            <option value="">Tous les statuts</option>
                            <option value="active">Actif</option>
                            <option value="inactive">Inactif</option>
                        </select>

                        <select
                            className="rounded-lg border-gray-300 bg-surface-container-low text-sm focus:border-primary focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                            value={projectId}
                            onChange={(e) => setProjectId(e.target.value)}
                        >
                            <option value="">Tous les projets</option>
                            {projects.map((p) => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>

                        <select
                            className="rounded-lg border-gray-300 bg-surface-container-low text-sm focus:border-primary focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                            value={siteId}
                            onChange={(e) => setSiteId(e.target.value)}
                        >
                            <option value="">Tous les sites</option>
                            {sites.map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>

                        {hasActiveFilters && (
                            <button
                                onClick={resetFilters}
                                className="text-sm font-medium text-gray-500 underline hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                                Réinitialiser
                            </button>
                        )}
                    </div>

                    {/* Tableau */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-outline-variant bg-surface-container-low text-[11px] font-bold uppercase tracking-wider text-on-surface-variant dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
                                <tr>
                                    <th className="px-6 py-3">Utilisateur</th>
                                    <th className="px-6 py-3">Rôle</th>
                                    <th className="px-6 py-3">Affectation</th>
                                    <th className="px-6 py-3">Statut</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-outline-variant dark:divide-gray-700">
                                {users.data.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-10 text-center text-on-surface-variant dark:text-gray-400">
                                            Aucun utilisateur ne correspond à ces filtres.
                                        </td>
                                    </tr>
                                )}
                                {users.data.map((u) => (
                                    <tr key={u.id} className="group transition-colors hover:bg-surface-container-lowest dark:hover:bg-gray-700/40">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {u.avatar ? (
                                                    <img src={u.avatar} alt={u.name} className="h-8 w-8 rounded-full object-cover" />
                                                ) : (
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold uppercase text-primary">
                                                        {u.name.substring(0, 2)}
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="font-bold text-on-surface dark:text-gray-100">{u.name}</div>
                                                    <div className="text-[11px] text-on-surface-variant dark:text-gray-400">{u.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="rounded-md border border-outline-variant bg-surface-container px-2 py-1 text-[10px] font-bold uppercase text-on-surface-variant dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300">
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-on-surface-variant dark:text-gray-400">
                                            {u.project?.name || u.site?.name || '—'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${u.status === 'active' ? 'bg-secondary-container text-secondary' : 'bg-red-100 text-red-600'}`}>
                                                <span className={`h-1.5 w-1.5 rounded-full ${u.status === 'active' ? 'bg-secondary' : 'bg-red-600'}`}></span>
                                                {u.status === 'active' ? 'Actif' : 'Bloqué'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-3 opacity-0 transition-opacity group-hover:opacity-100">
                                                <Link
                                                    href={route('admin.users.edit', u.id)}
                                                    className="text-xs font-bold text-primary hover:underline"
                                                >
                                                    Éditer
                                                </Link>
                                                {u.id !== auth.user.id && (
                                                    <>
                                                        <button
                                                            onClick={() => handleToggleStatus(u)}
                                                            className="text-xs font-bold text-amber-600 hover:underline"
                                                        >
                                                            {u.status === 'active' ? 'Désactiver' : 'Activer'}
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(u)}
                                                            className="text-xs font-bold text-red-600 hover:underline"
                                                        >
                                                            Supprimer
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {users.data.length > 0 && (
                        <div className="flex items-center justify-between border-t border-outline-variant p-4 text-xs text-on-surface-variant dark:border-gray-700 dark:text-gray-400">
                            <span>
                                {users.from}–{users.to} sur {users.total}
                            </span>
                            <div className="flex gap-1">
                                {users.links.map((link, i) => (
                                    <Link
                                        key={i}
                                        href={link.url || '#'}
                                        preserveScroll
                                        className={`rounded-md px-3 py-1 ${
                                            link.active
                                                ? 'bg-primary text-white'
                                                : link.url
                                                  ? 'hover:bg-surface-container-low dark:hover:bg-gray-700'
                                                  : 'cursor-not-allowed text-gray-300 dark:text-gray-600'
                                        }`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}