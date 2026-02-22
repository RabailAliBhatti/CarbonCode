/// <reference types="vite/client" />

interface Window {
    electronAPI: {
        openFile: () => Promise<{ filePath: string; content: string } | null>
        saveFile: (content: string, existingPath?: string) => Promise<{ filePath: string; success: boolean } | null>
        setDirty: (dirty: boolean) => Promise<void>
        detectCompiler: () => Promise<string | null>
        runCompilation: (code: string, cppStandard: string) => Promise<{
            success: boolean
            output: string
            error: string
            compileTime?: number
            executionTime?: number
        }>
        showMessage: (options: Electron.MessageBoxOptions) => Promise<Electron.MessageBoxReturnValue>
        onNewFile: (callback: () => void) => () => void
        onOpenFile: (callback: () => void) => () => void
        onSave: (callback: () => void) => () => void
        onSaveAs: (callback: () => void) => () => void
        onRun: (callback: () => void) => () => void
        onStop: (callback: () => void) => () => void
    }
}
