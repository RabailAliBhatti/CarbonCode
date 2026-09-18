import React, { useState, useEffect } from 'react'

interface FileNode {
    name: string
    path: string
    isDirectory: boolean
    children?: FileNode[]
    expanded?: boolean
}

interface FileExplorerProps {
    isVisible: boolean
    onToggle: () => void
    onFileSelect: (filePath: string) => void
    currentFilePath: string | null
    rootPath: string | null
    onOpenFolder: () => void
    width?: number
    theme?: 'dark' | 'light'
    onToggleTheme?: () => void
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
    isVisible,
    onToggle,
    onFileSelect,
    currentFilePath,
    rootPath,
    onOpenFolder,
    width = 250,
    theme = 'dark',
    onToggleTheme
}) => {
    const [files, setFiles] = useState<FileNode[]>([])
    const [loading, setLoading] = useState(false)
    const [isCreatingFile, setIsCreatingFile] = useState(false)
    const [newFileName, setNewFileName] = useState('')

    // Load directory when rootPath changes
    useEffect(() => {
        if (rootPath) {
            loadDirectory(rootPath)
        } else {
            setFiles([])
        }
    }, [rootPath])

    // Auto-refresh when programs finish running or files change
    useEffect(() => {
        if (!window.electronAPI?.onWorkspaceRefresh || !rootPath) return
        const cleanup = window.electronAPI.onWorkspaceRefresh(() => {
            loadDirectory(rootPath)
        })
        return () => cleanup?.()
    }, [rootPath])

    const handleCreateFile = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        const trimmed = newFileName.trim()
        if (!trimmed || !rootPath) {
            setIsCreatingFile(false)
            setNewFileName('')
            return
        }
        try {
            const res = await window.electronAPI.createFile(rootPath, trimmed)
            if (res.success && res.filePath) {
                await loadDirectory(rootPath)
                onFileSelect(res.filePath)
            } else if (res.error) {
                console.error('Failed to create file:', res.error)
            }
        } catch (err) {
            console.error('Error creating file:', err)
        }
        setIsCreatingFile(false)
        setNewFileName('')
    }

    const loadDirectory = async (dirPath: string) => {
        setLoading(true)
        try {
            const contents = await window.electronAPI.readDirectory(dirPath)
            const nodes: FileNode[] = contents
                .filter((item: { name: string }) => !item.name.startsWith('.'))
                .map((item: { name: string; isDirectory: boolean; path: string }) => ({
                    name: item.name,
                    path: item.path,
                    isDirectory: item.isDirectory,
                    expanded: false,
                    children: item.isDirectory ? [] : undefined
                }))
                .sort((a: FileNode, b: FileNode) => {
                    if (a.isDirectory && !b.isDirectory) return -1
                    if (!a.isDirectory && b.isDirectory) return 1
                    return a.name.localeCompare(b.name)
                })
            setFiles(nodes)
        } catch (error) {
            console.error('Failed to load directory:', error)
        }
        setLoading(false)
    }

    const toggleDirectory = async (node: FileNode, path: number[]) => {
        if (!node.isDirectory) {
            const content = await window.electronAPI.readFile(node.path)
            if (content !== null) {
                onFileSelect(node.path)
            }
            return
        }

        const newFiles = [...files]
        let current: FileNode | FileNode[] = newFiles

        for (let i = 0; i < path.length - 1; i++) {
            current = (current as FileNode[])[path[i]].children || []
        }

        const targetNode = (current as FileNode[])[path[path.length - 1]]
        targetNode.expanded = !targetNode.expanded

        if (targetNode.expanded && (!targetNode.children || targetNode.children.length === 0)) {
            const contents = await window.electronAPI.readDirectory(targetNode.path)
            targetNode.children = contents
                .filter((item: { name: string }) => !item.name.startsWith('.'))
                .map((item: { name: string; isDirectory: boolean; path: string }) => ({
                    name: item.name,
                    path: item.path,
                    isDirectory: item.isDirectory,
                    expanded: false,
                    children: item.isDirectory ? [] : undefined
                }))
                .sort((a: FileNode, b: FileNode) => {
                    if (a.isDirectory && !b.isDirectory) return -1
                    if (!a.isDirectory && b.isDirectory) return 1
                    return a.name.localeCompare(b.name)
                })
        }

        setFiles(newFiles)
    }

    const getFileIcon = (fileName: string) => {
        const ext = fileName.split('.').pop()?.toLowerCase()

        if (ext === 'c') {
            return <span className="w-4 h-4 text-xs font-bold text-cyan-400 flex items-center justify-center shrink-0">C</span>
        }
        if (['cpp', 'cc', 'cxx'].includes(ext || '')) {
            return <span className="w-4 h-4 text-xs font-bold text-blue-400 flex items-center justify-center shrink-0">C++</span>
        }
        if (['h', 'hpp', 'hxx'].includes(ext || '')) {
            return <span className="w-4 h-4 text-xs font-bold text-blue-300 flex items-center justify-center shrink-0">H</span>
        }
        if (['py', 'pyw'].includes(ext || '')) {
            return <span className="w-4 h-4 text-xs font-bold text-yellow-400 flex items-center justify-center shrink-0">Py</span>
        }
        if (ext === 'java') {
            return <span className="w-4 h-4 text-xs font-bold text-orange-400 flex items-center justify-center shrink-0">J</span>
        }
        if (['txt', 'text', 'log'].includes(ext || '')) {
            return (
                <svg className="w-4 h-4 text-sky-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            )
        }
        if (['csv', 'tsv'].includes(ext || '')) {
            return (
                <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18m-9-4v8m-7 4h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            )
        }
        if (['in', 'dat'].includes(ext || '')) {
            return <span className="w-4 h-4 text-[9px] font-bold text-violet-400 flex items-center justify-center shrink-0 font-mono">IN</span>
        }
        if (ext === 'out') {
            return <span className="w-4 h-4 text-[8px] font-bold text-teal-400 flex items-center justify-center shrink-0 font-mono">OUT</span>
        }
        if (['json', 'jsonc'].includes(ext || '')) {
            return <span className="w-4 h-4 text-xs font-bold text-amber-400 flex items-center justify-center shrink-0">{'{}'}</span>
        }
        if (['md', 'markdown'].includes(ext || '')) {
            return <span className="w-4 h-4 text-xs font-bold text-carbon-text-muted flex items-center justify-center shrink-0">M↓</span>
        }
        if (['exe', 'bin'].includes(ext || '')) {
            return (
                <svg className="w-4 h-4 text-carbon-success shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                </svg>
            )
        }

        return (
            <svg className="w-4 h-4 text-carbon-text-muted shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
        )
    }

    const renderNode = (node: FileNode, path: number[], depth: number = 0) => {
        const isActive = currentFilePath === node.path

        return (
            <div key={node.path}>
                <button
                    onClick={() => toggleDirectory(node, path)}
                    className={`
                        w-full flex items-center gap-2 px-2.5 py-1 text-xs text-left rounded-md transition-colors
                        ${isActive
                            ? 'bg-carbon-elevated text-carbon-text-primary border border-carbon-border'
                            : 'text-carbon-text-secondary hover:text-carbon-text-primary hover:bg-carbon-elevated/40'
                        }
                    `}
                    style={{ paddingLeft: `${depth * 14 + 10}px` }}
                >
                    {node.isDirectory ? (
                        <svg
                            className={`w-3 h-3 text-carbon-text-muted transition-transform duration-150 ${node.expanded ? 'rotate-90' : ''}`}
                            fill="currentColor"
                            viewBox="0 0 16 16"
                        >
                            <path d="M6 12l4-4-4-4v8z" />
                        </svg>
                    ) : (
                        <span className="w-3" />
                    )}

                    {node.isDirectory ? (
                        <svg className="w-4 h-4 text-carbon-warning/90 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1H8a3 3 0 00-3 3v1.5a1.5 1.5 0 01-3 0V6z" />
                            <path d="M6 12a2 2 0 012-2h8a2 2 0 012 2v2a2 2 0 01-2 2H2h2a2 2 0 002-2v-2z" />
                        </svg>
                    ) : (
                        getFileIcon(node.name)
                    )}

                    <span className="truncate font-mono">{node.name}</span>
                </button>

                {node.isDirectory && node.expanded && node.children && (
                    <div className="animate-fade-in">
                        {node.children.map((child, index) =>
                            renderNode(child, [...path, index], depth + 1)
                        )}
                    </div>
                )}
            </div>
        )
    }

    if (!isVisible) return null

    return (
        <div
            style={{ width }}
            className="h-full bg-carbon-surface border border-carbon-border rounded-xl flex flex-col shrink-0 select-none overflow-hidden shadow-card"
        >
            {/* Explorer Card Header */}
            <div className="h-10 px-3.5 flex items-center justify-between border-b border-carbon-border bg-carbon-surface">
                <span className="text-xs font-bold text-carbon-text-primary tracking-wider uppercase">
                    Explorer
                </span>
                <div className="flex items-center gap-1">
                    {rootPath && (
                        <>
                            <button
                                onClick={() => setIsCreatingFile(true)}
                                className="p-1 text-carbon-text-secondary hover:text-carbon-text-primary hover:bg-carbon-elevated rounded transition-colors"
                                title="New File in Folder"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </button>
                            <button
                                onClick={() => { if (rootPath) loadDirectory(rootPath); }}
                                className="p-1 text-carbon-text-secondary hover:text-carbon-text-primary hover:bg-carbon-elevated rounded transition-colors"
                                title="Refresh Explorer"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            </button>
                        </>
                    )}
                    <button
                        onClick={onOpenFolder}
                        className="p-1 text-carbon-text-secondary hover:text-carbon-text-primary hover:bg-carbon-elevated rounded transition-colors"
                        title="Open Folder"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                    </button>
                    <button
                        onClick={onToggle}
                        className="p-1 text-carbon-text-secondary hover:text-carbon-text-primary hover:bg-carbon-elevated rounded transition-colors"
                        title="Close Explorer"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Tree Area */}
            <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="w-5 h-5 border-2 border-carbon-accent border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : rootPath ? (
                    <div>
                        <div className="px-2 py-1 text-[11px] font-bold text-carbon-text-muted uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-carbon-warning/80" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M2 6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1H8a3 3 0 00-3 3v1.5a1.5 1.5 0 01-3 0V6z" />
                                <path d="M6 12a2 2 0 012-2h8a2 2 0 012 2v2a2 2 0 01-2 2H2h2a2 2 0 002-2v-2z" />
                            </svg>
                            <span className="truncate">{rootPath.split(/[\\/]/).pop()}</span>
                        </div>

                        {/* Inline New File Form */}
                        {isCreatingFile && (
                            <form onSubmit={handleCreateFile} className="px-2 py-1 mb-1.5 flex items-center gap-1.5 bg-carbon-elevated/80 border border-carbon-accent/50 rounded-md">
                                <svg className="w-3.5 h-3.5 text-sky-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <input
                                    autoFocus
                                    type="text"
                                    value={newFileName}
                                    onChange={(e) => setNewFileName(e.target.value)}
                                    onBlur={() => {
                                        if (!newFileName.trim()) setIsCreatingFile(false)
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Escape') {
                                            setIsCreatingFile(false)
                                            setNewFileName('')
                                        }
                                    }}
                                    placeholder="filename (e.g. input.txt)"
                                    className="flex-1 bg-transparent text-xs text-carbon-text-primary outline-none font-mono placeholder:text-carbon-text-muted/60"
                                />
                            </form>
                        )}

                        {files.map((node, index) => renderNode(node, [index]))}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4">
                        <div className="w-10 h-10 rounded-xl bg-carbon-elevated border border-carbon-border flex items-center justify-center text-carbon-text-muted mb-2.5">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                        </div>
                        <p className="text-xs font-medium text-carbon-text-primary mb-1">No folder open</p>
                        <p className="text-[11px] text-carbon-text-muted mb-3">Open a workspace folder to view files</p>
                        <button
                            onClick={onOpenFolder}
                            className="px-3.5 py-1.5 bg-carbon-accent hover:bg-carbon-accent-highlight text-white rounded-lg text-xs font-medium transition-all shadow-sm"
                        >
                            Open Folder
                        </button>
                    </div>
                )}
            </div>

            {/* Bottom Theme Selector */}
            {onToggleTheme && (
                <div className="p-2 border-t border-carbon-border-subtle bg-carbon-surface">
                    <button
                        onClick={onToggleTheme}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-carbon-bg border border-carbon-border text-[11px] text-carbon-text-secondary hover:text-carbon-text-primary hover:border-carbon-accent transition-all"
                        title={`Theme: ${theme}. Click to switch.`}
                    >
                        <div className="flex items-center gap-1.5">
                            {theme === 'dark' ? (
                                <svg className="w-3 h-3 text-carbon-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                </svg>
                            ) : (
                                <svg className="w-3 h-3 text-carbon-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            )}
                            <span className="capitalize">{theme === 'dark' ? 'Dark' : 'Light'}</span>
                        </div>
                        <svg className="w-3 h-3 text-carbon-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                </div>
            )}
        </div>
    )
}

export default FileExplorer
