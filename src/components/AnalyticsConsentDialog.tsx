// src/components/AnalyticsConsentDialog.tsx
// First-launch dialog asking user to opt-in to anonymous analytics

interface AnalyticsConsentDialogProps {
    isOpen: boolean
    onConsent: (consent: boolean) => void
}

function AnalyticsConsentDialog({ isOpen, onConsent }: AnalyticsConsentDialogProps) {
    if (!isOpen) return null

    const handleOpenPrivacyPolicy = () => {
        // Open PRIVACY.md in default browser
        window.electronAPI?.openExternal?.('https://github.com/rabailalibhatti/carboncode/blob/main/PRIVACY.md')
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] animate-fade-in">
            <div className="bg-editor-sidebar border border-editor-border rounded-xl shadow-2xl w-[480px] max-w-[90vw] overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-editor-border bg-gradient-to-r from-accent/10 to-transparent">
                    <h2 className="text-xl font-semibold text-text-bright flex items-center gap-3">
                        <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Help Improve CarbonCode
                    </h2>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-4">
                    <p className="text-text-primary leading-relaxed">
                        CarbonCode would like to collect <strong className="text-text-bright">anonymous usage data</strong> to
                        help us understand which features are used most.
                    </p>

                    <div className="bg-editor-bg/50 rounded-lg p-4 space-y-2">
                        <p className="text-text-secondary text-sm flex items-start gap-2">
                            <svg className="w-4 h-4 text-success mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Only counts feature usage (like "app opened", "code compiled")
                        </p>
                        <p className="text-text-secondary text-sm flex items-start gap-2">
                            <svg className="w-4 h-4 text-success mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Cannot identify you or access your code
                        </p>
                        <p className="text-text-secondary text-sm flex items-start gap-2">
                            <svg className="w-4 h-4 text-success mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            You can change this anytime in Settings
                        </p>
                    </div>

                    <button
                        onClick={handleOpenPrivacyPolicy}
                        className="text-accent hover:text-accent-hover text-sm underline underline-offset-2"
                    >
                        Read our Privacy Policy →
                    </button>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-editor-border bg-editor-bg/30 flex gap-3 justify-end">
                    <button
                        onClick={() => onConsent(false)}
                        className="px-4 py-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
                    >
                        No, thanks
                    </button>
                    <button
                        onClick={() => onConsent(true)}
                        className="px-5 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white font-medium transition-colors"
                    >
                        Yes, I'm willing to help
                    </button>
                </div>
            </div>
        </div>
    )
}

export default AnalyticsConsentDialog
