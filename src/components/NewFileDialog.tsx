import { useState, useEffect } from 'react'

interface NewFileDialogProps {
    isOpen: boolean
    onSelect: (language: 'cpp' | 'java') => void
    onCancel: () => void
}

function NewFileDialog({ isOpen, onSelect, onCancel }: NewFileDialogProps) {
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
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onCancel}
            />

            {/* Dialog */}
            <div className="relative bg-[#1e1e2e] border border-[#313244] rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-fade-in">
                {/* Header */}
                <div className="px-6 pt-6 pb-4">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">New File</h2>
                            <p className="text-sm text-[#6c7086]">Choose a language to get started</p>
                        </div>
                    </div>
                </div>

                {/* Cards */}
                <div className="px-6 pb-6 space-y-3">
                    {/* C++ Card */}
                    <button
                        onClick={() => onSelect('cpp')}
                        onMouseEnter={() => setHoveredCard('cpp')}
                        onMouseLeave={() => setHoveredCard(null)}
                        className={`w-full p-4 rounded-xl border transition-all duration-200 text-left group ${
                            hoveredCard === 'cpp'
                                ? 'bg-[#313244] border-blue-500/50 shadow-lg shadow-blue-500/10'
                                : 'bg-[#181825] border-[#313244] hover:border-[#45475a]'
                        }`}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold transition-all duration-200 ${
                                hoveredCard === 'cpp'
                                    ? 'bg-blue-500/20 text-blue-400'
                                    : 'bg-[#313244] text-blue-400'
                            }`}>
                                C++
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-white font-medium">C++ File</span>
                                    <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 text-xs font-medium">.cpp</span>
                                </div>
                                <p className="text-sm text-[#6c7086] mt-0.5">Compiled language with high performance</p>
                            </div>
                            <svg className={`w-5 h-5 transition-all duration-200 ${
                                hoveredCard === 'cpp' ? 'text-blue-400 translate-x-0 opacity-100' : 'text-[#45475a] -translate-x-2 opacity-0'
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
                        className={`w-full p-4 rounded-xl border transition-all duration-200 text-left group ${
                            hoveredCard === 'java'
                                ? 'bg-[#313244] border-orange-500/50 shadow-lg shadow-orange-500/10'
                                : 'bg-[#181825] border-[#313244] hover:border-[#45475a]'
                        }`}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold transition-all duration-200 ${
                                hoveredCard === 'java'
                                    ? 'bg-orange-500/20 text-orange-400'
                                    : 'bg-[#313244] text-orange-400'
                            }`}>
                                J
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-white font-medium">Java File</span>
                                    <span className="px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-400 text-xs font-medium">.java</span>
                                </div>
                                <p className="text-sm text-[#6c7086] mt-0.5">Write once, run anywhere</p>
                            </div>
                            <svg className={`w-5 h-5 transition-all duration-200 ${
                                hoveredCard === 'java' ? 'text-orange-400 translate-x-0 opacity-100' : 'text-[#45475a] -translate-x-2 opacity-0'
                            }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </div>
                    </button>

                    {/* Cancel */}
                    <button
                        onClick={onCancel}
                        className="w-full p-3 rounded-xl border border-[#313244] text-[#6c7086] hover:text-white hover:bg-[#313244] hover:border-[#45475a] transition-all duration-200 text-sm font-medium"
                    >
                        Cancel
                    </button>
                </div>

                {/* Footer hint */}
                <div className="px-6 pb-4">
                    <p className="text-xs text-center text-[#45475a]">
                        Press <kbd className="px-1.5 py-0.5 rounded bg-[#313244] text-[#6c7086] font-mono text-[10px]">Esc</kbd> to cancel
                    </p>
                </div>
            </div>
        </div>
    )
}

export default NewFileDialog
