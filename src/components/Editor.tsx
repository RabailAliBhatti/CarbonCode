import { useRef, useEffect } from 'react'
import MonacoEditor, { OnMount, loader, Monaco } from '@monaco-editor/react'
import * as monacoEditor from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
import { SupportedLanguage } from '../types/language'
import type { CompileError } from '../utils/parseCompileErrors'
import { FileTab } from './TabBar'
import {
    getJavaCompletionItems,
    updateJavaProjectFiles,
    ProjectJavaFile,
    JAVA_ALL_CLASS_IMPORTS,
    getAllProjectSymbols
} from '../utils/javaIntellisense'

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
    onRun?: () => void
    parsedErrors?: CompileError[]
    tabs?: FileTab[]
    rootPath?: string | null
}

// CarbonCode Dark theme colors
const editorThemeDark = {
    base: 'vs-dark' as const,
    inherit: true,
    rules: [
        { token: 'comment', foreground: '6F8099', fontStyle: 'italic' },
        { token: 'keyword', foreground: '25B8FF' },
        { token: 'string', foreground: '20D4B0' },
        { token: 'number', foreground: 'F4B740' },
        { token: 'type', foreground: '38BDF8' },
        { token: 'function', foreground: '60A5FA' },
        { token: 'variable', foreground: 'F4F7FB' },
        { token: 'operator', foreground: 'A9B7CC' },
        { token: 'delimiter', foreground: 'A9B7CC' },
        { token: 'preprocessor', foreground: 'C084FC' },
    ],
    colors: {
        'editor.background': '#080D17',
        'editor.foreground': '#F4F7FB',
        'editor.lineHighlightBackground': '#0F1929',
        'editor.selectionBackground': '#203452',
        'editor.inactiveSelectionBackground': '#17263B',
        'editorCursor.foreground': '#25B8FF',
        'editorWhitespace.foreground': '#17263B',
        'editorIndentGuide.background': '#17263B',
        'editorIndentGuide.activeBackground': '#203452',
        'editor.selectionHighlightBackground': '#1688F526',
        'editorLineNumber.foreground': '#6F8099',
        'editorLineNumber.activeForeground': '#F4F7FB',
        'editorGutter.background': '#080D17',
        'editorBracketMatch.background': '#111D30',
        'editorBracketMatch.border': '#1688F5',
        'scrollbarSlider.background': '#20345266',
        'scrollbarSlider.hoverBackground': '#1688F588',
        'scrollbarSlider.activeBackground': '#1688F5CC',
    }
}

// Light theme colors
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

