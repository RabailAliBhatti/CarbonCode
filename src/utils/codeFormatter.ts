/**
 * Code Formatter Engine for CarbonCode
 * Formats Java, C++, and C code with standard indentation,
 * brace placement, and whitespace rules.
 */

import { SupportedLanguage } from '../types/language'

/**
 * Formats a document string according to language conventions.
 */
export function formatDocument(content: string, language: SupportedLanguage, tabSize = 4): string {
    if (!content || !content.trim()) return content

    if (language === 'java') {
        return formatJavaCode(content, tabSize)
    } else if (language === 'cpp' || language === 'c') {
        return formatCppCode(content, tabSize)
    } else if (language === 'python') {
        return formatPythonCode(content, tabSize)
    }

    return content
}

/**
 * Formats Python source code according to PEP 8 conventions:
 * - 4-space standard indentation
 * - 2 blank lines before top-level def and class
 * - 1 blank line before class methods
 * - Spacing after commas and colons in type hints
 * - Trims trailing spaces per line
 * - Ensures single trailing newline
 */
export function formatPythonCode(content: string, tabSize = 4): string {
    if (!content || !content.trim()) return content

    const indentStr = ' '.repeat(tabSize)
    const rawLines = content.split('\n')
    const formattedLines: string[] = []

    function getOriginalIndent(line: string): number {
        let count = 0
        for (const ch of line) {
            if (ch === ' ') count++
            else if (ch === '\t') count += tabSize
            else break
        }
        return count
    }

    let minIndentStep = tabSize
    for (const line of rawLines) {
        if (!line.trim()) continue
        const ind = getOriginalIndent(line)
        if (ind > 0 && ind < minIndentStep) {
            minIndentStep = ind
        }
    }

    let inDocstring = false
    let docstringDelim = ''

    for (let i = 0; i < rawLines.length; i++) {
        const raw = rawLines[i]
        const trimmed = raw.trim()

        if (inDocstring) {
            formattedLines.push(raw.trimEnd())
            if (trimmed.includes(docstringDelim)) {
                inDocstring = false
                docstringDelim = ''
            }
            continue
        }

        const tripleDouble = trimmed.includes('"""')
        const tripleSingle = trimmed.includes("'''")
        if (tripleDouble || tripleSingle) {
            const delim = tripleDouble ? '"""' : "'''"
            const count = (trimmed.match(new RegExp(delim, 'g')) || []).length
            if (count % 2 !== 0) {
                inDocstring = true
                docstringDelim = delim
            }
        }

        if (trimmed.length === 0) {
            const last = formattedLines[formattedLines.length - 1]
            if (formattedLines.length > 0 && last !== '') {
                formattedLines.push('')
            }
            continue
        }

        const origIndent = getOriginalIndent(raw)
        const indentLevel = Math.round(origIndent / minIndentStep)

        let line = trimmed

        let inSingle = false
        let inDouble = false
        let result = ''
        for (let j = 0; j < line.length; j++) {
            const ch = line[j]
            if (ch === "'" && !inDouble && line[j - 1] !== '\\') inSingle = !inSingle
            else if (ch === '"' && !inSingle && line[j - 1] !== '\\') inDouble = !inDouble

            if (!inSingle && !inDouble) {
                if (ch === ',' && j + 1 < line.length && line[j + 1] !== ' ' && line[j + 1] !== '\n') {
                    result += ', '
                    continue
                }
                if (ch === ':' && j + 1 < line.length && line[j + 1] !== ' ' && line[j + 1] !== '\n' && !line.startsWith('#')) {
                    if (/[a-zA-Z0-9]/.test(line[j + 1])) {
                        result += ': '
                        continue
                    }
                }
            }
            result += ch
        }
        line = result

        const isTopLevelDefOrClass = indentLevel === 0 && (line.startsWith('def ') || line.startsWith('class ') || line.startsWith('@'))
        const isMethodDef = indentLevel > 0 && (line.startsWith('def ') || line.startsWith('@'))

        if (isTopLevelDefOrClass && formattedLines.length > 0) {
            while (formattedLines.length > 0 && formattedLines[formattedLines.length - 1] === '') {
                formattedLines.pop()
            }
            if (formattedLines.length > 0) {
                formattedLines.push('', '')
            }
        } else if (isMethodDef && formattedLines.length > 0) {
            if (formattedLines[formattedLines.length - 1] !== '') {
                formattedLines.push('')
            }
        }

        formattedLines.push(indentStr.repeat(indentLevel) + line)
    }

    return formattedLines.join('\n').trimEnd() + '\n'
}

/**
 * Formats Java source code:
 * - 4-space standard indentation
 * - K&R brace placement (opening brace on same line)
 * - Single space after control keywords (if, for, while, etc.)
 * - Trims trailing spaces
 * - Caps multiple blank lines to at most one
 */
