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
                // CarbonCode Design System Tokens
                'carbon-bg': 'var(--color-bg-app)',
                'carbon-secondary': 'var(--color-bg-secondary)',
                'carbon-surface': 'var(--color-bg-surface)',
                'carbon-elevated': 'var(--color-bg-elevated)',
                'carbon-border': 'var(--color-border)',
                'carbon-border-subtle': 'var(--color-border-subtle)',
                'carbon-accent': 'var(--color-accent)',
                'carbon-accent-secondary': 'var(--color-accent-secondary)',
                'carbon-accent-highlight': 'var(--color-accent-highlight)',
                'carbon-text-primary': 'var(--color-text-primary)',
                'carbon-text-secondary': 'var(--color-text-secondary)',
                'carbon-text-muted': 'var(--color-text-muted)',
                'carbon-success': 'var(--color-success)',
                'carbon-warning': 'var(--color-warning)',
                'carbon-error': 'var(--color-error)',

                // Legacy mappings for backward compatibility
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
            borderRadius: {
                'sm': '8px',
                'md': '12px',
                'lg': '16px',
                'pill': '9999px',
            },
            fontFamily: {
                'mono': ['Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', 'monospace'],
                'sans': ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
            },
            animation: {
                'fade-in': 'fadeIn 0.3s ease-in-out',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
            },
            boxShadow: {
                'glow': '0 0 20px rgba(22, 136, 245, 0.35)',
                'glow-success': '0 0 20px rgba(32, 212, 176, 0.35)',
                'card': '0 4px 20px rgba(0, 0, 0, 0.35)',
            }
        },
    },
    plugins: [],
}
