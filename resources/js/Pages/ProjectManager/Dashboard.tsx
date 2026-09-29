import { useState, useMemo } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { PageProps } from '@/types';

interface Justificatif {
    id: string;
    date: string;
    description: string;
    montant: number;
    scan: string;
    fileUrl: string | null;
}

interface LigneDemande {
    id: string;
    activite: string;
    codeAllBudget: string;
    code_allocation?: string;
    nature: string;
    quantiteOuDuree: number;
    unite: string;
    frais: number;
    total: number;
    justif: Justificatif[];
}

interface RequisitionMP {
    id: string;
    numero: string;
    projet: string;
    initiateurNom: string;
    initiateurRole: string;
    nature: 'Achat' | 'Service';
    devise: 'USD' | 'FC' | 'EUR';
    montantTotal: number;
    caisseSouhaitee: string;
    caisseAttribuee?: string;
    observation?: string;
    is_urgent: boolean;
    statut: string;
    statusCode: string;
    statusLabel: string;
    canDecide: boolean;
    canEdit: boolean;
    financeReturned: boolean;
    needsCorrection: boolean;
    dateSoumission: string;
    lignes: LigneDemande[];
}

const CAISSES_DISPONIBLES = [
    'EU',
    'Caisse principale',
    'Saint Jean Eudes',
    'Local Fund 1 (Boulangerie)',
    'Local Fund 2'
];

