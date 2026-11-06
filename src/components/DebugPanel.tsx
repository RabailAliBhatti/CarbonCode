import React, { useState, useEffect, useRef } from 'react'
import { SupportedLanguage } from '../types/language'
import MemoryInspector from './MemoryInspector'

interface Variable {
    name: string
    value: string
    type: string
}

interface Breakpoint {
    id: number
    file: string
    line: number
}

interface DebugState {
    status: 'idle' | 'running' | 'stopped' | 'exited'
    currentFile?: string
    currentLine?: number
    breakpoints: Breakpoint[]
    locals: Variable[]
}

interface DebugPanelProps {
    debugState: DebugState
    javaDebugUnsupported?: boolean
    language?: SupportedLanguage
    onStart: () => void
    onStop: () => void
    onStepOver: () => void
    onStepInto: () => void
    onStepOut: () => void
    onContinue: () => void
    breakpointCount?: number
    onClose?: () => void
}

function DebugPanel({
    debugState,
    javaDebugUnsupported = false,
    language,
    onStart,
    onStop,
    onStepOver,
    onStepInto,
    onStepOut,
    onContinue,
    breakpointCount = 0,
    onClose
}: DebugPanelProps) {
    const isDebugging = debugState.status !== 'idle' && debugState.status !== 'exited'
    const isStopped = debugState.status === 'stopped'
    const [activeView, setActiveView] = useState<'vars' | 'memory'>('vars')

    const [watchExpressions, setWatchExpressions] = useState<{ expr: string; value?: string }[]>([])
    const [newExpr, setNewExpr] = useState('')
    const watchesRef = useRef<string[]>([])
    watchesRef.current = watchExpressions.map(w => w.expr)

    useEffect(() => {
        if (isStopped && window.electronAPI?.debugEvaluate && watchesRef.current.length > 0) {
            const currentExprs = [...watchesRef.current]
            Promise.all(
                currentExprs.map(async (expr) => {
                    try {
                        const res = await window.electronAPI.debugEvaluate(expr)
                        return { expr, value: res.success ? (res.value ?? '') : (res.error || 'error') }
                    } catch {
                        return { expr, value: 'error' }
                    }
                })
            ).then(results => {
                setWatchExpressions(results)
            })
        }
    }, [isStopped, debugState.currentLine])

    const handleAddWatch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        const trimmed = newExpr.trim()
        if (!trimmed) return
        let initialVal = isStopped ? 'evaluating...' : 'not available'
        if (isStopped && window.electronAPI?.debugEvaluate) {
            try {
                const res = await window.electronAPI.debugEvaluate(trimmed)
                initialVal = res.success ? (res.value ?? '') : (res.error || 'error')
            } catch {
                initialVal = 'error'
            }
        }
        setWatchExpressions(prev => [...prev.filter(w => w.expr !== trimmed), { expr: trimmed, value: initialVal }])
        setNewExpr('')
    }

    const handleRemoveWatch = (exprToRemove: string) => {
        setWatchExpressions(prev => prev.filter(w => w.expr !== exprToRemove))
    }

    if (javaDebugUnsupported) {
        const isPython = language === 'python'
        return (
            <div className="bg-editor-sidebar border-t border-editor-border">
                <div className="flex items-start gap-3 px-4 py-3" style={{ borderLeft: '3px solid #3b82f6', background: 'rgba(59, 130, 246, 0.08)' }}>
                    <i className="ti ti-info-circle text-blue-400 text-lg mt-0.5 shrink-0" />
                    <div className="text-sm">
                        <p className="text-text-primary font-medium">{isPython ? 'Python debugging is not supported' : 'Java debugging is not supported'}</p>
                        <p className="text-text-secondary mt-1">
                            {isPython
                                ? <>Use F5 to run your Python program with live terminal input and traceback diagnostics. For debugging, add <code className="text-accent">print()</code> statements to inspect values.</>
                                : <>Use F5 to compile and run your Java program. For debugging, add <code className="text-accent">System.out.println()</code> statements to inspect values.</>
                            }
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-editor-sidebar border-t border-editor-border">
            {/* Debug Toolbar */}
            <div className="flex items-center gap-1 px-3 py-2 border-b border-editor-border">
                <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider mr-2">
                    Debug
                </span>

                {!isDebugging ? (
                    <button
                        onClick={onStart}
                        className="p-1.5 hover:bg-editor-highlight rounded transition-colors"
                        title="Start Debugging (Ctrl+F5)"
                    >
                        <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                        </svg>
                    </button>
                ) : (
                    <>
                        <button
                            onClick={onStop}
                            className="p-1.5 hover:bg-editor-highlight rounded transition-colors"
                            title="Stop Debugging (Ctrl+Shift+F5)"
                        >
                            <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                            </svg>
                        </button>

                        <div className="w-px h-4 bg-editor-border mx-1" />

                        <button
                            onClick={onContinue}
                            disabled={!isStopped}
                            className={`p-1.5 rounded transition-colors ${isStopped ? 'hover:bg-editor-highlight' : 'opacity-40 cursor-not-allowed'}`}
                            title="Continue (F8)"
                        >
                            <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                        </button>

                        <button
                            onClick={onStepOver}
                            disabled={!isStopped}
                            className={`p-1.5 rounded transition-colors ${isStopped ? 'hover:bg-editor-highlight' : 'opacity-40 cursor-not-allowed'}`}
                            title="Step Over (F10)"
                        >
                            <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                            </svg>
                        </button>

                        <button
                            onClick={onStepInto}
                            disabled={!isStopped}
                            className={`p-1.5 rounded transition-colors ${isStopped ? 'hover:bg-editor-highlight' : 'opacity-40 cursor-not-allowed'}`}
                            title="Step Into (F11)"
                        >
                            <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                            </svg>
                        </button>

                        <button
                            onClick={onStepOut}
                            disabled={!isStopped}
                            className={`p-1.5 rounded transition-colors ${isStopped ? 'hover:bg-editor-highlight' : 'opacity-40 cursor-not-allowed'}`}
                            title="Step Out (Shift+F11)"
                        >
                            <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                            </svg>
                        </button>
                    </>
                )}

                {/* Status indicator */}
                <div className="ml-auto flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${debugState.status === 'running' ? 'bg-green-400 animate-pulse' :
                            debugState.status === 'stopped' ? 'bg-yellow-400' :
                                debugState.status === 'exited' ? 'bg-gray-400' :
                                    'bg-gray-600'
                        }`} />
                    <span className="text-xs text-text-secondary capitalize">
                        {debugState.status}
                    </span>
                    {debugState.currentLine && (
                        <span className="text-xs text-text-secondary">
                            Line {debugState.currentLine}
                        </span>
                    )}
                    {onClose && !isDebugging && (
                        <button
                            onClick={onClose}
                            className="ml-1 p-1 rounded hover:bg-editor-highlight text-text-secondary transition-colors"
                            title="Close debug panel"
                            aria-label="Close debug panel"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* Idle / finished hint so beginners know what to do next */}
            {!isDebugging && (
                <div className="px-4 py-3 text-xs text-text-secondary leading-relaxed">
                    {debugState.status === 'exited' ? (
                        <p>Program finished. Press <span className="text-green-400 font-semibold">▶ Start</span> to debug again.</p>
                    ) : breakpointCount > 0 ? (
                        <p>{breakpointCount} breakpoint{breakpointCount > 1 ? 's' : ''} set. Press <span className="text-green-400 font-semibold">▶ Start</span> (Ctrl+F5) to run until the first one.</p>
                    ) : (
                        <p>
                            Click the gutter next to a line number (or press <kbd className="px-1 rounded bg-editor-highlight">F9</kbd>) to add a breakpoint,
                            then press <span className="text-green-400 font-semibold">▶ Start</span>. With no breakpoints, the debugger pauses at the start of <code className="text-accent">main()</code>.
                        </p>
                    )}
                </div>
            )}

            {/* Variables and Watch Panel */}
            {isDebugging && (
                <div>
                    {/* View Mode Sub-tabs: Variables vs CS101 Memory Grid */}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-carbon-surface/80 border-b border-editor-border text-xs">
                        <button
                            onClick={() => setActiveView('vars')}
                            className={`px-2.5 py-1 rounded font-medium transition-colors flex items-center gap-1.5 ${
                                activeView === 'vars'
                                    ? 'bg-accent/20 text-accent font-semibold border border-accent/40'
                                    : 'text-text-secondary hover:text-text-primary hover:bg-editor-highlight'
                            }`}
                        >
                            <span>📋</span>
                            <span>Variables & Watches</span>
                        </button>
                        <button
                            onClick={() => {
                                setActiveView('memory')
                                window.electronAPI?.trackEvent?.('feature_memory_grid_viewed')
                            }}
                            className={`px-2.5 py-1 rounded font-medium transition-colors flex items-center gap-1.5 ${
                                activeView === 'memory'
                                    ? 'bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/40'
                                    : 'text-text-secondary hover:text-text-primary hover:bg-editor-highlight'
                            }`}
                        >
                            <span>🧠</span>
                            <span>Memory & Pointer Grid</span>
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-purple-500/30 text-purple-200">
                                CS101
                            </span>
                        </button>
                    </div>

                    {activeView === 'memory' ? (
                        <div className="max-h-72 overflow-y-auto">
                            <MemoryInspector
                                locals={debugState.locals}
                                isStopped={isStopped}
                                onEvaluate={window.electronAPI?.debugEvaluate}
                            />
                        </div>
                    ) : (
                        <div className="max-h-56 overflow-y-auto">
                            {/* Watch Expressions */}
                            <div className="px-3 py-2 border-b border-editor-border/50">
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                                        Watch Expressions
                                    </span>
                                </div>
                                <form onSubmit={handleAddWatch} className="flex items-center gap-1.5 mb-2">
                                    <input
                                        type="text"
                                        value={newExpr}
                                        onChange={(e) => setNewExpr(e.target.value)}
                                        placeholder="Expression (e.g. x + 1, arr[0])..."
                                        className="flex-1 px-2 py-0.5 bg-editor-bg border border-editor-border rounded text-xs text-text-primary outline-none font-mono focus:border-accent"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!newExpr.trim()}
                                        className="px-2 py-0.5 bg-accent/20 hover:bg-accent/30 text-accent text-xs font-medium rounded transition-colors disabled:opacity-40"
                                    >
                                        + Add
                                    </button>
                                </form>
                                {watchExpressions.length > 0 ? (
                                    <div className="space-y-1">
                                        {watchExpressions.map((w) => (
                                            <div key={w.expr} className="flex items-center justify-between text-xs font-mono group">
                                                <div className="flex items-center gap-2 truncate">
                                                    <span className="text-sky-400">{w.expr}</span>
                                                    <span className="text-text-secondary">=</span>
                                                    <span className="text-green-400">{w.value || (isStopped ? 'evaluating...' : 'not available')}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveWatch(w.expr)}
                                                    className="opacity-0 group-hover:opacity-100 p-0.5 text-text-secondary hover:text-red-400 transition-opacity"
                                                    title="Remove Watch"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-[11px] text-text-secondary/60 italic">
                                        No watch expressions added
                                    </div>
                                )}
                            </div>

                            <div className="px-3 py-2">
                                <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                                    Local Variables
                                </div>
                                {debugState.locals.length > 0 ? (
                                    <div className="space-y-1">
                                        {debugState.locals.map((variable, index) => (
                                            <div key={index} className="flex items-center gap-2 text-xs font-mono">
                                                <span className="text-purple-400">{variable.name}</span>
                                                <span className="text-text-secondary">=</span>
                                                <span className="text-green-400">{variable.value}</span>
                                                <span className="text-text-secondary/50 text-[10px]">({variable.type})</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-xs text-text-secondary italic">
                                        {isStopped ? 'No local variables' : 'Waiting for breakpoint...'}
                                    </div>
                                )}
                            </div>

                            {/* Breakpoints list */}
                            {debugState.breakpoints.length > 0 && (
                                <div className="px-3 py-2 border-t border-editor-border/50">
                                    <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                                        Breakpoints
                                    </div>
                                    <div className="space-y-1">
                                        {debugState.breakpoints.map((bp) => (
                                            <div key={bp.id} className="flex items-center gap-2 text-xs">
                                                <span className="w-2 h-2 rounded-full bg-red-500" />
                                                <span className="text-text-primary">{bp.file}</span>
                                                <span className="text-text-secondary">:{bp.line}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default DebugPanel
