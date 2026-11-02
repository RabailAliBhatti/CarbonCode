import React, { useState, useMemo } from 'react'

interface KeyboardShortcutsModalProps {
    isOpen: boolean
    onClose: () => void
    initialTab?: 'shortcuts' | 'glossary'
}

interface ShortcutItem {
    description: string
    keys: string[]
    tag?: string
}

interface ShortcutGroup {
    category: string
    shortcuts: ShortcutItem[]
}

interface GlossaryItem {
    term: string
    badge: 'Concept' | 'C/C++' | 'Runtime' | 'Workflow'
    badgeColor: string
    summary: string
    explanation: string
    tip?: string
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
    {
        category: 'Execution & Debugging',
        shortcuts: [
            { description: 'Compile & Run Code', keys: ['F5'], tag: 'Primary' },
            { description: 'Stop Running Process', keys: ['Shift', 'F5'], tag: 'Stop' },
            { description: 'Start GDB Debugger', keys: ['Ctrl', 'F5'] },
            { description: 'Toggle Breakpoint', keys: ['F9'] },
            { description: 'Step Over (Next Line)', keys: ['F10'] },
            { description: 'Step Into (Inside Function)', keys: ['F11'] },
            { description: 'Step Out (Return from Function)', keys: ['Shift', 'F11'] },
            { description: 'Continue Execution', keys: ['F8'] }
        ]
    },
    {
        category: 'File Operations',
        shortcuts: [
            { description: 'New File', keys: ['Ctrl', 'N'] },
            { description: 'New Project (Wizard)', keys: ['Ctrl', 'Shift', 'N'] },
            { description: 'Open File', keys: ['Ctrl', 'O'] },
            { description: 'Save Current File', keys: ['Ctrl', 'S'] },
            { description: 'Save As...', keys: ['Ctrl', 'Shift', 'S'] },
            { description: 'Close Current Tab', keys: ['Ctrl', 'W'] }
        ]
    },
    {
        category: 'Editor & Navigation',
        shortcuts: [
            { description: 'Find & Replace', keys: ['Ctrl', 'F'] },
            { description: 'Search Across Files', keys: ['Ctrl', 'Shift', 'F'] },
            { description: 'Format Source Code', keys: ['Shift', 'Alt', 'F'] },
            { description: 'Go to Definition', keys: ['F12'] },
            { description: 'Peek References', keys: ['Shift', 'F12'] },
            { description: 'Toggle File Explorer', keys: ['Ctrl', 'B'] },
            { description: 'Open Settings', keys: ['Ctrl', ','] },
            { description: 'Open Help & Cheatsheet', keys: ['F1'] }
        ]
    }
]

