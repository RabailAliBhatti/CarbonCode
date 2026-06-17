import { app, BrowserWindow, Menu, ipcMain, dialog, globalShortcut, shell } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, readdirSync, statSync, watch, type FSWatcher } from 'fs'
import os from 'os'
import { detectCompiler, detectJavaRuntime, compileCode, compileJavaCode, startInteractiveProcess, startJavaProcess, writeToProcess, killProcess, setCustomCompilerPath, setCustomJavaPath, getCompilerInfo, RuntimeInfo, RunRequest } from './compiler'
import { getDebugger, DebugState } from './debugger'
import * as analytics from './analytics'

// Set app name BEFORE anything else for Windows taskbar
app.name = 'CarbonCode'
app.setName('CarbonCode')
app.setAppUserModelId('com.rabailalibhatti.carboncode')

// Store main window reference
let mainWindow: BrowserWindow | null = null

// Store current file state
let currentFilePath: string | null = null
let isDirty = false

// File watchers
const fileWatchers = new Map<string, { watcher: FSWatcher; timeout: ReturnType<typeof setTimeout> | null }>()

function createWindow() {
    // Create splash screen
    const splash = new BrowserWindow({
        width: 480,
        height: 300,
        frame: false,
        resizable: false,
        alwaysOnTop: true,
        transparent: true,
        skipTaskbar: true,
        center: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    })
    splash.loadFile(join(__dirname, '../public/splash.html'))

    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 800,
        minHeight: 600,
        backgroundColor: '#1e1e1e',
        titleBarStyle: 'default',
        autoHideMenuBar: true,
        title: 'CarbonCode',
        icon: join(__dirname, '../public/icon.png'),
        show: false,
        webPreferences: {
            preload: join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false
        }
    })

    // Hide the menu bar completely
    mainWindow.setMenuBarVisibility(false)

    // Force the window title
    mainWindow.setTitle('CarbonCode')

    // Show main window when ready, close splash
    mainWindow.once('ready-to-show', () => {
        mainWindow?.show()
        splash.close()
        splash.destroy()
    })

    // Load the app
    if (process.env.VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    } else {
        mainWindow.loadFile(join(__dirname, '../dist/index.html'))
    }

    // Force title after page loads
    mainWindow.webContents.on('did-finish-load', () => {
        if (mainWindow) {
            mainWindow.setTitle('CarbonCode')
        }
    })

    // Handle renderer crash
    mainWindow.webContents.on('render-process-gone', (_event, details) => {
        console.error('Renderer process gone:', details.reason)
        killProcess()
        dialog.showMessageBox(mainWindow!, {
            type: 'error',
            title: 'CarbonCode Crashed',
            message: 'The application encountered a critical error and needs to reload.',
            detail: `Reason: ${details.reason}`,
            buttons: ['Reload', 'Close']
        }).then(({ response }) => {
            if (response === 0) {
                mainWindow?.reload()
            } else {
                mainWindow?.close()
            }
        })
    })

    mainWindow.webContents.on('unresponsive', () => {
        dialog.showMessageBox(mainWindow!, {
            type: 'warning',
            title: 'CarbonCode Not Responding',
            message: 'The application is not responding. Do you want to reload?',
            buttons: ['Reload', 'Wait', 'Close']
        }).then(({ response }) => {
            if (response === 0) mainWindow?.reload()
            else if (response === 2) mainWindow?.close()
        })
    })

    // Create application menu
    createApplicationMenu()

    // Handle window close
    mainWindow.on('close', async (e) => {
        if (isDirty) {
            e.preventDefault()
            const result = await dialog.showMessageBox(mainWindow!, {
                type: 'warning',
                buttons: ['Save', "Don't Save", 'Cancel'],
                defaultId: 0,
                cancelId: 2,
                title: 'Unsaved Changes',
                message: 'You have unsaved changes. Do you want to save before closing?'
            })

            if (result.response === 0) {
                // Save
                mainWindow?.webContents.send('menu:save')
                // Wait a bit for save to complete
                setTimeout(() => {
                    isDirty = false
                    mainWindow?.close()
                }, 100)
            } else if (result.response === 1) {
                // Don't save - clear tab storage then close
                mainWindow?.webContents.send('session:discard')
                isDirty = false
                setTimeout(() => mainWindow?.close(), 50)
            }
            // Cancel - do nothing
        }
    })

    mainWindow.on('closed', () => {
        mainWindow = null
    })
}

