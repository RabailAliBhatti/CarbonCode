/// <reference types="vite/client" />

declare global {
    interface Window {
        electronAPI: {
            openFile: () => Promise<{ filePath: string; content: string } | null>
            saveFile: (content: string, existingPath?: string, language?: string) => Promise<{ filePath: string; success: boolean } | null>
            readFile: (filePath: string) => Promise<string | null>
            openFolder: () => Promise<string | null>
            readDirectory: (dirPath: string) => Promise<Array<{ name: string; path: string; isDirectory: boolean }>>
            setDirty: (dirty: boolean) => Promise<void>
            detectCompiler: (customPath?: string) => Promise<string | null>
            browseCompiler: () => Promise<string | null>
            setCustomCompilerPath: (customPath: string) => Promise<void>
            getCompilerInfo: () => Promise<{ path: string | null; source: string }>
            detectJavaRuntime: (javaHome?: string, javaCompilerPath?: string) => Promise<{
                language: 'cpp' | 'java'
                compilerPath: string | null
                runtimePath?: string | null
                source: 'custom' | 'bundled' | 'system' | 'none'
                version?: string
            }>
            browseJavaCompiler: () => Promise<string | null>
            setCustomJavaPath: (customPath: string) => Promise<void>
            startProcess: (request: {
                language: 'cpp' | 'java'
                code: string
                filePath?: string | null
                cppStandard?: string
            }) => Promise<{ success: boolean; error?: string; compileTime?: number }>
            writeProcess: (data: string) => Promise<void>
            stopProcess: () => Promise<void>
            onProcessStdout: (callback: (data: string) => void) => () => void
            onProcessStderr: (callback: (data: string) => void) => () => void
            onProcessExit: (callback: (code: number) => void) => () => void
            debugStart: (code: string, breakpoints: { line: number }[]) => Promise<{ success: boolean; error?: string }>
            debugStop: () => Promise<void>
            debugStepOver: () => Promise<void>
            debugStepInto: () => Promise<void>
            debugStepOut: () => Promise<void>
            debugContinue: () => Promise<void>
            debugGetState: () => Promise<{
                status: 'idle' | 'running' | 'stopped' | 'exited'
                currentFile?: string
                currentLine?: number
                breakpoints: { id: number; file: string; line: number }[]
                locals: { name: string; value: string; type: string }[]
            }>
            debugSetBreakpoint: (file: string, line: number) => Promise<{ id: number; file: string; line: number } | null>
            debugRemoveBreakpoint: (id: number) => Promise<void>
            onDebugStateChanged: (callback: (state: {
                status: 'idle' | 'running' | 'stopped' | 'exited'
                currentFile?: string
                currentLine?: number
                breakpoints: { id: number; file: string; line: number }[]
                locals: { name: string; value: string; type: string }[]
            }) => void) => () => void
            onDebugStdout: (callback: (data: string) => void) => () => void
            onDebugStderr: (callback: (data: string) => void) => () => void
            showMessage: (options: Electron.MessageBoxOptions) => Promise<Electron.MessageBoxReturnValue>
            getAuthorName: () => Promise<string>
            onNewFile: (callback: () => void) => () => void
            onOpenFile: (callback: () => void) => () => void
            onCloseFolder: (callback: () => void) => () => void
            onSave: (callback: () => void) => () => void
            onSaveAs: (callback: () => void) => () => void
            onRun: (callback: () => void) => () => void
            onStop: (callback: () => void) => () => void
            onDebugStart: (callback: () => void) => () => void
            onDebugStop: (callback: () => void) => () => void
            onDebugStepOver: (callback: () => void) => () => void
            onDebugStepInto: (callback: () => void) => () => void
            onDebugStepOut: (callback: () => void) => () => void
            onDebugContinue: (callback: () => void) => () => void
            onDebugToggleBreakpoint: (callback: () => void) => () => void
            trackEvent: (eventName: string) => Promise<void>
            setAnalyticsConsent: (consent: boolean) => Promise<void>
            getAnalyticsConsent: () => Promise<boolean | null>
            hasBeenAskedAnalytics: () => Promise<boolean>
            openExternal: (url: string) => Promise<void>
            watchFile: (filePath: string) => Promise<void>
            unwatchFile: (filePath: string) => Promise<void>
            onFileChanged: (callback: (filePath: string) => void) => () => void
        }
    }
}

export {}
