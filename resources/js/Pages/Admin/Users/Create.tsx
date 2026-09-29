import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { Project, Site } from '@/types';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { UserPlus, Info, ArrowLeft, ShieldCheck } from 'lucide-react';

interface Props {
    projects: Project[];
    sites: Site[];
    roles: { id: number; name: string }[];
}

export default function Create({ projects, sites, roles }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        email: '',
        password: '',
        role: 'beneficiary',
        project_id: '' as string | number,
        site_id: '' as string | number,
        status: 'active',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('admin.users.store'));
    };

    const formatRole = (r: string) =>
        r.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    const isTransversal = data.role === 'admin' || data.role === 'director';

    return (
        <AppLayout
            header={
                <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Link href={route('admin.users.index')} className="hover:text-primary transition">
                        Utilisateurs
                    </Link>
                    <span>/</span>
                    <span className="text-on-surface font-semibold">Nouveau compte</span>
                </div>
            }
        >
            <Head title="Créer un Utilisateur" />

            <div className="py-2">
                <div className="mx-auto max-w-3xl space-y-6">
                    {/* En-tête de page */}
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary-soft flex items-center justify-center shrink-0">
                                <UserPlus className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-on-surface">
                                    Créer un Nouveau Compte
                                </h1>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Renseignez les informations de l'agent et son affectation.
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
                        {/* Section 1 : Identité */}
                        <section className="space-y-5">
                            <div className="flex items-center gap-2 border-b border-outline-soft pb-2.5">
                                <span className="w-6 h-6 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                                    1
                                </span>
                                <h2 className="text-sm font-bold text-on-surface uppercase tracking-wide">
                                    Identité de l'agent
                                </h2>
                            </div>

                            <div>
                                <InputLabel htmlFor="name" value="Nom complet" />
                                <TextInput
                                    id="name"
                                    className="mt-1.5 block w-full border-outline-variant text-sm p-2.5 rounded-md focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="ex : Jean-Paul Ilunga"
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
                                    placeholder="nom@bonpasteur.org"
                                    required
                                />
                                <InputError message={errors.email} className="mt-1" />
                            </div>

                            <div>
                                <InputLabel htmlFor="password" value="Mot de passe initial" />
                                <TextInput
                                    id="password"
                                    type="password"
                                    className="mt-1.5 block w-full border-outline-variant text-sm p-2.5 rounded-md focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    placeholder="••••••••"
                                    required
                                />
                                <p className="text-[11px] text-gray-500 mt-1.5 flex items-center gap-1">
                                    <Info className="w-3 h-3" />
                                    L'agent pourra modifier ce mot de passe dès sa première connexion.
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
                                {processing ? 'Enregistrement…' : 'Enregistrer l\'Utilisateur'}
                            </PrimaryButton>
                        </div>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}