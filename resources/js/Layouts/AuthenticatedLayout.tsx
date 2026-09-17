import ApplicationLogo from '@/Components/ApplicationLogo';
import Dropdown from '@/Components/Dropdown';
import { Link, usePage } from '@inertiajs/react';
import { PropsWithChildren, ReactNode, useState } from 'react';
import { PageProps } from '@/types';
import { useTheme } from '@/Contexts/ThemeContext';
import { useLanguage } from '@/Contexts/LanguageContext';

export default function AuthenticatedLayout({
    header,
    children,
}: PropsWithChildren<{ header?: ReactNode }>) {
    const user = usePage<PageProps>().props.auth.user;
    const [showingMobileSidebar, setShowingMobileSidebar] = useState(false);
    const { theme, toggleTheme } = useTheme();
    const { locale, setLocale, t } = useLanguage();

    const hasRole = (role: string) => user.role === role;
    const initials = user.name.substring(0, 2).toUpperCase();

    const NavLinks = () => (
        <>
            <Link
                href={route('dashboard')}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    route().current('dashboard')
                        ? 'bg-primary text-white'
                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
            >
                {t('dashboard')}
            </Link>

            <div className="px-3 pb-2 pt-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    {t('operations')}
                </span>
            </div>

            <Link
                href="#"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white"
            >
                {t('new_requisition')}
            </Link>

            {hasRole('admin') && (
                <div className="mt-4 border-t border-white/10 pt-4">
                    <span className="px-3 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                        {t('administration')}
                    </span>
                    <Link
                        href={route('admin.users.index')}
                        className={`mt-2 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                            route().current('admin.users.*')
                                ? 'bg-primary text-white'
                                : 'text-gray-400 hover:bg-white/5 hover:text-white'
                        }`}
                    >
                        {t('users')}
                    </Link>
                </div>
            )}
        </>
    );

    return (
        <div className="flex min-h-screen bg-surface dark:bg-gray-900">
            {/* --- SIDEBAR DESKTOP --- */}
            <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col border-r border-outline-variant bg-sidebar lg:flex">
                <div className="flex h-16 items-center border-b border-white/10 px-6">
                    <Link href="/" className="flex items-center gap-3">
                        <div className="rounded-lg bg-primary p-1.5">
                            <ApplicationLogo className="h-6 w-6 fill-current text-white" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold leading-tight text-white">Bon Pasteur</span>
                            <span className="text-[10px] uppercase tracking-widest text-gray-400">Gestion & Suivi</span>
                        </div>
                    </Link>
                </div>

                <div className="flex flex-1 flex-col overflow-y-auto px-3 py-4">
                    <nav className="space-y-1">
                        <NavLinks />
                    </nav>
                </div>

                <div className="border-t border-white/10 p-4">
                    <Link
                        method="post"
                        href={route('logout')}
                        as="button"
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
                    >
                        {t('logout')}
                    </Link>
                </div>
            </aside>

            {/* --- SIDEBAR MOBILE (drawer) --- */}
            {showingMobileSidebar && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div
                        className="fixed inset-0 bg-black/50"
                        onClick={() => setShowingMobileSidebar(false)}
                    />
                    <aside className="fixed inset-y-0 left-0 flex w-64 flex-col bg-sidebar">
                        <div className="flex h-16 items-center justify-between border-b border-white/10 px-6">
                            <Link href="/" className="flex items-center gap-3">
                                <div className="rounded-lg bg-primary p-1.5">
                                    <ApplicationLogo className="h-6 w-6 fill-current text-white" />
                                </div>
                                <span className="text-sm font-bold text-white">Bon Pasteur</span>
                            </Link>
                            <button
                                onClick={() => setShowingMobileSidebar(false)}
                                className="text-gray-400 hover:text-white"
                            >
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="flex flex-1 flex-col overflow-y-auto px-3 py-4">
                            <nav className="space-y-1">
                                <NavLinks />
                            </nav>
                        </div>
                        <div className="border-t border-white/10 p-4">
                            <Link
                                method="post"
                                href={route('logout')}
                                as="button"
                                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 hover:bg-red-500/10 hover:text-red-400"
                            >
                                {t('logout')}
                            </Link>
                        </div>
                    </aside>
                </div>
            )}

            {/* --- MAIN CONTENT AREA --- */}
            <div className="flex flex-1 flex-col lg:pl-64">
                {/* Topbar */}
                <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-outline-variant bg-white px-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setShowingMobileSidebar(true)}
                            className="text-gray-500 hover:text-gray-700 dark:text-gray-300 lg:hidden"
                        >
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                        <div className="hidden text-lg font-semibold text-on-surface dark:text-gray-100 sm:block">
                            {header ?? <h1 className="text-lg font-semibold">{t('system_management')}</h1>}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Sélecteur de langue */}
                        <Dropdown>
                            <Dropdown.Trigger>
                                <button className="flex items-center gap-1 rounded-lg px-2 py-2 text-sm text-gray-500 hover:bg-surface-container-low dark:text-gray-300 dark:hover:bg-gray-700">
                                    <span>{locale === 'fr' ? '🇫🇷' : '🇬🇧'}</span>
                                    <span className="hidden uppercase sm:inline">{locale}</span>
                                </button>
                            </Dropdown.Trigger>
                            <Dropdown.Content align="right" width="48">
                                <button
                                    onClick={() => setLocale('fr')}
                                    className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${locale === 'fr' ? 'font-bold text-primary' : 'text-gray-700 dark:text-gray-200'}`}
                                >
                                    🇫🇷 Français
                                </button>
                                <button
                                    onClick={() => setLocale('en')}
                                    className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${locale === 'en' ? 'font-bold text-primary' : 'text-gray-700 dark:text-gray-200'}`}
                                >
                                    🇬🇧 English
                                </button>
                            </Dropdown.Content>
                        </Dropdown>

                        {/* Bascule thème clair/sombre */}
                        <button
                            onClick={toggleTheme}
                            className="rounded-lg p-2 text-gray-500 hover:bg-surface-container-low dark:text-gray-300 dark:hover:bg-gray-700"
                            aria-label="Changer de thème"
                        >
                            {theme === 'light' ? (
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                </svg>
                            ) : (
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            )}
                        </button>

                        {/* Menu profil */}
                        <Dropdown>
                            <Dropdown.Trigger>
                                <button className="flex items-center gap-3 rounded-lg border-l border-outline-variant pl-4 dark:border-gray-700">
                                    <div className="hidden text-right sm:block">
                                        <p className="text-sm font-bold text-on-surface dark:text-gray-100">{user.name}</p>
                                        <p className="text-xs font-medium uppercase italic text-primary">{user.role}</p>
                                    </div>
                                    {user.avatar ? (
                                        <img
                                            src={user.avatar}
                                            alt={user.name}
                                            className="h-9 w-9 rounded-full border border-primary/20 object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/20 bg-surface-dim font-bold uppercase text-primary dark:bg-gray-700">
                                            {initials}
                                        </div>
                                    )}
                                </button>
                            </Dropdown.Trigger>
                            <Dropdown.Content align="right" width="48">
                                <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-700">
                                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{user.name}</p>
                                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                                </div>
                                <Dropdown.Link href={route('profile.edit')}>
                                    {t('profile')}
                                </Dropdown.Link>
                                <Dropdown.Link href={route('logout')} method="post" as="button">
                                    {t('logout')}
                                </Dropdown.Link>
                            </Dropdown.Content>
                        </Dropdown>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-6 lg:p-8">{children}</main>
            </div>
        </div>
    );
}