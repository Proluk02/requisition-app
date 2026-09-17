import { createContext, useContext, useState, PropsWithChildren, useEffect } from 'react';

type Locale = 'fr' | 'en';

const translations: Record<Locale, Record<string, string>> = {
    fr: {
        dashboard: 'Tableau de bord',
        operations: 'Opérations',
        new_requisition: 'Nouvelle Réquisition',
        administration: 'Administration',
        users: 'Utilisateurs',
        logout: 'Déconnexion',
        profile: 'Mon profil',
        settings: 'Paramètres',
        system_management: 'Système de Gestion',
    },
    en: {
        dashboard: 'Dashboard',
        operations: 'Operations',
        new_requisition: 'New Requisition',
        administration: 'Administration',
        users: 'Users',
        logout: 'Log out',
        profile: 'My profile',
        settings: 'Settings',
        system_management: 'Management System',
    },
};

interface LanguageContextType {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: PropsWithChildren) {
    // Initialisation sécurisée
    const [locale, setLocaleState] = useState<Locale>('fr');

    // On utilise useEffect pour synchroniser avec localStorage après le premier rendu
    useEffect(() => {
        const storedLocale = localStorage.getItem('locale') as Locale;
        if (storedLocale && (storedLocale === 'fr' || storedLocale === 'en')) {
            setLocaleState(storedLocale);
        }
    }, []);

    const setLocale = (newLocale: Locale) => {
        localStorage.setItem('locale', newLocale);
        setLocaleState(newLocale);
    };

    const t = (key: string) => translations[locale][key] ?? key;

    return (
        <LanguageContext.Provider value={{ locale, setLocale, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) throw new Error('useLanguage doit être utilisé dans un LanguageProvider');
    return context;
}