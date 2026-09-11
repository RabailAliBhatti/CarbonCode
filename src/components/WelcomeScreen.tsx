import React, { useState, useEffect, useCallback } from 'react'
import { SupportedLanguage, getLanguageLabel } from '../types/language'
import { CStandard, CppStandard } from '../hooks/useSettings'
import { getRecentFiles, clearRecentFiles, formatRelativeTime, RecentFileItem } from '../utils/recentFiles'

interface WelcomeScreenProps {
    compilerInfo: string | null
    javaRuntimeInfo: string | null
    language?: SupportedLanguage
    cppStandard?: CppStandard
    cStandard?: CStandard
    onNewFile: () => void
    onOpenFile: () => void
    onOpenFolder: () => void
    onStartCoding: () => void
    onOpenRecentFolder?: (path: string) => void
    onOpenFileByPath?: (path: string) => void
    onOpenShortcutsModal?: () => void
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
    compilerInfo,
    javaRuntimeInfo,
    language = 'cpp',
    cppStandard = 'c++17',
    cStandard = 'c17',
    onNewFile,
    onOpenFile,
    onOpenFolder,
    onStartCoding,
    onOpenFileByPath,
    onOpenShortcutsModal,
}) => {
    const [recentFiles, setRecentFiles] = useState<RecentFileItem[]>([])
    const [copiedTarget, setCopiedTarget] = useState<'cpp' | 'java' | null>(null)

    // Load dynamic recent files
    const refreshRecentFiles = useCallback(() => {
        setRecentFiles(getRecentFiles())
    }, [])

    useEffect(() => {
        refreshRecentFiles()
    }, [refreshRecentFiles])

    const handleCopy = (text: string | null, target: 'cpp' | 'java') => {
        if (!text) return
        navigator.clipboard.writeText(text)
        setCopiedTarget(target)
        setTimeout(() => setCopiedTarget(null), 2000)
    }

    const handleClearRecentFiles = () => {
        clearRecentFiles()
        setRecentFiles([])
    }

    // Truncate path with middle ellipsis
    const truncatePath = (p: string | null, maxLen = 38) => {
        if (!p) return 'Not detected'
        if (p.length <= maxLen) return p
        const start = p.slice(0, 16)
        const end = p.slice(-18)
        return `${start}...${end}`
    }

    return (
        <div className="flex-1 w-full h-full overflow-y-auto bg-carbon-bg p-6 lg:p-8 select-none">
            <div className="max-w-[1440px] mx-auto flex flex-col xl:flex-row gap-6 items-start">
                {/* Left Column: Main Dashboard Content (~70%) */}
                <div className="flex-1 flex flex-col gap-6 w-full min-w-0">
                    {/* Welcome Hero Card */}
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-carbon-surface via-carbon-surface to-carbon-elevated border border-carbon-border p-6 md:p-8 shadow-card">
                        {/* Decorative background SVG wave graphic */}
                        <svg
                            className="absolute -right-8 -top-8 w-96 h-96 opacity-15 pointer-events-none text-carbon-accent"
                            viewBox="0 0 400 400"
                            fill="none"
                        >
                            <path
                                d="M50 350C150 350 180 150 350 150C450 150 380 320 450 350"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                            />
                            <path
                                d="M20 300C120 300 160 80 320 80C420 80 360 280 430 310"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                            />
                            <circle cx="350" cy="150" r="4" fill="currentColor" />
                            <circle cx="320" cy="80" r="3" fill="currentColor" />
                        </svg>

                        {/* Hero Header */}
                        <div className="relative z-10 flex flex-col items-start gap-4">
                            {/* Logo */}
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-carbon-accent to-carbon-accent-secondary flex items-center justify-center shadow-glow">
                                <span className="text-white font-mono font-bold text-lg">&lt;/&gt;</span>
                            </div>

                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold text-carbon-text-primary tracking-tight">
                                    Welcome to <span className="bg-gradient-to-r from-carbon-accent-highlight to-carbon-accent bg-clip-text text-transparent">CarbonCode</span>
                                </h1>
                                <p className="text-carbon-text-secondary text-sm md:text-base mt-1">
                                    A lightweight IDE for C, C++, and Java
                                </p>
                            </div>

                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-carbon-surface/80 border border-carbon-border text-xs text-carbon-text-muted">
                                <span>Crafted by</span>
                                <span className="text-carbon-accent font-medium">Rabail Ali Bhatti</span>
                            </div>
                        </div>

                        {/* Environment Cards inside Hero */}
                        <div className="relative z-10 mt-6 grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            {/* C++ Environment Card */}
                            <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-carbon-bg/80 border border-carbon-border/70 hover:border-carbon-border transition-all">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-7 h-7 rounded-lg bg-carbon-surface border border-carbon-border flex items-center justify-center text-xs font-bold text-blue-400 shrink-0">
                                        C++
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-[11px] text-carbon-text-muted">Compiler Path</div>
                                        <div className="text-xs font-mono text-carbon-text-primary truncate" title={compilerInfo || 'Not detected'}>
                                            {truncatePath(compilerInfo)}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleCopy(compilerInfo, 'cpp')}
                                    disabled={!compilerInfo}
                                    className="p-1.5 rounded-md text-carbon-text-muted hover:text-carbon-text-primary hover:bg-carbon-surface transition-all shrink-0"
                                    title={copiedTarget === 'cpp' ? 'Copied!' : 'Copy compiler path'}
                                >
                                    {copiedTarget === 'cpp' ? (
                                        <svg className="w-4 h-4 text-carbon-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                    )}
                                </button>
                            </div>

                            {/* Java Environment Card */}
                            <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-carbon-bg/80 border border-carbon-border/70 hover:border-carbon-border transition-all">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-7 h-7 rounded-lg bg-carbon-surface border border-carbon-border flex items-center justify-center text-xs font-bold text-orange-400 shrink-0">
                                        Java
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-[11px] text-carbon-text-muted">JDK / javac Version</div>
                                        <div className="text-xs font-mono text-carbon-text-primary truncate" title={javaRuntimeInfo || 'Not detected'}>
                                            {javaRuntimeInfo ? truncatePath(javaRuntimeInfo) : 'JDK not detected'}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleCopy(javaRuntimeInfo, 'java')}
                                    disabled={!javaRuntimeInfo}
                                    className="p-1.5 rounded-md text-carbon-text-muted hover:text-carbon-text-primary hover:bg-carbon-surface transition-all shrink-0"
                                    title={copiedTarget === 'java' ? 'Copied!' : 'Copy Java version'}
                                >
                                    {copiedTarget === 'java' ? (
                                        <svg className="w-4 h-4 text-carbon-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Primary Dashboard Actions */}
                    <div className="flex flex-wrap items-center gap-3">
                        {/* New File */}
                        <button
                            onClick={onNewFile}
                            className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl bg-carbon-accent hover:bg-carbon-accent-highlight text-white font-semibold text-sm transition-all shadow-glow hover:shadow-lg active:scale-95"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span>New File</span>
                        </button>

                        {/* Open File */}
                        <button
                            onClick={onOpenFile}
                            className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-carbon-surface border border-carbon-border hover:border-carbon-accent/60 text-carbon-text-primary text-sm font-medium transition-all hover:bg-carbon-elevated active:scale-95"
                        >
                            <svg className="w-4 h-4 text-carbon-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                            </svg>
                            <span>Open File</span>
                        </button>

                        {/* Open Folder */}
                        <button
                            onClick={onOpenFolder}
                            className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-carbon-surface border border-carbon-border hover:border-carbon-accent/60 text-carbon-text-primary text-sm font-medium transition-all hover:bg-carbon-elevated active:scale-95"
                        >
                            <svg className="w-4 h-4 text-carbon-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                            <span>Open Folder</span>
                        </button>

                        <div className="w-px h-6 bg-carbon-border hidden sm:block mx-1" />

                        {/* Start Coding */}
                        <button
                            onClick={onStartCoding}
                            className="flex items-center gap-2 px-3 py-2 text-carbon-text-secondary hover:text-carbon-text-primary text-sm transition-all group"
                        >
                            <svg className="w-4 h-4 text-carbon-accent group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                            </svg>
                            <span>Start Coding</span>
                        </button>
                    </div>

                    {/* Keyboard Shortcuts Card */}
                    <div className="rounded-2xl bg-carbon-surface border border-carbon-border p-6 shadow-card">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-carbon-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                <h3 className="text-sm font-semibold text-carbon-text-primary">Keyboard Shortcuts</h3>
                            </div>
                            {onOpenShortcutsModal && (
                                <button
                                    onClick={onOpenShortcutsModal}
                                    className="text-xs text-carbon-accent hover:text-carbon-accent-highlight font-medium transition-colors"
                                >
                                    View All
                                </button>
                            )}
                        </div>

                        {/* 3x2 Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            <div className="flex items-center justify-between p-2.5 rounded-xl bg-carbon-bg border border-carbon-border/60">
                                <span className="text-xs text-carbon-text-secondary">New File</span>
                                <span className="px-2 py-0.5 rounded-md bg-carbon-elevated border border-carbon-border text-[11px] font-mono text-carbon-text-primary font-medium">Ctrl+N</span>
                            </div>
                            <div className="flex items-center justify-between p-2.5 rounded-xl bg-carbon-bg border border-carbon-border/60">
                                <span className="text-xs text-carbon-text-secondary">Open File</span>
                                <span className="px-2 py-0.5 rounded-md bg-carbon-elevated border border-carbon-border text-[11px] font-mono text-carbon-text-primary font-medium">Ctrl+O</span>
                            </div>
                            <div className="flex items-center justify-between p-2.5 rounded-xl bg-carbon-bg border border-carbon-border/60">
                                <span className="text-xs text-carbon-text-secondary">Save</span>
                                <span className="px-2 py-0.5 rounded-md bg-carbon-elevated border border-carbon-border text-[11px] font-mono text-carbon-text-primary font-medium">Ctrl+S</span>
                            </div>
                            <div className="flex items-center justify-between p-2.5 rounded-xl bg-carbon-bg border border-carbon-border/60">
                                <span className="text-xs text-carbon-text-secondary">Save As</span>
                                <span className="px-2 py-0.5 rounded-md bg-carbon-elevated border border-carbon-border text-[11px] font-mono text-carbon-text-primary font-medium">Ctrl+Shift+S</span>
                            </div>
                            <div className="flex items-center justify-between p-2.5 rounded-xl bg-carbon-bg border border-carbon-border/60">
                                <span className="text-xs text-carbon-text-secondary">Run</span>
                                <span className="px-2 py-0.5 rounded-md bg-carbon-elevated border border-carbon-border text-[11px] font-mono text-carbon-accent font-medium">F5 / F6</span>
                            </div>
                            <div className="flex items-center justify-between p-2.5 rounded-xl bg-carbon-bg border border-carbon-border/60">
                                <span className="text-xs text-carbon-text-secondary">Close Tab</span>
                                <span className="px-2 py-0.5 rounded-md bg-carbon-elevated border border-carbon-border text-[11px] font-mono text-carbon-text-primary font-medium">Ctrl+Q</span>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Motivational Quote */}
                    <div className="text-center py-2">
                        <p className="text-xs text-carbon-text-muted italic">
                            — Build, test, and learn in C, C++, or Java with CarbonCode. —
                        </p>
                    </div>
                </div>

                {/* Right Column: Context Information Sidebar (~340px) */}
                <div className="w-full xl:w-80 flex flex-col gap-5 shrink-0">
                    {/* Quick Info Card */}
                    <div className="rounded-2xl bg-carbon-surface border border-carbon-border p-5 shadow-card">
                        <h3 className="text-xs font-semibold text-carbon-text-primary tracking-wider uppercase mb-3">Quick Info</h3>
                        <div className="flex flex-col divide-y divide-carbon-border-subtle">
                            {/* Language */}
                            <div className="flex items-center justify-between py-2.5">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-full bg-carbon-elevated border border-carbon-border flex items-center justify-center text-xs font-mono text-carbon-accent">
                                        &lt;/&gt;
                                    </div>
                                    <span className="text-xs text-carbon-text-secondary">Language</span>
                                </div>
                                <span className="text-xs font-semibold text-carbon-text-primary">
                                    {getLanguageLabel(language)}
                                </span>
                            </div>

                            {/* Standard */}
                            <div className="flex items-center justify-between py-2.5">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-full bg-carbon-elevated border border-carbon-border flex items-center justify-center text-xs font-mono text-carbon-accent">
                                        ≡
                                    </div>
                                    <span className="text-xs text-carbon-text-secondary">Standard</span>
                                </div>
                                <span className="text-xs font-mono text-carbon-text-primary">
                                    {language === 'cpp' ? cppStandard.toUpperCase() : language === 'c' ? cStandard.toUpperCase() : 'Standard'}
                                </span>
                            </div>

                            {/* Compiler */}
                            <div className="flex items-center justify-between py-2.5">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-7 h-7 rounded-full bg-carbon-elevated border border-carbon-border flex items-center justify-center text-xs font-mono text-carbon-accent shrink-0">
                                        ⚙
                                    </div>
                                    <span className="text-xs text-carbon-text-secondary shrink-0">Compiler</span>
                                </div>
                                <span className="text-xs font-mono text-carbon-text-primary truncate ml-2" title={compilerInfo || 'Not detected'}>
                                    {compilerInfo ? compilerInfo.split(/[/\\]/).pop() : 'Not detected'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Recent Files Card */}
                    <div className="rounded-2xl bg-carbon-surface border border-carbon-border p-5 shadow-card">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <svg className="w-3.5 h-3.5 text-carbon-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <h3 className="text-xs font-semibold text-carbon-text-primary tracking-wider uppercase">Recent Files</h3>
                            </div>
                            {recentFiles.length > 0 && (
                                <button
                                    onClick={handleClearRecentFiles}
                                    className="text-[11px] text-carbon-text-muted hover:text-carbon-error transition-colors"
                                >
                                    Clear
                                </button>
                            )}
                        </div>

                        {recentFiles.length > 0 ? (
                            <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1">
                                {recentFiles.map((file) => (
                                    <button
                                        key={file.path}
                                        onClick={() => onOpenFileByPath?.(file.path)}
                                        className="flex items-center justify-between p-2 rounded-lg bg-carbon-bg/60 border border-carbon-border-subtle hover:border-carbon-accent/50 hover:bg-carbon-elevated transition-all text-left group"
                                        title={file.path}
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0">
                                                {file.language === 'java' ? (
                                                    <span className="text-orange-400">J</span>
                                                ) : file.language === 'c' ? (
                                                    <span className="text-cyan-400">C</span>
                                                ) : (
                                                    <span className="text-blue-400">C++</span>
                                                )}
                                            </div>
                                            <span className="text-xs text-carbon-text-primary group-hover:text-carbon-accent truncate">
                                                {file.name}
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-carbon-text-muted shrink-0 ml-2">
                                            {formatRelativeTime(file.lastOpened)}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="py-6 text-center text-carbon-text-muted text-xs">
                                <p>No recent files</p>
                                <p className="text-[11px] mt-1 text-carbon-text-muted/60">Opened files will appear here</p>
                            </div>
                        )}
                    </div>

                    {/* Code Faster Motivational Card */}
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-carbon-surface to-carbon-elevated border border-carbon-border p-5 shadow-card">
                        <svg
                            className="absolute -right-4 -bottom-4 w-32 h-32 opacity-20 pointer-events-none text-carbon-accent"
                            viewBox="0 0 200 200"
                            fill="none"
                        >
                            <path d="M10 180C70 180 100 80 180 80" stroke="currentColor" strokeWidth="3" />
                            <path d="M0 150C60 150 80 50 160 50" stroke="currentColor" strokeWidth="2" />
                        </svg>

                        <div className="relative z-10 flex items-start gap-3">
                            <div className="w-8 h-8 rounded-xl bg-carbon-accent/20 border border-carbon-accent/40 flex items-center justify-center text-carbon-accent shrink-0">
                                ⚡
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-carbon-text-primary tracking-wide">Code Faster</h4>
                                <p className="text-xs text-carbon-text-secondary mt-0.5">Keep building. Keep learning.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default WelcomeScreen
