export type SupportedLanguage = 'c' | 'cpp' | 'java' | 'python' | 'plaintext'

export const getLanguageFromFileName = (fileName: string | null | undefined): SupportedLanguage => {
    if (!fileName) return 'cpp'
    const ext = fileName.split('.').pop()?.toLowerCase()

    if (ext === 'py' || ext === 'pyw') {
        return 'python'
    }

    if (ext === 'java') {
        return 'java'
    }

    if (ext === 'c' || ext === 'h') {
        return 'c'
    }

    if (['cpp', 'cc', 'cxx', 'c++', 'hpp', 'hxx'].includes(ext || '')) {
        return 'cpp'
    }

    if (['txt', 'csv', 'tsv', 'dat', 'in', 'out', 'log', 'text', 'json', 'md'].includes(ext || '')) {
        return 'plaintext'
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
        case 'plaintext':
            return 'Text'
        default:
            return 'C++'
    }
}

