import React, { useState, MouseEvent } from 'react'
import Editor from './Editor'
import TabBar, { FileTab } from './TabBar'
import OutputPanel from './OutputPanel'
import FileExplorer from './FileExplorer'
import DebugPanel from './DebugPanel'
import { SupportedLanguage } from '../types/language'
import { Settings } from '../hooks/useSettings'
import type { CompileError } from '../utils/parseCompileErrors'
import type { QuickFixAction } from '../utils/errorTranslator'

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
    onSave?: () => void
    onSaveAs?: () => void
    onCloseTab?: () => void
    onOpenSettings?: () => void
    parsedErrors: CompileError[]
    showExplorer: boolean
    onToggleExplorer: () => void
    rootPath: string | null
    onOpenFolder: () => void
    onFileSelect: (filePath: string) => void
    onToggleTheme?: () => void
    debugState: DebugState
    showDebugPanel?: boolean
    onCloseDebugPanel?: () => void
    breakpointCount?: number
    javaDebugUnsupported: boolean
    onDebugStart: () => void
    onDebugStop: () => void
    onDebugStepOver: () => void
    onDebugStepInto: () => void
    onDebugStepOut: () => void
    onDebugContinue: () => void
    onToggleBreakpoint?: () => void
    onToggleSearch?: () => void
    compilationResult: CompilationResult | null
    isCompiling: boolean
    isRunning: boolean
    onInput: (data: string) => void
    onStop: () => void
    onErrorClick?: (file: string | null, line: number, column?: number) => void
    outputWidth: number
    onOutputWidthChange: (width: number) => void
    outputHeight?: number
    onOutputHeightChange?: (height: number) => void
    onToggleOutputPosition?: () => void
    onClearOutput?: () => void
    onUpdateExplorerWidth: (width: number) => void
    onUpdateSetting?: <K extends keyof Settings>(key: K, value: Settings[K]) => void
    onApplyQuickFix?: (action: QuickFixAction) => void
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
    onSave,
    onSaveAs,
    onCloseTab: _onCloseTab,
    onOpenSettings,
    parsedErrors,
    showExplorer,
    onToggleExplorer,
    rootPath,
    onOpenFolder,
    onFileSelect,
    onToggleTheme,
    debugState,
    showDebugPanel = false,
    onCloseDebugPanel,
    breakpointCount = 0,
    javaDebugUnsupported,
    onDebugStart,
    onDebugStop,
    onDebugStepOver,
    onDebugStepInto,
    onDebugStepOut,
    onDebugContinue,
    onToggleBreakpoint,
    onToggleSearch,
    compilationResult,
    isCompiling,
    isRunning,
    onInput,
    onStop,
    onErrorClick,
    outputWidth,
    onOutputWidthChange,
    outputHeight = 240,
    onOutputHeightChange,
    onToggleOutputPosition,
    onClearOutput,
    onUpdateExplorerWidth,
    onUpdateSetting,
    onApplyQuickFix
}) => {
    const isBottom = settings.outputPosition === 'bottom'
    const [isMaximized, setIsMaximized] = useState(false)
    const [isDragging, setIsDragging] = useState(false)

    // Calculate effective panel dimensions considering maximize toggle
    const effectiveHeight = isMaximized ? Math.max(380, window.innerHeight - 220) : (outputHeight || 240)
    const effectiveWidth = isMaximized ? Math.max(550, window.innerWidth - 300) : (outputWidth || 400)

    // Vertical drag resize handler (when output is at bottom)
    const handleVerticalResizeStart = (e: React.MouseEvent) => {
        e.preventDefault()
        setIsDragging(true)
        const startY = e.clientY
        const startHeight = effectiveHeight

        document.body.style.cursor = 'row-resize'
        document.body.style.userSelect = 'none'

        let currentHeight = startHeight

        const onMouseMove = (moveEvent: globalThis.MouseEvent) => {
            const delta = startY - moveEvent.clientY
            const maxHeight = Math.max(300, window.innerHeight - 150)
            const newHeight = Math.min(Math.max(100, startHeight + delta), maxHeight)
            currentHeight = newHeight
            if (isMaximized) setIsMaximized(false)
            onOutputHeightChange?.(newHeight)
        }

        const onMouseUp = () => {
            setIsDragging(false)
            document.body.style.cursor = ''
            document.body.style.userSelect = ''
            document.removeEventListener('mousemove', onMouseMove)
            document.removeEventListener('mouseup', onMouseUp)
            onOutputHeightChange?.(currentHeight)
        }

        document.addEventListener('mousemove', onMouseMove)
        document.addEventListener('mouseup', onMouseUp)
    }

    // Horizontal drag resize handler (when output is on right side)
    const handleHorizontalResizeStart = (e: React.MouseEvent) => {
        e.preventDefault()
        setIsDragging(true)
        const startX = e.clientX
        const startWidth = effectiveWidth

        document.body.style.cursor = 'col-resize'
        document.body.style.userSelect = 'none'

        let currentWidth = startWidth

        const onMouseMove = (moveEvent: globalThis.MouseEvent) => {
            const delta = startX - moveEvent.clientX
            const maxWidth = Math.max(400, window.innerWidth - 200)
            const newWidth = Math.min(Math.max(200, startWidth + delta), maxWidth)
            currentWidth = newWidth
            if (isMaximized) setIsMaximized(false)
            onOutputWidthChange(newWidth)
        }

        const onMouseUp = () => {
            setIsDragging(false)
            document.body.style.cursor = ''
            document.body.style.userSelect = ''
            document.removeEventListener('mousemove', onMouseMove)
            document.removeEventListener('mouseup', onMouseUp)
            onOutputWidthChange(currentWidth)
        }

        document.addEventListener('mousemove', onMouseMove)
        document.addEventListener('mouseup', onMouseUp)
    }

    // Explorer drag resize handler
    const handleExplorerResizeStart = (e: React.MouseEvent) => {
        e.preventDefault()
        const startX = e.clientX
        const startWidth = settings.explorerWidth

        document.body.style.cursor = 'col-resize'
        document.body.style.userSelect = 'none'

        const onMouseMove = (moveEvent: globalThis.MouseEvent) => {
            const delta = moveEvent.clientX - startX
            const newWidth = Math.min(Math.max(160, startWidth + delta), 450)
            onUpdateExplorerWidth(newWidth)
        }

        const onMouseUp = () => {
            document.body.style.cursor = ''
            document.body.style.userSelect = ''
            document.removeEventListener('mousemove', onMouseMove)
            document.removeEventListener('mouseup', onMouseUp)
        }

        document.addEventListener('mousemove', onMouseMove)
        document.addEventListener('mouseup', onMouseUp)
    }

    // Editor Card element
    const editorCard = (
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
                    activeTabId={activeTabId}
                    activeTab={activeTab}
                    onChange={onCodeChange}
                    onEditorMount={onEditorMount}
                    fontSize={settings.fontSize}
                    tabSize={settings.tabSize}
                    minimap={settings.minimap}
                    wordWrap={settings.wordWrap}
                    theme={settings.theme}
                    onRun={onRun}
                    onSave={onSave}
                    onSaveAs={onSaveAs}
                    onCloseTab={() => {
                        if (activeTabId) onTabClose(activeTabId, {} as any)
                    }}
                    onOpenSettings={onOpenSettings}
                    onDebugStart={onDebugStart}
                    onDebugStop={onDebugStop}
                    onDebugStepOver={onDebugStepOver}
                    onDebugStepInto={onDebugStepInto}
                    onDebugStepOut={onDebugStepOut}
                    onDebugContinue={onDebugContinue}
                    onToggleBreakpoint={onToggleBreakpoint}
                    onToggleExplorer={onToggleExplorer}
                    onToggleSearch={onToggleSearch}
                    parsedErrors={parsedErrors}
                    tabs={tabs}
                    rootPath={rootPath}
                    onOpenFile={onFileSelect}
                    formatOnSave={settings.formatOnSave}
                />
            </div>

            {/* Docked Debug Panel (opened from the rail, or whenever a session is active) */}
            {(showDebugPanel || debugState.status !== 'idle') && (
                <DebugPanel
                    debugState={debugState}
                    javaDebugUnsupported={javaDebugUnsupported}
                    language={activeTab?.language}
                    breakpointCount={breakpointCount}
                    onClose={onCloseDebugPanel}
                    onStart={onDebugStart}
                    onStop={onDebugStop}
                    onStepOver={onDebugStepOver}
                    onStepInto={onDebugStepInto}
                    onStepOut={onDebugStepOut}
                    onContinue={onDebugContinue}
                />
            )}

            {/* Internal Editor Bottom Bar */}
            <div className="h-6 bg-carbon-surface border-t border-carbon-border px-3 flex items-center justify-between text-[11px] text-carbon-text-muted shrink-0">
                <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-carbon-success" />
                    <span className="text-carbon-text-secondary">Ready</span>
                </div>

                <div className="flex items-center gap-3 font-mono">
                    {onToggleOutputPosition && (
                        <button
                            onClick={onToggleOutputPosition}
                            className="flex items-center gap-1 hover:text-carbon-accent transition-colors cursor-pointer text-[11px]"
                            title={`Toggle output panel position (currently ${settings.outputPosition})`}
                        >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {settings.outputPosition === 'bottom' ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 4v16M15 4v16" />
                                )}
                            </svg>
                            <span>Panel: {settings.outputPosition}</span>
                        </button>
                    )}
                    <span>Ln {cursorPosition.line}, Col {cursorPosition.column}</span>
                    <span>Spaces: {settings.tabSize}</span>
                    <span>UTF-8</span>
                    <span className="text-carbon-accent font-semibold uppercase">{activeLanguage}</span>
                </div>
            </div>
        </div>
    )

    // Output Panel component instance
    const outputPanelElement = (
        <OutputPanel
            result={compilationResult}
            isCompiling={isCompiling}
            isRunning={isRunning}
            onInput={onInput}
            onStop={onStop}
            fontSize={settings.outputFontSize || 13}
            onFontSizeChange={(newSize) => onUpdateSetting?.('outputFontSize', newSize)}
            parsedErrors={parsedErrors}
            onErrorClick={onErrorClick}
            onClear={onClearOutput}
            position={settings.outputPosition}
            onTogglePosition={onToggleOutputPosition}
            isMaximized={isMaximized}
            onToggleMaximize={() => setIsMaximized(prev => !prev)}
            outputStyle={settings.outputStyle || 'modern'}
            onOutputStyleChange={(style) => onUpdateSetting?.('outputStyle', style)}
            dosTheme={settings.dosTheme || 'classic'}
            onDosThemeChange={(theme) => onUpdateSetting?.('dosTheme', theme)}
            consoleMode={settings.consoleMode || 'integrated'}
            onConsoleModeChange={(mode) => onUpdateSetting?.('consoleMode', mode)}
            activeFileName={activeTab?.filePath ? activeTab.filePath.split(/[/\\]/).pop() : (activeTab?.fileName || 'main.exe')}
            onApplyQuickFix={onApplyQuickFix}
            activeLanguage={activeLanguage as any}
            currentCode={activeTab?.content}
        />
    )

    const isExternalMode = settings.consoleMode === 'external'
    const hasCompileErrors = (compilationResult && !compilationResult.success && !!compilationResult.error) || parsedErrors.length > 0
    const shouldShowOutput = !isExternalMode || hasCompileErrors

    return (
        <div className="flex-1 flex min-h-0 min-w-0 bg-carbon-bg p-2 gap-2 overflow-hidden select-none relative">
            {/* Transparent Drag Overlay to prevent mouse interception while resizing */}
            {isDragging && <div className="fixed inset-0 z-50 pointer-events-none" />}

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
                        className="w-2 -mx-0.5 cursor-col-resize hover:bg-carbon-accent/40 active:bg-carbon-accent/60 transition-colors shrink-0 flex items-center justify-center group z-10"
                        onMouseDown={handleExplorerResizeStart}
                        title="Drag to resize File Explorer"
                    >
                        <div className="h-10 w-1 rounded-full bg-carbon-border group-hover:bg-carbon-accent transition-colors" />
                    </div>
                </div>
            )}

            {!shouldShowOutput ? (
                /* External Mode: Distraction-free Full-Screen Editor */
                <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
                    {editorCard}
                </div>
            ) : isBottom ? (
                /* Bottom Layout: Vertical Split inside center column */
                <div className="flex-1 flex flex-col min-h-0 min-w-0 gap-2 overflow-hidden">
                    {editorCard}

                    {/* Output Panel Vertical Resize Handle */}
                    <div
                        className="h-2.5 -my-1 cursor-row-resize hover:bg-carbon-accent/40 active:bg-carbon-accent/60 transition-colors shrink-0 flex items-center justify-center group z-10 select-none"
                        onMouseDown={handleVerticalResizeStart}
                        title="Drag up/down to resize Output panel height"
                    >
                        <div className="w-14 h-1 rounded-full bg-carbon-border group-hover:bg-carbon-accent transition-colors" />
                    </div>

                    {/* Bottom Output / Errors Card */}
                    <div style={{ height: effectiveHeight }} className="w-full shrink-0 flex flex-col transition-[height] duration-75">
                        {outputPanelElement}
                    </div>
                </div>
            ) : (
                /* Right Layout: Horizontal Split */
                <>
                    {editorCard}

                    {/* Output Panel Horizontal Resize Handle */}
                    <div
                        className="w-2.5 -mx-1 cursor-col-resize hover:bg-carbon-accent/40 active:bg-carbon-accent/60 transition-colors shrink-0 flex items-center justify-center group z-10 select-none"
                        onMouseDown={handleHorizontalResizeStart}
                        title="Drag left/right to resize Output panel width"
                    >
                        <div className="h-14 w-1 rounded-full bg-carbon-border group-hover:bg-carbon-accent transition-colors" />
                    </div>

                    {/* 3. Right Output / Errors Card */}
                    <div style={{ width: effectiveWidth }} className="h-full shrink-0 flex flex-col transition-[width] duration-75">
                        {outputPanelElement}
                    </div>
                </>
            )}
        </div>
    )
}

export default CodingScreen
