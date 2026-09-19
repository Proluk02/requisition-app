import { PropsWithChildren, useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';

export default function StaffLayout({ children }: PropsWithChildren) {
    const { auth } = usePage<PageProps>().props;
    const [locale, setLocale] = useState<'FR' | 'EN'>('FR');

    return (
        <div className="flex min-h-screen bg-[#F9F9FF] font-sans antialiased text-[#101c2e]">
            {/* SIDEBAR GAUCHE - Bleu Nuit (#0B192C) */}
            <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-[#0B192C] flex flex-col justify-between text-white border-r border-[#1B2B44]">
                <div>
                    {/* Header Logo */}
                    <div className="h-20 flex items-center px-6 gap-3 border-b border-white/10">
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center font-black text-[#0B192C] text-lg shadow">
                            BP
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-sm tracking-wide leading-tight">Bon Pasteur</span>
                            <span className="text-[10px] text-[#B2BED6] uppercase tracking-wider">Kolwezi ASBL</span>
                        </div>
                    </div>

{/* Action Bouton Rapide */}
<div className="p-4">
    <Link
        href={route('requisitions.create')}
        className="w-full bg-[#04326D] hover:bg-[#06428f] text-white py-2.5 px-4 rounded font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition"
    >
        <span className="text-base font-bold">+</span>
        Nouvelle Réquisition
    </Link>
</div>

                    {/* Navigation */}
                    <nav className="px-3 space-y-1 text-sm font-medium">
                        <Link
                            href={route('dashboard')}
                            className="flex items-center gap-3 px-3 py-2.5 rounded bg-white/10 text-white font-bold"
                        >
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                            </svg>
                            Dashboard
                        </Link>
                        <Link
                            href={route('requisitions.index')}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded transition ${
                                route().current('requisitions.*')
                                    ? 'bg-white/10 text-white font-bold'
                                    : 'text-[#B2BED6] hover:bg-white/5 hover:text-white'
                            }`}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Réquisitions
                        </Link>
                        <a href="#caisse" className="flex items-center gap-3 px-3 py-2.5 rounded text-[#B2BED6] hover:bg-white/5 hover:text-white transition">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            Caisse
                        </a>
                        <a href="#projets" className="flex items-center gap-3 px-3 py-2.5 rounded text-[#B2BED6] hover:bg-white/5 hover:text-white transition">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                            Projets / AGR
                        </a>
                        <a href="#rapports" className="flex items-center gap-3 px-3 py-2.5 rounded text-[#B2BED6] hover:bg-white/5 hover:text-white transition">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            Rapports
                        </a>
                        <a href="#parametres" className="flex items-center gap-3 px-3 py-2.5 rounded text-[#B2BED6] hover:bg-white/5 hover:text-white transition">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Paramètres
                        </a>
                    </nav>
                </div>

                {/* Footer Déconnexion */}
                <div className="p-4 border-t border-white/10">
                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        className="flex items-center gap-3 px-3 py-2 text-xs font-bold text-[#B2BED6] hover:text-white transition w-full"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Déconnexion
                    </Link>
                </div>
            </aside>

            {/* ZONE DE CONTENU DROITE */}
            <div className="flex-1 pl-64 flex flex-col min-w-0">
                {/* TOPBAR */}
                <header className="h-16 bg-white border-b border-[#E2E8F0] flex items-center justify-between px-8 sticky top-0 z-40">
                    {/* Recherche globale */}
                    <div className="relative w-96">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </span>
                        <input
                            type="text"
                            placeholder="Rechercher code, activité, voucher..."
                            className="w-full pl-9 pr-4 py-1.5 text-xs bg-white border border-[#B2BED6] rounded focus:outline-none focus:border-[#04326D]"
                        />
                    </div>

                    {/* Actions Profil & Statut */}
                    <div className="flex items-center gap-4">
                        {/* Sélecteur FR / EN */}
                        <div className="flex border border-[#B2BED6] rounded overflow-hidden text-[10px] font-bold">
                            <button
                                onClick={() => setLocale('FR')}
                                className={`px-2 py-1 ${locale === 'FR' ? 'bg-[#04326D] text-white' : 'bg-white text-gray-600'}`}
                            >
                                FR
                            </button>
                            <button
                                onClick={() => setLocale('EN')}
                                className={`px-2 py-1 ${locale === 'EN' ? 'bg-[#04326D] text-white' : 'bg-white text-gray-600'}`}
                            >
                                EN
                            </button>
                        </div>

                        {/* Aide & Notif */}
                        <button className="text-gray-500 hover:text-gray-700">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </button>
                        <button className="relative text-gray-500 hover:text-gray-700">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#F58F20] rounded-full"></span>
                        </button>

                        {/* Action Rapide */}
                        <button className="bg-[#0B192C] text-white text-xs font-semibold px-3 py-1.5 rounded flex items-center gap-1.5 hover:bg-[#152842]">
                            <svg className="w-3.5 h-3.5 text-[#F58F20]" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                            </svg>
                            Action Rapide
                        </button>

                        {/* Agent Avatar info */}
                        <div className="flex items-center gap-2.5 border-l border-gray-200 pl-4">
                            <div className="w-8 h-8 rounded-full bg-[#04326D] text-white flex items-center justify-center font-bold text-xs">
                                CM
                            </div>
                            <div className="text-left">
                                <p className="text-xs font-bold leading-none text-[#101c2e]">{auth.user?.name || 'Chancelvie Mutombo'}</p>
                                <p className="text-[10px] text-gray-500 mt-0.5">Agent Terrain Éducation</p>
                            </div>
                        </div>
                    </div>
                </header>

                {/* CONTENU PRINCIPAL INJECTÉ */}
                <main className="p-8 space-y-6 flex-1 max-w-[1440px]">
                    {children}
                </main>
            </div>
        </div>
    );
}