import type { CompileError } from './parseCompileErrors'

export interface QuickFixAction {
    id: string
    title: string
    description?: string
    type: 'insert_include' | 'replace_line' | 'insert_code' | 'set_standard'
    includeHeader?: string
    insertText?: string
    insertPosition?: 'top' | 'after_includes' | 'at_line' | 'end_of_file'
    targetLine?: number
    replacementText?: string
    recommendedStandard?: string
}

export interface TranslatedError {
    originalError: CompileError
    category: 'Stream Output' | 'Missing Header' | 'Namespace' | 'Syntax Error' | 'Pointers & Memory' | 'Linker / Entry Point' | 'Standard Version' | 'Type Mismatch' | 'Imports & Packages' | 'Static Context' | 'Python Runtime' | 'General'
    title: string
    humanExplanation: string
    cause: string
    fixTip: string
    codeSnippet?: {
        bad?: string
        good: string
        description?: string
    }
    quickFix?: QuickFixAction
}

interface ErrorPatternRule {
    category: TranslatedError['category']
    languages?: Array<'cpp' | 'c' | 'java' | 'python'>
    match: (msg: string, raw: string, err: CompileError) => boolean
    translate: (msg: string, raw: string, err: CompileError, code?: string) => Omit<TranslatedError, 'originalError'>
}

