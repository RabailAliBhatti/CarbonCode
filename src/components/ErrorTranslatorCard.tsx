import React, { useState } from 'react'
import type { TranslatedError, QuickFixAction } from '../utils/errorTranslator'

interface ErrorTranslatorCardProps {
    error: TranslatedError
    onJumpToLine?: (file: string | null, line: number, column?: number) => void
    onApplyQuickFix?: (action: QuickFixAction) => void
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    'Stream Output': { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
    'Missing Header': { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
    'Namespace': { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30' },
    'Syntax Error': { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30' },
    'Pointers & Memory': { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
    'Linker / Entry Point': { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
    'Standard Version': { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    'Type Mismatch': { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/30' },
    'Imports & Packages': { bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/30' },
    'Static Context': { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' },
    'Python Runtime': { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/30' },
    'General': { bg: 'bg-carbon-error/10', text: 'text-carbon-error', border: 'border-carbon-error/30' }
}

export const ErrorTranslatorCard: React.FC<ErrorTranslatorCardProps> = ({
    error,
    onJumpToLine,
    onApplyQuickFix
}) => {
    const [showRaw, setShowRaw] = useState(false)
    const [fixApplied, setFixApplied] = useState(false)

    const colors = CATEGORY_COLORS[error.category] || CATEGORY_COLORS['General']
    const isError = error.originalError.severity === 'error'
    const fileName = error.originalError.file ? error.originalError.file.split(/[/\\]/).pop() : 'compile'

    const handleApplyFix = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (error.quickFix && onApplyQuickFix) {
            onApplyQuickFix(error.quickFix)
            setFixApplied(true)
            setTimeout(() => setFixApplied(false), 3000)
        }
    }

    return (
        <div className={`rounded-xl border ${isError ? 'border-carbon-error/30 bg-[#161214]' : 'border-carbon-warning/30 bg-[#171510]'} overflow-hidden shadow-lg transition-all`}>
            {/* Header bar */}
            <div className="px-4 py-2.5 bg-black/20 border-b border-white/5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Category pill */}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${colors.bg} ${colors.text} ${colors.border}`}>
                        {error.category}
                    </span>

                    {/* File and line button */}
                    <button
                        onClick={() => onJumpToLine?.(error.originalError.file, error.originalError.line, error.originalError.column)}
                        className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono text-carbon-text-muted hover:text-carbon-text-primary hover:bg-white/5 transition-colors"
                        title="Click to jump to this line in editor"
                    >
                        <span>📁 {fileName}</span>
                        <span className="text-carbon-accent font-medium">Line {error.originalError.line}{error.originalError.column ? `:${error.originalError.column}` : ''}</span>
                    </button>
                </div>

                {/* Quick Fix Button (if available) */}
                {error.quickFix && (
                    <button
                        onClick={handleApplyFix}
                        disabled={fixApplied}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                            fixApplied
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 cursor-default'
                                : 'bg-carbon-accent text-white hover:bg-carbon-accent-hover active:scale-95 shadow-md shadow-carbon-accent/20'
                        }`}
                        title={error.quickFix.title}
                    >
                        <span>{fixApplied ? '✓ Fixed!' : '⚡ Fix It'}</span>
                    </button>
                )}
            </div>

            {/* Main content body */}
            <div className="p-4 space-y-3">
                {/* Title */}
                <div className="flex items-start gap-2.5">
                    <span className="text-lg leading-none shrink-0 mt-0.5">💡</span>
                    <h4 className="text-sm font-semibold text-carbon-text-primary leading-snug">
                        {error.title}
                    </h4>
                </div>

                {/* Plain-English Explanation */}
                <p className="text-xs text-carbon-text-secondary leading-relaxed pl-7">
                    {error.humanExplanation}
                </p>

                {/* Helpful Tip / Cause Box */}
                <div className="ml-7 p-2.5 rounded-lg bg-black/30 border border-white/5 text-[11px] space-y-1.5">
                    <div className="text-carbon-text-muted flex items-start gap-1.5">
                        <strong className="text-amber-400/90 font-medium shrink-0">Cause:</strong>
                        <span>{error.cause}</span>
                    </div>
                    <div className="text-carbon-text-muted flex items-start gap-1.5">
                        <strong className="text-emerald-400/90 font-medium shrink-0">How to fix:</strong>
                        <span className="text-carbon-text-primary">{error.fixTip}</span>
                    </div>
                </div>

                {/* Code Snippet Box (Good vs Bad) */}
                {error.codeSnippet && (
                    <div className="ml-7 space-y-2">
                        {error.codeSnippet.bad && (
                            <div className="rounded-lg bg-rose-950/20 border border-rose-900/30 p-2.5">
                                <div className="text-[10px] font-semibold text-rose-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                    <span>✕ Common mistake</span>
                                </div>
                                <pre className="font-mono text-[11px] text-rose-200/90 overflow-x-auto whitespace-pre">
                                    {error.codeSnippet.bad}
                                </pre>
                            </div>
                        )}
                        <div className="rounded-lg bg-emerald-950/20 border border-emerald-900/30 p-2.5">
                            <div className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                <span>✓ Recommended solution</span>
                                {error.codeSnippet.description && <span className="text-carbon-text-muted text-[10px] font-normal">({error.codeSnippet.description})</span>}
                            </div>
                            <pre className="font-mono text-[11px] text-emerald-200/90 overflow-x-auto whitespace-pre">
                                {error.codeSnippet.good}
                            </pre>
                        </div>
                    </div>
                )}

                {/* Collapsible Raw Compiler Details */}
                <div className="pt-1 pl-7">
                    <button
                        onClick={() => setShowRaw(!showRaw)}
                        className="text-[10px] font-mono text-carbon-text-muted hover:text-carbon-text-secondary flex items-center gap-1 transition-colors"
                    >
                        <span>{showRaw ? '▾ Hide raw compiler message' : '▸ View raw compiler message'}</span>
                    </button>

                    {showRaw && (
                        <div className="mt-1.5 p-2 rounded bg-black/40 border border-white/5 font-mono text-[10px] text-carbon-error/80 whitespace-pre-wrap break-all">
                            {error.originalError.raw || error.originalError.message}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default ErrorTranslatorCard
