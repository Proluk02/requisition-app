import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Transition } from '@headlessui/react';
import { useForm } from '@inertiajs/react';
import { FormEventHandler, useRef, useState } from 'react';
import { KeyRound, CheckCircle2, Eye, EyeOff, Info, ShieldCheck } from 'lucide-react';

export default function UpdatePasswordForm({ className = '' }: { className?: string }) {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

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

    const getPasswordStrength = () => {
        const pwd = data.password;
        if (pwd.length === 0) return null;

        let score = 0;
        if (pwd.length >= 8) score++;
        if (pwd.length >= 12) score++;
        if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
        if (/\d/.test(pwd)) score++;
        if (/[^a-zA-Z0-9]/.test(pwd)) score++;

        if (score <= 2)
            return { label: 'Faible', color: 'bg-red-500', textColor: 'text-red-600', width: 'w-1/3' };
        if (score <= 3)
            return { label: 'Moyen', color: 'bg-amber-500', textColor: 'text-amber-600', width: 'w-2/3' };
        return { label: 'Fort', color: 'bg-emerald-500', textColor: 'text-emerald-600', width: 'w-full' };
    };

    const strength = getPasswordStrength();
    const passwordsMatch =
        data.password && data.password_confirmation && data.password === data.password_confirmation;
    const passwordsMismatch =
        data.password && data.password_confirmation && data.password !== data.password_confirmation;

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

            <div className="mb-5 p-3 bg-blue-50 border border-blue-200 rounded-md flex items-start gap-2">
                <Info className="w-4 h-4 text-[#04326D] shrink-0 mt-0.5" />
                <div className="text-[11px] text-[#04326D] leading-relaxed">
                    <strong>Mot de passe sécurisé :</strong> au moins 8 caractères, avec
                    majuscules, minuscules, chiffres et symboles.
                </div>
            </div>

            <form onSubmit={updatePassword} className="space-y-5">
                <div>
                    <InputLabel htmlFor="current_password" value="Mot de passe actuel" />
                    <div className="relative mt-1.5">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                        <TextInput
                            id="current_password"
                            ref={currentPasswordInput}
                            value={data.current_password}
                            onChange={(e) => setData('current_password', e.target.value)}
                            type={showCurrent ? 'text' : 'password'}
                            className="block w-full border-outline-variant text-sm p-2.5 pl-10 pr-10"
                            autoComplete="current-password"
                            placeholder="Entrez votre mot de passe actuel"
                        />
                        <button
                            type="button"
                            onClick={() => setShowCurrent(!showCurrent)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#04326D] transition z-10"
                            tabIndex={-1}
                            aria-label={showCurrent ? 'Masquer' : 'Afficher'}
                        >
                            {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                    <InputError message={errors.current_password} className="mt-1.5" />
                </div>

                <div>
                    <div className="flex items-center justify-between">
                        <InputLabel htmlFor="password" value="Nouveau mot de passe" />
                        {strength && (
                            <span className={`text-[10px] font-bold ${strength.textColor}`}>
                                Force : {strength.label}
                            </span>
                        )}
                    </div>
                    <div className="relative mt-1.5">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                        <TextInput
                            id="password"
                            ref={passwordInput}
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            type={showNew ? 'text' : 'password'}
                            className="block w-full border-outline-variant text-sm p-2.5 pl-10 pr-10"
                            autoComplete="new-password"
                            placeholder="Minimum 8 caractères"
                        />
                        <button
                            type="button"
                            onClick={() => setShowNew(!showNew)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#04326D] transition z-10"
                            tabIndex={-1}
                            aria-label={showNew ? 'Masquer' : 'Afficher'}
                        >
                            {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                    {strength && (
                        <div className="mt-2 h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className={`h-full ${strength.color} ${strength.width} transition-all duration-300`}
                            />
                        </div>
                    )}
                    <InputError message={errors.password} className="mt-1.5" />
                </div>

                <div>
                    <InputLabel
                        htmlFor="password_confirmation"
                        value="Confirmer le mot de passe"
                    />
                    <div className="relative mt-1.5">
                        <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                        <TextInput
                            id="password_confirmation"
                            value={data.password_confirmation}
                            onChange={(e) => setData('password_confirmation', e.target.value)}
                            type={showConfirm ? 'text' : 'password'}
                            className={`block w-full border-outline-variant text-sm p-2.5 pl-10 pr-10 ${
                                passwordsMismatch
                                    ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
                                    : passwordsMatch
                                    ? 'border-emerald-400 focus:border-emerald-500 focus:ring-emerald-200'
                                    : ''
                            }`}
                            autoComplete="new-password"
                            placeholder="Ressaisissez le nouveau mot de passe"
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirm(!showConfirm)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#04326D] transition z-10"
                            tabIndex={-1}
                            aria-label={showConfirm ? 'Masquer' : 'Afficher'}
                        >
                            {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                    {passwordsMismatch && (
                        <p className="mt-1.5 text-[11px] text-red-600 font-semibold">
                            Les mots de passe ne correspondent pas.
                        </p>
                    )}
                    {passwordsMatch && (
                        <p className="mt-1.5 text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Les mots de passe correspondent.
                        </p>
                    )}
                    <InputError message={errors.password_confirmation} className="mt-1.5" />
                </div>

                <div className="flex items-center gap-4 pt-2">
                    <PrimaryButton
                        disabled={processing || !passwordsMatch}
                        className="bg-primary hover:bg-primary-light text-white text-xs font-semibold py-2.5 px-5 rounded-md shadow-sm hover:shadow-md transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
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