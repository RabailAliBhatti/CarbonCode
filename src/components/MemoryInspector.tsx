import React, { useState, useEffect } from 'react'

export interface Variable {
    name: string
    value: string
    type: string
}

export interface MemoryInspectorProps {
    locals: Variable[]
    isStopped: boolean
    onEvaluate?: (expression: string) => Promise<{ success: boolean; value?: string; error?: string }>
}

interface ParsedVariable {
    name: string
    type: string
    value: string
    address?: string
    isPointer: boolean
    pointerTargetAddress?: string
    pointsToVarName?: string
    derefValue?: string
    isArray: boolean
    arraySize?: number
    arrayElements?: string[]
}

// Demo data for CS101 learning preview when debugger is idle
const DEMO_LOCALS: Variable[] = [
    { name: 'score', type: 'int', value: '100' },
    { name: 'ptr', type: 'int *', value: '0x7ffee4' },
    { name: 'arr', type: 'int [4]', value: '{10, 20, 30, 40}' },
    { name: 'message', type: 'const char *', value: '0x7ffee0' }
]

const DEMO_ADDRESSES: Record<string, string> = {
    score: '0x7ffee4',
    ptr: '0x7ffed8',
    arr: '0x7ffec0',
    message: '0x7ffeb8'
}

export const MemoryInspector: React.FC<MemoryInspectorProps> = ({
    locals,
    isStopped,
    onEvaluate
}) => {
    const [addresses, setAddresses] = useState<Record<string, string>>({})
    const [derefs, setDerefs] = useState<Record<string, string>>({})
    const [testIndices, setTestIndices] = useState<Record<string, string>>({})
    const [isEvaluating, setIsEvaluating] = useState<boolean>(false)

    const activeLocals = (locals && locals.length > 0) ? locals : DEMO_LOCALS
    const isUsingDemo = !locals || locals.length === 0

    // Live evaluate memory addresses (&var) and dereferences (*ptr) when stopped
    useEffect(() => {
        if (!isStopped || !onEvaluate || isUsingDemo) {
            if (isUsingDemo) {
                setAddresses(DEMO_ADDRESSES)
                setDerefs({ ptr: '100' })
            }
            return
        }

        let isMounted = true
        setIsEvaluating(true)

        const fetchAddresses = async () => {
            const newAddresses: Record<string, string> = {}
            const newDerefs: Record<string, string> = {}

            for (const v of locals) {
                try {
                    // 1. Fetch address: &var
                    const addrRes = await onEvaluate(`&${v.name}`)
                    if (addrRes.success && addrRes.value) {
                        const hexMatch = addrRes.value.match(/0x[0-9a-fA-F]+/)
                        if (hexMatch) {
                            newAddresses[v.name] = hexMatch[0].toLowerCase()
                        }
                    }

                    // 2. If pointer, fetch dereference: *var
                    const isPtr = v.type.includes('*') || v.value.startsWith('0x')
                    if (isPtr && !v.value.includes('0x0')) {
                        const derefRes = await onEvaluate(`*${v.name}`)
                        if (derefRes.success && derefRes.value) {
                            newDerefs[v.name] = derefRes.value
                        }
                    }
                } catch (e) {
                    console.warn(`Memory inspect error for ${v.name}:`, e)
                }
            }

            if (isMounted) {
                setAddresses(newAddresses)
                setDerefs(newDerefs)
                setIsEvaluating(false)
            }
        }

        fetchAddresses()

        return () => {
            isMounted = false
        }
    }, [isStopped, locals, onEvaluate, isUsingDemo])

    // Parse variables into enriched Memory Model
    const parsedVariables: ParsedVariable[] = activeLocals.map((v) => {
        const address = addresses[v.name]
        const isPointer = v.type.includes('*') || /0x[0-9a-fA-F]+/.test(v.value)
        let pointerTargetAddress: string | undefined = undefined
        let pointsToVarName: string | undefined = undefined

        if (isPointer) {
            const ptrMatch = v.value.match(/0x[0-9a-fA-F]+/)
            if (ptrMatch) {
                pointerTargetAddress = ptrMatch[0].toLowerCase()
                // Find if target address belongs to any other variable
                const found = Object.entries(addresses).find(
                    ([varName, addr]) => varName !== v.name && addr.toLowerCase() === pointerTargetAddress
                )
                if (found) {
                    pointsToVarName = found[0]
                }
            }
        }

        // Array detection
        const arrayMatch = v.type.match(/\[(\d+)\]/)
        const isArray = Boolean(arrayMatch) || v.value.startsWith('{') || v.value.startsWith('[')
        let arraySize: number | undefined = undefined
        let arrayElements: string[] = []

        if (arrayMatch) {
            arraySize = parseInt(arrayMatch[1], 10)
        }

        // Parse array elements from string like "{10, 20, 30}"
        if (v.value.startsWith('{') && v.value.endsWith('}')) {
            const inner = v.value.slice(1, -1)
            arrayElements = inner.split(',').map(s => s.trim())
            if (!arraySize) arraySize = arrayElements.length
        }

        return {
            name: v.name,
            type: v.type,
            value: v.value,
            address,
            isPointer,
            pointerTargetAddress,
            pointsToVarName,
            derefValue: derefs[v.name],
            isArray,
            arraySize,
            arrayElements
        }
    })

    const handleTestIndexChange = (varName: string, val: string) => {
        setTestIndices(prev => ({ ...prev, [varName]: val }))
    }

    return (
        <div className="flex flex-col h-full bg-carbon-bg text-carbon-text-primary p-3 space-y-4 select-text font-sans">
            {/* Header Banner */}
            <div className="flex items-center justify-between pb-2 border-b border-carbon-border">
                <div className="flex items-center gap-2">
                    <span className="text-base">🧠</span>
                    <div>
                        <h3 className="text-xs font-semibold text-carbon-text-primary flex items-center gap-2">
                            <span>Visual Memory & Pointer Inspector</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-400 border border-purple-500/30">
                                CS101 RAM Visualizer
                            </span>
                        </h3>
                        <p className="text-[11px] text-carbon-text-muted">
                            Live visualization of RAM stack addresses, pointer linkages, and array boundary safety.
                        </p>
                    </div>
                </div>

                {isUsingDemo ? (
                    <div className="text-[11px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/25 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                        <span>Interactive Demo Mode (Run F5 to view live RAM)</span>
                    </div>
                ) : (
                    <div className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 flex items-center gap-1.5 font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>Live GDB RAM State {isEvaluating && '(inspecting...)'}</span>
                    </div>
                )}
            </div>

            {/* Grid of Memory Cells */}
            <div className="space-y-3">
                {parsedVariables.map((v) => {
                    const testIdxStr = testIndices[v.name] ?? ''
                    const testIdx = testIdxStr !== '' ? parseInt(testIdxStr, 10) : null
                    const isOutOfBounds = testIdx !== null && v.arraySize !== undefined && (testIdx < 0 || testIdx >= v.arraySize)

                    return (
                        <div
                            key={v.name}
                            className={`rounded-lg border p-3 transition-all ${
                                v.isPointer
                                    ? 'bg-purple-950/20 border-purple-500/40 shadow-sm'
                                    : v.isArray
                                    ? 'bg-blue-950/20 border-blue-500/40 shadow-sm'
                                    : 'bg-carbon-surface border-carbon-border'
                            }`}
                        >
                            {/* Card Header: Name, Type, Address */}
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-sm text-carbon-text-primary">
                                        {v.name}
                                    </span>
                                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-carbon-elevated text-carbon-text-secondary border border-carbon-border">
                                        {v.type}
                                    </span>
                                    {v.isPointer && (
                                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                            POINTER
                                        </span>
                                    )}
                                    {v.isArray && (
                                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                            ARRAY [{v.arraySize ?? '?'}]
                                        </span>
                                    )}
                                </div>

                                {/* RAM Memory Address Chip */}
                                <div className="flex items-center gap-1.5 font-mono text-[11px] bg-carbon-bg px-2 py-0.5 rounded border border-carbon-border/60">
                                    <span className="text-carbon-text-muted">&{v.name}:</span>
                                    <span className="text-amber-400 font-semibold">{v.address || '0x??????'}</span>
                                </div>
                            </div>

                            {/* 1. Pointer Visualization */}
                            {v.isPointer && (
                                <div className="mt-2 p-2.5 rounded-md bg-purple-900/25 border border-purple-500/30 space-y-2">
                                    <div className="flex items-center gap-2 text-xs font-mono">
                                        <span className="text-purple-300 font-semibold">{v.name}</span>
                                        <span className="text-carbon-text-muted">contains address:</span>
                                        <span className="text-amber-300 font-bold bg-carbon-bg/80 px-2 py-0.5 rounded border border-purple-500/40">
                                            {v.pointerTargetAddress || v.value}
                                        </span>
                                    </div>

                                    {/* Pointer Target Arrow Indicator */}
                                    {v.pointsToVarName ? (
                                        <div className="flex items-center gap-2 text-xs bg-emerald-950/40 border border-emerald-500/40 rounded px-2.5 py-1.5 text-emerald-300">
                                            <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                            </svg>
                                            <span className="font-semibold font-mono">Points directly to '{v.pointsToVarName}'</span>
                                            <span className="text-[11px] text-emerald-400/80">
                                                (Target value: <span className="font-mono font-bold text-white">*{v.name} = {v.derefValue || 'unknown'}</span>)
                                            </span>
                                        </div>
                                    ) : v.value.includes('0x0') || v.value === '0' ? (
                                        <div className="flex items-center gap-2 text-xs bg-red-950/40 border border-red-500/40 rounded px-2.5 py-1.5 text-red-300">
                                            <span>⚠️</span>
                                            <span className="font-semibold">NULL Pointer</span>
                                            <span className="text-[11px] text-red-400/80">— Attempting to dereference (*{v.name}) will crash with Segmentation Fault!</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-xs bg-carbon-surface border border-carbon-border rounded px-2.5 py-1 text-carbon-text-secondary">
                                            <svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                            </svg>
                                            <span>External / Heap Address</span>
                                            {v.derefValue && <span className="font-mono text-white">(*{v.name} = {v.derefValue})</span>}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 2. Array Cells & Out-of-Bounds Inspector */}
                            {v.isArray && (
                                <div className="mt-2 space-y-2">
                                    {/* Visual Array Memory Blocks */}
                                    <div className="overflow-x-auto pb-1">
                                        <div className="flex items-stretch gap-1.5 min-w-max">
                                            {(v.arrayElements && v.arrayElements.length > 0
                                                ? v.arrayElements
                                                : Array.from({ length: v.arraySize || 4 }).map((_, i) => `val_${i}`)
                                            ).map((elem, idx) => (
                                                <div
                                                    key={idx}
                                                    className={`flex flex-col items-center justify-between p-2 rounded border font-mono min-w-[70px] ${
                                                        testIdx === idx
                                                            ? 'bg-blue-600/30 border-blue-400 ring-2 ring-blue-400/40'
                                                            : 'bg-carbon-bg border-carbon-border'
                                                    }`}
                                                >
                                                    <span className="text-[10px] text-carbon-text-muted font-semibold">
                                                        [{idx}]
                                                    </span>
                                                    <span className="text-xs font-bold text-sky-300 my-1">
                                                        {elem}
                                                    </span>
                                                    <span className="text-[9px] text-carbon-text-muted/70">
                                                        cell {idx}
                                                    </span>
                                                </div>
                                            ))}

                                            {/* Out-of-bounds warning slot if tested */}
                                            {isOutOfBounds && testIdx !== null && (
                                                <div className="flex flex-col items-center justify-between p-2 rounded border border-red-500 bg-red-950/40 text-red-400 font-mono min-w-[90px] animate-pulse">
                                                    <span className="text-[10px] font-bold">[{testIdx}] ⚠️</span>
                                                    <span className="text-xs font-bold text-red-300 my-1">GARBAGE</span>
                                                    <span className="text-[9px] text-red-400">OUT OF BOUNDS</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Interactive Index Test Input & Bounds Checker */}
                                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-carbon-border/50 text-xs">
                                        <span className="text-carbon-text-secondary">Test Index Access:</span>
                                        <div className="flex items-center gap-1 font-mono">
                                            <span className="text-carbon-text-muted">{v.name}[</span>
                                            <input
                                                type="number"
                                                value={testIdxStr}
                                                onChange={(e) => handleTestIndexChange(v.name, e.target.value)}
                                                placeholder="e.g. 0, 4, 10"
                                                className="w-16 px-1.5 py-0.5 bg-carbon-bg border border-carbon-border rounded text-center text-xs text-carbon-text-primary focus:border-carbon-accent outline-none font-mono"
                                            />
                                            <span className="text-carbon-text-muted">]</span>
                                        </div>

                                        {isOutOfBounds ? (
                                            <div className="flex items-center gap-1.5 text-xs text-red-400 bg-red-950/40 px-2 py-0.5 rounded border border-red-500/50 animate-pulse font-medium">
                                                <span>🚨</span>
                                                <span>
                                                    Out of bounds! Index [{testIdx}] exceeds array bounds [0..{(v.arraySize ?? 1) - 1}].
                                                </span>
                                            </div>
                                        ) : testIdx !== null && v.arraySize !== undefined ? (
                                            <div className="text-xs text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-500/30 font-medium">
                                                ✓ Safe Access (valid cell)
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            )}

                            {/* 3. Standard Primitive Variable */}
                            {!v.isPointer && !v.isArray && (
                                <div className="flex items-center gap-2 text-xs font-mono bg-carbon-bg p-2 rounded border border-carbon-border/50">
                                    <span className="text-carbon-text-muted">value =</span>
                                    <span className="text-emerald-400 font-bold text-sm">{v.value}</span>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default MemoryInspector

