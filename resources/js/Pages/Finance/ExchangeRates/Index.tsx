import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { PageProps } from '@/types';
import {
    TrendingUp,
    Calendar,
    Save,
    CheckCircle2,
    AlertCircle,
    ArrowUpRight,
    Coins,
    History,
    Check
} from 'lucide-react';

interface ActiveRate {
    id: string;
    date_taux: string;
    date_raw: string;
    taux_eur_usd: number;
    taux_eur_cdf: number;
    is_today: boolean;
}

interface RateHistoryItem {
    id: string;
    date_taux: string;
    date_raw: string;
    taux_eur_usd: number;
    taux_eur_cdf: number;
    updated_by_name: string;
    created_at: string;
}

interface ChartPoint {
    date: string;
    usd: number;
    cdf: number;
}

interface Props extends PageProps {
    activeRate: ActiveRate | null;
    ratesHistory: {
        data: RateHistoryItem[];
        links: any[];
    };
    chartData: ChartPoint[];
}

export default function ExchangeRatesIndex({ activeRate, ratesHistory, chartData = [] }: Props) {
    const todayStr = new Date().toISOString().split('T')[0];

    const [dateTaux, setDateTaux] = useState(todayStr);
    const [tauxUsd, setTauxUsd] = useState(activeRate?.taux_eur_usd ? String(activeRate.taux_eur_usd) : '1.08');
    const [tauxCdf, setTauxCdf] = useState(activeRate?.taux_eur_cdf ? String(activeRate.taux_eur_cdf) : '3050');
    const [processing, setProcessing] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);

        router.post(route('finance.exchange-rates.store'), {
            date_taux: dateTaux,
            taux_eur_usd: parseFloat(tauxUsd),
            taux_eur_cdf: parseFloat(tauxCdf),
        }, {
            preserveScroll: true,
            onFinish: () => setProcessing(false),
            onSuccess: () => {
                setToast({
                    type: 'success',
                    message: `Taux de change journalier du ${dateTaux} enregistré avec succès.`,
                });
                setTimeout(() => setToast(null), 5000);
            },
            onError: (errs) => {
                setToast({
                    type: 'error',
                    message: Object.values(errs)[0] || 'Erreur lors de l’enregistrement du taux.',
                });
            },
        });
    };

    return (
        <AppLayout>
            <Head title="Gestion des Taux de Change Journaliers" />

            <div className="space-y-6">
                <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#E2E8F0] pb-4">
                    <div>
                        <nav className="text-[10px] font-bold uppercase tracking-widest text-[#B2BED6] mb-1 flex items-center gap-1.5">
                            <Coins className="w-3.5 h-3.5 text-[#04326D]" />
                            <span>Direction Financière</span>
                            <span className="mx-1">/</span>
                            <span className="text-[#04326D]">Taux de Change Journaliers (SFP)</span>
                        </nav>
                        <h1 className="text-xl font-bold text-[#0B192C]">
                            Définition & Historique des Taux de Change
                        </h1>
                        <p className="text-xs text-gray-500 mt-1">
                            Les consommations sur les lignes budgétaires en Euro (€) sont calculées automatiquement sur base de ces taux lors des décaissements.
                        </p>
                    </div>
                </header>

                {toast && (
                    <div className={`p-3.5 rounded text-xs font-semibold flex justify-between items-center gap-3 border shadow-sm ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-300' : 'bg-red-50 text-red-900 border-red-300'}`}>
                        <div className="flex items-center gap-2">
                            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-700" /> : <AlertCircle className="w-4 h-4 text-red-700" />}
                            <span>{toast.message}</span>
                        </div>
                        <button type="button" onClick={() => setToast(null)} className="underline text-[11px]">Fermer</button>
                    </div>
                )}

                {/* STATUT DU TAUX DU JOUR */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white border border-[#B2BED6] rounded-lg p-5 shadow-sm space-y-2 border-l-4 border-l-[#04326D]">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Taux Actif EUR / USD</span>
                        <div className="text-2xl font-black font-mono text-[#04326D]">
                            1 € = {activeRate ? activeRate.taux_eur_usd.toFixed(4) : '1.0800'} $
                        </div>
                        <span className="text-[11px] text-gray-400 block">
                            Date de référence : {activeRate ? activeRate.date_taux : 'Par défaut'}
                        </span>
                    </div>

                    <div className="bg-white border border-[#B2BED6] rounded-lg p-5 shadow-sm space-y-2 border-l-4 border-l-[#F58F20]">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Taux Actif EUR / CDF</span>
                        <div className="text-2xl font-black font-mono text-[#F58F20]">
                            1 € = {activeRate ? activeRate.taux_eur_cdf.toLocaleString('fr-FR') : '3 050'} FC
                        </div>
                        <span className="text-[11px] text-gray-400 block">
                            Date de référence : {activeRate ? activeRate.date_taux : 'Par défaut'}
                        </span>
                    </div>

                    <div className="bg-white border border-[#B2BED6] rounded-lg p-5 shadow-sm space-y-2 border-l-4 border-l-emerald-600">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Statut du Jour</span>
                        <div className="text-base font-bold mt-1">
                            {activeRate?.is_today ? (
                                <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full text-xs border border-emerald-200">
                                    <Check className="w-3.5 h-3.5" /> Taux du jour configuré
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full text-xs border border-amber-200">
                                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> Taux hérité du dernier arrêté
                                </span>
                            )}
                        </div>
                        <p className="text-[11px] text-gray-500 pt-1">
                            Le système prend automatiquement le taux le plus récent s'il n'est pas saisi le jour même.
                        </p>
                    </div>
                </div>

                {/* FORMULAIRE DE SAISIE DU TAUX */}
                <div className="bg-white border border-[#B2BED6] rounded-lg p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b pb-3">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-[#0B192C] flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-[#04326D]" />
                            Enregistrer ou Actualiser le Taux Journalier
                        </h2>
                    </div>

                    <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs items-end">
                        <div>
                            <label className="block font-bold text-gray-700 mb-1.5">Date du Taux *</label>
                            <div className="relative">
                                <Calendar className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                    type="date"
                                    value={dateTaux}
                                    onChange={(e) => setDateTaux(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded font-bold text-[#0B192C] focus:outline-none focus:border-[#04326D]"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block font-bold text-gray-700 mb-1.5">Taux EUR / USD (1 € = X $) *</label>
                            <input
                                type="number"
                                step="0.0001"
                                min="0.0001"
                                placeholder="ex : 1.0850"
                                value={tauxUsd}
                                onChange={(e) => setTauxUsd(e.target.value)}
                                className="w-full border border-gray-300 rounded p-2 font-mono font-bold text-[#04326D] focus:outline-none focus:border-[#04326D]"
                                required
                            />
                        </div>

                        <div>
                            <label className="block font-bold text-gray-700 mb-1.5">Taux EUR / CDF (1 € = X FC) *</label>
                            <input
                                type="number"
                                step="0.01"
                                min="1"
                                placeholder="ex : 3050"
                                value={tauxCdf}
                                onChange={(e) => setTauxCdf(e.target.value)}
                                className="w-full border border-gray-300 rounded p-2 font-mono font-bold text-[#F58F20] focus:outline-none focus:border-[#04326D]"
                                required
                            />
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full py-2.5 px-4 bg-[#04326D] hover:bg-[#06428f] text-white font-bold rounded shadow transition flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                <Save className="w-4 h-4" />
                                <span>{processing ? 'Enregistrement…' : 'Valider ce Taux'}</span>
                            </button>
                        </div>
                    </form>
                </div>

                {/* TABLE HISTORIQUE DES VARIATIONS */}
                <div className="bg-white border border-[#B2BED6] rounded-lg shadow-sm overflow-hidden">
                    <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-[#0B192C] flex items-center gap-1.5">
                            <History className="w-4 h-4 text-gray-500" />
                            Historique des Variations de Taux
                        </h2>
                        <span className="text-[11px] font-mono font-bold text-gray-500">
                            {ratesHistory.data.length} enregistrement(s)
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-[#0B192C] text-white uppercase text-[10px] font-bold tracking-wider">
                                    <th className="px-4 py-3">Date d'Application</th>
                                    <th className="px-4 py-3 text-right">Taux 1 EUR = USD ($)</th>
                                    <th className="px-4 py-3 text-right">Taux 1 EUR = CDF (FC)</th>
                                    <th className="px-4 py-3">Saisi par</th>
                                    <th className="px-4 py-3 text-right">Enregistré le</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E2E8F0] text-gray-700">
                                {ratesHistory.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-gray-400 italic">
                                            Aucun taux enregistré dans l'historique pour le moment.
                                        </td>
                                    </tr>
                                ) : (
                                    ratesHistory.data.map((item) => (
                                        <tr key={item.id} className="hover:bg-blue-50/40 transition">
                                            <td className="px-4 py-3 font-bold text-[#0B192C]">{item.date_taux}</td>
                                            <td className="px-4 py-3 text-right font-mono font-bold text-[#04326D]">
                                                {item.taux_eur_usd.toFixed(4)} $
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono font-bold text-[#F58F20]">
                                                {item.taux_eur_cdf.toLocaleString('fr-FR')} FC
                                            </td>
                                            <td className="px-4 py-3 font-semibold text-gray-600">{item.updated_by_name}</td>
                                            <td className="px-4 py-3 text-right text-gray-400 font-mono text-[11px]">
                                                {item.created_at}
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