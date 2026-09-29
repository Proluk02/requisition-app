import { useState, useMemo } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { PageProps } from '@/types';

interface FinanceJustificatif {
    id: string;
    nom: string;
    description: string;
    montant: number;
    fileUrl: string | null;
}

interface FinanceLine {
    id: string;
    activite: string;
    codeBudget: string;
    codeAllocation: string | null;
    nature: 'Achat' | 'Service';
    quantiteOuDuree: number;
    unite: string;
    prixUnitaire: number;
    total: number;
    justificatifs: FinanceJustificatif[];
}

interface FinanceRequisition {
    id: string;
    numero: string;
    projet: string;
    project_id?: string;
    user_id?: string;
    initiateurNom: string;
    initiateurRole: string;
    nature: 'Achat' | 'Service';
    devise: 'USD' | 'FC' | 'EUR';
    montantTotal: number;
    caisseAttribuee?: string;
    observation: string | null;
    is_urgent?: boolean;
    statusCode: string;
    statusLabel: string;
    canDecide: boolean;
    financeRejected: boolean;
    dateSoumission: string;
    lignes: FinanceLine[];
}

interface ProjectItem {
    id: string;
    name: string;
}

interface UserItem {
    id: string;
    name: string;
    email: string;
}

interface Props extends PageProps {
    scopeLabel?: string;
    requisitions?: FinanceRequisition[];
    projects?: ProjectItem[];
    usersList?: UserItem[];
}

const money = (amount: number, currency: string) =>
    `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${currency}`;

