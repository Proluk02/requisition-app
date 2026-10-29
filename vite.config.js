import { defineConfig, loadEnv } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');

    return {
        plugins: [
            laravel({
                input: 'resources/js/app.tsx',
                ssr: 'resources/js/ssr.tsx',
                refresh: true,
            }),
            react(),
        ],
        define: {
            'import.meta.env.VITE_APP_NAME': JSON.stringify(
                env.VITE_APP_NAME || env.APP_NAME || 'RMS BPKLZ'
            ),
        },
    };
});