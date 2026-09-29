import { useState, useMemo } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { PageProps } from '@/types';
import { numberToWordsFR } from '@/lib/numberToWords';

interface JustificatifItem {
    id: string;
    description: string;
    date: string;
    montant: number;
    file: File | null;
}

interface LigneArticle {
    id: string;
    activite: string;
    code_all_budget: string;
    nature: string;
    quantite: number;
    duree: number;
    unite: string;
    frais_unitaire: number;
    total_ligne: number;
    justificatifs: JustificatifItem[];
}

const CAISSES_DISPONIBLES = [
    'EU',
    'Caisse principale',
    'Saint Jean Eudes',
    'Local Fund 1 (Boulangerie)',
    'Local Fund 2'
];

export default function CreateRequisition() {
    const { auth } = usePage<PageProps>().props;
    const user = auth.user;
    const isCoordinator = user.role === 'coordinator';

    // 1. Nature de la Réquisition : Achat (Qté) vs Service (Durée)
    const [natureRequisition, setNatureRequisition] = useState<'Achat' | 'Service'>('Achat');

    // 2. Circuit d'Urgence
    const [isUrgent, setIsUrgent] = useState<boolean>(false);

    // 3. Projet réel de l'utilisateur
    const userProjectName = user.project?.name || 'USIMAMIZI BORA';
    const [selectedProject, setSelectedProject] = useState<string>(userProjectName);

    // Initiales projet automatiques
    const projectCode = useMemo(() => {
        const words = selectedProject.trim().split(/\s+/);
        return (words.length >= 2 ? words[0][0] + words[1][0] : selectedProject.substring(0, 2)).toUpperCase();
    }, [selectedProject]);

    // Numéro de réquisition généré
    const numeroRequisition = useMemo(() => {
        const mois = String(new Date().getMonth() + 1).padStart(2, '0');
        return `${projectCode}/${mois}/001`;
    }, [projectCode]);

    // 4. Paramètres financiers
    const [caisseDecaissement, setCaisseDecaissement] = useState<string>('Caisse principale');
    const [devise, setDevise] = useState<'USD' | 'FC' | 'EUR'>('USD');
    const [observation, setObservation] = useState<string>('');
    const [datePaiement, setDatePaiement] = useState<string>('');
    const [dateLivraison, setDateLivraison] = useState<string>('');

    // 5. Lignes d'articles / prestations
    const [lignes, setLignes] = useState<LigneArticle[]>([
        {
            id: '1',
            activite: '',
            code_all_budget: '',
            nature: '',
            quantite: 1,
            duree: 1,
            unite: 'Pce',
            frais_unitaire: 0,
            total_ligne: 0,
            justificatifs: []
        }
    ]);

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Modal Justificatifs
    const [activeLigneId, setActiveLigneId] = useState<string | null>(null);
    const [justifDesc, setJustifDesc] = useState('');
    const [justifDate, setJustifDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [justifMontant, setJustifMontant] = useState('');
    const [justifFile, setJustifFile] = useState<File | null>(null);

    // Calculs totaux
    const montantTotal = useMemo(() => {
        return lignes.reduce((acc, l) => acc + (Number(l.total_ligne) || 0), 0);
    }, [lignes]);

    const montantEnLettres = useMemo(() => {
        return numberToWordsFR(montantTotal, devise);
    }, [montantTotal, devise]);

    // Basculement Achat / Service
    const handleNatureChange = (nature: 'Achat' | 'Service') => {
        setNatureRequisition(nature);
        setLignes(lignes.map(l => {
            const qte = nature === 'Achat' ? (l.quantite || 1) : 1;
            const duree = nature === 'Service' ? (l.duree || 1) : 1;
            return {
                ...l,
                quantite: qte,
                duree: duree,
                unite: nature === 'Achat' ? 'Pce' : 'Jours',
                total_ligne: qte * duree * l.frais_unitaire
            };
        }));
    };

    const handleAddLigne = () => {
        setLignes([
            ...lignes,
            {
                id: Date.now().toString(),
                activite: '',
                code_all_budget: '',
                nature: '',
                quantite: 1,
                duree: 1,
                unite: natureRequisition === 'Achat' ? 'Pce' : 'Jours',
                frais_unitaire: 0,
                total_ligne: 0,
                justificatifs: []
            }
        ]);
    };

    const handleRemoveLigne = (id: string) => {
        if (lignes.length === 1) return;
        setLignes(lignes.filter(l => l.id !== id));
    };

    const handleUpdateLigne = (id: string, field: keyof LigneArticle, value: any) => {
        setLignes(lignes.map(l => {
            if (l.id !== id) return l;
            const updated = { ...l, [field]: value };
            const qte = natureRequisition === 'Achat' ? (field === 'quantite' ? Number(value) : l.quantite) : 1;
            const duree = natureRequisition === 'Service' ? (field === 'duree' ? Number(value) : l.duree) : 1;
            const pu = field === 'frais_unitaire' ? Number(value) : l.frais_unitaire;
            updated.quantite = qte;
            updated.duree = duree;
            updated.frais_unitaire = pu;
            updated.total_ligne = qte * duree * pu;
            return updated;
        }));
    };

    // Ajout d'un devis / justificatif sur une ligne
    const handleAttachJustificatif = (ligneId: string) => {
        if (!justifDesc) {
            alert('Veuillez indiquer la description du justificatif.');
            return;
        }

        const newJustif: JustificatifItem = {
            id: Date.now().toString(),
            description: justifDesc,
            date: justifDate,
            montant: parseFloat(justifMontant) || 0,
            file: justifFile
        };

        setLignes(lignes.map(l => {
            if (l.id === ligneId) {
                return { ...l, justificatifs: [...l.justificatifs, newJustif] };
            }
            return l;
        }));

        setJustifDesc('');
        setJustifMontant('');
        setJustifFile(null);
        setActiveLigneId(null);
    };

    const handleRemoveJustificatif = (ligneId: string, justifId: string) => {
        setLignes(lignes.map(l => {
            if (l.id === ligneId) {
                return { ...l, justificatifs: l.justificatifs.filter(j => j.id !== justifId) };
            }
            return l;
        }));
    };

    // Soumission réelle vers RequisitionController::store
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (montantTotal <= 0) {
            alert('Le montant total doit être supérieur à zéro.');
            return;
        }

        setIsSubmitting(true);
        const formData = new FormData();

        formData.append('numero_requisition', numeroRequisition);
        formData.append('nature_requisition', natureRequisition);
        formData.append('projet', selectedProject);
        formData.append('project_code', projectCode);
        formData.append('caisse_decaissement', caisseDecaissement);
        formData.append('devise', devise);
        formData.append('observation', observation);
        formData.append('montant_total', String(montantTotal));
        formData.append('is_urgent', isUrgent ? '1' : '0');

        if (natureRequisition === 'Service' && datePaiement) {
            formData.append('date_paiement', datePaiement);
        }
        if (natureRequisition === 'Achat' && dateLivraison) {
            formData.append('date_livraison', dateLivraison);
        }

        lignes.forEach((ligne, index) => {
            formData.append(`lignes[${index}][activite]`, ligne.activite);
            formData.append(`lignes[${index}][code_all_budget]`, ligne.code_all_budget || 'A_ATTRIBUER_PAR_MP');
            formData.append(`lignes[${index}][nature]`, ligne.nature || natureRequisition);
            formData.append(`lignes[${index}][quantite]`, String(ligne.quantite));
            formData.append(`lignes[${index}][duree]`, String(ligne.duree));
            formData.append(`lignes[${index}][unite]`, ligne.unite);
            formData.append(`lignes[${index}][frais_unitaire]`, String(ligne.frais_unitaire));
            formData.append(`lignes[${index}][total_ligne]`, String(ligne.total_ligne));

            ligne.justificatifs.forEach((justif, jIndex) => {
                formData.append(`lignes[${index}][justificatifs][${jIndex}][description]`, justif.description);
                formData.append(`lignes[${index}][justificatifs][${jIndex}][date]`, justif.date);
                formData.append(`lignes[${index}][justificatifs][${jIndex}][montant]`, String(justif.montant));
                if (justif.file) {
                    formData.append(`lignes[${index}][justificatifs][${jIndex}][file]`, justif.file);
                }
            });
        });

        router.post(route('requisitions.store'), formData, {
            onFinish: () => setIsSubmitting(false),
            onError: (errors) => {
                alert('Erreur de validation : ' + Object.values(errors).join(', '));
            }
        });
    };

    return (
        <AppLayout>
            <Head title={`Créer Réquisition - ${numeroRequisition}`} />

            <div className="space-y-6">
                {/* En-tête */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
                    <div>
                        <nav className="text-[11px] text-gray-500 font-medium mb-1">
                            <Link href={route('dashboard')} className="hover:underline">Dashboard</Link>
                            <span className="mx-1.5">&rsaquo;</span>
                            <span className="text-[#0B192C] font-bold">Expression de Besoin</span>
                        </nav>
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-bold text-[#0B192C]">
                                {natureRequisition === 'Achat' ? "Réquisition d'Achat" : "Réquisition de Services"}
                            </h1>
                            <span className="bg-[#0B192C] text-[#F58F20] px-3 py-0.5 rounded font-mono font-bold text-xs">
                                N° {numeroRequisition}
                            </span>
                            {isUrgent && (
                                <span className="bg-[#DC2626] text-white px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider animate-pulse">
                                    Circuit Urgent
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link
                            href={route('dashboard')}
                            className="px-3.5 py-1.5 border border-[#B2BED6] text-gray-700 bg-white hover:bg-gray-50 rounded text-xs font-semibold"
                        >
                            Annuler
                        </Link>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="px-4 py-1.5 bg-[#04326D] hover:bg-[#06428f] disabled:opacity-50 text-white rounded text-xs font-bold shadow-sm transition"
                        >
                            {isSubmitting ? 'Transmission...' : 'Soumettre au Manager de Projet'}
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    
                    {/* 1. BLOC D'IDENTIFICATION & CIRCUIT URGENT */}
                    <div className="bg-white border border-[#B2BED6] rounded p-5 shadow-sm space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-2 gap-2">
                            <h2 className="text-xs font-bold text-[#0B192C] uppercase tracking-wider">
                                I. Paramètres de la Demande
                            </h2>

                            {/* OPTION URGENTE CLAIRE */}
                            <label className="inline-flex items-center gap-2 cursor-pointer bg-red-50 border border-red-200 px-3 py-1 rounded">
                                <input
                                    type="checkbox"
                                    checked={isUrgent}
                                    onChange={(e) => setIsUrgent(e.target.checked)}
                                    className="rounded border-red-400 text-red-600 focus:ring-red-500 w-4 h-4"
                                />
                                <span className="text-xs font-bold text-red-700">
                                    Déclarer comme Réquisition URGENTE
                                </span>
                            </label>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                            {/* Nature : Achat (Qté) vs Service (Durée) */}
                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Nature de la Réquisition</label>
                                <select
                                    value={natureRequisition}
                                    onChange={(e) => handleNatureChange(e.target.value as 'Achat' | 'Service')}
                                    className="w-full border border-[#04326D] rounded p-2 text-xs font-bold text-[#04326D] bg-blue-50/50 focus:outline-none"
                                >
                                    <option value="Achat">Réquisition d'Achat (avec Quantité)</option>
                                    <option value="Service">Réquisition de Service (avec Durée)</option>
                                </select>
                            </div>

                            {/* Projet */}
                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">Projet</label>
                                {isCoordinator ? (
                                    <select
                                        value={selectedProject}
                                        onChange={(e) => setSelectedProject(e.target.value)}
                                        className="w-full border border-[#B2BED6] rounded p-2 text-xs font-semibold focus:outline-none"
                                    >
                                        <option value="USIMAMIZI BORA">USIMAMIZI BORA (UB)</option>
                                        <option value="AFYA BORA">AFYA BORA (AB)</option>
                                        <option value="CHAKUISHI">CHAKUISHI (CB)</option>
                                        <option value="HABIMA">HABIMA (HB)</option>
                                        <option value="MAHUWA">MAHUWA (MH)</option>
                                        <option value="USUMADA">USUMADA (UM)</option>
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        value={selectedProject}
                                        disabled
                                        className="w-full bg-[#F9F9FF] border border-[#B2BED6] rounded p-2 text-xs text-gray-700 font-bold cursor-not-allowed"
                                    />
                                )}
                            </div>

                            {/* Caisse de décaissement souhaitée */}
                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">Caisse de Décaissement Souhaitée</label>
                                <select
                                    value={caisseDecaissement}
                                    onChange={(e) => setCaisseDecaissement(e.target.value)}
                                    className="w-full border border-[#B2BED6] rounded p-2 text-xs font-bold text-[#0B192C] focus:outline-none"
                                >
                                    {CAISSES_DISPONIBLES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>

                            {/* Devise */}
                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">Devise</label>
                                <select
                                    value={devise}
                                    onChange={(e) => setDevise(e.target.value as any)}
                                    className="w-full border border-[#B2BED6] rounded p-2 text-xs font-bold text-[#04326D] focus:outline-none"
                                >
                                    <option value="USD">USD ($ - Dollar Américain)</option>
                                    <option value="FC">FC (CDF - Franc Congolais)</option>
                                    <option value="EUR">EUR (€ - Euro)</option>
                                </select>
                            </div>
                        </div>

                        {/* Date spécifique à la fiche officielle */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
                            {natureRequisition === 'Achat' ? (
                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">À livrer le (Échéance de livraison) :</label>
                                    <input
                                        type="date"
                                        value={dateLivraison}
                                        onChange={(e) => setDateLivraison(e.target.value)}
                                        className="w-full border border-[#B2BED6] rounded p-2 text-xs focus:outline-none"
                                    />
                                </div>
                            ) : (
                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">Date de paiement souhaitée :</label>
                                    <input
                                        type="date"
                                        value={datePaiement}
                                        onChange={(e) => setDatePaiement(e.target.value)}
                                        className="w-full border border-[#B2BED6] rounded p-2 text-xs focus:outline-none"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">Observation / Contexte de la demande :</label>
                                <input
                                    type="text"
                                    value={observation}
                                    onChange={(e) => setObservation(e.target.value)}
                                    placeholder="Précisez le contexte, l'urgence ou la justification de cette dépense..."
                                    className="w-full border border-[#B2BED6] rounded p-2 text-xs focus:outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* 2. TABLEAU DES DEMANDES (DÉSIGNATION, QUANTITÉ OU DURÉE, FRAIS, DEVIS) */}
                    <div className="bg-white border border-[#B2BED6] rounded shadow-sm overflow-hidden">
                        <div className="p-3.5 bg-[#0B192C] text-white flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <h2 className="text-xs font-bold uppercase tracking-wider">
                                    Lignes d'Articles ou Prestations ({natureRequisition})
                                </h2>
                                <span className="bg-[#04326D] text-white text-[10px] font-mono px-2 py-0.5 rounded">
                                    {lignes.length} ligne(s)
                                </span>
                            </div>

                            <button
                                type="button"
                                onClick={handleAddLigne}
                                className="bg-[#04326D] hover:bg-[#08489c] text-white text-xs font-bold px-3 py-1 rounded flex items-center gap-1.5 transition"
                            >
                                <span>+</span>
                                <span>Ajouter une ligne</span>
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-[#F1F5F9] text-gray-600 uppercase text-[10px] font-bold border-b border-[#B2BED6]">
                                        <th className="py-2.5 px-3 w-10 text-center">N°</th>
                                        <th className="py-2.5 px-3 min-w-[240px]">
                                            {natureRequisition === 'Achat' ? 'Description de l\'article' : 'Nature de service'}
                                        </th>
                                        <th className="py-2.5 px-3 w-36 text-center text-gray-400">
                                            Code Budget <span className="text-[9px] block font-normal">(Attribué par MP)</span>
                                        </th>
                                        
                                        {/* Colonne conditionnelle : Qté vs Durée */}
                                        {natureRequisition === 'Achat' ? (
                                            <th className="py-2.5 px-2 w-20 text-center bg-blue-50 text-[#04326D]">Qté</th>
                                        ) : (
                                            <th className="py-2.5 px-2 w-20 text-center bg-orange-50 text-[#F58F20]">Durée</th>
                                        )}

                                        <th className="py-2.5 px-2 w-20">Unité</th>
                                        <th className="py-2.5 px-3 w-28 text-right">Prix Unitaire</th>
                                        <th className="py-2.5 px-3 w-32 text-right">Total Ligne</th>
                                        <th className="py-2.5 px-3 w-36 text-center">Devis / Justificatifs</th>
                                        <th className="py-2.5 px-2 w-10 text-center"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E2E8F0]">
                                    {lignes.map((ligne, idx) => (
                                        <tr key={ligne.id} className="hover:bg-[#F9F9FF] transition">
                                            <td className="py-2.5 px-3 text-center font-bold text-gray-400">
                                                {idx + 1}
                                            </td>

                                            <td className="py-2.5 px-3">
                                                <input
                                                    type="text"
                                                    placeholder={natureRequisition === 'Achat' ? "Désignation de l'article..." : "Description de la prestation..."}
                                                    value={ligne.activite}
                                                    onChange={(e) => handleUpdateLigne(ligne.id, 'activite', e.target.value)}
                                                    className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-[#04326D]"
                                                    required
                                                />
                                            </td>

                                            {/* Code laissé à l'attribution exclusive du Manager de Projet */}
                                            <td className="py-2.5 px-3 text-center">
                                                <span className="text-[10px] text-gray-400 italic">
                                                    Assigné au visa MP
                                                </span>
                                            </td>

                                            {/* Qté vs Durée */}
                                            {natureRequisition === 'Achat' ? (
                                                <td className="py-2.5 px-2 bg-blue-50/40">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={ligne.quantite}
                                                        onChange={(e) => handleUpdateLigne(ligne.id, 'quantite', Math.max(1, parseInt(e.target.value) || 0))}
                                                        className="w-full border border-blue-300 rounded px-1 text-xs text-center font-bold text-[#04326D] focus:outline-none"
                                                    />
                                                </td>
                                            ) : (
                                                <td className="py-2.5 px-2 bg-orange-50/40">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={ligne.duree}
                                                        onChange={(e) => handleUpdateLigne(ligne.id, 'duree', Math.max(1, parseInt(e.target.value) || 0))}
                                                        className="w-full border border-orange-300 rounded px-1 text-xs text-center font-bold text-[#F58F20] focus:outline-none"
                                                    />
                                                </td>
                                            )}

                                            <td className="py-2.5 px-2">
                                                <input
                                                    type="text"
                                                    placeholder={natureRequisition === 'Achat' ? "Pce, Lot..." : "Jours, Mois..."}
                                                    value={ligne.unite}
                                                    onChange={(e) => handleUpdateLigne(ligne.id, 'unite', e.target.value)}
                                                    className="w-full border border-gray-300 rounded px-1 text-xs focus:outline-none"
                                                />
                                            </td>

                                            <td className="py-2.5 px-3 text-right">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={ligne.frais_unitaire}
                                                    onChange={(e) => handleUpdateLigne(ligne.id, 'frais_unitaire', parseFloat(e.target.value) || 0)}
                                                    className="w-full border border-gray-300 rounded px-1 text-xs text-right font-semibold focus:outline-none"
                                                />
                                            </td>

                                            <td className="py-2.5 px-3 text-right font-bold text-[#0B192C]">
                                                {ligne.total_ligne.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {devise}
                                            </td>

                                            {/* Devis attachés */}
                                            <td className="py-2.5 px-3 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    {ligne.justificatifs.map(j => (
                                                        <div key={j.id} className="flex items-center justify-between bg-blue-50 text-[#04326D] px-1.5 py-0.5 rounded text-[10px] w-full">
                                                            <span className="truncate max-w-[80px]" title={j.description}>
                                                                📄 {j.file ? j.file.name : j.description}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveJustificatif(ligne.id, j.id)}
                                                                className="text-red-500 font-bold ml-1 hover:text-red-700"
                                                            >
                                                                &times;
                                                            </button>
                                                        </div>
                                                    ))}

                                                    <button
                                                        type="button"
                                                        onClick={() => setActiveLigneId(ligne.id)}
                                                        className="text-[10px] text-[#04326D] font-bold hover:underline"
                                                    >
                                                        + Joindre devis
                                                    </button>
                                                </div>
                                            </td>

                                            <td className="py-2.5 px-2 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveLigne(ligne.id)}
                                                    disabled={lignes.length === 1}
                                                    className="text-gray-300 hover:text-red-600 disabled:opacity-20 font-bold text-sm"
                                                >
                                                    &times;
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* 3. TOTAL & MONTANT EN TOUTES LETTRES */}
                    <div className="bg-[#0B192C] text-white rounded p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <span className="text-[10px] text-[#B2BED6] uppercase tracking-wider font-bold block mb-1">
                                Montant Total de la Réquisition :
                            </span>
                            <span className="text-3xl font-black">
                                {montantTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {devise}
                            </span>
                            <p className="text-xs italic text-gray-300 mt-1">
                                <strong>En lettres :</strong> {montantEnLettres}
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-[#F58F20] hover:bg-[#d97c18] disabled:opacity-50 text-white py-2.5 px-6 rounded font-bold text-xs uppercase tracking-wider shadow transition self-end md:self-auto"
                        >
                            {isSubmitting ? 'Transmission...' : 'Soumettre la Demande'}
                        </button>
                    </div>

                </form>

                {/* MODALE D'AJOUT DE DEVIS PROFORMA */}
                {activeLigneId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                        <div className="bg-white rounded border border-[#B2BED6] shadow-2xl max-w-sm w-full p-5 space-y-3">
                            <div className="flex items-center justify-between border-b pb-2">
                                <h3 className="text-xs font-bold text-[#0B192C] uppercase">
                                    Joindre Facture Proforma / Devis
                                </h3>
                                <button onClick={() => setActiveLigneId(null)} className="text-gray-400 hover:text-gray-600 font-bold text-base leading-none">
                                    &times;
                                </button>
                            </div>

                            <div className="space-y-2 text-xs">
                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">Description</label>
                                    <input
                                        type="text"
                                        placeholder="ex: Proforma Fournisseur ABC"
                                        value={justifDesc}
                                        onChange={(e) => setJustifDesc(e.target.value)}
                                        className="w-full border border-gray-300 rounded p-1.5 text-xs focus:outline-none"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block font-semibold text-gray-700 mb-1">Date</label>
                                        <input
                                            type="date"
                                            value={justifDate}
                                            onChange={(e) => setJustifDate(e.target.value)}
                                            className="w-full border border-gray-300 rounded p-1 text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="block font-semibold text-gray-700 mb-1">Montant estimé</label>
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            value={justifMontant}
                                            onChange={(e) => setJustifMontant(e.target.value)}
                                            className="w-full border border-gray-300 rounded p-1 text-xs"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">Fichier (PDF, Image)</label>
                                    <input
                                        type="file"
                                        onChange={(e) => setJustifFile(e.target.files ? e.target.files[0] : null)}
                                        className="w-full border border-dashed border-gray-300 rounded p-2 text-xs"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t">
                                <button
                                    type="button"
                                    onClick={() => setActiveLigneId(null)}
                                    className="px-3 py-1 border rounded text-xs text-gray-600"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleAttachJustificatif(activeLigneId)}
                                    className="px-3 py-1 bg-[#04326D] text-white rounded text-xs font-bold"
                                >
                                    Attacher
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}