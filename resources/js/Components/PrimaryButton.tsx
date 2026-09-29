import { ButtonHTMLAttributes } from 'react';

export default function PrimaryButton({
    className = '',
    disabled,
    children,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            {...props}
            className={
                `inline-flex items-center justify-center gap-2 rounded-md border border-transparent bg-primary px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all duration-150 ease-in-out hover:bg-primary-light focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-sidebar dark:hover:bg-slate-100 dark:focus-visible:ring-white/40 ` +
                className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}