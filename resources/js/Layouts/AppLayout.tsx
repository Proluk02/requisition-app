import { PropsWithChildren, useState, useRef, useEffect, useMemo, ReactNode } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { PageProps, User } from '@/types';
import { useTranslation } from '@/lib/i18n';
import {
    LayoutDashboard,
    FileCheck2,
    FileSpreadsheet,
    FolderKanban,
    Building2,
    AlertOctagon,
    FileText,
    Truck,
    CheckSquare,
    ShieldCheck,
    Wallet,
    Users,
    LogOut,
    HelpCircle,
    Bell,
    ChevronDown,
    Menu,
    X,
    Plus,
    PieChart,
    MapPin,
    ArrowUpRight,
    ArrowDownLeft,
    BookOpen,
    KeyRound,
    BarChart3,
    FileCheck,
    Search,
    Check,
    CheckCheck,
    AlertTriangle,
    CalendarDays,
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
        is_director_interim?: boolean;
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
    const isAdminManager = hasRole('admin_manager');
    const isDirector = hasRole('director');
    const isPurchaser = hasRole('purchaser');
    const isCashier = hasRole('cashier');
    const isAdmin = hasRole('admin');

    const isDirectorInterim = isAdminManager && Boolean(user.is_director_interim);
    const canAccessDirector = isDirector || isDirectorInterim;

    const projetAffecte =
        user.project?.name || (user.site ? `Site ${user.site.name}` : '');

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showHelpModal, setShowHelpModal] = useState(false);
    const [selectedNotif, setSelectedNotif] = useState<NotificationItem | null>(null);

    // Notifications en state React local (synchronisation fluide sans rechargement)
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [notifSearch, setNotifSearch] = useState('');
    const [notifTab, setNotifTab] = useState<'all' | 'urgent'>('all');

    const notifRef = useRef<HTMLDivElement>(null);
    const profileRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setNotifications((sharedNotifications ?? []).filter((n) => !n.lu));
    }, [sharedNotifications]);

    const silentSync = (url: string) => {
        if (typeof window !== 'undefined' && (window as any).axios) {
            (window as any).axios.post(url).catch(() => {});
            return;
        }

        const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                ...(token ? { 'X-CSRF-TOKEN': token } : {}),
            },
        }).catch(() => {});
    };

    const handleMarkAllAsRead = () => {
        setNotifications([]);
        silentSync(route('notifications.mark-all-read'));
    };

    const handleMarkSingleAsRead = (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        silentSync(`/notifications/${id}/mark-read`);
    };

    const handleViewNotification = (notif: NotificationItem) => {
        setSelectedNotif(notif);
        handleMarkSingleAsRead(notif.id);
    };

    // Tolérance d'accès à l'attribut urgent, peu importe la syntaxe de la BDD
    const getIsUrgent = (n: NotificationItem) => Boolean(n.urgent || (n as any).is_urgent || (n as any).isUrgent);

    const filteredNotifications = useMemo(() => {
        let result = notifications.filter((n) => {
            const isUrg = getIsUrgent(n);
            if (notifTab === 'urgent' && !isUrg) return false;
            if (notifSearch.trim()) {
                const q = notifSearch.toLowerCase().trim();
                const matchTitre = n.titre.toLowerCase().includes(q);
                const matchMsg = n.message.toLowerCase().includes(q);
                if (!matchTitre && !matchMsg) return false;
            }
            return true;
        });

        // On trie pour TOUJOURS placer les notifications urgentes en haut de la liste
        result.sort((a, b) => {
            const aUrg = getIsUrgent(a) ? 1 : 0;
            const bUrg = getIsUrgent(b) ? 1 : 0;
            return bUrg - aUrg; 
        });

        return result;
    }, [notifications, notifTab, notifSearch]);

    const urgentCount = notifications.filter(getIsUrgent).length;
    const unreadCount = notifications.length;

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

    // LOGIQUE DE FOCUS STRICT : Vérification pure sans conflit d'états
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

    const roleLabel = user.role?.replace('_', ' ');

    return (
        <div className="flex min-h-screen bg-[#F9F9FF] font-sans antialiased text-[#101c2e]">
            {/* SIDEBAR OFFICIELLE */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0B192C] flex flex-col justify-between text-white border-r border-[#1B2B44] lg:translate-x-0 transition-transform duration-200 ${
                    mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="flex flex-col flex-1 overflow-y-auto">
                    {/* Logo Institutionnel */}
                    <div className="h-16 flex items-center justify-between px-6 border-b border-white/10 shrink-0">
                        <Link href={route('dashboard')} className="flex items-center gap-3">
                            <img
                                src="/assets/images/logo.png"
                                alt="Logo Bon Pasteur"
                                className="w-9 h-9 rounded-full object-contain bg-white p-0.5 shadow shrink-0"
                            />
                            <div className="flex flex-col">
                                <span className="font-bold text-sm leading-tight tracking-wide">
                                    Bon Pasteur
                                </span>
                                <span className="text-[10px] text-[#B2BED6] uppercase tracking-wider">
                                    Kolwezi ASBL
                                </span>
                            </div>
                        </Link>
                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen(false)}
                            className="lg:hidden text-gray-400 hover:text-white"
                            aria-label="Fermer le menu"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Projet affecté & Mention Intérim */}
                    {projetAffecte && (
                        <div className="p-4 shrink-0">
                            <div className="bg-[#04326D] p-3 rounded border border-white/10">
                                <span className="text-[9px] uppercase tracking-wider text-[#B2BED6] font-bold block">
                                    {__('Projet')}
                                </span>
                                <span
                                    className="text-xs font-bold text-white block mt-0.5 truncate"
                                    title={projetAffecte}
                                >
                                    {projetAffecte}
                                </span>
                                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                    {roleLabel && (
                                        <span className="inline-block px-2 py-0.5 bg-[#F58F20] text-white rounded text-[9px] font-mono font-bold uppercase tracking-wider">
                                            {roleLabel}
                                        </span>
                                    )}
                                    {isDirectorInterim && (
                                        <span className="inline-block px-1.5 py-0.5 bg-emerald-600 text-white rounded text-[8.5px] font-bold uppercase tracking-wider">
                                            Intérim DG
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Bouton Nouvelle Réquisition */}
                    {(isStaff || isMP || isAdmin) && (
                        <div className="px-4 pb-2 shrink-0">
                            <Link
                                href={route('requisitions.create')}
                                className="w-full bg-[#F58F20] hover:bg-[#d97c18] text-white py-2 px-3 rounded font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition"
                            >
                                <Plus className="w-4 h-4" strokeWidth={2.5} />
                                <span>{__('Nouvelle Réquisition')}</span>
                            </Link>
                        </div>
                    )}

                    {/* Navigation principale */}
                    <nav className="px-3 py-2 space-y-4 text-xs font-medium flex-1">
                        
                        {/* Exclusif : Dashboard Général (Caché si PM car PM a son propre dashboard) */}
                        {!isMP && (
                            <div className="space-y-1">
                                <Link
                                    href={route('dashboard')}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded transition ${
                                        isRouteActive('dashboard')
                                            ? 'bg-white/10 text-white font-bold'
                                            : 'text-[#B2BED6] hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    <LayoutDashboard className="w-4 h-4" />
                                    <span>{__('Dashboard')}</span>
                                </Link>
                            </div>
                        )}

                        {/* Direction Générale */}
                        {canAccessDirector && (
                            <div className="space-y-1">
                                <div className="flex items-center justify-between px-3 mb-1">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
                                        Direction Générale
                                    </span>
                                    {isDirectorInterim && (
                                        <span className="text-[8px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-1 rounded border border-emerald-500/30">
                                            P.O.
                                        </span>
                                    )}
                                </div>

                                <Link
                                    href={route('director.dashboard')}
                                    className={`flex items-center gap-3 px-3 py-2 rounded transition ${
                                        isRouteActive('director.dashboard')
                                            ? 'bg-white/10 text-white font-bold'
                                            : 'text-[#B2BED6] hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    <FileCheck2 className="w-4 h-4 text-emerald-400" />
                                    <span>Approbations & Bon à Payer</span>
                                </Link>

                                <Link
                                    href={route('director.projects')}
                                    className={`flex items-center gap-3 px-3 py-2 rounded transition ${
                                        isRouteActive('director.projects')
                                            ? 'bg-white/10 text-white font-bold'
                                            : 'text-[#B2BED6] hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    <FolderKanban className="w-4 h-4 text-blue-300" />
                                    <span>Synthèse des Projets</span>
                                </Link>

                                <Link
                                    href={route('director.caisses')}
                                    className={`flex items-center gap-3 px-3 py-2 rounded transition ${
                                        isRouteActive('director.caisses')
                                            ? 'bg-white/10 text-white font-bold'
                                            : 'text-[#B2BED6] hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    <Building2 className="w-4 h-4 text-amber-300" />
                                    <span>Trésorerie & Caisses</span>
                                </Link>

                                <Link
                                    href={route('director.urgences')}
                                    className={`flex items-center gap-3 px-3 py-2 rounded transition ${
                                        isRouteActive('director.urgences')
                                            ? 'bg-white/10 text-white font-bold'
                                            : 'text-[#B2BED6] hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    <AlertOctagon className="w-4 h-4 text-red-400" />
                                    <span>Dérogations Urgentes</span>
                                </Link>
                            </div>
                        )}

                        {/* Staff / Coordonnateur (Exclusif : Masqué si l'utilisateur est aussi PM pour éviter les doublons) */}
                        {isStaff && !isMP && (
                            <div className="space-y-1">
                                <Link
                                    href={route('requisitions.index')}
                                    className={`flex items-center gap-3 px-3 py-2 rounded transition ${
                                        isRouteActive('requisitions.*')
                                            ? 'bg-white/10 text-white font-bold'
                                            : 'text-[#B2BED6] hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    <FileText className="w-4 h-4" />
                                    <span>{__('Mes Réquisitions')}</span>
                                </Link>

                                <Link
                                    href={route('transport.index')}
                                    className={`flex items-center gap-3 px-3 py-2 rounded transition ${
                                        isRouteActive('transport.*')
                                            ? 'bg-white/10 text-white font-bold'
                                            : 'text-[#B2BED6] hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    <Truck className="w-4 h-4" />
                                    <span>{__('Transport & Déplacements')}</span>
                                </Link>

                                <Link
                                    href={route('justifications.index')}
                                    className={`flex items-center gap-3 px-3 py-2 rounded transition ${
                                        isRouteActive('justifications.*')
                                            ? 'bg-white/10 text-white font-bold'
                                            : 'text-[#B2BED6] hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    <FileCheck className="w-4 h-4 text-emerald-400" />
                                    <span>{__('Justificatifs')}</span>
                                </Link>
                            </div>
                        )}

                        {/* Manager de Projet */}
                        {isMP && (
                            <div className="space-y-1">
                                <Link
                                    href={route('dashboard')}
                                    className={`flex items-center gap-3 px-3 py-2 rounded transition ${
                                        isRouteActive('dashboard')
                                            ? 'bg-white/10 text-white font-bold'
                                            : 'text-[#B2BED6] hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    <CheckSquare className="w-4 h-4" />
                                    <span>{__('Validations Équipe')}</span>
                                </Link>

                                <Link
                                    href={route('pm.reporting.index')}
                                    className={`flex items-center gap-3 px-3 py-2 rounded transition ${
                                        isRouteActive('pm.reporting.*')
                                            ? 'bg-white/10 text-white font-bold'
                                            : 'text-[#B2BED6] hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    <BarChart3 className="w-4 h-4 text-emerald-400" />
                                    <span>{__('Rapports & Synthèse')}</span>
                                </Link>

                                <Link
                                    href={route('justifications.index')}
                                    className={`flex items-center gap-3 px-3 py-2 rounded transition ${
                                        isRouteActive('justifications.*')
                                            ? 'bg-white/10 text-white font-bold'
                                            : 'text-[#B2BED6] hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    <FileCheck className="w-4 h-4 text-amber-300" />
                                    <span>{__('Justificatifs')}</span>
                                </Link>

                                <Link
                                    href={route('transport.index')}
                                    className={`flex items-center gap-3 px-3 py-2 rounded transition ${
                                        isRouteActive('transport.*')
                                            ? 'bg-white/10 text-white font-bold'
                                            : 'text-[#B2BED6] hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    <Truck className="w-4 h-4" />
                                    <span>{__('Contrôle Transports')}</span>
                                </Link>

                                <Link
                                    href={route('requisitions.index')}
                                    className={`flex items-center gap-3 px-3 py-2 rounded transition ${
                                        isRouteActive('requisitions.*')
                                            ? 'bg-white/10 text-white font-bold'
                                            : 'text-[#B2BED6] hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    <FileText className="w-4 h-4" />
                                    <span>{__('Mes Réquisitions Projet')}</span>
                                </Link>
                            </div>
                        )}

                        {/* Direction Financière */}
                        {isFinance && (
                            <div className="space-y-1">
                                <span className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                                    Direction Financière
                                </span>

                                <Link
                                    href={route('finance.dashboard')}
                                    className={`flex items-center gap-3 px-3 py-2 rounded transition ${
                                        isRouteActive('finance.dashboard')
                                            ? 'bg-white/10 text-white font-bold'
                                            : 'text-[#B2BED6] hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    <ShieldCheck className="w-4 h-4 text-primary" />
                                    <span>Contrôle & Visas Réquisitions</span>
                                </Link>

                                <Link
                                    href={route('finance.budgets.index')}
                                    className={`flex items-center gap-3 px-3 py-2 rounded transition ${
                                        isRouteActive('finance.budgets.index') // Exact match pour éviter le conflit avec import
                                            ? 'bg-white/10 text-white font-bold'
                                            : 'text-[#B2BED6] hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    <PieChart className="w-4 h-4 text-emerald-400" />
                                    <span>Budgets & Donateurs</span>
                                </Link>

                                <Link
                                    href={route('finance.budgets.import-form')}
                                    className={`flex items-center gap-3 px-3 py-2 rounded transition ${
                                        isRouteActive('finance.budgets.import-form')
                                            ? 'bg-white/10 text-white font-bold'
                                            : 'text-[#B2BED6] hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                                    <span>Importer lignes budgétaires</span>
                                </Link>

                                <Link
                                    href={route('finance.caisses.index')}
                                    className={`flex items-center gap-3 px-3 py-2 rounded transition ${
                                        isRouteActive('finance.caisses.index')
                                            ? 'bg-white/10 text-white font-bold'
                                            : 'text-[#B2BED6] hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    <Building2 className="w-4 h-4 text-amber-300" />
                                    <span>Gestion des Caisses & Soldes</span>
                                </Link>

                                <Link
                                    href={route('finance.caisses.sessions')}
                                    className={`flex items-center gap-3 px-3 py-2 rounded transition ${
                                        isRouteActive('finance.caisses.sessions')
                                            ? 'bg-white/10 text-white font-bold'
                                            : 'text-[#B2BED6] hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    <KeyRound className="w-4 h-4 text-[#F58F20]" />
                                    <span>Approbations d'Ouvertures</span>
                                </Link>
                            </div>
                        )}

                        {/* Guichet Caisse */}
                        {isCashier && (
                            <div className="space-y-1">
                                <span className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                                    Guichet Caisse
                                </span>

                                <Link
                                    href={route('cashier.dashboard')}
                                    className={`flex items-center gap-3 px-3 py-2 rounded transition ${
                                        isRouteActive('cashier.dashboard')
                                            ? 'bg-white/10 text-white font-bold'
                                            : 'text-[#B2BED6] hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    <Wallet className="w-4 h-4 text-amber-300" />
                                    <span>Guichet & Sessions</span>
                                </Link>

                                <Link
                                    href={route('cashier.journal.du-jour')}
                                    className={`flex items-center gap-3 px-3 py-2 rounded transition ${
                                        isRouteActive('cashier.journal.du-jour')
                                            ? 'bg-white/10 text-white font-bold'
                                            : 'text-[#B2BED6] hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    <CalendarDays className="w-4 h-4 text-cyan-300" />
                                    <span>Journal du Jour</span>
                                </Link>

                                <Link
                                    href={route('cashier.disbursements.index')}
                                    className={`flex items-center gap-3 px-3 py-2 rounded transition ${
                                        isRouteActive('cashier.disbursements.*')
                                            ? 'bg-white/10 text-white font-bold'
                                            : 'text-[#B2BED6] hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                                    <span>Bons à Décaisser (BSC)</span>
                                </Link>

                                <Link
                                    href={route('cashier.receipts.index')}
                                    className={`flex items-center gap-3 px-3 py-2 rounded transition ${
                                        isRouteActive('cashier.receipts.*')
                                            ? 'bg-white/10 text-white font-bold'
                                            : 'text-[#B2BED6] hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    <ArrowDownLeft className="w-4 h-4 text-blue-300" />
                                    <span>Entrées de Caisse (BEC)</span>
                                </Link>

                                <Link
                                    href={route('cashier.ledger.index')}
                                    className={`flex items-center gap-3 px-3 py-2 rounded transition ${
                                        isRouteActive('cashier.ledger.*')
                                            ? 'bg-white/10 text-white font-bold'
                                            : 'text-[#B2BED6] hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    <BookOpen className="w-4 h-4 text-purple-300" />
                                    <span>Grand Livre de Caisse</span>
                                </Link>
                            </div>
                        )}

                        {/* Administration Système */}
                        {isAdmin && (
                            <div className="space-y-1">
                                <span className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
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
                                    <Users className="w-4 h-4" />
                                    <span>{__('Gestion Utilisateurs')}</span>
                                </Link>

                                <Link
                                    href={route('admin.projects.index')}
                                    className={`flex items-center gap-3 px-3 py-2 rounded transition ${
                                        isRouteActive('admin.projects.*')
                                            ? 'bg-white/10 text-white font-bold'
                                            : 'text-[#B2BED6] hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    <FolderKanban className="w-4 h-4 text-blue-300" />
                                    <span>Projets Institutionnels</span>
                                </Link>

                                <Link
                                    href={route('admin.sites.index')}
                                    className={`flex items-center gap-3 px-3 py-2 rounded transition ${
                                        isRouteActive('admin.sites.*')
                                            ? 'bg-white/10 text-white font-bold'
                                            : 'text-[#B2BED6] hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    <MapPin className="w-4 h-4 text-emerald-300" />
                                    <span>Sites Opérationnels</span>
                                </Link>
                            </div>
                        )}
                    </nav>

                    {/* Footer utilisateur */}
                    <div className="p-4 border-t border-white/10 shrink-0 space-y-3">
                        <div className="flex items-center gap-3">
                            {user.avatar ? (
                                <img
                                    src={user.avatar}
                                    alt={user.name}
                                    className="w-8 h-8 rounded-full object-cover border border-[#04326D] shrink-0"
                                />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-[#04326D] text-white flex items-center justify-center font-bold text-xs shrink-0">
                                    {getInitials(user.name)}
                                </div>
                            )}
                            <div className="truncate">
                                <p className="text-xs font-bold text-white truncate">{user.name}</p>
                                <p className="text-[10px] text-[#B2BED6] capitalize truncate">
                                    {roleLabel} {isDirectorInterim && '(Intérim DG)'}
                                </p>
                            </div>
                        </div>

                        <Link
                            href={route('logout')}
                            method="post"
                            as="button"
                            className="flex items-center gap-2 text-xs font-semibold text-[#B2BED6] hover:text-red-400 w-full transition"
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
                    className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                />
            )}

            {/* CONTENU PRINCIPAL */}
            <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
                <header className="h-16 bg-white border-b border-[#E2E8F0] flex items-center justify-between px-4 sm:px-8 sticky top-0 z-30 shadow-sm">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen(true)}
                            className="lg:hidden p-1.5 text-gray-600 hover:text-gray-900 rounded"
                            aria-label="Ouvrir le menu"
                        >
                            <Menu className="w-6 h-6" />
                        </button>

                        {projetAffecte && (
                            <div className="hidden md:flex items-center gap-2 text-xs text-gray-600">
                                <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                                <span>{__('Projet')} :</span>
                                <strong className="text-[#0B192C]">{projetAffecte}</strong>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Sélecteur langue */}
                        <div className="flex border border-[#B2BED6] rounded overflow-hidden text-[10px] font-bold">
                            <button
                                type="button"
                                onClick={() => switchLocale('fr')}
                                className={`px-2 py-1 transition ${
                                    locale === 'fr'
                                        ? 'bg-[#04326D] text-white'
                                        : 'bg-white text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                FR
                            </button>
                            <button
                                type="button"
                                onClick={() => switchLocale('en')}
                                className={`px-2 py-1 transition ${
                                    locale === 'en'
                                        ? 'bg-[#04326D] text-white'
                                        : 'bg-white text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                EN
                            </button>
                        </div>

                        {/* Procédures & Règles */}
                        <button
                            type="button"
                            onClick={() => setShowHelpModal(true)}
                            className="p-1.5 text-gray-500 hover:text-[#04326D] hover:bg-gray-100 rounded-full transition"
                            title={__('Procédures financières')}
                        >
                            <HelpCircle className="w-5 h-5" />
                        </button>

                        {/* Notifications */}
                        <div className="relative" ref={notifRef}>
                            <button
                                type="button"
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="relative p-1.5 text-gray-500 hover:text-[#04326D] hover:bg-gray-100 rounded-full transition"
                                aria-label="Notifications"
                            >
                                <Bell className="w-5 h-5" />
                                {unreadCount > 0 && (
                                    <span className="absolute top-0 right-0 w-4 h-4 bg-[#F58F20] text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-scale-in">
                                        {unreadCount}
                                    </span>
                                )}
                            </button>

                            {showNotifications && (
                                <div className="absolute right-0 mt-2 w-88 sm:w-96 bg-white border border-[#B2BED6] rounded shadow-2xl z-50 text-xs overflow-hidden animate-slide-down">
                                    <div className="p-3 bg-[#0B192C] text-white flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold">
                                                {__('Notifications')}
                                            </span>
                                            {unreadCount > 0 && (
                                                <span className="px-1.5 py-0.2 rounded-full bg-[#F58F20] text-white font-mono text-[10px] font-bold">
                                                    {unreadCount}
                                                </span>
                                            )}
                                        </div>

                                        {unreadCount > 0 && (
                                            <button
                                                type="button"
                                                onClick={handleMarkAllAsRead}
                                                className="inline-flex items-center gap-1 text-[10px] text-[#F58F20] hover:underline font-bold"
                                            >
                                                <CheckCheck className="w-3.5 h-3.5" />
                                                <span>Tout marquer comme lu</span>
                                            </button>
                                        )}
                                    </div>

                                    <div className="p-2.5 bg-gray-50 border-b border-gray-200 space-y-2">
                                        <div className="relative">
                                            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                            <input
                                                type="text"
                                                placeholder="Filtrer les alertes..."
                                                value={notifSearch}
                                                onChange={(e) => setNotifSearch(e.target.value)}
                                                className="w-full pl-8 pr-7 py-1 bg-white border border-[#B2BED6] rounded text-[11px] text-[#0B192C] focus:outline-none focus:border-[#04326D]"
                                            />
                                            {notifSearch && (
                                                <button
                                                    type="button"
                                                    onClick={() => setNotifSearch('')}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => setNotifTab('all')}
                                                className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition ${
                                                    notifTab === 'all'
                                                        ? 'bg-[#04326D] text-white'
                                                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                                }`}
                                            >
                                                Toutes ({notifications.length})
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setNotifTab('urgent')}
                                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold transition ${
                                                    notifTab === 'urgent'
                                                        ? 'bg-red-600 text-white'
                                                        : 'bg-red-50 text-red-700 hover:bg-red-100'
                                                }`}
                                            >
                                                <AlertTriangle className="w-3 h-3" />
                                                <span>Urgentes ({urgentCount})</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
                                        {filteredNotifications.length === 0 ? (
                                            <div className="p-6 text-center text-gray-400">
                                                <Bell className="w-7 h-7 mx-auto text-gray-300 mb-1" />
                                                <p className="text-[11px]">
                                                    {notifications.length === 0
                                                        ? 'Aucune notification en attente.'
                                                        : 'Aucune notification ne correspond à ce filtre.'}
                                                </p>
                                            </div>
                                        ) : (
                                            filteredNotifications.map((n) => (
                                                <div
                                                    key={n.id}
                                                    onClick={() => handleViewNotification(n)}
                                                    className="p-3 hover:bg-blue-50/50 bg-white transition cursor-pointer flex items-start justify-between gap-2.5 group"
                                                >
                                                    <div className="space-y-0.5 flex-1 min-w-0">
                                                        <div className="flex items-center justify-between gap-1">
                                                            <div className="flex items-center gap-1.5 truncate">
                                                                {getIsUrgent(n) && (
                                                                    <span className="w-2 h-2 rounded-full bg-red-600 shrink-0 animate-pulse" />
                                                                )}
                                                                <span
                                                                    className={`font-bold truncate text-[11px] ${
                                                                        getIsUrgent(n) ? 'text-red-700' : 'text-[#04326D]'
                                                                    }`}
                                                                >
                                                                    {n.titre}
                                                                </span>
                                                            </div>
                                                            <span className="text-[9.5px] text-gray-400 font-mono shrink-0">
                                                                {n.date}
                                                            </span>
                                                        </div>
                                                        <p className="text-gray-600 text-[11px] leading-snug line-clamp-2">
                                                            {n.message}
                                                        </p>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={(e) => handleMarkSingleAsRead(n.id, e)}
                                                        className="p-1 rounded text-gray-300 hover:text-emerald-700 hover:bg-emerald-50 transition shrink-0"
                                                        title="Marquer comme lu"
                                                    >
                                                        <Check className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Profil */}
                        <div className="relative" ref={profileRef}>
                            <button
                                type="button"
                                onClick={() => setShowProfileMenu(!showProfileMenu)}
                                className="flex items-center gap-2.5 border-l border-gray-200 pl-3 text-left hover:opacity-90"
                            >
                                {user.avatar ? (
                                    <img
                                        src={user.avatar}
                                        alt={user.name}
                                        className="w-8 h-8 rounded-full object-cover border border-[#04326D]"
                                    />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-[#04326D] text-white flex items-center justify-center font-bold text-xs">
                                        {getInitials(user.name)}
                                    </div>
                                )}
                                <div className="hidden md:block">
                                    <p className="text-xs font-bold text-[#101c2e] leading-tight">{user.name}</p>
                                    <p className="text-[10px] text-gray-500 capitalize">
                                        {roleLabel} {isDirectorInterim && '(Intérim)'}
                                    </p>
                                </div>
                                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                            </button>

                            {showProfileMenu && (
                                <div className="absolute right-0 mt-2 w-52 bg-white border border-[#B2BED6] rounded shadow-xl z-50 text-xs py-1 animate-slide-down">
                                    <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
                                        <p className="font-bold text-gray-800">{user.name}</p>
                                        <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
                                    </div>
                                    <Link
                                        href={route('profile.edit')}
                                        className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                                    >
                                        {__('Mon Profil')}
                                    </Link>
                                    <Link
                                        href={route('logout')}
                                        method="post"
                                        as="button"
                                        className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50"
                                    >
                                        {__('Déconnexion')}
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <main className="p-4 sm:p-8 space-y-6 flex-1 max-w-[1440px]">
                    {header && <div className="mb-2">{header}</div>}
                    {children}
                </main>
            </div>

            {/* MODALE NOTIFICATION */}
            {selectedNotif && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 animate-fade-in">
                    <div className="bg-white rounded border border-[#B2BED6] shadow-2xl max-w-sm w-full p-5 space-y-3 animate-scale-in">
                        <div className="flex items-center justify-between border-b pb-2">
                            <h3
                                className={`text-xs font-bold uppercase ${
                                    getIsUrgent(selectedNotif) ? 'text-red-700' : 'text-[#04326D]'
                                }`}
                            >
                                {selectedNotif.titre}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setSelectedNotif(null)}
                                className="text-gray-400 hover:text-gray-600 text-lg font-bold leading-none"
                                aria-label="Fermer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-xs text-gray-700 leading-relaxed">
                            {selectedNotif.message}
                        </p>
                        <p className="text-[10px] text-gray-400">
                            Reçue le : {selectedNotif.date}
                        </p>
                        <div className="flex justify-end pt-2 border-t">
                            <button
                                type="button"
                                onClick={() => setSelectedNotif(null)}
                                className="px-3.5 py-1.5 bg-[#04326D] text-white text-xs font-bold rounded hover:bg-[#06428f] transition"
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODALE RÈGLES FINANCIÈRES */}
            {showHelpModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
                    <div className="bg-white rounded border border-[#B2BED6] shadow-2xl max-w-lg w-full p-6 space-y-4 animate-scale-in">
                        <div className="flex items-center justify-between border-b pb-3">
                            <h3 className="text-sm font-bold text-[#0B192C] uppercase flex items-center gap-2">
                                <HelpCircle className="w-5 h-5 text-[#04326D]" />
                                <span>{__('Règles Financières & Procédures')}</span>
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowHelpModal(false)}
                                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
                                aria-label="Fermer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-3 text-xs text-gray-700">
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                                <strong className="text-[#04326D] block mb-1">
                                    1. Petite Caisse (&le; 20 USD / 30 000 FC)
                                </strong>
                                <p className="text-[11px] text-gray-600">
                                    Achats d'urgence immédiats. Décaissement direct avec visa du Chef de Projet.
                                </p>
                            </div>

                            <div className="p-3 bg-gray-50 border border-gray-200 rounded">
                                <strong className="text-gray-900 block mb-1">
                                    2. Règle des 3 Devis (&gt; 150 USD)
                                </strong>
                                <p className="text-[11px] text-gray-600">
                                    Toute réquisition excédant 150 USD doit obligatoirement inclure 3 devis comparatifs.
                                </p>
                            </div>

                            <div className="p-3 bg-orange-50 border border-orange-200 rounded">
                                <strong className="text-[#F58F20] block mb-1">
                                    3. Règle d'or de Décharge (48h ouvrées)
                                </strong>
                                <p className="text-[11px] text-gray-600">
                                    Les pièces de caisse originales doivent être retournées dans les 48h suivant le décaissement.
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end pt-2 border-t">
                            <button
                                type="button"
                                onClick={() => setShowHelpModal(false)}
                                className="px-4 py-1.5 bg-[#04326D] text-white rounded text-xs font-bold"
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