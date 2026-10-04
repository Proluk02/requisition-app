import { useEffect, useRef, useState } from 'react';

interface Props {
    open: boolean;
    requisitionNumero: string;
    amountLabel: string;
    submitting: boolean;
    error?: string | null;
    onCancel: () => void;
    onSubmit: (pin: string) => void;
}

export default function PinSignatureModal({
    open,
    requisitionNumero,
    amountLabel,
    submitting,
    error,
    onCancel,
    onSubmit,
}: Props) {
    const [pin, setPin] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open) {
            setPin('');
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !submitting && onCancel();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, submitting, onCancel]);

    if (!open) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (pin.length < 4) return;
        onSubmit(pin);
    };

    return (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white rounded border-2 border-[#04326D] shadow-xl max-w-sm w-full overflow-hidden">
                <div className="px-5 pt-5 pb-3 border-b border-[#E2E8F0]">
                    <h3 className="text-[13px] font-black uppercase tracking-wider text-[#0B192C]">
                        Bon à payer — Directrice Générale
                    </h3>
                    <p className="text-[12px] text-gray-500 mt-1">
                        Réquisition <span className="font-mono font-bold text-[#04326D]">{requisitionNumero}</span>
                        {' · '}
                        <span className="font-mono font-bold">{amountLabel}</span>
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
                    <div>
                        <label className="block text-[11.5px] font-bold text-gray-700 mb-1.5">
                            Code PIN de signature
                        </label>
                        <input
                            ref={inputRef}
                            type="password"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={6}
                            value={pin}
                            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                            placeholder="••••"
                            className={`w-full border rounded px-3 py-2.5 text-center text-lg font-mono tracking-[0.5em] focus:outline-none ${
                                error
                                    ? 'border-[#DC2626] focus:border-[#DC2626]'
                                    : 'border-[#B2BED6] focus:border-[#04326D]'
                            }`}
                        />
                        {error && <p className="text-[11.5px] font-bold text-[#DC2626] mt-1.5">{error}</p>}
                    </div>

                    <p className="text-[11px] text-gray-500 leading-relaxed">
                        Votre signature certifiée sera apposée électroniquement. Le dossier sera transmis
                        au guichet pour remise effective des fonds.
                    </p>

                    <div className="flex justify-end gap-2 pt-1 border-t border-[#E2E8F0] pt-3">
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={submitting}
                            className="px-3.5 py-1.5 text-[12.5px] font-bold text-gray-700 border border-[#B2BED6] rounded hover:bg-gray-50 disabled:opacity-50"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || pin.length < 4}
                            className="px-4 py-1.5 text-[12.5px] font-bold bg-[#10B981] text-white rounded hover:bg-[#059669] disabled:opacity-50"
                        >
                            {submitting ? 'Signature…' : 'Signer et ordonner'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}