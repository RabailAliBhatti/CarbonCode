import React, { useState, useRef, useEffect } from 'react'
import { SupportedLanguage } from '../types/language'
import { CStandard, ConsoleMode } from '../hooks/useSettings'

export type CppStandard = 'c++11' | 'c++14' | 'c++17' | 'c++20' | 'c++23'

interface ToolbarProps {
    language: SupportedLanguage
    onLanguageChange?: (lang: SupportedLanguage) => void
    cppStandard: CppStandard
    onCppStandardChange: (std: CppStandard) => void
    cStandard?: CStandard
    onCStandardChange?: (std: CStandard) => void
    onRun: () => void
    onNewFile: () => void
    onNewProject?: () => void
    onOpenFile: () => void
    onSave: () => void
    isCompiling: boolean
    hasCompiler: boolean
    onOpenSettings?: () => void
    consoleMode?: ConsoleMode
    onConsoleModeChange?: (mode: ConsoleMode) => void
}

const standardDescriptions: Record<CppStandard, string> = {
    'c++11': 'C++11 - Modern C++ foundation',
    'c++14': 'C++14 - Bug fixes & improvements',
    'c++17': 'C++17 - Structured bindings, if constexpr (recommended)',
    'c++20': 'C++20 - Concepts, ranges, coroutines',
    'c++23': 'C++23 - Latest features'
}

const cStandardDescriptions: Record<CStandard, string> = {
    'c99': 'C99 - Variable declarations anywhere, stdbool',
    'c11': 'C11 - Anonymous structs, _Generic, multithreading',
    'c17': 'C17 - Standard recommendation with technical corrigenda',
    'c23': 'C23 - Modern standard with constexpr, nullptr, typeof'
}

