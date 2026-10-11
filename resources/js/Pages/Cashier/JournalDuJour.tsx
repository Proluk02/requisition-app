import { useState } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { PageProps } from '@/types';
import {
    Printer,
    Calendar,
    Building2,
    Coins,
    AlertTriangle,
    CalendarX2,
    RotateCcw,
    History,
    CheckCircle2,
} from 'lucide-react';

interface CaisseOption {
    id: string;
    name: string;
    devise: string;
    solde_actuel?: number;
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
    mode_paiement: string;
    cashier_nom?: string;
    solde_progressif?: number;
}

interface SessionData {
    id: string;
    date_session: string;
    cashier_nom?: string;
    authorized_by_nom?: string;
    opened_at?: string;
    closed_at?: string;
    status: string;
    origine_ouverture: string;
    solde_ouverture: number;
    total_entrees: number;
    total_sorties: number;
    solde_theorique: number;
    solde_physique: number | null;
    ecart: number | null;
    justification_ecart?: string | null;
}

interface Props extends PageProps {
    userCaisses: CaisseOption[];
    selectedCaisse: {
        id: string;
        name: string;
        code: string;
        devise: string;
        solde_actuel?: number;
    } | null;
    selectedDate: string;
    latestSessionDate?: string | null;
    openingBalanceResolved: number;
    totalEntreesJour?: number;
    totalSortiesJour?: number;
    soldeTheoriqueJour?: number;
    session: SessionData | null;
    mouvements: MouvementItem[];
}

const money = (n: number | null | undefined, dev: string) => {
    const val = n ?? 0;
    return `${val.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${dev}`.trim();
};

