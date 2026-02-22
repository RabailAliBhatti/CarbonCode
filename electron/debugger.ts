import { spawn, ChildProcess } from 'child_process'
import { EventEmitter } from 'events'
import * as path from 'path'
import * as fs from 'fs'
import { app } from 'electron'

export interface Breakpoint {
    id: number
    file: string
    line: number
}

export interface Variable {
    name: string
    value: string
    type: string
}

export interface DebugState {
    status: 'idle' | 'running' | 'stopped' | 'exited'
    currentFile?: string
    currentLine?: number
    breakpoints: Breakpoint[]
    locals: Variable[]
}

export class DebuggerService extends EventEmitter {
    private gdbProcess: ChildProcess | null = null
    private state: DebugState = {
        status: 'idle',
        breakpoints: [],
        locals: []
    }
    private outputBuffer = ''
    private breakpointCounter = 0
    private tempDir: string
    private executablePath: string | null = null

    constructor() {
        super()
        this.tempDir = path.join(app.getPath('temp'), 'carboncode-debug')
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true })
        }
    }

    getState(): DebugState {
        return { ...this.state }
    }

    async start(code: string, breakpoints: { line: number }[]): Promise<{ success: boolean; error?: string }> {
        try {
            // Write code to temp file
            const sourcePath = path.join(this.tempDir, 'debug_main.cpp')
            this.executablePath = path.join(this.tempDir, 'debug_main.exe')
            fs.writeFileSync(sourcePath, code)

            // Find GDB
            const gdbPath = this.findGdb()
            if (!gdbPath) {
                return { success: false, error: 'GDB not found. Please install MinGW with GDB.' }
            }

            // Find g++
            const gppPath = this.findCompiler()
            if (!gppPath) {
                return { success: false, error: 'g++ compiler not found.' }
            }

            // Compile with debug symbols
            const compileResult = await this.compile(gppPath, sourcePath, this.executablePath)
            if (!compileResult.success) {
                return { success: false, error: compileResult.error }
            }

            // Start GDB with MI interface
            this.gdbProcess = spawn(gdbPath, ['--interpreter=mi', this.executablePath], {
                cwd: this.tempDir
            })

            this.gdbProcess.stdout?.on('data', (data) => this.handleOutput(data.toString()))
            this.gdbProcess.stderr?.on('data', (data) => this.emit('stderr', data.toString()))
            this.gdbProcess.on('exit', (code) => {
                this.state.status = 'exited'
                this.emit('exited', code)
                this.gdbProcess = null
            })

            // Wait for GDB to initialize
            await this.waitForPrompt()

            // Set breakpoints
            for (const bp of breakpoints) {
                await this.setBreakpoint('debug_main.cpp', bp.line)
            }

            // Run the program
            await this.sendCommand('-exec-run')
            this.state.status = 'running'
            this.emit('stateChanged', this.getState())

            return { success: true }
        } catch (error: any) {
            return { success: false, error: error.message }
        }
    }

    async stop(): Promise<void> {
        if (this.gdbProcess) {
            await this.sendCommand('-gdb-exit')
            this.gdbProcess.kill()
            this.gdbProcess = null
        }
        this.state = {
            status: 'idle',
            breakpoints: [],
            locals: []
        }
        this.emit('stateChanged', this.getState())
    }

    async setBreakpoint(file: string, line: number): Promise<Breakpoint | null> {
        if (!this.gdbProcess) return null

        const response = await this.sendCommand(`-break-insert ${file}:${line}`)
        if (response.includes('^done')) {
            const bp: Breakpoint = {
                id: ++this.breakpointCounter,
                file,
                line
            }
            this.state.breakpoints.push(bp)
            this.emit('stateChanged', this.getState())
            return bp
        }
        return null
    }

    async removeBreakpoint(id: number): Promise<void> {
        if (!this.gdbProcess) return

        const bp = this.state.breakpoints.find(b => b.id === id)
        if (bp) {
            await this.sendCommand(`-break-delete ${id}`)
            this.state.breakpoints = this.state.breakpoints.filter(b => b.id !== id)
            this.emit('stateChanged', this.getState())
        }
    }

    async stepOver(): Promise<void> {
        if (!this.gdbProcess || this.state.status !== 'stopped') return
        this.state.status = 'running'
        this.emit('stateChanged', this.getState())
        await this.sendCommand('-exec-next')
    }

    async stepInto(): Promise<void> {
        if (!this.gdbProcess || this.state.status !== 'stopped') return
        this.state.status = 'running'
        this.emit('stateChanged', this.getState())
        await this.sendCommand('-exec-step')
    }

    async stepOut(): Promise<void> {
        if (!this.gdbProcess || this.state.status !== 'stopped') return
        this.state.status = 'running'
        this.emit('stateChanged', this.getState())
        await this.sendCommand('-exec-finish')
    }

    async continue(): Promise<void> {
        if (!this.gdbProcess || this.state.status !== 'stopped') return
        this.state.status = 'running'
        this.emit('stateChanged', this.getState())
        await this.sendCommand('-exec-continue')
    }

    async getLocals(): Promise<Variable[]> {
        if (!this.gdbProcess || this.state.status !== 'stopped') return []

        const response = await this.sendCommand('-stack-list-locals --all-values')
        const locals: Variable[] = []

        // Parse MI response for locals
        const match = response.match(/locals=\[(.*?)\]/s)
        if (match) {
            const varPattern = /\{name="([^"]+)",value="([^"]*)"(?:,type="([^"]*)")?\}/g
            let varMatch
            while ((varMatch = varPattern.exec(match[1])) !== null) {
                locals.push({
                    name: varMatch[1],
                    value: varMatch[2],
                    type: varMatch[3] || 'unknown'
                })
            }
        }

        this.state.locals = locals
        return locals
    }

    private handleOutput(data: string): void {
        this.outputBuffer += data
        this.emit('stdout', data)

        // Check for stop events
        if (data.includes('*stopped')) {
            this.state.status = 'stopped'

            // Parse current location
            const fileMatch = data.match(/fullname="([^"]+)"/)
            const lineMatch = data.match(/line="(\d+)"/)

            if (fileMatch) this.state.currentFile = fileMatch[1]
            if (lineMatch) this.state.currentLine = parseInt(lineMatch[1])

            // Get locals when stopped
            this.getLocals().then(() => {
                this.emit('stateChanged', this.getState())
            })
        }

        // Check for exit
        if (data.includes('*running')) {
            this.state.status = 'running'
            this.emit('stateChanged', this.getState())
        }

        if (data.includes('exited')) {
            this.state.status = 'exited'
            this.emit('stateChanged', this.getState())
        }
    }

    private sendCommand(command: string): Promise<string> {
        return new Promise((resolve) => {
            if (!this.gdbProcess) {
                resolve('')
                return
            }

            const responseHandler = (data: string) => {
                if (data.includes('(gdb)') || data.includes('^done') || data.includes('^error')) {
                    this.removeListener('stdout', responseHandler)
                    resolve(data)
                }
            }

            this.on('stdout', responseHandler)
            this.gdbProcess.stdin?.write(command + '\n')

            // Timeout after 5 seconds
            setTimeout(() => {
                this.removeListener('stdout', responseHandler)
                resolve('')
            }, 5000)
        })
    }

    private waitForPrompt(): Promise<void> {
        return new Promise((resolve) => {
            const checkPrompt = (data: string) => {
                if (data.includes('(gdb)')) {
                    this.removeListener('stdout', checkPrompt)
                    resolve()
                }
            }
            this.on('stdout', checkPrompt)
            setTimeout(() => {
                this.removeListener('stdout', checkPrompt)
                resolve()
            }, 3000)
        })
    }

    private compile(gppPath: string, sourcePath: string, outputPath: string): Promise<{ success: boolean; error?: string }> {
        return new Promise((resolve) => {
            const proc = spawn(gppPath, ['-g', '-o', outputPath, sourcePath])
            let stderr = ''

            proc.stderr?.on('data', (data) => {
                stderr += data.toString()
            })

            proc.on('exit', (code) => {
                if (code === 0) {
                    resolve({ success: true })
                } else {
                    resolve({ success: false, error: stderr || 'Compilation failed' })
                }
            })
        })
    }

    private findGdb(): string | null {
        // Check bundled MinGW first
        const bundledPath = path.join(process.resourcesPath, 'mingw64', 'bin', 'gdb.exe')
        if (fs.existsSync(bundledPath)) return bundledPath

        // Check common paths
        const paths = [
            'C:\\mingw64\\bin\\gdb.exe',
            'C:\\msys64\\mingw64\\bin\\gdb.exe',
            'C:\\Program Files\\mingw-w64\\x86_64-8.1.0-posix-seh-rt_v6-rev0\\mingw64\\bin\\gdb.exe'
        ]

        for (const p of paths) {
            if (fs.existsSync(p)) return p
        }

        return null
    }

    private findCompiler(): string | null {
        // Check bundled MinGW first
        const bundledPath = path.join(process.resourcesPath, 'mingw64', 'bin', 'g++.exe')
        if (fs.existsSync(bundledPath)) return bundledPath

        // Check common paths
        const paths = [
            'C:\\mingw64\\bin\\g++.exe',
            'C:\\msys64\\mingw64\\bin\\g++.exe'
        ]

        for (const p of paths) {
            if (fs.existsSync(p)) return p
        }

        return null
    }
}

// Singleton instance
let debuggerInstance: DebuggerService | null = null

export function getDebugger(): DebuggerService {
    if (!debuggerInstance) {
        debuggerInstance = new DebuggerService()
    }
    return debuggerInstance
}
