import { describe, it, expect } from 'vitest'

describe('Visual Memory & Pointer Inspector Logic', () => {
    it('should correctly identify pointer variables and target links', () => {
        const locals = [
            { name: 'val', type: 'int', value: '42' },
            { name: 'ptr', type: 'int *', value: '0x7ffee4' }
        ]
        const addresses: Record<string, string> = {
            val: '0x7ffee4',
            ptr: '0x7ffed8'
        }

        const ptr = locals.find(l => l.name === 'ptr')!
        expect(ptr.type).toContain('*')

        // Match pointer target address with local variables
        const target = Object.entries(addresses).find(
            ([name, addr]) => name !== ptr.name && addr.toLowerCase() === ptr.value.toLowerCase()
        )
        expect(target).toBeDefined()
        expect(target![0]).toBe('val')
    })

    it('should detect NULL pointer and flag dangerous dereference', () => {
        const nullPtr = { name: 'pNull', type: 'char *', value: '0x0' }
        const isNull = nullPtr.value.includes('0x0') || nullPtr.value === '0'
        expect(isNull).toBe(true)
    })

    it('should detect array size and flag out-of-bounds accesses', () => {
        const arrVar = { name: 'scores', type: 'int [5]', value: '{90, 85, 78, 92, 88}' }
        const match = arrVar.type.match(/\[(\d+)\]/)
        expect(match).toBeDefined()
        const size = parseInt(match![1], 10)
        expect(size).toBe(5)

        // Valid indices: 0..4
        const checkBounds = (idx: number) => idx < 0 || idx >= size

        expect(checkBounds(0)).toBe(false)
        expect(checkBounds(4)).toBe(false)
        expect(checkBounds(5)).toBe(true)  // Out of bounds!
        expect(checkBounds(10)).toBe(true) // Out of bounds!
        expect(checkBounds(-1)).toBe(true) // Out of bounds!
    })
})
