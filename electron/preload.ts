import { contextBridge, ipcRenderer } from 'electron'

// Debug state interface (must match debugger.ts)
interface DebugState {
    status: 'idle' | 'running' | 'stopped' | 'exited'
    currentFile?: string
    currentLine?: number
    breakpoints: { id: number; file: string; line: number }[]
    locals: { name: string; value: string; type: string }[]
}

type SupportedLanguage = 'cpp' | 'java'

interface RuntimeInfo {
    language: SupportedLanguage
    compilerPath: string | null
    runtimePath?: string | null
    source: 'custom' | 'bundled' | 'system' | 'none'
    version?: string
}

interface RunRequest {
    language: SupportedLanguage
    code: string
    filePath?: string | null
    cppStandard?: string
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // File operations
    openFile: () => ipcRenderer.invoke('dialog:open-file'),
    saveFile: (content: string, existingPath?: string, language?: SupportedLanguage) =>
        ipcRenderer.invoke('dialog:save-file', content, existingPath, language),
    readFile: (filePath: string) => ipcRenderer.invoke('file:read', filePath),

    // Folder operations
    openFolder: () => ipcRenderer.invoke('dialog:open-folder'),
    readDirectory: (dirPath: string) => ipcRenderer.invoke('file:read-directory', dirPath),

    // State management
    setDirty: (dirty: boolean) => ipcRenderer.invoke('state:set-dirty', dirty),

    // Compiler operations
    detectCompiler: (customPath?: string) => ipcRenderer.invoke('compiler:detect', customPath),
    browseCompiler: () => ipcRenderer.invoke('compiler:browse'),
    setCustomCompilerPath: (customPath: string) => ipcRenderer.invoke('compiler:set-custom-path', customPath),
    getCompilerInfo: () => ipcRenderer.invoke('compiler:get-info'),
    detectJavaRuntime: (javaHome?: string, javaCompilerPath?: string) =>
        ipcRenderer.invoke('java:detect', javaHome, javaCompilerPath),
    browseJavaCompiler: () => ipcRenderer.invoke('java:browse-compiler'),
    setCustomJavaPath: (customPath: string) => ipcRenderer.invoke('java:set-custom-path', customPath),

    // Interactive Process
    startProcess: (request: RunRequest) =>
        ipcRenderer.invoke('process:start', request),
    writeProcess: (data: string) => ipcRenderer.invoke('process:write', data),
    stopProcess: () => ipcRenderer.invoke('process:stop'),

    // Process Listeners
    onProcessStdout: (callback: (data: string) => void) => {
        const subscription = (_event: Electron.IpcRendererEvent, data: string) => callback(data)
        ipcRenderer.on('process:stdout', subscription)
        return () => ipcRenderer.removeListener('process:stdout', subscription)
    },
    onProcessStderr: (callback: (data: string) => void) => {
        const subscription = (_event: Electron.IpcRendererEvent, data: string) => callback(data)
        ipcRenderer.on('process:stderr', subscription)
        return () => ipcRenderer.removeListener('process:stderr', subscription)
    },
    onProcessExit: (callback: (code: number) => void) => {
        const subscription = (_event: Electron.IpcRendererEvent, code: number) => callback(code)
        ipcRenderer.on('process:exit', subscription)
        return () => ipcRenderer.removeListener('process:exit', subscription)
    },

    // Debugger API
    debugStart: (code: string, breakpoints: { line: number }[]) =>
        ipcRenderer.invoke('debugger:start', code, breakpoints),
    debugStop: () => ipcRenderer.invoke('debugger:stop'),
    debugStepOver: () => ipcRenderer.invoke('debugger:step-over'),
    debugStepInto: () => ipcRenderer.invoke('debugger:step-into'),
    debugStepOut: () => ipcRenderer.invoke('debugger:step-out'),
    debugContinue: () => ipcRenderer.invoke('debugger:continue'),
    debugGetState: () => ipcRenderer.invoke('debugger:get-state'),
    debugSetBreakpoint: (file: string, line: number) =>
        ipcRenderer.invoke('debugger:set-breakpoint', file, line),
    debugRemoveBreakpoint: (id: number) =>
        ipcRenderer.invoke('debugger:remove-breakpoint', id),

