import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Transition } from '@headlessui/react';
import { useForm } from '@inertiajs/react';
import { FormEventHandler, useRef } from 'react';
import { KeyRound, CheckCircle2 } from 'lucide-react';

export default function UpdatePasswordForm({ className = '' }: { className?: string }) {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    const { data, setData, errors, put, reset, processing, recentlySuccessful } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const updatePassword: FormEventHandler = (e) => {
        e.preventDefault();

        put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => reset(),
            onError: (errors) => {
                if (errors.password) {
                    reset('password', 'password_confirmation');
                    passwordInput.current?.focus();
                }

                if (errors.current_password) {
                    reset('current_password');
                    currentPasswordInput.current?.focus();
                }
            },
        });
    };

    return (
        <section className={className}>
            <header className="flex items-start gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-tertiary-soft flex items-center justify-center shrink-0">
                    <KeyRound className="w-5 h-5 text-tertiary" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-on-surface">
                        Mettre à jour le mot de passe
                    </h2>
                    <p className="mt-0.5 text-sm text-gray-500">
                        Utilisez un mot de passe long et aléatoire pour garantir la sécurité de
                        votre compte.
                    </p>
                </div>
            </header>

            <form onSubmit={updatePassword} className="space-y-5">
                <div>
                    <InputLabel htmlFor="current_password" value="Mot de passe actuel" />
                    <TextInput
                        id="current_password"
                        ref={currentPasswordInput}
                        value={data.current_password}
                        onChange={(e) => setData('current_password', e.target.value)}
                        type="password"
                        className="mt-1.5 block w-full border-outline-variant text-sm p-2.5 rounded-md focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                        autoComplete="current-password"
                    />
                    <InputError message={errors.current_password} className="mt-1.5" />
                </div>

                <div>
                    <InputLabel htmlFor="password" value="Nouveau mot de passe" />
                    <TextInput
                        id="password"
                        ref={passwordInput}
                        value={data.password}
                        onChange={(e) => setData('password', e.target.value)}
                        type="password"
                        className="mt-1.5 block w-full border-outline-variant text-sm p-2.5 rounded-md focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                        autoComplete="new-password"
                    />
                    <InputError message={errors.password} className="mt-1.5" />
                </div>

                <div>
                    <InputLabel
                        htmlFor="password_confirmation"
                        value="Confirmer le mot de passe"
                    />
                    <TextInput
                        id="password_confirmation"
                        value={data.password_confirmation}
                        onChange={(e) => setData('password_confirmation', e.target.value)}
                        type="password"
                        className="mt-1.5 block w-full border-outline-variant text-sm p-2.5 rounded-md focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                        autoComplete="new-password"
                    />
                    <InputError message={errors.password_confirmation} className="mt-1.5" />
                </div>

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