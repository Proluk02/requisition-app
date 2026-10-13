import { useEffect, useMemo, useState } from 'react';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { PageProps } from '@/types';
import { downloadPdf } from '@/lib/downloadPdf';
import {
    FileText,
    Plus,
    Printer,
    CheckCircle2,
    Clock,
    AlertCircle,
    X,
    Lock,
    KeyRound,
    Trash2,
    Calendar,
    Coins,
} from 'lucide-react';

interface RequisitionADecharger {
    id: string;
    numero: string;
    projet: string;
    nature: string;
    montantTotal: number;
    devise: string;
    demandeurNom: string;
    numero_bsc: string;
    imputation: string;
}

interface JustificationLineItem {
    id?: string;
    date_depense: string;
    description: string;
    montant_usd: number;
    montant_cdf: number;
    remarques?: string;
}

interface JustificationItem {
    id: string;
    numero_return_form: string;
    requisition_numero: string;
    demandeur_nom: string;
    pm_nom?: string;
    cashier_nom?: string;
    code_activite?: string;
    imputation: string;
    reference_bon_sortie: string;
    montant_recu: number;
    montant_utilise: number;
    solde: number;
    devise: string;
    status: 'brouillon' | 'valide_mp' | 'apure';
    created_at: string;
    lines: JustificationLineItem[];
}

interface JustificationLineFormItem {
    date_depense: string;
    description: string;
    montant_usd: string;
    montant_cdf: string;
    remarques: string;
}

interface CreateJustificationFormData {
    requisition_id: string;
    reference_bon_sortie: string;
    imputation: string;
    code_activite: string;
    devise: 'USD' | 'FC';
    montant_recu: string;
    lignes: JustificationLineFormItem[];
}

interface PinModalAction {
    type: 'pm' | 'cashier';
    justification: JustificationItem;
}

interface ServerValidationErrors {
    [key: string]: string | string[] | undefined;
}

interface Props extends PageProps {
    requisitionsADecharger: RequisitionADecharger[];
    justifications: JustificationItem[];
}

const money = (n: number, dev: string) =>
    `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${dev}`;

