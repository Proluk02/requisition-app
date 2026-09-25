export interface RequisitionAValider {
    id: string;
    code: string;
    date: string;
    initiateurNom: string;
    initiateurRole: string;
    intituleDepense: string;
    fournisseurOuLieu: string;
    ligneBudgetaire: string;
    montantUSD: number;
    devise: 'USD' | 'FC';
    justificatifsCount: number;
    justificatifs: { nom: string; montant: number }[];
    caisseAttribuee: string;
    statut: 'en_attente_mp' | 'valide_mp' | 'rejete_mp';
    motifRejet?: string;
}

export interface ProjetKpis {
    nomProjet: string;
    budgetAlloueUSD: number;
    budgetConsommeUSD: number;
    pourcentageConsomme: number;
    soldeDisponibleUSD: number;
    enAttenteCount: number;
    montantCumuleEnAttenteUSD: number;
    revenusAGR_USD: number;
}

export const mockProjetKpis: ProjetKpis = {
    nomProjet: 'Ferme Agro-pastorale & Pisciculture de Kolwezi',
    budgetAlloueUSD: 45000,
    budgetConsommeUSD: 28340,
    pourcentageConsomme: 63,
    soldeDisponibleUSD: 16660,
    enAttenteCount: 4,
    montantCumuleEnAttenteUSD: 3180,
    revenusAGR_USD: 4850
};

export const mockRequisitionsAValider: RequisitionAValider[] = [
    {
        id: '1',
        code: 'REQ-2024-089',
        date: '16/09/2026',
        initiateurNom: 'Kasongo Mukendi',
        initiateurRole: 'Logisticien Ferme & Pisciculture',
        intituleDepense: 'Achat 50 sacs d\'aliments pour alevins Tilapia & engrais bio',
        fournisseurOuLieu: 'Comptoir Agro Lualaba Kolwezi',
        ligneBudgetaire: '2.1 Intrants Piscicoles',
        montantUSD: 1250.00,
        devise: 'USD',
        justificatifsCount: 3,
        justificatifs: [
            { nom: 'Proforma Comptoir Agro.pdf', montant: 1250 },
            { nom: 'Devis comparatif ETS Bio.pdf', montant: 1320 },
            { nom: 'Devis comparatif AgriLualaba.pdf', montant: 1400 }
        ],
        caisseAttribuee: 'Caisse principale',
        statut: 'en_attente_mp'
    },
    {
        id: '2',
        code: 'REQ-2024-091',
        date: '17/09/2026',
        initiateurNom: 'Mireille Kabange',
        initiateurRole: 'Agronome Responsable Cultures',
        intituleDepense: 'Maintenance pompe motopompe Honda d\'irrigation champs maïs',
        fournisseurOuLieu: 'Pièces de rechange filtre & vidange système',
        ligneBudgetaire: '1.4 Maintenance Équipements',
        montantUSD: 380.00,
        devise: 'USD',
        justificatifsCount: 1,
        justificatifs: [
            { nom: 'Facture proforma Garage Central.pdf', montant: 380 }
        ],
        caisseAttribuee: 'EU',
        statut: 'en_attente_mp'
    },
    {
        id: '3',
        code: 'REQ-2024-095',
        date: '17/09/2026',
        initiateurNom: 'Dieudonné Tshiswaka',
        initiateurRole: 'Vétérinaire Superviseur',
        intituleDepense: 'Vaccination périodique cheptel caprin & porcin',
        fournisseurOuLieu: 'Pharmacie Vétérinaire Manika',
        ligneBudgetaire: '2.3 Soins Vétérinaires',
        montantUSD: 650.00,
        devise: 'USD',
        justificatifsCount: 2,
        justificatifs: [
            { nom: 'Devis vaccins caprins.pdf', montant: 400 },
            { nom: 'Protocole sanitaire & seringues.pdf', montant: 250 }
        ],
        caisseAttribuee: 'Saint Jean Eudes',
        statut: 'en_attente_mp'
    }
];