function Editor({
    value,
    language,
    onChange,
    onEditorMount,
    fontSize = 14,
    tabSize = 4,
    minimap = true,
    wordWrap = false,
    theme = 'dark',
    onRun,
    parsedErrors = [],
    tabs,
    rootPath
}: EditorProps) {
    const editorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(null)
    const monacoRef = useRef<Monaco | null>(null)
    const diskFilesCacheRef = useRef<Map<string, ProjectJavaFile>>(new Map())

    // 1. Scan rootPath for disk .java files when rootPath changes
    useEffect(() => {
        let isMounted = true

        const scanDiskJavaFiles = async () => {
            if (!rootPath || !window.electronAPI?.readDirectory || !window.electronAPI?.readFile) {
                diskFilesCacheRef.current.clear()
                return
            }

            const diskMap = new Map<string, ProjectJavaFile>()
            try {
                const scanDir = async (dirPath: string, depth = 0) => {
                    if (depth > 6 || !isMounted) return
                    const items = await window.electronAPI.readDirectory(dirPath)
                    for (const item of items) {
                        if (!isMounted) return
                        if (item.isDirectory) {
                            if (!['node_modules', '.git', 'bin', 'target', 'out', 'dist', 'build', '.idea', '.vscode'].includes(item.name)) {
                                await scanDir(item.path, depth + 1)
                            }
                        } else if (item.name.endsWith('.java')) {
                            try {
                                const content = await window.electronAPI.readFile(item.path)
                                if (content !== null && isMounted) {
                                    diskMap.set(item.name, {
                                        fileName: item.name,
                                        content,
                                        filePath: item.path
                                    })
                                }
                            } catch {
                                // Ignore read errors
                            }
                        }
                    }
                }

                await scanDir(rootPath)
                if (isMounted) {
                    diskFilesCacheRef.current = diskMap
                }
            } catch {
                // Ignore directory scan errors
            }
        }

        scanDiskJavaFiles()

        return () => {
            isMounted = false
        }
    }, [rootPath])

    // 2. Synchronize active in-memory tabs & current editor value on top of disk files
    useEffect(() => {
        const mergedFiles = new Map<string, ProjectJavaFile>(diskFilesCacheRef.current)

        // Overlay open tabs (they contain unsaved/fresher in-memory content)
        if (tabs && tabs.length > 0) {
            for (const tab of tabs) {
                if (tab.language === 'java' || tab.fileName.endsWith('.java')) {
                    mergedFiles.set(tab.fileName, {
                        fileName: tab.fileName,
                        content: tab.content,
                        filePath: tab.filePath
                    })
                }
            }
        }

        // Overlay currently active file content
        if (language === 'java' && value !== undefined) {
            const activeTab = tabs?.find(t => t.language === 'java' || t.fileName.endsWith('.java'))
            const currentFileName = activeTab?.fileName || 'Main.java'
            mergedFiles.set(currentFileName, {
                fileName: currentFileName,
                content: value,
                filePath: activeTab?.filePath
            })
        }

        updateJavaProjectFiles(Array.from(mergedFiles.values()))
    }, [tabs, value, language, rootPath])

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

                    // Common Headers
                    ...['iostream', 'vector', 'string', 'algorithm', 'cmath', 'cstdio', 'memory', 'map', 'set', 'fstream', 'thread', 'chrono', 'sstream', 'queue', 'stack', 'deque', 'list', 'tuple', 'utility', 'functional', 'numeric', 'iterator', 'climits', 'cstdint', 'cstring', 'cctype', 'cassert', 'iomanip'].map(h => ({
                        label: `<${h}>`,
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

        // Configure C language settings
        monaco.languages.setLanguageConfiguration('c', {
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

        // Enhanced C IntelliSense & Snippets
        monaco.languages.registerCompletionItemProvider('c', {
            provideCompletionItems: (model, position) => {
                const word = model.getWordUntilPosition(position)
                const range = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: word.startColumn,
                    endColumn: word.endColumn
                }

                const suggestions = [
                    // Keywords
                    ...['auto', 'break', 'case', 'char', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum', 'extern', 'float', 'for', 'goto', 'if', 'inline', 'int', 'long', 'register', 'restrict', 'return', 'short', 'signed', 'sizeof', 'static', 'struct', 'switch', 'typedef', 'union', 'unsigned', 'void', 'volatile', 'while', '_Bool', '_Complex', '_Imaginary', '_Atomic', '_Generic', '_Static_assert', '_Thread_local', 'bool', 'true', 'false', 'NULL'].map(k => ({
                        label: k,
                        kind: monaco.languages.CompletionItemKind.Keyword,
                        insertText: k,
                        range
                    })),

                    // Standard Types
                    ...['size_t', 'ssize_t', 'ptrdiff_t', 'intptr_t', 'uintptr_t', 'FILE', 'time_t', 'clock_t', 'int8_t', 'int16_t', 'int32_t', 'int64_t', 'uint8_t', 'uint16_t', 'uint32_t', 'uint64_t'].map(t => ({
                        label: t,
                        kind: monaco.languages.CompletionItemKind.TypeParameter,
                        insertText: t,
                        range,
                        detail: 'Standard C type'
                    })),

                    // Standard Library Functions
                    ...['printf', 'scanf', 'fprintf', 'sprintf', 'snprintf', 'fopen', 'fclose', 'fread', 'fwrite', 'fgets', 'fputs', 'getchar', 'putchar', 'perror', 'fflush', 'remove', 'rename', 'rewind', 'fseek', 'ftell', 'feof'].map(f => ({
                        label: f,
                        kind: monaco.languages.CompletionItemKind.Function,
                        insertText: `${f}($1)`,
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        range,
                        detail: 'stdio.h function'
                    })),

                    ...['malloc', 'calloc', 'realloc', 'free', 'exit', 'abort', 'atoi', 'atof', 'atol', 'strtol', 'strtod', 'qsort', 'bsearch', 'rand', 'srand', 'abs', 'labs', 'system', 'getenv'].map(f => ({
                        label: f,
                        kind: monaco.languages.CompletionItemKind.Function,
                        insertText: `${f}($1)`,
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        range,
                        detail: 'stdlib.h function'
                    })),

                    ...['strlen', 'strcpy', 'strncpy', 'strcat', 'strncat', 'strcmp', 'strncmp', 'strchr', 'strrchr', 'strstr', 'strtok', 'memset', 'memcpy', 'memmove', 'memcmp', 'strdup'].map(f => ({
                        label: f,
                        kind: monaco.languages.CompletionItemKind.Function,
                        insertText: `${f}($1)`,
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        range,
                        detail: 'string.h function'
                    })),

                    ...['sqrt', 'pow', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2', 'exp', 'log', 'log10', 'floor', 'ceil', 'round', 'fabs', 'fmod'].map(f => ({
                        label: f,
                        kind: monaco.languages.CompletionItemKind.Function,
                        insertText: `${f}($1)`,
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        range,
                        detail: 'math.h function'
                    })),

                    ...['isalpha', 'isdigit', 'isalnum', 'isspace', 'isupper', 'islower', 'toupper', 'tolower'].map(f => ({
                        label: f,
                        kind: monaco.languages.CompletionItemKind.Function,
                        insertText: `${f}($1)`,
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        range,
                        detail: 'ctype.h function'
                    })),

                    // Header Includes
                    ...['stdio.h', 'stdlib.h', 'string.h', 'stdbool.h', 'stdint.h', 'math.h', 'time.h', 'ctype.h', 'assert.h', 'limits.h', 'float.h'].map(h => ({
                        label: `#include <${h}>`,
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: `#include <${h}>`,
                        range,
                        documentation: `Include <${h}>`
                    })),

                    // Code Snippets
                    {
                        label: 'main',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: [
                            'int main(void) {',
                            '\t$0',
                            '\treturn 0;',
                            '}'
                        ].join('\n'),
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Standard main function',
                        range
                    },
                    {
                        label: 'main-args',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: [
                            'int main(int argc, char *argv[]) {',
                            '\t$0',
                            '\treturn 0;',
                            '}'
                        ].join('\n'),
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Main function with command-line arguments',
                        range
                    },
                    {
                        label: 'printf',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'printf("${1:%s}\\n"${2});',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Formatted print statement',
                        range
                    },
                    {
                        label: 'scanf',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: 'scanf("${1:%d}", &${2:var});',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Formatted input statement',
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
                        label: 'do-while',
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
                        label: 'switch',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: [
                            'switch (${1:expression}) {',
                            '\tcase ${2:value}:',
                            '\t\t$0',
                            '\t\tbreak;',
                            '\tdefault:',
                            '\t\tbreak;',
                            '}'
                        ].join('\n'),
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Switch statement',
                        range
                    },
                    {
                        label: 'struct',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: [
                            'typedef struct {',
                            '\t$0',
                            '} ${1:Name};'
                        ].join('\n'),
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Typedef struct definition',
                        range
                    },
                    {
                        label: 'malloc',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: '${1:type}* ${2:ptr} = (${1:type}*)malloc(${3:size} * sizeof(${1:type}));',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Dynamic memory allocation',
                        range
                    }
                ]

                return { suggestions }
            }
        })

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
            triggerCharacters: ['.', ' ', '*', '@'],
            provideCompletionItems: (model, position) => {
                return getJavaCompletionItems(model, position, monaco)
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

        // Java missing import diagnostic service with full standard libraries
        const javaImportMap: Record<string, string> = {
            ...JAVA_ALL_CLASS_IMPORTS,
            'Scanner': 'java.util.Scanner',
            'ArrayList': 'java.util.ArrayList',
            'LinkedList': 'java.util.LinkedList',
            'HashMap': 'java.util.HashMap',
            'TreeMap': 'java.util.TreeMap',
            'HashSet': 'java.util.HashSet',
            'TreeSet': 'java.util.TreeSet',
            'List': 'java.util.List',
            'Map': 'java.util.Map',
            'Set': 'java.util.Set',
            'Collections': 'java.util.Collections',
            'Arrays': 'java.util.Arrays',
            'Comparator': 'java.util.Comparator',
            'Comparable': 'java.lang.Comparable',
            'Optional': 'java.util.Optional',
            'Stream': 'java.util.stream.Stream',
            'File': 'java.io.File',
            'FileReader': 'java.io.FileReader',
            'FileWriter': 'java.io.FileWriter',
            'BufferedReader': 'java.io.BufferedReader',
            'PrintWriter': 'java.io.PrintWriter',
            'IOException': 'java.io.IOException',
            'Serializable': 'java.io.Serializable',
            'BigDecimal': 'java.math.BigDecimal',
            'BigInteger': 'java.math.BigInteger',
            'LocalDate': 'java.time.LocalDate',
            'LocalTime': 'java.time.LocalTime',
            'LocalDateTime': 'java.time.LocalDateTime',
            'Pattern': 'java.util.regex.Pattern',
            'Matcher': 'java.util.regex.Matcher',
            'StringBuilder': 'java.lang.StringBuilder',
            'Integer': 'java.lang.Integer',
            'Double': 'java.lang.Double',
            'Boolean': 'java.lang.Boolean',
        }

        const resolveJavaImport = (className: string): string | undefined => {
            const projectSyms = getAllProjectSymbols()
            const projClass = projectSyms.find(s => s.name === className)
            if (projClass) {
                if (projClass.packageName) {
                    return `${projClass.packageName}.${className}`
                }
                return undefined // Same/default package, no import needed
            }
            return javaImportMap[className]
        }

        // Quick fix action: Add import
        editor.addAction({
            id: 'java.add-import',
            label: 'Add Import',
            keybindings: [monaco.KeyMod.Alt | monaco.KeyCode.Enter],
            contextMenuGroupId: 'navigation',
            contextMenuOrder: 1.5,
            run: (ed) => {
                const model = ed.getModel()
                if (!model || language !== 'java') return

                const position = ed.getPosition()
                if (!position) return
                const word = model.getWordAtPosition(position)
                if (!word) return

                const className = word.word
                const fullImport = resolveJavaImport(className)
                if (!fullImport) return

                const code = model.getValue()

                // Check if import already exists
                if (code.includes(`import ${fullImport};`)) return

                // Find where to insert (after package or at top, but after initial comment lines if no package)
                const packageMatch = code.match(/package\s+[\w.]+;\s*\n/)
                if (packageMatch) {
                    const insertPos = model.getPositionAt(code.indexOf(packageMatch[0]) + packageMatch[0].length)
                    model.applyEdits([{
                        range: new monacoEditor.Range(insertPos.lineNumber, insertPos.column, insertPos.lineNumber, insertPos.column),
                        text: `\nimport ${fullImport};`
                    }])
                } else {
                    // Insert at the top, but after any initial comment lines (single-line comments)
                    let insertLine = 1
                    let insertColumn = 1
                    const lines = code.split('\n')
                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i]
                        // If we hit a non-empty line that is not a comment, break
                        if (line.trim() !== '' && !line.trim().startsWith('//')) {
                            break
                        }
                        insertLine = i + 2 // because we want to insert after this line
                        insertColumn = 1
                    }

                    model.applyEdits([{
                        range: new monacoEditor.Range(insertLine, insertColumn, insertLine, insertColumn),
                        text: `import ${fullImport};\n`
                    }])
                }
            }
        })

        // Register code action provider for quick fixes
        monacoEditor.languages.registerCodeActionProvider('java', {
            provideCodeActions: (model, _range, _context, _token) => {
                const actions: monacoEditor.languages.CodeAction[] = []
                const code = model.getValue()
                const lines = code.split('\n')

                const projectSyms = getAllProjectSymbols()
                const projectClassNames = new Set(projectSyms.map(s => s.name))

                // Check each line for missing imports
                for (const className of Object.keys(javaImportMap)) {
                    if (projectClassNames.has(className) || new RegExp(`\\b(class|interface|enum|record)\\s+${className}\\b`).test(code)) {
                        continue
                    }
                    const fullImport = javaImportMap[className]

                    // Check if class is used but not imported
                    const classRegex = new RegExp(`\\b${className}\\b`, 'g')
                    if (classRegex.test(code) && !code.includes(`import ${fullImport};`)) {
                        // Find all occurrences
                        let match
                        while ((match = classRegex.exec(code)) !== null) {
                            const lineNumber = code.substring(0, match.index).split('\n').length
                            const line = lines[lineNumber - 1]

                            // Check if it's in an import statement
                            if (line.trim().startsWith('import')) continue

                            const startCol = match.index - code.lastIndexOf('\n', match.index - 1)
                            const endCol = startCol + className.length

                            // Find where to insert imports
                            let insertLineNumber = 1
                            let insertColumn = 1
                            const packageLineIndex = lines.findIndex(l => l.trimStart().startsWith('package '))
                            if (packageLineIndex !== -1) {
                                // Find first blank line after package statement
                                let found = false
                                for (let i = packageLineIndex + 1; i < lines.length; i++) {
                                    if (lines[i].trim() === '') {
                                        insertLineNumber = i + 1
                                        insertColumn = 1
                                        found = true
                                        break
                                    }
                                }
                                // If no blank line found, insert right after the package line
                                if (!found) {
                                    insertLineNumber = packageLineIndex + 2
                                    insertColumn = 1
                                }
                            } else {
                                // No package statement: insert after initial comment lines
                                for (let i = 0; i < lines.length; i++) {
                                    if (lines[i].trim() !== '' && !lines[i].trim().startsWith('//')) {
                                        break
                                    }
                                    insertLineNumber = i + 2
                                    insertColumn = 1
                                }
                            }

                            actions.push({
                                title: `Import '${className}'`,
                                kind: 'quickfix',
                                diagnostics: [{
                                    severity: monacoEditor.MarkerSeverity.Warning,
                                    message: `Cannot resolve symbol '${className}'`,
                                    startLineNumber: lineNumber,
                                    startColumn: startCol,
                                    endLineNumber: lineNumber,
                                    endColumn: endCol,
                                    source: 'Java'
                                }],
                                edit: {
                                    edits: [{
                                        resource: model.uri,
                                        versionId: model.getVersionId(),
                                        textEdit: {
                                            range: {
                                                startLineNumber: insertLineNumber,
                                                startColumn: insertColumn,
                                                endLineNumber: insertLineNumber,
                                                endColumn: insertColumn
                                            },
                                            text: `import ${fullImport};\n`
                                        }
                                    }]
                                },
                                isPreferred: true
                            })
                        }
                    }
                }

                return { actions, dispose: () => {} }
            }
        })

        // Set markers for missing imports on content change
        const updateDiagnostics = () => {
            const model = editor.getModel()
            if (!model || language !== 'java') return

            const code = model.getValue()
            const markers: monacoEditor.editor.IMarkerData[] = []
            const lines = code.split('\n')

            const projectSyms = getAllProjectSymbols()
            const projectClassNames = new Set(projectSyms.map(s => s.name))

            for (const className of Object.keys(javaImportMap)) {
                if (projectClassNames.has(className) || new RegExp(`\\b(class|interface|enum|record)\\s+${className}\\b`).test(code)) {
                    continue
                }
                const fullImport = javaImportMap[className]
                const classRegex = new RegExp(`\\b${className}\\b`, 'g')
                let match

                if (classRegex.test(code) && !code.includes(`import ${fullImport};`)) {
                    classRegex.lastIndex = 0
                    while ((match = classRegex.exec(code)) !== null) {
                        const lineNumber = code.substring(0, match.index).split('\n').length
                        const line = lines[lineNumber - 1]
                        if (line.trim().startsWith('import')) continue

                        const startCol = match.index - code.lastIndexOf('\n', match.index - 1)
                        const endCol = startCol + className.length

                        markers.push({
                            severity: monacoEditor.MarkerSeverity.Warning,
                            message: `Cannot resolve symbol '${className}'. Press Alt+Enter to import.`,
                            startLineNumber: lineNumber,
                            startColumn: startCol,
                            endLineNumber: lineNumber,
                            endColumn: endCol,
                            source: 'Java',
                            tags: [monacoEditor.MarkerTag.Unnecessary]
                        })
                    }
                }
            }

            monacoEditor.editor.setModelMarkers(model, 'java-imports', markers)
        }

        // Run diagnostics on content change
        editor.onDidChangeModelContent(() => {
            updateDiagnostics()
        })

        // Run initial diagnostics
        updateDiagnostics()


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
            monacoRef.current.editor.setModelLanguage(model, language === 'java' ? 'java' : language === 'c' ? 'c' : 'cpp')
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

        // Also check periodically for container size changes
        const interval = setInterval(() => {
            editorRef.current?.layout()
        }, 1000)

        return () => {
            window.removeEventListener('resize', handleResize)
            clearInterval(interval)
        }
    }, [])

    // Set compile error markers
    useEffect(() => {
        const model = editorRef.current?.getModel()
        if (!model || !monacoRef.current) return

        const markers: monacoEditor.editor.IMarkerData[] = parsedErrors.map(err => ({
            severity: err.severity === 'error' ? monacoEditor.MarkerSeverity.Error : monacoEditor.MarkerSeverity.Warning,
            message: err.message,
            startLineNumber: err.line,
            startColumn: err.column || 1,
            endLineNumber: err.line,
            endColumn: err.column ? err.column + 10 : 1000,
            source: 'compiler'
        }))

        monacoRef.current.editor.setModelMarkers(model, 'compiler', markers)
    }, [parsedErrors])

    return (
        <div className="h-full w-full">
            <MonacoEditor
                height="100%"
                defaultLanguage={language === 'java' ? 'java' : language === 'c' ? 'c' : 'cpp'}
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
                    contextmenu: true,
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
                    quickSuggestionsDelay: 0,
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
