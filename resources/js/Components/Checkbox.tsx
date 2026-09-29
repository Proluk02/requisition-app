import { InputHTMLAttributes } from 'react';

export default function Checkbox({
    className = '',
    ...props
}: InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            {...props}
            type="checkbox"
            className={
                'rounded border-outline-variant text-primary shadow-sm focus:ring-2 focus:ring-primary/20 focus:ring-offset-0 dark:border-white/20 dark:bg-white/5 dark:focus:ring-primary/40 ' +
                className
            }
        />
    );
}