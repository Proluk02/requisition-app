import {
    forwardRef,
    InputHTMLAttributes,
    useEffect,
    useImperativeHandle,
    useRef,
} from 'react';

export default forwardRef(function TextInput(
    {
        type = 'text',
        className = '',
        isFocused = false,
        ...props
    }: InputHTMLAttributes<HTMLInputElement> & { isFocused?: boolean },
    ref,
) {
    const localRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
        focus: () => localRef.current?.focus(),
    }));

    useEffect(() => {
        if (isFocused) localRef.current?.focus();
    }, [isFocused]);

    return (
        <input
            {...props}
            type={type}
            ref={localRef}
            className={[
                // Base
                'rounded-md border border-outline-variant bg-white text-sm text-on-surface shadow-sm',
                // Placeholder — la couleur vient du CSS global, on force juste l'opacité
                'placeholder:opacity-100',
                // Focus
                'focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20',
                // Disabled
                'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500',
                // Dark mode
                'dark:border-white/15 dark:bg-white/5 dark:text-gray-200',
                // Transition
                'transition-colors',
                className,
            ].join(' ')}
        />
    );
});