import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { PageProps } from '@/types';
import OfficialPrintSheet from '@/Components/OfficialPrintSheet';
import KpiCard from '@/Components/Director/KpiCard';
import Toast, { ToastType } from '@/Components/Director/Toast';
import EmptyState from '@/Components/Director/EmptyState';
import PinSignatureModal from '@/Components/Director/PinSignatureModal';
import RequisitionDetailModal from '@/Components/Director/RequisitionDetailModal';
import type { RequisitionSuivi } from '@/types/requisitionsList';
import { numberToWordsFR } from '@/lib/numberToWords';
import { Calendar, Eye, Printer, ShieldCheck } from 'lucide-react';

interface WorkflowLevel {
    step: number;
    label: string;
    color: string;
}

interface Justificatif {
    id: string;
    nom: string;
    fileUrl: string | null;
}

interface LigneItem {
    id: string;
    activite: string;
    codeAllocation: string | null;
    quantiteOuDuree: number;
    unite: string;
    prixUnitaire: number;
    total: number;
    justificatifs: Justificatif[];
}

interface RequisitionDirectrice {
    id: string;
    numero: string;
    projet: string;
    initiateurNom: string;
    initiateurRole: string;
    nature: 'Achat' | 'Service';
    devise: 'USD' | 'FC' | 'EUR';
    montantTotal: number;
    caisseAttribuee: string;
    observation: string | null;
    is_urgent: boolean;
    is_decaissee: boolean;
    statusCode: string;
    workflowLevel: WorkflowLevel;
    dateSoumission: string;
    signatures: {
        role: string;
        nom: string;
        action: string;
        date: string;
        code?: string;
        hash: string;
    }[];
    lignes: LigneItem[];
}

interface ProjectStat {
    id: string;
    name: string;
    count: number;
    total_usd: number;
    total_fc: number;
}

interface CaisseStat {
    caisse: string;
    count: number;
    total_usd: number;
    decaisse_usd: number;
}

interface Props extends PageProps {
    selectedPeriod: string;
    projectsStats: ProjectStat[];
    caissesStats: CaisseStat[];
    decaisseesCount: number;
    nonDecaisseesCount: number;
    requisitions: RequisitionDirectrice[];
    isInterim?: boolean;
}

const money = (n: number, c: string) =>
    `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${c}`;

