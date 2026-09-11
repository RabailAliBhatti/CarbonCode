import { SupportedLanguage } from '../types/language'

export interface RecentFileItem {
    path: string
    name: string
    language: SupportedLanguage
    lastOpened: number
}

const STORAGE_KEY = 'carboncode_recent_files'
const MAX_RECENT_FILES = 10

export function getRecentFiles(): RecentFileItem[] {
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (!stored) return []
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
            return parsed
        }
        return []
    } catch {
        return []
    }
}

export function addRecentFile(path: string, name: string, language: SupportedLanguage): void {
    if (!path) return
    try {
        const current = getRecentFiles()
        // Remove existing entry for same path
        const filtered = current.filter(item => item.path !== path)
        const updated: RecentFileItem[] = [
            {
                path,
                name: name || path.split(/[/\\]/).pop() || 'Untitled',
                language,
                lastOpened: Date.now()
            },
            ...filtered
        ].slice(0, MAX_RECENT_FILES)

        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    } catch (e) {
        console.error('Failed to save recent file', e)
    }
}

export function clearRecentFiles(): void {
    try {
        localStorage.removeItem(STORAGE_KEY)
    } catch (e) {
        console.error('Failed to clear recent files', e)
    }
}

export function formatRelativeTime(timestamp: number): string {
    const diffMs = Date.now() - timestamp
    const diffSecs = Math.floor(diffMs / 1000)
    const diffMins = Math.floor(diffSecs / 60)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins === 1) return '1 min ago'
    if (diffMins < 60) return `${diffMins} mins ago`
    if (diffHours === 1) return '1 hour ago'
    if (diffHours < 24) return `${diffHours} hours ago`
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return new Date(timestamp).toLocaleDateString()
}
