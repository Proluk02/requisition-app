import { useState, useMemo } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { PageProps } from '@/types';
import { numberToWordsFR } from '@/lib/numberToWords';

interface JustificatifItem {
    id: string;
    date: string;
    description: string;
    montant: number;
    scanNom: string;
}

interface ArticleLigne {
    id: string;
    activite: string;
    codeAllBudget: string;
    nature: string;
    quantite: number;
    duree: number;
    unite: string;
    fraisUnitaire: number;
    totalLigne: number;
    justificatifs: JustificatifItem[];
}

function getProjectInitials(projectName: string | undefined): string {
    if (!projectName) return 'REQ';
    const words = projectName.trim().split(/\s+/);
    if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
    }
    return projectName.substring(0, 2).toUpperCase();
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

    // 1. Nature de la Réquisition : 2 choix stricts
    const [natureRequisition, setNatureRequisition] = useState<'Achat' | 'Service'>('Achat');

    // 2. Projet & Initiales
    const userProjectName = user.project?.name || 'USIMAMIZI BORA';
    const [selectedProject, setSelectedProject] = useState<string>(userProjectName);

    const projectCode = useMemo(() => {
        return getProjectInitials(selectedProject);
    }, [selectedProject]);

    // Numéro de Réquisition automatique
    const numeroRequisition = useMemo(() => {
        const mois = String(new Date().getMonth() + 1).padStart(2, '0');
        const increment = '001';
        return `${projectCode}/${mois}/${increment}`;
    }, [projectCode]);

    // 3. Caisse & Devises (USD, FC, EUR)
    const [caisseDecaissement, setCaisseDecaissement] = useState<string>('Caisse principale');
    const [devise, setDevise] = useState<'USD' | 'FC' | 'EUR'>('USD');
    const [observation, setObservation] = useState<string>('');

    // 4. Lignes d'articles
    const [lignes, setLignes] = useState<ArticleLigne[]>([
        {
            id: '1',
            activite: '',
            codeAllBudget: '',
            nature: '',
            quantite: 1,
            duree: 1,
            unite: 'Pce',
            fraisUnitaire: 0,
            totalLigne: 0,
            justificatifs: []
        }
    ]);

    // Modal Justificatifs
    const [activeLigneModal, setActiveLigneModal] = useState<string | null>(null);
    const [newJustifDesc, setNewJustifDesc] = useState('');
    const [newJustifDate, setNewJustifDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [newJustifMontant, setNewJustifMontant] = useState('');
    const [newJustifFile, setNewJustifFile] = useState<File | null>(null);

    // Calcul du Total
    const montantTotal = useMemo(() => {
        return lignes.reduce((acc, l) => acc + (Number(l.totalLigne) || 0), 0);
    }, [lignes]);

    const montantEnLettres = useMemo(() => {
        return numberToWordsFR(montantTotal, devise);
    }, [montantTotal, devise]);

    // Changement de la nature (Achat = Qté / Service = Durée)
    const handleNatureChange = (newNature: 'Achat' | 'Service') => {
        setNatureRequisition(newNature);
        setLignes(lignes.map(l => {
            const qte = newNature === 'Achat' ? (l.quantite || 1) : 1;
            const duree = newNature === 'Service' ? (l.duree || 1) : 1;
            return {
                ...l,
                quantite: qte,
                duree: duree,
                totalLigne: qte * duree * l.fraisUnitaire
            };
        }));
    };

    // Gestion des Lignes
    const handleAddLigne = () => {
        setLignes([
            ...lignes,
            {
                id: Date.now().toString(),
                activite: '',
                codeAllBudget: '',
                nature: '',
                quantite: 1,
                duree: 1,
                unite: natureRequisition === 'Achat' ? 'Pce' : 'Jours',
                fraisUnitaire: 0,
                totalLigne: 0,
                justificatifs: []
            }
        ]);
    };

    const handleRemoveLigne = (id: string) => {
        if (lignes.length === 1) return;
        setLignes(lignes.filter(l => l.id !== id));
    };

    const handleUpdateLigne = (id: string, field: keyof ArticleLigne, value: any) => {
        setLignes(lignes.map(l => {
            if (l.id !== id) return l;
            const updated = { ...l, [field]: value };

            const qte = natureRequisition === 'Achat' ? (field === 'quantite' ? Number(value) : l.quantite) : 1;
            const duree = natureRequisition === 'Service' ? (field === 'duree' ? Number(value) : l.duree) : 1;
            const pu = field === 'fraisUnitaire' ? Number(value) : l.fraisUnitaire;

            updated.quantite = qte;
            updated.duree = duree;
            updated.fraisUnitaire = pu;
            updated.totalLigne = qte * duree * pu;

            return updated;
        }));
    };

    // Justificatifs
    const handleAttachJustificatif = (ligneId: string) => {
        if (!newJustifDesc || !newJustifMontant) {
            alert('Veuillez spécifier la description et le montant.');
            return;
        }

        const justif: JustificatifItem = {
            id: Date.now().toString(),
            date: newJustifDate,
            description: newJustifDesc,
            montant: parseFloat(newJustifMontant),
            scanNom: newJustifFile ? newJustifFile.name : 'devis_proforma.pdf'
        };

        setLignes(lignes.map(l => {
            if (l.id === ligneId) {
                return { ...l, justificatifs: [...l.justificatifs, justif] };
            }
            return l;
        }));

        setNewJustifDesc('');
        setNewJustifMontant('');
        setNewJustifFile(null);
        setActiveLigneModal(null);
    };

    const handleRemoveJustificatif = (ligneId: string, justifId: string) => {
        setLignes(lignes.map(l => {
            if (l.id === ligneId) {
                return { ...l, justificatifs: l.justificatifs.filter(j => j.id !== justifId) };
            }
            return l;
        }));
    };

    // Soumission et retour au dashboard de l'acteur
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (montantTotal <= 0) {
            alert('Le montant total de la réquisition doit être supérieur à 0.');
            return;
        }

        alert(`Réquisition ${numeroRequisition} enregistrée avec succès ! Redirection vers votre tableau de bord.`);
        router.visit(route('dashboard'));
    };

    return (
        <AppLayout>
            <Head title={`Créer Réquisition - ${numeroRequisition}`} />

            {/* En-tête de page */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
                <div>
                    <nav className="text-[11px] text-gray-500 font-medium mb-1">
                        <Link href={route('dashboard')} className="hover:underline">Dashboard</Link>
                        <span className="mx-1.5">&rsaquo;</span>
                        <span className="text-[#0B192C] font-bold">Nouvelle Réquisition</span>
                    </nav>
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl font-bold text-[#0B192C]">
                            Expression du Besoin
                        </h1>
                        <span className="bg-[#0B192C] text-[#F58F20] px-3 py-0.5 rounded font-mono font-bold text-xs tracking-wider">
                            N° {numeroRequisition}
                        </span>
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
                        className="px-4 py-1.5 bg-[#04326D] hover:bg-[#06428f] text-white rounded text-xs font-bold shadow-sm"
                    >
                        Soumettre
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* 1. ENTÊTE DE LA RÉQUISITION */}
                <div className="bg-white border border-[#B2BED6] rounded p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                        <h2 className="text-xs font-bold text-[#0B192C] uppercase tracking-wider">
                            I. Paramètres de la Réquisition
                        </h2>
                        <span className="text-[11px] text-gray-500 font-mono">
                            Demandeur : <strong className="text-[#04326D]">{user.name}</strong> ({user.role?.replace('_', ' ')})
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                        {/* Nature de la Réquisition */}
                        <div>
                            <label className="block font-bold text-gray-700 mb-1">Nature de la Réquisition</label>
                            <select
                                value={natureRequisition}
                                onChange={(e) => handleNatureChange(e.target.value as 'Achat' | 'Service')}
                                className="w-full border border-[#04326D] rounded p-2 text-xs font-bold text-[#04326D] focus:outline-none bg-blue-50/50"
                            >
                                <option value="Achat">Réquisition d'Achat</option>
                                <option value="Service">Réquisition de Service</option>
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
                                    value={`${userProjectName} (${projectCode})`}
                                    disabled
                                    className="w-full bg-[#F9F9FF] border border-[#B2BED6] rounded p-2 text-xs text-gray-700 font-bold cursor-not-allowed"
                                />
                            )}
                        </div>

                        {/* Caisse de décaissement */}
                        <div>
                            <label className="block font-semibold text-gray-700 mb-1">Caisse de Décaissement</label>
                            <select
                                value={caisseDecaissement}
                                onChange={(e) => setCaisseDecaissement(e.target.value)}
                                className="w-full border border-[#B2BED6] rounded p-2 text-xs font-bold text-[#0B192C] focus:outline-none"
                            >
                                {CAISSES_DISPONIBLES.map((c, i) => (
                                    <option key={i} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>

                        {/* Devise */}
                        <div>
                            <label className="block font-semibold text-gray-700 mb-1">Devise de paiement</label>
                            <select
                                value={devise}
                                onChange={(e) => setDevise(e.target.value as 'USD' | 'FC' | 'EUR')}
                                className="w-full border border-[#B2BED6] rounded p-2 text-xs font-bold text-[#04326D] focus:outline-none"
                            >
                                <option value="USD">USD ($ - Dollar Américain)</option>
                                <option value="FC">FC (CDF - Franc Congolais)</option>
                                <option value="EUR">EUR (€ - Euro)</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* 2. TABLEAU DES LIGNES */}
                <div className="bg-white border border-[#B2BED6] rounded shadow-sm overflow-hidden">
                    <div className="p-3.5 bg-[#0B192C] text-white flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xs font-bold uppercase tracking-wider">
                                Lignes de la Demande ({natureRequisition.toUpperCase()})
                            </h2>
                            <span className="bg-[#04326D] text-white text-[10px] font-mono px-2 py-0.5 rounded">
                                {lignes.length} article(s)
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
                                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                                    <th className="py-2.5 px-3 min-w-[220px]">Activité / Désignation</th>
                                    <th className="py-2.5 px-3 w-32">Code All. Budget</th>
                                    <th className="py-2.5 px-2 w-28">Nature</th>
                                    
                                    {natureRequisition === 'Achat' ? (
                                        <th className="py-2.5 px-2 w-20 text-center bg-blue-50 text-[#04326D]">Qté</th>
                                    ) : (
                                        <th className="py-2.5 px-2 w-20 text-center bg-orange-50 text-[#F58F20]">Durée</th>
                                    )}

                                    <th className="py-2.5 px-2 w-24">Unité</th>
                                    <th className="py-2.5 px-3 w-32 text-right">Frais / Prix Unitaire</th>
                                    <th className="py-2.5 px-3 w-32 text-right">Total Ligne</th>
                                    <th className="py-2.5 px-3 w-36 text-center">Justificatifs (JSON)</th>
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
                                                placeholder={natureRequisition === 'Achat' ? "Nom de l'article à acheter..." : "Prestation de service à réaliser..."}
                                                value={ligne.activite}
                                                onChange={(e) => handleUpdateLigne(ligne.id, 'activite', e.target.value)}
                                                className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:border-[#04326D] focus:outline-none"
                                                required
                                            />
                                        </td>

                                        <td className="py-2.5 px-3">
                                            <input
                                                type="text"
                                                placeholder="ex: 2.1.04"
                                                value={ligne.codeAllBudget}
                                                onChange={(e) => handleUpdateLigne(ligne.id, 'codeAllBudget', e.target.value)}
                                                className="w-full border border-gray-300 rounded px-2 py-1 text-xs font-mono focus:outline-none"
                                                required
                                            />
                                        </td>

                                        <td className="py-2.5 px-2">
                                            <input
                                                type="text"
                                                placeholder="ex: Fourniture"
                                                value={ligne.nature}
                                                onChange={(e) => handleUpdateLigne(ligne.id, 'nature', e.target.value)}
                                                className="w-full border border-gray-300 rounded px-1.5 py-1 text-xs focus:outline-none"
                                            />
                                        </td>

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
                                                placeholder={natureRequisition === 'Achat' ? "Pce, Carton..." : "Jours, Mois..."}
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
                                                value={ligne.fraisUnitaire}
                                                onChange={(e) => handleUpdateLigne(ligne.id, 'fraisUnitaire', parseFloat(e.target.value) || 0)}
                                                className="w-full border border-gray-300 rounded px-1 text-xs text-right font-semibold focus:outline-none"
                                            />
                                        </td>

                                        <td className="py-2.5 px-3 text-right font-bold text-[#0B192C]">
                                            {ligne.totalLigne.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {devise}
                                        </td>

                                        <td className="py-2.5 px-3 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                {ligne.justificatifs.length > 0 ? (
                                                    <div className="space-y-0.5 w-full">
                                                        {ligne.justificatifs.map(j => (
                                                            <div key={j.id} className="flex items-center justify-between bg-blue-50 text-[#04326D] px-1.5 py-0.5 rounded text-[10px]">
                                                                <span className="truncate max-w-[80px]" title={j.description}>
                                                                    📎 {j.scanNom}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveJustificatif(ligne.id, j.id)}
                                                                    className="text-red-500 font-bold ml-1"
                                                                >
                                                                    &times;
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : null}

                                                <button
                                                    type="button"
                                                    onClick={() => setActiveLigneModal(ligne.id)}
                                                    className="text-[10px] text-[#04326D] font-bold hover:underline"
                                                >
                                                    + Scan/Devis
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

                {/* 3. TOTALISATION JUSQU'AUX MILLIARDS */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    <div className="lg:col-span-7 bg-white border border-[#B2BED6] rounded p-4 shadow-sm space-y-2">
                        <label className="block text-xs font-bold text-[#0B192C]">
                            Observation
                        </label>
                        <textarea
                            rows={3}
                            value={observation}
                            onChange={(e) => setObservation(e.target.value)}
                            placeholder="Observations facultatives relatives à l'expression de ce besoin..."
                            className="w-full border border-[#B2BED6] rounded p-2 text-xs focus:border-[#04326D] focus:outline-none"
                        ></textarea>
                    </div>

                    <div className="lg:col-span-5 bg-[#0B192C] text-white rounded p-5 shadow-sm space-y-3">
                        <div className="flex items-center justify-between border-b border-white/10 pb-2">
                            <span className="text-xs uppercase text-[#B2BED6] font-bold tracking-wider">Total Réquisition</span>
                            <span className="bg-[#04326D] text-white text-[10px] font-bold px-2 py-0.5 rounded font-mono">
                                {devise}
                            </span>
                        </div>

                        <div>
                            <span className="text-3xl font-black text-white">
                                {montantTotal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {devise}
                            </span>
                        </div>

                        <div className="bg-white/5 p-2.5 rounded border border-white/10">
                            <span className="text-[10px] text-[#F58F20] font-bold uppercase tracking-wider block mb-0.5">
                                Montant en lettres :
                            </span>
                            <p className="text-xs italic text-gray-200 leading-snug">
                                {montantEnLettres}
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={handleSubmit}
                            className="w-full bg-[#F58F20] hover:bg-[#d97c18] text-white py-2.5 rounded font-bold text-xs uppercase tracking-wider shadow transition"
                        >
                            Soumettre
                        </button>
                    </div>
                </div>

            </form>

            {/* MODALE JUSTIFICATIFS */}
            {activeLigneModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="bg-white rounded border border-[#B2BED6] shadow-2xl max-w-sm w-full p-5 space-y-3">
                        <div className="flex items-center justify-between border-b pb-2">
                            <h3 className="text-xs font-bold text-[#0B192C] uppercase">
                                Joindre Justificatif / Scan
                            </h3>
                            <button
                                onClick={() => setActiveLigneModal(null)}
                                className="text-gray-400 hover:text-gray-600 font-bold"
                            >
                                &times;
                            </button>
                        </div>

                        <div className="space-y-2 text-xs">
                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">Description</label>
                                <input
                                    type="text"
                                    placeholder="ex: Facture proforma Éts ABC"
                                    value={newJustifDesc}
                                    onChange={(e) => setNewJustifDesc(e.target.value)}
                                    className="w-full border border-gray-300 rounded p-1.5 text-xs focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">Date</label>
                                    <input
                                        type="date"
                                        value={newJustifDate}
                                        onChange={(e) => setNewJustifDate(e.target.value)}
                                        className="w-full border border-gray-300 rounded p-1 text-xs focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">Montant</label>
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        value={newJustifMontant}
                                        onChange={(e) => setNewJustifMontant(e.target.value)}
                                        className="w-full border border-gray-300 rounded p-1 text-xs focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold text-gray-700 mb-1">Scan / Fichier</label>
                                <input
                                    type="file"
                                    onChange={(e) => setNewJustifFile(e.target.files ? e.target.files[0] : null)}
                                    className="w-full border border-dashed border-gray-300 rounded p-2 text-xs"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t">
                            <button
                                type="button"
                                onClick={() => setActiveLigneModal(null)}
                                className="px-3 py-1 border rounded text-xs text-gray-600 hover:bg-gray-50"
                            >
                                Annuler
                            </button>
                            <button
                                type="button"
                                onClick={() => handleAttachJustificatif(activeLigneModal)}
                                className="px-3 py-1 bg-[#04326D] text-white rounded text-xs font-bold hover:bg-[#06428f]"
                            >
                                Attacher
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}