import React, { MouseEvent } from 'react'
import Editor from './Editor'
import TabBar, { FileTab } from './TabBar'
import OutputPanel from './OutputPanel'
import FileExplorer from './FileExplorer'
import DebugPanel from './DebugPanel'
import { SupportedLanguage } from '../types/language'
import { Settings } from '../hooks/useSettings'
import type { CompileError } from '../utils/parseCompileErrors'

interface CompilationResult {
    success: boolean
    output: string
    error: string
    compileTime?: number
    executionTime?: number
}

interface DebugState {
    status: 'idle' | 'running' | 'stopped' | 'exited'
    currentFile?: string
    currentLine?: number
    breakpoints: { id: number; file: string; line: number }[]
    locals: { name: string; value: string; type: string }[]
}

interface CodingScreenProps {
    tabs: FileTab[]
    activeTabId: string | null
    activeTab: FileTab | null | undefined
    onTabClick: (tabId: string) => void
    onTabClose: (tabId: string, e: MouseEvent) => void
    onNewTab: () => void
    onContextMenu: (tabId: string, x: number, y: number) => void
    activeLanguage: SupportedLanguage
    onCodeChange: (value: string | undefined) => void
    onEditorMount: (editor: any) => void
    cursorPosition: { line: number; column: number }
    settings: Settings
    onRun: () => void
    parsedErrors: CompileError[]
    showExplorer: boolean
    onToggleExplorer: () => void
    rootPath: string | null
    onOpenFolder: () => void
    onFileSelect: (filePath: string) => void
    onToggleTheme?: () => void
    debugState: DebugState
    javaDebugUnsupported: boolean
    onDebugStart: () => void
    onDebugStop: () => void
    onDebugStepOver: () => void
    onDebugStepInto: () => void
    onDebugStepOut: () => void
    onDebugContinue: () => void
    compilationResult: CompilationResult | null
    isCompiling: boolean
    isRunning: boolean
    onInput: (data: string) => void
    onStop: () => void
    onErrorClick?: (file: string | null, line: number, column?: number) => void
    outputWidth: number
    onOutputWidthChange: (width: number) => void
    onClearOutput?: () => void
    onUpdateExplorerWidth: (width: number) => void
}

