export type SupportedLanguage = 'cpp' | 'java'

export const getLanguageFromFileName = (fileName: string | null | undefined): SupportedLanguage => {
    const ext = fileName?.split('.').pop()?.toLowerCase()

    if (ext === 'java') {
        return 'java'
    }

    return 'cpp'
}

export const getLanguageLabel = (language: SupportedLanguage) => {
    return language === 'java' ? 'Java' : 'C++'
}
