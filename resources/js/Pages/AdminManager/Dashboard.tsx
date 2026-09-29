import { useState, useMemo } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { PageProps } from '@/types';

interface Justificatif {
    id: string;
    nom: string;
    description: string;
    montant: number;
    fileUrl: string | null;
}

interface LigneRequisition {
    id: string;
    activite: string;
    codeBudget: string;
    codeAllocation: string | null;
    nature: string;
    quantiteOuDuree: number;
    unite: string;
    prixUnitaire: number;
    total: number;
    justificatifs: Justificatif[];
}

interface RequisitionAdmin {
    id: string;
    numero: string;
    projet: string;
    initiateurNom: string;
    initiateurRole: string;
    nature: 'Achat' | 'Service';
    devise: 'USD' | 'FC' | 'EUR';
    montantTotal: number;
    observation: string | null;
    is_urgent?: boolean;
    statusCode: string;
    statusLabel: string;
    canDecide: boolean;
    dateSoumission: string;
    lignes: LigneRequisition[];
}

interface Props extends PageProps {
    requisitions?: RequisitionAdmin[];
}

const money = (amount: number, currency: string) =>
    `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${currency}`;

export default function AdminManagerDashboard({ requisitions: initialRequisitions = [] }: Props) {
    const { auth } = usePage<PageProps>().props;
    const user = auth.user;

    const [requisitions, setRequisitions] = useState<RequisitionAdmin[]>(initialRequisitions);
    const [search, setSearch] = useState('');

    // Modales
    const [selected, setSelected] = useState<RequisitionAdmin | null>(null);
    const [rejecting, setRejecting] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');

    // SÉCURITÉ : MOT DE PASSE POUR LE VISA ADMINISTRATIF
    const [passwordModalOpen, setPasswordModalOpen] = useState(false);
    const [passwordSaisi, setPasswordSaisi] = useState('');
    const [processing, setProcessing] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const filteredRequisitions = useMemo(() => {
        return requisitions.filter(item =>
            item.numero.toLowerCase().includes(search.toLowerCase()) ||
            item.projet.toLowerCase().includes(search.toLowerCase()) ||
            item.initiateurNom.toLowerCase().includes(search.toLowerCase())
        );
    }, [requisitions, search]);

    const handleTriggerApprove = () => {
        if (!selected) return;
        setPasswordSaisi('');
        setPasswordModalOpen(true);
    };

    const handleConfirmSignature = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selected || !passwordSaisi) return;

        setProcessing(true);

        router.patch(route('requisitions.admin-decision', selected.id), {
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

                setRequisitions(prev => prev.filter(item => item.id !== updatedId));

                setToast({
                    type: 'success',
                    message: `Visa Administratif accordé avec succès sur ${selected.numero}. Transmis à la Directrice Générale.`
                });
            },
            onError: (errors) => {
                alert(errors.password || 'Erreur lors de la signature administrative.');
            }
        });
    };

    const handleReject = () => {
        if (!selected || !rejectionReason.trim()) {
            alert('Veuillez spécifier le motif du rejet administratif.');
            return;
        }

        setProcessing(true);

        router.patch(route('requisitions.admin-decision', selected.id), {
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

                setRequisitions(prev => prev.filter(item => item.id !== updatedId));

                setToast({
                    type: 'error',
                    message: `Réquisition ${selected.numero} renvoyée pour non-conformité administrative.`
                });
            },
            onError: (errors) => {
                alert(errors.motif_rejet || 'Erreur lors du rejet.');
            }
        });
    };

    return (
        <AppLayout>
            <Head title="Contrôle Administratif (Visa 3)" />

            <div className="space-y-6">
                {/* En-tête */}
                <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-[#E2E8F0] pb-4">
                    <div>
                        <p className="text-[10px] uppercase tracking-wider font-bold text-[#F58F20]">Étape 3 du Workflow</p>
                        <h1 className="text-xl font-bold text-[#0B192C]">Contrôle Administratif & Visa (Manager Administration)</h1>
                        <p className="text-xs text-gray-500 mt-0.5">Manager : <strong>{user.name}</strong> • Vérification de la conformité institutionnelle avant transmission à la Direction.</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-[#04326D] bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
                        {requisitions.length} dossier(s) en attente
                    </span>
                </header>

                {toast && (
                    <div className={`p-3 rounded text-xs font-bold flex justify-between items-center ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' : 'bg-red-50 text-red-800 border border-red-300'}`}>
                        <span>{toast.message}</span>
                        <button type="button" onClick={() => setToast(null)} className="underline">Fermer</button>
                    </div>
                )}

                {/* Tableau des réquisitions à viser */}
                <div className="bg-white border border-[#B2BED6] rounded shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
                        <div>
                            <h2 className="text-sm font-bold text-[#0B192C]">Dossiers Validés par Finance en Attente de Visa Administratif</h2>
                            <p className="text-[11px] text-gray-500">Examinez la conformité des demandes avant signature et transmission à la Directrice Générale.</p>
                        </div>

                        <input
                            type="text"
                            placeholder="Rechercher réf, projet, demandeur..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="border border-[#B2BED6] rounded px-3 py-1 text-xs focus:outline-none w-64"
                        />
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-[#0B192C] text-white uppercase text-[10px] font-bold tracking-wider">
                                    <th className="px-4 py-3">Numéro</th>
                                    <th className="px-4 py-3">Demandeur</th>
                                    <th className="px-4 py-3">Projet</th>
                                    <th className="px-4 py-3">Observation</th>
                                    <th className="px-4 py-3 text-right">Montant</th>
                                    <th className="px-4 py-3 text-center">Urgence</th>
                                    <th className="px-4 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E2E8F0] text-gray-700">
                                {filteredRequisitions.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-8 text-center text-gray-400 italic">
                                            Aucun dossier en attente de visa administratif pour le moment.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRequisitions.map((item) => (
                                        <tr key={item.id} className="hover:bg-[#F9F9FF] transition">
                                            <td className="px-4 py-3.5 font-mono font-bold text-[#04326D] whitespace-nowrap">
                                                {item.numero}
                                            </td>
                                            <td className="px-4 py-3.5 whitespace-nowrap">
                                                <p className="font-bold text-[#0B192C]">{item.initiateurNom}</p>
                                                <p className="text-[10px] text-gray-400">{item.initiateurRole}</p>
                                            </td>
                                            <td className="px-4 py-3.5 font-semibold text-gray-700">
                                                {item.projet}
                                            </td>
                                            <td className="px-4 py-3.5 max-w-xs truncate" title={item.observation || ''}>
                                                {item.observation || item.lignes.map(l => l.activite).join(', ')}
                                            </td>
                                            <td className="px-4 py-3.5 text-right font-mono font-bold whitespace-nowrap text-[#0B192C]">
                                                {money(item.montantTotal, item.devise)}
                                            </td>
                                            <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                                {item.is_urgent ? (
                                                    <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded font-black text-[9px] uppercase">
                                                        URGENT
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 text-[10px]">Normal</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5 text-right whitespace-nowrap">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelected(item);
                                                        setRejecting(false);
                                                        setRejectionReason('');
                                                    }}
                                                    className="px-3 py-1.5 bg-[#04326D] hover:bg-[#06428f] text-white rounded font-bold text-xs shadow-sm transition"
                                                >
                                                    Examiner & Viser
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

            {/* MODALE D'EXAMEN ET VISA ADMINISTRATIF */}
            {selected && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white border border-[#B2BED6] shadow-2xl rounded p-6 space-y-5">
                        <header className="flex items-start justify-between border-b pb-3">
                            <div>
                                <span className="text-[10px] uppercase font-bold text-[#F58F20] tracking-wider">
                                    VISA 3 : CONTRÔLE ADMINISTRATIF
                                </span>
                                <h2 className="text-base font-bold text-[#0B192C]">
                                    Réquisition N° {selected.numero} ({selected.nature})
                                </h2>
                                <p className="text-xs text-gray-500">
                                    Initiée par <strong>{selected.initiateurNom}</strong> • Projet : {selected.projet} • Date : {selected.dateSoumission}
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

                        {selected.observation && (
                            <div className="p-3 bg-amber-50 border-l-4 border-[#F58F20] text-xs text-gray-800">
                                <strong>Observation / Contexte :</strong> {selected.observation}
                            </div>
                        )}

                        {/* TABLEAU DES DEMANDES AVEC LES DEVIS */}
                        <div>
                            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                                Articles & Devis Attachés (Vérification Conformité Administrative)
                            </h3>
                            <table className="w-full text-left text-xs border border-gray-200">
                                <thead className="bg-[#F1F5F9] font-bold text-gray-600">
                                    <tr>
                                        <th className="p-2">Désignation</th>
                                        <th className="p-2">Code Budget (MP)</th>
                                        <th className="p-2 text-right">Qté/Durée</th>
                                        <th className="p-2 text-right">Prix Unitaire</th>
                                        <th className="p-2 text-right">Total</th>
                                        <th className="p-2">Pièces Jointes</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y text-gray-700">
                                    {selected.lignes.map((line) => (
                                        <tr key={line.id}>
                                            <td className="p-2 font-medium">{line.activite}</td>
                                            <td className="p-2 font-mono font-bold text-[#04326D]">
                                                {line.codeAllocation || line.codeBudget || '—'}
                                            </td>
                                            <td className="p-2 text-right">{line.quantiteOuDuree} {line.unite}</td>
                                            <td className="p-2 text-right">{money(line.prixUnitaire, selected.devise)}</td>
                                            <td className="p-2 text-right font-bold">{money(line.total, selected.devise)}</td>
                                            <td className="p-2">
                                                {line.justificatifs.length > 0 ? (
                                                    <div className="space-y-1">
                                                        {line.justificatifs.map(f => (
                                                            <div key={f.id} className="bg-blue-50 text-[#04326D] px-2 py-0.5 rounded text-[10px] flex items-center justify-between">
                                                                <span className="truncate max-w-[120px]" title={f.description}>{f.nom}</span>
                                                                {f.fileUrl && (
                                                                    <a href={f.fileUrl} target="_blank" rel="noreferrer" className="underline font-bold ml-1">
                                                                        Ouvrir
                                                                    </a>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 italic text-[10px]">Aucun justificatif</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-gray-50 font-bold border-t">
                                    <tr>
                                        <td colSpan={4} className="p-2 text-right">Montant Total Général :</td>
                                        <td className="p-2 text-right text-[#04326D] text-sm font-mono">
                                            {money(selected.montantTotal, selected.devise)}
                                        </td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* ACTIONS : ACCORDER VISA ADMINISTRATIF OU REJETER */}
                        <div className="border-t pt-4 space-y-3">
                            {!rejecting ? (
                                <div className="flex items-center justify-between">
                                    <button
                                        type="button"
                                        onClick={() => setRejecting(true)}
                                        className="px-3.5 py-1.5 border border-red-300 text-red-600 hover:bg-red-50 rounded text-xs font-bold transition"
                                    >
                                        Rejeter (Non-conformité administrative)
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
                                            onClick={handleTriggerApprove}
                                            className="px-4 py-1.5 bg-[#10B981] hover:bg-[#059669] text-white rounded text-xs font-bold shadow flex items-center gap-1.5 transition"
                                        >
                                            <span>Accorder Visa Administratif (Visa 3)</span>
                                            <span>&rarr;</span>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-red-50 p-4 rounded border border-red-200 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-xs font-bold text-red-800 uppercase">
                                            Motif du Rejet Administratif (Obligatoire)
                                        </h4>
                                        <button
                                            type="button"
                                            onClick={() => setRejecting(false)}
                                            className="text-xs text-gray-500 hover:underline"
                                        >
                                            Annuler
                                        </button>
                                    </div>
                                    <textarea
                                        rows={3}
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        placeholder="Précisez le problème administratif ou institutionnel..."
                                        className="w-full border border-red-300 rounded p-2 text-xs focus:outline-none bg-white"
                                        required
                                    ></textarea>
                                    <div className="flex justify-end gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setRejecting(false)}
                                            className="px-3 py-1.5 border rounded text-xs bg-white text-gray-700"
                                        >
                                            Annuler
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleReject}
                                            disabled={processing}
                                            className="px-4 py-1.5 bg-[#DC2626] hover:bg-[#b91c1c] text-white rounded text-xs font-bold shadow"
                                        >
                                            Confirmer le Rejet Administratif
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            )}

            {/* MODALE D'AUTHENTIFICATION DE MOT DE PASSE POUR SIGNER */}
            {passwordModalOpen && selected && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4">
                    <div className="bg-white rounded border-2 border-[#04326D] shadow-2xl max-w-sm w-full p-5 space-y-4">
                        <div className="text-center border-b pb-2">
                            <h3 className="text-xs font-black uppercase text-[#0B192C] tracking-wider">
                                Visa de Contrôle Administratif
                            </h3>
                            <p className="text-[10px] text-gray-500 mt-0.5">
                                Signataire : <strong>{user.name}</strong> (Manager Administration)
                            </p>
                        </div>

                        <form onSubmit={handleConfirmSignature} className="space-y-3">
                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                                    Saisissez votre mot de passe pour signer le visa 3 :
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
                                Un certificat électronique unique sera émis et la demande sera transmise à la Directrice Générale.
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
                                    {processing ? 'Signature...' : 'Signer & Valider'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}