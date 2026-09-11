export type SupportedLanguage = 'c' | 'cpp' | 'java' | 'python'

export const getLanguageFromFileName = (fileName: string | null | undefined): SupportedLanguage => {
    const ext = fileName?.split('.').pop()?.toLowerCase()

    if (ext === 'py') {
        return 'python'
    }

    if (ext === 'java') {
        return 'java'
    }

    if (ext === 'c' || ext === 'h') {
        return 'c'
    }

    return 'cpp'
}

export const getLanguageLabel = (language: SupportedLanguage) => {
    switch (language) {
        case 'c':
            return 'C'
        case 'java':
            return 'Java'
        case 'python':
            return 'Python'
        default:
            return 'C++'
    }
}

