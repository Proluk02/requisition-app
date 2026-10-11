import { useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import KpiCard from '@/Components/Director/KpiCard';
import EmptyState from '@/Components/Director/EmptyState';
import { PieChart, BarChart3 } from 'lucide-react';

interface CaisseData {
    nom: string;
    total_dossiers: number;
    total_usd: number;
    total_fc: number;
    decaisse_usd: number;
    en_attente_usd: number;
}

const fmt = (n: number, currency: string) => `${n.toLocaleString('fr-FR')} ${currency}`;

export default function CaissesSummary({ caisses = [] }: { caisses: CaisseData[] }) {
    const totals = useMemo(() => caisses.reduce(
        (acc, c) => ({
            dossiers: acc.dossiers + c.total_dossiers,
            engage: acc.engage + c.total_usd,
            decaisse: acc.decaisse + c.decaisse_usd,
            attente: acc.attente + c.en_attente_usd,
        }),
        { dossiers: 0, engage: 0, decaisse: 0, attente: 0 }
    ), [caisses]);

    // Graphiques
    const pctDecaisse = totals.engage > 0 ? Math.round((totals.decaisse / totals.engage) * 100) : 0;
    const maxCaisseVol = caisses.length > 0 ? Math.max(...caisses.map(c => c.total_usd)) : 1;
    const isEmpty = totals.engage === 0;

    return (
        <AppLayout>
            <Head title="Trésorerie & Caisses" />

            <div className="space-y-6">
                <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
                    <div>
                        <nav className="text-[10px] font-bold uppercase tracking-widest text-[#B2BED6] mb-1.5">
                            <span>Direction Générale</span>
                            <span className="mx-1.5">/</span>
                            <span className="text-[#04326D]">Trésorerie</span>
                        </nav>
                        <h1 className="text-xl font-bold text-[#0B192C]">Situation des caisses</h1>
                        <p className="text-[12px] text-gray-500 mt-1">
                            Engagements, décaissements et dossiers en attente au guichet.
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

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <KpiCard label="Dossiers actifs" value={totals.dossiers} />
                    <KpiCard label="Total engagé" value={fmt(totals.engage, 'USD')} />
                    <KpiCard label="Décaissé" value={fmt(totals.decaisse, 'USD')} tone="emerald" />
                    <KpiCard label="En attente" value={fmt(totals.attente, 'USD')} tone="amber" />
                </div>

                {/* --- GRAPHIQUES --- */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Donut Chart */}
                    <div className="bg-white border border-[#B2BED6] rounded-lg p-5 shadow-sm space-y-3">
                        <div className="flex items-center justify-between border-b pb-2.5">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B192C] flex items-center gap-1.5">
                                <PieChart className="w-4 h-4 text-[#04326D]" />
                                <span>Flux de Trésorerie Globale</span>
                            </h3>
                            <span className="text-[10px] font-mono text-gray-500 font-bold">USD</span>
                        </div>
                        <div className="flex items-center justify-center gap-6 pt-2">
                            <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                    <path
                                        className={isEmpty ? "text-gray-200" : "text-[#F58F20]"}
                                        strokeWidth="4" stroke="currentColor" fill="none"
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                    {!isEmpty && (
                                        <path
                                            className="text-emerald-500 transition-all duration-700 ease-out"
                                            strokeDasharray={`${pctDecaisse}, 100`}
                                            strokeWidth="4" strokeLinecap="round" stroke="currentColor" fill="none"
                                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                        />
                                    )}
                                </svg>
                                <div className="absolute text-center">
                                    <span className="text-xs font-black font-mono text-[#0B192C] block">
                                        {isEmpty ? '-' : `${pctDecaisse}%`}
                                    </span>
                                    <span className="text-[8px] font-bold uppercase text-gray-400 block -mt-0.5">Décaissé</span>
                                </div>
                            </div>
                            <div className="space-y-1.5 text-[11px] flex-1">
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-1.5 text-gray-600">
                                        <span className={`w-2.5 h-2.5 rounded-full ${isEmpty ? 'bg-gray-300' : 'bg-emerald-500'}`} />
                                        Décaissé :
                                    </span>
                                    <strong className="font-mono text-emerald-800">{fmt(totals.decaisse, '')}</strong>
                                </div>
                                <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                                    <span className="flex items-center gap-1.5 text-gray-600">
                                        <span className={`w-2.5 h-2.5 rounded-full ${isEmpty ? 'bg-gray-300' : 'bg-[#F58F20]'}`} />
                                        En Caisse (Prêt) :
                                    </span>
                                    <strong className="font-mono text-[#F58F20]">{fmt(totals.attente, '')}</strong>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* BarChart Comparatif des Caisses */}
                    <div className="bg-white border border-[#B2BED6] rounded-lg p-5 shadow-sm space-y-3 lg:col-span-2">
                        <div className="flex items-center justify-between border-b pb-2.5">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B192C] flex items-center gap-1.5">
                                <BarChart3 className="w-4 h-4 text-[#04326D]" />
                                <span>Comparatif d'Engagement par Caisse</span>
                            </h3>
                            <span className="text-[10px] font-mono text-gray-500 font-bold">Max: {fmt(maxCaisseVol, 'USD')}</span>
                        </div>
                        <div className="pt-5 flex items-end justify-between h-40 gap-2 relative">
                            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20 pb-5">
                                {[1,2,3,4].map(i => <div key={i} className="border-b border-gray-400 w-full h-0"></div>)}
                            </div>
                            {caisses.length === 0 ? (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs italic pb-5">
                                    Aucune caisse enregistrée.
                                </div>
                            ) : (
                                caisses.map((c) => {
                                    const heightPct = Math.max((c.total_usd / maxCaisseVol) * 100, 2);
                                    return (
                                        <div key={c.nom} className="relative group flex-1 flex flex-col items-center justify-end h-full">
                                            {/* Tooltip au survol */}
                                            <div className="absolute bottom-[calc(100%+0.5rem)] mb-0 hidden group-hover:block z-10 w-max max-w-[160px] bg-gray-900 text-white text-[10px] p-2.5 rounded shadow-lg text-center animate-fade-in">
                                                <span className="font-bold border-b border-gray-700 pb-1 mb-1 block truncate">{c.nom}</span>
                                                <span className="font-mono text-xs block text-blue-300">
                                                    Engagé: {fmt(c.total_usd, 'USD')}
                                                </span>
                                            </div>
                                            {/* Barre de comparaison */}
                                            <div
                                                className="w-full max-w-[3rem] rounded-t-sm bg-[#04326D] transition-all duration-700 ease-out hover:opacity-80 cursor-pointer"
                                                style={{ height: `calc(${heightPct}% - 20px)` }}
                                            />
                                            <span className="text-[9px] font-mono mt-2 text-gray-500 truncate w-full text-center h-4">
                                                {c.nom.substring(0, 8)}..
                                            </span>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {caisses.length === 0 ? (
                    <div className="bg-white border border-dashed border-[#B2BED6] rounded">
                        <EmptyState
                            title="Aucune caisse enregistrée"
                            description="Les caisses apparaîtront ici dès qu'elles seront configurées."
                        />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {caisses.map((c) => (
                            <CaisseCard key={c.nom} caisse={c} />
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

function CaisseCard({ caisse }: { caisse: CaisseData }) {
    const taux = caisse.total_usd > 0 ? Math.round((caisse.decaisse_usd / caisse.total_usd) * 100) : 0;

    return (
        <article className="bg-white border border-[#B2BED6] rounded overflow-hidden hover:border-[#04326D]">
            <header className="px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded bg-[#F1F5F9] flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-[#04326D]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                            <rect x="3" y="7" width="18" height="13" rx="2" />
                            <path d="M3 11h18M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                    </div>
                    <h2 className="text-[12.5px] font-bold text-[#0B192C] truncate">{caisse.nom}</h2>
                </div>
                <span className="text-[10.5px] text-gray-500 font-bold whitespace-nowrap">
                    {caisse.total_dossiers} dossier{caisse.total_dossiers > 1 ? 's' : ''}
                </span>
            </header>

            <div className="px-4 py-3 space-y-3">
                <dl className="space-y-1.5">
                    <Row label="Engagé USD" value={fmt(caisse.total_usd, 'USD')} />
                    <Row label="Engagé FC" value={fmt(caisse.total_fc, 'FC')} />
                </dl>

                <div className="h-px bg-[#E2E8F0]" />

                <dl className="space-y-2">
                    <Row label="Décaissé" value={fmt(caisse.decaisse_usd, 'USD')} valueClass="text-emerald-700 font-bold" />
                    <Row label="En attente" value={fmt(caisse.en_attente_usd, 'USD')} valueClass="text-[#F58F20] font-bold" />
                </dl>

                {caisse.total_usd > 0 && (
                    <div className="pt-1">
                        <div className="flex items-center justify-between text-[10.5px] text-gray-500 mb-1">
                            <span className="font-bold uppercase tracking-widest">Taux de décaissement</span>
                            <span className="font-bold tabular-nums">{taux}%</span>
                        </div>
                        <div className="h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden flex">
                            <div className="h-full bg-[#10B981] transition-all duration-700" style={{ width: `${taux}%` }} />
                            <div className="h-full bg-[#F58F20] transition-all duration-700" style={{ width: `${100 - taux}%` }} />
                        </div>
                    </div>
                )}
            </div>
        </article>
    );
}

function Row({ label, value, valueClass = 'text-[#0B192C]' }: { label: string; value: string; valueClass?: string; }) {
    return (
        <div className="flex items-center justify-between text-[12px]">
            <dt className="text-gray-500">{label}</dt>
            <dd className={`font-mono tabular-nums ${valueClass}`}>{value}</dd>
        </div>
    );
}