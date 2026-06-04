import { execSync, spawn, ChildProcess } from 'child_process'
import { writeFileSync, existsSync, mkdirSync, rmSync } from 'fs'
import { basename, extname, join } from 'path'
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

export type SupportedLanguage = 'cpp' | 'java'

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
}

// Store running processes for potential cancellation
let currentProcess: ChildProcess | null = null

// Store the detected compiler path
let detectedCompilerPath: string | null = null
let detectedJavaCompilerPath: string | null = null
let detectedJavaRuntimePath: string | null = null

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
let javaSource: 'custom' | 'bundled' | 'system' | 'none' = 'none'
let javaVersion: string | undefined

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
    if (basePath.toLowerCase().endsWith(exe.toLowerCase())) {
        return basePath
    }
    return join(basePath, 'bin', exe)
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
    } catch (e: any) {
        const stderr = e?.stderr?.toString?.().trim()
        return stderr || undefined
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
 * Auto-detect and add missing Java imports
 */
function addMissingJavaImports(code: string): string {
    // Map of class names to their import statements
    const importMap: Record<string, string> = {
        // java.util
        'Scanner': 'import java.util.Scanner;',
        'ArrayList': 'import java.util.ArrayList;',
        'LinkedList': 'import java.util.LinkedList;',
        'HashMap': 'import java.util.HashMap;',
        'TreeMap': 'import java.util.TreeMap;',
        'LinkedHashMap': 'import java.util.LinkedHashMap;',
        'HashSet': 'import java.util.HashSet;',
        'TreeSet': 'import java.util.TreeSet;',
        'List': 'import java.util.List;',
        'ArrayList_': 'import java.util.ArrayList;',
        'Map': 'import java.util.Map;',
        'Set': 'import java.util.Set;',
        'Queue': 'import java.util.Queue;',
        'Deque': 'import java.util.Deque;',
        'Stack': 'import java.util.Stack;',
        'PriorityQueue': 'import java.util.PriorityQueue;',
        'Collections': 'import java.util.Collections;',
        'Arrays': 'import java.util.Arrays;',
        'Comparator': 'import java.util.Comparator;',
        'Comparable': 'import java.lang.Comparable;',
        'Iterator': 'import java.util.Iterator;',
        'ListIterator': 'import java.util.ListIterator;',
        'Random': 'import java.util.Random;',
        'Date': 'import java.util.Date;',
        'Calendar': 'import java.util.Calendar;',
        'Optional': 'import java.util.Optional;',
        'stream': 'import java.util.stream.*;',
        'Stream': 'import java.util.stream.Stream;',
        'Collectors': 'import java.util.stream.Collectors;',
        'HashMap_': 'import java.util.HashMap;',
        'StringJoiner': 'import java.util.StringJoiner;',
        'Objects': 'import java.util.Objects;',
        'Tuple': 'import java.util.AbstractMap;',

        // java.io
        'File': 'import java.io.File;',
        'FileReader': 'import java.io.FileReader;',
        'FileWriter': 'import java.io.FileWriter;',
        'BufferedReader': 'import java.io.BufferedReader;',
        'BufferedWriter': 'import java.io.BufferedWriter;',
        'PrintWriter': 'import java.io.PrintWriter;',
        'FileNotFoundException': 'import java.io.FileNotFoundException;',
        'IOException': 'import java.io.IOException;',
        'InputStream': 'import java.io.InputStream;',
        'OutputStream': 'import java.io.OutputStream;',
        'FileInputStream': 'import java.io.FileInputStream;',
        'FileOutputStream': 'import java.io.FileOutputStream;',
        'ObjectOutputStream': 'import java.io.ObjectOutputStream;',
        'ObjectInputStream': 'import java.io.ObjectInputStream;',
        'ByteArrayInputStream': 'import java.io.ByteArrayInputStream;',
        'ByteArrayOutputStream': 'import java.io.ByteArrayOutputStream;',
        'DataInputStream': 'import java.io.DataInputStream;',
        'DataOutputStream': 'import java.io.DataOutputStream;',
        'Serializable': 'import java.io.Serializable;',

        // java.math
        'BigDecimal': 'import java.math.BigDecimal;',
        'BigInteger': 'import java.math.BigInteger;',

        // java.time
        'LocalDate': 'import java.time.LocalDate;',
        'LocalTime': 'import java.time.LocalTime;',
        'LocalDateTime': 'import java.time.LocalDateTime;',
        'Instant': 'import java.time.Instant;',
        'Duration': 'import java.time.Duration;',
        'Period': 'import java.time.Period;',
        'DateTimeFormatter': 'import java.time.format.DateTimeFormatter;',

        // java.util.regex
        'Pattern': 'import java.util.regex.Pattern;',
        'Matcher': 'import java.util.regex.Matcher;',

        // java.net
        'URL': 'import java.net.URL;',
        'URI': 'import java.net.URI;',
        'HttpURLConnection': 'import java.net.HttpURLConnection;',
        'ServerSocket': 'import java.net.ServerSocket;',
        'Socket': 'import java.net.Socket;',

        // java.lang (usually auto-imported, but explicit for clarity)
        'Math': 'import java.lang.Math;',
        'String': 'import java.lang.String;',
        'System': 'import java.lang.System;',
        'Thread': 'import java.lang.Thread;',
        'Runnable': 'import java.lang.Runnable;',
        'Exception': 'import java.lang.Exception;',
        'RuntimeException': 'import java.lang.RuntimeException;',
        'NullPointerException': 'import java.lang.NullPointerException;',
        'IndexOutOfBoundsException': 'import java.lang.IndexOutOfBoundsException;',
        'ClassNotFoundException': 'import java.lang.ClassNotFoundException;',
        'StringBuilder': 'import java.lang.StringBuilder;',
        'StringBuffer': 'import java.lang.StringBuffer;',
        'Integer': 'import java.lang.Integer;',
        'Double': 'import java.lang.Double;',
        'Float': 'import java.lang.Float;',
        'Long': 'import java.lang.Long;',
        'Boolean': 'import java.lang.Boolean;',
        'Character': 'import java.lang.Character;',
        'Byte': 'import java.lang.Byte;',
        'Short': 'import java.lang.Short;',
        'Number': 'import java.lang.Number;',
        'Void': 'import java.lang.Void;',
        'Class': 'import java.lang.Class;',
        'SuppressWarnings': 'import java.lang.SuppressWarnings;',
        'Override': 'import java.lang.Override;',
        'Deprecated': 'import java.lang.Deprecated;',
        'AutoCloseable': 'import java.lang.AutoCloseable;',
        'Comparable_': 'import java.lang.Comparable;',
        'Enum': 'import java.lang.Enum;',
        'Annotation': 'import java.lang.annotation.Annotation;',
        'FunctionalInterface': 'import java.lang.FunctionalInterface;',
    }

    // Common patterns that indicate a class is used
    const classPatterns = [
        /new\s+(\w+)\s*\(/g,           // new ClassName(
        /(\w+)\s+\w+\s*=/g,            // ClassName variable =
        /(\w+)\s*<[^>]*>/g,            // ClassName<...>
        /(\w+)\s*\[\]/g,               // ClassName[]
        /(\w+)\s+\w+\s*;/g,            // ClassName variable;
        /(\w+)\s+\w+\s*\)/g,           // ClassName variable)
        /:\s*(\w+)/g,                   // : ClassName
        /extends\s+(\w+)/g,            // extends ClassName
        /implements\s+(\w+)/g,         // implements ClassName
        /throws\s+(\w+)/g,             // throws ClassName
        /catch\s*\(\s*(\w+)/g,         // catch (ClassName
        /import\s+.*\.(\w+);/g,        // Already imported
        /(\w+)\.(\w+)\s*\(/g,          // ClassName.method(
        /static\s+(\w+)\./g,           // static ClassName.
    ]

    // Extract existing imports
    const existingImports = new Set<string>()
    const importRegex = /import\s+[\w.]+;/g
    let match
    while ((match = importRegex.exec(code)) !== null) {
        existingImports.add(match[0])
    }

    // Find classes that are used but not imported
    const missingImports = new Set<string>()
    const classesToImport = new Set<string>()

    // Check each class in the import map
    for (const className of Object.keys(importMap)) {
        // Skip internal markers
        if (className.endsWith('_')) continue

        // Check if class is used in code (but not in import statements)
        const codeWithoutImports = code.replace(/import\s+[\w.]+;/g, '')
        const classRegex = new RegExp(`\\b${className}\\b`, 'g')
        if (classRegex.test(codeWithoutImports)) {
            // Check if already imported
            const importStmt = importMap[className]
            if (!existingImports.has(importStmt)) {
                // Also check if there's a wildcard import for the package
                const packageName = importStmt.replace('import ', '').replace(`.${className};`, '')
                const wildcardImport = `import ${packageName}.*;`
                if (!existingImports.has(wildcardImport)) {
                    missingImports.add(importStmt)
                }
            }
        }
    }

    // If there are missing imports, add them after the package declaration (or at the top)
    if (missingImports.size > 0) {
        const sortedImports = Array.from(missingImports).sort()
        const importBlock = sortedImports.join('\n')

        // Find where to insert imports
        const packageMatch = code.match(/package\s+[\w.]+;\s*\n/)
        if (packageMatch) {
            // Insert after package declaration
            const insertPos = code.indexOf(packageMatch[0]) + packageMatch[0].length
            return code.slice(0, insertPos) + '\n' + importBlock + '\n\n' + code.slice(insertPos)
        } else {
            // Insert at the beginning (after any comments)
            const firstNonComment = code.search(/^(?!\/\/)/m)
            if (firstNonComment > 0) {
                return code.slice(0, firstNonComment) + importBlock + '\n\n' + code.slice(firstNonComment)
            } else {
                return importBlock + '\n\n' + code
            }
        }
    }

    return code
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
    const sourceName = filePath && filePath.toLowerCase().endsWith('.java')
        ? basename(filePath)
        : 'Main.java'
    const sourceFile = join(tempDir, sourceName)
    const mainClass = basename(sourceName, extname(sourceName))

    // Auto-add missing imports
    const codeWithImports = addMissingJavaImports(code)

    try {
        mkdirSync(tempDir, { recursive: true })
        writeFileSync(sourceFile, codeWithImports, 'utf-8')

        const javacCmd = runtime.compilerPath.includes(' ') ? `"${runtime.compilerPath}"` : runtime.compilerPath
        const compileStart = Date.now()
        const compileResult = await runCompilationProcess(javacCmd, [`"${sourceFile}"`], tempDir, 30000)
        const compileTime = Date.now() - compileStart

        if (!compileResult.success) {
            try {
                if (existsSync(tempDir)) {
                    rmSync(tempDir, { recursive: true, force: true })
                }
            } catch { }

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
    } catch (e: any) {
        try {
            if (existsSync(tempDir)) {
                rmSync(tempDir, { recursive: true, force: true })
            }
        } catch { }
        return {
            success: false,
            error: `Unexpected Java error: ${e.message}`
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

export function startInteractiveCommand(
    command: string,
    args: string[],
    cwd: string,
    onStdout: (data: string) => void,
    onStderr: (data: string) => void,
    onExit: (code: number) => void,
    env?: NodeJS.ProcessEnv
): ChildProcess {
    const options: any = {
        cwd,
        shell: true,
        windowsHide: true
    }
    if (env) {
        options.env = env
    }

    currentProcess = spawn(command, args, options)

    currentProcess.stdout?.on('data', (data) => {
        onStdout(data.toString())
    })

    currentProcess.stderr?.on('data', (data) => {
        onStderr(data.toString())
    })

    currentProcess.on('close', (code) => {
        currentProcess = null
        onExit(code || 0)
        setTimeout(() => {
            try {
                if (existsSync(cwd)) {
                    rmSync(cwd, { recursive: true, force: true })
                }
            } catch (err) {
                console.error('Failed to cleanup temp dir:', err)
            }
        }, 500)
    })

    currentProcess.on('error', (err) => {
        onStderr(`Spawn Error: ${err.message}`)
        currentProcess = null
        onExit(1)
    })

    return currentProcess
}

export function startJavaProcess(
    javaPath: string,
    tempDir: string,
    mainClass: string,
    onStdout: (data: string) => void,
    onStderr: (data: string) => void,
    onExit: (code: number) => void
): ChildProcess {
    const cmd = javaPath.includes(' ') ? `"${javaPath}"` : javaPath
    return startInteractiveCommand(cmd, ['-cp', `"${tempDir}"`, mainClass], tempDir, onStdout, onStderr, onExit)
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