function createApplicationMenu() {
    const template: Electron.MenuItemConstructorOptions[] = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'New File',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => mainWindow?.webContents.send('menu:new-file')
                },
                {
                    label: 'Open File...',
                    accelerator: 'CmdOrCtrl+O',
                    click: () => mainWindow?.webContents.send('menu:open-file')
                },
                { type: 'separator' },
                {
                    label: 'Save',
                    accelerator: 'CmdOrCtrl+S',
                    click: () => mainWindow?.webContents.send('menu:save')
                },
                {
                    label: 'Save As...',
                    accelerator: 'CmdOrCtrl+Shift+S',
                    click: () => mainWindow?.webContents.send('menu:save-as')
                },
                {
                    label: 'Close Folder',
                    click: () => mainWindow?.webContents.send('menu:close-folder')
                },
                { type: 'separator' },
                {
                    label: 'Quit',
                    accelerator: 'CmdOrCtrl+Q',
                    click: () => app.quit()
                }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' },
                { role: 'selectAll' }
            ]
        },
        {
            label: 'Run',
            submenu: [
                {
                    label: 'Compile & Run',
                    accelerator: 'F5',
                    click: () => mainWindow?.webContents.send('menu:run')
                },
                {
                    label: 'Stop Execution',
                    accelerator: 'Shift+F5',
                    click: () => mainWindow?.webContents.send('menu:stop')
                }
            ]
        },
        {
            label: 'Debug',
            submenu: [
                {
                    label: 'Start Debugging',
                    accelerator: 'Ctrl+F5',
                    click: () => mainWindow?.webContents.send('menu:debug-start')
                },
                {
                    label: 'Stop Debugging',
                    accelerator: 'Ctrl+Shift+F5',
                    click: () => mainWindow?.webContents.send('menu:debug-stop')
                },
                { type: 'separator' },
                {
                    label: 'Step Over',
                    accelerator: 'F10',
                    click: () => mainWindow?.webContents.send('menu:debug-step-over')
                },
                {
                    label: 'Step Into',
                    accelerator: 'F11',
                    click: () => mainWindow?.webContents.send('menu:debug-step-into')
                },
                {
                    label: 'Step Out',
                    accelerator: 'Shift+F11',
                    click: () => mainWindow?.webContents.send('menu:debug-step-out')
                },
                {
                    label: 'Continue',
                    accelerator: 'F8',
                    click: () => mainWindow?.webContents.send('menu:debug-continue')
                },
                { type: 'separator' },
                {
                    label: 'Toggle Breakpoint',
                    accelerator: 'F9',
                    click: () => mainWindow?.webContents.send('menu:debug-toggle-breakpoint')
                }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'About CarbonCode',
                    click: async () => {
                        const compiler = await detectCompiler()
                        const javaRuntime = await detectJavaRuntime()
                        dialog.showMessageBox(mainWindow!, {
                            type: 'info',
                            title: 'About CarbonCode',
                            message: 'CarbonCode',
                            detail: `Version: 1.0.0\n\nA lightweight, offline IDE for C++ and Java built with Electron, React, and Monaco Editor.\n\nDeveloped by: Rabail Ali Bhatti\n\nC++ Compiler: ${compiler || 'Not detected - Please install g++ or clang++'}\nJava Compiler: ${javaRuntime.compilerPath || 'Not detected - Please install JDK'}`
                        })
                    }
                }
            ]
        }
    ]

    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)
}

// IPC Handlers

// Open file dialog and read file
ipcMain.handle('dialog:open-file', async () => {
    if (!mainWindow) return null

    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: 'Supported Files', extensions: ['cpp', 'cc', 'cxx', 'c++', 'h', 'hpp', 'hxx', 'java'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    })

    if (result.canceled || result.filePaths.length === 0) {
        return null
    }

    const filePath = result.filePaths[0]
    try {
        const content = readFileSync(filePath, 'utf-8')
        currentFilePath = filePath
        isDirty = false
        return { filePath, content }
    } catch (error) {
        dialog.showErrorBox('Error', `Failed to read file: ${error}`)
        return null
    }
})