export default function ProjectManagerDashboard({ requisitions = [] }: { requisitions?: RequisitionMP[] }) {
    const { auth } = usePage<PageProps>().props;
    const user = auth.user;

    const [demandes, setDemandes] = useState<RequisitionMP[]>(requisitions);
    const [filterStatut, setFilterStatut] = useState<string>('all');

    // Modale d'arbitrage
    const [selectedReq, setSelectedReq] = useState<RequisitionMP | null>(null);
    const [caisseChoisie, setCaisseChoisie] = useState<string>('Caisse principale');
    const [allocations, setAllocations] = useState<Record<string, string>>({});
    const [modeRejet, setModeRejet] = useState<boolean>(false);
    const [motifRejet, setMotifRejet] = useState<string>('');

    // SÉCURITÉ : MODALE DE MOT DE PASSE POUR SIGNER ÉLECTRONIQUEMENT
    const [passwordModalOpen, setPasswordModalOpen] = useState<boolean>(false);
    const [passwordSaisi, setPasswordSaisi] = useState<string>('');
    const [signingLoading, setSigningLoading] = useState<boolean>(false);

    // Modale de modification / correction
    const [editingReq, setEditingReq] = useState<RequisitionMP | null>(null);
    const [savingEdit, setSavingEdit] = useState(false);
    const [editError, setEditError] = useState<string | null>(null);
    const [editFiles, setEditFiles] = useState<Record<string, File[]>>({});

    const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Filtrage
    const demandesFiltrees = useMemo(() => {
        if (filterStatut === 'all') return demandes;
        if (filterStatut === 'a_corriger') return demandes.filter(d => d.needsCorrection);
        return demandes.filter(d => d.statut === filterStatut);
    }, [demandes, filterStatut]);

    // Ouvrir arbitrage
    const handleOuvrirArbitrage = (req: RequisitionMP) => {
        setSelectedReq(req);
        setCaisseChoisie(req.caisseAttribuee || req.caisseSouhaitee || 'Caisse principale');
        setModeRejet(false);

        const initialAllocations: Record<string, string> = {};
        req.lignes.forEach(ligne => {
            initialAllocations[ligne.id] = ligne.code_allocation || ligne.codeAllBudget || '';
        });
        setAllocations(initialAllocations);
    };

    // ÉTAPE 1 : Déclencher la demande de mot de passe
    const handleDeclencherApprobation = () => {
        if (!selectedReq) return;

        const allocationsArray = Object.entries(allocations).map(([demande_id, code_allocation]) => ({
            demande_id,
            code_allocation: code_allocation.trim()
        }));

        const ligneSansCode = allocationsArray.find(a => !a.code_allocation);
        if (ligneSansCode) {
            alert('En tant que Manager de Projet, vous devez obligatoirement attribuer un code budgétaire à chaque ligne.');
            return;
        }

        // Ouvrir la modale de mot de passe
        setPasswordSaisi('');
        setPasswordModalOpen(true);
    };

    // ÉTAPE 2 : Confirmer la signature électronique avec le mot de passe réel
    const handleConfirmerSignatureAvecMotDePasse = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedReq || !passwordSaisi) return;

        setSigningLoading(true);

        const allocationsArray = Object.entries(allocations).map(([demande_id, code_allocation]) => ({
            demande_id,
            code_allocation: code_allocation.trim()
        }));

        router.patch(route('requisitions.manager-decision', selectedReq.id), {
            decision: 'approve',
            password: passwordSaisi, // VÉRIFIÉ PAR HASH::CHECK EN BDD
            caisse_decaissement: caisseChoisie,
            allocations: allocationsArray
        }, {
            preserveScroll: true,
            onFinish: () => setSigningLoading(false),
            onSuccess: () => {
                setPasswordModalOpen(false);
                setDemandes(prev => prev.map(d => d.id === selectedReq.id ? { ...d, statut: 'valide_mp', statusLabel: 'Validé MP', canDecide: false } : d));
                setToast({ type: 'success', message: `Signature électronique apposée avec succès sur ${selectedReq.numero}.` });
                setSelectedReq(null);
                setPasswordSaisi('');
            },
            onError: (errors) => {
                alert(errors.password || 'Échec de la signature : Mot de passe incorrect.');
            }
        });
    };

    // Rejet MP
    const handleRejeter = () => {
        if (!selectedReq) return;
        if (!motifRejet.trim()) {
            alert('Veuillez spécifier le motif du rejet.');
            return;
        }

        router.patch(route('requisitions.manager-decision', selectedReq.id), {
            decision: 'reject',
            password: 'skip', // Pas de mot de passe pour un rejet
            motif_rejet: motifRejet
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setDemandes(prev => prev.map(d => d.id === selectedReq.id ? { ...d, statut: 'rejete_mp', statusLabel: 'Rejeté', canDecide: false } : d));
                setToast({ type: 'error', message: `Réquisition ${selectedReq.numero} rejetée.` });
                setSelectedReq(null);
                setModeRejet(false);
                setMotifRejet('');
            }
        });
    };

    // Ouvrir correction
    const openEditModal = (req: RequisitionMP) => {
        setEditingReq({ ...req, lignes: req.lignes.map(l => ({ ...l })) });
        setEditFiles({});
        setEditError(null);
    };

    const updateEditingLine = (lineId: string, changes: Partial<LigneDemande>) => {
        setEditingReq(current => {
            if (!current) return current;
            return {
                ...current,
                lignes: current.lignes.map(line => {
                    if (line.id !== lineId) return line;
                    const updated = { ...line, ...changes };
                    updated.total = Number(updated.quantiteOuDuree || 0) * Number(updated.frais || 0);
                    return updated;
                }),
                montantTotal: current.lignes.reduce((sum, line) => {
                    if (line.id !== lineId) return sum + line.total;
                    const updated = { ...line, ...changes };
                    return sum + Number(updated.quantiteOuDuree || 0) * Number(updated.frais || 0);
                }, 0)
            };
        });
    };

    const handleSaveEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingReq) return;

        router.post(route('requisitions.update', editingReq.id), {
            _method: 'patch',
            nature_requisition: editingReq.nature,
            caisse_decaissement: editingReq.caisseSouhaitee,
            devise: editingReq.devise,
            observation: editingReq.observation || null,
            articles: editingReq.lignes.map(line => ({
                id: line.id,
                activite: line.activite,
                code_all_budget: line.codeAllBudget,
                nature: line.nature,
                quantiteOuDuree: line.quantiteOuDuree,
                unite: line.unite,
                prixUnitaire: line.frais,
                justificatifs: (editFiles[line.id] ?? []).map(file => ({
                    description: file.name,
                    date: new Date().toISOString().slice(0, 10),
                    montant: 0,
                    file
                }))
            }))
        }, {
            preserveScroll: true,
            forceFormData: true,
            onStart: () => setSavingEdit(true),
            onFinish: () => setSavingEdit(false),
            onError: (errs) => setEditError(Object.values(errs)[0] ?? 'Erreur lors de la mise à jour.'),
            onSuccess: (page) => {
                const refreshed = (page.props as any).requisitions as RequisitionMP[] | undefined;
                if (refreshed) setDemandes(refreshed);
                setToast({ type: 'success', message: 'Corrections enregistrées avec succès.' });
                setEditingReq(null);
            }
        });
    };

    return (
        <AppLayout>
            <Head title="Validation Manager de Projet" />

            {toast && (
                <div className={`fixed bottom-6 right-6 z-50 p-4 rounded shadow-xl border flex items-center gap-3 text-xs font-bold ${
                    toast.type === 'success' ? 'bg-[#10B981] text-white' : 'bg-[#DC2626] text-white'
                }`}>
                    <span>{toast.type === 'success' ? '✓' : '⚠️'}</span>
                    <p>{toast.message}</p>
                    <button onClick={() => setToast(null)} className="ml-4 underline opacity-80">Fermer</button>
                </div>
            )}

            {/* En-tête */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
                <div>
                    <h1 className="text-xl font-bold text-[#0B192C]">
                        Validation des Réquisitions — {user.project?.name || 'Projet'}
                    </h1>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Manager de Projet : <strong>{user.name}</strong> • Contrôle opérationnel, attribution des codes budgétaires et signature électronique.
                    </p>
                </div>

                <Link
                    href={route('requisitions.create')}
                    className="bg-[#04326D] hover:bg-[#06428f] text-white px-3.5 py-2 rounded text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                >
                    <span>+</span>
                    <span>Initier Réquisition Projet</span>
                </Link>
            </div>

            {/* 3 Cartes Indicateurs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border-2 border-[#F58F20] rounded p-4 shadow-sm">
                    <span className="text-[10px] font-bold uppercase text-[#0B192C]">En attente de Visa MP</span>
                    <p className="text-2xl font-black text-[#F58F20] mt-1">
                        {demandes.filter(d => d.canDecide).length} dossier(s)
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Nécessite attribution des codes budgétaires</p>
                </div>

                <div className="bg-white border border-[#B2BED6] rounded p-4 shadow-sm">
                    <span className="text-[10px] font-bold uppercase text-gray-500">Validées (Transmises aux Finances)</span>
                    <p className="text-2xl font-black text-[#10B981] mt-1">
                        {demandes.filter(d => d.statut === 'valide_mp').length} dossier(s)
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Signées électroniquement</p>
                </div>

                <div className="bg-white border border-[#B2BED6] rounded p-4 shadow-sm">
                    <span className="text-[10px] font-bold uppercase text-gray-500">À corriger (Renvoyées Finance)</span>
                    <p className="text-2xl font-black text-[#DC2626] mt-1">
                        {demandes.filter(d => d.needsCorrection).length} dossier(s)
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Nécessite correction par le MP</p>
                </div>
            </div>

            {/* Tableau des Demandes */}
            <div className="bg-white border border-[#B2BED6] rounded shadow-sm overflow-hidden">
                <div className="p-4 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <h2 className="text-xs font-bold text-[#0B192C] uppercase tracking-wider">
                            Demandes de l'Équipe du Projet ({user.project?.name})
                        </h2>
                        <p className="text-[11px] text-gray-500">
                            Données réelles de la base de données MySQL.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-500">Filtrer :</span>
                        <select
                            value={filterStatut}
                            onChange={(e) => setFilterStatut(e.target.value)}
                            className="border border-[#B2BED6] rounded px-2.5 py-1 text-xs bg-white text-gray-700 focus:outline-none"
                        >
                            <option value="all">Toutes</option>
                            <option value="en_attente_mp">À arbitrer (Visa MP)</option>
                            <option value="valide_mp">Validées (Transmises)</option>
                            <option value="a_corriger">À corriger</option>
                            <option value="rejete_mp">Rejetées</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr className="bg-[#0B192C] text-white uppercase text-[10px] font-bold tracking-wider">
                                <th className="py-3 px-4">Numéro</th>
                                <th className="py-3 px-4">Date</th>
                                <th className="py-3 px-4">Initiateur</th>
                                <th className="py-3 px-4">Nature</th>
                                <th className="py-3 px-4">Observation / Contexte</th>
                                <th className="py-3 px-4 text-right">Montant Total</th>
                                <th className="py-3 px-4 text-center">Urgence</th>
                                <th className="py-3 px-4 text-center">Statut</th>
                                <th className="py-3 px-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2E8F0] text-gray-700">
                            {demandesFiltrees.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="py-8 text-center text-gray-400 italic">
                                        Aucune réquisition trouvée pour le projet {user.project?.name || ''}.
                                    </td>
                                </tr>
                            ) : (
                                demandesFiltrees.map((req) => (
                                    <tr key={req.id} className="hover:bg-[#F9F9FF] transition">
                                        <td className="py-3.5 px-4 font-mono font-bold text-[#04326D] whitespace-nowrap">
                                            {req.numero}
                                        </td>
                                        <td className="py-3.5 px-4 whitespace-nowrap text-gray-600">
                                            {req.dateSoumission}
                                        </td>
                                        <td className="py-3.5 px-4 whitespace-nowrap">
                                            <p className="font-bold text-[#0B192C]">{req.initiateurNom}</p>
                                            <p className="text-[10px] text-gray-400">{req.initiateurRole}</p>
                                        </td>
                                        <td className="py-3.5 px-4 whitespace-nowrap">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                req.nature === 'Achat' ? 'bg-blue-100 text-[#04326D]' : 'bg-orange-100 text-[#F58F20]'
                                            }`}>
                                                {req.nature}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4 max-w-xs truncate" title={req.observation}>
                                            {req.observation || 'Sans observation'}
                                        </td>
                                        <td className="py-3.5 px-4 text-right font-mono font-bold text-sm text-[#0B192C] whitespace-nowrap">
                                            {req.montantTotal.toLocaleString()} {req.devise}
                                        </td>
                                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                            {req.is_urgent ? (
                                                <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded font-black text-[9px] uppercase">
                                                    URGENT
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 text-[10px]">Normal</span>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                                req.canDecide 
                                                    ? 'bg-orange-100 text-[#92400E]' 
                                                    : req.statut === 'valide_mp' 
                                                        ? 'bg-emerald-100 text-[#065F46]' 
                                                        : req.needsCorrection 
                                                            ? 'bg-red-100 text-red-700' 
                                                            : 'bg-gray-100 text-gray-700'
                                            }`}>
                                                {req.statusLabel}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {req.canEdit && (
                                                    <button
                                                        type="button"
                                                        onClick={() => openEditModal(req)}
                                                        className="px-2.5 py-1.5 border border-[#04326D] text-[#04326D] rounded font-bold text-xs hover:bg-blue-50"
                                                    >
                                                        Corriger
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => handleOuvrirArbitrage(req)}
                                                    className="px-3 py-1.5 bg-[#04326D] hover:bg-[#06428f] text-white rounded font-bold text-xs transition"
                                                >
                                                    {req.canDecide ? 'Attribuer Code & Viser' : 'Consulter Dossier'}
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

            {/* MODALE DE CORRECTION / MODIFICATION PAR LE MP */}
            {editingReq && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
                    <form onSubmit={handleSaveEdit} className="w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-white border border-[#B2BED6] shadow-2xl rounded">
                        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 p-5 border-b border-[#E2E8F0] bg-white">
                            <div>
                                <p className="text-[10px] uppercase font-bold text-[#F58F20]">Correction Réquisition</p>
                                <h2 className="text-lg font-bold text-[#0B192C]">Dossier N° {editingReq.numero}</h2>
                            </div>
                            <button type="button" onClick={() => setEditingReq(null)} className="text-gray-500 text-2xl leading-none">&times;</button>
                        </header>

                        <div className="p-5 space-y-4 text-xs">
                            {editError && <div className="border border-red-300 bg-red-50 p-3 text-red-800 rounded">{editError}</div>}
                            {editingReq.financeReturned && (
                                <div className="border-l-4 border-red-500 bg-red-50 p-3 text-red-900 rounded-r">
                                    <strong>Motif renvoyé par la Finance :</strong>
                                    <p className="mt-1 whitespace-pre-line">{editingReq.observation}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">Nature</label>
                                    <select
                                        value={editingReq.nature}
                                        onChange={(e) => setEditingReq({ ...editingReq, nature: e.target.value as any })}
                                        className="w-full border border-[#B2BED6] rounded p-1.5"
                                    >
                                        <option value="Achat">Achat</option>
                                        <option value="Service">Service</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">Caisse</label>
                                    <select
                                        value={editingReq.caisseSouhaitee}
                                        onChange={(e) => setEditingReq({ ...editingReq, caisseSouhaitee: e.target.value })}
                                        className="w-full border border-[#B2BED6] rounded p-1.5"
                                    >
                                        {CAISSES_DISPONIBLES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">Devise</label>
                                    <select
                                        value={editingReq.devise}
                                        onChange={(e) => setEditingReq({ ...editingReq, devise: e.target.value as any })}
                                        className="w-full border border-[#B2BED6] rounded p-1.5"
                                    >
                                        <option value="USD">USD</option>
                                        <option value="FC">FC</option>
                                        <option value="EUR">EUR</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">Observation</label>
                                <textarea
                                    rows={2}
                                    value={editingReq.observation ?? ''}
                                    onChange={(e) => setEditingReq({ ...editingReq, observation: e.target.value })}
                                    className="w-full border border-[#B2BED6] rounded p-2"
                                />
                            </div>

                            {/* Lignes d'articles modifiables */}
                            <div className="space-y-3">
                                <h3 className="font-bold text-gray-800 uppercase tracking-wider">Lignes de la demande</h3>
                                {editingReq.lignes.map((line) => (
                                    <div key={line.id} className="border border-[#D8DEE8] p-3 rounded bg-gray-50 space-y-2">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block font-semibold text-gray-700 mb-1">Désignation</label>
                                                <input
                                                    value={line.activite}
                                                    onChange={(e) => updateEditingLine(line.id, { activite: e.target.value })}
                                                    className="w-full border border-[#B2BED6] rounded p-1.5"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block font-semibold text-gray-700 mb-1">Code Budget</label>
                                                <input
                                                    value={line.codeAllBudget}
                                                    onChange={(e) => updateEditingLine(line.id, { codeAllBudget: e.target.value })}
                                                    className="w-full border border-[#B2BED6] rounded p-1.5 font-mono"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div>
                                                <label className="block font-semibold text-gray-700 mb-1">Quantité / Durée</label>
                                                <input
                                                    type="number"
                                                    min="0.01"
                                                    step="0.01"
                                                    value={line.quantiteOuDuree}
                                                    onChange={(e) => updateEditingLine(line.id, { quantiteOuDuree: Number(e.target.value) })}
                                                    className="w-full border border-[#B2BED6] rounded p-1.5 text-center"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block font-semibold text-gray-700 mb-1">Prix Unitaire</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={line.frais}
                                                    onChange={(e) => updateEditingLine(line.id, { frais: Number(e.target.value) })}
                                                    className="w-full border border-[#B2BED6] rounded p-1.5 text-right font-bold"
                                                    required
                                                />
                                            </div>
                                            <div className="flex flex-col justify-end text-right">
                                                <span className="text-[10px] text-gray-500">Total Ligne :</span>
                                                <span className="font-mono font-bold text-sm text-[#04326D]">{line.total.toLocaleString()} {editingReq.devise}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <footer className="sticky bottom-0 flex justify-end gap-2 border-t border-[#E2E8F0] p-4 bg-white">
                            <button type="button" onClick={() => setEditingReq(null)} className="px-3 py-1.5 border border-gray-300 rounded text-gray-700 text-xs">Annuler</button>
                            <button type="submit" disabled={savingEdit} className="px-4 py-1.5 bg-[#04326D] text-white text-xs font-bold rounded">
                                {savingEdit ? 'Enregistrement...' : 'Enregistrer les corrections'}
                            </button>
                        </footer>
                    </form>
                </div>
            )}

            {/* MODALE D'ARBITRAGE MP */}
            {selectedReq && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="bg-white rounded border border-[#B2BED6] shadow-2xl max-w-3xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-start justify-between border-b pb-3">
                            <div>
                                <span className="text-[10px] text-gray-400 font-mono uppercase">Contrôle Opérationnel & Attribution Budgétaire</span>
                                <h2 className="text-base font-bold text-[#0B192C]">
                                    Réquisition N° {selectedReq.numero} ({selectedReq.nature})
                                </h2>
                                <p className="text-xs text-gray-500">
                                    Initiateur : <strong>{selectedReq.initiateurNom}</strong> • Date : {selectedReq.dateSoumission}
                                </p>
                            </div>
                            <button onClick={() => setSelectedReq(null)} className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none p-1">
                                &times;
                            </button>
                        </div>

                        {selectedReq.observation && (
                            <div className="p-3 bg-gray-50 border rounded text-xs text-gray-700">
                                <strong>Observation de l'initiateur :</strong> {selectedReq.observation}
                            </div>
                        )}

                        {/* TABLEAU DES DEMANDES AVEC SAISIE DU CODE BUDGET PAR LE MP */}
                        <div>
                            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                                Articles, Prestations & Devis Attachés
                            </h3>
                            <table className="w-full text-left text-xs border border-gray-200">
                                <thead className="bg-[#F1F5F9] font-bold text-gray-600">
                                    <tr>
                                        <th className="p-2">Désignation</th>
                                        <th className="p-2 text-[#04326D]">Code Allocation Budgétaire (MP)</th>
                                        <th className="p-2 text-center">{selectedReq.nature === 'Achat' ? 'Qté' : 'Durée'}</th>
                                        <th className="p-2 text-right">Prix Unitaire</th>
                                        <th className="p-2 text-right">Total</th>
                                        <th className="p-2">Devis / Pièces</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y text-gray-700">
                                    {selectedReq.lignes.map(ligne => (
                                        <tr key={ligne.id}>
                                            <td className="p-2 font-medium">{ligne.activite}</td>
                                            
                                            {/* SEUL LE MP SAISIT CE CODE */}
                                            <td className="p-2">
                                                {selectedReq.canDecide ? (
                                                    <input
                                                        type="text"
                                                        placeholder="ex: 6012 / 2.1.04"
                                                        value={allocations[ligne.id] || ''}
                                                        onChange={(e) => setAllocations({ ...allocations, [ligne.id]: e.target.value })}
                                                        className="w-32 border border-[#04326D] rounded p-1 text-xs font-mono font-bold text-[#04326D] bg-blue-50/30 focus:outline-none"
                                                        required
                                                    />
                                                ) : (
                                                    <span className="font-mono font-bold text-[#04326D]">
                                                        {ligne.code_allocation || ligne.codeAllBudget}
                                                    </span>
                                                )}
                                            </td>

                                            <td className="p-2 text-center">{ligne.quantiteOuDuree} {ligne.unite}</td>
                                            <td className="p-2 text-right">{ligne.frais.toLocaleString()} {selectedReq.devise}</td>
                                            <td className="p-2 text-right font-bold">{ligne.total.toLocaleString()} {selectedReq.devise}</td>
                                            
                                            {/* Pièces jointes cliquables avec fileUrl */}
                                            <td className="p-2">
                                                {ligne.justif && ligne.justif.length > 0 ? (
                                                    <div className="space-y-1">
                                                        {ligne.justif.map(j => (
                                                            <div key={j.id} className="bg-blue-50 text-[#04326D] px-2 py-0.5 rounded text-[10px] flex items-center justify-between">
                                                                <span className="truncate max-w-[120px]" title={j.description}>
                                                                    📄 {j.scan}
                                                                </span>
                                                                {j.fileUrl && (
                                                                    <a href={j.fileUrl} target="_blank" rel="noreferrer" className="underline font-bold ml-1">
                                                                        Voir
                                                                    </a>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 italic text-[10px]">Aucun devis</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-gray-50 font-bold border-t">
                                    <tr>
                                        <td colSpan={4} className="p-2 text-right">Montant Total Général :</td>
                                        <td className="p-2 text-right text-[#04326D] text-sm">
                                            {selectedReq.montantTotal.toLocaleString()} {selectedReq.devise}
                                        </td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* ZONE D'ARBITRAGE */}
                        {selectedReq.canDecide && (
                            <div className="border-t pt-4 space-y-4">
                                {!modeRejet ? (
                                    <>
                                        <div className="bg-blue-50/70 p-3 rounded border border-blue-200 space-y-1.5">
                                            <label className="block text-xs font-bold text-[#04326D] uppercase">
                                                Attribution Officielle de la Caisse de Décaissement :
                                            </label>
                                            <select
                                                value={caisseChoisie}
                                                onChange={(e) => setCaisseChoisie(e.target.value)}
                                                className="w-full border border-[#04326D] rounded p-1.5 text-xs font-bold text-[#0B192C] bg-white focus:outline-none"
                                            >
                                                {CAISSES_DISPONIBLES.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>

                                        <div className="flex items-center justify-between pt-2">
                                            <button
                                                type="button"
                                                onClick={() => setModeRejet(true)}
                                                className="px-3 py-1.5 border border-red-300 text-red-600 hover:bg-red-50 rounded text-xs font-bold transition"
                                            >
                                                Rejeter la demande (Non pertinente)
                                            </button>

                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedReq(null)}
                                                    className="px-3 py-1.5 border rounded text-xs text-gray-600 hover:bg-gray-50"
                                                >
                                                    Fermer
                                                </button>
                                                {/* BOUTON DECLENCHANT LA MODALE DU MOT DE PASSE */}
                                                <button
                                                    type="button"
                                                    onClick={handleDeclencherApprobation}
                                                    className="px-4 py-1.5 bg-[#10B981] hover:bg-[#059669] text-white rounded text-xs font-bold shadow transition flex items-center gap-1.5"
                                                >
                                                    <span>Accorder Visa MP (Signature Électronique)</span>
                                                    <span>&rarr;</span>
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="bg-red-50 p-4 rounded border border-red-200 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <h4 className="text-xs font-bold text-red-800 uppercase">Motif du Rejet (Obligatoire)</h4>
                                            <button type="button" onClick={() => setModeRejet(false)} className="text-xs text-gray-500 hover:underline">
                                                Annuler
                                            </button>
                                        </div>
                                        <textarea
                                            rows={3}
                                            value={motifRejet}
                                            onChange={(e) => setMotifRejet(e.target.value)}
                                            placeholder="Indiquez clairement le motif du refus..."
                                            className="w-full border border-red-300 rounded p-2 text-xs focus:outline-none bg-white"
                                            required
                                        ></textarea>
                                        <div className="flex justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={handleRejeter}
                                                className="px-4 py-1.5 bg-[#DC2626] text-white rounded text-xs font-bold shadow"
                                            >
                                                Confirmer le Rejet
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {!selectedReq.canDecide && (
                            <div className="border-t pt-3 flex justify-end">
                                <button type="button" onClick={() => setSelectedReq(null)} className="px-4 py-1.5 bg-gray-800 text-white rounded text-xs font-bold">
                                    Fermer
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* SÉCURITÉ : MODALE D'AUTHENTIFICATION DE MOT DE PASSE POUR SIGNER */}
            {passwordModalOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4">
                    <div className="bg-white rounded border-2 border-[#04326D] shadow-2xl max-w-sm w-full p-5 space-y-4">
                        <div className="text-center border-b pb-2">
                            <h3 className="text-xs font-black uppercase text-[#0B192C] tracking-wider">
                                Signature Électronique Certifiée
                            </h3>
                            <p className="text-[10px] text-gray-500 mt-0.5">
                                Signataire : <strong>{user.name}</strong> (Manager de Projet)
                            </p>
                        </div>

                        <form onSubmit={handleConfirmerSignatureAvecMotDePasse} className="space-y-3">
                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                                    Saisissez votre mot de passe pour signer :
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
                                Un code unique infalsifiable et un QR code d'audit seront générés et rattachés à cette réquisition.
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
                                    disabled={signingLoading}
                                    className="px-4 py-1.5 bg-[#10B981] hover:bg-[#059669] text-white font-bold text-xs rounded shadow disabled:opacity-50"
                                >
                                    {signingLoading ? 'Signature en cours...' : 'Signer & Valider'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}