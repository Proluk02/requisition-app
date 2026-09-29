import { useState, useMemo } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { PageProps } from '@/types';
import { numberToWordsFR } from '@/lib/numberToWords';
import {
    Plus,
    X,
    Paperclip,
    AlertTriangle,
    ChevronRight,
    Send,
    ShoppingCart,
    Wrench,
    FileText,
    Trash2,
} from 'lucide-react';

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
    'Local Fund 2',
];

export default function CreateRequisition() {
    const { auth } = usePage<PageProps>().props;
    const user = auth.user;
    const isCoordinator = user.role === 'coordinator';

    const [natureRequisition, setNatureRequisition] = useState<'Achat' | 'Service'>('Achat');
    const [isUrgent, setIsUrgent] = useState<boolean>(false);

    const userProjectName = user.project?.name || 'USIMAMIZI BORA';
    const [selectedProject, setSelectedProject] = useState<string>(userProjectName);

    const projectCode = useMemo(() => {
        const words = selectedProject.trim().split(/\s+/);
        return (
            words.length >= 2
                ? words[0][0] + words[1][0]
                : selectedProject.substring(0, 2)
        ).toUpperCase();
    }, [selectedProject]);

    const numeroRequisition = useMemo(() => {
        const mois = String(new Date().getMonth() + 1).padStart(2, '0');
        return `${projectCode}/${mois}/001`;
    }, [projectCode]);

    const [caisseDecaissement, setCaisseDecaissement] = useState<string>('Caisse principale');
    const [devise, setDevise] = useState<'USD' | 'FC' | 'EUR'>('USD');
    const [observation, setObservation] = useState<string>('');
    const [datePaiement, setDatePaiement] = useState<string>('');
    const [dateLivraison, setDateLivraison] = useState<string>('');

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
            justificatifs: [],
        },
    ]);

    const [isSubmitting, setIsSubmitting] = useState(false);

    const [activeLigneId, setActiveLigneId] = useState<string | null>(null);
    const [justifDesc, setJustifDesc] = useState('');
    const [justifDate, setJustifDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [justifMontant, setJustifMontant] = useState('');
    const [justifFile, setJustifFile] = useState<File | null>(null);

    const montantTotal = useMemo(() => {
        return lignes.reduce((acc, l) => acc + (Number(l.total_ligne) || 0), 0);
    }, [lignes]);

    const montantEnLettres = useMemo(() => {
        return numberToWordsFR(montantTotal, devise);
    }, [montantTotal, devise]);

    const handleNatureChange = (nature: 'Achat' | 'Service') => {
        setNatureRequisition(nature);
        setLignes(
            lignes.map((l) => {
                const qte = nature === 'Achat' ? l.quantite || 1 : 1;
                const duree = nature === 'Service' ? l.duree || 1 : 1;
                return {
                    ...l,
                    quantite: qte,
                    duree: duree,
                    unite: nature === 'Achat' ? 'Pce' : 'Jours',
                    total_ligne: qte * duree * l.frais_unitaire,
                };
            }),
        );
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
                justificatifs: [],
            },
        ]);
    };

    const handleRemoveLigne = (id: string) => {
        if (lignes.length === 1) return;
        setLignes(lignes.filter((l) => l.id !== id));
    };

    const handleUpdateLigne = (id: string, field: keyof LigneArticle, value: any) => {
        setLignes(
            lignes.map((l) => {
                if (l.id !== id) return l;
                const updated = { ...l, [field]: value };
                const qte =
                    natureRequisition === 'Achat'
                        ? field === 'quantite'
                            ? Number(value)
                            : l.quantite
                        : 1;
                const duree =
                    natureRequisition === 'Service'
                        ? field === 'duree'
                            ? Number(value)
                            : l.duree
                        : 1;
                const pu = field === 'frais_unitaire' ? Number(value) : l.frais_unitaire;
                updated.quantite = qte;
                updated.duree = duree;
                updated.frais_unitaire = pu;
                updated.total_ligne = qte * duree * pu;
                return updated;
            }),
        );
    };

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
            file: justifFile,
        };

        setLignes(
            lignes.map((l) => {
                if (l.id === ligneId) {
                    return { ...l, justificatifs: [...l.justificatifs, newJustif] };
                }
                return l;
            }),
        );

        setJustifDesc('');
        setJustifMontant('');
        setJustifFile(null);
        setActiveLigneId(null);
    };

    const handleRemoveJustificatif = (ligneId: string, justifId: string) => {
        setLignes(
            lignes.map((l) => {
                if (l.id === ligneId) {
                    return {
                        ...l,
                        justificatifs: l.justificatifs.filter((j) => j.id !== justifId),
                    };
                }
                return l;
            }),
        );
    };

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
            formData.append(
                `lignes[${index}][code_all_budget]`,
                ligne.code_all_budget || 'A_ATTRIBUER_PAR_MP',
            );
            formData.append(`lignes[${index}][nature]`, ligne.nature || natureRequisition);
            formData.append(`lignes[${index}][quantite]`, String(ligne.quantite));
            formData.append(`lignes[${index}][duree]`, String(ligne.duree));
            formData.append(`lignes[${index}][unite]`, ligne.unite);
            formData.append(`lignes[${index}][frais_unitaire]`, String(ligne.frais_unitaire));
            formData.append(`lignes[${index}][total_ligne]`, String(ligne.total_ligne));

            ligne.justificatifs.forEach((justif, jIndex) => {
                formData.append(
                    `lignes[${index}][justificatifs][${jIndex}][description]`,
                    justif.description,
                );
                formData.append(
                    `lignes[${index}][justificatifs][${jIndex}][date]`,
                    justif.date,
                );
                formData.append(
                    `lignes[${index}][justificatifs][${jIndex}][montant]`,
                    String(justif.montant),
                );
                if (justif.file) {
                    formData.append(`lignes[${index}][justificatifs][${jIndex}][file]`, justif.file);
                }
            });
        });

        router.post(route('requisitions.store'), formData, {
            onFinish: () => setIsSubmitting(false),
            onError: (errors) => {
                alert('Erreur de validation : ' + Object.values(errors).join(', '));
            },
        });
    };

    return (
        <AppLayout>
            <Head title={`Créer Réquisition — ${numeroRequisition}`} />

            <div className="space-y-6">
                {/* En-tête */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-soft pb-5">
                    <div>
                        <nav className="text-[11px] text-gray-500 font-medium mb-1 flex items-center gap-1">
                            <Link href={route('dashboard')} className="hover:text-primary transition">
                                Dashboard
                            </Link>
                            <ChevronRight className="w-3 h-3" />
                            <span className="text-on-surface font-bold">Expression de Besoin</span>
                        </nav>
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-xl font-bold text-on-surface flex items-center gap-2">
                                {natureRequisition === 'Achat' ? (
                                    <ShoppingCart className="w-5 h-5 text-primary" />
                                ) : (
                                    <Wrench className="w-5 h-5 text-tertiary" />
                                )}
                                {natureRequisition === 'Achat'
                                    ? "Réquisition d'Achat"
                                    : 'Réquisition de Services'}
                            </h1>
                            <span className="bg-sidebar text-tertiary px-3 py-0.5 rounded-md font-mono font-bold text-xs">
                                N° {numeroRequisition}
                            </span>
                            {isUrgent && (
                                <span className="bg-error text-white px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider animate-pulse">
                                    Circuit Urgent
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link
                            href={route('dashboard')}
                            className="px-3.5 py-2 border border-outline-variant text-gray-700 bg-white hover:bg-gray-50 rounded-md text-xs font-semibold transition"
                        >
                            Annuler
                        </Link>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-light disabled:opacity-50 text-white rounded-md text-xs font-semibold shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
                        >
                            <Send className="w-3.5 h-3.5" />
                            {isSubmitting ? 'Transmission…' : 'Soumettre au Manager'}
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* 1. Paramètres */}
                    <div className="bg-white border border-outline-soft rounded-lg p-5 shadow-card space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-outline-soft pb-3 gap-2">
                            <h2 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                                    I
                                </span>
                                Paramètres de la Demande
                            </h2>

                            <label className="inline-flex items-center gap-2 cursor-pointer bg-error-soft border border-error/20 px-3 py-1.5 rounded-md hover:bg-error-soft/80 transition">
                                <input
                                    type="checkbox"
                                    checked={isUrgent}
                                    onChange={(e) => setIsUrgent(e.target.checked)}
                                    className="rounded border-error text-error focus:ring-error w-4 h-4"
                                />
                                <span className="text-xs font-bold text-error-dark flex items-center gap-1">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    Déclarer comme urgente
                                </span>
                            </label>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                            <div>
                                <label className="block font-semibold text-gray-700 mb-1.5">
                                    Nature de la Réquisition
                                </label>
                                <select
                                    value={natureRequisition}
                                    onChange={(e) =>
                                        handleNatureChange(e.target.value as 'Achat' | 'Service')
                                    }
                                    className="w-full border border-primary rounded-md p-2 text-xs font-semibold text-primary bg-primary-soft/50 focus:outline-none focus:ring-1 focus:ring-primary/30 transition"
                                >
                                    <option value="Achat">Achat </option>
                                    <option value="Service">Service</option>
                                </select>
                            </div>

                            <div>
                                <label className="block font-semibold text-gray-700 mb-1.5">
                                    Projet
                                </label>
                                {isCoordinator ? (
                                    <select
                                        value={selectedProject}
                                        onChange={(e) => setSelectedProject(e.target.value)}
                                        className="w-full border border-outline-variant rounded-md p-2 text-xs font-semibold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
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
                                        className="w-full bg-surface-muted border border-outline-variant rounded-md p-2 text-xs text-gray-700 font-bold cursor-not-allowed"
                                    />
                                )}
                            </div>

                            <div>
                                <label className="block font-semibold text-gray-700 mb-1.5">
                                    Caisse de Décaissement
                                </label>
                                <select
                                    value={caisseDecaissement}
                                    onChange={(e) => setCaisseDecaissement(e.target.value)}
                                    className="w-full border border-outline-variant rounded-md p-2 text-xs font-bold text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                                >
                                    {CAISSES_DISPONIBLES.map((c) => (
                                        <option key={c} value={c}>
                                            {c}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block font-semibold text-gray-700 mb-1.5">
                                    Devise
                                </label>
                                <select
                                    value={devise}
                                    onChange={(e) => setDevise(e.target.value as any)}
                                    className="w-full border border-outline-variant rounded-md p-2 text-xs font-bold text-primary focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                                >
                                    <option value="USD">USD ($ — Dollar Américain)</option>
                                    <option value="FC">FC (CDF — Franc Congolais)</option>
                                    <option value="EUR">EUR (€ — Euro)</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
                            {natureRequisition === 'Achat' ? (
                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1.5">
                                        À livrer le (échéance de livraison)
                                    </label>
                                    <input
                                        type="date"
                                        value={dateLivraison}
                                        onChange={(e) => setDateLivraison(e.target.value)}
                                        className="w-full border border-outline-variant rounded-md p-2 text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                                    />
                                </div>
                            ) : (
                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1.5">
                                        Date de paiement souhaitée
                                    </label>
                                    <input
                                        type="date"
                                        value={datePaiement}
                                        onChange={(e) => setDatePaiement(e.target.value)}
                                        className="w-full border border-outline-variant rounded-md p-2 text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block font-semibold text-gray-700 mb-1.5">
                                    Observation / Contexte
                                </label>
                                <input
                                    type="text"
                                    value={observation}
                                    onChange={(e) => setObservation(e.target.value)}
                                    placeholder="Précisez le contexte, l'urgence ou la justification…"
                                    className="w-full border border-outline-variant rounded-md p-2 text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                                />
                            </div>
                        </div>
                    </div>

                    {/* 2. Lignes */}
                    <div className="bg-white border border-outline-soft rounded-lg shadow-card overflow-hidden">
                        <div className="p-4 bg-sidebar text-white flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <h2 className="text-xs font-bold uppercase tracking-wider">
                                    Lignes d'Articles ou Prestations ({natureRequisition})
                                </h2>
                                <span className="bg-primary text-white text-[10px] font-mono px-2 py-0.5 rounded-md">
                                    {lignes.length} ligne(s)
                                </span>
                            </div>

                            <button
                                type="button"
                                onClick={handleAddLigne}
                                className="inline-flex items-center gap-1.5 bg-primary hover:bg-primary-light text-white text-xs font-semibold px-3 py-1.5 rounded-md transition"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Ajouter une ligne</span>
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-surface-muted text-gray-600 uppercase text-[10px] font-bold border-b border-outline-soft">
                                        <th className="py-2.5 px-3 w-10 text-center">N°</th>
                                        <th className="py-2.5 px-3 min-w-[240px]">
                                            {natureRequisition === 'Achat'
                                                ? "Description de l'article"
                                                : 'Nature du service'}
                                        </th>
                                        <th className="py-2.5 px-3 w-36 text-center text-gray-400">
                                            Code Budget
                                            <span className="text-[9px] block font-normal normal-case">
                                                (Attribué par MP)
                                            </span>
                                        </th>

                                        {natureRequisition === 'Achat' ? (
                                            <th className="py-2.5 px-2 w-20 text-center bg-primary-soft text-primary">
                                                Qté
                                            </th>
                                        ) : (
                                            <th className="py-2.5 px-2 w-20 text-center bg-tertiary-soft text-tertiary">
                                                Durée
                                            </th>
                                        )}

                                        <th className="py-2.5 px-2 w-24">Unité</th>
                                        <th className="py-2.5 px-3 w-28 text-right">Prix Unit.</th>
                                        <th className="py-2.5 px-3 w-32 text-right">Total Ligne</th>
                                        <th className="py-2.5 px-3 w-40 text-center">
                                            Devis / Justificatifs
                                        </th>
                                        <th className="py-2.5 px-2 w-10 text-center" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-outline-soft">
                                    {lignes.map((ligne, idx) => (
                                        <tr key={ligne.id} className="hover:bg-primary-soft/30 transition-colors">
                                            <td className="py-2.5 px-3 text-center font-bold text-gray-400">
                                                {idx + 1}
                                            </td>

                                            <td className="py-2.5 px-3">
                                                <input
                                                    type="text"
                                                    placeholder={
                                                        natureRequisition === 'Achat'
                                                            ? "Désignation de l'article…"
                                                            : 'Description de la prestation…'
                                                    }
                                                    value={ligne.activite}
                                                    onChange={(e) =>
                                                        handleUpdateLigne(
                                                            ligne.id,
                                                            'activite',
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="w-full border border-outline-variant rounded-md px-2 py-1.5 text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                                                    required
                                                />
                                            </td>

                                            <td className="py-2.5 px-3 text-center">
                                                <span className="text-[10px] text-gray-400 italic">
                                                    Assigné au visa MP
                                                </span>
                                            </td>

                                            {natureRequisition === 'Achat' ? (
                                                <td className="py-2.5 px-2 bg-primary-soft/30">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={ligne.quantite}
                                                        onChange={(e) =>
                                                            handleUpdateLigne(
                                                                ligne.id,
                                                                'quantite',
                                                                Math.max(
                                                                    1,
                                                                    parseInt(e.target.value) || 0,
                                                                ),
                                                            )
                                                        }
                                                        className="w-full border border-primary/40 rounded-md px-1 py-1 text-xs text-center font-bold text-primary focus:outline-none focus:ring-1 focus:ring-primary/30 transition"
                                                    />
                                                </td>
                                            ) : (
                                                <td className="py-2.5 px-2 bg-tertiary-soft/40">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={ligne.duree}
                                                        onChange={(e) =>
                                                            handleUpdateLigne(
                                                                ligne.id,
                                                                'duree',
                                                                Math.max(
                                                                    1,
                                                                    parseInt(e.target.value) || 0,
                                                                ),
                                                            )
                                                        }
                                                        className="w-full border border-tertiary/40 rounded-md px-1 py-1 text-xs text-center font-bold text-tertiary focus:outline-none focus:ring-1 focus:ring-tertiary/30 transition"
                                                    />
                                                </td>
                                            )}

                                            <td className="py-2.5 px-2">
                                                <input
                                                    type="text"
                                                    placeholder={
                                                        natureRequisition === 'Achat'
                                                            ? 'Pce, Lot…'
                                                            : 'Jours, Mois…'
                                                    }
                                                    value={ligne.unite}
                                                    onChange={(e) =>
                                                        handleUpdateLigne(
                                                            ligne.id,
                                                            'unite',
                                                            e.target.value,
                                                        )
                                                    }
                                                    className="w-full border border-outline-variant rounded-md px-1 py-1 text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                                                />
                                            </td>

                                            <td className="py-2.5 px-3 text-right">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={ligne.frais_unitaire}
                                                    onChange={(e) =>
                                                        handleUpdateLigne(
                                                            ligne.id,
                                                            'frais_unitaire',
                                                            parseFloat(e.target.value) || 0,
                                                        )
                                                    }
                                                    className="w-full border border-outline-variant rounded-md px-1 py-1 text-xs text-right font-semibold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                                                />
                                            </td>

                                            <td className="py-2.5 px-3 text-right font-bold text-on-surface whitespace-nowrap">
                                                {ligne.total_ligne.toLocaleString('fr-FR', {
                                                    minimumFractionDigits: 2,
                                                })}{' '}
                                                {devise}
                                            </td>

                                            <td className="py-2.5 px-3 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    {ligne.justificatifs.map((j) => (
                                                        <div
                                                            key={j.id}
                                                            className="flex items-center justify-between bg-primary-soft text-primary px-1.5 py-0.5 rounded-md text-[10px] w-full"
                                                        >
                                                            <span
                                                                className="truncate max-w-[100px] flex items-center gap-1"
                                                                title={j.description}
                                                            >
                                                                <Paperclip className="w-2.5 h-2.5 shrink-0" />
                                                                {j.file ? j.file.name : j.description}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleRemoveJustificatif(ligne.id, j.id)
                                                                }
                                                                className="text-error font-bold ml-1 hover:text-error-dark transition"
                                                                aria-label="Retirer"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    ))}

                                                    <button
                                                        type="button"
                                                        onClick={() => setActiveLigneId(ligne.id)}
                                                        className="text-[10px] text-primary font-semibold hover:underline inline-flex items-center gap-0.5"
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                        Joindre devis
                                                    </button>
                                                </div>
                                            </td>

                                            <td className="py-2.5 px-2 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveLigne(ligne.id)}
                                                    disabled={lignes.length === 1}
                                                    className="text-gray-300 hover:text-error disabled:opacity-20 transition"
                                                    aria-label="Supprimer la ligne"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* 3. Total */}
                    <div className="bg-sidebar text-white rounded-lg p-5 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <span className="text-[10px] text-[#B2BED6] uppercase tracking-wider font-bold block mb-1.5">
                                Montant Total de la Réquisition
                            </span>
                            <span className="text-3xl font-black">
                                {montantTotal.toLocaleString('fr-FR', {
                                    minimumFractionDigits: 2,
                                })}{' '}
                                {devise}
                            </span>
                            <p className="text-xs italic text-gray-300 mt-1.5 max-w-2xl">
                                <strong className="not-italic">En lettres :</strong>{' '}
                                {montantEnLettres}
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="inline-flex items-center gap-2 bg-tertiary hover:bg-tertiary-dark disabled:opacity-50 text-white py-3 px-6 rounded-md font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all active:scale-[0.98] self-end md:self-auto"
                        >
                            <Send className="w-4 h-4" />
                            {isSubmitting ? 'Transmission…' : 'Soumettre la Demande'}
                        </button>
                    </div>
                </form>

                {/* MODALE DEVIS */}
                {activeLigneId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                        <div className="bg-white rounded-lg border border-outline-soft shadow-modal max-w-sm w-full p-5 space-y-3 animate-slide-down">
                            <div className="flex items-center justify-between border-b border-outline-soft pb-2.5">
                                <h3 className="text-xs font-bold text-on-surface uppercase flex items-center gap-2">
                                    <FileText className="w-3.5 h-3.5 text-primary" />
                                    Joindre Facture Proforma / Devis
                                </h3>
                                <button
                                    onClick={() => setActiveLigneId(null)}
                                    className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition"
                                    aria-label="Fermer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="space-y-2.5 text-xs">
                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">
                                        Description
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="ex : Proforma Fournisseur ABC"
                                        value={justifDesc}
                                        onChange={(e) => setJustifDesc(e.target.value)}
                                        className="w-full border border-outline-variant rounded-md p-2 text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block font-semibold text-gray-700 mb-1">
                                            Date
                                        </label>
                                        <input
                                            type="date"
                                            value={justifDate}
                                            onChange={(e) => setJustifDate(e.target.value)}
                                            className="w-full border border-outline-variant rounded-md p-2 text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                                        />
                                    </div>
                                    <div>
                                        <label className="block font-semibold text-gray-700 mb-1">
                                            Montant estimé
                                        </label>
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            value={justifMontant}
                                            onChange={(e) => setJustifMontant(e.target.value)}
                                            className="w-full border border-outline-variant rounded-md p-2 text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block font-semibold text-gray-700 mb-1">
                                        Fichier (PDF, Image)
                                    </label>
                                    <input
                                        type="file"
                                        onChange={(e) =>
                                            setJustifFile(e.target.files ? e.target.files[0] : null)
                                        }
                                        className="w-full border border-dashed border-outline-variant rounded-md p-2 text-xs file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary-soft file:text-primary hover:file:bg-primary-soft/80 transition"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-outline-soft">
                                <button
                                    type="button"
                                    onClick={() => setActiveLigneId(null)}
                                    className="px-3 py-2 border border-outline-variant rounded-md text-xs text-gray-600 hover:bg-gray-50 transition"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleAttachJustificatif(activeLigneId)}
                                    className="px-3 py-2 bg-primary text-white rounded-md text-xs font-semibold hover:bg-primary-light transition"
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