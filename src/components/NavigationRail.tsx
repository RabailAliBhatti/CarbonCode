import React from 'react'

export type NavItem = 'home' | 'editor' | 'files' | 'search' | 'debug' | 'settings'

interface NavigationRailProps {
    mode: 'expanded' | 'compact'
    activeItem: NavItem
    onSelect: (item: NavItem) => void
    theme: 'dark' | 'light'
    onToggleTheme: () => void
}

export const NavigationRail: React.FC<NavigationRailProps> = ({
    mode,
    activeItem,
    onSelect,
    theme,
    onToggleTheme,
}) => {
    if (mode === 'compact') {
        return (
            <aside className="w-12 bg-carbon-bg border-r border-carbon-border flex flex-col items-center py-3 shrink-0 select-none z-10 justify-between">
                <div className="flex flex-col items-center gap-2 w-full">
                    {/* Home */}
                    <button
                        onClick={() => onSelect('home')}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                            activeItem === 'home'
                                ? 'bg-carbon-accent text-white shadow-glow'
                                : 'text-carbon-text-muted hover:text-carbon-text-primary hover:bg-carbon-surface'
                        }`}
                        title="Home / Dashboard"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                    </button>

                    {/* Files / Explorer */}
                    <button
                        onClick={() => onSelect('files')}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                            activeItem === 'files'
                                ? 'bg-carbon-surface text-carbon-accent border border-carbon-accent/40 shadow-glow'
                                : 'text-carbon-text-muted hover:text-carbon-text-primary hover:bg-carbon-surface'
                        }`}
                        title="Explorer (Files)"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                    </button>

                    {/* Search */}
                    <button
                        onClick={() => onSelect('search')}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                            activeItem === 'search'
                                ? 'bg-carbon-surface text-carbon-accent border border-carbon-accent/40 shadow-glow'
                                : 'text-carbon-text-muted hover:text-carbon-text-primary hover:bg-carbon-surface'
                        }`}
                        title="Search in Files (Ctrl+Shift+F)"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </button>

                    {/* Debug */}
                    <button
                        onClick={() => onSelect('debug')}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                            activeItem === 'debug'
                                ? 'bg-carbon-surface text-carbon-accent border border-carbon-accent/40 shadow-glow'
                                : 'text-carbon-text-muted hover:text-carbon-text-primary hover:bg-carbon-surface'
                        }`}
                        title="Debugger"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </button>
                </div>

                {/* Bottom Settings */}
                <div className="flex flex-col items-center gap-2 w-full">
                    <button
                        onClick={() => onSelect('settings')}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                            activeItem === 'settings'
                                ? 'bg-carbon-surface text-carbon-accent border border-carbon-accent/40 shadow-glow'
                                : 'text-carbon-text-muted hover:text-carbon-text-primary hover:bg-carbon-surface'
                        }`}
                        title="Settings"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </button>
                </div>
            </aside>
        )
    }

    // Expanded mode (for Dashboard / Home view as in Dashboard Design New.png)
    return (
        <aside className="w-52 bg-carbon-bg border-r border-carbon-border flex flex-col justify-between p-4 shrink-0 select-none">
            {/* Navigation links */}
            <nav className="flex flex-col gap-1.5">
                {/* Home */}
                <button
                    onClick={() => onSelect('home')}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        activeItem === 'home'
                            ? 'bg-carbon-surface text-carbon-text-primary border border-carbon-border shadow-sm'
                            : 'text-carbon-text-secondary hover:text-carbon-text-primary hover:bg-carbon-surface/60'
                    }`}
                >
                    <svg className={`w-4 h-4 ${activeItem === 'home' ? 'text-carbon-accent' : 'text-carbon-text-muted'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    <span>Home</span>
                </button>

                {/* Editor */}
                <button
                    onClick={() => onSelect('editor')}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        activeItem === 'editor'
                            ? 'bg-carbon-surface text-carbon-text-primary border border-carbon-border shadow-sm'
                            : 'text-carbon-text-secondary hover:text-carbon-text-primary hover:bg-carbon-surface/60'
                    }`}
                >
                    <svg className={`w-4 h-4 ${activeItem === 'editor' ? 'text-carbon-accent' : 'text-carbon-text-muted'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    <span>Editor</span>
                </button>

                {/* Files */}
                <button
                    onClick={() => onSelect('files')}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        activeItem === 'files'
                            ? 'bg-carbon-surface text-carbon-text-primary border border-carbon-border shadow-sm'
                            : 'text-carbon-text-secondary hover:text-carbon-text-primary hover:bg-carbon-surface/60'
                    }`}
                >
                    <svg className={`w-4 h-4 ${activeItem === 'files' ? 'text-carbon-accent' : 'text-carbon-text-muted'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    <span>Files</span>
                </button>

                {/* Settings */}
                <button
                    onClick={() => onSelect('settings')}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        activeItem === 'settings'
                            ? 'bg-carbon-surface text-carbon-text-primary border border-carbon-border shadow-sm'
                            : 'text-carbon-text-secondary hover:text-carbon-text-primary hover:bg-carbon-surface/60'
                    }`}
                >
                    <svg className={`w-4 h-4 ${activeItem === 'settings' ? 'text-carbon-accent' : 'text-carbon-text-muted'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>Settings</span>
                </button>
            </nav>

            {/* Bottom Theme selector */}
            <div className="pt-4 border-t border-carbon-border-subtle">
                <button
                    onClick={onToggleTheme}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-carbon-surface border border-carbon-border text-xs text-carbon-text-secondary hover:text-carbon-text-primary hover:border-carbon-accent transition-all"
                    title={`Current theme: ${theme}. Click to switch.`}
                >
                    <div className="flex items-center gap-2">
                        {theme === 'dark' ? (
                            <svg className="w-3.5 h-3.5 text-carbon-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                            </svg>
                        ) : (
                            <svg className="w-3.5 h-3.5 text-carbon-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        )}
                        <span className="capitalize">{theme === 'dark' ? 'Dark' : 'Light'}</span>
                    </div>
                    <svg className="w-3 h-3 text-carbon-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
            </div>
        </aside>
    )
}

export default NavigationRail
