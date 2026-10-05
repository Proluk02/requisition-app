import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import {
    Users,
    FolderKanban,
    MapPin,
    FileText,
    ShieldCheck,
    ArrowRight,
    UserPlus,
    BadgeCheck,
    Database,
    Download,
    Building2,
} from 'lucide-react';

interface AdminDashboardStats {
    usersCount: number;
    projectsCount: number;
    sitesCount: number;
    requisitionsCount: number;
    securityStatus: string;
}

export default function AdminDashboard({ stats }: { stats?: AdminDashboardStats }) {
    const safeStats = stats ?? {
        usersCount: 0,
        projectsCount: 0,
        sitesCount: 0,
        requisitionsCount: 0,
        securityStatus: '100% Conforme',
    };

    const usersLabel = `${safeStats.usersCount} ${safeStats.usersCount > 1 ? 'comptes' : 'compte'}`;
    const requisitionsLabel = `${safeStats.requisitionsCount} ${
        safeStats.requisitionsCount > 1 ? 'réquisitions' : 'réquisition'
    }`;

    return (
        <AppLayout>
            <Head title="Tableau de Bord Administration" />

            <div className="space-y-6">
                {/* En-tête */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
                    <div>
                        <h1 className="text-xl font-bold text-[#0B192C]">
                            Supervision du Système & Administration
                        </h1>
                        <p className="text-xs text-gray-500 mt-1">
                            Gérez les comptes, les affectations projets, les sites, les caisses et la maintenance de la base de données.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link
                            href={route('admin.users.create')}
                            className="inline-flex items-center gap-2 bg-[#04326D] hover:bg-[#06428f] text-white px-4 py-2 rounded font-bold text-xs shadow-sm transition"
                        >
                            <UserPlus className="w-4 h-4" />
                            <span>Nouvel Utilisateur</span>
                        </Link>
                    </div>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white border border-[#B2BED6] rounded p-5 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                Utilisateurs Enregistrés
                            </span>
                            <div className="w-8 h-8 rounded bg-blue-50 flex items-center justify-center">
                                <Users className="w-4 h-4 text-[#04326D]" />
                            </div>
                        </div>
                        <p className="text-2xl font-black text-[#0B192C]">{usersLabel}</p>
                        <p className="text-[11px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                            <BadgeCheck className="w-3.5 h-3.5" />
                            Comptes vérifiés
                        </p>
                    </div>

                    <div className="bg-white border border-[#B2BED6] rounded p-5 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                Projets Actifs
                            </span>
                            <div className="w-8 h-8 rounded bg-blue-50 flex items-center justify-center">
                                <FolderKanban className="w-4 h-4 text-[#04326D]" />
                            </div>
                        </div>
                        <p className="text-2xl font-black text-[#04326D]">
                            {safeStats.projectsCount}
                        </p>
                        <p className="text-[11px] text-gray-500 mt-1">
                            Portefeuille opérationnel
                        </p>
                    </div>

                    <div className="bg-white border border-[#B2BED6] rounded p-5 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                Sites Opérationnels
                            </span>
                            <div className="w-8 h-8 rounded bg-blue-50 flex items-center justify-center">
                                <MapPin className="w-4 h-4 text-[#04326D]" />
                            </div>
                        </div>
                        <p className="text-2xl font-black text-[#0B192C]">
                            {safeStats.sitesCount}
                        </p>
                        <p className="text-[11px] text-gray-500 mt-1">Localisations actives</p>
                    </div>

                    <div className="bg-white border-2 border-[#F58F20]/40 rounded p-5 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-bold text-[#0B192C] uppercase tracking-widest">
                                Réquisitions
                            </span>
                            <div className="w-8 h-8 rounded bg-amber-50 flex items-center justify-center">
                                <FileText className="w-4 h-4 text-[#F58F20]" />
                            </div>
                        </div>
                        <p className="text-2xl font-black text-emerald-700">{requisitionsLabel}</p>
                        <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            {safeStats.securityStatus}
                        </p>
                    </div>
                </div>

                {/* Panneaux de Gestion & Maintenance */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Gestion des Comptes & Rôles */}
                    <div className="bg-white border border-[#B2BED6] rounded p-5 shadow-sm space-y-3 flex flex-col">
                        <div className="flex items-center justify-between border-b pb-2.5">
                            <h2 className="text-xs font-bold uppercase text-[#0B192C] tracking-wider flex items-center gap-1.5">
                                <Users className="w-4 h-4 text-[#04326D]" />
                                <span>Gestion des Accès & Rôles</span>
                            </h2>
                            <span className="text-[10px] font-bold text-[#04326D] bg-blue-50 px-2 py-0.5 rounded">
                                Sécurité RBAC
                            </span>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed flex-1">
                            Configurez les affectations aux projets/sites, habilitez le PAM à l'intérim de Direction (P.O.) et affectez les caissiers aux guichets de trésorerie.
                        </p>
                        <div className="flex flex-wrap gap-2 pt-2">
                            <Link
                                href={route('admin.users.index')}
                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#04326D] text-white rounded text-xs font-bold hover:bg-[#06428f] transition"
                            >
                                <span>Répertoire Utilisateurs</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                            <Link
                                href={route('admin.cash-registers.index')}
                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-[#B2BED6] text-[#0B192C] rounded text-xs font-bold hover:bg-gray-50 transition"
                            >
                                <Building2 className="w-3.5 h-3.5 text-[#04326D]" />
                                <span>Caisses & Guichets</span>
                            </Link>
                        </div>
                    </div>

                    {/* Référentiels Projets & Sites */}
                    <div className="bg-white border border-[#B2BED6] rounded p-5 shadow-sm space-y-3 flex flex-col">
                        <div className="flex items-center justify-between border-b pb-2.5">
                            <h2 className="text-xs font-bold uppercase text-[#0B192C] tracking-wider flex items-center gap-1.5">
                                <FolderKanban className="w-4 h-4 text-[#04326D]" />
                                <span>Référentiels Opérationnels</span>
                            </h2>
                            <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                Structure
                            </span>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed flex-1">
                            Paramétrez les sigles projets officiels (UB, CB, MH...) et les centres d'intervention territoriaux (Kanina, Tshala, Dilala...).
                        </p>
                        <div className="flex flex-wrap gap-2 pt-2">
                            <Link
                                href={route('admin.projects.index')}
                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-[#B2BED6] text-[#0B192C] rounded text-xs font-bold hover:bg-gray-50 transition"
                            >
                                <FolderKanban className="w-3.5 h-3.5 text-[#04326D]" />
                                <span>Projets</span>
                            </Link>
                            <Link
                                href={route('admin.sites.index')}
                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-[#B2BED6] text-[#0B192C] rounded text-xs font-bold hover:bg-gray-50 transition"
                            >
                                <MapPin className="w-3.5 h-3.5 text-[#04326D]" />
                                <span>Sites</span>
                            </Link>
                        </div>
                    </div>

                    {/* Sauvegarde & Maintenance de la Base de Données */}
                    <div className="bg-white border border-[#B2BED6] rounded p-5 shadow-sm space-y-3 flex flex-col md:col-span-2">
                        <div className="flex items-center justify-between border-b pb-2.5">
                            <h2 className="text-xs font-bold uppercase text-[#0B192C] tracking-wider flex items-center gap-1.5">
                                <Database className="w-4 h-4 text-purple-700" />
                                <span>Sauvegarde Intégrale de la Base de Données (Dump SQL)</span>
                            </h2>
                            <span className="text-[10px] font-mono font-bold text-purple-800 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded">
                                MySQL 8.0
                            </span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
                            <p className="text-xs text-gray-600 max-w-2xl leading-relaxed">
                                Générez et téléchargez un instantané complet de la base de données (structures de tables, réquisitions, budgets, comptes, signatures cryptographiques et journaux de caisse). Fichier exporté au format standard <code>.sql</code>.
                            </p>
                            <a
                                href={route('admin.backup.download')}
                                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#0B192C] hover:bg-[#1B2B44] text-white rounded text-xs font-bold shadow transition shrink-0"
                            >
                                <Download className="w-4 h-4 text-emerald-400" />
                                <span>Télécharger le Dump SQL</span>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}