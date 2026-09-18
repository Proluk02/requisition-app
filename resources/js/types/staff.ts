export interface RequisitionItem {
    id: string;
    code: string;
    motif: string;
    projet: string;
    dateSoumission: string;
    montant: string;
    devise: 'USD' | 'FC';
    articlesCount: number;
    etapeWorkflow: {
        nom: string;
        statut: 'caisse_pret' | 'finance_budget' | 'chef_projet' | 'rejet';
        validateurActuel: string;
    };
}

export interface StaffStats {
    enCoursCount: number;
    valideesPretesCount: number;
    valideesPretesMontantUSD: number;
    vouchersMoisCount: number;
    vouchersMoisTotalUSD: number;
    justificatifsADeposerCount: number;
    activiteEnSouffrance: string;
    dechargeRef: string;
}

export const mockStaffStats: StaffStats = {
    enCoursCount: 3,
    valideesPretesCount: 1,
    valideesPretesMontantUSD: 350.00,
    vouchersMoisCount: 2,
    vouchersMoisTotalUSD: 35.00,
    justificatifsADeposerCount: 1,
    activiteEnSouffrance: 'Sensibilisation Mukondo',
    dechargeRef: '#DCH-089'
};

export const mockStaffRequisitions: RequisitionItem[] = [
    {
        id: '1',
        code: 'REQ-2025-0142',
        motif: 'Kits Scolaires Centre Kanina',
        projet: 'Projet Éducation & Protection Enfants Mines',
        dateSoumission: '12 Oct 2025',
        montant: '$350.00 USD',
        devise: 'USD',
        articlesCount: 4,
        etapeWorkflow: {
            nom: 'Caisse (Prêt)',
            statut: 'caisse_pret',
            validateurActuel: 'Approuvé par Dir. Sr. Christine'
        }
    },
    {
        id: '2',
        code: 'REQ-2025-0149',
        motif: 'Formation Agro-pastorale AGR',
        projet: 'Semences & petit outillage maraîchage',
        dateSoumission: '14 Oct 2025',
        montant: '$480.00 USD',
        devise: 'USD',
        articlesCount: 3,
        etapeWorkflow: {
            nom: 'Finance & Budget',
            statut: 'finance_budget',
            validateurActuel: "En vérification d'imputation"
        }
    },
    {
        id: '3',
        code: 'REQ-2025-0155',
        motif: 'Carburant Sortie Suivi Terrain',
        projet: 'Visites ménages réinsertion',
        dateSoumission: '15 Oct 2025',
        montant: '75 000 FC',
        devise: 'FC',
        articlesCount: 1,
        etapeWorkflow: {
            nom: 'Chef Projet',
            statut: 'chef_projet',
            validateurActuel: 'Visa Responsable Éducation'
        }
    }
];