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
}

// VS Code Dark+ theme colors
const editorTheme = {
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

function Editor({ value, onChange, onEditorMount }: EditorProps) {
    const editorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(null)
    const monacoRef = useRef<Monaco | null>(null)

    const handleEditorMount: OnMount = (editor, monaco) => {
        editorRef.current = editor
        monacoRef.current = monaco

        // Define custom theme
        monaco.editor.defineTheme('cpp-ide-dark', editorTheme)
        monaco.editor.setTheme('cpp-ide-dark')

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

        // Add keyboard shortcut for running code
        editor.addCommand(monaco.KeyCode.F5, () => {
            // This will be handled by the menu system
        })

        // Focus the editor
        editor.focus()

        // Call the mount callback
        onEditorMount?.(editor)
    }

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
                    fontSize: 14,
                    fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
                    fontLigatures: true,
                    lineNumbers: 'on',
                    renderLineHighlight: 'all',
                    cursorBlinking: 'smooth',
                    cursorSmoothCaretAnimation: 'on',
                    smoothScrolling: true,
                    minimap: {
                        enabled: true,
                        scale: 1,
                        showSlider: 'mouseover'
                    },
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 4,
                    insertSpaces: true,
                    wordWrap: 'off',
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
