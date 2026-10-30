// src/components/UpdateNotificationToast.tsx
// Non-intrusive floating toast notification for background updates

import React, { useState, useEffect } from 'react'

interface UpdateInfo {
    status: string
    currentVersion: string
    newVersion?: string
    releaseNotes?: string
    downloadUrl?: string
    downloadPercent?: number
    errorMessage?: string
}

interface UpdateNotificationToastProps {
    onOpenSettings?: () => void
}

export const UpdateNotificationToast: React.FC<UpdateNotificationToastProps> = ({ onOpenSettings }) => {
    const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
    const [isDismissed, setIsDismissed] = useState(false)
    const [showNotes, setShowNotes] = useState(false)

    useEffect(() => {
        if (!window.electronAPI) return

        // Get initial status
        window.electronAPI.getUpdateStatus?.().then((st) => {
            if (st && (st.status === 'update-available' || st.status === 'downloading' || st.status === 'update-downloaded')) {
                setUpdateInfo(st)
            }
        })

        // Listen for status changes
        const unsubscribe = window.electronAPI.onUpdateStatus?.((info) => {
            if (info && (info.status === 'update-available' || info.status === 'downloading' || info.status === 'update-downloaded')) {
                setUpdateInfo(info)
                // If a new state arrives (e.g. download completes), re-open toast if dismissed
                if (info.status === 'update-downloaded') {
                    setIsDismissed(false)
                }
            } else {
                setUpdateInfo(null)
            }
        })

        return () => {
            unsubscribe?.()
        }
    }, [])

    if (!updateInfo || isDismissed) {
        return null
    }

    const handleDownload = async () => {
        await window.electronAPI?.downloadUpdate?.()
    }

    const handleRestart = () => {
        window.electronAPI?.installUpdate?.()
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-3rem)] animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div className="bg-carbon-surface/95 backdrop-blur-md border border-carbon-accent/40 rounded-xl shadow-2xl p-4 text-carbon-text-primary flex flex-col gap-3">
                
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                        {updateInfo.status === 'update-downloaded' ? (
                            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        ) : updateInfo.status === 'downloading' ? (
                            <div className="w-7 h-7 rounded-lg bg-carbon-accent/20 text-carbon-accent border border-carbon-accent/40 flex items-center justify-center shrink-0">
                                <div className="w-3.5 h-3.5 border-2 border-carbon-accent border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : (
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-carbon-accent to-carbon-accent-secondary text-white flex items-center justify-center shadow-glow shrink-0">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                            </div>
                        )}
                        <div>
                            <h4 className="text-sm font-semibold text-white tracking-tight">
                                {updateInfo.status === 'update-downloaded'
                                    ? 'Update Ready to Install'
                                    : updateInfo.status === 'downloading'
                                    ? `Downloading ${updateInfo.newVersion || 'Update'}...`
                                    : `CarbonCode ${updateInfo.newVersion || 'Update'} Available`}
                            </h4>
                            <span className="text-[11px] text-carbon-text-muted">
                                {updateInfo.status === 'update-downloaded'
                                    ? 'Restart now to finish updating'
                                    : updateInfo.status === 'downloading'
                                    ? 'Downloading in the background'
                                    : 'A new release is ready for download'}
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={() => setIsDismissed(true)}
                        className="text-carbon-text-muted hover:text-white p-1 rounded transition-colors"
                        title="Dismiss for now"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Progress bar when downloading */}
                {updateInfo.status === 'downloading' && (
                    <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between text-xs">
                            <span className="text-carbon-text-secondary">Progress</span>
                            <span className="font-mono text-carbon-accent font-semibold">{updateInfo.downloadPercent || 0}%</span>
                        </div>
                        <div className="w-full bg-carbon-border rounded-full h-2 overflow-hidden">
                            <div
                                className="bg-gradient-to-r from-carbon-accent to-carbon-accent-secondary h-2 rounded-full transition-all duration-300"
                                style={{ width: `${updateInfo.downloadPercent || 0}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Release notes preview if available */}
                {updateInfo.status === 'update-available' && updateInfo.releaseNotes && (
                    <div>
                        <button
                            onClick={() => setShowNotes(!showNotes)}
                            className="text-[11px] text-carbon-accent hover:underline flex items-center gap-1"
                        >
                            <span>{showNotes ? 'Hide Release Notes' : 'View Release Notes'}</span>
                            <svg className={`w-3 h-3 transition-transform ${showNotes ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        {showNotes && (
                            <div className="mt-1.5 p-2 rounded bg-carbon-elevated/70 border border-carbon-border text-[11px] font-mono text-carbon-text-secondary max-h-24 overflow-y-auto whitespace-pre-wrap">
                                {updateInfo.releaseNotes}
                            </div>
                        )}
                    </div>
                )}

                {/* Action buttons */}
                <div className="flex items-center justify-end gap-2 pt-1 border-t border-carbon-border/50">
                    {updateInfo.status === 'update-available' && (
                        <>
                            <button
                                onClick={() => setIsDismissed(true)}
                                className="px-3 py-1.5 rounded-lg text-xs text-carbon-text-secondary hover:text-white hover:bg-carbon-elevated transition-colors"
                            >
                                Later
                            </button>
                            <button
                                onClick={handleDownload}
                                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-carbon-accent to-carbon-accent-secondary hover:from-carbon-accent-highlight hover:to-carbon-accent shadow-glow transition-all"
                            >
                                Download in Background
                            </button>
                        </>
                    )}

                    {updateInfo.status === 'downloading' && (
                        <span className="text-[11px] text-carbon-text-muted italic mr-auto">
                            You can safely keep coding...
                        </span>
                    )}

                    {updateInfo.status === 'update-downloaded' && (
                        <>
                            <button
                                onClick={() => setIsDismissed(true)}
                                className="px-3 py-1.5 rounded-lg text-xs text-carbon-text-secondary hover:text-white hover:bg-carbon-elevated transition-colors"
                            >
                                Later
                            </button>
                            <button
                                onClick={handleRestart}
                                className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-glow transition-all flex items-center gap-1.5"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span>Restart & Apply</span>
                            </button>
                        </>
                    )}
                </div>

            </div>
        </div>
    )
}

export default UpdateNotificationToast
