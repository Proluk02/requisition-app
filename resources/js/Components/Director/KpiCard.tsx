interface Props {
    label: string;
    value: string | number;
    hint?: string;
    tone?: 'neutral' | 'emerald' | 'amber' | 'dark';
}

const TONES = {
    neutral: {
        wrap: 'bg-white border-[#B2BED6]',
        label: 'text-gray-500',
        value: 'text-[#0B192C]',
        hint: 'text-gray-500',
    },
    emerald: {
        wrap: 'bg-white border-[#10B981]',
        label: 'text-emerald-800',
        value: 'text-[#10B981]',
        hint: 'text-gray-500',
    },
    amber: {
        wrap: 'bg-white border-[#F58F20]',
        label: 'text-amber-900',
        value: 'text-[#F58F20]',
        hint: 'text-gray-500',
    },
    dark: {
        wrap: 'bg-[#0B192C] border-[#0B192C]',
        label: 'text-[#B2BED6]',
        value: 'text-white',
        hint: 'text-gray-400',
    },
};

export default function KpiCard({ label, value, hint, tone = 'neutral' }: Props) {
    const t = TONES[tone];
    return (
        <div className={`rounded border-2 px-4 py-3.5 ${t.wrap}`}>
            <p className={`text-[10px] uppercase tracking-widest font-bold ${t.label}`}>{label}</p>
            <p className={`text-2xl font-black mt-1 font-mono tabular-nums ${t.value}`}>{value}</p>
            {hint && <p className={`text-[11px] mt-1 ${t.hint}`}>{hint}</p>}
        </div>
    );
}