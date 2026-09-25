import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
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

    return (
        <AppLayout
            header={<h2 className="text-xl font-bold leading-tight text-[#0B192C]">Modifier {user.name}</h2>}
        >
            <Head title={`Modifier ${user.name}`} />

            <div className="py-6">
                <div className="mx-auto max-w-3xl">
                    <div className="bg-white p-6 shadow-sm rounded border border-[#B2BED6]">
                        
                        {/* Aperçu Avatar si existant */}
                        <div className="flex items-center gap-3 border-b pb-4 mb-4">
                            {user.avatar ? (
                                <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full object-cover border border-[#04326D]" />
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-[#04326D] text-white flex items-center justify-center font-bold text-sm">
                                    {user.name.substring(0, 2).toUpperCase()}
                                </div>
                            )}
                            <div>
                                <h3 className="font-bold text-[#0B192C] text-sm">{user.name}</h3>
                                <p className="text-xs text-gray-500">{user.email}</p>
                            </div>
                        </div>

                        <form onSubmit={submit} className="space-y-5">
                            <div>
                                <InputLabel htmlFor="name" value="Nom Complet" />
                                <TextInput
                                    id="name"
                                    className="mt-1 block w-full border-[#B2BED6] text-xs p-2 rounded"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    required
                                />
                                <InputError message={errors.name} className="mt-1" />
                            </div>

                            <div>
                                <InputLabel htmlFor="email" value="Adresse Email" />
                                <TextInput
                                    id="email"
                                    type="email"
                                    className="mt-1 block w-full border-[#B2BED6] text-xs p-2 rounded"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    required
                                />
                                <InputError message={errors.email} className="mt-1" />
                            </div>

                            <div>
                                <InputLabel htmlFor="password" value="Nouveau mot de passe (laisser vide pour conserver l'actuel)" />
                                <TextInput
                                    id="password"
                                    type="password"
                                    className="mt-1 block w-full border-[#B2BED6] text-xs p-2 rounded"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    placeholder="••••••••"
                                />
                                <InputError message={errors.password} className="mt-1" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <InputLabel htmlFor="role" value="Rôle Attribué" />
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
                                        <option value="active">Actif</option>
                                        <option value="inactive">Inactif</option>
                                    </select>
                                </div>
                            </div>

                            {/* Affectation */}
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
                                            <InputLabel htmlFor="project_id" value="Projet d'affectation" />
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
                                        Rôle transversal sans projet unique assigné.
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
                                    Enregistrer les Modifications
                                </PrimaryButton>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}