import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { Project, Site } from '@/types';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';

interface Props {
    projects: Project[];
    sites: Site[];
    roles: { id: number, name: string }[];
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
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Ajouter un Utilisateur</h2>}
        >
            <Head title="Ajouter un Utilisateur" />

            <div className="py-12">
                <div className="mx-auto max-w-3xl sm:px-6 lg:px-8">
                    <div className="bg-white p-8 shadow-sm sm:rounded-lg border border-gray-100">
                        <form onSubmit={submit} className="space-y-6">
                            
                            {/* Nom Complet */}
                            <div>
                                <InputLabel htmlFor="name" value="Nom Complet" />
                                <TextInput
                                    id="name"
                                    className="mt-1 block w-full"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    required
                                />
                                <InputError message={errors.name} className="mt-2" />
                            </div>

                            {/* Email */}
                            <div>
                                <InputLabel htmlFor="email" value="Adresse Email" />
                                <TextInput
                                    id="email"
                                    type="email"
                                    className="mt-1 block w-full"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    required
                                />
                                <InputError message={errors.email} className="mt-2" />
                            </div>

                            {/* Mot de passe initial */}
                            <div>
                                <InputLabel htmlFor="password" value="Mot de passe initial" />
                                <TextInput
                                    id="password"
                                    type="password"
                                    className="mt-1 block w-full"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    required
                                />
                                <InputError message={errors.password} className="mt-2" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Rôle */}
                                <div>
                                    <InputLabel htmlFor="role" value="Rôle / Fonction" />
                                    <select
                                        id="role"
                                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                        value={data.role}
                                        onChange={(e) => {
                                            setData('role', e.target.value);
                                            setData('project_id', '');
                                            setData('site_id', '');
                                        }}
                                    >
                                        {roles.map((role) => (
                                            <option key={role.id} value={role.name}>
                                                {role.name.toUpperCase()}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError message={errors.role} className="mt-2" />
                                </div>

                                {/* Statut */}
                                <div>
                                    <InputLabel htmlFor="status" value="Statut du compte" />
                                    <select
                                        id="status"
                                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                        value={data.status}
                                        onChange={(e) => setData('status', e.target.value)}
                                    >
                                        <option value="active">Actif</option>
                                        <option value="inactive">Inactif</option>
                                    </select>
                                </div>
                            </div>

                            {/* Rattachament Dynamique */}
                            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                {data.role === 'coordinator' ? (
                                    <div>
                                        <InputLabel htmlFor="site_id" value="Affectation au Site (Coordonnateur)" />
                                        <select
                                            id="site_id"
                                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                            value={data.site_id}
                                            onChange={(e) => setData('site_id', e.target.value)}
                                            required
                                        >
                                            <option value="">Sélectionner un site...</option>
                                            {sites.map((site) => (
                                                <option key={site.id} value={site.id}>{site.name}</option>
                                            ))}
                                        </select>
                                        <InputError message={errors.site_id} className="mt-2" />
                                    </div>
                                ) : (
                                    /* Pour tous les autres rôles (Staff), on propose le Projet */
                                    data.role !== 'admin' && data.role !== 'director' && (
                                        <div>
                                            <InputLabel htmlFor="project_id" value="Affectation au Projet (Staff)" />
                                            <select
                                                id="project_id"
                                                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                                value={data.project_id}
                                                onChange={(e) => setData('project_id', e.target.value)}
                                                required
                                            >
                                                <option value="">Sélectionner un projet...</option>
                                                {projects.map((project) => (
                                                    <option key={project.id} value={project.id}>{project.name}</option>
                                                ))}
                                            </select>
                                            <InputError message={errors.project_id} className="mt-2" />
                                        </div>
                                    )
                                )}
                                {(data.role === 'admin' || data.role === 'director') && (
                                    <p className="text-sm text-gray-500 italic text-center">Aucun rattachement spécifique requis pour ce rôle.</p>
                                )}
                            </div>

                            <div className="flex items-center justify-end mt-8 gap-4">
                                <Link
                                    href={route('admin.users.index')}
                                    className="text-sm text-gray-600 underline hover:text-gray-900"
                                >
                                    Annuler
                                </Link>
                                <PrimaryButton disabled={processing}>
                                    Créer l'utilisateur
                                </PrimaryButton>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}