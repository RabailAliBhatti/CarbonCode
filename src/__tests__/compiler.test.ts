import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('child_process', () => ({
    execSync: vi.fn(),
    spawn: vi.fn(() => ({
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: vi.fn(),
        stdin: { write: vi.fn() }
    }))
}))

vi.mock('fs', () => ({
    writeFileSync: vi.fn(),
    existsSync: vi.fn(() => false),
    mkdirSync: vi.fn(),
    rmSync: vi.fn()
}))

vi.mock('electron', () => ({
    app: {
        getAppPath: vi.fn(() => '/mock/app'),
        isPackaged: false,
        getPath: vi.fn(() => '/mock/temp')
    }
}))

describe('Compiler Pipeline', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.resetModules()
    })

    describe('C++ compile argument building', () => {
        it('should produce correct g++ arguments for C++17 standard', async () => {
            const { spawn } = await import('child_process')
            const mockSpawn = vi.mocked(spawn)
            const { existsSync } = await import('fs')

            vi.mocked(existsSync).mockImplementation((path: unknown) => {
                const p = String(path)
                if (p.includes('g++.exe') || p.includes('g++')) return true
                if (p.includes('bin') && p.includes('mingw')) return true
                return false
            })

            mockSpawn.mockImplementation((() => {
                return {
                    stdout: { on: vi.fn() },
                    stderr: { on: vi.fn() },
                    on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
                        if (event === 'close') {
                            setTimeout(() => cb(0), 0)
                        }
                    }),
                    kill: vi.fn(),
                    stdin: { write: vi.fn() }
                }
            }) as ReturnType<typeof spawn>)

            const { compileCode } = await import('../../electron/compiler')

            vi.mocked(existsSync).mockReturnValue(true)

            await compileCode('#include <iostream>\nint main() { return 0; }', 'c++17')

            expect(mockSpawn).toHaveBeenCalled()

            const spawnCall = mockSpawn.mock.calls.find(
                call => call[0] && String(call[0]).includes('g++')
            )

            if (spawnCall) {
                const capturedArgs = spawnCall[1] as string[]
                expect(capturedArgs.some(arg => String(arg).includes('-std=c++17'))).toBe(true)
                expect(capturedArgs.some(arg => String(arg) === '-Wall')).toBe(true)
                expect(capturedArgs.some(arg => String(arg) === '-Wextra')).toBe(true)
                expect(capturedArgs.some(arg => String(arg) === '-o')).toBe(true)
            }
        })

        it('should produce correct g++ arguments for C++20 standard', async () => {
            const { spawn } = await import('child_process')
            const mockSpawn = vi.mocked(spawn)
            const { existsSync } = await import('fs')

            vi.mocked(existsSync).mockReturnValue(true)

            mockSpawn.mockImplementation((() => ({
                stdout: { on: vi.fn() },
                stderr: { on: vi.fn() },
                on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
                    if (event === 'close') setTimeout(() => cb(0), 0)
                }),
                kill: vi.fn(),
                stdin: { write: vi.fn() }
            })) as ReturnType<typeof spawn>)

            const { compileCode } = await import('../../electron/compiler')

            await compileCode('#include <iostream>', 'c++20')

            const spawnCall = mockSpawn.mock.calls.find(
                call => call[0] && String(call[0]).includes('g++')
            )

            if (spawnCall) {
                const args = spawnCall[1] as string[]
                expect(args.some(arg => String(arg).includes('-std=c++20'))).toBe(true)
            }
        })

        it('should handle MSVC (cl.exe) arguments differently', async () => {
            const { spawn } = await import('child_process')
            const mockSpawn = vi.mocked(spawn)
            const { existsSync } = await import('fs')

            vi.mocked(existsSync).mockReturnValue(true)

            mockSpawn.mockImplementation((() => ({
                stdout: { on: vi.fn() },
                stderr: { on: vi.fn() },
                on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
                    if (event === 'close') setTimeout(() => cb(0), 0)
                }),
                kill: vi.fn(),
                stdin: { write: vi.fn() }
            })) as ReturnType<typeof spawn>)

            const { compileCode, setCustomCompilerPath } = await import('../../electron/compiler')

            setCustomCompilerPath('cl.exe')

            await compileCode('#include <iostream>', 'c++17')

            const spawnCall = mockSpawn.mock.calls.find(
                call => call[0] && String(call[0]).includes('cl.exe')
            )

            if (spawnCall) {
                const args = spawnCall[1] as string[]
                expect(args.some(arg => String(arg) === '/EHsc')).toBe(true)
                expect(args.some(arg => String(arg).includes('/std:'))).toBe(true)
                expect(args.some(arg => String(arg) === '/W4')).toBe(true)
                expect(args.some(arg => String(arg).includes('/Fe:'))).toBe(true)
            }
        })
    })

    describe('Java compile argument building', () => {
        it('should produce correct javac arguments', async () => {
            const { spawn, execSync } = await import('child_process')
            const mockSpawn = vi.mocked(spawn)
            const mockExecSync = vi.mocked(execSync)
            const { existsSync } = await import('fs')

            vi.mocked(existsSync).mockReturnValue(true)
            mockExecSync.mockReturnValue(Buffer.from('javac 17.0.1'))

            mockSpawn.mockImplementation((() => ({
                stdout: { on: vi.fn() },
                stderr: { on: vi.fn() },
                on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
                    if (event === 'close') setTimeout(() => cb(0), 0)
                }),
                kill: vi.fn(),
                stdin: { write: vi.fn() }
            })) as ReturnType<typeof spawn>)

            const { compileJavaCode, setCustomJavaPath } = await import('../../electron/compiler')

            setCustomJavaPath('/usr/lib/jdk/bin/javac')

            await compileJavaCode('public class Main {}', null)

            const spawnCall = mockSpawn.mock.calls.find(
                call => call[0] && String(call[0]).includes('javac')
            )

            if (spawnCall) {
                const args = spawnCall[1] as string[]
                expect(args.length).toBeGreaterThan(0)
                expect(args.some(arg => String(arg).includes('.java'))).toBe(true)
            }
        })

        it('should derive Main class from filename', async () => {
            const { spawn, execSync } = await import('child_process')
            const mockSpawn = vi.mocked(spawn)
            const mockExecSync = vi.mocked(execSync)
            const { existsSync } = await import('fs')

            vi.mocked(existsSync).mockReturnValue(true)
            mockExecSync.mockReturnValue(Buffer.from('javac 17.0.1'))

            mockSpawn.mockImplementation((() => ({
                stdout: { on: vi.fn() },
                stderr: { on: vi.fn() },
                on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
                    if (event === 'close') setTimeout(() => cb(0), 0)
                }),
                kill: vi.fn(),
                stdin: { write: vi.fn() }
            })) as ReturnType<typeof spawn>)

            const { compileJavaCode, setCustomJavaPath } = await import('../../electron/compiler')

            setCustomJavaPath('/usr/lib/jdk/bin/javac')

            const result = await compileJavaCode('public class HelloWorld {}', '/path/to/HelloWorld.java')

            if (result.mainClass) {
                expect(result.mainClass).toBe('HelloWorld')
            }
        })

        it('should default to Main.java when no filePath provided', async () => {
            const { spawn, execSync } = await import('child_process')
            const mockSpawn = vi.mocked(spawn)
            const mockExecSync = vi.mocked(execSync)
            const { existsSync, writeFileSync } = await import('fs')

            vi.mocked(existsSync).mockReturnValue(true)
            mockExecSync.mockReturnValue(Buffer.from('javac 17.0.1'))

            mockSpawn.mockImplementation((() => ({
                stdout: { on: vi.fn() },
                stderr: { on: vi.fn() },
                on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
                    if (event === 'close') setTimeout(() => cb(0), 0)
                }),
                kill: vi.fn(),
                stdin: { write: vi.fn() }
            })) as ReturnType<typeof spawn>)

            const { compileJavaCode, setCustomJavaPath } = await import('../../electron/compiler')

            setCustomJavaPath('/usr/lib/jdk/bin/javac')

            await compileJavaCode('public class Main {}', null)

            const writeCall = vi.mocked(writeFileSync).mock.calls.find(
                call => String(call[0]).includes('Main.java')
            )
            expect(writeCall).toBeDefined()
        })
    })

    describe('Error handling', () => {
        it('should return error when no compiler is found', async () => {
            const { existsSync } = await import('fs')
            const { execSync } = await import('child_process')

            vi.mocked(existsSync).mockReturnValue(false)
            vi.mocked(execSync).mockImplementation(() => {
                throw new Error('command not found')
            })

            const { compileCode } = await import('../../electron/compiler')

            const result = await compileCode('int main() {}', 'c++17')

            expect(result.success).toBe(false)
            expect(result.error).toContain('No C++ compiler found')
        })

        it('should return error when no Java JDK is found', async () => {
            const { existsSync } = await import('fs')
            const { execSync } = await import('child_process')

            vi.mocked(existsSync).mockReturnValue(false)
            vi.mocked(execSync).mockImplementation(() => {
                throw new Error('command not found')
            })

            const { compileJavaCode } = await import('../../electron/compiler')

            const result = await compileJavaCode('public class Main {}', null)

            expect(result.success).toBe(false)
            expect(result.error).toContain('No Java JDK found')
        })
    })

    describe('Compiler detection priority', () => {
        it('should prefer custom path over bundled', async () => {
            const { existsSync } = await import('fs')
            const { execSync } = await import('child_process')

            vi.mocked(existsSync).mockReturnValue(true)
            vi.mocked(execSync).mockReturnValue(Buffer.from('g++ (GCC) 13.2.0'))

            const { detectCompiler, setCustomCompilerPath } = await import('../../electron/compiler')

            setCustomCompilerPath('/custom/g++')

            const result = await detectCompiler('/custom/g++')

            expect(result).toBe('/custom/g++')
        })

        it('should fall back to system compiler when no custom or bundled', async () => {
            const { existsSync } = await import('fs')
            const { execSync } = await import('child_process')

            vi.mocked(existsSync).mockReturnValue(false)
            let execCallCount = 0
            vi.mocked(execSync).mockImplementation(() => {
                execCallCount++
                if (execCallCount <= 2) {
                    throw new Error('not found')
                }
                return Buffer.from('g++ (Ubuntu 11.3.0) 11.3.0')
            })

            const { detectCompiler } = await import('../../electron/compiler')

            const result = await detectCompiler()

            expect(result).toBeTruthy()
        })
    })
})