// Save file (to existing path or show save dialog)
ipcMain.handle('dialog:save-file', async (_, content: string, existingPath?: string, language?: string) => {
    if (!mainWindow) return null

    let filePath = existingPath

    if (!filePath) {
        const filters = language === 'java'
            ? [
                { name: 'Java Files', extensions: ['java'] },
                { name: 'All Files', extensions: ['*'] }
              ]
            : language === 'cpp'
            ? [
                { name: 'C++ Files', extensions: ['cpp', 'cc', 'cxx', 'c++'] },
                { name: 'Header Files', extensions: ['h', 'hpp', 'hxx'] },
                { name: 'All Files', extensions: ['*'] }
              ]
            : [
                { name: 'C++ Files', extensions: ['cpp', 'cc', 'cxx', 'c++'] },
                { name: 'Java Files', extensions: ['java'] },
                { name: 'Header Files', extensions: ['h', 'hpp', 'hxx'] },
                { name: 'All Files', extensions: ['*'] }
              ]

        const result = await dialog.showSaveDialog(mainWindow, {
            defaultPath: language === 'java' ? 'untitled.java' : 'untitled.cpp',
            filters
        })

        if (result.canceled || !result.filePath) {
            return null
        }

        filePath = result.filePath
    }

    try {
        writeFileSync(filePath, content, 'utf-8')
        currentFilePath = filePath
        isDirty = false
        return { filePath, success: true }
    } catch (error) {
        dialog.showErrorBox('Error', `Failed to save file: ${error}`)
        return null
    }
})

// Update dirty state
ipcMain.handle('state:set-dirty', (_, dirty: boolean) => {
    isDirty = dirty
})

// Detect compiler
ipcMain.handle('compiler:detect', async (_, customPath?: string) => {
    return await detectCompiler(customPath)
})

// Browse for compiler executable
ipcMain.handle('compiler:browse', async () => {
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: 'C++ Compiler', extensions: ['exe'] },
            { name: 'All Files', extensions: ['*'] }
        ],
        title: 'Select C++ Compiler (g++.exe, clang++.exe, etc.)'
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
})

// Set custom compiler path
ipcMain.handle('compiler:set-custom-path', (_, customPath: string) => {
    setCustomCompilerPath(customPath)
})

// Java Runtime Detection
ipcMain.handle('java:detect', async (_, javaHome?: string, javaCompilerPath?: string): Promise<RuntimeInfo> => {
    return await detectJavaRuntime(javaHome, javaCompilerPath)
})

ipcMain.handle('java:browse-compiler', async () => {
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: 'Java Compiler', extensions: process.platform === 'win32' ? ['exe'] : ['*'] },
            { name: 'All Files', extensions: ['*'] }
        ],
        title: 'Select Java Compiler (javac)'
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
})

ipcMain.handle('java:set-custom-path', (_, customPath: string) => {
    setCustomJavaPath(customPath)
})

// Get compiler info (path + source)
ipcMain.handle('compiler:get-info', () => {
    return getCompilerInfo()
})

// Get author name (system username)
ipcMain.handle('get-author-name', () => {
    return os.userInfo().username
})

// Interactive Process Handlers

