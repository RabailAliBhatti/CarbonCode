import { useState, useEffect } from 'react'

export type CppStandard = 'c++11' | 'c++14' | 'c++17' | 'c++20' | 'c++23'

export interface Settings {
    fontSize: number
    tabSize: number
    autoSave: boolean
    cppStandard: CppStandard
    compilerPath: string
    theme: 'dark' | 'light'
    minimap: boolean
    wordWrap: boolean
    formatOnSave: boolean
    outputFontSize: number
    outputPosition: 'bottom' | 'right'
    explorerWidth: number
    analyticsConsent: boolean | null  // null = not asked, true = opted in, false = opted out
}

const DEFAULT_SETTINGS: Settings = {
    fontSize: 14,
    tabSize: 4,
    autoSave: false,
    cppStandard: 'c++17',
    compilerPath: '',
    theme: 'dark',
    minimap: true,
    wordWrap: false,
    formatOnSave: false,
    outputFontSize: 13,
    outputPosition: 'bottom',
    explorerWidth: 250,
    analyticsConsent: null
}

export function useSettings() {
    const [settings, setSettings] = useState<Settings>(() => {
        try {
            const saved = localStorage.getItem('carbon-settings')
            return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS
        } catch {
            return DEFAULT_SETTINGS
        }
    })

    useEffect(() => {
        localStorage.setItem('carbon-settings', JSON.stringify(settings))
    }, [settings])

    const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
        setSettings(prev => ({ ...prev, [key]: value }))
    }

    return { settings, updateSetting }
}
