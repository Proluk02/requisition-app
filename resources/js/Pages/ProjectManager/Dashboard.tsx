import { useState, useMemo } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { PageProps } from '@/types';

// Modèle Demande conforme au diagramme de classes
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
    nature: string;
    quantiteOuDuree: number;
    unite: string;
    frais: number;
    devise: 'USD' | 'FC' | 'EUR';
    total: number;
    justif: Justificatif[];
    newFiles?: File[];
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
    statut: 'en_attente_mp' | 'valide_mp' | 'rejete_mp' | 'a_corriger' | 'autre';
    statusCode: string;
    statusLabel: string;
    canDecide: boolean;
    canEdit: boolean;
    financeReturned: boolean;
    needsCorrection: boolean;
    dateSoumission: string;
    motifRejet?: string;
    lignes: LigneDemande[];
}

const CAISSES_DISPONIBLES = [
    'EU',
    'Caisse principale',
    'Saint Jean Eudes',
    'Local Fund 1 (Boulangerie)',
    'Local Fund 2'
];

export default function ProjectManagerDashboard({ requisitions: initialRequisitions }: { requisitions?: RequisitionMP[] }) {
    const { auth } = usePage<PageProps>().props;
    const user = auth.user;

    const [demandes, setDemandes] = useState<RequisitionMP[]>(initialRequisitions ?? []);

    // Filtre d'affichage
    const [filterStatut, setFilterStatut] = useState<string>('all');

    // Modale d'arbitrage (show detail Req / firstValidation / reject)
    const [selectedReq, setSelectedReq] = useState<RequisitionMP | null>(null);
    const [editingReq, setEditingReq] = useState<RequisitionMP | null>(null);
    const [savingEdit, setSavingEdit] = useState(false);
    const [editError, setEditError] = useState<string | null>(null);
    const [editFiles, setEditFiles] = useState<Record<string, File[]>>({});
    const [caisseChoisie, setCaisseChoisie] = useState<string>('Caisse principale');
    const [modeRejet, setModeRejet] = useState<boolean>(false);
    const [motifRejet, setMotifRejet] = useState<string>('');

    // Notification toast
    const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const openEditModal = (req: RequisitionMP) => {
        setEditingReq({ ...req, lignes: req.lignes.map((line) => ({ ...line })) });
        setEditFiles({});
        setEditError(null);
    };

    const updateEditingLine = (lineId: string, changes: Partial<LigneDemande>) => {
        setEditingReq((current) => {
            if (!current) return current;

            return {
                ...current,
                lignes: current.lignes.map((line) => {
                    if (line.id !== lineId) return line;
                    const updated = { ...line, ...changes };
                    updated.total = Number(updated.quantiteOuDuree || 0) * Number(updated.frais || 0);
                    return updated;
                }),
                montantTotal: current.lignes.reduce((sum, line) => {
                    if (line.id !== lineId) return sum + line.total;
                    const updated = { ...line, ...changes };
                    return sum + Number(updated.quantiteOuDuree || 0) * Number(updated.frais || 0);
                }, 0),
            };
        });
    };

    const handleSaveEdit = (event: React.FormEvent) => {
        event.preventDefault();
        if (!editingReq) return;

        const updatedReq = editingReq;
        router.post(route('requisitions.update', updatedReq.id), {
            _method: 'patch',
            nature_requisition: updatedReq.nature,
            caisse_decaissement: updatedReq.caisseSouhaitee,
            devise: updatedReq.devise,
            observation: updatedReq.observation || null,
            articles: updatedReq.lignes.map((line) => ({
                id: line.id,
                activite: line.activite,
                code_all_budget: line.codeAllBudget,
                nature: line.nature,
                quantiteOuDuree: line.quantiteOuDuree,
                unite: line.unite,
                prixUnitaire: line.frais,
                justificatifs: (editFiles[line.id] ?? []).map((file) => ({
                    description: file.name,
                    date: new Date().toISOString().slice(0, 10),
                    montant: 0,
                    file,
                })),
            })),
        }, {
            preserveScroll: true,
            forceFormData: true,
            onStart: () => setSavingEdit(true),
            onFinish: () => setSavingEdit(false),
            onError: (errors) => {
                setEditError(Object.values(errors)[0] ?? 'La réquisition n’a pas pu être enregistrée.');
            },
            onSuccess: (page) => {
                const refreshed = page.props.requisitions as RequisitionMP[] | undefined;
                if (refreshed) setDemandes(refreshed);
                setToast({ type: 'success', message: `Réquisition ${updatedReq.numero} mise à jour.` });
                setEditingReq(null);
                setEditFiles({});
                setEditError(null);
            },
        });
    };

    // Filtrage
    const demandesFiltrees = useMemo(() => {
        if (filterStatut === 'all') return demandes;
        if (filterStatut === 'a_corriger') return demandes.filter(d => d.needsCorrection);
        return demandes.filter(d => d.statut === filterStatut);
    }, [demandes, filterStatut]);

    // Action : firstValidation()
    const handleFirstValidation = (id: string) => {
        router.patch(route('requisitions.manager-decision', id), {
            decision: 'approve',
            caisse_decaissement: caisseChoisie,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setDemandes(prev => prev.map(d => {
                    if (d.id === id) {
                        return {
                            ...d,
                            statut: 'valide_mp',
                            statusCode: 'visa_mp',
                            statusLabel: 'Visa Manager Projet',
                            canDecide: false,
                            needsCorrection: false,
                            caisseAttribuee: caisseChoisie,
                        };
                    }
                    return d;
                }));

                setToast({
                    type: 'success',
                    message: `Première validation accordée pour ${selectedReq?.numero}. Caisse attribuée : ${caisseChoisie}. Transmis aux Finances.`
                });

                setSelectedReq(null);
                setModeRejet(false);
            },
        });
    };

    // Action : reject()
    const handleReject = (id: string) => {
        if (!motifRejet.trim()) {
            alert('Veuillez spécifier obligatoirement le motif du rejet.');
            return;
        }

        router.patch(route('requisitions.manager-decision', id), {
            decision: 'reject',
            motif_rejet: motifRejet,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setDemandes(prev => prev.map(d => {
                    if (d.id === id) {
                        return {
                            ...d,
                            statut: 'rejete_mp',
                            statusCode: 'rejetee',
                            statusLabel: 'Rejetée',
                            canDecide: false,
                            needsCorrection: true,
                            motifRejet: motifRejet,
                        };
                    }
                    return d;
                }));

                setToast({
                    type: 'error',
                    message: `Réquisition ${selectedReq?.numero} rejetée. L'initiateur a été notifié du motif.`
                });

                setSelectedReq(null);
                setModeRejet(false);
                setMotifRejet('');
            },
        });
    };

    return (
        <AppLayout>
            <Head title="Validation Manager de Projet" />

            {/* Notification Toast */}
            {toast && (
                <div className={`fixed bottom-6 right-6 z-50 p-4 rounded shadow-xl border flex items-center gap-3 text-xs font-bold ${
                    toast.type === 'success' 
                        ? 'bg-[#10B981] text-white border-[#059669]' 
                        : 'bg-[#DC2626] text-white border-[#B91C1C]'
                }`}>
                    <span>{toast.type === 'success' ? '✓' : '⚠️'}</span>
                    <p>{toast.message}</p>
                    <button onClick={() => setToast(null)} className="ml-4 underline opacity-80">Fermer</button>
                </div>
            )}

            {/* EN-TÊTE CONFORME AU CAHIER DES CHARGES */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
                <div>
                    <h1 className="text-xl font-bold text-[#0B192C]">
                        Validation des Réquisitions — {user.project?.name || 'Projet'}
                    </h1>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Manager de Projet : <strong>{user.name}</strong> • Examen de pertinence et première validation (firstValidation).
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Link
                        href={route('requisitions.create')}
                        className="bg-[#04326D] hover:bg-[#06428f] text-white px-3.5 py-2 rounded text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                    >
                        <span>+</span>
                        <span>Initier Réquisition Projet</span>
                    </Link>
                </div>
            </div>

            {/* 3 INDICATEURS STRICTS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border-2 border-[#F58F20] rounded p-4 shadow-sm">
                    <span className="text-[10px] font-bold uppercase text-[#0B192C]">En attente de visa MP</span>
                    <p className="text-2xl font-black text-[#F58F20] mt-1">
                        {demandes.filter(d => d.statut === 'en_attente_mp').length} réquisition(s)
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Nécessite votre contrôle de pertinence</p>
                </div>

                <div className="bg-white border border-[#B2BED6] rounded p-4 shadow-sm">
                    <span className="text-[10px] font-bold uppercase text-gray-500">Validées (Transmises aux Finances)</span>
                    <p className="text-2xl font-black text-[#10B981] mt-1">
                        {demandes.filter(d => d.statut === 'valide_mp').length} réquisition(s)
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Caisse attribuée et visée</p>
                </div>

                <div className="bg-white border border-[#B2BED6] rounded p-4 shadow-sm">
                    <span className="text-[10px] font-bold uppercase text-gray-500">À corriger</span>
                    <p className="text-2xl font-black text-[#DC2626] mt-1">
                        {demandes.filter(d => d.needsCorrection).length} réquisition(s)
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Rejetées ou renvoyées par Finance</p>
                </div>
            </div>

            {/* TABLEAU DES DEMANDES DE L'ÉQUIPE (showList / filter) */}
            <div className="bg-white border border-[#B2BED6] rounded shadow-sm overflow-hidden">
                <div className="p-4 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <h2 className="text-xs font-bold text-[#0B192C] uppercase tracking-wider">
                            Demandes de l'Équipe du Projet
                        </h2>
                        <p className="text-[11px] text-gray-500">
                            Cliquez sur une demande pour consulter les détails, les pièces jointes (justif) et statuer.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-500">Filtrer par état :</span>
                        <select
                            value={filterStatut}
                            onChange={(e) => setFilterStatut(e.target.value)}
                            className="border border-[#B2BED6] rounded px-2.5 py-1 text-xs bg-white text-gray-700 focus:outline-none"
                        >
                            <option value="en_attente_mp">À arbitrer (En attente)</option>
                            <option value="valide_mp">Validées (Transmises)</option>
                            <option value="rejete_mp">Rejetées</option>
                            <option value="a_corriger">À corriger</option>
                            <option value="all">Toutes</option>
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
                                <th className="py-3 px-4">Observation / Activité</th>
                                <th className="py-3 px-4 text-right">Montant Total</th>
                                <th className="py-3 px-4 text-center">Statut</th>
                                <th className="py-3 px-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2E8F0] text-gray-700">
                            {demandesFiltrees.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-8 text-center text-gray-400 italic">
                                        Aucune réquisition dans cette catégorie.
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
                                            {req.statut === 'en_attente_mp' && (
                                                <span className="bg-orange-100 text-[#92400E] px-2.5 py-1 rounded-full text-[10px] font-bold">
                                                    {req.statusLabel}
                                                </span>
                                            )}
                                            {req.statut === 'valide_mp' && (
                                                <span className="bg-emerald-100 text-[#065F46] px-2.5 py-1 rounded-full text-[10px] font-bold">
                                                    {req.statusLabel}{req.caisseAttribuee ? ` (${req.caisseAttribuee})` : ''}
                                                </span>
                                            )}
                                            {req.statut === 'rejete_mp' && (
                                                <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-[10px] font-bold">
                                                    {req.statusLabel}
                                                </span>
                                            )}
                                            {req.statut === 'autre' && (
                                                <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full text-[10px] font-bold" title={req.statusCode}>
                                                    {req.statusLabel}
                                                </span>
                                            )}
                                            {req.statut === 'a_corriger' && (
                                                <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-[10px] font-bold">
                                                    {req.statusLabel}
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                            {req.canEdit && (
                                                <button
                                                    type="button"
                                                    onClick={() => openEditModal(req)}
                                                    className="mr-2 px-3 py-1.5 border border-[#04326D] text-[#04326D] rounded font-bold text-xs hover:bg-blue-50"
                                                >
                                                    Modifier
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedReq(req);
                                                    setCaisseChoisie(req.caisseAttribuee || req.caisseSouhaitee || 'Caisse principale');
                                                    setModeRejet(false);
                                                }}
                                                className="px-3 py-1.5 bg-[#04326D] hover:bg-[#06428f] text-white rounded font-bold text-xs transition"
                                            >
                                                {req.canDecide ? 'Examiner & Statuer' : 'Consulter Dossier'}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {editingReq && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
                    <form onSubmit={handleSaveEdit} className="w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-white border border-[#B2BED6] shadow-2xl">
                        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 p-5 border-b border-[#E2E8F0] bg-white">
                            <div>
                                <p className="text-[10px] uppercase font-bold text-[#F58F20]">Modification et correction</p>
                                <h2 className="text-lg font-bold text-[#0B192C]">Réquisition {editingReq.numero}</h2>
                            </div>
                            <button type="button" onClick={() => setEditingReq(null)} aria-label="Fermer" className="text-gray-500 text-2xl leading-none">&times;</button>
                        </header>

                        <div className="p-5 space-y-4 text-xs">
                            {editError && <div role="alert" className="border border-red-300 bg-red-50 p-3 text-red-800">{editError}</div>}
                            {editingReq.financeReturned && (
                                <div className="border-l-4 border-red-500 bg-red-50 p-3 text-red-900">
                                    <strong>Correction demandée par Finance.</strong>
                                    <p className="mt-1 whitespace-pre-line">{editingReq.observation}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <label className="font-semibold text-gray-700">Nature
                                    <select value={editingReq.nature} onChange={(event) => setEditingReq({ ...editingReq, nature: event.target.value as 'Achat' | 'Service' })} className="mt-1 w-full border border-[#B2BED6] rounded p-2 bg-white">
                                        <option value="Achat">Achat</option><option value="Service">Service</option>
                                    </select>
                                </label>
                                <label className="font-semibold text-gray-700">Caisse
                                    <select value={editingReq.caisseSouhaitee} onChange={(event) => setEditingReq({ ...editingReq, caisseSouhaitee: event.target.value })} className="mt-1 w-full border border-[#B2BED6] rounded p-2 bg-white">
                                        {CAISSES_DISPONIBLES.map((caisse) => <option key={caisse} value={caisse}>{caisse}</option>)}
                                    </select>
                                </label>
                                <label className="font-semibold text-gray-700">Devise
                                    <select value={editingReq.devise} onChange={(event) => setEditingReq({ ...editingReq, devise: event.target.value as RequisitionMP['devise'] })} className="mt-1 w-full border border-[#B2BED6] rounded p-2 bg-white">
                                        <option value="USD">USD</option><option value="FC">FC</option><option value="EUR">EUR</option>
                                    </select>
                                </label>
                            </div>

                            <label className="block font-semibold text-gray-700">Observation
                                <textarea rows={2} value={editingReq.observation ?? ''} onChange={(event) => setEditingReq({ ...editingReq, observation: event.target.value })} className="mt-1 w-full border border-[#B2BED6] rounded p-2 font-normal" />
                            </label>

                            <div className="space-y-3">
                                {editingReq.lignes.map((line) => (
                                    <section key={line.id} className="border border-[#D8DEE8] p-3 space-y-3">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <label className="font-semibold text-gray-700">Activité / Désignation
                                                <input required value={line.activite} onChange={(event) => updateEditingLine(line.id, { activite: event.target.value })} className="mt-1 w-full border border-[#B2BED6] rounded p-2 font-normal" />
                                            </label>
                                            <label className="font-semibold text-gray-700">Code All. Budget demandé
                                                <input required value={line.codeAllBudget} onChange={(event) => updateEditingLine(line.id, { codeAllBudget: event.target.value })} className="mt-1 w-full border border-[#B2BED6] rounded p-2 font-mono font-normal" />
                                            </label>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            <label className="font-semibold text-gray-700">Nature de ligne
                                                <input value={line.nature} onChange={(event) => updateEditingLine(line.id, { nature: event.target.value })} className="mt-1 w-full border border-[#B2BED6] rounded p-2 font-normal" />
                                            </label>
                                            <label className="font-semibold text-gray-700">{editingReq.nature === 'Achat' ? 'Quantité' : 'Durée'}
                                                <input type="number" min="0" step="0.01" required value={line.quantiteOuDuree} onChange={(event) => updateEditingLine(line.id, { quantiteOuDuree: Number(event.target.value) })} className="mt-1 w-full border border-[#B2BED6] rounded p-2 text-right font-normal" />
                                            </label>
                                            <label className="font-semibold text-gray-700">Unité
                                                <input value={line.unite} onChange={(event) => updateEditingLine(line.id, { unite: event.target.value })} className="mt-1 w-full border border-[#B2BED6] rounded p-2 font-normal" />
                                            </label>
                                            <label className="font-semibold text-gray-700">Prix unitaire
                                                <input type="number" min="0" step="0.01" required value={line.frais} onChange={(event) => updateEditingLine(line.id, { frais: Number(event.target.value) })} className="mt-1 w-full border border-[#B2BED6] rounded p-2 text-right font-normal" />
                                            </label>
                                        </div>
                                        <p className="text-right font-bold text-[#04326D]">Total : {line.total.toLocaleString()} {editingReq.devise}</p>
                                        {line.justif.length > 0 && <ul className="text-[11px] text-gray-500">{line.justif.map((file, index) => <li key={`${line.id}-file-${index}`}>{file.scan}</li>)}</ul>}
                                        <label className="block font-semibold text-gray-700">Ajouter des pièces justificatives
                                            <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={(event) => setEditFiles((current) => ({ ...current, [line.id]: Array.from(event.target.files ?? []) }))} className="mt-1 block w-full border border-dashed border-[#B2BED6] rounded p-2 font-normal" />
                                        </label>
                                        {(editFiles[line.id] ?? []).length > 0 && <p className="text-[10px] text-gray-500">{editFiles[line.id].map((file) => file.name).join(', ')}</p>}
                                    </section>
                                ))}
                            </div>
                        </div>

                        <footer className="sticky bottom-0 flex justify-end gap-2 border-t border-[#E2E8F0] p-4 bg-white">
                            <button type="button" disabled={savingEdit} onClick={() => setEditingReq(null)} className="px-3 py-2 border border-gray-300 text-gray-700 text-xs">Annuler</button>
                            <button type="submit" disabled={savingEdit} className="px-4 py-2 bg-[#04326D] text-white text-xs font-bold disabled:opacity-50">{savingEdit ? 'Enregistrement...' : 'Enregistrer les corrections'}</button>
                        </footer>
                    </form>
                </div>
            )}

            {/* MODALE CONFORME AU DIAGRAMME DE SÉQUENCE : show detail Req() + loadCaisses() + firstValidation() / reject() */}
            {selectedReq && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="bg-white rounded border border-[#B2BED6] shadow-2xl max-w-3xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
                        
                        {/* En-tête Modale */}
                        <div className="flex items-start justify-between border-b pb-3">
                            <div>
                                <span className="text-[10px] text-gray-400 font-mono uppercase">Contrôle Opérationnel & Pertinence</span>
                                <h2 className="text-base font-bold text-[#0B192C]">
                                    Réquisition N° {selectedReq.numero} ({selectedReq.nature})
                                </h2>
                                <p className="text-xs text-gray-500">
                                    Initiée par <strong>{selectedReq.initiateurNom}</strong> ({selectedReq.initiateurRole}) • Date : {selectedReq.dateSoumission}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedReq(null)}
                                className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none p-1"
                            >
                                &times;
                            </button>
                        </div>

                        {/* Observation */}
                        {selectedReq.observation && (
                            <div className="p-3 bg-gray-50 border rounded text-xs text-gray-700">
                                <strong>Observation de l'initiateur :</strong> {selectedReq.observation}
                            </div>
                        )}

                        {/* TABLEAU DES LIGNES ET JUSTIFICATIFS (DemandeModel & justif: JSON[]) */}
                        <div>
                            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                                Articles & Justificatifs Attachés (justif: JSON[])
                            </h3>
                            <table className="w-full text-left text-xs border border-gray-200">
                                <thead className="bg-[#F1F5F9] font-bold text-gray-600">
                                    <tr>
                                        <th className="p-2">Désignation</th>
                                        <th className="p-2">Code Budget</th>
                                        <th className="p-2 text-center">{selectedReq.nature === 'Achat' ? 'Qté' : 'Durée'}</th>
                                        <th className="p-2 text-right">Prix Unitaire</th>
                                        <th className="p-2 text-right">Total</th>
                                        <th className="p-2">Pièces Justificatives (Scans)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y text-gray-700">
                                    {selectedReq.lignes.map(ligne => (
                                        <tr key={ligne.id}>
                                            <td className="p-2 font-medium">{ligne.activite}</td>
                                            <td className="p-2 font-mono text-gray-500">{ligne.codeAllBudget}</td>
                                            <td className="p-2 text-center">{ligne.quantiteOuDuree} {ligne.unite}</td>
                                            <td className="p-2 text-right">{ligne.frais.toLocaleString()} {selectedReq.devise}</td>
                                            <td className="p-2 text-right font-bold">{ligne.total.toLocaleString()} {selectedReq.devise}</td>
                                            <td className="p-2">
                                                {ligne.justif.length > 0 ? (
                                                    <div className="space-y-1">
                                                        {ligne.justif.map((j, idx) => (
                                                            <div key={idx} className="bg-blue-50 text-[#04326D] px-2 py-0.5 rounded text-[10px] flex items-center justify-between">
                                                                {j.fileUrl ? (
                                                                    <a
                                                                        href={j.fileUrl}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        title={`Consulter ${j.description}`}
                                                                        className="truncate max-w-[140px] underline decoration-transparent hover:decoration-current"
                                                                    >
                                                                        {j.scan}
                                                                    </a>
                                                                ) : (
                                                                    <span className="truncate max-w-[140px]" title={j.description}>{j.scan}</span>
                                                                )}
                                                                <span className="font-bold">{j.montant} {selectedReq.devise}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 italic text-[10px]">Aucun scan</span>
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

                        {/* ZONE D'ARBITRAGE DU MANAGER DE PROJET */}
                        {selectedReq.canDecide && (
                            <div className="border-t pt-4 space-y-4">
                                {!modeRejet ? (
                                    <>
                                        {/* ATTRIBUTION DE LA CAISSE (loadCaisses) */}
                                        <div className="bg-blue-50/70 p-3.5 rounded border border-blue-200 space-y-1.5">
                                            <label className="block text-xs font-bold text-[#04326D] uppercase">
                                                Attribution Officielle de la Caisse de Décaissement :
                                            </label>
                                            <select
                                                value={caisseChoisie}
                                                onChange={(e) => setCaisseChoisie(e.target.value)}
                                                className="w-full border border-[#04326D] rounded p-2 text-xs font-bold text-[#0B192C] bg-white focus:outline-none"
                                            >
                                                {CAISSES_DISPONIBLES.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                            <p className="text-[11px] text-gray-500">
                                                Caisse souhaitée par l'initiateur : <strong>{selectedReq.caisseSouhaitee}</strong>
                                            </p>
                                        </div>

                                        {/* Boutons d'Arbitrage */}
                                        <div className="flex items-center justify-between pt-2">
                                            <button
                                                type="button"
                                                onClick={() => setModeRejet(true)}
                                                className="px-3 py-2 border border-red-300 text-red-600 hover:bg-red-50 rounded text-xs font-bold transition"
                                            >
                                                Rejeter la demande (Non pertinente)
                                            </button>

                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedReq(null)}
                                                    className="px-3 py-2 border rounded text-xs text-gray-600 hover:bg-gray-50"
                                                >
                                                    Fermer
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleFirstValidation(selectedReq.id)}
                                                    className="px-4 py-2 bg-[#10B981] hover:bg-[#059669] text-white rounded text-xs font-bold shadow transition flex items-center gap-1.5"
                                                >
                                                    <span>Valider (firstValidation)</span>
                                                    <span>&rarr;</span>
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    /* REJET AVEC MOTIF OBLIGATOIRE */
                                    <div className="bg-red-50 p-4 rounded border border-red-200 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <h4 className="text-xs font-bold text-red-800 uppercase">
                                                Motif du Rejet (Obligatoire)
                                            </h4>
                                            <button
                                                type="button"
                                                onClick={() => setModeRejet(false)}
                                                className="text-xs text-gray-500 hover:underline"
                                            >
                                                Annuler le rejet
                                            </button>
                                        </div>
                                        <textarea
                                            rows={3}
                                            value={motifRejet}
                                            onChange={(e) => setMotifRejet(e.target.value)}
                                            placeholder="Précisez le motif du rejet (activité non budgétisée, devis excessif, pièces manquantes)..."
                                            className="w-full border border-red-300 rounded p-2 text-xs focus:outline-none bg-white"
                                            required
                                        ></textarea>
                                        <div className="flex justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleReject(selectedReq.id)}
                                                className="px-4 py-1.5 bg-[#DC2626] hover:bg-[#b91c1c] text-white rounded text-xs font-bold shadow"
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
                                <button
                                    type="button"
                                    onClick={() => setSelectedReq(null)}
                                    className="px-4 py-1.5 bg-gray-800 text-white rounded text-xs font-bold"
                                >
                                    Fermer
                                </button>
                            </div>
                        )}

                    </div>
                </div>
            )}
        </AppLayout>
    );
}