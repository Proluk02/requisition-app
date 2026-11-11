import { FormEvent, useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/Layouts/AppLayout';
import { PageProps } from '@/types';
import { Download, Search } from 'lucide-react';

interface ApprovedRequisition {
    id: string;
    numero: string;
    projet: string;
    initiateur: string;
    caisse: string;
    montant: number;
    devise: string;
    dateApprobation: string | null;
}

interface Pagination {
    data: ApprovedRequisition[];
    current_page: number;
    last_page: number;
    total: number;
    prev_page_url: string | null;
    next_page_url: string | null;
}

interface Props extends PageProps {
    requisitions: Pagination;
    search: string;
}

const money = (amount: number, currency: string) =>
    `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;

export default function ApprovedPaymentRequests({ requisitions, search }: Props) {
    const [query, setQuery] = useState(search);

    const submitSearch = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        router.get(route('director.payment-requests'), { search: query }, {
            preserveScroll: true,
            preserveState: true,
        });
    };

    const clearSearch = () => {
        setQuery('');
        router.get(route('director.payment-requests'), {}, {
            preserveScroll: true,
            preserveState: true,
        });
    };

    return (
        <AppLayout>
            <Head title="Réquisitions approuvées — Payment Requests" />

            <div className="space-y-5">
                <header className="border-b border-[#E2E8F0] pb-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#B2BED6] mb-1">
                        Direction Générale / Documents approuvés
                    </p>
                    <h1 className="text-xl font-bold text-[#0B192C]">Réquisitions approuvées</h1>
                    <p className="mt-1 text-xs text-gray-500">
                        Liste de toutes les réquisitions approuvées par la Direction avec leur Payment Request téléchargeable.
                    </p>
                </header>

                <form onSubmit={submitSearch} className="flex flex-col sm:flex-row gap-2 max-w-2xl">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="search"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Rechercher par numéro, projet ou initiateur"
                            className="w-full rounded border border-[#B2BED6] py-2 pl-9 pr-3 text-xs focus:border-[#04326D] focus:outline-none"
                        />
                    </div>
                    <button
                        type="submit"
                        className="rounded bg-[#04326D] px-4 py-2 text-xs font-bold text-white hover:bg-[#06428f]"
                    >
                        Rechercher
                    </button>
                    {search && (
                        <button
                            type="button"
                            onClick={clearSearch}
                            className="rounded border border-[#B2BED6] px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                        >
                            Effacer
                        </button>
                    )}
                </form>

                <section className="overflow-hidden rounded border border-[#B2BED6] bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-[#E2E8F0] px-4 py-3">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-[#0B192C]">
                            Payment Requests approuvés
                        </h2>
                        <span className="text-[11px] font-semibold text-gray-500">
                            {requisitions.total} réquisition(s)
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="bg-[#0B192C] text-[10px] font-bold uppercase tracking-wider text-white">
                                    <th className="px-4 py-3">Numéro</th>
                                    <th className="px-4 py-3">Projet</th>
                                    <th className="px-4 py-3">Initiateur</th>
                                    <th className="px-4 py-3">Caisse</th>
                                    <th className="px-4 py-3">Date d’approbation</th>
                                    <th className="px-4 py-3 text-right">Montant</th>
                                    <th className="px-4 py-3 text-right">Payment Request</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E2E8F0]">
                                {requisitions.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                                            Aucune réquisition approuvée ne correspond à la recherche.
                                        </td>
                                    </tr>
                                ) : requisitions.data.map((requisition) => (
                                    <tr key={requisition.id} className="hover:bg-[#F9F9FF]">
                                        <td className="whitespace-nowrap px-4 py-3 font-mono font-bold text-[#04326D]">
                                            {requisition.numero}
                                        </td>
                                        <td className="px-4 py-3 font-semibold text-[#0B192C]">{requisition.projet}</td>
                                        <td className="px-4 py-3">{requisition.initiateur}</td>
                                        <td className="px-4 py-3">{requisition.caisse}</td>
                                        <td className="whitespace-nowrap px-4 py-3">{requisition.dateApprobation ?? '—'}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-bold">
                                            {money(requisition.montant, requisition.devise)}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <a
                                                href={route('requisitions.payment-request.pdf', requisition.id)}
                                                className="inline-flex items-center gap-1.5 rounded bg-emerald-700 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-emerald-800"
                                            >
                                                <Download className="h-3.5 w-3.5" />
                                                PDF
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {requisitions.last_page > 1 && (
                        <div className="flex items-center justify-between border-t border-[#E2E8F0] px-4 py-3 text-xs">
                            {requisitions.prev_page_url ? (
                                <Link href={requisitions.prev_page_url} className="font-semibold text-[#04326D] hover:underline">
                                    Précédent
                                </Link>
                            ) : <span className="text-gray-400">Précédent</span>}
                            <span className="text-gray-500">
                                Page {requisitions.current_page} sur {requisitions.last_page}
                            </span>
                            {requisitions.next_page_url ? (
                                <Link href={requisitions.next_page_url} className="font-semibold text-[#04326D] hover:underline">
                                    Suivant
                                </Link>
                            ) : <span className="text-gray-400">Suivant</span>}
                        </div>
                    )}
                </section>
            </div>
        </AppLayout>
    );
}