export function formatJavaCode(content: string, tabSize = 4): string {
    const indentStr = ' '.repeat(tabSize)
    const rawLines = content.split('\n')
    const formattedLines: string[] = []

    let indentLevel = 0
    let inBlockComment = false

    for (let i = 0; i < rawLines.length; i++) {
        let line = rawLines[i].trim()

        // Handle block comments verbatim
        if (inBlockComment) {
            formattedLines.push(indentStr.repeat(indentLevel) + line)
            if (line.includes('*/')) inBlockComment = false
            continue
        }
        if (line.startsWith('/*')) {
            formattedLines.push(indentStr.repeat(indentLevel) + line)
            if (!line.includes('*/')) inBlockComment = true
            continue
        }

        // Empty line handling: avoid multiple consecutive blank lines
        if (line.length === 0) {
            if (formattedLines.length > 0 && formattedLines[formattedLines.length - 1].length > 0) {
                formattedLines.push('')
            }
            continue
        }

        // Move opening brace to previous line if it sits alone on a line (K&R style)
        if (line === '{' && formattedLines.length > 0) {
            const lastIdx = formattedLines.length - 1
            if (!formattedLines[lastIdx].endsWith('{') && !formattedLines[lastIdx].startsWith('//')) {
                formattedLines[lastIdx] = formattedLines[lastIdx].trimEnd() + ' {'
                indentLevel++
                continue
            }
        }

        // Count leading closing braces to un-indent current line before printing
        let leadingCloses = 0
        let tempLine = line
        while (tempLine.startsWith('}') || tempLine.startsWith(')')) {
            leadingCloses++
            tempLine = tempLine.substring(1).trim()
        }

        const effectiveIndent = Math.max(0, indentLevel - leadingCloses)

        // Normalize space after keywords: if(, for(, while(, switch(, catch( -> if (, etc.
        line = line.replace(/\b(if|for|while|switch|catch|synchronized)\s*\(/g, '$1 (')

        // Push formatted line with indent
        formattedLines.push(indentStr.repeat(effectiveIndent) + line)

        // Calculate net change in indentation for subsequent lines
        // Ignore braces inside string literals or line comments
        const cleanForBraces = line
            .replace(/\/\/.*/, '')
            .replace(/"(?:\\.|[^"\\])*"/g, '""')
            .replace(/'(?:\\.|[^'\\])*'/g, "''")

        let opens = 0
        let closes = 0
        for (const ch of cleanForBraces) {
            if (ch === '{') opens++
            else if (ch === '}') closes++
        }

        indentLevel = Math.max(0, indentLevel + opens - closes)
    }

    return formattedLines.join('\n').trimEnd() + '\n'
}

/**
 * Formats C and C++ source code:
 * - Standard indentation
 * - Keeps preprocessor directives (#include, #define) at column 1
 * - Formats switch cases
 * - Cleans up spacing around control structures
 */
export function formatCppCode(content: string, tabSize = 4): string {
    const indentStr = ' '.repeat(tabSize)
    const rawLines = content.split('\n')
    const formattedLines: string[] = []

    let indentLevel = 0
    let inBlockComment = false

    for (let i = 0; i < rawLines.length; i++) {
        let line = rawLines[i].trim()

        if (inBlockComment) {
            formattedLines.push(indentStr.repeat(indentLevel) + line)
            if (line.includes('*/')) inBlockComment = false
            continue
        }
        if (line.startsWith('/*')) {
            formattedLines.push(indentStr.repeat(indentLevel) + line)
            if (!line.includes('*/')) inBlockComment = true
            continue
        }

        // Preprocessor directives always stay at column 1
        if (line.startsWith('#')) {
            formattedLines.push(line)
            continue
        }

        // Empty line handling
        if (line.length === 0) {
            if (formattedLines.length > 0 && formattedLines[formattedLines.length - 1].length > 0) {
                formattedLines.push('')
            }
            continue
        }

        // Access specifiers in classes (public:, private:, protected:)
        const isAccessSpecifier = /^(public|private|protected)\s*:/.test(line)

        // Switch case / default label
        const isCaseLabel = /^(case\s+[^:]+|default)\s*:/.test(line)

        let leadingCloses = 0
        let tempLine = line
        while (tempLine.startsWith('}') || tempLine.startsWith(')')) {
            leadingCloses++
            tempLine = tempLine.substring(1).trim()
        }

        let effectiveIndent = Math.max(0, indentLevel - leadingCloses)

        if (isAccessSpecifier) {
            effectiveIndent = Math.max(0, effectiveIndent - 1)
        } else if (isCaseLabel) {
            effectiveIndent = Math.max(0, effectiveIndent)
        }

        // Normalize space after keywords
        line = line.replace(/\b(if|for|while|switch|catch)\s*\(/g, '$1 (')

        formattedLines.push(indentStr.repeat(effectiveIndent) + line)

        const cleanForBraces = line
            .replace(/\/\/.*/, '')
            .replace(/"(?:\\.|[^"\\])*"/g, '""')
            .replace(/'(?:\\.|[^'\\])*'/g, "''")

        let opens = 0
        let closes = 0
        for (const ch of cleanForBraces) {
            if (ch === '{') opens++
            else if (ch === '}') closes++
        }

        indentLevel = Math.max(0, indentLevel + opens - closes)
    }

    return formattedLines.join('\n').trimEnd() + '\n'
}
