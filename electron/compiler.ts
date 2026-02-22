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

// Whether the detected compiler is the bundled one
let isBundledCompiler = false

/**
 * Get the path to the bundled MinGW compiler (shipped with the app)
 */
function getBundledCompilerPath(): string | null {
    try {
        const resourcesPath = process.resourcesPath
        const gppPath = join(resourcesPath, 'mingw64', 'bin', 'g++.exe')
        if (existsSync(gppPath)) {
            return gppPath
        }
    } catch {
        // process.resourcesPath may not exist in dev mode
    }

    // Also check vendor/ for development mode
    try {
        const devPath = join(app.getAppPath(), 'vendor', 'mingw64', 'bin', 'g++.exe')
        if (existsSync(devPath)) {
            return devPath
        }
    } catch {
        // Ignore
    }

    return null
}

/**
 * Get the MinGW bin directory path (for PATH injection)
 */
function getBundledMingwBinDir(): string | null {
    try {
        const resourcesPath = process.resourcesPath
        const binDir = join(resourcesPath, 'mingw64', 'bin')
        if (existsSync(binDir)) {
            return binDir
        }
    } catch { }

    try {
        const devBinDir = join(app.getAppPath(), 'vendor', 'mingw64', 'bin')
        if (existsSync(devBinDir)) {
            return devBinDir
        }
    } catch { }

    return null
}

/**
 * Build an env object with the bundled MinGW bin dir prepended to PATH
 */
export function getBundledMingwEnv(): NodeJS.ProcessEnv {
    const env = { ...process.env }
    const mingwBinDir = getBundledMingwBinDir()
    if (mingwBinDir) {
        env.PATH = `${mingwBinDir};${env.PATH || ''}`
    }
    return env
}

/**
 * Check if the current compiler is bundled
 */
export function isUsingBundledCompiler(): boolean {
    return isBundledCompiler
}

// Track the source type for UI display
let compilerSource: 'custom' | 'bundled' | 'system' | 'none' = 'none'

/**
 * Set a custom compiler path from user settings.
 * Resets the cached detection so the next compile uses the new path.
 */
export function setCustomCompilerPath(customPath: string): void {
    // Reset cache to force re-detection
    detectedCompilerPath = null
    isBundledCompiler = false
    compilerSource = 'none'

    if (customPath && existsSync(customPath)) {
        console.log('Custom compiler path set:', customPath)
        detectedCompilerPath = customPath
        isBundledCompiler = false
        compilerSource = 'custom'
    }
}

/**
 * Get information about the active compiler for UI display
 */
export function getCompilerInfo(): { path: string | null, source: string } {
    return {
        path: detectedCompilerPath,
        source: compilerSource
    }
}

/**
 * Detect available C++ compiler
 * Priority: Custom user path > Bundled MinGW > System PATH
 */
export async function detectCompiler(customPath?: string): Promise<string | null> {
    // Return cached result if available
    if (detectedCompilerPath) return detectedCompilerPath

    // 1. Check custom user-defined path FIRST
    if (customPath && existsSync(customPath)) {
        console.log('Using custom compiler from settings:', customPath)
        detectedCompilerPath = customPath
        isBundledCompiler = false
        compilerSource = 'custom'
        return customPath
    }

    // 2. Check for bundled compiler
    const bundledPath = getBundledCompilerPath()
    if (bundledPath) {
        console.log('Using bundled MinGW compiler:', bundledPath)
        detectedCompilerPath = bundledPath
        isBundledCompiler = true
        compilerSource = 'bundled'
        return bundledPath
    }

    // 3. Fall back to system PATH compilers
    console.log('No custom or bundled compiler found. Searching system PATH...')
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
            console.log('Found system compiler:', compiler.cmd)
            detectedCompilerPath = compiler.cmd
            isBundledCompiler = false
            compilerSource = 'system'
            return compiler.cmd
        } catch {
            // Try next compiler
        }
    }

    compilerSource = 'none'
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
            error: '❌ No C++ compiler found!\n\nThe bundled compiler was not detected. Please reinstall CarbonCode or install MinGW-w64 / Visual Studio Build Tools manually.'
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

        // Build env with bundled MinGW path if applicable
        const compileEnv = isBundledCompiler ? getBundledMingwEnv() : undefined

        // Compile
        const compileStart = Date.now()
        const compileResult = await runCompilationProcess(compileCmd, compileArgs, tempDir, 30000, compileEnv)
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

    // Use bundled MinGW env so runtime DLLs can be found
    const env = isBundledCompiler ? getBundledMingwEnv() : undefined

    const options: any = {
        cwd,
        shell: true,
        windowsHide: true
    }
    if (env) {
        options.env = env
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
    timeout: number,
    env?: NodeJS.ProcessEnv
): Promise<{
    success: boolean
    stdout: string
    stderr: string
    exitCode: number | null
}> {
    return new Promise((resolve) => {
        let stdout = ''
        let stderr = ''

        const options: any = {
            cwd,
            shell: true,
            windowsHide: true
        }
        if (env) {
            options.env = env
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