export default function DirectorDashboard({
    selectedPeriod,
    projectsStats = [],
    caissesStats = [],
    decaisseesCount = 0,
    nonDecaisseesCount = 0,
    requisitions = [],
    isInterim = false,
}: Props) {
    const { auth } = usePage<PageProps>().props;
    const user = auth.user;

    const [period, setPeriod] = useState(selectedPeriod || new Date().toISOString().slice(0, 7));
    const [selectedProject, setSelectedProject] = useState('all');
    const [selectedCaisse, setSelectedCaisse] = useState('all');
    const [decaissementFilter, setDecaissementFilter] = useState<'all' | 'decaissees' | 'non_decaissees'>('all');

    const [detailReq, setDetailReq] = useState<RequisitionDirectrice | null>(null);
    const [printReq, setPrintReq] = useState<RequisitionDirectrice | null>(null);
    const [signReq, setSignReq] = useState<RequisitionDirectrice | null>(null);
    const [rejectReq, setRejectReq] = useState<RequisitionDirectrice | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [rejecting, setRejecting] = useState(false);
    const [pinError, setPinError] = useState<string | null>(null);
    const [signing, setSigning] = useState(false);
    const [toast, setToast] = useState<{ type: ToastType; message: string } | null>(null);

    const handlePeriodChange = (newPeriod: string) => {
        setPeriod(newPeriod);
        router.get(route('director.dashboard'), { period: newPeriod }, { preserveState: true, preserveScroll: true });
    };

    const filteredList = useMemo(() => {
        return requisitions.filter((r) => {
            if (selectedProject !== 'all' && r.projet !== selectedProject) return false;
            if (selectedCaisse !== 'all' && r.caisseAttribuee !== selectedCaisse) return false;
            if (decaissementFilter === 'decaissees' && !r.is_decaissee) return false;
            if (decaissementFilter === 'non_decaissees' && r.is_decaissee) return false;
            return true;
        });
    }, [requisitions, selectedProject, selectedCaisse, decaissementFilter]);

    const volumeUSD = useMemo(
        () => requisitions.reduce((acc, r) => acc + (r.devise === 'USD' ? r.montantTotal : 0), 0),
        [requisitions]
    );

    const handleOpenSignature = (req: RequisitionDirectrice) => {
        setPinError(null);
        setSignReq(req);
    };

    const handleSubmitSignature = (pin: string) => {
        if (!signReq) return;
        setSigning(true);
        setPinError(null);
        router.patch(
            route('requisitions.director-decision', signReq.id),
            { decision: 'approve', pin },
            {
                preserveScroll: true,
                onFinish: () => setSigning(false),
                onSuccess: () => {
                    setSignReq(null);
                    setToast({
                        type: 'success',
                        message: isInterim
                            ? 'Bon à payer accordé (Pour ordre / Intérim). Le dossier est transmis à la Caisse.'
                            : 'Bon à payer accordé. Le dossier est transmis au guichet pour décaissement.',
                    });
                },
                onError: (errs) => {
                    setPinError(errs.pin || 'Code PIN incorrect.');
                },
            }
        );
    };

    const handlePrint = (req: RequisitionDirectrice) => {
        setPrintReq(req);
    };

    useEffect(() => {
        if (!printReq) return;

        let secondFrame = 0;
        const firstFrame = window.requestAnimationFrame(() => {
            secondFrame = window.requestAnimationFrame(() => window.print());
        });
        const clearPrintRequest = () => setPrintReq(null);
        window.addEventListener('afterprint', clearPrintRequest);

        return () => {
            window.cancelAnimationFrame(firstFrame);
            window.cancelAnimationFrame(secondFrame);
            window.removeEventListener('afterprint', clearPrintRequest);
        };
    }, [printReq]);

    const handleReject = (event: React.FormEvent) => {
        event.preventDefault();
        if (!rejectReq || !rejectionReason.trim()) return;

        setRejecting(true);
        router.patch(
            route('requisitions.director-decision', rejectReq.id),
            { decision: 'reject', motif_rejet: rejectionReason },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setToast({
                        type: 'success',
                        message: `Réquisition ${rejectReq.numero} renvoyée au PAM pour correction.`,
                    });
                    setRejectReq(null);
                    setRejectionReason('');
                },
                onError: () => setToast({
                    type: 'error',
                    message: 'Le refus n’a pas pu être enregistré. Veuillez réessayer.',
                }),
                onFinish: () => setRejecting(false),
            },
        );
    };

    const printRequisition = printReq ? {
        id: printReq.id,
        numero: printReq.numero,
        projet: printReq.projet,
        site: '',
        nature: printReq.nature,
        caisse: printReq.caisseAttribuee,
        devise: printReq.devise,
        montantTotal: printReq.montantTotal,
        montantLettres: numberToWordsFR(printReq.montantTotal, printReq.devise),
        dateSoumission: printReq.dateSoumission,
        observation: printReq.observation ?? undefined,
        is_urgent: printReq.is_urgent,
        etapeActuelle: 'approbation_direction' as const,
        articles: printReq.lignes.map((line) => ({
            id: line.id,
            activite: line.activite,
            codeBudget: line.codeAllocation ?? '',
            nature: printReq.nature,
            quantiteOuDuree: line.quantiteOuDuree,
            unite: line.unite,
            prixUnitaire: line.prixUnitaire,
            total: line.total,
            justificatifsCount: line.justificatifs.length,
        })),
        signatures: printReq.signatures,
        initiateurNom: printReq.initiateurNom,
    } satisfies RequisitionSuivi & { initiateurNom: string; signatures: RequisitionDirectrice['signatures'] } : null;

    return (
        <AppLayout>
            <Head title="Direction Générale — Supervision" />
            <style>{`
                #bon-pasteur-print-zone { display: none; }
                @media print {
                    body * { visibility: hidden !important; }
                    #bon-pasteur-print-zone,
                    #bon-pasteur-print-zone * { visibility: visible !important; }
                    #bon-pasteur-print-zone {
                        display: block !important;
                        position: fixed !important;
                        inset: 0 !important;
                        width: 100% !important;
                        min-height: 194mm !important;
                        background: white !important;
                        z-index: 2147483647 !important;
                    }
                    #bon-pasteur-official-sheet { width: 100% !important; min-height: 194mm !important; }
                }
            `}</style>

            <div className="space-y-6 no-print">
                {isInterim && (
                    <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded text-emerald-900 text-xs flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-2.5">
                            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                            <span>
                                <strong>Mandat d'intérim Direction Générale actif :</strong> Vous êtes connecté en tant que Manager Administratif (PAM). Vos visas apposés porteront la mention légale <strong>« Pour ordre / Intérim »</strong>.
                            </span>
                        </div>
                        <span className="text-[10px] font-mono uppercase bg-emerald-200/70 text-emerald-800 px-2 py-0.5 rounded font-bold">
                            Intérim Officiel
                        </span>
                    </div>
                )}

                <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
                    <div>
                        <nav className="text-[10px] font-bold uppercase tracking-widest text-[#B2BED6] mb-1.5">
                            <span>Direction Générale</span>
                            <span className="mx-1.5">/</span>
                            <span className="text-[#04326D]">Supervision</span>
                        </nav>
                        <h1 className="text-xl font-bold text-[#0B192C]">
                            Supervision des réquisitions
                        </h1>
                        <p className="text-[12px] text-gray-500 mt-1">
                            Connecté en tant que <strong className="text-[#0B192C]">{user.name}</strong>. Contrôle consolidé des projets et caisses.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 bg-white border border-[#04326D] rounded px-3 py-2">
                        <Calendar className="w-4 h-4 text-[#04326D]" />
                        <label className="text-[11px] font-bold uppercase tracking-widest text-gray-600">Période</label>
                        <input
                            type="month"
                            value={period}
                            onChange={(e) => handlePeriodChange(e.target.value)}
                            className="border-none bg-transparent text-[13px] font-bold text-[#04326D] focus:outline-none cursor-pointer"
                        />
                    </div>
                </header>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <KpiCard
                        label="Réquisitions du mois"
                        value={requisitions.length}
                        hint={`Sur ${projectsStats.length} projet${projectsStats.length > 1 ? 's' : ''}`}
                    />
                    <KpiCard
                        label="Décaissées"
                        value={decaisseesCount}
                        hint="Fonds remis au guichet"
                        tone="emerald"
                    />
                    <KpiCard
                        label="En attente"
                        value={nonDecaisseesCount}
                        hint="En cours d'approbation"
                        tone="amber"
                    />
                    <KpiCard
                        label="Volume (USD)"
                        value={`$${volumeUSD.toLocaleString('fr-FR')}`}
                        hint="Engagements consolidés"
                        tone="dark"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    <section className="lg:col-span-7 bg-white border border-[#B2BED6] rounded">
                        <header className="px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between">
                            <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#0B192C]">
                                Répartition par projet
                            </h2>
                            <span className="text-[10.5px] text-gray-400 font-bold uppercase">Période {period}</span>
                        </header>
                        <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {projectsStats.length === 0 ? (
                                <p className="col-span-full text-[12px] text-gray-400 italic py-3 text-center">
                                    Aucune donnée pour cette période.
                                </p>
                            ) : (
                                projectsStats.map((p) => (
                                    <div
                                        key={p.id}
                                        className="p-3 bg-[#F9F9FF] border border-[#E2E8F0] rounded flex justify-between items-center gap-3"
                                    >
                                        <div className="min-w-0">
                                            <p className="text-[12.5px] font-bold text-[#04326D] truncate">{p.name}</p>
                                            <p className="text-[10.5px] text-gray-500 mt-0.5">
                                                {p.count} réquisition{p.count > 1 ? 's' : ''}
                                            </p>
                                        </div>
                                        <span className="text-[12.5px] font-mono tabular-nums font-bold text-[#0B192C] whitespace-nowrap">
                                            ${p.total_usd.toLocaleString('fr-FR')}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>

                    <section className="lg:col-span-5 bg-white border border-[#B2BED6] rounded">
                        <header className="px-4 py-3 border-b border-[#E2E8F0]">
                            <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#0B192C]">
                                Situation par caisse
                            </h2>
                        </header>
                        <div className="p-3 space-y-2">
                            {caissesStats.length === 0 ? (
                                <p className="text-[12px] text-gray-400 italic py-3 text-center">
                                    Aucune donnée.
                                </p>
                            ) : (
                                caissesStats.map((c, idx) => (
                                    <div
                                        key={idx}
                                        className="p-2.5 border border-[#E2E8F0] rounded flex justify-between items-center gap-3"
                                    >
                                        <div className="min-w-0">
                                            <p className="text-[12px] font-bold text-[#0B192C] truncate">{c.caisse}</p>
                                            <p className="text-[10.5px] text-gray-500 mt-0.5">
                                                {c.count} dossier{c.count > 1 ? 's' : ''}
                                            </p>
                                        </div>
                                        <div className="text-right font-mono tabular-nums">
                                            <p className="text-[12.5px] font-bold text-[#04326D]">
                                                ${c.total_usd.toLocaleString('fr-FR')}
                                            </p>
                                            <p className="text-[10px] text-emerald-700 font-bold">
                                                Décaissé : ${c.decaisse_usd.toLocaleString('fr-FR')}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                </div>

                <section className="bg-white border border-[#B2BED6] rounded overflow-hidden">
                    <header className="px-4 py-3 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h2 className="text-[13px] font-bold text-[#0B192C]">
                                Niveau d'avancement des réquisitions
                            </h2>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                                Cliquez sur une ligne pour consulter le circuit complet et l'historique des visas.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <FilterSelect value={selectedProject} onChange={setSelectedProject} label="Projet">
                                <option value="all">Tous les projets</option>
                                {projectsStats.map((p) => (
                                    <option key={p.id} value={p.name}>{p.name}</option>
                                ))}
                            </FilterSelect>

                            <FilterSelect value={selectedCaisse} onChange={setSelectedCaisse} label="Caisse">
                                <option value="all">Toutes les caisses</option>
                                {caissesStats.map((c, i) => (
                                    <option key={i} value={c.caisse}>{c.caisse}</option>
                                ))}
                            </FilterSelect>

                            <FilterSelect
                                value={decaissementFilter}
                                onChange={(v) => setDecaissementFilter(v as 'all' | 'decaissees' | 'non_decaissees')}
                                label="Décaissement"
                            >
                                <option value="all">Toutes</option>
                                <option value="decaissees">Décaissées</option>
                                <option value="non_decaissees">Non décaissées</option>
                            </FilterSelect>
                        </div>
                    </header>

                    {filteredList.length === 0 ? (
                        <EmptyState
                            title="Aucune réquisition"
                            description="Modifiez les filtres pour afficher d'autres résultats."
                        />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-[12.5px] border-collapse">
                                <thead>
                                    <tr className="bg-[#0B192C] text-white text-[10px] uppercase tracking-widest font-bold">
                                        <th className="py-2.5 px-4">Numéro</th>
                                        <th className="py-2.5 px-4">Projet / Caisse</th>
                                        <th className="py-2.5 px-4">Demandeur</th>
                                        <th className="py-2.5 px-4 text-right">Montant</th>
                                        <th className="py-2.5 px-4 text-center">Workflow</th>
                                        <th className="py-2.5 px-4 text-center">Décaissement</th>
                                        <th className="py-2.5 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E2E8F0]">
                                    {filteredList.map((req) => (
                                        <tr
                                            key={req.id}
                                            className="hover:bg-[#F9F9FF] cursor-pointer"
                                            onClick={() => setDetailReq(req)}
                                        >
                                            <td className="py-3 px-4 whitespace-nowrap">
                                                <span className="font-mono font-bold text-[#04326D]">{req.numero}</span>
                                                {req.is_urgent && (
                                                    <span className="ml-2 text-[9px] font-bold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                                        Urgent
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4">
                                                <p className="font-bold text-[#0B192C]">{req.projet}</p>
                                                <p className="text-[10.5px] text-gray-500 mt-0.5">{req.caisseAttribuee}</p>
                                            </td>
                                            <td className="py-3 px-4 whitespace-nowrap">
                                                <p className="font-bold text-gray-800">{req.initiateurNom}</p>
                                                <p className="text-[10.5px] text-gray-500 mt-0.5">{req.initiateurRole}</p>
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-[#0B192C] whitespace-nowrap">
                                                {money(req.montantTotal, req.devise)}
                                            </td>
                                            <td className="py-3 px-4 text-center whitespace-nowrap">
                                                <WorkflowBadge level={req.workflowLevel} />
                                            </td>
                                            <td className="py-3 px-4 text-center whitespace-nowrap">
                                                {req.is_decaissee ? (
                                                    <span className="inline-flex items-center text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded uppercase tracking-wide">
                                                        Décaissé
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center text-[10px] font-bold text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded uppercase tracking-wide">
                                                        Non décaissé
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-right whitespace-nowrap">
                                                <div
                                                    className="inline-flex items-center gap-1"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {req.statusCode === 'visa_admin' && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenSignature(req)}
                                                                className="px-2.5 py-1 bg-[#10B981] hover:bg-[#059669] text-white rounded text-[11px] font-bold transition"
                                                            >
                                                                Bon à payer
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setRejectReq(req);
                                                                    setRejectionReason('');
                                                                }}
                                                                className="px-2.5 py-1 bg-red-700 hover:bg-red-800 text-white rounded text-[11px] font-bold transition"
                                                            >
                                                                Rejeter
                                                            </button>
                                                        </>
                                                    )}
                                                    <IconButton
                                                        title="Consulter"
                                                        onClick={() => setDetailReq(req)}
                                                        icon={<Eye className="w-4 h-4" />}
                                                    />
                                                    <IconButton
                                                        title="Imprimer"
                                                        onClick={() => handlePrint(req)}
                                                        icon={<Printer className="w-4 h-4" />}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>

            <RequisitionDetailModal
                open={!!detailReq}
                requisition={detailReq}
                onClose={() => setDetailReq(null)}
                onPrint={(req) => handlePrint(req as RequisitionDirectrice)}
            />

            <PinSignatureModal
                open={!!signReq}
                requisitionNumero={signReq?.numero ?? ''}
                amountLabel={signReq ? money(signReq.montantTotal, signReq.devise) : ''}
                submitting={signing}
                error={pinError}
                onCancel={() => !signing && setSignReq(null)}
                onSubmit={handleSubmitSignature}
            />

            {rejectReq && (
                <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4">
                    <form onSubmit={handleReject} className="w-full max-w-lg space-y-4 rounded bg-white p-6 shadow-xl">
                        <h2 className="font-bold text-gray-900">
                            Rejeter la réquisition {rejectReq.numero}
                        </h2>
                        <p className="text-sm text-gray-600">
                            Le dossier sera retourné au PAM pour correction, puis resoumis à la Direction.
                        </p>
                        <label className="block text-sm font-semibold text-gray-700">
                            Motif du refus
                            <textarea
                                required
                                autoFocus
                                rows={4}
                                value={rejectionReason}
                                onChange={(event) => setRejectionReason(event.target.value)}
                                className="mt-1 w-full rounded border p-2 text-sm"
                            />
                        </label>
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                disabled={rejecting}
                                onClick={() => setRejectReq(null)}
                                className="rounded border px-4 py-2 text-sm"
                            >
                                Annuler
                            </button>
                            <button
                                type="submit"
                                disabled={rejecting || !rejectionReason.trim()}
                                className="rounded bg-red-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                            >
                                {rejecting ? 'Envoi…' : 'Rejeter et renvoyer au PAM'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

            {printRequisition && (
                <div id="bon-pasteur-print-zone">
                    <OfficialPrintSheet requisition={printRequisition} />
                </div>
            )}
        </AppLayout>
    );
}

function FilterSelect({
    value,
    onChange,
    label,
    children,
}: {
    value: string;
    onChange: (v: string) => void;
    label: string;
    children: ReactNode;
}) {
    return (
        <label className="inline-flex items-center gap-1.5 text-[11px] text-gray-600 font-bold uppercase tracking-wide">
            <span className="hidden sm:inline">{label}</span>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="border border-[#B2BED6] rounded px-2 py-1 text-[12px] bg-white text-[#0B192C] font-medium focus:outline-none focus:border-[#04326D] normal-case tracking-normal"
            >
                {children}
            </select>
        </label>
    );
}

function IconButton({ title, onClick, icon }: { title: string; onClick: () => void; icon: ReactNode }) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={title}
            className="p-1.5 text-gray-500 hover:text-[#04326D] hover:bg-gray-100 rounded transition"
        >
            {icon}
        </button>
    );
}

function WorkflowBadge({ level }: { level: { step: number; label: string; color: string } }) {
    const map: Record<string, string> = {
        emerald: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        green: 'bg-green-100 text-green-900 border-green-200',
        amber: 'bg-amber-100 text-amber-900 border-amber-200',
        purple: 'bg-purple-100 text-purple-800 border-purple-200',
        blue: 'bg-blue-100 text-blue-800 border-blue-200',
    };
    const cls = map[level.color] ?? 'bg-gray-100 text-gray-700 border-gray-200';
    return (
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide ${cls}`}>
            <span>Étape {level.step}</span>
            <span className="opacity-50">·</span>
            <span>{level.label}</span>
        </span>
    );
}