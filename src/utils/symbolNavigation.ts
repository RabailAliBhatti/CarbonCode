/**
 * Symbol Navigation Engine for CarbonCode
 * Provides Go to Definition (F12) and Find References (Shift+F12)
 * for Java, C++, and C files.
 */

import {
    extractJavaVariables,
    parseJavaFileSymbols,
    getAllProjectSymbols
} from './javaIntellisense'
import { extractPythonLocalSymbols } from './pythonIntellisense'

export interface NavigationLocation {
    uri: any
    range: {
        startLineNumber: number
        startColumn: number
        endLineNumber: number
        endColumn: number
    }
}

/**
 * Resolves the definition location for the symbol under cursor.
 */
export function resolveDefinition(
    model: any,
    position: any,
    language: string,
    monaco: any,
    onOpenFile?: (filePath: string, line?: number, column?: number) => void
): NavigationLocation | null {
    if (!model || !position) return null

    const word = model.getWordAtPosition(position)
    const lineContent = model.getLineContent(position.lineNumber)

    // 1. C/C++ Header Navigation: e.g. #include "helper.h" or #include <iostream>
    const includeMatch = lineContent.match(/^\s*#include\s+["<]([^">]+)[">]/)
    if (includeMatch && (language === 'cpp' || language === 'c')) {
        const headerName = includeMatch[1]
        // If onOpenFile is available, try opening the header
        if (onOpenFile && (headerName.endsWith('.h') || headerName.endsWith('.hpp'))) {
            onOpenFile(headerName, 1, 1)
        }
    }

    if (!word || !word.word) return null
    const symbolName = word.word
    const content = model.getValue()

    // 2. JAVA DEFINITION RESOLUTION
    if (language === 'java') {
        // 2A. Check local variables, parameters, and loop variables in current file
        const vars = extractJavaVariables(content)
        const matchedVar = vars.find(v => v.name === symbolName)
        if (matchedVar && matchedVar.line) {
            const startCol = matchedVar.column || 1
            return {
                uri: model.uri,
                range: {
                    startLineNumber: matchedVar.line,
                    startColumn: startCol,
                    endLineNumber: matchedVar.line,
                    endColumn: startCol + symbolName.length
                }
            }
        }

        // 2B. Check classes, methods, constructors, and fields in current file
        const currentFileSymbols = parseJavaFileSymbols(content, 'Current.java')
        for (const cls of currentFileSymbols) {
            if (cls.name === symbolName && cls.line) {
                return {
                    uri: model.uri,
                    range: {
                        startLineNumber: cls.line,
                        startColumn: cls.column || 1,
                        endLineNumber: cls.line,
                        endColumn: (cls.column || 1) + symbolName.length
                    }
                }
            }
            // Check methods
            for (const m of cls.methods) {
                if (m.name === symbolName && m.line) {
                    return {
                        uri: model.uri,
                        range: {
                            startLineNumber: m.line,
                            startColumn: m.column || 1,
                            endLineNumber: m.line,
                            endColumn: (m.column || 1) + symbolName.length
                        }
                    }
                }
            }
            // Check constructors
            for (const ctor of cls.constructors) {
                if (cls.name === symbolName && ctor.line) {
                    return {
                        uri: model.uri,
                        range: {
                            startLineNumber: ctor.line,
                            startColumn: ctor.column || 1,
                            endLineNumber: ctor.line,
                            endColumn: (ctor.column || 1) + symbolName.length
                        }
                    }
                }
            }
            // Check fields
            for (const f of cls.fields) {
                if (f.name === symbolName && f.line) {
                    return {
                        uri: model.uri,
                        range: {
                            startLineNumber: f.line,
                            startColumn: f.column || 1,
                            endLineNumber: f.line,
                            endColumn: (f.column || 1) + symbolName.length
                        }
                    }
                }
            }
        }

        // 2C. Check Cross-File Project Symbols (classes, methods, fields in other files)
        const projectSyms = getAllProjectSymbols()
        for (const sym of projectSyms) {
            if (sym.name === symbolName) {
                const targetUri = sym.filePath && monaco?.Uri ? monaco.Uri.file(sym.filePath) : model.uri
                if (sym.filePath && onOpenFile) {
                    onOpenFile(sym.filePath, sym.line || 1, sym.column || 1)
                }
                return {
                    uri: targetUri,
                    range: {
                        startLineNumber: sym.line || 1,
                        startColumn: sym.column || 1,
                        endLineNumber: sym.line || 1,
                        endColumn: (sym.column || 1) + symbolName.length
                    }
                }
            }

            for (const m of sym.methods) {
                if (m.name === symbolName) {
                    const targetUri = sym.filePath && monaco?.Uri ? monaco.Uri.file(sym.filePath) : model.uri
                    if (sym.filePath && onOpenFile) {
                        onOpenFile(sym.filePath, m.line || 1, m.column || 1)
                    }
                    return {
                        uri: targetUri,
                        range: {
                            startLineNumber: m.line || 1,
                            startColumn: m.column || 1,
                            endLineNumber: m.line || 1,
                            endColumn: (m.column || 1) + symbolName.length
                        }
                    }
                }
            }

            for (const f of sym.fields) {
                if (f.name === symbolName) {
                    const targetUri = sym.filePath && monaco?.Uri ? monaco.Uri.file(sym.filePath) : model.uri
                    if (sym.filePath && onOpenFile) {
                        onOpenFile(sym.filePath, f.line || 1, f.column || 1)
                    }
                    return {
                        uri: targetUri,
                        range: {
                            startLineNumber: f.line || 1,
                            startColumn: f.column || 1,
                            endLineNumber: f.line || 1,
                            endColumn: (f.column || 1) + symbolName.length
                        }
                    }
                }
            }
        }
    }

    // 3. C / C++ DEFINITION RESOLUTION
    if (language === 'cpp' || language === 'c') {
        const lines = content.split('\n')

        // 3A. Function definitions: e.g. int calculate(...) { or void helper(...) {
        const funcRegex = new RegExp(`\\b(?:[A-Za-z0-9_:*&<>]+)\\s+${symbolName}\\s*\\([^)]*\\)\\s*(?:const\\s*)?(?:noexcept\\s*)?\\{`)
        for (let i = 0; i < lines.length; i++) {
            const m = lines[i].match(funcRegex)
            if (m) {
                const col = lines[i].indexOf(symbolName) + 1
                return {
                    uri: model.uri,
                    range: {
                        startLineNumber: i + 1,
                        startColumn: col,
                        endLineNumber: i + 1,
                        endColumn: col + symbolName.length
                    }
                }
            }
        }

        // 3B. Struct or Class declarations: e.g. struct Point { or class Student {
        const classRegex = new RegExp(`\\b(?:class|struct)\\s+${symbolName}\\b`)
        for (let i = 0; i < lines.length; i++) {
            const m = lines[i].match(classRegex)
            if (m) {
                const col = lines[i].indexOf(symbolName) + 1
                return {
                    uri: model.uri,
                    range: {
                        startLineNumber: i + 1,
                        startColumn: col,
                        endLineNumber: i + 1,
                        endColumn: col + symbolName.length
                    }
                }
            }
        }

        // 3C. Variable declarations: e.g. int count = 0; or auto x = 5;
        const varRegex = new RegExp(`\\b(?:const\\s+)?(?:int|double|float|char|bool|long|short|unsigned|signed|auto|size_t|[A-Za-z0-9_:]+)[*&\\s]+${symbolName}\\b`)
        for (let i = 0; i < lines.length; i++) {
            const m = lines[i].match(varRegex)
            if (m) {
                const col = lines[i].indexOf(symbolName) + 1
                return {
                    uri: model.uri,
                    range: {
                        startLineNumber: i + 1,
                        startColumn: col,
                        endLineNumber: i + 1,
                        endColumn: col + symbolName.length
                    }
                }
            }
        }
    }

    // 4. PYTHON DEFINITION RESOLUTION
    if (language === 'python') {
        const pySymbols = extractPythonLocalSymbols(content)

        // 4A. Functions: def func(...)
        const matchedFunc = pySymbols.functions.find(f => f.name === symbolName)
        if (matchedFunc) {
            return {
                uri: model.uri,
                range: {
                    startLineNumber: matchedFunc.line,
                    startColumn: matchedFunc.column,
                    endLineNumber: matchedFunc.line,
                    endColumn: matchedFunc.column + symbolName.length
                }
            }
        }

        // 4B. Classes: class ClassName(...)
        const matchedClass = pySymbols.classes.find(c => c.name === symbolName)
        if (matchedClass) {
            return {
                uri: model.uri,
                range: {
                    startLineNumber: matchedClass.line,
                    startColumn: matchedClass.column,
                    endLineNumber: matchedClass.line,
                    endColumn: matchedClass.column + symbolName.length
                }
            }
        }

        // 4C. Variables / Parameters / Loop vars
        const matchedVar = pySymbols.variables.find(v => v.name === symbolName)
        if (matchedVar) {
            return {
                uri: model.uri,
                range: {
                    startLineNumber: matchedVar.line,
                    startColumn: matchedVar.column,
                    endLineNumber: matchedVar.line,
                    endColumn: matchedVar.column + symbolName.length
                }
            }
        }
    }

    return null
}

/**
 * Finds all occurrences / references of the symbol under cursor.
 */
export function findSymbolReferences(
    model: any,
    position: any,
    _language: string
): NavigationLocation[] {
    if (!model || !position) return []

    const word = model.getWordAtPosition(position)
    if (!word || !word.word) return []

    const symbolName = word.word
    const locations: NavigationLocation[] = []

    // Use Monaco's findMatches to locate exact word matches across the file
    const matches = model.findMatches(
        symbolName,
        true, // searchOnlyEditableRange
        false, // isRegex
        true, // matchCase
        ' ', // wholeWord boundary
        false // captureMatches
    )

    for (const match of matches) {
        locations.push({
            uri: model.uri,
            range: match.range
        })
    }

    return locations
}