    // Debugger event listeners
    onDebugStateChanged: (callback: (state: DebugState) => void) => {
        const subscription = (_event: Electron.IpcRendererEvent, state: DebugState) => callback(state)
        ipcRenderer.on('debugger:state-changed', subscription)
        return () => ipcRenderer.removeListener('debugger:state-changed', subscription)
    },
    onDebugStdout: (callback: (data: string) => void) => {
        const subscription = (_event: Electron.IpcRendererEvent, data: string) => callback(data)
        ipcRenderer.on('debugger:stdout', subscription)
        return () => ipcRenderer.removeListener('debugger:stdout', subscription)
    },
    onDebugStderr: (callback: (data: string) => void) => {
        const subscription = (_event: Electron.IpcRendererEvent, data: string) => callback(data)
        ipcRenderer.on('debugger:stderr', subscription)
        return () => ipcRenderer.removeListener('debugger:stderr', subscription)
    },

    // Dialog operations
    showMessage: (options: Electron.MessageBoxOptions) =>
        ipcRenderer.invoke('dialog:show-message', options),

    // System info
    getAuthorName: () => ipcRenderer.invoke('get-author-name'),

    // Menu event listeners
    onNewFile: (callback: () => void) => {
        ipcRenderer.on('menu:new-file', callback)
        return () => ipcRenderer.removeListener('menu:new-file', callback)
    },
    onOpenFile: (callback: () => void) => {
        ipcRenderer.on('menu:open-file', callback)
        return () => ipcRenderer.removeListener('menu:open-file', callback)
    },
    onCloseFolder: (callback: () => void) => {
        ipcRenderer.on('menu:close-folder', callback)
        return () => ipcRenderer.removeListener('menu:close-folder', callback)
    },
    onSave: (callback: () => void) => {
        ipcRenderer.on('menu:save', callback)
        return () => ipcRenderer.removeListener('menu:save', callback)
    },
    onSaveAs: (callback: () => void) => {
        ipcRenderer.on('menu:save-as', callback)
        return () => ipcRenderer.removeListener('menu:save-as', callback)
    },
    onRun: (callback: () => void) => {
        ipcRenderer.on('menu:run', callback)
        return () => ipcRenderer.removeListener('menu:run', callback)
    },
    onStop: (callback: () => void) => {
        ipcRenderer.on('menu:stop', callback)
        return () => ipcRenderer.removeListener('menu:stop', callback)
    },
    // Debug menu listeners
    onDebugStart: (callback: () => void) => {
        ipcRenderer.on('menu:debug-start', callback)
        return () => ipcRenderer.removeListener('menu:debug-start', callback)
    },
    onDebugStop: (callback: () => void) => {
        ipcRenderer.on('menu:debug-stop', callback)
        return () => ipcRenderer.removeListener('menu:debug-stop', callback)
    },
    onDebugStepOver: (callback: () => void) => {
        ipcRenderer.on('menu:debug-step-over', callback)
        return () => ipcRenderer.removeListener('menu:debug-step-over', callback)
    },
    onDebugStepInto: (callback: () => void) => {
        ipcRenderer.on('menu:debug-step-into', callback)
        return () => ipcRenderer.removeListener('menu:debug-step-into', callback)
    },
    onDebugStepOut: (callback: () => void) => {
        ipcRenderer.on('menu:debug-step-out', callback)
        return () => ipcRenderer.removeListener('menu:debug-step-out', callback)
    },
    onDebugContinue: (callback: () => void) => {
        ipcRenderer.on('menu:debug-continue', callback)
        return () => ipcRenderer.removeListener('menu:debug-continue', callback)
    },
    onDebugToggleBreakpoint: (callback: () => void) => {
        ipcRenderer.on('menu:debug-toggle-breakpoint', callback)
        return () => ipcRenderer.removeListener('menu:debug-toggle-breakpoint', callback)
    },

    // Analytics API
    trackEvent: (eventName: string, params?: Record<string, unknown>) => ipcRenderer.invoke('analytics:track', eventName, params),
    setAnalyticsConsent: (consent: boolean) => ipcRenderer.invoke('analytics:set-consent', consent),
    getAnalyticsConsent: () => ipcRenderer.invoke('analytics:get-consent'),
    hasBeenAskedAnalytics: () => ipcRenderer.invoke('analytics:has-been-asked'),
    openExternal: (url: string) => ipcRenderer.invoke('shell:open-external', url),
    showItemInFolder: (filePath: string) => ipcRenderer.invoke('shell:show-item-in-folder', filePath),

