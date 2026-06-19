import { useState, useRef, useEffect, useCallback } from 'react'

interface SearchResult {
    file: string
    line: number
    column: number
    matchText: string
    lineContent: string
}

interface SearchPanelProps {
    rootPath: string | null
    onResultClick: (file: string, line: number, column?: number) => void
    onClose: () => void
}

function basename(path: string): string {
    return path.replace(/[\\/]/g, '/').split('/').pop() || path
}

function relativePath(full: string, root: string): string {
    const normFull = full.replace(/\\/g, '/')
    const normRoot = root.replace(/\\/g, '/')
    if (normFull.startsWith(normRoot + '/')) {
        return normFull.slice(normRoot.length + 1)
    }
    return normFull
}

function SearchPanel({ rootPath, onResultClick, onClose }: SearchPanelProps) {
    const [query, setQuery] = useState('')
    const [caseSensitive, setCaseSensitive] = useState(false)
    const [wholeWord, setWholeWord] = useState(false)
    const [useRegex, setUseRegex] = useState(false)
    const [includePattern, setIncludePattern] = useState('')
    const [showOptions, setShowOptions] = useState(false)
    const [results, setResults] = useState<SearchResult[]>([])
    const [truncated, setTruncated] = useState(false)
    const [searching, setSearching] = useState(false)
    const [searched, setSearched] = useState(false)
    const [groupedResults, setGroupedResults] = useState<{ file: string; results: SearchResult[] }[]>([])

    const inputRef = useRef<HTMLInputElement>(null)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null!)

    // Focus input on mount
    useEffect(() => {
        inputRef.current?.focus()
    }, [])

    // Group results by file
    useEffect(() => {
        const map = new Map<string, SearchResult[]>()
        for (const r of results) {
            if (!map.has(r.file)) map.set(r.file, [])
            map.get(r.file)!.push(r)
        }
        const grouped = Array.from(map.entries()).map(([file, res]) => ({ file, results: res }))
        setGroupedResults(grouped)
    }, [results])

    // Run search
    const runSearch = useCallback(async (q: string) => {
        if (!q.trim() || !rootPath) {
            setResults([])
            setTruncated(false)
            setSearching(false)
            setSearched(false)
            return
        }

        setSearching(true)
        setSearched(true)

        try {
            const opts: {
                caseSensitive?: boolean
                wholeWord?: boolean
                regex?: boolean
                includePattern?: string
            } = {}
            if (caseSensitive) opts.caseSensitive = true
            if (wholeWord) opts.wholeWord = true
            if (useRegex) opts.regex = true
            if (includePattern.trim()) opts.includePattern = includePattern.trim()

            const res = await window.electronAPI.findInFiles(rootPath, q.trim(), opts)
            setResults(res.results)
            setTruncated(res.truncated)
        } catch (err) {
            console.error('Search failed:', err)
            setResults([])
        }

        setSearching(false)
    }, [rootPath, caseSensitive, wholeWord, useRegex, includePattern])

    // Debounced search
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        if (!query.trim()) {
            setResults([])
            setTruncated(false)
            setSearched(false)
            return
        }
        debounceRef.current = setTimeout(() => {
            runSearch(query)
        }, 300)
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
        }
    }, [query, runSearch])

    // Re-run when options change (if there's already a query)
    useEffect(() => {
        if (!query.trim()) return
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => {
            runSearch(query)
        }, 300)
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [caseSensitive, wholeWord, useRegex, includePattern])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose()
        }
    }

    return (
        <div className="absolute top-0 right-0 h-full w-80 bg-editor-sidebar border-l border-editor-border flex flex-col shadow-lg z-20">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-editor-border">
                <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Search</span>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-editor-border rounded transition-colors text-text-secondary hover:text-text-primary"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Search Input */}
            <div className="p-3 border-b border-editor-border space-y-2">
                <div className="relative">
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={rootPath ? "Search in files..." : "Open a folder first"}
                        disabled={!rootPath}
                        className="w-full bg-editor-bg text-text-primary text-sm px-3 py-2 pr-8 rounded border border-editor-border focus:border-accent focus:outline-none placeholder-text-secondary/50 disabled:opacity-50"
                    />
                    {searching && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                            <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                        </div>
                    )}
                </div>

                {/* Toggle buttons */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setCaseSensitive(!caseSensitive)}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                            caseSensitive
                                ? 'bg-accent text-white'
                                : 'bg-editor-bg text-text-secondary hover:text-text-primary border border-editor-border'
                        }`}
                        title="Case Sensitive"
                    >
                        Aa
                    </button>
                    <button
                        onClick={() => setWholeWord(!wholeWord)}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                            wholeWord
                                ? 'bg-accent text-white'
                                : 'bg-editor-bg text-text-secondary hover:text-text-primary border border-editor-border'
                        }`}
                        title="Whole Word"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                        </svg>
                    </button>
                    <button
                        onClick={() => setUseRegex(!useRegex)}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                            useRegex
                                ? 'bg-accent text-white'
                                : 'bg-editor-bg text-text-secondary hover:text-text-primary border border-editor-border'
                        }`}
                        title="Use Regex"
                    >
                        .*
                    </button>
                    <button
                        onClick={() => setShowOptions(!showOptions)}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                            showOptions
                                ? 'bg-editor-bg text-text-primary border border-accent'
                                : 'bg-editor-bg text-text-secondary hover:text-text-primary border border-editor-border'
                        }`}
                        title="Options"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                        </svg>
                    </button>
                </div>

                {/* Include pattern input */}
                {showOptions && (
                    <div>
                        <input
                            type="text"
                            value={includePattern}
                            onChange={(e) => setIncludePattern(e.target.value)}
                            placeholder="Include pattern (e.g. *.cpp, *.{cpp,h})"
                            className="w-full bg-editor-bg text-text-primary text-xs px-2 py-1.5 rounded border border-editor-border focus:border-accent focus:outline-none placeholder-text-secondary/50"
                        />
                    </div>
                )}
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto">
                {!searched && !searching && (
                    <div className="text-xs text-text-secondary text-center py-8">
                        Type to search across files
                    </div>
                )}

                {searched && !searching && results.length === 0 && (
                    <div className="text-xs text-text-secondary text-center py-8">
                        No results found
                    </div>
                )}

                {truncated && (
                    <div className="px-3 py-1.5 text-xs text-warning bg-warning/5 border-b border-warning/20">
                        Showing first {results.length} results (truncated)
                    </div>
                )}

                {searching && query.trim() && (
                    <div className="text-xs text-text-secondary text-center py-8">
                        <div className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                            Searching...
                        </div>
                    </div>
                )}

                {searched && !searching && groupedResults.map((group) => (
                    <div key={group.file}>
                        {/* File header */}
                        <div className="px-3 py-1.5 text-xs font-medium text-text-secondary bg-editor-highlight/30 sticky top-0 border-b border-editor-border">
                            {rootPath ? relativePath(group.file, rootPath) : basename(group.file)}
                            <span className="ml-1.5 text-text-secondary/60">({group.results.length})</span>
                        </div>

                        {/* Results for this file */}
                        {group.results.map((r, i) => (
                            <button
                                key={`${r.file}:${r.line}:${r.column}:${i}`}
                                onClick={() => onResultClick(r.file, r.line, r.column)}
                                className="w-full text-left px-3 py-1.5 hover:bg-editor-highlight/50 transition-colors border-b border-editor-border/30"
                            >
                                <div className="flex items-baseline gap-2">
                                    <span className="text-xs text-text-secondary shrink-0">
                                        L{r.line}:{r.column}
                                    </span>
                                    <span className="text-xs text-text-secondary/50 truncate">
                                        {r.lineContent}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                ))}
            </div>

            {/* Footer */}
            {searched && !searching && results.length > 0 && (
                <div className="px-3 py-1.5 text-xs text-text-secondary border-t border-editor-border">
                    {results.length} result{results.length !== 1 ? 's' : ''}
                </div>
            )}
        </div>
    )
}

export default SearchPanel
