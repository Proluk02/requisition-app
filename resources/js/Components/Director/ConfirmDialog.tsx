import { useEffect } from 'react';

interface Props {
    open: boolean;
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    tone?: 'danger' | 'primary';
    loading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmDialog({
    open,
    title,
    description,
    confirmLabel = 'Confirmer',
    cancelLabel = 'Annuler',
    tone = 'primary',
    loading = false,
    onConfirm,
    onCancel,
}: Props) {
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onCancel]);

    if (!open) return null;

    const confirmCls =
        tone === 'danger'
            ? 'bg-[#DC2626] hover:bg-[#b91c1c] text-white'
            : 'bg-[#04326D] hover:bg-[#06428f] text-white';

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded border border-[#B2BED6] shadow-xl max-w-md w-full p-5">
                <h3 className="text-[14px] font-bold text-[#0B192C]">{title}</h3>
                {description && (
                    <p className="text-[12.5px] text-gray-600 mt-2 leading-relaxed">{description}</p>
                )}
                <div className="flex justify-end gap-2 mt-5">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={loading}
                        className="px-3.5 py-1.5 text-[12.5px] font-bold text-gray-700 border border-[#B2BED6] rounded hover:bg-gray-50 disabled:opacity-50"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={loading}
                        className={`px-3.5 py-1.5 text-[12.5px] font-bold rounded disabled:opacity-50 ${confirmCls}`}
                    >
                        {loading ? 'Traitement…' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}