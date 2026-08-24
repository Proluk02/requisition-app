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
                // Ta palette "Pro-Management Core"
                primary: {
                    DEFAULT: '#2563eb', // Bleu Institutionnel
                    dark: '#1d4ed8',
                    container: '#e5eeff',
                },
                secondary: {
                    DEFAULT: '#16a34a', // Vert Succès
                    container: '#dcfce7',
                },
                surface: {
                    DEFAULT: '#f8f9ff',
                    bright: '#ffffff',
                    dim: '#cbdbf5',
                },
                'on-surface': '#0b1c30',
                'on-surface-variant': '#434655',
                outline: '#737686',
                'outline-variant': '#e2e8f0',
                // Sidebar Slate Dark
                sidebar: '#0f172a',
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