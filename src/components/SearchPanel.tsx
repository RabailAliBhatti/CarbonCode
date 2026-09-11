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
    onOpenFolder?: () => void
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

function SearchPanel({ rootPath, onResultClick, onClose, onOpenFolder }: SearchPanelProps) {
    const [query, setQuery] = useState('')
    const [replaceText, setReplaceText] = useState('')
    const [showReplace, setShowReplace] = useState(false)
    const [caseSensitive, setCaseSensitive] = useState(false)
    const [wholeWord, setWholeWord] = useState(false)
    const [useRegex, setUseRegex] = useState(false)
    const [includePattern, setIncludePattern] = useState('')
    const [showOptions, setShowOptions] = useState(false)
    const [results, setResults] = useState<SearchResult[]>([])
    const [truncated, setTruncated] = useState(false)
    const [searching, setSearching] = useState(false)
    const [searched, setSearched] = useState(false)
    const [isReplacing, setIsReplacing] = useState(false)
    const [replaceStatus, setReplaceStatus] = useState<string | null>(null)
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
        setReplaceStatus(null)

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
    }, [caseSensitive, wholeWord, useRegex, includePattern, runSearch])

    // Replace All in files
    const handleReplaceAll = async () => {
        if (!query.trim() || results.length === 0 || !rootPath || isReplacing) return

        setIsReplacing(true)
        setReplaceStatus('Replacing...')
        let replacedCount = 0

        try {
            for (const group of groupedResults) {
                const fileContent = await window.electronAPI.readFile(group.file)
                if (fileContent !== null) {
                    let updated = fileContent
                    if (useRegex) {
                        try {
                            const regex = new RegExp(query, caseSensitive ? 'g' : 'gi')
                            const matches = fileContent.match(regex)
                            if (matches) replacedCount += matches.length
                            updated = fileContent.replace(regex, replaceText)
                        } catch {
                            // Invalid regex
                        }
                    } else {
                        // String replacement
                        const flags = caseSensitive ? 'g' : 'gi'
                        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                        const regex = new RegExp(escaped, flags)
                        const matches = fileContent.match(regex)
                        if (matches) replacedCount += matches.length
                        updated = fileContent.replace(regex, replaceText)
                    }

                    if (updated !== fileContent) {
                        await window.electronAPI.saveFile(updated, group.file)
                    }
                }
            }

            setReplaceStatus(`Replaced ${replacedCount} occurrence${replacedCount === 1 ? '' : 's'}`)
            // Re-run search to update results
            runSearch(query)
        } catch (err) {
            console.error('Replace failed:', err)
            setReplaceStatus('Replace failed')
        } finally {
            setIsReplacing(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose()
        }
    }

    return (
        <div className="absolute top-0 right-0 h-full w-88 max-w-[90vw] bg-carbon-surface border-l border-carbon-border flex flex-col shadow-2xl z-30 select-none animate-slide-left">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-carbon-border bg-carbon-elevated/40">
                <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-carbon-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span className="text-xs font-bold text-carbon-text tracking-wide uppercase">Search & Replace</span>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-carbon-border rounded-lg transition-colors text-carbon-text-muted hover:text-carbon-text"
                    title="Close (Esc)"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* If no folder is open */}
            {!rootPath ? (
                <div className="p-6 flex flex-col items-center justify-center text-center gap-3 my-auto">
                    <div className="w-12 h-12 rounded-xl bg-carbon-accent/10 border border-carbon-accent/30 flex items-center justify-center text-carbon-accent">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-carbon-text">No Folder Open</h4>
                        <p className="text-xs text-carbon-text-muted mt-1">Open a folder or project workspace to search across all files.</p>
                    </div>
                    {onOpenFolder && (
                        <button
                            onClick={onOpenFolder}
                            className="mt-2 px-4 py-2 rounded-lg bg-carbon-primary text-white text-xs font-semibold hover:bg-carbon-primary-hover shadow-lg shadow-carbon-primary/20 transition-all flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Open Folder
                        </button>
                    )}
                </div>
            ) : (
                <>
                    {/* Search & Replace Form */}
                    <div className="p-3 border-b border-carbon-border space-y-2.5 bg-carbon-surface/60">
                        {/* Search Row */}
                        <div className="relative">
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Search in files..."
                                className="w-full bg-carbon-bg text-carbon-text text-xs px-3 py-2 pr-8 rounded-lg border border-carbon-border focus:border-carbon-accent focus:outline-none placeholder-carbon-text-muted/60 transition-colors"
                            />
                            {searching && (
                                <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                                    <div className="w-3.5 h-3.5 border-2 border-carbon-accent border-t-transparent rounded-full animate-spin" />
                                </div>
                            )}
                        </div>

                        {/* Replace Row */}
                        {showReplace && (
                            <div className="flex items-center gap-1.5 animate-fade-in">
                                <input
                                    type="text"
                                    value={replaceText}
                                    onChange={(e) => setReplaceText(e.target.value)}
                                    placeholder="Replace with..."
                                    className="flex-1 bg-carbon-bg text-carbon-text text-xs px-3 py-1.5 rounded-lg border border-carbon-border focus:border-carbon-accent focus:outline-none placeholder-carbon-text-muted/60 transition-colors"
                                />
                                <button
                                    onClick={handleReplaceAll}
                                    disabled={results.length === 0 || isReplacing}
                                    className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-carbon-accent/20 text-carbon-accent border border-carbon-accent/40 hover:bg-carbon-accent/30 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                                    title="Replace all occurrences across files"
                                >
                                    {isReplacing ? '...' : 'All'}
                                </button>
                            </div>
                        )}

                        {/* Status message */}
                        {replaceStatus && (
                            <div className="text-[11px] text-carbon-accent px-1">
                                {replaceStatus}
                            </div>
                        )}

                        {/* Toggle buttons toolbar */}
                        <div className="flex items-center justify-between gap-1 pt-1">
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setCaseSensitive(!caseSensitive)}
                                    className={`px-2 py-1 text-[11px] font-mono rounded transition-colors ${
                                        caseSensitive
                                            ? 'bg-carbon-primary text-white'
                                            : 'bg-carbon-bg text-carbon-text-muted hover:text-carbon-text border border-carbon-border'
                                    }`}
                                    title="Match Case (Alt+C)"
                                >
                                    Aa
                                </button>
                                <button
                                    onClick={() => setWholeWord(!wholeWord)}
                                    className={`px-2 py-1 text-[11px] font-mono rounded transition-colors ${
                                        wholeWord
                                            ? 'bg-carbon-primary text-white'
                                            : 'bg-carbon-bg text-carbon-text-muted hover:text-carbon-text border border-carbon-border'
                                    }`}
                                    title="Match Whole Word (Alt+W)"
                                >
                                    \b
                                </button>
                                <button
                                    onClick={() => setUseRegex(!useRegex)}
                                    className={`px-2 py-1 text-[11px] font-mono rounded transition-colors ${
                                        useRegex
                                            ? 'bg-carbon-primary text-white'
                                            : 'bg-carbon-bg text-carbon-text-muted hover:text-carbon-text border border-carbon-border'
                                    }`}
                                    title="Use Regular Expression (Alt+R)"
                                >
                                    .*
                                </button>
                            </div>

                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setShowReplace(!showReplace)}
                                    className={`px-2 py-1 text-[11px] rounded transition-colors ${
                                        showReplace
                                            ? 'bg-carbon-accent/20 text-carbon-accent border border-carbon-accent/40'
                                            : 'bg-carbon-bg text-carbon-text-muted hover:text-carbon-text border border-carbon-border'
                                    }`}
                                    title="Toggle Replace"
                                >
                                    Replace
                                </button>
                                <button
                                    onClick={() => setShowOptions(!showOptions)}
                                    className={`p-1 text-xs rounded transition-colors ${
                                        showOptions
                                            ? 'bg-carbon-bg text-carbon-accent border border-carbon-accent'
                                            : 'bg-carbon-bg text-carbon-text-muted hover:text-carbon-text border border-carbon-border'
                                    }`}
                                    title="File Filters"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Include pattern input */}
                        {showOptions && (
                            <div className="animate-fade-in pt-1">
                                <input
                                    type="text"
                                    value={includePattern}
                                    onChange={(e) => setIncludePattern(e.target.value)}
                                    placeholder="Files to include (e.g. *.java, *.cpp)"
                                    className="w-full bg-carbon-bg text-carbon-text text-xs px-2.5 py-1.5 rounded-lg border border-carbon-border focus:border-carbon-accent focus:outline-none placeholder-carbon-text-muted/60"
                                />
                            </div>
                        )}
                    </div>

                    {/* Results list */}
                    <div className="flex-1 overflow-y-auto scrollbar-thin">
                        {!searched && !searching && (
                            <div className="text-xs text-carbon-text-muted text-center py-12 px-4">
                                Type your search query above to search across the project.
                            </div>
                        )}

                        {searched && !searching && results.length === 0 && (
                            <div className="text-xs text-carbon-text-muted text-center py-12 px-4">
                                No matches found for <span className="text-carbon-text font-medium">"{query}"</span>
                            </div>
                        )}

                        {truncated && (
                            <div className="px-3 py-1.5 text-[11px] text-carbon-warning bg-carbon-warning/10 border-b border-carbon-warning/20">
                                Results truncated to first {results.length} matches.
                            </div>
                        )}

                        {searching && query.trim() && (
                            <div className="text-xs text-carbon-text-muted text-center py-12 flex items-center justify-center gap-2">
                                <div className="w-4 h-4 border-2 border-carbon-accent border-t-transparent rounded-full animate-spin" />
                                Searching files...
                            </div>
                        )}

                        {searched && !searching && groupedResults.map((group) => (
                            <div key={group.file} className="border-b border-carbon-border/50">
                                {/* File Header */}
                                <div className="px-3 py-1.5 text-xs font-semibold text-carbon-text bg-carbon-surface-hover/80 sticky top-0 border-b border-carbon-border/60 flex items-center justify-between">
                                    <span className="truncate" title={group.file}>
                                        {rootPath ? relativePath(group.file, rootPath) : basename(group.file)}
                                    </span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-carbon-elevated text-carbon-text-muted font-mono">
                                        {group.results.length}
                                    </span>
                                </div>

                                {/* Results in this file */}
                                {group.results.map((r, i) => (
                                    <button
                                        key={`${r.file}:${r.line}:${r.column}:${i}`}
                                        onClick={() => onResultClick(r.file, r.line, r.column)}
                                        className="w-full text-left px-3 py-1.5 hover:bg-carbon-surface-hover transition-colors border-b border-carbon-border/20 group flex items-baseline gap-2"
                                    >
                                        <span className="text-[11px] font-mono text-carbon-text-muted group-hover:text-carbon-accent shrink-0">
                                            {r.line}:{r.column}
                                        </span>
                                        <span className="text-xs text-carbon-text-secondary truncate group-hover:text-carbon-text font-mono">
                                            {r.lineContent.trim()}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        ))}
                    </div>

                    {/* Footer */}
                    {searched && !searching && results.length > 0 && (
                        <div className="px-3.5 py-2 text-[11px] text-carbon-text-muted border-t border-carbon-border bg-carbon-elevated/40 flex items-center justify-between">
                            <span>{results.length} match{results.length !== 1 ? 'es' : ''} in {groupedResults.length} file{groupedResults.length !== 1 ? 's' : ''}</span>
                            <span className="text-[10px] uppercase tracking-wider text-carbon-text-muted/60">Press Esc to close</span>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

export default SearchPanel
