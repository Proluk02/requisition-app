import { Config } from 'ziggy-js';

export interface Project {
    id: string; // UUID
    name: string; // Ex: USIMAMIZI BORA
    full_name: string; // Ex: Bonne Gouvernance
    description?: string;
}

export interface Site {
    id: string; // UUID
    name: string; // Ex: Kanina, Tshala
    location?: string;
}

export interface Role {
    id: number;
    name: string;
}

export interface User {
    id: string; // UUID
    name: string;
    first_name?: string;
    last_name?: string;
    email: string;
    email_verified_at?: string;

    // Clés étrangères UUID
    project_id?: string | null;
    site_id?: string | null;

    // Modèles chargés depuis MySQL via HandleInertiaRequests
    project?: Project | null;
    site?: Site | null;
    roles?: Role[];

    role: 'admin' | 'beneficiary' | 'project_manager' | 'finance' | 'admin_manager' | 'director' | 'purchaser' | 'cashier' | 'coordinator';
    status: 'active' | 'inactive';
    avatar?: string;
    last_login_at?: string;
    google_id?: string;
}

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: {
        user: User;
    };
    flash: {
        success?: string;
        error?: string;
    };
    ziggy: Config & { location: string };
};