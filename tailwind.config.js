/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                'editor-bg': 'var(--color-editor-bg)',
                'editor-sidebar': 'var(--color-editor-sidebar)',
                'editor-border': 'var(--color-editor-border)',
                'editor-highlight': 'var(--color-editor-highlight)',
                'editor-selection': 'var(--color-editor-selection)',
                'toolbar-bg': 'var(--color-toolbar-bg)',
                'output-bg': 'var(--color-output-bg)',
                'accent': 'var(--color-accent)',
                'accent-hover': 'var(--color-accent-hover)',
                'success': 'var(--color-success)',
                'error': 'var(--color-error)',
                'warning': 'var(--color-warning)',
                'text-primary': 'var(--color-text-primary)',
                'text-secondary': 'var(--color-text-secondary)',
                'text-bright': 'var(--color-text-bright)',
            },
            fontFamily: {
                'mono': ['Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', 'monospace'],
                'sans': ['Segoe UI', 'system-ui', 'sans-serif'],
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'fade-in': 'fadeIn 0.3s ease-in-out',
                'slide-up': 'slideUp 0.3s ease-out',
                'spin-slow': 'spin 2s linear infinite',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(10px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
            },
            boxShadow: {
                'glow': '0 0 20px rgba(0, 122, 204, 0.3)',
                'glow-success': '0 0 20px rgba(78, 201, 176, 0.3)',
                'glow-error': '0 0 20px rgba(241, 76, 76, 0.3)',
            }
        },
    },
    plugins: [],
}
