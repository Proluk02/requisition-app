import { useState } from 'react';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { PageProps } from '@/types';
import {
    Building2,
    Wallet,
    Users,
    Plus,
    Pencil,
    CheckCircle2,
    AlertCircle,
    X,
    Clock,
    ArrowUpRight,
    ArrowDownLeft,
    FileText,
} from 'lucide-react';

interface CashierItem {
    id: string;
    name: string;
    email: string;
}

interface CaisseData {
    id: string;
    name: string;
    code: string;
    devise: string;
    solde_actuel: number;
    is_active: boolean;
    is_ouverte: boolean;
    cashiers: CashierItem[];
    requisitions_count: number;
    movements_count: number;
    active_session: {
        id: string;
        status: string;
        solde_ouverture: number;
        total_entrees: number;
        total_sorties: number;
        opened_at?: string;
    } | null;
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
    caisse_nom?: string;
    cashier_nom?: string;
}

interface Props extends PageProps {
    caisses: CaisseData[];
    selectedCaisseId: string;
    movements: MouvementItem[];
    availableCashiers: CashierItem[];
    pendingSessionsCount: number;
    stats: {
        totalSoldeUSD: number;
        totalSoldeFC: number;
        caissesOuvertesCount: number;
        totalCaissesCount: number;
    };
}

const money = (n: number, dev: string) =>
    `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${dev}`;

