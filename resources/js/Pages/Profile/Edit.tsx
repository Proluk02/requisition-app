import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { Head } from '@inertiajs/react';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';
import { UserCircle2, ChevronRight, Settings } from 'lucide-react';

export default function Edit({
    mustVerifyEmail,
    status,
}: PageProps<{ mustVerifyEmail: boolean; status?: string }>) {
    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Settings className="w-3.5 h-3.5" />
                    <span>Mon compte</span>
                    <ChevronRight className="w-3 h-3" />
                    <span className="text-on-surface font-semibold">Profil</span>
                </div>
            }
        >
            <Head title="Mon Profil" />

            <div className="space-y-6">
                {/* En-tête de page */}
                <div className="flex items-start gap-3 border-b border-outline-soft pb-5">
                    <div className="w-10 h-10 rounded-lg bg-primary-soft flex items-center justify-center shrink-0">
                        <UserCircle2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-on-surface">
                            Mon Profil
                        </h1>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Gérez vos informations personnelles, votre mot de passe et la
                            sécurité de votre compte.
                        </p>
                    </div>
                </div>

                {/* Contenu — une colonne centrée */}
                <div className="mx-auto max-w-2xl space-y-6">
                    {/* Section 1 : Informations personnelles */}
                    <div className="bg-white p-6 sm:p-8 shadow-card rounded-lg border border-outline-soft">
                        <UpdateProfileInformationForm
                            mustVerifyEmail={mustVerifyEmail}
                            status={status}
                        />
                    </div>

                    {/* Section 2 : Mot de passe */}
                    <div className="bg-white p-6 sm:p-8 shadow-card rounded-lg border border-outline-soft">
                        <UpdatePasswordForm />
                    </div>

                    {/* Section 3 : Suppression du compte */}
                    <div className="bg-white p-6 sm:p-8 shadow-card rounded-lg border border-error/20">
                        <DeleteUserForm />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}