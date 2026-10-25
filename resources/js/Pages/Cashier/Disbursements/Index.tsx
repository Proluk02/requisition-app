import { useEffect, useMemo, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { PageProps } from '@/types';
import { numberToWordsFR } from '@/lib/numberToWords';
import { openPrintPreview } from '@/lib/printPreview';
import {
    ArrowUpRight,
    Building2,
    CheckCircle2,
    Clock,
    Printer,
    Search,
    Lock,
    KeyRound,
    AlertCircle,
    X,
    AlertTriangle,
    Info,
    FileText,
    ShieldCheck,
    Layers,
} from 'lucide-react';

interface SplitOption {
    id: string;
    code_allocation: string;
    libelle_allocation: string;
    montant: number;
}

interface CaisseOption {
    id: string;
    name: string;
    devise: string;
    solde_actuel: number;
    is_ouverte: boolean;
    pending_count?: number;
}

interface LigneItem {
    id: string;
    activite: string;
    codeAllocation: string | null;
    quantiteOuDuree: number;
    unite: string;
    prixUnitaire: number;
    total: number;
    splits: SplitOption[];
}

interface RequisitionItem {
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
    dateSoumission: string;
    lignes: LigneItem[];
}

interface MovementBSC {
    id: string;
    numero_piece: string;
    date_mouvement: string;
    tiers_nom: string;
    montant: number;
    devise: string;
    montant_en_lettres: string;
    motif: string;
    imputation: string;
    mode_paiement: string;
    reference_externe: string | null;
    caisse_nom?: string;
    cashier_nom?: string;
}

interface Props extends PageProps {
    userCaisses: CaisseOption[];
    selectedCaisse: CaisseOption | null;
    aDecaisser: RequisitionItem[];
    recentDisbursements: MovementBSC[];
}

const money = (n: number, dev: string) =>
    `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${dev}`;

export default function DisbursementsIndex({
    userCaisses = [],
    selectedCaisse,
    aDecaisser = [],
    recentDisbursements = [],
}: Props) {
    const { flash } = usePage<PageProps>().props;

    const [activeTab, setActiveTab] = useState<'a_decaisser' | 'historique'>('a_decaisser');
    const [search, setSearch] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const [disburseReq, setDisburseReq] = useState<RequisitionItem | null>(null);
    const [printBSC, setPrintBSC] = useState<MovementBSC | null>(null);
    const [confirmStep, setConfirmStep] = useState(false);

    useEffect(() => {
        const offStart = router.on('start', () => setIsLoading(true));
        const offFinish = router.on('finish', () => setIsLoading(false));
        return () => {
            offStart();
            offFinish();
        };
    }, []);

    useEffect(() => {
        if (!printBSC) return;
        void openPrintPreview('bon-sortie-caisse-print').then(() => setPrintBSC(null));
    }, [printBSC]);

    // ESC pour fermer la modale + reset du confirm step
    useEffect(() => {
        if (!disburseReq) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setDisburseReq(null);
                setConfirmStep(false);
            }
        };
        window.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [disburseReq]);

    // Ctrl/Cmd + K focus la recherche
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                document.querySelector<HTMLInputElement>('input[data-search-input]')?.focus();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const [modePaiement, setModePaiement] = useState('Espèces');
    const [refPaiement, setRefPaiement] = useState('');
    const [montantLettres, setMontantLettres] = useState('');
    const [note, setNote] = useState('');
    const [pin, setPin] = useState('');
    const [pinError, setPinError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const handleSelectCaisse = (id: string) => {
        router.get(
            route('cashier.disbursements.index'),
            { caisse_id: id },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handleOpenDisburse = (req: RequisitionItem) => {
        setDisburseReq(req);
        setModePaiement('Espèces');
        setRefPaiement('');
        setMontantLettres(numberToWordsFR(req.montantTotal, req.devise as any));
        setNote('');
        setPin('');
        setPinError(null);
        setConfirmStep(false);
    };

    const handleCloseDisburse = () => {
        setDisburseReq(null);
        setConfirmStep(false);
        setPinError(null);
    };

    const soldeDisponible = selectedCaisse?.solde_actuel ?? 0;
    const isFondsInsuffisants = disburseReq ? soldeDisponible < disburseReq.montantTotal : false;
    const isCaisseAZero = soldeDisponible <= 0;

    const handleSubmitDisburse = (e: React.FormEvent) => {
        e.preventDefault();
        if (!disburseReq || isFondsInsuffisants || isCaisseAZero) return;

        if (!confirmStep) {
            setConfirmStep(true);
            return;
        }

        setSubmitting(true);
        setPinError(null);

        router.patch(
            route('requisitions.cashier-disburse', disburseReq.id),
            {
                mode_paiement: modePaiement,
                reference_paiement: refPaiement.trim() || null,
                montant_en_lettres: montantLettres.trim(),
                observation: note.trim() || null,
                pin: pin.trim(),
            },
            {
                preserveScroll: true,
                onFinish: () => {
                    setSubmitting(false);
                    setConfirmStep(false);
                },
                onSuccess: () => handleCloseDisburse(),
                onError: (errs) => {
                    setConfirmStep(false);
                    setPinError(errs.pin || Object.values(errs)[0] || 'Erreur lors du décaissement.');
                },
            }
        );
    };

    const handleTriggerPrint = (bsc: MovementBSC) => {
        setPrintBSC(bsc);
    };

    const filteredADecaisser = useMemo(() => {
        return aDecaisser.filter((r) =>
            r.numero.toLowerCase().includes(search.toLowerCase()) ||
            r.projet.toLowerCase().includes(search.toLowerCase()) ||
            r.initiateurNom.toLowerCase().includes(search.toLowerCase())
        );
    }, [aDecaisser, search]);

    const filteredBSC = useMemo(() => {
        return recentDisbursements.filter((b) =>
            b.numero_piece.toLowerCase().includes(search.toLowerCase()) ||
            b.tiers_nom.toLowerCase().includes(search.toLowerCase()) ||
            b.imputation.toLowerCase().includes(search.toLowerCase())
        );
    }, [recentDisbursements, search]);

    return (
        <AppLayout>
            <Head title="Bons à Décaisser — Guichet Caisse" />

            <style>{`
                @media print {
                    nav, aside, header, .no-print-area, button, select {
                        display: none !important;
                    }
                    #bon-sortie-caisse-print {
                        display: block !important;
                        position: fixed;
                        left: 50%;
                        top: 20px;
                        transform: translateX(-50%);
                        width: 148mm !important;
                        background: white !important;
                        color: black !important;
                    }
                }
                @media screen {
                    #bon-sortie-caisse-print { display: none; }
                }
            `}</style>

            {isLoading && (
                <div className="fixed top-0 left-0 right-0 h-0.5 bg-[#04326D] z-[100] animate-pulse" />
            )}

            <div className="space-y-6 no-print-area">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
                    <div>
                        <nav className="text-[10px] font-bold uppercase tracking-widest text-[#B2BED6] mb-1.5 flex items-center gap-1.5">
                            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Guichet Caisse</span>
                            <span className="mx-1">/</span>
                            <span className="text-[#04326D]">Bons à Décaisser</span>
                        </nav>
                        <h1 className="text-xl font-bold text-[#0B192C]">
                            Décaissements & Bons de Sortie Caisse (BSC)
                        </h1>
                        <p className="text-[12px] text-gray-500 mt-1">
                            Traitement des réquisitions validées et délivrance officielle du Bon de Sortie Caisse.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className={`p-2 px-3 bg-white border rounded text-right ${isCaisseAZero ? 'border-red-400 bg-red-50' : 'border-[#B2BED6]'}`}>
                            <span className="text-[10px] font-bold text-gray-500 uppercase block">Solde en caisse :</span>
                            <strong className={`text-sm font-mono ${isCaisseAZero ? 'text-red-700' : 'text-[#04326D]'}`}>
                                {money(soldeDisponible, selectedCaisse?.devise ?? '')}
                            </strong>
                        </div>

                        {userCaisses.length > 1 && (
                            <div className="flex items-center gap-2 bg-white border border-[#B2BED6] rounded px-3 py-1.5">
                                <Building2 className="w-4 h-4 text-[#04326D]" />
                                <select
                                    value={selectedCaisse?.id ?? ''}
                                    onChange={(e) => handleSelectCaisse(e.target.value)}
                                    className="border-none bg-transparent text-[12px] font-bold text-[#04326D] focus:outline-none cursor-pointer"
                                >
                                    {userCaisses.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name} ({c.devise}) {c.pending_count ? `• ${c.pending_count} en attente` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </header>

                {isCaisseAZero && (
                    <div className="p-3.5 rounded bg-red-50 border border-red-300 text-red-900 text-xs font-semibold flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-700 shrink-0" />
                        <span>
                            <strong>Caisse à zéro ({money(0, selectedCaisse?.devise ?? '')}) :</strong> Aucun décaissement n'est permis. Veuillez effectuer un approvisionnement (BEC) pour continuer les sorties.
                        </span>
                    </div>
                )}

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

                {/* Encart pédagogique */}
                <details className="bg-blue-50/60 border border-blue-200 rounded text-xs text-blue-900">
                    <summary className="cursor-pointer font-bold px-3.5 py-2 flex items-center gap-1.5 select-none">
                        <Info className="w-3.5 h-3.5" />
                        <span>Qu'est-ce qu'un Bon de Sortie Caisse (BSC) ?</span>
                    </summary>
                    <div className="px-3.5 pb-3 leading-relaxed text-[11.5px]">
                        Le <strong>BSC</strong> est le document officiel qui prouve la sortie d'argent de la caisse.
                        Il est généré automatiquement après validation du PIN caissier et sert de preuve comptable.
                        Le bénéficiaire doit le signer à la réception des fonds. Vous pouvez le réimprimer à tout moment depuis l'onglet <em>Bons de Sortie Récents</em>.
                    </div>
                </details>

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
                                <span>Bons à Payer en attente</span>
                                <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-[#F58F20] text-white font-mono font-bold">
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
                                <ArrowUpRight className="w-3.5 h-3.5" />
                                <span>Bons de Sortie Récents (BSC)</span>
                                <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-bold font-mono">
                                    {recentDisbursements.length}
                                </span>
                            </button>
                        </div>

                        <div className="relative pb-2 sm:pb-0 w-full sm:w-64">
                            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                                data-search-input
                                type="text"
                                placeholder="Rechercher (Ctrl+K)..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 border border-[#B2BED6] rounded text-xs focus:outline-none focus:border-[#04326D]"
                            />
                        </div>
                    </div>

                    {activeTab === 'a_decaisser' && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-[#0B192C] text-white uppercase text-[10px] font-bold tracking-wider">
                                        <th className="py-3 px-4">Numéro</th>
                                        <th className="py-3 px-4">Projet & Caisse</th>
                                        <th className="py-3 px-4">Bénéficiaire</th>
                                        <th className="py-3 px-4 text-right">Montant Autorisé</th>
                                        <th className="py-3 px-4 text-center">Urgence</th>
                                        <th className="py-3 px-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E2E8F0] text-gray-700">
                                    {filteredADecaisser.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="py-12 text-center text-gray-400 italic">
                                                {search
                                                    ? `Aucun résultat pour « ${search} ».`
                                                    : `Aucune réquisition en attente de décaissement pour cette caisse (${selectedCaisse?.name}).`}
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredADecaisser.map((req) => {
                                            const isManqueFonds = soldeDisponible < req.montantTotal;
                                            const manque = req.montantTotal - soldeDisponible;
                                            return (
                                                <tr key={req.id} className="hover:bg-[#F9F9FF] transition">
                                                    <td className="py-3.5 px-4 font-mono font-bold text-[#04326D] whitespace-nowrap">
                                                        {req.numero}
                                                    </td>
                                                    <td className="py-3.5 px-4">
                                                        <p className="font-bold text-[#0B192C]">{req.projet}</p>
                                                        <p className="text-[10px] text-gray-500">{req.caisseAttribuee}</p>
                                                    </td>
                                                    <td className="py-3.5 px-4 whitespace-nowrap font-bold text-gray-800">
                                                        {req.initiateurNom}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                                        <p className="font-mono font-bold text-sm text-[#0B192C]">
                                                            {money(req.montantTotal, req.devise)}
                                                        </p>
                                                        {isManqueFonds && (
                                                            <p className="text-[10px] text-red-600 font-bold mt-0.5">
                                                                Manque {money(manque, req.devise)}
                                                            </p>
                                                        )}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                                        {req.is_urgent ? (
                                                            <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-black text-[9px] uppercase">
                                                                Urgent
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-400 text-[10px]">Normal</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                                        {isManqueFonds ? (
                                                            <button
                                                                type="button"
                                                                disabled
                                                                title={`Solde insuffisant : il manque ${money(manque, req.devise)}. Approvisionnez la caisse via un BEC.`}
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded font-bold text-xs bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                                                            >
                                                                <Lock className="w-3.5 h-3.5" />
                                                                <span>Fonds insuffisants</span>
                                                            </button>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenDisburse(req)}
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded font-bold text-xs shadow-sm transition active:scale-[0.98] bg-[#10B981] hover:bg-[#059669] text-white"
                                                            >
                                                                <ArrowUpRight className="w-3.5 h-3.5" />
                                                                <span>Décaisser & Émettre BSC</span>
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'historique' && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-[#0B192C] text-white uppercase text-[10px] font-bold tracking-wider">
                                        <th className="py-3 px-4">N° Bon Sortie</th>
                                        <th className="py-3 px-4">Date</th>
                                        <th className="py-3 px-4">Payer à (Bénéficiaire)</th>
                                        <th className="py-3 px-4">Imputation</th>
                                        <th className="py-3 px-4 text-right">Montant</th>
                                        <th className="py-3 px-4 text-right">Imprimer</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E2E8F0] text-gray-700">
                                    {filteredBSC.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="py-12 text-center text-gray-400 italic">
                                                {search
                                                    ? `Aucun résultat pour « ${search} ».`
                                                    : 'Aucun Bon de Sortie Caisse émis récemment.'}
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredBSC.map((bsc) => (
                                            <tr key={bsc.id} className="hover:bg-[#F9F9FF] transition">
                                                <td className="py-3.5 px-4 font-mono font-bold text-[#04326D] whitespace-nowrap">
                                                    {bsc.numero_piece}
                                                </td>
                                                <td className="py-3.5 px-4 whitespace-nowrap text-gray-600">
                                                    {bsc.date_mouvement}
                                                </td>
                                                <td className="py-3.5 px-4 font-semibold text-gray-800">
                                                    {bsc.tiers_nom}
                                                </td>
                                                <td className="py-3.5 px-4 font-mono font-bold text-gray-600">
                                                    {bsc.imputation}
                                                </td>
                                                <td className="py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap text-red-700">
                                                    - {money(bsc.montant, bsc.devise)}
                                                </td>
                                                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleTriggerPrint(bsc)}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 border border-[#04326D] text-[#04326D] hover:bg-blue-50 rounded text-[11px] font-bold transition"
                                                    >
                                                        <Printer className="w-3.5 h-3.5" />
                                                        <span>Imprimer BSC</span>
                                                    </button>
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

            {/* MODALE : Décaissement (AVEC AFFICHAGE DES SPLITS / VENTILATIONS) */}
            {disburseReq && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 animate-fade-in"
                    onClick={(e) => e.target === e.currentTarget && handleCloseDisburse()}
                >
                    <div className="bg-white rounded border border-[#B2BED6] shadow-2xl max-w-2xl w-full p-6 space-y-4 animate-slide-down max-h-[95vh] overflow-y-auto">
                        <header className="flex items-start justify-between border-b pb-3">
                            <div>
                                <h3 className="text-sm font-bold text-[#0B192C] uppercase tracking-wide">
                                    Émission du Bon de Sortie Caisse (BSC)
                                </h3>
                                <p className="text-[11px] text-gray-500">
                                    Réquisition N° <strong className="font-mono text-[#04326D]">{disburseReq.numero}</strong>
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleCloseDisburse}
                                aria-label="Fermer"
                                className="text-gray-400 hover:text-gray-600 font-bold"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </header>

                        {isFondsInsuffisants && (
                            <div className="p-3.5 bg-red-50 border-2 border-red-300 rounded text-red-900 text-xs space-y-1">
                                <div className="flex items-center gap-1.5 font-bold text-red-800">
                                    <AlertTriangle className="w-4 h-4 text-red-700 shrink-0" />
                                    <span>Solde Insuffisant en Caisse</span>
                                </div>
                                <p className="leading-snug text-[11px]">
                                    Le solde actuel du guichet (<strong>{money(soldeDisponible, selectedCaisse?.devise ?? '')}</strong>) ne permet pas de décaisser le montant de <strong>{money(disburseReq.montantTotal, disburseReq.devise)}</strong>.
                                    Le décaissement est bloqué jusqu'à approvisionnement de la caisse via un Bon d'Entrée (BEC).
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-blue-50/60 border border-blue-200 rounded flex flex-col justify-center text-xs">
                                <span className="text-[10px] font-bold uppercase text-gray-500 block mb-0.5">
                                    Bénéficiaire
                                </span>
                                <strong className="text-[#0B192C] text-sm">{disburseReq.initiateurNom}</strong>
                                <span className="text-[11px] text-gray-500 block">{disburseReq.projet}</span>
                            </div>
                            <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded flex flex-col justify-center text-right text-xs">
                                <span className="text-[10px] font-bold uppercase text-gray-500 block mb-0.5">
                                    Montant à décaisser
                                </span>
                                <span className="text-xl font-black font-mono text-emerald-700">
                                    {money(disburseReq.montantTotal, disburseReq.devise)}
                                </span>
                            </div>
                        </div>

                        {/* NOUVEAU: Récapitulatif visuel des Imputations et Splits pour rassurer le caissier */}
                        <div className="bg-gray-50 border border-gray-200 rounded p-3 text-xs max-h-40 overflow-y-auto">
                            <h4 className="font-bold text-gray-700 flex items-center gap-1.5 uppercase tracking-wider text-[10px] mb-2 border-b border-gray-200 pb-1">
                                <FileText className="w-3.5 h-3.5" />
                                Détail des imputations (Déduit automatiquement en Euro)
                            </h4>
                            <ul className="space-y-2.5">
                                {disburseReq.lignes.map((art) => (
                                    <li key={art.id} className="flex flex-col">
                                        <div className="flex justify-between items-start gap-2">
                                            <span className="font-semibold text-gray-800 text-[11px] leading-tight truncate" title={art.activite}>
                                                {art.activite}
                                            </span>
                                        </div>
                                        {art.splits && art.splits.length > 0 ? (
                                            <div className="pl-3 border-l-2 border-purple-300 space-y-1 mt-1">
                                                <div className="text-[9px] text-purple-700 font-bold uppercase tracking-wide flex items-center gap-1">
                                                    <Layers className="w-3 h-3" /> Ventilation Multi-Lignes
                                                </div>
                                                {art.splits.map((s) => (
                                                    <div key={s.id} className="flex justify-between items-center text-[10px]">
                                                        <span className="font-mono font-bold text-purple-700 bg-purple-50 px-1 rounded border border-purple-100">
                                                            {s.code_allocation || 'Non spécifié'}
                                                        </span>
                                                        <span className="text-gray-600 font-mono font-medium">{money(s.montant, disburseReq.devise)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex justify-between items-center text-[10px] pl-3 border-l-2 border-[#04326D] mt-1">
                                                <span className="font-mono font-bold text-[#04326D] bg-blue-50 px-1 rounded border border-blue-100">
                                                    {art.codeAllocation || 'Non spécifié'}
                                                </span>
                                                <span className="text-gray-600 font-mono font-medium">{money(art.total, disburseReq.devise)}</span>
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {pinError && (
                            <div className="p-3 bg-red-50 border border-red-300 text-red-800 rounded text-xs flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>{pinError}</span>
                            </div>
                        )}

                        {confirmStep && (
                            <div className="p-3 bg-amber-50 border-2 border-amber-400 rounded text-amber-950 text-xs space-y-1">
                                <div className="flex items-center gap-1.5 font-bold">
                                    <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                                    <span>Confirmation finale requise</span>
                                </div>
                                <p className="leading-snug text-[11px]">
                                    Vous allez débiter <strong>{money(disburseReq.montantTotal, disburseReq.devise)}</strong> de la caisse.
                                    Cette opération est <strong>irréversible</strong> et générera automatiquement un BSC avec déduction budgétaire.
                                    Cliquez à nouveau sur le bouton vert pour confirmer.
                                </p>
                            </div>
                        )}

                        <form onSubmit={handleSubmitDisburse} className="space-y-3.5 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Mode de Paiement *</label>
                                    <select
                                        value={modePaiement}
                                        onChange={(e) => setModePaiement(e.target.value)}
                                        disabled={isFondsInsuffisants || confirmStep}
                                        className="w-full border border-[#B2BED6] rounded p-2 text-xs font-bold text-[#0B192C] bg-white focus:outline-none focus:border-[#04326D] disabled:bg-gray-100"
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
                                    <label className="block font-bold text-gray-700 mb-1">Réf / N° Chèque</label>
                                    <input
                                        type="text"
                                        placeholder="ex: CHQ-002158"
                                        value={refPaiement}
                                        onChange={(e) => setRefPaiement(e.target.value)}
                                        disabled={isFondsInsuffisants || confirmStep}
                                        className="w-full border border-[#B2BED6] rounded p-2 text-xs font-mono focus:outline-none focus:border-[#04326D] disabled:bg-gray-100"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Montant en Toutes Lettres *</label>
                                <input
                                    type="text"
                                    value={montantLettres}
                                    onChange={(e) => setMontantLettres(e.target.value)}
                                    disabled={isFondsInsuffisants || confirmStep}
                                    className="w-full border border-[#B2BED6] rounded p-2 text-xs font-semibold focus:outline-none focus:border-[#04326D] disabled:bg-gray-100"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Note / Observation (optionnelle)</label>
                                <input
                                    type="text"
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    disabled={isFondsInsuffisants || confirmStep}
                                    placeholder="Précision pour la traçabilité..."
                                    className="w-full border border-[#B2BED6] rounded p-2 text-xs focus:outline-none focus:border-[#04326D] disabled:bg-gray-100"
                                />
                            </div>

                            <div className="p-3 bg-amber-50 border border-amber-300 rounded space-y-2">
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
                                        className="w-full pl-8 pr-3 py-2 border border-amber-300 bg-white rounded text-lg text-center font-mono tracking-widest text-[#0B192C] focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:bg-gray-100"
                                        autoFocus
                                        required
                                        disabled={isFondsInsuffisants || confirmStep}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t">
                                <button
                                    type="button"
                                    onClick={handleCloseDisburse}
                                    className="px-3.5 py-1.5 border border-[#B2BED6] rounded text-xs font-semibold text-gray-600 hover:bg-gray-50"
                                >
                                    Fermer
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting || isFondsInsuffisants}
                                    className={`px-4 py-1.5 text-white rounded text-xs font-bold shadow transition disabled:opacity-40 disabled:cursor-not-allowed ${
                                        confirmStep
                                            ? 'bg-amber-600 hover:bg-amber-700'
                                            : 'bg-[#10B981] hover:bg-[#059669]'
                                    }`}
                                >
                                    {submitting
                                        ? 'Traitement en cours...'
                                        : isFondsInsuffisants
                                        ? 'Fonds Insuffisants (Rejet)'
                                        : confirmStep
                                        ? `Confirmer le décaissement`
                                        : 'Valider & Décaisser'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* FORMAT D'IMPRESSION OFFICIEL BSC */}
            {printBSC && (
                <div id="bon-sortie-caisse-print" className="p-6 border-2 border-black font-serif text-black space-y-4">
                    <div className="flex items-start justify-between border-b-2 border-black pb-2">
                        <div className="text-[10px] leading-tight">
                            <p className="font-bold uppercase tracking-wider">Bon Pasteur A.S.B.L.</p>
                            <p>N° 04, Avenue Bon Pasteur contre Sendwe,</p>
                            <p>Quartier Kanina, Commune Dilala,</p>
                            <p>Ville de Kolwezi, Province du Lualaba/RDC</p>
                            <p className="italic">Référence : Concession Domaine Mariale</p>
                        </div>
                        <div className="text-right">
                            <span className="text-sm font-bold block border-2 border-black px-3 py-1 font-mono">
                                {printBSC.montant.toLocaleString('fr-FR')} {printBSC.devise}
                            </span>
                        </div>
                    </div>

                    <div className="text-center">
                        <h2 className="text-base font-black uppercase tracking-wider underline">
                            Bon de Sortie Caisse N° {printBSC.numero_piece}
                        </h2>
                    </div>

                    <div className="text-xs space-y-2 pt-2 leading-relaxed">
                        <p>
                            <strong>Veuillez payer à Mr, Mme :</strong>{' '}
                            <span className="border-b border-dotted border-black inline-block min-w-[280px]">
                                {printBSC.tiers_nom}
                            </span>
                        </p>
                        <p>
                            <strong>La somme de (en lettre) :</strong>{' '}
                            <span className="border-b border-dotted border-black inline-block min-w-[280px]">
                                {printBSC.montant_en_lettres}
                            </span>
                        </p>
                        <p>
                            <strong>En règlement de :</strong>{' '}
                            <span className="border-b border-dotted border-black inline-block min-w-[280px]">
                                {printBSC.motif}
                            </span>
                        </p>
                        <p>
                            <strong>Imputation(s) :</strong>{' '}
                            <span className="border-b border-dotted border-black inline-block min-w-[280px] font-mono font-bold">
                                {printBSC.imputation}
                            </span>
                        </p>
                        <p className="text-right pt-2">
                            <strong>Fait à :</strong> Kolwezi, le{' '}
                            <span className="border-b border-dotted border-black inline-block min-w-[100px] text-center">
                                {printBSC.date_mouvement}
                            </span>
                        </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-6 text-center text-xs">
                        <div className="space-y-10">
                            <strong className="block underline uppercase">Le Caissier</strong>
                            <p className="font-bold">{printBSC.cashier_nom || 'Signé électroniquement'}</p>
                        </div>
                        <div className="space-y-10">
                            <strong className="block underline uppercase">Le Bénéficiaire</strong>
                            <p className="font-bold">{printBSC.tiers_nom}</p>
                        </div>
                        <div className="space-y-10">
                            <strong className="block underline uppercase">Le Responsable</strong>
                            <p className="font-bold">Approuvé Direction</p>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}