import { useEffect, useRef, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { PageProps, User } from '@/types';

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

    return (
        <AppLayout>
            <Head title="Gestion des Utilisateurs" />

            <div className="flex flex-col gap-6">
                {/* En-tête */}
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center border-b border-[#E2E8F0] pb-4">
                    <div>
                        <h1 className="text-xl font-bold text-[#0B192C]">Gestion des Utilisateurs</h1>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {users.total} compte{users.total > 1 ? 's' : ''} enregistré{users.total > 1 ? 's' : ''} au sein de l'organisation
                        </p>
                    </div>
                    <Link
                        href={route('admin.users.create')}
                        className="inline-flex items-center gap-2 rounded bg-[#04326D] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#06428f] transition"
                    >
                        <span>+</span>
                        <span>Nouvel Utilisateur</span>
                    </Link>
                </div>

                {/* GRILLE BENTO : TABLEAU (SPAN 8) + BLOC SÉCURITÉ & ALERTES (SPAN 4) */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                    
                    {/* Colonne Gauche : Tableau et Filtres */}
                    <div className="xl:col-span-8 space-y-4">
                        <div className="rounded border border-[#B2BED6] bg-white shadow-sm overflow-hidden">
                            {/* Filtres */}
                            <div className="flex flex-wrap items-center gap-2.5 border-b border-[#E2E8F0] p-3 text-xs bg-white">
                                <input
                                    type="text"
                                    placeholder="Rechercher nom, email..."
                                    className="min-w-[200px] flex-1 rounded border-[#B2BED6] p-1.5 text-xs focus:border-[#04326D] focus:outline-none"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />

                                <select
                                    className="rounded border-[#B2BED6] p-1.5 text-xs text-gray-700 bg-white focus:outline-none"
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                >
                                    <option value="">Tous les rôles</option>
                                    {roles.map((r) => (
                                        <option key={r.id} value={r.name}>{r.name.toUpperCase()}</option>
                                    ))}
                                </select>

                                <select
                                    className="rounded border-[#B2BED6] p-1.5 text-xs text-gray-700 bg-white focus:outline-none"
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                >
                                    <option value="">Tous les statuts</option>
                                    <option value="active">Actif</option>
                                    <option value="inactive">Bloqué / Inactif</option>
                                </select>

                                <select
                                    className="rounded border-[#B2BED6] p-1.5 text-xs text-gray-700 bg-white focus:outline-none"
                                    value={projectId}
                                    onChange={(e) => setProjectId(e.target.value)}
                                >
                                    <option value="">Tous les projets</option>
                                    {projects.map((p) => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>

                                {hasActiveFilters && (
                                    <button
                                        onClick={resetFilters}
                                        className="text-xs font-semibold text-red-600 hover:underline px-2"
                                    >
                                        Effacer
                                    </button>
                                )}
                            </div>

                            {/* Tableau */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-[#0B192C] text-white uppercase text-[10px] font-bold tracking-wider">
                                            <th className="px-4 py-3">Utilisateur</th>
                                            <th className="px-4 py-3">Rôle Spatie</th>
                                            <th className="px-4 py-3">Affectation Projet / Site</th>
                                            <th className="px-4 py-3">Statut</th>
                                            <th className="px-4 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#E2E8F0] text-gray-700">
                                        {users.data.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic">
                                                    Aucun utilisateur ne correspond aux critères.
                                                </td>
                                            </tr>
                                        ) : (
                                            users.data.map((u) => (
                                                <tr key={u.id} className="hover:bg-[#F9F9FF] transition">
                                                    <td className="px-4 py-3.5 whitespace-nowrap">
                                                        <div className="flex items-center gap-3">
                                                            {u.avatar ? (
                                                                <img
                                                                    src={u.avatar}
                                                                    alt={u.name}
                                                                    className="h-8 w-8 rounded-full object-cover border border-[#04326D]"
                                                                />
                                                            ) : (
                                                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#04326D] text-xs font-bold uppercase text-white">
                                                                    {u.name.substring(0, 2)}
                                                                </div>
                                                            )}
                                                            <div>
                                                                <div className="font-bold text-[#0B192C]">{u.name}</div>
                                                                <div className="text-[10px] text-gray-500">{u.email}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3.5 whitespace-nowrap">
                                                        <span className="rounded bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-mono font-bold text-[#04326D] uppercase">
                                                            {u.role}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3.5 text-xs text-gray-600">
                                                        {u.project?.name || (u.site ? `Site ${u.site.name}` : '—')}
                                                    </td>
                                                    <td className="px-4 py-3.5 whitespace-nowrap">
                                                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                                            u.status === 'active' 
                                                                ? 'bg-emerald-50 text-[#065F46]' 
                                                                : 'bg-red-50 text-red-700'
                                                        }`}>
                                                            <span className={`h-1.5 w-1.5 rounded-full ${u.status === 'active' ? 'bg-[#10B981]' : 'bg-[#DC2626]'}`}></span>
                                                            {u.status === 'active' ? 'Actif' : 'Bloqué'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                                                        <div className="flex items-center justify-end gap-2.5">
                                                            <Link
                                                                href={route('admin.users.edit', u.id)}
                                                                className="text-xs font-bold text-[#04326D] hover:underline"
                                                            >
                                                                Éditer
                                                            </Link>
                                                            {u.id !== auth.user.id && (
                                                                <>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleToggleStatus(u)}
                                                                        className="text-xs font-bold text-[#F58F20] hover:underline"
                                                                    >
                                                                        {u.status === 'active' ? 'Désactiver' : 'Activer'}
                                                                    </button>
                                                                    <button
                                                                        type="button"
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
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {users.data.length > 0 && (
                                <div className="flex items-center justify-between border-t border-[#E2E8F0] p-3 text-xs text-gray-500">
                                    <span>
                                        Affichage de {users.from} à {users.to} sur {users.total} utilisateurs
                                    </span>
                                    <div className="flex gap-1">
                                        {users.links.map((link, i) => (
                                            <Link
                                                key={i}
                                                href={link.url || '#'}
                                                preserveScroll
                                                className={`rounded px-2.5 py-1 ${
                                                    link.active
                                                        ? 'bg-[#04326D] text-white font-bold'
                                                        : link.url
                                                          ? 'hover:bg-gray-100 text-gray-700'
                                                          : 'cursor-not-allowed text-gray-300'
                                                }`}
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Colonne Droite : Contrôle d'Accès & Sécurité (Style Bento) */}
                    <div className="xl:col-span-4 space-y-4">
                        <div className="bg-white border border-[#B2BED6] rounded p-5 shadow-sm space-y-3">
                            <h2 className="text-xs font-bold text-[#0B192C] uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
                                <svg className="w-4 h-4 text-[#04326D]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                <span>Contrôle d'Accès & Connexion</span>
                            </h2>
                            <p className="text-xs text-gray-600 leading-relaxed">
                                Les comptes sont exclusivement créés par l'Administrateur. La connexion s'effectue via <strong>Google OAuth</strong> ou par mot de passe temporaire.
                            </p>
                            <div className="p-3 bg-gray-50 rounded border border-gray-200 text-xs space-y-1">
                                <p className="font-bold text-[#0B192C]">Règle de sécurité active :</p>
                                <p className="text-[11px] text-gray-500">Pas d'auto-enregistrement public. Seuls les emails inscrits dans ce tableau sont autorisés.</p>
                            </div>
                        </div>

                        <div className="bg-white border border-[#B2BED6] rounded p-5 shadow-sm space-y-3">
                            <h2 className="text-xs font-bold text-[#0B192C] uppercase tracking-wider border-b pb-2">
                                Répartition des Rôles
                            </h2>
                            <div className="space-y-1.5 text-xs">
                                <div className="flex justify-between text-gray-600">
                                    <span>Staff & Coordinateurs :</span>
                                    <strong className="text-[#0B192C]">Initiateurs</strong>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                    <span>Manager de Projet :</span>
                                    <strong className="text-[#04326D]">1er Visa & Caisse</strong>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                    <span>Manager Finances :</span>
                                    <strong className="text-[#04326D]">Contrôle Budgétaire</strong>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                    <span>Directrice Générale :</span>
                                    <strong className="text-[#F58F20]">Approbation Finale</strong>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                    <span>Caisse :</span>
                                    <strong className="text-[#10B981]">Décaissement</strong>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </AppLayout>
    );
}