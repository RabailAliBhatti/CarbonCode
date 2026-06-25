import { useState, useEffect, useCallback, useRef, MouseEvent } from 'react'
import type { editor } from 'monaco-editor'
import Editor from './components/Editor'
import Toolbar from './components/Toolbar'
import OutputPanel from './components/OutputPanel'
import StatusBar from './components/StatusBar'
import WelcomeScreen from './components/WelcomeScreen'
import TabBar from './components/TabBar'
import TabContextMenu from './components/TabContextMenu'
import FileExplorer from './components/FileExplorer'
import FindReplace from './components/FindReplace'
import SearchPanel from './components/SearchPanel'
import SettingsModal from './components/SettingsModal'
import DebugPanel from './components/DebugPanel'
import AnalyticsConsentDialog from './components/AnalyticsConsentDialog'
import NewFileDialog from './components/NewFileDialog'
import { useFileManager } from './hooks/useFileManager'
import { SupportedLanguage } from './types/language'
import { useSettings, CppStandard } from './hooks/useSettings'
import { parseCompileErrors } from './utils/parseCompileErrors'
import type { CompileError } from './utils/parseCompileErrors'
import { loadProjectSettings } from './utils/loadProjectSettings'

interface DebugState {
    status: 'idle' | 'running' | 'stopped' | 'exited'
    currentFile?: string
    currentLine?: number
    breakpoints: { id: number; file: string; line: number }[]
    locals: { name: string; value: string; type: string }[]
}

interface RuntimeInfo {
    language: SupportedLanguage
    compilerPath: string | null
    runtimePath?: string | null
    source: 'custom' | 'bundled' | 'system' | 'none'
    version?: string
}

// Cap accumulated output to prevent the renderer from running out of memory
// when a program prints in a tight infinite loop.
const MAX_OUTPUT_LENGTH = 500 * 1024 // 500 KB

function appendOutput(existing: string, chunk: string): string {
    const combined = existing + chunk
    if (combined.length <= MAX_OUTPUT_LENGTH) return combined
    const tail = combined.slice(-MAX_OUTPUT_LENGTH)
    return `\n... output truncated to last ${MAX_OUTPUT_LENGTH} characters ...\n` + tail
}

