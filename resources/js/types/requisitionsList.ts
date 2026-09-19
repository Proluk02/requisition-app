export type WorkflowStep = 
    | 'brouillon' 
    | 'visa_mp' 
    | 'controle_finance' 
    | 'visa_admin' 
    | 'approbation_direction' 
    | 'decaissement_caisse' 
    | 'cloture';

export interface DetailArticle {
    id: string;
    activite: string;
    codeBudget: string;
    nature: 'Achat' | 'Service';
    quantiteOuDuree: number;
    unite: string;
    prixUnitaire: number;
    total: number;
    justificatifsCount: number;
}

export interface RequisitionSuivi {
    id: string;
    numero: string; // ex: UB/09/001
    projet: string;
    site: string;
    nature: 'Achat' | 'Service';
    caisse: string;
    devise: 'USD' | 'FC' | 'EUR';
    montantTotal: number;
    montantLettres: string;
    dateSoumission: string;
    observation?: string;
    etapeActuelle: WorkflowStep;
    dernierCommentaire?: string;
    articles: DetailArticle[];
}

export const mockRequisitionsStaff: RequisitionSuivi[] = [
    {
        id: 'req-001',
        numero: 'UB/09/001',
        projet: 'USIMAMIZI BORA',
        site: 'Kanina',
        nature: 'Achat',
        caisse: 'Caisse principale',
        devise: 'USD',
        montantTotal: 1250.00,
        montantLettres: 'Mille deux cent cinquante dollars américains',
        dateSoumission: '2026-09-12',
        observation: 'Achat urgent des kits scolaires pour la rentrée.',
        etapeActuelle: 'controle_finance',
        dernierCommentaire: 'Validé par Manager Projet (Jean-Paul Ilunga) le 14/09.',
        articles: [
            { id: '1', activite: 'Cahiers et stylos', codeBudget: '2.1.1', nature: 'Achat', quantiteOuDuree: 50, unite: 'Cartons', prixUnitaire: 20, total: 1000, justificatifsCount: 2 },
            { id: '2', activite: 'Sacs à dos', codeBudget: '2.1.2', nature: 'Achat', quantiteOuDuree: 25, unite: 'Pcs', prixUnitaire: 10, total: 250, justificatifsCount: 1 }
        ]
    },
    {
        id: 'req-002',
        numero: 'UB/09/002',
        projet: 'USIMAMIZI BORA',
        site: 'Kanina',
        nature: 'Service',
        caisse: 'EU',
        devise: 'USD',
        montantTotal: 450.00,
        montantLettres: 'Quatre cent cinquante dollars américains',
        dateSoumission: '2026-09-15',
        observation: 'Location camionnette transfert matériel agricole.',
        etapeActuelle: 'visa_mp',
        dernierCommentaire: 'En attente de revue par le Chef de Projet.',
        articles: [
            { id: '3', activite: 'Location véhicule tout terrain', codeBudget: '1.4.2', nature: 'Service', quantiteOuDuree: 3, unite: 'Jours', prixUnitaire: 150, total: 450, justificatifsCount: 1 }
        ]
    },
    {
        id: 'req-003',
        numero: 'UB/09/003',
        projet: 'USIMAMIZI BORA',
        site: 'Kanina',
        nature: 'Achat',
        caisse: 'Local Fund 1 (Boulangerie)',
        devise: 'FC',
        montantTotal: 120000.00,
        montantLettres: 'Cent vingt mille francs congolais',
        dateSoumission: '2026-09-17',
        observation: 'Achat petit outillage de dépannage.',
        etapeActuelle: 'brouillon',
        articles: [
            { id: '4', activite: 'Clés et tournevis', codeBudget: '3.2.1', nature: 'Achat', quantiteOuDuree: 4, unite: 'Kits', prixUnitaire: 30000, total: 120000, justificatifsCount: 0 }
        ]
    },
    {
        id: 'req-004',
        numero: 'UB/08/045',
        projet: 'USIMAMIZI BORA',
        site: 'Kanina',
        nature: 'Achat',
        caisse: 'Saint Jean Eudes',
        devise: 'EUR',
        montantTotal: 3100.00,
        montantLettres: 'Trois mille cent euros',
        dateSoumission: '2026-08-20',
        observation: 'Médicaments d\'urgence dotation clinique pédiatrique.',
        etapeActuelle: 'decaissement_caisse',
        dernierCommentaire: 'Approbation finale Directrice Générale accordée. Bon de caisse prêt.',
        articles: [
            { id: '5', activite: 'Solutés et antibiotiques', codeBudget: '4.1.0', nature: 'Achat', quantiteOuDuree: 1, unite: 'Lot', prixUnitaire: 3100, total: 3100, justificatifsCount: 3 }
        ]
    }
];