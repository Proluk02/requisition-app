import { useState } from 'react';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
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
} from 'lucide-react';

interface CaisseItem {
    id: string;
    name: string;
    code: string;
    devise: string;
    solde_actuel: number;
    is_active: boolean;
    is_ouverte: boolean;
}

interface ActiveSessionData {
    id: string;
    status: 'en_attente_autorisation' | 'ouverte' | 'fermee';
    date_session: string;
    solde_ouverture: number;
    solde_fermeture: number | null;
    total_entrees: number;
    total_sorties: number;
    opened_at?: string;
    observation_ouverture?: string;
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

interface Props extends PageProps {
    userCaisses: CaisseItem[];
    selectedCaisse: CaisseItem | null;
    activeSession: ActiveSessionData | null;
    sessionMouvements: MouvementItem[];
    stats: {
        totalAttenteUSD: number;
        totalAttenteFC: number;
    };
}

const money = (n: number, dev: string) =>
    `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${dev}`;

export default function CashierDashboard({
    userCaisses = [],
    selectedCaisse,
    activeSession,
    sessionMouvements = [],
    stats,
}: Props) {
    const { flash } = usePage<PageProps>().props;

    const [openModal, setOpenModal] = useState(false);
    const [closeModal, setCloseModal] = useState(false);

    const openForm = useForm({
        solde_ouverture: '0',
        observation: '',
    });

    const closeForm = useForm({
        solde_fermeture: '',
        observation: '',
    });

    const handleSelectCaisse = (id: string) => {
        router.get(
            route('cashier.dashboard'),
            { caisse_id: id },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handleRequestOpening = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCaisse) return;

        openForm.post(route('cashier.session.request-opening', selectedCaisse.id), {
            preserveScroll: true,
            onSuccess: () => setOpenModal(false),
        });
    };

    const handleCloseSession = (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeSession) return;

        closeForm.post(route('cashier.session.close', activeSession.id), {
            preserveScroll: true,
            onSuccess: () => setCloseModal(false),
        });
    };

