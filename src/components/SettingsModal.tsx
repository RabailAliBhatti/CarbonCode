import React, { useState, useEffect } from 'react'
import { Settings, CppStandard, CStandard, OutputStyle, DosTheme, ConsoleMode } from '../hooks/useSettings'

interface UpdateInfo {
    status: string
    currentVersion: string
    newVersion?: string
    releaseNotes?: string
    downloadUrl?: string
    downloadPercent?: number
    errorMessage?: string
}

interface SettingsModalProps {
    isVisible: boolean
    onClose: () => void
    settings: Settings
    onUpdateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
}

function SettingsModal({ isVisible, onClose, settings, onUpdateSetting }: SettingsModalProps) {
    const [updateInfo, setUpdateInfo] = useState<UpdateInfo>({
        status: 'up-to-date',
        currentVersion: '4.1.0'
    })
    const [isChecking, setIsChecking] = useState(false)

    useEffect(() => {
        if (!isVisible || !window.electronAPI) return
        window.electronAPI.getUpdateStatus?.().then((st) => {
            if (st) setUpdateInfo(st)
        })
        const unsubscribe = window.electronAPI.onUpdateStatus?.((info) => {
            setUpdateInfo(info)
            if (info.status !== 'checking') {
                setIsChecking(false)
            }
        })
        return () => {
            unsubscribe?.()
        }
    }, [isVisible])

    const handleCheckForUpdates = async () => {
        setIsChecking(true)
        try {
            const res = await window.electronAPI?.checkForUpdates?.(true)
            if (res) setUpdateInfo(res)
        } catch {
            // Handled via status
        } finally {
            setIsChecking(false)
        }
    }

    const handleDownload = async () => {
        await window.electronAPI?.downloadUpdate?.()
    }

    const handleInstall = () => {
        window.electronAPI?.installUpdate?.()
    }

    if (!isVisible) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-editor-bg border border-editor-border rounded-lg shadow-2xl w-[500px] max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-editor-border">
                    <h2 className="text-xl font-semibold text-text-bright">Settings</h2>
                    <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
                    {/* Editor Settings */}
                    <section className="space-y-4">
                        <h3 className="text-sm font-semibold text-accent uppercase tracking-wider">Editor</h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-sm text-text-primary">Font Size</label>
                                <input
                                    type="number"
                                    value={settings.fontSize}
                                    onChange={(e) => onUpdateSetting('fontSize', parseInt(e.target.value) || 14)}
                                    min={8}
                                    max={32}
                                    className="w-full bg-editor-sidebar border border-editor-border rounded px-3 py-1.5 text-sm text-text-bright focus:border-accent outline-none focus:ring-1 focus:ring-accent transition-all"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm text-text-primary">Theme</label>
                                <select
                                    value={settings.theme}
                                    onChange={(e) => onUpdateSetting('theme', e.target.value as 'dark' | 'light')}
                                    className="w-full bg-editor-sidebar border border-editor-border rounded px-3 py-1.5 text-sm text-text-bright focus:border-accent outline-none focus:ring-1 focus:ring-accent transition-all"
                                >
                                    <option value="dark">Dark</option>
                                    <option value="light">Light</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm text-text-primary">Tab Size</label>
                                <select
                                    value={settings.tabSize}
                                    onChange={(e) => onUpdateSetting('tabSize', parseInt(e.target.value))}
                                    className="w-full bg-editor-sidebar border border-editor-border rounded px-3 py-1.5 text-sm text-text-bright focus:border-accent outline-none focus:ring-1 focus:ring-accent transition-all"
                                >
                                    <option value={2}>2 spaces</option>
                                    <option value={4}>4 spaces</option>
                                    <option value={8}>8 spaces</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex items-center justify-between group cursor-pointer" onClick={() => onUpdateSetting('wordWrap', !settings.wordWrap)}>
                            <label className="text-sm text-text-primary cursor-pointer">Word Wrap</label>
                            <div className={`w-10 h-5 rounded-full transition-colors relative ${settings.wordWrap ? 'bg-accent' : 'bg-editor-border group-hover:bg-editor-border/80'}`}>
                                <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all ${settings.wordWrap ? 'left-6' : 'left-1'}`} />
                            </div>
                        </div>

                        <div className="flex items-center justify-between group cursor-pointer" onClick={() => onUpdateSetting('minimap', !settings.minimap)}>
                            <label className="text-sm text-text-primary cursor-pointer">Minimap</label>
                            <div className={`w-10 h-5 rounded-full transition-colors relative ${settings.minimap ? 'bg-accent' : 'bg-editor-border group-hover:bg-editor-border/80'}`}>
                                <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all ${settings.minimap ? 'left-6' : 'left-1'}`} />
                            </div>
                        </div>

                        <div className="flex items-center justify-between group cursor-pointer" onClick={() => onUpdateSetting('autoSave', !settings.autoSave)}>
                            <div className="flex flex-col">
                                <label className="text-sm text-text-primary cursor-pointer">Auto Save</label>
                                <span className="text-xs text-text-secondary">Save files automatically when focus is lost</span>
                            </div>
                            <div className={`w-10 h-5 rounded-full transition-colors relative ${settings.autoSave ? 'bg-accent' : 'bg-editor-border group-hover:bg-editor-border/80'}`}>
                                <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all ${settings.autoSave ? 'left-6' : 'left-1'}`} />
                            </div>
                        </div>

                        <div className="flex items-center justify-between group cursor-pointer" onClick={() => onUpdateSetting('formatOnSave', !settings.formatOnSave)}>
                            <div className="flex flex-col">
                                <label className="text-sm text-text-primary cursor-pointer">Format on Save</label>
                                <span className="text-xs text-text-secondary">Automatically format code with Shift+Alt+F rules when saving</span>
                            </div>
                            <div className={`w-10 h-5 rounded-full transition-colors relative ${settings.formatOnSave ? 'bg-accent' : 'bg-editor-border group-hover:bg-editor-border/80'}`}>
                                <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all ${settings.formatOnSave ? 'left-6' : 'left-1'}`} />
                            </div>
                        </div>

                    </section>

                    <div className="h-px bg-editor-border" />

                    {/* Compiler Settings */}
                    <section className="space-y-4">
                        <h3 className="text-sm font-semibold text-accent uppercase tracking-wider">Compilers</h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-sm text-text-primary">Default C Standard</label>
                                <select
                                    value={settings.cStandard}
                                    onChange={(e) => onUpdateSetting('cStandard', e.target.value as CStandard)}
                                    className="w-full bg-editor-sidebar border border-editor-border rounded px-3 py-1.5 text-sm text-text-bright focus:border-accent outline-none focus:ring-1 focus:ring-accent transition-all"
                                >
                                    <option value="c99">C99 (ISO 1999)</option>
                                    <option value="c11">C11 (ISO 2011)</option>
                                    <option value="c17">C17 (Recommended)</option>
                                    <option value="c23">C23 (Modern)</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm text-text-primary">Default C++ Standard</label>
                                <select
                                    value={settings.cppStandard}
                                    onChange={(e) => onUpdateSetting('cppStandard', e.target.value as CppStandard)}
                                    className="w-full bg-editor-sidebar border border-editor-border rounded px-3 py-1.5 text-sm text-text-bright focus:border-accent outline-none focus:ring-1 focus:ring-accent transition-all"
                                >
                                    <option value="c++11">C++ 11 (2011)</option>
                                    <option value="c++14">C++ 14 (2014)</option>
                                    <option value="c++17">C++ 17 (2017)</option>
                                    <option value="c++20">C++ 20 (2020)</option>
                                    <option value="c++23">C++ 23 (Experimental)</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm text-text-primary">Custom Compiler Path (Optional)</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={settings.compilerPath}
                                    placeholder="Leave blank to use built-in MinGW"
                                    onChange={(e) => {
                                        onUpdateSetting('compilerPath', e.target.value)
                                        window.electronAPI?.setCustomCompilerPath(e.target.value)
                                    }}
                                    className="flex-1 bg-editor-sidebar border border-editor-border rounded px-3 py-1.5 text-sm text-text-bright focus:border-accent outline-none focus:ring-1 focus:ring-accent transition-all"
                                />
                                <button
                                    onClick={async () => {
                                        const path = await window.electronAPI?.browseCompiler()
                                        if (path) {
                                            onUpdateSetting('compilerPath', path)
                                            window.electronAPI?.setCustomCompilerPath(path)
                                        }
                                    }}
                                    className="px-3 py-1.5 bg-accent/20 hover:bg-accent/30 text-accent border border-accent/30 rounded text-sm transition-colors whitespace-nowrap"
                                >
                                    Browse...
                                </button>
                            </div>
                            <p className="text-xs text-text-secondary">Leave blank to use the built-in MinGW compiler. Specify a path to use a different compiler (e.g., C:\msys64\mingw64\bin\g++.exe).</p>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm text-text-primary">Java Compiler Path (Optional)</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={settings.javaCompilerPath}
                                    placeholder="Path to javac"
                                    onChange={(e) => {
                                        onUpdateSetting('javaCompilerPath', e.target.value)
                                        window.electronAPI?.setCustomJavaPath(e.target.value)
                                    }}
                                    className="flex-1 bg-editor-sidebar border border-editor-border rounded px-3 py-1.5 text-sm text-text-bright focus:border-accent outline-none focus:ring-1 focus:ring-accent transition-all"
                                />
                                <button
                                    onClick={async () => {
                                        const path = await window.electronAPI?.browseJavaCompiler()
                                        if (path) {
                                            onUpdateSetting('javaCompilerPath', path)
                                            window.electronAPI?.setCustomJavaPath(path)
                                        }
                                    }}
                                    className="px-3 py-1.5 bg-accent/20 hover:bg-accent/30 text-accent border border-accent/30 rounded text-sm transition-colors whitespace-nowrap"
                                >
                                    Browse...
                                </button>
                            </div>
                            <p className="text-xs text-text-secondary">Java support requires a JDK with javac, not just a JRE. Leave blank to use JAVA_HOME or the system PATH.</p>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm text-text-primary">JAVA_HOME (Optional)</label>
                            <input
                                type="text"
                                value={settings.javaHome}
                                placeholder="Path to a JDK folder"
                                onChange={(e) => onUpdateSetting('javaHome', e.target.value)}
                                className="w-full bg-editor-sidebar border border-editor-border rounded px-3 py-1.5 text-sm text-text-bright focus:border-accent outline-none focus:ring-1 focus:ring-accent transition-all"
                            />
                            <p className="text-xs text-text-secondary">Example: C:\Program Files\Eclipse Adoptium\jdk-21</p>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm text-text-primary">Python Interpreter Path (Optional)</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={settings.pythonPath}
                                    placeholder="Path to python.exe or py launcher"
                                    onChange={(e) => {
                                        onUpdateSetting('pythonPath', e.target.value)
                                        window.electronAPI?.setCustomPythonPath(e.target.value)
                                    }}
                                    className="flex-1 bg-editor-sidebar border border-editor-border rounded px-3 py-1.5 text-sm text-text-bright focus:border-accent outline-none focus:ring-1 focus:ring-accent transition-all"
                                />
                                <button
                                    onClick={async () => {
                                        const path = await window.electronAPI?.browsePythonInterpreter()
                                        if (path) {
                                            onUpdateSetting('pythonPath', path)
                                            window.electronAPI?.setCustomPythonPath(path)
                                        }
                                    }}
                                    className="px-3 py-1.5 bg-accent/20 hover:bg-accent/30 text-accent border border-accent/30 rounded text-sm transition-colors whitespace-nowrap"
                                >
                                    Browse...
                                </button>
                            </div>
                            <p className="text-xs text-text-secondary">Leave blank to automatically detect the system Python or Windows py launcher.</p>
                        </div>
                    </section>

                    <div className="h-px bg-editor-border" />

                    {/* Output & Terminal Settings */}
                    <section className="space-y-4">
                        <h3 className="text-sm font-semibold text-accent uppercase tracking-wider">Output & Terminal</h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1 col-span-2">
                                <label className="text-sm text-text-primary">Console Window / Execution Mode</label>
                                <select
                                    value={settings.consoleMode || 'integrated'}
                                    onChange={(e) => onUpdateSetting('consoleMode', e.target.value as ConsoleMode)}
                                    className="w-full bg-editor-sidebar border border-editor-border rounded px-3 py-1.5 text-sm text-text-bright focus:border-accent outline-none focus:ring-1 focus:ring-accent transition-all"
                                >
                                    <option value="integrated">Integrated Panel (Inside IDE)</option>
                                    <option value="external">External CMD Screen (Dev-C++ / DOS Popup)</option>
                                </select>
                                <p className="text-xs text-text-secondary">External mode pops up a separate native Windows Command Prompt with interactive standard input (cin/scanf) and pause on exit, just like Dev-C++.</p>
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm text-text-primary">Terminal Format</label>
                                <select
                                    value={settings.outputStyle || 'modern'}
                                    onChange={(e) => onUpdateSetting('outputStyle', e.target.value as OutputStyle)}
                                    className="w-full bg-editor-sidebar border border-editor-border rounded px-3 py-1.5 text-sm text-text-bright focus:border-accent outline-none focus:ring-1 focus:ring-accent transition-all"
                                >
                                    <option value="modern">Modern (Carbon Dark)</option>
                                    <option value="dos">Classic DOS / Dev-C++</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm text-text-primary">DOS Theme</label>
                                <select
                                    value={settings.dosTheme || 'classic'}
                                    onChange={(e) => onUpdateSetting('dosTheme', e.target.value as DosTheme)}
                                    disabled={settings.outputStyle !== 'dos'}
                                    className={`w-full bg-editor-sidebar border border-editor-border rounded px-3 py-1.5 text-sm text-text-bright focus:border-accent outline-none focus:ring-1 focus:ring-accent transition-all ${
                                        settings.outputStyle !== 'dos' ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}
                                >
                                    <option value="classic">Classic CMD (Black & White)</option>
                                    <option value="matrix">Matrix Phosphor (Green)</option>
                                    <option value="amber">Retro CRT (Amber)</option>
                                    <option value="turboc">Borland Turbo C++ (Blue & Yellow)</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm text-text-primary">Output Font Size</label>
                                <input
                                    type="number"
                                    value={settings.outputFontSize}
                                    onChange={(e) => onUpdateSetting('outputFontSize', parseInt(e.target.value) || 13)}
                                    min={10}
                                    max={24}
                                    className="w-full bg-editor-sidebar border border-editor-border rounded px-3 py-1.5 text-sm text-text-bright focus:border-accent outline-none focus:ring-1 focus:ring-accent transition-all"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm text-text-primary">Output Position</label>
                                <select
                                    value={settings.outputPosition}
                                    onChange={(e) => onUpdateSetting('outputPosition', e.target.value as 'bottom' | 'right')}
                                    className="w-full bg-editor-sidebar border border-editor-border rounded px-3 py-1.5 text-sm text-text-bright focus:border-accent outline-none focus:ring-1 focus:ring-accent transition-all"
                                >
                                    <option value="bottom">Bottom</option>
                                    <option value="right">Right Side</option>
                                </select>
                            </div>
                        </div>
                    </section>

                    <div className="h-px bg-editor-border" />

                    {/* Privacy & Data */}
                    <section className="space-y-4">
                        <h3 className="text-sm font-semibold text-accent uppercase tracking-wider">Privacy & Data</h3>

                        <div className="flex items-center justify-between group cursor-pointer" onClick={() => {
                            const newValue = settings.analyticsConsent === true ? false : true
                            onUpdateSetting('analyticsConsent', newValue)
                            window.electronAPI?.setAnalyticsConsent(newValue)
                        }}>
                            <div className="flex flex-col">
                                <label className="text-sm text-text-primary cursor-pointer">Share Anonymous Usage Data</label>
                                <span className="text-xs text-text-secondary">Help improve CarbonCode by sharing anonymous feature usage</span>
                            </div>
                            <div className={`w-10 h-5 rounded-full transition-colors relative ${settings.analyticsConsent === true ? 'bg-accent' : 'bg-editor-border group-hover:bg-editor-border/80'}`}>
                                <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all ${settings.analyticsConsent === true ? 'left-6' : 'left-1'}`} />
                            </div>
                        </div>

                        <button
                            onClick={() => window.electronAPI?.openExternal('https://github.com/rabailalibhatti/carboncode/blob/main/PRIVACY.md')}
                            className="text-accent hover:text-accent-hover text-sm underline underline-offset-2"
                        >
                            View Privacy Policy →
                        </button>
                    </section>

                    <div className="h-px bg-editor-border" />

                    {/* About & Updates */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-accent uppercase tracking-wider">About & Updates</h3>
                            <span className="text-xs text-text-muted font-mono bg-editor-sidebar px-2 py-0.5 rounded border border-editor-border">v{updateInfo.currentVersion}</span>
                        </div>

                        <div className="bg-editor-sidebar border border-editor-border rounded-lg p-3.5 space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-sm font-semibold text-text-primary">CarbonCode IDE</h4>
                                    <p className="text-xs text-text-muted">Fast, modern C/C++, Java & Python offline IDE</p>
                                </div>
                                <button
                                    onClick={handleCheckForUpdates}
                                    disabled={isChecking || updateInfo.status === 'downloading'}
                                    className="px-3 py-1.5 bg-editor-bg border border-editor-border hover:border-accent text-xs font-medium text-text-primary hover:text-white rounded transition-all flex items-center gap-1.5 disabled:opacity-50"
                                >
                                    {isChecking ? (
                                        <>
                                            <div className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                                            <span>Checking...</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-3.5 h-3.5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                            </svg>
                                            <span>Check for Updates</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Status Banner */}
                            {updateInfo.status === 'update-available' && (
                                <div className="p-3 bg-accent/10 border border-accent/40 rounded-lg space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-accent animate-ping" />
                                            <span className="text-xs font-semibold text-text-bright">New Version Available: {updateInfo.newVersion}</span>
                                        </div>
                                        <button
                                            onClick={handleDownload}
                                            className="px-3 py-1 bg-accent hover:bg-accent-hover text-white text-xs font-semibold rounded shadow-sm transition-all"
                                        >
                                            Download in Background
                                        </button>
                                    </div>
                                    {updateInfo.releaseNotes && (
                                        <div className="text-[11px] text-text-secondary max-h-20 overflow-y-auto whitespace-pre-wrap font-mono bg-editor-bg/60 p-2 rounded border border-editor-border">
                                            {updateInfo.releaseNotes}
                                        </div>
                                    )}
                                </div>
                            )}

                            {updateInfo.status === 'downloading' && (
                                <div className="p-3 bg-editor-bg border border-editor-border rounded-lg space-y-2">
                                    <div className="flex items-center justify-between text-xs text-text-primary">
                                        <span className="font-medium">Downloading update in background...</span>
                                        <span className="font-mono text-accent font-bold">{updateInfo.downloadPercent || 0}%</span>
                                    </div>
                                    <div className="w-full bg-editor-border rounded-full h-2 overflow-hidden">
                                        <div
                                            className="bg-accent h-2 rounded-full transition-all duration-300"
                                            style={{ width: `${updateInfo.downloadPercent || 0}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {updateInfo.status === 'update-downloaded' && (
                                <div className="p-3 bg-emerald-500/10 border border-emerald-500/40 rounded-lg flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span className="text-xs font-semibold text-emerald-300">Update ready to install!</span>
                                    </div>
                                    <button
                                        onClick={handleInstall}
                                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded shadow-sm transition-all"
                                    >
                                        Restart to Apply
                                    </button>
                                </div>
                            )}

                            {updateInfo.status === 'up-to-date' && !isChecking && (
                                <div className="text-xs text-text-muted flex items-center gap-1.5">
                                    <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span>CarbonCode is up to date</span>
                                </div>
                            )}

                            {updateInfo.status === 'error' && updateInfo.errorMessage && (
                                <div className="text-xs text-red-400 flex items-center gap-1.5">
                                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="truncate">{updateInfo.errorMessage}</span>
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                {/* Footer */}
                <div className="p-6 pt-0">
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded font-medium transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div >
        </div >
    )
}

export default SettingsModal