const ERROR_RULES: ErrorPatternRule[] = [
    // -------------------------------------------------------------------------
    // C++ / C: Operator << on STL Containers (vector, pair, map, etc.)
    // -------------------------------------------------------------------------
    {
        category: 'Stream Output',
        languages: ['cpp'],
        match: (msg, raw) =>
            (msg.includes("no match for 'operator<<'") || raw.includes("no match for 'operator<<'")) &&
            (msg.includes('vector') || msg.includes('pair') || msg.includes('map') || msg.includes('list') || msg.includes('deque') || msg.includes('set') || raw.includes('std::vector') || raw.includes('std::pair')),
        translate: (_msg, _raw, err) => ({
            category: 'Stream Output',
            title: 'Cannot print std::vector or container directly with cout',
            humanExplanation: "In C++, standard containers like 'std::vector' or 'std::pair' cannot be passed directly to 'std::cout <<'. C++ does not provide a default stream operator for containers.",
            cause: "You wrote 'cout << myVector;' or similar directly on an entire collection.",
            fixTip: "Iterate through the elements with a range-based for loop, or access individual items by index (e.g. 'myVector[0]').",
            codeSnippet: {
                bad: 'std::cout << myVector; // Error!',
                good: 'for (const auto& item : myVector) {\n    std::cout << item << " ";\n}\nstd::cout << std::endl;',
                description: 'Print individual elements in a loop'
            },
            quickFix: {
                id: 'fix-print-vector',
                title: 'Wrap in range-based for loop',
                type: 'insert_code',
                insertPosition: 'at_line',
                targetLine: err.line,
                insertText: 'for (const auto& item : /* your_vector */) {\n    std::cout << item << " ";\n}\nstd::cout << std::endl;'
            }
        })
    },

    // -------------------------------------------------------------------------
    // C++ / C: Missing <iostream> (cout, cin, endl)
    // -------------------------------------------------------------------------
    {
        category: 'Missing Header',
        languages: ['cpp'],
        match: (msg) =>
            (msg.includes("'cout' was not declared") || msg.includes("'cin' was not declared") || msg.includes("'endl' was not declared")) &&
            !msg.includes('std::cout'),
        translate: () => ({
            category: 'Missing Header',
            title: 'Missing <iostream> header for input/output',
            humanExplanation: "'cout', 'cin', and 'endl' are defined inside the standard C++ I/O library header '<iostream>'. The compiler doesn't know what they are yet.",
            cause: "The '<iostream>' library has not been included at the top of the file, or the 'std::' prefix is missing.",
            fixTip: "Add '#include <iostream>' at the top of your file, and make sure to use 'std::cout' or 'using namespace std;'.",
            codeSnippet: {
                good: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}'
            },
            quickFix: {
                id: 'fix-include-iostream',
                title: 'Add #include <iostream>',
                type: 'insert_include',
                includeHeader: '#include <iostream>'
            }
        })
    },

    // -------------------------------------------------------------------------
    // C++ / C: Missing <vector>
    // -------------------------------------------------------------------------
    {
        category: 'Missing Header',
        languages: ['cpp'],
        match: (msg) =>
            msg.includes("'vector' was not declared") || msg.includes("'vector' is not a member of 'std'") || (msg.includes("vector") && msg.includes("does not name a type")),
        translate: () => ({
            category: 'Missing Header',
            title: 'Missing <vector> header for dynamic arrays',
            humanExplanation: "'std::vector' is C++'s dynamic resizable array, declared inside '<vector>'. Without this include, the compiler does not recognize the type.",
            cause: "You used 'vector<int>' without including '<vector>'.",
            fixTip: "Add '#include <vector>' to the top of the file.",
            codeSnippet: {
                good: '#include <vector>\n\nstd::vector<int> numbers = {1, 2, 3, 4, 5};'
            },
            quickFix: {
                id: 'fix-include-vector',
                title: 'Add #include <vector>',
                type: 'insert_include',
                includeHeader: '#include <vector>'
            }
        })
    },

    // -------------------------------------------------------------------------
    // C++ / C: Missing <string>
    // -------------------------------------------------------------------------
    {
        category: 'Missing Header',
        languages: ['cpp'],
        match: (msg) =>
            msg.includes("'string' was not declared") || msg.includes("'string' is not a member of 'std'"),
        translate: () => ({
            category: 'Missing Header',
            title: 'Missing <string> header for std::string',
            humanExplanation: "In C++, modern string objects require the '<string>' standard header. (Note: '<string.h>' is the older C library for char pointers).",
            cause: "You used 'string' or 'std::string' without including '<string>'.",
            fixTip: "Add '#include <string>' at the top of your file.",
            codeSnippet: {
                good: '#include <string>\n\nstd::string message = "Hello from CarbonCode!";'
            },
            quickFix: {
                id: 'fix-include-string',
                title: 'Add #include <string>',
                type: 'insert_include',
                includeHeader: '#include <string>'
            }
        })
    },

    // -------------------------------------------------------------------------
    // C++ / C: Missing <algorithm> (sort, reverse, min, max, find)
    // -------------------------------------------------------------------------
    {
        category: 'Missing Header',
        languages: ['cpp'],
        match: (msg) =>
            msg.includes("'sort' was not declared") || msg.includes("'reverse' was not declared") || msg.includes("'min' was not declared") || msg.includes("'max' was not declared") || msg.includes("'find' was not declared"),
        translate: () => ({
            category: 'Missing Header',
            title: 'Missing <algorithm> header',
            humanExplanation: "Standard utility functions like 'std::sort()', 'std::reverse()', 'std::min()', and 'std::max()' are located in the '<algorithm>' header.",
            cause: "Calling standard algorithms without the '<algorithm>' include.",
            fixTip: "Add '#include <algorithm>' to the top of your source file.",
            codeSnippet: {
                good: '#include <algorithm>\n#include <vector>\n\nstd::sort(numbers.begin(), numbers.end());'
            },
            quickFix: {
                id: 'fix-include-algorithm',
                title: 'Add #include <algorithm>',
                type: 'insert_include',
                includeHeader: '#include <algorithm>'
            }
        })
    },

    // -------------------------------------------------------------------------
    // C++ / C: Missing <cmath> / <math.h> (sqrt, pow, abs, sin, cos)
    // -------------------------------------------------------------------------
    {
        category: 'Missing Header',
        languages: ['cpp', 'c'],
        match: (msg) =>
            msg.includes("'sqrt' was not declared") || msg.includes("'pow' was not declared") || msg.includes("'sin' was not declared") || msg.includes("'cos' was not declared") || msg.includes("'floor' was not declared") || msg.includes("'ceil' was not declared"),
        translate: () => ({
            category: 'Missing Header',
            title: 'Missing <cmath> header for math functions',
            humanExplanation: "Mathematical calculations (square root, power, trigonometry) are provided by '<cmath>' (in C++) or '<math.h>' (in C).",
            cause: "You called a math function like 'sqrt()' or 'pow()' without including math headers.",
            fixTip: "Add '#include <cmath>' at the top of your file.",
            codeSnippet: {
                good: '#include <cmath>\n\ndouble result = std::sqrt(144.0); // 12.0'
            },
            quickFix: {
                id: 'fix-include-cmath',
                title: 'Add #include <cmath>',
                type: 'insert_include',
                includeHeader: '#include <cmath>'
            }
        })
    },

    // -------------------------------------------------------------------------
    // C++ / C: Missing <map> or <unordered_map>
    // -------------------------------------------------------------------------
    {
        category: 'Missing Header',
        languages: ['cpp'],
        match: (msg) =>
            msg.includes("'map' was not declared") || msg.includes("'unordered_map' was not declared"),
        translate: () => ({
            category: 'Missing Header',
            title: 'Missing <map> header for associative containers',
            humanExplanation: "Key-value dictionaries and hash maps require '#include <map>' or '#include <unordered_map>'.",
            cause: "You used 'map<Key, Value>' without including the container definition.",
            fixTip: "Add '#include <map>' at the top of your file.",
            codeSnippet: {
                good: '#include <map>\n\nstd::map<std::string, int> ages;\nages["Alice"] = 24;'
            },
            quickFix: {
                id: 'fix-include-map',
                title: 'Add #include <map>',
                type: 'insert_include',
                includeHeader: '#include <map>'
            }
        })
    },

    // -------------------------------------------------------------------------
    // C++: Missing using namespace std / did you mean 'std::...'
    // -------------------------------------------------------------------------
    {
        category: 'Namespace',
        languages: ['cpp'],
        match: (msg) =>
            msg.includes("did you mean 'std::") || msg.includes("is not declared in this scope; did you mean"),
        translate: (_msg, raw) => {
            const match = raw.match(/did you mean 'std::(\w+)'/)
            const identifier = match ? match[1] : 'identifier'
            return {
                category: 'Namespace',
                title: `Identifier '${identifier}' is in the std:: namespace`,
                humanExplanation: `C++ puts standard library identifiers inside namespace 'std'. The compiler found '${identifier}', but you haven't told it to search namespace 'std'.`,
                cause: `Used '${identifier}' without 'std::' prefix or 'using namespace std;'.`,
                fixTip: `Either use 'std::${identifier}' directly, or add 'using namespace std;' after your includes.`,
                codeSnippet: {
                    bad: `${identifier}; // Compiler doesn't know where to look`,
                    good: `using namespace std;\n// or\nstd::${identifier};`
                },
                quickFix: {
                    id: 'fix-add-using-std',
                    title: 'Add "using namespace std;"',
                    type: 'insert_code',
                    insertPosition: 'after_includes',
                    insertText: '\nusing namespace std;\n'
                }
            }
        }
    },

    // -------------------------------------------------------------------------
    // C++ / C / Java: Missing semicolon at end of statement
    // -------------------------------------------------------------------------
    {
        category: 'Syntax Error',
        languages: ['cpp', 'c', 'java'],
        match: (msg) =>
            (msg.includes("expected ';'") ||
            msg.includes("expected ',' or ';'") ||
            msg.includes("';' expected") ||
            msg.includes("missing ';'")) &&
            !msg.includes("after class") &&
            !msg.includes("after struct"),
        translate: (_msg, _raw, err, code) => {
            const lines = code ? code.split(/\r?\n/) : []
            const rawLine = (err.line >= 1 && err.line <= lines.length) ? lines[err.line - 1] : ''
            const trimmedLine = rawLine.trimEnd()
            const fixedLine = trimmedLine ? (trimmedLine.endsWith(';') ? trimmedLine : `${trimmedLine};`) : undefined

            return {
                category: 'Syntax Error',
                title: 'Missing semicolon (;)',
                humanExplanation: "In C, C++, and Java, statements must terminate with a semicolon (';'). The compiler reached the next line without finding a closing semicolon.",
                cause: `Line ${err.line} is missing a terminating semicolon.`,
                fixTip: `Add ';' to the end of statement on line ${err.line}.`,
                codeSnippet: {
                    bad: trimmedLine ? `${trimmedLine} // Missing ';'` : 'cout << "Hello" << endl // Missing semicolon!',
                    good: fixedLine ? fixedLine : 'cout << "Hello" << endl; // Correct!'
                },
                quickFix: fixedLine ? {
                    id: 'fix-insert-semicolon',
                    title: `Insert ';' at end of line ${err.line}`,
                    type: 'replace_line',
                    targetLine: err.line,
                    replacementText: fixedLine
                } : undefined
            }
        }
    },

    // -------------------------------------------------------------------------
    // C++ / C: Missing semicolon after class/struct definition
    // -------------------------------------------------------------------------
    {
        category: 'Syntax Error',
        languages: ['cpp', 'c'],
        match: (msg) =>
            msg.includes("expected ';' after struct definition") ||
            msg.includes("expected ';' after class definition") ||
            msg.includes("new types may not be defined in a return type"),
        translate: (_msg, _raw, err) => ({
            category: 'Syntax Error',
            title: 'Missing semicolon after class or struct closing brace',
            humanExplanation: "In C and C++, every class or struct definition MUST end with a semicolon (';') immediately following the closing curly brace '}'.",
            cause: "You closed the class or struct with '}' without adding a ';' right after.",
            fixTip: "Add ';' to the closing brace line: '};'.",
            codeSnippet: {
                bad: 'class Player {\n    int health;\n} // Missing semicolon!',
                good: 'class Player {\n    int health;\n}; // Correct!'
            },
            quickFix: {
                id: 'fix-add-semicolon',
                title: 'Add semicolon after brace (};)',
                type: 'replace_line',
                targetLine: err.line,
                replacementText: '};'
            }
        })
    },

    // -------------------------------------------------------------------------
    // C++ / C: Pointer Member Access (. vs ->)
    // -------------------------------------------------------------------------
    {
        category: 'Pointers & Memory',
        languages: ['cpp', 'c'],
        match: (msg) =>
            msg.includes("base operand of '->' has non-pointer type") ||
            msg.includes("request for member") && (msg.includes("in something not a structure") || msg.includes("which is of pointer type")),
        translate: (msg) => {
            const isUsingArrowOnObject = msg.includes("base operand of '->' has non-pointer type")
            return {
                category: 'Pointers & Memory',
                title: isUsingArrowOnObject ? "Use dot (.) instead of arrow (->) on regular object" : "Use arrow (->) instead of dot (.) on pointer",
                humanExplanation: isUsingArrowOnObject
                    ? "You used '->' to access a field, but this variable is a direct object, not a pointer."
                    : "You used '.' to access a member of a pointer. Pointers require the arrow operator '->' to dereference and access members.",
                cause: isUsingArrowOnObject ? "Calling 'object->field' on non-pointer." : "Calling 'pointer.field' without dereferencing.",
                fixTip: isUsingArrowOnObject ? "Switch '->' to a simple dot '.' (e.g. 'obj.property')." : "Switch '.' to arrow '->' (e.g. 'ptr->property') or '(*ptr).property'.",
                codeSnippet: {
                    bad: isUsingArrowOnObject ? 'myObj->value;' : 'myPtr.value;',
                    good: isUsingArrowOnObject ? 'myObj.value;' : 'myPtr->value;'
                }
            }
        }
    },

    // -------------------------------------------------------------------------
    // C++ / C: Undefined reference to main / WinMain
    // -------------------------------------------------------------------------
    {
        category: 'Linker / Entry Point',
        languages: ['cpp', 'c'],
        match: (msg, raw) =>
            msg.includes("undefined reference to 'WinMain'") ||
            msg.includes("undefined reference to 'main'") ||
            raw.includes("undefined reference to `WinMain'") ||
            raw.includes("undefined reference to `main'"),
        translate: () => ({
            category: 'Linker / Entry Point',
            title: 'Missing main() function entry point',
            humanExplanation: "Every executable program in C and C++ must have an entry point function named exactly 'main'. The linker cannot find where to start your program.",
            cause: "The 'main()' function is either missing, misspelled (like 'Main' or 'mian'), or located in a file not included in the build.",
            fixTip: "Define 'int main() { ... return 0; }' with lowercase spelling.",
            codeSnippet: {
                good: 'int main() {\n    // Code goes here\n    return 0;\n}'
            },
            quickFix: {
                id: 'fix-add-main',
                title: 'Add main() function entry point',
                type: 'insert_code',
                insertPosition: 'end_of_file',
                insertText: '\n\nint main() {\n    // Your program starts here\n    return 0;\n}\n'
            }
        })
    },

    // -------------------------------------------------------------------------
    // C++: Modern Standard Required (filesystem, ranges, format, print)
    // -------------------------------------------------------------------------
    {
        category: 'Standard Version',
        languages: ['cpp'],
        match: (msg) =>
            msg.includes("'std::filesystem' has not been declared") ||
            msg.includes("filesystem (Requires C++17") ||
            msg.includes("'std::ranges' has not been declared") ||
            msg.includes("'std::format' has not been declared") ||
            msg.includes("'std::print' has not been declared") ||
            msg.includes("structured binding only available with"),
        translate: (msg) => {
            const targetStandard = (msg.includes('print') || msg.includes('println'))
                ? 'c++23'
                : (msg.includes('ranges') || msg.includes('format') || msg.includes('span'))
                    ? 'c++20'
                    : 'c++17'

            return {
                category: 'Standard Version',
                title: `Requires ${targetStandard.toUpperCase()} or higher`,
                humanExplanation: `You are using modern C++ features that were introduced in ${targetStandard.toUpperCase()}. Your current compiler standard setting is older.`,
                cause: `Feature requires compiler flag -std=${targetStandard}.`,
                fixTip: `Change your C++ Standard to ${targetStandard.toUpperCase()} using the top toolbar.`,
                codeSnippet: {
                    good: `// Configured in toolbar: C++ Standard -> ${targetStandard.toUpperCase()}`
                },
                quickFix: {
                    id: `fix-set-std-${targetStandard}`,
                    title: `Switch C++ Standard to ${targetStandard.toUpperCase()}`,
                    type: 'set_standard',
                    recommendedStandard: targetStandard
                }
            }
        }
    },

    // -------------------------------------------------------------------------
    // Java: Cannot Find Symbol: Scanner
    // -------------------------------------------------------------------------
    {
        category: 'Imports & Packages',
        languages: ['java'],
        match: (msg, raw) =>
            (msg.includes('cannot find symbol') || raw.includes('cannot find symbol')) &&
            (msg.includes('class Scanner') || raw.includes('class Scanner') || raw.includes('symbol:   class Scanner')),
        translate: () => ({
            category: 'Imports & Packages',
            title: 'Missing import for java.util.Scanner',
            humanExplanation: "'Scanner' is used to read input in Java, but it lives in the 'java.util' package. Java needs an import statement to access it.",
            cause: "Used 'new Scanner(System.in)' without importing 'java.util.Scanner'.",
            fixTip: "Add 'import java.util.Scanner;' at the very top of your Java file.",
            codeSnippet: {
                good: 'import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n    }\n}'
            },
            quickFix: {
                id: 'fix-import-scanner',
                title: 'Add "import java.util.Scanner;"',
                type: 'insert_include',
                includeHeader: 'import java.util.Scanner;'
            }
        })
    },

    // -------------------------------------------------------------------------
    // Java: Cannot Find Symbol: ArrayList / List / Map / HashMap
    // -------------------------------------------------------------------------
    {
        category: 'Imports & Packages',
        languages: ['java'],
        match: (msg, raw) =>
            (msg.includes('cannot find symbol') || raw.includes('cannot find symbol')) &&
            (raw.includes('class ArrayList') || raw.includes('class List') || raw.includes('class HashMap') || raw.includes('class Map') || raw.includes('class Set')),
        translate: () => ({
            category: 'Imports & Packages',
            title: 'Missing collection import (java.util.*)',
            humanExplanation: "Java collections (List, ArrayList, Map, HashMap, Set) reside in 'java.util' and require an import directive.",
            cause: "Used a collection type without importing 'java.util.*'.",
            fixTip: "Add 'import java.util.*;' at the top of your Java file.",
            codeSnippet: {
                good: 'import java.util.List;\nimport java.util.ArrayList;\n// or\nimport java.util.*;'
            },
            quickFix: {
                id: 'fix-import-util',
                title: 'Add "import java.util.*;"',
                type: 'insert_include',
                includeHeader: 'import java.util.*;'
            }
        })
    },

    // -------------------------------------------------------------------------
    // Java: Static Context Error (non-static method from static main)
    // -------------------------------------------------------------------------
    {
        category: 'Static Context',
        languages: ['java'],
        match: (msg, raw) =>
            msg.includes('non-static') && msg.includes('cannot be referenced from a static context') ||
            raw.includes('non-static') && raw.includes('cannot be referenced from a static context'),
        translate: (_msg, raw) => {
            const isMethod = raw.includes('method')
            return {
                category: 'Static Context',
                title: isMethod ? 'Cannot call non-static method from static main()' : 'Cannot access non-static variable from static main()',
                humanExplanation: "The 'main' method is declared 'static', meaning it belongs to the class itself and runs before any object instances are created. It cannot directly call regular (instance) methods or read instance fields.",
                cause: "Called an instance member directly inside 'public static void main'.",
                fixTip: "Either create an instance of your class: 'MyClass app = new MyClass(); app.myMethod();', or add the 'static' modifier to the method/variable definition.",
                codeSnippet: {
                    bad: 'public class Main {\n    void greet() { System.out.println("Hi"); }\n    public static void main(String[] args) {\n        greet(); // Error!\n    }\n}',
                    good: 'public class Main {\n    // Solution 1: Make method static\n    static void greet() { System.out.println("Hi"); }\n\n    // Solution 2: Or create an object instance\n    public static void main(String[] args) {\n        Main app = new Main();\n        app.greet();\n    }\n}'
                }
            }
        }
    },

    // -------------------------------------------------------------------------
    // Java: Class is public, should be declared in file named X.java
    // -------------------------------------------------------------------------
    {
        category: 'Imports & Packages',
        languages: ['java'],
        match: (msg) =>
            msg.includes('is public, should be declared in a file named'),
        translate: (_msg, raw) => {
            const match = raw.match(/class (\w+) is public, should be declared in a file named (\w+\.java)/)
            const className = match ? match[1] : 'Class'
            const expectedFileName = match ? match[2] : `${className}.java`
            return {
                category: 'Imports & Packages',
                title: `Class '${className}' name must match file name '${expectedFileName}'`,
                humanExplanation: `Java requires every 'public class ${className}' to be saved in a file with the exact same name: '${expectedFileName}'.`,
                cause: `File name does not match the public class name.`,
                fixTip: `Either remove the 'public' keyword ('class ${className} { ... }') or rename your file to '${expectedFileName}'.`,
                codeSnippet: {
                    good: `// In ${expectedFileName}:\npublic class ${className} {\n    public static void main(String[] args) {\n        // ...\n    }\n}`
                }
            }
        }
    },

    // -------------------------------------------------------------------------
    // Java: Missing return statement
    // -------------------------------------------------------------------------
    {
        category: 'Syntax Error',
        languages: ['java'],
        match: (msg) => msg.includes('missing return statement'),
        translate: () => ({
            category: 'Syntax Error',
            title: 'Missing return statement',
            humanExplanation: "The method is declared with a return type (like 'int', 'String', or 'boolean'), but reached the end of the method without returning a value.",
            cause: "One or all branches in the method are missing a 'return <value>;' statement.",
            fixTip: "Make sure every path through if/else blocks returns a value, or change the return type to 'void' if no value is intended.",
            codeSnippet: {
                bad: 'int calculate() {\n    // forgot return!\n}',
                good: 'int calculate() {\n    return 42;\n}'
            }
        })
    },

    // -------------------------------------------------------------------------
    // Python: IndentationError
    // -------------------------------------------------------------------------
    {
        category: 'Python Runtime',
        languages: ['python'],
        match: (msg, raw) =>
            msg.includes('IndentationError') || raw.includes('IndentationError'),
        translate: () => ({
            category: 'Python Runtime',
            title: 'Indentation error in Python block',
            humanExplanation: "Python uses indentation (whitespace) instead of curly braces to define code blocks. An indented line was expected (e.g. after 'if', 'for', 'def', 'class', 'while').",
            cause: "A code block has inconsistent spaces/tabs or is completely empty after a statement ending with a colon (:).",
            fixTip: "Indent the lines inside the block with 4 spaces. If a block is intentionally empty, use the 'pass' keyword.",
            codeSnippet: {
                bad: 'if x > 0:\nprint("Positive") # IndentationError!',
                good: 'if x > 0:\n    print("Positive") # Correct (4 spaces)'
            }
        })
    },

    // -------------------------------------------------------------------------
    // Python: TypeError (string + number concatenation)
    // -------------------------------------------------------------------------
    {
        category: 'Type Mismatch',
        languages: ['python'],
        match: (msg, raw) =>
            (msg.includes('can only concatenate str') && msg.includes('to str')) ||
            (raw.includes('can only concatenate str') && raw.includes('to str')),
        translate: () => ({
            category: 'Type Mismatch',
            title: 'Cannot concatenate string and number with +',
            humanExplanation: "In Python, the '+' operator concatenates strings, but it will not automatically convert integers or floats to strings.",
            cause: "Attempted to write something like '\"Score: \" + score' where score is a number.",
            fixTip: "Use an f-string: f\"Score: {score}\", or explicitly convert with str(score).",
            codeSnippet: {
                bad: 'print("Result: " + result) # TypeError if result is int',
                good: 'print(f"Result: {result}") # Recommended f-string\n# or\nprint("Result: " + str(result))'
            }
        })
    },

    // -------------------------------------------------------------------------
    // Python: NameError (name is not defined)
    // -------------------------------------------------------------------------
    {
        category: 'Python Runtime',
        languages: ['python'],
        match: (msg, raw) =>
            msg.includes('NameError') || raw.includes('NameError'),
        translate: (_msg, raw) => {
            const match = raw.match(/name '(\w+)' is not defined/)
            const varName = match ? match[1] : 'variable'
            return {
                category: 'Python Runtime',
                title: `Variable or function '${varName}' is not defined`,
                humanExplanation: `Python encountered '${varName}', but no variable, function, or imported module with that name exists in the current scope.`,
                cause: `The variable was used before being assigned, was misspelled, or requires an import statement.`,
                fixTip: `Check the spelling of '${varName}', assign it a value before using it, or verify that the required module is imported.`,
                codeSnippet: {
                    good: `${varName} = 10\nprint(${varName})`
                }
            }
        }
    },

    // -------------------------------------------------------------------------
    // Python: IndexError (list index out of range)
    // -------------------------------------------------------------------------
    {
        category: 'Python Runtime',
        languages: ['python'],
        match: (msg, raw) =>
            msg.includes('IndexError') || raw.includes('IndexError'),
        translate: () => ({
            category: 'Python Runtime',
            title: 'List index out of range',
            humanExplanation: "You tried to access a list element at an index that doesn't exist. Python lists are 0-indexed, so a list with 3 elements only has indices 0, 1, and 2.",
            cause: "Accessing 'list[i]' where 'i >= len(list)' or 'list[-len(list)-1]'.",
            fixTip: "Verify the list length with 'len(my_list)' before accessing, or use a loop: 'for item in my_list:'.",
            codeSnippet: {
                bad: 'items = [10, 20]\nprint(items[2]) # IndexError (size is 2, valid indices: 0, 1)',
                good: 'if len(items) > 2:\n    print(items[2])'
            }
        })
    }
]

