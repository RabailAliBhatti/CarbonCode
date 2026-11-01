import React, { useState, useRef, useEffect, useMemo } from 'react'
import type { CompileError } from '../utils/parseCompileErrors'
import { OutputStyle, DosTheme, ConsoleMode } from '../hooks/useSettings'
import { ErrorTranslatorCard } from './ErrorTranslatorCard'
import { translateCompileError } from '../utils/errorTranslator'
import type { QuickFixAction, TranslatedError } from '../utils/errorTranslator'

interface CompilationResult {
    success: boolean
    output: string
    error: string
    compileTime?: number
    executionTime?: number
}

interface OutputPanelProps {
    result: CompilationResult | null
    isCompiling: boolean
    isRunning: boolean
    onInput: (data: string) => void
    onStop: () => void
    fontSize?: number
    onFontSizeChange?: (size: number) => void
    parsedErrors?: CompileError[]
    onErrorClick?: (file: string | null, line: number, column?: number) => void
    onClear?: () => void
    position?: 'bottom' | 'right'
    onTogglePosition?: () => void
    isMaximized?: boolean
    onToggleMaximize?: () => void
    outputStyle?: OutputStyle
    onOutputStyleChange?: (style: OutputStyle) => void
    dosTheme?: DosTheme
    onDosThemeChange?: (theme: DosTheme) => void
    consoleMode?: ConsoleMode
    onConsoleModeChange?: (mode: ConsoleMode) => void
    activeFileName?: string
    onApplyQuickFix?: (action: QuickFixAction) => void
    activeLanguage?: 'cpp' | 'c' | 'java' | 'python'
    currentCode?: string
}

const MAX_VISIBLE_LINES = 500

const DOS_THEMES: Record<DosTheme, {
    bg: string
    text: string
    prompt: string
    accent: string
    cursor: string
    border: string
    headerBg: string
    headerText: string
    divider: string
    name: string
}> = {
    classic: {
        bg: '#0C0C0C',
        text: '#CCCCCC',
        prompt: '#FFFFFF',
        accent: '#569CD6',
        cursor: '#CCCCCC',
        border: '#2D2D2D',
        headerBg: '#1A1A1A',
        headerText: '#E0E0E0',
        divider: '#444444',
        name: 'Classic CMD'
    },
    matrix: {
        bg: '#040F04',
        text: '#22EE22',
        prompt: '#55FF55',
        accent: '#00FF41',
        cursor: '#22EE22',
        border: '#0A330A',
        headerBg: '#081F08',
        headerText: '#33FF33',
        divider: '#0E440E',
        name: 'Matrix Green'
    },
    amber: {
        bg: '#0F0902',
        text: '#FFB000',
        prompt: '#FFCC33',
        accent: '#FFA500',
        cursor: '#FFB000',
        border: '#3D2400',
        headerBg: '#211405',
        headerText: '#FFB000',
        divider: '#4E3000',
        name: 'Retro Amber'
    },
    turboc: {
        bg: '#000080',
        text: '#FFFF55',
        prompt: '#FFFFFF',
        accent: '#00AAAA',
        cursor: '#FFFF55',
        border: '#0000B0',
        headerBg: '#000050',
        headerText: '#FFFFFF',
        divider: '#0055AA',
        name: 'Turbo C++'
    }
}

interface AnsiStyle {
    color?: string
    backgroundColor?: string
    fontWeight?: string
    fontStyle?: string
    textDecoration?: string
    opacity?: number
}

const ANSI_FG: Record<number, string> = {
    30: '#4e4e4e',
    31: '#f87171',
    32: '#4ade80',
    33: '#facc15',
    34: '#60a5fa',
    35: '#c084fc',
    36: '#22d3ee',
    37: '#f3f4f6',
    39: '',
    90: '#9ca3af',
    91: '#ef4444',
    92: '#22c55e',
    93: '#eab308',
    94: '#3b82f6',
    95: '#a855f7',
    96: '#06b6d4',
    97: '#ffffff',
}

const ANSI_BG: Record<number, string> = {
    40: '#1f2937',
    41: '#7f1d1d',
    42: '#14532d',
    43: '#713f12',
    44: '#1e3a8a',
    45: '#581c87',
    46: '#164e63',
    47: '#374151',
    49: '',
}

