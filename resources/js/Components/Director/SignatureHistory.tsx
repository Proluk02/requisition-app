interface Signature {
    role: string;
    nom: string;
    action: string;
    date: string;
    code?: string;
    hash: string;
}

interface Props {
    signatures: Signature[];
}

export default function SignatureHistory({ signatures }: Props) {
    if (signatures.length === 0) {
        return (
            <p className="text-[12px] text-gray-400 italic py-3">
                Aucune signature enregistrée pour ce dossier.
            </p>
        );
    }

    return (
        <ol className="space-y-2">
            {signatures.map((sig, idx) => (
                <li
                    key={idx}
                    className="flex items-start gap-3 px-3 py-2.5 bg-gray-50 border border-[#E2E8F0] rounded"
                >
                    <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                        <svg className="w-3.5 h-3.5 text-[#10B981]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold text-[#04326D] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 uppercase tracking-wide">
                                {sig.role}
                            </span>
                            <span className="text-[12.5px] font-bold text-[#0B192C]">{sig.nom}</span>
                            <span className="text-[10.5px] font-bold text-emerald-700 uppercase">
                                {sig.action}
                            </span>
                        </div>
                        <p className="text-[10.5px] text-gray-500 font-mono mt-1 truncate">
                            Cert. {sig.code || 'BP-SIG'} · {sig.hash.substring(0, 20)}…
                        </p>
                    </div>
                    <span className="text-[11px] text-gray-500 font-medium whitespace-nowrap">{sig.date}</span>
                </li>
            ))}
        </ol>
    );
}