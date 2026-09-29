import { InertiaLinkProps, Link } from '@inertiajs/react';

export default function ResponsiveNavLink({
    active = false,
    className = '',
    children,
    ...props
}: InertiaLinkProps & { active?: boolean }) {
    return (
        <Link
            {...props}
            className={`flex w-full items-start border-l-4 py-2.5 pe-4 ps-3 text-sm font-medium transition duration-150 ease-in-out focus:outline-none ${
                active
                    ? 'border-primary bg-primary-soft text-primary focus:border-primary focus:bg-primary-soft'
                    : 'border-transparent text-gray-600 hover:border-outline-variant hover:bg-surface-muted hover:text-on-surface focus:border-outline-variant focus:bg-surface-muted focus:text-on-surface dark:text-gray-400 dark:hover:border-white/10 dark:hover:bg-white/5 dark:hover:text-white dark:focus:border-white/10 dark:focus:bg-white/5 dark:focus:text-white'
            } ${className}`}
        >
            {children}
        </Link>
    );
}