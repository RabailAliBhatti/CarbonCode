import { describe, it, expect, beforeEach } from 'vitest'
import {
    parseJavaFileSymbols,
    updateJavaProjectFiles,
    getAllProjectSymbols,
    getJavaCompletionItems,
    JAVA_STANDARD_PACKAGES,
    JAVA_STATIC_MEMBERS,
    JAVA_ALL_CLASS_IMPORTS
} from '../utils/javaIntellisense'

// Mock Monaco environment for completion tests
const mockMonaco = {
    languages: {
        CompletionItemKind: {
            Class: 1,
            Method: 2,
            Field: 3,
            Constructor: 4,
            Module: 5,
            Keyword: 6,
            Snippet: 7,
            Interface: 8,
            Enum: 9
        },
        CompletionItemInsertTextRule: {
            InsertAsSnippet: 4
        }
    }
}

function createMockModel(content: string) {
    const lines = content.split('\n')
    return {
        getValue: () => content,
        getLineContent: (lineNumber: number) => lines[lineNumber - 1] || '',
        getValueInRange: (range: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number }) => {
            const line = lines[range.endLineNumber - 1] || ''
            return line.substring(range.startColumn - 1, range.endColumn - 1)
        },
        getWordUntilPosition: (position: { lineNumber: number; column: number }) => {
            const line = lines[position.lineNumber - 1] || ''
            const textBefore = line.substring(0, position.column - 1)
            const match = textBefore.match(/([a-zA-Z0-9_]*)$/)
            const word = match ? match[1] : ''
            return {
                word,
                startColumn: position.column - word.length,
                endColumn: position.column
            }
        }
    }
}

