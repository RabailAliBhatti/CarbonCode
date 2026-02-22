import { useRef, useEffect } from 'react'
import MonacoEditor, { OnMount, loader, Monaco } from '@monaco-editor/react'
import * as monacoEditor from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

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
    onChange: (value: string | undefined) => void
    onEditorMount?: (editor: monacoEditor.editor.IStandaloneCodeEditor) => void
    fontSize?: number
    tabSize?: number
    theme?: 'dark' | 'light'
    minimap?: boolean
    wordWrap?: boolean
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

function Editor({ value, onChange, onEditorMount, fontSize = 14, tabSize = 4, minimap = true, wordWrap = false, theme = 'dark' }: EditorProps) {
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
                ['(', ')'],
                ['<', '>']
            ],
            autoClosingPairs: [
                { open: '{', close: '}' },
                { open: '[', close: ']' },
                { open: '(', close: ')' },
                { open: '<', close: '>' },
                { open: '"', close: '"' },
                { open: "'", close: "'" }
            ],
            surroundingPairs: [
                { open: '{', close: '}' },
                { open: '[', close: ']' },
                { open: '(', close: ')' },
                { open: '<', close: '>' },
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
                    // Keywords
                    ...['auto', 'break', 'case', 'char', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum', 'extern', 'float', 'for', 'goto', 'if', 'int', 'long', 'register', 'return', 'short', 'signed', 'sizeof', 'static', 'struct', 'switch', 'typedef', 'union', 'unsigned', 'void', 'volatile', 'while', 'class', 'namespace', 'template', 'typename', 'using', 'virtual', 'friend', 'inline', 'public', 'protected', 'private', 'bool', 'true', 'false', 'nullptr', 'this', 'throw', 'try', 'catch', 'new', 'delete', 'operator', 'explicit', 'export', 'mutable', 'asm', 'dynamic_cast', 'static_cast', 'reinterpret_cast', 'const_cast', 'typeid'].map(k => ({
                        label: k,
                        kind: monaco.languages.CompletionItemKind.Keyword,
                        insertText: k,
                        range: range
                    })),
                    // Standard types & objects
                    ...['std', 'string', 'vector', 'map', 'set', 'list', 'queue', 'stack', 'deque', 'cout', 'cin', 'cerr', 'endl', 'printf', 'scanf'].map(k => ({
                        label: k,
                        kind: monaco.languages.CompletionItemKind.Variable,
                        insertText: k,
                        range: range
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
                        label: 'include',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: '#include <$1>',
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'Include header',
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
                        label: 'for',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: [
                            'for (int i = 0; i < $1; ++i) {',
                            '\t$0',
                            '}'
                        ].join('\n'),
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'For loop',
                        range: range
                    },
                    {
                        label: 'if',
                        kind: monaco.languages.CompletionItemKind.Snippet,
                        insertText: [
                            'if ($1) {',
                            '\t$0',
                            '}'
                        ].join('\n'),
                        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        documentation: 'If block',
                        range: range
                    }
                ];
                return { suggestions: suggestions };
            }
        });

        // Add keyboard shortcut for running code
        editor.addCommand(monaco.KeyCode.F5, () => {
            // This will be handled by the menu system
        })

        // Disable Copy-Paste (Anti-Cheat Feature)
        editor.onKeyDown((e) => {
            const { ctrlKey, metaKey, keyCode } = e;
            // Block Ctrl+V / Cmd+V
            if ((ctrlKey || metaKey) && keyCode === monaco.KeyCode.KeyV) {
                e.preventDefault();
                e.stopPropagation();
            }
            // Block Ctrl+C / Cmd+C (optional, but good for total restriction)
            if ((ctrlKey || metaKey) && keyCode === monaco.KeyCode.KeyC) {
                e.preventDefault();
                e.stopPropagation();
            }
        });

        // Block the editor's built-in paste command
        const editorAny = editor as any;
        if (editorAny._commandService) {
            const originalExecuteCommand = editorAny._commandService.executeCommand;
            editorAny._commandService.executeCommand = function(id: string, ...args: any[]) {
                if (id === 'editor.action.clipboardPasteAction' || id === 'paste') {
                    return;
                }
                return originalExecuteCommand.apply(this, [id, ...args]);
            };
        }

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

    // Update editor when value prop changes externally
    useEffect(() => {
        if (editorRef.current) {
            const currentValue = editorRef.current.getValue()
            if (value !== currentValue) {
                editorRef.current.setValue(value)
            }
        }
    }, [value])

    return (
        <div className="h-full w-full">
            <MonacoEditor
                height="100%"
                defaultLanguage="cpp"
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
