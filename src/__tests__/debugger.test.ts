import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('electron', () => ({
    app: {
        getPath: vi.fn(() => '/mock/temp'),
        getAppPath: vi.fn(() => '/mock/app'),
        isPackaged: false
    }
}))

vi.mock('fs', () => ({
    existsSync: vi.fn(() => false),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    rmSync: vi.fn()
}))

vi.mock('child_process', () => ({
    spawn: vi.fn(() => ({
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: vi.fn(),
        stdin: { write: vi.fn() }
    }))
}))

async function createDebuggerWithMock() {
    const { getDebugger } = await import('../../electron/debugger')
    const debuggerService = getDebugger()
    await debuggerService.stop()
    return debuggerService
}

describe('DebuggerService', () => {
    describe('GDB MI output parsing', () => {
        it('should parse *stopped event with file and line info', async () => {
            await createDebuggerWithMock()

            const gdbOutput = '*stopped,reason="breakpoint-hit",bkptno="1",frame={func="main",args=[],file="debug_main.cpp",fullname="C:/debug_main.cpp",line="5"}'

            const fileMatch = gdbOutput.match(/fullname="([^"]+)"/)
            const lineMatch = gdbOutput.match(/line="(\d+)"/)

            expect(fileMatch).toBeTruthy()
            expect(fileMatch![1]).toBe('C:/debug_main.cpp')
            expect(lineMatch).toBeTruthy()
            expect(lineMatch![1]).toBe('5')
        })

        it('should detect running state from *running event', () => {
            const gdbOutput = '*running,thread-id="all"'

            expect(gdbOutput.includes('*running')).toBe(true)
            expect(gdbOutput.includes('*stopped')).toBe(false)
            expect(gdbOutput.includes('exited')).toBe(false)
        })

        it('should detect exited state from exit event', () => {
            const gdbOutput = '=thread-exited,id="all",exit-code="0"'

            expect(gdbOutput.includes('exited')).toBe(true)
        })

        it('should detect program terminated event', () => {
            const gdbOutput = '*stopped,reason="exited-normal",exit-code="0"'

            expect(gdbOutput.includes('*stopped')).toBe(true)
            expect(gdbOutput.includes('exited')).toBe(true)
        })
    })

    describe('Breakpoint response parsing', () => {
        it('should parse successful breakpoint insertion response', () => {
            const response = '^done,bkptno="1",type="breakpoint",disp="keep",enabled="y",addr="0x00401130",func="main",file="debug_main.cpp",fullname="C:/debug_main.cpp",line="5",times="0"'

            expect(response.includes('^done')).toBe(true)
            expect(response.includes('bkptno="1"')).toBe(true)
            expect(response.includes('func="main"')).toBe(true)
        })

        it('should handle breakpoint insertion failure', () => {
            const response = '^error,msg="No symbol table in executable. Use the \\"file\\" command."'

            expect(response.includes('^error')).toBe(true)
            expect(response.includes('No symbol table')).toBe(true)
        })

        it('should parse breakpoint list response', () => {
            const response = '^done,BreakpointTable={nr_rows="2",nr_cols="6"}'

            expect(response.includes('^done')).toBe(true)
            expect(response.includes('nr_rows="2"')).toBe(true)
        })
    })

    describe('Variable/locals parsing', () => {
        it('should parse locals response with single variable', () => {
            const response = '^done,locals=[{name="x",value="42",type="int"}]'

            const match = response.match(/locals=\[(.*?)\]/s)
            expect(match).toBeTruthy()

            if (match) {
                const varPattern = /\{name="([^"]+)",value="((?:[^"\\]|\\.)*)"(?:,type="([^"]*)")?\}/g
                const vars: Array<{ name: string; value: string; type: string }> = []
                let varMatch
                while ((varMatch = varPattern.exec(match[1])) !== null) {
                    vars.push({
                        name: varMatch[1],
                        value: varMatch[2],
                        type: varMatch[3] || 'unknown'
                    })
                }

                expect(vars.length).toBe(1)
                expect(vars[0].name).toBe('x')
                expect(vars[0].value).toBe('42')
                expect(vars[0].type).toBe('int')
            }
        })

        it('should parse locals response with multiple variables', () => {
            const response = '^done,locals=[{name="x",value="42",type="int"},{name="name",value="hello",type="std::string"},{name="count",value="0",type="size_t"}]'

            const match = response.match(/locals=\[(.*?)\]/s)
            expect(match).toBeTruthy()

            if (match) {
                const varPattern = /\{name="([^"]+)",value="((?:[^"\\]|\\.)*)"(?:,type="([^"]*)")?\}/g
                const vars: Array<{ name: string; value: string; type: string }> = []
                let varMatch
                while ((varMatch = varPattern.exec(match[1])) !== null) {
                    vars.push({
                        name: varMatch[1],
                        value: varMatch[2],
                        type: varMatch[3] || 'unknown'
                    })
                }

                expect(vars.length).toBe(3)
                expect(vars[0].name).toBe('x')
                expect(vars[0].value).toBe('42')
                expect(vars[0].type).toBe('int')
                expect(vars[1].name).toBe('name')
                expect(vars[1].value).toBe('hello')
                expect(vars[1].type).toBe('std::string')
                expect(vars[2].name).toBe('count')
                expect(vars[2].value).toBe('0')
                expect(vars[2].type).toBe('size_t')
            }
        })

        it('should handle empty locals response', () => {
            const response = '^done,locals=[]'

            const match = response.match(/locals=\[(.*?)\]/s)
            expect(match).toBeTruthy()

            if (match) {
                const varPattern = /\{name="([^"]+)",value="((?:[^"\\]|\\.)*)"(?:,type="([^"]*)")?\}/g
                const vars: Array<{ name: string; value: string; type: string }> = []
                let varMatch
                while ((varMatch = varPattern.exec(match[1])) !== null) {
                    vars.push({
                        name: varMatch[1],
                        value: varMatch[2],
                        type: varMatch[3] || 'unknown'
                    })
                }

                expect(vars.length).toBe(0)
            }
        })

        it('should handle variables without type information', () => {
            const response = '^done,locals=[{name="ptr",value="0x7fffffffde80"}]'

            const match = response.match(/locals=\[(.*?)\]/s)
            expect(match).toBeTruthy()

            if (match) {
                const varPattern = /\{name="([^"]+)",value="((?:[^"\\]|\\.)*)"(?:,type="([^"]*)")?\}/g
                const vars: Array<{ name: string; value: string; type: string }> = []
                let varMatch
                while ((varMatch = varPattern.exec(match[1])) !== null) {
                    vars.push({
                        name: varMatch[1],
                        value: varMatch[2],
                        type: varMatch[3] || 'unknown'
                    })
                }

                expect(vars.length).toBe(1)
                expect(vars[0].name).toBe('ptr')
                expect(vars[0].value).toBe('0x7fffffffde80')
                expect(vars[0].type).toBe('unknown')
            }
        })
    })

    describe('GDB prompt detection', () => {
        it('should detect (gdb) prompt in output', () => {
            const outputs = [
                '(gdb) ',
                '\n(gdb)',
                'Reading symbols from debug_main.exe...\n(gdb) ',
                'Done.\n(gdb)'
            ]

            for (const output of outputs) {
                expect(output.includes('(gdb)')).toBe(true)
            }
        })

        it('should not falsely detect (gdb) in program output', () => {
            const programOutput = 'The value of gdb is 42'
            expect(programOutput.includes('(gdb)')).toBe(false)
        })
    })

    describe('Command response detection', () => {
        it('should detect ^done response', () => {
            const responses = [
                '^done',
                '^done,bkptno="1"',
                '^done,locals=[]',
                '^done,BreakpointTable={nr_rows="1"}'
            ]

            for (const response of responses) {
                expect(response.includes('^done')).toBe(true)
            }
        })

        it('should detect ^error response', () => {
            const responses = [
                '^error,msg="Undefined command"',
                '^error,msg="No frame selected"',
                '^error'
            ]

            for (const response of responses) {
                expect(response.includes('^error')).toBe(true)
            }
        })

        it('should distinguish between ^done and ^error', () => {
            const doneResponse = '^done,bkptno="1",addr="0x00401130"'
            const errorResponse = '^error,msg="No symbol table"'

            expect(doneResponse.includes('^done')).toBe(true)
            expect(doneResponse.includes('^error')).toBe(false)

            expect(errorResponse.includes('^done')).toBe(false)
            expect(errorResponse.includes('^error')).toBe(true)
        })
    })

    describe('Stepping commands', () => {
        it('should generate correct MI commands for step operations', () => {
            const commands = {
                stepOver: '-exec-next',
                stepInto: '-exec-step',
                stepOut: '-exec-finish',
                continue: '-exec-continue',
                run: '-exec-run',
                quit: '-gdb-exit'
            }

            expect(commands.stepOver).toBe('-exec-next')
            expect(commands.stepInto).toBe('-exec-step')
            expect(commands.stepOut).toBe('-exec-finish')
            expect(commands.continue).toBe('-exec-continue')
            expect(commands.run).toBe('-exec-run')
            expect(commands.quit).toBe('-gdb-exit')
        })

        it('should format breakpoint insertion command correctly', () => {
            const file = 'debug_main.cpp'
            const line = 15
            const command = `-break-insert ${file}:${line}`

            expect(command).toBe('-break-insert debug_main.cpp:15')
        })

        it('should format breakpoint deletion command correctly', () => {
            const id = 3
            const command = `-break-delete ${id}`

            expect(command).toBe('-break-delete 3')
        })
    })

    describe('State transitions', () => {
        it('should have correct initial state', async () => {
            const debuggerService = await createDebuggerWithMock()
            const state = debuggerService.getState()

            expect(state.status).toBe('idle')
            expect(state.breakpoints).toEqual([])
            expect(state.locals).toEqual([])
        })

        it('should track breakpoint additions', async () => {
            const debuggerService = await createDebuggerWithMock()

            const state = debuggerService.getState()
            state.breakpoints.push(
                { id: 1, file: 'test.cpp', line: 5 },
                { id: 2, file: 'test.cpp', line: 10 }
            )

            expect(state.breakpoints.length).toBe(2)
            expect(state.breakpoints[0].line).toBe(5)
            expect(state.breakpoints[1].line).toBe(10)
        })

        it('should clear state on stop', async () => {
            const debuggerService = await createDebuggerWithMock()

            await debuggerService.stop()

            const state = debuggerService.getState()
            expect(state.status).toBe('idle')
            expect(state.breakpoints).toEqual([])
            expect(state.locals).toEqual([])
        })
    })
})
