import { useState, useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import StaffLayout from '@/Layouts/StaffLayout';

interface MouvementCourse {
    id: string;
    ordre: number;
    date: string;
    itineraire: string;
    motif: string;
    montantFC: number;
}

interface RequisitionTransportRef {
    id: string;
    code: string;
    dateCreation: string;
    projet: string;
    montantAlloueFC: number;
    statut: 'attente_mp' | 'valide_mp' | 'decaisse';
    managerProjetNom: string;
    dateVisaMP?: string;
    mouvements: MouvementCourse[];
}

const MOCK_REQUISITIONS_TRANSPORT: RequisitionTransportRef[] = [
    {
        id: 'trp-01',
        code: 'UB/09/TRP-001',
        dateCreation: '10/09/2026',
        projet: 'USIMAMIZI BORA (Kanina)',
        montantAlloueFC: 50000,
        statut: 'valide_mp',
        managerProjetNom: 'Jean-Paul Ilunga',
        dateVisaMP: '10/09/2026 à 11:30',
        mouvements: [
            {
                id: 'm1',
                ordre: 1,
                date: '2026-09-10',
                itineraire: 'BP - Centre-ville - BP',
                motif: 'Pyt de transport A/R pour la sensibilisation sur le mariage précoce',
                montantFC: 5000
            },
            {
                id: 'm2',
                ordre: 2,
                date: '2026-09-11',
                itineraire: 'BP - Site Minier Kasulo - BP',
                motif: 'Visite des ménages et identification des enfants déscolarisés',
                montantFC: 8000
            }
        ]
    },
    {
        id: 'trp-02',
        code: 'UB/09/TRP-002',
        dateCreation: '14/09/2026',
        projet: 'USIMAMIZI BORA (Kanina)',
        montantAlloueFC: 35000,
        statut: 'decaisse',
        managerProjetNom: 'Jean-Paul Ilunga',
        dateVisaMP: '14/09/2026 à 09:15',
        mouvements: []
    },
    {
        id: 'trp-03',
        code: 'UB/09/TRP-003',
        dateCreation: '17/09/2026',
        projet: 'USIMAMIZI BORA (Kanina)',
        montantAlloueFC: 25000,
        statut: 'attente_mp',
        managerProjetNom: 'Jean-Paul Ilunga',
        mouvements: []
    }
];

export default function TransportIndex() {
    const [requisitionsList, setRequisitionsList] = useState<RequisitionTransportRef[]>(MOCK_REQUISITIONS_TRANSPORT);
    const [selectedReqId, setSelectedReqId] = useState<string>('trp-01');

    const selectedReq = useMemo(() => {
        return requisitionsList.find(r => r.id === selectedReqId) || null;
    }, [requisitionsList, selectedReqId]);

    const isValideParMP = selectedReq?.statut === 'valide_mp' || selectedReq?.statut === 'decaisse';

    const [dateCourse, setDateCourse] = useState(() => new Date().toISOString().split('T')[0]);
    const [itineraire, setItineraire] = useState('');
    const [motif, setMotif] = useState('');
    const [montantFC, setMontantFC] = useState('');

    const totalDepenseFC = useMemo(() => {
        if (!selectedReq) return 0;
        return selectedReq.mouvements.reduce((acc, m) => acc + (Number(m.montantFC) || 0), 0);
    }, [selectedReq]);

    const soldeRestantFC = useMemo(() => {
        if (!selectedReq) return 0;
        return selectedReq.montantAlloueFC - totalDepenseFC;
    }, [selectedReq, totalDepenseFC]);

    const handleAddMouvement = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedReq) return;

        if (!isValideParMP) {
            alert("Action impossible : Cette réquisition n'a pas encore été validée par votre Manager de Projet.");
            return;
        }

        if (!itineraire || !motif || !montantFC) {
            alert('Veuillez remplir tous les champs de la course.');
            return;
        }

        const montant = parseFloat(montantFC);
        if (montant > soldeRestantFC) {
            if (!confirm(`Attention : Cette dépense (${montant.toLocaleString()} FC) dépasse le solde restant disponible (${soldeRestantFC.toLocaleString()} FC). Voulez-vous continuer ?`)) {
                return;
            }
        }

        const nextOrdre = selectedReq.mouvements.length > 0 
            ? Math.max(...selectedReq.mouvements.map(m => m.ordre)) + 1 
            : 1;

        const nouveau: MouvementCourse = {
            id: Date.now().toString(),
            ordre: nextOrdre,
            date: dateCourse,
            itineraire: itineraire,
            motif: motif,
            montantFC: montant
        };

        const updatedList = requisitionsList.map(r => {
            if (r.id === selectedReq.id) {
                return {
                    ...r,
                    mouvements: [...r.mouvements, nouveau]
                };
            }
            return r;
        });

        setRequisitionsList(updatedList);
        setItineraire('');
        setMotif('');
        setMontantFC('');
    };

    const handleDeleteMouvement = (mouvementId: string) => {
        if (!selectedReq) return;
        if (confirm('Confirmez-vous la suppression de cette ligne de déplacement ?')) {
            const updatedList = requisitionsList.map(r => {
                if (r.id === selectedReq.id) {
                    return {
                        ...r,
                        mouvements: r.mouvements.filter(m => m.id !== mouvementId)
                    };
                }
                return r;
            });
            setRequisitionsList(updatedList);
        }
    };

    const handlePrint = () => {
        if (!isValideParMP) {
            alert("Impression bloquée : Le relevé de déplacement ne peut être imprimé que si la réquisition est préalablement validée par le Manager de Projet.");
            return;
        }
        window.print();
    };

    return (
        <StaffLayout>
            <Head title="Cahier des Mouvements & Décharges Transport" />

            <style>{`
                @media print {
                    nav, aside, header, .no-print-area, button, select {
                        display: none !important;
                    }
                    #releve-transport-print {
                        display: block !important;
                        position: fixed;
                        left: 0;
                        top: 0;
                        width: 100vw;
                        padding: 30px;
                        background: white;
                        color: black;
                        font-family: 'Inter', serif;
                        z-index: 999999;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
                @media screen {
                    #releve-transport-print {
                        display: none;
                    }
                }
            `}</style>

            <div className="space-y-6 no-print-area">
                {/* 1. EN-TÊTE DE LA PAGE */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
                    <div>
                        <nav className="text-[11px] text-gray-500 font-medium mb-1 flex items-center gap-1">
                            <Link href={route('dashboard')} className="hover:underline">Dashboard</Link>
                            <span>&rsaquo;</span>
                            <span className="text-[#0B192C] font-bold">Transport Terrain</span>
                        </nav>
                        <h1 className="text-xl font-bold text-[#0B192C]">
                            Relevé des Déplacements & Mouvements
                        </h1>
                        <p className="text-xs text-gray-500">
                            Sélectionnez une réquisition de transport pour justifier vos courses et apurer vos avances.
                        </p>
                    </div>

                    {/* BOUTON D'IMPRESSION CONDITIONNEL AVEC VRAIS ICÔNES */}
                    <div className="flex items-center gap-2">
                        {isValideParMP ? (
                            <button
                                type="button"
                                onClick={handlePrint}
                                className="px-4 py-2 bg-[#04326D] hover:bg-[#06428f] text-white text-xs font-bold rounded flex items-center gap-2 shadow-sm transition"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                                <span>Imprimer Relevé des Déplacements</span>
                            </button>
                        ) : (
                            <div className="px-3 py-2 bg-gray-100 border border-gray-300 text-gray-400 text-xs font-semibold rounded flex items-center gap-2 cursor-not-allowed">
                                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                <span>Impression Verrouillée (Visa MP requis)</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. SÉLECTEUR DE RÉQUISITION DE TRANSPORT */}
                <div className="bg-white border border-[#B2BED6] rounded p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-[#0B192C] mb-1 uppercase tracking-wider">
                            1. Réquisition de Transport active :
                        </label>
                        <select
                            value={selectedReqId}
                            onChange={(e) => setSelectedReqId(e.target.value)}
                            className="w-full md:max-w-md border border-[#04326D] rounded p-2 text-xs font-bold text-[#04326D] bg-blue-50/40 focus:outline-none"
                        >
                            {requisitionsList.map(req => (
                                <option key={req.id} value={req.id}>
                                    {req.code} — {req.projet} ({req.montantAlloueFC.toLocaleString()} FC) - [{req.statut === 'valide_mp' || req.statut === 'decaisse' ? 'VALIDÉ MP' : 'EN ATTENTE VISA MP'}]
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* État d'approbation */}
                    <div className="flex items-center gap-3">
                        {selectedReq && (
                            <div className="text-right">
                                <span className="text-[10px] text-gray-500 block">État approbation :</span>
                                {isValideParMP ? (
                                    <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-[#065F46] font-bold text-xs px-2.5 py-1 rounded-full">
                                        <svg className="w-3.5 h-3.5 text-[#10B981]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Visa Accordé par {selectedReq.managerProjetNom}
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 bg-amber-100 text-[#92400E] font-bold text-xs px-2.5 py-1 rounded-full">
                                        <svg className="w-3.5 h-3.5 text-[#F58F20]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        En attente validation Manager Projet
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. BENTO CARTES : DÉCAISSEMENT, COURSES & RELIQUAT */}
                {selectedReq && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white border border-[#B2BED6] rounded p-4 shadow-sm">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Avance Décaissée</span>
                            <p className="text-2xl font-mono font-bold text-[#04326D] mt-1">
                                {selectedReq.montantAlloueFC.toLocaleString('fr-FR')} FC
                            </p>
                            <p className="text-[11px] text-gray-500 mt-1">
                                Réquisition N° {selectedReq.code} • {selectedReq.projet}
                            </p>
                        </div>

                        <div className="bg-white border border-[#B2BED6] rounded p-4 shadow-sm">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Courses Justifiées</span>
                            <p className="text-2xl font-mono font-bold text-[#0B192C] mt-1">
                                {totalDepenseFC.toLocaleString('fr-FR')} FC
                            </p>
                            <p className="text-[11px] text-gray-500 mt-1">
                                {selectedReq.mouvements.length} déplacement(s) enregistré(s)
                            </p>
                        </div>

                        <div className="bg-[#0B192C] text-white rounded p-4 shadow-sm flex flex-col justify-between">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-[#B2BED6] uppercase tracking-wider">Reliquat / Solde à Restituer</span>
                                <span className="text-xs font-mono font-bold text-[#F58F20]">FC</span>
                            </div>
                            <div>
                                <p className="text-2xl font-black mt-1">
                                    {soldeRestantFC.toLocaleString('fr-FR')} FC
                                </p>
                                <p className="text-[10px] text-gray-300 mt-1">
                                    {soldeRestantFC === 0 
                                        ? 'Enveloppe totalement apurée' 
                                        : soldeRestantFC > 0 
                                            ? 'Montant à rembourser à la caisse' 
                                            : 'Dépassement budgétaire'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. FORMULAIRE D'ENREGISTREMENT DE COURSE */}
                {selectedReq && (
                    <div className="bg-white border border-[#B2BED6] rounded p-5 shadow-sm space-y-3">
                        <div className="flex items-center justify-between border-b pb-2">
                            <h2 className="text-xs font-bold text-[#0B192C] uppercase tracking-wider">
                                2. Enregistrer un déplacement sur {selectedReq.code}
                            </h2>
                            {!isValideParMP && (
                                <span className="text-xs font-bold text-[#DC2626] flex items-center gap-1">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                    Saisie désactivée : Visa Manager de Projet manquant
                                </span>
                            )}
                        </div>

                        {isValideParMP ? (
                            <form onSubmit={handleAddMouvement} className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
                                <div className="md:col-span-2">
                                    <label className="block font-semibold text-gray-700 mb-1">Date du transport</label>
                                    <input
                                        type="date"
                                        value={dateCourse}
                                        onChange={(e) => setDateCourse(e.target.value)}
                                        className="w-full border border-gray-300 rounded p-1.5 text-xs focus:outline-none focus:border-[#04326D]"
                                        required
                                    />
                                </div>

                                <div className="md:col-span-4">
                                    <label className="block font-semibold text-gray-700 mb-1">Itinéraire (Provenance - Destination)</label>
                                    <input
                                        type="text"
                                        placeholder="ex: BP - Centre-ville - BP"
                                        value={itineraire}
                                        onChange={(e) => setItineraire(e.target.value)}
                                        className="w-full border border-gray-300 rounded p-1.5 text-xs focus:outline-none focus:border-[#04326D]"
                                        required
                                    />
                                </div>

                                <div className="md:col-span-4">
                                    <label className="block font-semibold text-gray-700 mb-1">Motif précis du déplacement</label>
                                    <input
                                        type="text"
                                        placeholder="ex: Pyt de transport A/R pour sensibilisation mariage précoce"
                                        value={motif}
                                        onChange={(e) => setMotif(e.target.value)}
                                        className="w-full border border-gray-300 rounded p-1.5 text-xs focus:outline-none focus:border-[#04326D]"
                                        required
                                    />
                                </div>

                                <div className="md:col-span-2 flex flex-col justify-end">
                                    <label className="block font-semibold text-gray-700 mb-1">Coût A/R (FC)</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            min="0"
                                            step="500"
                                            placeholder="5000"
                                            value={montantFC}
                                            onChange={(e) => setMontantFC(e.target.value)}
                                            className="w-full border border-gray-300 rounded p-1.5 text-xs font-bold text-[#0B192C] focus:outline-none"
                                            required
                                        />
                                        <button
                                            type="submit"
                                            className="bg-[#04326D] hover:bg-[#06428f] text-white px-3.5 py-1.5 rounded font-bold text-xs shrink-0 transition"
                                        >
                                            Ajouter
                                        </button>
                                    </div>
                                </div>
                            </form>
                        ) : (
                            <div className="p-4 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900 flex items-center gap-3">
                                <svg className="w-5 h-5 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <div>
                                    <p className="font-bold">Attente d'autorisation préalable :</p>
                                    <p className="text-[11px] mt-0.5">
                                        Vous ne pouvez pas inscrire de mouvements financiers sur cette réquisition tant que votre Manager de Projet ({selectedReq.managerProjetNom}) n'a pas apposé son visa électronique.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 5. TABLEAU DU CARNET DE DÉPLACEMENT */}
                {selectedReq && (
                    <div className="bg-white border border-[#B2BED6] rounded shadow-sm overflow-hidden">
                        <div className="p-3.5 bg-[#0B192C] text-white flex items-center justify-between text-xs">
                            <span className="font-bold uppercase tracking-wider">
                                Relevé des Déplacements : {selectedReq.code} ({selectedReq.mouvements.length} lignes)
                            </span>
                            <span className="font-mono text-[#F58F20] font-bold">
                                Total : {totalDepenseFC.toLocaleString('fr-FR')} FC
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-[#F1F5F9] text-gray-600 uppercase text-[10px] font-bold border-b border-[#B2BED6]">
                                        <th className="py-2.5 px-3 w-12 text-center">N°</th>
                                        <th className="py-2.5 px-3 w-28">Date</th>
                                        <th className="py-2.5 px-4 min-w-[200px]">Itinéraire (A/R)</th>
                                        <th className="py-2.5 px-4 min-w-[300px]">Motif du Déplacement</th>
                                        <th className="py-2.5 px-4 text-right w-32">Montant Dépensé</th>
                                        <th className="py-2.5 px-2 w-12 text-center"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E2E8F0] text-gray-700">
                                    {selectedReq.mouvements.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="text-center py-8 text-gray-400 italic">
                                                Aucun mouvement enregistré pour cette réquisition.
                                            </td>
                                        </tr>
                                    ) : (
                                        selectedReq.mouvements.map((m) => (
                                            <tr key={m.id} className="hover:bg-[#F9F9FF] transition">
                                                <td className="py-3 px-3 text-center font-bold text-gray-400 font-mono">
                                                    {m.ordre}
                                                </td>
                                                <td className="py-3 px-3 text-gray-600 whitespace-nowrap">
                                                    {m.date}
                                                </td>
                                                <td className="py-3 px-4 font-bold text-[#04326D]">
                                                    {m.itineraire}
                                                </td>
                                                <td className="py-3 px-4 text-gray-800">
                                                    {m.motif}
                                                </td>
                                                <td className="py-3 px-4 text-right font-mono font-bold text-[#0B192C] whitespace-nowrap">
                                                    {m.montantFC.toLocaleString('fr-FR')} FC
                                                </td>
                                                <td className="py-3 px-2 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteMouvement(m.id)}
                                                        className="p-1 text-gray-400 hover:text-red-600 rounded transition"
                                                        title="Supprimer cette ligne"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* 6. BORDEREAU OFFICIEL D'IMPRESSION PRO (VISIBLE UNIQUEMENT LORS DU PRINT) */}
            {selectedReq && isValideParMP && (
                <div id="releve-transport-print">
                    <div style={{ borderBottom: '2px solid black', paddingBottom: '12px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                            <h1 style={{ fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase', margin: 0 }}>
                                ASBL BON PASTEUR KOLWEZI
                            </h1>
                            <p style={{ fontSize: '11px', margin: '3px 0 0 0', color: '#333' }}>
                                Service de Gestion & Suivi des Activités Terrain
                            </p>
                            <p style={{ fontSize: '11px', margin: '2px 0 0 0' }}>
                                Projet : <strong>{selectedReq.projet}</strong>
                            </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <h2 style={{ fontSize: '15px', fontWeight: 'bold', margin: 0, letterSpacing: '0.5px' }}>
                                BORDEREAU DE DÉCHARGE TRANSPORT
                            </h2>
                            <p style={{ fontSize: '13px', fontWeight: 'bold', margin: '2px 0', fontFamily: 'monospace' }}>
                                Réf : {selectedReq.code}
                            </p>
                            <p style={{ fontSize: '11px', margin: 0, color: '#555' }}>
                                Date d'émission : {new Date().toLocaleDateString('fr-FR')}
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '11px', marginBottom: '16px' }}>
                        <div>
                            <p style={{ margin: '2px 0' }}><strong>Avance Décaissée :</strong> {selectedReq.montantAlloueFC.toLocaleString()} FC</p>
                            <p style={{ margin: '2px 0' }}><strong>Total Justifié (Courses) :</strong> {totalDepenseFC.toLocaleString()} FC</p>
                        </div>
                        <div>
                            <p style={{ margin: '2px 0' }}><strong>Reliquat / Reste à retourner :</strong> {soldeRestantFC.toLocaleString()} FC</p>
                            <p style={{ margin: '2px 0' }}><strong>Visa Manager Projet :</strong> {selectedReq.managerProjetNom} ({selectedReq.dateVisaMP})</p>
                        </div>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '24px' }}>
                        <thead>
                            <tr style={{ background: '#f2f2f2', textTransform: 'uppercase', textAlign: 'left' }}>
                                <th style={{ border: '1px solid black', padding: '6px', width: '30px', textAlign: 'center' }}>N°</th>
                                <th style={{ border: '1px solid black', padding: '6px', width: '80px' }}>Date</th>
                                <th style={{ border: '1px solid black', padding: '6px', width: '160px' }}>Itinéraire</th>
                                <th style={{ border: '1px solid black', padding: '6px' }}>Motif de la Mission / Déplacement</th>
                                <th style={{ border: '1px solid black', padding: '6px', width: '100px', textAlign: 'right' }}>Montant (FC)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {selectedReq.mouvements.map((m) => (
                                <tr key={m.id}>
                                    <td style={{ border: '1px solid black', padding: '6px', textAlign: 'center' }}>{m.ordre}</td>
                                    <td style={{ border: '1px solid black', padding: '6px' }}>{m.date}</td>
                                    <td style={{ border: '1px solid black', padding: '6px', fontWeight: 'bold' }}>{m.itineraire}</td>
                                    <td style={{ border: '1px solid black', padding: '6px' }}>{m.motif}</td>
                                    <td style={{ border: '1px solid black', padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>
                                        {m.montantFC.toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                            <tr>
                                <td colSpan={4} style={{ border: '1px solid black', padding: '6px', textAlign: 'right', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                    Total Dépensé :
                                </td>
                                <td style={{ border: '1px solid black', padding: '6px', textAlign: 'right', fontWeight: 'bold', fontSize: '12px' }}>
                                    {totalDepenseFC.toLocaleString()} FC
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', textAlign: 'center', fontSize: '10px', marginTop: '30px' }}>
                        <div style={{ border: '1px solid black', padding: '8px', minHeight: '80px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                            <p style={{ fontWeight: 'bold', margin: 0 }}>L'Agent Terrain (Bénéficiaire)</p>
                            <p style={{ borderTop: '1px dashed black', paddingTop: '4px', margin: 0 }}>Date & Signature</p>
                        </div>
                        <div style={{ border: '1px solid black', padding: '8px', minHeight: '80px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                            <p style={{ fontWeight: 'bold', margin: 0 }}>Le Manager de Projet (Visa)</p>
                            <p style={{ borderTop: '1px dashed black', paddingTop: '4px', margin: 0 }}>Visa & Date</p>
                        </div>
                        <div style={{ border: '1px solid black', padding: '8px', minHeight: '80px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                            <p style={{ fontWeight: 'bold', margin: 0 }}>Le Caissier (Vérification Décharge)</p>
                            <p style={{ borderTop: '1px dashed black', paddingTop: '4px', margin: 0 }}>Apurement & Date</p>
                        </div>
                    </div>
                </div>
            )}
        </StaffLayout>
    );
}