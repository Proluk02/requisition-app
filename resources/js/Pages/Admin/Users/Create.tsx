import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { Project, Site } from '@/types';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';

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

    return (
        <AppLayout
            header={<h2 className="text-xl font-bold leading-tight text-[#0B192C]">Créer un Nouveau Compte</h2>}
        >
            <Head title="Créer Utilisateur" />

            <div className="py-6">
                <div className="mx-auto max-w-3xl">
                    <div className="bg-white p-6 shadow-sm rounded border border-[#B2BED6]">
                        <form onSubmit={submit} className="space-y-5">
                            <div>
                                <InputLabel htmlFor="name" value="Nom Complet de l'Agent" />
                                <TextInput
                                    id="name"
                                    className="mt-1 block w-full border-[#B2BED6] text-xs p-2 rounded"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="ex: Jean-Paul Ilunga"
                                    required
                                />
                                <InputError message={errors.name} className="mt-1" />
                            </div>

                            <div>
                                <InputLabel htmlFor="email" value="Adresse Email Professionnelle (pour Google OAuth)" />
                                <TextInput
                                    id="email"
                                    type="email"
                                    className="mt-1 block w-full border-[#B2BED6] text-xs p-2 rounded"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    placeholder="nom@bonpasteur.org"
                                    required
                                />
                                <InputError message={errors.email} className="mt-1" />
                            </div>

                            <div>
                                <InputLabel htmlFor="password" value="Mot de passe initial (l'agent pourra le modifier)" />
                                <TextInput
                                    id="password"
                                    type="password"
                                    className="mt-1 block w-full border-[#B2BED6] text-xs p-2 rounded"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    placeholder="••••••••"
                                    required
                                />
                                <InputError message={errors.password} className="mt-1" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <InputLabel htmlFor="role" value="Rôle Attribué (Spatie RBAC)" />
                                    <select
                                        id="role"
                                        className="mt-1 block w-full border border-[#B2BED6] rounded p-2 text-xs font-bold text-[#04326D] bg-white focus:outline-none"
                                        value={data.role}
                                        onChange={(e) => {
                                            setData('role', e.target.value);
                                            setData('project_id', '');
                                            setData('site_id', '');
                                        }}
                                    >
                                        {roles.map((r) => (
                                            <option key={r.id} value={r.name}>
                                                {r.name.toUpperCase()}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError message={errors.role} className="mt-1" />
                                </div>

                                <div>
                                    <InputLabel htmlFor="status" value="Statut du Compte" />
                                    <select
                                        id="status"
                                        className="mt-1 block w-full border border-[#B2BED6] rounded p-2 text-xs text-gray-700 bg-white focus:outline-none"
                                        value={data.status}
                                        onChange={(e) => setData('status', e.target.value)}
                                    >
                                        <option value="active">Actif (Accès autorisé)</option>
                                        <option value="inactive">Bloqué / Inactif</option>
                                    </select>
                                </div>
                            </div>

                            {/* Rattachement Dynamique */}
                            <div className="p-4 bg-[#F9F9FF] rounded border border-gray-200">
                                {data.role === 'coordinator' ? (
                                    <div>
                                        <InputLabel htmlFor="site_id" value="Site d'affectation (Coordonnateur)" />
                                        <select
                                            id="site_id"
                                            className="mt-1 block w-full border border-[#B2BED6] rounded p-2 text-xs bg-white focus:outline-none"
                                            value={data.site_id}
                                            onChange={(e) => setData('site_id', e.target.value)}
                                            required
                                        >
                                            <option value="">Sélectionnez un site...</option>
                                            {sites.map((s) => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                        <InputError message={errors.site_id} className="mt-1" />
                                    </div>
                                ) : (
                                    data.role !== 'admin' && data.role !== 'director' && (
                                        <div>
                                            <InputLabel htmlFor="project_id" value="Projet d'affectation (Staff / Manager)" />
                                            <select
                                                id="project_id"
                                                className="mt-1 block w-full border border-[#B2BED6] rounded p-2 text-xs bg-white focus:outline-none"
                                                value={data.project_id}
                                                onChange={(e) => setData('project_id', e.target.value)}
                                                required
                                            >
                                                <option value="">Sélectionnez un projet...</option>
                                                {projects.map((p) => (
                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                ))}
                                            </select>
                                            <InputError message={errors.project_id} className="mt-1" />
                                        </div>
                                    )
                                )}
                                {(data.role === 'admin' || data.role === 'director') && (
                                    <p className="text-xs text-gray-500 italic">
                                        Ce rôle a une portée transversale sur l'ensemble de l'ASBL (aucun projet unique assigné).
                                    </p>
                                )}
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t">
                                <Link
                                    href={route('admin.users.index')}
                                    className="text-xs font-semibold text-gray-600 hover:underline"
                                >
                                    Annuler
                                </Link>
                                <PrimaryButton disabled={processing} className="bg-[#04326D] hover:bg-[#06428f] text-xs font-bold py-2 px-4 rounded">
                                    Enregistrer l'Utilisateur
                                </PrimaryButton>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}