import { ButtonHTMLAttributes } from 'react';

export default function DangerButton({
    className = '',
    disabled,
    children,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            {...props}
            className={
                `inline-flex items-center justify-center gap-2 rounded-md border border-transparent bg-error px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all duration-150 ease-in-out hover:bg-error-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-error/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-sidebar ` +
                className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}