// Start interactive process
ipcMain.handle('process:start', async (_, requestOrCode: RunRequest | string, legacyCppStandard?: string) => {
    const request: RunRequest = typeof requestOrCode === 'string'
        ? { language: 'cpp', code: requestOrCode, cppStandard: legacyCppStandard }
        : requestOrCode

    // Safety: detect language from file extension if not explicitly java
    if (request.language !== 'java' && request.filePath && request.filePath.toLowerCase().endsWith('.java')) {
        request.language = 'java'
    }

    // Safety: detect Java from code content if language was not set correctly
    if (request.language !== 'java') {
        const trimmed = request.code.trim()
        if (
            /^\s*import\s+java\./m.test(trimmed) ||
            /\bpublic\s+class\b/.test(trimmed) ||
            /\bextends\s+\w+/.test(trimmed) ||
            /\bSystem\.out\./.test(trimmed) ||
            /\bSystem\.in\./.test(trimmed)
        ) {
            request.language = 'java'
        }
    }

    if (request.language === 'java') {
        // Static analysis: warn if Scanner is created but never read from
        const code = request.code
        const hasScanner = /new\s+Scanner\s*\(\s*System\.in\s*\)/.test(code)
        const hasAnyScanRead = /(\w+)\.(next|nextLine|nextInt|nextDouble|nextFloat|nextBoolean|nextLong|nextByte|nextShort)\s*\(/.test(code)
        let warningMsg = ''
        if (hasScanner && !hasAnyScanRead) {
            warningMsg = '\n\u26a0\ufe0f Warning: Your code creates a Scanner to read from System.in, but no read method (next(), nextLine(), etc.) was found. The Scanner is unused.\n\n'
        }

        const compileResult = await compileJavaCode(request.code, request.filePath)

        if (!compileResult.success || !compileResult.executablePath || !compileResult.tempDir || !compileResult.mainClass) {
            return {
                success: false,
                error: compileResult.error || 'Java compilation failed',
                compileTime: compileResult.compileTime
            }
        }

        startJavaProcess(
            compileResult.executablePath,
            compileResult.tempDir,
            compileResult.mainClass,
            (data) => {
                mainWindow?.webContents.send('process:stdout', data)
            },
            (data) => {
                mainWindow?.webContents.send('process:stderr', data)
            },
            (code) => {
                mainWindow?.webContents.send('process:exit', code)
            }
        )

        // Send Scanner warning before process output
        if (warningMsg) {
            mainWindow?.webContents.send('process:stdout', warningMsg)
        }

        return {
            success: true,
            compileTime: compileResult.compileTime
        }
    }

    // C++ path
    const compileResult = await compileCode(request.code, request.cppStandard || 'c++17')

    if (!compileResult.success || !compileResult.executablePath || !compileResult.tempDir) {
        return {
            success: false,
            error: compileResult.error || 'Compilation failed',
            compileTime: compileResult.compileTime
        }
    }

    startInteractiveProcess(
        compileResult.executablePath,
        compileResult.tempDir,
        (data) => {
            mainWindow?.webContents.send('process:stdout', data)
        },
        (data) => {
            mainWindow?.webContents.send('process:stderr', data)
        },
        (code) => {
            mainWindow?.webContents.send('process:exit', code)
        }
    )

    return {
        success: true,
        compileTime: compileResult.compileTime
    }
})

// Write to process stdin
ipcMain.handle('process:write', (_, data: string) => {
    writeToProcess(data)
})

// Stop process
ipcMain.handle('process:stop', () => {
    killProcess()
})

// Force stop process (used by crash recovery)
ipcMain.on('process:force-stop', () => {
    killProcess()
})

// Show confirmation dialog
ipcMain.handle('dialog:show-message', async (_, options: Electron.MessageBoxOptions) => {
    if (!mainWindow) return null
    return await dialog.showMessageBox(mainWindow, options)
})

// Read a single file
ipcMain.handle('file:read', async (_, filePath: string) => {
    try {
        const content = readFileSync(filePath, 'utf-8')
        return content
    } catch (error) {
        console.error('Failed to read file:', error)
        return null
    }
})

// Open folder dialog
ipcMain.handle('dialog:open-folder', async () => {
    if (!mainWindow) return null

    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    })

    if (result.canceled || result.filePaths.length === 0) {
        return null
    }

    return result.filePaths[0]
})

// Read directory contents
ipcMain.handle('file:read-directory', async (_, dirPath: string) => {
    try {
        const entries = readdirSync(dirPath)
        const results = entries.map(name => {
            const fullPath = join(dirPath, name)
            try {
                const stats = statSync(fullPath)
                return {
                    name,
                    path: fullPath,
                    isDirectory: stats.isDirectory()
                }
            } catch {
                return null
            }
        }).filter(Boolean)

        return results
    } catch (error) {
        console.error('Failed to read directory:', error)
        return []
    }
})

// Debugger IPC Handlers
const debugService = getDebugger()

// Forward debugger events to renderer
debugService.on('stateChanged', (state: DebugState) => {
    mainWindow?.webContents.send('debugger:state-changed', state)
})

