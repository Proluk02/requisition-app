import WorkflowStepper from './WorkflowStepper';
import SignatureHistory from './SignatureHistory';

interface Ligne {
    id: string;
    activite: string;
    codeAllocation: string | null;
    nature?: string;
    quantiteOuDuree: number;
    unite: string;
    prixUnitaire: number;
    total: number;
    justificatifs?: {
        id: string;
        nom: string;
        description?: string | null;
        date?: string | null;
        montant?: number;
        fileUrl: string | null;
    }[];
}

interface Requisition {
    id: string;
    numero: string;
    projet: string;
    caisseAttribuee: string;
    initiateurNom: string;
    nature: 'Achat' | 'Service';
    devise: string;
    montantTotal: number;
    observation: string | null;
    dateSoumission: string;
    date_paiement?: string | null;
    date_livraison?: string | null;
    statusCode: string;
    is_urgent: boolean;
    signatures: {
        role: string;
        nom: string;
        action: string;
        date: string;
        commentaire?: string | null;
        code?: string;
        hash: string;
    }[];
    lignes: Ligne[];
}

interface Props {
    open: boolean;
    requisition: Requisition | null;
    onClose: () => void;
    onPrint: (r: Requisition) => void;
}

const money = (n: number, c: string) =>
    `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${c}`;

export default function RequisitionDetailModal({ open, requisition, onClose, onPrint }: Props) {
    if (!open || !requisition) return null;
    const r = requisition;

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded border border-[#B2BED6] shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <header className="px-5 py-4 border-b border-[#E2E8F0] flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <h2 className="text-[15px] font-bold text-[#0B192C] font-mono">
                                {r.numero}
                            </h2>
                            <span className="text-[10px] font-bold text-[#04326D] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded uppercase tracking-wide">
                                {r.nature}
                            </span>
                        </div>
                        <p className="text-[12px] text-gray-500 mt-1">
                            {r.projet} · {r.caisseAttribuee} · Initiateur : {r.initiateurNom}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={() => onPrint(r)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12.5px] font-bold bg-[#04326D] text-white rounded hover:bg-[#06428f]"
                        >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                <path d="M6 9V4a1 1 0 011-1h10a1 1 0 011 1v5M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v7H6z" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Imprimer
                        </button>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-[#0B192C] hover:bg-gray-100 rounded"
                            aria-label="Fermer"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                            </svg>
                        </button>
                    </div>
                </header>

                {/* Body scrollable */}
                <div className="overflow-y-auto px-5 py-5 space-y-6">
                    <section className="grid gap-3 rounded border border-[#E2E8F0] bg-gray-50 p-4 text-xs sm:grid-cols-2 lg:grid-cols-3">
                        <p><strong>Statut :</strong> {r.statusCode}</p>
                        <p><strong>Soumise le :</strong> {r.dateSoumission}</p>
                        {r.date_paiement && <p><strong>Date de paiement :</strong> {r.date_paiement}</p>}
                        {r.date_livraison && <p><strong>Date de livraison :</strong> {r.date_livraison}</p>}
                        <p><strong>Urgence :</strong> {r.is_urgent ? 'Oui' : 'Non'}</p>
                        <p><strong>Montant :</strong> {money(r.montantTotal, r.devise)}</p>
                        <p className="sm:col-span-2 lg:col-span-3">
                            <strong>Observation :</strong> {r.observation || 'Aucune observation'}
                        </p>
                    </section>

                    <section>
                        <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-3">
                            Circuit d'approbation
                        </h3>
                        <WorkflowStepper statusCode={r.statusCode} isUrgent={r.is_urgent} />
                    </section>

                    <section>
                        <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-3">
                            Historique des visas électroniques
                        </h3>
                        <SignatureHistory signatures={r.signatures} />
                    </section>

                    <section>
                        <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-3">
                            Détail des lignes
                        </h3>
                        <div className="border border-[#B2BED6] rounded overflow-hidden">
                            <table className="w-full text-left text-[12.5px]">
                                <thead className="bg-[#F1F5F9] text-[10.5px] uppercase tracking-widest text-gray-600">
                                    <tr>
                                        <th className="px-3 py-2 font-bold">Désignation</th>
                                        <th className="px-3 py-2 font-bold">Code budget</th>
                                        <th className="px-3 py-2 font-bold">Nature</th>
                                        <th className="px-3 py-2 text-center font-bold">
                                            {r.nature === 'Achat' ? 'Qté' : 'Durée'}
                                        </th>
                                        <th className="px-3 py-2 text-right font-bold">P.U.</th>
                                        <th className="px-3 py-2 text-right font-bold">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E2E8F0] text-gray-700">
                                    {r.lignes.map((l) => (
                                        <tr key={l.id}>
                                            <td className="px-3 py-2 font-medium text-[#0B192C]">
                                                <span>{l.activite}</span>
                                                {!!l.justificatifs?.length && (
                                                    <ul className="mt-2 space-y-1 text-[11px] font-normal">
                                                        {l.justificatifs.map((file) => (
                                                            <li key={file.id} className="flex flex-wrap items-center gap-x-2">
                                                                {file.fileUrl ? (
                                                                    <a
                                                                        href={file.fileUrl}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="font-semibold text-[#04326D] underline"
                                                                    >
                                                                        Consulter : {file.nom}
                                                                    </a>
                                                                ) : (
                                                                    <span>{file.nom}</span>
                                                                )}
                                                                {file.description && file.description !== file.nom && (
                                                                    <span className="text-gray-500">({file.description})</span>
                                                                )}
                                                                {file.date && <span className="text-gray-500">· {file.date}</span>}
                                                                {file.montant !== undefined && (
                                                                    <span className="text-gray-500">
                                                                        · {money(file.montant, r.devise)}
                                                                    </span>
                                                                )}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 font-mono text-[11.5px] font-bold text-[#04326D]">
                                                {l.codeAllocation || '—'}
                                            </td>
                                            <td className="px-3 py-2">{l.nature || r.nature}</td>
                                            <td className="px-3 py-2 text-center tabular-nums">
                                                {l.quantiteOuDuree} {l.unite}
                                            </td>
                                            <td className="px-3 py-2 text-right font-mono tabular-nums">
                                                {money(l.prixUnitaire, r.devise)}
                                            </td>
                                            <td className="px-3 py-2 text-right font-mono tabular-nums font-bold">
                                                {money(l.total, r.devise)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-gray-50 border-t border-[#B2BED6]">
                                    <tr>
                                        <td colSpan={5} className="px-3 py-2.5 text-right text-[11.5px] font-bold uppercase tracking-widest text-gray-600">
                                            Total général
                                        </td>
                                        <td className="px-3 py-2.5 text-right font-mono font-black text-[#04326D]">
                                            {money(r.montantTotal, r.devise)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}