type CppStandard = 'c++11' | 'c++14' | 'c++17' | 'c++20' | 'c++23'

interface ToolbarProps {
    cppStandard: CppStandard
    onCppStandardChange: (std: CppStandard) => void
    onRun: () => void
    onNewFile: () => void
    onOpenFile: () => void
    onSave: () => void
    onCopy: () => void
    onPaste: () => void
    isCompiling: boolean
    hasCompiler: boolean
}

const standardDescriptions: Record<CppStandard, string> = {
    'c++11': 'C++11 - Modern C++ foundation',
    'c++14': 'C++14 - Bug fixes & improvements',
    'c++17': 'C++17 - Structured bindings, if constexpr',
    'c++20': 'C++20 - Concepts, ranges, coroutines',
    'c++23': 'C++23 - Latest features'
}

function Toolbar({
    cppStandard,
    onCppStandardChange,
    onRun,
    onNewFile,
    onOpenFile,
    onSave,
    onCopy,
    onPaste,
    isCompiling,
    hasCompiler
}: ToolbarProps) {
    return (
        <div className="flex items-center justify-between bg-editor-sidebar border-b border-editor-border px-4 py-2 shrink-0">
            {/* Left side - File actions */}
            <div className="flex items-center gap-1">
                {/* New File */}
                <button
                    onClick={onNewFile}
                    className="flex items-center gap-2 px-3 py-1.5 text-text-secondary hover:text-text-bright hover:bg-editor-border/50 rounded-md transition-all"
                    title="New File (Ctrl+N)"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-sm hidden md:inline">New</span>
                </button>

                {/* Open File */}
                <button
                    onClick={onOpenFile}
                    className="flex items-center gap-2 px-3 py-1.5 text-text-secondary hover:text-text-bright hover:bg-editor-border/50 rounded-md transition-all"
                    title="Open File (Ctrl+O)"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-sm hidden md:inline">Open</span>
                </button>

                {/* Save */}
                <button
                    onClick={onSave}
                    className="flex items-center gap-2 px-3 py-1.5 text-text-secondary hover:text-text-bright hover:bg-editor-border/50 rounded-md transition-all"
                    title="Save (Ctrl+S)"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                    </svg>
                    <span className="text-sm hidden md:inline">Save</span>
                </button>

                {/* Copy */}
                <button
                    onClick={onCopy}
                    className="flex items-center gap-2 px-3 py-1.5 text-text-secondary hover:text-text-bright hover:bg-editor-border/50 rounded-md transition-all"
                    title="Copy (Ctrl+C)"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                    </svg>
                    <span className="text-sm hidden md:inline">Copy</span>
                </button>

                {/* Paste */}
                <button
                    onClick={onPaste}
                    className="flex items-center gap-2 px-3 py-1.5 text-text-secondary hover:text-text-bright hover:bg-editor-border/50 rounded-md transition-all"
                    title="Paste (Ctrl+V)"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    <span className="text-sm hidden md:inline">Paste</span>
                </button>

                {/* Divider */}
                <div className="w-px h-6 bg-editor-border mx-2" />
            </div>

            {/* Center - C++ Standard selector */}
            <div className="flex items-center gap-3">
                <label className="text-text-secondary text-sm hidden sm:inline">Standard:</label>
                <div className="relative group">
                    <select
                        value={cppStandard}
                        onChange={(e) => onCppStandardChange(e.target.value as CppStandard)}
                        className="appearance-none bg-editor-bg border border-editor-border rounded-md px-3 py-1.5 pr-8 text-text-primary text-sm font-mono cursor-pointer hover:border-accent focus:border-accent focus:ring-1 focus:ring-accent transition-all outline-none"
                    >
                        <option value="c++11">C++11</option>
                        <option value="c++14">C++14</option>
                        <option value="c++17">C++17</option>
                        <option value="c++20">C++20</option>
                        <option value="c++23">C++23</option>
                    </select>
                    {/* Tooltip */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 bg-editor-bg border border-editor-border rounded-md shadow-lg text-xs text-text-secondary whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        {standardDescriptions[cppStandard]}
                    </div>
                </div>
            </div>

            {/* Right side - Run button */}
            <div className="flex items-center gap-2">
                <button
                    onClick={onRun}
                    disabled={isCompiling || !hasCompiler}
                    className={`
            flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all
            ${isCompiling
                            ? 'bg-warning/20 text-warning cursor-wait'
                            : hasCompiler
                                ? 'bg-success/20 text-success hover:bg-success/30 shadow-glow-success hover:shadow-glow-success active:scale-95'
                                : 'bg-editor-border text-text-secondary cursor-not-allowed'
                        }
          `}
                    title={!hasCompiler ? 'No compiler detected' : 'Compile & Run (F5)'}
                >
                    {isCompiling ? (
                        <>
                            <div className="w-4 h-4 border-2 border-warning border-t-transparent rounded-full animate-spin" />
                            <span>Compiling...</span>
                        </>
                    ) : (
                        <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Run</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    )
}

export default Toolbar
