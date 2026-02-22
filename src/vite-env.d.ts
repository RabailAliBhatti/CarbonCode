/// <reference types="vite/client" />

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
        detectCompiler: () => Promise<string | null>
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

        showMessage: (options: Electron.MessageBoxOptions) => Promise<Electron.MessageBoxReturnValue>

        // Events
        onNewFile: (callback: () => void) => () => void
        onOpenFile: (callback: () => void) => () => void
        onSave: (callback: () => void) => () => void
        onSaveAs: (callback: () => void) => () => void
        onRun: (callback: () => void) => () => void
        onStop: (callback: () => void) => () => void
        onToggleExplorer: (callback: () => void) => () => void
    }
}
