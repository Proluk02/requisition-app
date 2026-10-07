import { useState } from 'react';
import { router } from '@inertiajs/react';
import { X } from 'lucide-react';

export interface RequisitionCorrectionLine {
    id: string;
    activite: string;
    codeBudget: string;
    nature: string;
    quantiteOuDuree: number;
    unite: string;
    prixUnitaire: number;
}

export interface RequisitionCorrectionData {
    id: string;
    numero: string;
    nature: 'Achat' | 'Service';
    devise: 'USD' | 'FC' | 'EUR';
    caisse: string;
    observation: string | null;
    lignes: RequisitionCorrectionLine[];
}

interface Props {
    requisition: RequisitionCorrectionData;
    onClose: () => void;
    onSuccess: () => void;
}

export default function RequisitionCorrectionForm({ requisition, onClose, onSuccess }: Props) {
    const [form, setForm] = useState(requisition);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const updateLine = (id: string, changes: Partial<RequisitionCorrectionLine>) => {
        setForm((current) => ({
            ...current,
            lignes: current.lignes.map((line) => line.id === id ? { ...line, ...changes } : line),
        }));
    };

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        setError(null);
        router.patch(route('requisitions.update', form.id), {
            nature_requisition: form.nature,
            caisse_decaissement: form.caisse,
            devise: form.devise,
            observation: form.observation,
            articles: form.lignes.map((line) => ({
                id: line.id,
                activite: line.activite,
                code_all_budget: line.codeBudget,
                nature: line.nature,
                quantiteOuDuree: line.quantiteOuDuree,
                unite: line.unite,
                prixUnitaire: line.prixUnitaire,
            })),
        }, {
            preserveScroll: true,
            onStart: () => setSaving(true),
            onFinish: () => setSaving(false),
            onError: (errors) => setError(Object.values(errors)[0] ?? 'Erreur lors de la correction.'),
            onSuccess,
        });
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
            <form onSubmit={submit} className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded bg-white p-6 shadow-2xl space-y-4">
                <header className="flex items-center justify-between border-b pb-3">
                    <div>
                        <h2 className="font-bold text-gray-900">Corriger la réquisition {form.numero}</h2>
                        <p className="text-xs text-gray-500">Après enregistrement, le dossier sera resoumis à l’étape suivante.</p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Fermer" className="p-1 text-gray-500 hover:text-gray-900">
                        <X className="h-5 w-5" />
                    </button>
                </header>

                {error && <p role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

                <div className="grid gap-3 sm:grid-cols-3">
                    <label className="text-xs font-semibold">Nature
                        <select value={form.nature} onChange={(e) => setForm({ ...form, nature: e.target.value as RequisitionCorrectionData['nature'] })} className="mt-1 w-full rounded border p-2">
                            <option value="Achat">Achat</option>
                            <option value="Service">Service</option>
                        </select>
                    </label>
                    <label className="text-xs font-semibold">Devise
                        <select value={form.devise} onChange={(e) => setForm({ ...form, devise: e.target.value as RequisitionCorrectionData['devise'] })} className="mt-1 w-full rounded border p-2">
                            <option value="USD">USD</option>
                            <option value="FC">FC</option>
                            <option value="EUR">EUR</option>
                        </select>
                    </label>
                    <label className="text-xs font-semibold">Caisse
                        <input required value={form.caisse} onChange={(e) => setForm({ ...form, caisse: e.target.value })} className="mt-1 w-full rounded border p-2" />
                    </label>
                </div>

                <label className="block text-xs font-semibold">Observation / motif
                    <textarea value={form.observation ?? ''} onChange={(e) => setForm({ ...form, observation: e.target.value || null })} rows={3} className="mt-1 w-full rounded border p-2" />
                </label>

                <div className="space-y-3">
                    {form.lignes.map((line) => (
                        <div key={line.id} className="grid gap-2 rounded border p-3 sm:grid-cols-12">
                            <label className="text-xs font-semibold sm:col-span-4">Désignation
                                <input required value={line.activite} onChange={(e) => updateLine(line.id, { activite: e.target.value })} className="mt-1 w-full rounded border p-2" />
                            </label>
                            <label className="text-xs font-semibold sm:col-span-2">Code budget
                                <input value={line.codeBudget} onChange={(e) => updateLine(line.id, { codeBudget: e.target.value })} className="mt-1 w-full rounded border p-2" />
                            </label>
                            <label className="text-xs font-semibold sm:col-span-2">Quantité / durée
                                <input type="number" min="0" step="0.01" required value={line.quantiteOuDuree} onChange={(e) => updateLine(line.id, { quantiteOuDuree: Number(e.target.value) })} className="mt-1 w-full rounded border p-2" />
                            </label>
                            <label className="text-xs font-semibold sm:col-span-2">Unité
                                <input value={line.unite} onChange={(e) => updateLine(line.id, { unite: e.target.value })} className="mt-1 w-full rounded border p-2" />
                            </label>
                            <label className="text-xs font-semibold sm:col-span-2">Prix unitaire
                                <input type="number" min="0" step="0.01" required value={line.prixUnitaire} onChange={(e) => updateLine(line.id, { prixUnitaire: Number(e.target.value) })} className="mt-1 w-full rounded border p-2" />
                            </label>
                        </div>
                    ))}
                </div>

                <footer className="flex justify-end gap-2 border-t pt-3">
                    <button type="button" onClick={onClose} className="rounded border px-4 py-2 text-sm">Annuler</button>
                    <button type="submit" disabled={saving} className="rounded bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                        {saving ? 'Enregistrement…' : 'Corriger et resoumettre'}
                    </button>
                </footer>
            </form>
        </div>
    );
}
