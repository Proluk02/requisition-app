import DangerButton from '@/Components/DangerButton';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import { useForm } from '@inertiajs/react';
import { FormEventHandler, useRef, useState } from 'react';
import { Trash2, AlertTriangle, KeyRound, Loader2 } from 'lucide-react';

export default function DeleteUserForm({ className = '' }: { className?: string }) {
    const [confirmingUserDeletion, setConfirmingUserDeletion] = useState(false);
    const passwordInput = useRef<HTMLInputElement>(null);

    const {
        data,
        setData,
        delete: destroy,
        processing,
        reset,
        errors,
        clearErrors,
    } = useForm({
        password: '',
    });

    const confirmUserDeletion = () => {
        setConfirmingUserDeletion(true);
    };

    const deleteUser: FormEventHandler = (e) => {
        e.preventDefault();

        destroy(route('profile.destroy'), {
            preserveScroll: true,
            onSuccess: () => closeModal(),
            onError: () => passwordInput.current?.focus(),
            onFinish: () => reset(),
        });
    };

    const closeModal = () => {
        setConfirmingUserDeletion(false);
        clearErrors();
        reset();
    };

    return (
        <section className={`space-y-5 ${className}`}>
            <header className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-error-soft flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-error" />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-on-surface">
                        Supprimer le compte
                    </h2>
                    <p className="mt-0.5 text-sm text-gray-500">
                        Une fois votre compte supprimé, toutes ses ressources et données seront
                        définitivement effacées. Avant de supprimer votre compte, veuillez
                        télécharger les données que vous souhaitez conserver.
                    </p>
                </div>
            </header>

            <DangerButton
                onClick={confirmUserDeletion}
                className="inline-flex items-center gap-2 bg-error hover:bg-error-dark text-white text-xs font-semibold py-2.5 px-5 rounded-md shadow-sm transition"
            >
                <Trash2 className="w-4 h-4" />
                Supprimer le compte
            </DangerButton>

            <Modal show={confirmingUserDeletion} onClose={closeModal}>
                <form onSubmit={deleteUser} className="p-6">
                    <div className="flex items-start gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-error-soft flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-5 h-5 text-error" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-on-surface">
                                Confirmer la suppression du compte
                            </h2>
                            <p className="mt-1 text-sm text-gray-500">
                                Une fois votre compte supprimé, toutes ses ressources et données
                                seront définitivement effacées. Veuillez saisir votre mot de passe
                                pour confirmer la suppression définitive.
                            </p>
                        </div>
                    </div>

                    <div className="mt-5">
                        <InputLabel htmlFor="password" value="Mot de passe" className="sr-only" />

                        <div className="relative">
                            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <TextInput
                                id="password"
                                type="password"
                                name="password"
                                ref={passwordInput}
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                className="block w-full border-outline-variant text-sm p-2.5 pl-9 rounded-md focus:border-error focus:ring-1 focus:ring-error/20 transition"
                                isFocused
                                placeholder="Saisissez votre mot de passe"
                            />
                        </div>

                        <InputError message={errors.password} className="mt-1.5" />
                    </div>

                    <div className="mt-6 flex justify-end gap-2">
                        <SecondaryButton
                            onClick={closeModal}
                            className="border-outline-variant text-xs font-semibold py-2.5 px-4 rounded-md hover:bg-gray-50 transition"
                        >
                            Annuler
                        </SecondaryButton>

                        <DangerButton
                            disabled={processing}
                            className="inline-flex items-center gap-1.5 bg-error hover:bg-error-dark text-white text-xs font-semibold py-2.5 px-4 rounded-md shadow-sm transition disabled:opacity-60"
                        >
                            {processing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            {processing ? 'Suppression…' : 'Supprimer le compte'}
                        </DangerButton>
                    </div>
                </form>
            </Modal>
        </section>
    );
}