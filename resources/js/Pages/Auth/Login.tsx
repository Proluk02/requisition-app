import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

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

            <div className="flex min-h-screen bg-white antialiased dark:bg-[#0B192C]">
                {/* ============================================================
                    PANNEAU GAUCHE — IMAGE DE FOND
                   ============================================================ */}
                <aside className="relative hidden lg:block lg:w-1/2">
                    <img
                        src="/assets/images/login-bg.jpg"
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                    />
                    {/* Voile bleu nuit */}
                    <div className="absolute inset-0 bg-gradient-to-b from-[#0B192C]/70 via-[#0B192C]/55 to-[#0B192C]/75" />

                    {/* Logo + nom en haut à gauche */}
                    <div className="absolute left-10 top-10 z-10 flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-lg">
                            <img
                                src="/assets/images/logo.png"
                                alt="Bon Pasteur Kolwezi"
                                className="h-9 w-9 object-contain"
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

                    {/* Mention bas de panneau */}
                    <div className="absolute bottom-10 left-10 right-10 z-10">
                        <p className="text-[12.5px] font-medium text-white/70">
                            © {new Date().getFullYear()} Bon Pasteur Kolwezi —
                            Tous droits réservés.
                        </p>
                    </div>
                </aside>

                {/* ============================================================
                    PANNEAU DROIT — FORMULAIRE
                   ============================================================ */}
                <main className="flex flex-1 items-center justify-center px-6 py-12 sm:px-10 lg:w-1/2">
                    <div className="w-full max-w-sm">
                        {/* En-tête : logo + titres */}
                        <div className="mb-8 flex flex-col items-center text-center">
                            {/* Logo mobile */}
                            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm dark:border-white/10 lg:hidden">
                                <img
                                    src="/assets/images/logo.png"
                                    alt="Bon Pasteur Kolwezi"
                                    className="h-10 w-10 object-contain"
                                />
                            </div>

                            {/* Logo desktop */}
                            <div className="mb-5 hidden h-16 w-16 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm dark:border-white/10 lg:flex">
                                <img
                                    src="/assets/images/logo.png"
                                    alt="Bon Pasteur Kolwezi"
                                    className="h-11 w-11 object-contain"
                                />
                            </div>

                            <h1 className="text-[22px] font-extrabold tracking-tight text-[#0B192C] dark:text-white sm:text-2xl">
                                Connectez-vous à votre compte
                            </h1>
                            <p className="mt-2 max-w-xs text-[13.5px] leading-relaxed text-slate-600 dark:text-slate-400">
                                Entrez votre e-mail et votre mot de passe
                                ci-dessous pour vous connecter.
                            </p>
                        </div>

                        {/* Message de statut */}
                        {status && (
                            <div className="mb-5 rounded border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-[13px] font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                                {status}
                            </div>
                        )}

                        <form onSubmit={submit} className="space-y-4">
                            {/* Champ email */}
                            <div>
                                <label
                                    htmlFor="email"
                                    className="mb-1.5 block text-[13px] font-semibold text-[#0B192C] dark:text-slate-200"
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
                                    onChange={(e) =>
                                        setData('email', e.target.value)
                                    }
                                    placeholder="exemple@bonpasteur-kolwezi.org"
                                    className="block w-full rounded-md border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-[#0B192C] placeholder-slate-400 shadow-sm transition-colors focus:border-[#04326D] focus:outline-none focus:ring-2 focus:ring-[#04326D]/25 dark:border-white/15 dark:bg-white/[0.04] dark:text-white dark:placeholder-slate-500 dark:focus:border-[#F58F20] dark:focus:ring-[#F58F20]/25"
                                />

                                <InputError
                                    message={errors.email}
                                    className="mt-1.5 text-[12.5px]"
                                />
                            </div>

                            {/* Champ mot de passe + œil */}
                            <div>
                                <div className="mb-1.5 flex items-center justify-between">
                                    <label
                                        htmlFor="password"
                                        className="block text-[13px] font-semibold text-[#0B192C] dark:text-slate-200"
                                    >
                                        Mot de passe
                                    </label>

                                    {canResetPassword && (
                                        <Link
                                            href={route('password.request')}
                                            className="text-[12.5px] font-medium text-[#04326D] underline-offset-2 hover:underline focus:outline-none focus-visible:underline dark:text-[#FFB86B]"
                                        >
                                            Mot de passe oublié ?
                                        </Link>
                                    )}
                                </div>

                                <div className="relative">
                                    <input
                                        id="password"
                                        type={
                                            showPassword ? 'text' : 'password'
                                        }
                                        name="password"
                                        value={data.password}
                                        autoComplete="current-password"
                                        onChange={(e) =>
                                            setData(
                                                'password',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="••••••••"
                                        className="block w-full rounded-md border border-slate-300 bg-white px-3.5 py-2.5 pr-11 text-sm text-[#0B192C] placeholder-slate-400 shadow-sm transition-colors focus:border-[#04326D] focus:outline-none focus:ring-2 focus:ring-[#04326D]/25 dark:border-white/15 dark:bg-white/[0.04] dark:text-white dark:placeholder-slate-500 dark:focus:border-[#F58F20] dark:focus:ring-[#F58F20]/25"
                                    />

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowPassword((v) => !v)
                                        }
                                        aria-label={
                                            showPassword
                                                ? 'Masquer le mot de passe'
                                                : 'Afficher le mot de passe'
                                        }
                                        tabIndex={-1}
                                        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-slate-500 transition-colors hover:text-[#04326D] focus:outline-none dark:text-slate-400 dark:hover:text-[#F58F20]"
                                    >
                                        {showPassword ? (
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                strokeWidth="1.7"
                                                stroke="currentColor"
                                                className="h-5 w-5"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
                                                />
                                            </svg>
                                        ) : (
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                strokeWidth="1.7"
                                                stroke="currentColor"
                                                className="h-5 w-5"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                                                />
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                                                />
                                            </svg>
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
                                    onChange={(e) =>
                                        setData('remember', e.target.checked)
                                    }
                                />
                                <span className="text-[13px] text-slate-600 dark:text-slate-300">
                                    Se souvenir de moi
                                </span>
                            </label>

                            {/* Bouton Se connecter */}
                            <button
                                type="submit"
                                disabled={processing}
                                className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-[#04326D] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#052a5c] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#04326D]/40 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-[#0B192C] dark:hover:bg-slate-100 dark:focus-visible:ring-white/40"
                            >
                                {processing ? (
                                    <>
                                        <svg
                                            className="h-4 w-4 animate-spin"
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                        >
                                            <circle
                                                className="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                            />
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
                                            />
                                        </svg>
                                        Connexion…
                                    </>
                                ) : (
                                    'Se connecter'
                                )}
                            </button>
                        </form>

                        {/* Séparateur + Google */}
                        <div className="relative my-6">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-slate-200 dark:border-white/10" />
                            </div>
                            <div className="relative flex justify-center text-[11px] font-semibold uppercase tracking-[0.1em]">
                                <span className="bg-white px-3 text-slate-500 dark:bg-[#0B192C] dark:text-slate-400">
                                    ou
                                </span>
                            </div>
                        </div>

                        <a
                            href={route('google.login')}
                            className="flex w-full items-center justify-center gap-3 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-[#0B192C] shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#04326D]/40 dark:border-white/15 dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.08] dark:focus-visible:ring-white/40"
                        >
                            <svg
                                className="h-5 w-5"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                            >
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
                            Accès réservé aux comptes autorisés par
                            l'administration de Bon Pasteur Kolwezi.
                        </p>
                    </div>
                </main>
            </div>
        </>
    );
}