import React, { useState, useRef, useEffect } from 'react'
import { SupportedLanguage } from '../types/language'
import { CStandard } from '../hooks/useSettings'

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
    onOpenFile: () => void
    onSave: () => void
    isCompiling: boolean
    hasCompiler: boolean
    onOpenSettings?: () => void
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
    onOpenFile,
    onSave,
    isCompiling,
    hasCompiler,
    onOpenSettings
}) => {
    const [menuOpen, setMenuOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

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
                        <svg className="w-3.5 h-3.5 text-carbon-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

            {/* Right Section: Prominent Run Button */}
            <div className="flex items-center gap-2">
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
                            <span>Run</span>
                        </>
                    )}
                </button>
            </div>
        </header>
    )
}

export default Toolbar
