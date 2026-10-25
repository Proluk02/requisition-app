import { useEffect, useMemo, useRef, useState } from 'react';
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
    ArrowDownRight,
    Coins,
    History,
    Info,
    X,
    Minus,
    CalendarDays,
    Activity,
    BarChart3,
    Pencil,
    Trash2,
    Check,
    ChevronLeft,
    ChevronRight,
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

interface PaginatedHistory {
    data: RateHistoryItem[];
    links: Array<{ url: string | null; label: string; active: boolean }>;
    current_page?: number;
    last_page?: number;
    total?: number;
}

interface Props extends PageProps {
    activeRate: ActiveRate | null;
    ratesHistory: PaginatedHistory;
    chartData: ChartPoint[];
}

/* ------------------------------------------------------------------ */
/* Graphique compact — hauteur 160, padding réduit, tooltip interne   */
/* ------------------------------------------------------------------ */
function RateEvolutionChart({ data }: { data: ChartPoint[] }) {
    const svgRef = useRef<SVGSVGElement>(null);
    const [hoverIdx, setHoverIdx] = useState<number | null>(null);
    const [width, setWidth] = useState(720);

    // Dimensions compactes
    const height = 160;
    const padding = { top: 10, right: 44, bottom: 22, left: 40 };

    useEffect(() => {
        if (!svgRef.current) return;
        const ro = new ResizeObserver((entries) => {
            const w = entries[0]?.contentRect.width ?? 720;
            setWidth(Math.max(320, w));
        });
        ro.observe(svgRef.current);
        return () => ro.disconnect();
    }, []);

    if (!data || data.length < 2) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-center text-gray-400 text-xs">
                <BarChart3 className="w-7 h-7 mb-1.5 opacity-40" />
                <p className="font-semibold">Pas assez de données pour tracer une courbe</p>
                <p className="text-[10.5px] mt-0.5">Enregistrez au moins 2 taux pour visualiser l'évolution.</p>
            </div>
        );
    }

    const innerW = width - padding.left - padding.right;
    const innerH = height - padding.top - padding.bottom;

    const usdMin = Math.min(...data.map((d) => d.usd));
    const usdMax = Math.max(...data.map((d) => d.usd));
    const cdfMin = Math.min(...data.map((d) => d.cdf));
    const cdfMax = Math.max(...data.map((d) => d.cdf));
    const usdRange = usdMax - usdMin || 1;
    const cdfRange = cdfMax - cdfMin || 1;

    const xFor = (i: number) => padding.left + (i / (data.length - 1)) * innerW;
    const yUsd = (v: number) => padding.top + innerH - ((v - usdMin) / usdRange) * innerH;
    const yCdf = (v: number) => padding.top + innerH - ((v - cdfMin) / cdfRange) * innerH;

    const usdPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yUsd(d.usd)}`).join(' ');
    const cdfPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yCdf(d.cdf)}`).join(' ');
    const usdArea = `${usdPath} L ${xFor(data.length - 1)} ${padding.top + innerH} L ${xFor(0)} ${padding.top + innerH} Z`;

    const tickStep = Math.max(1, Math.ceil(data.length / 6));
    const xTicks = data.map((_, i) => i).filter((i) => i % tickStep === 0 || i === data.length - 1);

    const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
        const svg = svgRef.current;
        if (!svg) return;
        const rect = svg.getBoundingClientRect();
        const mouseX = ((e.clientX - rect.left) / rect.width) * width;
        const rel = (mouseX - padding.left) / innerW;
        const idx = Math.round(rel * (data.length - 1));
        if (idx >= 0 && idx < data.length) setHoverIdx(idx);
    };

    const hovered = hoverIdx !== null ? data[hoverIdx] : null;

    return (
        <div className="w-full relative">
            <svg
                ref={svgRef}
                viewBox={`0 0 ${width} ${height}`}
                className="w-full h-auto select-none"
                onMouseMove={handleMove}
                onMouseLeave={() => setHoverIdx(null)}
            >
                <defs>
                    <linearGradient id="usdAreaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#04326D" stopOpacity="0.16" />
                        <stop offset="100%" stopColor="#04326D" stopOpacity="0" />
                    </linearGradient>
                </defs>

                {/* Grille */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                    const y = padding.top + innerH * ratio;
                    return (
                        <line
                            key={ratio}
                            x1={padding.left}
                            x2={padding.left + innerW}
                            y1={y}
                            y2={y}
                            stroke="#E2E8F0"
                            strokeDasharray="2 3"
                        />
                    );
                })}

                {/* Axe Y gauche USD */}
                {[0, 0.5, 1].map((ratio) => {
                    const v = usdMax - ratio * usdRange;
                    const y = padding.top + innerH * ratio;
                    return (
                        <text
                            key={`usd-${ratio}`}
                            x={padding.left - 6}
                            y={y + 3}
                            textAnchor="end"
                            className="fill-[#04326D] font-mono"
                            fontSize={8.5}
                        >
                            {v.toFixed(2)}
                        </text>
                    );
                })}

                {/* Axe Y droit CDF */}
                {[0, 0.5, 1].map((ratio) => {
                    const v = cdfMax - ratio * cdfRange;
                    const y = padding.top + innerH * ratio;
                    return (
                        <text
                            key={`cdf-${ratio}`}
                            x={padding.left + innerW + 6}
                            y={y + 3}
                            textAnchor="start"
                            className="fill-[#F58F20] font-mono"
                            fontSize={8.5}
                        >
                            {v.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}
                        </text>
                    );
                })}

                {/* Aire + ligne USD */}
                <path d={usdArea} fill="url(#usdAreaGradient)" />
                <path d={usdPath} fill="none" stroke="#04326D" strokeWidth={1.75} strokeLinejoin="round" />

                {/* Ligne CDF */}
                <path d={cdfPath} fill="none" stroke="#F58F20" strokeWidth={1.75} strokeLinejoin="round" />

                {/* Points + hover vertical */}
                {data.map((d, i) => (
                    <g key={i}>
                        <circle cx={xFor(i)} cy={yUsd(d.usd)} r={1.8} fill="#04326D" />
                        <circle cx={xFor(i)} cy={yCdf(d.cdf)} r={1.8} fill="#F58F20" />
                        {hoverIdx === i && (
                            <line
                                x1={xFor(i)}
                                x2={xFor(i)}
                                y1={padding.top}
                                y2={padding.top + innerH}
                                stroke="#94A3B8"
                                strokeDasharray="3 3"
                            />
                        )}
                    </g>
                ))}

                {/* Labels X */}
                {xTicks.map((i) => (
                    <text
                        key={i}
                        x={xFor(i)}
                        y={height - 4}
                        textAnchor="middle"
                        className="fill-gray-500 font-mono"
                        fontSize={8.5}
                    >
                        {data[i].date}
                    </text>
                ))}
            </svg>

            {/* Tooltip superposé (flottant) — plus compact, pas en dessous */}
            {hovered && (
                <div
                    className="absolute pointer-events-none bg-[#0B192C] text-white text-[10px] rounded px-2 py-1 shadow-lg"
                    style={{
                        left: `${Math.min(
                            Math.max(8, ((hoverIdx! / (data.length - 1)) * 100)),
                            88
                        )}%`,
                        top: 4,
                        transform: 'translateX(-50%)',
                    }}
                >
                    <div className="font-mono font-bold text-[9.5px] text-[#B2BED6]">{hovered.date}</div>
                    <div className="font-mono">
                        <span className="text-[#7EB8FF]">$</span> {hovered.usd.toFixed(4)}
                    </div>
                    <div className="font-mono">
                        <span className="text-[#F58F20]">FC</span> {hovered.cdf.toLocaleString('fr-FR')}
                    </div>
                </div>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Page principale                                                     */
/* ------------------------------------------------------------------ */
export default function ExchangeRatesIndex({
    activeRate,
    ratesHistory,
    chartData = [],
}: Props) {
    const todayStr = new Date().toISOString().split('T')[0];

    const [dateTaux, setDateTaux] = useState(todayStr);
    const [tauxUsd, setTauxUsd] = useState(
        activeRate?.taux_eur_usd ? String(activeRate.taux_eur_usd) : '1.08'
    );
    const [tauxCdf, setTauxCdf] = useState(
        activeRate?.taux_eur_cdf ? String(activeRate.taux_eur_cdf) : '3050'
    );
    const [processing, setProcessing] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [confirmOverwrite, setConfirmOverwrite] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Édition inline
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editDate, setEditDate] = useState('');
    const [editUsd, setEditUsd] = useState('');
    const [editCdf, setEditCdf] = useState('');
    const [editingProcessing, setEditingProcessing] = useState(false);

    // Suppression : 2 clics
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [deletingProcessing, setDeletingProcessing] = useState(false);

    useEffect(() => {
        const offStart = router.on('start', () => setIsLoading(true));
        const offFinish = router.on('finish', () => setIsLoading(false));
        return () => {
            offStart();
            offFinish();
        };
    }, []);

    useEffect(() => {
        if (!toast) return;
        const delay = toast.type === 'error' ? 8000 : 5000;
        const t = setTimeout(() => setToast(null), delay);
        return () => clearTimeout(t);
    }, [toast]);

    const existingForDate = ratesHistory.data.find((r) => r.date_raw === dateTaux);

    const variationUsd =
        activeRate && tauxUsd && activeRate.taux_eur_usd
            ? ((parseFloat(tauxUsd) - activeRate.taux_eur_usd) / activeRate.taux_eur_usd) * 100
            : 0;
    const variationCdf =
        activeRate && tauxCdf && activeRate.taux_eur_cdf
            ? ((parseFloat(tauxCdf) - activeRate.taux_eur_cdf) / activeRate.taux_eur_cdf) * 100
            : 0;

    /* ---------------------- CREATE ---------------------- */
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (existingForDate && !confirmOverwrite) {
            setConfirmOverwrite(true);
            return;
        }

        setProcessing(true);

        router.post(
            route('finance.exchange-rates.store'),
            {
                date_taux: dateTaux,
                taux_eur_usd: parseFloat(tauxUsd),
                taux_eur_cdf: parseFloat(tauxCdf),
            },
            {
                preserveScroll: true,
                onFinish: () => {
                    setProcessing(false);
                    setConfirmOverwrite(false);
                },
                onSuccess: () => {
                    setToast({
                        type: 'success',
                        message: `Taux de change du ${dateTaux} enregistré avec succès.`,
                    });
                },
                onError: (errs) => {
                    setToast({
                        type: 'error',
                        message: Object.values(errs)[0] || 'Erreur lors de l’enregistrement du taux.',
                    });
                },
            }
        );
    };

    /* ---------------------- UPDATE (édition inline) ---------------------- */
    const startEdit = (item: RateHistoryItem) => {
        setEditingId(item.id);
        setEditDate(item.date_raw);
        setEditUsd(String(item.taux_eur_usd));
        setEditCdf(String(item.taux_eur_cdf));
        setDeletingId(null);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditDate('');
        setEditUsd('');
        setEditCdf('');
    };

    const saveEdit = (id: string) => {
        setEditingProcessing(true);
        router.put(
            route('finance.exchange-rates.update', id),
            {
                date_taux: editDate,
                taux_eur_usd: parseFloat(editUsd),
                taux_eur_cdf: parseFloat(editCdf),
            },
            {
                preserveScroll: true,
                onFinish: () => setEditingProcessing(false),
                onSuccess: () => {
                    cancelEdit();
                    setToast({ type: 'success', message: 'Taux modifié avec succès.' });
                },
                onError: (errs) => {
                    setToast({
                        type: 'error',
                        message: Object.values(errs)[0] || 'Erreur lors de la modification.',
                    });
                },
            }
        );
    };

    /* ---------------------- DELETE (2 clics) ---------------------- */
    const requestDelete = (id: string) => {
        setDeletingId(id);
        setEditingId(null);
    };

    const confirmDelete = (id: string) => {
        setDeletingProcessing(true);
        router.delete(route('finance.exchange-rates.destroy', id), {
            preserveScroll: true,
            onFinish: () => setDeletingProcessing(false),
            onSuccess: () => {
                setDeletingId(null);
                setToast({ type: 'success', message: 'Taux supprimé.' });
            },
            onError: (errs) => {
                setDeletingId(null);
                setToast({
                    type: 'error',
                    message: Object.values(errs)[0] || 'Erreur lors de la suppression.',
                });
            },
        });
    };

    const renderVariation = (pct: number, showLabel = true) => {
        if (!pct || Math.abs(pct) < 0.0001) {
            return showLabel ? (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-400">
                    <Minus className="w-3 h-3" /> stable
                </span>
            ) : null;
        }
        const isUp = pct > 0;
        return (
            <span
                className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${
                    isUp ? 'text-emerald-700' : 'text-red-700'
                }`}
            >
                {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {isUp ? '+' : ''}
                {pct.toFixed(2)} %
            </span>
        );
    };

    const chartStats = useMemo(() => {
        if (!chartData || chartData.length < 1) return null;
        return {
            points: chartData.length,
            usdMin: Math.min(...chartData.map((d) => d.usd)),
            usdMax: Math.max(...chartData.map((d) => d.usd)),
            cdfMin: Math.min(...chartData.map((d) => d.cdf)),
            cdfMax: Math.max(...chartData.map((d) => d.cdf)),
        };
    }, [chartData]);

    return (
        <AppLayout>
            <Head title="Gestion des Taux de Change Journaliers" />

            {isLoading && (
                <div className="fixed top-0 left-0 right-0 h-0.5 bg-[#04326D] z-[100] animate-pulse" />
            )}

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
                    <div
                        className={`p-3.5 rounded text-xs font-semibold flex justify-between items-center gap-3 border shadow-sm ${
                            toast.type === 'success'
                                ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                                : 'bg-red-50 text-red-900 border-red-300'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            {toast.type === 'success' ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                            ) : (
                                <AlertCircle className="w-4 h-4 text-red-700" />
                            )}
                            <span>{toast.message}</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setToast(null)}
                            className="text-gray-500 hover:text-gray-800"
                            aria-label="Fermer le message"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* KPI consolidés */}
                <div className="bg-white border border-[#B2BED6] rounded-lg shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-[#E2E8F0] bg-[#F9F9FF] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Activity className="w-4 h-4 text-[#04326D]" />
                            <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#0B192C]">
                                Taux de Référence en Vigueur
                            </h2>
                        </div>
                        {activeRate?.is_today ? (
                            <span className="inline-flex items-center gap-1.5 text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full text-[10.5px] font-bold border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Taux du jour configuré
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 text-amber-800 bg-amber-50 px-2.5 py-1 rounded-full text-[10.5px] font-bold border border-amber-200">
                                <AlertCircle className="w-3 h-3" />
                                Taux hérité du dernier arrêté
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#E2E8F0]">
                        <div className="p-5">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                    EUR → USD
                                </span>
                                <span className="text-[10px] font-mono text-gray-400">$</span>
                            </div>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-[11px] text-gray-400">1 € =</span>
                                <span className="text-3xl font-black font-mono text-[#04326D] leading-none">
                                    {activeRate ? activeRate.taux_eur_usd.toFixed(4) : '1.0800'}
                                </span>
                                <span className="text-sm text-[#04326D]/60 font-semibold">$</span>
                            </div>
                            <div className="mt-2 flex items-center gap-1.5 text-[10.5px] text-gray-500">
                                <Calendar className="w-3 h-3" />
                                <span>Réf. {activeRate ? activeRate.date_taux : 'défaut'}</span>
                            </div>
                        </div>

                        <div className="p-5">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                    EUR → CDF
                                </span>
                                <span className="text-[10px] font-mono text-gray-400">FC</span>
                            </div>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-[11px] text-gray-400">1 € =</span>
                                <span className="text-3xl font-black font-mono text-[#F58F20] leading-none">
                                    {activeRate ? activeRate.taux_eur_cdf.toLocaleString('fr-FR') : '3 050'}
                                </span>
                                <span className="text-sm text-[#F58F20]/70 font-semibold">FC</span>
                            </div>
                            <div className="mt-2 flex items-center gap-1.5 text-[10.5px] text-gray-500">
                                <Calendar className="w-3 h-3" />
                                <span>Réf. {activeRate ? activeRate.date_taux : 'défaut'}</span>
                            </div>
                        </div>

                        <div className="p-5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
                                Règle d'application
                            </span>
                            <p className="text-[11.5px] text-gray-700 leading-snug">
                                Le taux le plus récent est appliqué automatiquement.
                                <span className="text-gray-500"> Saisissez un nouveau taux pour actualiser.</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* GRAPHIQUE COMPACT */}
                <div className="bg-white border border-[#B2BED6] rounded-lg shadow-sm overflow-hidden">
                    <div className="px-5 py-3 border-b border-[#E2E8F0] bg-[#F9F9FF] flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-[#04326D]" />
                            <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#0B192C]">
                                Évolution des Taux
                            </h2>
                            {chartStats && (
                                <span className="text-[10px] text-gray-500 font-mono">
                                    · {chartStats.points} point{chartStats.points > 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-3 text-[10.5px]">
                            <span className="inline-flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#04326D]" />
                                <span className="font-semibold text-gray-600">EUR / USD</span>
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#F58F20]" />
                                <span className="font-semibold text-gray-600">EUR / CDF</span>
                            </span>
                        </div>
                    </div>
                    <div className="px-3 py-2">
                        <RateEvolutionChart data={chartData} />
                    </div>
                </div>

                {/* FORMULAIRE + EXPLICATION */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                    <div className="lg:col-span-2 bg-white border border-[#B2BED6] rounded-lg p-5 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b pb-3">
                            <h2 className="text-xs font-bold uppercase tracking-wider text-[#0B192C] flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-[#04326D]" />
                                Enregistrer ou Actualiser le Taux Journalier
                            </h2>
                        </div>

                        {confirmOverwrite && existingForDate && (
                            <div className="p-3.5 bg-amber-50 border-2 border-amber-400 rounded text-xs space-y-1.5">
                                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                                    <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                                    <span>Un taux existe déjà pour le {dateTaux}</span>
                                </div>
                                <p className="text-[11px] leading-snug text-amber-900">
                                    Valeurs actuelles : <strong>{existingForDate.taux_eur_usd.toFixed(4)} $</strong> et{' '}
                                    <strong>{existingForDate.taux_eur_cdf.toLocaleString('fr-FR')} FC</strong>.
                                    <br />
                                    En confirmant, ces valeurs seront <strong>écrasées</strong>. Cliquez à nouveau sur le bouton pour confirmer.
                                </p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs items-end">
                            <div>
                                <label className="block font-bold text-gray-700 mb-1.5">Date du Taux *</label>
                                <div className="relative">
                                    <Calendar className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    <input
                                        type="date"
                                        value={dateTaux}
                                        onChange={(e) => {
                                            setDateTaux(e.target.value);
                                            setConfirmOverwrite(false);
                                        }}
                                        max={todayStr}
                                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded font-bold text-[#0B192C] focus:outline-none focus:border-[#04326D]"
                                        required
                                    />
                                </div>
                                {dateTaux !== todayStr && (
                                    <p className="text-[10px] text-amber-700 font-semibold mt-1 flex items-center gap-1">
                                        <CalendarDays className="w-3 h-3" />
                                        Saisie pour une date antérieure
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 mb-1.5">
                                    Taux EUR / USD (1 € = X $) *
                                </label>
                                <input
                                    type="number"
                                    step="0.0001"
                                    min="0.0001"
                                    placeholder="ex : 1.0850"
                                    value={tauxUsd}
                                    onChange={(e) => {
                                        setTauxUsd(e.target.value);
                                        setConfirmOverwrite(false);
                                    }}
                                    className="w-full border border-gray-300 rounded p-2 font-mono font-bold text-[#04326D] focus:outline-none focus:border-[#04326D]"
                                    required
                                />
                                {activeRate && tauxUsd && Math.abs(variationUsd) > 0.0001 && (
                                    <div className="mt-1">{renderVariation(variationUsd)}</div>
                                )}
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 mb-1.5">
                                    Taux EUR / CDF (1 € = X FC) *
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="1"
                                    placeholder="ex : 3050"
                                    value={tauxCdf}
                                    onChange={(e) => {
                                        setTauxCdf(e.target.value);
                                        setConfirmOverwrite(false);
                                    }}
                                    className="w-full border border-gray-300 rounded p-2 font-mono font-bold text-[#F58F20] focus:outline-none focus:border-[#04326D]"
                                    required
                                />
                                {activeRate && tauxCdf && Math.abs(variationCdf) > 0.0001 && (
                                    <div className="mt-1">{renderVariation(variationCdf)}</div>
                                )}
                            </div>

                            <div>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className={`w-full py-2.5 px-4 text-white font-bold rounded shadow transition flex items-center justify-center gap-2 disabled:opacity-50 ${
                                        confirmOverwrite
                                            ? 'bg-amber-600 hover:bg-amber-700'
                                            : 'bg-[#04326D] hover:bg-[#06428f]'
                                    }`}
                                >
                                    <Save className="w-4 h-4" />
                                    <span>
                                        {processing
                                            ? 'Enregistrement…'
                                            : confirmOverwrite
                                            ? 'Confirmer l’écrasement'
                                            : existingForDate
                                            ? 'Mettre à jour ce taux'
                                            : 'Valider ce Taux'}
                                    </span>
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="bg-blue-50/60 border border-blue-200 rounded-lg p-4 text-xs text-blue-900 space-y-2">
                        <div className="flex items-center gap-1.5 font-bold">
                            <Info className="w-3.5 h-3.5" />
                            <span>Comment fonctionne le taux actif ?</span>
                        </div>
                        <p className="leading-relaxed text-[11.5px]">
                            Le système applique toujours le <strong>taux le plus récent</strong> à la date du jour. Si vous enregistrez un taux pour une date future ou passée, il sera appliqué à partir de cette date.
                        </p>
                        <p className="leading-relaxed text-[11.5px] text-blue-800/80">
                            Les anciens taux restent archivés dans l'historique ci-dessous et sont utilisés pour recalculer les écritures déjà passées.
                        </p>
                    </div>
                </div>

                {/* HISTORIQUE avec CRUD inline */}
                <div className="bg-white border border-[#B2BED6] rounded-lg shadow-sm overflow-hidden">
                    <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-[#0B192C] flex items-center gap-1.5">
                            <History className="w-4 h-4 text-gray-500" />
                            Historique des Variations de Taux
                        </h2>
                        <span className="text-[11px] font-mono font-bold text-gray-500">
                            {ratesHistory.total ?? ratesHistory.data.length} enregistrement(s)
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
                                    <th className="px-4 py-3 text-right w-24">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E2E8F0] text-gray-700">
                                {ratesHistory.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-8 text-center text-gray-400 italic">
                                            Aucun taux enregistré dans l'historique pour le moment.
                                        </td>
                                    </tr>
                                ) : (
                                    ratesHistory.data.map((item, idx) => {
                                        const prev = ratesHistory.data[idx + 1];
                                        const varUsd = prev
                                            ? ((item.taux_eur_usd - prev.taux_eur_usd) / prev.taux_eur_usd) * 100
                                            : 0;
                                        const varCdf = prev
                                            ? ((item.taux_eur_cdf - prev.taux_eur_cdf) / prev.taux_eur_cdf) * 100
                                            : 0;
                                        const isEditing = editingId === item.id;
                                        const isDeleting = deletingId === item.id;
                                        const isActiveRow = activeRate?.id === item.id;

                                        if (isEditing) {
                                            return (
                                                <tr key={item.id} className="bg-blue-50/50">
                                                    <td className="px-4 py-2">
                                                        <input
                                                            type="date"
                                                            value={editDate}
                                                            onChange={(e) => setEditDate(e.target.value)}
                                                            max={todayStr}
                                                            className="w-full border border-blue-300 rounded px-2 py-1 text-xs font-mono"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-2 text-right">
                                                        <input
                                                            type="number"
                                                            step="0.0001"
                                                            min="0.0001"
                                                            value={editUsd}
                                                            onChange={(e) => setEditUsd(e.target.value)}
                                                            className="w-full border border-blue-300 rounded px-2 py-1 text-xs font-mono text-right text-[#04326D] font-bold"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-2 text-right">
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="1"
                                                            value={editCdf}
                                                            onChange={(e) => setEditCdf(e.target.value)}
                                                            className="w-full border border-blue-300 rounded px-2 py-1 text-xs font-mono text-right text-[#F58F20] font-bold"
                                                        />
                                                    </td>
                                                    <td colSpan={2} className="px-4 py-2 text-gray-500 italic">
                                                        modification en cours…
                                                    </td>
                                                    <td className="px-4 py-2 text-right">
                                                        <div className="inline-flex items-center gap-1">
                                                            <button
                                                                type="button"
                                                                onClick={() => saveEdit(item.id)}
                                                                disabled={editingProcessing}
                                                                className="p-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                                                                title="Enregistrer"
                                                                aria-label="Enregistrer la modification"
                                                            >
                                                                <Check className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={cancelEdit}
                                                                disabled={editingProcessing}
                                                                className="p-1.5 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 disabled:opacity-50"
                                                                title="Annuler"
                                                                aria-label="Annuler la modification"
                                                            >
                                                                <X className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        if (isDeleting) {
                                            return (
                                                <tr key={item.id} className="bg-red-50">
                                                    <td colSpan={4} className="px-4 py-2">
                                                        <span className="text-[11px] font-semibold text-red-900">
                                                            Supprimer le taux du <strong>{item.date_taux}</strong> ?
                                                            Cette action est irréversible.
                                                        </span>
                                                    </td>
                                                    <td colSpan={2} className="px-4 py-2 text-right">
                                                        <div className="inline-flex items-center gap-1">
                                                            <button
                                                                type="button"
                                                                onClick={() => confirmDelete(item.id)}
                                                                disabled={deletingProcessing}
                                                                className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold disabled:opacity-50"
                                                            >
                                                                {deletingProcessing ? '…' : 'Supprimer'}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setDeletingId(null)}
                                                                disabled={deletingProcessing}
                                                                className="px-2.5 py-1 rounded bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-[11px] font-bold disabled:opacity-50"
                                                            >
                                                                Annuler
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        return (
                                            <tr key={item.id} className="hover:bg-blue-50/40 transition group">
                                                <td className="px-4 py-3 font-bold text-[#0B192C]">
                                                    <div className="flex items-center gap-1.5">
                                                        {item.date_taux}
                                                        {isActiveRow && (
                                                            <span className="text-[9px] font-bold uppercase bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                                                                Actif
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono font-bold text-[#04326D]">
                                                    <div>{item.taux_eur_usd.toFixed(4)} $</div>
                                                    {prev && <div>{renderVariation(varUsd, false)}</div>}
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono font-bold text-[#F58F20]">
                                                    <div>{item.taux_eur_cdf.toLocaleString('fr-FR')} FC</div>
                                                    {prev && <div>{renderVariation(varCdf, false)}</div>}
                                                </td>
                                                <td className="px-4 py-3 font-semibold text-gray-600">
                                                    {item.updated_by_name}
                                                </td>
                                                <td className="px-4 py-3 text-right text-gray-400 font-mono text-[11px]">
                                                    {item.created_at}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            type="button"
                                                            onClick={() => startEdit(item)}
                                                            className="p-1.5 rounded hover:bg-blue-100 text-[#04326D]"
                                                            title="Modifier"
                                                            aria-label="Modifier"
                                                        >
                                                            <Pencil className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => requestDelete(item.id)}
                                                            className="p-1.5 rounded hover:bg-red-100 text-red-600"
                                                            title="Supprimer"
                                                            aria-label="Supprimer"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination (si nécessaire) */}
                    {ratesHistory.links && ratesHistory.links.length > 3 && (
                        <div className="p-3 border-t bg-gray-50 flex items-center justify-between text-xs">
                            <span className="text-gray-500">
                                Page {ratesHistory.current_page ?? 1} / {ratesHistory.last_page ?? 1}
                            </span>
                            <div className="flex items-center gap-1">
                                {ratesHistory.links.map((link, i) => {
                                    if (!link.url && link.label.includes('Previous')) {
                                        return (
                                            <span
                                                key={i}
                                                className="px-2 py-1 text-gray-300 flex items-center gap-1"
                                            >
                                                <ChevronLeft className="w-3.5 h-3.5" />
                                            </span>
                                        );
                                    }
                                    if (!link.url && link.label.includes('Next')) {
                                        return (
                                            <span
                                                key={i}
                                                className="px-2 py-1 text-gray-300 flex items-center gap-1"
                                            >
                                                <ChevronRight className="w-3.5 h-3.5" />
                                            </span>
                                        );
                                    }
                                    if (!link.url) {
                                        return (
                                            <span
                                                key={i}
                                                className="px-2 py-1 text-gray-400 font-mono text-[11px]"
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                            />
                                        );
                                    }
                                    return (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() =>
                                                router.get(link.url!, {}, { preserveScroll: true, preserveState: true })
                                            }
                                            className={`px-2 py-1 rounded font-mono text-[11px] transition ${
                                                link.active
                                                    ? 'bg-[#04326D] text-white font-bold'
                                                    : 'bg-white border border-[#B2BED6] hover:bg-gray-50 text-gray-700'
                                            }`}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}