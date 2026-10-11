import { useMemo, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { PageProps } from '@/types';
import { numberToWordsFR } from '@/lib/numberToWords';
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
} from 'lucide-react';

interface CaisseOption {
    id: string;
    name: string;
    devise: string;
    solde_actuel: number;
    is_ouverte: boolean;
}

interface LigneItem {
    id: string;
    activite: string;
    codeAllocation: string | null;
    quantiteOuDuree: number;
    unite: string;
    prixUnitaire: number;
    total: number;
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

    const [disburseReq, setDisburseReq] = useState<RequisitionItem | null>(null);
    const [printBSC, setPrintBSC] = useState<MovementBSC | null>(null);

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
    };

    const soldeDisponible = selectedCaisse?.solde_actuel ?? 0;
    const isFondsInsuffisants = disburseReq ? soldeDisponible < disburseReq.montantTotal : false;
    const isCaisseAZero = soldeDisponible <= 0;

    const handleSubmitDisburse = (e: React.FormEvent) => {
        e.preventDefault();
        if (!disburseReq || isFondsInsuffisants || isCaisseAZero) return;

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
                onFinish: () => setSubmitting(false),
                onSuccess: () => setDisburseReq(null),
                onError: (errs) => {
                    setPinError(errs.pin || Object.values(errs)[0] || 'Erreur lors du décaissement.');
                },
            }
        );
    };

    const handleTriggerPrint = (bsc: MovementBSC) => {
        setPrintBSC(bsc);
        setTimeout(() => window.print(), 300);
    };

    const filteredADecaisser = useMemo(() => {
        return aDecaisser.filter((r) =>
            r.numero.toLowerCase().includes(search.toLowerCase()) ||
            r.projet.toLowerCase().includes(search.toLowerCase()) ||
            r.initiateurNom.toLowerCase().includes(search.toLowerCase())
        );
    }, [aDecaisser, search]);

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
                                            {c.name} ({c.devise})
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
                                type="text"
                                placeholder="Rechercher numéro, projet, nom..."
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
                                                Aucune réquisition en attente de décaissement pour cette caisse.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredADecaisser.map((req) => {
                                            const isManqueFonds = soldeDisponible < req.montantTotal;
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
                                                    <td className="py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap text-sm text-[#0B192C]">
                                                        {money(req.montantTotal, req.devise)}
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
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenDisburse(req)}
                                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded font-bold text-xs shadow-sm transition active:scale-[0.98] ${
                                                                isManqueFonds
                                                                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                                                    : 'bg-[#10B981] hover:bg-[#059669] text-white'
                                                            }`}
                                                        >
                                                            <ArrowUpRight className="w-3.5 h-3.5" />
                                                            <span>{isManqueFonds ? 'Bloqué (Fonds insuffisants)' : 'Décaisser & Émettre BSC'}</span>
                                                        </button>
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
                                    {recentDisbursements.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="py-12 text-center text-gray-400 italic">
                                                Aucun Bon de Sortie Caisse émis récemment.
                                            </td>
                                        </tr>
                                    ) : (
                                        recentDisbursements.map((bsc) => (
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

            {/* MODALE : Décaissement */}
            {disburseReq && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
                    <div className="bg-white rounded border border-[#B2BED6] shadow-2xl max-w-lg w-full p-6 space-y-4 animate-slide-down">
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
                                onClick={() => setDisburseReq(null)}
                                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </header>

                        {/* Bloc alerte si solde insuffisant */}
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

                        <div className="p-3 bg-blue-50/60 border border-blue-200 rounded flex justify-between items-center text-xs">
                            <div>
                                <span className="text-[10px] font-bold uppercase text-gray-500 block">
                                    Bénéficiaire
                                </span>
                                <strong className="text-[#0B192C]">{disburseReq.initiateurNom}</strong>
                                <span className="text-[11px] text-gray-500 block">{disburseReq.projet}</span>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] font-bold uppercase text-gray-500 block">
                                    Montant à décaisser
                                </span>
                                <span className="text-base font-black font-mono text-red-700">
                                    {money(disburseReq.montantTotal, disburseReq.devise)}
                                </span>
                            </div>
                        </div>

                        {pinError && (
                            <div className="p-3 bg-red-50 border border-red-300 text-red-800 rounded text-xs flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>{pinError}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmitDisburse} className="space-y-3.5 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Mode de Paiement *</label>
                                    <select
                                        value={modePaiement}
                                        onChange={(e) => setModePaiement(e.target.value)}
                                        disabled={isFondsInsuffisants}
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
                                        disabled={isFondsInsuffisants}
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
                                    disabled={isFondsInsuffisants}
                                    className="w-full border border-[#B2BED6] rounded p-2 text-xs font-semibold focus:outline-none focus:border-[#04326D] disabled:bg-gray-100"
                                    required
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
                                        className="w-full pl-8 pr-3 py-2 border border-amber-300 bg-white rounded text-xs font-mono tracking-widest text-[#0B192C] focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:bg-gray-100"
                                        autoFocus
                                        required
                                        disabled={isFondsInsuffisants}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t">
                                <button
                                    type="button"
                                    onClick={() => setDisburseReq(null)}
                                    className="px-3.5 py-1.5 border border-[#B2BED6] rounded text-xs font-semibold text-gray-600 hover:bg-gray-50"
                                >
                                    Fermer
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting || isFondsInsuffisants}
                                    className="px-4 py-1.5 bg-[#10B981] hover:bg-[#059669] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded text-xs font-bold shadow transition"
                                >
                                    {submitting ? 'Validation...' : isFondsInsuffisants ? 'Fonds Insuffisants (Rejet)' : 'Valider & Décaisser'}
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
                            <strong>Imputation :</strong>{' '}
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