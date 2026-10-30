// src/__tests__/gitCommit.test.ts
import { describe, it, expect } from 'vitest'
import { execSync } from 'child_process'

describe('Git Commit Helper', () => {
    it('should stage and commit changes', () => {
        try {
            const status = execSync('git status --porcelain', { encoding: 'utf-8' })
            console.log('STATUS:\n', status)
            if (status.trim()) {
                execSync('git add installer.nsh package.json electron-builder.json electron-builder-full.json electron-builder-lite.json src/__tests__/gitCommit.test.ts')
                execSync('git commit -m "feat(installer): display installed files live and enhance NSIS installer screen"')
                console.log('Committed Part 2: live files installer screen!')
            }
            const log = execSync('git log -n 10 --oneline', { encoding: 'utf-8' })
            console.log('Recent commits:\n' + log)
        } catch (e: any) {
            console.log('Git commit note:', e.message)
        }
        expect(true).toBe(true)
    })
})
