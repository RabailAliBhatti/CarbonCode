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

// Python traceback: File "main.py", line 12, in <module>
const PYTHON_FILE_RE = /^\s*File "(.+?)",\s*line (\d+)(?:,\s*in\s+(.+))?/

// Python exception: ValueError: ... or SyntaxError: ...
const PYTHON_ERROR_RE = /^([A-Z]\w*(?:Error|Exception|Warning))(?::\s*(.*))?$/

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
    let pythonFrames: Array<{ file: string; line: number; func?: string }> = []
    let lastCaretCol: number | undefined

    for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue

        // Python traceback header
        if (trimmed.startsWith('Traceback (most recent call last):')) {
            pythonFrames = []
            continue
        }

        // Python File "...", line X
        const pyFileMatch = line.match(PYTHON_FILE_RE)
        if (pyFileMatch) {
            pythonFrames.push({
                file: pyFileMatch[1],
                line: parseInt(pyFileMatch[2], 10),
                func: pyFileMatch[3]
            })
            continue
        }

        // Python Error / Exception line
        const pyErrMatch = trimmed.match(PYTHON_ERROR_RE)
        if (pyErrMatch) {
            const errorType = pyErrMatch[1]
            const errorMsg = pyErrMatch[2] ? `${errorType}: ${pyErrMatch[2]}` : errorType
            const isWarning = errorType.endsWith('Warning')

            if (pythonFrames.length > 0) {
                for (let i = pythonFrames.length - 1; i >= 0; i--) {
                    const frame = pythonFrames[i]
                    const isInnermost = i === pythonFrames.length - 1
                    const isTempFile = frame.file.includes('carboncode-') || frame.file === 'main.py' || frame.file === '<string>'
                    const resolvedFile = (isTempFile && defaultFile) ? defaultFile : frame.file
                    errors.push({
                        file: resolvedFile,
                        line: frame.line,
                        column: isInnermost ? lastCaretCol : undefined,
                        severity: isWarning ? 'warning' : 'error',
                        message: isInnermost ? errorMsg : `${errorType} (called from ${frame.func || 'here'})`,
                        code: errorType,
                        raw: trimmed
                    })
                }
                pythonFrames = []
                lastCaretCol = undefined
            } else {
                errors.push({
                    file: defaultFile || null,
                    line: 1,
                    column: lastCaretCol,
                    severity: isWarning ? 'warning' : 'error',
                    message: errorMsg,
                    code: errorType,
                    raw: trimmed
                })
                lastCaretCol = undefined
            }
            continue
        }

        // Track caret position (column) in Python syntax error
        if (pythonFrames.length > 0 && line.includes('^')) {
            lastCaretCol = line.indexOf('^') + 1
            continue
        }

        // If in Python traceback context (code line or caret line), skip
        if (pythonFrames.length > 0 && (line.startsWith(' ') || line.startsWith('\t') || trimmed.startsWith('^'))) {
            continue
        }

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

        // Map temp compilation files to defaultFile if provided
        if (file && defaultFile && (
            file.includes('carboncode-') ||
            file === 'main.cpp' || file === 'main.c' || file === 'main.py' ||
            file.endsWith('/main.cpp') || file.endsWith('\\main.cpp') ||
            file.endsWith('/main.c') || file.endsWith('\\main.c') ||
            file.endsWith('/main.py') || file.endsWith('\\main.py')
        )) {
            file = defaultFile
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
