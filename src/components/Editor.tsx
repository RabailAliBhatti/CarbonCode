import { useRef, useEffect } from 'react'
import MonacoEditor, { OnMount, loader, Monaco } from '@monaco-editor/react'
import * as monacoEditor from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
import { SupportedLanguage } from '../types/language'

// Configure Monaco to use local workers (for offline support)
self.MonacoEnvironment = {
    getWorker(_, label) {
        if (label === 'json') {
            return new jsonWorker()
        }
        if (label === 'css' || label === 'scss' || label === 'less') {
            return new cssWorker()
        }
        if (label === 'html' || label === 'handlebars' || label === 'razor') {
            return new htmlWorker()
        }
        if (label === 'typescript' || label === 'javascript') {
            return new tsWorker()
        }
        return new editorWorker()
    }
}

// Configure the loader to use local Monaco
loader.config({ monaco: monacoEditor })

interface EditorProps {
    value: string
    language: SupportedLanguage
    onChange: (value: string | undefined) => void
    onEditorMount?: (editor: monacoEditor.editor.IStandaloneCodeEditor) => void
    fontSize?: number
    tabSize?: number
    theme?: 'dark' | 'light'
    minimap?: boolean
    wordWrap?: boolean
    onCopyPasteBlocked?: (message: string) => void
    onRun?: () => void
}

