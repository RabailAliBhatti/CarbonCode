import { execSync, spawn, ChildProcess, SpawnOptions } from 'child_process'
import { writeFileSync, existsSync, mkdirSync, rmSync } from 'fs'
import { basename, extname, join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import { app } from 'electron'

export type SupportedLanguage = 'c' | 'cpp' | 'java' | 'python'

export interface RuntimeInfo {
    language: SupportedLanguage
    compilerPath: string | null
    runtimePath?: string | null
    source: 'custom' | 'bundled' | 'system' | 'none'
    version?: string
}

export interface RunRequest {
    language: SupportedLanguage
    code: string
    filePath?: string | null
    cppStandard?: string
    cStandard?: string
}

// Store running processes for potential cancellation
let currentProcess: ChildProcess | null = null

// Store the detected compiler path
let detectedCompilerPath: string | null = null
let detectedCCompilerPath: string | null = null
let detectedJavaCompilerPath: string | null = null
let detectedJavaRuntimePath: string | null = null
let detectedPythonPath: string | null = null

// Whether the detected compiler is the bundled one
let isBundledCompiler = false

// ponytail: one helper replaces 7 identical try/rmSync/catch blocks
function cleanupDir(dir: string) {
    try {
        if (existsSync(dir)) rmSync(dir, { recursive: true, force: true })
    } catch { }
}

// ponytail: merged getBundledCompilerPath + getBundledMingwBinDir into one lookup
function findBundledMingw(): string | null {
    const candidates: string[] = []
    if (process.resourcesPath) {
        candidates.push(join(process.resourcesPath, 'mingw64', 'bin'))
    }
    try {
        if (app?.getAppPath) {
            candidates.push(join(app.getAppPath(), 'vendor', 'mingw64', 'bin'))
        }
    } catch { }

    for (const dir of candidates) {
        try { if (existsSync(dir)) return dir } catch { }
    }
    return null
}

function getBundledCompilerPath(): string | null {
    const binDir = findBundledMingw()
    if (!binDir) return null
    const gpp = join(binDir, 'g++.exe')
    return existsSync(gpp) ? gpp : null
}

function getBundledCCompilerPath(): string | null {
    const binDir = findBundledMingw()
    if (!binDir) return null
    const gcc = join(binDir, 'gcc.exe')
    return existsSync(gcc) ? gcc : null
}

function getBundledMingwEnv(): NodeJS.ProcessEnv {
    const env = { ...process.env }
    const binDir = findBundledMingw()
    if (binDir) env.PATH = `${binDir};${env.PATH || ''}`
    return env
}

// Track the source type for UI display
let compilerSource: 'custom' | 'bundled' | 'system' | 'none' = 'none'
let javaSource: 'custom' | 'bundled' | 'system' | 'none' = 'none'
let javaVersion: string | undefined
let pythonSource: 'custom' | 'system' | 'none' = 'none'
let pythonVersion: string | undefined

/**
 * Set a custom compiler path from user settings.
 * Resets the cached detection so the next compile uses the new path.
 */
export function setCustomCompilerPath(customPath: string): void {
    // Reset cache to force re-detection
    detectedCompilerPath = null
    detectedCCompilerPath = null
    isBundledCompiler = false
    compilerSource = 'none'

    if (customPath && existsSync(customPath)) {
        console.log('Custom compiler path set:', customPath)
        detectedCompilerPath = customPath
        detectedCCompilerPath = customPath
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

export function setCustomJavaPath(javaPath: string): void {
    detectedJavaCompilerPath = null
    detectedJavaRuntimePath = null
    javaSource = 'none'
    javaVersion = undefined

    if (javaPath && existsSync(javaPath)) {
        detectedJavaCompilerPath = javaPath
        detectedJavaRuntimePath = javaPath.replace(/javac(\.exe)?$/i, process.platform === 'win32' ? 'java.exe' : 'java')
        javaSource = 'custom'
    }
}

function normalizeJavaToolPath(basePath: string, tool: 'java' | 'javac') {
    const exe = process.platform === 'win32' ? `${tool}.exe` : tool
    return basePath.toLowerCase().endsWith(exe.toLowerCase()) ? basePath : join(basePath, 'bin', exe)
}

function getBundledJdkPath(tool: 'java' | 'javac'): string | null {
    const exe = process.platform === 'win32' ? `${tool}.exe` : tool
    const candidates = [
        join(process.resourcesPath || '', 'jdk', 'bin', exe),
        join(app.getAppPath(), 'vendor', 'jdk', 'bin', exe)
    ]

    return candidates.find(candidate => existsSync(candidate)) || null
}

function getJavaVersion(javacPath: string): string | undefined {
    try {
        const cmd = javacPath.includes(' ') ? `"${javacPath}" -version` : `${javacPath} -version`
        const output = execSync(cmd, {
            stdio: 'pipe',
            timeout: 5000,
            windowsHide: true
        }).toString()
        return output.trim()
    } catch (e: unknown) {
        if (e instanceof Error) {
            const stderr = (e as NodeJS.ErrnoException & { stderr?: Buffer }).stderr?.toString?.().trim()
            return stderr || undefined
        }
        return undefined
    }
}

export async function detectJavaRuntime(javaHome?: string, javaCompilerPath?: string): Promise<RuntimeInfo> {
    if (detectedJavaCompilerPath && detectedJavaRuntimePath) {
        return {
            language: 'java',
            compilerPath: detectedJavaCompilerPath,
            runtimePath: detectedJavaRuntimePath,
            source: javaSource,
            version: javaVersion
        }
    }

    const customCandidates: Array<{ javac: string, java: string, source: 'custom' | 'bundled' | 'system' }> = []

    if (javaCompilerPath) {
        customCandidates.push({
            javac: javaCompilerPath,
            java: javaCompilerPath.replace(/javac(\.exe)?$/i, process.platform === 'win32' ? 'java.exe' : 'java'),
            source: 'custom'
        })
    }

    if (javaHome) {
        customCandidates.push({
            javac: normalizeJavaToolPath(javaHome, 'javac'),
            java: normalizeJavaToolPath(javaHome, 'java'),
            source: 'custom'
        })
    }

    const bundledJavac = getBundledJdkPath('javac')
    const bundledJava = getBundledJdkPath('java')
    if (bundledJavac && bundledJava) {
        customCandidates.push({ javac: bundledJavac, java: bundledJava, source: 'bundled' })
    }

    if (process.env.JAVA_HOME) {
        customCandidates.push({
            javac: normalizeJavaToolPath(process.env.JAVA_HOME, 'javac'),
            java: normalizeJavaToolPath(process.env.JAVA_HOME, 'java'),
            source: 'system'
        })
    }

    for (const candidate of customCandidates) {
        if (!existsSync(candidate.javac) || !existsSync(candidate.java)) continue
        try {
            execSync(`${candidate.javac.includes(' ') ? `"${candidate.javac}"` : candidate.javac} -version`, {
                stdio: 'pipe',
                timeout: 5000,
                windowsHide: true
            })
            detectedJavaCompilerPath = candidate.javac
            detectedJavaRuntimePath = candidate.java
            javaSource = candidate.source
            javaVersion = getJavaVersion(candidate.javac)
            return {
                language: 'java',
                compilerPath: detectedJavaCompilerPath,
                runtimePath: detectedJavaRuntimePath,
                source: javaSource,
                version: javaVersion
            }
        } catch {
            // Try next candidate
        }
    }

    try {
        execSync('javac -version', {
            stdio: 'pipe',
            timeout: 5000,
            windowsHide: true
        })
        execSync('java -version', {
            stdio: 'pipe',
            timeout: 5000,
            windowsHide: true
        })
        detectedJavaCompilerPath = 'javac'
        detectedJavaRuntimePath = 'java'
        javaSource = 'system'
        javaVersion = getJavaVersion('javac')
        return {
            language: 'java',
            compilerPath: detectedJavaCompilerPath,
            runtimePath: detectedJavaRuntimePath,
            source: javaSource,
            version: javaVersion
        }
    } catch {
        javaSource = 'none'
        return {
            language: 'java',
            compilerPath: null,
            runtimePath: null,
            source: 'none'
        }
    }
}

export function setCustomPythonPath(pythonPath: string): void {
    detectedPythonPath = null
    pythonSource = 'none'
    pythonVersion = undefined

    if (pythonPath && existsSync(pythonPath)) {
        detectedPythonPath = pythonPath
        pythonSource = 'custom'
        try {
            const cmd = pythonPath.includes(' ') ? `"${pythonPath}" --version` : `${pythonPath} --version`
            const out = execSync(cmd, { stdio: 'pipe', timeout: 5000, windowsHide: true }).toString().trim()
            if (out && !out.toLowerCase().includes('was not found')) {
                pythonVersion = out
            }
        } catch { }
    }
}

export function getPythonInfo(): { path: string | null, source: string, version?: string } {
    return {
        path: detectedPythonPath,
        source: pythonSource,
        version: pythonVersion
    }
}

function getPythonVersionString(pythonPathOrCmd: string): string | undefined {
    try {
        const cmd = pythonPathOrCmd.includes(' ') ? `"${pythonPathOrCmd}" --version` : `${pythonPathOrCmd} --version`
        const out = execSync(cmd, { stdio: 'pipe', timeout: 5000, windowsHide: true }).toString().trim()
        if (out && !out.toLowerCase().includes('was not found') && !out.toLowerCase().includes('microsoft store')) {
            return out
        }
    } catch { }
    return undefined
}

export async function detectPython(customPath?: string): Promise<RuntimeInfo> {
    if (detectedPythonPath) {
        return {
            language: 'python',
            compilerPath: null,
            runtimePath: detectedPythonPath,
            source: pythonSource,
            version: pythonVersion
        }
    }

    // 1. Check custom path if supplied
    if (customPath && existsSync(customPath)) {
        const ver = getPythonVersionString(customPath)
        if (ver) {
            detectedPythonPath = customPath
            pythonSource = 'custom'
            pythonVersion = ver
            return {
                language: 'python',
                compilerPath: null,
                runtimePath: detectedPythonPath,
                source: pythonSource,
                version: pythonVersion
            }
        }
    }

    // 2. On Windows, check py launcher first as it detects active python installations
    if (process.platform === 'win32') {
        try {
            const exePath = execSync('py -c "import sys; print(sys.executable)"', {
                stdio: 'pipe',
                timeout: 5000,
                windowsHide: true
            }).toString().trim()

            if (exePath && existsSync(exePath)) {
                const ver = getPythonVersionString(exePath)
                if (ver) {
                    detectedPythonPath = exePath
                    pythonSource = 'system'
                    pythonVersion = ver
                    return {
                        language: 'python',
                        compilerPath: null,
                        runtimePath: detectedPythonPath,
                        source: pythonSource,
                        version: pythonVersion
                    }
                }
            }
        } catch { }

        // Also check standard AppData/Local/Programs/Python paths on Windows
        try {
            const localAppData = process.env.LOCALAPPDATA
            if (localAppData) {
                const pyDir = join(localAppData, 'Programs', 'Python')
                if (existsSync(pyDir)) {
                    const { readdirSync } = await import('fs')
                    const entries = readdirSync(pyDir)
                    for (const entry of entries) {
                        const candidate = join(pyDir, entry, 'python.exe')
                        if (existsSync(candidate)) {
                            const ver = getPythonVersionString(candidate)
                            if (ver) {
                                detectedPythonPath = candidate
                                pythonSource = 'system'
                                pythonVersion = ver
                                return {
                                    language: 'python',
                                    compilerPath: null,
                                    runtimePath: detectedPythonPath,
                                    source: pythonSource,
                                    version: pythonVersion
                                }
                            }
                        }
                    }
                }
            }
        } catch { }
    }

    // 3. Try standard candidate commands
    const candidates = process.platform === 'win32'
        ? ['python.exe', 'python3.exe', 'py.exe']
        : ['python3', 'python']

    for (const cmd of candidates) {
        const ver = getPythonVersionString(cmd)
        if (ver) {
            detectedPythonPath = cmd
            pythonSource = 'system'
            pythonVersion = ver
            return {
                language: 'python',
                compilerPath: null,
                runtimePath: detectedPythonPath,
                source: pythonSource,
                version: pythonVersion
            }
        }
    }

    pythonSource = 'none'
    return {
        language: 'python',
        compilerPath: null,
        runtimePath: null,
        source: 'none'
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
 * Detect available C compiler
 * Priority: Custom user path > Bundled MinGW gcc > System PATH (gcc, clang, cl.exe)
 */
export async function detectCCompiler(customPath?: string): Promise<string | null> {
    if (detectedCCompilerPath) return detectedCCompilerPath

    if (customPath && existsSync(customPath)) {
        console.log('Using custom C compiler from settings:', customPath)
        detectedCCompilerPath = customPath
        isBundledCompiler = false
        compilerSource = 'custom'
        return customPath
    }

    const bundledPath = getBundledCCompilerPath()
    if (bundledPath) {
        console.log('Using bundled MinGW C compiler:', bundledPath)
        detectedCCompilerPath = bundledPath
        isBundledCompiler = true
        compilerSource = 'bundled'
        return bundledPath
    }

    const compilers = [
        { cmd: 'gcc', args: ['--version'] },
        { cmd: 'clang', args: ['--version'] },
        { cmd: 'cl.exe', args: [] }
    ]

    for (const compiler of compilers) {
        try {
            execSync(`${compiler.cmd} ${compiler.args.join(' ')}`, {
                stdio: 'pipe',
                timeout: 5000,
                windowsHide: true
            })
            console.log('Found system C compiler:', compiler.cmd)
            detectedCCompilerPath = compiler.cmd
            isBundledCompiler = false
            compilerSource = 'system'
            return compiler.cmd
        } catch {
            // Try next
        }
    }

    return null
}

/**
 * Get the actual compiler path to use for compilation
 */
function getCompilerPath(): string | null {
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
                `/Fe:${executableFile}`,
                sourceFile
            ]
            compileCmd = compilerPath
        } else {
            // GCC/Clang
            compileArgs = [
                `-std=${cppStandard}`,
                '-Wall',
                '-Wextra',
                '-o', executableFile,
                sourceFile
            ]
            compileCmd = compilerPath
        }

        // Build env with bundled MinGW path if applicable
        const compileEnv = isBundledCompiler ? getBundledMingwEnv() : undefined

        // Compile
        const compileStart = Date.now()
        const compileResult = await runCompilationProcess(compileCmd, compileArgs, tempDir, 30000, compileEnv)
        const compileTime = Date.now() - compileStart

        if (!compileResult.success) {
            cleanupDir(tempDir)

            return {
                success: false,
                error: `🔧 Compilation Error:\n\n${compileResult.stderr || compileResult.stdout}`,
                compileTime
            }
        }

        // Check if executable was created
        if (!existsSync(executableFile)) {
            cleanupDir(tempDir)

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

    } catch (e: unknown) {
        cleanupDir(tempDir)
        const message = e instanceof Error ? e.message : String(e)
        return {
            success: false,
            error: `❌ Unexpected error: ${message}`
        }
    }
}

/**
 * Compile C code only
 */
export async function compileCCode(code: string, cStandard: string): Promise<CompileResult> {
    const compiler = await detectCCompiler()

    if (!compiler) {
        return {
            success: false,
            error: '❌ No C compiler found!\n\nThe bundled compiler was not detected. Please reinstall CarbonCode or install MinGW-w64 / GCC manually.'
        }
    }

    // Create unique temporary directory
    const tempDir = join(tmpdir(), `c-ide-${randomUUID()}`)
    const sourceFile = join(tempDir, 'main.c')
    const exeExtension = process.platform === 'win32' ? '.exe' : ''
    const executableFile = join(tempDir, `main${exeExtension}`)

    try {
        // Create temp directory
        mkdirSync(tempDir, { recursive: true })

        // Write source code to temp file
        writeFileSync(sourceFile, code, 'utf-8')

        let compileCmd: string
        let compileArgs: string[]

        const compilerPath = detectedCCompilerPath || compiler

        if (compiler === 'cl.exe' || compilerPath.toLowerCase().endsWith('cl.exe')) {
            // MSVC C compiler
            const msvcStd = (cStandard === 'c11' || cStandard === 'c17') ? `/std:${cStandard}` : '/std:c11'
            compileArgs = [
                '/EHsc',
                msvcStd,
                '/W4',
                `/Fe:${executableFile}`,
                sourceFile
            ]
            compileCmd = compilerPath
        } else {
            // GCC / Clang
            compileArgs = [
                `-std=${cStandard || 'c17'}`,
                '-Wall',
                '-Wextra',
                '-o', executableFile,
                sourceFile
            ]
            compileCmd = compilerPath
        }

        const compileEnv = isBundledCompiler ? getBundledMingwEnv() : undefined

        const compileStart = Date.now()
        const compileResult = await runCompilationProcess(compileCmd, compileArgs, tempDir, 30000, compileEnv)
        const compileTime = Date.now() - compileStart

        if (!compileResult.success) {
            cleanupDir(tempDir)

            return {
                success: false,
                error: `🔧 Compilation Error:\n\n${compileResult.stderr || compileResult.stdout}`,
                compileTime
            }
        }

        if (!existsSync(executableFile)) {
            cleanupDir(tempDir)

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

    } catch (e: unknown) {
        cleanupDir(tempDir)
        const message = e instanceof Error ? e.message : String(e)
        return {
            success: false,
            error: `❌ Unexpected error: ${message}`
        }
    }
}



export async function compileJavaCode(code: string, filePath?: string | null): Promise<CompileResult & { mainClass?: string }> {
    const runtime = await detectJavaRuntime()

    if (!runtime.compilerPath || !runtime.runtimePath) {
        return {
            success: false,
            error: 'No Java JDK found!\n\nInstall a JDK with javac, set JAVA_HOME, or configure the Java compiler path in Settings.'
        }
    }

    const tempDir = join(tmpdir(), `carboncode-java-${randomUUID()}`)

    // Extract the public class name from code to ensure filename matches
    let mainClass = 'Main'
    const classMatch = code.match(/\bpublic\s+class\s+(\w+)/)
    if (classMatch) {
        mainClass = classMatch[1]
    } else if (filePath) {
        mainClass = basename(filePath, extname(filePath))
    }

    const sourceName = `${mainClass}.java`
    const sourceFile = join(tempDir, sourceName)

    try {
        mkdirSync(tempDir, { recursive: true })
        writeFileSync(sourceFile, code, 'utf-8')

        const javacCmd = runtime.compilerPath
        const compileStart = Date.now()
        const compileResult = await runCompilationProcess(javacCmd, [sourceFile], tempDir, 30000)
        const compileTime = Date.now() - compileStart

        if (!compileResult.success) {
            cleanupDir(tempDir)

            return {
                success: false,
                error: `Java Compilation Error:\n\n${compileResult.stderr || compileResult.stdout}`,
                compileTime
            }
        }

        return {
            success: true,
            tempDir,
            executablePath: runtime.runtimePath,
            compileTime,
            mainClass
        }
    } catch (e: unknown) {
        cleanupDir(tempDir)
        const message = e instanceof Error ? e.message : String(e)
        return {
            success: false,
            error: `Unexpected Java error: ${message}`
        }
    }
}

/**
 * Buffers and throttles a child-process stream so that output is forwarded to the
 * renderer in batches rather than one IPC message per tiny flush.
 */
function createThrottledStreamHandler(
    onData: (data: string) => void,
    flushIntervalMs = 100,
    maxBufferSize = 4096
) {
    let buffer = ''
    let timer: NodeJS.Timeout | null = null

    const flush = () => {
        if (timer) {
            clearTimeout(timer)
            timer = null
        }
        if (buffer) {
            onData(buffer)
            buffer = ''
        }
    }

    return {
        write: (chunk: string) => {
            buffer += chunk
            if (buffer.length >= maxBufferSize) {
                flush()
            } else if (!timer) {
                timer = setTimeout(flush, flushIntervalMs)
            }
        },
        flush
    }
}

// ponytail: merged startInteractiveProcess + startInteractiveCommand into one
function spawnProcess(
    command: string, args: string[], cwd: string,
    onStdout: (d: string) => void, onStderr: (d: string) => void, onExit: (code: number) => void,
    env?: NodeJS.ProcessEnv
): ChildProcess {
    currentProcess = spawn(command, args, {
        cwd, shell: false, detached: true, windowsHide: true, ...(env ? { env } : {})
    })

    const stdoutH = createThrottledStreamHandler(onStdout)
    const stderrH = createThrottledStreamHandler(onStderr)

    const timeout = setTimeout(() => {
        if (currentProcess) {
            stderrH.write('\n⏱ Execution timed out after 30 seconds. Process was killed.\n')
            stderrH.flush()
            killProcess()
            onExit(-1)
        }
    }, 30000)

    currentProcess.stdout?.on('data', (d) => stdoutH.write(d.toString()))
    currentProcess.stderr?.on('data', (d) => stderrH.write(d.toString()))

    currentProcess.on('close', (code) => {
        clearTimeout(timeout)
        stdoutH.flush()
        stderrH.flush()
        currentProcess = null
        onExit(code || 0)
        setTimeout(() => cleanupDir(cwd), 500)
    })

    currentProcess.on('error', (err) => {
        onStderr(`Spawn Error: ${err.message}`)
        currentProcess = null
        onExit(1)
    })

    return currentProcess
}

export function startInteractiveProcess(
    executablePath: string, tempDir: string,
    onStdout: (d: string) => void, onStderr: (d: string) => void, onExit: (code: number) => void
): ChildProcess {
    const cmd = process.platform === 'win32' ? executablePath : `./${basename(executablePath)}`
    const env = isBundledCompiler ? getBundledMingwEnv() : undefined
    return spawnProcess(cmd, [], tempDir, onStdout, onStderr, onExit, env)
}

export function startJavaProcess(
    javaPath: string, tempDir: string, mainClass: string,
    onStdout: (d: string) => void, onStderr: (d: string) => void, onExit: (code: number) => void
): ChildProcess {
    return spawnProcess(javaPath, ['-cp', tempDir, mainClass], tempDir, onStdout, onStderr, onExit)
}

export function startPythonProcess(
    pythonPath: string, tempDir: string,
    onStdout: (d: string) => void, onStderr: (d: string) => void, onExit: (code: number) => void
): ChildProcess {
    const scriptPath = join(tempDir, 'main.py')
    return spawnProcess(pythonPath, ['-u', scriptPath], tempDir, onStdout, onStderr, onExit)
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
        } catch (e: unknown) {
            console.error('Failed to write to process:', e)
            return false
        }
    }
    return false
}

export function killProcess(): boolean {
    if (currentProcess) {
        const pid = currentProcess.pid
        if (pid) {
            try {
                // On Windows, kill the entire process tree (parent + children)
                if (process.platform === 'win32') {
                    spawn('taskkill', ['/F', '/T', '/PID', String(pid)], {
                        stdio: 'ignore',
                        detached: true,
                        windowsHide: true
                    }).unref()
                } else {
                    // On Unix, send SIGTERM to process group
                    process.kill(-pid, 'SIGTERM')
                }
            } catch {
                // Fallback: kill the direct process
                try { currentProcess.kill('SIGKILL') } catch { }
            }
        } else {
            currentProcess.kill('SIGKILL')
        }
        currentProcess = null
        return true
    }
    return false
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

        const spawnOptions: SpawnOptions = {
            cwd,
            shell: false,
            windowsHide: true,
            ...(env ? { env } : {})
        }

        const proc = spawn(cmd, args, spawnOptions)

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
