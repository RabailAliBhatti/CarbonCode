import { describe, it, expect } from 'vitest'
import { translateCompileError, applyQuickFix } from '../utils/errorTranslator'
import type { CompileError } from '../utils/parseCompileErrors'

describe('Human-Readable Compiler Error Translator', () => {
    describe('C++ & C Error Translations', () => {
        it('should translate operator<< on std::vector error with friendly advice and loop snippet', () => {
            const error: CompileError = {
                file: 'main.cpp',
                line: 14,
                severity: 'error',
                message: "no match for 'operator<<' (operand types are 'std::ostream' and 'std::vector<int>')",
                raw: "main.cpp:14:15: error: no match for 'operator<<' (operand types are 'std::ostream' {aka 'std::basic_ostream<char>'} and 'std::vector<int>')"
            }

            const translated = translateCompileError(error, undefined, 'cpp')
            expect(translated.category).toBe('Stream Output')
            expect(translated.title).toContain('Cannot print std::vector')
            expect(translated.humanExplanation).toContain('cannot be passed directly to')
            expect(translated.codeSnippet?.good).toContain('for (const auto& item : myVector)')
            expect(translated.quickFix).toBeDefined()
            expect(translated.quickFix?.type).toBe('insert_code')
        })

        it('should translate missing iostream header for cout/cin/endl', () => {
            const error: CompileError = {
                file: 'main.cpp',
                line: 5,
                severity: 'error',
                message: "'cout' was not declared in this scope",
                raw: "main.cpp:5:5: error: 'cout' was not declared in this scope"
            }

            const translated = translateCompileError(error, undefined, 'cpp')
            expect(translated.category).toBe('Missing Header')
            expect(translated.title).toContain('<iostream>')
            expect(translated.quickFix?.type).toBe('insert_include')
            expect(translated.quickFix?.includeHeader).toBe('#include <iostream>')
        })

        it('should translate missing vector header', () => {
            const error: CompileError = {
                file: 'main.cpp',
                line: 8,
                severity: 'error',
                message: "'vector' was not declared in this scope",
                raw: "main.cpp:8:5: error: 'vector' was not declared in this scope"
            }

            const translated = translateCompileError(error, undefined, 'cpp')
            expect(translated.category).toBe('Missing Header')
            expect(translated.title).toContain('<vector>')
            expect(translated.quickFix?.includeHeader).toBe('#include <vector>')
        })

        it('should translate missing string header', () => {
            const error: CompileError = {
                file: 'main.cpp',
                line: 10,
                severity: 'error',
                message: "'string' is not a member of 'std'",
                raw: "main.cpp:10:10: error: 'string' is not a member of 'std'"
            }

            const translated = translateCompileError(error, undefined, 'cpp')
            expect(translated.category).toBe('Missing Header')
            expect(translated.title).toContain('<string>')
            expect(translated.quickFix?.includeHeader).toBe('#include <string>')
        })

        it('should translate missing algorithm header for sort or reverse', () => {
            const error: CompileError = {
                file: 'main.cpp',
                line: 12,
                severity: 'error',
                message: "'sort' was not declared in this scope",
                raw: "main.cpp:12:5: error: 'sort' was not declared in this scope"
            }

            const translated = translateCompileError(error, undefined, 'cpp')
            expect(translated.category).toBe('Missing Header')
            expect(translated.title).toContain('<algorithm>')
            expect(translated.quickFix?.includeHeader).toBe('#include <algorithm>')
        })

        it('should translate missing cmath header for sqrt or pow', () => {
            const error: CompileError = {
                file: 'main.cpp',
                line: 7,
                severity: 'error',
                message: "'sqrt' was not declared in this scope",
                raw: "main.cpp:7:18: error: 'sqrt' was not declared in this scope"
            }

            const translated = translateCompileError(error, undefined, 'cpp')
            expect(translated.category).toBe('Missing Header')
            expect(translated.title).toContain('<cmath>')
            expect(translated.quickFix?.includeHeader).toBe('#include <cmath>')
        })

        it('should translate namespace suggestion (did you mean std::cout?)', () => {
            const error: CompileError = {
                file: 'main.cpp',
                line: 6,
                severity: 'error',
                message: "'cout' was not declared in this scope; did you mean 'std::cout'?",
                raw: "main.cpp:6:5: error: 'cout' was not declared in this scope; did you mean 'std::cout'?"
            }

            const translated = translateCompileError(error, undefined, 'cpp')
            expect(translated.category).toBe('Namespace')
            expect(translated.title).toContain('std::')
            expect(translated.quickFix?.title).toContain('using namespace std;')
        })

        it('should translate missing semicolon after struct/class definition', () => {
            const error: CompileError = {
                file: 'main.cpp',
                line: 15,
                severity: 'error',
                message: "expected ';' after struct definition",
                raw: "main.cpp:15:1: error: expected ';' after struct definition"
            }

            const translated = translateCompileError(error, undefined, 'cpp')
            expect(translated.category).toBe('Syntax Error')
            expect(translated.title).toContain('Missing semicolon after class or struct')
            expect(translated.quickFix?.type).toBe('replace_line')
            expect(translated.quickFix?.replacementText).toBe('};')
        })

        it('should translate pointer arrow vs dot operator error', () => {
            const error: CompileError = {
                file: 'main.cpp',
                line: 20,
                severity: 'error',
                message: "base operand of '->' has non-pointer type 'Player'",
                raw: "main.cpp:20:11: error: base operand of '->' has non-pointer type 'Player'"
            }

            const translated = translateCompileError(error, undefined, 'cpp')
            expect(translated.category).toBe('Pointers & Memory')
            expect(translated.title).toContain('dot (.) instead of arrow (->)')
        })

        it('should translate undefined reference to main', () => {
            const error: CompileError = {
                file: null,
                line: 1,
                severity: 'error',
                message: "undefined reference to 'WinMain'",
                raw: "c:/mingw/lib/crt2.o: in function `console_main': undefined reference to `WinMain'"
            }

            const translated = translateCompileError(error, undefined, 'cpp')
            expect(translated.category).toBe('Linker / Entry Point')
            expect(translated.title).toContain('Missing main() function entry point')
            expect(translated.quickFix?.type).toBe('insert_code')
        })

        it('should translate modern standard requirement like std::filesystem', () => {
            const error: CompileError = {
                file: 'main.cpp',
                line: 4,
                severity: 'error',
                message: "'std::filesystem' has not been declared (Requires C++17 or higher. Set C++ Standard to C++17 in the toolbar)",
                raw: "main.cpp:4:10: error: 'std::filesystem' has not been declared"
            }

            const translated = translateCompileError(error, undefined, 'cpp')
            expect(translated.category).toBe('Standard Version')
            expect(translated.title).toContain('Requires C++17')
            expect(translated.quickFix?.type).toBe('set_standard')
            expect(translated.quickFix?.recommendedStandard).toBe('c++17')
        })
    })

    describe('Java Error Translations', () => {
        it('should translate cannot find symbol: class Scanner', () => {
            const error: CompileError = {
                file: 'Main.java',
                line: 5,
                severity: 'error',
                message: 'cannot find symbol',
                raw: 'Main.java:5: error: cannot find symbol\n  symbol:   class Scanner\n  location: class Main'
            }

            const translated = translateCompileError(error, undefined, 'java')
            expect(translated.category).toBe('Imports & Packages')
            expect(translated.title).toContain('Scanner')
            expect(translated.quickFix?.type).toBe('insert_include')
            expect(translated.quickFix?.includeHeader).toBe('import java.util.Scanner;')
        })

        it('should translate cannot find symbol: class ArrayList', () => {
            const error: CompileError = {
                file: 'Main.java',
                line: 7,
                severity: 'error',
                message: 'cannot find symbol',
                raw: 'Main.java:7: error: cannot find symbol\n  symbol:   class ArrayList'
            }

            const translated = translateCompileError(error, undefined, 'java')
            expect(translated.category).toBe('Imports & Packages')
            expect(translated.title).toContain('java.util.*')
            expect(translated.quickFix?.includeHeader).toBe('import java.util.*;')
        })

        it('should translate non-static method in static context', () => {
            const error: CompileError = {
                file: 'Main.java',
                line: 12,
                severity: 'error',
                message: 'non-static method printTotal() cannot be referenced from a static context',
                raw: 'Main.java:12: error: non-static method printTotal() cannot be referenced from a static context'
            }

            const translated = translateCompileError(error, undefined, 'java')
            expect(translated.category).toBe('Static Context')
            expect(translated.title).toContain('Cannot call non-static method from static main()')
        })

        it('should translate public class file name mismatch', () => {
            const error: CompileError = {
                file: 'Test.java',
                line: 1,
                severity: 'error',
                message: 'class Calculator is public, should be declared in a file named Calculator.java',
                raw: 'Test.java:1: error: class Calculator is public, should be declared in a file named Calculator.java'
            }

            const translated = translateCompileError(error, undefined, 'java')
            expect(translated.category).toBe('Imports & Packages')
            expect(translated.title).toContain("Class 'Calculator' name must match file name 'Calculator.java'")
        })

        it('should translate missing return statement', () => {
            const error: CompileError = {
                file: 'Main.java',
                line: 25,
                severity: 'error',
                message: 'missing return statement',
                raw: 'Main.java:25: error: missing return statement'
            }

            const translated = translateCompileError(error, undefined, 'java')
            expect(translated.category).toBe('Syntax Error')
            expect(translated.title).toBe('Missing return statement')
        })
    })

    describe('Python Error Translations', () => {
        it('should translate IndentationError', () => {
            const error: CompileError = {
                file: 'main.py',
                line: 4,
                severity: 'error',
                message: 'IndentationError: expected an indented block after "if" statement on line 3',
                raw: 'IndentationError: expected an indented block'
            }

            const translated = translateCompileError(error, undefined, 'python')
            expect(translated.category).toBe('Python Runtime')
            expect(translated.title).toContain('Indentation error')
        })

        it('should translate TypeError for string and integer concatenation', () => {
            const error: CompileError = {
                file: 'main.py',
                line: 8,
                severity: 'error',
                message: 'TypeError: can only concatenate str (not "int") to str',
                raw: 'TypeError: can only concatenate str (not "int") to str'
            }

            const translated = translateCompileError(error, undefined, 'python')
            expect(translated.category).toBe('Type Mismatch')
            expect(translated.title).toContain('Cannot concatenate string and number with +')
        })

        it('should translate NameError', () => {
            const error: CompileError = {
                file: 'main.py',
                line: 11,
                severity: 'error',
                message: "NameError: name 'total_count' is not defined",
                raw: "NameError: name 'total_count' is not defined"
            }

            const translated = translateCompileError(error, undefined, 'python')
            expect(translated.category).toBe('Python Runtime')
            expect(translated.title).toContain("'total_count' is not defined")
        })

        it('should translate IndexError', () => {
            const error: CompileError = {
                file: 'main.py',
                line: 15,
                severity: 'error',
                message: 'IndexError: list index out of range',
                raw: 'IndexError: list index out of range'
            }

            const translated = translateCompileError(error, undefined, 'python')
            expect(translated.category).toBe('Python Runtime')
            expect(translated.title).toBe('List index out of range')
        })
    })

    describe('applyQuickFix Mechanics', () => {
        it('should insert #include after existing includes', () => {
            const code = `#include <iostream>\n\nint main() {\n    std::vector<int> v;\n    return 0;\n}`
            const result = applyQuickFix({
                id: 'fix-1',
                title: 'Add #include <vector>',
                type: 'insert_include',
                includeHeader: '#include <vector>'
            }, code)

            expect(result.newCode).toBeDefined()
            expect(result.newCode).toContain('#include <iostream>\n#include <vector>')
        })

        it('should not duplicate an existing include', () => {
            const code = `#include <vector>\n\nint main() {}`
            const result = applyQuickFix({
                id: 'fix-1',
                title: 'Add #include <vector>',
                type: 'insert_include',
                includeHeader: '#include <vector>'
            }, code)

            expect(result.newCode).toBeUndefined()
            expect(result.message).toContain('already included')
        })

        it('should insert include at top if no previous includes exist', () => {
            const code = `int main() {\n    return 0;\n}`
            const result = applyQuickFix({
                id: 'fix-1',
                title: 'Add #include <iostream>',
                type: 'insert_include',
                includeHeader: '#include <iostream>'
            }, code)

            expect(result.newCode).toBeDefined()
            expect(result.newCode?.startsWith('#include <iostream>\nint main()')).toBe(true)
        })

        it('should replace line for struct semicolon fix', () => {
            const code = `struct Point {\n    int x;\n    int y;\n}`
            const result = applyQuickFix({
                id: 'fix-semi',
                title: 'Add semicolon',
                type: 'replace_line',
                targetLine: 4,
                replacementText: '};'
            }, code)

            expect(result.newCode).toBeDefined()
            expect(result.newCode?.endsWith('};')).toBe(true)
        })
    })
})

