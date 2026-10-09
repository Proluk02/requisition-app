import { useForm } from '@inertiajs/react';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { KeyRound, ShieldCheck, AlertCircle, Eye, EyeOff, Info } from 'lucide-react';
import { useState } from 'react';

interface Props {
    hasPin: boolean;
    pinSetAt?: string;
    className?: string;
}

export default function UpdateSignaturePinForm({ hasPin, pinSetAt, className = '' }: Props) {
    const [showPin, setShowPin] = useState(false);
    const [showConfirmPin, setShowConfirmPin] = useState(false);

    const { data, setData, patch, errors, processing, recentlySuccessful, reset } = useForm({
        current_password: '',
        pin: '',
        pin_confirmation: '',
    });

    const updatePin = (e: React.FormEvent) => {
        e.preventDefault();
        patch(route('profile.pin.update'), {
            preserveScroll: true,
            onSuccess: () => reset(),
        });
    };

    const pinStrength = () => {
        if (data.pin.length === 0) return null;
        if (data.pin.length < 4)
            return { label: 'Trop court', color: 'text-red-600 bg-red-50 border-red-200' };
        if (data.pin.length === 4)
            return { label: 'Acceptable', color: 'text-amber-700 bg-amber-50 border-amber-200' };
        return { label: 'Fort', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    };

    const strength = pinStrength();

    const pinsMatch =
        data.pin && data.pin_confirmation && data.pin === data.pin_confirmation;
    const pinsMismatch =
        data.pin && data.pin_confirmation && data.pin !== data.pin_confirmation;

    return (
        <section className={className}>
            <header className="border-b border-gray-100 pb-3 mb-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <h2 className="text-sm font-bold text-[#0B192C] uppercase tracking-wider flex items-center gap-2">
                        <KeyRound className="w-4 h-4 text-[#04326D]" />
                        Code PIN de Signature Électronique
                    </h2>
                    {hasPin ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-[#065F46] text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200">
                            <ShieldCheck className="w-3 h-3 text-[#10B981]" />
                            PIN Actif ({pinSetAt})
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-200">
                            <AlertCircle className="w-3 h-3 text-[#F58F20]" />
                            Non configuré
                        </span>
                    )}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                    Ce code PIN personnel (4 à 6 chiffres) servira à signer électroniquement vos
                    réquisitions et visas en remplacement de votre mot de passe long.
                </p>
            </header>

            <div className="mb-5 p-3 bg-blue-50 border border-blue-200 rounded-md flex items-start gap-2">
                <Info className="w-4 h-4 text-[#04326D] shrink-0 mt-0.5" />
                <div className="text-[11px] text-[#04326D] leading-relaxed">
                    <strong>Conseil :</strong> Choisissez un code PIN facile à retenir mais
                    difficile à deviner. Évitez les suites logiques (1234, 0000) ou votre date de
                    naissance.
                </div>
            </div>

            <form onSubmit={updatePin} className="space-y-4 max-w-xl text-xs">
                <div>
                    <InputLabel
                        htmlFor="current_password_pin"
                        value="Mot de passe actuel du compte (Requis pour sécurité)"
                    />
                    <TextInput
                        id="current_password_pin"
                        type="password"
                        value={data.current_password}
                        onChange={(e) => setData('current_password', e.target.value)}
                        className="mt-1 block w-full border-[#B2BED6] text-xs p-2.5"
                        placeholder="Entrez votre mot de passe actuel"
                        autoComplete="current-password"
                        required
                    />
                    <InputError message={errors.current_password} className="mt-1" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <div className="flex items-center justify-between">
                            <InputLabel htmlFor="pin" value="Nouveau Code PIN (4 à 6 chiffres)" />
                            {strength && (
                                <span
                                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${strength.color}`}
                                >
                                    {strength.label}
                                </span>
                            )}
                        </div>
                        <div className="relative mt-1">
                            <TextInput
                                id="pin"
                                type={showPin ? 'text' : 'password'}
                                inputMode="numeric"
                                maxLength={6}
                                value={data.pin}
                                onChange={(e) => setData('pin', e.target.value.replace(/\D/g, ''))}
                                className="block w-full border-[#B2BED6] text-sm p-2.5 pr-10 font-mono font-bold tracking-widest text-center"
                                placeholder="••••"
                                autoComplete="new-password"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPin(!showPin)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#04326D] transition"
                                tabIndex={-1}
                                aria-label={showPin ? 'Masquer le PIN' : 'Afficher le PIN'}
                            >
                                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        <InputError message={errors.pin} className="mt-1" />
                    </div>

                    <div>
                        <InputLabel htmlFor="pin_confirmation" value="Confirmer le Code PIN" />
                        <div className="relative mt-1">
                            <TextInput
                                id="pin_confirmation"
                                type={showConfirmPin ? 'text' : 'password'}
                                inputMode="numeric"
                                maxLength={6}
                                value={data.pin_confirmation}
                                onChange={(e) =>
                                    setData('pin_confirmation', e.target.value.replace(/\D/g, ''))
                                }
                                className={`block w-full border-[#B2BED6] text-sm p-2.5 pr-10 font-mono font-bold tracking-widest text-center ${
                                    pinsMismatch
                                        ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
                                        : pinsMatch
                                        ? 'border-emerald-400 focus:border-emerald-500 focus:ring-emerald-200'
                                        : ''
                                }`}
                                placeholder="••••"
                                autoComplete="new-password"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPin(!showConfirmPin)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#04326D] transition"
                                tabIndex={-1}
                                aria-label={showConfirmPin ? 'Masquer la confirmation' : 'Afficher la confirmation'}
                            >
                                {showConfirmPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        {pinsMismatch && (
                            <p className="mt-1 text-[11px] text-red-600 font-semibold flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Les codes PIN ne correspondent pas.
                            </p>
                        )}
                        {pinsMatch && (
                            <p className="mt-1 text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3" />
                                Les codes PIN correspondent.
                            </p>
                        )}
                        <InputError message={errors.pin_confirmation} className="mt-1" />
                    </div>
                </div>

                <div className="flex items-center gap-4 pt-2">
                    <PrimaryButton
                        disabled={processing || !pinsMatch}
                        className="bg-[#04326D] hover:bg-[#06428f] text-xs font-bold py-2.5 px-5 rounded shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {processing
                            ? 'Enregistrement…'
                            : hasPin
                            ? 'Modifier mon Code PIN'
                            : 'Activer mon Code PIN'}
                    </PrimaryButton>

                    {recentlySuccessful && (
                        <p className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Code PIN enregistré avec succès.
                        </p>
                    )}
                </div>
            </form>
        </section>
    );
}