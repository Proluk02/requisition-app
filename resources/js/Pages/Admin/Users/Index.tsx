import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import { PageProps, User } from '@/types';
import { useState } from 'react';

interface PaginatedUsers {
    data: User[];
    links: any[];
}

interface Props extends PageProps {
    users: PaginatedUsers;
    filters: { search?: string };
}

export default function Index({ users, filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(route('admin.users.index'), { search }, { preserveState: true });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Gestion des Utilisateurs" />

            <div className="flex flex-col gap-6">
                {/* Header Page */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-on-surface">Gestion des Utilisateurs</h2>
                        <p className="text-sm text-on-surface-variant">Gérez les accès, les rôles et la sécurité du système.</p>
                    </div>
                    <div className="flex gap-3">
                        <Link href={route('admin.users.create')} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark transition">
                            + Nouvel Utilisateur
                        </Link>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                    {/* TABLEAU (8 colonnes) */}
                    <div className="xl:col-span-8 flex flex-col gap-4">
                        <div className="bg-white border border-outline-variant rounded-xl shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-outline-variant flex items-center justify-between bg-white">
                                <form onSubmit={handleSearch} className="relative w-full max-w-md">
                                    <input
                                        type="text"
                                        placeholder="Rechercher (Nom, Email...)"
                                        className="w-full rounded-lg border-outline-variant bg-surface-container-low py-2 pl-4 pr-10 text-sm focus:border-primary focus:ring-primary"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                </form>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-surface-container-low border-b border-outline-variant text-[11px] uppercase tracking-wider text-on-surface-variant font-bold">
                                        <tr>
                                            <th className="px-6 py-3">Utilisateur</th>
                                            <th className="px-6 py-3">Rôle</th>
                                            <th className="px-6 py-3">Statut</th>
                                            <th className="px-6 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-outline-variant">
                                        {users.data.map((u) => (
                                            <tr key={u.id} className="hover:bg-surface-container-lowest transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary uppercase">
                                                            {u.name.substring(0, 2)}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-on-surface">{u.name}</div>
                                                            <div className="text-[11px] text-on-surface-variant">{u.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2 py-1 rounded-md bg-surface-container border border-outline-variant text-[10px] font-bold uppercase text-on-surface-variant">
                                                        {u.role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${u.status === 'active' ? 'bg-secondary-container text-secondary' : 'bg-red-100 text-red-600'}`}>
                                                        <span className={`h-1.5 w-1.5 rounded-full ${u.status === 'active' ? 'bg-secondary' : 'bg-red-600'}`}></span>
                                                        {u.status === 'active' ? 'Actif' : 'Bloqué'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button className="text-primary font-bold text-xs hover:underline">Editer</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* WIDGETS LATERAUX (4 colonnes) */}
                    <div className="xl:col-span-4 flex flex-col gap-6">
                        {/* Carte Contrôle d'Accès */}
                        <div className="bg-white border border-outline-variant rounded-xl p-6 shadow-sm">
                            <h3 className="font-bold text-on-surface mb-4 flex items-center gap-2">
                                <span className="p-1.5 bg-primary/10 rounded-lg text-primary">🛡️</span>
                                Contrôle d'Accès
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg border border-outline-variant">
                                    <div className="text-xs">
                                        <p className="font-bold">Authentification 2FA</p>
                                        <p className="text-on-surface-variant italic">Forcer pour Admin</p>
                                    </div>
                                    <div className="h-5 w-9 bg-primary rounded-full flex items-center px-1">
                                        <div className="h-3 w-3 bg-white rounded-full ml-auto"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Alertes Système */}
                        <div className="bg-white border border-outline-variant rounded-xl shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-outline-variant bg-surface-container-low flex items-center justify-between">
                                <h3 className="font-bold text-sm">Alertes Système</h3>
                                <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">3 Nv.</span>
                            </div>
                            <div className="p-4 space-y-4">
                                <div className="border-l-4 border-red-600 pl-3 py-1">
                                    <p className="text-[10px] font-bold text-red-600 uppercase">Urgent</p>
                                    <p className="text-xs text-on-surface">Tentatives de connexion échouées sur compte S.Kalala.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}