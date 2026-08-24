import { Config } from 'ziggy-js';

export interface Project {
    id: number;
    name: string;
    full_name: string;
    description?: string;
}

export interface Site {
    id: number;
    name: string;
    location?: string;
}

export interface User {
    id: number;
    name: string;
    first_name?: string;
    last_name?: string;
    email: string;
    email_verified_at?: string;
    
    // Identifiants de relations
    project_id?: number | null;
    site_id?: number | null;
    
    // Objets de relations (chargés via with() dans Laravel)
    project?: Project | null;
    site?: Site | null;

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
    ziggy: Config & { location: string };
};