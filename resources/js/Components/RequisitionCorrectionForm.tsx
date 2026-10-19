import { useState, useMemo, useEffect } from 'react';
import { router, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';
import { X, Save, AlertCircle, Paperclip, Search, Check } from 'lucide-react';

export interface LigneCorrection {
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
    project_id?: string;
    nature: 'Achat' | 'Service';
    devise: string;
    caisse: string;
    observation: string | null;
    motifRejet?: string | null;
    lignes: LigneCorrection[];
}

interface BudgetLineOption {
    id: string;
    project_id?: string;
    code: string;
    libelle: string;
    normalizedCode: string;
    solde: number;
    devise: string;
}

interface Props {
    requisition: RequisitionCorrectionData;
    budgetLines?: BudgetLineOption[];
    onClose: () => void;
    onSuccess: () => void;
}

export default function RequisitionCorrectionForm({ requisition, budgetLines = [], onClose, onSuccess }: Props) {
    const { cashRegisters } = usePage<PageProps & { cashRegisters: { name: string; devise: string }[] }>().props;

    const [data, setData] = useState({
        nature_requisition: requisition.nature,
        caisse_decaissement: requisition.caisse,
        devise: requisition.devise as 'USD' | 'FC' | 'EUR',
        observation: requisition.observation || '',
        articles: requisition.lignes.map((l) => ({
            id: l.id,
            activite: l.activite,
            code_all_budget: l.codeBudget || '',
            nature: l.nature,
            quantiteOuDuree: l.quantiteOuDuree,
            unite: l.unite || '',
            prixUnitaire: l.prixUnitaire,
            justificatifs: [] as File[],
        })),
    });

    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [activeInputIndex, setActiveInputIndex] = useState<number | null>(null);

    const isService = data.nature_requisition === 'Service';

    // Recherche et formatage des montants
    const money = (amount: number, currency: string) => `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${currency}`;

    const getBudgetLineObject = (code: string) => {
        if (!code.trim()) return null;
        const normalized = code.trim().toLowerCase();
        return budgetLines.find(
            (l) => l.normalizedCode === normalized && (!requisition.project_id || l.project_id === requisition.project_id)
        ) || null;
    };

    const updateArticle = (index: number, field: string, value: any) => {
        const newArticles = [...data.articles];
        (newArticles[index] as any)[field] = value;
        setData({ ...data, articles: newArticles });
    };

    const totalGeneral = useMemo(() => {
        return data.articles.reduce((acc, curr) => acc + curr.quantiteOuDuree * curr.prixUnitaire, 0);
    }, [data.articles]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault(); // On bloque le comportement par défaut (GET du navigateur)
        setProcessing(true);
        setErrors({});

        // Vérification Front-End
        const missingCodes = data.articles.some(a => !a.code_all_budget.trim());
        if (missingCodes) {
            setErrors({ general: "Toutes les lignes doivent impérativement avoir un code d'imputation budgétaire valide." });
            setProcessing(false);
            return;
        }

        // Requête POST avec _method = PATCH pour Laravel (Gestion propre des fichiers avec Inertia)
        router.post(route('requisitions.update', requisition.id), {
            _method: 'patch',
            nature_requisition: data.nature_requisition,
            caisse_decaissement: data.caisse_decaissement,
            devise: data.devise,
            observation: data.observation,
            articles: data.articles.map(art => ({
                id: art.id,
                activite: art.activite,
                code_all_budget: art.code_all_budget,
                nature: art.nature,
                quantiteOuDuree: art.quantiteOuDuree,
                unite: art.unite,
                prixUnitaire: art.prixUnitaire,
                // On prépare les justificatifs tels qu'attendus par le contrôleur (articles.*.justificatifs.*.file)
                justificatifs: art.justificatifs.map(file => ({
                    file: file,
                    description: file.name
                })),
            })),
        }, {
            forceFormData: true, // Obligatoire pour envoyer des fichiers en PATCH via Inertia/Laravel
            preserveScroll: true,
            onSuccess: () => onSuccess(),
            onError: (errs) => {
                // Laravel retourne des erreurs du type "articles.0.code_all_budget"
                // On récupère la première erreur pour l'afficher
                const firstError = Object.values(errs)[0];
                setErrors({ general: firstError || "Une erreur est survenue lors de l'enregistrement." });
            },
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 animate-fade-in">
            <div className="bg-white rounded border-2 border-[#04326D] shadow-2xl max-w-6xl w-full p-6 space-y-4 max-h-[95vh] flex flex-col animate-slide-down">
                
                <header className="flex items-start justify-between border-b pb-3 shrink-0">
                    <div>
                        <span className="text-[10px] text-[#04326D] font-bold uppercase tracking-wider">
                            Formulaire de Correction
                        </span>
                        <h2 className="text-base font-bold text-[#0B192C]">
                            Réquisition N° {requisition.numero} ({data.nature_requisition})
                        </h2>
                        <p className="text-xs text-gray-500 mt-0.5">Vérifiez et corrigez les informations budgétaires ou les quantités.</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-600 font-bold transition" title="Fermer">
                        <X className="w-5 h-5" />
                    </button>
                </header>

                {requisition.motifRejet && (
                    <div className="rounded border border-red-200 bg-red-50 p-3 text-xs text-red-900 shrink-0 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                        <div>
                            <strong className="block text-red-800 uppercase mb-1 font-bold">Motif du Rejet / Retour :</strong>
                            <p className="whitespace-pre-wrap font-medium">{requisition.motifRejet}</p>
                        </div>
                    </div>
                )}

                {errors.general && (
                    <div className="rounded bg-red-100 border border-red-200 p-2.5 text-xs text-red-800 font-bold text-center shrink-0">
                        {errors.general}
                    </div>
                )}

                <div className="flex-1 overflow-visible min-h-0 flex flex-col">
                    <form onSubmit={handleSubmit} className="flex flex-col h-full space-y-4">
                        
                        {/* Paramètres Généraux */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50 border border-[#E2E8F0] p-4 rounded shrink-0">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">Caisse *</label>
                                <select
                                    value={data.caisse_decaissement}
                                    onChange={(e) => setData({ ...data, caisse_decaissement: e.target.value })}
                                    className="w-full border border-gray-300 rounded p-2 text-xs font-semibold bg-white focus:outline-none focus:border-[#04326D]"
                                    required
                                >
                                    {cashRegisters?.map((c, i) => (
                                        <option key={i} value={c.name}>{c.name} ({c.devise})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">Nature *</label>
                                <select
                                    value={data.nature_requisition}
                                    onChange={(e) => setData({ ...data, nature_requisition: e.target.value as 'Achat' | 'Service' })}
                                    className="w-full border border-gray-300 rounded p-2 text-xs font-semibold bg-white focus:outline-none focus:border-[#04326D]"
                                    required
                                >
                                    <option value="Achat">Achat</option>
                                    <option value="Service">Service</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">Devise *</label>
                                <select
                                    value={data.devise}
                                    onChange={(e) => setData({ ...data, devise: e.target.value as 'USD' | 'FC' | 'EUR' })}
                                    className="w-full border border-gray-300 rounded p-2 text-xs font-semibold bg-white focus:outline-none focus:border-[#04326D]"
                                    required
                                >
                                    <option value="USD">USD</option>
                                    <option value="FC">Francs Congolais (FC)</option>
                                    <option value="EUR">Euros (EUR)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1.5">Observation globale</label>
                                <input
                                    type="text"
                                    value={data.observation}
                                    onChange={(e) => setData({ ...data, observation: e.target.value })}
                                    placeholder="Optionnel..."
                                    className="w-full border border-gray-300 rounded p-2 text-xs focus:outline-none focus:border-[#04326D]"
                                />
                            </div>
                        </div>

                        {/* TABLEAU DES LIGNES avec LISTE DÉROULANTE GÉANTE */}
                        <div className="flex-1 border border-[#B2BED6] rounded flex flex-col overflow-visible shadow-sm">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-[#0B192C] text-white font-bold sticky top-0 z-[50]">
                                    <tr>
                                        <th className="p-2.5 uppercase tracking-wider text-[10px]">Désignation *</th>
                                        <th className="p-2.5 w-[380px] uppercase tracking-wider text-[10px]">Code Budgétaire *</th>
                                        <th className="p-2.5 w-24 text-center uppercase tracking-wider text-[10px]">{isService ? 'Durée' : 'Qté'} *</th>
                                        <th className="p-2.5 w-24 uppercase tracking-wider text-[10px]">Unité</th>
                                        <th className="p-2.5 w-28 text-right uppercase tracking-wider text-[10px]">P.U ({data.devise}) *</th>
                                        <th className="p-2.5 w-32 text-right uppercase tracking-wider text-[10px]">Total ({data.devise})</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 text-gray-700 bg-white">
                                    {data.articles.map((art, index) => {
                                        const currentCode = art.code_all_budget || '';
                                        const matchedLine = getBudgetLineObject(currentCode);
                                        const totalLigne = art.quantiteOuDuree * art.prixUnitaire;

                                        // Filtre STRICT au Front-End par Projet 
                                        const filteredSuggestions = budgetLines.filter((b) => {
                                            if (requisition.project_id && b.project_id && b.project_id !== requisition.project_id) {
                                                return false;
                                            }
                                            const q = currentCode.trim().toLowerCase();
                                            if (!q) return false;
                                            return b.code.toLowerCase().includes(q) || b.libelle.toLowerCase().includes(q);
                                        });

                                        return (
                                            <tr key={art.id}>
                                                <td className="p-2.5 align-top">
                                                    <textarea
                                                        value={art.activite}
                                                        onChange={(e) => updateArticle(index, 'activite', e.target.value)}
                                                        className="w-full border border-gray-300 rounded p-1.5 text-xs font-semibold focus:border-[#04326D] resize-none focus:ring-1 focus:ring-[#04326D]"
                                                        rows={2}
                                                        placeholder="Description de la ligne..."
                                                        required
                                                    />
                                                    
                                                    <label className="flex items-center gap-1.5 mt-2 text-[10px] font-bold text-gray-500 cursor-pointer hover:text-[#04326D] transition">
                                                        <Paperclip className="w-3.5 h-3.5" />
                                                        <span className={art.justificatifs.length > 0 ? "text-[#04326D]" : ""}>
                                                            {art.justificatifs.length > 0 ? `${art.justificatifs.length} nouveau(x) fichier(s) prêt(s)` : 'Remplacer les justificatifs (PDF/IMG)'}
                                                        </span>
                                                        <input 
                                                            type="file" 
                                                            className="hidden" 
                                                            multiple 
                                                            accept=".pdf,.png,.jpg,.jpeg"
                                                            onChange={(e) => {
                                                                if(e.target.files) {
                                                                    updateArticle(index, 'justificatifs', Array.from(e.target.files));
                                                                }
                                                            }}
                                                        />
                                                    </label>
                                                </td>
                                                <td className="p-2.5 align-top relative">
                                                    <div className="relative">
                                                        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2 top-2 pointer-events-none" />
                                                        <input
                                                            type="text"
                                                            value={currentCode}
                                                            onFocus={() => setActiveInputIndex(index)}
                                                            onChange={(e) => {
                                                                updateArticle(index, 'code_all_budget', e.target.value);
                                                                setActiveInputIndex(index);
                                                            }}
                                                            placeholder="Chercher code ou libellé..."
                                                            className={`w-full pl-7 pr-2 border rounded p-1.5 text-xs font-mono font-bold focus:outline-none transition ${
                                                                matchedLine 
                                                                ? 'border-emerald-500 text-emerald-800 bg-emerald-50 focus:ring-1 focus:ring-emerald-500' 
                                                                : 'border-gray-300 focus:border-[#04326D] focus:ring-1 focus:ring-[#04326D]'
                                                            }`}
                                                            required
                                                        />
                                                        
                                                        {activeInputIndex === index && filteredSuggestions.length > 0 && (
                                                            <div className="absolute left-0 top-full mt-1 w-[450px] bg-white border-2 border-[#04326D] rounded shadow-2xl z-[200] max-h-60 overflow-y-auto divide-y text-xs">
                                                                {filteredSuggestions.map((sug) => (
                                                                    <button
                                                                        key={sug.id}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            updateArticle(index, 'code_all_budget', sug.code);
                                                                            setActiveInputIndex(null);
                                                                        }}
                                                                        className="w-full p-2.5 text-left hover:bg-blue-50 transition flex flex-col gap-1"
                                                                    >
                                                                        <div className="flex justify-between items-center">
                                                                            <div className="flex items-center gap-1.5">
                                                                                <strong className="font-mono text-[#04326D] text-[13px]">{sug.code}</strong>
                                                                                {sug.code === currentCode && <Check className="w-3 h-3 text-[#04326D]" />}
                                                                            </div>
                                                                            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold border border-emerald-200">
                                                                                Solde dispo: {money(sug.solde, sug.devise)}
                                                                            </span>
                                                                        </div>
                                                                        <span className="text-[11px] text-gray-700 whitespace-normal font-medium">{sug.libelle}</span>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                        <div className="text-[10px] text-gray-500 mt-1.5 px-1 font-medium leading-tight">
                                                            {matchedLine ? (
                                                                <span className="text-emerald-700 font-bold">✓ {matchedLine.libelle}</span>
                                                            ) : 'Aucun code valide sélectionné'}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-2.5 align-top">
                                                    <input
                                                        type="number"
                                                        min="0.1" step="any"
                                                        value={art.quantiteOuDuree}
                                                        onChange={(e) => updateArticle(index, 'quantiteOuDuree', parseFloat(e.target.value) || 0)}
                                                        className="w-full border border-gray-300 rounded p-1.5 text-xs text-center font-mono focus:outline-none focus:border-[#04326D] focus:ring-1 focus:ring-[#04326D]"
                                                        required
                                                    />
                                                </td>
                                                <td className="p-2.5 align-top">
                                                    <input
                                                        type="text"
                                                        value={art.unite}
                                                        onChange={(e) => updateArticle(index, 'unite', e.target.value)}
                                                        placeholder="ex: Pcs, Jours"
                                                        className="w-full border border-gray-300 rounded p-1.5 text-xs focus:outline-none focus:border-[#04326D] focus:ring-1 focus:ring-[#04326D]"
                                                    />
                                                </td>
                                                <td className="p-2.5 align-top relative">
                                                    <input
                                                        type="number"
                                                        min="0" step="any"
                                                        value={art.prixUnitaire}
                                                        onChange={(e) => updateArticle(index, 'prixUnitaire', parseFloat(e.target.value) || 0)}
                                                        className="w-full border border-gray-300 rounded p-1.5 text-xs text-right font-mono focus:outline-none focus:border-[#04326D] focus:ring-1 focus:ring-[#04326D]"
                                                        required
                                                    />
                                                </td>
                                                <td className="p-2.5 align-top text-right font-mono font-black text-[#0B192C] bg-gray-50 align-middle">
                                                    {totalLigne.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot className="bg-[#E2E8F0] font-bold border-t border-[#B2BED6]">
                                    <tr>
                                        <td colSpan={5} className="p-3 text-right uppercase text-[#0B192C] text-[11px] tracking-widest">Total Général :</td>
                                        <td className="p-3 text-right font-mono text-[#04326D] text-sm font-black tracking-tight">
                                            {totalGeneral.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {data.devise}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-[#E2E8F0] shrink-0">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={processing}
                                className="px-5 py-2.5 border border-[#B2BED6] rounded font-bold text-gray-600 text-xs hover:bg-gray-100 transition disabled:opacity-50"
                            >
                                Annuler
                            </button>
                            <button
                                type="submit"
                                disabled={processing}
                                className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-[#04326D] hover:bg-[#06428f] text-white rounded font-bold shadow-md text-xs transition disabled:opacity-50"
                            >
                                <Save className="w-4 h-4" />
                                <span>{processing ? 'Enregistrement en cours...' : 'Valider & Resoumettre la demande'}</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}