function App() {
    // Settings
    const { settings, updateSetting } = useSettings()
    const [showSettings, setShowSettings] = useState(false)
    const [showAnalyticsConsent, setShowAnalyticsConsent] = useState(false)
    const [showNewFileDialog, setShowNewFileDialog] = useState(false)

    // Check if we need to show analytics consent on first launch
    useEffect(() => {
        if (settings.analyticsConsent === null) {
            // Show consent dialog on first launch
            setShowAnalyticsConsent(true)
        }
    }, [])

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
        duplicateTab,
        switchToTab,
        hasRecoveryData,
        acceptRecovery,
        dismissRecovery,
        discardAll,
        reloadTabFromDisk
    } = fileManager

    // Tab recovery: prompt user if previous session data exists
    useEffect(() => {
        if (hasRecoveryData) {
            const promptRecovery = async () => {
                try {
                    const result = await window.electronAPI.showMessage({
                        type: 'question',
                        buttons: ['Restore', 'Start Fresh'],
                        defaultId: 0,
                        title: 'Tab Recovery',
                        message: 'Previous session tabs were found. Would you like to restore them?'
                    })
                    if (result.response === 0) {
                        acceptRecovery()
                    } else {
                        dismissRecovery()
                    }
                } catch {
                    // Fallback: accept recovery if showMessage is not available
                    acceptRecovery()
                }
            }
            promptRecovery()
        }
    }, [hasRecoveryData, acceptRecovery, dismissRecovery])

    // UI state
    const [showWelcome, setShowWelcome] = useState<boolean>(true)
    const [showExplorer, setShowExplorer] = useState<boolean>(false)
    const [showFind, setShowFind] = useState<boolean>(false)
    const [showSearch, setShowSearch] = useState<boolean>(false)

    // Sync Welcome Screen with Tabs
    useEffect(() => {
        if (tabs.length === 0) {
            setShowWelcome(true)
        } else {
            setShowWelcome(false)
        }
    }, [tabs.length])

    // Author name for new file templates
    const [authorName, setAuthorName] = useState<string>('')

    // Compiler state
    const [compilerInfo, setCompilerInfo] = useState<string | null>(null)
    const [javaRuntimeInfo, setJavaRuntimeInfo] = useState<RuntimeInfo | null>(null)
    const [isDetecting, setIsDetecting] = useState<boolean>(true)
    const [isCompiling, setIsCompiling] = useState<boolean>(false)
    const [compilationResult, setCompilationResult] = useState<{
        success: boolean
        output: string
        error: string
        compileTime?: number
        executionTime?: number
    } | null>(null)
    const [parsedErrors, setParsedErrors] = useState<CompileError[]>([])

    // UI state
    const [outputHeight, setOutputHeight] = useState<number>(200)
    const [outputWidth, setOutputWidth] = useState<number>(400)
    const [cursorPosition, setCursorPosition] = useState<{ line: number; column: number }>({ line: 1, column: 1 })
    const [rootPath, setRootPath] = useState<string | null>(null)

    // Apply theme
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', settings.theme)
    }, [settings.theme])

    // Interactive Process State
    const [isRunning, setIsRunning] = useState<boolean>(false)

    // Java debug unsupported state
    const [javaDebugUnsupported, setJavaDebugUnsupported] = useState(false)

    // Debug state
    const [debugState, setDebugState] = useState<DebugState>({
        status: 'idle',
        breakpoints: [],
        locals: []
    })
    const [breakpoints, setBreakpoints] = useState<number[]>([])

    // Track execution start time
    const executionStartRef = useRef<number>(0)

    // Listeners for process output
    useEffect(() => {
        const cleanStdout = window.electronAPI.onProcessStdout((data) => {
            setCompilationResult(prev => ({
                success: true, // Optimistic
                output: appendOutput(prev?.output || '', data),
                error: prev?.error || '',
                compileTime: prev?.compileTime,
                executionTime: prev?.executionTime
            }))
        })

        const cleanStderr = window.electronAPI.onProcessStderr((data) => {
            setCompilationResult(prev => ({
                ...prev!,
                error: appendOutput(prev?.error || '', data)
            }))
        })

        const cleanExit = window.electronAPI.onProcessExit((code) => {
            setIsRunning(false)
            const elapsed = Date.now() - executionStartRef.current
            setCompilationResult(prev => {
                if (code !== 0) {
                    return {
                        ...prev!,
                        success: false,
                        executionTime: elapsed,
                        error: (prev?.error || '') + `\nProgram exited with code ${code}`
                    }
                }
                return {
                    ...prev!,
                    success: true,
                    executionTime: elapsed
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
        // Echo input to output for clarity.
        setCompilationResult(prev => ({
            ...prev!,
            output: appendOutput(prev?.output || '', data)
        }))
    }, [])
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
    const [editorInstance, setEditorInstance] = useState<editor.IStandaloneCodeEditor | null>(null)
    const activeLanguage: SupportedLanguage = activeTab?.language || 'cpp'
    const activeRuntimeInfo = activeLanguage === 'java'
        ? (javaRuntimeInfo?.compilerPath || null)
        : compilerInfo
    const hasActiveRuntime = activeLanguage === 'java'
        ? !!javaRuntimeInfo?.compilerPath && !!javaRuntimeInfo?.runtimePath
        : !!compilerInfo

    // Check for compiler and fetch author name on mount
    useEffect(() => {
        const checkCompiler = async () => {
            setIsDetecting(true)
            const compiler = await window.electronAPI.detectCompiler(settings.compilerPath || undefined)
            setCompilerInfo(compiler)
            const javaRuntime = await window.electronAPI.detectJavaRuntime(settings.javaHome || undefined, settings.javaCompilerPath || undefined)
            setJavaRuntimeInfo(javaRuntime)
            setIsDetecting(false)
        }
        const fetchAuthorName = async () => {
            const name = await window.electronAPI.getAuthorName()
            setAuthorName(name)
        }
        checkCompiler()
        fetchAuthorName()
    }, [settings.compilerPath, settings.javaHome, settings.javaCompilerPath])

    // Update dirty state in main process
    useEffect(() => {
        const hasUnsaved = tabs.some(tab => tab.isDirty)
        window.electronAPI.setDirty(hasUnsaved)
    }, [tabs])

    // Watch files when tabs are opened, unwatch on close
    useEffect(() => {
        const filePaths = tabs.filter(t => t.filePath).map(t => t.filePath!)
        // Watch new files
        for (const fp of filePaths) {
            window.electronAPI.watchFile(fp)
        }
        // Cleanup: unwatch all on unmount or when tabs change
        return () => {
            for (const fp of filePaths) {
                window.electronAPI.unwatchFile(fp)
            }
        }
    }, [tabs])

    // Handle external file changes
    const handleFileChanged = useCallback(async (filePath: string) => {
        const tab = tabs.find(t => t.filePath === filePath)
        if (!tab) return

        if (!tab.isDirty) {
            await reloadTabFromDisk(filePath)
            return
        }

        // File is dirty — ask user
        const result = await window.electronAPI.showMessage({
            type: 'warning',
            buttons: ['Reload from disk', 'Keep my changes'],
            defaultId: 1,
            title: 'File Modified Externally',
            message: `This file was modified outside CarbonCode.\n\nReload and lose your unsaved changes, or keep your version?`
        })

        if (result.response === 0) {
            await reloadTabFromDisk(filePath)
        }
    }, [tabs, reloadTabFromDisk])

    // Listen for file change events
    useEffect(() => {
        const cleanup = window.electronAPI.onFileChanged(handleFileChanged)
        return cleanup
    }, [handleFileChanged])

    // Handle code changes
    const handleCodeChange = useCallback((value: string | undefined) => {
        if (value !== undefined && activeTabId) {
            updateTabContent(activeTabId, value)
        }
    }, [activeTabId, updateTabContent])

    // New file handler
    const handleNewFile = useCallback(async () => {
        setShowNewFileDialog(true)
    }, [])

    const handleNewFileSelect = useCallback((language: 'cpp' | 'java') => {
        setShowNewFileDialog(false)
        createNewTab(language, authorName || undefined)
        window.electronAPI?.trackEvent?.('file_created', { language })
    }, [createNewTab, authorName])

    // Open file handler
    const handleOpenFile = useCallback(async () => {
        const file = await window.electronAPI.openFile()
        if (file) {
            openFile(file.filePath, file.content)
            // Track analytics
            const fileLang = file.filePath?.toLowerCase().endsWith('.java') ? 'java' : 'cpp'
            window.electronAPI?.trackEvent?.('file_opened', { language: fileLang })
            // Effect sends welcome screen away

            // Add to recent files (local storage logic could go here)
        }
    }, [openFile])

    // Open folder handler
    const handleOpenFolder = useCallback(async () => {
        const path = await window.electronAPI.openFolder()
        if (path) {
            setRootPath(path)
            setShowExplorer(true)
            setShowWelcome(false)
            // Save to recent folders (fire and forget)
            window.electronAPI.addRecentFolder(path)
        }
    }, [])

    // Close folder handler
    const handleCloseFolder = useCallback(() => {
        setRootPath(null)
        setShowExplorer(false)
        if (tabs.length === 0) {
            setShowWelcome(true)
        }
    }, [tabs.length])

    // Open a recent folder by path
    const handleOpenRecentFolder = useCallback(async (folderPath: string) => {
        const path = await window.electronAPI.openFolderByPath(folderPath)
        if (path) {
            setRootPath(path)
            setShowExplorer(true)
            setShowWelcome(false)
            window.electronAPI.addRecentFolder(path)
            // Load .carboncode project settings
            loadProjectSettings(path).then(projectSettings => {
                if (projectSettings?.cppStandard) updateSetting('cppStandard', projectSettings.cppStandard as CppStandard)
                if (projectSettings?.compilerPath) updateSetting('compilerPath', projectSettings.compilerPath)
            })
        }
    }, [updateSetting])

    // Debug handlers — ponytail: 5 identical wrappers → one-liners
    const handleDebugStart = useCallback(async () => {
        if (!activeTab) return
        if (activeTab.language === 'java') {
            setJavaDebugUnsupported(true)
            return
        }
        setJavaDebugUnsupported(false)
        const code = editorRef.current?.getValue() || activeTab.content
        const bpArray = breakpoints.map(line => ({ line }))
        const result = await window.electronAPI.debugStart(code, bpArray)
        if (result.success) {
            window.electronAPI?.trackEvent?.('debug_started', { language: activeLanguage })
        } else {
            setCompilationResult({
                success: false,
                output: '',
                error: result.error || 'Failed to start debugging'
            })
        }
    }, [activeTab, breakpoints])
    const handleDebugStop = useCallback(async () => { await window.electronAPI.debugStop() }, [])
    const handleDebugStepOver = useCallback(async () => { await window.electronAPI.debugStepOver() }, [])
    const handleDebugStepInto = useCallback(async () => { await window.electronAPI.debugStepInto() }, [])
    const handleDebugStepOut = useCallback(async () => { await window.electronAPI.debugStepOut() }, [])
    const handleDebugContinue = useCallback(async () => { await window.electronAPI.debugContinue() }, [])

    const handleToggleBreakpoint = useCallback(() => {
        if (!editorRef.current) return
        const position = editorRef.current.getPosition()
        if (!position) return
        const line = position.lineNumber
        setBreakpoints(prev => {
            if (prev.includes(line)) {
                return prev.filter(l => l !== line)
            }
            return [...prev, line]
        })
    }, [])

    // Reset java debug unsupported when switching tabs/languages
    useEffect(() => {
        setJavaDebugUnsupported(false)
    }, [activeTabId, activeTab?.language])

    // Listen for debug state changes
    useEffect(() => {
        const cleanup = window.electronAPI.onDebugStateChanged((state) => {
            setDebugState(state)
        })
        return cleanup
    }, [])

    // Save file handler
    const handleSave = useCallback(async (tabId?: string) => {
        const target = tabId ? tabs.find(t => t.id === tabId) : activeTab
        if (!target) return

        // Read live Monaco buffer only when saving the active tab; otherwise use stored content.
        const contentToSave = (tabId === undefined || tabId === activeTabId)
            ? (editorRef.current?.getValue() || target.content)
            : target.content

        if (!target.filePath) {
            // Save As
            const result = await window.electronAPI.saveFile(contentToSave, undefined, target.language)
            if (result && result.success) {
                markTabSaved(target.id, result.filePath)
            }
        } else {
            // Save to existing path
            const result = await window.electronAPI.saveFile(contentToSave, target.filePath, target.language)
            if (result && result.success) {
                markTabSaved(target.id, target.filePath)
            }
        }
    }, [activeTab, activeTabId, tabs, markTabSaved])

    // Auto-save with debounce
    useEffect(() => {
        if (!settings.autoSave || !activeTab?.isDirty) return

        const timer = setTimeout(() => {
            handleSave()
        }, 2000)

        return () => clearTimeout(timer)
    }, [settings.autoSave, activeTab?.isDirty, activeTab?.content, handleSave])

    // Save As handler
    const handleSaveAs = useCallback(async (tabId?: string) => {
        const target = tabId ? tabs.find(t => t.id === tabId) : activeTab
        if (!target) return
        const currentCode = (tabId === undefined || tabId === activeTabId)
            ? (editorRef.current?.getValue() || target.content)
            : target.content
        const result = await window.electronAPI.saveFile(currentCode, undefined, target.language)
        if (result) {
            markTabSaved(target.id, result.filePath)
        }
    }, [activeTab, activeTabId, tabs, markTabSaved])

    // Run compilation handler
    const handleRun = useCallback(async () => {
        if (!activeTab) return

        if (isDetecting) {
            setCompilationResult({
                success: false,
                output: '',
                error: 'Detecting compilers, please wait...'
            })
            return
        }

        if (!hasActiveRuntime) {
            setCompilationResult({
                success: false,
                output: '',
                error: activeLanguage === 'java'
                    ? 'No Java JDK detected!\n\nInstall a JDK with javac, set JAVA_HOME, or configure Java in Settings.'
                    : 'No C++ compiler detected!\n\nPlease install a C++ compiler and restart the application.'
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
        setParsedErrors([])
        // Welcome screen logic handled by effect, but we can ensure it's hidden if running (should already be)

        const currentCode = editorRef.current?.getValue() || activeTab.content
        const lineCount = currentCode.split('\n').length

        // Track analytics - code compiled
        window.electronAPI?.trackEvent?.('code_compiled', { language: activeLanguage, lineCount })

        // Use new interactive process API
        const startResult = await window.electronAPI.startProcess({
            language: activeLanguage,
            code: currentCode,
            filePath: activeTab.filePath,
            cppStandard: settings.cppStandard
        })

        setIsCompiling(false)

        if (startResult.success) {
            executionStartRef.current = Date.now()
            setIsRunning(true)
            // Track analytics - code run successfully
            window.electronAPI?.trackEvent?.('code_run', { language: activeLanguage, lineCount })
            setCompilationResult({
                success: true,
                output: '',
                error: '',
                compileTime: startResult.compileTime
            })
            setParsedErrors([])
        } else {
            // Parse errors for clickable display
            const parsed = parseCompileErrors(startResult.error || '', activeTab?.filePath || undefined)
            setParsedErrors(parsed)
            // Track analytics - code run error
            window.electronAPI?.trackEvent?.('code_run_error', { language: activeLanguage, lineCount, errorMessage: startResult.error || 'Unknown error' })
            setCompilationResult({
                success: false,
                output: '',
                error: startResult.error || 'Unknown error',
                compileTime: startResult.compileTime
            })
        }

    }, [activeTab, settings.cppStandard, hasActiveRuntime, activeLanguage, isRunning, isDetecting])

    // Close a tab, prompting the user to save if dirty. Returns true if the tab
    // was closed (or the user chose Don't Save), false if the user cancelled.
    const closeWithPrompt = useCallback(async (tabId: string): Promise<boolean> => {
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

            if (result.response === 2) {
                // Cancel
                return false
            }
            if (result.response === 0) {
                // Save first
                const currentCode = (tabId === activeTabId)
                    ? (editorRef.current?.getValue() || tab.content)
                    : tab.content
                const saveResult = await window.electronAPI.saveFile(currentCode, tab.filePath || undefined, tab.language)
                if (saveResult) {
                    markTabSaved(tabId, saveResult.filePath)
                }
            }
            // response === 1 ("Don't Save") falls through
        }
        await closeTab(tabId)
        return true
    }, [tabs, activeTabId, markTabSaved, closeTab])

    // Tab close handler (preserves the (tabId, MouseEvent) signature used by TabBar)
    const handleTabClose = useCallback(async (tabId: string, e?: MouseEvent) => {
        e?.stopPropagation?.()
        await closeWithPrompt(tabId)
    }, [closeWithPrompt])

    // Register menu event listeners
    useEffect(() => {
        const cleanupNewFile = window.electronAPI.onNewFile(handleNewFile)
        const cleanupOpenFile = window.electronAPI.onOpenFile(handleOpenFile)
        const cleanupCloseFolder = window.electronAPI.onCloseFolder(handleCloseFolder)
        const cleanupSave = window.electronAPI.onSave(handleSave)
        const cleanupSaveAs = window.electronAPI.onSaveAs(handleSaveAs)
        const cleanupRun = window.electronAPI.onRun(handleRun)
        const cleanupStop = window.electronAPI.onStop(handleStop)

        // Debug menu listeners
        const cleanupDebugStart = window.electronAPI.onDebugStart(handleDebugStart)
        const cleanupDebugStop = window.electronAPI.onDebugStop(handleDebugStop)
        const cleanupDebugStepOver = window.electronAPI.onDebugStepOver(handleDebugStepOver)
        const cleanupDebugStepInto = window.electronAPI.onDebugStepInto(handleDebugStepInto)
        const cleanupDebugStepOut = window.electronAPI.onDebugStepOut(handleDebugStepOut)
        const cleanupDebugContinue = window.electronAPI.onDebugContinue(handleDebugContinue)
        const cleanupDebugToggleBp = window.electronAPI.onDebugToggleBreakpoint(handleToggleBreakpoint)

        // Session discard listener (Don't Save on close)
        const cleanupSessionDiscard = window.electronAPI.onSessionDiscard(() => {
            discardAll()
        })

        return () => {
            cleanupNewFile()
            cleanupOpenFile()
            cleanupCloseFolder()
            cleanupSave()
            cleanupSaveAs()
            cleanupRun()
            cleanupStop()
            cleanupDebugStart()
            cleanupDebugStop()
            cleanupDebugStepOver()
            cleanupDebugStepInto()
            cleanupDebugStepOut()
            cleanupDebugContinue()
            cleanupDebugToggleBp()
            cleanupSessionDiscard()
        }
    }, [handleNewFile, handleOpenFile, handleCloseFolder, handleSave, handleSaveAs, handleRun, handleStop, handleDebugStart, handleDebugStop, handleDebugStepOver, handleDebugStepInto, handleDebugStepOut, handleDebugContinue, handleToggleBreakpoint, discardAll])

    // Tab context menu state
    const [tabMenu, setTabMenu] = useState<{ tabId: string; x: number; y: number } | null>(null)
    const closeTabMenu = useCallback(() => setTabMenu(null), [])

    const handleTabContextMenu = useCallback((tabId: string, x: number, y: number) => {
        setTabMenu({ tabId, x, y })
    }, [])

    const handleCloseOthers = useCallback(async (tabId: string) => {
        const others = tabs.filter(t => t.id !== tabId)
        for (const t of others) {
            const ok = await closeWithPrompt(t.id)
            if (!ok) break
        }
    }, [tabs, closeWithPrompt])

    const handleCloseAllFromMenu = useCallback(async () => {
        for (const t of [...tabs]) {
            const ok = await closeWithPrompt(t.id)
            if (!ok) break
        }
    }, [tabs, closeWithPrompt])

    const handleCloseSaved = useCallback(() => {
        for (const t of tabs.filter(t => !t.isDirty)) {
            closeTab(t.id)
        }
    }, [tabs, closeTab])

    const handleRevealInExplorer = useCallback((tabId: string) => {
        const tab = tabs.find(t => t.id === tabId)
        if (tab?.filePath) {
            void window.electronAPI.showItemInFolder(tab.filePath)
        }
    }, [tabs])

    const handleCopyPath = useCallback((tabId: string) => {
        const tab = tabs.find(t => t.id === tabId)
        if (tab?.filePath) {
            void navigator.clipboard.writeText(tab.filePath)
        }
    }, [tabs])

    const handleCopyFileName = useCallback((tabId: string) => {
        const tab = tabs.find(t => t.id === tabId)
        if (tab) {
            void navigator.clipboard.writeText(tab.fileName)
        }
    }, [tabs])

    const handleDuplicateFromMenu = useCallback((tabId: string) => {
        duplicateTab(tabId)
    }, [duplicateTab])

    // Shared navigation helper for error-clicks and search-result-clicks
    const pathsEqual = useCallback((a: string, b: string) => {
        return a.replace(/\\/g, '/').toLowerCase() === b.replace(/\\/g, '/').toLowerCase()
    }, [])

    const handleLocationClick = useCallback(async (file: string | null, line: number, column?: number) => {
        if (!file) return
        const existing = tabs.find(t => t.filePath && pathsEqual(t.filePath, file))
        if (existing) {
            switchToTab(existing.id)
        } else {
            const content = await window.electronAPI.readFile(file)
            if (content !== null) openFile(file, content)
            else return
        }
        // Small delay to let React render the tab switch
        setTimeout(() => {
            if (!editorRef.current) return
            editorRef.current.revealLineInCenter(line)
            editorRef.current.setPosition({ lineNumber: line, column: column ?? 1 })
            editorRef.current.focus()
        }, 50)
    }, [tabs, switchToTab, openFile, pathsEqual])

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // F5 - Run code
            if (e.key === 'F5' && !e.shiftKey) {
                e.preventDefault()
                if (!isCompiling && !isRunning && hasActiveRuntime) {
                    handleRun()
                }
            }
            // Shift+F5 - Stop execution
            if (e.shiftKey && e.key === 'F5') {
                e.preventDefault()
                if (isRunning) {
                    handleStop()
                }
            }
            // Ctrl+B - Toggle explorer
            if (e.ctrlKey && e.key === 'b') {
                e.preventDefault()
                setShowExplorer(prev => !prev)
            }
            // Ctrl+F/H - Find/Replace
            if (e.ctrlKey && (e.key === 'f' || e.key === 'h')) {
                e.preventDefault()
                setShowFind(true)
            }
            // Ctrl+Shift+F - Search in files
            if (e.ctrlKey && e.shiftKey && (e.key === 'F' || e.key === 'f')) {
                e.preventDefault()
                setShowSearch(prev => !prev)
                if (showSearch) setShowFind(false)
            }
            // Escape - Close dialogs
            if (e.key === 'Escape') {
                if (showFind) setShowFind(false)
                if (showSearch) setShowSearch(false)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isCompiling, isRunning, hasActiveRuntime, handleRun, handleStop, showFind, showSearch])

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
                            <span className="text-white font-bold text-sm">&lt;/&gt;</span>
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
                language={activeLanguage}
                cppStandard={settings.cppStandard}
                onCppStandardChange={(std) => updateSetting('cppStandard', std)}
                onRun={handleRun}
                onNewFile={handleNewFile}
                onOpenFile={handleOpenFile}
                onSave={handleSave}
                isCompiling={isCompiling} // Could also indicate isRunning visually in Toolbar if needed
                hasCompiler={hasActiveRuntime}
            />

            {/* Tab Bar */}
            {!showWelcome && activeTabId && (
                <TabBar
                    tabs={tabs}
                    activeTabId={activeTabId}
                    onTabClick={switchToTab}
                    onTabClose={handleTabClose}
                    onNewTab={handleNewFile}
                    onContextMenu={handleTabContextMenu}
                />
            )}

            {/* Tab Context Menu */}
            {tabMenu && (() => {
                const menuTab = tabs.find(t => t.id === tabMenu.tabId)
                if (!menuTab) return null
                return (
                    <TabContextMenu
                        x={tabMenu.x}
                        y={tabMenu.y}
                        tab={menuTab}
                        totalTabs={tabs.length}
                        hasSavedTabs={tabs.some(t => !t.isDirty)}
                        onClose={closeTabMenu}
                        onCloseTab={() => handleTabClose(menuTab.id)}
                        onCloseOthers={() => handleCloseOthers(menuTab.id)}
                        onCloseAll={handleCloseAllFromMenu}
                        onCloseSaved={handleCloseSaved}
                        onSave={() => handleSave(menuTab.id)}
                        onSaveAs={() => handleSaveAs(menuTab.id)}
                        onReveal={() => handleRevealInExplorer(menuTab.id)}
                        onCopyPath={() => handleCopyPath(menuTab.id)}
                        onCopyFileName={() => handleCopyFileName(menuTab.id)}
                        onDuplicate={() => handleDuplicateFromMenu(menuTab.id)}
                    />
                )
            })()}

            {/* Main Content */}
            <main className="flex-1 flex min-h-0 relative">
                {/* File Explorer */}
                {!showWelcome && (
                    <>
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
                            rootPath={rootPath}
                            onOpenFolder={handleOpenFolder}
                            width={settings.explorerWidth}
                        />
                        {/* Explorer Resize Handle */}
                        {showExplorer && (
                            <div
                                className="w-1 bg-editor-border cursor-ew-resize hover:bg-accent transition-colors shrink-0"
                                onMouseDown={(e) => {
                                    e.preventDefault()
                                    const startX = e.clientX
                                    const startWidth = settings.explorerWidth

                                    const onMouseMove = (e: globalThis.MouseEvent) => {
                                        const delta = e.clientX - startX
                                        const newWidth = Math.min(Math.max(150, startWidth + delta), 500)
                                        updateSetting('explorerWidth', newWidth)
                                    }

                                    const onMouseUp = () => {
                                        document.removeEventListener('mousemove', onMouseMove)
                                        document.removeEventListener('mouseup', onMouseUp)
                                    }

                                    document.addEventListener('mousemove', onMouseMove)
                                    document.addEventListener('mouseup', onMouseUp)
                                }}
                            />
                        )}
                    </>
                )}

                {/* Find & Replace */}
                {showFind && !showWelcome && (
                    <FindReplace
                        editor={editorInstance}
                        isVisible={showFind}
                        onClose={() => setShowFind(false)}
                    />
                )}

                {/* Search in Files */}
                {showSearch && !showWelcome && rootPath && (
                    <SearchPanel
                        rootPath={rootPath}
                        onResultClick={handleLocationClick}
                        onClose={() => setShowSearch(false)}
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
                <div className={`flex-1 flex min-h-0 min-w-0 overflow-hidden ${settings.outputPosition === 'right' ? 'flex-row' : 'flex-col'}`}>
                    {showWelcome ? (
                        <WelcomeScreen
                            compilerInfo={compilerInfo}
                            javaRuntimeInfo={javaRuntimeInfo ? javaRuntimeInfo.version || javaRuntimeInfo.compilerPath : null}
                            onNewFile={handleNewFile}
                            onOpenFile={handleOpenFile}
                            onOpenFolder={handleOpenFolder}
                            onStartCoding={handleStartCoding}
                            onOpenRecentFolder={handleOpenRecentFolder}
                        />
                    ) : (
                        <>
                            {/* Editor + Debug Panel Container */}
                            <div className="flex-1 flex flex-col min-h-0 min-w-0">
                                {/* Editor */}
                                <div className="flex-1 min-h-0">
                                    <Editor
                                        value={activeTab?.content || ''}
                                        language={activeLanguage}
                                        onChange={handleCodeChange}
                                        onEditorMount={(editor) => {
                                            editorRef.current = editor
                                            setEditorInstance(editor)
                                            editor.onDidChangeCursorPosition((e) => {
                                                setCursorPosition({
                                                    line: e.position.lineNumber,
                                                    column: e.position.column
                                                })
                                            })
                                        }}
                                        fontSize={settings.fontSize}
                                        tabSize={settings.tabSize}
                                        minimap={settings.minimap}
                                        wordWrap={settings.wordWrap}
                                        theme={settings.theme}
                                        onRun={handleRun}
                                        parsedErrors={parsedErrors}
                                    />
                                </div>

                                {/* Debug Panel */}
                                <DebugPanel
                                    debugState={debugState}
                                    javaDebugUnsupported={javaDebugUnsupported}
                                    onStart={handleDebugStart}
                                    onStop={handleDebugStop}
                                    onStepOver={handleDebugStepOver}
                                    onStepInto={handleDebugStepInto}
                                    onStepOut={handleDebugStepOut}
                                    onContinue={handleDebugContinue}
                                />
                            </div>

                            {/* Resize Handle - Horizontal for right, Vertical for bottom */}
                            {settings.outputPosition === 'right' ? (
                                <div
                                    className="w-1 bg-editor-border cursor-ew-resize hover:bg-accent transition-colors shrink-0"
                                    onMouseDown={(e) => {
                                        e.preventDefault()
                                        const startX = e.clientX
                                        const startWidth = outputWidth

                                        const onMouseMove = (e: globalThis.MouseEvent) => {
                                            const delta = startX - e.clientX
                                            const newWidth = Math.min(Math.max(200, startWidth + delta), 800)
                                            setOutputWidth(newWidth)
                                        }

                                        const onMouseUp = () => {
                                            document.removeEventListener('mousemove', onMouseMove)
                                            document.removeEventListener('mouseup', onMouseUp)
                                        }

                                        document.addEventListener('mousemove', onMouseMove)
                                        document.addEventListener('mouseup', onMouseUp)
                                    }}
                                />
                            ) : (
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
                            )}

                            {/* Output Panel */}
                            <div
                                style={settings.outputPosition === 'right'
                                    ? { width: outputWidth }
                                    : { height: outputHeight }
                                }
                                className={`shrink-0 ${settings.outputPosition === 'right' ? 'border-l' : 'border-t'} border-editor-border`}
                            >
                                <OutputPanel
                                    result={compilationResult}
                                    isCompiling={isCompiling}
                                    isRunning={isRunning}
                                    onInput={handleInput}
                                    onStop={handleStop}
                                    fontSize={settings.outputFontSize}
                                    parsedErrors={parsedErrors}
                                    onErrorClick={(_file, line, column) => {
                                        // Navigate to the error line in editor
                                        if (editorRef.current) {
                                            editorRef.current.revealLineInCenter(line)
                                            editorRef.current.setPosition({ lineNumber: line, column: column || 1 })
                                            editorRef.current.focus()
                                        }
                                    }}
                                />
                            </div>
                        </>
                    )}
                </div>
            </main>

            {/* Status Bar */}
            <StatusBar
                filePath={activeTab?.filePath || null}
                language={activeLanguage}
                cppStandard={settings.cppStandard}
                runtimeInfo={activeRuntimeInfo}
                isCompiling={isCompiling}
                compilationResult={compilationResult}
                cursorPosition={cursorPosition}
                outputPosition={settings.outputPosition}
                onToggleOutputPosition={() => updateSetting('outputPosition', settings.outputPosition === 'bottom' ? 'right' : 'bottom')}
            />

            {/* Analytics Consent Dialog */}
            <AnalyticsConsentDialog
                isOpen={showAnalyticsConsent}
                onConsent={(consent) => {
                    updateSetting('analyticsConsent', consent)
                    window.electronAPI?.setAnalyticsConsent?.(consent)
                    setShowAnalyticsConsent(false)
                }}
            />

            {/* New File Dialog */}
            <NewFileDialog
                isOpen={showNewFileDialog}
                onSelect={handleNewFileSelect}
                onCancel={() => setShowNewFileDialog(false)}
            />
        </div>
    )
}

export default App
