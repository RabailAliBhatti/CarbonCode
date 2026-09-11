export interface ProjectSettings {
    language?: 'c' | 'cpp' | 'java'
    cStandard?: string
    cppStandard?: string
    compilerPath?: string
}

const DEFAULT_FILENAME = '.carboncode'

export async function loadProjectSettings(folderPath: string): Promise<ProjectSettings | null> {
    try {
        const filePath = folderPath.replace(/[\\/]+$/, '') + '/' + DEFAULT_FILENAME
        const content = await window.electronAPI.readFile(filePath)
        if (!content) return null

        const parsed = JSON.parse(content)
        if (typeof parsed !== 'object' || parsed === null) return null

        const settings: ProjectSettings = {}

        if (parsed.language === 'c' || parsed.language === 'cpp' || parsed.language === 'java') {
            settings.language = parsed.language
        }
        if (typeof parsed.cStandard === 'string') {
            settings.cStandard = parsed.cStandard
        }
        if (typeof parsed.cppStandard === 'string') {
            settings.cppStandard = parsed.cppStandard
        }
        if (typeof parsed.compilerPath === 'string') {
            settings.compilerPath = parsed.compilerPath
        }

        return Object.keys(settings).length > 0 ? settings : null
    } catch {
        return null
    }
}
