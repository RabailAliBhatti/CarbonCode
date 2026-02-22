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
}

const DEFAULT_SETTINGS: Settings = {
    fontSize: 14,
    tabSize: 4,
    autoSave: false,
    cppStandard: 'c++17',
    compilerPath: '',
    theme: 'dark',
    minimap: true,
    wordWrap: false
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
