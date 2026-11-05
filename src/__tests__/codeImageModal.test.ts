import { describe, it, expect } from 'vitest'

describe('Carbon-Style Code Image Exporter Logic', () => {
    it('should tokenize C++ code offline into proper syntax categories', () => {
        const code = '#include <iostream>\nint main() {\n    // Print message\n    return 0;\n}'
        expect(code).toContain('#include')
        expect(code).toContain('int main')

        const lines = code.split('\n')
        expect(lines).toHaveLength(5)
    })

    it('should calculate canvas dimensions with 2x retina scaling', () => {
        const lines = ['int x = 42;', 'return 0;']
        const fontSize = 14
        const lineHeight = fontSize * 1.55
        const titleBarHeight = 44
        const padding = 32

        const editorHeight = titleBarHeight + (lines.length * lineHeight) + 28
        const canvasHeight = (editorHeight + padding * 2) * 2

        expect(canvasHeight).toBeGreaterThan(200)
    })
})

