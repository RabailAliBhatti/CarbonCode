import React, { MouseEvent } from 'react'
import { SupportedLanguage } from '../types/language'

export interface FileTab {
    id: string
    fileName: string
    filePath: string | null
    content: string
    isDirty: boolean
    language: SupportedLanguage
}

interface TabBarProps {
    tabs: FileTab[]
    activeTabId: string | null
    onTabClick: (tabId: string) => void
    onTabClose: (tabId: string, e: MouseEvent) => void
    onNewTab: () => void
    onContextMenu: (tabId: string, x: number, y: number) => void
}

export const TabBar: React.FC<TabBarProps> = ({
    tabs,
    activeTabId,
    onTabClick,
    onTabClose,
    onNewTab,
    onContextMenu
}) => {
    return (
        <div className="h-10 flex items-center bg-carbon-surface border-b border-carbon-border px-2 gap-1 overflow-x-auto select-none">
            {/* Tabs List */}
            <div className="flex-1 flex items-center gap-1 min-w-0 overflow-x-auto scrollbar-thin">
                {tabs.map((tab) => {
                    const isActive = activeTabId === tab.id
                    return (
                        <div
                            key={tab.id}
                            onClick={() => onTabClick(tab.id)}
                            onContextMenu={(e) => {
                                e.preventDefault()
                                onContextMenu(tab.id, e.clientX, e.clientY)
                            }}
                            onMouseDown={(e) => {
                                // Middle-click closes tab
                                if (e.button === 1) {
                                    e.preventDefault()
                                    onTabClose(tab.id, e)
                                }
                            }}
                            className={`
                                group flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all border shrink-0
                                ${isActive
                                    ? 'bg-carbon-elevated border-carbon-border text-carbon-text-primary shadow-sm'
                                    : 'bg-transparent border-transparent text-carbon-text-secondary hover:text-carbon-text-primary hover:bg-carbon-elevated/50'
                                }
                            `}
                        >
                            {/* Language Badge */}
                            {tab.language === 'java' ? (
                                <span className="w-4 h-4 rounded-full bg-orange-500/20 border border-orange-500/40 text-[10px] font-bold text-orange-400 flex items-center justify-center shrink-0">J</span>
                            ) : tab.language === 'c' ? (
                                <span className="w-4 h-4 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-[10px] font-bold text-cyan-400 flex items-center justify-center shrink-0">C</span>
                            ) : (
                                <span className="w-4 h-4 rounded-full bg-blue-500/20 border border-blue-500/40 text-[9px] font-bold text-blue-400 flex items-center justify-center shrink-0">C+</span>
                            )}

                            {/* File Name */}
                            <span className="truncate max-w-[130px] font-mono">
                                {tab.fileName}
                            </span>

                            {/* Unsaved Changes Indicator */}
                            {tab.isDirty && (
                                <span className="w-1.5 h-1.5 rounded-full bg-carbon-warning shrink-0" title="Unsaved changes" />
                            )}

                            {/* Close Tab Button */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onTabClose(tab.id, e)
                                }}
                                className="p-0.5 rounded hover:bg-carbon-border text-carbon-text-muted hover:text-carbon-text-primary transition-colors shrink-0 opacity-70 group-hover:opacity-100"
                                title="Close Tab"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    )
                })}
            </div>

            {/* Add New Tab Button */}
            <button
                onClick={onNewTab}
                className="p-1.5 rounded-md text-carbon-text-secondary hover:text-carbon-text-primary hover:bg-carbon-elevated transition-all shrink-0"
                title="New Tab (Ctrl+N)"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
            </button>
        </div>
    )
}

export default TabBar
