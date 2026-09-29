interface PettyCashVoucherProps {
    voucher: {
        numero_voucher: string;
        company_name?: string;
        date_voucher: string;
        description: string;
        account_code?: string;
        montant_cdf: number;
        montant_usd: number;
        montant_en_lettres: string;
        checked_by?: string;
        checked_at?: string;
        authorized_by?: string;
        authorized_at?: string;
        recipient_signature?: string;
    };
}

export default function PettyCashVoucherPrint({ voucher }: PettyCashVoucherProps) {
    return (
        <div id="bon-pasteur-petty-cash-sheet" className="p-6 bg-white text-black font-sans text-xs max-w-lg mx-auto border-2 border-black">
            {/* EN-TÊTE DU VOUCHER (PHOTO 3) */}
            <div className="text-center border-b-2 border-black pb-2 mb-3">
                <h1 className="text-base font-black uppercase tracking-wider">
                    {voucher.company_name || 'BON PASTEUR ASBL'}
                </h1>
                <h2 className="text-sm font-bold font-mono tracking-wide mt-0.5">
                    Petty Cash Voucher N° {voucher.numero_voucher}
                </h2>
            </div>

            <div className="flex justify-between items-center text-[11px] mb-3">
                <p><strong>Name of Company :</strong> ASBL BON PASTEUR</p>
                <p><strong>Date :</strong> {voucher.date_voucher}</p>
            </div>

            {/* TABLEAU COMPTABLE VOUCHER */}
            <table className="w-full border-collapse border border-black text-[11px] mb-3">
                <thead>
                    <tr className="bg-gray-100 text-center font-bold">
                        <th className="border border-black p-1.5 text-left">A/C (Account / Description)</th>
                        <th className="border border-black p-1.5 w-24">CDF</th>
                        <th className="border border-black p-1.5 w-20">USD</th>
                    </tr>
                </thead>
                <tbody>
                    <tr className="min-h-[60px]">
                        <td className="border border-black p-2 align-top">
                            <p className="font-medium">{voucher.description}</p>
                            <span className="text-[9px] text-gray-500 font-mono mt-1 block">Dépense de transport sans facture</span>
                        </td>
                        <td className="border border-black p-2 text-right font-mono font-bold align-top">
                            {voucher.montant_cdf > 0 ? voucher.montant_cdf.toLocaleString() : '—'}
                        </td>
                        <td className="border border-black p-2 text-right font-mono font-bold align-top">
                            {voucher.montant_usd > 0 ? voucher.montant_usd.toLocaleString() : '—'}
                        </td>
                    </tr>
                    {/* TOTAL */}
                    <tr className="font-bold bg-gray-50">
                        <td className="border border-black p-1.5 text-right uppercase">TOTAL</td>
                        <td className="border border-black p-1.5 text-right font-mono">
                            {voucher.montant_cdf > 0 ? voucher.montant_cdf.toLocaleString() : '—'}
                        </td>
                        <td className="border border-black p-1.5 text-right font-mono">
                            {voucher.montant_usd > 0 ? voucher.montant_usd.toLocaleString() : '—'}
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* MONTANT EN LETTRES & CODE COMPTE */}
            <div className="space-y-1.5 text-[11px] mb-6">
                <p>
                    <strong>Montant en lettre :</strong> <em>{voucher.montant_en_lettres}</em>
                </p>
                <p>
                    <strong>A/C CODE :</strong> <span className="font-mono">{voucher.account_code || 'A/C-TRP-01'}</span>
                </p>
            </div>

            {/* 3 SIGNATURES OFFICIELLES (PHOTO 3) */}
            <div className="grid grid-cols-3 gap-2 border-t border-black pt-3 text-center text-[10px]">
                {/* Checked by (MP) */}
                <div className="border border-black p-2 flex flex-col justify-between min-h-[75px]">
                    <p className="font-bold">Checked by :</p>
                    <p className="text-[9px] text-green-800 font-bold">{voucher.checked_by || 'Visa Manager Projet'}</p>
                    <p className="text-[8px] text-gray-400">{voucher.checked_at || '..../..../202..'}</p>
                </div>

                {/* Authorized by (Finance/Caisse) */}
                <div className="border border-black p-2 flex flex-col justify-between min-h-[75px]">
                    <p className="font-bold">Authorized by :</p>
                    <p className="text-[9px] text-green-800 font-bold">{voucher.authorized_by || 'Visa Finance/Caisse'}</p>
                    <p className="text-[8px] text-gray-400">{voucher.authorized_at || '..../..../202..'}</p>
                </div>

                {/* Signature of recipient */}
                <div className="border border-black p-2 flex flex-col justify-between min-h-[75px]">
                    <p className="font-bold">Signature of recipient :</p>
                    <p className="text-[9px] text-gray-800 font-bold">{voucher.recipient_signature || 'Bénéficiaire'}</p>
                    <p className="text-[8px] text-gray-400">Reçu conforme</p>
                </div>
            </div>
        </div>
    );
}