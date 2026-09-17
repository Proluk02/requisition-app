import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';

interface Project { id: string; name: string; }
interface Site { id: string; name: string; }
interface Role { id: number; name: string; }

interface EditableUser {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
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

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800 dark:text-gray-100">Modifier {user.name}</h2>}
        >
            <Head title={`Modifier ${user.name}`} />

            <div className="py-12">
                <div className="mx-auto max-w-3xl sm:px-6 lg:px-8">
                    <div className="rounded-lg border border-gray-100 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                        <form onSubmit={submit} className="space-y-6">
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

                            <div>
                                <InputLabel htmlFor="password" value="Nouveau mot de passe (laisser vide pour ne pas changer)" />
                                <TextInput
                                    id="password"
                                    type="password"
                                    className="mt-1 block w-full"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    placeholder="••••••••"
                                />
                                <InputError message={errors.password} className="mt-2" />
                            </div>

                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <div>
                                    <InputLabel htmlFor="role" value="Rôle / Fonction" />
                                    <select
                                        id="role"
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
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

                                <div>
                                    <InputLabel htmlFor="status" value="Statut du compte" />
                                    <select
                                        id="status"
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                        value={data.status}
                                        onChange={(e) => setData('status', e.target.value)}
                                    >
                                        <option value="active">Actif</option>
                                        <option value="inactive">Inactif</option>
                                    </select>
                                </div>
                            </div>

                            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
                                {data.role === 'coordinator' ? (
                                    <div>
                                        <InputLabel htmlFor="site_id" value="Affectation au Site (Coordonnateur)" />
                                        <select
                                            id="site_id"
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
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
                                    data.role !== 'admin' && data.role !== 'director' && (
                                        <div>
                                            <InputLabel htmlFor="project_id" value="Affectation au Projet (Staff)" />
                                            <select
                                                id="project_id"
                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
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
                                    <p className="text-center text-sm italic text-gray-500 dark:text-gray-400">
                                        Aucun rattachement spécifique requis pour ce rôle.
                                    </p>
                                )}
                            </div>

                            <div className="mt-8 flex items-center justify-end gap-4">
                                <Link
                                    href={route('admin.users.index')}
                                    className="text-sm text-gray-600 underline hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                    Annuler
                                </Link>
                                <PrimaryButton disabled={processing}>
                                    Enregistrer les modifications
                                </PrimaryButton>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}