export const Toolbar: React.FC<ToolbarProps> = ({
    language,
    onLanguageChange,
    cppStandard,
    onCppStandardChange,
    cStandard = 'c17',
    onCStandardChange,
    onRun,
    onNewFile,
    onNewProject,
    onOpenFile,
    onSave,
    isCompiling,
    hasCompiler,
    onOpenSettings,
    consoleMode = 'integrated',
    onConsoleModeChange
}) => {
    const [menuOpen, setMenuOpen] = useState(false)
    const [showCmdHint, setShowCmdHint] = useState(false)
    const [updateInfo, setUpdateInfo] = useState<{ status: string; newVersion?: string; downloadPercent?: number } | null>(null)
    const menuRef = useRef<HTMLDivElement>(null)
    const cmdHintRef = useRef<HTMLDivElement>(null)

    // First-run contextual hint for "CMD Screen" vs "Panel"
    useEffect(() => {
        try {
            const dismissed = localStorage.getItem('carboncode:cmd-hint-dismissed')
            if (!dismissed) {
                const timer = setTimeout(() => setShowCmdHint(true), 1200)
                return () => clearTimeout(timer)
            }
        } catch {}
    }, [])

    const dismissCmdHint = () => {
        setShowCmdHint(false)
        try {
            localStorage.setItem('carboncode:cmd-hint-dismissed', 'true')
        } catch {}
    }

    // Listen to background auto-updater status
    useEffect(() => {
        if (!window.electronAPI) return
        window.electronAPI.getUpdateStatus?.().then((st) => {
            if (st && (st.status === 'update-available' || st.status === 'downloading' || st.status === 'update-downloaded')) {
                setUpdateInfo(st)
            }
        })
        const unsubscribe = window.electronAPI.onUpdateStatus?.((info) => {
            if (info && (info.status === 'update-available' || info.status === 'downloading' || info.status === 'update-downloaded')) {
                setUpdateInfo(info)
            } else {
                setUpdateInfo(null)
            }
        })
        return () => {
            unsubscribe?.()
        }
    }, [])

    // Close menu on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false)
            }
        }
        if (menuOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [menuOpen])

    return (
        <header className="h-12 bg-carbon-secondary border-b border-carbon-border px-3.5 flex items-center justify-between shrink-0 select-none z-20">
            {/* Left Section: Branding & Main Action Buttons */}
            <div className="flex items-center gap-2.5">
                {/* Hamburger Menu Dropdown */}
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className="p-1.5 rounded-md text-carbon-text-secondary hover:text-carbon-text-primary hover:bg-carbon-surface transition-all"
                        title="Application Menu"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>

                    {menuOpen && (
                        <div className="absolute left-0 mt-1.5 w-48 bg-carbon-surface border border-carbon-border rounded-lg shadow-xl py-1 text-xs text-carbon-text-primary z-50">
                            <button
                                onClick={() => { setMenuOpen(false); onNewFile(); }}
                                className="w-full text-left px-3 py-2 hover:bg-carbon-elevated flex items-center justify-between"
                            >
                                <span>New File</span>
                                <span className="text-carbon-text-muted font-mono text-[10px]">Ctrl+N</span>
                            </button>
                            {onNewProject && (
                                <button
                                    onClick={() => { setMenuOpen(false); onNewProject(); }}
                                    className="w-full text-left px-3 py-2 hover:bg-carbon-elevated flex items-center justify-between text-carbon-accent font-medium"
                                >
                                    <span>New Project...</span>
                                    <span className="text-carbon-accent/80 font-mono text-[10px]">Ctrl+Shift+N</span>
                                </button>
                            )}
                            <button
                                onClick={() => { setMenuOpen(false); onOpenFile(); }}
                                className="w-full text-left px-3 py-2 hover:bg-carbon-elevated flex items-center justify-between"
                            >
                                <span>Open File...</span>
                                <span className="text-carbon-text-muted font-mono text-[10px]">Ctrl+O</span>
                            </button>
                            <button
                                onClick={() => { setMenuOpen(false); onSave(); }}
                                className="w-full text-left px-3 py-2 hover:bg-carbon-elevated flex items-center justify-between"
                            >
                                <span>Save</span>
                                <span className="text-carbon-text-muted font-mono text-[10px]">Ctrl+S</span>
                            </button>
                            <div className="my-1 border-t border-carbon-border" />
                            {onOpenSettings && (
                                <button
                                    onClick={() => { setMenuOpen(false); onOpenSettings(); }}
                                    className="w-full text-left px-3 py-2 hover:bg-carbon-elevated flex items-center justify-between"
                                >
                                    <span>Settings</span>
                                    <span className="text-carbon-text-muted font-mono text-[10px]">Ctrl+,</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* CarbonCode Logo & Brand */}
                <div className="flex items-center gap-2 mr-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-carbon-accent to-carbon-accent-secondary flex items-center justify-center shadow-glow">
                        <span className="text-white text-xs font-mono font-bold tracking-tighter">&lt;/&gt;</span>
                    </div>
                    <span className="text-carbon-text-primary font-semibold text-sm tracking-tight hidden sm:inline">CarbonCode</span>
                </div>

                {/* Primary Quick Actions: New, Open, Save */}
                <div className="flex items-center gap-1.5">
                    {/* New */}
                    <button
                        onClick={onNewFile}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-carbon-surface border border-carbon-border text-xs text-carbon-text-primary hover:text-white hover:border-carbon-accent/60 hover:bg-carbon-elevated transition-all"
                        title="New File (Ctrl+N)"
                    >
                        <svg className="w-3.5 h-3.5 text-carbon-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="font-medium">New</span>
                    </button>

                    {/* Open */}
                    <button
                        onClick={onOpenFile}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-carbon-surface border border-carbon-border text-xs text-carbon-text-primary hover:text-white hover:border-carbon-accent/60 hover:bg-carbon-elevated transition-all"
                        title="Open File (Ctrl+O)"
                    >
                        <svg className="w-3.5 h-3.5 text-carbon-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                        </svg>
                        <span className="font-medium">Open</span>
                    </button>

                    {/* Save */}
                    <button
                        onClick={onSave}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-carbon-surface border border-carbon-border text-xs text-carbon-text-primary hover:text-white hover:border-carbon-accent/60 hover:bg-carbon-elevated transition-all"
                        title="Save File (Ctrl+S)"
                    >
                        <svg className="w-3.5 h-3.5 text-carbon-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                        </svg>
                        <span className="font-medium">Save</span>
                    </button>
                </div>
            </div>

            {/* Center Section: Language & Standard selectors */}
            <div className="flex items-center gap-3">
                {/* Language Selector */}
                <div className="flex items-center gap-1.5">
                    <span className="text-xs text-carbon-text-muted hidden md:inline">Language</span>
                    <div className="relative">
                        <select
                            value={language}
                            onChange={(e) => onLanguageChange?.(e.target.value as SupportedLanguage)}
                            className="appearance-none bg-carbon-surface border border-carbon-border rounded-md px-2.5 py-1 pr-6 text-xs text-carbon-text-primary font-medium cursor-pointer hover:border-carbon-accent focus:border-carbon-accent outline-none transition-all"
                        >
                            <option value="python">Python</option>
                            <option value="cpp">C++</option>
                            <option value="c">C</option>
                            <option value="java">Java</option>
                            <option value="plaintext">Text</option>
                        </select>
                        <svg className="w-3 h-3 text-carbon-text-muted absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>

                {/* Standard Selector */}
                {language === 'plaintext' ? (
                    <div className="text-[11px] text-carbon-text-muted hidden sm:inline px-2 py-0.5 rounded bg-carbon-surface border border-carbon-border-subtle flex items-center gap-1.5">
                        <svg className="w-3 h-3 text-carbon-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Plain Text</span>
                    </div>
                ) : language === 'cpp' ? (
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs text-carbon-text-muted hidden md:inline">Standard</span>
                        <div className="relative group">
                            <select
                                value={cppStandard}
                                onChange={(e) => onCppStandardChange(e.target.value as CppStandard)}
                                className="appearance-none bg-carbon-surface border border-carbon-border rounded-md px-2.5 py-1 pr-6 text-xs text-carbon-text-primary font-mono cursor-pointer hover:border-carbon-accent focus:border-carbon-accent outline-none transition-all"
                            >
                                <option value="c++11">C++11</option>
                                <option value="c++14">C++14</option>
                                <option value="c++17">C++17</option>
                                <option value="c++20">C++20</option>
                                <option value="c++23">C++23</option>
                            </select>
                            <svg className="w-3 h-3 text-carbon-text-muted absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                            {/* Standard Tooltip */}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 px-2.5 py-1.5 bg-carbon-elevated border border-carbon-border rounded shadow-lg text-[11px] text-carbon-text-secondary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                {standardDescriptions[cppStandard]}
                            </div>
                        </div>
                    </div>
                ) : language === 'c' ? (
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs text-carbon-text-muted hidden md:inline">Standard</span>
                        <div className="relative group">
                            <select
                                value={cStandard}
                                onChange={(e) => onCStandardChange?.(e.target.value as CStandard)}
                                className="appearance-none bg-carbon-surface border border-carbon-border rounded-md px-2.5 py-1 pr-6 text-xs text-carbon-text-primary font-mono cursor-pointer hover:border-carbon-accent focus:border-carbon-accent outline-none transition-all"
                            >
                                <option value="c99">C99</option>
                                <option value="c11">C11</option>
                                <option value="c17">C17</option>
                                <option value="c23">C23</option>
                            </select>
                            <svg className="w-3 h-3 text-carbon-text-muted absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                            {/* Standard Tooltip */}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 px-2.5 py-1.5 bg-carbon-elevated border border-carbon-border rounded shadow-lg text-[11px] text-carbon-text-secondary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                {cStandardDescriptions[cStandard]}
                            </div>
                        </div>
                    </div>
                ) : language === 'python' ? (
                    <div className="text-[11px] text-carbon-text-muted hidden sm:inline px-2 py-0.5 rounded bg-carbon-surface border border-carbon-border-subtle">
                        Python 3 runner
                    </div>
                ) : (
                    <div className="text-[11px] text-carbon-text-muted hidden sm:inline px-2 py-0.5 rounded bg-carbon-surface border border-carbon-border-subtle">
                        JDK compile & run
                    </div>
                )}
            </div>

            {/* Right Section: Console Mode & Prominent Run Button */}
            <div className="flex items-center gap-2">
                {/* Console Mode Switcher (Integrated Panel vs Dev-C++ External CMD) */}
                {onConsoleModeChange && (
                    <div className="relative" ref={cmdHintRef}>
                        <div
                            className="flex items-center bg-carbon-surface border border-carbon-border rounded-lg p-0.5 text-[11px] font-medium"
                            title="Execution Console Mode — Using cin or scanf? Switch to CMD Screen for a classic Dev-C++ popup"
                        >
                            <button
                                onClick={() => {
                                    onConsoleModeChange('integrated')
                                    dismissCmdHint()
                                }}
                                className={`px-2 py-1 rounded-md transition-all flex items-center gap-1 ${
                                    consoleMode === 'integrated'
                                        ? 'bg-carbon-elevated text-carbon-accent shadow-sm font-semibold'
                                        : 'text-carbon-text-muted hover:text-carbon-text-primary'
                                }`}
                                title="Run in Integrated Bottom/Right Panel"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                                <span className="hidden lg:inline">Panel</span>
                            </button>
                            <button
                                onClick={() => {
                                    onConsoleModeChange('external')
                                    dismissCmdHint()
                                }}
                                className={`px-2 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                                    consoleMode === 'external'
                                        ? 'bg-carbon-accent text-carbon-bg shadow-sm font-bold'
                                        : 'text-carbon-text-muted hover:text-carbon-text-primary'
                                }`}
                                title="Run in separate Dev-C++ CMD popup window (with interactive standard input & pause)"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <span>CMD Screen</span>
                            </button>
                        </div>

                        {/* First-Run Contextual Hint for CMD Screen */}
                        {showCmdHint && (
                            <div className="absolute top-full right-0 mt-2.5 z-50 w-72 p-3 rounded-xl bg-carbon-surface border border-carbon-accent/60 shadow-2xl text-xs animate-in fade-in slide-in-from-top-1 duration-200">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-start gap-2">
                                        <div className="w-5 h-5 rounded-md bg-carbon-accent/20 text-carbon-accent flex items-center justify-center shrink-0 mt-0.5 text-xs">
                                            💡
                                        </div>
                                        <div>
                                            <p className="font-semibold text-white text-[12px] tracking-tight">Using cin or scanf?</p>
                                            <p className="text-[11px] text-carbon-text-secondary mt-0.5 leading-relaxed">
                                                Switch to <strong className="text-carbon-accent">CMD Screen</strong> for an authentic Dev-C++ popup with interactive input.
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={dismissCmdHint}
                                        className="text-carbon-text-muted hover:text-white p-1 rounded-md hover:bg-carbon-elevated transition-colors shrink-0"
                                        title="Dismiss tip"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="mt-2.5 pt-2 border-t border-carbon-border/60 flex items-center justify-between text-[11px]">
                                    <button
                                        onClick={() => {
                                            onConsoleModeChange('external')
                                            dismissCmdHint()
                                        }}
                                        className="text-carbon-accent font-semibold hover:underline"
                                    >
                                        Switch to CMD Screen →
                                    </button>
                                    <button
                                        onClick={dismissCmdHint}
                                        className="text-carbon-text-muted hover:text-carbon-text-primary"
                                    >
                                        Got it
                                    </button>
                                </div>
                                {/* Pointer Arrow */}
                                <div className="absolute -top-1.5 right-8 w-3 h-3 bg-carbon-surface border-t border-l border-carbon-accent/60 rotate-45" />
                            </div>
                        )}
                    </div>
                )}

                {/* Auto-Update Notification Badge */}
                {updateInfo && (
                    <div className="flex items-center">
                        {updateInfo.status === 'update-available' && (
                            <button
                                onClick={onOpenSettings}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-carbon-accent/15 border border-carbon-accent/50 text-carbon-accent text-xs font-semibold hover:bg-carbon-accent/25 transition-all shadow-sm animate-pulse"
                                title={`CarbonCode ${updateInfo.newVersion || ''} is available. Click to open Settings and update.`}
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-carbon-accent" />
                                <span>Update Available</span>
                            </button>
                        )}
                        {updateInfo.status === 'downloading' && (
                            <div
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-carbon-surface border border-carbon-border text-xs text-carbon-text-primary shadow-sm"
                                title={`Downloading update: ${updateInfo.downloadPercent || 0}%`}
                            >
                                <div className="w-2.5 h-2.5 border-2 border-carbon-accent border-t-transparent rounded-full animate-spin" />
                                <span>Updating {updateInfo.downloadPercent || 0}%</span>
                            </div>
                        )}
                        {updateInfo.status === 'update-downloaded' && (
                            <button
                                onClick={() => window.electronAPI?.installUpdate?.()}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/60 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/30 transition-all shadow-glow"
                                title="Click to restart CarbonCode and apply the update now"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span>Restart to Update</span>
                            </button>
                        )}
                    </div>
                )}

                <button
                    onClick={onRun}
                    disabled={isCompiling || !hasCompiler || language === 'plaintext'}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-all shadow-md ${
                        language === 'plaintext'
                            ? 'bg-carbon-border/60 text-carbon-text-muted cursor-not-allowed opacity-60'
                            : isCompiling
                                ? 'bg-carbon-warning/80 cursor-wait'
                                : hasCompiler
                                    ? 'bg-gradient-to-r from-carbon-accent to-carbon-accent-secondary hover:from-carbon-accent-highlight hover:to-carbon-accent shadow-glow active:scale-95'
                                    : 'bg-carbon-border text-carbon-text-muted cursor-not-allowed'
                    }`}
                    title={
                        language === 'plaintext'
                            ? 'Text file (not executable) — switch to a code file to run'
                            : !hasCompiler
                                ? (language === 'python' ? 'No Python interpreter detected' : 'No compiler detected')
                                : consoleMode === 'external'
                                    ? 'Run in Separate Dev-C++ CMD Window (F5)'
                                    : (language === 'python' ? 'Run Python (F5)' : 'Compile & Run (F5)')
                    }
                >
                    {isCompiling ? (
                        <>
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>{language === 'python' ? 'Running...' : 'Compiling...'}</span>
                        </>
                    ) : (
                        <>
                            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                            <span>{consoleMode === 'external' ? 'Run (CMD)' : 'Run'}</span>
                        </>
                    )}
                </button>
            </div>
        </header>
    )
}

export default Toolbar
