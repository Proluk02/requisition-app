import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';
import { Eye, EyeOff, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';

export default function Login({
    status,
    canResetPassword,
}: {
    status?: string;
    canResetPassword: boolean;
}) {
    const [showPassword, setShowPassword] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false as boolean,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <>
            <Head title="Connexion — Bon Pasteur Kolwezi" />

            <div className="flex min-h-screen bg-white antialiased dark:bg-sidebar">
                {/* ============================================================
                    PANNEAU GAUCHE — IMAGE DE FOND
                   ============================================================ */}
                <aside className="relative hidden lg:block lg:w-1/2">
                    <img
                        src="/assets/images/login-bg.jpg"
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-sidebar/75 via-sidebar/60 to-sidebar/80" />

                    {/* Logo + nom */}
                    <div className="absolute left-10 top-10 z-10 flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white shadow-lg overflow-hidden">
                            <img
                                src="/assets/images/logo.png"
                                alt="Bon Pasteur Kolwezi"
                                className="h-10 w-10 object-contain p-0.5"
                            />
                        </div>
                        <div className="flex flex-col leading-tight">
                            <span className="text-sm font-bold text-white">
                                Bon Pasteur Kolwezi
                            </span>
                            <span className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-[#B2BED6]">
                                Système de Gestion des Réquisitions
                            </span>
                        </div>
                    </div>

                    {/* Mention bas */}
                    <div className="absolute bottom-10 left-10 right-10 z-10">
                        <p className="text-[12.5px] font-medium text-white/70">
                            © {new Date().getFullYear()} Bon Pasteur Kolwezi — Tous droits réservés.
                        </p>
                    </div>
                </aside>

                {/* ============================================================
                    PANNEAU DROIT — FORMULAIRE
                   ============================================================ */}
                <main className="flex flex-1 items-center justify-center px-6 py-12 sm:px-10 lg:w-1/2">
                    <div className="w-full max-w-sm">
                        {/* En-tête */}
                        <div className="mb-8 flex flex-col items-center text-center">
                            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-lg border border-outline-soft bg-white shadow-sm dark:border-white/10 lg:hidden overflow-hidden">
                                <img
                                    src="/assets/images/logo.png"
                                    alt="Bon Pasteur Kolwezi"
                                    className="h-10 w-10 object-contain p-0.5"
                                />
                            </div>

                            <div className="mb-5 hidden h-16 w-16 items-center justify-center rounded-lg border border-outline-soft bg-white shadow-sm dark:border-white/10 lg:flex overflow-hidden">
                                <img
                                    src="/assets/images/logo.png"
                                    alt="Bon Pasteur Kolwezi"
                                    className="h-12 w-12 object-contain p-0.5"
                                />
                            </div>

                            <h1 className="text-[22px] font-extrabold tracking-tight text-on-surface dark:text-white sm:text-2xl">
                                Connectez-vous à votre compte
                            </h1>
                            <p className="mt-2 max-w-xs text-[13.5px] leading-relaxed text-slate-600 dark:text-slate-400">
                                Entrez votre e-mail et votre mot de passe ci-dessous pour vous
                                connecter.
                            </p>
                        </div>

                        {/* Statut */}
                        {status && (
                            <div className="mb-5 flex items-start gap-2 rounded-md border border-success/30 bg-success-soft px-3.5 py-2.5 text-[13px] font-medium text-success-dark dark:border-success/30 dark:bg-success/10 dark:text-success">
                                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                                <span>{status}</span>
                            </div>
                        )}

                        <form onSubmit={submit} className="space-y-4">
                            {/* Email */}
                            <div>
                                <label
                                    htmlFor="email"
                                    className="mb-1.5 block text-[13px] font-semibold text-on-surface dark:text-slate-200"
                                >
                                    Adresse e-mail
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    name="email"
                                    value={data.email}
                                    autoComplete="username"
                                    autoFocus
                                    onChange={(e) => setData('email', e.target.value)}
                                    placeholder="exemple@bonpasteur-kolwezi.org"
                                    className="block w-full rounded-md border border-outline-variant bg-white px-3.5 py-2.5 text-sm text-on-surface placeholder-slate-400 shadow-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 dark:border-white/15 dark:bg-white/[0.04] dark:text-white dark:placeholder-slate-500 dark:focus:border-tertiary dark:focus:ring-tertiary/25"
                                />
                                <InputError message={errors.email} className="mt-1.5 text-[12.5px]" />
                            </div>

                            {/* Mot de passe */}
                            <div>
                                <div className="mb-1.5 flex items-center justify-between">
                                    <label
                                        htmlFor="password"
                                        className="block text-[13px] font-semibold text-on-surface dark:text-slate-200"
                                    >
                                        Mot de passe
                                    </label>
                                    {canResetPassword && (
                                        <Link
                                            href={route('password.request')}
                                            className="text-[12.5px] font-medium text-primary underline-offset-2 hover:underline focus:outline-none focus-visible:underline dark:text-[#FFB86B]"
                                        >
                                            Mot de passe oublié ?
                                        </Link>
                                    )}
                                </div>

                                <div className="relative">
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        value={data.password}
                                        autoComplete="current-password"
                                        onChange={(e) => setData('password', e.target.value)}
                                        placeholder="••••••••"
                                        className="block w-full rounded-md border border-outline-variant bg-white px-3.5 py-2.5 pr-11 text-sm text-on-surface placeholder-slate-400 shadow-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 dark:border-white/15 dark:bg-white/[0.04] dark:text-white dark:placeholder-slate-500 dark:focus:border-tertiary dark:focus:ring-tertiary/25"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((v) => !v)}
                                        aria-label={
                                            showPassword
                                                ? 'Masquer le mot de passe'
                                                : 'Afficher le mot de passe'
                                        }
                                        tabIndex={-1}
                                        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-slate-500 transition-colors hover:text-primary focus:outline-none dark:text-slate-400 dark:hover:text-tertiary"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-5 w-5" strokeWidth={1.7} />
                                        ) : (
                                            <Eye className="h-5 w-5" strokeWidth={1.7} />
                                        )}
                                    </button>
                                </div>
                                <InputError
                                    message={errors.password}
                                    className="mt-1.5 text-[12.5px]"
                                />
                            </div>

                            {/* Remember */}
                            <label className="flex cursor-pointer items-center gap-2 pt-1 select-none">
                                <Checkbox
                                    name="remember"
                                    checked={data.remember}
                                    onChange={(e) => setData('remember', e.target.checked)}
                                />
                                <span className="text-[13px] text-slate-600 dark:text-slate-300">
                                    Se souvenir de moi
                                </span>
                            </label>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={processing}
                                className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-light focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-sidebar dark:hover:bg-slate-100 dark:focus-visible:ring-white/40"
                            >
                                {processing ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Connexion…
                                    </>
                                ) : (
                                    <>
                                        Se connecter
                                        <ArrowRight className="h-4 w-4" />
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Séparateur + Google */}
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-outline-soft dark:border-white/10" />
                            </div>
                            <div className="relative flex justify-center text-[11px] font-semibold uppercase tracking-[0.1em]">
                                <span className="bg-white px-3 text-slate-500 dark:bg-sidebar dark:text-slate-400">
                                    ou
                                </span>
                            </div>
                        </div>

                        <a
                            href={route('google.login')}
                            className="flex w-full items-center justify-center gap-3 rounded-md border border-outline-variant bg-white px-4 py-2.5 text-sm font-semibold text-on-surface shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-white/15 dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.08] dark:focus-visible:ring-white/40"
                        >
                            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                                <path
                                    fill="#4285F4"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                />
                                <path
                                    fill="#34A853"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />
                                <path
                                    fill="#FBBC05"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                                />
                                <path
                                    fill="#EA4335"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                />
                            </svg>
                            Continuer avec Google
                        </a>

                        {/* Note de bas de page */}
                        <p className="mt-8 text-center text-[12px] leading-relaxed text-slate-500 dark:text-slate-400">
                            Accès réservé aux comptes autorisés par l'administration de Bon
                            Pasteur Kolwezi.
                        </p>
                    </div>
                </main>
            </div>
        </>
    );
}