import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // File operations
    openFile: () => ipcRenderer.invoke('dialog:open-file'),
    saveFile: (content: string, existingPath?: string) =>
        ipcRenderer.invoke('dialog:save-file', content, existingPath),

    // State management
    setDirty: (dirty: boolean) => ipcRenderer.invoke('state:set-dirty', dirty),

    // Compiler operations
    detectCompiler: () => ipcRenderer.invoke('compiler:detect'),
    runCompilation: (code: string, cppStandard: string) =>
        ipcRenderer.invoke('compiler:run', code, cppStandard),

    // Dialog operations
    showMessage: (options: Electron.MessageBoxOptions) =>
        ipcRenderer.invoke('dialog:show-message', options),

    // Menu event listeners
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
    }
})

// Type definitions for the exposed API
export interface ElectronAPI {
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

declare global {
    interface Window {
        electronAPI: ElectronAPI
    }
}
