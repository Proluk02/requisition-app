import { usePage, router } from '@inertiajs/react';

// Dictionnaire bilingue complet intégré (Français / Anglais)
const DICTIONARY: Record<'fr' | 'en', Record<string, string>> = {
    fr: {
        'Dashboard': 'Tableau de Bord',
        'Mes Réquisitions': 'Mes Réquisitions',
        'Transport & Déplacements': 'Transport & Déplacements',
        'Contrôle Transports': 'Contrôle Transports',
        'Validations Équipe': 'Validations Équipe',
        'Mes Réquisitions Projet': 'Mes Réquisitions Projet',
        'Gestion Utilisateurs': 'Gestion Utilisateurs',
        'Nouvelle Réquisition': 'Nouvelle Réquisition',
        'Projet Affecté': 'Projet Affecté',
        'Projet': 'Projet',
        'Rechercher réf, code budget, voucher...': 'Rechercher réf, code budget, voucher...',
        'Procédures financières': 'Procédures financières',
        'Règles Financières & Procédures': 'Règles Financières & Procédures',
        'Notifications': 'Notifications',
        'Mon Profil': 'Mon Profil',
        'Déconnexion': 'Déconnexion',
        'Opérations & Besoins': 'Opérations & Besoins',
        'Gestion du Projet': 'Gestion du Projet',
        'Administration': 'Administration',
        'Compris': 'Compris',
    },
    en: {
        'Dashboard': 'Dashboard',
        'Mes Réquisitions': 'My Requisitions',
        'Transport & Déplacements': 'Transport & Trips',
        'Contrôle Transports': 'Transport Review',
        'Validations Équipe': 'Team Validations',
        'Mes Réquisitions Projet': 'Project Requisitions',
        'Gestion Utilisateurs': 'User Management',
        'Nouvelle Réquisition': 'New Requisition',
        'Projet Affecté': 'Assigned Project',
        'Projet': 'Project',
        'Rechercher réf, code budget, voucher...': 'Search ref, budget code, voucher...',
        'Procédures financières': 'Financial procedures',
        'Règles Financières & Procédures': 'Financial Rules & Procedures',
        'Notifications': 'Notifications',
        'Mon Profil': 'My Profile',
        'Déconnexion': 'Log Out',
        'Opérations & Besoins': 'Operations & Needs',
        'Gestion du Projet': 'Project Management',
        'Administration': 'Administration',
        'Compris': 'Understood',
    }
};

export function useTranslation() {
    const { props } = usePage<any>();
    
    // Récupérer la locale courante (depuis les props Inertia ou localStorage)
    const currentLocale: 'fr' | 'en' = (props.locale === 'en' ? 'en' : 'fr');

    const __ = (key: string): string => {
        // 1. Chercher dans les traductions envoyées par Laravel
        if (props.translations && props.translations[key]) {
            return props.translations[key];
        }
        // 2. Sinon utiliser le dictionnaire interne garanti
        if (DICTIONARY[currentLocale] && DICTIONARY[currentLocale][key]) {
            return DICTIONARY[currentLocale][key];
        }
        return key;
    };

    const switchLocale = (newLocale: 'fr' | 'en') => {
        router.post(`/locale/${newLocale}`, {}, {
            preserveScroll: true,
            preserveState: false, // Force le rechargement des props traduites
        });
    };

    return { __, locale: currentLocale, switchLocale };
}