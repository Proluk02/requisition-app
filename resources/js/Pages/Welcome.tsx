import { useEffect } from 'react';
import { PageProps } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Loader2, ShieldCheck } from 'lucide-react';

export default function Welcome({ auth }: PageProps) {
    // Redirection automatique dès le chargement de la page
    useEffect(() => {
        // On définit la destination (Dashboard si connecté, sinon Login)
        const destination = auth.user ? route('dashboard') : route('login');

        // Délai un peu plus long (1,5 s) pour apprécier la page d'accueil
        const timer = setTimeout(() => {
            router.visit(destination);
        }, 4000);

        return () => clearTimeout(timer);
    }, [auth.user]);

    return (
        <>
            <Head title="Bon Pasteur Kolwezi — Portail Sécurisé" />

            {/* Conteneur principal avec image de fond */}
            <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0B192C]">
                {/* Image de fond + overlay sombre pour la lisibilité */}
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                    style={{ backgroundImage: "url('/assets/images/login-bg.jpg')" }}
                    aria-hidden="true"
                />
                <div
                    className="absolute inset-0 bg-gradient-to-b from-[#0B192C]/80 via-[#0B192C]/70 to-[#04326D]/90"
                    aria-hidden="true"
                />

                {/* Contenu principal */}
                <main className="relative z-10 w-full max-w-md px-6 text-center">
                    {/* Logo avec halo lumineux */}
                    <div className="relative mx-auto mb-8">
                        <div className="absolute inset-0 -z-10 mx-auto h-32 w-32 animate-ping rounded-full bg-[#F58F20]/30" />
                        <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full border-4 border-white/90 bg-white/95 p-4 shadow-2xl backdrop-blur-sm">
                            <img
                                src="/assets/images/logo.png"
                                alt="Logo Bon Pasteur Kolwezi"
                                className="h-full w-full object-contain"
                            />
                        </div>
                    </div>

                    {/* Titres officiels */}
                    <h1 className="mb-2 text-3xl font-black uppercase tracking-widest text-white drop-shadow-lg">
                        Bon Pasteur Kolwezi
                    </h1>
                    <h2 className="mb-8 text-sm font-bold tracking-[0.3em] text-[#F58F20] drop-shadow-md">
                        SYSTÈME CENTRALISÉ DE GESTION DES REQUISITIONS
                    </h2>

                    {/* Zone de chargement et de sécurité */}
                    <div className="mx-auto flex w-fit items-center gap-3 rounded-full border border-white/20 bg-white/10 py-2.5 pl-4 pr-5 shadow-lg backdrop-blur-md">
                        <Loader2 className="h-5 w-5 animate-spin text-[#F58F20]" />
                        <span className="text-sm font-semibold text-white">
                            Connexion au portail sécurisé...
                        </span>
                    </div>

                    <div className="mt-8 flex items-center justify-center gap-1.5 text-[11px] font-medium text-white/70">
                        <ShieldCheck className="h-4 w-4 text-[#F58F20]" />
                        <span>Environnement crypté et protégé</span>
                    </div>
                </main>

                {/* Pied de page absolu */}
                <footer className="absolute bottom-6 z-10 text-center text-[10px] font-bold uppercase tracking-widest text-white/60">
                    © {new Date().getFullYear()} Bon Pasteur Asbl. Tous droits réservés.
                </footer>
            </div>
        </>
    );
}