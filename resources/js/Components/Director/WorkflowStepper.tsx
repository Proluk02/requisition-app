const STEPS = [
    { key: 'draft', label: 'Brouillon', role: 'Initiateur' },
    { key: 'visa_mp', label: 'Visa MP', role: 'Manager Projet' },
    { key: 'controle_finance', label: 'Finances', role: 'Manager Finances' },
    { key: 'visa_admin', label: 'Administration', role: 'Manager Admin' },
    { key: 'approbation_direction', label: 'Direction', role: 'Directrice Générale' },
    { key: 'decaissement_caisse', label: 'Caisse', role: 'Guichet' },
    { key: 'cloture', label: 'Clôturé', role: 'Retour' },
];

const ORDER = STEPS.map((s) => s.key);

interface Props {
    statusCode: string;
}

export default function WorkflowStepper({ statusCode }: Props) {
    const currentIdx = ORDER.indexOf(statusCode);
    const isFinal = statusCode === 'decaisse' || statusCode === 'cloture';

    return (
        <div className="flex items-start justify-between relative pt-1">
            <div className="absolute left-3 right-3 top-4 h-px bg-[#E2E8F0]" />
            {STEPS.map((step, idx) => {
                const done = idx < currentIdx || isFinal;
                const active = idx === currentIdx && !isFinal;

                const circle = done
                    ? 'bg-[#10B981] border-[#10B981] text-white'
                    : active
                    ? 'bg-[#F58F20] border-[#F58F20] text-white ring-4 ring-[#F58F20]/20'
                    : 'bg-gray-100 border-gray-200 text-gray-400';

                return (
                    <div key={step.key} className="flex flex-col items-center text-center relative z-10 flex-1">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 text-[11px] font-bold ${circle}`}>
                            {done ? (
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            ) : (
                                idx + 1
                            )}
                        </div>
                        <span className="text-[10px] font-bold text-[#0B192C] mt-2">{step.label}</span>
                        <span className="text-[9px] text-gray-400">{step.role}</span>
                    </div>
                );
            })}
        </div>
    );
}