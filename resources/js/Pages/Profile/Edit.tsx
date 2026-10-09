import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { Head } from '@inertiajs/react';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';
import UpdateSignaturePinForm from './Partials/UpdateSignaturePinForm';
import { UserCircle2, ChevronRight, Settings } from 'lucide-react';

interface Props extends PageProps {
    mustVerifyEmail: boolean;
    status?: string;
    hasPin: boolean;
    pinSetAt?: string;
}

export default function Edit({
    mustVerifyEmail,
    status,
    hasPin,
    pinSetAt,
}: Props) {
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
                <div className="flex items-start gap-3 border-b border-gray-200 pb-5">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                        <UserCircle2 className="w-5 h-5 text-[#04326D]" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-[#0B192C]">
                            Mon Profil & Sécurité
                        </h1>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Gérez vos informations personnelles, votre mot de passe et votre code PIN de signature électronique.
                        </p>
                    </div>
                </div>

                {/* Contenu — une colonne centrée */}
                <div className="mx-auto max-w-2xl space-y-6">
                    {/* SECTION 1 : CODE PIN PERSONNEL POUR VALIDATIONS (SPÉCIFICATION #6) */}
                    <div className="bg-white p-6 sm:p-8 rounded-lg border-2 border-[#04326D] shadow-sm">
                        <UpdateSignaturePinForm hasPin={hasPin} pinSetAt={pinSetAt} />
                    </div>

                    {/* Section 2 : Informations personnelles */}
                    <div className="bg-white p-6 sm:p-8 rounded-lg border border-gray-200 shadow-sm">
                        <UpdateProfileInformationForm
                            mustVerifyEmail={mustVerifyEmail}
                            status={status}
                        />
                    </div>

                    {/* Section 3 : Mot de passe du compte */}
                    <div className="bg-white p-6 sm:p-8 rounded-lg border border-gray-200 shadow-sm">
                        <UpdatePasswordForm />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}