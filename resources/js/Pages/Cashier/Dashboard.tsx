import { useEffect, useMemo, useState } from 'react';
import { Head, Link, useForm, usePage, router } from '@inertiajs/react';
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
    Coins,
    Check,
    Info,
    History,
    TrendingUp,
    TrendingDown,
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

interface CaisseData {
    id: string;
    name: string;
    code: string;
    devise: string;
    solde_actuel: number;
    is_active: boolean;
    is_ouverte: boolean;
    is_approvisionnee: boolean;
    pending_count: number;
    activeSession: ActiveSessionData | null;
    openingPreview: OpeningPreviewData | null;
    sessionMouvements: MouvementItem[];
}

interface Props extends PageProps {
    caisses: CaisseData[];
    stats: {
        totalAttenteUSD: number;
        totalAttenteFC: number;
        totalAttenteEUR?: number;
    };
}

const money = (n?: number | string | null, dev = '') => {
    if (n === null || n === undefined || n === '') return `0,00 ${dev}`.trim();
    const num = typeof n === 'number' ? n : parseFloat(String(n));
    if (isNaN(num)) return `0,00 ${dev}`.trim();
    return `${num.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${dev}`.trim();
};

export default function CashierDashboard({ caisses = [], stats }: Props) {
    const { flash } = usePage<PageProps>().props;

    // Persistance de la caisse sélectionnée
    const [selectedCaisseId, setSelectedCaisseId] = useState<string>(() => {
        if (typeof window === 'undefined') return caisses[0]?.id || '';
        const saved = localStorage.getItem('cashier_caisse_id');
        return caisses.find((c) => c.id === saved)?.id || caisses[0]?.id || '';
    });

    useEffect(() => {
        if (selectedCaisseId) {
            localStorage.setItem('cashier_caisse_id', selectedCaisseId);
        }
    }, [selectedCaisseId]);

    const selectedCaisse = useMemo(
        () => caisses.find((c) => c.id === selectedCaisseId) || caisses[0],
        [caisses, selectedCaisseId]
    );

    const activeSession = selectedCaisse?.activeSession || null;
    const openingPreview = selectedCaisse?.openingPreview || null;
    const sessionMouvements = selectedCaisse?.sessionMouvements || [];

    const [openModal, setOpenModal] = useState(false);
    const [closeModal, setCloseModal] = useState(false);

    const openForm = useForm({ observation: '' });
    const closeForm = useForm({
        solde_fermeture: '',
        justification_ecart: '',
        observation: '',
        pin: '',
    });

    // ESC pour fermer modales
    useEffect(() => {
        if (!openModal && !closeModal) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setOpenModal(false);
                setCloseModal(false);
            }
        };
        window.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [openModal, closeModal]);

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

    const soldeDisponible = selectedCaisse?.solde_actuel ?? 0;
    const isCaisseAZero = soldeDisponible <= 0;

    // Solde théorique de la session courante
    const soldeTheoriqueSession =
        (activeSession?.solde_ouverture ?? 0) +
        (activeSession?.total_entrees ?? 0) -
        (activeSession?.total_sorties ?? 0);

    const soldePhysiqueSaisi = parseFloat(closeForm.data.solde_fermeture) || 0;
    const ecartCalcule = closeForm.data.solde_fermeture
        ? soldePhysiqueSaisi - soldeTheoriqueSession
        : 0;
    const hasEcart = Math.abs(ecartCalcule) > 0.01;

    return (
        <AppLayout>
            <Head title="Guichet Caisse — Espace Caissier" />

            <div className="space-y-6 max-w-7xl mx-auto">
                <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
                    <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#B2BED6] flex items-center gap-1.5">
                            <Wallet className="w-3.5 h-3.5 text-[#04326D]" />
                            Espace Guichetier Titulaire
                        </span>
                        <h1 className="text-xl font-bold text-[#0B192C] mt-0.5">
                            Gestion Simplifiée de Caisse
                        </h1>
                    </div>

                    {selectedCaisse && (
                        <div className="flex items-center gap-2">
                            <Link
                                href={route('cashier.journal.du-jour', { caisse_id: selectedCaisse.id })}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#B2BED6] hover:bg-gray-50 text-[#0B192C] rounded font-bold text-xs shadow-sm transition"
                            >
                                <FileText className="w-3.5 h-3.5 text-[#04326D]" />
                                <span>Journal A4</span>
                            </Link>
                            <Link
                                href={route('cashier.ledger.index', { caisse_id: selectedCaisse.id })}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#04326D] hover:bg-[#06428f] text-white rounded font-bold text-xs shadow-sm transition"
                            >
                                <BookOpen className="w-3.5 h-3.5" />
                                <span>Grand Livre</span>
                            </Link>
                        </div>
                    )}
                </header>

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

                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                        Sélectionnez votre Guichet de travail :
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {caisses.map((c) => {
                            const isSelected = selectedCaisse?.id === c.id;
                            return (
                                <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => setSelectedCaisseId(c.id)}
                                    className={`p-4 rounded-lg border text-left transition relative flex flex-col justify-between ${
                                        isSelected
                                            ? 'bg-white border-[#04326D] shadow-md ring-2 ring-[#04326D]/20'
                                            : 'bg-white border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    {!c.is_approvisionnee && (
                                        <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-bold rounded uppercase">
                                            À approvisionner
                                        </span>
                                    )}
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="font-bold text-sm text-[#0B192C]">{c.name}</h3>
                                            <span className="text-xs text-gray-400 font-mono">Devise : {c.devise}</span>
                                        </div>
                                        <span
                                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                c.is_ouverte
                                                    ? 'bg-emerald-100 text-emerald-800'
                                                    : 'bg-gray-100 text-gray-600'
                                            }`}
                                        >
                                            {c.is_ouverte ? '● Ouverte' : '○ Fermée'}
                                        </span>
                                    </div>

                                    <div className="mt-4 pt-2 border-t border-gray-100 flex items-center justify-between">
                                        <span className="text-[11px] text-gray-500 font-medium">Solde en caisse :</span>
                                        <strong className="text-sm font-mono text-[#04326D] font-black">
                                            {money(c.solde_actuel, c.devise)}
                                        </strong>
                                    </div>

                                    {c.pending_count > 0 && (
                                        <div className="mt-1 text-[10px] text-emerald-700 font-bold">
                                            {c.pending_count} réquisition(s) en attente
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {selectedCaisse && (
                    <div className="bg-white border border-[#B2BED6] rounded-lg shadow-sm p-5 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Guichet Actif</span>
                                <h2 className="text-lg font-black text-[#0B192C]">{selectedCaisse.name}</h2>
                            </div>

                            <div>
                                {!activeSession ? (
                                    <button
                                        type="button"
                                        onClick={() => setOpenModal(true)}
                                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#04326D] hover:bg-[#06428f] text-white rounded font-bold text-xs shadow transition"
                                    >
                                        <Lock className="w-4 h-4 text-amber-300" />
                                        <span>Demander l'Ouverture du Guichet</span>
                                    </button>
                                ) : activeSession.status === 'en_attente_autorisation' ? (
                                    <div className="p-3 bg-amber-50 border border-amber-300 rounded text-amber-900 text-xs font-bold flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-amber-700 animate-spin shrink-0" />
                                        <span>Ouverture demandée : En attente de validation par le Manager Finance (Code PIN requis).</span>
                                    </div>
                                ) : activeSession.status === 'ouverte' ? (
                                    <div className="flex items-center gap-2">
                                        <span className="px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded font-bold text-xs border border-emerald-300 flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                                            Guichet Ouvert ({activeSession.opened_at ?? 'En cours'})
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                closeForm.reset();
                                                setCloseModal(true);
                                            }}
                                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-xs shadow transition"
                                        >
                                            Clôturer le Guichet
                                        </button>
                                    </div>
                                ) : (
                                    <span className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded font-bold text-xs">
                                        Guichet clôturé pour aujourd'hui
                                    </span>
                                )}
                            </div>
                        </div>

                        {isCaisseAZero && (
                            <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg text-xs space-y-2">
                                <div className="flex items-center gap-2 font-bold text-red-800 text-sm">
                                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                                    <span>Votre caisse est vide : Solde = 0,00 {selectedCaisse.devise}</span>
                                </div>
                                <p className="text-red-900 leading-relaxed">
                                    Vous ne pouvez effectuer aucun décaissement tant que la caisse n'est pas alimentée.
                                    Veuillez d'abord enregistrer un <strong>Bon d'Entrée Caisse (Approvisionnement BEC)</strong> avec le bordereau bancaire.
                                </p>
                                <Link
                                    href={route('cashier.receipts.index', { caisse_id: selectedCaisse.id })}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded text-xs font-bold transition mt-1"
                                >
                                    <ArrowDownLeft className="w-3.5 h-3.5" />
                                    <span>Enregistrer un Approvisionnement (BEC) maintenant</span>
                                </Link>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            <Link
                                href={route('cashier.disbursements.index', { caisse_id: selectedCaisse.id })}
                                className="p-5 bg-white border border-[#B2BED6] hover:border-[#04326D] rounded-lg shadow-sm hover:shadow-md transition flex items-center justify-between group"
                            >
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold uppercase text-gray-400">Sorties de Caisse</span>
                                    <h3 className="text-base font-bold text-[#0B192C]">Bons à Décaisser (BSC)</h3>
                                    <p className="text-xs text-gray-500">
                                        {selectedCaisse.pending_count > 0 ? (
                                            <strong className="text-emerald-700 font-bold">
                                                {selectedCaisse.pending_count} réquisition(s) prête(s) au paiement
                                            </strong>
                                        ) : (
                                            'Aucune réquisition en attente pour cette caisse'
                                        )}
                                    </p>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-700 group-hover:scale-110 transition-transform">
                                    <ArrowUpRight className="w-5 h-5" />
                                </div>
                            </Link>

                            <Link
                                href={route('cashier.receipts.index', { caisse_id: selectedCaisse.id })}
                                className="p-5 bg-white border border-[#B2BED6] hover:border-[#04326D] rounded-lg shadow-sm hover:shadow-md transition flex items-center justify-between group"
                            >
                                <div className="space-y-1">
                                    <span className="text-[10px] font-bold uppercase text-gray-400">Entrées de Caisse</span>
                                    <h3 className="text-base font-bold text-[#0B192C]">Approvisionnements & Recettes (BEC)</h3>
                                    <p className="text-xs text-gray-500">Alimentation de fonds, retours de décharge</p>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-[#04326D] group-hover:scale-110 transition-transform">
                                    <ArrowDownLeft className="w-5 h-5" />
                                </div>
                            </Link>
                        </div>

                        {/* Aperçu session en cours */}
                        {activeSession && activeSession.status === 'ouverte' && (
                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t">
                                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded">
                                    <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-emerald-800">
                                        <TrendingUp className="w-3 h-3" />
                                        Entrées du jour
                                    </div>
                                    <p className="text-sm font-mono font-black text-emerald-800 mt-1">
                                        + {money(activeSession.total_entrees, selectedCaisse.devise)}
                                    </p>
                                </div>
                                <div className="p-3 bg-red-50 border border-red-200 rounded">
                                    <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-red-800">
                                        <TrendingDown className="w-3 h-3" />
                                        Sorties du jour
                                    </div>
                                    <p className="text-sm font-mono font-black text-red-800 mt-1">
                                        − {money(activeSession.total_sorties, selectedCaisse.devise)}
                                    </p>
                                </div>
                                <div className="p-3 bg-[#0B192C] rounded text-white">
                                    <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-[#B2BED6]">
                                        <Coins className="w-3 h-3" />
                                        Solde théorique
                                    </div>
                                    <p className="text-sm font-mono font-black text-emerald-400 mt-1">
                                        {money(soldeTheoriqueSession, selectedCaisse.devise)}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* MODALE OUVERTURE */}
            {openModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                    onClick={(e) => e.target === e.currentTarget && setOpenModal(false)}
                >
                    <div className="bg-white rounded-lg border max-w-md w-full p-6 space-y-4 shadow-xl">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="font-bold text-sm text-[#0B192C] uppercase">Demande d'Ouverture du Guichet</h3>
                            <button
                                onClick={() => setOpenModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                                aria-label="Fermer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs space-y-1">
                            <span className="text-gray-500 uppercase font-bold text-[10px]">Fond d'ouverture certifié</span>
                            <div className="text-xl font-black font-mono text-[#04326D]">
                                {money(openingPreview?.solde ?? 0, selectedCaisse?.devise)}
                            </div>
                        </div>

                        <form onSubmit={handleRequestOpening} className="space-y-3 text-xs">
                            <label className="block font-semibold text-gray-700">Observation (Optionnelle) :</label>
                            <textarea
                                rows={2}
                                value={openForm.data.observation}
                                onChange={(e) => openForm.setData('observation', e.target.value)}
                                placeholder="Note pour le Manager Finance..."
                                className="w-full border rounded p-2 text-xs focus:outline-none focus:border-[#04326D]"
                            />
                            <div className="flex justify-end gap-2 pt-2 border-t">
                                <button
                                    type="button"
                                    onClick={() => setOpenModal(false)}
                                    className="px-3 py-1.5 border rounded text-xs text-gray-600"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={openForm.processing}
                                    className="px-4 py-1.5 bg-[#04326D] text-white rounded text-xs font-bold shadow"
                                >
                                    {openForm.processing ? 'Envoi...' : 'Transmettre au Finance Manager'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODALE CLÔTURE */}
            {closeModal && activeSession && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                    onClick={(e) => e.target === e.currentTarget && setCloseModal(false)}
                >
                    <div className="bg-white rounded-lg border max-w-md w-full p-6 space-y-4 shadow-xl">
                        <div className="flex justify-between items-center border-b pb-3">
                            <h3 className="font-bold text-sm text-red-800 uppercase">Clôture du Guichet Journalier</h3>
                            <button
                                onClick={() => setCloseModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                                aria-label="Fermer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs space-y-1">
                            <span className="text-gray-600">Solde théorique attendu :</span>
                            <strong className="font-mono text-[#04326D] text-sm block">
                                {money(soldeTheoriqueSession, selectedCaisse?.devise)}
                            </strong>
                            <p className="text-[10px] text-gray-500">
                                Ouverture {money(activeSession.solde_ouverture, '')} + {money(activeSession.total_entrees, '')} entrées − {money(activeSession.total_sorties, '')} sorties
                            </p>
                        </div>

                        <form onSubmit={handleCloseSession} className="space-y-3 text-xs">
                            <div>
                                <label className="block font-bold text-gray-700 mb-1">
                                    Montant physique compté dans le coffre ({selectedCaisse?.devise}) * :
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    required
                                    autoFocus
                                    placeholder="Montant réel"
                                    value={closeForm.data.solde_fermeture}
                                    onChange={(e) => closeForm.setData('solde_fermeture', e.target.value)}
                                    className="w-full border-2 border-[#04326D] rounded p-2 text-sm font-mono font-bold"
                                />
                            </div>

                            {hasEcart && (
                                <>
                                    <div
                                        className={`p-2.5 rounded text-xs font-bold flex items-center gap-1.5 ${
                                            ecartCalcule > 0
                                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                                                : 'bg-red-50 text-red-800 border border-red-300'
                                        }`}
                                    >
                                        <AlertTriangle className="w-4 h-4 shrink-0" />
                                        <span>
                                            Écart détecté : {ecartCalcule > 0 ? '+' : ''}
                                            {money(ecartCalcule, selectedCaisse?.devise ?? '')}
                                            {ecartCalcule > 0 ? ' (excédent)' : ' (manquant)'}
                                        </span>
                                    </div>
                                    <div>
                                        <label className="block font-bold text-gray-700 mb-1">
                                            Justification de l'écart *
                                        </label>
                                        <textarea
                                            rows={2}
                                            value={closeForm.data.justification_ecart}
                                            onChange={(e) => closeForm.setData('justification_ecart', e.target.value)}
                                            placeholder="Expliquez la raison de l'écart constaté..."
                                            className="w-full border rounded p-2 text-xs focus:outline-none focus:border-red-500"
                                            required
                                        />
                                    </div>
                                </>
                            )}

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Code PIN du Caissier * :</label>
                                <input
                                    type="password"
                                    maxLength={6}
                                    required
                                    placeholder="••••"
                                    value={closeForm.data.pin}
                                    onChange={(e) => closeForm.setData('pin', e.target.value)}
                                    className="w-full border rounded p-2 text-sm font-mono tracking-widest text-center"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t">
                                <button
                                    type="button"
                                    onClick={() => setCloseModal(false)}
                                    className="px-3 py-1.5 border rounded text-xs text-gray-600"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={closeForm.processing}
                                    className="px-4 py-1.5 bg-red-600 text-white rounded text-xs font-bold shadow disabled:opacity-50"
                                >
                                    {closeForm.processing ? 'Clôture...' : 'Confirmer & Clôturer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}