/**
 * Translates a compiler error into a human-friendly diagnostic card with optional 1-click Quick Fix.
 */
export function translateCompileError(
    err: CompileError,
    code?: string,
    language?: 'cpp' | 'c' | 'java' | 'python'
): TranslatedError {
    const rawText = `${err.message} ${err.raw || ''}`

    for (const rule of ERROR_RULES) {
        if (rule.languages && language && !rule.languages.includes(language)) {
            continue
        }
        if (rule.match(err.message, rawText, err)) {
            const translation = rule.translate(err.message, rawText, err, code)
            return {
                originalError: err,
                ...translation
            }
        }
    }

    // Generic fallback for unmapped compiler errors
    const isError = err.severity === 'error'
    return {
        originalError: err,
        category: 'General',
        title: isError ? 'Compilation Diagnostic' : 'Compiler Warning',
        humanExplanation: err.message,
        cause: err.code ? `Reported error code: ${err.code}` : 'Compiler detected a syntax, type, or declaration issue on this line.',
        fixTip: 'Click the line number above to inspect and edit the highlighted code in the editor.'
    }
}

/**
 * Applies an automated quick fix to the source code string.
 */
export function applyQuickFix(
    action: QuickFixAction,
    currentCode: string
): { newCode?: string; message: string } {
    switch (action.type) {
        case 'insert_include': {
            if (!action.includeHeader) {
                return { message: 'No header specified for quick fix.' }
            }
            if (currentCode.includes(action.includeHeader)) {
                return { message: `${action.includeHeader} is already included in this file.` }
            }

            // Find where to insert include (after existing includes or at top)
            const lines = currentCode.split('\n')
            let lastIncludeIndex = -1
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim()
                if (line.startsWith('#include') || line.startsWith('import ')) {
                    lastIncludeIndex = i
                }
            }

            if (lastIncludeIndex >= 0) {
                lines.splice(lastIncludeIndex + 1, 0, action.includeHeader)
            } else {
                lines.unshift(action.includeHeader)
            }

            return {
                newCode: lines.join('\n'),
                message: `Added ${action.includeHeader}`
            }
        }

        case 'insert_code': {
            if (!action.insertText) {
                return { message: 'No code specified to insert.' }
            }
            const lines = currentCode.split('\n')

            if (action.insertPosition === 'after_includes') {
                let lastIncludeIndex = -1
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].trim()
                    if (line.startsWith('#include') || line.startsWith('import ')) {
                        lastIncludeIndex = i
                    }
                }
                if (lastIncludeIndex >= 0) {
                    lines.splice(lastIncludeIndex + 1, 0, action.insertText)
                } else {
                    lines.unshift(action.insertText)
                }
                return {
                    newCode: lines.join('\n'),
                    message: action.title
                }
            } else if (action.insertPosition === 'end_of_file') {
                return {
                    newCode: currentCode + (currentCode.endsWith('\n') ? '' : '\n') + action.insertText,
                    message: action.title
                }
            } else if (action.insertPosition === 'at_line' && action.targetLine) {
                const targetIdx = Math.max(0, action.targetLine - 1)
                lines.splice(targetIdx, 0, action.insertText)
                return {
                    newCode: lines.join('\n'),
                    message: action.title
                }
            }

            return {
                newCode: action.insertText + '\n' + currentCode,
                message: action.title
            }
        }

        case 'replace_line': {
            if (action.targetLine && action.replacementText !== undefined) {
                const lines = currentCode.split('\n')
                const targetIdx = Math.max(0, action.targetLine - 1)
                if (targetIdx < lines.length) {
                    lines[targetIdx] = action.replacementText
                    return {
                        newCode: lines.join('\n'),
                        message: action.title
                    }
                }
            }
            return { message: 'Could not locate target line to replace.' }
        }

        case 'set_standard': {
            return {
                message: `Set C++ standard to ${action.recommendedStandard?.toUpperCase()}`
            }
        }

        default:
            return { message: 'Quick fix action completed.' }
    }
}

