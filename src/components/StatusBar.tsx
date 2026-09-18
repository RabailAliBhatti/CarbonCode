import React from 'react'
import { SupportedLanguage, getLanguageLabel } from '../types/language'
import { CStandard } from '../hooks/useSettings'

export type CppStandard = 'c++11' | 'c++14' | 'c++17' | 'c++20' | 'c++23'

interface CompilationResult {
    success: boolean
    output: string
    error: string
    compileTime?: number
    executionTime?: number
}

interface StatusBarProps {
    filePath: string | null
    language: SupportedLanguage
    cppStandard: CppStandard
    cStandard?: CStandard
    runtimeInfo: string | null
    isCompiling: boolean
    compilationResult: CompilationResult | null
    cursorPosition?: { line: number; column: number }
    outputPosition?: 'bottom' | 'right'
    onToggleOutputPosition?: () => void
}

export const StatusBar: React.FC<StatusBarProps> = ({
    filePath,
    language,
    cppStandard,
    cStandard = 'c17',
    runtimeInfo,
    isCompiling,
    compilationResult,
    cursorPosition,
    outputPosition = 'right',
    onToggleOutputPosition
}) => {
    // Get status display info
    const getStatus = () => {
        if (isCompiling) {
            return {
                text: 'Running',
                dotColor: 'bg-carbon-warning',
                textColor: 'text-carbon-warning',
                pulse: true
            }
        }
        if (compilationResult) {
            return compilationResult.success
                ? {
                    text: 'Success',
                    dotColor: 'bg-carbon-success',
                    textColor: 'text-carbon-success',
                    pulse: false
                }
                : {
                    text: 'Error',
                    dotColor: 'bg-carbon-error',
                    textColor: 'text-carbon-error',
                    pulse: false
                }
        }
        return {
            text: 'Ready',
            dotColor: 'bg-carbon-success',
            textColor: 'text-carbon-text-secondary',
            pulse: false
        }
    }

    const status = getStatus()
    const fileName = filePath ? filePath.split(/[/\\]/).pop() || filePath : 'Untitled'

    return (
        <footer className="h-7 bg-carbon-secondary border-t border-carbon-border text-[11px] px-3 flex items-center justify-between shrink-0 select-none z-20 text-carbon-text-secondary">
            {/* Left side: Status dot + File name */}
            <div className="flex items-center gap-3">
                {/* Status Dot */}
                <div className="flex items-center gap-1.5">
                    <span
                        className={`w-2 h-2 rounded-full ${status.dotColor} ${status.pulse ? 'animate-pulse' : ''}`}
                    />
                    <span className={`font-medium ${status.textColor}`}>{status.text}</span>
                </div>

                <div className="w-px h-3 bg-carbon-border" />

                {/* File name */}
                <div className="flex items-center gap-1.5 text-carbon-text-primary">
                    <svg className="w-3 h-3 text-carbon-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="font-mono truncate max-w-[240px]" title={filePath || undefined}>
                        {fileName}
                    </span>
                </div>
            </div>

            {/* Right side: Language, Compiler, Cursor, Output toggle, Timing */}
            <div className="flex items-center gap-3.5">
                {/* Cursor Position (if active) */}
                {cursorPosition && (
                    <div className="hidden sm:flex items-center gap-1 text-carbon-text-muted font-mono">
                        <span>Ln {cursorPosition.line}, Col {cursorPosition.column}</span>
                    </div>
                )}

                {cursorPosition && <div className="hidden sm:block w-px h-3 bg-carbon-border" />}

                {/* Output Position Toggle */}
                {onToggleOutputPosition && (
                    <button
                        onClick={onToggleOutputPosition}
                        className="hidden md:flex items-center gap-1 text-carbon-text-muted hover:text-carbon-text-primary transition-colors"
                        title={`Toggle output panel position (currently ${outputPosition})`}
                    >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                        </svg>
                        <span>Panel: {outputPosition}</span>
                    </button>
                )}

                {onToggleOutputPosition && <div className="hidden md:block w-px h-3 bg-carbon-border" />}

                {/* Language & Standard */}
                <div className="flex items-center gap-1 text-carbon-text-secondary">
                    <span className="text-carbon-text-muted">Lang:</span>
                    <span className="text-carbon-text-primary font-medium">
                        {language === 'cpp'
                            ? `C++ (${cppStandard.toUpperCase()})`
                            : language === 'c'
                                ? `C (${cStandard.toUpperCase()})`
                                : getLanguageLabel(language)}
                    </span>
                </div>

                <div className="w-px h-3 bg-carbon-border" />

                {/* Compiler / Runtime Info */}
                <div className="hidden lg:flex items-center gap-1 truncate max-w-[260px]">
                    {language === 'plaintext' ? (
                        <span className="text-carbon-text-muted">Mode: Plain Text</span>
                    ) : (
                        <>
                            <span className="text-carbon-text-muted">{language === 'python' ? 'Python:' : language === 'java' ? 'JDK:' : 'Compiler:'}</span>
                            <span className={`font-mono truncate ${runtimeInfo ? 'text-carbon-text-primary' : 'text-carbon-error'}`} title={runtimeInfo || undefined}>
                                {runtimeInfo || 'Not detected'}
                            </span>
                        </>
                    )}
                </div>

                {/* Execution Timing */}
                {compilationResult && compilationResult.compileTime !== undefined && (
                    <>
                        <div className="w-px h-3 bg-carbon-border" />
                        <div className="flex items-center gap-1 font-mono text-carbon-success">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>
                                {compilationResult.compileTime}ms
                                {compilationResult.executionTime !== undefined ? ` · ${compilationResult.executionTime}ms` : ''}
                            </span>
                        </div>
                    </>
                )}
            </div>
        </footer>
    )
}

export default StatusBar