// VS Code Dark+ theme colors
const editorThemeDark = {
    base: 'vs-dark' as const,
    inherit: true,
    rules: [
        { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
        { token: 'keyword', foreground: '569CD6' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'number', foreground: 'B5CEA8' },
        { token: 'type', foreground: '4EC9B0' },
        { token: 'function', foreground: 'DCDCAA' },
        { token: 'variable', foreground: '9CDCFE' },
        { token: 'operator', foreground: 'D4D4D4' },
        { token: 'delimiter', foreground: 'D4D4D4' },
        { token: 'preprocessor', foreground: 'C586C0' },
    ],
    colors: {
        'editor.background': '#1E1E1E',
        'editor.foreground': '#D4D4D4',
        'editor.lineHighlightBackground': '#2A2D2E',
        'editor.selectionBackground': '#264F78',
        'editor.inactiveSelectionBackground': '#3A3D41',
        'editorCursor.foreground': '#AEAFAD',
        'editorWhitespace.foreground': '#3B3B3B',
        'editorIndentGuide.background': '#404040',
        'editorIndentGuide.activeBackground': '#707070',
        'editor.selectionHighlightBackground': '#ADD6FF26',
        'editorLineNumber.foreground': '#858585',
        'editorLineNumber.activeForeground': '#C6C6C6',
        'editorGutter.background': '#1E1E1E',
        'editorBracketMatch.background': '#0D3A58',
        'editorBracketMatch.border': '#888888',
        'scrollbarSlider.background': '#79797966',
        'scrollbarSlider.hoverBackground': '#646464B2',
        'scrollbarSlider.activeBackground': '#BFBFBF66',
    }
}

// VS Code Light+ theme colors
const editorThemeLight = {
    base: 'vs' as const,
    inherit: true,
    rules: [
        { token: 'comment', foreground: '008000', fontStyle: 'italic' },
        { token: 'keyword', foreground: '0000FF' },
        { token: 'string', foreground: 'A31515' },
        { token: 'number', foreground: '098658' },
        { token: 'type', foreground: '267F99' },
        { token: 'function', foreground: '795E26' },
        { token: 'variable', foreground: '001080' },
        { token: 'operator', foreground: '000000' },
        { token: 'delimiter', foreground: '000000' },
        { token: 'preprocessor', foreground: '800080' },
    ],
    colors: {
        'editor.background': '#FFFFFE',
        'editor.foreground': '#000000',
        'editor.lineHighlightBackground': '#F3F3F3',
        'editor.selectionBackground': '#ADD6FF',
        'editor.inactiveSelectionBackground': '#e5ebf1',
        'editorCursor.foreground': '#000000',
        'editorWhitespace.foreground': '#3B3B3B',
        'editorIndentGuide.background': '#D3D3D3',
        'editorIndentGuide.activeBackground': '#939393',
        'editor.selectionHighlightBackground': '#ADD6FF4D',
        'editorLineNumber.foreground': '#237893',
        'editorLineNumber.activeForeground': '#0B216F',
        'editorGutter.background': '#FFFFFE',
        'editorBracketMatch.background': '#D8D8D8',
        'editorBracketMatch.border': '#888888',
        'scrollbarSlider.background': '#64646433',
        'scrollbarSlider.hoverBackground': '#64646466',
        'scrollbarSlider.activeBackground': '#00000099',
    }
}

function Editor({ value, language, onChange, onEditorMount, fontSize = 14, tabSize = 4, minimap = true, wordWrap = false, theme = 'dark', onCopyPasteBlocked, onRun }: EditorProps) {
    const editorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(null)
    const monacoRef = useRef<Monaco | null>(null)

    const handleEditorMount: OnMount = (editor, monaco) => {
        editorRef.current = editor
        monacoRef.current = monaco

        // Define custom themes
        monaco.editor.defineTheme('cpp-ide-dark', editorThemeDark)
        monaco.editor.defineTheme('cpp-ide-light', editorThemeLight)

        monaco.editor.setTheme(theme === 'dark' ? 'cpp-ide-dark' : 'cpp-ide-light')

        // Configure C++ language settings
        monaco.languages.setLanguageConfiguration('cpp', {
            comments: {
                lineComment: '//',
                blockComment: ['/*', '*/']
            },
            brackets: [
                ['{', '}'],
                ['[', ']'],
                ['(', ')']
            ],
            autoClosingPairs: [
                { open: '{', close: '}' },
                { open: '[', close: ']' },
                { open: '(', close: ')' },
                { open: '"', close: '"' },
                { open: "'", close: "'" }
            ],
            surroundingPairs: [
                { open: '{', close: '}' },
                { open: '[', close: ']' },
                { open: '(', close: ')' },
                { open: '"', close: '"' },
                { open: "'", close: "'" }
            ],
            indentationRules: {
                increaseIndentPattern: /^.*\{[^}"']*$/,
                decreaseIndentPattern: /^(.*\*\/)?\s*\}.*$/
            }
        })

        // Enhanced C++ IntelliSense
        // Enhanced C++ IntelliSense
        monaco.languages.registerCompletionItemProvider('cpp', {
            provideCompletionItems: (model, position) => {
                const word = model.getWordUntilPosition(position);
                const range = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: word.startColumn,
                    endColumn: word.endColumn
                };

                const suggestions = [
                    // Keywords (Expanded)
                    ...['alignas', 'alignof', 'and', 'and_eq', 'asm', 'atomic_cancel', 'atomic_commit', 'atomic_noexcept', 'auto', 'bitand', 'bitor', 'bool', 'break', 'case', 'catch', 'char', 'char8_t', 'char16_t', 'char32_t', 'class', 'compl', 'concept', 'const', 'consteval', 'constexpr', 'constinit', 'const_cast', 'continue', 'co_await', 'co_return', 'co_yield', 'decltype', 'default', 'delete', 'do', 'double', 'dynamic_cast', 'else', 'enum', 'explicit', 'export', 'extern', 'false', 'float', 'for', 'friend', 'goto', 'if', 'inline', 'int', 'long', 'mutable', 'namespace', 'new', 'noexcept', 'not', 'not_eq', 'nullptr', 'operator', 'or', 'or_eq', 'private', 'protected', 'public', 'reflexpr', 'register', 'reinterpret_cast', 'requires', 'return', 'short', 'signed', 'sizeof', 'static', 'static_assert', 'static_cast', 'struct', 'switch', 'synchronized', 'template', 'this', 'thread_local', 'throw', 'true', 'try', 'typedef', 'typeid', 'typename', 'union', 'unsigned', 'using', 'virtual', 'void', 'volatile', 'wchar_t', 'while', 'xor', 'xor_eq'].map(k => ({
                        label: k,
                        kind: monaco.languages.CompletionItemKind.Keyword,
                        insertText: k,
                        range: range
                    })),

                    // Standard Library (Expanded)
                    ...['std', 'string', 'wstring', 'u8string', 'u16string', 'u32string', 'string_view', 'vector', 'map', 'unordered_map', 'set', 'unordered_set', 'list', 'forward_list', 'deque', 'queue', 'priority_queue', 'stack', 'span', 'array', 'bitset', 'tuple', 'pair', 'optional', 'variant', 'any', 'cout', 'cin', 'cerr', 'clog', 'endl', 'flush', 'fstream', 'ifstream', 'ofstream', 'stringstream', 'istringstream', 'ostringstream', 'unique_ptr', 'shared_ptr', 'weak_ptr', 'make_unique', 'make_shared', 'function', 'bind', 'thread', 'mutex', 'lock_guard', 'unique_lock', 'condition_variable', 'future', 'promise', 'atomic', 'filesystem', 'chrono', 'regex', 'exception', 'runtime_error', 'logic_error', 'sort', 'find', 'find_if', 'transform', 'accumulate', 'reduce', 'copy', 'copy_if', 'move', 'swap', 'max', 'min', 'clamp'].map(k => ({
                        label: k,
                        kind: monaco.languages.CompletionItemKind.Class,
                        insertText: k,
                        range: range
                    })),

                    // Common Headers (as Snippets for convenience)
                    ...['iostream', 'vector', 'string', 'map', 'set', 'algorithm', 'cmath', 'cstdio', 'cstdlib', 'fstream', 'iomanip', 'memory', 'thread', 'mutex', 'chrono', 'filesystem'].map(h => ({
                        label: `#include <${h}>`,
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: `#include <${h}>`,
                        range: range,
                        documentation: `Include <${h}>`
                    })),

                    // Snippets
                    {
                        label: 'main',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: [
                            'int main() {',
                            '\t$0',
                            '\treturn 0;',
                            '}'
                        ].join('\n'),
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Main function',
                        range: range
                    },
                    {
                        label: 'cout',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'std::cout << $1 << std::endl;',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Print to standard output',
                        range: range
                    },
                    {
                        label: 'cin',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'std::cin >> $1;',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Read from standard input',
                        range: range
                    },
                    {
                        label: 'for',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: [
                            'for (int ${1:i} = 0; $1 < ${2:count}; ++$1) {',
                            '\t$0',
                            '}'
                        ].join('\n'),
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'For loop',
                        range: range
                    },
                    {
                        label: 'range-for',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: [
                            'for (const auto& ${1:item} : ${2:container}) {',
                            '\t$0',
                            '}'
                        ].join('\n'),
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Range-based for loop',
                        range: range
                    },
                    {
                        label: 'if',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: [
                            'if (${1:condition}) {',
                            '\t$0',
                            '}'
                        ].join('\n'),
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'If block',
                        range: range
                    },
                    {
                        label: 'ifelse',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: [
                            'if (${1:condition}) {',
                            '\t$2',
                            '} else {',
                            '\t$0',
                            '}'
                        ].join('\n'),
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'If-Else block',
                        range: range
                    },
                    {
                        label: 'while',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: [
                            'while (${1:condition}) {',
                            '\t$0',
                            '}'
                        ].join('\n'),
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'While loop',
                        range: range
                    },
                    {
                        label: 'do-while',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: [
                            'do {',
                            '\t$0',
                            '} while (${1:condition});'
                        ].join('\n'),
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Do-While loop',
                        range: range
                    },
                    {
                        label: 'switch',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: [
                            'switch (${1:expression}) {',
                            '\tcase ${2:constant}:',
                            '\t\t$3',
                            '\t\tbreak;',
                            '\tdefault:',
                            '\t\t$0',
                            '\t\tbreak;',
                            '}'
                        ].join('\n'),
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Switch statement',
                        range: range
                    },
                    {
                        label: 'class',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: [
                            'class ${1:ClassName} {',
                            'public:',
                            '\t$1();',
                            '\t~$1();',
                            '',
                            'private:',
                            '\t$0',
                            '};'
                        ].join('\n'),
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Class definition',
                        range: range
                    },
                    {
                        label: 'struct',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: [
                            'struct ${1:StructName} {',
                            '\t$0',
                            '};'
                        ].join('\n'),
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Struct definition',
                        range: range
                    },
                    {
                        label: 'try',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: [
                            'try {',
                            '\t$1',
                            '} catch (const std::exception& e) {',
                            '\tstd::cerr << e.what() << std::endl;',
                            '}'
                        ].join('\n'),
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Try-Catch block',
                        range: range
                    }
                ];
                return { suggestions: suggestions };
            }
        });

        monaco.languages.setLanguageConfiguration('java', {
            comments: {
                lineComment: '//',
                blockComment: ['/*', '*/']
            },
            brackets: [
                ['{', '}'],
                ['[', ']'],
                ['(', ')']
            ],
            autoClosingPairs: [
                { open: '{', close: '}' },
                { open: '[', close: ']' },
                { open: '(', close: ')' },
                { open: '"', close: '"' },
                { open: "'", close: "'" }
            ],
            surroundingPairs: [
                { open: '{', close: '}' },
                { open: '[', close: ']' },
                { open: '(', close: ')' },
                { open: '"', close: '"' },
                { open: "'", close: "'" }
            ],
            indentationRules: {
                increaseIndentPattern: /^.*\{[^}"']*$/,
                decreaseIndentPattern: /^(.*\*\/)?\s*\}.*$/
            }
        })

        monaco.languages.registerCompletionItemProvider('java', {
            provideCompletionItems: (model, position) => {
                const word = model.getWordUntilPosition(position)
                const range = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: word.startColumn,
                    endColumn: word.endColumn
                }

                const suggestions = [
                    ...['abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum', 'extends', 'final', 'finally', 'float', 'for', 'if', 'implements', 'import', 'instanceof', 'int', 'interface', 'long', 'new', 'package', 'private', 'protected', 'public', 'return', 'short', 'static', 'strictfp', 'super', 'switch', 'synchronized', 'this', 'throw', 'throws', 'transient', 'try', 'void', 'volatile', 'while'].map(k => ({
                        label: k,
                        kind: monaco.languages.CompletionItemKind.Keyword,
                        insertText: k,
                        range
                    })),
                    ...['String', 'System', 'Math', 'Scanner', 'ArrayList', 'HashMap', 'List', 'Map', 'Set', 'Integer', 'Double', 'Boolean', 'Character', 'StringBuilder', 'BufferedReader', 'IOException', 'File', 'FileReader', 'FileWriter', 'PrintWriter', 'Collections', 'Arrays', 'Comparable', 'Comparator', 'Exception', 'RuntimeException', 'Thread', 'Runnable', 'InputStream', 'OutputStream', 'ObjectOutputStream', 'ObjectInputStream'].map(k => ({
                        label: k,
                        kind: monaco.languages.CompletionItemKind.Class,
                        insertText: k,
                        range
                    })),
                    {
                        label: 'psvm',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: [
                            'public static void main(String[] args) {',
                            '\t$0',
                            '}'
                        ].join('\n'),
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Public static void main',
                        range
                    },
                    {
                        label: 'main',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: [
                            'public static void main(String[] args) {',
                            '\t$0',
                            '}'
                        ].join('\n'),
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Main method',
                        range
                    },
                    {
                        label: 'class',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: [
                            'public class ${1:Main} {',
                            '\t$0',
                            '}'
                        ].join('\n'),
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Public class',
                        range
                    },
                    {
                        label: 'sout',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'System.out.println($1);',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'System.out.println()',
                        range
                    },
                    {
                        label: 'soutv',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'System.out.println("${1:variable} = " + $1);',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Print variable with label',
                        range
                    },
                    {
                        label: 'soutm',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'System.out.println("${1:ClassName}.${2:methodName}");',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Print method name',
                        range
                    },
                    {
                        label: 'soutp',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'System.out.println("${1:param} = " + $1);',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Print parameter',
                        range
                    },
                    {
                        label: 'print',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'System.out.print($1);',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'System.out.print()',
                        range
                    },
                    {
                        label: 'printf',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'System.out.printf("${1:format}", $2);',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'System.out.printf()',
                        range
                    },
                    {
                        label: 'scanner',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: [
                            'Scanner scanner = new Scanner(System.in);',
                            '$0'
                        ].join('\n'),
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Scanner for stdin',
                        range
                    },
                    {
                        label: 'scnn',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'Scanner ${1:sc} = new Scanner(System.in);',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Scanner with custom name',
                        range
                    },
                    {
                        label: 'readln',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: '${1:String} ${2:line} = ${3:sc}.nextLine();',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Read line from scanner',
                        range
                    },
                    {
                        label: 'readint',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'int ${1:num} = ${2:sc}.nextInt();',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Read integer from scanner',
                        range
                    },
                    {
                        label: 'for',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: [
                            'for (int ${1:i} = 0; $1 < ${2:count}; $1++) {',
                            '\t$0',
                            '}'
                        ].join('\n'),
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'For loop',
                        range
                    },
                    {
                        label: 'foreach',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: [
                            'for (${1:Type} ${2:item} : ${3:collection}) {',
                            '\t$0',
                            '}'
                        ].join('\n'),
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Enhanced for loop',
                        range
                    },
                    {
                        label: 'while',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: [
                            'while (${1:condition}) {',
                            '\t$0',
                            '}'
                        ].join('\n'),
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'While loop',
                        range
                    },
                    {
                        label: 'dowhile',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: [
                            'do {',
                            '\t$0',
                            '} while (${1:condition});'
                        ].join('\n'),
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Do-while loop',
                        range
                    },
                    {
                        label: 'if',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: [
                            'if (${1:condition}) {',
                            '\t$0',
                            '}'
                        ].join('\n'),
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'If block',
                        range
                    },
                    {
                        label: 'ifelse',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: [
                            'if (${1:condition}) {',
                            '\t$2',
                            '} else {',
                            '\t$0',
                            '}'
                        ].join('\n'),
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'If-else block',
                        range
                    },
                    {
                        label: 'elseif',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: [
                            'if (${1:condition}) {',
                            '\t$2',
                            '} else if (${3:condition}) {',
                            '\t$4',
                            '} else {',
                            '\t$0',
                            '}'
                        ].join('\n'),
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'If-else if-else block',
                        range
                    },
                    {
                        label: 'trycatch',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: [
                            'try {',
                            '\t$1',
                            '} catch (${2:Exception} e) {',
                            '\te.printStackTrace();',
                            '}'
                        ].join('\n'),
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Try-catch block',
                        range
                    },
                    {
                        label: 'trycatchfinally',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: [
                            'try {',
                            '\t$1',
                            '} catch (${2:Exception} e) {',
                            '\te.printStackTrace();',
                            '} finally {',
                            '\t$0',
                            '}'
                        ].join('\n'),
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Try-catch-finally block',
                        range
                    },
                    {
                        label: 'switch',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: [
                            'switch (${1:expression}) {',
                            '\tcase ${2:value}:',
                            '\t\t$3',
                            '\t\tbreak;',
                            '\tdefault:',
                            '\t\t$0',
                            '\t\tbreak;',
                            '}'
                        ].join('\n'),
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Switch statement',
                        range
                    },
                    {
                        label: 'array',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: '${1:Type}[] ${2:name} = new ${1:Type}[${3:size}];',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Create array',
                        range
                    },
                    {
                        label: 'arraylist',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'ArrayList<${1:Type}> ${2:list} = new ArrayList<>();',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Create ArrayList',
                        range
                    },
                    {
                        label: 'hashmap',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'HashMap<${1:Key}, ${2:Value}> ${3:map} = new HashMap<>();',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Create HashMap',
                        range
                    },
                    {
                        label: 'linkedlist',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'LinkedList<${1:Type}> ${2:list} = new LinkedList<>();',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Create LinkedList',
                        range
                    },
                    {
                        label: 'import',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'import ${1:package}.${2:Class};',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Import statement',
                        range
                    },
                    {
                        label: 'pkg',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'package ${1:com.example.app};',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Package declaration',
                        range
                    },
                    {
                        label: 'method',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: [
                            'public ${1:void} ${2:methodName}(${3:params}) {',
                            '\t$0',
                            '}'
                        ].join('\n'),
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Public method',
                        range
                    },
                    {
                        label: 'pmethod',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: [
                            'private ${1:void} ${2:methodName}(${3:params}) {',
                            '\t$0',
                            '}'
                        ].join('\n'),
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Private method',
                        range
                    },
                    {
                        label: 'interface',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: [
                            'public interface ${1:InterfaceName} {',
                            '\t$0',
                            '}'
                        ].join('\n'),
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Interface definition',
                        range
                    },
                    {
                        label: 'enum',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: [
                            'public enum ${1:EnumName} {',
                            '\t$0',
                            '}'
                        ].join('\n'),
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Enum definition',
                        range
                    },
                    {
                        label: 'trywith',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: [
                            'try (${1:resource}) {',
                            '\t$0',
                            '} catch (${2:Exception} e) {',
                            '\te.printStackTrace();',
                            '}'
                        ].join('\n'),
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Try-with-resources',
                        range
                    },
                    {
                        label: 'singleton',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: [
                            'private static ${1:ClassName} instance;',
                            '',
                            'private ${1:ClassName}() {}',
                            '',
                            'public static ${1:ClassName} getInstance() {',
                            '\tif (instance == null) {',
                            '\t\tinstance = new ${1:ClassName}();',
                            '\t}',
                            '\treturn instance;',
                            '}'
                        ].join('\n'),
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Singleton pattern',
                        range
                    },
                    {
                        label: 'sysout',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'System.out.println($1);',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'System.out.println() (alias)',
                        range
                    },
                    {
                        label: 'cin',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: '${1:String} ${2:input} = ${3:sc}.nextLine();',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Read input (alias)',
                        range
                    },
                    {
                        label: 'throw',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'throw new ${1:Exception}("${2:message}");',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Throw exception',
                        range
                    },
                    {
                        label: 'catch',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: [
                            'catch (${1:Exception} e) {',
                            '\t$0',
                            '}'
                        ].join('\n'),
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Catch block',
                        range
                    }
                ]

                return { suggestions }
            }
        })

        // Add keyboard shortcut for running code (F5)
        editor.addCommand(monaco.KeyCode.F5, () => {
            onRun?.()
        })

        // Add keyboard shortcut for duplicating line (Ctrl+D)
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyD, () => {
            editor.trigger('keyboard', 'editor.action.copyLinesDownAction', null)
        })

        // Add keyboard shortcut for moving line up (Alt+Up)
        editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.UpArrow, () => {
            editor.trigger('keyboard', 'editor.action.moveLinesUpAction', null)
        })

        // Add keyboard shortcut for moving line down (Alt+Down)
        editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.DownArrow, () => {
            editor.trigger('keyboard', 'editor.action.moveLinesDownAction', null)
        })

        // Add keyboard shortcut for formatting
        editor.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF, () => {
            editor.getAction('editor.action.formatDocument')?.run()
        })


        // Focus the editor
        editor.focus()

        // Call the mount callback
        onEditorMount?.(editor)
    }

    // Update theme when it changes
    useEffect(() => {
        if (monacoRef.current) {
            monacoRef.current.editor.setTheme(theme === 'dark' ? 'cpp-ide-dark' : 'cpp-ide-light')
        }
    }, [theme])

    useEffect(() => {
        const model = editorRef.current?.getModel()
        if (model && monacoRef.current) {
            monacoRef.current.editor.setModelLanguage(model, language === 'java' ? 'java' : 'cpp')
        }
    }, [language])

    // Update editor when value prop changes externally
    useEffect(() => {
        if (editorRef.current) {
            const currentValue = editorRef.current.getValue()
            if (value !== currentValue) {
                editorRef.current.setValue(value)
            }
        }
    }, [value])

    // Handle window/container resize - update editor layout
    useEffect(() => {
        const handleResize = () => {
            // Delay to allow container to finish resizing
            setTimeout(() => {
                editorRef.current?.layout()
            }, 100)
        }

        window.addEventListener('resize', handleResize)

        // Also trigger layout update periodically to catch container changes
        const interval = setInterval(() => {
            editorRef.current?.layout()
        }, 500)

        return () => {
            window.removeEventListener('resize', handleResize)
            clearInterval(interval)
        }
    }, [])

    return (
        <div className="h-full w-full">
            <MonacoEditor
                height="100%"
                defaultLanguage={language === 'java' ? 'java' : 'cpp'}
                theme="vs-dark"
                value={value}
                onChange={onChange}
                onMount={handleEditorMount}
                options={{
                    fontSize: fontSize,
                    fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
                    fontLigatures: true,
                    lineNumbers: 'on',
                    renderLineHighlight: 'all',
                    cursorBlinking: 'smooth',
                    cursorSmoothCaretAnimation: 'on',
                    smoothScrolling: true,
                    contextmenu: false,  // Disable right-click context menu to prevent copy/paste
                    minimap: {
                        enabled: minimap,
                        scale: 1,
                        showSlider: 'mouseover'
                    },
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: tabSize,
                    insertSpaces: true,
                    wordWrap: wordWrap ? 'on' : 'off',
                    folding: true,
                    foldingHighlight: true,
                    showFoldingControls: 'mouseover',
                    bracketPairColorization: {
                        enabled: true
                    },
                    guides: {
                        bracketPairs: true,
                        indentation: true
                    },
                    suggest: {
                        showKeywords: true,
                        showSnippets: true,
                        showClasses: true,
                        showFunctions: true,
                        showVariables: true
                    },
                    quickSuggestions: {
                        other: true,
                        comments: false,
                        strings: false
                    },
                    parameterHints: {
                        enabled: true
                    },
                    formatOnPaste: true,
                    formatOnType: true,
                    renderWhitespace: 'selection',
                    mouseWheelZoom: true,
                    padding: {
                        top: 10,
                        bottom: 10
                    },
                    stickyScroll: {
                        enabled: true
                    }
                }}
                loading={
                    <div className="h-full w-full flex items-center justify-center bg-editor-bg">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
                            <span className="text-text-secondary">Loading editor...</span>
                        </div>
                    </div>
                }
            />
        </div>
    )
}

export default Editor
