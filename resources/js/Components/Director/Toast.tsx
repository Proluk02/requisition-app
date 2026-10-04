import { useEffect } from 'react';
import type { ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'info';

interface Props {
    type: ToastType;
    message: string;
    onClose: () => void;
    duration?: number;
}

const STYLES: Record<ToastType, { wrap: string; icon: ReactNode }> = {
    success: {
        wrap: 'bg-white border-[#10B981] text-[#0B192C]',
        icon: (
            <svg className="w-4 h-4 text-[#10B981]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        ),
    },
    error: {
        wrap: 'bg-white border-[#DC2626] text-[#0B192C]',
        icon: (
            <svg className="w-4 h-4 text-[#DC2626]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
            </svg>
        ),
    },
    info: {
        wrap: 'bg-white border-[#04326D] text-[#0B192C]',
        icon: (
            <svg className="w-4 h-4 text-[#04326D]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" strokeLinecap="round" />
            </svg>
        ),
    },
};

export default function Toast({ type, message, onClose, duration = 4500 }: Props) {
    useEffect(() => {
        const t = setTimeout(onClose, duration);
        return () => clearTimeout(t);
    }, [onClose, duration]);

    const s = STYLES[type];

    return (
        <div className="fixed top-4 right-4 z-[100]">
            <div className={`flex items-start gap-3 min-w-[320px] max-w-md px-4 py-3 rounded border-2 shadow-md ${s.wrap}`}>
                <div className="shrink-0 mt-0.5">{s.icon}</div>
                <p className="text-[12.5px] leading-snug flex-1">{message}</p>
                <button
                    onClick={onClose}
                    className="shrink-0 text-gray-400 hover:text-[#0B192C]"
                    aria-label="Fermer"
                >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                    </svg>
                </button>
            </div>
        </div>
    );
}