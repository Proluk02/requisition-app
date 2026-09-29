import { useState, useMemo } from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { PageProps } from '@/types';
import PettyCashVoucherPrint from '@/Components/PettyCashVoucherPrint';
import { numberToWordsFR } from '@/lib/numberToWords';
import {
    Wallet,
    Plus,
    CheckCircle2,
    Clock,
    Printer,
    ChevronRight,
    AlertCircle,
    Receipt,
    FileText,
} from 'lucide-react';

interface RequisitionOption {
    id: string;
    code: string;
    projet: string;
    nature: string;
    montantTotal: number;
    devise: string;
    status: string;
    demandeurNom: string;
}

interface PettyCashData {
    id: string;
    requisition_id: string;
    requisition_code: string;
    numero_voucher: string;
    company_name: string;
    date_voucher: string;
    account_code: string;
    description: string;
    montant_cdf: number;
    montant_usd: number;
    montant_en_lettres: string;
    checked_by?: string;
    checked_at?: string;
    authorized_by?: string;
    recipient_signature?: string;
    status: 'en_attente' | 'valide_mp' | 'apure';
}

interface Props extends PageProps {
    requisitions: RequisitionOption[];
    vouchers: PettyCashData[];
}

export default function TransportIndex({ requisitions = [], vouchers = [] }: Props) {
    const { auth } = usePage<PageProps>().props;
    const user = auth.user;
    const isMP = user.role === 'project_manager';

    const [selectedReqId, setSelectedReqId] = useState<string>(
        requisitions.length > 0 ? requisitions[0].id : '',
    );

    const selectedRequisition = useMemo(() => {
        return requisitions.find((r) => r.id === selectedReqId) || null;
    }, [requisitions, selectedReqId]);

    const vouchersDeLaRequisition = useMemo(() => {
        if (!selectedReqId) return [];
        return vouchers.filter((v) => v.requisition_id === selectedReqId);
    }, [vouchers, selectedReqId]);

    const totalVouchersCDF = useMemo(() => {
        return vouchersDeLaRequisition.reduce((acc, v) => acc + (v.montant_cdf || 0), 0);
    }, [vouchersDeLaRequisition]);

    const totalVouchersUSD = useMemo(() => {
        return vouchersDeLaRequisition.reduce((acc, v) => acc + (v.montant_usd || 0), 0);
    }, [vouchersDeLaRequisition]);

    const { data, setData, post, processing, errors, reset } = useForm({
        requisition_id: selectedReqId,
        date_voucher: new Date().toISOString().split('T')[0],
        account_code: 'A/C-01',
        description: '',
        devise: 'FC' as 'FC' | 'USD',
        montant: '',
        montant_en_lettres: '',
    });

    const handleMontantChange = (val: string, dev: 'FC' | 'USD') => {
        const num = parseFloat(val) || 0;
        setData({
            ...data,
            montant: val,
            devise: dev,
            montant_en_lettres: numberToWordsFR(num, dev as any),
            requisition_id: selectedReqId,
        });
    };

    const handleCreerVoucher = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('petty-cash.store'), {
            onSuccess: () => {
                reset('description', 'montant', 'montant_en_lettres');
            },
        });
    };

    const handleViserVoucherMP = (voucherId: string) => {
        useForm({}).patch(route('petty-cash.visa-mp', voucherId));
    };

    const [selectedPrintVoucher, setSelectedPrintVoucher] = useState<PettyCashData | null>(null);

    const handlePrintVoucher = (voucher: PettyCashData) => {
        setSelectedPrintVoucher(voucher);
        setTimeout(() => {
            window.print();
        }, 300);
    };

    return (
        <AppLayout>
            <Head title="Petits Cash & Justifications de Dépenses" />

            <style>{`
                @media print {
                    nav, aside, header, .no-print-area, button, select {
                        display: none !important;
                    }
                    #bon-pasteur-petty-cash-sheet {
                        display: block !important;
                        position: fixed;
                        left: 50%;
                        top: 20px;
                        transform: translateX(-50%);
                        width: 148mm !important;
                        background: white !important;
                        color: black !important;
                    }
                }
                @media screen {
                    #bon-pasteur-petty-cash-sheet { display: none; }
                }
            `}</style>

            <div className="space-y-6 no-print-area">
                {/* En-tête */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-soft pb-5">
                    <div>
                        <nav className="text-[11px] text-gray-500 font-medium mb-1 flex items-center gap-1">
                            <Link href={route('dashboard')} className="hover:text-primary transition">
                                Dashboard
                            </Link>
                            <ChevronRight className="w-3 h-3" />
                            <span className="text-on-surface font-bold">
                                Justifications & Petits Cash
                            </span>
                        </nav>
                        <h1 className="text-xl font-bold text-on-surface flex items-center gap-2">
                            <Wallet className="w-5 h-5 text-primary" />
                            Justification par Petits Cash
                        </h1>
                        <p className="text-xs text-gray-500 mt-1">
                            Sélectionnez une réquisition (Achat, Service ou Transport) pour
                            justifier les menues dépenses sans facture.
                        </p>
                    </div>

                    <div className="text-right">
                        <span className="text-[10px] text-gray-400 block uppercase tracking-wider font-bold">
                            Plafond Légal
                        </span>
                        <span className="text-xs font-bold text-tertiary bg-tertiary-soft px-2.5 py-1 rounded-md border border-tertiary/20 inline-flex items-center gap-1 mt-1">
                            <AlertCircle className="w-3 h-3" />
                            Max 20$ USD ou 30 000 FC
                        </span>
                    </div>
                </div>

                {/* Sélection réquisition */}
                <div className="bg-white border border-outline-soft rounded-lg p-4 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-on-surface mb-2 uppercase tracking-wider">
                            1. Choisissez la réquisition à justifier
                        </label>
                        {requisitions.length === 0 ? (
                            <p className="text-xs text-error italic flex items-center gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5" />
                                Aucune réquisition trouvée. Veuillez d'abord en créer une.
                            </p>
                        ) : (
                            <select
                                value={selectedReqId}
                                onChange={(e) => {
                                    setSelectedReqId(e.target.value);
                                    setData('requisition_id', e.target.value);
                                }}
                                className="w-full md:max-w-xl border border-primary rounded-md p-2.5 text-xs font-semibold text-primary bg-primary-soft/40 focus:outline-none focus:ring-1 focus:ring-primary/30 transition"
                            >
                                {requisitions.map((req) => (
                                    <option key={req.id} value={req.id}>
                                        {req.code} — {req.nature} • {req.projet} (
                                        {req.montantTotal.toLocaleString()} {req.devise}) — [
                                        {req.demandeurNom}]
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {selectedRequisition && (
                        <div className="text-right">
                            <span className="text-[10px] text-gray-500 block">
                                Enveloppe de la réquisition
                            </span>
                            <span className="text-base font-black font-mono text-on-surface">
                                {selectedRequisition.montantTotal.toLocaleString()}{' '}
                                {selectedRequisition.devise}
                            </span>
                        </div>
                    )}
                </div>

                {/* KPI */}
                {selectedRequisition && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white border border-outline-soft rounded-lg p-4 shadow-card">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                Montant Initial
                            </span>
                            <p className="text-2xl font-black text-primary mt-1.5">
                                {selectedRequisition.montantTotal.toLocaleString()}{' '}
                                {selectedRequisition.devise}
                            </p>
                            <p className="text-[11px] text-gray-400 mt-1">
                                Réf : {selectedRequisition.code}
                            </p>
                        </div>

                        <div className="bg-white border border-outline-soft rounded-lg p-4 shadow-card">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                Total Petits Cash Justifiés
                            </span>
                            <p className="text-2xl font-black text-on-surface mt-1.5">
                                {selectedRequisition.devise === 'FC'
                                    ? `${totalVouchersCDF.toLocaleString()} FC`
                                    : `$${totalVouchersUSD.toLocaleString()} USD`}
                            </p>
                            <p className="text-[11px] text-gray-400 mt-1">
                                {vouchersDeLaRequisition.length} voucher(s) rattaché(s)
                            </p>
                        </div>

                        <div className="bg-sidebar text-white rounded-lg p-4 shadow-card flex flex-col justify-between">
                            <span className="text-[10px] font-bold text-[#B2BED6] uppercase tracking-widest">
                                Nombre de Justificatifs
                            </span>
                            <p className="text-2xl font-black mt-1.5">
                                {vouchersDeLaRequisition.length}{' '}
                                <span className="text-base font-bold text-gray-400">
                                    Vouchers
                                </span>
                            </p>
                            <p className="text-[10px] text-gray-300">
                                Visés par le MP et archivés pour la Caisse
                            </p>
                        </div>
                    </div>
                )}

                {/* Formulaire création */}
                {selectedRequisition && (
                    <div className="bg-white border border-outline-soft rounded-lg p-5 shadow-card space-y-3">
                        <div className="flex flex-wrap justify-between items-center gap-2 border-b border-outline-soft pb-3">
                            <h2 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
                                <Plus className="w-3.5 h-3.5 text-primary" />
                                Émettre un Petit Cash sur {selectedRequisition.code}
                            </h2>
                            <span className="text-[10px] text-gray-500 italic">
                                Pour dépenses sans facture (ex : sac de marché 10 000 FC, transport,
                                réparations mineures)
                            </span>
                        </div>

                        <form
                            onSubmit={handleCreerVoucher}
                            className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs"
                        >
                            <div className="md:col-span-2">
                                <label className="block font-semibold text-gray-700 mb-1">
                                    Date
                                </label>
                                <input
                                    type="date"
                                    value={data.date_voucher}
                                    onChange={(e) => setData('date_voucher', e.target.value)}
                                    className="w-full border border-outline-variant rounded-md p-2 text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                                    required
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block font-semibold text-gray-700 mb-1">
                                    A/C CODE
                                </label>
                                <input
                                    type="text"
                                    placeholder="ex : A/C-DEP"
                                    value={data.account_code}
                                    onChange={(e) => setData('account_code', e.target.value)}
                                    className="w-full border border-outline-variant rounded-md p-2 text-xs font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                                    required
                                />
                            </div>

                            <div className="md:col-span-5">
                                <label className="block font-semibold text-gray-700 mb-1">
                                    Description / Motif de la dépense
                                </label>
                                <input
                                    type="text"
                                    placeholder="ex : Achat d'un sac de marché au centre-ville…"
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    className="w-full border border-outline-variant rounded-md p-2 text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                                    required
                                />
                                {errors.description && (
                                    <p className="text-[10px] text-error mt-1">
                                        {errors.description}
                                    </p>
                                )}
                            </div>

                            <div className="md:col-span-3 flex flex-col justify-end">
                                <label className="block font-semibold text-gray-700 mb-1">
                                    Montant & Devise
                                </label>
                                <div className="flex gap-1.5">
                                    <select
                                        value={data.devise}
                                        onChange={(e) =>
                                            handleMontantChange(
                                                data.montant,
                                                e.target.value as any,
                                            )
                                        }
                                        className="border border-outline-variant rounded-md p-2 text-xs font-bold text-primary bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                                    >
                                        <option value="FC">FC</option>
                                        <option value="USD">USD</option>
                                    </select>
                                    <input
                                        type="number"
                                        min="1"
                                        max={data.devise === 'FC' ? 30000 : 20}
                                        placeholder={data.devise === 'FC' ? 'max 30000' : 'max 20'}
                                        value={data.montant}
                                        onChange={(e) =>
                                            handleMontantChange(e.target.value, data.devise)
                                        }
                                        className="w-full border border-outline-variant rounded-md p-2 text-xs font-bold text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                                        required
                                    />
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="bg-primary hover:bg-primary-light disabled:opacity-50 text-white px-3 py-2 rounded-md font-semibold text-xs shrink-0 transition"
                                    >
                                        {processing ? '…' : 'Enregistrer'}
                                    </button>
                                </div>
                                {errors.montant && (
                                    <p className="text-[10px] text-error mt-1">{errors.montant}</p>
                                )}
                            </div>

                            {data.montant_en_lettres && (
                                <div className="md:col-span-12 p-2.5 bg-surface-muted border border-outline-soft rounded-md text-[11px] italic text-gray-600">
                                    Montant en lettres :{' '}
                                    <strong className="not-italic text-on-surface">
                                        {data.montant_en_lettres}
                                    </strong>
                                </div>
                            )}
                        </form>
                    </div>
                )}

                {/* Tableau vouchers */}
                <div className="bg-white border border-outline-soft rounded-lg shadow-card overflow-hidden">
                    <div className="p-4 bg-sidebar text-white flex items-center justify-between text-xs">
                        <span className="font-bold uppercase tracking-wider flex items-center gap-2">
                            <Receipt className="w-4 h-4" />
                            Petits Cash rattachés à cette réquisition (
                            {vouchersDeLaRequisition.length})
                        </span>
                        <span className="text-gray-300">Base de données</span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-surface-muted text-gray-600 uppercase text-[10px] font-bold border-b border-outline-soft">
                                    <th className="py-2.5 px-3">N° Voucher</th>
                                    <th className="py-2.5 px-3">Date</th>
                                    <th className="py-2.5 px-3">A/C CODE</th>
                                    <th className="py-2.5 px-4">Description</th>
                                    <th className="py-2.5 px-4 text-right">Montant</th>
                                    <th className="py-2.5 px-4 text-center">Visa MP</th>
                                    <th className="py-2.5 px-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-outline-soft text-gray-700">
                                {vouchersDeLaRequisition.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-12">
                                            <FileText
                                                className="w-10 h-10 mx-auto text-gray-300 mb-2"
                                                strokeWidth={1.5}
                                            />
                                            <p className="text-gray-500 font-medium text-sm">
                                                Aucun petit cash enregistré
                                            </p>
                                            <p className="text-gray-400 text-[11px] mt-1">
                                                Utilisez le formulaire ci-dessus pour en créer un.
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    vouchersDeLaRequisition.map((v) => (
                                        <tr key={v.id} className="hover:bg-primary-soft/40 transition-colors">
                                            <td className="py-3 px-3 font-mono font-bold text-primary">
                                                {v.numero_voucher}
                                            </td>
                                            <td className="py-3 px-3 text-gray-500 whitespace-nowrap">
                                                {v.date_voucher}
                                            </td>
                                            <td className="py-3 px-3 font-mono text-gray-600">
                                                {v.account_code}
                                            </td>
                                            <td className="py-3 px-4 font-medium text-gray-800">
                                                {v.description}
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono font-bold text-on-surface whitespace-nowrap">
                                                {v.montant_cdf > 0
                                                    ? `${v.montant_cdf.toLocaleString()} FC`
                                                    : `$${v.montant_usd} USD`}
                                            </td>
                                            <td className="py-3 px-4 text-center whitespace-nowrap">
                                                {v.checked_by ? (
                                                    <span className="inline-flex items-center gap-1 bg-success-soft text-success-dark font-bold px-2 py-0.5 rounded-md text-[10px]">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        Visé par {v.checked_by}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 bg-tertiary-soft text-tertiary font-bold px-2 py-0.5 rounded-md text-[10px]">
                                                        <Clock className="w-3 h-3" />
                                                        En attente visa
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-right whitespace-nowrap">
                                                <div className="inline-flex items-center gap-1.5">
                                                    {isMP && !v.checked_by && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleViserVoucherMP(v.id)}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-success hover:bg-success-dark text-white rounded-md font-semibold text-[10px] transition"
                                                        >
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            Viser
                                                        </button>
                                                    )}

                                                    <button
                                                        type="button"
                                                        onClick={() => handlePrintVoucher(v)}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 border border-primary text-primary hover:bg-primary-soft rounded-md font-semibold text-[10px] transition"
                                                        title="Imprimer le Petty Cash Voucher"
                                                    >
                                                        <Printer className="w-3 h-3" />
                                                        Imprimer
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

            {selectedPrintVoucher && (
                <div id="bon-pasteur-petty-cash-sheet">
                    <PettyCashVoucherPrint voucher={selectedPrintVoucher} />
                </div>
            )}
        </AppLayout>
    );
}