import { InertiaLinkProps, Link } from '@inertiajs/react';

export default function NavLink({
    active = false,
    className = '',
    children,
    ...props
}: InertiaLinkProps & { active: boolean }) {
    return (
        <Link
            {...props}
            className={
                'inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium leading-5 transition duration-150 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-1 ' +
                (active
                    ? 'border-primary text-on-surface dark:border-primary dark:text-white'
                    : 'border-transparent text-gray-500 hover:border-outline-variant hover:text-gray-700 dark:text-gray-400 dark:hover:border-white/20 dark:hover:text-gray-200') +
                className
            }
        >
            {children}
        </Link>
    );
}