import { useMemo, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';

interface FinanceJustificatif {
    id: string;
    nom: string;
    description: string;
    montant: number;
    fileUrl: string | null;
}

interface FinanceLine {
    id: string;
    activite: string;
    codeBudget: string;
    codeAllocation: string | null;
    nature: 'Achat' | 'Service';
    quantiteOuDuree: number;
    unite: string;
    prixUnitaire: number;
    total: number;
    justificatifs: FinanceJustificatif[];
}

interface FinanceRequisition {
    id: string;
    numero: string;
    projet: string;
    initiateurNom: string;
    initiateurRole: string;
    nature: 'Achat' | 'Service';
    devise: 'USD' | 'FC' | 'EUR';
    montantTotal: number;
    observation: string | null;
    statusCode: string;
    statusLabel: string;
    canDecide: boolean;
    financeRejected: boolean;
    dateSoumission: string;
    lignes: FinanceLine[];
}

interface Props {
    scopeLabel: string;
    requisitions: FinanceRequisition[];
}

const money = (amount: number, currency: string) =>
    `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${currency}`;

export default function FinanceDashboard({ scopeLabel, requisitions: initialRequisitions }: Props) {
    const [requisitions, setRequisitions] = useState(initialRequisitions);
    const [filter, setFilter] = useState('all');
    const [selected, setSelected] = useState<FinanceRequisition | null>(null);
    const [rejecting, setRejecting] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [allocationCodes, setAllocationCodes] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const filteredRequisitions = useMemo(() => {
        if (filter === 'pending') return requisitions.filter((item) => item.canDecide);
        if (filter === 'approved') return requisitions.filter((item) => item.statusCode === 'controle_finance');
        if (filter === 'returned') return requisitions.filter((item) => item.financeRejected);
        return requisitions;
    }, [filter, requisitions]);

    const submitDecision = (decision: 'approve' | 'reject') => {
        if (!selected || (decision === 'reject' && !rejectionReason.trim())) return;

        router.patch(route('requisitions.finance-decision', selected.id), {
            decision,
            motif_rejet: decision === 'reject' ? rejectionReason : null,
            allocations: decision === 'approve' ? selected.lignes.map((line) => ({
                demande_id: line.id,
                code_allocation: allocationCodes[line.id]?.trim() ?? '',
            })) : undefined,
        }, {
            preserveScroll: true,
            onStart: () => setProcessing(true),
            onFinish: () => setProcessing(false),
            onSuccess: () => {
                const nextStatus = decision === 'approve' ? 'controle_finance' : 'draft';
                const nextLabel = decision === 'approve' ? 'Validée par Finance' : 'Renvoyée en correction';
                const updated = {
                    ...selected,
                    statusCode: nextStatus,
                    statusLabel: nextLabel,
                    canDecide: false,
                    financeRejected: decision === 'reject',
                    lignes: decision === 'approve'
                        ? selected.lignes.map((line) => ({ ...line, codeAllocation: allocationCodes[line.id]?.trim() ?? '' }))
                        : selected.lignes,
                };

                setRequisitions((current) => current.map((item) => item.id === updated.id ? updated : item));
                setToast({
                    type: decision === 'approve' ? 'success' : 'error',
                    message: decision === 'approve'
                        ? `${selected.numero} validée et transmise au niveau suivant.`
                        : `${selected.numero} rejetée.`,
                });
                setSelected(null);
                setRejecting(false);
                setRejectionReason('');
            },
        });
    };

    const pendingCount = requisitions.filter((item) => item.canDecide).length;
    const approvedCount = requisitions.filter((item) => item.statusCode === 'controle_finance').length;
    const returnedCount = requisitions.filter((item) => item.financeRejected).length;

    return (
        <AppLayout>
            <Head title="Validation Finance & Budget" />

            <div className="space-y-6">
                <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-[#E2E8F0] pb-4">
                    <div>
                        <p className="text-[10px] uppercase tracking-wider font-bold text-[#F58F20]">Circuit des réquisitions</p>
                        <h1 className="text-xl font-bold text-[#0B192C]">Validation Finance & Budget</h1>
                        <p className="text-xs text-gray-500 mt-1">{scopeLabel}</p>
                    </div>
                    <p className="text-xs text-gray-500">{requisitions.length} réquisition(s) du projet</p>
                </header>

                {toast && (
                    <div className={`flex items-center justify-between gap-3 border px-3 py-2 text-xs font-semibold ${toast.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
                        <span>{toast.message}</span>
                        <button type="button" onClick={() => setToast(null)} className="underline">Fermer</button>
                    </div>
                )}

                <section className="grid grid-cols-1 sm:grid-cols-3 gap-3" aria-label="Synthèse des validations">
                    <div className="border-l-4 border-[#F58F20] bg-white px-4 py-3 shadow-sm">
                        <p className="text-[10px] uppercase font-bold text-gray-500">À valider</p>
                        <p className="text-2xl font-bold text-[#F58F20]">{pendingCount}</p>
                    </div>
                    <div className="border-l-4 border-emerald-500 bg-white px-4 py-3 shadow-sm">
                        <p className="text-[10px] uppercase font-bold text-gray-500">Validées Finance</p>
                        <p className="text-2xl font-bold text-emerald-700">{approvedCount}</p>
                    </div>
                        <div className="border-l-4 border-red-500 bg-white px-4 py-3 shadow-sm">
                        <p className="text-[10px] uppercase font-bold text-gray-500">Renvoyées en correction</p>
                        <p className="text-2xl font-bold text-red-700">{returnedCount}</p>
                    </div>
                </section>

                <section className="bg-white border border-[#B2BED6] shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-[#E2E8F0]">
                        <div>
                            <h2 className="text-sm font-bold text-[#0B192C]">Réquisitions de tous les projets</h2>
                            <p className="text-[11px] text-gray-500">La décision est disponible uniquement à l’étape Visa Manager Projet.</p>
                        </div>
                        <label className="flex items-center gap-2 text-xs text-gray-600">
                            <span>Statut</span>
                            <select value={filter} onChange={(event) => setFilter(event.target.value)} className="border border-[#B2BED6] rounded px-2.5 py-1.5 bg-white">
                                <option value="all">Tous</option>
                                <option value="pending">À valider</option>
                                <option value="approved">Validées</option>
                                <option value="returned">Renvoyées en correction</option>
                            </select>
                        </label>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-[#0B192C] text-white uppercase text-[10px]">
                                <tr>
                                    <th className="px-4 py-3">Réquisition</th>
                                    <th className="px-4 py-3">Initiateur</th>
                                    <th className="px-4 py-3">Objet</th>
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3 text-right">Montant</th>
                                    <th className="px-4 py-3">Statut</th>
                                    <th className="px-4 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E2E8F0]">
                                {filteredRequisitions.length === 0 ? (
                                    <tr><td colSpan={7} className="py-10 text-center text-gray-400">Aucune réquisition dans cette catégorie.</td></tr>
                                ) : filteredRequisitions.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-mono font-bold text-[#04326D] whitespace-nowrap">{item.numero}</td>
                                        <td className="px-4 py-3"><span className="font-semibold">{item.initiateurNom}</span><span className="block text-[10px] text-gray-500">{item.initiateurRole}</span></td>
                                        <td className="px-4 py-3 max-w-xs truncate" title={item.observation || ''}>{item.observation || item.lignes.map((line) => line.activite).join(', ')}</td>
                                        <td className="px-4 py-3 whitespace-nowrap">{item.dateSoumission}</td>
                                        <td className="px-4 py-3 text-right font-mono font-bold whitespace-nowrap">{money(item.montantTotal, item.devise)}</td>
                                        <td className="px-4 py-3"><span className={`inline-block px-2 py-1 rounded-full text-[10px] font-bold ${item.canDecide ? 'bg-amber-100 text-amber-900' : item.statusCode === 'controle_finance' ? 'bg-emerald-100 text-emerald-800' : item.financeRejected ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700'}`}>{item.statusLabel}</span></td>
                                        <td className="px-4 py-3 text-right whitespace-nowrap">
                                            <button type="button" onClick={() => { setSelected(item); setRejecting(false); setRejectionReason(''); setAllocationCodes(Object.fromEntries(item.lignes.map((line) => [line.id, line.codeAllocation ?? '']))); }} className="text-[#04326D] font-bold hover:underline">
                                                {item.canDecide ? 'Examiner' : 'Consulter'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            {selected && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <section className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white border border-[#B2BED6] shadow-2xl">
                        <header className="flex items-start justify-between gap-4 p-5 border-b border-[#E2E8F0]">
                            <div>
                                <p className="text-[10px] uppercase font-bold text-gray-500">Contrôle Finance & Budget</p>
                                <h2 className="text-lg font-bold text-[#0B192C]">Réquisition {selected.numero}</h2>
                                <p className="text-xs text-gray-500">{selected.initiateurNom} · {selected.projet} · {selected.dateSoumission}</p>
                            </div>
                            <button type="button" onClick={() => setSelected(null)} aria-label="Fermer" className="text-gray-500 hover:text-gray-900 text-2xl leading-none">&times;</button>
                        </header>

                        {selected.observation && <p className="mx-5 mt-4 p-3 border-l-2 border-[#F58F20] bg-amber-50 text-xs text-gray-700">{selected.observation}</p>}

                        <div className="p-5 overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-gray-50 text-gray-600"><tr><th className="p-2">Désignation</th><th className="p-2">Code demandé</th><th className="p-2">Code alloué</th><th className="p-2 text-right">Qté/Durée</th><th className="p-2 text-right">Prix unitaire</th><th className="p-2 text-right">Total</th><th className="p-2">Justificatifs</th></tr></thead>
                                <tbody className="divide-y">
                                    {selected.lignes.map((line) => (
                                        <tr key={line.id}>
                                            <td className="p-2 font-medium">{line.activite}</td>
                                            <td className="p-2 font-mono text-gray-500">{line.codeBudget}</td>
                                            <td className="p-2">
                                                {selected.canDecide ? (
                                                    <input
                                                        type="text"
                                                        required
                                                        value={allocationCodes[line.id] ?? ''}
                                                        onChange={(event) => setAllocationCodes((current) => ({ ...current, [line.id]: event.target.value }))}
                                                        aria-label={`Code d’allocation pour ${line.activite}`}
                                                        placeholder="Code budget"
                                                        className="w-32 border border-[#B2BED6] rounded px-2 py-1 font-mono"
                                                    />
                                                ) : (
                                                    <span className="font-mono text-gray-600">{line.codeAllocation || 'Non attribué'}</span>
                                                )}
                                            </td>
                                            <td className="p-2 text-right whitespace-nowrap">{line.quantiteOuDuree} {line.unite}</td>
                                            <td className="p-2 text-right whitespace-nowrap">{money(line.prixUnitaire, selected.devise)}</td>
                                            <td className="p-2 text-right font-bold whitespace-nowrap">{money(line.total, selected.devise)}</td>
                                            <td className="p-2">
                                                {line.justificatifs.length ? <ul className="space-y-1">{line.justificatifs.map((file) => <li key={file.id}>{file.fileUrl ? <a href={file.fileUrl} target="_blank" rel="noreferrer" className="text-[#04326D] underline">{file.nom}</a> : <span>{file.nom}</span>}</li>)}</ul> : <span className="text-gray-400">Aucun</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot><tr className="border-t font-bold"><td colSpan={5} className="p-2 text-right">Total réquisition</td><td className="p-2 text-right text-[#04326D] whitespace-nowrap">{money(selected.montantTotal, selected.devise)}</td><td></td></tr></tfoot>
                            </table>
                        </div>

                        {selected.canDecide ? (
                            <div className="border-t border-[#E2E8F0] p-5 space-y-4">
                                {rejecting && <label className="block text-xs font-semibold text-gray-700">Motif du rejet <textarea value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} rows={3} maxLength={5000} className="mt-1 w-full border border-red-300 rounded p-2 font-normal" placeholder="Précisez le problème budgétaire ou comptable." /></label>}
                                <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2">
                                    {!rejecting ? <button type="button" disabled={processing} onClick={() => setRejecting(true)} className="px-3 py-2 border border-red-300 text-red-700 text-xs font-bold hover:bg-red-50 disabled:opacity-50">Rejeter</button> : <button type="button" disabled={processing} onClick={() => setRejecting(false)} className="px-3 py-2 text-xs text-gray-600 hover:underline disabled:opacity-50">Annuler le rejet</button>}
                                    <div className="flex justify-end gap-2">
                                        <button type="button" disabled={processing} onClick={() => setSelected(null)} className="px-3 py-2 border border-gray-300 text-gray-700 text-xs">Fermer</button>
                                        {!rejecting ? <button type="button" disabled={processing || selected.lignes.some((line) => !allocationCodes[line.id]?.trim())} onClick={() => submitDecision('approve')} className="px-4 py-2 bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 disabled:opacity-50">{processing ? 'Traitement...' : 'Valider et transmettre'}</button> : <button type="button" disabled={processing || !rejectionReason.trim()} onClick={() => submitDecision('reject')} className="px-4 py-2 bg-red-700 text-white text-xs font-bold hover:bg-red-800 disabled:opacity-50">{processing ? 'Traitement...' : 'Confirmer le rejet'}</button>}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <footer className="flex justify-end border-t border-[#E2E8F0] p-5"><button type="button" onClick={() => setSelected(null)} className="px-4 py-2 bg-[#0B192C] text-white text-xs font-bold">Fermer</button></footer>
                        )}
                    </section>
                </div>
            )}
        </AppLayout>
    );
}
