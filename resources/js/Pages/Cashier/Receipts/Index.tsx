import { useState } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { PageProps } from '@/types';
import { numberToWordsFR } from '@/lib/numberToWords';
import {
    ArrowDownLeft,
    Building2,
    CheckCircle2,
    Plus,
    Printer,
    Search,
    Lock,
    KeyRound,
    AlertCircle,
    X,
} from 'lucide-react';

interface CaisseOption {
    id: string;
    name: string;
    devise: string;
    solde_actuel: number;
    is_ouverte: boolean;
}

interface MovementBEC {
    id: string;
    numero_piece: string;
    date_mouvement: string;
    tiers_nom: string;
    montant: number;
    devise: string;
    montant_en_lettres: string;
    motif: string;
    imputation: string;
    mode_paiement: string;
    reference_externe: string | null;
    caisse_nom?: string;
    cashier_nom?: string;
}

interface Props extends PageProps {
    userCaisses: CaisseOption[];
    selectedCaisse: CaisseOption | null;
    receipts: MovementBEC[];
}

const money = (n: number, dev: string) =>
    `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${dev}`;

export default function ReceiptsIndex({
    userCaisses = [],
    selectedCaisse,
    receipts = [],
}: Props) {
    const { flash } = usePage<PageProps>().props;

    const [modalOpen, setModalOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [printBEC, setPrintBEC] = useState<MovementBEC | null>(null);

    const form = useForm({
        tiers_nom: '',
        montant: '',
        devise: selectedCaisse?.devise ?? 'FC',
        montant_en_lettres: '',
        motif: '',
        imputation: '6.112.a',
        mode_paiement: 'Espèces',
        reference_externe: '',
        pin: '',
    });

    const handleSelectCaisse = (id: string) => {
        router.get(
            route('cashier.receipts.index'),
            { caisse_id: id },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handleMontantChange = (val: string) => {
        const num = parseFloat(val) || 0;
        form.setData({
            ...form.data,
            montant: val,
            montant_en_lettres: numberToWordsFR(num, form.data.devise as any),
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCaisse) return;

        form.post(route('cashier.movement.entree', selectedCaisse.id), {
            preserveScroll: true,
            onSuccess: () => {
                setModalOpen(false);
                form.reset();
            },
        });
    };

    const handleTriggerPrint = (bec: MovementBEC) => {
        setPrintBEC(bec);
        setTimeout(() => window.print(), 300);
    };

    const filteredReceipts = receipts.filter((r) =>
        r.numero_piece.toLowerCase().includes(search.toLowerCase()) ||
        r.tiers_nom.toLowerCase().includes(search.toLowerCase()) ||
        r.motif.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <AppLayout>
            <Head title="Bons d'Entrée Caisse — Approvisionnements" />

            <style>{`
                @media print {
                    nav, aside, header, .no-print-area, button, select {
                        display: none !important;
                    }
                    #bon-entree-caisse-print {
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
                    #bon-entree-caisse-print { display: none; }
                }
            `}</style>

            <div className="space-y-6 no-print-area">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
                    <div>
                        <nav className="text-[10px] font-bold uppercase tracking-widest text-[#B2BED6] mb-1.5 flex items-center gap-1.5">
                            <ArrowDownLeft className="w-3.5 h-3.5 text-[#04326D]" />
                            <span>Guichet Caisse</span>
                            <span className="mx-1">/</span>
                            <span className="text-[#04326D]">Bons d'Entrée</span>
                        </nav>
                        <h1 className="text-xl font-bold text-[#0B192C]">
                            Entrées de Caisse & Approvisionnements (BEC)
                        </h1>
                        <p className="text-[12px] text-gray-500 mt-1">
                            Enregistrement des versements de fonds, réapprovisionnements de guichet et retours de décharge.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {userCaisses.length > 1 && (
                            <div className="flex items-center gap-2 bg-white border border-[#B2BED6] rounded px-3 py-1.5">
                                <Building2 className="w-4 h-4 text-[#04326D]" />
                                <select
                                    value={selectedCaisse?.id ?? ''}
                                    onChange={(e) => handleSelectCaisse(e.target.value)}
                                    className="border-none bg-transparent text-[12px] font-bold text-[#04326D] focus:outline-none cursor-pointer"
                                >
                                    {userCaisses.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name} ({c.devise})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={() => setModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#04326D] hover:bg-[#06428f] text-white rounded font-bold text-xs shadow-sm transition"
                        >
                            <Plus className="w-4 h-4 text-emerald-400" />
                            <span>Nouveau Bon d'Entrée (BEC)</span>
                        </button>
                    </div>
                </header>

                {flash?.success && (
                    <div className="p-3.5 rounded bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                        <span>{flash.success}</span>
                    </div>
                )}

                <div className="bg-white border border-[#B2BED6] rounded shadow-sm overflow-hidden">
                    <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#0B192C]">
                            Historique des Bons d'Entrée Caisse ({receipts.length})
                        </span>
                        <div className="relative w-full sm:w-64">
                            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Rechercher pièce, déposant, motif..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 border border-[#B2BED6] rounded text-xs focus:outline-none focus:border-[#04326D]"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-[#0B192C] text-white uppercase text-[10px] font-bold tracking-wider">
                                    <th className="py-3 px-4">N° Pièce</th>
                                    <th className="py-3 px-4">Date</th>
                                    <th className="py-3 px-4">Reçu de (Déposant)</th>
                                    <th className="py-3 px-4">Motif</th>
                                    <th className="py-3 px-4">Imputation</th>
                                    <th className="py-3 px-4 text-right">Montant Encaissé</th>
                                    <th className="py-3 px-4 text-right">Imprimer</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E2E8F0] text-gray-700">
                                {filteredReceipts.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center text-gray-400 italic">
                                            Aucun Bon d'Entrée Caisse enregistré pour ce guichet.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredReceipts.map((bec) => (
                                        <tr key={bec.id} className="hover:bg-[#F9F9FF] transition">
                                            <td className="py-3.5 px-4 font-mono font-bold text-[#04326D] whitespace-nowrap">
                                                {bec.numero_piece}
                                            </td>
                                            <td className="py-3.5 px-4 whitespace-nowrap text-gray-600">
                                                {bec.date_mouvement}
                                            </td>
                                            <td className="py-3.5 px-4 font-bold text-gray-800">
                                                {bec.tiers_nom}
                                            </td>
                                            <td className="py-3.5 px-4 max-w-xs truncate" title={bec.motif}>
                                                {bec.motif}
                                            </td>
                                            <td className="py-3.5 px-4 font-mono font-bold text-gray-600">
                                                {bec.imputation}
                                            </td>
                                            <td className="py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap text-emerald-700">
                                                + {money(bec.montant, bec.devise)}
                                            </td>
                                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                                <button
                                                    type="button"
                                                    onClick={() => handleTriggerPrint(bec)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 border border-[#04326D] text-[#04326D] hover:bg-blue-50 rounded text-[11px] font-bold transition"
                                                >
                                                    <Printer className="w-3.5 h-3.5" />
                                                    <span>Imprimer BEC</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* MODALE : Enregistrement Bon d'Entrée Caisse */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
                    <div className="bg-white rounded border border-[#B2BED6] shadow-2xl max-w-lg w-full p-6 space-y-4 animate-slide-down">
                        <header className="flex items-start justify-between border-b pb-3">
                            <h3 className="text-sm font-bold text-[#0B192C] uppercase tracking-wide">
                                Nouveau Bon d'Entrée Caisse (BEC)
                            </h3>
                            <button
                                type="button"
                                onClick={() => setModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </header>

                        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Reçu de (Déposant) *</label>
                                    <input
                                        type="text"
                                        placeholder="ex: Mr. JUMBA"
                                        value={form.data.tiers_nom}
                                        onChange={(e) => form.setData('tiers_nom', e.target.value)}
                                        className="w-full border border-[#B2BED6] rounded p-2 text-xs focus:outline-none focus:border-[#04326D]"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Montant en Chiffre *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        placeholder="19000"
                                        value={form.data.montant}
                                        onChange={(e) => handleMontantChange(e.target.value)}
                                        className="w-full border border-[#B2BED6] rounded p-2 text-xs font-mono font-bold focus:outline-none focus:border-[#04326D]"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">La somme de (en lettre) *</label>
                                <input
                                    type="text"
                                    placeholder="ex: Dix neuf mille francs congolais"
                                    value={form.data.montant_en_lettres}
                                    onChange={(e) => form.setData('montant_en_lettres', e.target.value)}
                                    className="w-full border border-[#B2BED6] rounded p-2 text-xs focus:outline-none focus:border-[#04326D]"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Motif du Versement *</label>
                                    <input
                                        type="text"
                                        placeholder="ex: Retour en caisse Cfr B.S.C. N° 484"
                                        value={form.data.motif}
                                        onChange={(e) => form.setData('motif', e.target.value)}
                                        className="w-full border border-[#B2BED6] rounded p-2 text-xs focus:outline-none focus:border-[#04326D]"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Imputation (Code Budget) *</label>
                                    <input
                                        type="text"
                                        placeholder="ex: 6.112.a"
                                        value={form.data.imputation}
                                        onChange={(e) => form.setData('imputation', e.target.value)}
                                        className="w-full border border-[#B2BED6] rounded p-2 text-xs font-mono font-bold focus:outline-none focus:border-[#04326D]"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="p-3 bg-amber-50 border border-amber-300 rounded space-y-2">
                                <label className="block text-[11px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                                    <Lock className="w-3.5 h-3.5 text-amber-800" />
                                    <span>Code PIN du Caissier (Obligatoire) *</span>
                                </label>
                                <div className="relative">
                                    <KeyRound className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    <input
                                        type="password"
                                        maxLength={6}
                                        placeholder="Code PIN personnel (4 à 6 chiffres)"
                                        value={form.data.pin}
                                        onChange={(e) => form.setData('pin', e.target.value)}
                                        className="w-full pl-8 pr-3 py-2 border border-amber-300 bg-white rounded text-xs font-mono tracking-widest text-[#0B192C] focus:outline-none focus:ring-1 focus:ring-amber-500"
                                        autoFocus
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="px-3.5 py-1.5 border border-[#B2BED6] rounded text-xs font-semibold text-gray-600 hover:bg-gray-50"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={form.processing}
                                    className="px-4 py-1.5 bg-[#04326D] hover:bg-[#06428f] text-white rounded text-xs font-bold shadow transition"
                                >
                                    Enregistrer l'Entrée
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* FORMAT D'IMPRESSION DU BON D'ENTREE CAISSE (Photos 1 & 7) */}
            {printBEC && (
                <div id="bon-entree-caisse-print" className="p-6 border-2 border-black font-serif text-black space-y-4">
                    <div className="flex items-start justify-between border-b-2 border-black pb-2">
                        <div className="text-[10px] leading-tight">
                            <p className="font-bold uppercase tracking-wider">Bon Pasteur A.S.B.L.</p>
                            <p>N° 04, Avenue Bon Pasteur contre Sendwe,</p>
                            <p>Quartier Kanina, Commune Dilala,</p>
                            <p>Ville de Kolwezi, Province du Lualaba/RDC</p>
                            <p className="italic">Référence : Concession Domaine Mariale</p>
                        </div>
                        <div className="text-right">
                            <span className="text-sm font-bold block border-2 border-black px-3 py-1">
                                {printBEC.montant.toLocaleString('fr-FR')} {printBEC.devise}
                            </span>
                        </div>
                    </div>

                    <div className="text-center">
                        <h2 className="text-base font-black uppercase tracking-wider underline">
                            Bon d'Entrée Caisse N° {printBEC.numero_piece}
                        </h2>
                    </div>

                    <div className="text-xs space-y-2 pt-2 leading-relaxed">
                        <p>
                            <strong>Reçu de :</strong>{' '}
                            <span className="border-b border-dotted border-black inline-block min-w-[280px]">
                                {printBEC.tiers_nom}
                            </span>
                        </p>
                        <p>
                            <strong>La somme de (en lettre) :</strong>{' '}
                            <span className="border-b border-dotted border-black inline-block min-w-[280px]">
                                {printBEC.montant_en_lettres}
                            </span>
                        </p>
                        <p>
                            <strong>Motif :</strong>{' '}
                            <span className="border-b border-dotted border-black inline-block min-w-[280px]">
                                {printBEC.motif}
                            </span>
                        </p>
                        <p>
                            <strong>Imputation :</strong>{' '}
                            <span className="border-b border-dotted border-black inline-block min-w-[280px] font-mono font-bold">
                                {printBEC.imputation}
                            </span>
                        </p>
                        <p className="text-right pt-2">
                            <strong>Fait à :</strong> Kolwezi, le{' '}
                            <span className="border-b border-dotted border-black inline-block min-w-[100px] text-center">
                                {printBEC.date_mouvement}
                            </span>
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-8 text-center text-xs">
                        <div className="space-y-12">
                            <strong className="block underline uppercase">Le Client / Déposant</strong>
                            <p className="font-bold">{printBEC.tiers_nom}</p>
                        </div>
                        <div className="space-y-12">
                            <strong className="block underline uppercase">Le Caissier</strong>
                            <p className="font-bold">{printBEC.cashier_nom || 'Signé au guichet'}</p>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}