import React, { useState, useRef, useEffect, useMemo } from 'react'
import type { CompileError } from '../utils/parseCompileErrors'

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
    parsedErrors?: CompileError[]
    onErrorClick?: (file: string | null, line: number, column?: number) => void
    onClear?: () => void
}

const MAX_VISIBLE_LINES = 500

export const OutputPanel: React.FC<OutputPanelProps> = ({
    result,
    isCompiling,
    isRunning,
    onInput,
    onStop,
    fontSize = 13,
    parsedErrors = [],
    onErrorClick,
    onClear
}) => {
    const [activeTab, setActiveTab] = useState<'output' | 'errors'>('output')
    const [inputValue, setInputValue] = useState('')
    const [cursorPos, setCursorPos] = useState(0)
    const inputRef = useRef<HTMLInputElement>(null)
    const outputRef = useRef<HTMLDivElement>(null)

    const hasOutput = result?.output && result.output.trim().length > 0
    const hasErrors = result?.error && result.error.trim().length > 0

    // Auto-switch to errors tab if there are errors and no output
    const effectiveTab = hasErrors && !hasOutput && !isRunning ? 'errors' : activeTab

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
    }, [result?.output, inputValue])

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
        }
    }

    // Format execution duration
    const totalTimeSeconds = useMemo(() => {
        if (!result) return null
        const compile = result.compileTime || 0
        const exec = result.executionTime || 0
        const totalMs = compile + exec
        if (totalMs > 0) {
            return (totalMs / 1000).toFixed(2) + 's'
        }
        return null
    }, [result])

    return (
        <div className="h-full flex flex-col bg-carbon-surface border border-carbon-border rounded-xl shadow-card overflow-hidden select-none">
            {/* Panel Header */}
            <div className="h-10 px-3 flex items-center justify-between border-b border-carbon-border bg-carbon-surface shrink-0">
                {/* Tabs */}
                <div className="flex items-center gap-1">
                    {/* Output Tab */}
                    <button
                        onClick={() => setActiveTab('output')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            effectiveTab === 'output'
                                ? 'bg-carbon-elevated text-carbon-text-primary border border-carbon-border'
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
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            effectiveTab === 'errors'
                                ? 'bg-carbon-elevated text-carbon-text-primary border border-carbon-border'
                                : 'text-carbon-text-secondary hover:text-carbon-text-primary hover:bg-carbon-elevated/40'
                        }`}
                    >
                        <svg className="w-3.5 h-3.5 text-carbon-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>Errors</span>
                        {hasErrors && <span className="w-1.5 h-1.5 rounded-full bg-carbon-error" />}
                    </button>
                </div>

                {/* Right Header Actions */}
                <div className="flex items-center gap-2">
                    {/* Running status indicator / Stop button */}
                    {isRunning && (
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-carbon-success animate-ping" />
                            <button
                                onClick={onStop}
                                className="px-2 py-0.5 rounded bg-carbon-error/20 text-carbon-error hover:bg-carbon-error/30 text-xs font-medium transition-colors"
                                title="Stop Program"
                            >
                                Stop
                            </button>
                        </div>
                    )}

                    {/* Clear button */}
                    {onClear && (
                        <button
                            onClick={onClear}
                            className="flex items-center gap-1 px-2 py-1 text-xs text-carbon-text-muted hover:text-carbon-text-primary hover:bg-carbon-elevated rounded transition-colors"
                            title="Clear Output"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span>Clear</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Monospace Interactive Output Stream */}
            <div
                ref={outputRef}
                onClick={handleTerminalClick}
                className={`flex-1 overflow-y-auto p-3.5 font-mono bg-carbon-bg text-carbon-text-primary select-text leading-relaxed scrollbar-thin relative ${
                    isRunning ? 'cursor-text' : ''
                }`}
                style={{ fontSize: `${fontSize}px` }}
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
                ) : result ? (
                    effectiveTab === 'output' ? (
                        <>
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
                                                        <span>{line}</span>
                                                        <span className="text-carbon-accent-highlight font-medium">{textBeforeCursor}</span>
                                                        <span className="terminal-cursor" />
                                                        <span className="text-carbon-accent-highlight font-medium">{textAfterCursor}</span>
                                                    </div>
                                                )
                                            }
                                            return (
                                                <div key={startIndex + i} className="min-h-[1.4em]">
                                                    {line || '\u00A0'}
                                                </div>
                                            )
                                        })
                                    })()}
                                </div>
                            ) : (
                                <div className="text-carbon-text-muted text-xs italic">
                                    {result.success
                                        ? 'Program completed with no output.'
                                        : 'No output. Check the Errors tab for details.'
                                    }
                                </div>
                            )}

                            {/* Execution Status Indicator - under output as before */}
                            {result && !isCompiling && !isRunning && (
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
                            )}
                        </>
                    ) : (
                        hasErrors ? (
                            parsedErrors.length > 0 ? (
                                <div className="space-y-2">
                                    {parsedErrors.map((err, i) => {
                                        const isClickable = err.file !== null
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
