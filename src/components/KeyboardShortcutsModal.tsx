import React from 'react'

interface KeyboardShortcutsModalProps {
    isOpen: boolean
    onClose: () => void
}

interface ShortcutItem {
    description: string
    keys: string[]
}

interface ShortcutGroup {
    category: string
    shortcuts: ShortcutItem[]
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
    {
        category: 'File Operations',
        shortcuts: [
            { description: 'New File', keys: ['Ctrl', 'N'] },
            { description: 'Open File', keys: ['Ctrl', 'O'] },
            { description: 'Save File', keys: ['Ctrl', 'S'] },
            { description: 'Save As', keys: ['Ctrl', 'Shift', 'S'] },
            { description: 'Close Current Tab', keys: ['Ctrl', 'Q'] },
        ]
    },
    {
        category: 'Execution & Debugging',
        shortcuts: [
            { description: 'Compile & Run', keys: ['F5'] },
            { description: 'Start Debugger', keys: ['Ctrl', 'F5'] },
            { description: 'Toggle Breakpoint', keys: ['F9'] },
            { description: 'Step Over', keys: ['F10'] },
            { description: 'Step Into', keys: ['F11'] },
            { description: 'Step Out', keys: ['Shift', 'F11'] },
            { description: 'Stop Execution', keys: ['Shift', 'F5'] },
        ]
    },
    {
        category: 'Navigation & Workspace',
        shortcuts: [
            { description: 'Go to Definition', keys: ['F12'] },
            { description: 'Peek References', keys: ['Shift', 'F12'] },
            { description: 'Format Document', keys: ['Shift', 'Alt', 'F'] },
            { description: 'Toggle File Explorer', keys: ['Ctrl', 'B'] },
            { description: 'Find / Replace', keys: ['Ctrl', 'F'] },
            { description: 'Search Across Files', keys: ['Ctrl', 'Shift', 'F'] },
            { description: 'Open Settings', keys: ['Ctrl', ','] },
        ]
    }
]

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in select-none">
            <div
                className="bg-carbon-surface border border-carbon-border rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="h-14 px-6 flex items-center justify-between border-b border-carbon-border bg-carbon-elevated/60">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-carbon-accent/20 border border-carbon-accent/40 flex items-center justify-center text-carbon-accent">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h2 className="text-base font-bold text-carbon-text-primary tracking-tight">Keyboard Shortcuts</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-carbon-text-muted hover:text-carbon-text-primary hover:bg-carbon-border transition-colors"
                        title="Close"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
                    {SHORTCUT_GROUPS.map((group) => (
                        <div key={group.category}>
                            <h3 className="text-xs font-bold text-carbon-text-muted uppercase tracking-wider mb-2.5">
                                {group.category}
                            </h3>
                            <div className="rounded-xl border border-carbon-border-subtle bg-carbon-bg/60 divide-y divide-carbon-border-subtle">
                                {group.shortcuts.map((sc) => (
                                    <div key={sc.description} className="flex items-center justify-between px-3.5 py-2.5 text-xs">
                                        <span className="text-carbon-text-primary font-medium">{sc.description}</span>
                                        <div className="flex items-center gap-1 font-mono">
                                            {sc.keys.map((k, idx) => (
                                                <React.Fragment key={k}>
                                                    {idx > 0 && <span className="text-carbon-text-muted text-[10px]">+</span>}
                                                    <span className="px-2 py-0.5 rounded bg-carbon-elevated border border-carbon-border text-[11px] font-medium text-carbon-text-primary shadow-sm">
                                                        {k}
                                                    </span>
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-carbon-border bg-carbon-elevated/40 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 rounded-lg bg-carbon-accent hover:bg-carbon-accent-highlight text-white text-xs font-semibold transition-all shadow-sm"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    )
}

export default KeyboardShortcutsModal
