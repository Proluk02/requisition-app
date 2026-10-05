import { Config } from 'ziggy-js';

export interface Project {
    id: string;
    name: string;
    full_name: string;
    description?: string | null;
}

export interface Site {
    id: string;
    name: string;
    location?: string | null;
}

export interface Role {
    id: number;
    name: string;
}

export interface User {
    id: string;
    name: string;
    first_name?: string | null;
    last_name?: string | null;
    email: string;
    email_verified_at?: string | null;
    signature_pin?: string | null;
    pin_set_at?: string | null;
    is_director_interim?: boolean;
    project_id?: string | null;
    site_id?: string | null;
    project?: Project | null;
    site?: Site | null;
    roles?: Role[];
    role:
        | 'admin'
        | 'beneficiary'
        | 'project_manager'
        | 'finance'
        | 'admin_manager'
        | 'director'
        | 'purchaser'
        | 'cashier'
        | 'coordinator';
    status: 'active' | 'inactive';
    avatar?: string | null;
    last_login_at?: string | null;
    google_id?: string | null;
}

export interface NotificationItem {
    id: string;
    titre: string;
    message: string;
    date: string;
    lu: boolean;
    urgent?: boolean;
}

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: {
        user: User;
    };
    notifications?: NotificationItem[];
    locale?: string;
    flash: {
        success?: string | null;
        error?: string | null;
    };
    ziggy: Config & { location: string };
};

export type WorkflowStep =
    | 'brouillon'
    | 'urgent_direction'
    | 'visa_mp'
    | 'controle_finance'
    | 'visa_admin'
    | 'approbation_direction'
    | 'decaissement_caisse'
    | 'decaisse'
    | 'cloture'
    | 'rejetee';

export interface JustificatifItem {
    id: string;
    description: string;
    originalName: string;
    date: string;
    montant: number;
    filePath?: string | null;
    fileUrl?: string | null;
    mimeType?: string | null;
}

export interface DetailArticle {
    id: string;
    activite: string;
    codeBudget?: string | null;
    codeAllocation?: string | null;
    nature: 'Achat' | 'Service';
    quantiteOuDuree: number;
    unite: string;
    prixUnitaire: number;
    total: number;
    justificatifsCount: number;
    justificatifs?: JustificatifItem[];
}

export interface SignatureItem {
    role: string;
    nom: string;
    action: string;
    date: string;
    code?: string;
    hash: string;
    hashShort?: string;
}

export interface RequisitionSuivi {
    id: string;
    numero: string;
    projet: string;
    project_id?: string | null;
    site: string;
    nature: 'Achat' | 'Service';
    caisse: string;
    devise: 'USD' | 'FC' | 'EUR';
    montantTotal: number;
    montantLettres: string;
    dateSoumission: string;
    observation?: string | null;
    is_urgent: boolean;
    date_paiement?: string | null;
    date_livraison?: string | null;
    mode_paiement?: string | null;
    reference_paiement?: string | null;
    date_decaissement?: string | null;
    etapeActuelle: WorkflowStep;
    signatures: SignatureItem[];
    articles: DetailArticle[];
}