import { useState, useMemo } from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { PageProps } from '@/types';
import PettyCashVoucherPrint from '@/Components/PettyCashVoucherPrint';
import { numberToWordsFR } from '@/lib/numberToWords';

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
        requisitions.length > 0 ? requisitions[0].id : ''
    );

    const selectedRequisition = useMemo(() => {
        return requisitions.find(r => r.id === selectedReqId) || null;
    }, [requisitions, selectedReqId]);

    const vouchersDeLaRequisition = useMemo(() => {
        if (!selectedReqId) return [];
        return vouchers.filter(v => v.requisition_id === selectedReqId);
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
            requisition_id: selectedReqId
        });
    };

    const handleCreerVoucher = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('petty-cash.store'), {
            onSuccess: () => {
                reset('description', 'montant', 'montant_en_lettres');
            }
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
                    #bon-pasteur-petty-cash-sheet {
                        display: none;
                    }
                }
            `}</style>

            <div className="space-y-6 no-print-area">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
                    <div>
                        <nav className="text-[11px] text-gray-500 font-medium mb-1">
                            <Link href={route('dashboard')} className="hover:underline">Dashboard</Link>
                            <span className="mx-1.5">&rsaquo;</span>
                            <span className="text-[#0B192C] font-bold">Justifications & Petits Cash</span>
                        </nav>
                        <h1 className="text-xl font-bold text-[#0B192C]">
                            Justification par Petits Cash (&le; 20 USD / 30 000 FC)
                        </h1>
                        <p className="text-xs text-gray-500">
                            Sélectionnez une réquisition (Achat, Service ou Transport) pour justifier les menues dépenses sans facture.
                        </p>
                    </div>

                    <div className="text-right">
                        <span className="text-[10px] text-gray-400 block uppercase">Plafond Légal :</span>
                        <span className="text-xs font-bold text-[#F58F20] bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                            Max 20$ USD ou 30 000 FC
                        </span>
                    </div>
                </div>

                <div className="bg-white border border-[#B2BED6] rounded p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-[#0B192C] mb-1 uppercase tracking-wider">
                            1. Choisissez la Réquisition à justifier (depuis MySQL) :
                        </label>
                        {requisitions.length === 0 ? (
                            <p className="text-xs text-red-600 italic">
                                Aucune réquisition trouvée en base de données. Veuillez d'abord créer une réquisition.
                            </p>
                        ) : (
                            <select
                                value={selectedReqId}
                                onChange={(e) => {
                                    setSelectedReqId(e.target.value);
                                    setData('requisition_id', e.target.value);
                                }}
                                className="w-full md:max-w-xl border border-[#04326D] rounded p-2 text-xs font-bold text-[#04326D] bg-blue-50/40 focus:outline-none"
                            >
                                {requisitions.map((req) => (
                                    <option key={req.id} value={req.id}>
                                        {req.code} — {req.nature} • {req.projet} ({req.montantTotal.toLocaleString()} {req.devise}) - [{req.demandeurNom}]
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {selectedRequisition && (
                        <div className="text-right">
                            <span className="text-[10px] text-gray-500 block">Enveloppe de la réquisition :</span>
                            <span className="text-base font-black font-mono text-[#0B192C]">
                                {selectedRequisition.montantTotal.toLocaleString()} {selectedRequisition.devise}
                            </span>
                        </div>
                    )}
                </div>

                {selectedRequisition && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white border border-[#B2BED6] rounded p-4 shadow-sm">
                            <span className="text-[10px] font-bold text-gray-500 uppercase">Montant Initial Réquisition</span>
                            <p className="text-2xl font-black text-[#04326D] mt-1">
                                {selectedRequisition.montantTotal.toLocaleString()} {selectedRequisition.devise}
                            </p>
                            <p className="text-[11px] text-gray-400 mt-1">Réf : {selectedRequisition.code}</p>
                        </div>

                        <div className="bg-white border border-[#B2BED6] rounded p-4 shadow-sm">
                            <span className="text-[10px] font-bold text-gray-500 uppercase">Total Petits Cash Justifiés</span>
                            <p className="text-2xl font-black text-[#0B192C] mt-1">
                                {selectedRequisition.devise === 'FC' 
                                    ? `${totalVouchersCDF.toLocaleString()} FC` 
                                    : `$${totalVouchersUSD.toLocaleString()} USD`}
                            </p>
                            <p className="text-[11px] text-gray-400 mt-1">
                                {vouchersDeLaRequisition.length} voucher(s) rattaché(s)
                            </p>
                        </div>

                        <div className="bg-[#0B192C] text-white rounded p-4 shadow-sm flex flex-col justify-between">
                            <span className="text-[10px] font-bold text-[#B2BED6] uppercase">Nombre de Justificatifs</span>
                            <p className="text-2xl font-black mt-1">
                                {vouchersDeLaRequisition.length} Vouchers
                            </p>
                            <p className="text-[10px] text-gray-300">
                                Visés par le MP et archivés pour la Caisse
                            </p>
                        </div>
                    </div>
                )}

                {selectedRequisition && (
                    <div className="bg-white border border-[#B2BED6] rounded p-5 shadow-sm space-y-3">
                        <div className="flex justify-between items-center border-b pb-2">
                            <h2 className="text-xs font-bold text-[#0B192C] uppercase tracking-wider">
                                + Émettre un Petit Cash sur la réquisition {selectedRequisition.code}
                            </h2>
                            <span className="text-[10px] text-gray-500 italic">
                                Pour dépenses sans facture (ex: sac de marché 10 000 FC, transport taxi, réparations mineures)
                            </span>
                        </div>

                        <form onSubmit={handleCreerVoucher} className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
                            <div className="md:col-span-2">
                                <label className="block font-semibold text-gray-700 mb-1">Date</label>
                                <input
                                    type="date"
                                    value={data.date_voucher}
                                    onChange={(e) => setData('date_voucher', e.target.value)}
                                    className="w-full border border-gray-300 rounded p-1.5 text-xs focus:outline-none"
                                    required
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block font-semibold text-gray-700 mb-1">A/C CODE</label>
                                <input
                                    type="text"
                                    placeholder="ex: A/C-DEP"
                                    value={data.account_code}
                                    onChange={(e) => setData('account_code', e.target.value)}
                                    className="w-full border border-gray-300 rounded p-1.5 text-xs font-mono focus:outline-none"
                                    required
                                />
                            </div>

                            <div className="md:col-span-5">
                                <label className="block font-semibold text-gray-700 mb-1">Description / Motif de la dépense sans facture</label>
                                <input
                                    type="text"
                                    placeholder="ex: Achat d'un sac de marché au centre-ville..."
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    className="w-full border border-gray-300 rounded p-1.5 text-xs focus:outline-none"
                                    required
                                />
                                {errors.description && <p className="text-[10px] text-red-600 mt-0.5">{errors.description}</p>}
                            </div>

                            <div className="md:col-span-3 flex flex-col justify-end">
                                <label className="block font-semibold text-gray-700 mb-1">Montant & Devise</label>
                                <div className="flex gap-1.5">
                                    <select
                                        value={data.devise}
                                        onChange={(e) => handleMontantChange(data.montant, e.target.value as any)}
                                        className="border border-gray-300 rounded p-1.5 text-xs font-bold text-[#04326D] bg-white focus:outline-none"
                                    >
                                        <option value="FC">FC</option>
                                        <option value="USD">USD</option>
                                    </select>
                                    <input
                                        type="number"
                                        min="1"
                                        max={data.devise === 'FC' ? 30000 : 20}
                                        placeholder={data.devise === 'FC' ? "max 30000" : "max 20"}
                                        value={data.montant}
                                        onChange={(e) => handleMontantChange(e.target.value, data.devise)}
                                        className="w-full border border-gray-300 rounded p-1.5 text-xs font-bold text-[#0B192C] focus:outline-none"
                                        required
                                    />
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="bg-[#04326D] hover:bg-[#06428f] disabled:opacity-50 text-white px-3 py-1.5 rounded font-bold text-xs shrink-0"
                                    >
                                        Enregistrer
                                    </button>
                                </div>
                                {errors.montant && <p className="text-[10px] text-red-600 mt-0.5">{errors.montant}</p>}
                            </div>

                            {data.montant_en_lettres && (
                                <div className="md:col-span-12 p-2 bg-gray-50 border rounded text-[11px] italic text-gray-600">
                                    Montant en lettres : <strong>{data.montant_en_lettres}</strong>
                                </div>
                            )}
                        </form>
                    </div>
                )}

                <div className="bg-white border border-[#B2BED6] rounded shadow-sm overflow-hidden">
                    <div className="p-3.5 bg-[#0B192C] text-white flex items-center justify-between text-xs">
                        <span className="font-bold uppercase tracking-wider">
                            Petits Cash rattachés à cette réquisition ({vouchersDeLaRequisition.length})
                        </span>
                        <span className="text-gray-300">
                            Base de données MySQL
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-[#F1F5F9] text-gray-600 uppercase text-[10px] font-bold border-b border-[#B2BED6]">
                                    <th className="py-2.5 px-3">N° Voucher</th>
                                    <th className="py-2.5 px-3">Date</th>
                                    <th className="py-2.5 px-3">A/C CODE</th>
                                    <th className="py-2.5 px-4">Description (Dépense)</th>
                                    <th className="py-2.5 px-4 text-right">Montant</th>
                                    <th className="py-2.5 px-4 text-center">Visa MP (Checked by)</th>
                                    <th className="py-2.5 px-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E2E8F0] text-gray-700">
                                {vouchersDeLaRequisition.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-8 text-gray-400 italic">
                                            Aucun petit cash enregistré pour cette réquisition.
                                        </td>
                                    </tr>
                                ) : (
                                    vouchersDeLaRequisition.map((v) => (
                                        <tr key={v.id} className="hover:bg-[#F9F9FF] transition">
                                            <td className="py-3 px-3 font-mono font-bold text-[#04326D]">
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
                                            <td className="py-3 px-4 text-right font-mono font-bold text-[#0B192C] whitespace-nowrap">
                                                {v.montant_cdf > 0 ? `${v.montant_cdf.toLocaleString()} FC` : `$${v.montant_usd} USD`}
                                            </td>
                                            <td className="py-3 px-4 text-center whitespace-nowrap">
                                                {v.checked_by ? (
                                                    <span className="bg-emerald-50 text-[#065F46] font-bold px-2 py-0.5 rounded text-[10px]">
                                                        ✓ Visé par {v.checked_by}
                                                    </span>
                                                ) : (
                                                    <span className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded text-[10px]">
                                                        En attente visa MP
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-right whitespace-nowrap">
                                                <div className="inline-flex items-center gap-2">
                                                    {isMP && !v.checked_by && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleViserVoucherMP(v.id)}
                                                            className="px-2 py-1 bg-[#10B981] hover:bg-[#059669] text-white rounded font-bold text-[10px]"
                                                        >
                                                            Viser
                                                        </button>
                                                    )}

                                                    <button
                                                        type="button"
                                                        onClick={() => handlePrintVoucher(v)}
                                                        className="px-2.5 py-1 border border-[#04326D] text-[#04326D] hover:bg-blue-50 rounded font-bold text-[10px] flex items-center gap-1"
                                                        title="Imprimer le Petty Cash Voucher (Photo 3)"
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                                        </svg>
                                                        <span>Imprimer</span>
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