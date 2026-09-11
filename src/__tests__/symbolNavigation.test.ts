import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resolveDefinition, findSymbolReferences } from '../utils/symbolNavigation'
import { updateJavaProjectFiles } from '../utils/javaIntellisense'

function createMockModel(content: string, uriStr = 'file:///src/Main.java') {
    const lines = content.split('\n')
    const uri = { toString: () => uriStr, fsPath: uriStr.replace('file:///', '') }

    return {
        uri,
        getValue: () => content,
        getLineContent: (lineNum: number) => lines[lineNum - 1] || '',
        getWordAtPosition: (pos: { lineNumber: number; column: number }) => {
            const line = lines[pos.lineNumber - 1] || ''
            // find word at column
            let start = pos.column - 1
            while (start > 0 && /[a-zA-Z0-9_]/.test(line[start - 1])) {
                start--
            }
            let end = pos.column - 1
            while (end < line.length && /[a-zA-Z0-9_]/.test(line[end])) {
                end++
            }
            const word = line.substring(start, end)
            if (!word) return null
            return {
                word,
                startColumn: start + 1,
                endColumn: end + 1
            }
        },
        findMatches: (pattern: string) => {
            const matches: any[] = []
            lines.forEach((line, lineIdx) => {
                let startIdx = 0
                while ((startIdx = line.indexOf(pattern, startIdx)) !== -1) {
                    matches.push({
                        range: {
                            startLineNumber: lineIdx + 1,
                            startColumn: startIdx + 1,
                            endLineNumber: lineIdx + 1,
                            endColumn: startIdx + 1 + pattern.length
                        }
                    })
                    startIdx += pattern.length
                }
            })
            return matches
        }
    }
}

describe('Symbol Navigation', () => {
    beforeEach(() => {
        updateJavaProjectFiles([])
    })

    describe('Java Go to Definition', () => {
        it('resolves local variable definition in Java', () => {
            const javaCode = `
public class App {
    public static void main(String[] args) {
        int totalScore = 100;
        System.out.println(totalScore);
    }
}
`
            const model = createMockModel(javaCode)
            // Cursor is on line 5, column 29 (on 'totalScore')
            const position = { lineNumber: 5, column: 29 }
            const result = resolveDefinition(model, position, 'java', null)

            expect(result).not.toBeNull()
            expect(result?.range.startLineNumber).toBe(4) // declared on line 4
        })

        it('resolves method definition in the current Java file', () => {
            const javaCode = `
public class MathUtil {
    public int calculate(int x) {
        return x * 2;
    }

    public void test() {
        int val = calculate(5);
    }
}
`
            const model = createMockModel(javaCode)
            // Cursor is on line 8, column 20 (on 'calculate')
            const position = { lineNumber: 8, column: 20 }
            const result = resolveDefinition(model, position, 'java', null)

            expect(result).not.toBeNull()
            expect(result?.range.startLineNumber).toBe(3) // calculate method defined on line 3
        })

        it('resolves cross-file project class navigation and calls onOpenFile', () => {
            // Register another project file
            const helperFile = {
                fileName: 'Helper.java',
                filePath: 'C:/project/Helper.java',
                content: `
package com.demo;
public class Helper {
    public static void doWork() {}
}
`
            }
            updateJavaProjectFiles([helperFile])

            const mainCode = `
public class Main {
    public void run() {
        Helper.doWork();
    }
}
`
            const model = createMockModel(mainCode)
            const onOpenFile = vi.fn()
            const mockMonaco = {
                Uri: {
                    file: (p: string) => ({ toString: () => p, fsPath: p })
                }
            }

            // Cursor on 'Helper' on line 4, col 10
            const position = { lineNumber: 4, column: 10 }
            const result = resolveDefinition(model, position, 'java', mockMonaco, onOpenFile)

            expect(result).not.toBeNull()
            expect(onOpenFile).toHaveBeenCalledWith('C:/project/Helper.java', expect.any(Number), expect.any(Number))
        })
    })

    describe('C / C++ Go to Definition', () => {
        it('resolves C++ function definition in current file', () => {
            const cppCode = `
#include <iostream>

int computeFactorial(int n) {
    if (n <= 1) return 1;
    return n * computeFactorial(n - 1);
}

int main() {
    int ans = computeFactorial(5);
    return 0;
}
`
            const model = createMockModel(cppCode, 'file:///src/main.cpp')
            // Cursor on computeFactorial in main() on line 10, col 16
            const position = { lineNumber: 10, column: 16 }
            const result = resolveDefinition(model, position, 'cpp', null)

            expect(result).not.toBeNull()
            expect(result?.range.startLineNumber).toBe(4) // declared on line 4
        })

        it('resolves struct/class declaration in C++', () => {
            const cppCode = `
struct Node {
    int val;
    Node* next;
};

int main() {
    Node* head = nullptr;
    return 0;
}
`
            const model = createMockModel(cppCode, 'file:///src/main.cpp')
            // Cursor on 'Node' on line 8, col 6
            const position = { lineNumber: 8, column: 6 }
            const result = resolveDefinition(model, position, 'cpp', null)

            expect(result).not.toBeNull()
            expect(result?.range.startLineNumber).toBe(2) // struct Node on line 2
        })

        it('handles #include header jump with onOpenFile', () => {
            const cppCode = `
#include "myheader.h"

int main() {
    return 0;
}
`
            const model = createMockModel(cppCode, 'file:///src/main.cpp')
            const onOpenFile = vi.fn()
            const position = { lineNumber: 2, column: 12 }
            resolveDefinition(model, position, 'cpp', null, onOpenFile)

            expect(onOpenFile).toHaveBeenCalledWith('myheader.h', 1, 1)
        })
    })

    describe('Find Symbol References', () => {
        it('finds all occurrences of a variable in the file', () => {
            const code = `
int counter = 0;
counter++;
if (counter > 5) {
    counter = 0;
}
`
            const model = createMockModel(code)
            const position = { lineNumber: 2, column: 6 } // on counter
            const references = findSymbolReferences(model, position, 'cpp')

            expect(references.length).toBe(4)
            expect(references[0].range.startLineNumber).toBe(2)
            expect(references[1].range.startLineNumber).toBe(3)
            expect(references[2].range.startLineNumber).toBe(4)
            expect(references[3].range.startLineNumber).toBe(5)
        })

        it('returns empty array if position is invalid or symbol not found', () => {
            const model = createMockModel('')
            const references = findSymbolReferences(model, { lineNumber: 1, column: 1 }, 'cpp')
            expect(references).toEqual([])
        })
    })
})
