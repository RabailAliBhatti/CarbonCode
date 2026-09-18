import { describe, it, expect } from 'vitest'
import { getLanguageFromFileName } from '../types/language'
import { JAVA_STATIC_MEMBERS, JAVA_INSTANCE_MEMBERS } from '../utils/javaIntellisense'
import {
    getPostImportCompletions,
    getPythonSnippets,
    PYTHON_FILE_METHODS,
    PYTHON_PATH_INSTANCE_MEMBERS,
    getPythonCompletionItems
} from '../utils/pythonIntellisense'

describe('File Handling Support', () => {
    describe('Language Detection for Text & Data Files', () => {
        it('should identify plain text files', () => {
            expect(getLanguageFromFileName('notes.txt')).toBe('plaintext')
            expect(getLanguageFromFileName('README.text')).toBe('plaintext')
            expect(getLanguageFromFileName('server.log')).toBe('plaintext')
        })

        it('should identify data files (CSV, TSV, DAT, IN, OUT, JSON, MD)', () => {
            expect(getLanguageFromFileName('dataset.csv')).toBe('plaintext')
            expect(getLanguageFromFileName('records.tsv')).toBe('plaintext')
            expect(getLanguageFromFileName('matrix.dat')).toBe('plaintext')
            expect(getLanguageFromFileName('input1.in')).toBe('plaintext')
            expect(getLanguageFromFileName('output1.out')).toBe('plaintext')
            expect(getLanguageFromFileName('config.json')).toBe('plaintext')
            expect(getLanguageFromFileName('GUIDE.md')).toBe('plaintext')
        })

        it('should continue correctly identifying code files', () => {
            expect(getLanguageFromFileName('main.cpp')).toBe('cpp')
            expect(getLanguageFromFileName('code.c')).toBe('c')
            expect(getLanguageFromFileName('App.java')).toBe('java')
            expect(getLanguageFromFileName('script.py')).toBe('python')
        })
    })

    describe('Java File Handling IntelliSense', () => {
        it('should provide Files static members', () => {
            const filesMembers = JAVA_STATIC_MEMBERS['Files']
            expect(filesMembers).toBeDefined()
            const memberNames = filesMembers.map(m => m.name)
            expect(memberNames).toContain('readString')
            expect(memberNames).toContain('writeString')
            expect(memberNames).toContain('readAllLines')
            expect(memberNames).toContain('readAllBytes')
            expect(memberNames).toContain('exists')
            expect(memberNames).toContain('copy')
            expect(memberNames).toContain('move')
            expect(memberNames).toContain('delete')
        })

        it('should provide Path and Paths static members', () => {
            expect(JAVA_STATIC_MEMBERS['Path']).toBeDefined()
            expect(JAVA_STATIC_MEMBERS['Path'].map(m => m.name)).toContain('of')

            expect(JAVA_STATIC_MEMBERS['Paths']).toBeDefined()
            expect(JAVA_STATIC_MEMBERS['Paths'].map(m => m.name)).toContain('get')
        })

        it('should provide File & Reader/Writer instance members', () => {
            const instanceNames = JAVA_INSTANCE_MEMBERS.map(m => m.name)
            expect(instanceNames).toContain('exists')
            expect(instanceNames).toContain('isFile')
            expect(instanceNames).toContain('isDirectory')
            expect(instanceNames).toContain('getName')
            expect(instanceNames).toContain('getAbsolutePath')
            expect(instanceNames).toContain('createNewFile')
            expect(instanceNames).toContain('delete')
            expect(instanceNames).toContain('listFiles')
            expect(instanceNames).toContain('readLine')
            expect(instanceNames).toContain('write')
            expect(instanceNames).toContain('newLine')
            expect(instanceNames).toContain('flush')
        })
    })

    describe('Python File Handling IntelliSense', () => {
        it('should provide csv module member completions', () => {
            const csvMembers = getPostImportCompletions('csv')
            expect(csvMembers.map(m => m.label)).toEqual(
                expect.arrayContaining(['reader', 'writer', 'DictReader', 'DictWriter'])
            )
        })

        it('should provide shutil module member completions', () => {
            const shutilMembers = getPostImportCompletions('shutil')
            expect(shutilMembers.map(m => m.label)).toEqual(
                expect.arrayContaining(['copy', 'copy2', 'copytree', 'rmtree', 'move'])
            )
        })

        it('should provide pathlib module member completions', () => {
            const pathlibMembers = getPostImportCompletions('pathlib')
            expect(pathlibMembers.map(m => m.label)).toEqual(
                expect.arrayContaining(['Path', 'PurePath'])
            )
        })

        it('should include rich file handling snippets', () => {
            const snippetLabels = getPythonSnippets().map(s => s.label)
            expect(snippetLabels).toContain('with')
            expect(snippetLabels).toContain('readfile')
            expect(snippetLabels).toContain('writefile')
            expect(snippetLabels).toContain('appendfile')
            expect(snippetLabels).toContain('readcsv')
            expect(snippetLabels).toContain('writecsv')
            expect(snippetLabels).toContain('readjson')
            expect(snippetLabels).toContain('writejson')
            expect(snippetLabels).toContain('pathlib-read')
            expect(snippetLabels).toContain('pathlib-write')
        })

        it('should suggest file object methods on dot access for file handles (f.)', () => {
            const mockModel = {
                getValueInRange: () => 'with open("data.txt") as f:\n    f.',
                getValue: () => 'with open("data.txt") as f:\n    f.',
                getLineContent: () => '    f.',
                getWordUntilPosition: () => ({ word: '', startColumn: 7, endColumn: 7 })
            }
            const mockPosition = { lineNumber: 2, column: 7 }
            const mockMonaco = {
                languages: {
                    CompletionItemKind: {
                        Function: 1,
                        Class: 2,
                        Constant: 3,
                        Variable: 4
                    },
                    CompletionItemInsertTextRule: {
                        InsertAsSnippet: 4
                    }
                }
            }

            const { suggestions } = getPythonCompletionItems(mockModel, mockPosition, mockMonaco)
            const labels = suggestions.map(s => s.label)
            expect(labels).toContain('read')
            expect(labels).toContain('readline')
            expect(labels).toContain('write')
            expect(labels).toContain('close')
        })

        it('should suggest Path methods on dot access for path variables (path.)', () => {
            const mockModel = {
                getValueInRange: () => 'p = Path("data.txt")\np.',
                getValue: () => 'p = Path("data.txt")\np.',
                getLineContent: () => 'p.',
                getWordUntilPosition: () => ({ word: '', startColumn: 3, endColumn: 3 })
            }
            const mockPosition = { lineNumber: 2, column: 3 }
            const mockMonaco = {
                languages: {
                    CompletionItemKind: {
                        Function: 1,
                        Class: 2,
                        Constant: 3,
                        Variable: 4
                    },
                    CompletionItemInsertTextRule: {
                        InsertAsSnippet: 4
                    }
                }
            }

            // Test with a variable named my_path.
            const mockModel2 = {
                ...mockModel,
                getValueInRange: () => 'my_path.',
                getLineContent: () => 'my_path.',
                getWordUntilPosition: () => ({ word: '', startColumn: 9, endColumn: 9 })
            }
            const { suggestions } = getPythonCompletionItems(mockModel2, { lineNumber: 1, column: 9 }, mockMonaco)
            const labels = suggestions.map(s => s.label)
            expect(labels).toContain('exists')
            expect(labels).toContain('is_file')
            expect(labels).toContain('read_text')
            expect(labels).toContain('write_text')
        })
    })
})
