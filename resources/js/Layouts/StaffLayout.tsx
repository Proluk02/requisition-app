import { PropsWithChildren, useState, useRef, useEffect } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';

interface NotificationItem {
    id: string;
    titre: string;
    message: string;
    date: string;
    lu: boolean;
    type: 'success' | 'warning' | 'info';
}

export default function StaffLayout({ children }: PropsWithChildren) {
    const { auth } = usePage<PageProps>().props;
    const [locale, setLocale] = useState<'FR' | 'EN'>('FR');

    // Menus déroulants Topbar
    const [showNotifications, setShowNotifications] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    // Notifications simulées
    const [notifications, setNotifications] = useState<NotificationItem[]>([
        {
            id: '1',
            titre: 'Réquisition Validée (Caisse)',
            message: 'Votre réquisition UB/08/045 est prête au guichet Caisse Principale.',
            date: 'Il y a 10 min',
            lu: false,
            type: 'success'
        },
        {
            id: '2',
            titre: 'Justificatif en souffrance (48h)',
            message: 'Veuillez déposer les reçus de transport pour la décharge #DCH-089.',
            date: 'Il y a 2h',
            lu: false,
            type: 'warning'
        },
        {
            id: '3',
            titre: 'Visa accordé',
            message: 'Le Manager de Projet a validé votre demande UB/09/001.',
            date: 'Hier',
            lu: true,
            type: 'info'
        }
    ]);

    const unreadCount = notifications.filter(n => !n.lu).length;

    // Fermer les dropdowns en cliquant en dehors
    const notifRef = useRef<HTMLDivElement>(null);
    const profileRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
                setShowNotifications(false);
            }
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setShowProfileMenu(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const markAllAsRead = () => {
        setNotifications(notifications.map(n => ({ ...n, lu: true })));
    };

    return (
        <div className="flex min-h-screen bg-[#F9F9FF] font-sans antialiased text-[#101c2e]">
            
            {/* SIDEBAR GAUCHE - Bleu Nuit (#0B192C) NETTOYÉE SELON CAHIER DES CHARGES */}
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

                    {/* Navigation - STRICTE ET NETTOYÉE */}
                    <nav className="px-3 space-y-1 text-sm font-medium">
                        {/* 1. Dashboard */}
                        <Link
                            href={route('dashboard')}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded transition ${
                                route().current('dashboard')
                                    ? 'bg-white/10 text-white font-bold'
                                    : 'text-[#B2BED6] hover:bg-white/5 hover:text-white'
                            }`}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                            </svg>
                            Dashboard
                        </Link>

                        {/* 2. Réquisitions (Générales Achat & Service) */}
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

                        {/* 3. NOUVEAU : Transport & Mouvements */}
                        <Link
                            href={route('transport.index')}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded transition ${
                                route().current('transport.*')
                                    ? 'bg-white/10 text-white font-bold'
                                    : 'text-[#B2BED6] hover:bg-white/5 hover:text-white'
                            }`}
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                            Transport & Déplacements
                        </Link>

                        {/* 4. Caisse & Justificatifs */}
                        <Link
                            href="#caisse"
                            className="flex items-center gap-3 px-3 py-2.5 rounded text-[#B2BED6] hover:bg-white/5 hover:text-white transition"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            Caisse & Vouchers
                        </Link>

                        {/* 5. Paramètres */}
                        <Link
                            href={route('profile.edit')}
                            className="flex items-center gap-3 px-3 py-2.5 rounded text-[#B2BED6] hover:bg-white/5 hover:text-white transition"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Paramètres
                        </Link>
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

            {/* ZONE CONTENU PRINCIPAL */}
            <div className="flex-1 pl-64 flex flex-col min-w-0">
                {/* TOPBAR INTERACTIVE */}
                <header className="h-16 bg-white border-b border-[#E2E8F0] flex items-center justify-between px-8 sticky top-0 z-40">
                    {/* Recherche globale */}
                    <div className="relative w-80">
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

                    {/* Actions Topbar (Langue, Notifications, Profil) */}
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

                        {/* MENU DÉROULANT NOTIFICATIONS */}
                        <div className="relative" ref={notifRef}>
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="relative p-1.5 text-gray-500 hover:text-[#04326D] hover:bg-gray-100 rounded-full transition"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                                {unreadCount > 0 && (
                                    <span className="absolute top-0 right-0 w-4 h-4 bg-[#F58F20] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                                        {unreadCount}
                                    </span>
                                )}
                            </button>

                            {showNotifications && (
                                <div className="absolute right-0 mt-2 w-80 bg-white border border-[#B2BED6] rounded shadow-2xl z-50 text-xs overflow-hidden">
                                    <div className="p-3 bg-[#0B192C] text-white flex items-center justify-between">
                                        <span className="font-bold">Notifications ({unreadCount})</span>
                                        {unreadCount > 0 && (
                                            <button onClick={markAllAsRead} className="text-[10px] text-[#F58F20] hover:underline">
                                                Tout marquer comme lu
                                            </button>
                                        )}
                                    </div>
                                    <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
                                        {notifications.map(n => (
                                            <div key={n.id} className={`p-3 hover:bg-gray-50 transition ${!n.lu ? 'bg-blue-50/40' : ''}`}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className={`font-bold ${n.type === 'warning' ? 'text-[#F58F20]' : 'text-[#04326D]'}`}>
                                                        {n.titre}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400">{n.date}</span>
                                                </div>
                                                <p className="text-gray-600 text-[11px] leading-snug">{n.message}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* MENU DÉROULANT PROFIL */}
                        <div className="relative" ref={profileRef}>
                            <button
                                onClick={() => setShowProfileMenu(!showProfileMenu)}
                                className="flex items-center gap-2.5 border-l border-gray-200 pl-4 text-left hover:opacity-90"
                            >
                                <div className="w-8 h-8 rounded-full bg-[#04326D] text-white flex items-center justify-center font-bold text-xs">
                                    {auth.user?.name ? auth.user.name.substring(0, 2).toUpperCase() : 'CM'}
                                </div>
                                <div className="hidden sm:block">
                                    <p className="text-xs font-bold leading-none text-[#101c2e]">{auth.user?.name}</p>
                                    <p className="text-[10px] text-gray-500 mt-0.5 capitalize">{auth.user?.role}</p>
                                </div>
                                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {showProfileMenu && (
                                <div className="absolute right-0 mt-2 w-48 bg-white border border-[#B2BED6] rounded shadow-xl z-50 text-xs py-1">
                                    <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
                                        <p className="font-bold text-gray-800">{auth.user?.name}</p>
                                        <p className="text-[10px] text-gray-500 truncate">{auth.user?.email}</p>
                                    </div>
                                    <Link
                                        href={route('profile.edit')}
                                        className="block px-4 py-2 text-gray-700 hover:bg-gray-100 transition"
                                    >
                                        Mon Profil
                                    </Link>
                                    <Link
                                        href={route('logout')}
                                        method="post"
                                        as="button"
                                        className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 transition"
                                    >
                                        Déconnexion
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* CONTENU INJECTÉ */}
                <main className="p-8 space-y-6 flex-1 max-w-[1440px]">
                    {children}
                </main>
            </div>
        </div>
    );
}