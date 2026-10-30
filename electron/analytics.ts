// electron/analytics.ts
// Privacy-first, GDPR-compliant analytics powered by Aptabase

import https from 'https'
import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { randomUUID } from 'crypto'

// Aptabase Configuration
const APTABASE_APP_KEY = 'A-EU-1782276116'
const APTABASE_HOST = 'eu.aptabase.com'
const APTABASE_PATH = '/api/v0/events'

// Settings file path
const getSettingsPath = () => path.join(app.getPath('userData'), 'analytics-settings.json')

interface AnalyticsSettings {
    clientId: string
    consent: boolean | null  // null = not asked yet, true = opted in, false = opted out
    firstRun?: boolean
    installDate?: string
    lastLaunchDate?: string
}

// Generate persistent session ID for the lifecycle of this application instance
function generateSessionId(): string {
    const epochInSeconds = Math.floor(Date.now() / 1000)
    const randomPart = Math.floor(Math.random() * 100000000).toString().padStart(8, '0')
    return `${epochInSeconds}${randomPart}`
}

const currentSessionId = generateSessionId()

// In-memory queue for offline events
const offlineEventQueue: Array<Record<string, unknown>> = []
let isFlushingQueue = false

// Get or create analytics settings
function getAnalyticsSettings(): AnalyticsSettings {
    const settingsPath = getSettingsPath()

    try {
        if (fs.existsSync(settingsPath)) {
            const data = fs.readFileSync(settingsPath, 'utf-8')
            const parsed = JSON.parse(data)
            if (parsed && typeof parsed === 'object') {
                return parsed
            }
        }
    } catch {
        // Ignore errors, create new settings
    }

    // Create new settings with unique anonymous client ID and first-run flag
    const newSettings: AnalyticsSettings = {
        clientId: randomUUID(),
        consent: null,
        firstRun: true,
        installDate: new Date().toISOString()
    }

    saveAnalyticsSettings(newSettings)
    return newSettings
}

// Save analytics settings
function saveAnalyticsSettings(settings: AnalyticsSettings): void {
    const settingsPath = getSettingsPath()

    try {
        logAnalytics(`Saving settings to: ${settingsPath}, consent: ${settings.consent}`)
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2))
        logAnalytics(`Settings saved successfully`)
    } catch (e) {
        logAnalytics(`ERROR saving settings: ${e}`)
    }
}

// Check if user has consented to analytics
export function hasAnalyticsConsent(): boolean {
    return getAnalyticsSettings().consent === true
}

// Check if user has been asked about analytics
export function hasBeenAskedAboutAnalytics(): boolean {
    return getAnalyticsSettings().consent !== null
}

// Set analytics consent
export function setAnalyticsConsent(consent: boolean): void {
    logAnalytics(`setAnalyticsConsent called with: ${consent}`)
    const settings = getAnalyticsSettings()
    logAnalytics(`Current settings before update: consent=${settings.consent}, clientId=${settings.clientId}`)
    settings.consent = consent
    saveAnalyticsSettings(settings)
    logAnalytics(`setAnalyticsConsent completed`)

    // When user consents, immediately trigger initial install & launch telemetry!
    if (consent === true) {
        if (settings.firstRun !== false) {
            trackEvent('app_installed', {
                os: process.platform,
                arch: process.arch,
                release: os.release()
            })
            settings.firstRun = false
            saveAnalyticsSettings(settings)
        }
        trackAppLaunch()
    }
}

// Log helper
function logAnalytics(message: string): void {
    if (app.isPackaged) return // no debug logging in production builds

    try {
        const logPath = path.join(app.getPath('userData'), 'analytics_debug.txt')

        // Rotate: if file exceeds 500KB, keep only the last 500 lines
        if (fs.existsSync(logPath)) {
            const stats = fs.statSync(logPath)
            if (stats.size > 500 * 1024) {
                const lines = fs.readFileSync(logPath, 'utf8').split('\n')
                fs.writeFileSync(logPath, lines.slice(-500).join('\n'))
            }
        }

        fs.appendFileSync(logPath, `${new Date().toISOString()} ${message}\n`)
    } catch {
        // ignore log failures silently
    }
}

