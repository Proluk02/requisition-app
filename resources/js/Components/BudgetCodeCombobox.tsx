import { useState, useMemo, useRef, useEffect } from 'react';
import { AlertTriangle, Check, ChevronDown } from 'lucide-react';

export interface BudgetLineItem {
    [x: string]: string | number | undefined;
    id: string;
    code: string;
    libelle: string;
    devise: string;
    solde: number;
    budget_initial?: number;
}

interface Props {
    value: string;
    onChange: (code: string) => void;
    budgetLines: BudgetLineItem[];
    montantLigne: number;
    deviseRequisition: string;
    placeholder?: string;
    required?: boolean;
}

export default function BudgetCodeCombobox({
    value,
    onChange,
    budgetLines = [],
    montantLigne = 0,
    deviseRequisition = 'USD',
    placeholder = 'Taper le code (ex: 2, 6.112.a)...',
    required = false,
}: Props) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Filtrage instantané en mémoire dès la frappe (ex: "2" donne tout ce qui commence par ou contient "2")
    const suggestions = useMemo(() => {
        const query = (value || '').trim().toLowerCase();
        if (!query) {
            return budgetLines.slice(0, 10);
        }

        return budgetLines.filter((b) => {
            const matchCode = b.code.toLowerCase().includes(query);
            const matchLibelle = b.libelle.toLowerCase().includes(query);
            return matchCode || matchLibelle;
        });
    }, [budgetLines, value]);

    // Détection de la ligne sélectionnée exacte
    const selectedLine = useMemo(() => {
        const query = (value || '').trim().toLowerCase();
        if (!query) return null;
        return budgetLines.find((b) => b.code.toLowerCase() === query) ?? null;
    }, [budgetLines, value]);

    const isDepassement = useMemo(() => {
        if (!selectedLine) return false;
        return montantLigne > selectedLine.solde;
    }, [selectedLine, montantLigne]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelectOption = (code: string) => {
        onChange(code);
        setOpen(false);
    };

    return (
        <div ref={containerRef} className="relative w-full text-xs">
            <div className="relative">
                <input
                    type="text"
                    value={value}
                    onChange={(e) => {
                        onChange(e.target.value);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    placeholder={placeholder}
                    required={required}
                    className="w-full border border-primary rounded p-1.5 pr-7 text-xs font-mono font-bold text-primary bg-white focus:outline-none focus:ring-1 focus:ring-primary/40 transition"
                />
                <button
                    type="button"
                    onClick={() => setOpen(!open)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary p-0.5"
                    tabIndex={-1}
                >
                    <ChevronDown className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Liste déroulante des probabilités / suggestions en direct */}
            {open && (
                <div className="absolute left-0 right-0 z-50 mt-1 max-h-52 overflow-y-auto bg-white border border-[#B2BED6] rounded shadow-xl py-1 text-xs divide-y divide-gray-100">
                    {suggestions.length === 0 ? (
                        <div className="p-2.5 text-center text-gray-400 italic text-[11px]">
                            Aucun code budgétaire correspondant dans ce projet.
                        </div>
                    ) : (
                        suggestions.map((b) => {
                            const isCurrent = (value || '').trim().toLowerCase() === b.code.toLowerCase();
                            const wouldOverdraft = montantLigne > b.solde;

                            return (
                                <div
                                    key={b.id}
                                    onClick={() => handleSelectOption(b.code)}
                                    className={`p-2 cursor-pointer transition flex items-center justify-between gap-2 hover:bg-blue-50 ${
                                        isCurrent ? 'bg-blue-50/80 font-bold' : ''
                                    }`}
                                >
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-mono font-bold text-[#04326D] bg-blue-100/60 px-1.5 py-0.2 rounded text-[11px]">
                                                {b.code}
                                            </span>
                                            <span className="text-gray-700 font-medium truncate text-[11px]" title={b.libelle}>
                                                {b.libelle}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-gray-400 mt-0.5 font-mono">
                                            Solde dispo :{' '}
                                            <strong className={wouldOverdraft ? 'text-red-700 font-bold' : 'text-emerald-700'}>
                                                {b.solde.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {b.devise}
                                            </strong>
                                        </p>
                                    </div>

                                    {isCurrent && <Check className="w-3.5 h-3.5 text-[#04326D] shrink-0" />}
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* Rendu visuel d'information et alerte de dépassement en temps réel */}
            {selectedLine && (
                <div className={`mt-1 p-1.5 rounded border text-[10px] space-y-0.5 ${
                    isDepassement
                        ? 'bg-red-50 border-red-300 text-red-900'
                        : 'bg-blue-50/80 border-blue-200 text-gray-800'
                }`}>
                    <p className="font-bold text-[#04326D] truncate" title={selectedLine.libelle}>
                        {selectedLine.libelle}
                    </p>
                    <div className="flex items-center justify-between font-mono text-[9.5px]">
                        <span>Solde de la ligne :</span>
                        <strong className={isDepassement ? 'text-red-700 font-bold' : 'text-emerald-700 font-bold'}>
                            {selectedLine.solde.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {selectedLine.devise}
                        </strong>
                    </div>

                    {isDepassement && (
                        <div className="flex items-center gap-1 text-red-700 font-black bg-red-100 p-1 rounded mt-0.5">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>
                                Dépassement de {(montantLigne - selectedLine.solde).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {deviseRequisition}
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}