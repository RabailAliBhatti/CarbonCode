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
    onStart: () => void
    onStop: () => void
    onStepOver: () => void
    onStepInto: () => void
    onStepOut: () => void
    onContinue: () => void
}

function DebugPanel({
    debugState,
    onStart,
    onStop,
    onStepOver,
    onStepInto,
    onStepOut,
    onContinue
}: DebugPanelProps) {
    const isDebugging = debugState.status !== 'idle' && debugState.status !== 'exited'
    const isStopped = debugState.status === 'stopped'

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
                </div>
            </div>

            {/* Variables Panel */}
            {isDebugging && (
                <div className="max-h-40 overflow-y-auto">
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
    )
}

export default DebugPanel
