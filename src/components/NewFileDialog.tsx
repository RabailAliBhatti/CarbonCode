import React, { useState, useEffect } from 'react'

interface NewFileDialogProps {
    isOpen: boolean
    onSelect: (language: 'c' | 'cpp' | 'java' | 'python') => void
    onCancel: () => void
}

export const NewFileDialog: React.FC<NewFileDialogProps> = ({ isOpen, onSelect, onCancel }) => {
    const [hoveredCard, setHoveredCard] = useState<string | null>(null)

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return
            if (e.key === 'Escape') onCancel()
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, onCancel])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center select-none">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onCancel}
            />

            {/* Dialog */}
            <div className="relative bg-carbon-surface border border-carbon-border rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-fade-in">
                {/* Header */}
                <div className="px-6 pt-6 pb-4">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-carbon-accent to-carbon-accent-secondary flex items-center justify-center shadow-glow">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-carbon-text-primary tracking-tight">New File</h2>
                            <p className="text-xs text-carbon-text-secondary">Choose a language to get started</p>
                        </div>
                    </div>
                </div>

                {/* Cards */}
                <div className="px-6 pb-6 space-y-2.5">
                    {/* Python Card */}
                    <button
                        onClick={() => onSelect('python')}
                        onMouseEnter={() => setHoveredCard('python')}
                        onMouseLeave={() => setHoveredCard(null)}
                        className={`w-full p-3.5 rounded-xl border transition-all duration-200 text-left group ${
                            hoveredCard === 'python'
                                ? 'bg-carbon-elevated border-yellow-500/50 shadow-lg shadow-yellow-500/10'
                                : 'bg-carbon-bg border-carbon-border-subtle hover:border-carbon-border'
                        }`}
                    >
                        <div className="flex items-center gap-3.5">
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-base font-bold transition-all duration-200 ${
                                hoveredCard === 'python'
                                    ? 'bg-yellow-500/20 text-yellow-400'
                                    : 'bg-carbon-elevated text-yellow-400'
                            }`}>
                                Py
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-carbon-text-primary font-medium text-sm">Python File</span>
                                    <span className="px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400 text-[11px] font-mono font-medium">.py</span>
                                </div>
                                <p className="text-xs text-carbon-text-muted mt-0.5">Scripted, beginner-friendly, and powerful</p>
                            </div>
                            <svg className={`w-4 h-4 transition-all duration-200 ${
                                hoveredCard === 'python' ? 'text-yellow-400 translate-x-0 opacity-100' : 'text-carbon-text-muted -translate-x-2 opacity-0'
                            }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                    </button>

                    {/* C Card */}
                    <button
                        onClick={() => onSelect('c')}
                        onMouseEnter={() => setHoveredCard('c')}
                        onMouseLeave={() => setHoveredCard(null)}
                        className={`w-full p-3.5 rounded-xl border transition-all duration-200 text-left group ${
                            hoveredCard === 'c'
                                ? 'bg-carbon-elevated border-cyan-500/50 shadow-lg shadow-cyan-500/10'
                                : 'bg-carbon-bg border-carbon-border-subtle hover:border-carbon-border'
                        }`}
                    >
                        <div className="flex items-center gap-3.5">
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-base font-bold transition-all duration-200 ${
                                hoveredCard === 'c'
                                    ? 'bg-cyan-500/20 text-cyan-400'
                                    : 'bg-carbon-elevated text-cyan-400'
                            }`}>
                                C
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-carbon-text-primary font-medium text-sm">C File</span>
                                    <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 text-[11px] font-mono font-medium">.c</span>
                                </div>
                                <p className="text-xs text-carbon-text-muted mt-0.5">Structured programming with low-level control</p>
                            </div>
                            <svg className={`w-4 h-4 transition-all duration-200 ${
                                hoveredCard === 'c' ? 'text-cyan-400 translate-x-0 opacity-100' : 'text-carbon-text-muted -translate-x-2 opacity-0'
                            }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                    </button>

                    {/* C++ Card */}
                    <button
                        onClick={() => onSelect('cpp')}
                        onMouseEnter={() => setHoveredCard('cpp')}
                        onMouseLeave={() => setHoveredCard(null)}
                        className={`w-full p-3.5 rounded-xl border transition-all duration-200 text-left group ${
                            hoveredCard === 'cpp'
                                ? 'bg-carbon-elevated border-blue-500/50 shadow-lg shadow-blue-500/10'
                                : 'bg-carbon-bg border-carbon-border-subtle hover:border-carbon-border'
                        }`}
                    >
                        <div className="flex items-center gap-3.5">
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-base font-bold transition-all duration-200 ${
                                hoveredCard === 'cpp'
                                    ? 'bg-blue-500/20 text-blue-400'
                                    : 'bg-carbon-elevated text-blue-400'
                            }`}>
                                C++
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-carbon-text-primary font-medium text-sm">C++ File</span>
                                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[11px] font-mono font-medium">.cpp</span>
                                </div>
                                <p className="text-xs text-carbon-text-muted mt-0.5">Compiled language with high performance</p>
                            </div>
                            <svg className={`w-4 h-4 transition-all duration-200 ${
                                hoveredCard === 'cpp' ? 'text-blue-400 translate-x-0 opacity-100' : 'text-carbon-text-muted -translate-x-2 opacity-0'
                            }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                    </button>

                    {/* Java Card */}
                    <button
                        onClick={() => onSelect('java')}
                        onMouseEnter={() => setHoveredCard('java')}
                        onMouseLeave={() => setHoveredCard(null)}
                        className={`w-full p-3.5 rounded-xl border transition-all duration-200 text-left group ${
                            hoveredCard === 'java'
                                ? 'bg-carbon-elevated border-orange-500/50 shadow-lg shadow-orange-500/10'
                                : 'bg-carbon-bg border-carbon-border-subtle hover:border-carbon-border'
                        }`}
                    >
                        <div className="flex items-center gap-3.5">
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-base font-bold transition-all duration-200 ${
                                hoveredCard === 'java'
                                    ? 'bg-orange-500/20 text-orange-400'
                                    : 'bg-carbon-elevated text-orange-400'
                            }`}>
                                J
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-carbon-text-primary font-medium text-sm">Java File</span>
                                    <span className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 text-[11px] font-mono font-medium">.java</span>
                                </div>
                                <p className="text-xs text-carbon-text-muted mt-0.5">Write once, run anywhere</p>
                            </div>
                            <svg className={`w-4 h-4 transition-all duration-200 ${
                                hoveredCard === 'java' ? 'text-orange-400 translate-x-0 opacity-100' : 'text-carbon-text-muted -translate-x-2 opacity-0'
                            }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                    </button>

                    {/* Cancel */}
                    <button
                        onClick={onCancel}
                        className="w-full p-2.5 rounded-xl border border-carbon-border text-carbon-text-secondary hover:text-carbon-text-primary hover:bg-carbon-elevated transition-all text-xs font-medium"
                    >
                        Cancel
                    </button>
                </div>

                {/* Footer hint */}
                <div className="px-6 pb-4">
                    <p className="text-[11px] text-center text-carbon-text-muted">
                        Press <kbd className="px-1.5 py-0.5 rounded bg-carbon-elevated border border-carbon-border text-carbon-text-primary font-mono text-[10px]">Esc</kbd> to cancel
                    </p>
                </div>
            </div>
        </div>
    )
}

export default NewFileDialog