export const CodingScreen: React.FC<CodingScreenProps> = ({
    tabs,
    activeTabId,
    activeTab,
    onTabClick,
    onTabClose,
    onNewTab,
    onContextMenu,
    activeLanguage,
    onCodeChange,
    onEditorMount,
    cursorPosition,
    settings,
    onRun,
    parsedErrors,
    showExplorer,
    onToggleExplorer,
    rootPath,
    onOpenFolder,
    onFileSelect,
    onToggleTheme,
    debugState,
    javaDebugUnsupported,
    onDebugStart,
    onDebugStop,
    onDebugStepOver,
    onDebugStepInto,
    onDebugStepOut,
    onDebugContinue,
    compilationResult,
    isCompiling,
    isRunning,
    onInput,
    onStop,
    onErrorClick,
    outputWidth,
    onOutputWidthChange,
    onClearOutput,
    onUpdateExplorerWidth
}) => {
    return (
        <div className="flex-1 flex min-h-0 min-w-0 bg-carbon-bg p-2 gap-2 overflow-hidden select-none">
            {/* 1. Left Explorer Card */}
            {showExplorer && (
                <div className="flex shrink-0">
                    <FileExplorer
                        isVisible={showExplorer}
                        onToggle={onToggleExplorer}
                        onFileSelect={onFileSelect}
                        currentFilePath={activeTab?.filePath || null}
                        rootPath={rootPath}
                        onOpenFolder={onOpenFolder}
                        width={settings.explorerWidth}
                        theme={settings.theme}
                        onToggleTheme={onToggleTheme}
                    />

                    {/* Explorer Resize Handle */}
                    <div
                        className="w-1 cursor-ew-resize hover:bg-carbon-accent/60 transition-colors shrink-0"
                        onMouseDown={(e) => {
                            e.preventDefault()
                            const startX = e.clientX
                            const startWidth = settings.explorerWidth

                            const onMouseMove = (e: globalThis.MouseEvent) => {
                                const delta = e.clientX - startX
                                const newWidth = Math.min(Math.max(160, startWidth + delta), 450)
                                onUpdateExplorerWidth(newWidth)
                            }

                            const onMouseUp = () => {
                                document.removeEventListener('mousemove', onMouseMove)
                                document.removeEventListener('mouseup', onMouseUp)
                            }

                            document.addEventListener('mousemove', onMouseMove)
                            document.addEventListener('mouseup', onMouseUp)
                        }}
                    />
                </div>
            )}

            {/* 2. Center Editor Card */}
            <div className="flex-1 flex flex-col min-h-0 min-w-0 bg-carbon-surface border border-carbon-border rounded-xl shadow-card overflow-hidden">
                {/* Integrated Tab Bar */}
                <TabBar
                    tabs={tabs}
                    activeTabId={activeTabId}
                    onTabClick={onTabClick}
                    onTabClose={onTabClose}
                    onNewTab={onNewTab}
                    onContextMenu={onContextMenu}
                />

                {/* Editor Content Area */}
                <div className="flex-1 min-h-0 relative">
                    <Editor
                        value={activeTab?.content || ''}
                        language={activeLanguage}
                        onChange={onCodeChange}
                        onEditorMount={onEditorMount}
                        fontSize={settings.fontSize}
                        tabSize={settings.tabSize}
                        minimap={settings.minimap}
                        wordWrap={settings.wordWrap}
                        theme={settings.theme}
                        onRun={onRun}
                        parsedErrors={parsedErrors}
                        tabs={tabs}
                        rootPath={rootPath}
                        onOpenFile={onFileSelect}
                        formatOnSave={settings.formatOnSave}
                    />
                </div>

                {/* Docked Debug Panel (when debugger is active) */}
                {debugState.status !== 'idle' && (
                    <DebugPanel
                        debugState={debugState}
                        javaDebugUnsupported={javaDebugUnsupported}
                        onStart={onDebugStart}
                        onStop={onDebugStop}
                        onStepOver={onDebugStepOver}
                        onStepInto={onDebugStepInto}
                        onStepOut={onDebugStepOut}
                        onContinue={onDebugContinue}
                    />
                )}

                {/* Internal Editor Bottom Bar (from Coding Screen.png) */}
                <div className="h-6 bg-carbon-surface border-t border-carbon-border px-3 flex items-center justify-between text-[11px] text-carbon-text-muted shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-carbon-success" />
                        <span className="text-carbon-text-secondary">Ready</span>
                    </div>

                    <div className="flex items-center gap-3 font-mono">
                        <span>Ln {cursorPosition.line}, Col {cursorPosition.column}</span>
                        <span>Spaces: {settings.tabSize}</span>
                        <span>UTF-8</span>
                        <span className="text-carbon-accent font-semibold uppercase">{activeLanguage}</span>
                    </div>
                </div>
            </div>

            {/* Output Panel Resize Handle */}
            <div
                className="w-1 cursor-ew-resize hover:bg-carbon-accent/60 transition-colors shrink-0"
                onMouseDown={(e) => {
                    e.preventDefault()
                    const startX = e.clientX
                    const startWidth = outputWidth

                    const onMouseMove = (e: globalThis.MouseEvent) => {
                        const delta = startX - e.clientX
                        const newWidth = Math.min(Math.max(220, startWidth + delta), 700)
                        onOutputWidthChange(newWidth)
                    }

                    const onMouseUp = () => {
                        document.removeEventListener('mousemove', onMouseMove)
                        document.removeEventListener('mouseup', onMouseUp)
                    }

                    document.addEventListener('mousemove', onMouseMove)
                    document.addEventListener('mouseup', onMouseUp)
                }}
            />

            {/* 3. Right Output / Errors Card */}
            <div style={{ width: outputWidth }} className="h-full shrink-0 flex flex-col">
                <OutputPanel
                    result={compilationResult}
                    isCompiling={isCompiling}
                    isRunning={isRunning}
                    onInput={onInput}
                    onStop={onStop}
                    fontSize={settings.fontSize}
                    parsedErrors={parsedErrors}
                    onErrorClick={onErrorClick}
                    onClear={onClearOutput}
                />
            </div>
        </div>
    )
}

export default CodingScreen
