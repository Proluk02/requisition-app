import { Head, Link } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';

export default function AdminDashboard() {
    return (
        <AppLayout>
            <Head title="Tableau de Bord Administration" />

            <div className="space-y-6">
                {/* En-tête */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
                    <div>
                        <h1 className="text-xl font-bold text-[#0B192C]">
                            Supervision du Système & Administration
                        </h1>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Gérez les comptes, les affectations projets et le contrôle d'accès de l'ASBL Bon Pasteur.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link
                            href={route('admin.users.create')}
                            className="bg-[#04326D] hover:bg-[#06428f] text-white px-4 py-2 rounded text-xs font-bold flex items-center gap-2 shadow-sm transition"
                        >
                            <span>+</span>
                            <span>Nouvel Utilisateur</span>
                        </Link>
                    </div>
                </div>

                {/* 4 Indicateurs Clés */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white border border-[#B2BED6] rounded p-4 shadow-sm">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Utilisateurs Enregistrés</span>
                        <p className="text-2xl font-black text-[#0B192C] mt-1">24 comptes</p>
                        <p className="text-[11px] text-[#10B981] font-semibold mt-1">Tous authentifiés Google OAuth</p>
                    </div>

                    <div className="bg-white border border-[#B2BED6] rounded p-4 shadow-sm">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Projets Actifs</span>
                        <p className="text-2xl font-black text-[#04326D] mt-1">6 projets</p>
                        <p className="text-[11px] text-gray-500 mt-1">Dont USIMAMIZI, AFYA BORA...</p>
                    </div>

                    <div className="bg-white border border-[#B2BED6] rounded p-4 shadow-sm">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Sites Opérationnels</span>
                        <p className="text-2xl font-black text-[#0B192C] mt-1">6 sites</p>
                        <p className="text-[11px] text-gray-500 mt-1">Kanina, Tshala, Mukoma...</p>
                    </div>

                    <div className="bg-white border-2 border-[#F58F20] rounded p-4 shadow-sm">
                        <span className="text-[10px] font-bold text-[#0B192C] uppercase tracking-wider">Sécurité Système</span>
                        <p className="text-2xl font-black text-[#10B981] mt-1">100% Conforme</p>
                        <p className="text-[11px] text-gray-500 mt-1">Inscription publique désactivée</p>
                    </div>
                </div>

                {/* Liens rapides d'administration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white border border-[#B2BED6] rounded p-5 shadow-sm space-y-3">
                        <h2 className="text-xs font-bold uppercase text-[#0B192C] tracking-wider border-b pb-2">
                            Gestion des Accès & Rôles Spatie
                        </h2>
                        <p className="text-xs text-gray-600">
                            Configurez les permissions fines des 8 acteurs du circuit de réquisition (Staff, MP, Finances, Direction, Caisse).
                        </p>
                        <Link
                            href={route('admin.users.index')}
                            className="inline-block px-3.5 py-1.5 bg-[#04326D] text-white rounded text-xs font-bold hover:bg-[#06428f] transition"
                        >
                            Ouvrir le Répertoire des Utilisateurs &rarr;
                        </Link>
                    </div>

                    <div className="bg-white border border-[#B2BED6] rounded p-5 shadow-sm space-y-3">
                        <h2 className="text-xs font-bold uppercase text-[#0B192C] tracking-wider border-b pb-2">
                            Règles Financières & Plafonds
                        </h2>
                        <p className="text-xs text-gray-600">
                            Les plafonds réglementaires appliqués sont : Petite Caisse &le; 20 USD, Justification &gt; 150 USD par 3 devis, Décharge 48h.
                        </p>
                        <span className="inline-block px-2.5 py-1 bg-emerald-50 text-[#065F46] rounded text-[11px] font-mono font-bold">
                            Plafonds Actifs & Validés
                        </span>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}