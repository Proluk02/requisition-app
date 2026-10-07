import { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import EmptyState from '@/Components/Director/EmptyState';
import ConfirmDialog from '@/Components/Director/ConfirmDialog';
import Toast, { type ToastType } from '@/Components/Director/Toast';

interface UrgenceItem {
    id: string;
    numero: string;
    projet: string;
    demandeurNom: string;
    nature: string;
    montantTotal: number;
    devise: string;
    status: string;
    dateSoumission: string;
    observation: string | null;
    needsWaiver: boolean;
}

interface Props {
    urgences?: UrgenceItem[];
}

export default function UrgentRequisitions({ urgences = [] }: Props) {
    const [target, setTarget] = useState<UrgenceItem | null>(null);
    const [rejectTarget, setRejectTarget] = useState<UrgenceItem | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);

    const handleConfirm = () => {
        if (!target) return;
        const current = target;
        setSubmitting(true);
        router.patch(
            route('requisitions.urgent-director', current.id),
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    setToast({
                        type: 'success',
                        message: `Réquisition urgente ${current.numero} approuvée et transmise directement à la Caisse.`,
                    });
                    setTarget(null);
                },
                onError: () => {
                    setToast({
                        type: 'error',
                        message: "Échec de l'opération. Veuillez réessayer.",
                    });
                },
                onFinish: () => setSubmitting(false),
            }
        );
    };

    const handleReject = (event: React.FormEvent) => {
        event.preventDefault();
        if (!rejectTarget || !rejectionReason.trim()) return;
        const current = rejectTarget;
        setSubmitting(true);
        router.patch(
            route('requisitions.urgent-director', current.id),
            { decision: 'reject', motif_rejet: rejectionReason },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setToast({
                        type: 'error',
                        message: `Réquisition urgente ${current.numero} renvoyée à son initiateur pour correction.`,
                    });
                    setRejectTarget(null);
                    setRejectionReason('');
                },
                onError: () => setToast({ type: 'error', message: 'Échec du renvoi. Veuillez réessayer.' }),
                onFinish: () => setSubmitting(false),
            }
        );
    };

    return (
        <AppLayout>
            <Head title="Dérogations urgentes" />

            <div className="space-y-6">
                {/* En-tête */}
                <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
                    <div>
                        <nav className="text-[10px] font-bold uppercase tracking-widest text-[#B2BED6] mb-1.5">
                            <span>Direction Générale</span>
                            <span className="mx-1.5">/</span>
                            <span className="text-[#04326D]">Dérogations urgentes</span>
                        </nav>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-xl font-bold text-[#0B192C]">
                                Réquisitions urgentes
                            </h1>
                            <span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full uppercase tracking-wide">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]" />
                                Circuit prioritaire
                            </span>
                        </div>
                        <p className="text-[12px] text-gray-500 mt-1">
                            Dossiers de terrain nécessitant un accord de principe préalable.
                        </p>
                    </div>

                    <Link
                        href={route('dashboard')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-gray-700 border border-[#B2BED6] rounded hover:bg-gray-50"
                    >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                            <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Retour au tableau de bord
                    </Link>
                </header>

                {/* Contenu */}
                <section className="bg-white border border-[#B2BED6] rounded overflow-hidden">
                    {urgences.length === 0 ? (
                        <EmptyState
                            title="Aucune réquisition urgente"
                            description="Les dossiers urgents en attente de dérogation apparaîtront ici."
                            icon={
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                                    <path
                                        d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            }
                        />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-[12.5px] border-collapse">
                                <thead>
                                    <tr className="bg-[#0B192C] text-white text-[10px] uppercase tracking-widest font-bold">
                                        <th className="py-2.5 px-4">Numéro</th>
                                        <th className="py-2.5 px-4">Date</th>
                                        <th className="py-2.5 px-4">Projet</th>
                                        <th className="py-2.5 px-4">Demandeur</th>
                                        <th className="py-2.5 px-4">Motif</th>
                                        <th className="py-2.5 px-4 text-right">Montant</th>
                                        <th className="py-2.5 px-4 text-center">Statut</th>
                                        <th className="py-2.5 px-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E2E8F0] text-gray-700">
                                    {urgences.map((u) => (
                                        <tr key={u.id} className="hover:bg-[#F9F9FF]">
                                            <td className="py-3 px-4 font-mono font-bold text-[#04326D] whitespace-nowrap">
                                                {u.numero}
                                            </td>
                                            <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                                                {u.dateSoumission}
                                            </td>
                                            <td className="py-3 px-4 font-bold text-[#0B192C]">
                                                {u.projet}
                                            </td>
                                            <td className="py-3 px-4 text-gray-700">
                                                {u.demandeurNom}
                                            </td>
                                            <td className="py-3 px-4 max-w-xs">
                                                <p className="truncate text-gray-700" title={u.observation || ''}>
                                                    {u.observation || '—'}
                                                </p>
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-[#0B192C] whitespace-nowrap">
                                                {u.montantTotal.toLocaleString('fr-FR')} {u.devise}
                                            </td>
                                            <td className="py-3 px-4 text-center whitespace-nowrap">
                                                {u.needsWaiver ? (
                                                    <span className="inline-flex items-center text-[10px] font-bold text-red-800 bg-red-100 border border-red-200 px-2 py-0.5 rounded uppercase tracking-wide">
                                                        Accord requis
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded uppercase tracking-wide">
                                                        Accordé
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-right whitespace-nowrap">
                                                {u.needsWaiver ? (
                                                    <div className="inline-flex gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setTarget(u)}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-bold bg-[#DC2626] text-white rounded hover:bg-[#b91c1c]"
                                                        >
                                                            Accorder
                                                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                                                                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setRejectTarget(u);
                                                                setRejectionReason('');
                                                            }}
                                                            className="px-3 py-1.5 text-[11.5px] font-bold border border-red-300 text-red-700 rounded hover:bg-red-50"
                                                        >
                                                            Refuser
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-[11.5px] text-gray-400 italic">
                                                        Priorité active
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>

            {/* Dialogue de confirmation */}
            <ConfirmDialog
                open={!!target}
                title="Accorder la dérogation urgente ?"
                description={
                    target
                        ? `La réquisition ${target.numero} (${target.montantTotal.toLocaleString('fr-FR')} ${target.devise}) sera transmise directement à la Caisse.`
                        : ''
                }
                confirmLabel="Accorder la dérogation"
                tone="danger"
                loading={submitting}
                onConfirm={handleConfirm}
                onCancel={() => !submitting && setTarget(null)}
            />

            {rejectTarget && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
                    <form onSubmit={handleReject} className="w-full max-w-lg space-y-4 rounded bg-white p-6 shadow-xl">
                        <h2 className="font-bold text-gray-900">Refuser la réquisition urgente {rejectTarget.numero}</h2>
                        <p className="text-sm text-gray-600">Le dossier sera renvoyé à son initiateur pour correction.</p>
                        <textarea
                            required
                            rows={4}
                            value={rejectionReason}
                            onChange={(event) => setRejectionReason(event.target.value)}
                            placeholder="Motif du refus"
                            className="w-full rounded border p-2 text-sm"
                        />
                        <div className="flex justify-end gap-2">
                            <button type="button" disabled={submitting} onClick={() => setRejectTarget(null)} className="rounded border px-4 py-2 text-sm">Annuler</button>
                            <button type="submit" disabled={submitting || !rejectionReason.trim()} className="rounded bg-red-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
                                {submitting ? 'Envoi…' : 'Renvoyer pour correction'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Notification */}
            {toast && (
                <Toast
                    type={toast.type}
                    message={toast.message}
                    onClose={() => setToast(null)}
                />
            )}
        </AppLayout>
    );
}