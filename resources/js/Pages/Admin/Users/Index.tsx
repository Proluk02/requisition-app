import { useEffect, useRef, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { PageProps, User } from '@/types';
import {
    Search,
    Filter,
    X,
    UserPlus,
    Pencil,
    Power,
    Trash2,
    ShieldCheck,
    Users as UsersIcon,
    Lock,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';

interface Role {
    id: number;
    name: string;
}
interface Project {
    id: string;
    name: string;
}
interface Site {
    id: string;
    name: string;
}

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
        if (confirm(`Confirmez-vous la suppression définitive du compte de ${user.name} ?`)) {
            router.delete(route('admin.users.destroy', user.id), { preserveScroll: true });
        }
    };

    const hasActiveFilters = search || role || status || projectId || siteId;

    const formatRole = (r?: string) =>
        r ? r.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '—';

    return (
        <AppLayout>
            <Head title="Gestion des Utilisateurs" />

            <div className="flex flex-col gap-6">
                {/* En-tête */}
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center border-b border-outline-soft pb-5">
                    <div>
                        <h1 className="text-xl font-bold text-on-surface">Gestion des Utilisateurs</h1>
                        <p className="text-xs text-gray-500 mt-1">
                            {users.total} compte{users.total > 1 ? 's' : ''} enregistré
                            {users.total > 1 ? 's' : ''} au sein de l'organisation
                        </p>
                    </div>
                    <Link
                        href={route('admin.users.create')}
                        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-primary-light hover:shadow-md transition-all active:scale-[0.98]"
                    >
                        <UserPlus className="w-4 h-4" />
                        <span>Nouvel Utilisateur</span>
                    </Link>
                </div>

                {/* Grille */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                    {/* Tableau + filtres */}
                    <div className="xl:col-span-8 space-y-4">
                        <div className="rounded-lg border border-outline-soft bg-white shadow-card overflow-hidden">
                            {/* Filtres */}
                            <div className="flex flex-wrap items-center gap-2.5 border-b border-outline-soft p-4 bg-white">
                                <div className="relative min-w-[200px] flex-1">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                                    <input
                                        type="text"
                                        placeholder="Rechercher nom, email…"
                                        className="w-full rounded-md border-outline-variant pl-8 pr-3 py-2 text-xs focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none transition"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                </div>

                                <select
                                    className="rounded-md border-outline-variant py-2 pl-2.5 pr-7 text-xs text-gray-700 bg-white focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none transition"
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                >
                                    <option value="">Tous les rôles</option>
                                    {roles.map((r) => (
                                        <option key={r.id} value={r.name}>
                                            {formatRole(r.name)}
                                        </option>
                                    ))}
                                </select>

                                <select
                                    className="rounded-md border-outline-variant py-2 pl-2.5 pr-7 text-xs text-gray-700 bg-white focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none transition"
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                >
                                    <option value="">Tous les statuts</option>
                                    <option value="active">Actif</option>
                                    <option value="inactive">Bloqué / Inactif</option>
                                </select>

                                <select
                                    className="rounded-md border-outline-variant py-2 pl-2.5 pr-7 text-xs text-gray-700 bg-white focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none transition"
                                    value={projectId}
                                    onChange={(e) => setProjectId(e.target.value)}
                                >
                                    <option value="">Tous les projets</option>
                                    {projects.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name}
                                        </option>
                                    ))}
                                </select>

                                {hasActiveFilters && (
                                    <button
                                        onClick={resetFilters}
                                        className="inline-flex items-center gap-1 text-xs font-semibold text-error hover:bg-error-soft px-2.5 py-1.5 rounded-md transition"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                        Effacer
                                    </button>
                                )}
                            </div>

                            {/* Tableau */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-sidebar text-white uppercase text-[10px] font-bold tracking-wider">
                                            <th className="px-4 py-3.5">Utilisateur</th>
                                            <th className="px-4 py-3.5">Rôle</th>
                                            <th className="px-4 py-3.5">Affectation</th>
                                            <th className="px-4 py-3.5">Statut</th>
                                            <th className="px-4 py-3.5 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-outline-soft text-gray-700">
                                        {users.data.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-12 text-center">
                                                    <UsersIcon className="w-10 h-10 mx-auto text-gray-300 mb-2" strokeWidth={1.5} />
                                                    <p className="text-gray-500 text-sm font-medium">
                                                        Aucun utilisateur trouvé
                                                    </p>
                                                    <p className="text-gray-400 text-[11px] mt-1">
                                                        Modifiez vos critères de recherche.
                                                    </p>
                                                </td>
                                            </tr>
                                        ) : (
                                            users.data.map((u) => (
                                                <tr key={u.id} className="hover:bg-primary-soft/40 transition-colors">
                                                    <td className="px-4 py-3.5 whitespace-nowrap">
                                                        <div className="flex items-center gap-3">
                                                            {u.avatar ? (
                                                                <img
                                                                    src={u.avatar}
                                                                    alt={u.name}
                                                                    className="h-9 w-9 rounded-full object-cover border border-primary/20"
                                                                />
                                                            ) : (
                                                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold uppercase text-white">
                                                                    {u.name.substring(0, 2)}
                                                                </div>
                                                            )}
                                                            <div className="min-w-0">
                                                                <div className="font-semibold text-on-surface truncate">
                                                                    {u.name}
                                                                </div>
                                                                <div className="text-[10px] text-gray-500 truncate">
                                                                    {u.email}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3.5 whitespace-nowrap">
                                                        <span className="rounded-md bg-primary-soft border border-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary uppercase">
                                                            {formatRole(u.role)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3.5 text-xs text-gray-600">
                                                        {u.project?.name ||
                                                            (u.site ? `Site ${u.site.name}` : '—')}
                                                    </td>
                                                    <td className="px-4 py-3.5 whitespace-nowrap">
                                                        <span
                                                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                                                                u.status === 'active'
                                                                    ? 'bg-success-soft text-success-dark'
                                                                    : 'bg-error-soft text-error-dark'
                                                            }`}
                                                        >
                                                            <span
                                                                className={`h-1.5 w-1.5 rounded-full ${
                                                                    u.status === 'active'
                                                                        ? 'bg-success'
                                                                        : 'bg-error'
                                                                }`}
                                                            />
                                                            {u.status === 'active' ? 'Actif' : 'Bloqué'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Link
                                                                href={route('admin.users.edit', u.id)}
                                                                className="p-1.5 text-primary hover:bg-primary-soft rounded-md transition"
                                                                title="Éditer"
                                                            >
                                                                <Pencil className="w-3.5 h-3.5" />
                                                            </Link>
                                                            {u.id !== auth.user.id && (
                                                                <>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleToggleStatus(u)}
                                                                        className="p-1.5 text-tertiary hover:bg-tertiary-soft rounded-md transition"
                                                                        title={
                                                                            u.status === 'active'
                                                                                ? 'Désactiver'
                                                                                : 'Activer'
                                                                        }
                                                                    >
                                                                        <Power className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleDelete(u)}
                                                                        className="p-1.5 text-error hover:bg-error-soft rounded-md transition"
                                                                        title="Supprimer"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {users.data.length > 0 && (
                                <div className="flex items-center justify-between border-t border-outline-soft p-3 text-xs text-gray-500 bg-surface-muted/40">
                                    <span>
                                        Affichage de <strong className="text-on-surface">{users.from}</strong> à{' '}
                                        <strong className="text-on-surface">{users.to}</strong> sur{' '}
                                        <strong className="text-on-surface">{users.total}</strong>
                                    </span>
                                    <div className="flex gap-1">
                                        {users.links.map((link, i) => {
                                            const isPrev = link.label.includes('Previous') || link.label.includes('Précédent');
                                            const isNext = link.label.includes('Next') || link.label.includes('Suivant');
                                            return (
                                                <Link
                                                    key={i}
                                                    href={link.url || '#'}
                                                    preserveScroll
                                                    className={`inline-flex items-center justify-center rounded-md px-2.5 py-1.5 min-w-[32px] transition ${
                                                        link.active
                                                            ? 'bg-primary text-white font-bold'
                                                            : link.url
                                                              ? 'hover:bg-gray-100 text-gray-700'
                                                              : 'cursor-not-allowed text-gray-300'
                                                    }`}
                                                >
                                                    {isPrev ? (
                                                        <ChevronLeft className="w-3.5 h-3.5" />
                                                    ) : isNext ? (
                                                        <ChevronRight className="w-3.5 h-3.5" />
                                                    ) : (
                                                        <span
                                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                                        />
                                                    )}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Colonne droite */}
                    <div className="xl:col-span-4 space-y-4">
                        <div className="bg-white border border-outline-soft rounded-lg p-5 shadow-card space-y-3">
                            <h2 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-2 border-b border-outline-soft pb-2.5">
                                <Lock className="w-4 h-4 text-primary" />
                                <span>Contrôle d'Accès</span>
                            </h2>
                            <p className="text-xs text-gray-600 leading-relaxed">
                                Les comptes sont exclusivement créés par l'Administrateur. La
                                connexion s'effectue via <strong>identifiant professionnel</strong> ou
                                par mot de passe temporaire.
                            </p>
                            <div className="p-3 bg-surface-muted rounded-md border border-outline-soft text-xs space-y-1">
                                <p className="font-semibold text-on-surface flex items-center gap-1.5">
                                    <ShieldCheck className="w-3.5 h-3.5 text-success" />
                                    Règle de sécurité active
                                </p>
                                <p className="text-[11px] text-gray-500 leading-relaxed">
                                    Pas d'auto-enregistrement public. Seuls les emails inscrits dans
                                    ce tableau sont autorisés.
                                </p>
                            </div>
                        </div>

                        <div className="bg-white border border-outline-soft rounded-lg p-5 shadow-card space-y-3">
                            <h2 className="text-xs font-bold text-on-surface uppercase tracking-wider border-b border-outline-soft pb-2.5">
                                Répartition des Rôles
                            </h2>
                            <div className="space-y-2.5 text-xs">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Staff & Coordinateurs</span>
                                    <strong className="text-on-surface text-[11px]">Initiateurs</strong>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Manager de Projet</span>
                                    <strong className="text-primary text-[11px]">1er Visa & Caisse</strong>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Manager Finances</span>
                                    <strong className="text-primary text-[11px]">Contrôle Budgétaire</strong>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Direction Générale</span>
                                    <strong className="text-tertiary text-[11px]">Approbation Finale</strong>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Caisse</span>
                                    <strong className="text-success text-[11px]">Décaissement</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}