    return (
        <AppLayout>
            <Head title="Guichet Caisse & Sessions" />

            <div className="space-y-6">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
                    <div>
                        <nav className="text-[10px] font-bold uppercase tracking-widest text-[#B2BED6] mb-1.5 flex items-center gap-1.5">
                            <Wallet className="w-3.5 h-3.5 text-[#04326D]" />
                            <span>Guichet Caisse</span>
                            <span className="mx-1">/</span>
                            <span className="text-[#04326D]">Session Journalière</span>
                        </nav>
                        <h1 className="text-xl font-bold text-[#0B192C]">
                            Supervision du Guichet & Fond de Caisse
                        </h1>
                        <p className="text-[12px] text-gray-500 mt-1">
                            Ouverture journalière autorisée par le Manager Finance et clôture quotidienne des espèces.
                        </p>
                    </div>

                    {userCaisses.length > 1 && (
                        <div className="flex items-center gap-2 bg-white border border-[#B2BED6] rounded px-3 py-1.5">
                            <Building2 className="w-4 h-4 text-[#04326D]" />
                            <label className="text-[11px] font-bold uppercase tracking-widest text-gray-600">
                                Guichet actif :
                            </label>
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

                {/* État du guichet de caisse */}
                <div className="bg-white border border-[#B2BED6] rounded shadow-sm p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                                <Wallet className="w-6 h-6 text-[#04326D]" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-base font-bold text-[#0B192C]">
                                        {selectedCaisse?.name ?? 'Caisse Principale'}
                                    </h2>
                                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                                        {selectedCaisse?.devise}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Solde physique actuel en caisse :{' '}
                                    <strong className="text-emerald-700 font-mono text-sm">
                                        {selectedCaisse ? money(selectedCaisse.solde_actuel, selectedCaisse.devise) : '—'}
                                    </strong>
                                </p>
                            </div>
                        </div>

                        <div>
                            {!activeSession ? (
                                <button
                                    type="button"
                                    onClick={() => setOpenModal(true)}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#04326D] hover:bg-[#06428f] text-white rounded font-bold text-xs shadow-sm transition"
                                >
                                    <Lock className="w-4 h-4 text-amber-300" />
                                    <span>Demander l'Ouverture du Guichet</span>
                                </button>
                            ) : activeSession.status === 'en_attente_autorisation' ? (
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-300 rounded text-amber-900 text-xs font-bold">
                                    <Clock className="w-4 h-4 text-amber-700 animate-spin" />
                                    <span>Ouverture en attente d'autorisation (Manager Finance)</span>
                                </div>
                            ) : activeSession.status === 'ouverte' ? (
                                <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded font-bold text-xs border border-emerald-300">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                                        <span>Guichet Ouvert ({activeSession.opened_at})</span>
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setCloseModal(true)}
                                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-xs shadow-sm transition"
                                    >
                                        Clôturer la Caisse
                                    </button>
                                </div>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded font-bold text-xs border">
                                    Guichet Clôturé pour la journée
                                </span>
                            )}
                        </div>
                    </div>

                    {activeSession && activeSession.status === 'ouverte' && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                            <div className="p-3 bg-gray-50 border rounded">
                                <span className="text-[10px] uppercase font-bold text-gray-500 block">
                                    Fond d'ouverture
                                </span>
                                <strong className="text-sm font-mono text-[#0B192C]">
                                    {money(activeSession.solde_ouverture, selectedCaisse?.devise ?? '$')}
                                </strong>
                            </div>
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                                <span className="text-[10px] uppercase font-bold text-[#04326D] block">
                                    Entrées du jour (BEC)
                                </span>
                                <strong className="text-sm font-mono text-[#04326D]">
                                    + {money(activeSession.total_entrees, selectedCaisse?.devise ?? '$')}
                                </strong>
                            </div>
                            <div className="p-3 bg-red-50 border border-red-200 rounded">
                                <span className="text-[10px] uppercase font-bold text-red-700 block">
                                    Sorties du jour (BSC)
                                </span>
                                <strong className="text-sm font-mono text-red-700">
                                    - {money(activeSession.total_sorties, selectedCaisse?.devise ?? '$')}
                                </strong>
                            </div>
                        </div>
                    )}
                </div>

                {/* Accès rapides aux autres modules */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Link
                        href={route('cashier.disbursements.index')}
                        className="bg-white border border-[#B2BED6] hover:border-[#04326D] rounded p-5 shadow-sm space-y-2 transition flex flex-col justify-between group"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-[#0B192C]">
                                Bons à Décaisser (BSC)
                            </span>
                            <ArrowUpRight className="w-4 h-4 text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                        <p className="text-xs text-gray-500">
                            Traitez les réquisitions autorisées par la Direction et imprimez les Bons de Sortie Caisse.
                        </p>
                        <span className="text-xs font-mono font-bold text-[#04326D] pt-2 border-t block">
                            En attente : {money(stats.totalAttenteUSD, '$')} | {money(stats.totalAttenteFC, 'FC')}
                        </span>
                    </Link>

                    <Link
                        href={route('cashier.receipts.index')}
                        className="bg-white border border-[#B2BED6] hover:border-[#04326D] rounded p-5 shadow-sm space-y-2 transition flex flex-col justify-between group"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-[#0B192C]">
                                Entrées & Approvisionnements (BEC)
                            </span>
                            <ArrowDownLeft className="w-4 h-4 text-[#04326D] group-hover:translate-x-0.5 transition-transform" />
                        </div>
                        <p className="text-xs text-gray-500">
                            Enregistrez les versements bancaires et les retours de fonds non utilisés suite aux décharges.
                        </p>
                        <span className="text-xs font-bold text-gray-700 pt-2 border-t block">
                            Émission de Bons d'Entrée Caisse
                        </span>
                    </Link>

                    <Link
                        href={route('cashier.ledger.index')}
                        className="bg-white border border-[#B2BED6] hover:border-[#04326D] rounded p-5 shadow-sm space-y-2 transition flex flex-col justify-between group"
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-[#0B192C]">
                                Grand Livre de Caisse
                            </span>
                            <BookOpen className="w-4 h-4 text-purple-600 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                        <p className="text-xs text-gray-500">
                            Consultez le journal des écritures chronologiques avec solde progressif et export mensuel.
                        </p>
                        <span className="text-xs font-bold text-gray-700 pt-2 border-t block">
                            Journal officiel des mouvements
                        </span>
                    </Link>
                </div>

                {/* Derniers mouvements de la session */}
                {sessionMouvements.length > 0 && (
                    <div className="bg-white border border-[#B2BED6] rounded shadow-sm overflow-hidden">
                        <header className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B192C]">
                                Mouvements récents de la session en cours
                            </h3>
                            <Link
                                href={route('cashier.ledger.index')}
                                className="text-[11px] font-bold text-[#04326D] hover:underline"
                            >
                                Voir tout le grand livre &rarr;
                            </Link>
                        </header>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-[#0B192C] text-white text-[10px] uppercase font-bold tracking-wider">
                                        <th className="py-2.5 px-4">N° Pièce</th>
                                        <th className="py-2.5 px-4">Type</th>
                                        <th className="py-2.5 px-4">Tiers / Bénéficiaire</th>
                                        <th className="py-2.5 px-4">Imputation</th>
                                        <th className="py-2.5 px-4 text-right">Montant</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 text-gray-700">
                                    {sessionMouvements.map((m) => (
                                        <tr key={m.id} className="hover:bg-[#F9F9FF]">
                                            <td className="py-3 px-4 font-mono font-bold text-[#04326D]">
                                                {m.numero_piece}
                                            </td>
                                            <td className="py-3 px-4">
                                                <span
                                                    className={`px-2 py-0.5 rounded text-[9.5px] font-bold uppercase ${
                                                        m.type === 'entree'
                                                            ? 'bg-blue-100 text-[#04326D]'
                                                            : 'bg-red-100 text-red-800'
                                                    }`}
                                                >
                                                    {m.type === 'entree' ? 'Entrée' : 'Sortie'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 font-semibold text-gray-800">
                                                {m.tiers_nom}
                                            </td>
                                            <td className="py-3 px-4 font-mono font-bold text-gray-600">
                                                {m.imputation}
                                            </td>
                                            <td
                                                className={`py-3 px-4 text-right font-mono font-bold ${
                                                    m.type === 'entree' ? 'text-emerald-700' : 'text-red-700'
                                                }`}
                                            >
                                                {m.type === 'entree' ? '+' : '-'} {money(m.montant, m.devise)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* MODALE : Demande d'ouverture de caisse */}
            {openModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
                    <div className="bg-white rounded border border-[#B2BED6] shadow-2xl max-w-md w-full p-6 space-y-4 animate-slide-down">
                        <header className="flex items-start justify-between border-b pb-3">
                            <div>
                                <h3 className="text-sm font-bold text-[#0B192C] uppercase tracking-wide">
                                    Ouverture du Guichet de Caisse
                                </h3>
                                <p className="text-[11px] text-gray-500">
                                    Guichet : <strong>{selectedCaisse?.name}</strong> ({selectedCaisse?.devise})
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setOpenModal(false)}
                                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </header>

                        <form onSubmit={handleRequestOpening} className="space-y-3.5 text-xs">
                            <div>
                                <label className="block font-bold text-gray-700 mb-1">
                                    Fond de Caisse Initial (Espèces en caisse) *
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={openForm.data.solde_ouverture}
                                    onChange={(e) => openForm.setData('solde_ouverture', e.target.value)}
                                    className="w-full border border-[#B2BED6] rounded p-2 text-xs font-mono font-bold focus:outline-none focus:border-[#04326D]"
                                    required
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">
                                    Observation / Billetage
                                </label>
                                <textarea
                                    rows={2}
                                    placeholder="Détail du comptage ou note..."
                                    value={openForm.data.observation}
                                    onChange={(e) => openForm.setData('observation', e.target.value)}
                                    className="w-full border border-[#B2BED6] rounded p-2 text-xs focus:outline-none focus:border-[#04326D]"
                                />
                            </div>

                            <p className="text-[10px] text-gray-500 leading-relaxed bg-blue-50 p-2.5 rounded border border-blue-200">
                                Une alerte prioritaire sera transmise au Manager Finance. Dès son autorisation validée par PIN, le guichet passera au statut ouvert.
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
                                    disabled={openForm.processing}
                                    className="px-4 py-1.5 bg-[#04326D] hover:bg-[#06428f] text-white rounded text-xs font-bold shadow transition"
                                >
                                    Transmettre la Demande
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODALE : Clôture de caisse le soir */}
            {closeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
                    <div className="bg-white rounded border border-[#B2BED6] shadow-2xl max-w-md w-full p-6 space-y-4 animate-slide-down">
                        <header className="flex items-start justify-between border-b pb-3">
                            <div>
                                <h3 className="text-sm font-bold text-red-800 uppercase tracking-wide">
                                    Clôture Quotidienne du Guichet
                                </h3>
                                <p className="text-[11px] text-gray-500">
                                    Comptage physique des espèces de fin de journée.
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

                        <form onSubmit={handleCloseSession} className="space-y-3.5 text-xs">
                            <div>
                                <label className="block font-bold text-gray-700 mb-1">
                                    Solde de Clôture Constaté (Comptage physique) *
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="Montant total en caisse"
                                    value={closeForm.data.solde_fermeture}
                                    onChange={(e) => closeForm.setData('solde_fermeture', e.target.value)}
                                    className="w-full border border-[#B2BED6] rounded p-2 text-xs font-mono font-bold focus:outline-none focus:border-red-600"
                                    required
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">
                                    Observation de Clôture
                                </label>
                                <textarea
                                    rows={2}
                                    placeholder="Conformité du billetage ou écart constaté..."
                                    value={closeForm.data.observation}
                                    onChange={(e) => closeForm.setData('observation', e.target.value)}
                                    className="w-full border border-[#B2BED6] rounded p-2 text-xs focus:outline-none focus:border-red-600"
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
                                    Confirmer la Fermeture
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}