import { Config } from 'ziggy-js';

export interface User {
    id: number;
    name: string;
    first_name?: string; // Prénom
    last_name?: string;  // Nom
    email: string;
    email_verified_at?: string;
    // Rôles définis dans notre architecture
    role: 'admin' | 'beneficiary' | 'project_manager' | 'finance' | 'admin_manager' | 'director' | 'purchaser' | 'cashier';
    status: 'active' | 'inactive';
    avatar?: string;
    last_login_at?: string;
    google_id?: string;  // Pour la liaison avec Google Auth
}

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: {
        user: User;
    };
    ziggy: Config & { location: string };
};