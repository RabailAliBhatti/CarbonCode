import { describe, it, expect } from 'vitest'
import {
    extractPythonLocalSymbols,
    getPythonBuiltinCompletions,
    getPythonModuleCompletions,
    getPythonSnippets,
    getPostImportCompletions
} from '../utils/pythonIntellisense'
import { formatPythonCode } from '../utils/codeFormatter'
import { parseCompileErrors } from '../utils/parseCompileErrors'
import { resolveDefinition } from '../utils/symbolNavigation'

describe('Python IntelliSense Engine', () => {
    describe('Local Symbol Extraction', () => {
        it('should extract variables assigned with =', () => {
            const code = `
x = 10
user_name = "Alice"
count: int = 5
total, status = 100, True
`
            const { variables } = extractPythonLocalSymbols(code)
            const names = variables.map(v => v.name)
            expect(names).toContain('x')
            expect(names).toContain('user_name')
            expect(names).toContain('count')
            expect(names).toContain('total')
            expect(names).toContain('status')
        })

        it('should extract function definitions and their parameters', () => {
            const code = `
def calculate_sum(a, b=0):
    return a + b

def greet(name: str) -> str:
    return f"Hello, {name}"
`
            const { functions, variables } = extractPythonLocalSymbols(code)
            expect(functions.map(f => f.name)).toEqual(['calculate_sum', 'greet'])
            expect(functions[0].params).toEqual(['a', 'b'])
            expect(functions[1].params).toEqual(['name'])

            // Parameters should also be available as variables
            const varNames = variables.map(v => v.name)
            expect(varNames).toContain('a')
            expect(varNames).toContain('b')
            expect(varNames).toContain('name')
        })

        it('should extract class definitions and base classes', () => {
            const code = `
class Animal:
    pass

class Dog(Animal):
    def bark(self):
        print("Woof")
`
            const { classes } = extractPythonLocalSymbols(code)
            expect(classes.map(c => c.name)).toEqual(['Animal', 'Dog'])
            expect(classes[1].baseClasses).toEqual(['Animal'])
        })

        it('should extract loop, with, and except variables', () => {
            const code = `
for i in range(10):
    pass

for key, val in mapping.items():
    pass

with open("test.txt") as f:
    pass

try:
    1 / 0
except ZeroDivisionError as err:
    pass
`
            const { variables } = extractPythonLocalSymbols(code)
            const names = variables.map(v => v.name)
            expect(names).toContain('i')
            expect(names).toContain('key')
            expect(names).toContain('val')
            expect(names).toContain('f')
            expect(names).toContain('err')
        })
    })

    describe('Builtin Completions', () => {
        it('should provide standard built-ins with documentation', () => {
            const builtins = getPythonBuiltinCompletions()
            expect(builtins.length).toBeGreaterThan(60)

            const labels = builtins.map(b => b.label)
            expect(labels).toContain('print')
            expect(labels).toContain('len')
            expect(labels).toContain('range')
            expect(labels).toContain('enumerate')
            expect(labels).toContain('zip')
            expect(labels).toContain('input')
            expect(labels).toContain('int')
            expect(labels).toContain('str')
            expect(labels).toContain('dict')
            expect(labels).toContain('ValueError')
            expect(labels).toContain('True')
            expect(labels).toContain('None')

            // All built-ins should have documentation
            for (const item of builtins) {
                expect(item.documentation).toBeTruthy()
                expect(item.detail).toBeTruthy()
            }
        })
    })

    describe('Standard Library Modules', () => {
        it('should provide popular standard library modules', () => {
            const modules = getPythonModuleCompletions()
            expect(modules.length).toBeGreaterThan(25)

            const labels = modules.map(m => m.label)
            expect(labels).toContain('os')
            expect(labels).toContain('sys')
            expect(labels).toContain('math')
            expect(labels).toContain('json')
            expect(labels).toContain('re')
            expect(labels).toContain('random')
            expect(labels).toContain('datetime')
            expect(labels).toContain('collections')
        })

        it('should provide member completions for common modules', () => {
            const osMembers = getPostImportCompletions('os')
            const osLabels = osMembers.map(m => m.label)
            expect(osLabels).toContain('path')
            expect(osLabels).toContain('getcwd')
            expect(osLabels).toContain('environ')

            const mathMembers = getPostImportCompletions('math')
            const mathLabels = mathMembers.map(m => m.label)
            expect(mathLabels).toContain('pi')
            expect(mathLabels).toContain('sqrt')
            expect(mathLabels).toContain('sin')
        })
    })

    describe('Snippets', () => {
        it('should provide essential Python snippets', () => {
            const snippets = getPythonSnippets()
            const labels = snippets.map(s => s.label)
            expect(labels).toContain('def')
            expect(labels).toContain('class')
            expect(labels).toContain('main')
            expect(labels).toContain('for')
            expect(labels).toContain('try')
            expect(labels).toContain('with')
            expect(labels).toContain('prop')
        })
    })
})

