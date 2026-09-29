import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Transition } from '@headlessui/react';
import { Link, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import { User, Mail, CheckCircle2, AlertCircle } from 'lucide-react';

export default function UpdateProfileInformation({
    mustVerifyEmail,
    status,
    className = '',
}: {
    mustVerifyEmail: boolean;
    status?: string;
    className?: string;
}) {
    const user = usePage().props.auth.user;

    const { data, setData, patch, errors, processing, recentlySuccessful } = useForm({
        name: user.name,
        email: user.email,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        patch(route('profile.update'));
    };

    return (
        <section className={className}>
            <header className="flex items-start gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-primary-soft flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-on-surface">
                        Informations personnelles
                    </h2>
                    <p className="mt-0.5 text-sm text-gray-500">
                        Mettez à jour les informations de votre compte et votre adresse email.
                    </p>
                </div>
            </header>

            <form onSubmit={submit} className="space-y-5">
                <div>
                    <InputLabel htmlFor="name" value="Nom complet" />
                    <TextInput
                        id="name"
                        className="mt-1.5 block w-full border-outline-variant text-sm p-2.5 rounded-md focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        required
                        isFocused
                        autoComplete="name"
                    />
                    <InputError className="mt-1.5" message={errors.name} />
                </div>

                <div>
                    <InputLabel htmlFor="email" value="Adresse email" />
                    <TextInput
                        id="email"
                        type="email"
                        className="mt-1.5 block w-full border-outline-variant text-sm p-2.5 rounded-md focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        required
                        autoComplete="username"
                    />
                    <InputError className="mt-1.5" message={errors.email} />
                </div>

                {mustVerifyEmail && user.email_verified_at === null && (
                    <div className="p-3.5 bg-tertiary-soft border border-tertiary/20 rounded-md text-xs">
                        <p className="flex items-start gap-2 text-gray-800">
                            <AlertCircle className="w-4 h-4 text-tertiary shrink-0 mt-0.5" />
                            <span>
                                Votre adresse email n'est pas encore vérifiée.{' '}
                                <Link
                                    href={route('verification.send')}
                                    method="post"
                                    as="button"
                                    className="text-primary font-semibold underline hover:no-underline"
                                >
                                    Cliquez ici pour renvoyer l'email de vérification.
                                </Link>
                            </span>
                        </p>

                        {status === 'verification-link-sent' && (
                            <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-success-dark">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Un nouveau lien de vérification a été envoyé à votre adresse email.
                            </div>
                        )}
                    </div>
                )}

                <div className="flex items-center gap-4 pt-2">
                    <PrimaryButton
                        disabled={processing}
                        className="bg-primary hover:bg-primary-light text-white text-xs font-semibold py-2.5 px-5 rounded-md shadow-sm hover:shadow-md transition-all active:scale-[0.98] disabled:opacity-60"
                    >
                        {processing ? 'Enregistrement…' : 'Enregistrer'}
                    </PrimaryButton>

                    <Transition
                        show={recentlySuccessful}
                        enter="transition ease-in-out"
                        enterFrom="opacity-0"
                        leave="transition ease-in-out"
                        leaveTo="opacity-0"
                    >
                        <p className="text-xs font-semibold text-success-dark flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Enregistré
                        </p>
                    </Transition>
                </div>
            </form>
        </section>
    );
}