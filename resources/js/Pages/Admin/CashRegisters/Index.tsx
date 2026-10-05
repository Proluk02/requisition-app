import { useState } from 'react';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { PageProps } from '@/types';
import {
    Wallet,
    Plus,
    Pencil,
    Trash2,
    Users,
    CheckCircle2,
    AlertCircle,
    X,
} from 'lucide-react';

interface CashierUser {
    id: string;
    name: string;
    email: string;
}

interface CashRegisterItem {
    id: string;
    name: string;
    code: string;
    devise: string;
    solde_actuel: number;
    is_active: boolean;
    cashiers: CashierUser[];
    sessions_count: number;
    movements_count: number;
}

interface Props extends PageProps {
    cashRegisters: CashRegisterItem[];
    availableCashiers: CashierUser[];
}

const money = (n: number, dev: string) =>
    `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${dev}`;

export default function CashRegistersIndex({ cashRegisters = [], availableCashiers = [] }: Props) {
    const { flash } = usePage<PageProps>().props;

    const [modalOpen, setModalOpen] = useState(false);
    const [editingCaisse, setEditingCaisse] = useState<CashRegisterItem | null>(null);

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

    const handleOpenEdit = (caisse: CashRegisterItem) => {
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
            form.put(route('admin.cash-registers.update', editingCaisse.id), {
                preserveScroll: true,
                onSuccess: () => setModalOpen(false),
            });
        } else {
            form.post(route('admin.cash-registers.store'), {
                preserveScroll: true,
                onSuccess: () => setModalOpen(false),
            });
        }
    };

    const handleDelete = (caisse: CashRegisterItem) => {
        if (confirm(`Confirmez-vous la suppression de la caisse ${caisse.name} ?`)) {
            router.delete(route('admin.cash-registers.destroy', caisse.id), {
                preserveScroll: true,
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

    return (
        <AppLayout>
            <Head title="Administration — Caisses & Guichets" />

            <div className="space-y-6">
                <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
                    <div>
                        <nav className="text-[10px] font-bold uppercase tracking-widest text-[#B2BED6] mb-1.5 flex items-center gap-1.5">
                            <Wallet className="w-3.5 h-3.5 text-[#04326D]" />
                            <span>Administration</span>
                            <span className="mx-1">/</span>
                            <span className="text-[#04326D]">Caisses</span>
                        </nav>
                        <h1 className="text-xl font-bold text-[#0B192C]">
                            Gestion des Caisses & Affectation des Caissiers
                        </h1>
                        <p className="text-[12px] text-gray-500 mt-1">
                            Configuration des guichets de trésorerie, suivi des soldes et habilitation multi-caisses pour les caissiers.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleOpenCreate}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#04326D] hover:bg-[#06428f] text-white rounded font-bold text-xs shadow-sm transition"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Nouvelle Caisse</span>
                    </button>
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

                <div className="bg-white border border-[#B2BED6] rounded shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-[#0B192C] text-white uppercase text-[10px] font-bold tracking-wider">
                                    <th className="py-3 px-4">Code Caisse</th>
                                    <th className="py-3 px-4">Nom de la Caisse</th>
                                    <th className="py-3 px-4">Devise</th>
                                    <th className="py-3 px-4 text-right">Solde Actuel</th>
                                    <th className="py-3 px-4">Caissiers Habilités</th>
                                    <th className="py-3 px-4 text-center">Statut</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E2E8F0] text-gray-700">
                                {cashRegisters.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center text-gray-400 italic">
                                            Aucune caisse enregistrée.
                                        </td>
                                    </tr>
                                ) : (
                                    cashRegisters.map((c) => (
                                        <tr key={c.id} className="hover:bg-[#F9F9FF] transition">
                                            <td className="py-3.5 px-4 font-mono font-bold text-[#04326D] whitespace-nowrap">
                                                {c.code}
                                            </td>
                                            <td className="py-3.5 px-4 font-bold text-[#0B192C]">
                                                {c.name}
                                            </td>
                                            <td className="py-3.5 px-4 font-mono font-bold text-gray-600">
                                                {c.devise}
                                            </td>
                                            <td className="py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap text-emerald-700">
                                                {money(c.solde_actuel, c.devise)}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {c.cashiers.length === 0 ? (
                                                        <span className="text-[10px] text-gray-400 italic">
                                                            Aucun caissier affecté
                                                        </span>
                                                    ) : (
                                                        c.cashiers.map((u) => (
                                                            <span
                                                                key={u.id}
                                                                className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded"
                                                            >
                                                                <Users className="w-2.5 h-2.5" />
                                                                {u.name}
                                                            </span>
                                                        ))
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                                {c.is_active ? (
                                                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[9px] uppercase">
                                                        Active
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded font-bold text-[9px] uppercase">
                                                        Fermée
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                                <div className="inline-flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenEdit(c)}
                                                        className="p-1.5 text-gray-500 hover:text-[#04326D] hover:bg-gray-100 rounded transition"
                                                        title="Modifier"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(c)}
                                                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition"
                                                        title="Supprimer"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
                    <div className="bg-white rounded border border-[#B2BED6] shadow-2xl max-w-lg w-full p-6 space-y-4 animate-slide-down">
                        <header className="flex items-start justify-between border-b pb-3">
                            <h3 className="text-sm font-bold text-[#0B192C] uppercase tracking-wide">
                                {editingCaisse ? `Modifier Caisse : ${editingCaisse.name}` : 'Nouvelle Caisse de Trésorerie'}
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
                                        placeholder="ex: Caisse principale, EU"
                                        value={form.data.name}
                                        onChange={(e) => form.setData('name', e.target.value)}
                                        className="w-full border border-[#B2BED6] rounded p-2 text-xs font-bold focus:outline-none focus:border-[#04326D]"
                                        required
                                    />
                                    {form.errors.name && (
                                        <p className="text-[10px] text-red-600 mt-1">{form.errors.name}</p>
                                    )}
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
                                    {form.errors.code && (
                                        <p className="text-[10px] text-red-600 mt-1">{form.errors.code}</p>
                                    )}
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
                                        <option value="USD">USD ($ - Dollar)</option>
                                        <option value="FC">FC (CDF - Franc Congolais)</option>
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
                                        <label className="block font-bold text-gray-700 mb-1">État du Guichet</label>
                                        <label className="inline-flex items-center gap-2 mt-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={form.data.is_active}
                                                onChange={(e) => form.setData('is_active', e.target.checked)}
                                                className="rounded border-gray-300 text-[#04326D] focus:ring-[#04326D]"
                                            />
                                            <span className="font-semibold text-gray-700">Caisse Opérationnelle</span>
                                        </label>
                                    </div>
                                )}
                            </div>

                            <div className="p-3 bg-gray-50 border border-gray-200 rounded space-y-2">
                                <label className="block text-[11px] font-bold text-[#0B192C] uppercase tracking-wider">
                                    Affecter les Caissiers Autorisés à ce Guichet
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