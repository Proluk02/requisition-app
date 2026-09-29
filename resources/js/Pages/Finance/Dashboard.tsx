import { useState, useMemo } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { PageProps } from '@/types';
import {
    Wallet,
    ShieldCheck,
    AlertCircle,
    CheckCircle2,
    Clock,
    FileText,
    X,
    Paperclip,
    Download,
    Ban,
    Lock,
    KeyRound,
    Loader2,
    FolderKanban,
    User as UserIcon,
    ListFilter,
} from 'lucide-react';

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
    usersList = [],
}: Props) {
    const { auth } = usePage<PageProps>().props;
    const user = auth.user;

    const [requisitions, setRequisitions] = useState<FinanceRequisition[]>(initialRequisitions);

    const [activeTab, setActiveTab] = useState<'tous' | 'par_projet' | 'par_utilisateur'>('tous');
    const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
    const [selectedUserId, setSelectedUserId] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState('all');

    const [selected, setSelected] = useState<FinanceRequisition | null>(null);
    const [rejecting, setRejecting] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');

    const [passwordModalOpen, setPasswordModalOpen] = useState(false);
    const [passwordSaisi, setPasswordSaisi] = useState('');
    const [processing, setProcessing] = useState(false);
    const [toast, setToast] = useState<{
        type: 'success' | 'error';
        message: string;
    } | null>(null);

    const showToast = (type: 'success' | 'error', message: string) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 5000);
    };

    const filteredRequisitions = useMemo(() => {
        return requisitions.filter((item) => {
            if (statusFilter === 'pending' && !item.canDecide) return false;
            if (statusFilter === 'approved' && item.statusCode !== 'controle_finance') return false;
            if (statusFilter === 'returned' && !item.financeRejected) return false;

            if (activeTab === 'par_projet' && selectedProjectId !== 'all') {
                if (
                    item.project_id !== selectedProjectId &&
                    item.projet !== selectedProjectId
                )
                    return false;
            }

            if (activeTab === 'par_utilisateur' && selectedUserId !== 'all') {
                if (
                    item.user_id !== selectedUserId &&
                    item.initiateurNom !== selectedUserId
                )
                    return false;
            }

            return true;
        });
    }, [requisitions, statusFilter, activeTab, selectedProjectId, selectedUserId]);

    const handleTriggerApprove = () => {
        if (!selected) return;
        setPasswordSaisi('');
        setPasswordModalOpen(true);
    };

    const handleConfirmSignature = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selected || !passwordSaisi) return;

        setProcessing(true);

        router.patch(
            route('requisitions.finance-decision', selected.id),
            {
                decision: 'approve',
                password: passwordSaisi,
            },
            {
                preserveScroll: true,
                onFinish: () => setProcessing(false),
                onSuccess: () => {
                    const updatedId = selected.id;
                    setPasswordModalOpen(false);
                    setSelected(null);
                    setPasswordSaisi('');

                    setRequisitions((prev) =>
                        prev.map((item) => {
                            if (item.id === updatedId) {
                                return {
                                    ...item,
                                    statusCode: 'controle_finance',
                                    statusLabel: 'Validée par Finance',
                                    canDecide: false,
                                };
                            }
                            return item;
                        }),
                    );

                    showToast(
                        'success',
                        `Visa Financier apposé avec succès sur ${selected.numero}. Transmis à l'Administration.`,
                    );
                },
                onError: (errors) => {
                    showToast(
                        'error',
                        (errors as any).password ||
                            'Erreur lors de la signature financière.',
                    );
                },
            },
        );
    };

    const handleRejectFinance = () => {
        if (!selected || !rejectionReason.trim()) {
            showToast('error', 'Veuillez spécifier le motif du rejet financier.');
            return;
        }

        setProcessing(true);

        router.patch(
            route('requisitions.finance-decision', selected.id),
            {
                decision: 'reject',
                password: 'skip',
                motif_rejet: rejectionReason,
            },
            {
                preserveScroll: true,
                onFinish: () => setProcessing(false),
                onSuccess: () => {
                    const updatedId = selected.id;
                    setSelected(null);
                    setRejecting(false);
                    setRejectionReason('');

                    setRequisitions((prev) =>
                        prev.map((item) => {
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
                        }),
                    );

                    showToast(
                        'error',
                        `Réquisition ${selected.numero} renvoyée pour correction budgétaire.`,
                    );
                },
                onError: (errors) => {
                    showToast(
                        'error',
                        (errors as any).motif_rejet || 'Erreur lors du rejet.',
                    );
                },
            },
        );
    };

    const pendingCount = requisitions.filter((item) => item.canDecide).length;
    const approvedCount = requisitions.filter(
        (item) => item.statusCode === 'controle_finance',
    ).length;
    const returnedCount = requisitions.filter((item) => item.financeRejected).length;

    const tabClass = (tab: typeof activeTab) =>
        `inline-flex items-center gap-2 pb-3 px-3 border-b-2 text-xs font-semibold transition ${
            activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-on-surface'
        }`;

    const renderStatutBadge = (item: FinanceRequisition) => {
        let cls = 'bg-gray-100 text-gray-700';
        if (item.canDecide) cls = 'bg-tertiary-soft text-tertiary-dark';
        else if (item.statusCode === 'controle_finance')
            cls = 'bg-success-soft text-success-dark';
        else if (item.financeRejected) cls = 'bg-error-soft text-error-dark';
        return (
            <span className={`${cls} px-2.5 py-1 rounded-full text-[10px] font-bold`}>
                {item.statusLabel}
            </span>
        );
    };

    return (
        <AppLayout>
            <Head title="Direction Financière & Contrôle de Gestion" />

            <div className="space-y-6">
                {/* En-tête */}
                <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-outline-soft pb-5">
                    <div>
                        <p className="text-[10px] uppercase tracking-wider font-bold text-tertiary flex items-center gap-1.5">
                            <Wallet className="w-3 h-3" />
                            Direction Financière
                        </p>
                        <h1 className="text-xl font-bold text-on-surface mt-1">
                            Contrôle Budgétaire & Visa Financier
                        </h1>
                        <p className="text-xs text-gray-500 mt-1">
                            Financier :{' '}
                            <strong className="text-on-surface">{user.name}</strong> • Vérification
                            des soubassements et imputations.
                        </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-primary bg-primary-soft px-3 py-1.5 rounded-md border border-primary/15">
                        <FileText className="w-3 h-3" />
                        {requisitions.length} dossier(s) au total
                    </span>
                </header>

                {/* Toast */}
                {toast && (
                    <div
                        className={`p-3.5 rounded-md text-xs font-semibold flex justify-between items-center gap-3 border animate-slide-down ${
                            toast.type === 'success'
                                ? 'bg-success-soft text-success-dark border-success/30'
                                : 'bg-error-soft text-error-dark border-error/30'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            {toast.type === 'success' ? (
                                <CheckCircle2 className="w-4 h-4 shrink-0" />
                            ) : (
                                <AlertCircle className="w-4 h-4 shrink-0" />
                            )}
                            <span>{toast.message}</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setToast(null)}
                            className="text-[11px] underline hover:no-underline shrink-0"
                        >
                            Fermer
                        </button>
                    </div>
                )}

                {/* KPI */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white p-5 shadow-card border border-outline-soft rounded-lg border-l-4 border-l-tertiary hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">
                                En attente de Visa Finance
                            </p>
                            <div className="w-8 h-8 rounded-md bg-tertiary-soft flex items-center justify-center">
                                <Clock className="w-4 h-4 text-tertiary" />
                            </div>
                        </div>
                        <p className="text-2xl font-black text-tertiary">
                            {pendingCount}{' '}
                            <span className="text-base font-bold text-gray-500">
                                dossier(s)
                            </span>
                        </p>
                    </div>

                    <div className="bg-white p-5 shadow-card border border-outline-soft rounded-lg border-l-4 border-l-success hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">
                                Validées par Finance
                            </p>
                            <div className="w-8 h-8 rounded-md bg-success-soft flex items-center justify-center">
                                <CheckCircle2 className="w-4 h-4 text-success" />
                            </div>
                        </div>
                        <p className="text-2xl font-black text-success">
                            {approvedCount}{' '}
                            <span className="text-base font-bold text-gray-500">
                                dossier(s)
                            </span>
                        </p>
                    </div>

                    <div className="bg-white p-5 shadow-card border border-outline-soft rounded-lg border-l-4 border-l-error hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">
                                Renvoyées en correction
                            </p>
                            <div className="w-8 h-8 rounded-md bg-error-soft flex items-center justify-center">
                                <AlertCircle className="w-4 h-4 text-error" />
                            </div>
                        </div>
                        <p className="text-2xl font-black text-error">
                            {returnedCount}{' '}
                            <span className="text-base font-bold text-gray-500">
                                dossier(s)
                            </span>
                        </p>
                    </div>
                </div>

                {/* Onglets */}
                <div className="bg-white border border-outline-soft rounded-lg shadow-card overflow-hidden">
                    <div className="border-b border-outline-soft px-4 pt-3 flex flex-wrap items-center justify-between gap-3 bg-surface-muted">
                        <div className="flex gap-1">
                            <button
                                type="button"
                                onClick={() => setActiveTab('tous')}
                                className={tabClass('tous')}
                            >
                                <ListFilter className="w-3.5 h-3.5" />
                                Vue Générale
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('par_projet')}
                                className={tabClass('par_projet')}
                            >
                                <FolderKanban className="w-3.5 h-3.5" />
                                Par Projet
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('par_utilisateur')}
                                className={tabClass('par_utilisateur')}
                            >
                                <UserIcon className="w-3.5 h-3.5" />
                                Par Utilisateur
                            </button>
                        </div>

                        <div className="flex items-center gap-2 pb-2 text-xs">
                            <span className="text-gray-500 font-semibold">Statut :</span>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="border border-outline-variant rounded-md px-2.5 py-1.5 text-xs bg-white text-gray-700 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                            >
                                <option value="all">Tous les états</option>
                                <option value="pending">À valider uniquement</option>
                                <option value="approved">Validées Finance</option>
                                <option value="returned">Renvoyées en correction</option>
                            </select>
                        </div>
                    </div>

                    {activeTab === 'par_projet' && (
                        <div className="p-3.5 bg-primary-soft/60 border-b border-primary/15 flex flex-wrap items-center gap-3 text-xs">
                            <span className="font-bold text-primary flex items-center gap-1.5">
                                <FolderKanban className="w-3.5 h-3.5" />
                                Sélectionnez le Projet :
                            </span>
                            <select
                                value={selectedProjectId}
                                onChange={(e) => setSelectedProjectId(e.target.value)}
                                className="border border-primary rounded-md px-3 py-1.5 text-xs bg-white font-bold text-primary focus:outline-none focus:ring-1 focus:ring-primary/30 transition"
                            >
                                <option value="all">Tous les projets</option>
                                {projects.map((p) => (
                                    <option key={p.id} value={p.name}>
                                        {p.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {activeTab === 'par_utilisateur' && (
                        <div className="p-3.5 bg-primary-soft/60 border-b border-primary/15 flex flex-wrap items-center gap-3 text-xs">
                            <span className="font-bold text-primary flex items-center gap-1.5">
                                <UserIcon className="w-3.5 h-3.5" />
                                Sélectionnez le Demandeur :
                            </span>
                            <select
                                value={selectedUserId}
                                onChange={(e) => setSelectedUserId(e.target.value)}
                                className="border border-primary rounded-md px-3 py-1.5 text-xs bg-white font-bold text-primary focus:outline-none focus:ring-1 focus:ring-primary/30 transition"
                            >
                                <option value="all">Tous les utilisateurs</option>
                                {usersList.map((u) => (
                                    <option key={u.id} value={u.name}>
                                        {u.name} ({u.email})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Tableau */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-sidebar text-white uppercase text-[10px] font-bold tracking-wider">
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
                            <tbody className="divide-y divide-outline-soft text-gray-700">
                                {filteredRequisitions.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-12 text-center">
                                            <FileText
                                                className="w-10 h-10 mx-auto text-gray-300 mb-2"
                                                strokeWidth={1.5}
                                            />
                                            <p className="text-gray-500 font-medium text-sm">
                                                Aucune réquisition dans cette sélection
                                            </p>
                                            <p className="text-gray-400 text-[11px] mt-1">
                                                Modifiez les filtres ou l'onglet actif.
                                            </p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRequisitions.map((item) => (
                                        <tr
                                            key={item.id}
                                            className="hover:bg-primary-soft/40 transition-colors"
                                        >
                                            <td className="px-4 py-3.5 font-mono font-bold text-primary whitespace-nowrap">
                                                {item.numero}
                                            </td>
                                            <td className="px-4 py-3.5 whitespace-nowrap">
                                                <p className="font-semibold text-on-surface">
                                                    {item.initiateurNom}
                                                </p>
                                                <p className="text-[10px] text-gray-400">
                                                    {item.initiateurRole}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3.5 font-semibold text-gray-700">
                                                {item.projet}
                                            </td>
                                            <td
                                                className="px-4 py-3.5 max-w-xs truncate"
                                                title={item.observation || ''}
                                            >
                                                {item.observation ||
                                                    item.lignes
                                                        .map((l) => l.activite)
                                                        .join(', ')}
                                            </td>
                                            <td className="px-4 py-3.5 text-right font-mono font-bold whitespace-nowrap text-on-surface">
                                                {money(item.montantTotal, item.devise)}
                                            </td>
                                            <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                                {item.is_urgent ? (
                                                    <span className="bg-error-soft text-error-dark px-2 py-0.5 rounded font-black text-[9px] uppercase">
                                                        URGENT
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 text-[10px]">
                                                        Normal
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                                {renderStatutBadge(item)}
                                            </td>
                                            <td className="px-4 py-3.5 text-right whitespace-nowrap">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelected(item);
                                                        setRejecting(false);
                                                        setRejectionReason('');
                                                    }}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-light text-white rounded-md font-semibold text-xs shadow-sm transition"
                                                >
                                                    {item.canDecide ? (
                                                        <>
                                                            <ShieldCheck className="w-3 h-3" />
                                                            Examiner & Viser
                                                        </>
                                                    ) : (
                                                        <>
                                                            <FileText className="w-3 h-3" />
                                                            Consulter
                                                        </>
                                                    )}
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

            {/* MODALE CONTRÔLE BUDGÉTAIRE */}
            {selected && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white border border-outline-soft shadow-modal rounded-lg p-6 space-y-5 animate-slide-down">
                        <header className="flex items-start justify-between border-b border-outline-soft pb-3">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-lg bg-primary-soft flex items-center justify-center shrink-0">
                                    <Wallet className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <span className="text-[10px] uppercase font-bold text-tertiary tracking-wider">
                                        Contrôle Budgétaire & Visa Financier
                                    </span>
                                    <h2 className="text-base font-bold text-on-surface">
                                        Réquisition N° {selected.numero}{' '}
                                        <span className="text-xs font-normal text-gray-500">
                                            ({selected.nature})
                                        </span>
                                    </h2>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Initiée par{' '}
                                        <strong className="text-on-surface">
                                            {selected.initiateurNom}
                                        </strong>{' '}
                                        • Projet : {selected.projet} • Date :{' '}
                                        {selected.dateSoumission}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelected(null)}
                                className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition"
                                aria-label="Fermer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </header>

                        {selected.observation && (
                            <div className="p-3 bg-tertiary-soft border-l-4 border-tertiary text-xs text-gray-800 rounded-r-md">
                                <strong className="text-on-surface">
                                    Observation / Contexte :
                                </strong>{' '}
                                {selected.observation}
                            </div>
                        )}

                        {/* Tableau */}
                        <div>
                            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                                Articles & Devis Attachés (Vérification Soubassements)
                            </h3>
                            <table className="w-full text-left text-xs border border-outline-soft rounded-md overflow-hidden">
                                <thead className="bg-surface-muted font-bold text-gray-600">
                                    <tr>
                                        <th className="p-2">Désignation</th>
                                        <th className="p-2">Code Budget (MP)</th>
                                        <th className="p-2 text-right">Qté/Durée</th>
                                        <th className="p-2 text-right">Prix Unit.</th>
                                        <th className="p-2 text-right">Total</th>
                                        <th className="p-2">Pièces Jointes</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-outline-soft text-gray-700">
                                    {selected.lignes.map((line) => (
                                        <tr key={line.id}>
                                            <td className="p-2 font-medium">
                                                {line.activite}
                                            </td>
                                            <td className="p-2 font-mono font-bold text-primary">
                                                {line.codeAllocation ||
                                                    line.codeBudget ||
                                                    'Non attribué'}
                                            </td>
                                            <td className="p-2 text-right">
                                                {line.quantiteOuDuree} {line.unite}
                                            </td>
                                            <td className="p-2 text-right">
                                                {money(line.prixUnitaire, selected.devise)}
                                            </td>
                                            <td className="p-2 text-right font-bold">
                                                {money(line.total, selected.devise)}
                                            </td>
                                            <td className="p-2">
                                                {line.justificatifs.length > 0 ? (
                                                    <div className="space-y-1">
                                                        {line.justificatifs.map((f) => (
                                                            <div
                                                                key={f.id}
                                                                className="bg-primary-soft text-primary px-2 py-1 rounded-md text-[10px] flex items-center justify-between gap-1"
                                                            >
                                                                <span
                                                                    className="truncate max-w-[120px] flex items-center gap-1"
                                                                    title={f.description}
                                                                >
                                                                    <Paperclip className="w-2.5 h-2.5 shrink-0" />
                                                                    {f.nom}
                                                                </span>
                                                                {f.fileUrl && (
                                                                    <a
                                                                        href={f.fileUrl}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="inline-flex items-center gap-0.5 font-bold hover:underline"
                                                                    >
                                                                        <Download className="w-2.5 h-2.5" />
                                                                        Ouvrir
                                                                    </a>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 italic text-[10px]">
                                                        Aucun justificatif
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-surface-muted font-bold border-t border-outline-soft">
                                    <tr>
                                        <td colSpan={4} className="p-2 text-right">
                                            Montant Total Général :
                                        </td>
                                        <td className="p-2 text-right text-primary text-sm font-mono">
                                            {money(selected.montantTotal, selected.devise)}
                                        </td>
                                        <td />
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Décision */}
                        {selected.canDecide && (
                            <div className="border-t border-outline-soft pt-4 space-y-3">
                                {!rejecting ? (
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setRejecting(true)}
                                            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-error/40 text-error rounded-md text-xs font-semibold hover:bg-error-soft transition"
                                        >
                                            <Ban className="w-3.5 h-3.5" />
                                            Rejeter (problème budgétaire)
                                        </button>

                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setSelected(null)}
                                                className="px-3 py-2 border border-outline-variant rounded-md text-xs text-gray-600 hover:bg-gray-50 transition"
                                            >
                                                Fermer
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleTriggerApprove}
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-success hover:bg-success-dark text-white rounded-md text-xs font-semibold shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
                                            >
                                                <ShieldCheck className="w-4 h-4" />
                                                Accorder Visa Financier
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-error-soft p-4 rounded-md border border-error/20 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <h4 className="text-xs font-bold text-error-dark uppercase flex items-center gap-1.5">
                                                <AlertCircle className="w-3.5 h-3.5" />
                                                Motif du Rejet Financier (obligatoire)
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
                                            onChange={(e) =>
                                                setRejectionReason(e.target.value)
                                            }
                                            placeholder="Précisez le problème comptable (dépassement ligne budgétaire, prix unitaire excessif, pièces manquantes)…"
                                            className="w-full border border-error/30 rounded-md p-2.5 text-xs focus:outline-none focus:border-error focus:ring-1 focus:ring-error/20 bg-white transition"
                                            required
                                        />
                                        <div className="flex justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => setRejecting(false)}
                                                className="px-3 py-2 border border-outline-variant rounded-md text-xs bg-white text-gray-700 hover:bg-gray-50 transition"
                                            >
                                                Annuler
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleRejectFinance}
                                                disabled={processing}
                                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-error hover:bg-error-dark text-white rounded-md text-xs font-semibold shadow-sm transition disabled:opacity-60"
                                            >
                                                {processing && (
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                )}
                                                Confirmer le Rejet
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {!selected.canDecide && (
                            <footer className="flex justify-end border-t border-outline-soft pt-3">
                                <button
                                    type="button"
                                    onClick={() => setSelected(null)}
                                    className="px-4 py-2 bg-sidebar text-white text-xs font-semibold rounded-md hover:bg-primary transition"
                                >
                                    Fermer
                                </button>
                            </footer>
                        )}
                    </div>
                </div>
            )}

            {/* MODALE SIGNATURE ÉLECTRONIQUE */}
            {passwordModalOpen && selected && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-lg border-2 border-primary shadow-modal max-w-sm w-full p-6 space-y-4 animate-slide-down">
                        <div className="text-center border-b border-outline-soft pb-3">
                            <div className="w-12 h-12 mx-auto rounded-full bg-primary-soft flex items-center justify-center mb-2">
                                <Lock className="w-5 h-5 text-primary" />
                            </div>
                            <h3 className="text-sm font-black uppercase text-on-surface tracking-wider">
                                Visa de Contrôle Financier
                            </h3>
                            <p className="text-[11px] text-gray-500 mt-1">
                                Signataire :{' '}
                                <strong className="text-on-surface">{user.name}</strong> (Manager
                                des Finances)
                            </p>
                        </div>

                        <form onSubmit={handleConfirmSignature} className="space-y-3">
                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 mb-1.5">
                                    Saisissez votre mot de passe pour signer le visa :
                                </label>
                                <div className="relative">
                                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                    <input
                                        type="password"
                                        placeholder="••••••••"
                                        value={passwordSaisi}
                                        onChange={(e) => setPasswordSaisi(e.target.value)}
                                        className="w-full border border-outline-variant rounded-md p-2.5 pl-9 text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
                                        autoFocus
                                        required
                                    />
                                </div>
                            </div>

                            <p className="text-[10px] text-gray-400 leading-relaxed flex items-start gap-1.5">
                                <ShieldCheck className="w-3 h-3 shrink-0 mt-0.5" />
                                Cette signature électronique infalsifiable atteste de la
                                disponibilité des crédits budgétaires pour la réquisition{' '}
                                {selected.numero}.
                            </p>

                            <div className="flex justify-end gap-2 pt-2 border-t border-outline-soft">
                                <button
                                    type="button"
                                    onClick={() => setPasswordModalOpen(false)}
                                    className="px-3 py-2 border border-outline-variant rounded-md text-xs text-gray-600 hover:bg-gray-50 transition"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-success hover:bg-success-dark text-white font-semibold text-xs rounded-md shadow-sm transition disabled:opacity-50"
                                >
                                    {processing ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            Signature…
                                        </>
                                    ) : (
                                        <>
                                            <ShieldCheck className="w-3.5 h-3.5" />
                                            Signer & Valider
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}