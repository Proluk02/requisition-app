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
        if (isFocused) {
            localRef.current?.focus();
        }
    }, [isFocused]);

    return (
        <input
            {...props}
            type={type}
            className={
                'rounded-md border-outline-variant bg-white shadow-sm text-sm transition-colors placeholder:text-gray-400 focus:border-primary focus:ring-1 focus:ring-primary/20 focus:outline-none dark:border-white/15 dark:bg-white/5 dark:text-gray-200 dark:placeholder:text-gray-500 dark:focus:border-primary dark:focus:ring-primary/40 ' +
                className
            }
            ref={localRef}
        />
    );
});