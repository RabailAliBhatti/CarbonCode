import { useState, useEffect, useCallback, useRef, MouseEvent } from 'react'
import type { editor } from 'monaco-editor'
import Toolbar from './components/Toolbar'
import StatusBar from './components/StatusBar'
import WelcomeScreen from './components/WelcomeScreen'
import TabContextMenu from './components/TabContextMenu'
import FindReplace from './components/FindReplace'
import SearchPanel from './components/SearchPanel'
import SettingsModal from './components/SettingsModal'
import AnalyticsConsentDialog from './components/AnalyticsConsentDialog'
import NewFileDialog from './components/NewFileDialog'
import NavigationRail, { NavItem } from './components/NavigationRail'
import CodingScreen from './components/CodingScreen'
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal'
import { useFileManager } from './hooks/useFileManager'
import { SupportedLanguage } from './types/language'
import { useSettings, CppStandard, CStandard } from './hooks/useSettings'
import { parseCompileErrors } from './utils/parseCompileErrors'
import type { CompileError } from './utils/parseCompileErrors'
import { loadProjectSettings } from './utils/loadProjectSettings'
import { addRecentFile } from './utils/recentFiles'
import { formatDocument } from './utils/codeFormatter'

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
        if (!window.electronAPI) return
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
    const [currentView, setCurrentView] = useState<'dashboard' | 'editor'>('dashboard')
    const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false)
    const [showExplorer, setShowExplorer] = useState<boolean>(true)
    const [showFind, setShowFind] = useState<boolean>(false)
    const [showSearch, setShowSearch] = useState<boolean>(false)

    // Sync Dashboard/Editor View with Tabs
    useEffect(() => {
        if (tabs.length === 0) {
            setCurrentView('dashboard')
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
        if (!window.electronAPI) return

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
            cleanStdout?.()
            cleanStderr?.()
            cleanExit?.()
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
    // Check for compiler and fetch author name on mount concurrently
    useEffect(() => {
        if (!window.electronAPI) return
        const initStartupData = async () => {
            setIsDetecting(true)
            try {
                const [compiler, javaRuntime, name] = await Promise.all([
                    window.electronAPI.detectCompiler(settings.compilerPath || undefined),
                    window.electronAPI.detectJavaRuntime(settings.javaHome || undefined, settings.javaCompilerPath || undefined),
                    window.electronAPI.getAuthorName()
                ])
                setCompilerInfo(compiler)
                setJavaRuntimeInfo(javaRuntime)
                setAuthorName(name)
            } finally {
                setIsDetecting(false)
            }
        }
        initStartupData()
    }, [settings.compilerPath, settings.javaHome, settings.javaCompilerPath])

    // Update dirty state in main process
    useEffect(() => {
        if (!window.electronAPI) return
        const hasUnsaved = tabs.some(tab => tab.isDirty)
        window.electronAPI.setDirty(hasUnsaved)
    }, [tabs])

    // Watch files when tabs are opened, unwatch on close
    useEffect(() => {
        if (!window.electronAPI) return
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
        if (!window.electronAPI) return
        const cleanup = window.electronAPI.onFileChanged(handleFileChanged)
        return () => {
            cleanup?.()
        }
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

    const handleNewFileSelect = useCallback((language: 'c' | 'cpp' | 'java') => {
        setShowNewFileDialog(false)
        createNewTab(language, authorName || undefined)
        setCurrentView('editor')
        window.electronAPI?.trackEvent?.('file_created', { language })
    }, [createNewTab, authorName])

    // Open file handler
    const handleOpenFile = useCallback(async () => {
        const file = await window.electronAPI.openFile()
        if (file) {
            openFile(file.filePath, file.content)
            const ext = file.filePath?.split('.').pop()?.toLowerCase()
            const fileLang = ext === 'java' ? 'java' : ext === 'c' ? 'c' : 'cpp'
            window.electronAPI?.trackEvent?.('file_opened', { language: fileLang })
            addRecentFile(file.filePath, file.filePath.split(/[/\\]/).pop() || 'file', fileLang)
            setCurrentView('editor')
        }
    }, [openFile])

    // Open specific file by path (from Recent Files card, Explorer, or Definition Navigation)
    const handleOpenFileByPath = useCallback(async (filePath: string, line?: number, column?: number) => {
        const content = await window.electronAPI.readFile(filePath)
        if (content !== null) {
            openFile(filePath, content)
            const ext = filePath.split('.').pop()?.toLowerCase()
            const fileLang = ext === 'java' ? 'java' : ext === 'c' ? 'c' : 'cpp'
            addRecentFile(filePath, filePath.split(/[/\\]/).pop() || 'file', fileLang)
            setCurrentView('editor')
            if (line) {
                setTimeout(() => {
                    if (editorRef.current) {
                        editorRef.current.revealPositionInCenter({ lineNumber: line, column: column || 1 })
                        editorRef.current.setPosition({ lineNumber: line, column: column || 1 })
                        editorRef.current.focus()
                    }
                }, 100)
            }
        }
    }, [openFile])

    // Open folder handler
    const handleOpenFolder = useCallback(async () => {
        const path = await window.electronAPI.openFolder()
        if (path) {
            setRootPath(path)
            setShowExplorer(true)
            setCurrentView('editor')
            // Save to recent folders (fire and forget)
            window.electronAPI.addRecentFolder(path)
        }
    }, [])

    // Close folder handler
    const handleCloseFolder = useCallback(() => {
        setRootPath(null)
        setShowExplorer(false)
        if (tabs.length === 0) {
            setCurrentView('dashboard')
        }
    }, [tabs.length])

    // Open a recent folder by path
    const handleOpenRecentFolder = useCallback(async (folderPath: string) => {
        const path = await window.electronAPI.openFolderByPath(folderPath)
        if (path) {
            setRootPath(path)
            setShowExplorer(true)
            setCurrentView('editor')
            window.electronAPI.addRecentFolder(path)
            // Load .carboncode project settings
            loadProjectSettings(path).then(projectSettings => {
                if (projectSettings?.cStandard) updateSetting('cStandard', projectSettings.cStandard as CStandard)
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
        const debugLang = (activeTab.language === 'c' ? 'c' : 'cpp') as 'c' | 'cpp'
        const result = await window.electronAPI.debugStart(code, bpArray, debugLang)
        if (result.success) {
            window.electronAPI?.trackEvent?.('debug_started', { language: activeLanguage })
        } else {
            setCompilationResult({
                success: false,
                output: '',
                error: result.error || 'Failed to start debugging'
            })
        }
    }, [activeTab, breakpoints, activeLanguage])
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
        if (!window.electronAPI) return
        const cleanup = window.electronAPI.onDebugStateChanged((state) => {
            setDebugState(state)
        })
        return () => {
            cleanup?.()
        }
    }, [])

    // Save file handler
    const handleSave = useCallback(async (tabId?: string) => {
        const target = tabId ? tabs.find(t => t.id === tabId) : activeTab
        if (!target) return

        // Read live Monaco buffer only when saving the active tab; otherwise use stored content.
        let contentToSave = (tabId === undefined || tabId === activeTabId)
            ? (editorRef.current?.getValue() || target.content)
            : target.content

        // Format on save if enabled
        if (settings.formatOnSave && target.language) {
            const formatted = formatDocument(contentToSave, target.language, settings.tabSize)
            if (formatted !== contentToSave) {
                contentToSave = formatted
                if (tabId === undefined || tabId === activeTabId) {
                    if (editorRef.current) {
                        editorRef.current.setValue(formatted)
                    }
                }
                updateTabContent(target.id, formatted)
            }
        }

        if (!target.filePath) {
            // Save As
            const result = await window.electronAPI.saveFile(contentToSave, undefined, target.language)
            if (result && result.success) {
                markTabSaved(target.id, result.filePath)
                addRecentFile(result.filePath, result.filePath.split(/[/\\]/).pop() || target.fileName, target.language)
            }
        } else {
            // Save to existing path
            const result = await window.electronAPI.saveFile(contentToSave, target.filePath, target.language)
            if (result && result.success) {
                markTabSaved(target.id, target.filePath)
                addRecentFile(target.filePath, target.filePath.split(/[/\\]/).pop() || target.fileName, target.language)
            }
        }
    }, [activeTab, activeTabId, tabs, markTabSaved, settings.formatOnSave, settings.tabSize, updateTabContent])

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
        if (result && result.filePath) {
            markTabSaved(target.id, result.filePath)
            addRecentFile(result.filePath, result.filePath.split(/[/\\]/).pop() || target.fileName, target.language)
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
                    : activeLanguage === 'c'
                        ? 'No C compiler detected!\n\nPlease install a C compiler (gcc) and restart the application.'
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
            cppStandard: settings.cppStandard,
            cStandard: settings.cStandard
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

    }, [activeTab, settings.cppStandard, settings.cStandard, hasActiveRuntime, activeLanguage, isRunning, isDetecting])

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
        if (!window.electronAPI) return
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
            cleanupNewFile?.()
            cleanupOpenFile?.()
            cleanupCloseFolder?.()
            cleanupSave?.()
            cleanupSaveAs?.()
            cleanupRun?.()
            cleanupStop?.()
            cleanupDebugStart?.()
            cleanupDebugStop?.()
            cleanupDebugStepOver?.()
            cleanupDebugStepInto?.()
            cleanupDebugStepOut?.()
            cleanupDebugContinue?.()
            cleanupDebugToggleBp?.()
            cleanupSessionDiscard?.()
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
                if (currentView === 'dashboard') {
                    if (tabs.length === 0) {
                        createNewTab('cpp', authorName || undefined)
                    }
                    setCurrentView('editor')
                }
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

    // Start coding (dismiss welcome screen, create first tab if none)
    const handleStartCoding = useCallback(() => {
        if (tabs.length === 0) {
            createNewTab('cpp', authorName || undefined)
        }
        setCurrentView('editor')
    }, [tabs.length, createNewTab, authorName])

    // Navigation rail item select handler
    const handleNavSelect = useCallback((item: NavItem) => {
        if (item === 'home') {
            setCurrentView('dashboard')
        } else if (item === 'editor') {
            if (tabs.length === 0) {
                createNewTab('cpp', authorName || undefined)
            }
            setCurrentView('editor')
        } else if (item === 'files') {
            if (currentView === 'dashboard') {
                if (tabs.length === 0) {
                    createNewTab('cpp', authorName || undefined)
                }
                setCurrentView('editor')
                setShowExplorer(true)
            } else {
                setShowExplorer(prev => !prev)
            }
        } else if (item === 'search') {
            if (currentView === 'dashboard') {
                if (tabs.length === 0) {
                    createNewTab('cpp', authorName || undefined)
                }
                setCurrentView('editor')
            }
            setShowSearch(prev => !prev)
        } else if (item === 'debug') {
            if (currentView === 'dashboard') {
                if (tabs.length === 0) {
                    createNewTab('cpp', authorName || undefined)
                }
                setCurrentView('editor')
            }
            handleDebugStart()
        } else if (item === 'settings') {
            setShowSettings(true)
        }
    }, [currentView, tabs.length, createNewTab, authorName, handleDebugStart])

    return (
        <div className="h-screen w-screen flex flex-col bg-carbon-bg text-carbon-text-primary overflow-hidden select-none">
            {/* Top Unified Command Bar (from Dashboard Design New.png and Coding Screen.png) */}
            <Toolbar
                language={activeLanguage}
                cppStandard={settings.cppStandard}
                onCppStandardChange={(std) => updateSetting('cppStandard', std)}
                cStandard={settings.cStandard}
                onCStandardChange={(std) => updateSetting('cStandard', std)}
                onRun={handleRun}
                onNewFile={handleNewFile}
                onOpenFile={handleOpenFile}
                onSave={handleSave}
                isCompiling={isCompiling}
                hasCompiler={hasActiveRuntime}
                onOpenSettings={() => setShowSettings(true)}
            />

            {/* Main Application Area: Navigation Rail + Main Workspace */}
            <div className="flex-1 flex min-h-0 min-w-0 relative">
                {/* Left Navigation Rail (expanded in Dashboard, compact in Editor) */}
                <NavigationRail
                    mode={currentView === 'dashboard' ? 'expanded' : 'compact'}
                    activeItem={currentView === 'dashboard' ? 'home' : (showExplorer ? 'files' : (showSearch ? 'search' : 'editor'))}
                    onSelect={handleNavSelect}
                    theme={settings.theme}
                    onToggleTheme={() => updateSetting('theme', settings.theme === 'dark' ? 'light' : 'dark')}
                />

                {/* Workspace Container */}
                <main className="flex-1 flex min-h-0 min-w-0 relative overflow-hidden">
                    {/* Find & Replace Overlay */}
                    {showFind && currentView === 'editor' && (
                        <FindReplace
                            editor={editorInstance}
                            isVisible={showFind}
                            onClose={() => setShowFind(false)}
                        />
                    )}

                    {/* Search in Files Overlay */}
                    {showSearch && currentView === 'editor' && (
                        <SearchPanel
                            rootPath={rootPath}
                            onResultClick={handleLocationClick}
                            onClose={() => setShowSearch(false)}
                            onOpenFolder={handleOpenFolder}
                        />
                    )}

                    {/* View Switcher: Dashboard or CodingScreen */}
                    {currentView === 'dashboard' ? (
                        <WelcomeScreen
                            compilerInfo={compilerInfo}
                            javaRuntimeInfo={javaRuntimeInfo ? (javaRuntimeInfo.version || javaRuntimeInfo.compilerPath) : null}
                            language={activeLanguage}
                            cppStandard={settings.cppStandard}
                            cStandard={settings.cStandard}
                            onNewFile={handleNewFile}
                            onOpenFile={handleOpenFile}
                            onOpenFolder={handleOpenFolder}
                            onStartCoding={handleStartCoding}
                            onOpenRecentFolder={handleOpenRecentFolder}
                            onOpenFileByPath={handleOpenFileByPath}
                            onOpenShortcutsModal={() => setShowShortcutsModal(true)}
                        />
                    ) : (
                        <CodingScreen
                            tabs={tabs}
                            activeTabId={activeTabId}
                            activeTab={activeTab}
                            onTabClick={switchToTab}
                            onTabClose={handleTabClose}
                            onNewTab={handleNewFile}
                            onContextMenu={handleTabContextMenu}
                            activeLanguage={activeLanguage}
                            onCodeChange={handleCodeChange}
                            onEditorMount={(editor) => {
                                editorRef.current = editor
                                setEditorInstance(editor)
                                editor.onDidChangeCursorPosition((e: any) => {
                                    setCursorPosition({
                                        line: e.position.lineNumber,
                                        column: e.position.column
                                    })
                                })
                            }}
                            cursorPosition={cursorPosition}
                            settings={settings}
                            onRun={handleRun}
                            parsedErrors={parsedErrors}
                            showExplorer={showExplorer}
                            onToggleExplorer={() => setShowExplorer(prev => !prev)}
                            rootPath={rootPath}
                            onOpenFolder={handleOpenFolder}
                            onFileSelect={handleOpenFileByPath}
                            onToggleTheme={() => updateSetting('theme', settings.theme === 'dark' ? 'light' : 'dark')}
                            debugState={debugState}
                            javaDebugUnsupported={javaDebugUnsupported}
                            onDebugStart={handleDebugStart}
                            onDebugStop={handleDebugStop}
                            onDebugStepOver={handleDebugStepOver}
                            onDebugStepInto={handleDebugStepInto}
                            onDebugStepOut={handleDebugStepOut}
                            onDebugContinue={handleDebugContinue}
                            compilationResult={compilationResult}
                            isCompiling={isCompiling}
                            isRunning={isRunning}
                            onInput={handleInput}
                            onStop={handleStop}
                            onErrorClick={handleLocationClick}
                            outputWidth={outputWidth}
                            onOutputWidthChange={setOutputWidth}
                            onClearOutput={() => setCompilationResult(null)}
                            onUpdateExplorerWidth={(w) => updateSetting('explorerWidth', w)}
                        />
                    )}
                </main>
            </div>

            {/* Bottom Status Bar - Shown on Dashboard view per design spec */}
            {currentView === 'dashboard' && (
                <StatusBar
                    filePath={activeTab?.filePath || null}
                    language={activeLanguage}
                    cppStandard={settings.cppStandard}
                    cStandard={settings.cStandard}
                    runtimeInfo={activeRuntimeInfo}
                    isCompiling={isCompiling}
                    compilationResult={compilationResult}
                    cursorPosition={cursorPosition}
                    outputPosition={settings.outputPosition}
                    onToggleOutputPosition={() => updateSetting('outputPosition', settings.outputPosition === 'bottom' ? 'right' : 'bottom')}
                />
            )}

            {/* Context Menu for Tabs */}
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

            {/* Settings Modal */}
            <SettingsModal
                isVisible={showSettings}
                onClose={() => setShowSettings(false)}
                settings={settings}
                onUpdateSetting={updateSetting}
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

            {/* Keyboard Shortcuts Modal */}
            <KeyboardShortcutsModal
                isOpen={showShortcutsModal}
                onClose={() => setShowShortcutsModal(false)}
            />
        </div>
    )
}

export default App
