import { Link, useForm } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { PageProps } from '@/types';
import {
    Users,
    ShieldCheck,
    Building2,
    Lock,
    Save,
} from 'lucide-react';

interface OptionItem {
    id: string;
    name: string;
}

interface CashRegisterItem {
    id: string;
    name: string;
    code?: string;
    devise?: string;
}

interface TargetUserData {
    id: string;
    name: string;
    email: string;
    role: string;
    status: 'active' | 'inactive';
    project_id?: string | null;
    site_id?: string | null;
    is_director_interim?: boolean;
    cash_register_ids?: string[];
}

type RoleItem = string | { id: number | string; name: string };

interface Props extends PageProps {
    user?: TargetUserData;
    targetUser?: TargetUserData;
    projects?: OptionItem[];
    sites?: OptionItem[];
    cashRegisters?: CashRegisterItem[];
    roles?: RoleItem[];
}

export default function UsersEdit({
    user: propUser,
    targetUser: propTargetUser,
    projects = [],
    sites = [],
    cashRegisters = [],
    roles = [],
}: Props) {
    const currentUser = propUser || propTargetUser;

    const form = useForm<{
        name: string;
        email: string;
        password: string;
        role: string;
        status: 'active' | 'inactive';
        project_id: string;
        site_id: string;
        is_director_interim: boolean;
        cash_register_ids: string[];
    }>({
        name: currentUser?.name ?? '',
        email: currentUser?.email ?? '',
        password: '',
        role: currentUser?.role ?? 'beneficiary',
        status: currentUser?.status ?? 'active',
        project_id: currentUser?.project_id ?? '',
        site_id: currentUser?.site_id ?? '',
        is_director_interim: Boolean(currentUser?.is_director_interim),
        cash_register_ids: currentUser?.cash_register_ids ?? [],
    });

    if (!currentUser) {
        return (
            <AppLayout>
                <div className="max-w-3xl mx-auto p-6 bg-white border border-[#B2BED6] rounded text-center text-xs text-gray-500">
                    Chargement des données de l'utilisateur...
                </div>
            </AppLayout>
        );
    }

    const toggleCaisse = (id: string) => {
        const current = [...form.data.cash_register_ids];
        const index = current.indexOf(id);
        if (index > -1) {
            current.splice(index, 1);
        } else {
            current.push(id);
        }
        form.setData('cash_register_ids', current);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.put(route('admin.users.update', currentUser.id));
    };

    const getRoleName = (r: RoleItem): string => {
        return typeof r === 'string' ? r : r.name;
    };

    return (
        <AppLayout>
            <div className="max-w-3xl mx-auto space-y-6">
                <header className="flex items-center justify-between border-b pb-4">
                    <div>
                        <nav className="text-[10px] font-bold uppercase tracking-widest text-[#B2BED6] mb-1.5 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-[#04326D]" />
                            <span>Administration</span>
                            <span className="mx-1">/</span>
                            <span className="text-[#04326D]">Modifier Utilisateur</span>
                        </nav>
                        <h1 className="text-xl font-bold text-[#0B192C]">
                            Compte : {currentUser.name}
                        </h1>
                    </div>
                    <Link
                        href={route('admin.users.index')}
                        className="px-3 py-1.5 border border-[#B2BED6] rounded text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
                    >
                        Retour
                    </Link>
                </header>

                <form onSubmit={handleSubmit} className="bg-white border border-[#B2BED6] rounded p-6 shadow-sm space-y-5 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block font-bold text-gray-700 mb-1">Nom Complet *</label>
                            <input
                                type="text"
                                value={form.data.name}
                                onChange={(e) => form.setData('name', e.target.value)}
                                className="w-full border border-[#B2BED6] rounded p-2 text-xs focus:outline-none focus:border-[#04326D]"
                                required
                            />
                            {form.errors.name && <p className="text-[10px] text-red-600 mt-1">{form.errors.name}</p>}
                        </div>

                        <div>
                            <label className="block font-bold text-gray-700 mb-1">Adresse Email *</label>
                            <input
                                type="email"
                                value={form.data.email}
                                onChange={(e) => form.setData('email', e.target.value)}
                                className="w-full border border-[#B2BED6] rounded p-2 text-xs focus:outline-none focus:border-[#04326D]"
                                required
                            />
                            {form.errors.email && <p className="text-[10px] text-red-600 mt-1">{form.errors.email}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block font-bold text-gray-700 mb-1">
                                Nouveau Mot de Passe
                            </label>
                            <div className="relative">
                                <Lock className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                    type="password"
                                    placeholder="Laisser vide pour ne pas changer"
                                    value={form.data.password}
                                    onChange={(e) => form.setData('password', e.target.value)}
                                    className="w-full pl-8 pr-3 py-2 border border-[#B2BED6] rounded text-xs focus:outline-none focus:border-[#04326D]"
                                />
                            </div>
                            {form.errors.password && <p className="text-[10px] text-red-600 mt-1">{form.errors.password}</p>}
                        </div>

                        <div>
                            <label className="block font-bold text-gray-700 mb-1">Rôle Système *</label>
                            <select
                                value={form.data.role}
                                onChange={(e) => form.setData('role', e.target.value)}
                                className="w-full border border-[#B2BED6] rounded p-2 text-xs font-bold text-[#0B192C] bg-white focus:outline-none focus:border-[#04326D]"
                                required
                            >
                                {roles.map((r, i) => {
                                    const rName = getRoleName(r);
                                    return (
                                        <option key={i} value={rName}>
                                            {rName.replace('_', ' ').toUpperCase()}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>

                        <div>
                            <label className="block font-bold text-gray-700 mb-1">Statut du Compte *</label>
                            <select
                                value={form.data.status}
                                onChange={(e) => form.setData('status', e.target.value as 'active' | 'inactive')}
                                className="w-full border border-[#B2BED6] rounded p-2 text-xs font-bold focus:outline-none focus:border-[#04326D]"
                            >
                                <option value="active">Actif</option>
                                <option value="inactive">Désactivé (Bloqué)</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
                        <div>
                            <label className="block font-bold text-gray-700 mb-1">Projet de Rattachement</label>
                            <select
                                value={form.data.project_id}
                                onChange={(e) => form.setData('project_id', e.target.value)}
                                className="w-full border border-[#B2BED6] rounded p-2 text-xs focus:outline-none focus:border-[#04326D]"
                            >
                                <option value="">Aucun projet spécifique</option>
                                {projects.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block font-bold text-gray-700 mb-1">Site Opérationnel</label>
                            <select
                                value={form.data.site_id}
                                onChange={(e) => form.setData('site_id', e.target.value)}
                                className="w-full border border-[#B2BED6] rounded p-2 text-xs focus:outline-none focus:border-[#04326D]"
                            >
                                <option value="">Aucun site spécifique</option>
                                {sites.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {form.data.role === 'admin_manager' && (
                        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded space-y-1.5">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={form.data.is_director_interim}
                                    onChange={(e) => form.setData('is_director_interim', e.target.checked)}
                                    className="rounded border-emerald-600 text-emerald-700 focus:ring-emerald-700 w-4 h-4"
                                />
                                <span className="font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                                    Déléguer l'Intérim de la Direction Générale (Pour Ordre / Intérim)
                                </span>
                            </label>
                            <p className="text-[11px] text-emerald-800 leading-snug pl-6">
                                Le PAM habilité aura accès à la supervision de la Direction et pourra signer le Bon à Payer avec la mention officielle « Pour ordre / Intérim ».
                            </p>
                        </div>
                    )}

                    {form.data.role === 'cashier' && (
                        <div className="p-3.5 bg-blue-50 border border-blue-200 rounded space-y-2">
                            <label className="block font-bold text-[#04326D] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5" />
                                Affecter ce caissier à une ou plusieurs caisses
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {cashRegisters.length === 0 ? (
                                    <p className="text-[11px] text-gray-500 italic col-span-2">
                                        Aucune caisse active enregistrée.
                                    </p>
                                ) : (
                                    cashRegisters.map((caisse) => {
                                        const checked = form.data.cash_register_ids.includes(caisse.id);
                                        return (
                                            <label
                                                key={caisse.id}
                                                className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition ${
                                                    checked
                                                        ? 'bg-white border-[#04326D] text-[#04326D] font-bold shadow-xs'
                                                        : 'bg-white/60 border-gray-200 text-gray-700'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => toggleCaisse(caisse.id)}
                                                    className="rounded border-gray-300 text-[#04326D] focus:ring-[#04326D]"
                                                />
                                                <span className="text-[11px] truncate">
                                                    {caisse.name} {caisse.devise ? `(${caisse.devise})` : ''}
                                                </span>
                                            </label>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-3 border-t">
                        <Link
                            href={route('admin.users.index')}
                            className="px-4 py-2 border border-[#B2BED6] rounded text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"
                        >
                            Annuler
                        </Link>
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#04326D] hover:bg-[#06428f] text-white rounded text-xs font-bold shadow transition disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" />
                            <span>Enregistrer les Modifications</span>
                        </button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}