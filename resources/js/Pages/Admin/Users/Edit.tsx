import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { UserCog, Info, ArrowLeft, ShieldCheck, KeyRound } from 'lucide-react';

interface Project {
    id: string;
    name: string;
}
interface Site {
    id: string;
    name: string;
}
interface Role {
    id: number;
    name: string;
}

interface EditableUser {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    avatar?: string;
    project_id: string | null;
    site_id: string | null;
}

interface Props {
    user: EditableUser;
    projects: Project[];
    sites: Site[];
    roles: Role[];
}

export default function Edit({ user, projects, sites, roles }: Props) {
    const { data, setData, put, processing, errors } = useForm({
        name: user.name,
        email: user.email,
        password: '',
        role: user.role,
        project_id: user.project_id ?? ('' as string | number),
        site_id: user.site_id ?? ('' as string | number),
        status: user.status,
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        put(route('admin.users.update', user.id));
    };

    const formatRole = (r: string) =>
        r.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    const isTransversal = data.role === 'admin' || data.role === 'director';

    const initials = user.name
        .split(/\s+/)
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

    return (
        <AppLayout
            header={
                <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Link href={route('admin.users.index')} className="hover:text-primary transition">
                        Utilisateurs
                    </Link>
                    <span>/</span>
                    <span className="text-on-surface font-semibold">Modifier le compte</span>
                </div>
            }
        >
            <Head title={`Modifier ${user.name}`} />

            <div className="py-2">
                <div className="mx-auto max-w-3xl space-y-6">
                    {/* En-tête */}
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary-soft flex items-center justify-center shrink-0">
                                <UserCog className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-on-surface">
                                    Modifier {user.name}
                                </h1>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Mettez à jour les informations du compte ou son affectation.
                                </p>
                            </div>
                        </div>
                        <Link
                            href={route('admin.users.index')}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-primary transition"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            Retour
                        </Link>
                    </div>

                    <form
                        onSubmit={submit}
                        className="bg-white p-6 sm:p-8 shadow-card rounded-lg border border-outline-soft space-y-8"
                    >
                        {/* Aperçu utilisateur */}
                        <div className="flex items-center gap-4 p-4 bg-surface-muted rounded-lg border border-outline-soft">
                            {user.avatar ? (
                                <img
                                    src={user.avatar}
                                    alt={user.name}
                                    className="w-14 h-14 rounded-full object-cover border-2 border-primary/20"
                                />
                            ) : (
                                <div className="w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center font-bold text-base">
                                    {initials}
                                </div>
                            )}
                            <div className="min-w-0">
                                <h3 className="font-bold text-on-surface text-sm truncate">
                                    {user.name}
                                </h3>
                                <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                <span className="inline-block mt-1.5 px-2 py-0.5 bg-primary-soft border border-primary/15 rounded text-[10px] font-semibold text-primary uppercase">
                                    {formatRole(user.role)}
                                </span>
                            </div>
                        </div>

                        {/* Section 1 : Identité */}
                        <section className="space-y-5">
                            <div className="flex items-center gap-2 border-b border-outline-soft pb-2.5">
                                <span className="w-6 h-6 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                                    1
                                </span>
                                <h2 className="text-sm font-bold text-on-surface uppercase tracking-wide">
                                    Informations personnelles
                                </h2>
                            </div>

                            <div>
                                <InputLabel htmlFor="name" value="Nom complet" />
                                <TextInput
                                    id="name"
                                    className="mt-1.5 block w-full border-outline-variant text-sm p-2.5 rounded-md focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    required
                                />
                                <InputError message={errors.name} className="mt-1" />
                            </div>

                            <div>
                                <InputLabel htmlFor="email" value="Adresse email professionnelle" />
                                <TextInput
                                    id="email"
                                    type="email"
                                    className="mt-1.5 block w-full border-outline-variant text-sm p-2.5 rounded-md focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    required
                                />
                                <InputError message={errors.email} className="mt-1" />
                            </div>

                            <div>
                                <InputLabel
                                    htmlFor="password"
                                    value="Nouveau mot de passe (optionnel)"
                                />
                                <div className="relative mt-1.5">
                                    <KeyRound className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                    <TextInput
                                        id="password"
                                        type="password"
                                        className="block w-full border-outline-variant text-sm pl-8 pr-3 py-2.5 rounded-md focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                                        value={data.password}
                                        onChange={(e) => setData('password', e.target.value)}
                                        placeholder="••••••••"
                                    />
                                </div>
                                <p className="text-[11px] text-gray-500 mt-1.5 flex items-center gap-1">
                                    <Info className="w-3 h-3" />
                                    Laissez vide pour conserver le mot de passe actuel.
                                </p>
                                <InputError message={errors.password} className="mt-1" />
                            </div>
                        </section>

                        {/* Section 2 : Rôle & statut */}
                        <section className="space-y-5">
                            <div className="flex items-center gap-2 border-b border-outline-soft pb-2.5">
                                <span className="w-6 h-6 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                                    2
                                </span>
                                <h2 className="text-sm font-bold text-on-surface uppercase tracking-wide">
                                    Rôle & statut
                                </h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <InputLabel htmlFor="role" value="Rôle attribué" />
                                    <select
                                        id="role"
                                        className="mt-1.5 block w-full border border-outline-variant rounded-md p-2.5 text-sm font-semibold text-primary bg-white focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none transition"
                                        value={data.role}
                                        onChange={(e) => {
                                            setData('role', e.target.value);
                                            setData('project_id', '');
                                            setData('site_id', '');
                                        }}
                                    >
                                        {roles.map((r) => (
                                            <option key={r.id} value={r.name}>
                                                {formatRole(r.name)}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError message={errors.role} className="mt-1" />
                                </div>

                                <div>
                                    <InputLabel htmlFor="status" value="Statut du compte" />
                                    <select
                                        id="status"
                                        className="mt-1.5 block w-full border border-outline-variant rounded-md p-2.5 text-sm text-gray-700 bg-white focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none transition"
                                        value={data.status}
                                        onChange={(e) => setData('status', e.target.value)}
                                    >
                                        <option value="active">Actif — accès autorisé</option>
                                        <option value="inactive">Bloqué — accès refusé</option>
                                    </select>
                                </div>
                            </div>
                        </section>

                        {/* Section 3 : Affectation */}
                        <section className="space-y-5">
                            <div className="flex items-center gap-2 border-b border-outline-soft pb-2.5">
                                <span className="w-6 h-6 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                                    3
                                </span>
                                <h2 className="text-sm font-bold text-on-surface uppercase tracking-wide">
                                    Affectation
                                </h2>
                            </div>

                            <div className="p-4 bg-surface-muted rounded-lg border border-outline-soft">
                                {data.role === 'coordinator' ? (
                                    <div>
                                        <InputLabel
                                            htmlFor="site_id"
                                            value="Site d'affectation (Coordonnateur)"
                                        />
                                        <select
                                            id="site_id"
                                            className="mt-1.5 block w-full border border-outline-variant rounded-md p-2.5 text-sm bg-white focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none transition"
                                            value={data.site_id}
                                            onChange={(e) => setData('site_id', e.target.value)}
                                            required
                                        >
                                            <option value="">Sélectionnez un site…</option>
                                            {sites.map((s) => (
                                                <option key={s.id} value={s.id}>
                                                    {s.name}
                                                </option>
                                            ))}
                                        </select>
                                        <InputError message={errors.site_id} className="mt-1" />
                                    </div>
                                ) : !isTransversal ? (
                                    <div>
                                        <InputLabel
                                            htmlFor="project_id"
                                            value="Projet d'affectation"
                                        />
                                        <select
                                            id="project_id"
                                            className="mt-1.5 block w-full border border-outline-variant rounded-md p-2.5 text-sm bg-white focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none transition"
                                            value={data.project_id}
                                            onChange={(e) => setData('project_id', e.target.value)}
                                            required
                                        >
                                            <option value="">Sélectionnez un projet…</option>
                                            {projects.map((p) => (
                                                <option key={p.id} value={p.id}>
                                                    {p.name}
                                                </option>
                                            ))}
                                        </select>
                                        <InputError message={errors.project_id} className="mt-1" />
                                    </div>
                                ) : (
                                    <div className="flex items-start gap-2 text-xs text-gray-600">
                                        <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                        <p className="leading-relaxed">
                                            Ce rôle a une portée transversale sur l'ensemble de
                                            l'ASBL. Aucun projet spécifique n'est requis.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-soft">
                            <Link
                                href={route('admin.users.index')}
                                className="text-xs font-semibold text-gray-600 hover:text-on-surface px-3 py-2 rounded-md hover:bg-gray-100 transition"
                            >
                                Annuler
                            </Link>
                            <PrimaryButton
                                disabled={processing}
                                className="bg-primary hover:bg-primary-light text-white text-xs font-semibold py-2.5 px-5 rounded-md shadow-sm hover:shadow-md transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {processing ? 'Enregistrement…' : 'Enregistrer les Modifications'}
                            </PrimaryButton>
                        </div>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}