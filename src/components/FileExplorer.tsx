import { useState, useEffect } from 'react'

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
}

function FileExplorer({ isVisible, onToggle, onFileSelect, currentFilePath, rootPath, onOpenFolder, width = 250 }: FileExplorerProps) {
    // Internal state for files
    const [files, setFiles] = useState<FileNode[]>([])
    const [loading, setLoading] = useState(false)

    // Load directory when rootPath changes
    useEffect(() => {
        if (rootPath) {
            loadDirectory(rootPath)
        } else {
            setFiles([])
        }
    }, [rootPath])

    // Load directory contents
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
                    // Directories first, then files alphabetically
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

    // Toggle directory expansion
    const toggleDirectory = async (node: FileNode, path: number[]) => {
        if (!node.isDirectory) {
            // Open file
            const content = await window.electronAPI.readFile(node.path)
            if (content !== null) {
                onFileSelect(node.path)
            }
            return
        }

        // Toggle expansion
        const newFiles = [...files]
        let current: FileNode | FileNode[] = newFiles

        for (let i = 0; i < path.length - 1; i++) {
            current = (current as FileNode[])[path[i]].children || []
        }

        const targetNode = (current as FileNode[])[path[path.length - 1]]
        targetNode.expanded = !targetNode.expanded

        if (targetNode.expanded && (!targetNode.children || targetNode.children.length === 0)) {
            // Load children
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

    // Get file icon based on extension
    const getFileIcon = (fileName: string) => {
        const ext = fileName.split('.').pop()?.toLowerCase()

        // C/C++ files - blue accent
        if (['cpp', 'c', 'cc', 'cxx'].includes(ext || '')) {
            return <span className="w-4 h-4 text-xs font-bold text-blue-400 flex items-center justify-center">C++</span>
        }
        if (['h', 'hpp', 'hxx'].includes(ext || '')) {
            return <span className="w-4 h-4 text-xs font-bold text-blue-300 flex items-center justify-center">H</span>
        }

        // Config/data files
        if (['json', 'jsonc'].includes(ext || '')) {
            return <span className="w-4 h-4 text-xs font-bold text-yellow-400 flex items-center justify-center">{'{}'}</span>
        }
        if (['md', 'markdown'].includes(ext || '')) {
            return <span className="w-4 h-4 text-xs font-bold text-text-secondary flex items-center justify-center">M↓</span>
        }
        if (['txt', 'log'].includes(ext || '')) {
            return (
                <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            )
        }

        // Executables
        if (['exe', 'out', 'bin'].includes(ext || '')) {
            return (
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )
        }

        // Makefile
        if (fileName.toLowerCase() === 'makefile' || ext === 'mk') {
            return <span className="w-4 h-4 text-xs font-bold text-orange-400 flex items-center justify-center">M</span>
        }

        // Default file icon
        return (
            <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
        )
    }

    // Render file tree node
    const renderNode = (node: FileNode, path: number[], depth: number = 0) => {
        const isActive = currentFilePath === node.path

        return (
            <div key={node.path}>
                <button
                    onClick={() => toggleDirectory(node, path)}
                    className={`
                        w-full flex items-center gap-2 px-2 py-1 text-sm text-left
                        hover:bg-editor-highlight/50 transition-colors rounded
                        ${isActive ? 'bg-editor-highlight text-text-bright' : 'text-text-primary'}
                    `}
                    style={{ paddingLeft: `${depth * 16 + 8}px` }}
                >
                    {/* Expand/Collapse Icon */}
                    {node.isDirectory ? (
                        <svg
                            className={`w-3 h-3 text-text-secondary transition-transform duration-150 ${node.expanded ? 'rotate-90' : ''}`}
                            fill="currentColor"
                            viewBox="0 0 16 16"
                        >
                            <path d="M6 12l4-4-4-4v8z" />
                        </svg>
                    ) : (
                        <span className="w-3" /> // Spacer for alignment
                    )}

                    {/* File/Folder Icon */}
                    {node.isDirectory ? (
                        node.expanded ? (
                            <svg className="w-4 h-4 text-warning" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1H8a3 3 0 00-3 3v1.5a1.5 1.5 0 01-3 0V6z" clipRule="evenodd" />
                                <path d="M6 12a2 2 0 012-2h8a2 2 0 012 2v2a2 2 0 01-2 2H2h2a2 2 0 002-2v-2z" />
                            </svg>
                        ) : (
                            <svg className="w-4 h-4 text-warning" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                            </svg>
                        )
                    ) : (
                        getFileIcon(node.name)
                    )}

                    {/* File Name */}
                    <span className="truncate">{node.name}</span>
                </button>

                {/* Children with animation */}
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
        <div style={{ width }} className="bg-editor-sidebar border-r border-editor-border flex flex-col shrink-0">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-editor-border">
                <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Explorer
                </span>
                <div className="flex items-center gap-1">
                    <button
                        onClick={onOpenFolder}
                        className="p-1 hover:bg-editor-border rounded transition-colors"
                        title="Open Folder"
                    >
                        <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                            />
                        </svg>
                    </button>
                    <button
                        onClick={onToggle}
                        className="p-1 hover:bg-editor-border rounded transition-colors"
                        title="Close Explorer (Ctrl+B)"
                    >
                        <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-2">
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : rootPath ? (
                    <div>
                        {/* Root folder name */}
                        <div className="px-2 py-1 text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                            {rootPath.split(/[\\/]/).pop()}
                        </div>
                        {files.map((node, index) => renderNode(node, [index]))}
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <svg className="w-12 h-12 mx-auto text-text-secondary/30 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                            />
                        </svg>
                        <p className="text-text-secondary text-sm mb-3">No folder open</p>
                        <button
                            onClick={onOpenFolder}
                            className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded text-sm transition-colors"
                        >
                            Open Folder
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

export default FileExplorer
