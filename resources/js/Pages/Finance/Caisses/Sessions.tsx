import { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { PageProps } from '@/types';
import {
    Clock,
    CheckCircle2,
    Lock,
    KeyRound,
    Building2,
    X,
} from 'lucide-react';

interface SessionItem {
    id: string;
    caisse_id: string;
    caisse_name: string;
    caisse_devise: string;
    cashier_name: string;
    authorized_by_name?: string;
    date_session: string;
    solde_ouverture: number;
    solde_fermeture: number | null;
    total_entrees: number;
    total_sorties: number;
    status: 'en_attente_autorisation' | 'ouverte' | 'fermee';
    opened_at?: string;
    closed_at?: string;
    observation_ouverture?: string;
    observation_cloture?: string;
}

interface CaisseOption {
    id: string;
    name: string;
    code: string;
    devise: string;
}

interface Props extends PageProps {
    sessions: {
        data: SessionItem[];
        links: any[];
    };
    caissesList: CaisseOption[];
    statusFilter: string;
    caisseFilter: string;
}

const money = (n: number, dev: string) =>
    `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${dev}`;

export default function SessionsIndex({
    sessions,
    caissesList = [],
    statusFilter = 'all',
    caisseFilter = 'all',
}: Props) {
    const { flash } = usePage<PageProps>().props;

    const [statusState, setStatusState] = useState(statusFilter);
    const [caisseState, setCaisseState] = useState(caisseFilter);

    const [sessionToAuthorize, setSessionToAuthorize] = useState<SessionItem | null>(null);
    const [pin, setPin] = useState('');
    const [pinError, setPinError] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);

    const handleApplyFilters = (st = statusState, c = caisseState) => {
        router.get(
            route('finance.caisses.sessions'),
            { status: st, caisse_id: c },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handleAuthorize = (e: React.FormEvent) => {
        e.preventDefault();
        if (!sessionToAuthorize || !pin.trim()) return;

        setProcessing(true);
        setPinError(null);

        router.patch(
            route('cashier.session.authorize-opening', sessionToAuthorize.id),
            { pin: pin.trim() },
            {
                preserveScroll: true,
                onFinish: () => setProcessing(false),
                onSuccess: () => {
                    setSessionToAuthorize(null);
                    setPin('');
                },
                onError: (errs) => {
                    setPinError(errs.pin || 'Code PIN financier incorrect.');
                },
            }
        );
    };

    return (
        <AppLayout>
            <Head title="Approbations d'Ouvertures de Guichet" />

            <div className="space-y-6">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
                    <div>
                        <nav className="text-[10px] font-bold uppercase tracking-widest text-[#B2BED6] mb-1.5 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-[#F58F20]" />
                            <span>Direction Financière</span>
                            <span className="mx-1">/</span>
                            <span className="text-[#04326D]">Approbations Guichet</span>
                        </nav>
                        <h1 className="text-xl font-bold text-[#0B192C]">
                            Autorisations d'Ouverture & Clôtures Quotidiennes
                        </h1>
                        <p className="text-[12px] text-gray-500 mt-1">
                            Cycle bancaire d'autorisation : validation par Code PIN des fonds d'ouverture et traçabilité des arrêtés de caisse.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <select
                            value={statusState}
                            onChange={(e) => {
                                setStatusState(e.target.value);
                                handleApplyFilters(e.target.value, caisseState);
                            }}
                            className="border border-[#B2BED6] rounded px-3 py-1.5 text-xs bg-white text-[#0B192C] font-semibold"
                        >
                            <option value="all">Tous les statuts</option>
                            <option value="en_attente_autorisation">En attente d'autorisation</option>
                            <option value="ouverte">Guichets ouverts</option>
                            <option value="fermee">Sessions clôturées</option>
                        </select>

                        <select
                            value={caisseState}
                            onChange={(e) => {
                                setCaisseState(e.target.value);
                                handleApplyFilters(statusState, e.target.value);
                            }}
                            className="border border-[#B2BED6] rounded px-3 py-1.5 text-xs bg-white text-[#0B192C] font-semibold"
                        >
                            <option value="all">Toutes les caisses</option>
                            {caissesList.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </header>

                {flash?.success && (
                    <div className="p-3.5 rounded bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                        <span>{flash.success}</span>
                    </div>
                )}

                <div className="bg-white border border-[#B2BED6] rounded shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-[#0B192C] text-white uppercase text-[10px] font-bold tracking-wider">
                                    <th className="py-3 px-4">Date Session</th>
                                    <th className="py-3 px-4">Caisse</th>
                                    <th className="py-3 px-4">Caissier</th>
                                    <th className="py-3 px-4 text-right">Fond d'Ouverture</th>
                                    <th className="py-3 px-4 text-right">Entrées (+)</th>
                                    <th className="py-3 px-4 text-right">Sorties (-)</th>
                                    <th className="py-3 px-4 text-right">Solde Fermeture</th>
                                    <th className="py-3 px-4 text-center">État</th>
                                    <th className="py-3 px-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E2E8F0] text-gray-700">
                                {sessions.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="py-12 text-center text-gray-400 italic">
                                            Aucune session de caisse trouvée pour ces critères.
                                        </td>
                                    </tr>
                                ) : (
                                    sessions.data.map((s) => (
                                        <tr key={s.id} className="hover:bg-[#F9F9FF] transition">
                                            <td className="py-3.5 px-4 whitespace-nowrap font-medium text-gray-800">
                                                {s.date_session}
                                            </td>
                                            <td className="py-3.5 px-4 font-bold text-[#0B192C]">
                                                {s.caisse_name}
                                            </td>
                                            <td className="py-3.5 px-4 font-medium text-gray-800">
                                                {s.cashier_name}
                                            </td>
                                            <td className="py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap text-[#04326D]">
                                                {money(s.solde_ouverture, s.caisse_devise)}
                                            </td>
                                            <td className="py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap text-emerald-700">
                                                +{money(s.total_entrees, s.caisse_devise)}
                                            </td>
                                            <td className="py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap text-red-700">
                                                -{money(s.total_sorties, s.caisse_devise)}
                                            </td>
                                            <td className="py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap text-gray-900">
                                                {s.solde_fermeture !== null ? money(s.solde_fermeture, s.caisse_devise) : '—'}
                                            </td>
                                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                                {s.status === 'en_attente_autorisation' ? (
                                                    <span className="px-2 py-0.5 rounded text-[9.5px] font-bold bg-amber-100 text-amber-900 uppercase">
                                                        Attente Accord
                                                    </span>
                                                ) : s.status === 'ouverte' ? (
                                                    <span className="px-2 py-0.5 rounded text-[9.5px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                                                        Ouverte ({s.opened_at})
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded text-[9.5px] font-bold bg-gray-100 text-gray-600 uppercase">
                                                        Clôturée ({s.closed_at})
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                                {s.status === 'en_attente_autorisation' ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSessionToAuthorize(s);
                                                            setPin('');
                                                            setPinError(null);
                                                        }}
                                                        className="inline-flex items-center gap-1 px-3 py-1 bg-[#04326D] hover:bg-[#06428f] text-white rounded font-bold text-xs shadow-sm transition"
                                                    >
                                                        <KeyRound className="w-3.5 h-3.5" />
                                                        <span>Autoriser (PIN)</span>
                                                    </button>
                                                ) : (
                                                    <span className="text-[11px] text-gray-400 italic">
                                                        {s.authorized_by_name ? `Visé par ${s.authorized_by_name}` : 'Clôturé'}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* MODALE : Autorisation d'ouverture de session par Code PIN */}
            {sessionToAuthorize && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
                    <div className="bg-white rounded border border-[#B2BED6] shadow-2xl max-w-sm w-full p-6 space-y-4 animate-slide-down">
                        <header className="flex items-start justify-between border-b pb-3">
                            <div className="flex items-center gap-2">
                                <Lock className="w-4 h-4 text-[#04326D]" />
                                <h3 className="text-sm font-bold text-[#0B192C] uppercase tracking-wide">
                                    Autoriser l'Ouverture du Guichet
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSessionToAuthorize(null)}
                                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </header>

                        <div className="p-3 bg-amber-50 border border-amber-300 rounded text-xs space-y-1">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Guichet :</span>
                                <strong className="text-[#0B192C]">{sessionToAuthorize.caisse_name}</strong>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Caissier :</span>
                                <strong className="text-[#0B192C]">{sessionToAuthorize.cashier_name}</strong>
                            </div>
                            <div className="flex justify-between border-t pt-1 font-bold">
                                <span>Fond initial déclaré :</span>
                                <span className="font-mono text-[#04326D]">
                                    {money(sessionToAuthorize.solde_ouverture, sessionToAuthorize.caisse_devise)}
                                </span>
                            </div>
                        </div>

                        {pinError && (
                            <div className="p-2.5 bg-red-50 border border-red-300 text-red-800 rounded text-xs">
                                {pinError}
                            </div>
                        )}

                        <form onSubmit={handleAuthorize} className="space-y-3.5 text-xs">
                            <div>
                                <label className="block font-bold text-gray-700 mb-1">
                                    Saisissez votre Code PIN personnel financier *
                                </label>
                                <div className="relative">
                                    <KeyRound className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    <input
                                        type="password"
                                        maxLength={6}
                                        placeholder="Code PIN (4 à 6 chiffres)"
                                        value={pin}
                                        onChange={(e) => setPin(e.target.value)}
                                        className="w-full pl-8 pr-3 py-2 border border-[#B2BED6] rounded text-xs font-mono tracking-widest text-[#0B192C] focus:outline-none focus:border-[#04326D]"
                                        autoFocus
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t">
                                <button
                                    type="button"
                                    onClick={() => setSessionToAuthorize(null)}
                                    className="px-3.5 py-1.5 border rounded text-xs font-semibold text-gray-600 hover:bg-gray-50"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="px-4 py-1.5 bg-[#04326D] hover:bg-[#06428f] text-white rounded text-xs font-bold shadow transition"
                                >
                                    {processing ? 'Validation...' : 'Valider l’Ouverture'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}