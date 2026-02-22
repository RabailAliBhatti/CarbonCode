import { execSync, spawn, ChildProcess } from 'child_process'
import { writeFileSync, existsSync, mkdirSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'

export interface CompilationResult {
    success: boolean
    output: string
    error: string
    compileTime?: number
    executionTime?: number
}

// Store running processes for potential cancellation
let currentProcess: ChildProcess | null = null

/**
 * Detect available C++ compiler on the system
 * Tries g++, clang++, and cl.exe (MSVC)
 */
export async function detectCompiler(): Promise<string | null> {
    const compilers = [
        { cmd: 'g++', args: ['--version'] },
        { cmd: 'clang++', args: ['--version'] },
        { cmd: 'cl.exe', args: [] }  // MSVC
    ]

    for (const compiler of compilers) {
        try {
            execSync(`${compiler.cmd} ${compiler.args.join(' ')}`, {
                stdio: 'pipe',
                timeout: 5000,
                windowsHide: true
            })
            return compiler.cmd
        } catch {
            // Try next compiler
        }
    }

    return null
}

/**
 * Get compiler version information
 */
export async function getCompilerInfo(compiler: string): Promise<string> {
    try {
        const result = execSync(`${compiler} --version`, {
            encoding: 'utf-8',
            timeout: 5000,
            windowsHide: true
        })
        return result.split('\n')[0] || compiler
    } catch {
        return compiler
    }
}

/**
 * Compile and run C++ code
 */
export async function compileAndRun(code: string, cppStandard: string): Promise<CompilationResult> {
    const compiler = await detectCompiler()

    if (!compiler) {
        return {
            success: false,
            output: '',
            error: '❌ No C++ compiler found!\n\nPlease install a C++ compiler:\n• Windows: Install MinGW-w64 or Visual Studio Build Tools\n• macOS: Install Xcode Command Line Tools (xcode-select --install)\n• Linux: Install g++ (sudo apt install g++ or equivalent)\n\nMake sure the compiler is in your system PATH.'
        }
    }

    // Create unique temporary directory
    const tempDir = join(tmpdir(), `cpp-ide-${randomUUID()}`)
    const sourceFile = join(tempDir, 'main.cpp')
    const exeExtension = process.platform === 'win32' ? '.exe' : ''
    const executableFile = join(tempDir, `main${exeExtension}`)

    try {
        // Create temp directory
        mkdirSync(tempDir, { recursive: true })

        // Write source code to temp file
        writeFileSync(sourceFile, code, 'utf-8')

        // Build compile command
        let compileCmd: string
        let compileArgs: string[]

        if (compiler === 'cl.exe') {
            // MSVC compiler
            compileArgs = [
                '/EHsc',
                `/std:${cppStandard.replace('c++', 'c++')}`,
                '/W4',
                `/Fe:"${executableFile}"`,
                `"${sourceFile}"`
            ]
            compileCmd = compiler
        } else {
            // GCC/Clang - quote paths to handle spaces
            compileArgs = [
                `-std=${cppStandard}`,
                '-Wall',
                '-Wextra',
                '-o', `"${executableFile}"`,
                `"${sourceFile}"`
            ]
            compileCmd = compiler
        }

        // Compile
        const compileStart = Date.now()
        const compileResult = await runProcess(compileCmd, compileArgs, tempDir, 30000)
        const compileTime = Date.now() - compileStart

        if (!compileResult.success) {
            return {
                success: false,
                output: '',
                error: `🔧 Compilation Error:\n\n${compileResult.stderr || compileResult.stdout}`,
                compileTime
            }
        }

        // Check if executable was created
        if (!existsSync(executableFile)) {
            return {
                success: false,
                output: '',
                error: '❌ Compilation failed: Executable not created',
                compileTime
            }
        }

        // Run executable
        const runStart = Date.now()
        // Quote the path to handle spaces
        const runCmd = process.platform === 'win32' ? `"${executableFile}"` : `./"${executableFile.split('/').pop()}"`
        const runResult = await runProcess(runCmd, [], tempDir, 10000)
        const executionTime = Date.now() - runStart

        if (!runResult.success && runResult.timedOut) {
            return {
                success: false,
                output: runResult.stdout,
                error: '⏱️ Execution timed out (10 seconds limit)\n\nYour program may have an infinite loop.',
                compileTime,
                executionTime
            }
        }

        // Combine output
        let output = ''
        if (runResult.stdout) {
            output = runResult.stdout
        }

        let error = ''
        if (runResult.stderr) {
            error = runResult.stderr
        }

        // If there's a non-zero exit code, mark as failed
        if (runResult.exitCode !== 0 && !runResult.stdout && !runResult.stderr) {
            error = `⚠️ Program exited with code ${runResult.exitCode}`
        }

        return {
            success: runResult.exitCode === 0 || !!runResult.stdout,
            output,
            error: error ? `⚠️ Runtime Error:\n\n${error}` : '',
            compileTime,
            executionTime
        }

    } finally {
        // Cleanup: Remove temporary files
        try {
            if (existsSync(tempDir)) {
                rmSync(tempDir, { recursive: true, force: true })
            }
        } catch (cleanupError) {
            console.error('Failed to cleanup temp files:', cleanupError)
        }
    }
}

/**
 * Run a process with timeout support
 */
function runProcess(
    cmd: string,
    args: string[],
    cwd: string,
    timeout: number
): Promise<{
    success: boolean
    stdout: string
    stderr: string
    exitCode: number | null
    timedOut: boolean
}> {
    return new Promise((resolve) => {
        let stdout = ''
        let stderr = ''
        let timedOut = false

        const options = {
            cwd,
            shell: true,
            windowsHide: true
        }

        currentProcess = spawn(cmd, args, options)

        const timer = setTimeout(() => {
            timedOut = true
            if (currentProcess) {
                currentProcess.kill('SIGTERM')
                setTimeout(() => {
                    if (currentProcess) {
                        currentProcess.kill('SIGKILL')
                    }
                }, 1000)
            }
        }, timeout)

        currentProcess.stdout?.on('data', (data) => {
            stdout += data.toString()
        })

        currentProcess.stderr?.on('data', (data) => {
            stderr += data.toString()
        })

        currentProcess.on('close', (code) => {
            clearTimeout(timer)
            currentProcess = null
            resolve({
                success: code === 0,
                stdout,
                stderr,
                exitCode: code,
                timedOut
            })
        })

        currentProcess.on('error', (error) => {
            clearTimeout(timer)
            currentProcess = null
            resolve({
                success: false,
                stdout,
                stderr: error.message,
                exitCode: null,
                timedOut: false
            })
        })
    })
}

/**
 * Stop the currently running process
 */
export function stopExecution(): boolean {
    if (currentProcess) {
        currentProcess.kill('SIGTERM')
        setTimeout(() => {
            if (currentProcess) {
                currentProcess.kill('SIGKILL')
            }
        }, 1000)
        return true
    }
    return false
}
