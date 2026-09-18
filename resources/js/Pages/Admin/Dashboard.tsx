import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';

export default function AdminDashboard() {
    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-bold text-[#04326D]">Tableau de Bord Administration</h2>}>
            <Head title="Admin Dashboard" />
            <div className="p-6 text-gray-900">
                Bienvenue dans l'espace Administration.
            </div>
        </AuthenticatedLayout>
    );
}