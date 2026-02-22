import { useState, useEffect, useCallback, useRef } from 'react'
import Editor from './components/Editor'
import Toolbar from './components/Toolbar'
import OutputPanel from './components/OutputPanel'
import StatusBar from './components/StatusBar'
import WelcomeScreen from './components/WelcomeScreen'

// Default C++ template
const DEFAULT_CODE = `#include <iostream>
#include <vector>
#include <string>

using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    cout << "Welcome to C++ IDE by AntiGravity!" << endl;
    
    // Your code here
    vector<int> numbers = {1, 2, 3, 4, 5};
    
    cout << "Numbers: ";
    for (int num : numbers) {
        cout << num << " ";
    }
    cout << endl;
    
    return 0;
}
`

interface CompilationResult {
    success: boolean
    output: string
    error: string
    compileTime?: number
    executionTime?: number
}

type CppStandard = 'c++11' | 'c++14' | 'c++17' | 'c++20' | 'c++23'

function App() {
    // File state
    const [filePath, setFilePath] = useState<string | null>(null)
    const [code, setCode] = useState<string>(DEFAULT_CODE)
    const [isDirty, setIsDirty] = useState<boolean>(false)
    const [showWelcome, setShowWelcome] = useState<boolean>(true)

    // Compiler state
    const [cppStandard, setCppStandard] = useState<CppStandard>('c++17')
    const [compilerInfo, setCompilerInfo] = useState<string | null>(null)
    const [isCompiling, setIsCompiling] = useState<boolean>(false)
    const [compilationResult, setCompilationResult] = useState<CompilationResult | null>(null)

    // UI state
    const [outputHeight, setOutputHeight] = useState<number>(200)
    const editorRef = useRef<{ getValue: () => string } | null>(null)

    // Check for compiler on mount
    useEffect(() => {
        const checkCompiler = async () => {
            const compiler = await window.electronAPI.detectCompiler()
            setCompilerInfo(compiler)
        }
        checkCompiler()
    }, [])

    // Update dirty state in main process
    useEffect(() => {
        window.electronAPI.setDirty(isDirty)
    }, [isDirty])

    // Handle code changes
    const handleCodeChange = useCallback((newCode: string | undefined) => {
        if (newCode !== undefined) {
            setCode(newCode)
            if (!isDirty && newCode !== DEFAULT_CODE) {
                setIsDirty(true)
            }
        }
    }, [isDirty])

    // New file handler
    const handleNewFile = useCallback(async () => {
        if (isDirty) {
            const result = await window.electronAPI.showMessage({
                type: 'warning',
                buttons: ['Save', "Don't Save", 'Cancel'],
                defaultId: 0,
                cancelId: 2,
                title: 'Unsaved Changes',
                message: 'You have unsaved changes. Do you want to save before creating a new file?'
            })

            if (result.response === 0) {
                await handleSave()
            } else if (result.response === 2) {
                return
            }
        }

        setCode(DEFAULT_CODE)
        setFilePath(null)
        setIsDirty(false)
        setCompilationResult(null)
        setShowWelcome(false)
    }, [isDirty])

    // Open file handler
    const handleOpenFile = useCallback(async () => {
        if (isDirty) {
            const result = await window.electronAPI.showMessage({
                type: 'warning',
                buttons: ['Save', "Don't Save", 'Cancel'],
                defaultId: 0,
                cancelId: 2,
                title: 'Unsaved Changes',
                message: 'You have unsaved changes. Do you want to save before opening a file?'
            })

            if (result.response === 0) {
                await handleSave()
            } else if (result.response === 2) {
                return
            }
        }

        const result = await window.electronAPI.openFile()
        if (result) {
            setCode(result.content)
            setFilePath(result.filePath)
            setIsDirty(false)
            setCompilationResult(null)
            setShowWelcome(false)
        }
    }, [isDirty])

    // Save file handler
    const handleSave = useCallback(async () => {
        const currentCode = editorRef.current?.getValue() || code
        const result = await window.electronAPI.saveFile(currentCode, filePath || undefined)
        if (result) {
            setFilePath(result.filePath)
            setIsDirty(false)
        }
    }, [code, filePath])

    // Save As handler
    const handleSaveAs = useCallback(async () => {
        const currentCode = editorRef.current?.getValue() || code
        const result = await window.electronAPI.saveFile(currentCode, undefined)
        if (result) {
            setFilePath(result.filePath)
            setIsDirty(false)
        }
    }, [code])

    // Run compilation handler
    const handleRun = useCallback(async () => {
        if (!compilerInfo) {
            setCompilationResult({
                success: false,
                output: '',
                error: '❌ No C++ compiler detected!\n\nPlease install a C++ compiler and restart the application.'
            })
            return
        }

        setIsCompiling(true)
        setCompilationResult(null)
        setShowWelcome(false)

        const currentCode = editorRef.current?.getValue() || code
        const result = await window.electronAPI.runCompilation(currentCode, cppStandard)

        setCompilationResult(result)
        setIsCompiling(false)
    }, [code, cppStandard, compilerInfo])

    // Register menu event listeners
    useEffect(() => {
        const cleanupNewFile = window.electronAPI.onNewFile(handleNewFile)
        const cleanupOpenFile = window.electronAPI.onOpenFile(handleOpenFile)
        const cleanupSave = window.electronAPI.onSave(handleSave)
        const cleanupSaveAs = window.electronAPI.onSaveAs(handleSaveAs)
        const cleanupRun = window.electronAPI.onRun(handleRun)

        return () => {
            cleanupNewFile()
            cleanupOpenFile()
            cleanupSave()
            cleanupSaveAs()
            cleanupRun()
        }
    }, [handleNewFile, handleOpenFile, handleSave, handleSaveAs, handleRun])

    // Get display file name
    const getFileName = () => {
        if (!filePath) return 'Untitled'
        const parts = filePath.split(/[\\/]/)
        return parts[parts.length - 1]
    }

    // Start coding (dismiss welcome screen)
    const handleStartCoding = () => {
        setShowWelcome(false)
    }

    return (
        <div className="h-screen flex flex-col bg-editor-bg overflow-hidden">
            {/* Header Bar */}
            <header className="flex items-center justify-between bg-toolbar-bg border-b border-editor-border px-4 py-2 shrink-0">
                <div className="flex items-center gap-3">
                    {/* Logo */}
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-blue-600 flex items-center justify-center shadow-glow">
                            <span className="text-white font-bold text-sm">C++</span>
                        </div>
                        <span className="text-text-bright font-semibold text-lg hidden sm:inline">CarbonCode</span>
                    </div>

                    {/* File name */}
                    <div className="flex items-center gap-2 ml-4 px-3 py-1 bg-editor-bg rounded-md border border-editor-border">
                        <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-text-primary text-sm font-mono">
                            {getFileName()}
                            {isDirty && <span className="text-warning ml-1">●</span>}
                        </span>
                    </div>
                </div>

                {/* Right side actions */}
                <div className="flex items-center gap-2">
                    {!compilerInfo && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-error/20 border border-error/50 rounded-md">
                            <svg className="w-4 h-4 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span className="text-error text-sm">No compiler</span>
                        </div>
                    )}
                </div>
            </header>

            {/* Toolbar */}
            <Toolbar
                cppStandard={cppStandard}
                onCppStandardChange={setCppStandard}
                onRun={handleRun}
                onNewFile={handleNewFile}
                onOpenFile={handleOpenFile}
                onSave={handleSave}
                isCompiling={isCompiling}
                hasCompiler={!!compilerInfo}
            />

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-h-0 relative">
                {showWelcome ? (
                    <WelcomeScreen
                        compilerInfo={compilerInfo}
                        onNewFile={handleNewFile}
                        onOpenFile={handleOpenFile}
                        onStartCoding={handleStartCoding}
                    />
                ) : (
                    <>
                        {/* Editor */}
                        <div
                            className="flex-1 min-h-0"
                            style={{ height: `calc(100% - ${outputHeight}px)` }}
                        >
                            <Editor
                                value={code}
                                onChange={handleCodeChange}
                                onEditorMount={(editor) => {
                                    editorRef.current = {
                                        getValue: () => editor.getValue()
                                    }
                                }}
                            />
                        </div>

                        {/* Resize Handle */}
                        <div
                            className="h-1 bg-editor-border cursor-ns-resize hover:bg-accent transition-colors shrink-0"
                            onMouseDown={(e) => {
                                e.preventDefault()
                                const startY = e.clientY
                                const startHeight = outputHeight

                                const onMouseMove = (e: MouseEvent) => {
                                    const delta = startY - e.clientY
                                    const newHeight = Math.min(Math.max(100, startHeight + delta), 500)
                                    setOutputHeight(newHeight)
                                }

                                const onMouseUp = () => {
                                    document.removeEventListener('mousemove', onMouseMove)
                                    document.removeEventListener('mouseup', onMouseUp)
                                }

                                document.addEventListener('mousemove', onMouseMove)
                                document.addEventListener('mouseup', onMouseUp)
                            }}
                        />

                        {/* Output Panel */}
                        <div style={{ height: outputHeight }} className="shrink-0">
                            <OutputPanel
                                result={compilationResult}
                                isCompiling={isCompiling}
                            />
                        </div>
                    </>
                )}
            </main>

            {/* Status Bar */}
            <StatusBar
                filePath={filePath}
                cppStandard={cppStandard}
                compilerInfo={compilerInfo}
                isCompiling={isCompiling}
                compilationResult={compilationResult}
            />
        </div>
    )
}

export default App
