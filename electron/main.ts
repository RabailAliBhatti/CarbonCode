import { app, BrowserWindow, Menu, ipcMain, dialog, globalShortcut, shell } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import os from 'os'
import { detectCompiler, compileAndRun, compileCode, startInteractiveProcess, writeToProcess, killProcess, CompilationResult, CompileResult, setCustomCompilerPath, getCompilerInfo, isUsingBundledCompiler } from './compiler'
import { getDebugger, DebugState } from './debugger'
import * as analytics from './analytics'

// Store main window reference
let mainWindow: BrowserWindow | null = null

// Store current file state
let currentFilePath: string | null = null
let isDirty = false

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 800,
        minHeight: 600,
        backgroundColor: '#1e1e1e',
        titleBarStyle: 'default',
        icon: join(__dirname, '../public/icon.png'),
        webPreferences: {
            preload: join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false
        }
    })

    // Load the app
    if (process.env.VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
        // DevTools can be opened manually via View menu or Ctrl+Shift+I
    } else {
        mainWindow.loadFile(join(__dirname, '../dist/index.html'))
    }

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
                // Don't save
                isDirty = false
                mainWindow?.close()
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
                        dialog.showMessageBox(mainWindow!, {
                            type: 'info',
                            title: 'About CarbonCode',
                            message: 'CarbonCode',
                            detail: `Version: 1.0.0\n\nA lightweight, offline C++ IDE built with Electron, React, and Monaco Editor.\n\nDeveloped by: Rabail Ali Bhatti\n\nCompiler: ${compiler || 'Not detected - Please install g++ or clang++'}`
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
            { name: 'C++ Files', extensions: ['cpp', 'cc', 'cxx', 'c++', 'h', 'hpp', 'hxx'] },
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
ipcMain.handle('dialog:save-file', async (_, content: string, existingPath?: string) => {
    if (!mainWindow) return null

    let filePath = existingPath

    if (!filePath) {
        const result = await dialog.showSaveDialog(mainWindow, {
            defaultPath: 'untitled.cpp',
            filters: [
                { name: 'C++ Files', extensions: ['cpp', 'cc', 'cxx', 'c++'] },
                { name: 'Header Files', extensions: ['h', 'hpp', 'hxx'] },
                { name: 'All Files', extensions: ['*'] }
            ]
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

// Get compiler info (path + source)
ipcMain.handle('compiler:get-info', () => {
    return getCompilerInfo()
})

// Get author name (system username)
ipcMain.handle('get-author-name', () => {
    return os.userInfo().username
})

// Compile and run code (Legacy/One-shot)
ipcMain.handle('compiler:run', async (_, code: string, cppStandard: string): Promise<CompilationResult> => {
    return await compileAndRun(code, cppStandard)
})

// Interactive Process Handlers

// Start interactive process
ipcMain.handle('process:start', async (_, code: string, cppStandard: string) => {
    // 1. Compile
    const compileResult = await compileCode(code, cppStandard)

    if (!compileResult.success || !compileResult.executablePath || !compileResult.tempDir) {
        return {
            success: false,
            error: compileResult.error || 'Compilation failed',
            compileTime: compileResult.compileTime
        }
    }

    // 2. Start Process
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
ipcMain.handle('analytics:track', (_, eventName: string) => {
    switch (eventName) {
        case 'file_created':
            analytics.trackFileCreated()
            break
        case 'file_opened':
            analytics.trackFileOpened()
            break
        case 'code_compiled':
            analytics.trackCodeCompiled()
            break
        case 'code_run':
            analytics.trackCodeRun()
            break
        case 'debug_started':
            analytics.trackDebugStarted()
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

ipcMain.handle('shell:open-external', (_, url: string) => {
    shell.openExternal(url)
})

// App lifecycle
app.whenReady().then(() => {
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

app.on('will-quit', () => {
    globalShortcut.unregisterAll()
})
