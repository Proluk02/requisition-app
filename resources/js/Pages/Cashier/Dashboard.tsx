import { useState, useMemo } from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { PageProps } from '@/types';
import {
    Wallet,
    Building2,
    CheckCircle2,
    AlertCircle,
    Clock,
    Lock,
    KeyRound,
    ArrowUpRight,
    ArrowDownLeft,
    BookOpen,
    X,
    FileText,
    AlertTriangle,
    Search,
    TrendingUp,
    TrendingDown,
    PieChart as PieChartIcon,
    BarChart3,
    ShieldAlert,
    Activity,
} from 'lucide-react';

interface ActiveSessionData {
    id: string;
    status: 'en_attente_autorisation' | 'ouverte' | 'fermee';
    date_session: string;
    solde_ouverture: number;
    total_entrees: number;
    total_sorties: number;
    opened_at?: string;
    observation_ouverture?: string;
}

interface OpeningPreviewData {
    type: 'report_veille' | 'approvisionnement_initial' | 'solde_initial';
    solde: number;
    date_source: string | null;
    is_blocked: boolean;
}

interface MouvementItem {
    id: string;
    type: 'entree' | 'sortie';
    numero_piece: string;
    date_mouvement: string;
    tiers_nom: string;
    montant: number;
    devise: string;
    motif: string;
    imputation: string;
}

// Structure groupée pour permettre le changement de caisse 100% Frontend
interface CaisseData {
    id: string;
    name: string;
    code: string;
    devise: string;
    solde_actuel: number;
    is_active: boolean;
    is_ouverte: boolean;
    is_approvisionnee: boolean;
    activeSession: ActiveSessionData | null;
    openingPreview: OpeningPreviewData | null;
    sessionMouvements: MouvementItem[];
}

interface Props extends PageProps {
    caisses: CaisseData[];
    stats: {
        totalAttenteUSD: number;
        totalAttenteFC: number;
    };
}

const money = (n?: number | string | null, dev = '') => {
    if (n === null || n === undefined || n === '') {
        return `0,00 ${dev}`.trim();
    }
    const num = typeof n === 'number' ? n : parseFloat(String(n));
    if (isNaN(num)) {
        return `0,00 ${dev}`.trim();
    }
    return `${num.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${dev}`.trim();
};

