import { PropsWithChildren, ReactNode } from 'react';
import AppLayout from '@/Layouts/AppLayout';

interface AuthenticatedLayoutProps extends PropsWithChildren {
    header?: ReactNode;
}

export default function AuthenticatedLayout({ header, children }: AuthenticatedLayoutProps) {
    return (
        <AppLayout header={header}>
            {children}
        </AppLayout>
    );
}