import { useState, useMemo } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { PageProps } from '@/types';

interface Justificatif {
    id: string;
    nom?: string;
    description?: string;
    montant: number;
    scan?: string;
    fileUrl: string | null;
}

interface LigneRequisition {
    id: string;
    activite: string;
    codeBudget?: string;
    codeAllBudget?: string;
    codeAllocation?: string | null;
    code_allocation?: string | null;
    nature: string;
    quantiteOuDuree: number;
    unite: string;
    frais: number;
    prixUnitaire?: number;
    total: number;
    justificatifs?: Justificatif[];
    justif?: Justificatif[];
}

interface RequisitionDirector {
    id: string;
    numero: string;
    projet: string;
    initiateurNom: string;
    initiateurRole: string;
    nature: 'Achat' | 'Service';
    devise: 'USD' | 'FC' | 'EUR';
    montantTotal: number;
    caisseAttribuee?: string;
    observation: string | null;
    is_urgent: boolean;
    statusCode: string;
    statusLabel: string;
    canDecide: boolean;
    dateSoumission: string;
    lignes: LigneRequisition[];
}

interface Props extends PageProps {
    requisitions?: RequisitionDirector[];
}

const money = (amount: number, currency: string) =>
    `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${currency}`;

export default function DirectorDashboard({ requisitions: initialRequisitions = [] }: Props) {
    const { auth } = usePage<PageProps>().props;
    const user = auth.user;

    const [dossiers, setDossiers] = useState<RequisitionDirector[]>(initialRequisitions);

    // Modales
    const [selected, setSelected] = useState<RequisitionDirector | null>(null);
    const [rejecting, setRejecting] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');

    // SÉCURITÉ : MOT DE PASSE POUR LE BON À PAYER FINAL
    const [passwordModalOpen, setPasswordModalOpen] = useState(false);
    const [passwordSaisi, setPasswordSaisi] = useState('');
    const [processing, setProcessing] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Séparation des urgences vs approbation standard
    const dossiersUrgents = useMemo(() => dossiers.filter(d => d.statusCode === 'urgent_direction'), [dossiers]);
    const dossiersStandard = useMemo(() => dossiers.filter(d => d.statusCode !== 'urgent_direction'), [dossiers]);

    // Accord préalable pour dérogation urgente
    const handleAccorderDerogationUrgente = (id: string) => {
        router.patch(route('requisitions.urgent-director', id), {}, {
            preserveScroll: true,
            onSuccess: () => {
                setDossiers(prev => prev.filter(d => d.id !== id));
                setToast({ type: 'success', message: 'Dérogation urgente accordée. Dossier réinjecté en priorité.' });
            }
        });
    };

    // Déclencher modale mot de passe
    const handleTriggerBonAPayer = () => {
        if (!selected) return;
        setPasswordSaisi('');
        setPasswordModalOpen(true);
    };

    // Confirmer le Bon à Payer avec mot de passe de la Directrice
    const handleConfirmBonAPayer = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selected || !passwordSaisi) return;

        setProcessing(true);

        router.patch(route('requisitions.director-decision', selected.id), {
            decision: 'approve',
            password: passwordSaisi,
        }, {
            preserveScroll: true,
            onFinish: () => setProcessing(false),
            onSuccess: () => {
                const updatedId = selected.id;
                setPasswordModalOpen(false);
                setSelected(null);
                setPasswordSaisi('');

                setDossiers(prev => prev.filter(d => d.id !== updatedId));

                setToast({
                    type: 'success',
                    message: `Bon à payer accordé avec succès sur ${selected.numero}. Transmis à la Caisse.`
                });
            },
            onError: (errors) => {
                alert(errors.password || 'Erreur lors de la signature.');
            }
        });
    };

    // Rejet Directrice
    const handleReject = () => {
        if (!selected || !rejectionReason.trim()) {
            alert('Veuillez spécifier le motif du refus.');
            return;
        }

        setProcessing(true);

        router.patch(route('requisitions.director-decision', selected.id), {
            decision: 'reject',
            password: 'skip',
            motif_rejet: rejectionReason,
        }, {
            preserveScroll: true,
            onFinish: () => setProcessing(false),
            onSuccess: () => {
                const updatedId = selected.id;
                setSelected(null);
                setRejecting(false);
                setRejectionReason('');

                setDossiers(prev => prev.filter(d => d.id !== updatedId));

                setToast({
                    type: 'error',
                    message: `Réquisition ${selected.numero} rejetée par la Direction.`
                });
            },
            onError: (errors) => {
                alert(errors.motif_rejet || 'Erreur lors du rejet.');
            }
        });
    };

    return (
        <AppLayout>
            <Head title="Direction Générale - Approbations" />

            <div className="space-y-6">
                {/* En-tête */}
                <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-[#E2E8F0] pb-4">
                    <div>
                        <span className="text-[10px] uppercase font-bold text-[#F58F20] tracking-wider">
                            DIRECTION GÉNÉRALE • ASBL BON PASTEUR
                        </span>
                        <h1 className="text-xl font-bold text-[#0B192C]">
                            Supervision Financière & Approbation Finale
                        </h1>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Directrice Générale : <strong>{user.name}</strong> • Ordonnancement des dépenses et bons à payer.
                        </p>
                    </div>
                    <span className="text-xs font-mono font-bold text-[#04326D] bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
                        {dossiers.length} dossier(s) en attente
                    </span>
                </header>

                {toast && (
                    <div className={`p-3 rounded text-xs font-bold flex justify-between items-center ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' : 'bg-red-50 text-red-800 border border-red-300'}`}>
                        <span>{toast.message}</span>
                        <button type="button" onClick={() => setToast(null)} className="underline">Fermer</button>
                    </div>
                )}

                {/* SECTION 1 : DOSSIERS URGENTS (CIRCUIT DÉROGATION PRIORITAIRE) */}
                {dossiersUrgents.length > 0 && (
                    <div className="bg-red-50 border-2 border-red-400 rounded p-4 shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-red-600 animate-ping"></span>
                                <h2 className="text-xs font-black uppercase tracking-wider text-red-900">
                                    Réquisitions Déclarées URGENTES ({dossiersUrgents.length})
                                </h2>
                            </div>
                            <span className="text-[10px] text-red-700 italic">Accord préalable de la Directrice requis</span>
                        </div>

                        <div className="space-y-2">
                            {dossiersUrgents.map(urgent => (
                                <div key={urgent.id} className="bg-white p-3 rounded border border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono font-bold text-[#04326D]">{urgent.numero}</span>
                                            <span className="font-bold text-red-800">{urgent.projet}</span>
                                            <span className="text-gray-400">• Par {urgent.initiateurNom}</span>
                                        </div>
                                        <p className="text-gray-600 mt-0.5">{urgent.observation || 'Sans motif détaillé'}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono font-black text-sm text-[#0B192C]">
                                            {money(urgent.montantTotal, urgent.devise)}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleAccorderDerogationUrgente(urgent.id)}
                                            className="px-3 py-1.5 bg-[#DC2626] hover:bg-[#b91c1c] text-white rounded text-xs font-bold shadow"
                                        >
                                            Accorder Dérogation Urgente &rarr;
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* SECTION 2 : DOSSIERS PRÊTS POUR LE BON À PAYER FINAL (VISA 4) */}
                <div className="bg-white border border-[#B2BED6] rounded shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-[#E2E8F0] bg-white">
                        <h2 className="text-sm font-bold text-[#0B192C]">
                            Dossiers Visés par l'Administration en Attente de Bon à Payer
                        </h2>
                        <p className="text-[11px] text-gray-500">
                            Ces réquisitions ont reçu les 3 visas préalables (Manager Projet, Finance, Administration) et attendent votre autorisation de décaissement.
                        </p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-[#0B192C] text-white uppercase text-[10px] font-bold tracking-wider">
                                    <th className="py-3 px-4">Numéro</th>
                                    <th className="py-3 px-4">Projet</th>
                                    <th className="py-3 px-4">Demandeur</th>
                                    <th className="py-3 px-4">Observation</th>
                                    <th className="py-3 px-4 text-right">Montant Total</th>
                                    <th className="py-3 px-4 text-center">Urgence</th>
                                    <th className="py-3 px-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E2E8F0] text-gray-700">
                                {dossiersStandard.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-8 text-center text-gray-400 italic">
                                            Aucun dossier en attente de Bon à Payer pour le moment.
                                        </td>
                                    </tr>
                                ) : (
                                    dossiersStandard.map((item) => (
                                        <tr key={item.id} className="hover:bg-[#F9F9FF] transition">
                                            <td className="py-3.5 px-4 font-mono font-bold text-[#04326D] whitespace-nowrap">
                                                {item.numero}
                                            </td>
                                            <td className="py-3.5 px-4 font-semibold text-gray-800">
                                                {item.projet}
                                            </td>
                                            <td className="py-3.5 px-4 whitespace-nowrap">
                                                <p className="font-bold text-[#0B192C]">{item.initiateurNom}</p>
                                                <p className="text-[10px] text-gray-400">{item.initiateurRole}</p>
                                            </td>
                                            <td className="py-3.5 px-4 max-w-xs truncate" title={item.observation || ''}>
                                                {item.observation || item.lignes.map(l => l.activite).join(', ')}
                                            </td>
                                            <td className="py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap text-[#0B192C]">
                                                {money(item.montantTotal, item.devise)}
                                            </td>
                                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                                {item.is_urgent ? (
                                                    <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded font-black text-[9px] uppercase">
                                                        URGENT
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 text-[10px]">Normal</span>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelected(item);
                                                        setRejecting(false);
                                                        setRejectionReason('');
                                                    }}
                                                    className="px-3 py-1.5 bg-[#04326D] hover:bg-[#06428f] text-white rounded font-bold text-xs shadow-sm transition"
                                                >
                                                    Examiner & Bon à Payer
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* MODALE D'EXAMEN FINAL ET BON À PAYER */}
            {selected && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white border border-[#B2BED6] shadow-2xl rounded p-6 space-y-5">
                        <header className="flex items-start justify-between border-b pb-3">
                            <div>
                                <span className="text-[10px] uppercase font-bold text-[#F58F20] tracking-wider">
                                    VISA 4 : APPROBATION FINALE & BON À PAYER
                                </span>
                                <h2 className="text-base font-bold text-[#0B192C]">
                                    Réquisition N° {selected.numero} ({selected.nature})
                                </h2>
                                <p className="text-xs text-gray-500">
                                    Dossier complet visé par le Manager de Projet, les Finances et l'Administration.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelected(null)}
                                className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none p-1"
                            >
                                &times;
                            </button>
                        </header>

                        {/* Synthèse */}
                        <div className="p-3.5 bg-[#F9F9FF] border rounded text-xs flex justify-between items-center">
                            <div>
                                <p className="font-bold text-[#0B192C]">{selected.projet}</p>
                                <p className="text-gray-500">Caisse de paiement : <strong>{selected.caisseAttribuee || 'Caisse principale'}</strong></p>
                            </div>
                            <span className="text-xl font-black font-mono text-[#04326D]">
                                {money(selected.montantTotal, selected.devise)}
                            </span>
                        </div>

                        {/* Lignes et devis */}
                        <div>
                            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                                Articles, Prestations & Devis
                            </h3>
                            <table className="w-full text-left text-xs border border-gray-200">
                                <thead className="bg-[#F1F5F9] font-bold text-gray-600">
                                    <tr>
                                        <th className="p-2">Désignation</th>
                                        <th className="p-2">Code Allocation</th>
                                        <th className="p-2 text-right">Qté/Durée</th>
                                        <th className="p-2 text-right">Prix Unitaire</th>
                                        <th className="p-2 text-right">Total</th>
                                        <th className="p-2">Pièces</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y text-gray-700">
                                    {selected.lignes.map((line) => {
                                        const unitPrice = line.frais ?? line.prixUnitaire ?? 0;
                                        const justificatifsList = line.justificatifs ?? line.justif ?? [];

                                        return (
                                            <tr key={line.id}>
                                                <td className="p-2 font-medium">{line.activite}</td>
                                                <td className="p-2 font-mono font-bold text-[#04326D]">
                                                    {line.codeAllocation || line.code_allocation || line.codeBudget || line.codeAllBudget || '—'}
                                                </td>
                                                <td className="p-2 text-right">{line.quantiteOuDuree} {line.unite}</td>
                                                <td className="p-2 text-right">{money(unitPrice, selected.devise)}</td>
                                                <td className="p-2 text-right font-bold">{money(line.total, selected.devise)}</td>
                                                <td className="p-2">
                                                    {justificatifsList.map((f, fIdx) => (
                                                        <span key={f.id || fIdx} className="block text-[10px] text-blue-600 underline">
                                                            {f.nom || f.scan || f.description}
                                                        </span>
                                                    ))}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Actions */}
                        <div className="border-t pt-4 space-y-3">
                            {!rejecting ? (
                                <div className="flex items-center justify-between">
                                    <button
                                        type="button"
                                        onClick={() => setRejecting(true)}
                                        className="px-3.5 py-1.5 border border-red-300 text-red-600 hover:bg-red-50 rounded text-xs font-bold transition"
                                    >
                                        Rejeter (Refus d'ordonnancement)
                                    </button>

                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setSelected(null)}
                                            className="px-3 py-1.5 border rounded text-xs text-gray-600 hover:bg-gray-50"
                                        >
                                            Fermer
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleTriggerBonAPayer}
                                            className="px-4 py-1.5 bg-[#10B981] hover:bg-[#059669] text-white rounded text-xs font-bold shadow flex items-center gap-1.5 transition"
                                        >
                                            <span>Accorder Bon à Payer (Décaissement Caisse)</span>
                                            <span>&rarr;</span>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-red-50 p-4 rounded border border-red-200 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-xs font-bold text-red-800 uppercase">Motif du Refus de la Direction</h4>
                                        <button type="button" onClick={() => setRejecting(false)} className="text-xs text-gray-500 hover:underline">Annuler</button>
                                    </div>
                                    <textarea
                                        rows={3}
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        placeholder="Indiquez clairement le motif du refus..."
                                        className="w-full border border-red-300 rounded p-2 text-xs focus:outline-none bg-white"
                                        required
                                    ></textarea>
                                    <div className="flex justify-end gap-2">
                                        <button type="button" onClick={() => setRejecting(false)} className="px-3 py-1.5 border rounded text-xs bg-white text-gray-700">Annuler</button>
                                        <button type="button" onClick={handleReject} disabled={processing} className="px-4 py-1.5 bg-[#DC2626] text-white rounded text-xs font-bold shadow">
                                            Confirmer le Refus
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            )}

            {/* MODALE D'AUTHENTIFICATION DE MOT DE PASSE DE LA DIRECTRICE */}
            {passwordModalOpen && selected && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4">
                    <div className="bg-white rounded border-2 border-[#04326D] shadow-2xl max-w-sm w-full p-5 space-y-4">
                        <div className="text-center border-b pb-2">
                            <h3 className="text-xs font-black uppercase text-[#0B192C] tracking-wider">
                                Autorisation de Décaissement (Bon à Payer)
                            </h3>
                            <p className="text-[10px] text-gray-500 mt-0.5">
                                Signataire : <strong>{user.name}</strong> (Directrice Générale)
                            </p>
                        </div>

                        <form onSubmit={handleConfirmBonAPayer} className="space-y-3">
                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                                    Saisissez votre mot de passe pour signer l'autorisation :
                                </label>
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    value={passwordSaisi}
                                    onChange={(e) => setPasswordSaisi(e.target.value)}
                                    className="w-full border border-gray-300 rounded p-2 text-xs focus:outline-none focus:border-[#04326D]"
                                    autoFocus
                                    required
                                />
                            </div>

                            <p className="text-[9px] text-gray-400">
                                Cette signature électronique infalsifiable ordonne au Caissier de procéder au paiement immédiat des fonds.
                            </p>

                            <div className="flex justify-end gap-2 pt-2 border-t">
                                <button
                                    type="button"
                                    onClick={() => setPasswordModalOpen(false)}
                                    className="px-3 py-1.5 border rounded text-xs text-gray-600 hover:bg-gray-50"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="px-4 py-1.5 bg-[#10B981] hover:bg-[#059669] text-white font-bold text-xs rounded shadow disabled:opacity-50"
                                >
                                    {processing ? 'Signature...' : 'Signer & Ordonner Paiement'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}