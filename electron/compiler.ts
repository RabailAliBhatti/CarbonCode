import { execSync, spawn, ChildProcess } from 'child_process'
import { writeFileSync, existsSync, mkdirSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import { app } from 'electron'

export interface CompilationResult {
    success: boolean
    output: string
    error: string
    compileTime?: number
    executionTime?: number
}

// Store running processes for potential cancellation
let currentProcess: ChildProcess | null = null

// Store the detected compiler path
let detectedCompilerPath: string | null = null

/**
 * Get the bundled MinGW path (for Full version)
 */
function getBundledMinGWPath(): string | null {
    // In production, MinGW is in resources/mingw
    const resourcesPath = process.resourcesPath || app.getAppPath()
    const mingwPath = join(resourcesPath, 'mingw', 'bin', 'g++.exe')

    if (existsSync(mingwPath)) {
        return mingwPath
    }

    // In development, check project directory
    const devPath = join(process.cwd(), 'mingw', 'bin', 'g++.exe')
    if (existsSync(devPath)) {
        return devPath
    }

    return null
}

/**
 * Detect available C++ compiler on the system
 * First checks for bundled MinGW, then system compilers
 */
export async function detectCompiler(): Promise<string | null> {
    // First, check for bundled MinGW
    const bundledPath = getBundledMinGWPath()
    if (bundledPath) {
        try {
            execSync(`"${bundledPath}" --version`, {
                stdio: 'pipe',
                timeout: 5000,
                windowsHide: true
            })
            detectedCompilerPath = bundledPath
            return 'g++ (bundled)'
        } catch {
            // Continue to system compilers
        }
    }

    // Check system compilers
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
            detectedCompilerPath = compiler.cmd
            return compiler.cmd
        } catch {
            // Try next compiler
        }
    }

    return null
}

/**
 * Get the actual compiler path to use for compilation
 */
export function getCompilerPath(): string | null {
    return detectedCompilerPath
}

// Result of compilation phase only
export interface CompileResult {
    success: boolean
    error?: string
    executablePath?: string
    tempDir?: string // Need to keep temp dir to run
    compileTime?: number
}

/**
 * Compile C++ code only
 */
