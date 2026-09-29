import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.tsx',
    ],

    theme: {
        extend: {
            colors: {
                background: '#f9f9ff',
                sidebar: '#0B192C',
                primary: {
                    DEFAULT: '#04326D',
                    dark: '#0B192C',
                    light: '#06428f',
                    soft: '#EBF2FC',
                },
                secondary: {
                    DEFAULT: '#3c5e9b',
                    container: '#9bbbff',
                },
                tertiary: {
                    DEFAULT: '#F58F20',
                    dark: '#d97c18',
                    soft: '#FFF4E6',
                },
                surface: {
                    DEFAULT: '#f9f9ff',
                    dim: '#cedaf3',
                    variant: '#d7e3fc',
                    muted: '#F5F7FB',
                },
                'on-surface': '#101c2e',
                'on-surface-variant': '#44474c',
                outline: {
                    DEFAULT: '#75777d',
                    variant: '#B2BED6',
                    soft: '#E2E8F0',
                },
                success: {
                    DEFAULT: '#10B981',
                    soft: '#ECFDF5',
                    dark: '#065F46',
                },
                error: {
                    DEFAULT: '#ba1a1a',
                    soft: '#FEF2F2',
                    dark: '#991B1B',
                },
                warning: {
                    DEFAULT: '#F58F20',
                    soft: '#FFF4E6',
                },
            },
            fontFamily: {
                sans: ['Inter', ...defaultTheme.fontFamily.sans],
            },
            borderRadius: {
                sm: '0.125rem',
                DEFAULT: '0.25rem',
                md: '0.375rem',
                lg: '0.5rem',
                xl: '0.75rem',
                full: '9999px',
            },
            boxShadow: {
                card: '0 1px 2px 0 rgb(11 25 44 / 0.04), 0 1px 3px 0 rgb(11 25 44 / 0.06)',
                dropdown: '0 10px 30px -10px rgb(11 25 44 / 0.18), 0 4px 12px -4px rgb(11 25 44 / 0.08)',
                modal: '0 25px 50px -12px rgb(11 25 44 / 0.25)',
            },
            keyframes: {
                'fade-in': {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                'slide-down': {
                    '0%': { opacity: '0', transform: 'translateY(-6px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                'slide-in-right': {
                    '0%': { opacity: '0', transform: 'translateX(8px)' },
                    '100%': { opacity: '1', transform: 'translateX(0)' },
                },
            },
            animation: {
                'fade-in': 'fade-in 180ms ease-out',
                'slide-down': 'slide-down 180ms ease-out',
                'slide-in-right': 'slide-in-right 180ms ease-out',
            },
        },
    },

    plugins: [forms],
};