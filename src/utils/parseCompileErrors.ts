export interface CompileError {
    file: string | null
    line: number
    column?: number
    severity: 'error' | 'warning'
    message: string
    code?: string
    raw: string
}

// GCC/Clang:  file.cpp:12:5: error: 'foo' was not declared
const GCC_RE = /^(.+?):(\d+):(\d+):\s*(error|warning):\s*(.+)$/

// MSVC:       file.cpp(12): error C2065: 'foo': undeclared identifier
const MSVC_RE = /^(.+?)\((\d+)\):\s*(error|warning)\s+(C\d+):\s*(.+)$/

// Javac:      File.java:12: error: cannot find symbol
const JAVAC_RE = /^(.+?):(\d+):\s*(error|warning):\s*(.+)$/

// GCC "In file included from file:line:" chain
const INCLUDED_FROM_RE = /^In file included from (.+?):(\d+):/

// Generic severity keyword (fallback)
const SEVERITY_RE = /\b(error|warning)\b/i

export function parseCompileErrors(raw: string, defaultFile?: string): CompileError[] {
    if (!raw || !raw.trim()) return []

    const lines = raw.split('\n')
    const errors: CompileError[] = []
    let lastIncludedFile: string | null = null
    let lastIncludedLine: number | null = null

    for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue

        // Track "In file included from" chain
        const includedMatch = trimmed.match(INCLUDED_FROM_RE)
        if (includedMatch) {
            lastIncludedFile = includedMatch[1]
            lastIncludedLine = parseInt(includedMatch[2], 10)
            continue
        }

        // Skip GCC context lines (indented continuation like "  |     ^~~~")
        if (trimmed.startsWith('|') || trimmed.startsWith('^')) continue

        let match: RegExpMatchArray | null
        let file: string | null
        let lineNum: number
        let column: number | undefined
        let severity: 'error' | 'warning'
        let message: string
        let code: string | undefined

        // Try GCC/Clang format first (most specific — has column)
        match = trimmed.match(GCC_RE)
        if (match) {
            file = match[1]
            lineNum = parseInt(match[2], 10)
            column = parseInt(match[3], 10)
            severity = match[4] as 'error' | 'warning'
            message = match[5]
        } else {
            // Try MSVC format
            match = trimmed.match(MSVC_RE)
            if (match) {
                file = match[1]
                lineNum = parseInt(match[2], 10)
                severity = match[3] as 'error' | 'warning'
                code = match[4]
                message = match[5]
            } else {
                // Try Javac format (no column after first line)
                match = trimmed.match(JAVAC_RE)
                if (match) {
                    file = match[1]
                    lineNum = parseInt(match[2], 10)
                    severity = match[3] as 'error' | 'warning'
                    message = match[4]
                } else {
                    // Fallback: check for severity keyword anywhere
                    const sevMatch = trimmed.match(SEVERITY_RE)
                    if (sevMatch) {
                        file = lastIncludedFile || defaultFile || null
                        lineNum = lastIncludedLine || 1
                        severity = sevMatch[1].toLowerCase() as 'error' | 'warning'
                        message = trimmed
                    } else {
                        // Skip non-error lines (like "Compilation finished with errors:")
                        continue
                    }
                }
            }
        }

        errors.push({
            file,
            line: lineNum,
            column,
            severity,
            message,
            code,
            raw: trimmed
        })
    }

    return errors
}
