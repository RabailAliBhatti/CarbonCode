import { app, BrowserWindow, Menu, ipcMain, dialog, globalShortcut } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync } from 'fs'
import { detectCompiler, compileAndRun, CompilationResult } from './compiler'

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
ipcMain.handle('compiler:detect', async () => {
    return await detectCompiler()
})

// Compile and run code
ipcMain.handle('compiler:run', async (_, code: string, cppStandard: string): Promise<CompilationResult> => {
    return await compileAndRun(code, cppStandard)
})

// Show confirmation dialog
ipcMain.handle('dialog:show-message', async (_, options: Electron.MessageBoxOptions) => {
    if (!mainWindow) return null
    return await dialog.showMessageBox(mainWindow, options)
})

// App lifecycle
app.whenReady().then(() => {
    createWindow()

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
