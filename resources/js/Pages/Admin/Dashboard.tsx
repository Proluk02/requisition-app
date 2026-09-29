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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-soft pb-5">
                    <div>
                        <h1 className="text-xl font-bold text-on-surface">
                            Supervision du Système & Administration
                        </h1>
                        <p className="text-xs text-gray-500 mt-1">
                            Gérez les comptes, les affectations projets et le contrôle d'accès de
                            l'ASBL Bon Pasteur.
                        </p>
                    </div>

                    <Link
                        href={route('admin.users.create')}
                        className="inline-flex items-center gap-2 bg-primary hover:bg-primary-light text-white px-4 py-2.5 rounded-md text-xs font-semibold shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
                    >
                        <UserPlus className="w-4 h-4" />
                        <span>Nouvel Utilisateur</span>
                    </Link>
                </div>

                {/* KPI */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white border border-outline-soft rounded-lg p-5 shadow-card hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                Utilisateurs Enregistrés
                            </span>
                            <div className="w-8 h-8 rounded-md bg-primary-soft flex items-center justify-center">
                                <Users className="w-4 h-4 text-primary" />
                            </div>
                        </div>
                        <p className="text-2xl font-black text-on-surface">{usersLabel}</p>
                        <p className="text-[11px] text-success-dark font-semibold mt-1 flex items-center gap-1">
                            <BadgeCheck className="w-3 h-3" />
                            Comptes vérifiés
                        </p>
                    </div>

                    <div className="bg-white border border-outline-soft rounded-lg p-5 shadow-card hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                Projets Actifs
                            </span>
                            <div className="w-8 h-8 rounded-md bg-primary-soft flex items-center justify-center">
                                <FolderKanban className="w-4 h-4 text-primary" />
                            </div>
                        </div>
                        <p className="text-2xl font-black text-primary">
                            {safeStats.projectsCount}
                        </p>
                        <p className="text-[11px] text-gray-500 mt-1">
                            Portefeuille opérationnel
                        </p>
                    </div>

                    <div className="bg-white border border-outline-soft rounded-lg p-5 shadow-card hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                Sites Opérationnels
                            </span>
                            <div className="w-8 h-8 rounded-md bg-primary-soft flex items-center justify-center">
                                <MapPin className="w-4 h-4 text-primary" />
                            </div>
                        </div>
                        <p className="text-2xl font-black text-on-surface">
                            {safeStats.sitesCount}
                        </p>
                        <p className="text-[11px] text-gray-500 mt-1">Localisations actives</p>
                    </div>

                    <div className="bg-white border-2 border-tertiary/40 rounded-lg p-5 shadow-card hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-bold text-on-surface uppercase tracking-widest">
                                Réquisitions
                            </span>
                            <div className="w-8 h-8 rounded-md bg-tertiary-soft flex items-center justify-center">
                                <FileText className="w-4 h-4 text-tertiary" />
                            </div>
                        </div>
                        <p className="text-2xl font-black text-success">{requisitionsLabel}</p>
                        <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-success" />
                            {safeStats.securityStatus}
                        </p>
                    </div>
                </div>

                {/* Liens rapides */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white border border-outline-soft rounded-lg p-5 shadow-card space-y-3 flex flex-col">
                        <h2 className="text-xs font-bold uppercase text-on-surface tracking-wider border-b border-outline-soft pb-2.5">
                            Gestion des Accès & Rôles
                        </h2>
                        <p className="text-xs text-gray-600 leading-relaxed flex-1">
                            Configurez les permissions fines des différents acteurs du circuit de
                            réquisition (Staff, Manager, Finances, Direction, Caisse).
                        </p>
                        <Link
                            href={route('admin.users.index')}
                            className="inline-flex items-center gap-2 self-start px-3.5 py-2 bg-primary text-white rounded-md text-xs font-semibold hover:bg-primary-light transition group"
                        >
                            <span>Ouvrir le Répertoire des Utilisateurs</span>
                            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                    </div>

                    <div className="bg-white border border-outline-soft rounded-lg p-5 shadow-card space-y-3 flex flex-col">
                        <h2 className="text-xs font-bold uppercase text-on-surface tracking-wider border-b border-outline-soft pb-2.5">
                            Règles Financières & Plafonds
                        </h2>
                        <p className="text-xs text-gray-600 leading-relaxed flex-1">
                            Les plafonds réglementaires appliqués sont : Petite Caisse ≤ 20 USD,
                            Justification &gt; 150 USD par 3 devis, Décharge sous 48h.
                        </p>
                        <span className="inline-flex items-center gap-1.5 self-start px-3 py-1.5 bg-success-soft text-success-dark rounded-md text-[11px] font-semibold">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Plafonds actifs & validés
                        </span>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}