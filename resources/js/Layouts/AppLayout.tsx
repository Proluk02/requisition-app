import { PropsWithChildren, useState, useRef, useEffect, ReactNode } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';

interface NotificationItem {
    id: string;
    titre: string;
    message: string;
    date: string;
    lu: boolean;
    urgent?: boolean;
}

interface AppLayoutProps extends PropsWithChildren {
    header?: ReactNode;
}

export default function AppLayout({ header, children }: AppLayoutProps) {
    const { auth } = usePage<PageProps>().props;
    const user = auth.user;

    // Helper Spatie / rôle direct
    const hasRole = (roleName: string): boolean => {
        if (!user) return false;
        if (user.role === roleName) return true;
        if (user.roles && user.roles.some((r) => r.name === roleName)) return true;
        return false;
    };

    const isStaff = hasRole('beneficiary') || hasRole('coordinator');
    const isMP = hasRole('project_manager');
    const isFinance = hasRole('finance');
    const isAdminManager = hasRole('admin_manager');
    const isDirector = hasRole('director');
    const isPurchaser = hasRole('purchaser');
    const isCashier = hasRole('cashier');
    const isAdmin = hasRole('admin');

    // LECTURE DIRECTE DE LA BASE DE DONNÉES (Table projects ou sites)
    const nomDuProjet = user.project?.name || (user.site ? `Site de ${user.site.name}` : '');

    // États
    const [locale, setLocale] = useState<'FR' | 'EN'>('FR');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showHelpModal, setShowHelpModal] = useState(false);

    const notifRef = useRef<HTMLDivElement>(null);
    const profileRef = useRef<HTMLDivElement>(null);

    const [notifications, setNotifications] = useState<NotificationItem[]>([
        {
            id: '1',
            titre: 'Visa Requis',
            message: 'Une réquisition de transport nécessite votre arbitrage.',
            date: 'Il y a 10 min',
            lu: false,
            urgent: true,
        },
        {
            id: '2',
            titre: 'Caisse décaissée',
            message: 'Le bon de sortie a été liquidé au guichet.',
            date: 'Il y a 1h',
            lu: false,
        },
    ]);

    const unreadCount = notifications.filter((n) => !n.lu).length;

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

    const isRouteActive = (pattern: string): boolean => {
        try {
            return route().current(pattern);
        } catch {
            return false;
        }
    };

    const getInitials = (name?: string) => {
        if (!name) return 'BP';
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    return (
        <div className="flex min-h-screen bg-[#F9F9FF] font-sans antialiased text-[#101c2e]">
            {/* 1. SIDEBAR (Bleu Nuit #0B192C) */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0B192C] flex flex-col justify-between text-white border-r border-[#1B2B44] transition-transform duration-300 lg:translate-x-0 ${
                    mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="flex flex-col flex-1 overflow-y-auto">
                    {/* Header Logo */}
                    <div className="h-16 flex items-center justify-between px-6 border-b border-white/10 shrink-0">
                        <Link href={route('dashboard')} className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center font-black text-[#0B192C] text-sm shadow">
                                BP
                            </div>
                            <div className="flex flex-col">
                                <span className="font-bold text-sm leading-tight tracking-wide">Bon Pasteur</span>
                                <span className="text-[10px] text-[#B2BED6] uppercase tracking-wider">Kolwezi ASBL</span>
                            </div>
                        </Link>
                        <button
                            onClick={() => setMobileMenuOpen(false)}
                            className="lg:hidden text-gray-400 hover:text-white"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Bloc Projet */}
                    {nomDuProjet && (
                        <div className="p-4 shrink-0">
                            <div className="bg-[#04326D] p-3 rounded border border-white/10 shadow-inner">
                                <span className="text-[9px] uppercase tracking-wider text-[#B2BED6] font-bold block">
                                    Projet Affecté
                                </span>
                                <span className="text-xs font-bold text-white block mt-0.5 truncate" title={nomDuProjet}>
                                    {nomDuProjet}
                                </span>
                                <span className="inline-block mt-1.5 px-2 py-0.5 bg-[#F58F20] text-white rounded text-[9px] font-mono font-bold uppercase tracking-wider">
                                    {user.role?.replace('_', ' ')}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* CTA Nouvelle Réquisition */}
                    {(isStaff || isMP || isAdmin) && (
                        <div className="px-4 pb-2 shrink-0">
                            <Link
                                href={route('requisitions.create')}
                                className="w-full bg-[#F58F20] hover:bg-[#d97c18] text-white py-2 px-3 rounded font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                                </svg>
                                <span>Nouvelle Réquisition</span>
                            </Link>
                        </div>
                    )}

                    {/* Navigation */}
                    <nav className="px-3 py-2 space-y-4 text-xs font-medium flex-1">
                        {/* Dashboard */}
                        <div className="space-y-1">
                            <Link
                                href={route('dashboard')}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded transition ${
                                    isRouteActive('dashboard')
                                        ? 'bg-white/10 text-white font-bold'
                                        : 'text-[#B2BED6] hover:bg-white/5 hover:text-white'
                                }`}
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                </svg>
                                <span>Tableau de Bord</span>
                            </Link>
                        </div>

                        {/* Liens Staff / Coordonnateur */}
                        {isStaff && (
                            <div className="space-y-1">
                                <span className="px-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">
                                    Opérations & Besoins
                                </span>
                                <Link
                                    href={route('requisitions.index')}
                                    className={`flex items-center gap-3 px-3 py-2 rounded transition ${
                                        isRouteActive('requisitions.*')
                                            ? 'bg-white/10 text-white font-bold'
                                            : 'text-[#B2BED6] hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <span>Mes Réquisitions</span>
                                </Link>

                                <Link
                                    href={route('transport.index')}
                                    className={`flex items-center gap-3 px-3 py-2 rounded transition ${
                                        isRouteActive('transport.*')
                                            ? 'bg-white/10 text-white font-bold'
                                            : 'text-[#B2BED6] hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                    </svg>
                                    <span>Transport & Déplacements</span>
                                </Link>
                            </div>
                        )}

                        {/* Liens Manager de Projet */}
                        {isMP && (
                            <div className="space-y-1">
                                <span className="px-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">
                                    Gestion du Projet
                                </span>
                                <Link
                                    href={route('dashboard')}
                                    className={`flex items-center gap-3 px-3 py-2 rounded transition ${
                                        isRouteActive('dashboard')
                                            ? 'bg-white/10 text-white font-bold'
                                            : 'text-[#B2BED6] hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                    </svg>
                                    <span>Validations Équipe</span>
                                </Link>

                                <Link
                                    href={route('transport.index')}
                                    className={`flex items-center gap-3 px-3 py-2 rounded transition ${
                                        isRouteActive('transport.*')
                                            ? 'bg-white/10 text-white font-bold'
                                            : 'text-[#B2BED6] hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                    </svg>
                                    <span>Contrôle Transports</span>
                                </Link>

                                <Link
                                    href={route('requisitions.index')}
                                    className={`flex items-center gap-3 px-3 py-2 rounded transition ${
                                        isRouteActive('requisitions.*')
                                            ? 'bg-white/10 text-white font-bold'
                                            : 'text-[#B2BED6] hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                    <span>Mes Réquisitions Projet</span>
                                </Link>
                            </div>
                        )}

                        {/* Admin */}
                        {isAdmin && (
                            <div className="space-y-1">
                                <span className="px-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">
                                    Administration
                                </span>
                                <Link
                                    href={route('admin.users.index')}
                                    className={`flex items-center gap-3 px-3 py-2 rounded transition ${
                                        isRouteActive('admin.users.*')
                                            ? 'bg-white/10 text-white font-bold'
                                            : 'text-[#B2BED6] hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                    <span>Gestion Utilisateurs</span>
                                </Link>
                            </div>
                        )}
                    </nav>

                    {/* Footer Utilisateur Réel */}
                    <div className="p-4 border-t border-white/10 shrink-0 space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#04326D] text-white flex items-center justify-center font-bold text-xs shrink-0">
                                {getInitials(user.name)}
                            </div>
                            <div className="truncate">
                                <p className="text-xs font-bold text-white truncate">{user.name}</p>
                                <p className="text-[10px] text-[#B2BED6] capitalize truncate">
                                    {user.role?.replace('_', ' ')}
                                </p>
                            </div>
                        </div>

                        <Link
                            href={route('logout')}
                            method="post"
                            as="button"
                            className="flex items-center gap-2 text-xs font-semibold text-[#B2BED6] hover:text-red-400 transition w-full"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            <span>Déconnexion</span>
                        </Link>
                    </div>
                </div>
            </aside>

            {/* Backdrop Mobile */}
            {mobileMenuOpen && (
                <div
                    onClick={() => setMobileMenuOpen(false)}
                    className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                ></div>
            )}

            {/* 2. ZONE DE CONTENU */}
            <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
                <header className="h-16 bg-white border-b border-[#E2E8F0] flex items-center justify-between px-4 sm:px-8 sticky top-0 z-30 shadow-sm">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setMobileMenuOpen(true)}
                            className="lg:hidden p-1.5 text-gray-600 hover:text-gray-900 rounded"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>

                        {nomDuProjet && (
                            <div className="hidden md:flex items-center gap-2 text-xs text-gray-600">
                                <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
                                <span>Projet :</span>
                                <strong className="text-[#0B192C]">{nomDuProjet}</strong>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex border border-[#B2BED6] rounded overflow-hidden text-[10px] font-bold">
                            <button
                                onClick={() => setLocale('FR')}
                                className={`px-2 py-1 transition ${locale === 'FR' ? 'bg-[#04326D] text-white' : 'bg-white text-gray-600'}`}
                            >
                                FR
                            </button>
                            <button
                                onClick={() => setLocale('EN')}
                                className={`px-2 py-1 transition ${locale === 'EN' ? 'bg-[#04326D] text-white' : 'bg-white text-gray-600'}`}
                            >
                                EN
                            </button>
                        </div>

                        {/* Guide Procédures */}
                        <button
                            type="button"
                            onClick={() => setShowHelpModal(true)}
                            className="p-1.5 text-gray-500 hover:text-[#04326D] hover:bg-gray-100 rounded-full transition"
                            title="Procédures financières"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </button>

                        {/* Notifications */}
                        <div className="relative" ref={notifRef}>
                            <button
                                type="button"
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
                                    </div>
                                    <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
                                        {notifications.map((n) => (
                                            <div key={n.id} className="p-3 hover:bg-gray-50 transition">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className={`font-bold ${n.urgent ? 'text-[#DC2626]' : 'text-[#04326D]'}`}>
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

                        {/* Profil */}
                        <div className="relative" ref={profileRef}>
                            <button
                                onClick={() => setShowProfileMenu(!showProfileMenu)}
                                className="flex items-center gap-2.5 border-l border-gray-200 pl-3 text-left hover:opacity-90"
                            >
                                <div className="w-8 h-8 rounded-full bg-[#04326D] text-white flex items-center justify-center font-bold text-xs">
                                    {getInitials(user.name)}
                                </div>
                                <div className="hidden md:block">
                                    <p className="text-xs font-bold text-[#101c2e] leading-tight">{user.name}</p>
                                    <p className="text-[10px] text-gray-500 capitalize">{user.role?.replace('_', ' ')}</p>
                                </div>
                                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {showProfileMenu && (
                                <div className="absolute right-0 mt-2 w-52 bg-white border border-[#B2BED6] rounded shadow-xl z-50 text-xs py-1">
                                    <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
                                        <p className="font-bold text-gray-800">{user.name}</p>
                                        <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
                                    </div>
                                    <Link
                                        href={route('profile.edit')}
                                        className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                                    >
                                        Mon Profil
                                    </Link>
                                    <Link
                                        href={route('logout')}
                                        method="post"
                                        as="button"
                                        className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50"
                                    >
                                        Déconnexion
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* ZONE DE CONTENU */}
                <main className="p-4 sm:p-8 space-y-6 flex-1 max-w-[1440px]">
                    {header && <div className="mb-2">{header}</div>}
                    {children}
                </main>
            </div>

            {/* MODALE DU GUIDE DE PROCÉDURES */}
            {showHelpModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="bg-white rounded border border-[#B2BED6] shadow-2xl max-w-lg w-full p-6 space-y-4">
                        <div className="flex items-center justify-between border-b pb-3">
                            <h3 className="text-sm font-bold text-[#0B192C] uppercase flex items-center gap-2">
                                <svg className="w-5 h-5 text-[#04326D]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                                <span>Règles Financières & Procédures</span>
                            </h3>
                            <button
                                onClick={() => setShowHelpModal(false)}
                                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
                            >
                                &times;
                            </button>
                        </div>

                        <div className="space-y-3 text-xs text-gray-700">
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                                <strong className="text-[#04326D] block mb-1">1. Petite Caisse (&le; 20 USD / 30 000 FC)</strong>
                                <p className="text-[11px] text-gray-600">
                                    Achats d'urgence immédiats. Décaissement direct avec visa du Chef de Projet.
                                </p>
                            </div>

                            <div className="p-3 bg-gray-50 border border-gray-200 rounded">
                                <strong className="text-gray-900 block mb-1">2. Règle des 3 Devis (&gt; 150 USD)</strong>
                                <p className="text-[11px] text-gray-600">
                                    Toute réquisition excédant 150 USD doit obligatoirement inclure 3 devis comparatifs.
                                </p>
                            </div>

                            <div className="p-3 bg-orange-50 border border-orange-200 rounded">
                                <strong className="text-[#F58F20] block mb-1">3. Règle d'or de Décharge (48h ouvrées)</strong>
                                <p className="text-[11px] text-gray-600">
                                    Les pièces de caisse originales doivent être retournées dans les 48h suivant le décaissement.
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end pt-2 border-t">
                            <button
                                onClick={() => setShowHelpModal(false)}
                                className="px-4 py-1.5 bg-[#04326D] text-white rounded text-xs font-bold"
                            >
                                Compris
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}