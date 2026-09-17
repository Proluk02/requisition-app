import { PageProps } from '@/types';
import { Head, Link } from '@inertiajs/react';

export default function Welcome({ auth }: PageProps) {
    return (
        <>
            <Head title="Bon Pasteur Kolwezi — Système en cours de développement" />

            <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 antialiased dark:bg-[#0B192C] dark:text-slate-100">
                {/* ============================================================
                    BARRE INSTITUTIONNELLE
                   ============================================================ */}
                <header className="border-b border-white/10 bg-[#0B192C]">
                    <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3.5">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                                <img
                                    src="/assets/images/logo.png"
                                    alt="Bon Pasteur Kolwezi"
                                    className="h-8 w-8 object-contain"
                                />
                            </div>
                            <div className="flex flex-col leading-tight">
                                <span className="text-sm font-bold text-white">
                                    Bon Pasteur Kolwezi
                                </span>
                                <span className="hidden text-[10.5px] font-medium uppercase tracking-[0.08em] text-[#B2BED6] sm:block">
                                    Système de Gestion des Réquisitions
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <span className="hidden items-center gap-2 rounded-full border border-[#F58F20]/40 bg-[#F58F20]/10 px-3 py-1.5 text-[11.5px] font-semibold text-[#FFB86B] sm:inline-flex">
                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#F58F20]" />
                                En développement
                            </span>

                            {auth.user ? (
                                <Link
                                    href={route('dashboard')}
                                    className="inline-flex items-center gap-2 rounded bg-[#F58F20] px-4 py-2 text-[13.5px] font-semibold text-white transition-colors hover:bg-[#d97a15] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F58F20]/50"
                                >
                                    Tableau de bord
                                </Link>
                            ) : (
                                <Link
                                    href={route('login')}
                                    className="inline-flex items-center gap-2 rounded bg-[#F58F20] px-4 py-2 text-[13.5px] font-semibold text-white transition-colors hover:bg-[#d97a15] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F58F20]/50"
                                >
                                    Se connecter
                                </Link>
                            )}
                        </div>
                    </div>
                </header>

                {/* ============================================================
                    CONTENU PRINCIPAL
                   ============================================================ */}
                <main className="flex flex-1 items-center justify-center px-6 py-14">
                    <div className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white p-10 text-center shadow-[0_1px_3px_rgba(11,25,44,0.04)] dark:border-white/10 dark:bg-white/[0.03] sm:p-12">
                        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10">
                            <img
                                src="/assets/images/logo.png"
                                alt="Logo Bon Pasteur"
                                className="h-full w-full object-contain"
                            />
                        </div>

                        <span className="mb-3.5 inline-block rounded-full bg-[#EFF4FF] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#04326D] dark:bg-[#F58F20]/10 dark:text-[#FFB86B]">
                            Portail institutionnel
                        </span>

                        <h1 className="mb-4 text-2xl font-extrabold leading-tight tracking-tight text-[#0B192C] dark:text-white sm:text-[28px]">
                            Système en cours de développement
                        </h1>

                        <p className="mx-auto mb-8 max-w-md text-[15px] leading-relaxed text-slate-600 dark:text-slate-400">
                            Le{' '}
                            <strong className="font-semibold text-[#0B192C] dark:text-white">
                                Système de Gestion et Suivi des Réquisitions
                            </strong>{' '}
                            de{' '}
                            <strong className="font-semibold text-[#0B192C] dark:text-white">
                                Bon Pasteur Kolwezi
                            </strong>{' '}
                            est actuellement en phase de développement. Le
                            portail d'accès et l'ensemble des fonctionnalités
                            seront prochainement disponibles.
                        </p>

                        <div className="mb-7 flex items-start gap-3 rounded border border-slate-200 border-l-[3px] border-l-[#F58F20] bg-slate-50 p-4 text-left dark:border-white/10 dark:border-l-[#F58F20] dark:bg-white/[0.03]">
                            <svg
                                className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[#F58F20]"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="16" x2="12" y2="12" />
                                <line x1="12" y1="8" x2="12.01" y2="8" />
                            </svg>
                            <div className="text-[13.5px] leading-snug text-slate-600 dark:text-slate-400">
                                <strong className="mb-0.5 block font-semibold text-[#0B192C] dark:text-white">
                                    Accès non encore ouvert
                                </strong>
                                La connexion à la plateforme sera activée une
                                fois le développement terminé.
                            </div>
                        </div>

                        <div className="border-t border-slate-200 pt-6 dark:border-white/10">
                            <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
                                État du projet
                            </div>
                            <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                                <div className="h-full w-[35%] rounded-full bg-gradient-to-r from-[#04326D] to-[#F58F20]" />
                            </div>
                            <div className="text-[12.5px] text-slate-500 dark:text-slate-400">
                                Phase en cours — merci de votre compréhension.
                            </div>
                        </div>

                        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                            {auth.user ? (
                                <Link
                                    href={route('dashboard')}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded bg-[#04326D] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#052a5c] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#04326D]/40 dark:bg-white dark:text-[#0B192C] dark:hover:bg-slate-100 sm:w-auto"
                                >
                                    Accéder au tableau de bord
                                </Link>
                            ) : (
                                <Link
                                    href={route('login')}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded bg-[#04326D] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#052a5c] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#04326D]/40 dark:bg-white dark:text-[#0B192C] dark:hover:bg-slate-100 sm:w-auto"
                                >
                                    Se connecter
                                </Link>
                            )}
                        </div>
                    </div>
                </main>

                {/* ============================================================
                    PIED DE PAGE
                   ============================================================ */}
                <footer className="border-t border-white/10 bg-[#0B192C] px-6 py-4 text-xs text-[#B2BED6]">
                    <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 text-center sm:flex-row sm:text-left">
                        <span>
                            © {new Date().getFullYear()}{' '}
                            <strong className="font-semibold text-white">
                                Bon Pasteur Kolwezi
                            </strong>{' '}
                            — Tous droits réservés.
                        </span>
                        <span>
                            Système de Gestion et Suivi des Réquisitions
                        </span>
                    </div>
                </footer>
            </div>
        </>
    );
}