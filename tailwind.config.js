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
                // Dark theme colors (VS Code inspired)
                'editor-bg': '#1e1e1e',
                'editor-sidebar': '#252526',
                'editor-border': '#3c3c3c',
                'editor-highlight': '#264f78',
                'editor-selection': '#add6ff33',
                'toolbar-bg': '#323233',
                'output-bg': '#1e1e1e',
                'accent': '#007acc',
                'accent-hover': '#1e90ff',
                'success': '#4ec9b0',
                'error': '#f14c4c',
                'warning': '#cca700',
                'text-primary': '#cccccc',
                'text-secondary': '#858585',
                'text-bright': '#ffffff',
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
