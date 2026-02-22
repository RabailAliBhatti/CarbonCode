import { Settings, CppStandard } from '../hooks/useSettings'

interface SettingsModalProps {
    isVisible: boolean
    onClose: () => void
    settings: Settings
    onUpdateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void
}

function SettingsModal({ isVisible, onClose, settings, onUpdateSetting }: SettingsModalProps) {
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
                    </section>

                    <div className="h-px bg-editor-border" />

                    {/* Compiler Settings */}
                    <section className="space-y-4">
                        <h3 className="text-sm font-semibold text-accent uppercase tracking-wider">Compiler</h3>

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

                        <div className="space-y-1">
                            <label className="text-sm text-text-primary">Custom Compiler Path (Optional)</label>
                            <input
                                type="text"
                                value={settings.compilerPath}
                                placeholder="Auto-detected if empty"
                                onChange={(e) => onUpdateSetting('compilerPath', e.target.value)}
                                className="w-full bg-editor-sidebar border border-editor-border rounded px-3 py-1.5 text-sm text-text-bright focus:border-accent outline-none focus:ring-1 focus:ring-accent transition-all"
                            />
                            <p className="text-xs text-text-secondary">Leave empty to use bundled MinGW or system compiler.</p>
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
            </div>
        </div>
    )
}

export default SettingsModal
