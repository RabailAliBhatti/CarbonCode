import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // File operations
    openFile: () => ipcRenderer.invoke('dialog:open-file'),
    saveFile: (content: string, existingPath?: string) =>
        ipcRenderer.invoke('dialog:save-file', content, existingPath),
    readFile: (filePath: string) => ipcRenderer.invoke('file:read', filePath),

    // Folder operations
    openFolder: () => ipcRenderer.invoke('dialog:open-folder'),
    readDirectory: (dirPath: string) => ipcRenderer.invoke('file:read-directory', dirPath),

    // State management
    setDirty: (dirty: boolean) => ipcRenderer.invoke('state:set-dirty', dirty),

    // Compiler operations
    detectCompiler: () => ipcRenderer.invoke('compiler:detect'),
    runCompilation: (code: string, cppStandard: string) =>
        ipcRenderer.invoke('compiler:run', code, cppStandard),

    // Interactive Process
    startProcess: (code: string, cppStandard: string) =>
        ipcRenderer.invoke('process:start', code, cppStandard),
    writeProcess: (data: string) => ipcRenderer.invoke('process:write', data),
    stopProcess: () => ipcRenderer.invoke('process:stop'),

    // Process Listeners
    onProcessStdout: (callback: (data: string) => void) => {
        const subscription = (_: any, data: string) => callback(data)
        ipcRenderer.on('process:stdout', subscription)
        return () => ipcRenderer.removeListener('process:stdout', subscription)
    },
    onProcessStderr: (callback: (data: string) => void) => {
        const subscription = (_: any, data: string) => callback(data)
        ipcRenderer.on('process:stderr', subscription)
        return () => ipcRenderer.removeListener('process:stderr', subscription)
    },
    onProcessExit: (callback: (code: number) => void) => {
        const subscription = (_: any, code: number) => callback(code)
        ipcRenderer.on('process:exit', subscription)
        return () => ipcRenderer.removeListener('process:exit', subscription)
    },

    // Dialog operations
    showMessage: (options: Electron.MessageBoxOptions) =>
        ipcRenderer.invoke('dialog:show-message', options),

    // ... rest ...
    onNewFile: (callback: () => void) => {
        ipcRenderer.on('menu:new-file', callback)
        return () => ipcRenderer.removeListener('menu:new-file', callback)
    },
    onOpenFile: (callback: () => void) => {
        ipcRenderer.on('menu:open-file', callback)
        return () => ipcRenderer.removeListener('menu:open-file', callback)
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
    onToggleExplorer: (callback: () => void) => {
        ipcRenderer.on('menu:toggle-explorer', callback)
        return () => ipcRenderer.removeListener('menu:toggle-explorer', callback)
    }
})

// Type definitions for the exposed API
export interface ElectronAPI {
    openFile: () => Promise<{ filePath: string; content: string } | null>
    saveFile: (content: string, existingPath?: string) => Promise<{ filePath: string; success: boolean } | null>
    readFile: (filePath: string) => Promise<string | null>
    openFolder: () => Promise<string | null>
    readDirectory: (dirPath: string) => Promise<{ name: string; path: string; isDirectory: boolean }[]>
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
    onNewFile: (callback: () => void) => () => void
    onOpenFile: (callback: () => void) => () => void
    onSave: (callback: () => void) => () => void
    onSaveAs: (callback: () => void) => () => void
    onRun: (callback: () => void) => () => void
    onStop: (callback: () => void) => () => void
    onToggleExplorer: (callback: () => void) => () => void
}

declare global {
    interface Window {
        electronAPI: ElectronAPI
    }
}
