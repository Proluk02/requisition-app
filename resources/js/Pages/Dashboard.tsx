import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';

export default function Dashboard() {
    const { auth } = usePage<PageProps>().props;
    const isAdmin = auth.user.role === 'admin';

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-bold text-[#04326D]">Tableau de Bord Administration</h2>}>
            <Head title="Dashboard" />

            {/* Grille Bento pour Admin */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Colonne Principale (8 colonnes) */}
                <div className="lg:col-span-8 space-y-6">
                    {/* Alerte si Admin */}
                    {isAdmin && (
                        <div className="bg-[#F58F20]/10 border-l-4 border-tertiary p-4 rounded-r-lg flex items-center gap-4">
                            <span className="text-tertiary text-2xl">⚠️</span>
                            <div>
                                <h4 className="font-bold text-tertiary uppercase text-xs">Alerte Système</h4>
                                <p className="text-sm text-gray-700">3 nouveaux utilisateurs en attente de validation 2FA.</p>
                            </div>
                        </div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <StatCard title="Total Utilisateurs" value="24" color="primary" />
                        <StatCard title="Réquisitions du Jour" value="12" color="secondary" />
                    </div>
                </div>

                {/* Sidebar (4 colonnes) - Panneau de contrôle */}
                <div className="lg:col-span-4 bg-white border border-outline-variant rounded-xl p-6 shadow-sm">
                    <h3 className="font-bold text-[#0B192C] mb-4">Accès Rapide Admin</h3>
                    <div className="space-y-3">
                        <button className="w-full text-left p-3 rounded-lg bg-surface-container-low hover:bg-surface-variant transition text-sm font-medium">
                            📁 Gestion Projets & AGR
                        </button>
                        <button className="w-full text-left p-3 rounded-lg bg-surface-container-low hover:bg-surface-variant transition text-sm font-medium">
                            📊 Rapports Financiers
                        </button>
                        <button className="w-full text-left p-3 rounded-lg bg-surface-container-low hover:bg-surface-variant transition text-sm font-medium">
                            ⚙️ Paramètres Système
                        </button>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

function StatCard({ title, value, color }: { title: string; value: string; color: 'primary' | 'secondary' | 'tertiary' }) {
    const colorClasses = {
        primary: 'border-[#04326D] text-[#04326D]',
        secondary: 'border-[#3c5e9b] text-[#3c5e9b]',
        tertiary: 'border-[#F58F20] text-[#F58F20]',
    };

    return (
        <div className={`bg-white p-6 rounded-xl border-l-4 shadow-sm border ${colorClasses[color]}`}>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{title}</p>
            <p className="text-3xl font-bold mt-2">{value}</p>
        </div>
    );
}