import { useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import EmptyState from '@/Components/Director/EmptyState';
import { PieChart, BarChart3 } from 'lucide-react';

interface ProjectData {
    id: string;
    name: string;
    full_name: string;
    count: number;
    total_usd: number;
    total_fc: number;
    decaisse_usd: number;
    en_attente_count: number;
}

const fmt = (n: number, currency: string) => `${n.toLocaleString('fr-FR')} ${currency}`;

export default function ProjectsSummary({ projects = [] }: { projects: ProjectData[] }) {
    const totals = useMemo(() => projects.reduce(
        (acc, p) => ({
            dossiers: acc.dossiers + p.count,
            engage: acc.engage + p.total_usd,
            decaisse: acc.decaisse + p.decaisse_usd,
        }),
        { dossiers: 0, engage: 0, decaisse: 0 }
    ), [projects]);

    // Graphiques
    const pctDecaisse = totals.engage > 0 ? Math.round((totals.decaisse / totals.engage) * 100) : 0;
    const maxProjectVol = projects.length > 0 ? Math.max(...projects.map(p => p.total_usd)) : 1;
    const isEmpty = totals.engage === 0;

    return (
        <AppLayout>
            <Head title="Synthèse des projets" />

            <div className="space-y-6">
                <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
                    <div>
                        <nav className="text-[10px] font-bold uppercase tracking-widest text-[#B2BED6] mb-1.5">
                            <span>Direction Générale</span>
                            <span className="mx-1.5">/</span>
                            <span className="text-[#04326D]">Projets</span>
                        </nav>
                        <h1 className="text-xl font-bold text-[#0B192C]">Synthèse des projets</h1>
                        <p className="text-[12px] text-gray-500 mt-1">
                            Consommation budgétaire et volume d'engagements par projet.
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

                {/* --- GRAPHIQUES --- */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Donut Chart Global */}
                    <div className="bg-white border border-[#B2BED6] rounded-lg p-5 shadow-sm space-y-3">
                        <div className="flex items-center justify-between border-b pb-2.5">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B192C] flex items-center gap-1.5">
                                <PieChart className="w-4 h-4 text-[#04326D]" />
                                <span>Volume Budgétaire Global</span>
                            </h3>
                            <span className="text-[10px] font-mono text-gray-500 font-bold">USD</span>
                        </div>
                        <div className="flex items-center justify-center gap-6 pt-2">
                            <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                    <path
                                        className={isEmpty ? "text-gray-200" : "text-gray-200"}
                                        strokeWidth="4" stroke="currentColor" fill="none"
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                    {!isEmpty && (
                                        <path
                                            className="text-[#04326D] transition-all duration-700 ease-out"
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
                                    <span className="text-[8px] font-bold uppercase text-gray-400 block -mt-0.5">Exécuté</span>
                                </div>
                            </div>
                            <div className="space-y-1.5 text-[11px] flex-1">
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-1.5 text-gray-600">
                                        <span className={`w-2.5 h-2.5 rounded-full ${isEmpty ? 'bg-gray-300' : 'bg-gray-300'}`} />
                                        Total Engagé :
                                    </span>
                                    <strong className="font-mono text-gray-700">{fmt(totals.engage, '')}</strong>
                                </div>
                                <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                                    <span className="flex items-center gap-1.5 text-gray-600">
                                        <span className={`w-2.5 h-2.5 rounded-full ${isEmpty ? 'bg-gray-300' : 'bg-[#04326D]'}`} />
                                        Dont Décaissé :
                                    </span>
                                    <strong className="font-mono text-[#04326D]">{fmt(totals.decaisse, '')}</strong>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* BarChart Top Projets */}
                    <div className="bg-white border border-[#B2BED6] rounded-lg p-5 shadow-sm space-y-3 lg:col-span-2">
                        <div className="flex items-center justify-between border-b pb-2.5">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B192C] flex items-center gap-1.5">
                                <BarChart3 className="w-4 h-4 text-[#04326D]" />
                                <span>Poids des Projets (Volume Engagé)</span>
                            </h3>
                            <span className="text-[10px] font-mono text-gray-500 font-bold">Max: {fmt(maxProjectVol, 'USD')}</span>
                        </div>
                        <div className="pt-5 flex items-end justify-between h-40 gap-2 relative">
                            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20 pb-5">
                                {[1,2,3,4].map(i => <div key={i} className="border-b border-gray-400 w-full h-0"></div>)}
                            </div>
                            {projects.length === 0 ? (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs italic pb-5">
                                    Aucun projet enregistré.
                                </div>
                            ) : (
                                projects.slice(0, 10).map((p) => {
                                    const heightPct = Math.max((p.total_usd / maxProjectVol) * 100, 2);
                                    return (
                                        <div key={p.id} className="relative group flex-1 flex flex-col items-center justify-end h-full">
                                            <div className="absolute bottom-[calc(100%+0.5rem)] mb-0 hidden group-hover:block z-10 w-max max-w-[160px] bg-gray-900 text-white text-[10px] p-2.5 rounded shadow-lg text-center animate-fade-in">
                                                <span className="font-bold border-b border-gray-700 pb-1 mb-1 block truncate">{p.name}</span>
                                                <span className="font-mono text-xs block text-emerald-400">
                                                    Engagé: {fmt(p.total_usd, 'USD')}
                                                </span>
                                            </div>
                                            <div
                                                className="w-full max-w-[3rem] rounded-t-sm bg-emerald-500 transition-all duration-700 ease-out hover:opacity-80 cursor-pointer"
                                                style={{ height: `calc(${heightPct}% - 20px)` }}
                                            />
                                            <span className="text-[9px] font-mono mt-2 text-gray-500 truncate w-full text-center h-4" title={p.name}>
                                                {p.name.substring(0, 6)}..
                                            </span>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {projects.length === 0 ? (
                    <div className="bg-white border border-dashed border-[#B2BED6] rounded">
                        <EmptyState
                            title="Aucun projet enregistré"
                            description="Les projets institutionnels apparaîtront ici."
                        />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {projects.map((p) => (
                            <ProjectCard key={p.id} project={p} />
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

function ProjectCard({ project }: { project: ProjectData }) {
    const taux = project.total_usd > 0 ? Math.round((project.decaisse_usd / project.total_usd) * 100) : 0;

    return (
        <article className="bg-white border border-[#B2BED6] rounded overflow-hidden hover:border-[#04326D]">
            <header className="px-4 py-3 border-b border-[#E2E8F0]">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h2 className="text-[13px] font-bold text-[#04326D] truncate">{project.name}</h2>
                        <p className="text-[10.5px] text-gray-500 mt-0.5 truncate">{project.full_name}</p>
                    </div>
                    <span className="text-[10px] font-bold text-[#04326D] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded whitespace-nowrap">
                        {project.count} réq.
                    </span>
                </div>
            </header>

            <div className="px-4 py-3 space-y-3">
                <dl className="space-y-1.5">
                    <Row label="Volume USD" value={`${project.total_usd.toLocaleString('fr-FR')} USD`} />
                    <Row label="Volume FC" value={`${project.total_fc.toLocaleString('fr-FR')} FC`} />
                    <Row
                        label="Décaissé"
                        value={`${project.decaisse_usd.toLocaleString('fr-FR')} USD`}
                        valueClass="text-emerald-700 font-bold"
                    />
                </dl>

                <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between text-[12px]">
                    <span className="text-gray-500">En circuit (attente)</span>
                    <span className="font-bold text-[#F58F20]">
                        {project.en_attente_count} dossier{project.en_attente_count > 1 ? 's' : ''}
                    </span>
                </div>

                {project.total_usd > 0 && (
                    <div>
                        <div className="flex items-center justify-between text-[10.5px] text-gray-500 mb-1">
                            <span className="font-bold uppercase tracking-widest">Taux de décaissement</span>
                            <span className="font-bold tabular-nums">{taux}%</span>
                        </div>
                        <div className="h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden flex">
                            <div className="h-full bg-[#10B981] transition-all duration-700" style={{ width: `${taux}%` }} />
                            <div className="h-full bg-[#04326D] transition-all duration-700 opacity-20" style={{ width: `${100 - taux}%` }} />
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