export default function JournalDuJour({
    userCaisses = [],
    selectedCaisse,
    selectedDate,
    latestSessionDate,
    openingBalanceResolved = 0,
    totalEntreesJour = 0,
    totalSortiesJour = 0,
    soldeTheoriqueJour = 0,
    session,
    mouvements = [],
}: Props) {
    const [caisseId, setCaisseId] = useState(selectedCaisse?.id ?? '');
    const [date, setDate] = useState(selectedDate);

    const handleFilterChange = (cId = caisseId, d = date) => {
        router.get(
            route('cashier.journal.du-jour'),
            { caisse_id: cId, date: d },
            { preserveState: true, preserveScroll: true }
        );
    };

    const todayString = new Date().toISOString().split('T')[0];
    const isToday = selectedDate === todayString;
    const isPastDateWithoutSession = !session && selectedDate < todayString;

    const devise = selectedCaisse?.devise ?? '';
    const soldeOuverture = session ? session.solde_ouverture : openingBalanceResolved;
    const totalEntrees = session ? session.total_entrees : totalEntreesJour;
    const totalSorties = session ? session.total_sorties : totalSortiesJour;
    const soldeTheorique = session ? session.solde_theorique : soldeTheoriqueJour;

    return (
        <AppLayout>
            <Head title={`Journal de Caisse du ${selectedDate}`} />

            <style>{`
                @media print {
                    nav, aside, header, .no-print-area, button, select, input {
                        display: none !important;
                    }
                    #journal-print-document {
                        display: block !important;
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100% !important;
                        background: white !important;
                        color: black !important;
                        padding: 20px !important;
                    }
                }
            `}</style>

            <div className="space-y-6">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-[#E2E8F0] no-print-area">
                    <div>
                        <nav className="text-[10px] font-bold uppercase tracking-widest text-[#B2BED6] mb-1.5 flex items-center gap-1.5">
                            <Coins className="w-3.5 h-3.5 text-[#04326D]" />
                            <Link href={route('cashier.dashboard')} className="hover:underline">
                                Guichet Caisse
                            </Link>
                            <span className="mx-1">/</span>
                            <span className="text-[#04326D]">Journal Quotidien</span>
                        </nav>
                        <h1 className="text-xl font-bold text-[#0B192C]">
                            Journal Quotidien de Caisse (Arrêté du Jour)
                        </h1>
                        <p className="text-[12px] text-gray-500 mt-1">
                            Arrêté journalier chronologique et traçabilité historique des sessions.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {userCaisses.length > 1 && (
                            <div className="flex items-center gap-1.5 bg-white border border-[#B2BED6] rounded px-2.5 py-1 text-xs">
                                <Building2 className="w-3.5 h-3.5 text-[#04326D]" />
                                <select
                                    value={caisseId}
                                    onChange={(e) => {
                                        setCaisseId(e.target.value);
                                        handleFilterChange(e.target.value, date);
                                    }}
                                    className="border-none bg-transparent text-xs font-bold text-[#0B192C] focus:outline-none cursor-pointer"
                                >
                                    {userCaisses.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name} ({c.devise})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="flex items-center gap-1.5 bg-white border border-[#B2BED6] rounded px-2.5 py-1 text-xs">
                            <Calendar className="w-3.5 h-3.5 text-[#04326D]" />
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => {
                                    setDate(e.target.value);
                                    handleFilterChange(caisseId, e.target.value);
                                }}
                                className="border-none bg-transparent text-xs font-bold text-[#0B192C] focus:outline-none cursor-pointer"
                            />
                        </div>

                        {!isToday && (
                            <button
                                type="button"
                                onClick={() => {
                                    setDate(todayString);
                                    handleFilterChange(caisseId, todayString);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-[#B2BED6] text-gray-700 hover:bg-gray-50 rounded font-semibold text-xs transition"
                                title="Revenir à la date du jour"
                            >
                                <RotateCcw className="w-3.5 h-3.5 text-[#04326D]" />
                                <span>Aujourd'hui</span>
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#04326D] hover:bg-[#06428f] text-white rounded font-bold text-xs shadow-sm transition"
                        >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Imprimer Journal (A4)</span>
                        </button>
                    </div>
                </header>

                {/* BANDEAU UX : Date passée sans aucune session ouverte */}
                {isPastDateWithoutSession && (
                    <div className="p-4 rounded-lg bg-amber-50/80 border border-amber-200 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print-area shadow-sm">
                        <div className="flex items-start gap-3">
                            <CalendarX2 className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                            <div>
                                <h4 className="font-bold text-xs">
                                    Aucune session de caisse n'a été ouverte le {new Date(selectedDate).toLocaleDateString('fr-FR')}
                                </h4>
                                <p className="text-[11px] text-amber-800 mt-0.5">
                                    Ce guichet était fermé ce jour-là. Le solde d'ouverture historique est donc de{' '}
                                    <strong>{money(soldeOuverture, devise)}</strong> et aucun mouvement n'a été exécuté.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            {latestSessionDate && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setDate(latestSessionDate);
                                        handleFilterChange(caisseId, latestSessionDate);
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded text-xs font-bold transition shadow-sm"
                                >
                                    <History className="w-3.5 h-3.5" />
                                    <span>Voir dernière session active</span>
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => {
                                    setDate(todayString);
                                    handleFilterChange(caisseId, todayString);
                                }}
                                className="px-3 py-1.5 bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 rounded text-xs font-semibold transition"
                            >
                                Revenir à aujourd'hui
                            </button>
                        </div>
                    </div>
                )}

                {/* BANDEAU UX : Aujourd'hui mais pas encore ouvert */}
                {isToday && !session && (
                    <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 text-blue-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print-area shadow-sm">
                        <div className="flex items-center gap-3">
                            <Calendar className="w-5 h-5 text-[#04326D] shrink-0" />
                            <div>
                                <h4 className="font-bold text-xs">
                                    Le guichet de cette caisse n'est pas encore ouvert aujourd'hui
                                </h4>
                                <p className="text-[11px] text-blue-800 mt-0.5">
                                    Solde d'ouverture prêt pour le démarrage : <strong>{money(soldeOuverture, devise)}</strong>.
                                </p>
                            </div>
                        </div>
                        <Link
                            href={route('cashier.dashboard', { caisse_id: caisseId })}
                            className="px-3 py-1.5 bg-[#04326D] hover:bg-[#06428f] text-white rounded text-xs font-bold transition self-end sm:self-center shadow-sm"
                        >
                            Ouvrir la session caisse
                        </Link>
                    </div>
                )}

                {/* Document imprimable */}
                <div
                    id="journal-print-document"
                    className="bg-white border border-[#B2BED6] rounded shadow-sm p-8 space-y-6 max-w-4xl mx-auto text-black"
                >
                    <div className="flex justify-between items-start border-b-2 border-black pb-4">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-gray-800">
                                Bon Pasteur A.S.B.L. — Kolwezi
                            </p>
                            <h2 className="text-lg font-black uppercase tracking-wide text-black mt-0.5">
                                Journal Quotidien de Caisse
                            </h2>
                            <p className="text-xs text-gray-600 mt-1">
                                Guichet : <strong>{selectedCaisse?.name}</strong> • Devise : <strong>{devise}</strong>
                            </p>
                        </div>
                        <div className="text-right">
                            <span className="text-xs font-mono font-bold block">
                                Date : {session?.date_session ?? new Date(selectedDate).toLocaleDateString('fr-FR')}
                            </span>
                            <span className={`text-[11px] font-bold uppercase block mt-0.5 ${
                                session
                                    ? session.status === 'fermee'
                                        ? 'text-gray-700'
                                        : 'text-emerald-700'
                                    : 'text-amber-800'
                            }`}>
                                {session
                                    ? session.status === 'fermee'
                                        ? 'Session Clôturée'
                                        : 'Session Ouverte'
                                    : 'Non ouverte (Guichet fermé)'}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-6 text-xs text-black">
                        {/* 1. Ouverture du Guichet */}
                        <div className="border border-black p-3 space-y-1.5 bg-gray-50/30">
                            <span className="font-bold uppercase tracking-wider block text-[11px] underline">
                                1. Ouverture du Guichet
                            </span>
                            <div className="grid grid-cols-2 gap-4 pt-1">
                                <div>
                                    <p>
                                        Origine du solde :{' '}
                                        <strong>
                                            {session?.origine_ouverture === 'report_veille'
                                                ? 'Report de la session précédente'
                                                : soldeOuverture > 0
                                                ? 'Solde historique reporté'
                                                : 'Solde initial vierge (0,00)'}
                                        </strong>
                                    </p>
                                    <p>
                                        Caissier : <strong>{session?.cashier_nom ?? (session ? 'Non assigné' : '—')}</strong>{' '}
                                        {session?.opened_at && `(à ${session.opened_at})`}
                                    </p>
                                    <p>
                                        Visa Finance :{' '}
                                        <strong>{session?.authorized_by_nom ?? (session ? 'En attente' : '—')}</strong>
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] uppercase text-gray-600 block">
                                        Solde d'Ouverture Constaté
                                    </span>
                                    <span className="text-lg font-mono font-black text-[#04326D]">
                                        {money(soldeOuverture, devise)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 2. Mouvements de la Journée */}
                        <div className="space-y-2">
                            <span className="font-bold uppercase tracking-wider block text-[11px] underline">
                                2. Mouvements de la Journée ({mouvements.length})
                            </span>
                            <table className="w-full text-left border-collapse border border-black text-[11px]">
                                <thead>
                                    <tr className="bg-gray-100 border-b border-black font-bold uppercase text-[10px]">
                                        <th className="p-2 border-r border-black w-24">N° Pièce</th>
                                        <th className="p-2 border-r border-black">Bénéficiaire / Déposant</th>
                                        <th className="p-2 border-r border-black">Motif & Imputation</th>
                                        <th className="p-2 text-right border-r border-black">Entrée (+)</th>
                                        <th className="p-2 text-right border-r border-black">Sortie (−)</th>
                                        <th className="p-2 text-right font-black">Solde ({devise})</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-300">
                                    {/* Ligne 0 : Solde d'ouverture historique exact */}
                                    <tr className="bg-amber-50/40 font-bold">
                                        <td className="p-2 border-r border-black font-mono text-center text-[10px]">
                                            REPORT
                                        </td>
                                        <td className="p-2 border-r border-black italic">
                                            Solde d'Ouverture
                                        </td>
                                        <td className="p-2 border-r border-black italic text-gray-700">
                                            {session
                                                ? "Report de la session précédente"
                                                : soldeOuverture === 0
                                                ? "Caisse sans antécédent (0,00)"
                                                : "Solde historique reporté"}
                                        </td>
                                        <td className="p-2 text-right border-r border-black font-mono">—</td>
                                        <td className="p-2 text-right border-r border-black font-mono">—</td>
                                        <td className="p-2 text-right font-mono font-bold text-[#04326D]">
                                            {money(soldeOuverture, '')}
                                        </td>
                                    </tr>

                                    {/* Mouvements chronologiques */}
                                    {mouvements.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="p-3 text-center text-gray-500 italic">
                                                {session
                                                    ? "Aucun mouvement de caisse enregistré pendant cette session."
                                                    : "Aucune session ouverte ni opération effectuée pour cette journée."}
                                            </td>
                                        </tr>
                                    ) : (
                                        mouvements.map((m) => (
                                            <tr key={m.id}>
                                                <td className="p-2 border-r border-black font-mono font-bold whitespace-nowrap">
                                                    {m.numero_piece}
                                                </td>
                                                <td className="p-2 border-r border-black font-medium">
                                                    {m.tiers_nom}
                                                </td>
                                                <td className="p-2 border-r border-black">
                                                    <span>{m.motif}</span>
                                                    <span className="font-mono text-gray-600 block text-[10px]">
                                                        [Imp: {m.imputation}]
                                                    </span>
                                                </td>
                                                <td className="p-2 text-right font-mono border-r border-black font-bold text-emerald-800">
                                                    {m.type === 'entree' ? `+${money(m.montant, '')}` : '—'}
                                                </td>
                                                <td className="p-2 text-right font-mono border-r border-black font-bold text-red-800">
                                                    {m.type === 'sortie' ? `−${money(m.montant, '')}` : '—'}
                                                </td>
                                                <td className="p-2 text-right font-mono font-bold bg-gray-50">
                                                    {money(m.solde_progressif, '')}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t-2 border-black font-bold bg-gray-50">
                                        <td colSpan={3} className="p-2 text-right uppercase border-r border-black">
                                            Totaux des flux :
                                        </td>
                                        <td className="p-2 text-right font-mono text-emerald-800 border-r border-black">
                                            +{money(totalEntrees, devise)}
                                        </td>
                                        <td className="p-2 text-right font-mono text-red-800 border-r border-black">
                                            −{money(totalSorties, devise)}
                                        </td>
                                        <td className="p-2 text-right font-mono font-black text-black">
                                            {money(soldeTheorique, devise)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* 3. Synthèse de Clôture & Rapprochement */}
                        <div className="border border-black p-4 space-y-3 bg-gray-50/50">
                            <span className="font-bold uppercase tracking-wider block text-[11px] underline">
                                3. Arrêté de Caisse & Rapprochement
                            </span>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p>Fond d'ouverture : <strong className="font-mono">{money(soldeOuverture, devise)}</strong></p>
                                    <p>+ Total Entrées : <strong className="font-mono text-emerald-700">+{money(totalEntrees, devise)}</strong></p>
                                    <p>− Total Sorties : <strong className="font-mono text-red-700">−{money(totalSorties, devise)}</strong></p>
                                    <p className="border-t pt-1 font-bold">
                                        = Solde Théorique Final : <strong className="font-mono text-base">{money(soldeTheorique, devise)}</strong>
                                    </p>
                                </div>
                                <div className="space-y-1 text-right">
                                    <p>
                                        Comptage physique réel :{' '}
                                        <strong className="font-mono text-sm">
                                            {session?.solde_physique !== null && session?.solde_physique !== undefined
                                                ? money(session.solde_physique, devise)
                                                : session
                                                ? 'Session en cours'
                                                : 'Guichet non ouvert'}
                                        </strong>
                                    </p>
                                    <p className="border-t pt-1 font-bold">
                                        Écart constaté :{' '}
                                        <strong className={`font-mono text-sm ${session?.ecart === 0 || !session?.ecart ? 'text-emerald-800' : 'text-red-700'}`}>
                                            {session?.ecart !== null && session?.ecart !== undefined ? money(session.ecart, devise) : '0,00 ' + devise}
                                        </strong>
                                    </p>
                                </div>
                            </div>
                            {session?.justification_ecart && (
                                <div className="border-t border-dashed border-gray-400 pt-2 text-[11px]">
                                    <strong className="text-red-800">Justification de l'écart :</strong>
                                    <p className="italic text-gray-700 mt-0.5">{session.justification_ecart}</p>
                                </div>
                            )}
                        </div>

                        {/* Signatures */}
                        <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs">
                            <div className="space-y-16 border-t border-black pt-2">
                                <p className="font-bold uppercase tracking-wider">Le Caissier Titulaire</p>
                                <p className="font-medium text-gray-700">{session?.cashier_nom ?? (session ? 'Signature' : '—')}</p>
                            </div>
                            <div className="space-y-16 border-t border-black pt-2">
                                <p className="font-bold uppercase tracking-wider">Le Manager Finance</p>
                                <p className="font-medium text-gray-700">{session?.authorized_by_nom ?? (session ? 'Visa & Signature' : '—')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}