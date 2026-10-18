import { Head } from '@inertiajs/react';
import { ShieldCheck, ShieldX, FileText, User, Calendar, Hash, Award } from 'lucide-react';

interface Props {
    valid: boolean;
    message: string;
    signature: {
        nom_signataire: string;
        role_signataire: string;
        action: string;
        signed_at: string;
        signature_code: string;
        signature_hash: string;
        requisition: {
            numero: string;
            projet: string;
            montant: number;
            devise: string;
            nature: string;
        };
    } | null;
}

const roleLabels: Record<string, string> = {
    project_manager: 'Manager de Projet',
    finance: 'Manager des Finances',
    admin_manager: "Manager d'Administration (PAM)",
    director: 'Directrice Générale',
};

export default function Verify({ valid, message, signature }: Props) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0B192C] to-[#04326D] flex items-center justify-center p-4">
            <Head title="Vérification de signature" />

            <div className="w-full max-w-2xl bg-white rounded-lg shadow-2xl overflow-hidden">
                {/* Header */}
                <div className={`p-6 text-center ${valid ? 'bg-emerald-600' : 'bg-red-700'}`}>
                    {valid ? (
                        <ShieldCheck className="w-16 h-16 text-white mx-auto mb-2" />
                    ) : (
                        <ShieldX className="w-16 h-16 text-white mx-auto mb-2" />
                    )}
                    <h1 className="text-white text-xl font-bold uppercase tracking-wider">
                        {valid ? 'Signature Authentifiée' : 'Signature Non Valide'}
                    </h1>
                    <p className="text-white/80 text-sm mt-1">{message}</p>
                </div>

                {/* Body */}
                {signature && (
                    <div className="p-6 space-y-4">
                        <div className="border-b border-gray-200 pb-4">
                            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
                                Informations de la signature
                            </h2>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                <Field icon={<User className="w-4 h-4" />} label="Signataire" value={signature.nom_signataire} />
                                <Field icon={<Award className="w-4 h-4" />} label="Rôle" value={roleLabels[signature.role_signataire] ?? signature.role_signataire} />
                                <Field icon={<Calendar className="w-4 h-4" />} label="Date de signature" value={signature.signed_at} />
                                <Field icon={<Hash className="w-4 h-4" />} label="Code" value={signature.signature_code} />
                            </div>

                            <div className="mt-3 p-2 bg-gray-50 border border-gray-200 rounded">
                                <p className="text-[10px] font-bold uppercase text-gray-500 mb-1">Empreinte SHA</p>
                                <p className="font-mono text-[11px] text-gray-800 break-all">{signature.signature_hash}</p>
                            </div>
                        </div>

                        <div>
                            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
                                Document concerné
                            </h2>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                <Field icon={<FileText className="w-4 h-4" />} label="N° Réquisition" value={signature.requisition.numero} />
                                <Field icon={<FileText className="w-4 h-4" />} label="Projet" value={signature.requisition.projet} />
                                <Field
                                    icon={<FileText className="w-4 h-4" />}
                                    label="Montant"
                                    value={`${signature.requisition.montant.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} ${signature.requisition.devise}`}
                                />
                                <Field icon={<FileText className="w-4 h-4" />} label="Nature" value={signature.requisition.nature} />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-200 text-center">
                            <p className="text-xs text-gray-500 italic">
                                Bon Pasteur A.S.B.L. — Système de signature électronique certifié
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function Field({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-start gap-2">
            <span className="text-[#04326D] mt-0.5 shrink-0">{icon}</span>
            <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase text-gray-500">{label}</p>
                <p className="font-semibold text-[#0B192C] break-words">{value}</p>
            </div>
        </div>
    );
}