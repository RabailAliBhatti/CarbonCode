import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { EventEmitter } from 'events'

const mockUserDataDir = path.join(os.tmpdir(), `carboncode-analytics-test-${Date.now()}`)

let mockWindowFocused = true
const httpsRequests: Array<{
    body: unknown[]
    respond: (statusCode: number, statusMessage?: string) => void
    fail: (err: Error) => void
}> = []

vi.mock('electron', () => ({
    app: {
        getPath: vi.fn(() => mockUserDataDir),
        getLocale: vi.fn(() => 'en-US'),
        getVersion: vi.fn(() => '4.2.2'),
        isPackaged: true
    },
    BrowserWindow: {
        getFocusedWindow: vi.fn(() => (mockWindowFocused ? ({ id: 1 } as unknown) : null))
    }
}))

vi.mock('https', () => ({
    default: {
        request: vi.fn((_options: unknown, callback: (res: EventEmitter & { statusCode?: number; statusMessage?: string; resume: () => void }) => void) => {
            const reqEmitter = new EventEmitter() as EventEmitter & {
                write: (chunk: string) => void
                end: () => void
                destroy: (err?: Error) => void
            }
            let payloadStr = ''
            reqEmitter.write = (chunk: string) => {
                payloadStr += chunk
            }
            reqEmitter.end = () => {
                const parsed = payloadStr ? JSON.parse(payloadStr) : []
                httpsRequests.push({
                    body: parsed,
                    respond: (statusCode: number, statusMessage = 'OK') => {
                        const res = new EventEmitter() as EventEmitter & {
                            statusCode?: number
                            statusMessage?: string
                            resume: () => void
                        }
                        res.statusCode = statusCode
                        res.statusMessage = statusMessage
                        res.resume = vi.fn()
                        callback(res)
                    },
                    fail: (err: Error) => {
                        reqEmitter.emit('error', err)
                    }
                })
            }
            reqEmitter.destroy = (err?: Error) => {
                if (err) reqEmitter.emit('error', err)
            }
            return reqEmitter
        })
    }
}))

describe('Analytics Subsystem Improvements', () => {
    beforeEach(() => {
        vi.resetModules()
        httpsRequests.length = 0
        mockWindowFocused = true
        if (fs.existsSync(mockUserDataDir)) {
            fs.rmSync(mockUserDataDir, { recursive: true, force: true })
        }
        fs.mkdirSync(mockUserDataDir, { recursive: true })
    })

    afterEach(() => {
        if (fs.existsSync(mockUserDataDir)) {
            fs.rmSync(mockUserDataDir, { recursive: true, force: true })
        }
    })

    it('migrates legacy schemaVersion 1 (consent: false) to schemaVersion 2 (consent: true)', async () => {
        const settingsPath = path.join(mockUserDataDir, 'analytics-settings.json')
        fs.writeFileSync(
            settingsPath,
            JSON.stringify({
                clientId: 'legacy-client-1234',
                consent: false,
                firstRun: false,
                installDate: '2026-01-15T00:00:00.000Z'
            })
        )

        const analytics = await import('../../electron/analytics')
        expect(analytics.hasAnalyticsConsent()).toBe(true)

        const saved = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
        expect(saved.schemaVersion).toBe(2)
        expect(saved.consent).toBe(true)
        expect(saved.clientId).toBe('legacy-client-1234')
    })

    it('enriches events with persistent client_id and batches rapid calls into a single request', async () => {
        const analytics = await import('../../electron/analytics')

        analytics.trackFileCreated('cpp')
        analytics.trackCodeCompiled('cpp', 42)
        analytics.trackCodeRun('cpp', 42, 'integrated')

        // Before flush, no HTTPS request should have fired yet (debounced)
        expect(httpsRequests.length).toBe(0)

        analytics.flushPendingBatch()

        // All 3 events should be sent in a single batched HTTP POST
        expect(httpsRequests.length).toBe(1)
        const batch = httpsRequests[0].body as Array<{ eventName: string; props: Record<string, string | number> }>
        expect(batch.length).toBe(3)
        expect(batch.map((e) => e.eventName)).toEqual(['file_created', 'code_compiled', 'code_run'])

        // Every event must include the same persistent anonymous client_id
        const clientId = batch[0].props.client_id
        expect(typeof clientId).toBe('string')
        expect(String(clientId).length).toBeGreaterThan(10)
        expect(batch[1].props.client_id).toBe(clientId)
        expect(batch[2].props.client_id).toBe(clientId)
    })

    it('persists failed batches to disk on HTTP 503 or network error and flushes on next 200 OK', async () => {
        const analytics = await import('../../electron/analytics')
        const queuePath = path.join(mockUserDataDir, 'analytics-queue.json')

        analytics.trackFileOpened('c')
        analytics.flushPendingBatch()

        expect(httpsRequests.length).toBe(1)
        // Simulate 503 Server Error
        httpsRequests[0].respond(503, 'Service Unavailable')

        // Queue should now be persisted on disk
        expect(fs.existsSync(queuePath)).toBe(true)
        const queuedOnDisk = JSON.parse(fs.readFileSync(queuePath, 'utf-8'))
        expect(queuedOnDisk.length).toBe(1)
        expect(queuedOnDisk[0].eventName).toBe('file_opened')

        // Next event succeeds with 200 OK -> automatically triggers flush of offline queue
        analytics.trackDebugStarted('c')
        analytics.flushPendingBatch()
        expect(httpsRequests.length).toBe(2)
        httpsRequests[1].respond(200, 'OK')

        // Offline queue should immediately fire a follow-up request and clean up disk file
        expect(httpsRequests.length).toBe(3)
        httpsRequests[2].respond(200, 'OK')
        expect(fs.existsSync(queuePath)).toBe(false)
    })
})