export async function compileCode(code: string, cppStandard: string): Promise<CompileResult> {
    const compiler = await detectCompiler()

    if (!compiler) {
        return {
            success: false,
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

        // Get the actual compiler path (might be bundled)
        const compilerPath = getCompilerPath() || compiler

        if (compiler === 'cl.exe') {
            // MSVC compiler
            compileArgs = [
                '/EHsc',
                `/std:${cppStandard.replace('c++', 'c++')}`,
                '/W4',
                `/Fe:"${executableFile}"`,
                `"${sourceFile}"`
            ]
            compileCmd = compilerPath
        } else {
            // GCC/Clang - quote paths to handle spaces
            compileArgs = [
                `-std=${cppStandard}`,
                '-Wall',
                '-Wextra',
                '-o', `"${executableFile}"`,
                `"${sourceFile}"`
            ]
            // Use quoted path for bundled compiler
            compileCmd = compilerPath.includes(' ') ? `"${compilerPath}"` : compilerPath
        }

        // Compile
        const compileStart = Date.now()
        const compileResult = await runCompilationProcess(compileCmd, compileArgs, tempDir, 30000)
        const compileTime = Date.now() - compileStart

        if (!compileResult.success) {
            // Cleanup on failure
            try {
                if (existsSync(tempDir)) {
                    rmSync(tempDir, { recursive: true, force: true })
                }
            } catch { }

            return {
                success: false,
                error: `🔧 Compilation Error:\n\n${compileResult.stderr || compileResult.stdout}`,
                compileTime
            }
        }

        // Check if executable was created
        if (!existsSync(executableFile)) {
            try {
                if (existsSync(tempDir)) {
                    rmSync(tempDir, { recursive: true, force: true })
                }
            } catch { }

            return {
                success: false,
                error: '❌ Compilation failed: Executable not created',
                compileTime
            }
        }

        return {
            success: true,
            executablePath: executableFile,
            tempDir,
            compileTime
        }

    } catch (e: any) {
        // Cleanup on unexpected error
        try {
            if (existsSync(tempDir)) {
                rmSync(tempDir, { recursive: true, force: true })
            }
        } catch { }
        return {
            success: false,
            error: `❌ Unexpected error: ${e.message}`
        }
    }
}

/**
 * Start the executable in interactive mode
 */
export function startInteractiveProcess(
    executablePath: string,
    tempDir: string,
    onStdout: (data: string) => void,
    onStderr: (data: string) => void,
    onExit: (code: number) => void
): ChildProcess {
    const cwd = tempDir
    // Quote the path to handle spaces
    const cmd = process.platform === 'win32' ? `"${executablePath}"` : `./"${executablePath.split('/').pop()}"`

    const options = {
        cwd,
        shell: true,
        windowsHide: true
    }

    currentProcess = spawn(cmd, [], options)

    currentProcess.stdout?.on('data', (data) => {
        onStdout(data.toString())
    })

    currentProcess.stderr?.on('data', (data) => {
        onStderr(data.toString())
    })

    currentProcess.on('close', (code) => {
        currentProcess = null
        onExit(code || 0)
        // Cleanup executable
        setTimeout(() => {
            try {
                if (existsSync(tempDir)) {
                    rmSync(tempDir, { recursive: true, force: true })
                }
            } catch (err) {
                console.error('Failed to cleanup temp dir:', err)
            }
        }, 500) // Delay cleanup slightly
    })

    currentProcess.on('error', (err) => {
        onStderr(`Spawn Error: ${err.message}`)
        currentProcess = null
        onExit(1)
    })

    return currentProcess
}

/**
 * Write to the running process stdin
 */
export function writeToProcess(input: string): boolean {
    if (currentProcess && currentProcess.stdin) {
        try {
            currentProcess.stdin.write(input)
            // Add newline if not present? Usually std::cin expects newline to flush buffer.
            // But let user handle Enter key.
            return true
        } catch (e: any) {
            console.error('Failed to write to process:', e)
            return false
        }
    }
    return false
}

export function killProcess(): boolean {
    if (currentProcess) {
        currentProcess.kill('SIGTERM')
        return true
    }
    return false
}


/**
 * Compile and run C++ code (Legacy wrapper)
 */
export async function compileAndRun(code: string, cppStandard: string): Promise<CompilationResult> {
    const compileRes = await compileCode(code, cppStandard)
    if (!compileRes.success || !compileRes.executablePath || !compileRes.tempDir) {
        return {
            success: false,
            output: '',
            error: compileRes.error || 'Compilation failed',
            compileTime: compileRes.compileTime
        }
    }

    return new Promise((resolve) => {
        let stdout = ''
        let stderr = ''
        const startTime = Date.now()

        startInteractiveProcess(
            compileRes.executablePath!,
            compileRes.tempDir!,
            (data) => stdout += data,
            (data) => stderr += data,
            (code) => {
                const executionTime = Date.now() - startTime
                // If there's a non-zero exit code, mark as failed
                let error = stderr
                if (code !== 0 && !stdout && !stderr) {
                    error = `⚠️ Program exited with code ${code}`
                }

                resolve({
                    success: code === 0 || !!stdout,
                    output: stdout,
                    error: error ? `⚠️ Runtime Error:\n\n${error}` : '',
                    compileTime: compileRes.compileTime,
                    executionTime
                })
            }
        )
    })
}

/**
 * Run compilation process (helper wrapper around runProcess for compile step)
 */
function runCompilationProcess(
    cmd: string,
    args: string[],
    cwd: string,
    timeout: number
): Promise<{
    success: boolean
    stdout: string
    stderr: string
    exitCode: number | null
}> {
    return new Promise((resolve) => {
        let stdout = ''
        let stderr = ''

        const options = {
            cwd,
            shell: true,
            windowsHide: true
        }

        const proc = spawn(cmd, args, options)

        const timer = setTimeout(() => {
            proc.kill()
        }, timeout)

        proc.stdout?.on('data', (data) => {
            stdout += data.toString()
        })

        proc.stderr?.on('data', (data) => {
            stderr += data.toString()
        })

        proc.on('close', (code) => {
            clearTimeout(timer)
            resolve({
                success: code === 0,
                stdout,
                stderr,
                exitCode: code
            })
        })

        proc.on('error', (err) => {
            clearTimeout(timer)
            resolve({
                success: false,
                stdout,
                stderr: err.message,
                exitCode: 1
            })
        })
    })
}

