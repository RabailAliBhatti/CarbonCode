import { MouseEvent } from 'react'

export interface FileTab {
    id: string
    fileName: string
    filePath: string | null
    content: string
    isDirty: boolean
    language: string
}

interface TabBarProps {
    tabs: FileTab[]
    activeTabId: string
    onTabClick: (tabId: string) => void
    onTabClose: (tabId: string, e: MouseEvent) => void
    onNewTab: () => void
}

function TabBar({ tabs, activeTabId, onTabClick, onTabClose, onNewTab }: TabBarProps) {
    return (
        <div className="flex items-center bg-editor-sidebar border-b border-editor-border overflow-x-auto">
            {/* Tabs */}
            <div className="flex-1 flex items-center min-w-0 overflow-x-auto scrollbar-thin">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => onTabClick(tab.id)}
                        className={`
              group flex items-center gap-2 px-4 py-2 text-sm font-medium border-r border-editor-border
              transition-colors min-w-0 shrink-0
              ${activeTabId === tab.id
                                ? 'bg-editor-bg text-text-bright border-t-2 border-t-accent'
                                : 'text-text-secondary hover:text-text-primary hover:bg-editor-bg/50'
                            }
            `}
                    >
                        {/* File Icon */}
                        <svg className="w-4 h-4 shrink-0 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                        </svg>

                        {/* File Name */}
                        <span className="truncate max-w-[120px]">
                            {tab.fileName}
                        </span>

                        {/* Dirty Indicator */}
                        {tab.isDirty && (
                            <span className="w-2 h-2 rounded-full bg-warning shrink-0" title="Unsaved changes" />
                        )}

                        {/* Close Button */}
                        <button
                            onClick={(e) => onTabClose(tab.id, e)}
                            className={`
                p-0.5 rounded hover:bg-editor-border transition-colors shrink-0
                ${activeTabId === tab.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
              `}
                            title="Close"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </button>
                ))}
            </div>

            {/* New Tab Button */}
            <button
                onClick={onNewTab}
                className="p-2 text-text-secondary hover:text-text-primary hover:bg-editor-bg/50 transition-colors shrink-0"
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
