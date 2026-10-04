import type { ReactNode } from 'react';

interface Props {
    icon?: ReactNode;
    title: string;
    description?: string;
    action?: ReactNode;
}

export default function EmptyState({ icon, title, description, action }: Props) {
    return (
        <div className="py-14 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#F1F5F9] flex items-center justify-center text-[#B2BED6]">
                {icon ?? (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                        <path d="M9 12h6M9 16h6M9 8h6M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" strokeLinecap="round" />
                    </svg>
                )}
            </div>
            <p className="text-[13px] font-bold text-[#0B192C] mt-3">{title}</p>
            {description && (
                <p className="text-[12px] text-gray-500 mt-1 max-w-sm mx-auto">{description}</p>
            )}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}