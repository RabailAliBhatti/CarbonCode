import { useState } from 'react'

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
}

function OutputPanel({ result, isCompiling }: OutputPanelProps) {
    const [activeTab, setActiveTab] = useState<'output' | 'errors'>('output')

    const hasOutput = result?.output && result.output.trim().length > 0
    const hasErrors = result?.error && result.error.trim().length > 0

    // Auto-switch to errors tab if there are errors
    const effectiveTab = hasErrors && !hasOutput ? 'errors' : activeTab

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

                {/* Timing info */}
                {result && (result.compileTime || result.executionTime) && (
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

            {/* Panel Content */}
            <div className="flex-1 overflow-auto p-4 font-mono text-sm">
                {isCompiling ? (
                    <div className="flex items-center gap-3 text-warning">
                        <div className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-warning pulse-dot" style={{ animationDelay: '0s' }} />
                            <span className="w-2 h-2 rounded-full bg-warning pulse-dot" style={{ animationDelay: '0.2s' }} />
                            <span className="w-2 h-2 rounded-full bg-warning pulse-dot" style={{ animationDelay: '0.4s' }} />
                        </div>
                        <span>Compiling and running...</span>
                    </div>
                ) : result ? (
                    <div className={effectiveTab === 'errors' ? '' : ''}>
                        {effectiveTab === 'output' ? (
                            hasOutput ? (
                                <pre className="text-text-primary whitespace-pre-wrap break-words leading-relaxed">
                                    {result.output}
                                </pre>
                            ) : (
                                <div className="text-text-secondary italic">
                                    {result.success
                                        ? 'Program completed with no output.'
                                        : 'No output. Check the Errors tab for details.'
                                    }
                                </div>
                            )
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
                        {result && !isCompiling && (
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
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        <span className="text-xs">Execution failed</span>
                                    </>
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
    )
}

export default OutputPanel