export default function FinanceDashboard({
    scopeLabel = 'Tous les projets',
    requisitions: initialRequisitions = [],
    projects = [],
    usersList = []
}: Props) {
    const { auth } = usePage<PageProps>().props;
    const user = auth.user;

    const [requisitions, setRequisitions] = useState<FinanceRequisition[]>(initialRequisitions);
    
    // NAVIGATION PAR ONGLETS (DEMANDÉE PAR L'UTILISATEUR)
    const [activeTab, setActiveTab] = useState<'tous' | 'par_projet' | 'par_utilisateur'>('tous');
    const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
    const [selectedUserId, setSelectedUserId] = useState<string>('all');

    // Filtre d'étape
    const [statusFilter, setStatusFilter] = useState('all');

    // Modales
    const [selected, setSelected] = useState<FinanceRequisition | null>(null);
    const [rejecting, setRejecting] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    
    // SÉCURITÉ : MOT DE PASSE POUR SIGNATURE ÉLECTRONIQUE
    const [passwordModalOpen, setPasswordModalOpen] = useState(false);
    const [passwordSaisi, setPasswordSaisi] = useState('');
    const [processing, setProcessing] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Filtrage multi-critères (Onglets + Statut)
    const filteredRequisitions = useMemo(() => {
        return requisitions.filter(item => {
            // Filtre par statut
            if (statusFilter === 'pending' && !item.canDecide) return false;
            if (statusFilter === 'approved' && item.statusCode !== 'controle_finance') return false;
            if (statusFilter === 'returned' && !item.financeRejected) return false;

            // Filtre par Onglet Projet
            if (activeTab === 'par_projet' && selectedProjectId !== 'all') {
                if (item.project_id !== selectedProjectId && item.projet !== selectedProjectId) return false;
            }

            // Filtre par Onglet Utilisateur
            if (activeTab === 'par_utilisateur' && selectedUserId !== 'all') {
                if (item.user_id !== selectedUserId && item.initiateurNom !== selectedUserId) return false;
            }

            return true;
        });
    }, [requisitions, statusFilter, activeTab, selectedProjectId, selectedUserId]);

    // ÉTAPE 1 : Déclencher la validation
    const handleTriggerApprove = () => {
        if (!selected) return;
        setPasswordSaisi('');
        setPasswordModalOpen(true);
    };

    // ÉTAPE 2 : Confirmer avec le mot de passe réel du Financier
    const handleConfirmSignature = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selected || !passwordSaisi) return;

        setProcessing(true);

        router.patch(route('requisitions.finance-decision', selected.id), {
            decision: 'approve',
            password: passwordSaisi, // ENVOI DU MOT DE PASSE AU BACKEND
        }, {
            preserveScroll: true,
            onFinish: () => setProcessing(false),
            onSuccess: () => {
                const updatedId = selected.id;
                setPasswordModalOpen(false);
                setSelected(null);
                setPasswordSaisi('');

                setRequisitions(prev => prev.map(item => {
                    if (item.id === updatedId) {
                        return {
                            ...item,
                            statusCode: 'controle_finance',
                            statusLabel: 'Validée par Finance',
                            canDecide: false,
                        };
                    }
                    return item;
                }));

                setToast({
                    type: 'success',
                    message: `Visa Financier apposé avec succès sur ${selected.numero}. Transmis à l'Administration.`
                });
            },
            onError: (errors) => {
                alert(errors.password || 'Erreur lors de la signature financière.');
            }
        });
    };

    // Rejet financier
    const handleRejectFinance = () => {
        if (!selected || !rejectionReason.trim()) {
            alert('Veuillez spécifier le motif du rejet financier.');
            return;
        }

        setProcessing(true);

        router.patch(route('requisitions.finance-decision', selected.id), {
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

                setRequisitions(prev => prev.map(item => {
                    if (item.id === updatedId) {
                        return {
                            ...item,
                            statusCode: 'draft',
                            statusLabel: 'Renvoyée en correction',
                            canDecide: false,
                            financeRejected: true,
                        };
                    }
                    return item;
                }));

                setToast({
                    type: 'error',
                    message: `Réquisition ${selected.numero} renvoyée pour correction budgétaire.`
                });
            },
            onError: (errors) => {
                alert(errors.motif_rejet || 'Erreur lors du rejet.');
            }
        });
    };

    const pendingCount = requisitions.filter(item => item.canDecide).length;
    const approvedCount = requisitions.filter(item => item.statusCode === 'controle_finance').length;
    const returnedCount = requisitions.filter(item => item.financeRejected).length;

    return (
        <AppLayout>
            <Head title="Direction Financière & Contrôle de Gestion" />

            <div className="space-y-6">
                {/* En-tête */}
                <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-[#E2E8F0] pb-4">
                    <div>
                        <p className="text-[10px] uppercase tracking-wider font-bold text-[#F58F20]">Direction Financière</p>
                        <h1 className="text-xl font-bold text-[#0B192C]">Contrôle Budgétaire & Visa Financier</h1>
                        <p className="text-xs text-gray-500 mt-0.5">Financier : <strong>{user.name}</strong> • Vérification des soubassements et imputations.</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-[#04326D] bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
                        {requisitions.length} dossier(s) au total
                    </span>
                </header>

                {toast && (
                    <div className={`p-3 rounded text-xs font-bold flex justify-between items-center ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' : 'bg-red-50 text-red-800 border border-red-300'}`}>
                        <span>{toast.message}</span>
                        <button type="button" onClick={() => setToast(null)} className="underline">Fermer</button>
                    </div>
                )}

                {/* 3 Cartes Indicateurs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="border-l-4 border-[#F58F20] bg-white p-4 shadow-sm border border-[#B2BED6] rounded-r">
                        <p className="text-[10px] uppercase font-bold text-gray-500">En attente de Visa Finance</p>
                        <p className="text-2xl font-black text-[#F58F20] mt-1">{pendingCount}</p>
                    </div>
                    <div className="border-l-4 border-[#10B981] bg-white p-4 shadow-sm border border-[#B2BED6] rounded-r">
                        <p className="text-[10px] uppercase font-bold text-gray-500">Validées par Finance</p>
                        <p className="text-2xl font-black text-[#10B981] mt-1">{approvedCount}</p>
                    </div>
                    <div className="border-l-4 border-red-500 bg-white p-4 shadow-sm border border-[#B2BED6] rounded-r">
                        <p className="text-[10px] uppercase font-bold text-gray-500">Renvoyées en correction</p>
                        <p className="text-2xl font-black text-red-700 mt-1">{returnedCount}</p>
                    </div>
                </div>

                {/* NAVIGATION PAR ONGLETS (GÉNÉRAL / PAR PROJET / PAR UTILISATEUR) */}
                <div className="bg-white border border-[#B2BED6] rounded shadow-sm overflow-hidden">
                    <div className="border-b border-[#E2E8F0] px-4 pt-3 flex flex-wrap items-center justify-between gap-3 bg-[#F9F9FF]">
                        {/* Les 3 Onglets */}
                        <div className="flex gap-2 text-xs font-bold">
                            <button
                                type="button"
                                onClick={() => setActiveTab('tous')}
                                className={`pb-3 px-3 border-b-2 transition ${activeTab === 'tous' ? 'border-[#04326D] text-[#04326D]' : 'border-transparent text-gray-500 hover:text-[#0B192C]'}`}
                            >
                                Vue Générale (Toutes)
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('par_projet')}
                                className={`pb-3 px-3 border-b-2 transition ${activeTab === 'par_projet' ? 'border-[#04326D] text-[#04326D]' : 'border-transparent text-gray-500 hover:text-[#0B192C]'}`}
                            >
                                Par Projet
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('par_utilisateur')}
                                className={`pb-3 px-3 border-b-2 transition ${activeTab === 'par_utilisateur' ? 'border-[#04326D] text-[#04326D]' : 'border-transparent text-gray-500 hover:text-[#0B192C]'}`}
                            >
                                Par Utilisateur
                            </button>
                        </div>

                        {/* Filtre par État */}
                        <div className="flex items-center gap-2 pb-2 text-xs">
                            <span className="text-gray-500">Statut :</span>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="border border-[#B2BED6] rounded px-2.5 py-1 text-xs bg-white text-gray-700 focus:outline-none"
                            >
                                <option value="all">Tous les états</option>
                                <option value="pending">À valider uniquement</option>
                                <option value="approved">Validées Finance</option>
                                <option value="returned">Renvoyées en correction</option>
                            </select>
                        </div>
                    </div>

                    {/* SOUS-FILTRE SPÉCIFIQUE À L'ONGLET */}
                    {activeTab === 'par_projet' && (
                        <div className="p-3 bg-blue-50/50 border-b border-blue-100 flex items-center gap-3 text-xs">
                            <span className="font-bold text-[#04326D]">Sélectionnez le Projet :</span>
                            <select
                                value={selectedProjectId}
                                onChange={(e) => setSelectedProjectId(e.target.value)}
                                className="border border-[#04326D] rounded p-1.5 text-xs bg-white font-bold text-[#04326D]"
                            >
                                <option value="all">Tous les projets</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.name}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {activeTab === 'par_utilisateur' && (
                        <div className="p-3 bg-blue-50/50 border-b border-blue-100 flex items-center gap-3 text-xs">
                            <span className="font-bold text-[#04326D]">Sélectionnez le Demandeur :</span>
                            <select
                                value={selectedUserId}
                                onChange={(e) => setSelectedUserId(e.target.value)}
                                className="border border-[#04326D] rounded p-1.5 text-xs bg-white font-bold text-[#04326D]"
                            >
                                <option value="all">Tous les utilisateurs</option>
                                {usersList.map(u => (
                                    <option key={u.id} value={u.name}>{u.name} ({u.email})</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Tableau Réel */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-[#0B192C] text-white uppercase text-[10px] font-bold tracking-wider">
                                    <th className="px-4 py-3">Numéro</th>
                                    <th className="px-4 py-3">Demandeur</th>
                                    <th className="px-4 py-3">Projet</th>
                                    <th className="px-4 py-3">Observation / Objet</th>
                                    <th className="px-4 py-3 text-right">Montant</th>
                                    <th className="px-4 py-3 text-center">Urgence</th>
                                    <th className="px-4 py-3 text-center">Statut</th>
                                    <th className="px-4 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E2E8F0] text-gray-700">
                                {filteredRequisitions.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-8 text-center text-gray-400 italic">
                                            Aucune réquisition dans cette sélection.
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
                                            <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                                    item.canDecide 
                                                        ? 'bg-amber-100 text-amber-900' 
                                                        : item.statusCode === 'controle_finance' 
                                                            ? 'bg-emerald-100 text-emerald-800' 
                                                            : item.financeRejected 
                                                                ? 'bg-red-100 text-red-800' 
                                                                : 'bg-gray-100 text-gray-700'
                                                }`}>
                                                    {item.statusLabel}
                                                </span>
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
                                                    {item.canDecide ? 'Examiner & Viser' : 'Consulter Dossier'}
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

            {/* MODALE DE CONTRÔLE BUDGÉTAIRE ET VISA FINANCIER */}
            {selected && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white border border-[#B2BED6] shadow-2xl rounded p-6 space-y-5">
                        
                        <header className="flex items-start justify-between border-b pb-3">
                            <div>
                                <span className="text-[10px] uppercase font-bold text-[#F58F20] tracking-wider">
                                    CONTRÔLE BUDGÉTAIRE & VISA FINANCIER
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

                        {/* TABLEAU DES DEMANDES (CODE BUDGET DU MP AFFICHÉ STRICTEMENT EN LECTURE SEULE) */}
                        <div>
                            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                                Articles & Devis Attachés (Vérification Soubassements)
                            </h3>
                            <table className="w-full text-left text-xs border border-gray-200">
                                <thead className="bg-[#F1F5F9] font-bold text-gray-600">
                                    <tr>
                                        <th className="p-2">Désignation</th>
                                        <th className="p-2">Code Budget (Attribué par MP)</th>
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
                                                {line.codeAllocation || line.codeBudget || 'Non attribué'}
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

                        {/* ZONE DE DÉCISION FINANCE */}
                        {selected.canDecide && (
                            <div className="border-t pt-4 space-y-3">
                                {!rejecting ? (
                                    <div className="flex items-center justify-between">
                                        <button
                                            type="button"
                                            onClick={() => setRejecting(true)}
                                            className="px-3.5 py-1.5 border border-red-300 text-red-600 hover:bg-red-50 rounded text-xs font-bold transition"
                                        >
                                            Rejeter (Problème budgétaire / Devis non conforme)
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
                                                <span>Accorder Visa Financier (Signature Électronique)</span>
                                                <span>&rarr;</span>
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-red-50 p-4 rounded border border-red-200 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <h4 className="text-xs font-bold text-red-800 uppercase">
                                                Motif du Rejet Financier (Obligatoire)
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
                                            placeholder="Précisez le problème comptable (dépassement ligne budgétaire, prix unitaire excessif, pièces manquantes)..."
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
                                                onClick={handleRejectFinance}
                                                disabled={processing}
                                                className="px-4 py-1.5 bg-[#DC2626] hover:bg-[#b91c1c] text-white rounded text-xs font-bold shadow"
                                            >
                                                Confirmer le Rejet Financier
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {!selected.canDecide && (
                            <footer className="flex justify-end border-t pt-3">
                                <button
                                    type="button"
                                    onClick={() => setSelected(null)}
                                    className="px-4 py-1.5 bg-gray-800 text-white text-xs font-bold rounded"
                                >
                                    Fermer
                                </button>
                            </footer>
                        )}

                    </div>
                </div>
            )}

            {/* SÉCURITÉ : MODALE D'AUTHENTIFICATION DE MOT DE PASSE DU FINANCIER */}
            {passwordModalOpen && selected && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4">
                    <div className="bg-white rounded border-2 border-[#04326D] shadow-2xl max-w-sm w-full p-5 space-y-4">
                        <div className="text-center border-b pb-2">
                            <h3 className="text-xs font-black uppercase text-[#0B192C] tracking-wider">
                                Visa de Contrôle Financier
                            </h3>
                            <p className="text-[10px] text-gray-500 mt-0.5">
                                Signataire : <strong>{user.name}</strong> (Manager des Finances)
                            </p>
                        </div>

                        <form onSubmit={handleConfirmSignature} className="space-y-3">
                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                                    Saisissez votre mot de passe pour signer le visa :
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
                                Cette signature électronique infalsifiable atteste de la disponibilité des crédits budgétaires pour la réquisition {selected.numero}.
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
                                    {processing ? 'Signature en cours...' : 'Signer & Valider'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}