function parseAnsi(text: string): React.ReactNode {
    if (!text) return '\u00A0'
    if (!text.includes('\x1b[') && !text.includes('\u001b[')) {
        return text
    }

    // Strip non-color ANSI escape codes (e.g. cursor moves \x1b[2K, \x1b[?25h)
    const sanitized = text.replace(/\x1b\[[0-9;]*[A-Za-ln-z]/g, '')
    const regex = /\x1b\[([0-9;]*)m/g
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    let currentStyle: AnsiStyle = {}
    let match: RegExpExecArray | null
    let keyIdx = 0

    while ((match = regex.exec(sanitized)) !== null) {
        if (match.index > lastIndex) {
            const chunk = sanitized.slice(lastIndex, match.index)
            if (chunk) {
                parts.push(
                    <span key={keyIdx++} style={{ ...currentStyle }}>
                        {chunk}
                    </span>
                )
            }
        }

        const codes = match[1] ? match[1].split(';').map(n => parseInt(n, 10)) : [0]
        for (const code of codes) {
            if (code === 0) {
                currentStyle = {}
            } else if (code === 1) {
                currentStyle.fontWeight = 'bold'
            } else if (code === 2) {
                currentStyle.opacity = 0.7
            } else if (code === 3) {
                currentStyle.fontStyle = 'italic'
            } else if (code === 4) {
                currentStyle.textDecoration = 'underline'
            } else if (code === 22) {
                delete currentStyle.fontWeight
                delete currentStyle.opacity
            } else if (code === 23) {
                delete currentStyle.fontStyle
            } else if (code === 24) {
                delete currentStyle.textDecoration
            } else if (ANSI_FG[code] !== undefined) {
                if (ANSI_FG[code]) {
                    currentStyle.color = ANSI_FG[code]
                } else {
                    delete currentStyle.color
                }
            } else if (ANSI_BG[code] !== undefined) {
                if (ANSI_BG[code]) {
                    currentStyle.backgroundColor = ANSI_BG[code]
                } else {
                    delete currentStyle.backgroundColor
                }
            }
        }

        lastIndex = regex.lastIndex
    }

    if (lastIndex < sanitized.length) {
        const remaining = sanitized.slice(lastIndex)
        if (remaining) {
            parts.push(
                <span key={keyIdx++} style={{ ...currentStyle }}>
                    {remaining}
                </span>
            )
        }
    }

    return parts.length > 0 ? parts : (sanitized || '\u00A0')
}

export const OutputPanel: React.FC<OutputPanelProps> = ({
    result,
    isCompiling,
    isRunning,
    onInput,
    onStop,
    fontSize = 13,
    onFontSizeChange,
    parsedErrors = [],
    onErrorClick,
    onClear,
    position = 'bottom',
    onTogglePosition,
    isMaximized = false,
    onToggleMaximize,
    outputStyle = 'modern',
    onOutputStyleChange,
    dosTheme = 'classic',
    onDosThemeChange,
    consoleMode = 'integrated',
    onConsoleModeChange: _onConsoleModeChange,
    activeFileName = 'main.exe',
    onApplyQuickFix,
    activeLanguage,
    currentCode
}) => {
    const [activeTab, setActiveTab] = useState<'output' | 'errors'>('output')
    const [errorViewMode, setErrorViewMode] = useState<'translated' | 'compact'>('translated')
    const [inputValue, setInputValue] = useState('')
    const [cursorPos, setCursorPos] = useState(0)
    const [dosAcknowledged, setDosAcknowledged] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)
    const outputRef = useRef<HTMLDivElement>(null)

    const hasOutput = result?.output && result.output.trim().length > 0
    const hasErrors = result?.error && result.error.trim().length > 0
    const isDos = outputStyle === 'dos'
    const theme = DOS_THEMES[dosTheme] || DOS_THEMES.classic

    // Translate errors into friendly explanations
    const translatedErrors = useMemo<TranslatedError[]>(() => {
        if (parsedErrors && parsedErrors.length > 0) {
            return parsedErrors.map(err => translateCompileError(err, currentCode, activeLanguage))
        }
        if (result?.error && result.error.trim().length > 0) {
            return [
                translateCompileError(
                    {
                        file: activeFileName || null,
                        line: 1,
                        severity: 'error',
                        message: result.error.trim(),
                        raw: result.error.trim()
                    },
                    currentCode,
                    activeLanguage
                )
            ]
        }
        return []
    }, [parsedErrors, result?.error, currentCode, activeLanguage, activeFileName])

    // Auto-switch to errors tab if there are errors and no output
    const effectiveTab = hasErrors && !hasOutput && !isRunning ? 'errors' : activeTab

    // Reset DOS acknowledged state when running changes
    useEffect(() => {
        if (isRunning) {
            setDosAcknowledged(false)
        }
    }, [isRunning])

    // Virtualize output
    const { visibleLines, totalLines, startIndex } = useMemo(() => {
        if (!result?.output) return { visibleLines: [], totalLines: 0, startIndex: 0 }
        const lines = result.output.split('\n')
        const total = lines.length
        if (total <= MAX_VISIBLE_LINES) {
            return { visibleLines: lines, totalLines: total, startIndex: 0 }
        }
        const start = total - MAX_VISIBLE_LINES
        return { visibleLines: lines.slice(start), totalLines: total, startIndex: start }
    }, [result?.output])

    useEffect(() => {
        if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight
        }
    }, [result?.output, inputValue, isRunning])

    useEffect(() => {
        if (isRunning) {
            const timer = setTimeout(() => {
                inputRef.current?.focus()
            }, 30)
            return () => clearTimeout(timer)
        } else {
            setInputValue('')
            setCursorPos(0)
        }
    }, [isRunning])

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value)
        setCursorPos(e.target.selectionStart ?? e.target.value.length)
    }

    const handleInputSelect = (e: React.SyntheticEvent<HTMLInputElement>) => {
        const target = e.target as HTMLInputElement
        setCursorPos(target.selectionStart ?? target.value.length)
    }

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            const toSend = inputValue + '\n'
            onInput(toSend)
            setInputValue('')
            setCursorPos(0)
            return
        }

        if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
            const selection = window.getSelection()
            if (!selection || selection.toString().length === 0) {
                e.preventDefault()
                onStop()
                return
            }
        }

        setTimeout(() => {
            if (inputRef.current) {
                setCursorPos(inputRef.current.selectionStart ?? inputRef.current.value.length)
            }
        }, 0)
    }

    const handleTerminalClick = () => {
        const selection = window.getSelection()
        if (selection && selection.toString().length > 0) {
            return
        }
        if (isRunning && inputRef.current) {
            inputRef.current.focus()
            setCursorPos(inputRef.current.selectionStart ?? inputRef.current.value.length)
        } else if (isDos && result && !isRunning && !dosAcknowledged) {
            setDosAcknowledged(true)
        }
    }

    // Format execution duration
    const totalTimeSeconds = useMemo(() => {
        if (!result) return null
        const compile = result.compileTime || 0
        const exec = result.executionTime || 0
        const totalMs = compile + exec
        if (totalMs > 0) {
            return (totalMs / 1000).toFixed(3) + ' seconds'
        }
        return '0.000 seconds'
    }, [result])

    return (
        <div className="h-full flex flex-col bg-carbon-surface border border-carbon-border rounded-xl shadow-card overflow-hidden select-none">
            {/* Panel Header */}
            <div className="h-9 px-3 flex items-center justify-between border-b border-carbon-border bg-carbon-surface shrink-0 gap-2 whitespace-nowrap overflow-x-auto select-none">
                {/* Left Tabs & Mode Controls */}
                <div className="flex items-center gap-1.5 shrink-0">
                    {/* Output Tab */}
                    <button
                        onClick={() => setActiveTab('output')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                            effectiveTab === 'output'
                                ? 'bg-carbon-elevated text-carbon-text-primary border border-carbon-border shadow-xs'
                                : 'text-carbon-text-secondary hover:text-carbon-text-primary hover:bg-carbon-elevated/40'
                        }`}
                    >
                        <svg className="w-3.5 h-3.5 text-carbon-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>Output</span>
                        {hasOutput && <span className="w-1.5 h-1.5 rounded-full bg-carbon-success" />}
                    </button>

                    {/* Errors Tab */}
                    <button
                        onClick={() => setActiveTab('errors')}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                            effectiveTab === 'errors'
                                ? 'bg-carbon-elevated text-carbon-text-primary border border-carbon-border shadow-xs'
                                : 'text-carbon-text-secondary hover:text-carbon-text-primary hover:bg-carbon-elevated/40'
                        }`}
                    >
                        <svg className="w-3.5 h-3.5 text-carbon-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>Errors</span>
                        {hasErrors && <span className="w-1.5 h-1.5 rounded-full bg-carbon-error" />}
                    </button>

                    {/* Explanations vs Compact View Toggle (active when on Errors tab) */}
                    {effectiveTab === 'errors' && hasErrors && (
                        <div className="flex items-center bg-carbon-bg border border-carbon-border/70 rounded-md p-0.5 ml-1">
                            <button
                                onClick={() => setErrorViewMode('translated')}
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all flex items-center gap-1 ${
                                    errorViewMode === 'translated'
                                        ? 'bg-carbon-accent text-white shadow-xs'
                                        : 'text-carbon-text-muted hover:text-carbon-text-primary'
                                }`}
                                title="Show plain-English friendly error cards with 1-click fixes"
                            >
                                <span>💡 Explanations</span>
                            </button>
                            <button
                                onClick={() => setErrorViewMode('compact')}
                                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                                    errorViewMode === 'compact'
                                        ? 'bg-carbon-elevated text-carbon-text-primary shadow-xs'
                                        : 'text-carbon-text-muted hover:text-carbon-text-primary'
                                }`}
                                title="Show compact compiler log"
                            >
                                <span>📋 Compact</span>
                            </button>
                        </div>
                    )}

                    {/* Format Toggle (Modern vs DOS) */}
                    {onOutputStyleChange && (
                        <button
                            onClick={() => onOutputStyleChange(outputStyle === 'dos' ? 'modern' : 'dos')}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono transition-all cursor-pointer ${
                                isDos
                                    ? 'bg-carbon-elevated text-carbon-accent border border-carbon-border font-semibold'
                                    : 'text-carbon-text-muted hover:text-carbon-text-primary hover:bg-carbon-elevated/60'
                            }`}
                            title="Toggle DOS / Dev-C++ visual style inside panel"
                        >
                            <span>{isDos ? '📟 DOS Theme' : '⚡ Modern'}</span>
                        </button>
                    )}

                    {/* DOS Theme Selector */}
                    {isDos && onDosThemeChange && (
                        <select
                            value={dosTheme}
                            onChange={(e) => onDosThemeChange(e.target.value as DosTheme)}
                            className="bg-carbon-bg border border-carbon-border rounded px-1.5 py-0.5 text-[11px] font-mono text-carbon-text-secondary hover:text-carbon-text-primary outline-none cursor-pointer"
                            title="DOS Color Palette"
                        >
                            <option value="classic">Classic CMD</option>
                            <option value="matrix">Matrix Green</option>
                            <option value="amber">Retro Amber</option>
                            <option value="turboc">Turbo C++</option>
                        </select>
                    )}
                </div>

                {/* Right Header Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                    {/* Running status indicator / Stop button */}
                    {isRunning && (
                        <div className="flex items-center gap-1.5 mr-1">
                            <span className="w-2 h-2 rounded-full bg-carbon-success animate-ping" />
                            <button
                                onClick={onStop}
                                className="px-2 py-0.5 rounded bg-carbon-error/20 text-carbon-error hover:bg-carbon-error/30 text-[11px] font-medium transition-colors"
                                title="Stop Program"
                            >
                                Stop
                            </button>
                        </div>
                    )}

                    {/* Font Size controls (A- / A+) */}
                    {onFontSizeChange && (
                        <div className="flex items-center border border-carbon-border/80 rounded-md bg-carbon-bg/60 p-0.5" title="Output Font Size">
                            <button
                                onClick={() => onFontSizeChange(Math.max(10, fontSize - 1))}
                                className="px-1.5 py-0.5 text-[11px] font-semibold text-carbon-text-muted hover:text-carbon-text-primary hover:bg-carbon-elevated rounded transition-colors"
                                title="Decrease Output Font Size (A-)"
                            >
                                A-
                            </button>
                            <span className="text-[10px] font-mono text-carbon-text-secondary px-1 select-none min-w-[20px] text-center">
                                {fontSize}
                            </span>
                            <button
                                onClick={() => onFontSizeChange(Math.min(24, fontSize + 1))}
                                className="px-1.5 py-0.5 text-[11px] font-semibold text-carbon-text-muted hover:text-carbon-text-primary hover:bg-carbon-elevated rounded transition-colors"
                                title="Increase Output Font Size (A+)"
                            >
                                A+
                            </button>
                        </div>
                    )}

                    {/* Maximize / Restore button */}
                    {onToggleMaximize && (
                        <button
                            onClick={onToggleMaximize}
                            className="p-1 text-carbon-text-muted hover:text-carbon-text-primary hover:bg-carbon-elevated rounded transition-colors"
                            title={isMaximized ? "Restore Output Size" : "Maximize Output Panel"}
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {isMaximized ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 14h6m0 0v6m0-6L3 21m17-7h-6m0 0v6m0-6l7 7M14 4h6m0 0v6m0-6l-7 7M4 10h6m0 0V4m0 6L3 3" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                )}
                            </svg>
                        </button>
                    )}

                    {/* Position Toggle button */}
                    {onTogglePosition && (
                        <button
                            onClick={onTogglePosition}
                            className="p-1 text-carbon-text-muted hover:text-carbon-text-primary hover:bg-carbon-elevated rounded transition-colors"
                            title={`Dock panel to ${position === 'bottom' ? 'right side' : 'bottom'}`}
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {position === 'bottom' ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                )}
                            </svg>
                        </button>
                    )}

                    {/* Clear button */}
                    {onClear && (
                        <button
                            onClick={onClear}
                            className="p-1 text-carbon-text-muted hover:text-carbon-text-primary hover:bg-carbon-elevated rounded transition-colors"
                            title="Clear Output"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* Optional Retro DOS Window Titlebar when in DOS mode */}
            {isDos && (
                <div
                    className="h-6 px-3 flex items-center justify-between border-b text-[11px] font-mono select-none shrink-0"
                    style={{ backgroundColor: theme.headerBg, borderColor: theme.border, color: theme.headerText }}
                >
                    <div className="flex items-center gap-2">
                        <svg className="w-3.5 h-3.5 opacity-90" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm2-1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H2z"/>
                            <path d="M3.5 4.5h9v1h-9v-1zm0 3h9v1h-9v-1zm0 3h5v1h-5v-1z"/>
                        </svg>
                        <span className="font-semibold tracking-wide truncate">
                            {dosTheme === 'turboc' ? 'Turbo C++ IDE Console' : `Command Prompt - ${activeFileName}`}
                        </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs opacity-75 font-sans">
                        <span className="hover:opacity-100 cursor-pointer">_</span>
                        <span className="hover:opacity-100 cursor-pointer">□</span>
                        <span className="hover:opacity-100 cursor-pointer">✕</span>
                    </div>
                </div>
            )}

            {/* Interactive Output Stream Area */}
            <div
                ref={outputRef}
                onClick={handleTerminalClick}
                tabIndex={isDos && result && !isRunning ? 0 : undefined}
                onKeyDown={() => {
                    if (isDos && result && !isRunning && !dosAcknowledged) {
                        setDosAcknowledged(true)
                    }
                }}
                className={`flex-1 overflow-y-auto p-3.5 font-mono select-text leading-relaxed scrollbar-thin relative outline-none ${
                    isRunning ? 'cursor-text' : ''
                } ${isDos ? 'font-mono' : ''}`}
                style={{
                    fontSize: `${fontSize}px`,
                    backgroundColor: isDos ? theme.bg : undefined,
                    color: isDos ? theme.text : undefined,
                    fontFamily: isDos ? "'Cascadia Mono', 'Consolas', 'Courier New', 'Lucida Console', monospace" : undefined
                }}
            >
                {/* Hidden input to capture stdin keystrokes when program is running */}
                {isRunning && (
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={handleInputChange}
                        onSelect={handleInputSelect}
                        onKeyDown={handleInputKeyDown}
                        className="absolute opacity-0 pointer-events-none w-0 h-0 -z-10"
                        autoFocus
                        tabIndex={-1}
                        aria-label="Terminal Input"
                    />
                )}

                {isCompiling ? (
                    <div className="flex items-center gap-2.5 text-carbon-warning text-xs">
                        <div className="w-3.5 h-3.5 border-2 border-carbon-warning border-t-transparent rounded-full animate-spin" />
                        <span>Compiling project...</span>
                    </div>
                ) : result || isRunning ? (
                    effectiveTab === 'output' ? (
                        <>
                            {/* External Console Mode Status Notice */}
                            {consoleMode === 'external' && isRunning && (
                                <div className="p-3 mb-3 rounded-lg border border-carbon-accent/40 bg-carbon-accent/10 flex items-start gap-3">
                                    <div className="w-7 h-7 rounded-lg bg-carbon-accent/20 flex items-center justify-center shrink-0 text-carbon-accent mt-0.5">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1 text-xs">
                                        <div className="font-semibold text-carbon-accent flex items-center gap-2">
                                            <span>Active in Dev-C++ Command Prompt Window</span>
                                            <span className="w-2 h-2 rounded-full bg-carbon-success animate-ping" />
                                        </div>
                                        <div className="text-carbon-text-secondary text-[11px] mt-0.5">
                                            A separate native Windows CMD screen is open. Type your input (cin / scanf / input) and view interactive output in that window.
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* DOS Banner & Command Prompt */}
                            {isDos && (
                                <div className="mb-2 select-none" style={{ color: theme.prompt }}>
                                    <div className="opacity-80">Microsoft Windows [Version 10.0.26200]</div>
                                    <div className="opacity-80">(c) Microsoft Corporation. All rights reserved.</div>
                                    <div className="mt-2 font-bold flex items-center gap-1.5" style={{ color: theme.accent }}>
                                        <span>C:\CarbonCode\Workspace&gt;</span>
                                        <span style={{ color: theme.prompt }}>{activeFileName}</span>
                                    </div>
                                </div>
                            )}

                            {/* Program Output Lines */}
                            {hasOutput || isRunning ? (
                                <div className="whitespace-pre-wrap break-words">
                                    {totalLines > MAX_VISIBLE_LINES && (
                                        <div className="text-carbon-text-muted text-[11px] italic mb-2">
                                            Showing last {MAX_VISIBLE_LINES} of {totalLines} lines
                                        </div>
                                    )}
                                    {(() => {
                                        const displayLines = visibleLines.length === 0 && isRunning ? [''] : visibleLines
                                        const textBeforeCursor = inputValue.slice(0, cursorPos)
                                        const textAfterCursor = inputValue.slice(cursorPos)

                                        return displayLines.map((line, i) => {
                                            const isLast = i === displayLines.length - 1
                                            if (isLast && isRunning) {
                                                return (
                                                    <div key={startIndex + i} className="min-h-[1.4em]">
                                                        <span>{parseAnsi(line)}</span>
                                                        <span className="font-medium" style={{ color: isDos ? theme.prompt : undefined }}>
                                                            {textBeforeCursor}
                                                        </span>
                                                        <span
                                                            className={isDos ? "inline-block w-2 h-4 align-middle animate-pulse ml-0.5" : "terminal-cursor"}
                                                            style={isDos ? { backgroundColor: theme.cursor } : undefined}
                                                        />
                                                        <span className="font-medium" style={{ color: isDos ? theme.prompt : undefined }}>
                                                            {textAfterCursor}
                                                        </span>
                                                    </div>
                                                )
                                            }
                                            return (
                                                <div key={startIndex + i} className="min-h-[1.4em]">
                                                    {parseAnsi(line)}
                                                </div>
                                            )
                                        })
                                    })()}
                                </div>
                            ) : (
                                !isDos && (
                                    <div className="text-carbon-text-muted text-xs italic">
                                        {result?.success
                                            ? 'Program completed with no output.'
                                            : 'No output. Check the Errors tab for details.'
                                        }
                                    </div>
                                )
                            )}

                            {/* Program Exit Status Indicator */}
                            {result && !isCompiling && !isRunning && (
                                isDos ? (
                                    /* Classic Dev-C++ / DOS Console Exit Signature */
                                    <div className="mt-4 pt-2 select-none font-mono" style={{ color: theme.text }}>
                                        <div className="opacity-60">--------------------------------</div>
                                        <div className="mt-1 font-semibold" style={{ color: result.success ? (dosTheme === 'matrix' ? '#33FF33' : '#55FF55') : '#FF6666' }}>
                                            Process exited after {totalTimeSeconds} with return value {result.success ? 0 : 1}
                                        </div>
                                        {!dosAcknowledged ? (
                                            <div className="mt-2 flex items-center gap-1 opacity-90 animate-pulse" style={{ color: theme.prompt }}>
                                                <span>Press any key to continue . . .</span>
                                                <span className="inline-block w-2 h-3.5 align-middle" style={{ backgroundColor: theme.cursor }} />
                                            </div>
                                        ) : (
                                            <div className="mt-2 text-xs opacity-60 italic">
                                                Ready for next execution. Press F5 to run again.
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    /* Modern Carbon Status Indicator */
                                    <div className={`mt-4 pt-3 border-t border-carbon-border/60 flex items-center justify-between select-none ${
                                        result.success ? 'text-carbon-success' : 'text-carbon-error'
                                    }`}>
                                        <div className="flex items-center gap-2 text-xs font-medium">
                                            {result.success ? (
                                                <>
                                                    <svg className="w-4 h-4 text-carbon-success shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    <span>Program executed successfully</span>
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="w-4 h-4 text-carbon-error shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                    <span>Execution failed</span>
                                                </>
                                            )}
                                        </div>

                                        {totalTimeSeconds && (
                                            <span className="font-mono text-[11px] text-carbon-text-muted">{totalTimeSeconds}</span>
                                        )}
                                    </div>
                                )
                            )}
                        </>
                    ) : (
                        hasErrors ? (
                            errorViewMode === 'translated' && translatedErrors.length > 0 ? (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-xs text-carbon-text-muted pb-1 border-b border-carbon-border/50">
                                        <span className="flex items-center gap-1.5 font-medium text-carbon-text-primary">
                                            <span>💡</span>
                                            <span>Human-Readable Error Explanations ({translatedErrors.length})</span>
                                        </span>
                                        <button
                                            onClick={() => setErrorViewMode('compact')}
                                            className="text-[11px] text-carbon-text-muted hover:text-carbon-accent transition-colors"
                                        >
                                            Switch to Compact Log
                                        </button>
                                    </div>
                                    {translatedErrors.map((err, i) => (
                                        <ErrorTranslatorCard
                                            key={i}
                                            error={err}
                                            onJumpToLine={onErrorClick}
                                            onApplyQuickFix={onApplyQuickFix}
                                        />
                                    ))}
                                </div>
                            ) : parsedErrors.length > 0 ? (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-xs text-carbon-text-muted pb-1 border-b border-carbon-border/50">
                                        <span className="font-medium text-carbon-text-primary">
                                            Compact Error Log ({parsedErrors.length})
                                        </span>
                                        <button
                                            onClick={() => setErrorViewMode('translated')}
                                            className="text-[11px] text-carbon-accent hover:underline flex items-center gap-1"
                                        >
                                            <span>💡</span>
                                            <span>Show Friendly Explanations</span>
                                        </button>
                                    </div>
                                    {parsedErrors.map((err, i) => {
                                        const isClickable = err.file !== null || err.line > 0
                                        const isError = err.severity === 'error'
                                        return (
                                            <button
                                                key={i}
                                                onClick={() => {
                                                    if (isClickable && onErrorClick) {
                                                        onErrorClick(err.file, err.line, err.column)
                                                    }
                                                }}
                                                disabled={!isClickable}
                                                className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all ${
                                                    isError
                                                        ? 'border-carbon-error/40 bg-carbon-error/10 hover:bg-carbon-error/20'
                                                        : 'border-carbon-warning/40 bg-carbon-warning/10 hover:bg-carbon-warning/20'
                                                } ${!isClickable ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                                            >
                                                <div className="flex items-center justify-between font-mono text-[11px] text-carbon-text-muted mb-1">
                                                    <span>{err.file ? err.file.split(/[/\\]/).pop() : 'compile'}</span>
                                                    <span>Line {err.line}{err.column ? `:${err.column}` : ''}</span>
                                                </div>
                                                <div className="text-carbon-text-primary">{err.message}</div>
                                            </button>
                                        )
                                    })}
                                </div>
                            ) : (
                                <pre className="text-carbon-error text-xs whitespace-pre-wrap break-words">
                                    {result.error}
                                </pre>
                            )
                        ) : (
                            <div className="text-carbon-success text-xs flex items-center gap-2">
                                <svg className="w-4 h-4 text-carbon-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <span>No errors found!</span>
                            </div>
                        )
                    )
                ) : (
                    <div className="h-full flex items-center justify-center text-carbon-text-muted text-xs italic">
                        <span>Press <kbd className="px-1.5 py-0.5 rounded bg-carbon-surface border border-carbon-border text-[11px] font-mono text-carbon-text-primary">F5</kbd> or click Run to execute code</span>
                    </div>
                )}
            </div>
        </div>
    )
}

export default OutputPanel
