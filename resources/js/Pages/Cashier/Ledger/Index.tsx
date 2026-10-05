import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { PageProps } from '@/types';
import {
    BookOpen,
    Building2,
    Calendar,
    Printer,
    ArrowDownLeft,
    ArrowUpRight,
} from 'lucide-react';

interface CaisseOption {
    id: string;
    name: string;
    devise: string;
    solde_actuel?: number;
}

interface MouvementLedger {
    id: string;
    type: 'entree' | 'sortie';
    numero_piece: string;
    date_mouvement: string;
    tiers_nom: string;
    montant: number;
    devise: string;
    motif: string;
    imputation: string;
    mode_paiement: string;
    reference_externe: string | null;
    solde_progressif: number;
}

interface Props extends PageProps {
    userCaisses: CaisseOption[];
    selectedCaisse: CaisseOption | null;
    selectedPeriod: string;
    soldeInitialMois: number;
    totalEntreesMois: number;
    totalSortiesMois: number;
    soldeFinMois: number;
    mouvements: MouvementLedger[];
}

const money = (n: number, dev: string) =>
    `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${dev}`;

export default function LedgerIndex({
    userCaisses = [],
    selectedCaisse,
    selectedPeriod,
    soldeInitialMois = 0,
    totalEntreesMois = 0,
    totalSortiesMois = 0,
    soldeFinMois = 0,
    mouvements = [],
}: Props) {
    const [period, setPeriod] = useState(selectedPeriod);

    const handleFilterChange = (caisseId: string, newPeriod: string) => {
        router.get(
            route('cashier.ledger.index'),
            { caisse_id: caisseId, period: newPeriod },
            { preserveState: true, preserveScroll: true }
        );
    };

    return (
        <AppLayout>
            <Head title="Grand Livre de Caisse Mensuel" />

            <div className="space-y-6">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
                    <div>
                        <nav className="text-[10px] font-bold uppercase tracking-widest text-[#B2BED6] mb-1.5 flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-purple-600" />
                            <span>Guichet Caisse</span>
                            <span className="mx-1">/</span>
                            <span className="text-[#04326D]">Grand Livre</span>
                        </nav>
                        <h1 className="text-xl font-bold text-[#0B192C]">
                            Grand Livre de Caisse Mensuel
                        </h1>
                        <p className="text-[12px] text-gray-500 mt-1">
                            Journal chronologique des écritures d'entrée et de sortie avec calcul du solde progressif.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {userCaisses.length > 1 && (
                            <div className="flex items-center gap-2 bg-white border border-[#B2BED6] rounded px-3 py-1.5">
                                <Building2 className="w-4 h-4 text-[#04326D]" />
                                <select
                                    value={selectedCaisse?.id ?? ''}
                                    onChange={(e) => handleFilterChange(e.target.value, period)}
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

                        <div className="flex items-center gap-2 bg-white border border-[#04326D] rounded px-3 py-1.5">
                            <Calendar className="w-4 h-4 text-[#04326D]" />
                            <input
                                type="month"
                                value={period}
                                onChange={(e) => {
                                    setPeriod(e.target.value);
                                    handleFilterChange(selectedCaisse?.id ?? '', e.target.value);
                                }}
                                className="border-none bg-transparent text-[12px] font-bold text-[#04326D] focus:outline-none cursor-pointer"
                            />
                        </div>

                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0B192C] hover:bg-[#1B2B44] text-white rounded text-xs font-bold shadow transition"
                        >
                            <Printer className="w-4 h-4" />
                            <span>Imprimer Journal</span>
                        </button>
                    </div>
                </header>

                {/* Synthèse du mois */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-white p-4 rounded border border-[#B2BED6] shadow-sm">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                            Solde Initial au 1er du mois
                        </span>
                        <p className="text-lg font-black text-gray-800 font-mono mt-1">
                            {money(soldeInitialMois, selectedCaisse?.devise ?? '$')}
                        </p>
                    </div>
                    <div className="bg-white p-4 rounded border border-[#B2BED6] shadow-sm">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#04326D]">
                            Total Entrées du Mois (BEC)
                        </span>
                        <p className="text-lg font-black text-[#04326D] font-mono mt-1">
                            + {money(totalEntreesMois, selectedCaisse?.devise ?? '$')}
                        </p>
                    </div>
                    <div className="bg-white p-4 rounded border border-[#B2BED6] shadow-sm">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-red-700">
                            Total Sorties du Mois (BSC)
                        </span>
                        <p className="text-lg font-black text-red-700 font-mono mt-1">
                            - {money(totalSortiesMois, selectedCaisse?.devise ?? '$')}
                        </p>
                    </div>
                    <div className="bg-[#0B192C] p-4 rounded text-white shadow-sm">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#B2BED6]">
                            Solde de Clôture
                        </span>
                        <p className="text-lg font-black text-emerald-400 font-mono mt-1">
                            {money(soldeFinMois, selectedCaisse?.devise ?? '$')}
                        </p>
                    </div>
                </div>

                {/* Tableau chronologique */}
                <div className="bg-white border border-[#B2BED6] rounded shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-[#0B192C] text-white uppercase text-[10px] font-bold tracking-wider">
                                    <th className="py-3 px-4">Date</th>
                                    <th className="py-3 px-4">N° Pièce</th>
                                    <th className="py-3 px-4">Tiers / Bénéficiaire</th>
                                    <th className="py-3 px-4">Imputation</th>
                                    <th className="py-3 px-4">Motif / Contexte</th>
                                    <th className="py-3 px-4 text-right">Entrée (+)</th>
                                    <th className="py-3 px-4 text-right">Sortie (-)</th>
                                    <th className="py-3 px-4 text-right">Solde Progressif</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E2E8F0] text-gray-700">
                                {mouvements.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-12 text-center text-gray-400 italic">
                                            Aucun mouvement enregistré pour cette caisse sur la période sélectionnée.
                                        </td>
                                    </tr>
                                ) : (
                                    mouvements.map((m) => (
                                        <tr key={m.id} className="hover:bg-[#F9F9FF] transition">
                                            <td className="py-3 px-4 whitespace-nowrap font-medium text-gray-600">
                                                {m.date_mouvement}
                                            </td>
                                            <td className="py-3 px-4 font-mono font-bold text-[#04326D] whitespace-nowrap">
                                                {m.numero_piece}
                                            </td>
                                            <td className="py-3 px-4 font-semibold text-gray-800 whitespace-nowrap">
                                                {m.tiers_nom}
                                            </td>
                                            <td className="py-3 px-4 font-mono font-bold text-gray-600">
                                                {m.imputation}
                                            </td>
                                            <td className="py-3 px-4 max-w-xs truncate" title={m.motif}>
                                                {m.motif}
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono font-bold text-[#04326D] whitespace-nowrap">
                                                {m.type === 'entree' ? money(m.montant, m.devise) : '—'}
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono font-bold text-red-700 whitespace-nowrap">
                                                {m.type === 'sortie' ? money(m.montant, m.devise) : '—'}
                                            </td>
                                            <td className="py-3 px-4 text-right font-mono font-black text-gray-900 whitespace-nowrap bg-gray-50/60">
                                                {money(m.solde_progressif, m.devise)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}