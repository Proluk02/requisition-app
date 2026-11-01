import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { PageProps } from '@/types';
import {
    MapPin,
    FolderKanban,
    ClipboardList,
    Plus,
    Truck,
    ChevronRight,
    AlertTriangle,
    Eye,
    ShieldCheck
} from 'lucide-react';

interface ProjectInfo {
    name: string;
    full_name: string;
}

interface RequisitionItem {
    id: string;
    code: string;
    motif: string;
    projet: string;
    montant: number;
    devise: string;
    status: string;
    is_urgent: boolean;
    date: string;
}

interface CoordinatorDashboardProps extends PageProps {
    site: {
        name: string;
        location: string | null;
        projects: ProjectInfo[];
    };
    stats: {
        projetsActifs: number;
        demandesEnCours: number;
        demandesRejetees: number;
    };
    requisitions: RequisitionItem[];
}

export default function CoordinatorDashboard({ site, stats, requisitions }: CoordinatorDashboardProps) {
    
    const renderStatus = (status: string) => {
        if (status.includes('returned')) {
            return <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded text-[10px] font-bold uppercase">À Corriger</span>;
        }
        if (status === 'draft') return <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-[10px] font-bold uppercase">Attente MP</span>;
        if (status === 'decaisse') return <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-[10px] font-bold uppercase">Décaissé</span>;
        if (status === 'decaissement_caisse') return <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold uppercase">Prêt Caisse</span>;
        
        return <span className="px-2 py-0.5 bg-blue-50 text-[#04326D] border border-blue-200 rounded text-[10px] font-bold uppercase">En Circuit</span>;
    };

    return (
        <AppLayout>
            <Head title={`Coordination - Site ${site.name}`} />

            {/* En-tête */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-[#E2E8F0] pb-5">
                <div>
                    <nav className="text-[11px] text-gray-500 font-medium mb-1 flex items-center gap-1">
                        <span>Coordination Logistique & Opérations</span>
                        <ChevronRight className="w-3 h-3" />
                        <span className="text-[#0B192C] font-semibold">
                            Site {site.name}
                        </span>
                    </nav>
                    <h1 className="text-xl font-bold text-[#0B192C] tracking-tight">
                        Tableau de Bord Coordinateur
                    </h1>
                    <p className="text-xs text-gray-600 mt-1 flex items-center gap-1.5 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-[#F58F20]" />
                        {site.location || 'Localisation non définie'}
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                    <Link
                        href={route('requisitions.create')}
                        className="inline-flex items-center justify-center gap-2 bg-[#04326D] hover:bg-[#06428f] text-white px-3.5 py-2 rounded-md text-xs font-semibold shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
                    >
                        <Plus className="w-4 h-4 text-emerald-400" strokeWidth={2.5} />
                        <span>Demande de Fonds (Site)</span>
                    </Link>
                    <Link
                        href={route('transport.index')}
                        className="inline-flex items-center justify-center gap-2 bg-white border border-[#B2BED6] text-[#0B192C] hover:bg-gray-50 px-3.5 py-2 rounded-md text-xs font-semibold shadow-sm transition"
                    >
                        <Truck className="w-4 h-4 text-[#04326D]" />
                        <span>Transport</span>
                    </Link>
                </div>
            </div>

            {/* Grille principale : KPI & Projets autorisés */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mt-6">
                
                {/* Colonne Gauche : Statistiques et Tableau */}
                <div className="xl:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4 h-max">
                    <div className="bg-white border border-[#B2BED6] rounded-lg p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                Projets sur site
                            </span>
                            <div className="w-8 h-8 rounded-md bg-blue-50 flex items-center justify-center">
                                <FolderKanban className="w-4 h-4 text-[#04326D]" />
                            </div>
                        </div>
                        <p className="text-2xl font-black text-[#0B192C]">
                            {stats.projetsActifs} <span className="text-sm font-bold text-gray-400">projet(s)</span>
                        </p>
                    </div>

                    <div className="bg-white border border-[#B2BED6] rounded-lg p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                En cours d'approbation
                            </span>
                            <div className="w-8 h-8 rounded-md bg-amber-50 flex items-center justify-center">
                                <ClipboardList className="w-4 h-4 text-amber-600" />
                            </div>
                        </div>
                        <p className="text-2xl font-black text-[#0B192C]">
                            {stats.demandesEnCours} <span className="text-sm font-bold text-gray-400">dossier(s)</span>
                        </p>
                    </div>

                    <div className={`bg-white border-2 rounded-lg p-5 shadow-sm ${stats.demandesRejetees > 0 ? 'border-red-400' : 'border-[#B2BED6]'}`}>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                À Corriger (Rejets)
                            </span>
                            <div className="w-8 h-8 rounded-md bg-red-50 flex items-center justify-center">
                                <AlertTriangle className="w-4 h-4 text-red-600" />
                            </div>
                        </div>
                        <p className={`text-2xl font-black ${stats.demandesRejetees > 0 ? 'text-red-600' : 'text-[#0B192C]'}`}>
                            {stats.demandesRejetees} <span className="text-sm font-bold text-gray-400">retour(s)</span>
                        </p>
                    </div>

                    {/* Tableau Réquisitions */}
                    <div className="sm:col-span-3 bg-white border border-[#B2BED6] rounded-lg shadow-sm overflow-hidden mt-2">
                        <div className="p-4 border-b border-[#E2E8F0] bg-gray-50">
                            <h2 className="text-sm font-bold text-[#0B192C]">Vos dernières demandes pour ce site</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-[#0B192C] text-white uppercase text-[10px] font-bold tracking-wider">
                                        <th className="py-3 px-4">Code / Projet</th>
                                        <th className="py-3 px-4">Motif</th>
                                        <th className="py-3 px-4 text-right">Montant</th>
                                        <th className="py-3 px-4 text-center">Statut</th>
                                        <th className="py-3 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E2E8F0] text-gray-700">
                                    {requisitions.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="py-8 text-center text-gray-500">
                                                Aucune réquisition initiée récemment sur ce site.
                                            </td>
                                        </tr>
                                    ) : (
                                        requisitions.map((req) => (
                                            <tr key={req.id} className="hover:bg-blue-50/40 transition">
                                                <td className="py-3 px-4">
                                                    <p className="font-mono font-bold text-[#04326D] whitespace-nowrap">
                                                        {req.code}
                                                        {req.is_urgent && (
                                                            <span className="ml-1.5 bg-red-100 text-red-800 text-[8px] px-1 rounded font-black uppercase">URGENT</span>
                                                        )}
                                                    </p>
                                                    <p className="text-[10px] text-gray-500 truncate mt-0.5">{req.projet}</p>
                                                </td>
                                                <td className="py-3 px-4 font-medium max-w-[150px] truncate text-[#0B192C]">
                                                    {req.motif}
                                                </td>
                                                <td className="py-3 px-4 text-right font-mono font-bold text-[#0B192C] whitespace-nowrap">
                                                    {req.montant.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {req.devise}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    {renderStatus(req.status)}
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <Link 
                                                        href={route('requisitions.index')}
                                                        className="inline-flex p-1.5 bg-gray-100 hover:bg-gray-200 text-[#04326D] rounded transition"
                                                        title="Voir toutes mes réquisitions"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Colonne Droite : Autorisations du site */}
                <div className="xl:col-span-4 space-y-4">
                    <div className="bg-white border border-[#B2BED6] rounded-lg shadow-sm p-5">
                        <h2 className="text-xs font-bold text-[#0B192C] uppercase tracking-wider flex items-center gap-2 border-b border-[#E2E8F0] pb-3 mb-3">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
                            Projets Autorisés (Site {site.name})
                        </h2>
                        <p className="text-[11px] text-gray-500 leading-relaxed mb-4">
                            En tant que coordinateur, le système restreint automatiquement vos demandes de fonds <strong>exclusivement</strong> à ces projets.
                        </p>
                        
                        <div className="space-y-2">
                            {site.projects.length === 0 ? (
                                <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                                    Aucun projet n'est actuellement rattaché à votre site. Vous ne pourrez créer aucune réquisition.
                                </div>
                            ) : (
                                site.projects.map((project, idx) => (
                                    <div key={idx} className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                                        <p className="text-xs font-bold text-[#04326D]">{project.name}</p>
                                        <p className="text-[10px] text-gray-600 leading-tight mt-0.5">{project.full_name}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}