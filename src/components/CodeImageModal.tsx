import React, { useState, useEffect, useRef } from 'react'

export interface CodeImageModalProps {
    isOpen: boolean
    onClose: () => void
    initialCode: string
    fileName: string
    language: string
}

interface GradientTheme {
    id: string
    name: string
    cssBackground: string
    startColor: string
    midColor?: string
    endColor: string
}

const GRADIENT_THEMES: GradientTheme[] = [
    {
        id: 'carbon-night',
        name: 'Carbon Night',
        cssBackground: 'linear-gradient(135deg, #090d16 0%, #111827 50%, #1e1b4b 100%)',
        startColor: '#090d16',
        midColor: '#111827',
        endColor: '#1e1b4b'
    },
    {
        id: 'sunset-glow',
        name: 'Sunset Glow',
        cssBackground: 'linear-gradient(135deg, #4c0519 0%, #881337 50%, #be185d 100%)',
        startColor: '#4c0519',
        midColor: '#881337',
        endColor: '#be185d'
    },
    {
        id: 'aurora-emerald',
        name: 'Aurora Emerald',
        cssBackground: 'linear-gradient(135deg, #022c22 0%, #064e3b 50%, #0d9488 100%)',
        startColor: '#022c22',
        midColor: '#064e3b',
        endColor: '#0d9488'
    },
    {
        id: 'cyber-neon',
        name: 'Cyber Neon',
        cssBackground: 'linear-gradient(135deg, #180026 0%, #4c1d95 50%, #ec4899 100%)',
        startColor: '#180026',
        midColor: '#4c1d95',
        endColor: '#ec4899'
    },
    {
        id: 'deep-ocean',
        name: 'Deep Ocean',
        cssBackground: 'linear-gradient(135deg, #082f49 0%, #0369a1 50%, #0284c7 100%)',
        startColor: '#082f49',
        midColor: '#0369a1',
        endColor: '#0284c7'
    },
    {
        id: 'minimal-slate',
        name: 'Monochrome Slate',
        cssBackground: 'linear-gradient(135deg, #18181b 0%, #27272a 100%)',
        startColor: '#18181b',
        endColor: '#27272a'
    }
]

// Offline syntax token types
interface SyntaxToken {
    text: string
    color: string
    italic?: boolean
}

