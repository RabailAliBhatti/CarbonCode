interface WelcomeScreenProps {
    compilerInfo: string | null
    onNewFile: () => void
    onOpenFile: () => void
    onStartCoding: () => void
}

function WelcomeScreen({
    compilerInfo,
    onNewFile,
    onOpenFile,
    onStartCoding
}: WelcomeScreenProps) {
    return (
        <div className="h-full flex items-center justify-center bg-gradient-to-br from-editor-bg via-editor-sidebar to-editor-bg">
            <div className="max-w-2xl mx-auto px-8 text-center animate-fade-in">
                {/* Logo */}
                <div className="mb-8">
                    <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-accent to-blue-600 shadow-glow mb-6">
                        <span className="text-white font-bold text-3xl">C++</span>
                    </div>
                    <h1 className="text-4xl font-bold text-text-bright mb-2">
                        Welcome to CarbonCode
                    </h1>
                    <p className="text-text-secondary text-lg mb-2">
                        A lightweight, offline C++ IDE
                    </p>
                    <p className="text-text-secondary/60 text-sm">
                        Crafted by <span className="text-accent font-medium">Rabail Ali Bhatti</span>
                    </p>
                </div>

                {/* Compiler Status */}
                <div className={`
          inline-flex items-center gap-3 px-6 py-3 rounded-xl mb-8
          ${compilerInfo
                        ? 'bg-success/10 border border-success/30'
                        : 'bg-error/10 border border-error/30'
                    }
        `}>
                    {compilerInfo ? (
                        <>
                            <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-success font-medium">Compiler Detected:</span>
                            <span className="text-success/70 font-mono">{compilerInfo}</span>
                        </>
                    ) : (
                        <>
                            <svg className="w-6 h-6 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <div className="text-left">
                                <p className="text-error font-medium">No Compiler Found</p>
                                <p className="text-error/70 text-sm">Install g++, clang++, or MSVC to compile code</p>
                            </div>
                        </>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
                    <button
                        onClick={onNewFile}
                        className="flex items-center gap-3 px-6 py-3 bg-accent hover:bg-accent-hover text-white rounded-xl font-medium transition-all shadow-glow hover:shadow-lg active:scale-95 w-full sm:w-auto"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        New File
                    </button>

                    <button
                        onClick={onOpenFile}
                        className="flex items-center gap-3 px-6 py-3 bg-editor-sidebar hover:bg-editor-border text-text-bright border border-editor-border rounded-xl font-medium transition-all hover:shadow-lg active:scale-95 w-full sm:w-auto"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                        </svg>
                        Open File
                    </button>

                    <button
                        onClick={onStartCoding}
                        className="flex items-center gap-3 px-6 py-3 text-text-secondary hover:text-text-bright transition-all w-full sm:w-auto justify-center"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                        Start Coding
                    </button>
                </div>

                {/* Keyboard Shortcuts */}
                <div className="bg-editor-sidebar/50 rounded-xl p-6 border border-editor-border">
                    <h3 className="text-text-bright font-medium mb-4">Keyboard Shortcuts</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-editor-bg rounded-lg">
                            <span className="text-text-secondary">New File</span>
                            <kbd className="px-2 py-1 bg-editor-border rounded text-text-primary text-xs font-mono">Ctrl+N</kbd>
                        </div>
                        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-editor-bg rounded-lg">
                            <span className="text-text-secondary">Open File</span>
                            <kbd className="px-2 py-1 bg-editor-border rounded text-text-primary text-xs font-mono">Ctrl+O</kbd>
                        </div>
                        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-editor-bg rounded-lg">
                            <span className="text-text-secondary">Save</span>
                            <kbd className="px-2 py-1 bg-editor-border rounded text-text-primary text-xs font-mono">Ctrl+S</kbd>
                        </div>
                        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-editor-bg rounded-lg">
                            <span className="text-text-secondary">Save As</span>
                            <kbd className="px-2 py-1 bg-editor-border rounded text-text-primary text-xs font-mono">Ctrl+Shift+S</kbd>
                        </div>
                        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-editor-bg rounded-lg">
                            <span className="text-text-secondary">Run</span>
                            <kbd className="px-2 py-1 bg-editor-border rounded text-text-primary text-xs font-mono">F5</kbd>
                        </div>
                        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-editor-bg rounded-lg">
                            <span className="text-text-secondary">Quit</span>
                            <kbd className="px-2 py-1 bg-editor-border rounded text-text-primary text-xs font-mono">Ctrl+Q</kbd>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-xs text-text-secondary/50">
                    <span className="px-2 py-1 bg-editor-border/30 rounded">Electron</span>
                    <span className="text-editor-border">•</span>
                    <span className="px-2 py-1 bg-editor-border/30 rounded">React</span>
                    <span className="text-editor-border">•</span>
                    <span className="px-2 py-1 bg-editor-border/30 rounded">Monaco Editor</span>
                    <span className="text-editor-border">•</span>
                    <span className="px-2 py-1 bg-editor-border/30 rounded">TypeScript</span>
                </div>
            </div>
        </div>
    )
}

export default WelcomeScreen