export default function JustificationsIndex({
    requisitionsADecharger = [],
    justifications = [],
}: Props) {
    const { auth, flash } = usePage<PageProps>().props;
    const user = auth.user;

    const isPM = user.role === 'project_manager' || auth.user.roles?.some((r) => r.name === 'project_manager');
    const isCashier = user.role === 'cashier' || auth.user.roles?.some((r) => r.name === 'cashier');
    const isAdmin = user.role === 'admin' || auth.user.roles?.some((r) => r.name === 'admin');

    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [pinModalAction, setPinModalAction] = useState<{
        type: 'pm' | 'cashier';
        justification: JustificationItem;
    } | null>(null);
    const [pin, setPin] = useState('');
    const [pinError, setPinError] = useState<string | null>(null);
    const [pinSubmitting, setPinSubmitting] = useState(false);

    const [printTarget, setPrintTarget] = useState<JustificationItem | null>(null);

    const form = useForm<{
        requisition_id: string;
        reference_bon_sortie: string;
        imputation: string;
        code_activite: string;
        devise: 'USD' | 'FC';
        montant_recu: string;
        lignes: {
            date_depense: string;
            description: string;
            montant_usd: string;
            montant_cdf: string;
            remarques: string;
        }[];
    }>({
        requisition_id: '',
        reference_bon_sortie: '',
        imputation: '6.112.a',
        code_activite: '',
        devise: 'FC',
        montant_recu: '0',
        lignes: [
            {
                date_depense: new Date().toISOString().slice(0, 10),
                description: '',
                montant_usd: '0',
                montant_cdf: '0',
                remarques: '',
            },
        ],
    });

    const handleSelectRequisition = (reqId: string) => {
        const req = requisitionsADecharger.find((r) => r.id === reqId);
        if (!req) return;

        form.setData({
            ...form.data,
            requisition_id: req.id,
            reference_bon_sortie: req.numero_bsc,
            imputation: req.imputation,
            devise: req.devise as 'USD' | 'FC',
            montant_recu: String(req.montantTotal),
        });
    };

    const handleAddLine = () => {
        form.setData('lignes', [
            ...form.data.lignes,
            {
                date_depense: new Date().toISOString().slice(0, 10),
                description: '',
                montant_usd: '0',
                montant_cdf: '0',
                remarques: '',
            },
        ]);
    };

    const handleRemoveLine = (idx: number) => {
        if (form.data.lignes.length <= 1) return;
        const updated = form.data.lignes.filter((_, i) => i !== idx);
        form.setData('lignes', updated);
    };

    const handleUpdateLine = (idx: number, field: string, value: string) => {
        const updated = [...form.data.lignes];
        updated[idx] = { ...updated[idx], [field]: value };
        form.setData('lignes', updated);
    };

    const totalUtiliseCalcule = useMemo(() => {
        return form.data.lignes.reduce((sum, line) => {
            const val = form.data.devise === 'FC' ? parseFloat(line.montant_cdf) : parseFloat(line.montant_usd);
            return sum + (isNaN(val) ? 0 : val);
        }, 0);
    }, [form.data.lignes, form.data.devise]);

    const soldeCalcule = useMemo(() => {
        const recu = parseFloat(form.data.montant_recu) || 0;
        return roundToTwo(recu - totalUtiliseCalcule);
    }, [form.data.montant_recu, totalUtiliseCalcule]);

    function roundToTwo(num: number) {
        return Math.round((num + Number.EPSILON) * 100) / 100;
    }

    const handleSubmitCreate = (e: React.FormEvent) => {
        e.preventDefault();
        form.post(route('justifications.store'), {
            preserveScroll: true,
            onSuccess: () => {
                setCreateModalOpen(false);
                form.reset();
            },
        });
    };

    const handleConfirmPinAction = (e: React.FormEvent) => {
        e.preventDefault();
        if (!pinModalAction || !pin.trim()) return;

        setPinSubmitting(true);
        setPinError(null);

        const targetUrl = pinModalAction.type === 'pm'
            ? route('justifications.visa-mp', pinModalAction.justification.id)
            : route('justifications.apurer', pinModalAction.justification.id);

        router.patch(
            targetUrl,
            { pin: pin.trim() },
            {
                preserveScroll: true,
                onFinish: () => setPinSubmitting(false),
                onSuccess: () => {
                    setPinModalAction(null);
                    setPin('');
                },
                onError: (errs) => {
                    setPinError(errs.pin || Object.values(errs)[0] || 'Erreur lors de la validation.');
                },
            }
        );
    };

    const handleTriggerPrint = (item: JustificationItem) => {
        setPrintTarget(item);
    };

    useEffect(() => {
        if (!printTarget) return;
        void downloadPdf(
            'appendice2-print-sheet',
            `${printTarget.numero_return_form}.pdf`,
            { contentWidth: '190mm' }
        ).then(() => setPrintTarget(null));
    }, [printTarget]);

    return (
        <AppLayout>
            <Head title="Justifications des Dépenses — Appendice 2" />

            <style>{`
                @media print {
                    nav, aside, header, .no-print-area, button, select {
                        display: none !important;
                    }
                    #appendice2-print-sheet {
                        display: block !important;
                        position: fixed;
                        left: 50%;
                        top: 15px;
                        transform: translateX(-50%);
                        width: 210mm !important;
                        background: white !important;
                        color: black !important;
                    }
                }
                @media screen {
                    #appendice2-print-sheet { display: none; }
                }
            `}</style>

            <div className="space-y-6 no-print-area">
                <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
                    <div>
                        <nav className="text-[10px] font-bold uppercase tracking-widest text-[#B2BED6] mb-1.5 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-[#04326D]" />
                            <span>Opérations</span>
                            <span className="mx-1">/</span>
                            <span className="text-[#04326D]">Décharges & Justifications</span>
                        </nav>
                        <h1 className="text-xl font-bold text-[#0B192C]">
                            Formulaire de Justification des Dépenses (Appendice 2)
                        </h1>
                        <p className="text-[12px] text-gray-500 mt-1">
                            Justification détaillée des fonds décaissés à la caisse sous 48h et apurement du solde.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            if (requisitionsADecharger.length > 0) {
                                handleSelectRequisition(requisitionsADecharger[0].id);
                            }
                            setCreateModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#04326D] hover:bg-[#06428f] text-white rounded font-bold text-xs shadow-sm transition"
                    >
                        <Plus className="w-4 h-4 text-emerald-400" />
                        <span>Créer Décharge (Return Form)</span>
                    </button>
                </header>

                {flash?.success && (
                    <div className="p-3.5 rounded bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                        <span>{flash.success}</span>
                    </div>
                )}
                {flash?.error && (
                    <div className="p-3.5 rounded bg-red-50 border border-red-300 text-red-900 text-xs font-semibold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-700 shrink-0" />
                        <span>{flash.error}</span>
                    </div>
                )}

                {/* Réquisitions décaissées en attente de décharge */}
                {requisitionsADecharger.length > 0 && (
                    <div className="bg-amber-50 border border-amber-300 rounded p-4 space-y-2">
                        <span className="text-[11px] font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-amber-700" />
                            Dossiers Décaissés à Justifier sous 48h ({requisitionsADecharger.length})
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-1 text-xs">
                            {requisitionsADecharger.map((r) => (
                                <div key={r.id} className="p-2.5 bg-white border border-amber-200 rounded flex justify-between items-center">
                                    <div>
                                        <strong className="text-[#0B192C]">{r.numero}</strong>
                                        <p className="text-[10.5px] text-gray-500">BSC: {r.numero_bsc}</p>
                                        <span className="text-[11px] font-mono font-bold text-[#04326D]">
                                            {money(r.montantTotal, r.devise)}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            handleSelectRequisition(r.id);
                                            setCreateModalOpen(true);
                                        }}
                                        className="px-2.5 py-1 bg-[#04326D] text-white rounded text-[11px] font-bold hover:bg-[#06428f]"
                                    >
                                        Décharger
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Historique des Return Forms */}
                <div className="bg-white border border-[#B2BED6] rounded shadow-sm overflow-hidden">
                    <header className="p-4 border-b flex items-center justify-between bg-gray-50">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B192C]">
                            Historique des Formulaires de Décharge ({justifications.length})
                        </h3>
                        <span className="text-xs text-gray-500 font-mono font-bold">Appendice 2</span>
                    </header>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-[#0B192C] text-white uppercase text-[10px] font-bold tracking-wider">
                                    <th className="py-3 px-4">N° Return Form</th>
                                    <th className="py-3 px-4">Réf Bon Sortie (BSC)</th>
                                    <th className="py-3 px-4">Demandeur</th>
                                    <th className="py-3 px-4">Imputation</th>
                                    <th className="py-3 px-4 text-right">Montant Reçu</th>
                                    <th className="py-3 px-4 text-right">Montant Utilisé</th>
                                    <th className="py-3 px-4 text-right">Solde Restant</th>
                                    <th className="py-3 px-4 text-center">État</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E2E8F0] text-gray-700">
                                {justifications.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="py-12 text-center text-gray-400 italic">
                                            Aucune décharge enregistrée.
                                        </td>
                                    </tr>
                                ) : (
                                    justifications.map((j) => (
                                        <tr key={j.id} className="hover:bg-[#F9F9FF] transition">
                                            <td className="py-3.5 px-4 font-mono font-bold text-[#04326D] whitespace-nowrap">
                                                {j.numero_return_form}
                                            </td>
                                            <td className="py-3.5 px-4 font-mono font-semibold text-gray-800 whitespace-nowrap">
                                                {j.reference_bon_sortie}
                                            </td>
                                            <td className="py-3.5 px-4 font-bold text-[#0B192C]">
                                                {j.demandeur_nom}
                                            </td>
                                            <td className="py-3.5 px-4 font-mono font-bold text-gray-600">
                                                {j.imputation}
                                            </td>
                                            <td className="py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap">
                                                {money(j.montant_recu, j.devise)}
                                            </td>
                                            <td className="py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap text-[#04326D]">
                                                {money(j.montant_utilise, j.devise)}
                                            </td>
                                            <td className="py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap">
                                                <span className={j.solde > 0 ? 'text-amber-700 font-black' : 'text-gray-900'}>
                                                    {money(j.solde, j.devise)}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                                {j.status === 'brouillon' ? (
                                                    <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px] font-bold">
                                                        Attente Visa MP
                                                    </span>
                                                ) : j.status === 'valide_mp' ? (
                                                    <span className="px-2 py-0.5 rounded bg-blue-100 text-[#04326D] text-[10px] font-bold">
                                                        Visé MP (Prêt Caisse)
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                                        Apuré
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                                <div className="inline-flex items-center gap-1">
                                                    {isPM && j.status === 'brouillon' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setPinModalAction({ type: 'pm', justification: j })}
                                                            className="px-2.5 py-1 bg-[#04326D] text-white rounded text-[11px] font-bold hover:bg-[#06428f]"
                                                        >
                                                            Viser (PIN)
                                                        </button>
                                                    )}
                                                    {(isCashier || isAdmin) && j.status === 'valide_mp' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setPinModalAction({ type: 'cashier', justification: j })}
                                                            className="px-2.5 py-1 bg-[#10B981] text-white rounded text-[11px] font-bold hover:bg-[#059669]"
                                                        >
                                                            Apurer (Caisse)
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleTriggerPrint(j)}
                                                        className="p-1.5 text-gray-500 hover:text-[#04326D] hover:bg-gray-100 rounded transition"
                                                        title="Imprimer Appendice 2"
                                                    >
                                                        <Printer className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* MODALE : Création Décharge / Return Form */}
            {createModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
                    <div className="bg-white rounded border border-[#B2BED6] shadow-2xl max-w-4xl w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto animate-slide-down">
                        <header className="flex items-start justify-between border-b pb-3">
                            <div>
                                <span className="text-[10px] uppercase font-bold text-gray-400">Appendice 2</span>
                                <h3 className="text-base font-bold text-[#0B192C]">
                                    Formulaire pour les Dépenses de la Petite Caisse (Return Form)
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setCreateModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </header>

                        <form onSubmit={handleSubmitCreate} className="space-y-4 text-xs">
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-gray-50 p-3 rounded border">
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Réf Bon de Sortie (BSC) *</label>
                                    <input
                                        type="text"
                                        placeholder="ex: CHA 107/08/461"
                                        value={form.data.reference_bon_sortie}
                                        onChange={(e) => form.setData('reference_bon_sortie', e.target.value)}
                                        className="w-full border border-[#B2BED6] rounded p-2 text-xs font-mono font-bold focus:outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">N° Budget (Imputation) *</label>
                                    <input
                                        type="text"
                                        placeholder="ex: 6.112.a"
                                        value={form.data.imputation}
                                        onChange={(e) => form.setData('imputation', e.target.value)}
                                        className="w-full border border-[#B2BED6] rounded p-2 text-xs font-mono font-bold text-[#04326D] focus:outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Code d'Activité</label>
                                    <input
                                        type="text"
                                        placeholder="Optionnel"
                                        value={form.data.code_activite}
                                        onChange={(e) => form.setData('code_activite', e.target.value)}
                                        className="w-full border border-[#B2BED6] rounded p-2 text-xs focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Montant Total Reçu *</label>
                                    <div className="flex gap-1">
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={form.data.montant_recu}
                                            onChange={(e) => form.setData('montant_recu', e.target.value)}
                                            className="w-full border border-[#B2BED6] rounded p-2 text-xs font-mono font-bold text-emerald-700 focus:outline-none"
                                            required
                                        />
                                        <span className="p-2 bg-gray-200 rounded font-bold">{form.data.devise}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Lignes du tableau Appendice 2 */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="block font-bold text-[#0B192C] uppercase tracking-wider text-[11px]">
                                        Détail des Dépenses Effectuées
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleAddLine}
                                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#04326D] hover:underline"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Ajouter une ligne
                                    </button>
                                </div>

                                <div className="border border-[#B2BED6] rounded overflow-hidden">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead className="bg-[#0B192C] text-white text-[10px] uppercase font-bold tracking-wider">
                                            <tr>
                                                <th className="p-2 w-28">Date Utilisat°</th>
                                                <th className="p-2">Description des Dépenses</th>
                                                <th className="p-2 w-28 text-right">
                                                    {form.data.devise === 'FC' ? 'CDF' : 'USD'}
                                                </th>
                                                <th className="p-2 w-40">Remarques</th>
                                                <th className="p-2 w-8 text-center" />
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {form.data.lignes.map((line, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50">
                                                    <td className="p-1.5">
                                                        <input
                                                            type="date"
                                                            value={line.date_depense}
                                                            onChange={(e) => handleUpdateLine(idx, 'date_depense', e.target.value)}
                                                            className="w-full border rounded p-1 text-xs"
                                                            required
                                                        />
                                                    </td>
                                                    <td className="p-1.5">
                                                        <input
                                                            type="text"
                                                            placeholder="Détail de la dépense..."
                                                            value={line.description}
                                                            onChange={(e) => handleUpdateLine(idx, 'description', e.target.value)}
                                                            className="w-full border rounded p-1 text-xs"
                                                            required
                                                        />
                                                    </td>
                                                    <td className="p-1.5 text-right">
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            value={form.data.devise === 'FC' ? line.montant_cdf : line.montant_usd}
                                                            onChange={(e) =>
                                                                handleUpdateLine(
                                                                    idx,
                                                                    form.data.devise === 'FC' ? 'montant_cdf' : 'montant_usd',
                                                                    e.target.value
                                                                )
                                                            }
                                                            className="w-full border rounded p-1 text-xs font-mono font-bold text-right"
                                                            required
                                                        />
                                                    </td>
                                                    <td className="p-1.5">
                                                        <input
                                                            type="text"
                                                            placeholder="ex: Transport Air CHA"
                                                            value={line.remarques}
                                                            onChange={(e) => handleUpdateLine(idx, 'remarques', e.target.value)}
                                                            className="w-full border rounded p-1 text-xs"
                                                        />
                                                    </td>
                                                    <td className="p-1.5 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveLine(idx)}
                                                            disabled={form.data.lignes.length <= 1}
                                                            className="text-gray-400 hover:text-red-600 disabled:opacity-20"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Récapitulatif du Solde */}
                            <div className="grid grid-cols-3 gap-3 p-3 bg-blue-50/70 border border-blue-200 rounded font-mono text-xs">
                                <div>
                                    <span className="text-[10px] uppercase font-bold text-gray-500 block">Total Reçu</span>
                                    <strong className="text-sm font-bold text-gray-800">
                                        {money(parseFloat(form.data.montant_recu) || 0, form.data.devise)}
                                    </strong>
                                </div>
                                <div>
                                    <span className="text-[10px] uppercase font-bold text-[#04326D] block">Total Utilisé</span>
                                    <strong className="text-sm font-bold text-[#04326D]">
                                        {money(totalUtiliseCalcule, form.data.devise)}
                                    </strong>
                                </div>
                                <div>
                                    <span className="text-[10px] uppercase font-bold text-amber-800 block">
                                        Solde (À retourner en caisse)
                                    </span>
                                    <strong className="text-sm font-black text-amber-700">
                                        {money(soldeCalcule, form.data.devise)}
                                    </strong>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t">
                                <button
                                    type="button"
                                    onClick={() => setCreateModalOpen(false)}
                                    className="px-3.5 py-1.5 border border-[#B2BED6] rounded text-xs font-semibold text-gray-600 hover:bg-gray-50"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={form.processing}
                                    className="px-4 py-1.5 bg-[#04326D] hover:bg-[#06428f] text-white rounded text-xs font-bold shadow transition"
                                >
                                    Enregistrer la Décharge
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODALE : Visa PM ou Apurement Caissier par Code PIN */}
            {pinModalAction && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
                    <div className="bg-white rounded border-2 border-[#04326D] shadow-2xl max-w-sm w-full p-6 space-y-4 animate-slide-down">
                        <header className="border-b pb-2 text-center">
                            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-1.5">
                                <Lock className="w-5 h-5 text-[#04326D]" />
                            </div>
                            <h3 className="text-sm font-bold text-[#0B192C] uppercase tracking-wide">
                                {pinModalAction.type === 'pm' ? 'Visa Chef de Projet (Décharge)' : 'Apurement Caissier (Clôture)'}
                            </h3>
                            <p className="text-[11px] text-gray-500">
                                Réf : <strong>{pinModalAction.justification.numero_return_form}</strong>
                            </p>
                        </header>

                        {pinModalAction.type === 'cashier' && pinModalAction.justification.solde > 0 && (
                            <div className="p-2.5 bg-amber-50 border border-amber-300 rounded text-[11px] text-amber-900 leading-snug">
                                <strong>Retour de fonds détecté :</strong> Le solde non utilisé de{' '}
                                <strong>{money(pinModalAction.justification.solde, pinModalAction.justification.devise)}</strong> sera automatiquement réintégré en caisse sous un <strong>Bon d'Entrée Caisse (BEC)</strong>.
                            </div>
                        )}

                        {pinError && (
                            <div className="p-2 bg-red-50 border border-red-300 text-red-800 rounded text-xs">
                                {pinError}
                            </div>
                        )}

                        <form onSubmit={handleConfirmPinAction} className="space-y-3 text-xs">
                            <div>
                                <label className="block font-bold text-gray-700 mb-1">
                                    Code PIN personnel ({pinModalAction.type === 'pm' ? 'MP' : 'Caissier'}) *
                                </label>
                                <div className="relative">
                                    <KeyRound className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    <input
                                        type="password"
                                        maxLength={6}
                                        placeholder="••••"
                                        value={pin}
                                        onChange={(e) => setPin(e.target.value)}
                                        className="w-full pl-8 pr-3 py-2 border rounded font-mono text-center tracking-widest text-sm focus:outline-none focus:border-[#04326D]"
                                        autoFocus
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t">
                                <button
                                    type="button"
                                    onClick={() => setPinModalAction(null)}
                                    className="px-3 py-1.5 border rounded text-xs text-gray-600 hover:bg-gray-50"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={pinSubmitting}
                                    className="px-4 py-1.5 bg-[#04326D] hover:bg-[#06428f] text-white rounded text-xs font-bold shadow"
                                >
                                    {pinSubmitting ? 'Validation...' : 'Confirmer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* FORMAT D'IMPRESSION OFFICIEL APPENDICE 2 (Photos 5 & 6) */}
            {printTarget && (
                <div id="appendice2-print-sheet" className="p-6 border-2 border-black font-sans text-black text-xs space-y-4">
                    <div className="flex items-start justify-between border-b border-black pb-2">
                        <div>
                            <span className="text-[10px] italic block">p l'appendice 2 (Revisé en octobre 2019)</span>
                            <h2 className="text-sm font-black uppercase tracking-wider">
                                Le formulaire pour les dépenses de la petite caisse
                            </h2>
                        </div>
                        <div className="text-right font-mono text-[11px] space-y-0.5">
                            <p><strong>N° Return :</strong> {printTarget.numero_return_form}</p>
                            <p><strong>Réf BSC :</strong> {printTarget.reference_bon_sortie}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border border-black p-2 text-xs">
                        <p><strong>Code d'activité :</strong> {printTarget.code_activite || '—'}</p>
                        <p><strong>N° Budget (Imputation) :</strong> <span className="font-mono font-bold">{printTarget.imputation}</span></p>
                    </div>

                    <table className="w-full text-left border-collapse border border-black text-xs">
                        <thead>
                            <tr className="bg-gray-100 font-bold border-b border-black">
                                <th className="p-2 border-r border-black w-24">Date d'utilisat°</th>
                                <th className="p-2 border-r border-black">La description des dépenses</th>
                                <th className="p-2 border-r border-black w-24 text-right">USD</th>
                                <th className="p-2 border-r border-black w-24 text-right">CDF</th>
                                <th className="p-2 w-32">Remarques</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-black">
                            {printTarget.lines.map((line, idx) => (
                                <tr key={idx}>
                                    <td className="p-1.5 border-r border-black">{line.date_depense}</td>
                                    <td className="p-1.5 border-r border-black font-medium">{line.description}</td>
                                    <td className="p-1.5 border-r border-black text-right font-mono">
                                        {line.montant_usd > 0 ? line.montant_usd.toLocaleString('fr-FR') : ''}
                                    </td>
                                    <td className="p-1.5 border-r border-black text-right font-mono">
                                        {line.montant_cdf > 0 ? line.montant_cdf.toLocaleString('fr-FR') : ''}
                                    </td>
                                    <td className="p-1.5">{line.remarques || ''}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="border border-black p-3 space-y-1 font-mono text-xs w-72 ml-auto">
                        <div className="flex justify-between">
                            <span>Le montant total reçu :</span>
                            <strong>{printTarget.montant_recu.toLocaleString('fr-FR')} {printTarget.devise}</strong>
                        </div>
                        <div className="flex justify-between">
                            <span>Le montant total utilisé :</span>
                            <strong>{printTarget.montant_utilise.toLocaleString('fr-FR')} {printTarget.devise}</strong>
                        </div>
                        <div className="flex justify-between border-t border-black pt-1 font-bold">
                            <span>Le solde :</span>
                            <strong>{printTarget.solde.toLocaleString('fr-FR')} {printTarget.devise}</strong>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-6 text-center text-xs">
                        <div className="space-y-10">
                            <p className="font-bold underline">Nom/Signature Project Manager</p>
                            <p className="font-bold">{printTarget.pm_nom || 'Visé électroniquement'}</p>
                        </div>
                        <div className="space-y-10">
                            <p className="font-bold underline">Nom/Signature d'utilisateur</p>
                            <p className="font-bold">{printTarget.demandeur_nom}</p>
                        </div>
                        <div className="space-y-10">
                            <p className="font-bold underline">Nom/Signature de caisse</p>
                            <p className="font-bold">{printTarget.cashier_nom || 'Apuré en caisse'}</p>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}