function tokenizeLine(line: string, _language: string): SyntaxToken[] {
    const tokens: SyntaxToken[] = []
    let i = 0

    const keywords = new Set([
        'int', 'float', 'double', 'char', 'void', 'bool', 'auto', 'long', 'short', 'unsigned', 'signed',
        'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'break', 'continue', 'return',
        'class', 'struct', 'public', 'private', 'protected', 'virtual', 'override', 'const', 'constexpr',
        'static', 'template', 'typename', 'using', 'namespace', 'new', 'delete', 'nullptr', 'true', 'false',
        'this', 'sizeof', 'typedef', 'try', 'catch', 'throw', 'def', 'import', 'from', 'as', 'self',
        'None', 'True', 'False', 'elif', 'pass', 'lambda', 'with', 'yield', 'async', 'await', 'except',
        'finally', 'is', 'in', 'not', 'and', 'or', 'public', 'static', 'final', 'interface', 'extends', 'implements'
    ])

    const types = new Set([
        'string', 'vector', 'map', 'unordered_map', 'set', 'unordered_set', 'queue', 'stack', 'pair', 'tuple',
        'cout', 'cin', 'endl', 'cerr', 'std', 'String', 'System', 'Math', 'List', 'ArrayList', 'HashMap',
        'int32_t', 'int64_t', 'uint32_t', 'uint64_t', 'size_t'
    ])

    while (i < line.length) {
        // Comments
        if (line.slice(i, i + 2) === '//' || line.slice(i, i + 1) === '#') {
            if (line[i] === '#' && (line.slice(i).match(/^#\s*(include|define|ifndef|ifdef|endif|pragma)/))) {
                // Preprocessor directive
                const match = line.slice(i).match(/^#\s*(include|define|ifndef|ifdef|endif|pragma)/)![0]
                tokens.push({ text: match, color: '#c586c0' })
                i += match.length
                continue
            }
            tokens.push({ text: line.slice(i), color: '#6a9955', italic: true })
            break
        }

        // Strings
        if (line[i] === '"' || line[i] === "'") {
            const quote = line[i]
            let str = quote
            let j = i + 1
            while (j < line.length) {
                if (line[j] === '\\' && j + 1 < line.length) {
                    str += line[j] + line[j + 1]
                    j += 2
                    continue
                }
                str += line[j]
                if (line[j] === quote) {
                    j++
                    break
                }
                j++
            }
            tokens.push({ text: str, color: '#ce9178' })
            i = j
            continue
        }

        // Numbers
        if (/\d/.test(line[i]) && (i === 0 || !/[a-zA-Z_]/.test(line[i - 1]))) {
            let num = ''
            let j = i
            while (j < line.length && /[0-9a-fA-FxX.ULul]/.test(line[j])) {
                num += line[j]
                j++
            }
            tokens.push({ text: num, color: '#b5cea8' })
            i = j
            continue
        }

        // Identifiers & keywords
        if (/[a-zA-Z_]/.test(line[i])) {
            let id = ''
            let j = i
            while (j < line.length && /[a-zA-Z0-9_]/.test(line[j])) {
                id += line[j]
                j++
            }
            if (keywords.has(id)) {
                tokens.push({ text: id, color: '#569cd6' })
            } else if (types.has(id)) {
                tokens.push({ text: id, color: '#4ec9b0' })
            } else if (j < line.length && line[j] === '(') {
                // Function call
                tokens.push({ text: id, color: '#dcdcaa' })
            } else {
                tokens.push({ text: id, color: '#9cdcfe' })
            }
            i = j
            continue
        }

        // Symbols and spaces
        tokens.push({ text: line[i], color: '#d4d4d4' })
        i++
    }

    return tokens
}

export const CodeImageModal: React.FC<CodeImageModalProps> = ({
    isOpen,
    onClose,
    initialCode,
    fileName,
    language
}) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const [theme, setTheme] = useState<GradientTheme>(GRADIENT_THEMES[0])
    const [padding, setPadding] = useState<number>(32)
    const [showLineNumbers, setShowLineNumbers] = useState<boolean>(true)
    const [windowStyle, setWindowStyle] = useState<'mac' | 'win' | 'none'>('mac')
    const [showWatermark, setShowWatermark] = useState<boolean>(true)
    const [fontSize, setFontSize] = useState<number>(14)
    const [copied, setCopied] = useState<boolean>(false)

    // Render Canvas
    useEffect(() => {
        if (!isOpen) return
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const scale = 2 // 2x Retina resolution
        const lines = initialCode.split('\n')
        const lineHeight = fontSize * 1.55
        const titleBarHeight = windowStyle !== 'none' ? 44 : 20

        const fontMono = `${fontSize}px 'Consolas', 'Cascadia Code', 'Fira Code', 'Courier New', monospace`
        ctx.font = fontMono

        // Measure widest line
        let maxLineWidth = 0
        const gutterWidth = showLineNumbers ? String(lines.length).length * (fontSize * 0.65) + 36 : 16

        for (const line of lines) {
            const metrics = ctx.measureText(line)
            if (metrics.width > maxLineWidth) {
                maxLineWidth = metrics.width
            }
        }

        const editorWidth = Math.max(500, maxLineWidth + gutterWidth + 40)
        const editorHeight = titleBarHeight + (lines.length * lineHeight) + 28

        const canvasWidth = editorWidth + (padding * 2)
        const canvasHeight = editorHeight + (padding * 2)

        canvas.width = canvasWidth * scale
        canvas.height = canvasHeight * scale
        canvas.style.width = `${canvasWidth}px`
        canvas.style.height = `${canvasHeight}px`

        ctx.resetTransform()
        ctx.scale(scale, scale)

        // 1. Draw outer gradient background
        const grad = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight)
        grad.addColorStop(0, theme.startColor)
        if (theme.midColor) grad.addColorStop(0.5, theme.midColor)
        grad.addColorStop(1, theme.endColor)
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, canvasWidth, canvasHeight)

        // 2. Editor Card Shadow
        ctx.save()
        ctx.shadowColor = 'rgba(0, 0, 0, 0.55)'
        ctx.shadowBlur = 32
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 16

        const cardX = padding
        const cardY = padding
        const cardRadius = 12

        // Card background
        ctx.fillStyle = '#181a20'
        ctx.beginPath()
        ctx.roundRect(cardX, cardY, editorWidth, editorHeight, cardRadius)
        ctx.fill()
        ctx.restore()

        // Card subtle border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.roundRect(cardX, cardY, editorWidth, editorHeight, cardRadius)
        ctx.stroke()

        // 3. Title Bar
        if (windowStyle === 'mac') {
            // Traffic lights
            const dotY = cardY + 22
            const dotX = cardX + 20
            const dotRadius = 6

            ctx.fillStyle = '#ff5f56' // red
            ctx.beginPath()
            ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2)
            ctx.fill()

            ctx.fillStyle = '#ffbd2e' // yellow
            ctx.beginPath()
            ctx.arc(dotX + 18, dotY, dotRadius, 0, Math.PI * 2)
            ctx.fill()

            ctx.fillStyle = '#27c93f' // green
            ctx.beginPath()
            ctx.arc(dotX + 36, dotY, dotRadius, 0, Math.PI * 2)
            ctx.fill()
        } else if (windowStyle === 'win') {
            // Windows icons on the right
            const winY = cardY + 20
            const winRight = cardX + editorWidth - 24
            ctx.strokeStyle = '#9ca3af'
            ctx.lineWidth = 1.2

            // Minimize
            ctx.beginPath()
            ctx.moveTo(winRight - 40, winY)
            ctx.lineTo(winRight - 32, winY)
            ctx.stroke()

            // Maximize
            ctx.strokeRect(winRight - 26, winY - 4, 8, 8)

            // Close (X)
            ctx.beginPath()
            ctx.moveTo(winRight - 8, winY - 4)
            ctx.lineTo(winRight, winY + 4)
            ctx.moveTo(winRight, winY - 4)
            ctx.lineTo(winRight - 8, winY + 4)
            ctx.stroke()
        }

        // Center Title (Filename)
        if (windowStyle !== 'none') {
            ctx.fillStyle = '#94a3b8'
            ctx.font = `600 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
            ctx.textAlign = 'center'
            ctx.fillText(fileName || 'Untitled.cpp', cardX + (editorWidth / 2), cardY + 26)

            // Language pill badge
            ctx.font = `500 10px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
            ctx.fillStyle = '#38bdf8'
            ctx.textAlign = 'right'
            ctx.fillText(language.toUpperCase(), cardX + editorWidth - (windowStyle === 'win' ? 64 : 20), cardY + 26)
        }

        // 4. Code & Line Numbers
        ctx.textAlign = 'left'
        let textY = cardY + titleBarHeight + (fontSize * 0.9)

        lines.forEach((line, index) => {
            // Line number
            if (showLineNumbers) {
                ctx.font = `${fontSize}px 'Consolas', 'Courier New', monospace`
                ctx.fillStyle = '#4b5563'
                ctx.textAlign = 'right'
                ctx.fillText(String(index + 1), cardX + gutterWidth - 16, textY)
            }

            // Syntax tokens
            ctx.textAlign = 'left'
            let tokenX = cardX + gutterWidth
            const tokens = tokenizeLine(line, language)

            for (const token of tokens) {
                ctx.font = token.italic
                    ? `italic ${fontSize}px 'Consolas', 'Courier New', monospace`
                    : `${fontSize}px 'Consolas', 'Courier New', monospace`
                ctx.fillStyle = token.color
                ctx.fillText(token.text, tokenX, textY)
                tokenX += ctx.measureText(token.text).width
            }

            textY += lineHeight
        })

        // 5. Watermark
        if (showWatermark) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.45)'
            ctx.font = `600 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
            ctx.textAlign = 'right'
            ctx.fillText('⚡ CarbonCode', canvasWidth - padding - 8, canvasHeight - (padding / 2) + 2)
        }
    }, [isOpen, initialCode, fileName, language, theme, padding, showLineNumbers, windowStyle, showWatermark, fontSize])

    if (!isOpen) return null

    const handleCopy = async () => {
        const canvas = canvasRef.current
        if (!canvas) return
        try {
            canvas.toBlob(async (blob) => {
                if (blob && navigator.clipboard?.write) {
                    await navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': blob })
                    ])
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2200)
                    window.electronAPI?.trackEvent?.('code_image_exported', { language, action: 'clipboard', theme: theme.id })
                }
            }, 'image/png')
        } catch (err) {
            console.error('Failed to copy code card:', err)
        }
    }

    const handleDownload = () => {
        const canvas = canvasRef.current
        if (!canvas) return
        const url = canvas.toDataURL('image/png')
        const link = document.createElement('a')
        const cleanName = (fileName || 'snippet').replace(/\.[^/.]+$/, '')
        link.download = `${cleanName}-carboncode.png`
        link.href = url
        link.click()
        window.electronAPI?.trackEvent?.('code_image_exported', { language, action: 'png', theme: theme.id })
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-auto animate-fade-in">
            <div className="bg-carbon-surface border border-carbon-border rounded-xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-5 py-3.5 border-b border-carbon-border flex items-center justify-between bg-carbon-secondary/50">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-carbon-accent/20 border border-carbon-accent/40 flex items-center justify-center text-carbon-accent text-base">
                            📸
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-carbon-text-primary flex items-center gap-2">
                                <span>Export Code Snippet</span>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-carbon-accent/15 text-carbon-accent font-normal">
                                    High-DPI Retina
                                </span>
                            </h2>
                            <p className="text-xs text-carbon-text-muted">
                                Gorgeous, studio-grade code cards ready for WhatsApp, lab submissions, and Discord.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-carbon-text-muted hover:text-white hover:bg-carbon-elevated transition-colors"
                        title="Close (Esc)"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body: Canvas Preview + Controls */}
                <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
                    {/* Live Preview Area */}
                    <div className="flex-1 p-6 overflow-auto flex items-center justify-center bg-carbon-bg/60 min-h-[340px]">
                        <div className="shadow-2xl rounded-lg overflow-hidden border border-white/10 max-w-full">
                            <canvas ref={canvasRef} className="block max-w-full h-auto cursor-pointer" onClick={handleCopy} title="Click to Copy" />
                        </div>
                    </div>

                    {/* Controls Sidebar */}
                    <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-carbon-border bg-carbon-secondary/30 p-5 flex flex-col gap-4 overflow-y-auto shrink-0 text-xs">
                        {/* Theme / Gradient Presets */}
                        <div>
                            <label className="font-semibold text-carbon-text-secondary uppercase tracking-wider text-[11px] block mb-2">
                                Background Gradient
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                                {GRADIENT_THEMES.map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => setTheme(t)}
                                        className={`h-11 rounded-lg border flex flex-col items-center justify-end p-1 transition-all relative overflow-hidden ${
                                            theme.id === t.id
                                                ? 'border-carbon-accent ring-2 ring-carbon-accent/30 scale-102'
                                                : 'border-carbon-border hover:border-carbon-border-subtle opacity-80 hover:opacity-100'
                                        }`}
                                        style={{ background: t.cssBackground }}
                                        title={t.name}
                                    >
                                        <span className="text-[10px] font-medium text-white/90 drop-shadow-sm truncate max-w-full">
                                            {t.name}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Window Style */}
                        <div>
                            <label className="font-semibold text-carbon-text-secondary uppercase tracking-wider text-[11px] block mb-2">
                                Window Header
                            </label>
                            <div className="grid grid-cols-3 gap-1.5 p-1 bg-carbon-surface rounded-lg border border-carbon-border">
                                <button
                                    onClick={() => setWindowStyle('mac')}
                                    className={`py-1.5 rounded text-center font-medium transition-colors ${
                                        windowStyle === 'mac'
                                            ? 'bg-carbon-accent text-white shadow-sm'
                                            : 'text-carbon-text-secondary hover:text-white'
                                    }`}
                                >
                                    🔴 macOS
                                </button>
                                <button
                                    onClick={() => setWindowStyle('win')}
                                    className={`py-1.5 rounded text-center font-medium transition-colors ${
                                        windowStyle === 'win'
                                            ? 'bg-carbon-accent text-white shadow-sm'
                                            : 'text-carbon-text-secondary hover:text-white'
                                    }`}
                                >
                                    🗖 Windows
                                </button>
                                <button
                                    onClick={() => setWindowStyle('none')}
                                    className={`py-1.5 rounded text-center font-medium transition-colors ${
                                        windowStyle === 'none'
                                            ? 'bg-carbon-accent text-white shadow-sm'
                                            : 'text-carbon-text-secondary hover:text-white'
                                    }`}
                                >
                                    Clean
                                </button>
                            </div>
                        </div>

                        {/* Padding & Font Size */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <div className="flex justify-between text-carbon-text-secondary mb-1">
                                    <span className="font-medium">Padding</span>
                                    <span className="font-mono text-carbon-text-muted">{padding}px</span>
                                </div>
                                <input
                                    type="range"
                                    min="16"
                                    max="56"
                                    step="8"
                                    value={padding}
                                    onChange={(e) => setPadding(Number(e.target.value))}
                                    className="w-full accent-carbon-accent cursor-pointer"
                                />
                            </div>

                            <div>
                                <div className="flex justify-between text-carbon-text-secondary mb-1">
                                    <span className="font-medium">Font Size</span>
                                    <span className="font-mono text-carbon-text-muted">{fontSize}px</span>
                                </div>
                                <input
                                    type="range"
                                    min="11"
                                    max="18"
                                    step="1"
                                    value={fontSize}
                                    onChange={(e) => setFontSize(Number(e.target.value))}
                                    className="w-full accent-carbon-accent cursor-pointer"
                                />
                            </div>
                        </div>

                        {/* Toggles */}
                        <div className="space-y-2 pt-2 border-t border-carbon-border/60">
                            <label className="flex items-center justify-between cursor-pointer py-1 text-carbon-text-secondary hover:text-carbon-text-primary">
                                <span>Show Line Numbers</span>
                                <input
                                    type="checkbox"
                                    checked={showLineNumbers}
                                    onChange={(e) => setShowLineNumbers(e.target.checked)}
                                    className="accent-carbon-accent rounded cursor-pointer w-4 h-4"
                                />
                            </label>

                            <label className="flex items-center justify-between cursor-pointer py-1 text-carbon-text-secondary hover:text-carbon-text-primary">
                                <span>Watermark (⚡ CarbonCode)</span>
                                <input
                                    type="checkbox"
                                    checked={showWatermark}
                                    onChange={(e) => setShowWatermark(e.target.checked)}
                                    className="accent-carbon-accent rounded cursor-pointer w-4 h-4"
                                />
                            </label>
                        </div>

                        {/* Export Action Buttons */}
                        <div className="mt-auto pt-4 flex flex-col gap-2">
                            <button
                                onClick={handleCopy}
                                className={`w-full py-2.5 px-4 rounded-lg font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-md ${
                                    copied
                                        ? 'bg-green-600 text-white'
                                        : 'bg-carbon-accent hover:bg-carbon-accent-hover text-white'
                                }`}
                            >
                                {copied ? (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>Copied to Clipboard!</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                        </svg>
                                        <span>Copy Image to Clipboard</span>
                                    </>
                                )}
                            </button>

                            <button
                                onClick={handleDownload}
                                className="w-full py-2 px-4 rounded-lg font-medium text-xs bg-carbon-surface border border-carbon-border hover:bg-carbon-elevated text-carbon-text-primary hover:text-white flex items-center justify-center gap-2 transition-all"
                            >
                                <svg className="w-4 h-4 text-carbon-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                <span>Save PNG Image</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default CodeImageModal

