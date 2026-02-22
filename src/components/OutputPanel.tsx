import { useState, useRef, useEffect } from 'react'

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
}

function OutputPanel({ result, isCompiling, isRunning, onInput, onStop, fontSize = 13 }: OutputPanelProps) {
    const [activeTab, setActiveTab] = useState<'output' | 'errors'>('output')
    const [inputValue, setInputValue] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)
    const outputRef = useRef<HTMLDivElement>(null)

    const hasOutput = result?.output && result.output.trim().length > 0
    const hasErrors = result?.error && result.error.trim().length > 0

    // Auto-switch to errors tab if there are errors and no output (only initially)
    const effectiveTab = hasErrors && !hasOutput && !isRunning ? 'errors' : activeTab

    // Auto-scroll to bottom when output changes
    useEffect(() => {
        if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight
        }
    }, [result?.output])

    // Focus input when running
    useEffect(() => {
        if (isRunning && inputRef.current) {
            inputRef.current.focus()
        }
    }, [isRunning])

    const handleInputKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            onInput(inputValue + '\n') // Send newline
            setInputValue('')
        }
    }

    return (
        <div className="h-full flex flex-col bg-output-bg border-t border-editor-border output-panel">
            {/* Panel Header */}
            <div className="flex items-center justify-between bg-editor-sidebar border-b border-editor-border px-4 py-1.5 shrink-0">
                {/* Tabs */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setActiveTab('output')}
                        className={`
                            px-3 py-1 rounded text-sm font-medium transition-all
                            ${effectiveTab === 'output'
                                ? 'bg-editor-bg text-text-bright'
                                : 'text-text-secondary hover:text-text-primary'
                            }
                        `}
                    >
                        Output
                        {hasOutput && (
                            <span className="ml-1.5 inline-flex items-center justify-center w-2 h-2 rounded-full bg-success" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('errors')}
                        className={`
                            px-3 py-1 rounded text-sm font-medium transition-all
                            ${effectiveTab === 'errors'
                                ? 'bg-editor-bg text-text-bright'
                                : 'text-text-secondary hover:text-text-primary'
                            }
                        `}
                    >
                        Errors
                        {hasErrors && (
                            <span className="ml-1.5 inline-flex items-center justify-center w-2 h-2 rounded-full bg-error" />
                        )}
                    </button>
                </div>

                {/* Controls and Timing */}
                <div className="flex items-center gap-4">
                    {/* Execution Controls */}
                    {isRunning && (
                        <div className="flex items-center gap-2 animate-in fade-in zoom-in duration-200">
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                                <span className="text-xs text-success font-medium">Running...</span>
                            </div>
                            <button
                                onClick={onStop}
                                className="p-1 rounded bg-error/10 hover:bg-error/20 text-error transition-colors"
                                title="Stop Execution"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    )}

                    {/* Timing info */}
                    {result && (result.compileTime || result.executionTime) && !isRunning && (
                        <div className="flex items-center gap-4 text-xs text-text-secondary">
                            {result.compileTime !== undefined && (
                                <span>
                                    Compile: <span className="text-text-primary font-mono">{result.compileTime}ms</span>
                                </span>
                            )}
                            {result.executionTime !== undefined && (
                                <span>
                                    Run: <span className="text-text-primary font-mono">{result.executionTime}ms</span>
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-hidden flex flex-col">
                {/* Scrollable Output */}
                <div
                    ref={outputRef}
                    className="flex-1 overflow-auto p-4 font-mono"
                    style={{ fontSize: `${fontSize}px` }}
                >
                    {isCompiling ? (
                        <div className="flex items-center gap-3 text-warning">
                            <div className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-warning pulse-dot" style={{ animationDelay: '0s' }} />
                                <span className="w-2 h-2 rounded-full bg-warning pulse-dot" style={{ animationDelay: '0.2s' }} />
                                <span className="w-2 h-2 rounded-full bg-warning pulse-dot" style={{ animationDelay: '0.4s' }} />
                            </div>
                            <span>Compiling...</span>
                        </div>
                    ) : result ? (
                        <div>
                            {effectiveTab === 'output' ? (
                                <>
                                    {(hasOutput || isRunning) ? (
                                        <div className="text-text-primary whitespace-pre-wrap break-words leading-relaxed">
                                            {/* Output text */}
                                            <span>{result.output}</span>
                                            {/* Inline input when running */}
                                            {isRunning && (
                                                <span className="inline-flex items-center">
                                                    <input
                                                        ref={inputRef}
                                                        type="text"
                                                        value={inputValue}
                                                        onChange={(e) => setInputValue(e.target.value)}
                                                        onKeyDown={handleInputKeyDown}
                                                        className="bg-transparent border-none outline-none text-accent font-mono min-w-[100px] w-auto"
                                                        style={{
                                                            fontSize: `${fontSize}px`,
                                                            width: `${Math.max(100, inputValue.length * 8 + 20)}px`
                                                        }}
                                                        placeholder="type here..."
                                                        autoFocus
                                                    />
                                                    <span className="inline-block w-2 h-4 bg-accent align-middle animate-pulse" />
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-text-secondary italic">
                                            {result.success
                                                ? 'Program completed with no output.'
                                                : 'No output. Check the Errors tab for details.'
                                            }
                                        </div>
                                    )}
                                </>
                            ) : (
                                hasErrors ? (
                                    <pre className="text-error whitespace-pre-wrap break-words leading-relaxed">
                                        {result.error}
                                    </pre>
                                ) : (
                                    <div className="flex items-center gap-2 text-success">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <span>No errors!</span>
                                    </div>
                                )
                            )}

                            {/* Status indicator */}
                            {result && !isCompiling && !isRunning && (
                                <div className={`
                                    mt-4 pt-4 border-t border-editor-border flex items-center gap-2
                                    ${result.success ? 'text-success' : 'text-error'}
                                `}>
                                    {result.success ? (
                                        <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            <span className="text-xs">Program executed successfully</span>
                                        </>
                                    ) : (
                                        <span className="text-xs">Execution or Compilation failed</span>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-text-secondary italic flex items-center gap-3">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Press <kbd className="px-1.5 py-0.5 bg-editor-bg rounded text-text-primary text-xs font-mono">F5</kbd> or click <span className="text-success">"Run"</span> to compile and execute your code.</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default OutputPanel

