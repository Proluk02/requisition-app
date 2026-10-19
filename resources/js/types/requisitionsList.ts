export type WorkflowStep =
    | 'brouillon'
    | 'visa_mp'
    | 'controle_finance'
    | 'visa_admin'
    | 'approbation_direction'
    | 'caisse_pret'
    | 'decaissement_caisse'
    | 'cloture';

export interface Justificatif {
    id: string;
    description: string;
    originalName?: string;
    date?: string;
    montant?: number;
    fileUrl?: string | null;
}

export interface DetailArticle {
    id: string;
    activite: string;
    codeActivite?: string;
    codeAllocation?: string;
    codeBudget?: string;
    nature: string;
    quantiteOuDuree: number;
    unite: string;
    prixUnitaire: number;
    total: number;
    justificatifsCount: number;
    justificatifs: Justificatif[];
}

export interface Signature {
    role: string;
    nom: string;
    action: string;
    commentaire?: string | null;
    date: string;
    code?: string;
    hash: string;
    hashShort?: string;
}

export interface RequisitionSuivi {
    id: string;
    numero: string;
    projet: string;
    project_id?: string;
    initiateurNom?: string;
    demandeurNom?: string;
    site?: string;
    nature: 'Achat' | 'Service';
    caisse: string;
    devise: any; // <--- CORRECTION ICI : passage en "any" pour éviter l'erreur avec "Currency"
    montantTotal: number;
    montantLettres?: string;
    dateSoumission: string;
    date_paiement?: string | null;
    date_livraison?: string | null;
    observation?: string | null;
    is_urgent?: boolean;
    is_decaissee?: boolean;
    statusCode: string;
    statusLabel: string;
    etapeActuelle: string;
    motifRejet?: string | null;
    signatures: Signature[];
    articles: DetailArticle[];
}