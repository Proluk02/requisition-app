interface Signature {
    role: string;
    nom: string;
    action: string;
    date: string;
    commentaire?: string | null;
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
            {signatures.map((sig, idx) => {
                const rejected = sig.action.toLowerCase() === 'rejected';
                return (
                    <li
                        key={idx}
                        className={`flex items-start gap-3 px-3 py-2.5 border rounded ${
                            rejected ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-[#E2E8F0]'
                        }`}
                    >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                            rejected ? 'bg-red-100' : 'bg-emerald-100'
                        }`}>
                            {rejected ? (
                                <svg className="w-3.5 h-3.5 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                                </svg>
                            ) : (
                                <svg className="w-3.5 h-3.5 text-[#10B981]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-bold text-[#04326D] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 uppercase tracking-wide">
                                    {sig.role}
                                </span>
                                <span className="text-[12.5px] font-bold text-[#0B192C]">{sig.nom}</span>
                                <span className={`text-[10.5px] font-bold uppercase ${
                                    rejected ? 'text-red-700' : 'text-emerald-700'
                                }`}>
                                    {sig.action}
                                </span>
                            </div>
                            <p className="text-[10.5px] text-gray-500 font-mono mt-1 truncate">
                                Cert. {sig.code || 'BP-SIG'} · {sig.hash.substring(0, 20)}…
                            </p>
                            {sig.commentaire && (
                                <p className="mt-1 text-[11px] text-red-800">
                                    Motif : {sig.commentaire}
                                </p>
                            )}
                        </div>
                        <span className="text-[11px] text-gray-500 font-medium whitespace-nowrap">{sig.date}</span>
                    </li>
                );
            })}
        </ol>
    );
}