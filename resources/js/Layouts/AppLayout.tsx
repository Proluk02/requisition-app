import { PropsWithChildren, useState, useRef, useEffect, ReactNode } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import { PageProps, User } from '@/types';
import { useTranslation } from '@/lib/i18n';
import {
    LayoutDashboard,
    FileText,
    Truck,
    ClipboardCheck,
    Wallet,
    Users as UsersIcon,
    LogOut,
    Bell,
    Menu,
    X,
    ChevronDown,
    HelpCircle,
    Plus,
    Inbox,
    BookOpen,
    Building2,
} from 'lucide-react';

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
    const { auth, notifications: sharedNotifications } = usePage<
        PageProps & { notifications?: NotificationItem[] }
    >().props;
    const { __, locale, switchLocale } = useTranslation();

    const user = auth.user as User & {
        roles?: { name: string }[];
        permissions?: string[];
        project?: { name: string; full_name?: string };
        site?: { name: string };
    };

    const hasRole = (roleName: string): boolean => {
        if (!user) return false;
        if (user.role === roleName) return true;
        if (user.roles && user.roles.some((r) => r.name === roleName)) return true;
        return false;
    };

    const isStaff = hasRole('beneficiary') || hasRole('coordinator');
    const isMP = hasRole('project_manager');
    const isFinance = hasRole('finance');
    const isAdmin = hasRole('admin');

    const projetAffecte = user.project?.name || (user.site ? `Site ${user.site.name}` : '');

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showHelpModal, setShowHelpModal] = useState(false);
    const [selectedNotif, setSelectedNotif] = useState<NotificationItem | null>(null);

    const notifRef = useRef<HTMLDivElement>(null);
    const profileRef = useRef<HTMLDivElement>(null);

    const [notifications, setNotifications] = useState<NotificationItem[]>([]);

    useEffect(() => {
        setNotifications((sharedNotifications ?? []).filter((n) => !n.lu));
    }, [sharedNotifications]);

    const unreadCount = notifications.length;

    const handleMarkAllAsRead = () => {
        setNotifications([]);
        router.post(route('notifications.mark-all-read'), {}, { preserveScroll: true });
    };

    const handleViewNotification = (notif: NotificationItem) => {
        setSelectedNotif(notif);
        setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
        router.post(`/notifications/${notif.id}/mark-read`, {}, { preserveScroll: true });
    };

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

    const formatRole = (role?: string) =>
        role ? role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '';

    const navItemClass = (active: boolean) =>
        `group flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] font-medium transition-all duration-150 ${
            active
                ? 'bg-white/10 text-white shadow-inner'
                : 'text-[#B2BED6] hover:bg-white/5 hover:text-white'
        }`;

    return (
        <div className="flex min-h-screen bg-background font-sans antialiased text-on-surface">
            {/* ============ SIDEBAR ============ */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar flex flex-col justify-between text-white border-r border-white/5 transition-transform duration-300 lg:translate-x-0 ${
                    mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="flex flex-col flex-1 overflow-y-auto">
                    {/* Logo */}
                    <div className="h-16 flex items-center justify-between px-6 border-b border-white/5 shrink-0">
                        <Link href={route('dashboard')} className="flex items-center gap-3 group">
                            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center overflow-hidden shadow-md group-hover:scale-105 transition-transform shrink-0">
                                <img
                                    src="/assets/images/logo.png"
                                    alt="Bon Pasteur Kolwezi"
                                    className="w-full h-full object-contain p-1"
                                />
                            </div>
                            <div className="flex flex-col">
                                <span className="font-bold text-sm leading-tight tracking-wide">
                                    Bon Pasteur
                                </span>
                                <span className="text-[10px] text-[#B2BED6] uppercase tracking-widest">
                                    Kolwezi ASBL
                                </span>
                            </div>
                        </Link>
                        <button
                            onClick={() => setMobileMenuOpen(false)}
                            className="lg:hidden text-gray-400 hover:text-white p-1 rounded hover:bg-white/5 transition"
                            aria-label="Fermer le menu"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Bloc Projet */}
                    {projetAffecte && (
                        <div className="p-4 shrink-0">
                            <div className="bg-primary/95 p-3 rounded-lg border border-white/10 shadow-inner">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <Building2 className="w-3 h-3 text-[#9BBBFF]" />
                                    <span className="text-[9px] uppercase tracking-widest text-[#B2BED6] font-bold">
                                        {__('Projet')}
                                    </span>
                                </div>
                                <span
                                    className="text-xs font-bold text-white block truncate"
                                    title={projetAffecte}
                                >
                                    {projetAffecte}
                                </span>
                                <span className="inline-block mt-2 px-2 py-0.5 bg-tertiary text-white rounded text-[9px] font-semibold uppercase tracking-wider">
                                    {formatRole(user.role)}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* CTA */}
                    {(isStaff || isMP || isAdmin) && (
                        <div className="px-4 pb-2 shrink-0">
                            <Link
                                href={route('requisitions.create')}
                                className="w-full bg-tertiary hover:bg-tertiary-dark text-white py-2.5 px-3 rounded-md font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all duration-150 hover:shadow-md active:scale-[0.98]"
                            >
                                <Plus className="w-4 h-4" strokeWidth={2.5} />
                                <span>{__('Nouvelle Réquisition')}</span>
                            </Link>
                        </div>
                    )}

                    {/* Navigation */}
                    <nav className="px-3 py-2 space-y-4 text-xs font-medium flex-1">
                        <div className="space-y-0.5">
                            <Link href={route('dashboard')} className={navItemClass(isRouteActive('dashboard'))}>
                                <LayoutDashboard className="w-4 h-4" />
                                <span>{__('Dashboard')}</span>
                            </Link>
                        </div>

                        {isStaff && (
                            <div className="space-y-0.5">
                                <Link
                                    href={route('requisitions.index')}
                                    className={navItemClass(isRouteActive('requisitions.*'))}
                                >
                                    <FileText className="w-4 h-4" />
                                    <span>{__('Mes Réquisitions')}</span>
                                </Link>
                                <Link
                                    href={route('transport.index')}
                                    className={navItemClass(isRouteActive('transport.*'))}
                                >
                                    <Truck className="w-4 h-4" />
                                    <span>{__('Transport & Déplacements')}</span>
                                </Link>
                            </div>
                        )}

                        {isMP && (
                            <div className="space-y-0.5">
                                <Link
                                    href={route('dashboard')}
                                    className={navItemClass(isRouteActive('dashboard'))}
                                >
                                    <ClipboardCheck className="w-4 h-4" />
                                    <span>{__('Validations Équipe')}</span>
                                </Link>
                                <Link
                                    href={route('transport.index')}
                                    className={navItemClass(isRouteActive('transport.*'))}
                                >
                                    <Truck className="w-4 h-4" />
                                    <span>{__('Contrôle Transports')}</span>
                                </Link>
                                <Link
                                    href={route('requisitions.index')}
                                    className={navItemClass(isRouteActive('requisitions.*'))}
                                >
                                    <FileText className="w-4 h-4" />
                                    <span>{__('Réquisitions Projet')}</span>
                                </Link>
                            </div>
                        )}

                        {isFinance && (
                            <div className="space-y-0.5">
                                <Link
                                    href={route('finance.dashboard')}
                                    className={navItemClass(isRouteActive('finance.*'))}
                                >
                                    <Wallet className="w-4 h-4" />
                                    <span>Contrôle Budgétaire & Visa</span>
                                </Link>
                            </div>
                        )}

                        {isAdmin && (
                            <div className="space-y-1">
                                <span className="px-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">
                                    Administration
                                </span>
                                <Link
                                    href={route('admin.users.index')}
                                    className={navItemClass(isRouteActive('admin.users.*'))}
                                >
                                    <UsersIcon className="w-4 h-4" />
                                    <span>{__('Gestion Utilisateurs')}</span>
                                </Link>
                            </div>
                        )}
                    </nav>

                    {/* Footer utilisateur */}
                    <div className="p-4 border-t border-white/5 shrink-0 space-y-3">
                        <div className="flex items-center gap-3">
                            {user.avatar ? (
                                <img
                                    src={user.avatar}
                                    alt={user.name}
                                    className="w-9 h-9 rounded-full object-cover border-2 border-white/10 shrink-0"
                                />
                            ) : (
                                <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs shrink-0 border-2 border-white/10">
                                    {getInitials(user.name)}
                                </div>
                            )}
                            <div className="truncate min-w-0">
                                <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                                <p className="text-[10px] text-[#B2BED6] truncate">
                                    {formatRole(user.role)}
                                </p>
                            </div>
                        </div>

                        <Link
                            href={route('logout')}
                            method="post"
                            as="button"
                            className="flex items-center gap-2 text-xs font-medium text-[#B2BED6] hover:text-red-400 transition w-full py-1"
                        >
                            <LogOut className="w-4 h-4" />
                            <span>{__('Déconnexion')}</span>
                        </Link>
                    </div>
                </div>
            </aside>

            {/* Backdrop mobile */}
            {mobileMenuOpen && (
                <div
                    onClick={() => setMobileMenuOpen(false)}
                    className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden animate-fade-in"
                />
            )}

            {/* ============ ZONE CONTENU ============ */}
            <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
                <header className="h-16 bg-white border-b border-outline-soft flex items-center justify-between px-4 sm:px-8 sticky top-0 z-30 shadow-sm">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setMobileMenuOpen(true)}
                            className="lg:hidden p-2 text-gray-600 hover:text-gray-900 rounded-md hover:bg-gray-100 transition"
                            aria-label="Ouvrir le menu"
                        >
                            <Menu className="w-5 h-5" />
                        </button>

                        {projetAffecte && (
                            <div className="hidden md:flex items-center gap-2 text-xs text-gray-600">
                                <span className="w-2 h-2 rounded-full bg-success shadow-[0_0_0_3px_rgba(16,185,129,0.15)]" />
                                <span>{__('Projet')} :</span>
                                <strong className="text-on-surface font-semibold">{projetAffecte}</strong>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                        {/* Langue */}
                        <div className="flex border border-outline-variant rounded-md overflow-hidden text-[10px] font-bold">
                            <button
                                type="button"
                                onClick={() => switchLocale('fr')}
                                className={`px-2.5 py-1.5 transition ${
                                    locale === 'fr'
                                        ? 'bg-primary text-white'
                                        : 'bg-white text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                FR
                            </button>
                            <button
                                type="button"
                                onClick={() => switchLocale('en')}
                                className={`px-2.5 py-1.5 transition ${
                                    locale === 'en'
                                        ? 'bg-primary text-white'
                                        : 'bg-white text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                EN
                            </button>
                        </div>

                        {/* Aide */}
                        <button
                            type="button"
                            onClick={() => setShowHelpModal(true)}
                            className="p-2 text-gray-500 hover:text-primary hover:bg-primary-soft rounded-full transition"
                            title={__('Procédures financières')}
                        >
                            <HelpCircle className="w-5 h-5" />
                        </button>

                        {/* Notifications */}
                        <div className="relative" ref={notifRef}>
                            <button
                                type="button"
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="relative p-2 text-gray-500 hover:text-primary hover:bg-primary-soft rounded-full transition"
                                aria-label="Notifications"
                            >
                                <Bell className="w-5 h-5" />
                                {unreadCount > 0 && (
                                    <span className="absolute top-1 right-1 w-4 h-4 bg-tertiary text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                                        {unreadCount}
                                    </span>
                                )}
                            </button>

                            {showNotifications && (
                                <div className="absolute right-0 mt-2 w-80 bg-white border border-outline-soft rounded-lg shadow-dropdown z-50 text-xs overflow-hidden animate-slide-down">
                                    <div className="p-3 bg-sidebar text-white flex items-center justify-between">
                                        <span className="font-semibold text-[13px]">
                                            {__('Notifications')}
                                            {unreadCount > 0 && (
                                                <span className="ml-2 text-[10px] font-normal text-[#B2BED6]">
                                                    {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                                                </span>
                                            )}
                                        </span>
                                        {unreadCount > 0 && (
                                            <button
                                                type="button"
                                                onClick={handleMarkAllAsRead}
                                                className="text-[10px] text-tertiary hover:underline font-medium"
                                            >
                                                Tout marquer comme lu
                                            </button>
                                        )}
                                    </div>

                                    <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
                                        {notifications.length === 0 ? (
                                            <div className="p-8 text-center">
                                                <Inbox className="w-10 h-10 mx-auto text-gray-300 mb-2" strokeWidth={1.5} />
                                                <p className="text-[12px] text-gray-500 font-medium">
                                                    Vous êtes à jour
                                                </p>
                                                <p className="text-[11px] text-gray-400 mt-0.5">
                                                    Aucune nouvelle notification.
                                                </p>
                                            </div>
                                        ) : (
                                            notifications.map((n) => (
                                                <button
                                                    key={n.id}
                                                    type="button"
                                                    onClick={() => handleViewNotification(n)}
                                                    className="w-full text-left p-3 hover:bg-primary-soft/60 transition bg-primary-soft/30 group"
                                                >
                                                    <div className="flex items-start justify-between gap-2 mb-1">
                                                        <span
                                                            className={`font-semibold text-[12px] ${
                                                                n.urgent ? 'text-error' : 'text-primary'
                                                            }`}
                                                        >
                                                            {n.titre}
                                                        </span>
                                                        <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                                            {n.date}
                                                        </span>
                                                    </div>
                                                    <p className="text-gray-600 text-[11px] leading-snug line-clamp-2">
                                                        {n.message}
                                                    </p>
                                                    <span className="text-[10px] font-semibold text-primary group-hover:underline mt-1.5 inline-block">
                                                        Voir le détail →
                                                    </span>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Profil */}
                        <div className="relative" ref={profileRef}>
                            <button
                                onClick={() => setShowProfileMenu(!showProfileMenu)}
                                className="flex items-center gap-2.5 border-l border-gray-200 pl-3 text-left hover:opacity-90 transition"
                            >
                                {user.avatar ? (
                                    <img
                                        src={user.avatar}
                                        alt={user.name}
                                        className="w-8 h-8 rounded-full object-cover border border-primary"
                                    />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs">
                                        {getInitials(user.name)}
                                    </div>
                                )}
                                <div className="hidden md:block">
                                    <p className="text-xs font-semibold text-on-surface leading-tight">
                                        {user.name}
                                    </p>
                                    <p className="text-[10px] text-gray-500">{formatRole(user.role)}</p>
                                </div>
                                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                            </button>

                            {showProfileMenu && (
                                <div className="absolute right-0 mt-2 w-56 bg-white border border-outline-soft rounded-lg shadow-dropdown z-50 text-xs py-1 animate-slide-down">
                                    <div className="px-4 py-2.5 border-b border-gray-100 bg-surface-muted">
                                        <p className="font-semibold text-gray-800">{user.name}</p>
                                        <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
                                    </div>
                                    <Link
                                        href={route('profile.edit')}
                                        className="block px-4 py-2 text-gray-700 hover:bg-primary-soft transition"
                                    >
                                        {__('Mon Profil')}
                                    </Link>
                                    <Link
                                        href={route('logout')}
                                        method="post"
                                        as="button"
                                        className="w-full text-left px-4 py-2 text-error hover:bg-error-soft transition"
                                    >
                                        {__('Déconnexion')}
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Contenu */}
                <main className="p-4 sm:p-8 space-y-6 flex-1 w-full max-w-[1440px] mx-auto">
                    {header && <div className="mb-2">{header}</div>}
                    {children}
                </main>
            </div>

            {/* ============ MODALE DÉTAIL NOTIFICATION ============ */}
            {selectedNotif && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-lg border border-outline-soft shadow-modal max-w-md w-full p-6 space-y-4 animate-slide-down">
                        <div className="flex items-start justify-between gap-4 border-b border-outline-soft pb-3">
                            <div className="flex items-start gap-3">
                                <div
                                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                                        selectedNotif.urgent
                                            ? 'bg-error-soft text-error'
                                            : 'bg-primary-soft text-primary'
                                    }`}
                                >
                                    <Bell className="w-4 h-4" />
                                </div>
                                <h3
                                    className={`text-sm font-bold leading-tight pt-1.5 ${
                                        selectedNotif.urgent ? 'text-error' : 'text-primary'
                                    }`}
                                >
                                    {selectedNotif.titre}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedNotif(null)}
                                className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition"
                                aria-label="Fermer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">
                            {selectedNotif.message}
                        </p>
                        <p className="text-[11px] text-gray-400">
                            Reçue le {selectedNotif.date}
                        </p>
                        <div className="flex justify-end pt-2 border-t border-outline-soft">
                            <button
                                type="button"
                                onClick={() => setSelectedNotif(null)}
                                className="px-4 py-2 bg-primary text-white text-xs font-semibold rounded-md hover:bg-primary-light transition"
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============ MODALE PROCÉDURES ============ */}
            {showHelpModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-lg border border-outline-soft shadow-modal max-w-lg w-full p-6 space-y-4 animate-slide-down">
                        <div className="flex items-center justify-between border-b border-outline-soft pb-3">
                            <h3 className="text-sm font-bold text-on-surface uppercase flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-primary" />
                                <span>{__('Règles Financières & Procédures')}</span>
                            </h3>
                            <button
                                onClick={() => setShowHelpModal(false)}
                                className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition"
                                aria-label="Fermer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div className="p-3.5 bg-primary-soft border border-primary/15 rounded-md">
                                <strong className="text-primary block mb-1 text-[12px]">
                                    1. Petite Caisse (≤ 20 USD / 30 000 FC)
                                </strong>
                                <p className="text-[11px] text-gray-600 leading-relaxed">
                                    Achats d'urgence immédiats. Décaissement direct avec visa du Chef de Projet.
                                </p>
                            </div>

                            <div className="p-3.5 bg-surface-muted border border-outline-soft rounded-md">
                                <strong className="text-gray-900 block mb-1 text-[12px]">
                                    2. Règle des 3 Devis (&gt; 150 USD)
                                </strong>
                                <p className="text-[11px] text-gray-600 leading-relaxed">
                                    Toute réquisition excédant 150 USD doit obligatoirement inclure 3 devis comparatifs.
                                </p>
                            </div>

                            <div className="p-3.5 bg-tertiary-soft border border-tertiary/20 rounded-md">
                                <strong className="text-tertiary block mb-1 text-[12px]">
                                    3. Règle d'or de Décharge (48h ouvrées)
                                </strong>
                                <p className="text-[11px] text-gray-600 leading-relaxed">
                                    Les pièces de caisse originales doivent être retournées dans les 48h suivant le décaissement.
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end pt-2 border-t border-outline-soft">
                            <button
                                onClick={() => setShowHelpModal(false)}
                                className="px-4 py-2 bg-primary text-white rounded-md text-xs font-semibold hover:bg-primary-light transition"
                            >
                                {__('Compris')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}