export default function CashierDashboard({
    caisses = [],
    stats = { totalAttenteUSD: 0, totalAttenteFC: 0 },
}: Props) {
    const { flash } = usePage<PageProps>().props;

    // GESTION D'ÉTAT 100% FRONTEND (Instantané, sans router.get)
    const [selectedCaisseId, setSelectedCaisseId] = useState<string>(caisses[0]?.id || '');

    // Dérivation de toutes les variables depuis la caisse sélectionnée
    const selectedCaisse = useMemo(() => caisses.find(c => c.id === selectedCaisseId) || caisses[0], [caisses, selectedCaisseId]);
    const activeSession = selectedCaisse?.activeSession || null;
    const openingPreview = selectedCaisse?.openingPreview || null;
    const sessionMouvements = selectedCaisse?.sessionMouvements || [];

    const [openModal, setOpenModal] = useState(false);
    const [closeModal, setCloseModal] = useState(false);

    // Filtres des mouvements
    const [mvtSearch, setMvtSearch] = useState('');
    const [mvtFilter, setMvtFilter] = useState<'all' | 'entree' | 'sortie'>('all');

    const openForm = useForm({
        observation: '',
    });

    const closeForm = useForm({
        solde_fermeture: '',
        justification_ecart: '',
        observation: '',
        pin: '',
    });

    const handleRequestOpening = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCaisse || openingPreview?.is_blocked) return;

        openForm.post(route('cashier.session.request-opening', selectedCaisse.id), {
            preserveScroll: true,
            onSuccess: () => {
                setOpenModal(false);
                openForm.reset();
            },
        });
    };

    const handleCloseSession = (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeSession) return;

        closeForm.post(route('cashier.session.close', activeSession.id), {
            preserveScroll: true,
            onSuccess: () => {
                setCloseModal(false);
                closeForm.reset();
            },
        });
    };

    const theoreticalBalance = useMemo(() => {
        if (!activeSession) return selectedCaisse?.solde_actuel ?? 0;
        const ouv = activeSession.solde_ouverture ?? 0;
        const inFlux = activeSession.total_entrees ?? 0;
        const outFlux = activeSession.total_sorties ?? 0;
        return Math.round((ouv + inFlux - outFlux + Number.EPSILON) * 100) / 100;
    }, [activeSession, selectedCaisse]);

    const physicalBalance = useMemo(() => {
        const val = parseFloat(closeForm.data.solde_fermeture);
        return isNaN(val) ? null : val;
    }, [closeForm.data.solde_fermeture]);

    const ecart = useMemo(() => {
        if (physicalBalance === null) return null;
        return Math.round((physicalBalance - theoreticalBalance + Number.EPSILON) * 100) / 100;
    }, [physicalBalance, theoreticalBalance]);

    // Données de visualisation graphique (Donut & Jauge)
    const chartData = useMemo(() => {
        const ouv = activeSession?.solde_ouverture ?? 0;
        const inFlux = activeSession?.total_entrees ?? 0;
        const outFlux = activeSession?.total_sorties ?? 0;
        const totalDisponible = ouv + inFlux;
        const soldeActuel = Math.max(0, totalDisponible - outFlux);

        const totalGlobal = totalDisponible > 0 ? totalDisponible : 1;
        const pctSorties = Math.min(100, Math.round((outFlux / totalGlobal) * 100));
        const pctRestant = Math.max(0, 100 - pctSorties);

        return {
            ouv,
            inFlux,
            outFlux,
            totalDisponible,
            soldeActuel,
            pctSorties,
            pctRestant,
        };
    }, [activeSession]);

    // Max montant pour l'échelle du Diagramme à Barres chronologique
    const maxMvtAmount = useMemo(() => {
        if (!sessionMouvements.length) return 1;
        return Math.max(...sessionMouvements.map((m) => m.montant));
    }, [sessionMouvements]);

    // Filtrage dynamique des mouvements récents
    const filteredMouvements = useMemo(() => {
        return sessionMouvements.filter((m) => {
            if (mvtFilter !== 'all' && m.type !== mvtFilter) return false;
            if (mvtSearch.trim()) {
                const q = mvtSearch.toLowerCase();
                const matchPiece = m.numero_piece?.toLowerCase().includes(q);
                const matchTiers = m.tiers_nom?.toLowerCase().includes(q);
                const matchMotif = m.motif?.toLowerCase().includes(q);
                const matchImp = m.imputation?.toLowerCase().includes(q);
                if (!matchPiece && !matchTiers && !matchMotif && !matchImp) return false;
            }
            return true;
        });
    }, [sessionMouvements, mvtFilter, mvtSearch]);

    const isCaisseAZero = (selectedCaisse?.solde_actuel ?? 0) <= 0;

    return (
        <AppLayout>
            <Head title="Guichet Caisse & Sessions" />

            <div className="space-y-6">
                {/* En-tête officiel */}
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
                    <div>
                        <nav className="text-[10px] font-bold uppercase tracking-widest text-[#B2BED6] mb-1.5 flex items-center gap-1.5">
                            <Wallet className="w-3.5 h-3.5 text-[#04326D]" />
                            <span>Guichet Caisse</span>
                            <span className="mx-1">/</span>
                            <span className="text-[#04326D]">Supervision & Sessions</span>
                        </nav>
                        <h1 className="text-xl font-bold text-[#0B192C]">
                            Supervision du Guichet & Clôture Journalière
                        </h1>
                        <p className="text-[12px] text-gray-500 mt-1">
                            Traçabilité intégrale : fond d'ouverture garanti, chaîne de décaissement et arrêté physique conjoint.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {selectedCaisse && (
                            <Link
                                href={route('cashier.journal.du-jour', { caisse_id: selectedCaisse.id })}
                                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-[#B2BED6] hover:bg-gray-50 text-[#0B192C] rounded font-bold text-xs shadow-sm transition"
                            >
                                <FileText className="w-4 h-4 text-[#04326D]" />
                                <span>Journal de Caisse (A4)</span>
                            </Link>
                        )}
                        {selectedCaisse && (
                            <Link
                                href={route('cashier.ledger.index', { caisse_id: selectedCaisse.id })}
                                className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#04326D] hover:bg-[#06428f] text-white rounded font-bold text-xs shadow-sm transition"
                            >
                                <BookOpen className="w-4 h-4 text-purple-200" />
                                <span>Grand Livre Mensuel</span>
                            </Link>
                        )}
                    </div>
                </header>

                {/* Messages Flash */}
                {flash?.success && (
                    <div className="p-3.5 rounded bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                        <span>{flash.success}</span>
                    </div>
                )}
                {flash?.error && (
                    <div className="p-3.5 rounded bg-red-50 border border-red-300 text-red-900 text-xs font-semibold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-700 shrink-0" />
                        <span>{flash.error}</span>
                    </div>
                )}

                {/* SÉLECTEUR MULTI-CAISSES : VUE EN CARTES INTERACTIVES (100% FRONTEND) */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-[#04326D]" />
                            <span>Vos Guichets & Caisses Attribués ({caisses.length})</span>
                        </span>
                        <span className="text-[10px] text-gray-400">
                            Cliquez sur une caisse pour basculer
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {caisses.map((c) => {
                            const isSelected = selectedCaisse?.id === c.id;
                            const solde = c.solde_actuel ?? 0;
                            const isZero = solde <= 0;

                            return (
                                <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => setSelectedCaisseId(c.id)}
                                    className={`p-3.5 rounded-lg border text-left transition relative flex flex-col justify-between ${
                                        isSelected
                                            ? 'bg-white border-[#04326D] shadow-md ring-2 ring-[#04326D]/15'
                                            : 'bg-white border-gray-200 hover:border-[#B2BED6] hover:bg-gray-50/50 shadow-sm'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${
                                                    isSelected
                                                        ? 'bg-[#04326D] text-white'
                                                        : 'bg-gray-100 text-[#0B192C]'
                                                }`}
                                            >
                                                {c.devise}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-xs text-[#0B192C] leading-snug">
                                                    {c.name}
                                                </h3>
                                                <span className="text-[10px] text-gray-500 font-mono">
                                                    Code : {c.code}
                                                </span>
                                            </div>
                                        </div>

                                        <span
                                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                                c.is_ouverte
                                                    ? 'bg-emerald-100 text-emerald-800'
                                                    : 'bg-gray-100 text-gray-600'
                                            }`}
                                        >
                                            <span
                                                className={`w-1.5 h-1.5 rounded-full ${
                                                    c.is_ouverte ? 'bg-emerald-600 animate-pulse' : 'bg-gray-400'
                                                }`}
                                            />
                                            {c.is_ouverte ? 'Ouverte' : 'Fermée'}
                                        </span>
                                    </div>

                                    <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-baseline justify-between">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase">
                                            Solde physique
                                        </span>
                                        <span
                                            className={`font-mono text-sm font-black ${
                                                isZero ? 'text-red-700' : 'text-[#04326D]'
                                            }`}
                                        >
                                            {money(solde, c.devise)}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* BANDEAU DU GUICHET SÉLECTIONNÉ : ACTIONS DE SESSION */}
                {selectedCaisse && (
                    <div className="bg-white border border-[#B2BED6] rounded-lg shadow-sm p-5 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                            <div className="flex items-center gap-3.5">
                                <div className="w-12 h-12 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                                    <Wallet className="w-6 h-6 text-[#04326D]" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-base font-bold text-[#0B192C]">
                                            {selectedCaisse.name}
                                        </h2>
                                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                                            {selectedCaisse.devise}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                                        <span>Liquidité disponible :</span>
                                        <strong className={`font-mono font-bold text-sm ${isCaisseAZero ? 'text-red-700' : 'text-emerald-700'}`}>
                                            {money(selectedCaisse.solde_actuel, selectedCaisse.devise)}
                                        </strong>
                                    </p>
                                </div>
                            </div>

                            {/* Actions d'ouverture et clôture */}
                            <div>
                                {!activeSession ? (
                                    <button
                                        type="button"
                                        onClick={() => setOpenModal(true)}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#04326D] hover:bg-[#06428f] text-white rounded font-bold text-xs shadow transition"
                                    >
                                        <Lock className="w-4 h-4 text-amber-300" />
                                        <span>Demander l'Ouverture du Guichet</span>
                                    </button>
                                ) : activeSession.status === 'en_attente_autorisation' ? (
                                    <div className="inline-flex items-center gap-2 px-3.5 py-2 bg-amber-50 border border-amber-300 rounded text-amber-900 text-xs font-bold shadow-sm">
                                        <Clock className="w-4 h-4 text-amber-700 animate-spin" />
                                        <span>Ouverture en attente d'approbation (Manager Finance)</span>
                                    </div>
                                ) : activeSession.status === 'ouverte' ? (
                                    <div className="flex items-center gap-2">
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded font-bold text-xs border border-emerald-300">
                                            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping" />
                                            <span>Session Active ({activeSession.opened_at ?? 'En cours'})</span>
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                closeForm.reset();
                                                setCloseModal(true);
                                            }}
                                            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-xs shadow transition"
                                        >
                                            Clôturer la Session
                                        </button>
                                    </div>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded font-bold text-xs border">
                                        Session Clôturée pour aujourd'hui
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Synthèse financière de la session */}
                        {activeSession && activeSession.status === 'ouverte' && (
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs pt-1">
                                <div className="p-3 bg-gray-50 border rounded-md">
                                    <span className="text-[10px] uppercase font-bold text-gray-500 block">
                                        Solde d'ouverture hérité
                                    </span>
                                    <strong className="text-sm font-mono text-[#0B192C]">
                                        {money(activeSession.solde_ouverture, selectedCaisse.devise)}
                                    </strong>
                                </div>
                                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-md">
                                    <span className="text-[10px] uppercase font-bold text-[#04326D] block">
                                        Entrées du jour (BEC)
                                    </span>
                                    <strong className="text-sm font-mono text-[#04326D]">
                                        + {money(activeSession.total_entrees, selectedCaisse.devise)}
                                    </strong>
                                </div>
                                <div className="p-3 bg-red-50/70 border border-red-200 rounded-md">
                                    <span className="text-[10px] uppercase font-bold text-red-700 block">
                                        Sorties du jour (BSC)
                                    </span>
                                    <strong className="text-sm font-mono text-red-700">
                                        - {money(activeSession.total_sorties, selectedCaisse.devise)}
                                    </strong>
                                </div>
                                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-md">
                                    <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                                        Solde théorique en caisse
                                    </span>
                                    <strong className="text-sm font-mono text-emerald-800">
                                        = {money(theoreticalBalance, selectedCaisse.devise)}
                                    </strong>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* SECTION GRAPHIQUES : VISUALISATIONS FLUX & JAUGE DE TRÉSORERIE */}
                {/* STRICTEMENT MASQUÉ SI LA SESSION N'EST PAS OUVERTE */}
                {activeSession && activeSession.status === 'ouverte' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* 1. Donut Graphique SVG de la Session */}
                        <div className="bg-white border border-[#B2BED6] rounded-lg p-5 shadow-sm space-y-3">
                            <div className="flex items-center justify-between border-b pb-2.5">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B192C] flex items-center gap-1.5">
                                    <PieChartIcon className="w-4 h-4 text-[#04326D]" />
                                    <span>Répartition des Fonds du Jour</span>
                                </h3>
                                <span className="text-[10px] font-mono text-gray-500 font-bold">
                                    {selectedCaisse?.devise}
                                </span>
                            </div>

                            <div className="flex items-center justify-center gap-6 pt-2">
                                {/* SVG Donut Chart */}
                                <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                        {/* Cercle d'arrière-plan (Fonds restant / vert) */}
                                        <path
                                            className="text-emerald-500"
                                            strokeWidth="4"
                                            stroke="currentColor"
                                            fill="none"
                                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                        />
                                        {/* Segment des sorties (rouge) */}
                                        <path
                                            className="text-red-500 transition-all duration-700 ease-out"
                                            strokeDasharray={`${chartData.pctSorties}, 100`}
                                            strokeWidth="4"
                                            strokeLinecap="round"
                                            stroke="currentColor"
                                            fill="none"
                                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                        />
                                    </svg>
                                    <div className="absolute text-center">
                                        <span className="text-xs font-black font-mono text-[#0B192C] block">
                                            {chartData.pctRestant}%
                                        </span>
                                        <span className="text-[8px] font-bold uppercase text-gray-400 block -mt-0.5">
                                            Restant
                                        </span>
                                    </div>
                                </div>

                                {/* Légende du Donut */}
                                <div className="space-y-1.5 text-[11px] flex-1">
                                    <div className="flex items-center justify-between">
                                        <span className="flex items-center gap-1.5 text-gray-600">
                                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                            Solde Restant :
                                        </span>
                                        <strong className="font-mono text-emerald-800">
                                            {money(chartData.soldeActuel, '')}
                                        </strong>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="flex items-center gap-1.5 text-gray-600">
                                            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                                            Sorties (BSC) :
                                        </span>
                                        <strong className="font-mono text-red-700">
                                            {money(chartData.outFlux, '')}
                                        </strong>
                                    </div>
                                    <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                                        <span className="flex items-center gap-1.5 text-gray-600">
                                            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                                            Entrées (BEC) :
                                        </span>
                                        <strong className="font-mono text-blue-700">
                                            +{money(chartData.inFlux, '')}
                                        </strong>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Jauge de Ratio de Décaissement */}
                        <div className="bg-white border border-[#B2BED6] rounded-lg p-5 shadow-sm space-y-3">
                            <div className="flex items-center justify-between border-b pb-2.5">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B192C] flex items-center gap-1.5">
                                    <BarChart3 className="w-4 h-4 text-emerald-700" />
                                    <span>Ratio d'Utilisation du Guichet</span>
                                </h3>
                                <span className="text-[10px] font-mono text-gray-500 font-bold">
                                    Aujourd'hui
                                </span>
                            </div>

                            <div className="space-y-2 pt-1 text-xs">
                                <div className="flex justify-between items-center text-[11px]">
                                    <span className="text-gray-600">Taux de décaissement engagé :</span>
                                    <strong className="font-mono text-sm text-[#04326D]">
                                        {chartData.pctSorties}%
                                    </strong>
                                </div>

                                {/* Barre de progression */}
                                <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden flex relative">
                                    <div
                                        className="bg-red-500 transition-all duration-700"
                                        style={{ width: `${chartData.pctSorties}%` }}
                                        title={`Sorties: ${chartData.pctSorties}%`}
                                    />
                                    <div
                                        className="bg-emerald-500 transition-all duration-700"
                                        style={{ width: `${chartData.pctRestant}%` }}
                                        title={`Restant: ${chartData.pctRestant}%`}
                                    />
                                </div>

                                <div className="p-2.5 bg-gray-50 rounded border border-gray-100 space-y-1 text-[11px]">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Total Liquidités Mises en Jeu :</span>
                                        <strong className="font-mono">{money(chartData.totalDisponible, selectedCaisse?.devise)}</strong>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Mouvements exécutés :</span>
                                        <strong className="font-mono">{sessionMouvements.length} opération(s)</strong>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. Statut de Disponibilité et Alerte Seuil */}
                        <div className="bg-white border border-[#B2BED6] rounded-lg p-5 shadow-sm space-y-3">
                            <div className="flex items-center justify-between border-b pb-2.5">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B192C] flex items-center gap-1.5">
                                    <ShieldAlert className="w-4 h-4 text-amber-700" />
                                    <span>Contrôle Anti-Découvert</span>
                                </h3>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold uppercase">
                                    Actif
                                </span>
                            </div>

                            <div className="space-y-2 pt-1 text-xs text-gray-700">
                                <p className="text-[11px] leading-relaxed">
                                    Règle de sécurité : tout décaissement supérieur au solde actuel ({money(selectedCaisse?.solde_actuel, selectedCaisse?.devise)}) est immédiatement rejeté par le système.
                                </p>

                                <div className={`p-2.5 rounded border text-[11px] flex items-center gap-2 ${
                                    isCaisseAZero
                                        ? 'bg-red-50 border-red-300 text-red-900 font-bold'
                                        : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                                }`}>
                                    {isCaisseAZero ? (
                                        <AlertTriangle className="w-4 h-4 text-red-700 shrink-0" />
                                    ) : (
                                        <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                                    )}
                                    <span>
                                        {isCaisseAZero
                                            ? 'Caisse à zéro. Approvisionnement (BEC) obligatoire.'
                                            : 'Guichet solvable. Capacité de paiement opérationnelle.'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 4. LE NOUVEAU DIAGRAMME À BARRES CHRONOLOGIQUE (Prend toute la largeur en bas) */}
                        <div className="bg-white border border-[#B2BED6] rounded-lg p-5 shadow-sm space-y-3 lg:col-span-3">
                            <div className="flex items-center justify-between border-b pb-2.5">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B192C] flex items-center gap-1.5">
                                    <Activity className="w-4 h-4 text-[#04326D]" />
                                    <span>Chronologie des Flux Financiers (10 dernières opérations)</span>
                                </h3>
                                <span className="text-[10px] font-mono text-gray-500 font-bold">
                                    Montant Max : {money(maxMvtAmount, selectedCaisse?.devise)}
                                </span>
                            </div>

                            <div className="pt-5 flex items-end justify-between h-40 gap-2 relative">
                                {/* Lignes de repère arrières */}
                                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20 pb-5">
                                    <div className="border-b border-gray-400 w-full h-0"></div>
                                    <div className="border-b border-gray-400 w-full h-0"></div>
                                    <div className="border-b border-gray-400 w-full h-0"></div>
                                    <div className="border-b border-gray-400 w-full h-0"></div>
                                </div>

                                {sessionMouvements.length === 0 ? (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs italic pb-5">
                                        Aucun mouvement récent à afficher pour chronométrer.
                                    </div>
                                ) : (
                                    // On reverse l'array pour que le plus ancien des 10 soit à gauche et le plus récent à droite
                                    [...sessionMouvements].reverse().map((m) => {
                                        // On s'assure d'avoir un minimum de hauteur pour que les petites barres soient cliquables (ex: 2%)
                                        const heightPct = Math.max((m.montant / maxMvtAmount) * 100, 2);
                                        const isEntree = m.type === 'entree';

                                        return (
                                            <div key={m.id} className="relative group flex-1 flex flex-col items-center justify-end h-full">
                                                {/* Tooltip au survol */}
                                                <div className="absolute bottom-[calc(100%+0.5rem)] mb-0 hidden group-hover:block z-10 w-max max-w-[160px] bg-gray-900 text-white text-[10px] p-2.5 rounded shadow-lg text-center animate-fade-in">
                                                    <span className="font-bold border-b border-gray-700 pb-1 mb-1 block">
                                                        {m.numero_piece}
                                                    </span>
                                                    <span className={`font-mono text-xs block ${isEntree ? 'text-emerald-400' : 'text-red-400'}`}>
                                                        {isEntree ? '+' : '-'}{money(m.montant, m.devise)}
                                                    </span>
                                                    <span className="text-gray-300 block truncate mt-1">{m.tiers_nom}</span>
                                                </div>
                                                
                                                {/* La Barre HTML Native */}
                                                <div
                                                    className={`w-full max-w-[3rem] rounded-t-sm transition-all duration-700 ease-out hover:opacity-80 cursor-pointer ${
                                                        isEntree ? 'bg-blue-600' : 'bg-red-500'
                                                    }`}
                                                    // -20px c'est pour laisser la place au texte en dessous
                                                    style={{ height: `calc(${heightPct}% - 20px)` }}
                                                />
                                                {/* Label sous la barre (Suffixe du n° de pièce) */}
                                                <span className="text-[9px] font-mono mt-2 text-gray-500 truncate w-full text-center h-4">
                                                    ...{m.numero_piece.split('-').pop()}
                                                </span>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* MODULES & RACCOURCIS DU GUICHETIER */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Link
                        href={route('cashier.disbursements.index', { caisse_id: selectedCaisse?.id })}
                        className="bg-white border border-[#B2BED6] hover:border-[#04326D] rounded-lg p-4 shadow-sm space-y-2 transition flex flex-col justify-between group"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-[#0B192C]">
                                Bons à Décaisser (BSC)
                            </span>
                            <ArrowUpRight className="w-4 h-4 text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                        <p className="text-[11px] text-gray-500">
                            Paiement des réquisitions visées par la Direction et délivrance des bons de sortie.
                        </p>
                        <div className="pt-2 border-t text-[11px] font-mono font-bold text-[#04326D] flex justify-between">
                            <span>En attente :</span>
                            <span>{money(stats?.totalAttenteUSD, '$')} | {money(stats?.totalAttenteFC, 'FC')}</span>
                        </div>
                    </Link>

                    <Link
                        href={route('cashier.receipts.index', { caisse_id: selectedCaisse?.id })}
                        className="bg-white border border-[#B2BED6] hover:border-[#04326D] rounded-lg p-4 shadow-sm space-y-2 transition flex flex-col justify-between group"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-[#0B192C]">
                                Entrées de Caisse (BEC)
                            </span>
                            <ArrowDownLeft className="w-4 h-4 text-[#04326D] group-hover:translate-x-0.5 transition-transform" />
                        </div>
                        <p className="text-[11px] text-gray-500">
                            Approvisionnements bancaires avec bordereau et remboursements de reliquats.
                        </p>
                        <span className="text-[11px] font-bold text-gray-700 pt-2 border-t block">
                            Émettre un Bon d'Entrée Caisse &rarr;
                        </span>
                    </Link>

                    <Link
                        href={route('cashier.journal.du-jour', { caisse_id: selectedCaisse?.id })}
                        className="bg-white border border-[#B2BED6] hover:border-[#04326D] rounded-lg p-4 shadow-sm space-y-2 transition flex flex-col justify-between group"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-[#0B192C]">
                                Journal du Jour (A4)
                            </span>
                            <FileText className="w-4 h-4 text-[#04326D] group-hover:translate-x-0.5 transition-transform" />
                        </div>
                        <p className="text-[11px] text-gray-500">
                            Arrêté journalier chronologique officiel prêt pour l'impression A4 et visas conjoints.
                        </p>
                        <span className="text-[11px] font-bold text-[#04326D] pt-2 border-t block">
                            Consulter l'Arrêté du Jour &rarr;
                        </span>
                    </Link>

                    <Link
                        href={route('cashier.ledger.index', { caisse_id: selectedCaisse?.id })}
                        className="bg-white border border-[#B2BED6] hover:border-[#04326D] rounded-lg p-4 shadow-sm space-y-2 transition flex flex-col justify-between group"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-[#0B192C]">
                                Grand Livre Mensuel
                            </span>
                            <BookOpen className="w-4 h-4 text-purple-600 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                        <p className="text-[11px] text-gray-500">
                            Report à nouveau exact, solde progressif et export certifié vers Excel (.csv).
                        </p>
                        <span className="text-[11px] font-bold text-gray-700 pt-2 border-t block">
                            Exporter le Grand Livre &rarr;
                        </span>
                    </Link>
                </div>

                {/* TABLEAU DES DERNIERS MOUVEMENTS AVEC FILTRES RAPIDES */}
                <div className="bg-white border border-[#B2BED6] rounded-lg shadow-sm overflow-hidden">
                    <header className="px-4 py-3 border-b bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B192C]">
                                Mouvements Récents du Guichet ({filteredMouvements.length})
                            </h3>
                        </div>

                        {/* Barre d'outils et recherche en direct */}
                        <div className="flex items-center gap-2">
                            <div className="flex border border-[#B2BED6] rounded overflow-hidden text-[10px] font-bold bg-white">
                                <button
                                    type="button"
                                    onClick={() => setMvtFilter('all')}
                                    className={`px-2.5 py-1 transition ${
                                        mvtFilter === 'all'
                                            ? 'bg-[#04326D] text-white'
                                            : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    Tous
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMvtFilter('entree')}
                                    className={`px-2.5 py-1 transition ${
                                        mvtFilter === 'entree'
                                            ? 'bg-[#04326D] text-white'
                                            : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    Entrées
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMvtFilter('sortie')}
                                    className={`px-2.5 py-1 transition ${
                                        mvtFilter === 'sortie'
                                            ? 'bg-[#04326D] text-white'
                                            : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    Sorties
                                </button>
                            </div>

                            <div className="relative w-48">
                                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                    type="text"
                                    placeholder="Filtrer N° pièce, tiers..."
                                    value={mvtSearch}
                                    onChange={(e) => setMvtSearch(e.target.value)}
                                    className="w-full pl-8 pr-3 py-1 bg-white border border-[#B2BED6] rounded text-[11px] focus:outline-none focus:border-[#04326D]"
                                />
                            </div>
                        </div>
                    </header>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-[#0B192C] text-white text-[10px] uppercase font-bold tracking-wider">
                                    <th className="py-2.5 px-4">N° Pièce</th>
                                    <th className="py-2.5 px-4">Type</th>
                                    <th className="py-2.5 px-4">Bénéficiaire / Déposant</th>
                                    <th className="py-2.5 px-4">Motif & Imputation</th>
                                    <th className="py-2.5 px-4 text-right">Montant</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 text-gray-700">
                                {filteredMouvements.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-gray-400 italic">
                                            {sessionMouvements.length === 0
                                                ? 'Aucune opération enregistrée sur cette session de caisse.'
                                                : 'Aucun mouvement ne correspond à votre filtre de recherche.'}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredMouvements.map((m) => (
                                        <tr key={m.id} className="hover:bg-[#F9F9FF] transition">
                                            <td className="py-3 px-4 font-mono font-bold text-[#04326D]">
                                                {m.numero_piece}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span
                                                    className={`px-2 py-0.5 rounded text-[9.5px] font-bold uppercase inline-flex items-center gap-1 ${
                                                        m.type === 'entree'
                                                            ? 'bg-blue-100 text-[#04326D]'
                                                            : 'bg-red-100 text-red-800'
                                                    }`}
                                                >
                                                    {m.type === 'entree' ? (
                                                        <TrendingUp className="w-3 h-3 text-[#04326D]" />
                                                    ) : (
                                                        <TrendingDown className="w-3 h-3 text-red-700" />
                                                    )}
                                                    {m.type === 'entree' ? 'Entrée' : 'Sortie'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 font-semibold text-gray-800">
                                                {m.tiers_nom}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="block">{m.motif}</span>
                                                <span className="font-mono text-gray-500 text-[10px]">
                                                    [Imp: {m.imputation}]
                                                </span>
                                            </td>
                                            <td
                                                className={`py-3 px-4 text-right font-mono font-bold text-sm ${
                                                    m.type === 'entree' ? 'text-emerald-700' : 'text-red-700'
                                                }`}
                                            >
                                                {m.type === 'entree' ? '+' : '−'} {money(m.montant, m.devise)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* MODALE D'OUVERTURE (HÉRITAGE AUTOMATIQUE DU SOLDE) */}
            {openModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
                    <div className="bg-white rounded-lg border border-[#B2BED6] shadow-2xl max-w-md w-full p-6 space-y-4 animate-slide-down">
                        <header className="flex items-start justify-between border-b pb-3">
                            <div className="flex items-center gap-2">
                                <Lock className="w-5 h-5 text-[#04326D]" />
                                <div>
                                    <h3 className="text-sm font-bold text-[#0B192C] uppercase tracking-wide">
                                        Ouverture du Guichet de Caisse
                                    </h3>
                                    <p className="text-[11px] text-gray-500">
                                        Guichet : <strong>{selectedCaisse?.name}</strong> ({selectedCaisse?.devise})
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setOpenModal(false)}
                                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </header>

                        {openingPreview?.is_blocked ? (
                            <div className="p-4 bg-red-50 border border-red-300 rounded space-y-2 text-xs text-red-900">
                                <div className="flex items-center gap-2 font-bold text-red-800">
                                    <AlertTriangle className="w-4 h-4 text-red-700" />
                                    <span>Aucun fond de dotation validé</span>
                                </div>
                                <p className="leading-relaxed text-[11px]">
                                    Cette caisse n'a jamais été approvisionnée. Pour effectuer la première ouverture, vous devez d'abord créer un <strong>Bon d'Entrée Caisse d'Approvisionnement Initial</strong> avec bordereau bancaire, et le faire valider par le Manager Finance.
                                </p>
                            </div>
                        ) : (
                            <div className="p-4 bg-blue-50/70 border border-[#B2BED6] rounded space-y-2 text-xs">
                                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-gray-600">
                                    <span>
                                        {openingPreview?.type === 'report_veille'
                                            ? `📅 Report de la clôture du ${openingPreview.date_source}`
                                            : `🎯 Solde d'ouverture certifié`}
                                    </span>
                                    <span className="text-[10px] text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded font-mono font-bold">
                                        Verrouillé
                                    </span>
                                </div>
                                <div className="flex items-baseline justify-between pt-1">
                                    <span className="text-2xl font-black font-mono text-[#04326D]">
                                        {money(openingPreview?.solde ?? 0, selectedCaisse?.devise ?? '')}
                                    </span>
                                    <span className="text-[11px] text-gray-500 font-semibold italic">
                                        Non modifiable
                                    </span>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleRequestOpening} className="space-y-3.5 text-xs">
                            <div>
                                <label className="block font-bold text-gray-700 mb-1">
                                    Observation (Optionnelle)
                                </label>
                                <textarea
                                    rows={2}
                                    placeholder="Précision sur le démarrage du service..."
                                    value={openForm.data.observation}
                                    onChange={(e) => openForm.setData('observation', e.target.value)}
                                    className="w-full border border-[#B2BED6] rounded p-2 text-xs focus:outline-none focus:border-[#04326D]"
                                    disabled={openingPreview?.is_blocked}
                                />
                            </div>

                            <p className="text-[10px] text-gray-500 leading-relaxed bg-gray-50 p-2.5 rounded border border-gray-200">
                                Une alerte prioritaire sera notifiée au Manager Finance. Dès son accord validé par Code PIN, le guichet sera immédiatement opérationnel.
                            </p>

                            <div className="flex justify-end gap-2 pt-2 border-t">
                                <button
                                    type="button"
                                    onClick={() => setOpenModal(false)}
                                    className="px-3.5 py-1.5 border border-[#B2BED6] rounded text-xs font-semibold text-gray-600 hover:bg-gray-50"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={openForm.processing || openingPreview?.is_blocked}
                                    className="px-4 py-1.5 bg-[#04326D] hover:bg-[#06428f] disabled:opacity-50 text-white rounded text-xs font-bold shadow transition"
                                >
                                    Transmettre la Demande
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODALE DE CLÔTURE (RAPPROCHEMENT PHYSIQUE VS THÉORIQUE) */}
            {closeModal && activeSession && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
                    <div className="bg-white rounded-lg border border-[#B2BED6] shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto animate-slide-down">
                        <header className="flex items-start justify-between border-b pb-3">
                            <div>
                                <h3 className="text-sm font-bold text-red-800 uppercase tracking-wide">
                                    Clôture Quotidienne & Arrêté de Caisse
                                </h3>
                                <p className="text-[11px] text-gray-500">
                                    Guichet : <strong>{selectedCaisse?.name}</strong> • Date : {activeSession.date_session}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setCloseModal(false)}
                                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </header>

                        <div className="p-3 bg-gray-50 border border-gray-200 rounded text-xs space-y-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                                ① Calcul Théorique du Système
                            </span>
                            <div className="flex justify-between text-gray-600">
                                <span>Fond d'ouverture hérité :</span>
                                <strong className="font-mono">{money(activeSession.solde_ouverture, selectedCaisse?.devise)}</strong>
                            </div>
                            <div className="flex justify-between text-emerald-800">
                                <span>+ Total Entrées du jour (BEC) :</span>
                                <strong className="font-mono">+{money(activeSession.total_entrees, selectedCaisse?.devise)}</strong>
                            </div>
                            <div className="flex justify-between text-red-700">
                                <span>− Total Sorties du jour (BSC) :</span>
                                <strong className="font-mono">−{money(activeSession.total_sorties, selectedCaisse?.devise)}</strong>
                            </div>
                            <div className="flex justify-between border-t border-gray-300 pt-1 font-bold text-[#0B192C]">
                                <span>= Solde Théorique attendu :</span>
                                <span className="font-mono text-sm text-[#04326D]">{money(theoreticalBalance, selectedCaisse?.devise)}</span>
                            </div>
                        </div>

                        {closeForm.errors.justification_ecart && (
                            <div className="p-3 bg-red-50 border border-red-300 rounded text-red-800 text-xs flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>{closeForm.errors.justification_ecart}</span>
                            </div>
                        )}
                        {closeForm.errors.pin && (
                            <div className="p-3 bg-red-50 border border-red-300 rounded text-red-800 text-xs flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>{closeForm.errors.pin}</span>
                            </div>
                        )}

                        <form onSubmit={handleCloseSession} className="space-y-3.5 text-xs">
                            <div>
                                <label className="block font-bold text-gray-700 mb-1">
                                    ② Comptage Physique Constaté (Espèces réelles dans le coffre en {selectedCaisse?.devise}) *
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder={`Montant en ${selectedCaisse?.devise ?? ''}`}
                                    value={closeForm.data.solde_fermeture}
                                    onChange={(e) => closeForm.setData('solde_fermeture', e.target.value)}
                                    className="w-full border-2 border-[#04326D] rounded p-2 text-sm font-mono font-bold focus:outline-none focus:ring-1 focus:ring-[#04326D]"
                                    required
                                    autoFocus
                                />
                            </div>

                            {ecart !== null && (
                                <div
                                    className={`p-3 rounded border text-xs space-y-1 ${
                                        ecart === 0
                                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                                            : 'bg-red-50 border-red-300 text-red-900'
                                    }`}
                                >
                                    <div className="flex items-center justify-between font-bold">
                                        <span className="flex items-center gap-1.5">
                                            {ecart === 0 ? (
                                                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                                            ) : (
                                                <AlertTriangle className="w-4 h-4 text-red-700" />
                                            )}
                                            <span>
                                                {ecart === 0 ? 'Caisse Parfaitement Juste' : 'Écart de Caisse Constaté'}
                                            </span>
                                        </span>
                                        <span className="font-mono text-sm font-black">
                                            {ecart > 0 ? `+${money(ecart, selectedCaisse?.devise)}` : money(ecart, selectedCaisse?.devise)}
                                        </span>
                                    </div>
                                    <p className="text-[11px] leading-relaxed">
                                        {ecart === 0
                                            ? 'Le solde compté correspond exactement au montant théorique calculé.'
                                            : 'Le solde physique ne correspond pas au solde théorique. Vous devez obligatoirement justifier cet écart ci-dessous.'}
                                    </p>
                                </div>
                            )}

                            {ecart !== null && ecart !== 0 && (
                                <div>
                                    <label className="block font-bold text-red-800 mb-1">
                                        Justification Obligatoire de l'Écart *
                                    </label>
                                    <textarea
                                        rows={2}
                                        placeholder="Précisez la cause exacte : erreur de rendu, coupure refusée, etc."
                                        value={closeForm.data.justification_ecart}
                                        onChange={(e) => closeForm.setData('justification_ecart', e.target.value)}
                                        className="w-full border-2 border-red-300 rounded p-2 text-xs bg-red-50/30 focus:outline-none focus:border-red-600"
                                        required
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">
                                    Observation de Clôture
                                </label>
                                <textarea
                                    rows={1}
                                    placeholder="Note générale de fin de journée..."
                                    value={closeForm.data.observation}
                                    onChange={(e) => closeForm.setData('observation', e.target.value)}
                                    className="w-full border border-[#B2BED6] rounded p-2 text-xs focus:outline-none"
                                />
                            </div>

                            <div className="p-3 bg-amber-50 border border-amber-300 rounded space-y-1.5">
                                <label className="block text-[11px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                                    <KeyRound className="w-3.5 h-3.5 text-amber-800" />
                                    <span>Code PIN du Caissier (Certifiant le comptage) *</span>
                                </label>
                                <input
                                    type="password"
                                    maxLength={6}
                                    placeholder="Saisissez votre code PIN"
                                    value={closeForm.data.pin}
                                    onChange={(e) => closeForm.setData('pin', e.target.value)}
                                    className="w-full border border-amber-300 bg-white rounded p-2 text-xs font-mono tracking-widest text-[#0B192C] focus:outline-none"
                                    required
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t">
                                <button
                                    type="button"
                                    onClick={() => setCloseModal(false)}
                                    className="px-3.5 py-1.5 border border-[#B2BED6] rounded text-xs font-semibold text-gray-600 hover:bg-gray-50"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={closeForm.processing}
                                    className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold shadow transition"
                                >
                                    {closeForm.processing ? 'Clôture en cours...' : 'Certifier & Clôturer la Session'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}