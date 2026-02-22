/// <reference types="vite/client" />

interface DebugState {
    status: 'idle' | 'running' | 'stopped' | 'exited'
    currentFile?: string
    currentLine?: number
    breakpoints: { id: number; file: string; line: number }[]
    locals: { name: string; value: string; type: string }[]
}

interface Window {
    electronAPI: {
        // File operations
        openFile: () => Promise<{ filePath: string; content: string } | null>
        saveFile: (content: string, existingPath?: string) => Promise<{ filePath: string; success: boolean } | null>
        readFile: (filePath: string) => Promise<string | null>

        // Folder operations
        openFolder: () => Promise<string | null>
        readDirectory: (dirPath: string) => Promise<Array<{ name: string; path: string; isDirectory: boolean }>>

        setDirty: (dirty: boolean) => Promise<void>
        detectCompiler: (customPath?: string) => Promise<string | null>
        browseCompiler: () => Promise<string | null>
        setCustomCompilerPath: (customPath: string) => Promise<void>
        getCompilerInfo: () => Promise<{ path: string | null, source: string }>
        runCompilation: (code: string, cppStandard: string) => Promise<{
            success: boolean
            output: string
            error: string
            compileTime?: number
            executionTime?: number
        }>

        // Interactive
        startProcess: (code: string, cppStandard: string) => Promise<{
            success: boolean
            error?: string
            compileTime?: number
        }>
        writeProcess: (data: string) => Promise<void>
        stopProcess: () => Promise<void>
        onProcessStdout: (callback: (data: string) => void) => () => void
        onProcessStderr: (callback: (data: string) => void) => () => void
        onProcessExit: (callback: (code: number) => void) => () => void

        // Debugger API
        debugStart: (code: string, breakpoints: { line: number }[]) => Promise<{ success: boolean; error?: string }>
        debugStop: () => Promise<void>
        debugStepOver: () => Promise<void>
        debugStepInto: () => Promise<void>
        debugStepOut: () => Promise<void>
        debugContinue: () => Promise<void>
        debugGetState: () => Promise<DebugState>
        debugSetBreakpoint: (file: string, line: number) => Promise<{ id: number; file: string; line: number } | null>
        debugRemoveBreakpoint: (id: number) => Promise<void>
        onDebugStateChanged: (callback: (state: DebugState) => void) => () => void
        onDebugStdout: (callback: (data: string) => void) => () => void
        onDebugStderr: (callback: (data: string) => void) => () => void

        showMessage: (options: Electron.MessageBoxOptions) => Promise<Electron.MessageBoxReturnValue>

        // System info
        getAuthorName: () => Promise<string>

        // Menu event listeners
        onNewFile: (callback: () => void) => () => void
        onOpenFile: (callback: () => void) => () => void
        onSave: (callback: () => void) => () => void
        onSaveAs: (callback: () => void) => () => void
        onRun: (callback: () => void) => () => void
        onStop: (callback: () => void) => () => void
        onToggleExplorer: (callback: () => void) => () => void
        onCloseFolder: (callback: () => void) => () => void

        // Debug menu listeners
        onDebugStart: (callback: () => void) => () => void
        onDebugStop: (callback: () => void) => () => void
        onDebugStepOver: (callback: () => void) => () => void
        onDebugStepInto: (callback: () => void) => () => void
        onDebugStepOut: (callback: () => void) => () => void
        onDebugContinue: (callback: () => void) => () => void
        onDebugToggleBreakpoint: (callback: () => void) => () => void

        // Analytics API
        trackEvent: (eventName: string) => Promise<void>
        setAnalyticsConsent: (consent: boolean) => Promise<void>
        getAnalyticsConsent: () => Promise<boolean | null>
        hasBeenAskedAnalytics: () => Promise<boolean>
        openExternal: (url: string) => Promise<void>
    }
}

