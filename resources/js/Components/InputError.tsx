import { HTMLAttributes } from 'react';
import { AlertCircle } from 'lucide-react';

export default function InputError({
    message,
    className = '',
    ...props
}: HTMLAttributes<HTMLParagraphElement> & { message?: string }) {
    return message ? (
        <p
            {...props}
            className={
                'mt-1 flex items-center gap-1.5 text-xs font-medium text-error dark:text-red-400 ' +
                className
            }
        >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{message}</span>
        </p>
    ) : null;
}