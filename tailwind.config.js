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
                sidebar: '#0B192C', // Bleu Nuit
                primary: {
                    DEFAULT: '#04326D', // Bleu Cobalt
                    container: '#0B192C',
                },
                secondary: {
                    DEFAULT: '#3c5e9b',
                    container: '#9bbbff',
                },
                tertiary: '#F58F20', // Orange Accent
                surface: {
                    DEFAULT: '#f9f9ff',
                    dim: '#cedaf3',
                    variant: '#d7e3fc',
                },
                'on-surface': '#101c2e',
                'on-surface-variant': '#44474c',
                outline: {
                    DEFAULT: '#75777d',
                    variant: '#c5c6cd', // Bleu Mist
                },
                success: '#10B981',
                error: '#ba1a1a',
            },
            fontFamily: {
                sans: ['Inter', ...defaultTheme.fontFamily.sans],
            },
            borderRadius: {
                'sm': '0.125rem',
                'DEFAULT': '0.25rem',
                'md': '0.375rem',
                'lg': '0.5rem',
                'xl': '0.75rem',
                'full': '9999px',
            },
        },
    },

    plugins: [forms],
};