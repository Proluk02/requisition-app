import ApplicationLogo from '@/Components/ApplicationLogo';
import Dropdown from '@/Components/Dropdown';
import NavLink from '@/Components/NavLink';
import { Link, usePage } from '@inertiajs/react';
import { PropsWithChildren, ReactNode, useState } from 'react';
import { PageProps } from '@/types';

export default function AuthenticatedLayout({
    header,
    children,
}: PropsWithChildren<{ header?: ReactNode }>) {
    const user = usePage<PageProps>().props.auth.user;
    const [showingNavigationDropdown, setShowingNavigationDropdown] = useState(false);

    const hasRole = (role: string) => user.role === role;

    return (
        <div className="flex min-h-screen bg-surface">
            {/* --- SIDEBAR DESKTOP --- */}
            <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col border-r border-outline-variant bg-sidebar lg:flex">
                <div className="flex h-16 items-center px-6 border-b border-white/10">
                    <Link href="/" className="flex items-center gap-3">
                        <div className="bg-primary p-1.5 rounded-lg">
                            <ApplicationLogo className="h-6 w-6 fill-current text-white" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-white leading-tight">Bon Pasteur</span>
                            <span className="text-[10px] text-gray-400 uppercase tracking-widest">Gestion & Suivi</span>
                        </div>
                    </Link>
                </div>

                <div className="flex flex-1 flex-col overflow-y-auto py-4 px-3">
                    <nav className="space-y-1">
                        <Link href={route('dashboard')} className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${route().current('dashboard') ? 'bg-primary text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                            Dashboard
                        </Link>
                        
                        <div className="pt-4 pb-2 px-3">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Opérations</span>
                        </div>
                        
                        <Link href="#" className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white rounded-lg">
                            Nouvelle Réquisition
                        </Link>
                    </nav>

                    {hasRole('admin') && (
                        <div className="mt-auto pt-4 border-t border-white/10">
                            <span className="px-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Administration</span>
                            <Link href={route('admin.users.index')} className={`mt-2 flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${route().current('admin.users.*') ? 'bg-primary text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                                Utilisateurs
                            </Link>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-white/10">
                    <Link method="post" href={route('logout')} as="button" className="flex w-full items-center gap-3 px-3 py-2 text-sm font-medium text-gray-400 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-colors">
                        Déconnexion
                    </Link>
                </div>
            </aside>

            {/* --- MAIN CONTENT AREA --- */}
            <div className="flex flex-1 flex-col lg:pl-64">
                {/* Topbar */}
                <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-outline-variant bg-white px-4 shadow-sm sm:px-6 lg:px-8">
                    <div className="flex items-center gap-4">
                        <h1 className="text-lg font-semibold text-on-surface">Système de Gestion</h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3 border-l pl-4 border-outline-variant">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-bold text-on-surface">{user.name}</p>
                                <p className="text-xs text-primary font-medium uppercase italic">{user.role}</p>
                            </div>
                            <div className="h-9 w-9 rounded-full bg-surface-dim flex items-center justify-center font-bold text-primary border border-primary/20 uppercase">
                                {user.name.substring(0, 2)}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-6 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}