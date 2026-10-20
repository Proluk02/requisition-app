import React from 'react';
import { Check, AlertTriangle, Clock } from 'lucide-react';

interface StepDefinition {
    id: number;
    title: string;
    subtitle: string;
}

const STEPS: StepDefinition[] = [
    { id: 1, title: 'Brouillon', subtitle: 'Initiateur' },
    { id: 2, title: 'Visa MP', subtitle: 'Manager Projet' },
    { id: 3, title: 'Finances', subtitle: 'Manager Finances' },
    { id: 4, title: 'Administration', subtitle: 'Manager Admin' },
    { id: 5, title: 'Direction', subtitle: 'Directrice Générale' },
    { id: 6, title: 'Caisse', subtitle: 'Guichet' },
    { id: 7, title: 'Clôturé', subtitle: 'Retour' },
];

interface WorkflowStepperProps {
    statusCode: string;
    isUrgent?: boolean;
}

type StepState = 'passed' | 'current' | 'rejected' | 'upcoming';

export default function WorkflowStepper({ statusCode, isUrgent = false }: WorkflowStepperProps) {
    const { currentStep, isRejected, rejectStep } = React.useMemo(() => {
        switch (statusCode) {
            case 'draft':
                return { currentStep: 2, isRejected: false, rejectStep: null as number | null };
            case 'returned_to_beneficiary':
            case 'returned_to_urgent_initiator':
                return { currentStep: 1, isRejected: true, rejectStep: 1 };
            case 'returned_to_project_manager':
                return { currentStep: 2, isRejected: true, rejectStep: 2 };
            case 'visa_mp':
                return { currentStep: 3, isRejected: false, rejectStep: null };
            case 'returned_to_finance':
                return { currentStep: 3, isRejected: true, rejectStep: 3 };
            case 'controle_finance':
                return { currentStep: 4, isRejected: false, rejectStep: null };
            case 'returned_to_admin_manager':
                return { currentStep: 4, isRejected: true, rejectStep: 4 };
            case 'visa_admin':
            case 'urgent_direction':
                return { currentStep: 5, isRejected: false, rejectStep: null };
            case 'decaissement_caisse':
                return { currentStep: 6, isRejected: false, rejectStep: null };
            case 'decaisse':
            case 'cloture':
                return { currentStep: 7, isRejected: false, rejectStep: null };
            case 'rejetee':
                return { currentStep: 0, isRejected: true, rejectStep: 0 };
            default:
                return { currentStep: 1, isRejected: false, rejectStep: null };
        }
    }, [statusCode]);

    // Progression globale : 0 à 100% en fonction de l'étape courante
    // On considère que la ligne relie le centre du 1er cercle au centre du dernier cercle.
    const progressPct = React.useMemo(() => {
        if (currentStep <= 1) return 0;
        if (currentStep >= STEPS.length) return 100;
        // proportion linéaire entre l'étape 1 (0%) et l'étape N (100%)
        return ((currentStep - 1) / (STEPS.length - 1)) * 100;
    }, [currentStep]);

    const getStepState = (stepId: number): StepState => {
        if (isRejected && rejectStep !== null && stepId === rejectStep) return 'rejected';
        if (stepId < currentStep) return 'passed';
        if (stepId === currentStep) return 'current';
        return 'upcoming';
    };

    const getStateLabel = (state: StepState): string => {
        switch (state) {
            case 'passed':
                return 'Validé';
            case 'current':
                return 'En cours';
            case 'rejected':
                return 'Rejeté — correction requise';
            case 'upcoming':
                return 'À venir';
        }
    };

    return (
        <div className="w-full py-2">
            {/* En-tête discret : progression + badge urgent */}
            <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    Progression du circuit
                </span>
                <div className="flex items-center gap-2">
                    {isRejected ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-50 border border-red-200 text-red-700 text-[9px] font-bold uppercase">
                            <AlertTriangle className="w-3 h-3" />
                            Rejeté
                        </span>
                    ) : currentStep >= STEPS.length ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 text-[9px] font-bold uppercase">
                            <Check className="w-3 h-3" />
                            Clôturé
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-[#F58F20] text-[9px] font-bold uppercase">
                            <Clock className="w-3 h-3" />
                            Étape {Math.max(1, Math.min(currentStep, STEPS.length))} / {STEPS.length}
                        </span>
                    )}
                    {isUrgent && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-600 text-white text-[9px] font-black uppercase tracking-wider">
                            Urgent
                        </span>
                    )}
                </div>
            </div>

            <div className="relative flex items-center justify-between" role="list" aria-label="Étapes du circuit de validation">
                {/* Ligne de fond (grise) */}
                <div className="absolute left-4 right-4 top-4 h-0.5 bg-gray-200 z-0" aria-hidden="true" />

                {/* Ligne de progression (colorée) */}
                <div
                    className={`absolute left-4 top-4 h-0.5 z-0 transition-all duration-500 ease-out ${
                        isRejected ? 'bg-red-400' : 'bg-emerald-500'
                    }`}
                    style={{ width: `calc(${progressPct}% - ${progressPct > 0 ? 0 : 0}px)` }}
                    aria-hidden="true"
                />

                {STEPS.map((step) => {
                    const state = getStepState(step.id);
                    const isPassed = state === 'passed';
                    const isCurrent = state === 'current';
                    const isStepRejected = state === 'rejected';

                    // Classes des cercles
                    const circleClass = isStepRejected
                        ? 'bg-red-600 text-white ring-4 ring-red-100'
                        : isPassed
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-[#F58F20] text-white ring-4 ring-orange-100'
                        : 'bg-white border-2 border-gray-300 text-gray-400';

                    // Classes des labels
                    const titleClass = isStepRejected
                        ? 'text-red-600'
                        : isCurrent
                        ? 'text-[#04326D]'
                        : isPassed
                        ? 'text-gray-800'
                        : 'text-gray-400';

                    const subtitleClass = isStepRejected
                        ? 'text-red-400'
                        : isCurrent
                        ? 'text-[#04326D]/70'
                        : isPassed
                        ? 'text-gray-500'
                        : 'text-gray-400';

                    const tooltipText = `${step.title} — ${step.subtitle} • ${getStateLabel(state)}`;

                    return (
                        <div
                            key={step.id}
                            role="listitem"
                            aria-current={isCurrent ? 'step' : undefined}
                            className="relative z-10 flex flex-col items-center group"
                            style={{ flex: '1 1 0' }}
                        >
                            {/* Cercle d'étape */}
                            <div
                                title={tooltipText}
                                className={`relative w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 shadow-sm ${circleClass} ${
                                    isCurrent ? 'scale-105' : ''
                                }`}
                            >
                                {isStepRejected ? (
                                    <AlertTriangle className="w-3.5 h-3.5 text-white" />
                                ) : isPassed ? (
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                ) : isCurrent ? (
                                    <span className="relative flex items-center justify-center">
                                        <span className="absolute inline-flex h-full w-full rounded-full bg-white/40 animate-ping" />
                                        <span className="relative">{step.id}</span>
                                    </span>
                                ) : (
                                    <span>{step.id}</span>
                                )}
                            </div>

                            {/* Libellés sous l'étape */}
                            <div className="text-center mt-1.5 max-w-[90px]">
                                <span className={`block text-[10.5px] font-bold leading-tight ${titleClass}`}>
                                    {step.title}
                                </span>
                                <span className={`hidden sm:block text-[9px] leading-tight ${subtitleClass}`}>
                                    {step.subtitle}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}