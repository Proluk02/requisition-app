import { LabelHTMLAttributes } from 'react';

export default function InputLabel({
    value,
    className = '',
    children,
    ...props
}: LabelHTMLAttributes<HTMLLabelElement> & { value?: string }) {
    return (
        <label
            {...props}
            className={
                `block text-xs font-semibold text-gray-700 dark:text-gray-300 tracking-wide ` +
                className
            }
        >
            {value ? value : children}
        </label>
    );
}