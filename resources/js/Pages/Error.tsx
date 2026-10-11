import { Head, Link } from '@inertiajs/react';
import { 
    AlertTriangle, 
    ShieldAlert, 
    FileQuestion, 
    ServerCrash, 
    Clock, 
    Lock,
    Home
} from 'lucide-react';

interface ErrorProps {
    status: number;
}

export default function ErrorPage({ status }: ErrorProps) {
    // Dictionnaire des erreurs personnalisées (Sécurisé, ne divulgue aucune info technique)
    const errors: Record<number, { title: string; description: string; icon: any; color: string; bg: string }> = {
        401: {
            title: 'Non Autorisé',
            description: 'Vous devez être connecté pour accéder à cette ressource sécurisée.',
            icon: Lock,
            color: 'text-amber-600',
            bg: 'bg-amber-50 border-amber-200'
        },
        403: {
            title: 'Accès Interdit',
            description: 'Désolé, vous n\'avez pas les privilèges nécessaires pour consulter cette page ou effectuer cette action.',
            icon: ShieldAlert,
            color: 'text-red-600',
            bg: 'bg-red-50 border-red-200'
        },
        404: {
            title: 'Ressource Introuvable',
            description: 'Le lien que vous avez suivi est peut-être rompu, ou la page a été supprimée.',
            icon: FileQuestion,
            color: 'text-[#04326D]',
            bg: 'bg-blue-50 border-blue-200'
        },
        419: {
            title: 'Session Expirée',
            description: 'Votre session a expiré par mesure de sécurité. Veuillez vous reconnecter.',
            icon: Clock,
            color: 'text-amber-600',
            bg: 'bg-amber-50 border-amber-200'
        },
        429: {
            title: 'Trop de Requêtes',
            description: 'Notre système de sécurité a détecté un trafic inhabituel. Veuillez patienter un instant.',
            icon: AlertTriangle,
            color: 'text-[#F58F20]',
            bg: 'bg-orange-50 border-orange-200'
        },
        500: {
            title: 'Erreur Interne',
            description: 'Une erreur inattendue s\'est produite sur nos serveurs. L\'équipe technique a été notifiée.',
            icon: ServerCrash,
            color: 'text-red-700',
            bg: 'bg-red-50 border-red-200'
        },
        503: {
            title: 'Service Indisponible',
            description: 'Le système est actuellement en cours de maintenance pour des mises à jour de sécurité. Revenez dans quelques minutes.',
            icon: ServerCrash,
            color: 'text-gray-600',
            bg: 'bg-gray-50 border-gray-200'
        }
    };

    // Fallback si le code d'erreur n'est pas dans la liste
    const currentError = errors[status] || {
        title: 'Erreur Inconnue',
        description: 'Une anomalie de communication est survenue. Veuillez retourner à l\'accueil.',
        icon: AlertTriangle,
        color: 'text-gray-600',
        bg: 'bg-gray-50 border-gray-200'
    };

    const Icon = currentError.icon;

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
            <Head title={`${status} - ${currentError.title}`} />
            
            <div className="max-w-md w-full bg-white border border-[#E2E8F0] shadow-xl rounded-2xl overflow-hidden text-center p-8 space-y-6">
                
                {/* Icône d'erreur animée */}
                <div className={`w-24 h-24 mx-auto rounded-full ${currentError.bg} border flex items-center justify-center mb-6`}>
                    <Icon className={`w-12 h-12 ${currentError.color}`} />
                </div>

                <div className="space-y-2">
                    <h1 className="text-6xl font-black font-mono text-[#0B192C] opacity-20">
                        {status}
                    </h1>
                    <h2 className="text-2xl font-bold text-[#0B192C]">
                        {currentError.title}
                    </h2>
                    <p className="text-sm text-gray-500 leading-relaxed px-4">
                        {currentError.description}
                    </p>
                </div>

                <div className="pt-6 border-t border-gray-100">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-[#04326D] hover:bg-[#06428f] text-white rounded-lg font-bold text-sm shadow-md transition-all hover:-translate-y-0.5"
                    >
                        <Home className="w-4 h-4" />
                        <span>Retourner au tableau de bord</span>
                    </Link>
                </div>

                <div className="text-[10px] text-gray-400 font-mono tracking-widest uppercase mt-4">
                    Incident ID: {new Date().getTime().toString(16).toUpperCase()}-{status}
                </div>
            </div>
        </div>
    );
}