    // File watch API
    watchFile: (filePath: string) => ipcRenderer.invoke('file:watch-start', filePath),
    unwatchFile: (filePath: string) => ipcRenderer.invoke('file:watch-stop', filePath),
    onFileChanged: (callback: (filePath: string) => void) => {
        const subscription = (_event: Electron.IpcRendererEvent, filePath: string) => callback(filePath)
        ipcRenderer.on('file:changed', subscription)
        return () => ipcRenderer.removeListener('file:changed', subscription)
    },

    // Session management
    onSessionDiscard: (callback: () => void) => {
        ipcRenderer.on('session:discard', callback)
        return () => ipcRenderer.removeListener('session:discard', callback)
    }
})

// Type definitions for the exposed API
export interface DebugStateType {
    status: 'idle' | 'running' | 'stopped' | 'exited'
    currentFile?: string
    currentLine?: number
    breakpoints: { id: number; file: string; line: number }[]
    locals: { name: string; value: string; type: string }[]
}

export interface ElectronAPI {
    openFile: () => Promise<{ filePath: string; content: string } | null>
    saveFile: (content: string, existingPath?: string, language?: SupportedLanguage) => Promise<{ filePath: string; success: boolean } | null>
    readFile: (filePath: string) => Promise<string | null>
    openFolder: () => Promise<string | null>
    readDirectory: (dirPath: string) => Promise<{ name: string; path: string; isDirectory: boolean }[]>
    setDirty: (dirty: boolean) => Promise<void>
    detectCompiler: (customPath?: string) => Promise<string | null>
    browseCompiler: () => Promise<string | null>
    setCustomCompilerPath: (customPath: string) => Promise<void>
    getCompilerInfo: () => Promise<{ path: string | null; source: string }>
    detectJavaRuntime: (javaHome?: string, javaCompilerPath?: string) => Promise<RuntimeInfo>
    browseJavaCompiler: () => Promise<string | null>
    setCustomJavaPath: (customPath: string) => Promise<void>

    // Interactive
    startProcess: (request: RunRequest) => Promise<{
        success: boolean
        error?: string
        compileTime?: number
    }>
    writeProcess: (data: string) => Promise<void>
    stopProcess: () => Promise<void>
    onProcessStdout: (callback: (data: string) => void) => () => void
    onProcessStderr: (callback: (data: string) => void) => () => void
    onProcessExit: (callback: (code: number) => void) => () => void

    // Debugger
    debugStart: (code: string, breakpoints: { line: number }[]) => Promise<{ success: boolean; error?: string }>
    debugStop: () => Promise<void>
    debugStepOver: () => Promise<void>
    debugStepInto: () => Promise<void>
    debugStepOut: () => Promise<void>
    debugContinue: () => Promise<void>
    debugGetState: () => Promise<DebugStateType>
    debugSetBreakpoint: (file: string, line: number) => Promise<{ id: number; file: string; line: number } | null>
    debugRemoveBreakpoint: (id: number) => Promise<void>
    onDebugStateChanged: (callback: (state: DebugStateType) => void) => () => void
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

    // Debug menu listeners
    onDebugStart: (callback: () => void) => () => void
    onDebugStop: (callback: () => void) => () => void
    onDebugStepOver: (callback: () => void) => () => void
    onDebugStepInto: (callback: () => void) => () => void
    onDebugStepOut: (callback: () => void) => () => void
    onDebugContinue: (callback: () => void) => () => void
    onDebugToggleBreakpoint: (callback: () => void) => () => void

    // Analytics API
    trackEvent: (eventName: string, params?: Record<string, unknown>) => Promise<void>
    setAnalyticsConsent: (consent: boolean) => Promise<void>
    getAnalyticsConsent: () => Promise<boolean | null>
    hasBeenAskedAnalytics: () => Promise<boolean>
    openExternal: (url: string) => Promise<void>
    showItemInFolder: (filePath: string) => Promise<void>

    // File watch API
    watchFile: (filePath: string) => Promise<void>
    unwatchFile: (filePath: string) => Promise<void>
    onFileChanged: (callback: (filePath: string) => void) => () => void

    // Session management
    onSessionDiscard: (callback: () => void) => () => void
}

declare global {
    interface Window {
        electronAPI: ElectronAPI
    }
}

