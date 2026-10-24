import { useEffect, useMemo, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { PageProps } from '@/types';
import { openPrintPreview } from '@/lib/printPreview';
import {
    BookOpen,
    Building2,
    Calendar,
    Printer,
    Download,
    RotateCcw,
    Info,
    FileSpreadsheet,
    Search,
} from 'lucide-react';

interface CaisseOption {
    id: string;
    name: string;
    code: string;
    devise: string;
}

interface MouvementLedger {
    id: string;
    numero_ligne: number;
    date_mouvement: string;
    projet: string;
    numero_piece: string;
    reference_externe: string | null;
    imputation: string;
    designation: string;
    entree: number;
    sortie: number;
    solde_progressif: number;
    devise: string;
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

const fmt = (n?: number | null, keepZero = false) => {
    if (n === null || n === undefined) return keepZero ? '0,00' : '';
    if (n === 0 && !keepZero) return '';
    return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const money = (n?: number | null, dev = '') => {
    const val = n ?? 0;
    return `${val.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${dev}`.trim();
};

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
    const [searchProjet, setSearchProjet] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const devise = selectedCaisse?.devise ?? '';

    useEffect(() => {
        const offStart = router.on('start', () => setIsLoading(true));
        const offFinish = router.on('finish', () => setIsLoading(false));
        return () => {
            offStart();
            offFinish();
        };
    }, []);

    const currentMonthPeriod = new Date().toISOString().slice(0, 7);
    const isCurrentMonth = period === currentMonthPeriod;
    const isFutureMonth = period > currentMonthPeriod;
    const hasZeroActivity = soldeInitialMois === 0 && mouvements.length === 0;

    const filteredMouvements = useMemo(() => {
        if (!searchProjet.trim()) return mouvements;
        const q = searchProjet.toLowerCase();
        return mouvements.filter(
            (m) =>
                m.projet.toLowerCase().includes(q) ||
                m.imputation.toLowerCase().includes(q) ||
                m.designation.toLowerCase().includes(q) ||
                m.numero_piece.toLowerCase().includes(q)
        );
    }, [mouvements, searchProjet]);

    const handleFilterChange = (caisseId: string, newPeriod: string) => {
        router.get(
            route('cashier.ledger.index'),
            { caisse_id: caisseId, period: newPeriod },
            { preserveState: true, preserveScroll: true }
        );
    };

    return (
        <AppLayout>
            <Head title={`Grand Livre ${selectedCaisse?.name ?? 'Caisse'} - ${period}`} />

            <style>{`
                @media print {
                    nav, aside, header, .no-print-area, button, select, input {
                        display: none !important;
                    }
                    #grand-livre-print-document {
                        display: block !important;
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100% !important;
                        background: white !important;
                        color: black !important;
                        padding: 10px !important;
                    }
                }
            `}</style>

            {isLoading && (
                <div className="fixed top-0 left-0 right-0 h-0.5 bg-[#04326D] z-[100] animate-pulse" />
            )}

            <div className="space-y-6">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-[#E2E8F0] no-print-area">
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
                            Journal chronologique officiel avec report historique vérifié et solde progressif.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {userCaisses.length > 1 && (
                            <div className="flex items-center gap-1.5 bg-white border border-[#B2BED6] rounded px-2.5 py-1 text-xs">
                                <Building2 className="w-3.5 h-3.5 text-[#04326D]" />
                                <select
                                    value={selectedCaisse?.id ?? ''}
                                    onChange={(e) => handleFilterChange(e.target.value, period)}
                                    className="border-none bg-transparent text-xs font-bold text-[#0B192C] focus:outline-none cursor-pointer"
                                >
                                    {userCaisses.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name} ({c.devise})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="flex items-center gap-1.5 bg-white border border-[#B2BED6] rounded px-2.5 py-1 text-xs">
                            <Calendar className="w-3.5 h-3.5 text-[#04326D]" />
                            <input
                                type="month"
                                value={period}
                                onChange={(e) => {
                                    setPeriod(e.target.value);
                                    handleFilterChange(selectedCaisse?.id ?? '', e.target.value);
                                }}
                                className="border-none bg-transparent text-xs font-bold text-[#0B192C] focus:outline-none cursor-pointer"
                            />
                        </div>

                        {!isCurrentMonth && (
                            <button
                                type="button"
                                onClick={() => {
                                    setPeriod(currentMonthPeriod);
                                    handleFilterChange(selectedCaisse?.id ?? '', currentMonthPeriod);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-[#B2BED6] text-gray-700 hover:bg-gray-50 rounded font-semibold text-xs transition"
                                title="Revenir au mois actuel"
                            >
                                <RotateCcw className="w-3.5 h-3.5 text-[#04326D]" />
                                <span>Mois en cours</span>
                            </button>
                        )}

                        {selectedCaisse && (
                            <a
                                href={route('cashier.ledger.export', { caisse_id: selectedCaisse.id, period })}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#04326D] hover:bg-[#06428f] text-white rounded font-bold text-xs shadow-sm transition"
                                title="Télécharger au format CSV compatible Excel"
                            >
                                <FileSpreadsheet className="w-3.5 h-3.5" />
                                <span>Exporter CSV</span>
                            </a>
                        )}

                        <button
                            type="button"
                            onClick={() => void openPrintPreview('grand-livre-print-document')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0B192C] hover:bg-[#1B2B44] text-white rounded font-bold text-xs shadow-sm transition"
                        >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Imprimer Journal</span>
                        </button>
                    </div>
                </header>

                {isFutureMonth && (
                    <div className="p-3.5 rounded bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center gap-2 no-print-area">
                        <Info className="w-4 h-4 text-amber-700 shrink-0" />
                        <span>
                            Vous consultez une période <strong>future</strong> ({period}). Aucun mouvement ne peut y être enregistré.
                        </span>
                    </div>
                )}

                {hasZeroActivity && !isFutureMonth && (
                    <div className="p-3.5 rounded bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center justify-between no-print-area">
                        <div className="flex items-center gap-2">
                            <Info className="w-4 h-4 text-blue-700 shrink-0" />
                            <span>
                                Aucun mouvement ni session de caisse n'a été enregistré pour la période <strong>{period}</strong>. Le solde initial et final est de 0,00 {devise}.
                            </span>
                        </div>
                        {!isCurrentMonth && (
                            <button
                                type="button"
                                onClick={() => {
                                    setPeriod(currentMonthPeriod);
                                    handleFilterChange(selectedCaisse?.id ?? '', currentMonthPeriod);
                                }}
                                className="font-bold underline text-blue-800 hover:text-blue-950 whitespace-nowrap ml-3"
                            >
                                Revenir au mois en cours
                            </button>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 no-print-area">
                    <div className="bg-white p-4 rounded border border-[#B2BED6] shadow-sm">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                            Solde Initial au 1er du mois
                        </span>
                        <p className="text-lg font-black text-gray-800 font-mono mt-1">
                            {money(soldeInitialMois, devise)}
                        </p>
                    </div>
                    <div className="bg-white p-4 rounded border border-[#B2BED6] shadow-sm">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#04326D]">
                            Total Entrées du Mois (BEC)
                        </span>
                        <p className="text-lg font-black text-[#04326D] font-mono mt-1">
                            + {money(totalEntreesMois, devise)}
                        </p>
                    </div>
                    <div className="bg-white p-4 rounded border border-[#B2BED6] shadow-sm">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-red-700">
                            Total Sorties du Mois (BSC)
                        </span>
                        <p className="text-lg font-black text-red-700 font-mono mt-1">
                            - {money(totalSortiesMois, devise)}
                        </p>
                    </div>
                    <div className="bg-[#0B192C] p-4 rounded text-white shadow-sm">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#B2BED6]">
                            Solde de Clôture
                        </span>
                        <p className="text-lg font-black text-emerald-400 font-mono mt-1">
                            {money(soldeFinMois, devise)}
                        </p>
                    </div>
                </div>

                <div className="relative no-print-area">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Filtrer les écritures (projet, imputation, désignation, N° pièce)..."
                        value={searchProjet}
                        onChange={(e) => setSearchProjet(e.target.value)}
                        className="w-full sm:w-96 pl-8 pr-3 py-1.5 border border-[#B2BED6] rounded text-xs focus:outline-none focus:border-[#04326D]"
                    />
                    {searchProjet && (
                        <span className="ml-2 text-[11px] text-gray-500">
                            {filteredMouvements.length} résultat(s) sur {mouvements.length}
                        </span>
                    )}
                </div>

                <div
                    id="grand-livre-print-document"
                    className={`bg-white border border-gray-400 p-6 space-y-4 max-w-full overflow-x-auto text-black transition-opacity ${
                        isLoading ? 'opacity-50 pointer-events-none' : ''
                    }`}
                >
                    <div className="flex items-start justify-between border-b pb-3">
                        <div className="text-[11px] leading-tight space-y-0.5">
                            <p className="font-bold uppercase text-xs">Bon Pasteur A.S.B.L.</p>
                            <p>N° 04, Avenue Bon Pasteur contre Sendwe,</p>
                            <p>Quartier Kanina, Commune Dilala,</p>
                            <p>Ville de Kolwezi, Province du Lualaba/RDC</p>
                            <p className="italic text-[10px]">Référence : Concession Domaine Mariale</p>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] font-bold tracking-widest uppercase block text-gray-500">
                                SYSTÈME CENTRALISÉ DES COÛTS
                            </span>
                            <h2 className="text-sm font-black uppercase text-black mt-1">
                                GRAND LIVRE CAISSE {selectedCaisse?.name ?? ''} — {period.replace('-', '/')} ({devise})
                            </h2>
                        </div>
                    </div>

                    <table className="w-full text-left border-collapse border border-black text-[10px]">
                        <thead>
                            <tr className="bg-gray-100 border-b border-black font-bold uppercase text-center">
                                <th className="p-1.5 border border-black">DATE</th>
                                <th className="p-1.5 border border-black w-8">N°</th>
                                <th className="p-1.5 border border-black">PROJET</th>
                                <th className="p-1.5 border border-black">N°BON</th>
                                <th className="p-1.5 border border-black">PIÈCE / REF</th>
                                <th className="p-1.5 border border-black">IMPUTATION</th>
                                <th className="p-1.5 border border-black text-left min-w-[220px]">DÉSIGNATION / MOTIF</th>
                                <th className="p-1.5 border border-black text-right bg-blue-50/50">ENTRÉE ({devise})</th>
                                <th className="p-1.5 border border-black text-right bg-red-50/50">SORTIE ({devise})</th>
                                <th className="p-1.5 border border-black text-right bg-gray-100 font-black">SOLDE ({devise})</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-300">
                            <tr className="font-bold bg-amber-50/30">
                                <td className="p-1.5 border border-black text-center font-mono">01/{period.split('-')[1]}/{period.split('-')[0]}</td>
                                <td className="p-1.5 border border-black text-center">1</td>
                                <td className="p-1.5 border border-black"></td>
                                <td className="p-1.5 border border-black"></td>
                                <td className="p-1.5 border border-black"></td>
                                <td className="p-1.5 border border-black"></td>
                                <td className="p-1.5 border border-black text-red-700 font-bold italic tracking-wide">
                                    SOLDE D'OUVERTURE
                                </td>
                                <td className="p-1.5 border border-black text-right"></td>
                                <td className="p-1.5 border border-black text-right"></td>
                                <td className="p-1.5 border border-black text-right font-mono font-bold text-red-700">
                                    {fmt(soldeInitialMois, true)}
                                </td>
                            </tr>

                            {filteredMouvements.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="p-4 text-center text-gray-500 italic bg-gray-50/40">
                                        {searchProjet
                                            ? `Aucune écriture ne correspond à « ${searchProjet} ».`
                                            : 'Aucune écriture comptable enregistrée au cours de cette période.'}
                                    </td>
                                </tr>
                            ) : (
                                filteredMouvements.map((m, idx) => (
                                    <tr
                                        key={m.id}
                                        className={`hover:bg-gray-50 ${
                                            m.entree > 0 ? 'border-l-2 border-l-emerald-500' : 'border-l-2 border-l-red-500'
                                        }`}
                                    >
                                        <td className="p-1.5 border border-black text-center whitespace-nowrap">{m.date_mouvement}</td>
                                        <td className="p-1.5 border border-black text-center">{idx + 2}</td>
                                        <td className="p-1.5 border border-black">{m.projet}</td>
                                        <td className="p-1.5 border border-black font-mono font-bold text-center">{m.numero_piece}</td>
                                        <td className="p-1.5 border border-black font-mono text-center">{m.reference_externe || ''}</td>
                                        <td className="p-1.5 border border-black italic">{m.imputation}</td>
                                        <td className="p-1.5 border border-black">{m.designation}</td>
                                        <td className="p-1.5 border border-black text-right font-mono">{fmt(m.entree)}</td>
                                        <td className="p-1.5 border border-black text-right font-mono">{fmt(m.sortie)}</td>
                                        <td className="p-1.5 border border-black text-right font-mono font-bold bg-gray-50/70">{fmt(m.solde_progressif, true)}</td>
                                    </tr>
                                ))
                            )}

                            <tr className="font-bold bg-gray-100">
                                <td className="p-1.5 border border-black text-center font-mono">Fin/{period.split('-')[1]}</td>
                                <td className="p-1.5 border border-black" colSpan={5}></td>
                                <td className="p-1.5 border border-black uppercase font-bold text-black">
                                    Solde de cloture
                                </td>
                                <td className="p-1.5 border border-black" colSpan={2}></td>
                                <td className="p-1.5 border border-black text-right font-mono font-bold text-black">
                                    {fmt(soldeFinMois, true)}
                                </td>
                            </tr>

                            <tr className="font-black bg-gray-200 uppercase">
                                <td className="p-1.5 border border-black text-right" colSpan={7}>
                                    TOTAL
                                </td>
                                <td className="p-1.5 border border-black text-right font-mono">{fmt(totalEntreesMois, true)}</td>
                                <td className="p-1.5 border border-black text-right font-mono">{fmt(totalSortiesMois, true)}</td>
                                <td className="p-1.5 border border-black"></td>
                            </tr>
                        </tbody>
                    </table>

                    <div className="grid grid-cols-3 gap-8 pt-8 text-center text-[11px] font-bold">
                        <div className="space-y-12">
                            <p className="uppercase">Prepared by</p>
                            <p className="border-t border-black pt-1 font-normal text-gray-700">Le Caissier</p>
                        </div>
                        <div className="space-y-12">
                            <p className="uppercase">Verified by</p>
                            <p className="border-t border-black pt-1 font-normal text-gray-700">Manager Finance</p>
                        </div>
                        <div className="space-y-12">
                            <p className="uppercase">Approved by</p>
                            <p className="border-t border-black pt-1 font-normal text-gray-700">Direction Générale</p>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}