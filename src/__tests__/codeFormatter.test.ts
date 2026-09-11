import { describe, it, expect } from 'vitest'
import { formatDocument, formatJavaCode, formatCppCode } from '../utils/codeFormatter'

describe('Code Formatter', () => {
    describe('formatJavaCode', () => {
        it('formats simple class and method with proper 4-space indentation', () => {
            const unformatted = `
public class Calculator {
public int add(int a, int b) {
return a + b;
}
}
`
            const formatted = formatJavaCode(unformatted, 4)
            expect(formatted).toContain('public class Calculator {')
            expect(formatted).toContain('    public int add(int a, int b) {')
            expect(formatted).toContain('        return a + b;')
            expect(formatted).toContain('    }')
            expect(formatted).toContain('}')
        })

        it('reformats standalone opening braces into K&R style', () => {
            const unformatted = `
public class Test
{
public void run()
{
if(true)
{
System.out.println("Hello");
}
}
}
`
            const formatted = formatJavaCode(unformatted, 4)
            expect(formatted).toContain('public class Test {')
            expect(formatted).toContain('    public void run() {')
            expect(formatted).toContain('        if (true) {')
            expect(formatted).toContain('            System.out.println("Hello");')
        })

        it('normalizes spaces after control keywords', () => {
            const unformatted = `
public class LoopTest {
    public void loop() {
        for(int i = 0; i < 10; i++) {
            while(i > 0) {
                if(i == 5) break;
            }
        }
    }
}
`
            const formatted = formatJavaCode(unformatted, 4)
            expect(formatted).toContain('for (int i = 0; i < 10; i++) {')
            expect(formatted).toContain('while (i > 0) {')
            expect(formatted).toContain('if (i == 5) break;')
        })

        it('preserves multi-line block comments and string literals without destroying braces', () => {
            const codeWithBracesInStrings = `
public class StringTest {
    public void test() {
        String s = "Curly { brace } in string";
        // comment with { brace }
    }
}
`
            const formatted = formatJavaCode(codeWithBracesInStrings, 4)
            expect(formatted).toContain('String s = "Curly { brace } in string";')
            expect(formatted).toContain('// comment with { brace }')
            expect(formatted.endsWith('}\n')).toBe(true)
        })

        it('limits excessive blank lines to at most one', () => {
            const excessiveBlankLines = `
public class BlankTest {



    public void test() {

        int x = 1;

    }
}
`
            const formatted = formatJavaCode(excessiveBlankLines, 4)
            expect(formatted).not.toContain('\n\n\n')
        })
    })

    describe('formatCppCode', () => {
        it('keeps preprocessor directives at column 1', () => {
            const unformatted = `
    #include <iostream>
    #include <vector>
    #define MAX_VAL 100

int main() {
std::cout << "Hello World" << std::endl;
return 0;
}
`
            const formatted = formatCppCode(unformatted, 4)
            expect(formatted).toContain('#include <iostream>')
            expect(formatted).toContain('#include <vector>')
            expect(formatted).toContain('#define MAX_VAL 100')
            expect(formatted).toContain('int main() {')
            expect(formatted).toContain('    std::cout << "Hello World" << std::endl;')
            expect(formatted).toContain('    return 0;')
        })

        it('handles class access specifiers properly', () => {
            const cppClass = `
class Student {
public:
Student();
~Student();
private:
std::string name;
int age;
};
`
            const formatted = formatCppCode(cppClass, 4)
            expect(formatted).toContain('class Student {')
            expect(formatted).toContain('public:')
            expect(formatted).toContain('    Student();')
            expect(formatted).toContain('private:')
            expect(formatted).toContain('    std::string name;')
            expect(formatted).toContain('};')
        })

        it('handles switch case statements', () => {
            const switchCode = `
int test(int x) {
switch (x) {
case 1:
return 10;
case 2:
return 20;
default:
return 0;
}
}
`
            const formatted = formatCppCode(switchCode, 4)
            expect(formatted).toContain('switch (x) {')
            expect(formatted).toContain('    case 1:')
            expect(formatted).toContain('    default:')
        })
    })

    describe('formatDocument dispatcher', () => {
        it('dispatches to java or cpp depending on language', () => {
            const javaCode = 'public class A {\npublic void m() {\n}\n}'
            const formattedJava = formatDocument(javaCode, 'java', 4)
            expect(formattedJava).toContain('    public void m() {')

            const cppCode = '#include <stdio.h>\nint main() {\nreturn 0;\n}'
            const formattedCpp = formatDocument(cppCode, 'cpp', 4)
            expect(formattedCpp).toContain('    return 0;')
        })

        it('returns original if content is empty', () => {
            expect(formatDocument('', 'java')).toBe('')
            expect(formatDocument('   ', 'cpp')).toBe('   ')
        })
    })
})
