import React, { useState, useEffect } from 'react'
import { PROJECT_TEMPLATES, ProjectTemplate } from '../templates/projectTemplates'

interface NewProjectModalProps {
    isOpen: boolean
    onClose: () => void
    onProjectCreated: (projectPath: string, primaryFile: string | null) => void
    initialTemplateId?: string | null
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
    isOpen,
    onClose,
    onProjectCreated,
    initialTemplateId
}) => {
    const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplate>(PROJECT_TEMPLATES[0])
    const [projectName, setProjectName] = useState<string>(PROJECT_TEMPLATES[0].defaultProjectName)
    const [destinationDir, setDestinationDir] = useState<string>('')
    const [isCreating, setIsCreating] = useState<boolean>(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    // Preselect the template chosen from a dashboard card
    useEffect(() => {
        if (!isOpen || !initialTemplateId) return
        const tpl = PROJECT_TEMPLATES.find(t => t.id === initialTemplateId)
        if (tpl) {
            setSelectedTemplate(tpl)
            setProjectName(tpl.defaultProjectName)
        }
    }, [isOpen, initialTemplateId])

    // Load initial default parent directory from recent folders or default Projects folder
    useEffect(() => {
        if (!isOpen) return

        setErrorMessage(null)
        const loadDefaultDir = async () => {
            if (window.electronAPI?.getRecentFolders) {
                try {
                    const folders = await window.electronAPI.getRecentFolders()
                    if (folders && folders.length > 0 && folders[0]) {
                        setDestinationDir(folders[0])
                        return
                    }
                } catch {}
            }
            if (window.electronAPI?.getDefaultProjectsDir) {
                try {
                    const defaultDir = await window.electronAPI.getDefaultProjectsDir()
                    if (defaultDir) {
                        setDestinationDir(defaultDir)
                        return
                    }
                } catch {}
            }
            // Fallback default
            setDestinationDir('C:\\CarbonCode Projects')
        }
        loadDefaultDir()
    }, [isOpen])

    // Update project name when template changes if user hasn't heavily modified it
    const handleSelectTemplate = (tpl: ProjectTemplate) => {
        setSelectedTemplate(tpl)
        setProjectName(tpl.defaultProjectName)
        setErrorMessage(null)
    }

    const handleBrowseFolder = async () => {
        if (!window.electronAPI?.openFolder) return
        try {
            const chosen = await window.electronAPI.openFolder()
            if (chosen) {
                setDestinationDir(chosen)
                setErrorMessage(null)
            }
        } catch (err) {
            console.error('Failed to browse folder:', err)
        }
    }

    const handleCreate = async () => {
        const trimmedName = projectName.trim()
        if (!trimmedName) {
            setErrorMessage('Please enter a project name.')
            return
        }
        if (!destinationDir) {
            setErrorMessage('Please choose a destination directory for the project.')
            handleBrowseFolder()
            return
        }

        setIsCreating(true)
        setErrorMessage(null)

        try {
            if (!window.electronAPI?.createProjectFromTemplate) {
                throw new Error('Project template creation API is not available.')
            }

            const result = await window.electronAPI.createProjectFromTemplate({
                templateId: selectedTemplate.id,
                projectName: trimmedName,
                parentDir: destinationDir,
                files: selectedTemplate.files,
                primaryFile: selectedTemplate.primaryFile
            })

            if (result.success && result.projectPath) {
                onProjectCreated(result.projectPath, result.primaryFilePath || null)
                onClose()
            } else {
                setErrorMessage(result.error || 'Failed to generate project template.')
            }
        } catch (err: unknown) {
            setErrorMessage(err instanceof Error ? err.message : String(err))
        } finally {
            setIsCreating(false)
        }
    }

    // Keyboard navigation (Esc to close, Enter to submit)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return
            if (e.key === 'Escape' && !isCreating) {
                onClose()
            } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !isCreating) {
                handleCreate()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, isCreating, projectName, destinationDir, selectedTemplate])

    if (!isOpen) return null

    const resolvedProjectPath = destinationDir
        ? `${destinationDir.replace(/[\\/]+$/, '')}\\${projectName.trim() || 'NewProject'}`
        : ''

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
                onClick={() => !isCreating && onClose()}
            />

            {/* Modal Container */}
            <div className="relative bg-carbon-surface border border-carbon-border rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in z-10">
                {/* Header */}
                <div className="px-6 py-5 border-b border-carbon-border flex items-center justify-between bg-carbon-bg/60">
                    <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-carbon-accent/20 border border-carbon-accent/40 flex items-center justify-center text-xl shadow-glow">
                            🚀
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-carbon-text-primary flex items-center gap-2">
                                New Project Wizard
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-carbon-accent/15 text-carbon-accent border border-carbon-accent/30 uppercase tracking-wider">
                                    Starter Templates
                                </span>
                            </h2>
                            <p className="text-xs text-carbon-text-muted mt-0.5">
                                Select a pre-configured architecture with header separation, build scripts, and tests.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isCreating}
                        className="p-1.5 rounded-lg text-carbon-text-muted hover:text-carbon-text-primary hover:bg-carbon-elevated transition-all"
                        title="Close (Esc)"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body Content */}
                <div className="px-6 py-4 overflow-y-auto space-y-4 flex-1">
                    {/* Template Selection Grid */}
                    <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-carbon-text-muted block mb-2">
                            1. Select Project Template
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {PROJECT_TEMPLATES.map((tpl) => {
                                const isSelected = selectedTemplate.id === tpl.id
                                return (
                                    <div
                                        key={tpl.id}
                                        onClick={() => handleSelectTemplate(tpl)}
                                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all duration-200 relative group flex flex-col justify-between ${
                                            isSelected
                                                ? 'bg-carbon-elevated border-carbon-accent shadow-glow'
                                                : 'bg-carbon-bg/80 border-carbon-border hover:border-carbon-border-hover hover:bg-carbon-elevated/50'
                                        }`}
                                    >
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5 pr-5">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xl">{tpl.icon}</span>
                                                    <span className="font-semibold text-sm text-carbon-text-primary">
                                                        {tpl.name}
                                                    </span>
                                                </div>
                                                <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${
                                                    tpl.language === 'cpp'
                                                        ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                                                        : tpl.language === 'python'
                                                        ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                                                        : 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                                                }`}>
                                                    {tpl.category}
                                                </span>
                                            </div>
                                            <p className="text-xs text-carbon-text-secondary leading-relaxed mb-2 line-clamp-2">
                                                {tpl.description}
                                            </p>
                                        </div>

                                        {/* Included files preview tags */}
                                        <div className="flex flex-wrap gap-1 pt-1.5 border-t border-carbon-border/40">
                                            {tpl.files.slice(0, 3).map((f) => (
                                                <span
                                                    key={f.path}
                                                    className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-carbon-bg text-carbon-text-muted border border-carbon-border/50"
                                                >
                                                    {f.path}
                                                </span>
                                            ))}
                                            {tpl.files.length > 3 && (
                                                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-carbon-bg text-carbon-text-muted">
                                                    +{tpl.files.length - 3} more
                                                </span>
                                            )}
                                        </div>

                                        {/* Radio Indicator */}
                                        <div className={`absolute top-3 right-3 w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                                            isSelected
                                                ? 'border-carbon-accent bg-carbon-accent'
                                                : 'border-carbon-border/60 group-hover:border-carbon-border'
                                        }`}>
                                            {isSelected && (
                                                <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Step 2: Project Destination & Name */}
                    <div className="space-y-4 pt-2 border-t border-carbon-border/60">
                        <label className="text-xs font-semibold uppercase tracking-wider text-carbon-text-muted block">
                            2. Configure Location & Details
                        </label>

                        {/* Project Name Field */}
                        <div>
                            <label className="block text-xs font-medium text-carbon-text-secondary mb-1.5">
                                Project Name
                            </label>
                            <input
                                type="text"
                                value={projectName}
                                onChange={(e) => setProjectName(e.target.value)}
                                placeholder="MyProjectName"
                                disabled={isCreating}
                                className="w-full px-3.5 py-2.5 rounded-xl bg-carbon-bg border border-carbon-border text-carbon-text-primary text-sm focus:outline-none focus:border-carbon-accent transition-all font-mono"
                            />
                        </div>

                        {/* Destination Folder Field */}
                        <div>
                            <label className="block text-xs font-medium text-carbon-text-secondary mb-1.5">
                                Destination Directory
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={destinationDir}
                                    onChange={(e) => setDestinationDir(e.target.value)}
                                    placeholder="Choose folder (e.g. C:\Users\Username\Projects)"
                                    disabled={isCreating}
                                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-carbon-bg border border-carbon-border text-carbon-text-primary text-sm focus:outline-none focus:border-carbon-accent transition-all font-mono truncate"
                                />
                                <button
                                    type="button"
                                    onClick={handleBrowseFolder}
                                    disabled={isCreating}
                                    className="px-4 py-2.5 rounded-xl bg-carbon-elevated border border-carbon-border hover:border-carbon-accent/60 text-carbon-text-primary text-sm font-medium transition-all active:scale-95 shrink-0 flex items-center gap-1.5"
                                >
                                    <svg className="w-4 h-4 text-carbon-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                    </svg>
                                    <span>Browse...</span>
                                </button>
                            </div>
                        </div>

                        {/* Path Preview */}
                        {resolvedProjectPath && (
                            <div className="p-3 rounded-xl bg-carbon-bg/60 border border-carbon-border/50 text-xs text-carbon-text-muted flex items-center gap-2">
                                <span className="font-semibold text-carbon-text-secondary shrink-0">Path:</span>
                                <span className="font-mono text-carbon-text-primary truncate" title={resolvedProjectPath}>
                                    {resolvedProjectPath}
                                </span>
                            </div>
                        )}

                        {/* Error Message */}
                        {errorMessage && (
                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 flex items-start gap-2">
                                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <span>{errorMessage}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="px-6 py-4 border-t border-carbon-border bg-carbon-bg/60 flex items-center justify-between">
                    <span className="text-xs text-carbon-text-muted hidden sm:inline">
                        Press <kbd className="px-1.5 py-0.5 rounded bg-carbon-elevated border border-carbon-border font-mono text-[11px]">Ctrl+Enter</kbd> to create
                    </span>
                    <div className="flex items-center gap-2.5 ml-auto">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isCreating}
                            className="px-4 py-2 rounded-xl text-carbon-text-secondary hover:text-carbon-text-primary hover:bg-carbon-elevated text-sm font-medium transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleCreate}
                            disabled={isCreating}
                            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-carbon-accent hover:bg-carbon-accent-highlight disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all shadow-glow active:scale-95"
                        >
                            {isCreating ? (
                                <>
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    <span>Scaffolding Project...</span>
                                </>
                            ) : (
                                <>
                                    <span>Create Project</span>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
