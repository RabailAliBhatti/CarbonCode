import { useState, useEffect, useCallback, useRef, MouseEvent } from 'react'
import type { editor } from 'monaco-editor'
import Editor from './components/Editor'
import Toolbar from './components/Toolbar'
import OutputPanel from './components/OutputPanel'
import StatusBar from './components/StatusBar'
import WelcomeScreen from './components/WelcomeScreen'
import TabBar from './components/TabBar'
import FileExplorer from './components/FileExplorer'
import FindReplace from './components/FindReplace'
import SettingsModal from './components/SettingsModal'
import { useFileManager } from './hooks/useFileManager'
import { useSettings } from './hooks/useSettings'

interface CompilationResult {
    success: boolean
    output: string
    error: string
    compileTime?: number
    executionTime?: number
}

function App() {
    // Settings
    const { settings, updateSetting } = useSettings()
    const [showSettings, setShowSettings] = useState(false)

    // File management with tabs
    const fileManager = useFileManager()
    const {
        tabs,
        activeTab,
        activeTabId,
        createNewTab,
        openFile,
        updateTabContent,
        markTabSaved,
        closeTab,
        switchToTab
    } = fileManager

    // UI state
    const [showWelcome, setShowWelcome] = useState<boolean>(true)
    const [showExplorer, setShowExplorer] = useState<boolean>(false)
    const [showFind, setShowFind] = useState<boolean>(false)

    // Sync Welcome Screen with Tabs
    useEffect(() => {
        if (tabs.length === 0) {
            setShowWelcome(true)
        } else {
            setShowWelcome(false)
        }
    }, [tabs.length])

    // Compiler state
    const [compilerInfo, setCompilerInfo] = useState<string | null>(null)
    const [isCompiling, setIsCompiling] = useState<boolean>(false)
    const [compilationResult, setCompilationResult] = useState<{
        success: boolean
        output: string
        error: string
        compileTime?: number
        executionTime?: number
    } | null>(null)

    // UI state
    const [outputHeight, setOutputHeight] = useState<number>(200)

    // Apply theme
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', settings.theme)
    }, [settings.theme])

    // Interactive Process State
    const [isRunning, setIsRunning] = useState<boolean>(false)

    // Listeners for process output
    useEffect(() => {
        const cleanStdout = window.electronAPI.onProcessStdout((data) => {
            setCompilationResult(prev => {
                const newOutput = (prev?.output || '') + data
                return {
                    success: true, // Optimistic
                    output: newOutput,
                    error: prev?.error || '',
                    compileTime: prev?.compileTime,
                    executionTime: prev?.executionTime
                }
            })
        })

        const cleanStderr = window.electronAPI.onProcessStderr((data) => {
            setCompilationResult(prev => {
                // stderr for running process might just be info/errors
                // we can append to error, or output depending on preference.
                // Usually stderr is separate.
                const newError = (prev?.error || '') + data
                return {
                    ...prev!,
                    error: newError
                }
            })
        })

        const cleanExit = window.electronAPI.onProcessExit((code) => {
            setIsRunning(false)
            setCompilationResult(prev => {
                if (code !== 0) {
                    return {
                        ...prev!,
                        success: false,
                        error: (prev?.error || '') + `\nProgram exited with code ${code}`
                    }
                }
                return {
                    ...prev!,
                    success: true
                }
            })
        })

        return () => {
            cleanStdout()
            cleanStderr()
            cleanExit()
        }
    }, [])

    const handleStop = useCallback(async () => {
        await window.electronAPI.stopProcess()
        setIsRunning(false)
    }, [])

    const handleInput = useCallback((data: string) => {
        window.electronAPI.writeProcess(data)
        // Echo input to output? Usually terminals echo input.
        // If the process echoes, we don't need to.
        // Assuming process handles echo if it's a TTY, but we are capturing pipes.
        // We might want to manually echo to UX if the process doesn't.
        // For now, let's append input to output for clarity.
        setCompilationResult(prev => ({
            ...prev!,
            output: (prev?.output || '') + data
        }))
    }, [])
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
    const [editorInstance, setEditorInstance] = useState<editor.IStandaloneCodeEditor | null>(null)

    // Check for compiler on mount
    useEffect(() => {
        const checkCompiler = async () => {
            const compiler = await window.electronAPI.detectCompiler()
            setCompilerInfo(compiler)
        }
        checkCompiler()
    }, [])

    // Update dirty state in main process
    useEffect(() => {
        const hasUnsaved = tabs.some(tab => tab.isDirty)
        window.electronAPI.setDirty(hasUnsaved)
    }, [tabs])

    // Handle code changes
    const handleCodeChange = useCallback((value: string | undefined) => {
        if (value !== undefined && activeTabId) {
            updateTabContent(activeTabId, value)
        }
    }, [activeTabId, updateTabContent])

    // New file handler
    const handleNewFile = useCallback(() => {
        // Just create the tab, the effect will handle hiding welcome screen
        const newTab = createNewTab()
        // Ensure explorer is hidden if preferred, or keep as is
    }, [createNewTab])

    // Open file handler
    const handleOpenFile = useCallback(async () => {
        const file = await window.electronAPI.openFile()
        if (file) {
            openFile(file.filePath, file.content)
            // Effect sends welcome screen away

            // Add to recent files (local storage logic could go here)
        }
    }, [openFile])

    // Save file handler
    const handleSave = useCallback(async () => {
        if (!activeTab) return

        if (!activeTab.filePath) {
            // Save As
            const result = await window.electronAPI.saveFile(activeTab.content)
            if (result && result.success) {
                markTabSaved(activeTab.id, result.filePath)
            }
        } else {
            // Save to existing path
            const result = await window.electronAPI.saveFile(activeTab.content, activeTab.filePath)
            if (result && result.success) {
                markTabSaved(activeTab.id, result.filePath)
            }
        }
    }, [activeTab, markTabSaved])

    // Save As handler
    const handleSaveAs = useCallback(async () => {
        if (!activeTab) return
        const currentCode = editorRef.current?.getValue() || activeTab.content
        const result = await window.electronAPI.saveFile(currentCode, undefined)
        if (result) {
            markTabSaved(activeTab.id, result.filePath)
        }
    }, [activeTab, markTabSaved])

    // Run compilation handler
    const handleRun = useCallback(async () => {
        if (!activeTab) return

        if (!compilerInfo) {
            setCompilationResult({
                success: false,
                output: '',
                error: '❌ No C++ compiler detected!\n\nPlease install a C++ compiler and restart the application.'
            })
            return
        }

        // If already running, stop first? Or prevent run.
        if (isRunning) {
            // Use stop handler logic
            await window.electronAPI.stopProcess()
            // Wait a bit?
        }

        setIsCompiling(true)
        setCompilationResult(null)
        // Welcome screen logic handled by effect, but we can ensure it's hidden if running (should already be)

        const currentCode = editorRef.current?.getValue() || activeTab.content

        // Use new interactive process API
        const startResult = await window.electronAPI.startProcess(currentCode, settings.cppStandard)

        setIsCompiling(false)

        if (startResult.success) {
            setIsRunning(true)
            setCompilationResult({
                success: true,
                output: '',
                error: '',
                compileTime: startResult.compileTime
            })
        } else {
            setCompilationResult({
                success: false,
                output: '',
                error: startResult.error || 'Unknown error',
                compileTime: startResult.compileTime
            })
        }

    }, [activeTab, settings.cppStandard, compilerInfo, isRunning])

    // Tab close handler
    const handleTabClose = useCallback(async (tabId: string, e: MouseEvent) => {
        e.stopPropagation()
        const tab = tabs.find(t => t.id === tabId)

        if (tab?.isDirty) {
            const result = await window.electronAPI.showMessage({
                type: 'warning',
                buttons: ['Save', "Don't Save", 'Cancel'],
                defaultId: 0,
                cancelId: 2,
                title: 'Unsaved Changes',
                message: `Do you want to save changes to ${tab.fileName}?`
            })

            if (result.response === 0) {
                // Save first
                const currentCode = editorRef.current?.getValue() || tab.content
                const saveResult = await window.electronAPI.saveFile(currentCode, tab.filePath || undefined)
                if (saveResult) {
                    markTabSaved(tabId, saveResult.filePath)
                }
                closeTab(tabId)
            } else if (result.response === 1) {
                // Don't save
                closeTab(tabId)
            }
            // Cancel - do nothing
        } else {
            closeTab(tabId)
        }
    }, [tabs, closeTab, markTabSaved])

    // Register menu event listeners
    useEffect(() => {
        const cleanupNewFile = window.electronAPI.onNewFile(handleNewFile)
        const cleanupOpenFile = window.electronAPI.onOpenFile(handleOpenFile)
        const cleanupSave = window.electronAPI.onSave(handleSave)
        const cleanupSaveAs = window.electronAPI.onSaveAs(handleSaveAs)
        const cleanupRun = window.electronAPI.onRun(handleRun)

        return () => {
            cleanupNewFile()
            cleanupOpenFile()
            cleanupSave()
            cleanupSaveAs()
            cleanupRun()
        }
    }, [handleNewFile, handleOpenFile, handleSave, handleSaveAs, handleRun])

    // Keyboard shortcut for toggling explorer
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === 'b') {
                e.preventDefault()
                setShowExplorer(prev => !prev)
            }
            if (e.ctrlKey && (e.key === 'f' || e.key === 'h')) {
                e.preventDefault()
                setShowFind(true)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    // Start coding (dismiss welcome screen)
    const handleStartCoding = () => {
        setShowWelcome(false)
    }

    return (
        <div className="h-screen flex flex-col bg-editor-bg overflow-hidden">
            {/* Header Bar */}
            <header className="flex items-center justify-between bg-toolbar-bg border-b border-editor-border px-4 py-2 shrink-0">
                <div className="flex items-center gap-3">
                    {/* Settings */}
                    <button
                        onClick={() => setShowSettings(true)}
                        className="p-2 rounded text-text-secondary hover:text-text-primary hover:bg-editor-border/50 transition-colors"
                        title="Settings"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </button>

                    {/* Explorer Toggle */}
                    <button
                        onClick={() => setShowExplorer(prev => !prev)}
                        className={`p-2 rounded transition-colors ${showExplorer ? 'bg-editor-highlight text-accent' : 'text-text-secondary hover:text-text-primary hover:bg-editor-border/50'}`}
                        title="Toggle Explorer (Ctrl+B)"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                            />
                        </svg>
                    </button>

                    {/* Logo */}
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-blue-600 flex items-center justify-center shadow-glow">
                            <span className="text-white font-bold text-sm">C++</span>
                        </div>
                        <span className="text-text-bright font-semibold text-lg hidden sm:inline">CarbonCode</span>
                    </div>
                </div>

                {/* Right side actions */}
                <div className="flex items-center gap-2">
                    {!compilerInfo && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-error/20 border border-error/50 rounded-md">
                            <svg className="w-4 h-4 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span className="text-error text-sm">No compiler</span>
                        </div>
                    )}
                </div>
            </header>

            {/* Toolbar */}
            <Toolbar
                cppStandard={settings.cppStandard}
                onCppStandardChange={(std) => updateSetting('cppStandard', std)}
                onRun={handleRun}
                onNewFile={handleNewFile}
                onOpenFile={handleOpenFile}
                onSave={handleSave}
                isCompiling={isCompiling} // Could also indicate isRunning visually in Toolbar if needed
                hasCompiler={!!compilerInfo}
            />

            {/* Tab Bar */}
            {!showWelcome && activeTabId && (
                <TabBar
                    tabs={tabs}
                    activeTabId={activeTabId}
                    onTabClick={switchToTab}
                    onTabClose={handleTabClose}
                    onNewTab={handleNewFile}
                />
            )}

            {/* Main Content */}
            <main className="flex-1 flex min-h-0 relative">
                {/* File Explorer */}
                {!showWelcome && (
                    <FileExplorer
                        isVisible={showExplorer}
                        onToggle={() => setShowExplorer(false)}
                        onFileSelect={async (filePath) => {
                            const content = await window.electronAPI.readFile(filePath)
                            if (content !== null) {
                                openFile(filePath, content)
                            }
                        }}
                        currentFilePath={activeTab?.filePath || null}
                    />
                )}

                {/* Find & Replace */}
                {showFind && !showWelcome && (
                    <FindReplace
                        editor={editorInstance}
                        isVisible={showFind}
                        onClose={() => setShowFind(false)}
                    />
                )}

                {/* Settings Modal */}
                <SettingsModal
                    isVisible={showSettings}
                    onClose={() => setShowSettings(false)}
                    settings={settings}
                    onUpdateSetting={updateSetting}
                />

                {/* Editor Area */}
                <div className="flex-1 flex flex-col min-h-0">
                    {showWelcome ? (
                        <WelcomeScreen
                            compilerInfo={compilerInfo}
                            onNewFile={handleNewFile}
                            onOpenFile={handleOpenFile}
                            onStartCoding={handleStartCoding}
                        />
                    ) : (
                        <>
                            {/* Editor */}
                            <div
                                className="flex-1 min-h-0"
                                style={{ height: `calc(100% - ${outputHeight}px)` }}
                            >
                                <Editor
                                    value={activeTab?.content || ''}
                                    onChange={handleCodeChange}
                                    onEditorMount={(editor) => {
                                        editorRef.current = editor
                                        setEditorInstance(editor)
                                    }}
                                    fontSize={settings.fontSize}
                                    tabSize={settings.tabSize}
                                    minimap={settings.minimap}
                                    wordWrap={settings.wordWrap}
                                    theme={settings.theme}
                                />
                            </div>

                            {/* Resize Handle */}
                            <div
                                className="h-1 bg-editor-border cursor-ns-resize hover:bg-accent transition-colors shrink-0"
                                onMouseDown={(e) => {
                                    e.preventDefault()
                                    const startY = e.clientY
                                    const startHeight = outputHeight

                                    const onMouseMove = (e: globalThis.MouseEvent) => {
                                        const delta = startY - e.clientY
                                        const newHeight = Math.min(Math.max(100, startHeight + delta), 500)
                                        setOutputHeight(newHeight)
                                    }

                                    const onMouseUp = () => {
                                        document.removeEventListener('mousemove', onMouseMove)
                                        document.removeEventListener('mouseup', onMouseUp)
                                    }

                                    document.addEventListener('mousemove', onMouseMove)
                                    document.addEventListener('mouseup', onMouseUp)
                                }}
                            />

                            {/* Output Panel */}
                            <div style={{ height: outputHeight }} className="shrink-0">
                                <OutputPanel
                                    result={compilationResult}
                                    isCompiling={isCompiling}
                                    isRunning={isRunning}
                                    onInput={handleInput}
                                    onStop={handleStop}
                                />
                            </div>
                        </>
                    )}
                </div>
            </main>

            {/* Status Bar */}
            <StatusBar
                filePath={activeTab?.filePath || null}
                cppStandard={settings.cppStandard}
                compilerInfo={compilerInfo}
                isCompiling={isCompiling}
                compilationResult={compilationResult}
            />
        </div>
    )
}

export default App
