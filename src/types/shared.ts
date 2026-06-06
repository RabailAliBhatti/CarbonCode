export type SupportedLanguage = 'cpp' | 'java'

export type CompilerSource = 'custom' | 'bundled' | 'system' | 'none'

export interface RuntimeInfo {
    language: SupportedLanguage
    compilerPath: string | null
    runtimePath?: string | null
    source: CompilerSource
    version?: string
}

export interface RunRequest {
    language: SupportedLanguage
    code: string
    filePath?: string | null
    cppStandard?: string
}

export interface CompilationResult {
    success: boolean
    output: string
    error: string
    compileTime?: number
    executionTime?: number
}

export interface CompileResult {
    success: boolean
    error?: string
    executablePath?: string
    tempDir?: string
    compileTime?: number
}

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

export type DebugStatus = 'idle' | 'running' | 'stopped' | 'exited'

export interface DebugState {
    status: DebugStatus
    currentFile?: string
    currentLine?: number
    breakpoints: Breakpoint[]
    locals: Variable[]
}
