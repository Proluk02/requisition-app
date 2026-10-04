import { useForm } from '@inertiajs/react';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { KeyRound, ShieldCheck, AlertCircle } from 'lucide-react';

interface Props {
    hasPin: boolean;
    pinSetAt?: string;
    className?: string;
}

export default function UpdateSignaturePinForm({ hasPin, pinSetAt, className = '' }: Props) {
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

    return (
        <section className={className}>
            <header className="border-b border-gray-100 pb-3 mb-4">
                <div className="flex items-center justify-between">
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
                    Ce code PIN personnel (4 à 6 chiffres) servira à signer électroniquement vos réquisitions et visas en remplacement de votre mot de passe long.
                </p>
            </header>

            <form onSubmit={updatePin} className="space-y-4 max-w-xl text-xs">
                {/* Mot de passe de compte obligatoire pour autoriser l'action */}
                <div>
                    <InputLabel htmlFor="current_password_pin" value="Mot de passe actuel du compte (Requis pour sécurité)" />
                    <TextInput
                        id="current_password_pin"
                        type="password"
                        value={data.current_password}
                        onChange={(e) => setData('current_password', e.target.value)}
                        className="mt-1 block w-full border-[#B2BED6] text-xs p-2 rounded"
                        placeholder="••••••••"
                        required
                    />
                    <InputError message={errors.current_password} className="mt-1" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Nouveau PIN */}
                    <div>
                        <InputLabel htmlFor="pin" value="Nouveau Code PIN (4 à 6 chiffres)" />
                        <TextInput
                            id="pin"
                            type="password"
                            inputMode="numeric"
                            maxLength={6}
                            value={data.pin}
                            onChange={(e) => setData('pin', e.target.value.replace(/\D/g, ''))}
                            className="mt-1 block w-full border-[#B2BED6] text-xs p-2 rounded font-mono font-bold tracking-widest text-center"
                            placeholder="••••"
                            required
                        />
                        <InputError message={errors.pin} className="mt-1" />
                    </div>

                    {/* Confirmation PIN */}
                    <div>
                        <InputLabel htmlFor="pin_confirmation" value="Confirmer le Code PIN" />
                        <TextInput
                            id="pin_confirmation"
                            type="password"
                            inputMode="numeric"
                            maxLength={6}
                            value={data.pin_confirmation}
                            onChange={(e) => setData('pin_confirmation', e.target.value.replace(/\D/g, ''))}
                            className="mt-1 block w-full border-[#B2BED6] text-xs p-2 rounded font-mono font-bold tracking-widest text-center"
                            placeholder="••••"
                            required
                        />
                        <InputError message={errors.pin_confirmation} className="mt-1" />
                    </div>
                </div>

                <div className="flex items-center gap-4 pt-2">
                    <PrimaryButton disabled={processing} className="bg-[#04326D] hover:bg-[#06428f] text-xs font-bold py-2 px-4 rounded">
                        {hasPin ? 'Modifier mon Code PIN' : 'Activer mon Code PIN'}
                    </PrimaryButton>

                    {recentlySuccessful && (
                        <p className="text-xs text-emerald-600 font-bold">
                            ✓ Code PIN enregistré avec succès.
                        </p>
                    )}
                </div>
            </form>
        </section>
    );
}