// Sanitize props for Aptabase: keys must be alphanumeric/underscore, values string or number
function sanitizeProps(params?: Record<string, unknown>): Record<string, string | number> {
    if (!params) return {}
    const sanitized: Record<string, string | number> = {}

    for (const [key, val] of Object.entries(params)) {
        if (val === undefined || val === null) continue
        const cleanKey = key.replace(/[^a-zA-Z0-9_]/g, '_')

        if (typeof val === 'number') {
            sanitized[cleanKey] = Number.isFinite(val) ? val : String(val)
        } else if (typeof val === 'boolean') {
            sanitized[cleanKey] = val ? 'true' : 'false'
        } else {
            sanitized[cleanKey] = String(val).substring(0, 255)
        }
    }

    return sanitized
}

// Core Aptabase event tracking function
export function trackEvent(eventName: string, parameters?: Record<string, unknown>): void {
    const settings = getAnalyticsSettings()

    // Log intent
    logAnalytics(`Attempting to track: ${eventName}. Consent: ${settings.consent}`)

    // Only send if user has opted in
    if (!hasAnalyticsConsent()) {
        logAnalytics(`Skipped ${eventName}: No consent`)
        return
    }

    const eventPayload = {
        timestamp: new Date().toISOString(),
        sessionId: currentSessionId,
        eventName,
        systemProps: {
            locale: app.getLocale?.() || 'en-US',
            osName: process.platform === 'win32' ? 'Windows' : process.platform === 'darwin' ? 'macOS' : 'Linux',
            osVersion: os.release(),
            deviceModel: os.arch(),
            isDebug: !app.isPackaged,
            appVersion: app.getVersion(),
            sdkVersion: 'carboncode-aptabase@1.0.0'
        },
        props: sanitizeProps(parameters)
    }

    sendAptabaseBatch([eventPayload])
}

// Send batch of events to Aptabase via HTTPS POST
function sendAptabaseBatch(events: Array<Record<string, unknown>>): void {
    if (events.length === 0) return

    const postData = JSON.stringify(events)

    const options: https.RequestOptions = {
        hostname: APTABASE_HOST,
        port: 443,
        path: APTABASE_PATH,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'App-Key': APTABASE_APP_KEY,
            'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 10000
    }

    const req = https.request(options, (res) => {
        logAnalytics(`Aptabase response: ${res.statusCode} ${res.statusMessage}`)

        // If successful and we have queued offline events, flush them
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            flushOfflineQueue()
        }
        res.resume() // consume response stream
    })

    req.on('error', (e) => {
        logAnalytics(`Aptabase network error: ${e.message}`)
        // Queue events if offline or network failure (capped to 50 events)
        if (offlineEventQueue.length < 50) {
            offlineEventQueue.push(...events)
        }
    })

    req.on('timeout', () => {
        req.destroy()
        logAnalytics('Aptabase request timeout')
    })

    req.write(postData)
    req.end()
}

// Flush any queued offline events
function flushOfflineQueue(): void {
    if (isFlushingQueue || offlineEventQueue.length === 0) return
    isFlushingQueue = true

    const batch = offlineEventQueue.splice(0, 20)
    if (batch.length > 0) {
        sendAptabaseBatch(batch)
    }
    isFlushingQueue = false
}

// --- Public Tracking Functions ---

export function trackAppLaunch(): void {
    trackEvent('app_launch', {
        version: app.getVersion(),
        platform: process.platform
    })
}

export function trackGeneric(eventName: string, params?: Record<string, unknown>): void {
    trackEvent(eventName, params)
}

export function trackFileCreated(language: string): void {
    trackEvent('file_created', { language })
}

export function trackFileOpened(language: string): void {
    trackEvent('file_opened', { language })
}

export function trackCodeCompiled(language: string, lineCount: number): void {
    trackEvent('code_compiled', { language, line_count: lineCount })
}

export function trackCodeRun(language: string, lineCount: number, consoleMode?: string): void {
    trackEvent('code_run', { language, line_count: lineCount, console_mode: consoleMode || 'integrated' })
}

export function trackCodeRunError(language: string, lineCount: number, errorMessage: string): void {
    trackEvent('code_run_error', { language, line_count: lineCount, error_short: errorMessage.substring(0, 100) })
}

export function trackDebugStarted(language: string): void {
    trackEvent('debug_started', { language })
}