describe('Python Code Formatter', () => {
    it('should format unindented Python code with 4 spaces', () => {
        const messy = `
def hello():
  print("Hello")
  if True:
    print("Indented")
`
        const formatted = formatPythonCode(messy)
        expect(formatted).toContain('    print("Hello")')
        expect(formatted).toContain('        print("Indented")')
    })

    it('should add spacing after commas outside strings', () => {
        const messy = `x = [1,2,3,"a,b",4]`
        const formatted = formatPythonCode(messy)
        expect(formatted).toContain('[1, 2, 3, "a,b", 4]')
    })

    it('should ensure two blank lines before top-level functions', () => {
        const code = `
x = 10
def first():
    pass
def second():
    pass
`
        const formatted = formatPythonCode(code)
        expect(formatted).toContain('\n\n\ndef first():')
    })
})

describe('Python Traceback & Error Parsing', () => {
    it('should parse standard single-frame Python traceback', () => {
        const raw = `
Traceback (most recent call last):
  File "main.py", line 5, in <module>
    x = int("hello")
ValueError: invalid literal for int() with base 10: 'hello'
`
        const errors = parseCompileErrors(raw)
        expect(errors.length).toBe(1)
        expect(errors[0].file).toBe('main.py')
        expect(errors[0].line).toBe(5)
        expect(errors[0].code).toBe('ValueError')
        expect(errors[0].message).toContain('invalid literal for int()')
        expect(errors[0].severity).toBe('error')
    })

    it('should parse Python SyntaxError with carets', () => {
        const raw = `
  File "script.py", line 14
    def broken(
              ^
SyntaxError: unexpected EOF while parsing
`
        const errors = parseCompileErrors(raw)
        expect(errors.length).toBe(1)
        expect(errors[0].file).toBe('script.py')
        expect(errors[0].line).toBe(14)
        expect(errors[0].code).toBe('SyntaxError')
        expect(errors[0].severity).toBe('error')
    })

    it('should parse multi-frame call stacks and identify innermost error frame', () => {
        const raw = `
Traceback (most recent call last):
  File "app.py", line 12, in run
    do_work()
  File "worker.py", line 8, in do_work
    1 / 0
ZeroDivisionError: division by zero
`
        const errors = parseCompileErrors(raw)
        expect(errors.length).toBe(2)
        // Innermost frame
        expect(errors[0].file).toBe('worker.py')
        expect(errors[0].line).toBe(8)
        expect(errors[0].code).toBe('ZeroDivisionError')
        expect(errors[0].message).toBe('ZeroDivisionError: division by zero')

        // Caller frame
        expect(errors[1].file).toBe('app.py')
        expect(errors[1].line).toBe(12)
        expect(errors[1].message).toContain('called from run')
    })
})

describe('Python Go to Definition Resolution', () => {
    it('should resolve function definitions in Python', () => {
        const content = `
def calculate_area(radius):
    return 3.14 * radius * radius

area = calculate_area(5)
`
        const mockModel = {
            getValue: () => content,
            getWordAtPosition: () => ({ word: 'calculate_area' }),
            getLineContent: () => 'area = calculate_area(5)',
            uri: 'file:///main.py'
        }

        const res = resolveDefinition(mockModel, { lineNumber: 5, column: 10 }, 'python', {})
        expect(res).not.toBeNull()
        expect(res?.range.startLineNumber).toBe(2)
    })

    it('should resolve class definitions in Python', () => {
        const content = `
class DatabaseConnection:
    pass

db = DatabaseConnection()
`
        const mockModel = {
            getValue: () => content,
            getWordAtPosition: () => ({ word: 'DatabaseConnection' }),
            getLineContent: () => 'db = DatabaseConnection()',
            uri: 'file:///main.py'
        }

        const res = resolveDefinition(mockModel, { lineNumber: 5, column: 8 }, 'python', {})
        expect(res).not.toBeNull()
        expect(res?.range.startLineNumber).toBe(2)
    })
})
