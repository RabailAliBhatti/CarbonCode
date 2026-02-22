import { useState, useEffect, useRef } from 'react'
import type { editor } from 'monaco-editor'

interface FindReplaceProps {
    editor: editor.IStandaloneCodeEditor | null
    isVisible: boolean
    onClose: () => void
}

function FindReplace({ editor, isVisible, onClose }: FindReplaceProps) {
    const [searchText, setSearchText] = useState('')
    const [replaceText, setReplaceText] = useState('')
    const [showReplace, setShowReplace] = useState(false)
    const [matchCase, setMatchCase] = useState(false)
    const [wholeWord, setWholeWord] = useState(false)
    const [useRegex, setUseRegex] = useState(false)

    const [matches, setMatches] = useState<editor.FindMatch[]>([])
    const [currentMatchIndex, setCurrentMatchIndex] = useState(-1)

    const searchInputRef = useRef<HTMLInputElement>(null)

    // Focus input when visible
    useEffect(() => {
        if (isVisible && searchInputRef.current) {
            searchInputRef.current.focus()
            searchInputRef.current.select()
        }
    }, [isVisible])

    // Perform search
    useEffect(() => {
        if (!editor || !searchText) {
            setMatches([])
            setCurrentMatchIndex(-1)
            // Clear decorations if we were using them (Monaco handles selection highlighting automatically if we just select)
            return
        }

        const model = editor.getModel()
        if (!model) return

        const findMatches = model.findMatches(
            searchText,
            true, // searchOnlyEditableRange
            useRegex,
            matchCase,
            wholeWord ? ' ' : null,
            true // captureMatches
        )

        setMatches(findMatches)

        // If we have matches, select the first one or maintain relative position
        if (findMatches.length > 0) {
            // Find closest match to current cursor position
            const position = editor.getPosition()
            let closestIndex = 0

            if (position) {
                // Find match that starts after or at current position
                const index = findMatches.findIndex(m =>
                    m.range.startLineNumber > position.lineNumber ||
                    (m.range.startLineNumber === position.lineNumber && m.range.startColumn >= position.column)
                )
                closestIndex = index !== -1 ? index : 0
            }

            setCurrentMatchIndex(closestIndex)
            editor.setSelection(findMatches[closestIndex].range)
            editor.revealRangeInCenter(findMatches[closestIndex].range)
        } else {
            setCurrentMatchIndex(-1)
        }

    }, [editor, searchText, matchCase, wholeWord, useRegex])

    // Navigate matches
    const navigate = (direction: 'next' | 'prev') => {
        if (matches.length === 0) return

        let nextIndex = currentMatchIndex
        if (direction === 'next') {
            nextIndex = (currentMatchIndex + 1) % matches.length
        } else {
            nextIndex = (currentMatchIndex - 1 + matches.length) % matches.length
        }

        setCurrentMatchIndex(nextIndex)
        editor?.setSelection(matches[nextIndex].range)
        editor?.revealRangeInCenter(matches[nextIndex].range)
    }

    // Replace current
    const replaceCurrent = () => {
        if (!editor || matches.length === 0 || currentMatchIndex === -1) return

        const match = matches[currentMatchIndex]

        editor.executeEdits('find-replace', [{
            range: match.range,
            text: replaceText,
            forceMoveMarkers: true
        }])

        // The edit will trigger a re-search via the model change listener in App, 
        // but we can also trigger a re-search here by depending on model content? 
        // Actually, simple way: update search (useEffect will run)
        // But useEffect depends on searchText, which hasn't changed.
        // We need to re-run search.

        // For now, let's just re-run search manually or force update
        // A better way is to rely on editor.onDidChangeModelContent but that's complex to hook up here.
        // Let's just create a quick re-run trigger
        setSearchText(prev => prev + ' ')
        setTimeout(() => setSearchText(prev => prev.slice(0, -1)), 0)
    }

    // Replace all
    const replaceAll = () => {
        if (!editor || matches.length === 0) return

        const edits = matches.map(match => ({
            range: match.range,
            text: replaceText,
            forceMoveMarkers: true
        }))

        editor.executeEdits('find-replace', edits)
    }

    // Handle keyboard shortcuts in input
    const handleInputKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            if (e.shiftKey) {
                navigate('prev')
            } else {
                navigate('next')
            }
        } else if (e.key === 'Escape') {
            onClose()
            editor?.focus()
        }
    }

    if (!isVisible) return null

    return (
        <div className="absolute top-4 right-8 z-50 w-80 bg-editor-sidebar border border-editor-border rounded-lg shadow-xl shadow-black/20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">

            {/* Search Bar */}
            <div className="p-2 gap-2 flex flex-col">
                <div className="flex items-center gap-1 bg-editor-bg border border-editor-border rounded px-2 py-1">
                    {/* Toggle Expand (Right Arrow for options) */}
                    <button
                        onClick={() => setShowReplace(!showReplace)}
                        className={`p-0.5 rounded hover:bg-white/10 ${showReplace ? 'rotate-90' : ''} transition-transform`}
                    >
                        <svg className="w-3 h-3 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>

                    {/* Search Input */}
                    <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Find"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        onKeyDown={handleInputKeyDown}
                        className="flex-1 bg-transparent border-none outline-none text-sm text-text-primary placeholder:text-text-secondary/50 min-w-0"
                    />

                    {/* Match Count */}
                    {searchText && (
                        <span className="text-xs text-text-secondary whitespace-nowrap px-1">
                            {matches.length === 0 ? 'No results' : `${currentMatchIndex + 1} of ${matches.length}`}
                        </span>
                    )}
                </div>

                {/* Search Options (Toggles) */}
                <div className="flex items-center gap-1 px-1">
                    <button
                        onClick={() => setMatchCase(!matchCase)}
                        className={`p-1 rounded text-xs border ${matchCase ? 'bg-accent/20 border-accent text-accent' : 'border-transparent text-text-secondary hover:bg-white/5'}`}
                        title="Match Case"
                    >
                        Aa
                    </button>
                    <button
                        onClick={() => setWholeWord(!wholeWord)}
                        className={`p-1 rounded text-xs border ${wholeWord ? 'bg-accent/20 border-accent text-accent' : 'border-transparent text-text-secondary hover:bg-white/5'}`}
                        title="Match Whole Word"
                    >
                        ab
                    </button>
                    <button
                        onClick={() => setUseRegex(!useRegex)}
                        className={`p-1 rounded text-xs border ${useRegex ? 'bg-accent/20 border-accent text-accent' : 'border-transparent text-text-secondary hover:bg-white/5'}`}
                        title="Use Regular Expression"
                    >
                        .*
                    </button>

                    <div className="flex-1" />

                    {/* Navigation Buttons */}
                    <button onClick={() => navigate('prev')} className="p-1 text-text-secondary hover:text-text-primary hover:bg-white/10 rounded" title="Previous Match (Shift+Enter)">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                    </button>
                    <button onClick={() => navigate('next')} className="p-1 text-text-secondary hover:text-text-primary hover:bg-white/10 rounded" title="Next Match (Enter)">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                    </button>
                    <button onClick={onClose} className="p-1 text-text-secondary hover:text-text-primary hover:bg-white/10 rounded ml-1" title="Close (Esc)">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Replace Bar */}
                {showReplace && (
                    <div className="flex items-center gap-1 mt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                        <div className="flex items-center gap-1 bg-editor-bg border border-editor-border rounded px-2 py-1 flex-1">
                            <input
                                type="text"
                                placeholder="Replace"
                                value={replaceText}
                                onChange={(e) => setReplaceText(e.target.value)}
                                className="flex-1 bg-transparent border-none outline-none text-sm text-text-primary placeholder:text-text-secondary/50 min-w-0"
                            />
                        </div>

                        {/* Replace Actions */}
                        <button onClick={replaceCurrent} className="p-1.5 hover:bg-white/10 rounded text-text-secondary hover:text-text-primary" title="Replace (Ctrl+Shift+1)">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                        <button onClick={replaceAll} className="p-1.5 hover:bg-white/10 rounded text-text-secondary hover:text-text-primary" title="Replace All (Ctrl+Alt+Enter)">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </button>
                    </div>
                )}

            </div>
        </div>
    )
}

export default FindReplace
