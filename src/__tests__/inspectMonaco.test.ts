import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

describe('Monaco Offline Assets', () => {
    it('should have local Monaco distribution in public/monaco/vs', () => {
        const destVs = path.resolve('public/monaco/vs')
        expect(fs.existsSync(destVs)).toBe(true)
        expect(fs.existsSync(path.join(destVs, 'loader.js'))).toBe(true)
        expect(fs.existsSync(path.join(destVs, 'editor/editor.main.js'))).toBe(true)
    })
})
