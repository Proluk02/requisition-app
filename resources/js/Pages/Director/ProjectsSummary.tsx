import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import EmptyState from '@/Components/Director/EmptyState';

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

export default function ProjectsSummary({ projects = [] }: { projects: ProjectData[] }) {
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
                    <span className="text-gray-500">En circuit</span>
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
                        <div className="h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                            <div className="h-full bg-[#10B981]" style={{ width: `${taux}%` }} />
                        </div>
                    </div>
                )}
            </div>
        </article>
    );
}

function Row({
    label,
    value,
    valueClass = 'text-[#0B192C]',
}: {
    label: string;
    value: string;
    valueClass?: string;
}) {
    return (
        <div className="flex items-center justify-between text-[12px]">
            <dt className="text-gray-500">{label}</dt>
            <dd className={`font-mono tabular-nums ${valueClass}`}>{value}</dd>
        </div>
    );
}