describe('Java IntelliSense Engine', () => {
    beforeEach(() => {
        updateJavaProjectFiles([])
    })

    describe('1. Java AST / Symbol Parser', () => {
        it('should parse class declarations, constructors, methods, and fields', () => {
            const code = `
                package com.example.model;

                public class Student {
                    public static final String UNIVERSITY = "Carbon University";
                    private String name;
                    private int id;

                    public Student(String name, int id) {
                        this.name = name;
                        this.id = id;
                    }

                    public Student() {
                        this("Unknown", 0);
                    }

                    public static Student createGuest() {
                        return new Student();
                    }

                    public String getName() {
                        return name;
                    }

                    public void setId(int id) {
                        this.id = id;
                    }
                }
            `

            const symbols = parseJavaFileSymbols(code, 'Student.java', '/path/to/Student.java')
            expect(symbols).toHaveLength(1)

            const student = symbols[0]
            expect(student.name).toBe('Student')
            expect(student.kind).toBe('class')
            expect(student.packageName).toBe('com.example.model')
            expect(student.fileName).toBe('Student.java')

            // Constructors
            expect(student.constructors).toHaveLength(2)
            expect(student.constructors[0].params).toEqual([
                { type: 'String', name: 'name' },
                { type: 'int', name: 'id' }
            ])
            expect(student.constructors[1].params).toHaveLength(0)

            // Methods
            expect(student.methods).toHaveLength(3)
            const staticMethod = student.methods.find(m => m.name === 'createGuest')
            expect(staticMethod).toBeDefined()
            expect(staticMethod?.isStatic).toBe(true)

            const getName = student.methods.find(m => m.name === 'getName')
            expect(getName?.returnType).toBe('String')
            expect(getName?.isStatic).toBe(false)

            // Fields
            expect(student.fields).toHaveLength(3)
            const uniField = student.fields.find(f => f.name === 'UNIVERSITY')
            expect(uniField?.isStatic).toBe(true)
            expect(uniField?.isFinal).toBe(true)
        })

        it('should parse records, interfaces, and enums', () => {
            const code = `
                public interface Greeter {
                    void greet(String target);
                }

                public enum Status {
                    ACTIVE, INACTIVE
                }

                public record Point(int x, int y) {
                }
            `

            const symbols = parseJavaFileSymbols(code, 'Types.java')
            expect(symbols).toHaveLength(3)

            const iface = symbols.find(s => s.name === 'Greeter')
            expect(iface?.kind).toBe('interface')

            const en = symbols.find(s => s.name === 'Status')
            expect(en?.kind).toBe('enum')

            const rec = symbols.find(s => s.name === 'Point')
            expect(rec?.kind).toBe('record')
        })
    })

    describe('2. Multi-File Project Indexing', () => {
        it('should index multiple project files and retrieve all symbols', () => {
            updateJavaProjectFiles([
                {
                    fileName: 'Student.java',
                    content: 'public class Student { public void study() {} }'
                },
                {
                    fileName: 'Calculator.java',
                    content: 'public class Calculator { public static int add(int a, int b) { return a + b; } }'
                }
            ])

            const allSymbols = getAllProjectSymbols()
            expect(allSymbols).toHaveLength(2)
            expect(allSymbols.map(s => s.name)).toContain('Student')
            expect(allSymbols.map(s => s.name)).toContain('Calculator')
        })
    })

    describe('3. Library & Package Completions (import statements)', () => {
        it('should suggest root packages when typing "import "', () => {
            const code = 'import '
            const model = createMockModel(code)
            const position = { lineNumber: 1, column: 8 }

            const { suggestions } = getJavaCompletionItems(model, position, mockMonaco)
            const labels = suggestions.map(s => s.label)

            expect(labels).toContain('java')
            expect(labels).toContain('javax')
            expect(labels).toContain('org')
        })

        it('should suggest subpackages when typing "import java."', () => {
            const code = 'import java.'
            const model = createMockModel(code)
            const position = { lineNumber: 1, column: 13 }

            const { suggestions } = getJavaCompletionItems(model, position, mockMonaco)
            const labels = suggestions.map(s => s.label)

            expect(labels).toContain('util')
            expect(labels).toContain('io')
            expect(labels).toContain('time')
            expect(labels).toContain('net')
        })

        it('should suggest standard classes and subpackages when typing "import java.util."', () => {
            const code = 'import java.util.'
            const model = createMockModel(code)
            const position = { lineNumber: 1, column: 18 }

            const { suggestions } = getJavaCompletionItems(model, position, mockMonaco)
            const labels = suggestions.map(s => s.label)

            // Classes
            expect(labels).toContain('Scanner')
            expect(labels).toContain('ArrayList')
            expect(labels).toContain('HashMap')
            expect(labels).toContain('List')
            expect(labels).toContain('Map')
            expect(labels).toContain('Collections')
            expect(labels).toContain('Arrays')
            // Wildcard
            expect(labels).toContain('*')
            // Subpackages
            expect(labels).toContain('concurrent')
            expect(labels).toContain('stream')
        })

        it('should filter suggestions when typing partial class "import java.util.Sc"', () => {
            const code = 'import java.util.Sc'
            const model = createMockModel(code)
            const position = { lineNumber: 1, column: 20 }

            const { suggestions } = getJavaCompletionItems(model, position, mockMonaco)
            const labels = suggestions.map(s => s.label)

            expect(labels).toContain('Scanner')
            expect(labels).not.toContain('ArrayList')
            expect(labels).not.toContain('HashMap')
        })

        it('should suggest project packages when imported across files', () => {
            updateJavaProjectFiles([
                {
                    fileName: 'OrderService.java',
                    content: 'package com.shop.service;\npublic class OrderService {}'
                }
            ])

            const code = 'import com.shop.service.'
            const model = createMockModel(code)
            const position = { lineNumber: 1, column: 25 }

            const { suggestions } = getJavaCompletionItems(model, position, mockMonaco)
            const labels = suggestions.map(s => s.label)

            expect(labels).toContain('OrderService')
        })
    })

    describe('4. Dot Member Completions', () => {
        it('should provide static members for System.out', () => {
            const code = 'System.out.'
            const model = createMockModel(code)
            const position = { lineNumber: 1, column: 12 }

            const { suggestions } = getJavaCompletionItems(model, position, mockMonaco)
            const labels = suggestions.map(s => s.label)

            expect(labels).toContain('println')
            expect(labels).toContain('print')
            expect(labels).toContain('printf')
        })

        it('should provide static methods for Math.', () => {
            const code = 'Math.'
            const model = createMockModel(code)
            const position = { lineNumber: 1, column: 6 }

            const { suggestions } = getJavaCompletionItems(model, position, mockMonaco)
            const labels = suggestions.map(s => s.label)

            expect(labels).toContain('sqrt')
            expect(labels).toContain('max')
            expect(labels).toContain('min')
            expect(labels).toContain('PI')
        })

        it('should provide static members for multi-file project classes', () => {
            updateJavaProjectFiles([
                {
                    fileName: 'Calculator.java',
                    content: `
                        public class Calculator {
                            public static final double PI = 3.14159;
                            public static int add(int a, int b) { return a + b; }
                            public int multiply(int a, int b) { return a * b; }
                        }
                    `
                }
            ])

            const code = 'Calculator.'
            const model = createMockModel(code)
            const position = { lineNumber: 1, column: 12 }

            const { suggestions } = getJavaCompletionItems(model, position, mockMonaco)
            const labels = suggestions.map(s => s.label)

            expect(labels).toContain('add')
            expect(labels).toContain('PI')
            // multiply is non-static, shouldn't be in Calculator. static list
            expect(labels).not.toContain('multiply')
        })
    })

    describe('5. Multi-File Instantiation Suggestions (new ...)', () => {
        it('should suggest constructors for project classes with parameter placeholders', () => {
            updateJavaProjectFiles([
                {
                    fileName: 'User.java',
                    content: 'public class User { public User(String username, String email) {} }'
                }
            ])

            const code = 'User u = new '
            const model = createMockModel(code)
            const position = { lineNumber: 1, column: 14 }

            const { suggestions } = getJavaCompletionItems(model, position, mockMonaco)
            const userCtor = suggestions.find(s => s.label.startsWith('User('))

            expect(userCtor).toBeDefined()
            expect(userCtor?.insertText).toBe('User(${1:username}, ${2:email})')
            expect(userCtor?.detail).toContain('Project Constructor • User.java')
        })

        it('should suggest standard library constructors like Scanner(System.in) and ArrayList<>()', () => {
            const code = 'new '
            const model = createMockModel(code)
            const position = { lineNumber: 1, column: 5 }

            const { suggestions } = getJavaCompletionItems(model, position, mockMonaco)
            const labels = suggestions.map(s => s.label)

            expect(labels).toContain('Scanner(System.in)')
            expect(labels).toContain('ArrayList<>()')
            expect(labels).toContain('HashMap<>()')
        })
    })

    describe('6. General Completions & Snippets', () => {
        it('should suggest project classes in general code scope', () => {
            updateJavaProjectFiles([
                {
                    fileName: 'DatabaseHelper.java',
                    content: 'public class DatabaseHelper {}'
                }
            ])

            const code = 'Data'
            const model = createMockModel(code)
            const position = { lineNumber: 1, column: 5 }

            const { suggestions } = getJavaCompletionItems(model, position, mockMonaco)
            const dbHelper = suggestions.find(s => s.label === 'DatabaseHelper')

            expect(dbHelper).toBeDefined()
            expect(dbHelper?.detail).toBe('Project class • DatabaseHelper.java')
        })

        it('should include common productive snippets like psvm and sout', () => {
            const code = ''
            const model = createMockModel(code)
            const position = { lineNumber: 1, column: 1 }

            const { suggestions } = getJavaCompletionItems(model, position, mockMonaco)
            const labels = suggestions.map(s => s.label)

            expect(labels).toContain('psvm')
            expect(labels).toContain('sout')
            expect(labels).toContain('scanner-input')
        })
    })

    describe('7. Import Registry Coverage', () => {
        it('should have standard library classes mapped to their correct packages', () => {
            expect(JAVA_ALL_CLASS_IMPORTS['Scanner']).toBe('java.util.Scanner')
            expect(JAVA_ALL_CLASS_IMPORTS['ArrayList']).toBe('java.util.ArrayList')
            expect(JAVA_ALL_CLASS_IMPORTS['Files']).toBe('java.nio.file.Files')
            expect(JAVA_ALL_CLASS_IMPORTS['LocalDate']).toBe('java.time.LocalDate')
            expect(JAVA_ALL_CLASS_IMPORTS['CompletableFuture']).toBe('java.util.concurrent.CompletableFuture')
        })
    })
})