debugService.on('stdout', (data: string) => {
    mainWindow?.webContents.send('debugger:stdout', data)
})

debugService.on('stderr', (data: string) => {
    mainWindow?.webContents.send('debugger:stderr', data)
})

ipcMain.handle('debugger:start', async (_, code: string, breakpoints: { line: number }[]) => {
    return await debugService.start(code, breakpoints)
})

ipcMain.handle('debugger:stop', async () => {
    await debugService.stop()
})

ipcMain.handle('debugger:step-over', async () => {
    await debugService.stepOver()
})

ipcMain.handle('debugger:step-into', async () => {
    await debugService.stepInto()
})

ipcMain.handle('debugger:step-out', async () => {
    await debugService.stepOut()
})

ipcMain.handle('debugger:continue', async () => {
    await debugService.continue()
})

ipcMain.handle('debugger:get-state', () => {
    return debugService.getState()
})

ipcMain.handle('debugger:set-breakpoint', async (_, file: string, line: number) => {
    return await debugService.setBreakpoint(file, line)
})

ipcMain.handle('debugger:remove-breakpoint', async (_, id: number) => {
    await debugService.removeBreakpoint(id)
})

// Analytics IPC handlers
ipcMain.handle('analytics:track', (_, eventName: string, params?: Record<string, unknown>) => {
    switch (eventName) {
        case 'file_created':
            analytics.trackFileCreated(params?.language as string || 'unknown')
            break
        case 'file_opened':
            analytics.trackFileOpened(params?.language as string || 'unknown')
            break
        case 'code_compiled':
            analytics.trackCodeCompiled(params?.language as string || 'unknown', params?.lineCount as number || 0)
            break
        case 'code_run':
            analytics.trackCodeRun(params?.language as string || 'unknown', params?.lineCount as number || 0)
            break
        case 'code_run_error':
            analytics.trackCodeRunError(params?.language as string || 'unknown', params?.lineCount as number || 0, params?.errorMessage as string || '')
            break
        case 'debug_started':
            analytics.trackDebugStarted(params?.language as string || 'unknown')
            break
    }
})

ipcMain.handle('analytics:set-consent', (_, consent: boolean) => {
    analytics.setAnalyticsConsent(consent)
})

ipcMain.handle('analytics:get-consent', () => {
    return analytics.hasAnalyticsConsent()
})

ipcMain.handle('analytics:has-been-asked', () => {
    return analytics.hasBeenAskedAboutAnalytics()
})

// File watch handlers
ipcMain.handle('file:watch-start', (_, filePath: string) => {
    if (fileWatchers.has(filePath)) return

    const watcher = watch(filePath, { persistent: false }, () => {
        const entry = fileWatchers.get(filePath)
        if (!entry) return

        // Debounce: cancel previous timeout, set new one (300ms)
        if (entry.timeout) clearTimeout(entry.timeout)
        entry.timeout = setTimeout(() => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('file:changed', filePath)
            }
        }, 300)
    })

    fileWatchers.set(filePath, { watcher, timeout: null })
})

ipcMain.handle('file:watch-stop', (_, filePath: string) => {
    const entry = fileWatchers.get(filePath)
    if (entry) {
        if (entry.timeout) clearTimeout(entry.timeout)
        entry.watcher.close()
        fileWatchers.delete(filePath)
    }
})

ipcMain.handle('shell:open-external', (_, url: string) => {
    if (!url.startsWith('https:')) {
        console.warn(`Blocked opening of non-https URL: ${url}`)
        return
    }
    shell.openExternal(url)
})

ipcMain.handle('shell:show-item-in-folder', (_, filePath: string) => {
    if (!filePath) return
    shell.showItemInFolder(filePath)
})

// App lifecycle
app.whenReady().then(() => {
    // Force app name for Windows taskbar
    app.setName('CarbonCode')

    createWindow()

    // Track app launch (only if user has consented)
    analytics.trackAppLaunch()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('before-quit', () => {
    debugService.stop()
    // Close all file watchers
    for (const [, entry] of fileWatchers) {
        if (entry.timeout) clearTimeout(entry.timeout)
        entry.watcher.close()
    }
    fileWatchers.clear()
})

app.on('will-quit', () => {
    globalShortcut.unregisterAll()
})