export default function CaissesIndex({
    caisses = [],
    selectedCaisseId = '',
    movements = [],
    availableCashiers = [],
    pendingSessionsCount = 0,
    stats,
}: Props) {
    const { flash } = usePage<PageProps>().props;

    const [modalOpen, setModalOpen] = useState(false);
    const [editingCaisse, setEditingCaisse] = useState<CaisseData | null>(null);

    const form = useForm<{
        name: string;
        code: string;
        devise: 'USD' | 'FC';
        solde_initial: string;
        is_active: boolean;
        cashier_ids: string[];
    }>({
        name: '',
        code: '',
        devise: 'USD',
        solde_initial: '0',
        is_active: true,
        cashier_ids: [],
    });

    const handleOpenCreate = () => {
        setEditingCaisse(null);
        form.setData({
            name: '',
            code: '',
            devise: 'USD',
            solde_initial: '0',
            is_active: true,
            cashier_ids: [],
        });
        setModalOpen(true);
    };

    const handleOpenEdit = (caisse: CaisseData) => {
        setEditingCaisse(caisse);
        form.setData({
            name: caisse.name,
            code: caisse.code,
            devise: caisse.devise as 'USD' | 'FC',
            solde_initial: String(caisse.solde_actuel),
            is_active: caisse.is_active,
            cashier_ids: caisse.cashiers.map((c) => c.id),
        });
        setModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingCaisse) {
            form.put(route('finance.caisses.update', editingCaisse.id), {
                preserveScroll: true,
                onSuccess: () => setModalOpen(false),
            });
        } else {
            form.post(route('finance.caisses.store'), {
                preserveScroll: true,
                onSuccess: () => setModalOpen(false),
            });
        }
    };

    const toggleCashier = (userId: string) => {
        const current = [...form.data.cashier_ids];
        const index = current.indexOf(userId);
        if (index > -1) {
            current.splice(index, 1);
        } else {
            current.push(userId);
        }
        form.setData('cashier_ids', current);
    };

    const handleFilterMouvements = (caisseId: string) => {
        router.get(
            route('finance.caisses.index'),
            { caisse_id: caisseId },
            { preserveState: true, preserveScroll: true }
        );
    };

    return (
        <AppLayout>
            <Head title="Direction Financière — Gestion des Caisses" />

            <div className="space-y-6">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
                    <div>
                        <nav className="text-[10px] font-bold uppercase tracking-widest text-[#B2BED6] mb-1.5 flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-[#04326D]" />
                            <span>Direction Financière</span>
                            <span className="mx-1">/</span>
                            <span className="text-[#04326D]">Caisses & Guichets</span>
                        </nav>
                        <h1 className="text-xl font-bold text-[#0B192C]">
                            Supervision & Gestion des Caisses
                        </h1>
                        <p className="text-[12px] text-gray-500 mt-1">
                            Configuration des guichets physiques, suivi des soldes en direct et affectation des caissiers.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Link
                            href={route('finance.caisses.sessions')}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-[#B2BED6] hover:bg-gray-50 text-[#0B192C] rounded font-bold text-xs shadow-sm transition"
                        >
                            <Clock className="w-4 h-4 text-[#F58F20]" />
                            <span>Approbations d'Ouvertures</span>
                            {pendingSessionsCount > 0 && (
                                <span className="ml-1 px-1.5 py-0.2 bg-[#F58F20] text-white text-[9px] rounded-full">
                                    {pendingSessionsCount}
                                </span>
                            )}
                        </Link>

                        <button
                            type="button"
                            onClick={handleOpenCreate}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#04326D] hover:bg-[#06428f] text-white rounded font-bold text-xs shadow-sm transition"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Nouvelle Caisse</span>
                        </button>
                    </div>
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

                {/* Synthèse globale des liquidités */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-white p-4 rounded border border-[#B2BED6] shadow-sm flex flex-col justify-between">
                        <span className="text-[10.5px] font-bold uppercase tracking-wider text-gray-500">
                            Disponibilités USD (Caisses)
                        </span>
                        <p className="text-2xl font-black text-[#04326D] mt-2 font-mono tabular-nums">
                            {money(stats.totalSoldeUSD, '$')}
                        </p>
                        <span className="text-[10px] text-gray-400 mt-1">Liquidités physiques</span>
                    </div>

                    <div className="bg-white p-4 rounded border border-[#B2BED6] shadow-sm flex flex-col justify-between">
                        <span className="text-[10.5px] font-bold uppercase tracking-wider text-gray-500">
                            Disponibilités CDF (Caisses)
                        </span>
                        <p className="text-2xl font-black text-[#0B192C] mt-2 font-mono tabular-nums">
                            {money(stats.totalSoldeFC, 'FC')}
                        </p>
                        <span className="text-[10px] text-gray-400 mt-1">Francs Congolais</span>
                    </div>

                    <div className="bg-white p-4 rounded border border-[#B2BED6] shadow-sm flex flex-col justify-between">
                        <span className="text-[10.5px] font-bold uppercase tracking-wider text-gray-500">
                            Guichets Ouverts Aujourd'hui
                        </span>
                        <p className="text-2xl font-black text-emerald-700 mt-2 font-mono tabular-nums">
                            {stats.caissesOuvertesCount} / {stats.totalCaissesCount}
                        </p>
                        <span className="text-[10px] text-gray-400 mt-1">Sessions autorisées</span>
                    </div>

                    <div className="bg-[#0B192C] p-4 rounded text-white shadow-sm flex flex-col justify-between">
                        <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#B2BED6]">
                            Demandes d'Ouverture
                        </span>
                        <p className="text-2xl font-black text-amber-400 mt-2 font-mono tabular-nums">
                            {pendingSessionsCount}
                        </p>
                        <span className="text-[10px] text-[#B2BED6] mt-1">En attente d'accord MF</span>
                    </div>
                </div>

                {/* Cartes individuelles des caisses */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {caisses.map((caisse) => (
                        <div
                            key={caisse.id}
                            className="bg-white border border-[#B2BED6] rounded p-5 shadow-sm space-y-3 flex flex-col justify-between"
                        >
                            <div className="flex items-start justify-between border-b pb-3">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-bold text-[#0B192C]">{caisse.name}</h3>
                                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                                            {caisse.code}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-gray-500 mt-0.5">
                                        {caisse.requisitions_count} réquisition(s) rattachée(s)
                                    </p>
                                </div>

                                <div className="text-right">
                                    {caisse.is_ouverte ? (
                                        <span className="inline-block px-2 py-0.5 rounded text-[9.5px] font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wide">
                                            Ouverte
                                        </span>
                                    ) : (
                                        <span className="inline-block px-2 py-0.5 rounded text-[9.5px] font-bold bg-gray-200 text-gray-600 uppercase tracking-wide">
                                            Fermée
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="p-3 bg-[#F9F9FF] border border-gray-200 rounded">
                                <span className="text-[10px] uppercase font-bold text-gray-500 block">
                                    Solde Disponible Actuel :
                                </span>
                                <span className="text-xl font-black font-mono text-[#04326D]">
                                    {money(caisse.solde_actuel, caisse.devise)}
                                </span>
                            </div>

                            <div className="space-y-1 text-xs">
                                <span className="text-[10.5px] font-bold text-gray-600 uppercase block">
                                    Caissiers Habilités :
                                </span>
                                <div className="flex flex-wrap gap-1">
                                    {caisse.cashiers.length === 0 ? (
                                        <span className="text-[11px] text-gray-400 italic">Aucun caissier affecté</span>
                                    ) : (
                                        caisse.cashiers.map((u) => (
                                            <span
                                                key={u.id}
                                                className="inline-flex items-center gap-1 text-[10px] font-bold bg-blue-50 text-[#04326D] px-2 py-0.5 rounded border border-blue-200"
                                            >
                                                <Users className="w-2.5 h-2.5" />
                                                {u.name}
                                            </span>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="pt-3 border-t flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => handleFilterMouvements(caisse.id)}
                                    className="text-xs font-bold text-[#04326D] hover:underline"
                                >
                                    Filtrer mouvements ({caisse.movements_count})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleOpenEdit(caisse)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs border border-gray-300 rounded font-semibold text-gray-700 hover:bg-gray-50"
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                    <span>Gérer</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Journal des mouvements récents */}
                <div className="bg-white border border-[#B2BED6] rounded shadow-sm overflow-hidden">
                    <header className="p-4 border-b flex items-center justify-between bg-gray-50">
                        <div className="flex items-center gap-2">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B192C]">
                                Journal des Mouvements de Caisse Récents
                            </h3>
                            {selectedCaisseId && selectedCaisseId !== 'all' && (
                                <button
                                    type="button"
                                    onClick={() => handleFilterMouvements('all')}
                                    className="text-[10.5px] font-bold text-red-600 hover:underline"
                                >
                                    (Effacer filtre caisse)
                                </button>
                            )}
                        </div>
                        <span className="text-xs text-gray-500 font-mono font-bold">
                            {movements.length} mouvement(s) affiché(s)
                        </span>
                    </header>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-[#0B192C] text-white uppercase text-[10px] font-bold tracking-wider">
                                    <th className="py-2.5 px-4">N° Pièce</th>
                                    <th className="py-2.5 px-4">Date</th>
                                    <th className="py-2.5 px-4">Caisse</th>
                                    <th className="py-2.5 px-4">Tiers / Bénéficiaire</th>
                                    <th className="py-2.5 px-4">Motif</th>
                                    <th className="py-2.5 px-4">Imputation</th>
                                    <th className="py-2.5 px-4 text-right">Montant</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 text-gray-700">
                                {movements.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center text-gray-400 italic">
                                            Aucun mouvement de caisse enregistré.
                                        </td>
                                    </tr>
                                ) : (
                                    movements.map((m) => (
                                        <tr key={m.id} className="hover:bg-[#F9F9FF] transition">
                                            <td className="py-3 px-4 font-mono font-bold text-[#04326D]">
                                                {m.numero_piece}
                                            </td>
                                            <td className="py-3 px-4 whitespace-nowrap text-gray-600">
                                                {m.date_mouvement}
                                            </td>
                                            <td className="py-3 px-4 font-semibold text-[#0B192C]">
                                                {m.caisse_nom}
                                            </td>
                                            <td className="py-3 px-4 font-medium text-gray-800">
                                                {m.tiers_nom}
                                            </td>
                                            <td className="py-3 px-4 max-w-xs truncate" title={m.motif}>
                                                {m.motif}
                                            </td>
                                            <td className="py-3 px-4 font-mono font-bold text-gray-600">
                                                {m.imputation}
                                            </td>
                                            <td
                                                className={`py-3 px-4 text-right font-mono font-bold whitespace-nowrap ${
                                                    m.type === 'entree' ? 'text-emerald-700' : 'text-red-700'
                                                }`}
                                            >
                                                {m.type === 'entree' ? '+' : '-'} {money(m.montant, m.devise)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* MODALE : Création / Modification de Caisse */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
                    <div className="bg-white rounded border border-[#B2BED6] shadow-2xl max-w-lg w-full p-6 space-y-4 animate-slide-down">
                        <header className="flex items-start justify-between border-b pb-3">
                            <h3 className="text-sm font-bold text-[#0B192C] uppercase tracking-wide">
                                {editingCaisse ? `Paramétrer : ${editingCaisse.name}` : 'Nouvelle Caisse de Trésorerie'}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </header>

                        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Nom de la Caisse *</label>
                                    <input
                                        type="text"
                                        placeholder="ex: Caisse principale"
                                        value={form.data.name}
                                        onChange={(e) => form.setData('name', e.target.value)}
                                        className="w-full border border-[#B2BED6] rounded p-2 text-xs font-bold focus:outline-none focus:border-[#04326D]"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Code Caisse *</label>
                                    <input
                                        type="text"
                                        placeholder="ex: CP-01, CAISSE-EU"
                                        value={form.data.code}
                                        onChange={(e) => form.setData('code', e.target.value)}
                                        className="w-full border border-[#B2BED6] rounded p-2 text-xs font-mono uppercase font-bold focus:outline-none focus:border-[#04326D]"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block font-bold text-gray-700 mb-1">Devise *</label>
                                    <select
                                        value={form.data.devise}
                                        onChange={(e) => form.setData('devise', e.target.value as 'USD' | 'FC')}
                                        className="w-full border border-[#B2BED6] rounded p-2 text-xs font-bold focus:outline-none focus:border-[#04326D]"
                                    >
                                        <option value="USD">USD ($)</option>
                                        <option value="FC">FC (CDF)</option>
                                    </select>
                                </div>

                                {!editingCaisse ? (
                                    <div>
                                        <label className="block font-bold text-gray-700 mb-1">Solde Initial *</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={form.data.solde_initial}
                                            onChange={(e) => form.setData('solde_initial', e.target.value)}
                                            className="w-full border border-[#B2BED6] rounded p-2 text-xs font-mono font-bold focus:outline-none focus:border-[#04326D]"
                                            required
                                        />
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block font-bold text-gray-700 mb-1">État</label>
                                        <label className="inline-flex items-center gap-2 mt-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={form.data.is_active}
                                                onChange={(e) => form.setData('is_active', e.target.checked)}
                                                className="rounded border-gray-300 text-[#04326D] focus:ring-[#04326D]"
                                            />
                                            <span className="font-semibold text-gray-700">Guichet Actif</span>
                                        </label>
                                    </div>
                                )}
                            </div>

                            <div className="p-3 bg-gray-50 border border-gray-200 rounded space-y-2">
                                <label className="block text-[11px] font-bold text-[#0B192C] uppercase tracking-wider">
                                    Affecter les Caissiers Habilités
                                </label>
                                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                                    {availableCashiers.map((cashier) => {
                                        const checked = form.data.cashier_ids.includes(cashier.id);
                                        return (
                                            <label
                                                key={cashier.id}
                                                className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition ${
                                                    checked
                                                        ? 'bg-blue-50 border-[#04326D] text-[#04326D] font-bold'
                                                        : 'bg-white border-gray-200 text-gray-700'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => toggleCashier(cashier.id)}
                                                    className="rounded border-gray-300 text-[#04326D] focus:ring-[#04326D]"
                                                />
                                                <span className="text-[11px] truncate">{cashier.name}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="px-3.5 py-1.5 border border-[#B2BED6] rounded text-xs font-semibold text-gray-600 hover:bg-gray-50"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={form.processing}
                                    className="px-4 py-1.5 bg-[#04326D] text-white rounded text-xs font-bold shadow hover:bg-[#06428f]"
                                >
                                    Enregistrer
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}