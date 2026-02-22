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
}

function FileExplorer({ isVisible, onToggle, onFileSelect, currentFilePath }: FileExplorerProps) {
    const [rootPath, setRootPath] = useState<string | null>(null)
    const [files, setFiles] = useState<FileNode[]>([])
    const [loading, setLoading] = useState(false)

    // Open folder handler
    const handleOpenFolder = async () => {
        const result = await window.electronAPI.openFolder()
        if (result) {
            setRootPath(result)
            loadDirectory(result)
        }
    }

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

    // Render file tree node
    const renderNode = (node: FileNode, path: number[], depth: number = 0) => {
        const isActive = currentFilePath === node.path
        const isCppFile = node.name.endsWith('.cpp') || node.name.endsWith('.c') ||
            node.name.endsWith('.h') || node.name.endsWith('.hpp')

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
                    {node.isDirectory && (
                        <svg
                            className={`w-3 h-3 text-text-secondary transition-transform ${node.expanded ? 'rotate-90' : ''}`}
                            fill="currentColor"
                            viewBox="0 0 16 16"
                        >
                            <path d="M6 12l4-4-4-4v8z" />
                        </svg>
                    )}

                    {/* File/Folder Icon */}
                    {node.isDirectory ? (
                        <svg className="w-4 h-4 text-warning" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                        </svg>
                    ) : isCppFile ? (
                        <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                        </svg>
                    ) : (
                        <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                        </svg>
                    )}

                    {/* File Name */}
                    <span className="truncate">{node.name}</span>
                </button>

                {/* Children */}
                {node.isDirectory && node.expanded && node.children && (
                    <div>
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
        <div className="w-64 bg-editor-sidebar border-r border-editor-border flex flex-col shrink-0">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-editor-border">
                <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Explorer
                </span>
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleOpenFolder}
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
                            onClick={handleOpenFolder}
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