const COMPILER_GLOSSARY: GlossaryItem[] = [
    {
        term: 'Compiler vs. Interpreter',
        badge: 'Concept',
        badgeColor: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
        summary: 'How your written code gets converted into machine-executable instructions.',
        explanation: 'A compiler (like GCC for C/C++ or javac for Java) reads your entire source code at once and builds an independent binary (.exe). If there is any syntax error, compilation halts immediately. An interpreter (like Python) runs your code line-by-line as it goes.',
        tip: 'If your code fails to compile, no .exe is created. Fix compiler errors before running!'
    },
    {
        term: 'Compile Error vs. Runtime Error',
        badge: 'Runtime',
        badgeColor: 'bg-red-500/15 text-red-400 border-red-500/30',
        summary: 'The difference between grammar mistakes and execution crashes.',
        explanation: 'Compile errors (e.g. missing semicolons, unknown variables, type mismatches) are caught before running. Runtime errors happen while the program is actively executing (e.g. dividing by zero, accessing an invalid array index, or running out of memory).',
        tip: 'In C++, runtime memory errors often appear as "Segmentation fault" or exit code 3221225477 (0xC0000005).'
    },
    {
        term: 'Header Files & #include',
        badge: 'C/C++',
        badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        summary: 'Tells the compiler where to find built-in library functions.',
        explanation: 'In C and C++, functions are declared in header files. Writing #include <iostream> allows you to use cout and cin. Writing #include <stdio.h> in C provides printf and scanf.',
        tip: 'If you see "cout was not declared in this scope", you likely forgot #include <iostream> or using namespace std;.'
    },
    {
        term: 'Return 0 & Exit Codes',
        badge: 'Concept',
        badgeColor: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
        summary: 'How programs report their success or failure to Windows.',
        explanation: 'The main() function returns an integer status code. By universal convention, returning 0 signals "Success! The program finished without errors." Any non-zero exit code (like 1 or -1) indicates a problem occurred.',
        tip: 'CarbonCode displays: "Process exited after 0.042 seconds with return value 0" to confirm clean completion.'
    },
    {
        term: 'Integrated Panel vs. CMD Screen',
        badge: 'Workflow',
        badgeColor: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
        summary: 'Choosing between embedded IDE output and an authentic Dev-C++ popup window.',
        explanation: 'The Integrated Panel shows output directly inside CarbonCode. The CMD Screen opens a real native Windows Command Prompt with interactive standard input (cin >> x) and an automatic pause on exit, exactly matching Dev-C++ classroom labs.',
        tip: 'For university assignments that ask for keyboard input (cin/scanf), use the CMD Screen mode!'
    },
    {
        term: 'Linker & "Undefined Reference"',
        badge: 'C/C++',
        badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        summary: 'The final build step that glues functions together into a runnable .exe.',
        explanation: 'After compiling each line into object code, the Linker connects everything together. An error like "undefined reference to WinMain" or "undefined reference to main" means you forgot to write int main() { ... } or misspelled it as void main() or mian().',
        tip: 'Every C/C++ program must have exactly one int main() function as its entry point.'
    },
    {
        term: 'C++ Standards (C++11 to C++23)',
        badge: 'C/C++',
        badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        summary: 'The edition of the C++ language rules your compiler follows.',
        explanation: 'C++ evolves every 3 years. C++11 introduced auto and lambda functions; C++17 added structured bindings and <filesystem>; C++20 brought ranges and concepts. CarbonCode defaults to C++17 and automatically promotes your standard if you use newer features.',
        tip: 'You can change the standard anytime using the dropdown in the top toolbar.'
    }
]

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
    isOpen,
    onClose,
    initialTab = 'shortcuts'
}) => {
    const [activeTab, setActiveTab] = useState<'shortcuts' | 'glossary'>(initialTab)
    const [searchQuery, setSearchQuery] = useState('')

    // Filter shortcuts based on search
    const filteredShortcuts = useMemo(() => {
        if (!searchQuery.trim()) return SHORTCUT_GROUPS
        const q = searchQuery.toLowerCase()
        return SHORTCUT_GROUPS.map(group => ({
            ...group,
            shortcuts: group.shortcuts.filter(sc =>
                sc.description.toLowerCase().includes(q) ||
                sc.keys.some(k => k.toLowerCase().includes(q))
            )
        })).filter(group => group.shortcuts.length > 0)
    }, [searchQuery])

    // Filter glossary based on search
    const filteredGlossary = useMemo(() => {
        if (!searchQuery.trim()) return COMPILER_GLOSSARY
        const q = searchQuery.toLowerCase()
        return COMPILER_GLOSSARY.filter(item =>
            item.term.toLowerCase().includes(q) ||
            item.summary.toLowerCase().includes(q) ||
            item.explanation.toLowerCase().includes(q) ||
            (item.tip && item.tip.toLowerCase().includes(q))
        )
    }, [searchQuery])

    if (!isOpen) return null

    return (
        <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200 select-none"
            onClick={onClose}
        >
            <div
                className="bg-carbon-surface border border-carbon-border rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-carbon-border bg-carbon-elevated/70 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-carbon-accent to-carbon-accent-secondary flex items-center justify-center text-white shadow-glow">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                                    <span>Help & Learning Guide</span>
                                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-carbon-accent/20 border border-carbon-accent/40 text-carbon-accent">
                                        CarbonCode
                                    </span>
                                </h2>
                                <p className="text-[11px] text-carbon-text-muted mt-0.5">
                                    Essential shortcuts & friendly compiler terms for beginner programmers
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-carbon-text-muted hover:text-white hover:bg-carbon-elevated transition-colors"
                            title="Close (Esc)"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Navigation Tabs & Search Row */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
                        {/* Tab Switcher */}
                        <div className="flex items-center bg-carbon-bg border border-carbon-border rounded-lg p-0.5 text-xs">
                            <button
                                onClick={() => setActiveTab('shortcuts')}
                                className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                                    activeTab === 'shortcuts'
                                        ? 'bg-carbon-accent text-white shadow-xs'
                                        : 'text-carbon-text-muted hover:text-carbon-text-primary'
                                }`}
                            >
                                <span>⌨️</span>
                                <span>Keyboard Shortcuts</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('glossary')}
                                className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                                    activeTab === 'glossary'
                                        ? 'bg-carbon-accent text-white shadow-xs'
                                        : 'text-carbon-text-muted hover:text-carbon-text-primary'
                                }`}
                            >
                                <span>💡</span>
                                <span>Compiler Guide</span>
                            </button>
                        </div>

                        {/* Search Input */}
                        <div className="relative flex-1 sm:max-w-xs">
                            <svg className="w-3.5 h-3.5 text-carbon-text-muted absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={activeTab === 'shortcuts' ? "Filter shortcuts (e.g. run, save)..." : "Search terms (e.g. exit code, header)..."}
                                className="w-full bg-carbon-bg border border-carbon-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-carbon-text-primary placeholder:text-carbon-text-muted focus:border-carbon-accent outline-none transition-all"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-carbon-text-muted hover:text-white text-xs"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Content Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
                    {activeTab === 'shortcuts' ? (
                        filteredShortcuts.length > 0 ? (
                            <div className="space-y-5">
                                {filteredShortcuts.map((group) => (
                                    <div key={group.category} className="space-y-2">
                                        <h3 className="text-xs font-bold text-carbon-text-muted uppercase tracking-wider flex items-center gap-2">
                                            <span>{group.category}</span>
                                            <span className="h-px flex-1 bg-carbon-border/50" />
                                        </h3>
                                        <div className="rounded-xl border border-carbon-border bg-carbon-bg/60 divide-y divide-carbon-border/60 overflow-hidden">
                                            {group.shortcuts.map((sc) => (
                                                <div
                                                    key={sc.description}
                                                    className="flex items-center justify-between px-3.5 py-2.5 text-xs hover:bg-carbon-elevated/40 transition-colors"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-carbon-text-primary font-medium">{sc.description}</span>
                                                        {sc.tag && (
                                                            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-carbon-accent/15 text-carbon-accent border border-carbon-accent/30">
                                                                {sc.tag}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1 font-mono">
                                                        {sc.keys.map((k, idx) => (
                                                            <React.Fragment key={k}>
                                                                {idx > 0 && <span className="text-carbon-text-muted text-[10px]">+</span>}
                                                                <span className="px-2 py-0.5 rounded bg-carbon-elevated border border-carbon-border text-[11px] font-semibold text-carbon-text-primary shadow-xs">
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
                        ) : (
                            <div className="text-center py-10 text-carbon-text-muted text-xs">
                                No keyboard shortcuts matched "<span className="text-carbon-text-primary">{searchQuery}</span>".
                            </div>
                        )
                    ) : (
                        filteredGlossary.length > 0 ? (
                            <div className="grid grid-cols-1 gap-3.5">
                                {filteredGlossary.map((item) => (
                                    <div
                                        key={item.term}
                                        className="p-3.5 rounded-xl border border-carbon-border bg-carbon-bg/60 hover:border-carbon-accent/50 transition-all flex flex-col gap-2 group"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <h4 className="font-semibold text-white text-xs group-hover:text-carbon-accent transition-colors flex items-center gap-2">
                                                <span>{item.term}</span>
                                            </h4>
                                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${item.badgeColor}`}>
                                                {item.badge}
                                            </span>
                                        </div>
                                        <p className="text-[11px] font-medium text-carbon-text-secondary leading-snug">
                                            {item.summary}
                                        </p>
                                        <p className="text-[11px] text-carbon-text-muted leading-relaxed">
                                            {item.explanation}
                                        </p>
                                        {item.tip && (
                                            <div className="mt-1 p-2 rounded-lg bg-carbon-surface/80 border border-carbon-border/70 flex items-start gap-1.5 text-[11px]">
                                                <span className="text-carbon-accent text-xs mt-0.5">💡</span>
                                                <span className="text-carbon-text-secondary leading-snug">
                                                    <strong className="text-carbon-text-primary font-semibold">Tip: </strong>
                                                    {item.tip}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 text-carbon-text-muted text-xs">
                                No compiler concepts matched "<span className="text-carbon-text-primary">{searchQuery}</span>".
                            </div>
                        )
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-carbon-border bg-carbon-elevated/40 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-carbon-text-muted font-mono">
                        Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-carbon-bg border border-carbon-border text-[10px] text-carbon-text-primary font-semibold">F1</kbd> anytime to open this guide
                    </span>
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 rounded-lg bg-carbon-accent hover:bg-carbon-accent-highlight text-white text-xs font-semibold transition-all shadow-sm"
                    >
                        Got it
                    </button>
                </div>
            </div>
        </div>
    )
}

export const HelpModal = KeyboardShortcutsModal
export default KeyboardShortcutsModal
