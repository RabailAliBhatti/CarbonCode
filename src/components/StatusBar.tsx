type CppStandard = 'c++11' | 'c++14' | 'c++17' | 'c++20' | 'c++23'

interface CompilationResult {
    success: boolean
    output: string
    error: string
    compileTime?: number
    executionTime?: number
}

interface StatusBarProps {
    filePath: string | null
    cppStandard: CppStandard
    compilerInfo: string | null
    isCompiling: boolean
    compilationResult: CompilationResult | null
}

function StatusBar({
    filePath,
    cppStandard,
    compilerInfo,
    isCompiling,
    compilationResult
}: StatusBarProps) {
    // Get status text and color
    const getStatus = () => {
        if (isCompiling) {
            return { text: 'Compiling...', color: 'text-warning', bg: 'bg-warning' }
        }
        if (compilationResult) {
            return compilationResult.success
                ? { text: 'Success', color: 'text-success', bg: 'bg-success' }
                : { text: 'Failed', color: 'text-error', bg: 'bg-error' }
        }
        return { text: 'Ready', color: 'text-text-secondary', bg: 'bg-text-secondary' }
    }

    const status = getStatus()

    return (
        <footer className="flex items-center justify-between bg-accent/90 text-white text-xs px-4 py-1 shrink-0">
            {/* Left side */}
            <div className="flex items-center gap-4">
                {/* Status indicator */}
                <div className={`flex items-center gap-2 ${status.color}`}>
                    <span className={`w-2 h-2 rounded-full ${status.bg} ${isCompiling ? 'animate-pulse' : ''}`} />
                    <span className="text-white">{status.text}</span>
                </div>

                {/* File path */}
                <div className="flex items-center gap-1.5 text-white/80">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="font-mono truncate max-w-[300px]" title={filePath || undefined}>
                        {filePath || 'Untitled'}
                    </span>
                </div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-4">
                {/* Language */}
                <div className="flex items-center gap-1.5">
                    <span className="text-white/60">Language:</span>
                    <span className="font-mono">C++ ({cppStandard})</span>
                </div>

                {/* Compiler */}
                <div className="flex items-center gap-1.5">
                    <span className="text-white/60">Compiler:</span>
                    <span className={`font-mono ${compilerInfo ? 'text-white' : 'text-error'}`}>
                        {compilerInfo || 'Not found'}
                    </span>
                </div>

                {/* Timing (if available) */}
                {compilationResult && compilationResult.compileTime !== undefined && (
                    <div className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-mono">
                            {compilationResult.compileTime}ms
                            {compilationResult.executionTime !== undefined && ` + ${compilationResult.executionTime}ms`}
                        </span>
                    </div>
                )}
            </div>
        </footer>
    )
}

export default StatusBar
