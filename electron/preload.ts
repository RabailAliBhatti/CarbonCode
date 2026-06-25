import { contextBridge, ipcRenderer } from 'electron'

// ponytail: IPC listener helper — one function instead of 20 identical blocks
function onIpc(channel: string, callback: (...args: unknown[]) => void) {
    const handler = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => callback(...args)
    ipcRenderer.on(channel, handler)
    return () => ipcRenderer.removeListener(channel, handler)
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // File operations
    openFile: () => ipcRenderer.invoke('dialog:open-file'),
    saveFile: (content: string, existingPath?: string, language?: string) =>
        ipcRenderer.invoke('dialog:save-file', content, existingPath, language),
    readFile: (filePath: string) => ipcRenderer.invoke('file:read', filePath),

    // Folder operations
    openFolder: () => ipcRenderer.invoke('dialog:open-folder'),
    openFolderByPath: (folderPath: string) => ipcRenderer.invoke('folder:open-by-path', folderPath),
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
    startProcess: (request: unknown) =>
        ipcRenderer.invoke('process:start', request),
    writeProcess: (data: string) => ipcRenderer.invoke('process:write', data),
    stopProcess: () => ipcRenderer.invoke('process:stop'),

    // Recent folders
    getRecentFolders: () => ipcRenderer.invoke('recent-folders:get'),
    addRecentFolder: (folderPath: string) => ipcRenderer.invoke('recent-folders:add', folderPath),
    removeRecentFolder: (folderPath: string) => ipcRenderer.invoke('recent-folders:remove', folderPath),

    // Process Listeners
    onProcessStdout: (cb: (data: string) => void) => onIpc('process:stdout', cb),
    onProcessStderr: (cb: (data: string) => void) => onIpc('process:stderr', cb),
    onProcessExit: (cb: (code: number) => void) => onIpc('process:exit', cb),

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
    onDebugStateChanged: (cb: (state: unknown) => void) => onIpc('debugger:state-changed', cb),
    onDebugStdout: (cb: (data: string) => void) => onIpc('debugger:stdout', cb),
    onDebugStderr: (cb: (data: string) => void) => onIpc('debugger:stderr', cb),

    // Dialog operations
    showMessage: (options: Electron.MessageBoxOptions) =>
        ipcRenderer.invoke('dialog:show-message', options),

    // System info
    getAuthorName: () => ipcRenderer.invoke('get-author-name'),

    // Menu event listeners
    onNewFile: (cb: () => void) => onIpc('menu:new-file', cb),
    onOpenFile: (cb: () => void) => onIpc('menu:open-file', cb),
    onCloseFolder: (cb: () => void) => onIpc('menu:close-folder', cb),
    onSave: (cb: () => void) => onIpc('menu:save', cb),
    onSaveAs: (cb: () => void) => onIpc('menu:save-as', cb),
    onRun: (cb: () => void) => onIpc('menu:run', cb),
    onStop: (cb: () => void) => onIpc('menu:stop', cb),
    onDebugStart: (cb: () => void) => onIpc('menu:debug-start', cb),
    onDebugStop: (cb: () => void) => onIpc('menu:debug-stop', cb),
    onDebugStepOver: (cb: () => void) => onIpc('menu:debug-step-over', cb),
    onDebugStepInto: (cb: () => void) => onIpc('menu:debug-step-into', cb),
    onDebugStepOut: (cb: () => void) => onIpc('menu:debug-step-out', cb),
    onDebugContinue: (cb: () => void) => onIpc('menu:debug-continue', cb),
    onDebugToggleBreakpoint: (cb: () => void) => onIpc('menu:debug-toggle-breakpoint', cb),

    // Analytics API
    trackEvent: (eventName: string, params?: Record<string, unknown>) => ipcRenderer.invoke('analytics:track', eventName, params),
    setAnalyticsConsent: (consent: boolean) => ipcRenderer.invoke('analytics:set-consent', consent),
    getAnalyticsConsent: () => ipcRenderer.invoke('analytics:get-consent'),
    hasBeenAskedAnalytics: () => ipcRenderer.invoke('analytics:has-been-asked'),
    openExternal: (url: string) => ipcRenderer.invoke('shell:open-external', url),
    showItemInFolder: (filePath: string) => ipcRenderer.invoke('shell:show-item-in-folder', filePath),

    // Find in files
    findInFiles: (rootPath: string, query: string, options?: {
        caseSensitive?: boolean
        wholeWord?: boolean
        regex?: boolean
        includePattern?: string
    }) => ipcRenderer.invoke('fs:find-in-files', rootPath, query, options),

    // File watch API
    watchFile: (filePath: string) => ipcRenderer.invoke('file:watch-start', filePath),
    unwatchFile: (filePath: string) => ipcRenderer.invoke('file:watch-stop', filePath),
    onFileChanged: (cb: (filePath: string) => void) => onIpc('file:changed', cb),

    // Session management
    onSessionDiscard: (cb: () => void) => onIpc('session:discard', cb)
})
