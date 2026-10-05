import { useMemo, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { PageProps } from '@/types';
import OfficialPrintSheet from '@/Components/OfficialPrintSheet';
import {
    Wallet,
    CheckCircle2,
    Clock,
    Printer,
    Eye,
    X,
    Lock,
    KeyRound,
    AlertCircle,
    Building2,
    Calendar,
    ArrowUpRight,
    Search,
    FileText,
    Receipt,
} from 'lucide-react';

interface Justificatif {
    id: string;
    nom: string;
    fileUrl: string | null;
}

interface LigneArticle {
    id: string;
    activite: string;
    codeAllocation: string | null;
    quantiteOuDuree: number;
    unite: string;
    prixUnitaire: number;
    total: number;
    justificatifs: Justificatif[];
}

interface SignatureAudit {
    role: string;
    nom: string;
    action: string;
    date: string;
    code?: string;
    hash: string;
}

interface CashierRequisition {
    id: string;
    numero: string;
    projet: string;
    initiateurNom: string;
    initiateurRole: string;
    nature: 'Achat' | 'Service';
    devise: 'USD' | 'FC' | 'EUR';
    montantTotal: number;
    caisseAttribuee: string;
    observation: string | null;
    is_urgent: boolean;
    status: string;
    dateSoumission: string;
    mode_paiement?: string | null;
    reference_paiement?: string | null;
    date_decaissement?: string | null;
    cashierNom?: string | null;
    signatures: SignatureAudit[];
    lignes: LigneArticle[];
}

interface StatsCaisse {
    countAttente: number;
    totalAttenteUSD: number;
    totalAttenteFC: number;
    totalDecaisseMoisUSD: number;
    totalDecaisseMoisFC: number;
}

interface Props extends PageProps {
    selectedCaisse: string;
    caissesList: string[];
    aDecaisser: CashierRequisition[];
    historique: CashierRequisition[];
    stats: StatsCaisse;
}

const money = (amount: number, currency: string) =>
    `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${currency}`;

export default function CashierDashboard({
    selectedCaisse = 'all',
    caissesList = [],
    aDecaisser = [],
    historique = [],
    stats,
}: Props) {
    const { auth, flash } = usePage<PageProps>().props;
    const user = auth.user;

    const [activeTab, setActiveTab] = useState<'a_decaisser' | 'historique'>('a_decaisser');
    const [caisseFiltre, setCaisseFiltre] = useState<string>(selectedCaisse);
    const [search, setSearch] = useState<string>('');

    const [disburseTarget, setDisburseTarget] = useState<CashierRequisition | null>(null);
    const [detailTarget, setDetailTarget] = useState<CashierRequisition | null>(null);
    const [printTarget, setPrintTarget] = useState<CashierRequisition | null>(null);

    const [modePaiement, setModePaiement] = useState<string>('Espèces');
    const [refPaiement, setRefPaiement] = useState<string>('');
    const [notePaiement, setNotePaiement] = useState<string>('');
    const [pin, setPin] = useState<string>('');
    const [pinError, setPinError] = useState<string | null>(null);
    const [processing, setProcessing] = useState<boolean>(false);

    const handleCaisseChange = (caisse: string) => {
        setCaisseFiltre(caisse);
        router.get(
            route('cashier.dashboard'),
            { caisse },
            { preserveState: true, preserveScroll: true }
        );
    };

    const filteredADecaisser = useMemo(() => {
        return aDecaisser.filter((r) => {
            const matchesSearch =
                r.numero.toLowerCase().includes(search.toLowerCase()) ||
                r.projet.toLowerCase().includes(search.toLowerCase()) ||
                r.initiateurNom.toLowerCase().includes(search.toLowerCase());
            return matchesSearch;
        });
    }, [aDecaisser, search]);

    const filteredHistorique = useMemo(() => {
        return historique.filter((r) => {
            const matchesSearch =
                r.numero.toLowerCase().includes(search.toLowerCase()) ||
                r.projet.toLowerCase().includes(search.toLowerCase()) ||
                r.initiateurNom.toLowerCase().includes(search.toLowerCase()) ||
                (r.reference_paiement && r.reference_paiement.toLowerCase().includes(search.toLowerCase()));
            return matchesSearch;
        });
    }, [historique, search]);

    const handleOpenDisburseModal = (req: CashierRequisition) => {
        setDisburseTarget(req);
        setModePaiement('Espèces');
        setRefPaiement('');
        setNotePaiement('');
        setPin('');
        setPinError(null);
    };

    const handleConfirmDisbursement = (e: React.FormEvent) => {
        e.preventDefault();
        if (!disburseTarget) return;

        if (!pin.trim()) {
            setPinError('Veuillez saisir votre Code PIN caissier.');
            return;
        }

        setProcessing(true);
        setPinError(null);

        router.patch(
            route('requisitions.cashier-disburse', disburseTarget.id),
            {
                mode_paiement: modePaiement,
                reference_paiement: refPaiement.trim() || null,
                observation: notePaiement.trim() || null,
                pin: pin.trim(),
            },
            {
                preserveScroll: true,
                onFinish: () => setProcessing(false),
                onSuccess: () => {
                    setDisburseTarget(null);
                },
                onError: (errors) => {
                    setPinError(errors.pin || Object.values(errors)[0] || 'Erreur lors du décaissement.');
                },
            }
        );
    };

    const handleTriggerPrint = (req: CashierRequisition) => {
        setPrintTarget(req);
        setTimeout(() => window.print(), 300);
    };

    return (
        <AppLayout>
            <Head title="Guichet Caisse & Décaissements" />

            <div className="space-y-6 no-print">
                {/* En-tête */}
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
                    <div>
                        <nav className="text-[10px] font-bold uppercase tracking-widest text-[#B2BED6] mb-1.5 flex items-center gap-1.5">
                            <Wallet className="w-3.5 h-3.5 text-[#04326D]" />
                            <span>Service de Trésorerie</span>
                            <span className="mx-1">/</span>
                            <span className="text-[#04326D]">Guichet Caisse</span>
                        </nav>
                        <h1 className="text-xl font-bold text-[#0B192C]">
                            Décaissement & Sorties de Caisse
                        </h1>
                        <p className="text-[12px] text-gray-500 mt-1">
                            Caissier en poste : <strong className="text-[#0B192C]">{user.name}</strong> • Vérification de l'approbation Direction et remise des fonds certifiée.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 bg-white border border-[#B2BED6] rounded px-3 py-1.5">
                        <Building2 className="w-4 h-4 text-[#04326D]" />
                        <label className="text-[11px] font-bold uppercase tracking-widest text-gray-600">
                            Caisse :
                        </label>
                        <select
                            value={caisseFiltre}
                            onChange={(e) => handleCaisseChange(e.target.value)}
                            className="border-none bg-transparent text-[12px] font-bold text-[#04326D] focus:outline-none cursor-pointer pr-6"
                        >
                            <option value="all">Toutes les caisses</option>
                            {caissesList.map((c) => (
                                <option key={c} value={c}>
                                    {c}
                                </option>
                            ))}
                        </select>
                    </div>
                </header>

                {/* Notifications Flash */}
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

                {/* KPIs Caisse */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-white p-4 rounded border border-[#B2BED6] shadow-sm flex flex-col justify-between">
                        <div className="flex items-center justify-between text-gray-500">
                            <span className="text-[10.5px] font-bold uppercase tracking-wider">
                                Bons à payer en attente
                            </span>
                            <Clock className="w-4 h-4 text-[#F58F20]" />
                        </div>
                        <p className="text-2xl font-black text-[#0B192C] mt-2">
                            {stats.countAttente}{' '}
                            <span className="text-xs font-normal text-gray-500">dossier(s)</span>
                        </p>
                        <span className="text-[10px] text-gray-400 mt-1">Prêts pour remise au guichet</span>
                    </div>

                    <div className="bg-white p-4 rounded border border-[#B2BED6] shadow-sm flex flex-col justify-between">
                        <div className="flex items-center justify-between text-gray-500">
                            <span className="text-[10.5px] font-bold uppercase tracking-wider">
                                Enveloppe USD à décaisser
                            </span>
                            <span className="text-[10px] font-mono font-bold text-[#04326D] bg-blue-50 px-1.5 py-0.5 rounded">
                                USD
                            </span>
                        </div>
                        <p className="text-2xl font-black text-[#04326D] mt-2 font-mono tabular-nums">
                            {money(stats.totalAttenteUSD, '$')}
                        </p>
                        <span className="text-[10px] text-gray-400 mt-1">Fonds autorisés par la Direction</span>
                    </div>

                    <div className="bg-white p-4 rounded border border-[#B2BED6] shadow-sm flex flex-col justify-between">
                        <div className="flex items-center justify-between text-gray-500">
                            <span className="text-[10.5px] font-bold uppercase tracking-wider">
                                Enveloppe FC à décaisser
                            </span>
                            <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                                CDF
                            </span>
                        </div>
                        <p className="text-2xl font-black text-[#0B192C] mt-2 font-mono tabular-nums">
                            {money(stats.totalAttenteFC, 'FC')}
                        </p>
                        <span className="text-[10px] text-gray-400 mt-1">Disponible en espèces / mobile</span>
                    </div>

                    <div className="bg-[#0B192C] p-4 rounded text-white shadow-sm flex flex-col justify-between">
                        <div className="flex items-center justify-between text-[#B2BED6]">
                            <span className="text-[10.5px] font-bold uppercase tracking-wider">
                                Décaissé ce mois (Cumul)
                            </span>
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="mt-2 font-mono tabular-nums">
                            <p className="text-lg font-bold text-emerald-300">
                                {money(stats.totalDecaisseMoisUSD, '$')}
                            </p>
                            <p className="text-xs text-gray-300 mt-0.5">
                                + {money(stats.totalDecaisseMoisFC, 'FC')}
                            </p>
                        </div>
                        <span className="text-[10px] text-[#B2BED6] mt-1">Sorties validées par PIN</span>
                    </div>
                </div>

                {/* Tableau principal avec bascule d'onglets */}
                <div className="bg-white border border-[#B2BED6] rounded shadow-sm overflow-hidden">
                    <div className="border-b border-[#E2E8F0] px-4 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setActiveTab('a_decaisser')}
                                className={`inline-flex items-center gap-2 pb-3 px-3 border-b-2 text-xs font-bold uppercase tracking-wider transition ${
                                    activeTab === 'a_decaisser'
                                        ? 'border-[#04326D] text-[#04326D]'
                                        : 'border-transparent text-gray-400 hover:text-gray-700'
                                }`}
                            >
                                <Clock className="w-3.5 h-3.5" />
                                <span>À décaisser</span>
                                <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-[#F58F20] text-white">
                                    {aDecaisser.length}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setActiveTab('historique')}
                                className={`inline-flex items-center gap-2 pb-3 px-3 border-b-2 text-xs font-bold uppercase tracking-wider transition ${
                                    activeTab === 'historique'
                                        ? 'border-[#04326D] text-[#04326D]'
                                        : 'border-transparent text-gray-400 hover:text-gray-700'
                                }`}
                            >
                                <Receipt className="w-3.5 h-3.5" />
                                <span>Journal des décaissements</span>
                                <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-gray-200 text-gray-700">
                                    {historique.length}
                                </span>
                            </button>
                        </div>

                        <div className="relative pb-2 sm:pb-0 w-full sm:w-64">
                            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Rechercher numéro, projet, nom..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 border border-[#B2BED6] rounded text-xs focus:outline-none focus:border-[#04326D]"
                            />
                        </div>
                    </div>

                    {/* VUE 1 : À DÉCAISSER */}
                    {activeTab === 'a_decaisser' && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-[#0B192C] text-white uppercase text-[10px] font-bold tracking-wider">
                                        <th className="py-3 px-4">Numéro</th>
                                        <th className="py-3 px-4">Projet & Caisse</th>
                                        <th className="py-3 px-4">Bénéficiaire / Demandeur</th>
                                        <th className="py-3 px-4">Observation</th>
                                        <th className="py-3 px-4 text-right">Montant Autorisé</th>
                                        <th className="py-3 px-4 text-center">Urgence</th>
                                        <th className="py-3 px-4 text-right">Action Guichet</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E2E8F0] text-gray-700">
                                    {filteredADecaisser.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="py-12 text-center text-gray-400 italic">
                                                <Wallet className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                                                <p className="font-semibold text-gray-600">Aucun bon à payer en attente</p>
                                                <p className="text-[11px] text-gray-400 mt-0.5">
                                                    Les réquisitions approuvées par la Direction Générale apparaîtront immédiatement ici.
                                                </p>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredADecaisser.map((req) => (
                                            <tr key={req.id} className="hover:bg-[#F9F9FF] transition">
                                                <td className="py-3.5 px-4 font-mono font-bold text-[#04326D] whitespace-nowrap">
                                                    {req.numero}
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <p className="font-bold text-[#0B192C]">{req.projet}</p>
                                                    <p className="text-[10px] text-gray-500 font-medium">
                                                        {req.caisseAttribuee}
                                                    </p>
                                                </td>
                                                <td className="py-3.5 px-4 whitespace-nowrap">
                                                    <p className="font-bold text-gray-800">{req.initiateurNom}</p>
                                                    <p className="text-[10px] text-gray-400">{req.initiateurRole}</p>
                                                </td>
                                                <td className="py-3.5 px-4 max-w-xs truncate" title={req.observation || ''}>
                                                    {req.observation || 'Sans observation'}
                                                </td>
                                                <td className="py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap text-sm text-[#0B192C]">
                                                    {money(req.montantTotal, req.devise)}
                                                </td>
                                                <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                                    {req.is_urgent ? (
                                                        <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-black text-[9px] uppercase tracking-wide">
                                                            Urgent
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400 text-[10px]">Normal</span>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                                    <div className="inline-flex items-center gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => setDetailTarget(req)}
                                                            className="p-1.5 text-gray-500 hover:text-[#04326D] hover:bg-gray-100 rounded transition"
                                                            title="Consulter les détails"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleTriggerPrint(req)}
                                                            className="p-1.5 text-gray-500 hover:text-[#04326D] hover:bg-gray-100 rounded transition"
                                                            title="Imprimer le bon"
                                                        >
                                                            <Printer className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenDisburseModal(req)}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#10B981] hover:bg-[#059669] text-white rounded font-bold text-xs shadow-sm transition active:scale-[0.98]"
                                                        >
                                                            <ArrowUpRight className="w-3.5 h-3.5" />
                                                            <span>Décaisser</span>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* VUE 2 : HISTORIQUE DÉCAISSEMENTS */}
                    {activeTab === 'historique' && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-[#0B192C] text-white uppercase text-[10px] font-bold tracking-wider">
                                        <th className="py-3 px-4">Date Décaissement</th>
                                        <th className="py-3 px-4">N° Réquisition</th>
                                        <th className="py-3 px-4">Bénéficiaire</th>
                                        <th className="py-3 px-4">Projet / Caisse</th>
                                        <th className="py-3 px-4">Règlement</th>
                                        <th className="py-3 px-4 text-right">Montant</th>
                                        <th className="py-3 px-4">Caissier</th>
                                        <th className="py-3 px-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E2E8F0] text-gray-700">
                                    {filteredHistorique.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="py-12 text-center text-gray-400 italic">
                                                Aucun décaissement enregistré dans cette sélection.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredHistorique.map((req) => (
                                            <tr key={req.id} className="hover:bg-[#F9F9FF] transition">
                                                <td className="py-3.5 px-4 whitespace-nowrap font-medium text-gray-600">
                                                    {req.date_decaissement || '—'}
                                                </td>
                                                <td className="py-3.5 px-4 font-mono font-bold text-[#04326D] whitespace-nowrap">
                                                    {req.numero}
                                                </td>
                                                <td className="py-3.5 px-4 whitespace-nowrap font-semibold text-gray-800">
                                                    {req.initiateurNom}
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <p className="font-bold text-[#0B192C]">{req.projet}</p>
                                                    <p className="text-[10px] text-gray-500">{req.caisseAttribuee}</p>
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-[#04326D]">
                                                        {req.mode_paiement || 'Espèces'}
                                                    </span>
                                                    {req.reference_paiement && (
                                                        <p className="text-[10px] font-mono text-gray-500 mt-0.5 truncate max-w-[120px]">
                                                            Réf: {req.reference_paiement}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap text-emerald-700">
                                                    {money(req.montantTotal, req.devise)}
                                                </td>
                                                <td className="py-3.5 px-4 whitespace-nowrap text-gray-600 font-medium">
                                                    {req.cashierNom || user.name}
                                                </td>
                                                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                                    <div className="inline-flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => setDetailTarget(req)}
                                                            className="p-1.5 text-gray-500 hover:text-[#04326D] hover:bg-gray-100 rounded transition"
                                                            title="Consulter"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleTriggerPrint(req)}
                                                            className="p-1.5 text-gray-500 hover:text-[#04326D] hover:bg-gray-100 rounded transition"
                                                            title="Imprimer"
                                                        >
                                                            <Printer className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* ============================================================
                MODALE : CONFIRMATION DU DÉCAISSEMENT CAISSE (CODE PIN)
            ============================================================ */}
            {disburseTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
                    <div className="bg-white rounded border border-[#B2BED6] shadow-2xl max-w-lg w-full p-6 space-y-4 animate-slide-down">
                        <header className="flex items-start justify-between border-b pb-3">
                            <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                                    <Wallet className="w-5 h-5 text-emerald-700" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-[#0B192C] uppercase tracking-wide">
                                        Validation de Sortie de Caisse
                                    </h3>
                                    <p className="text-[11px] text-gray-500">
                                        Réquisition N° <strong className="font-mono text-[#04326D]">{disburseTarget.numero}</strong>
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setDisburseTarget(null)}
                                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </header>

                        <div className="p-3 bg-blue-50/60 border border-blue-200 rounded flex justify-between items-center text-xs">
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                                    Bénéficiaire / Demandeur
                                </span>
                                <strong className="text-[#0B192C]">{disburseTarget.initiateurNom}</strong>
                                <span className="text-[11px] text-gray-500 block">{disburseTarget.projet}</span>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                                    Montant à remettre
                                </span>
                                <span className="text-base font-black font-mono text-emerald-700">
                                    {money(disburseTarget.montantTotal, disburseTarget.devise)}
                                </span>
                            </div>
                        </div>

                        {pinError && (
                            <div className="p-3 bg-red-50 border border-red-300 text-red-800 rounded text-xs flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>{pinError}</span>
                            </div>
                        )}

                        <form onSubmit={handleConfirmDisbursement} className="space-y-3.5 text-xs">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">
                                        Mode de Décaissement *
                                    </label>
                                    <select
                                        value={modePaiement}
                                        onChange={(e) => setModePaiement(e.target.value)}
                                        className="w-full border border-[#B2BED6] rounded p-2 text-xs font-bold text-[#0B192C] bg-white focus:outline-none focus:border-[#04326D]"
                                    >
                                        <option value="Espèces">Espèces (Cash)</option>
                                        <option value="Chèque">Chèque Bancaire</option>
                                        <option value="Virement bancaire">Virement Bancaire</option>
                                        <option value="Airtel Money">Airtel Money</option>
                                        <option value="M-Pesa">M-Pesa</option>
                                        <option value="Orange Money">Orange Money</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">
                                        Référence / Pièce Justificative
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="ex: N° Chèque 004125 / N° Reçu"
                                        value={refPaiement}
                                        onChange={(e) => setRefPaiement(e.target.value)}
                                        className="w-full border border-[#B2BED6] rounded p-2 text-xs font-mono focus:outline-none focus:border-[#04326D]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">
                                    Observation du Caissier (Optionnelle)
                                </label>
                                <input
                                    type="text"
                                    placeholder="Précision sur la remise ou quittance..."
                                    value={notePaiement}
                                    onChange={(e) => setNotePaiement(e.target.value)}
                                    className="w-full border border-[#B2BED6] rounded p-2 text-xs focus:outline-none focus:border-[#04326D]"
                                />
                            </div>

                            <div className="p-3 bg-amber-50/70 border border-amber-300 rounded space-y-2">
                                <label className="block text-[11px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                                    <Lock className="w-3.5 h-3.5 text-amber-800" />
                                    <span>Code PIN du Caissier (Obligatoire) *</span>
                                </label>
                                <div className="relative">
                                    <KeyRound className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    <input
                                        type="password"
                                        maxLength={6}
                                        placeholder="Code PIN personnel (4 à 6 chiffres)"
                                        value={pin}
                                        onChange={(e) => setPin(e.target.value)}
                                        className="w-full pl-8 pr-3 py-2 border border-amber-300 bg-white rounded text-xs font-mono tracking-widest text-[#0B192C] focus:outline-none focus:ring-1 focus:ring-amber-500"
                                        autoFocus
                                        required
                                    />
                                </div>
                                <p className="text-[10px] text-gray-500 leading-tight">
                                    Cette signature électronique infalsifiable atteste de la remise physique des fonds et clôture l'opération en base de données.
                                </p>
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t">
                                <button
                                    type="button"
                                    onClick={() => setDisburseTarget(null)}
                                    disabled={processing}
                                    className="px-3.5 py-1.5 border border-[#B2BED6] rounded text-xs font-semibold text-gray-600 hover:bg-gray-50"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 text-white rounded text-xs font-bold shadow transition"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span>{processing ? 'Décaissement...' : 'Confirmer & Décaisser'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ============================================================
                MODALE : DÉTAIL DE LA RÉQUISITION & ARTICLES
            ============================================================ */}
            {detailTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
                    <div className="bg-white rounded border border-[#B2BED6] shadow-2xl max-w-3xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-slide-down">
                        <header className="flex items-start justify-between border-b pb-3">
                            <div>
                                <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400">
                                    Consultation Dossier Caisse
                                </span>
                                <h3 className="text-base font-bold text-[#0B192C] flex items-center gap-2">
                                    <span>N° {detailTarget.numero}</span>
                                    <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-[#04326D] font-mono">
                                        {detailTarget.nature}
                                    </span>
                                </h3>
                                <p className="text-[11px] text-gray-500 mt-0.5">
                                    Projet : <strong>{detailTarget.projet}</strong> • Caisse : <strong>{detailTarget.caisseAttribuee}</strong>
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setDetailTarget(null)}
                                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </header>

                        {detailTarget.observation && (
                            <div className="p-3 bg-gray-50 border rounded text-xs text-gray-700">
                                <strong>Observation :</strong> {detailTarget.observation}
                            </div>
                        )}

                        <div>
                            <h4 className="text-xs font-bold text-[#0B192C] uppercase tracking-wider mb-2">
                                Articles & Lignes budgétaires autorisées
                            </h4>
                            <table className="w-full text-left text-xs border border-[#E2E8F0] rounded overflow-hidden">
                                <thead className="bg-[#F1F5F9] font-bold text-gray-600">
                                    <tr>
                                        <th className="p-2">Désignation</th>
                                        <th className="p-2">Code Budget (MP)</th>
                                        <th className="p-2 text-center">Qté / Durée</th>
                                        <th className="p-2 text-right">Prix Unit.</th>
                                        <th className="p-2 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E2E8F0] text-gray-700">
                                    {detailTarget.lignes.map((line) => (
                                        <tr key={line.id}>
                                            <td className="p-2 font-medium">{line.activite}</td>
                                            <td className="p-2 font-mono font-bold text-[#04326D]">
                                                {line.codeAllocation || '—'}
                                            </td>
                                            <td className="p-2 text-center">
                                                {line.quantiteOuDuree} {line.unite}
                                            </td>
                                            <td className="p-2 text-right">
                                                {money(line.prixUnitaire, detailTarget.devise)}
                                            </td>
                                            <td className="p-2 text-right font-bold">
                                                {money(line.total, detailTarget.devise)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-[#F1F5F9] font-bold border-t">
                                    <tr>
                                        <td colSpan={4} className="p-2 text-right text-gray-600">
                                            Montant Total :
                                        </td>
                                        <td className="p-2 text-right font-mono text-sm text-[#04326D]">
                                            {money(detailTarget.montantTotal, detailTarget.devise)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        <div>
                            <h4 className="text-xs font-bold text-[#0B192C] uppercase tracking-wider mb-2">
                                Signatures Électroniques Apposées ({detailTarget.signatures.length})
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                                {detailTarget.signatures.map((sig, idx) => (
                                    <div key={idx} className="p-2.5 bg-gray-50 border rounded space-y-0.5">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-[#04326D] uppercase">
                                                {sig.role.replace('_', ' ')}
                                            </span>
                                            <span className="text-[10px] text-gray-400">{sig.date}</span>
                                        </div>
                                        <p className="font-semibold text-gray-800">{sig.nom}</p>
                                        <p className="font-mono text-[9px] text-gray-500 truncate">
                                            Réf: {sig.code || sig.hash.substring(0, 16)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end pt-3 border-t">
                            <button
                                type="button"
                                onClick={() => setDetailTarget(null)}
                                className="px-4 py-1.5 bg-[#04326D] text-white rounded text-xs font-bold"
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Zone d'impression officielle */}
            {printTarget && (
                <div id="bon-pasteur-print-zone">
                    <OfficialPrintSheet requisition={printTarget as any} />
                </div>
            )}
        </AppLayout>
    );
}