import { ButtonHTMLAttributes } from 'react';

export default function SecondaryButton({
    type = 'button',
    className = '',
    disabled,
    children,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            {...props}
            type={type}
            className={
                `inline-flex items-center justify-center gap-2 rounded-md border border-outline-variant bg-white px-4 py-2 text-xs font-semibold text-gray-700 shadow-sm transition-all duration-150 ease-in-out hover:bg-gray-50 hover:border-outline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:border-white/25 ` +
                className
            }
            disabled={disabled}
        >
            {children}
        </button>
    );
}