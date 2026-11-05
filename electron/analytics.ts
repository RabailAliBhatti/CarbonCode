// electron/analytics.ts
// Privacy-first, GDPR-compliant analytics powered by Aptabase

import https from 'https'
import { app, BrowserWindow } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { randomUUID } from 'crypto'

// Aptabase Configuration
const APTABASE_APP_KEY = 'A-EU-1782276116'
const APTABASE_HOST = 'eu.aptabase.com'
const APTABASE_PATH = '/api/v0/events'

// Constants for batching, offline persistence, and session lifecycle
const CURRENT_SCHEMA_VERSION = 2
const MAX_BATCH_SIZE = 25              // Aptabase max events per POST request
const BATCH_FLUSH_DELAY_MS = 2500      // 2.5s debounce window to group rapid events
const MAX_OFFLINE_QUEUE_SIZE = 200     // Enough for full offline lab sessions
const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000 // Rotate sessionId after 30m of inactivity
const HEARTBEAT_ACTIVE_WINDOW_MS = 15 * 60 * 1000 // Only ping if active in last 15m or focused

// File paths in userData
const getSettingsPath = () => path.join(app.getPath('userData'), 'analytics-settings.json')
const getOfflineQueuePath = () => path.join(app.getPath('userData'), 'analytics-queue.json')

export interface AnalyticsSettings {
    schemaVersion?: number
    clientId: string
    consent: boolean | null  // null = not asked yet, true = opted in, false = opted out
    firstRun?: boolean
    installDate?: string
    lastLaunchDate?: string
}

export interface AptabaseEventPayload {
    timestamp: string
    sessionId: string
    eventName: string
    systemProps: {
        locale: string
        osName: string
        osVersion: string
        deviceModel: string
        isDebug: boolean
        appVersion: string
        sdkVersion: string
    }
    props: Record<string, string | number>
}

// Generate session ID in Aptabase format (epoch seconds + 8 random digits)
function generateSessionId(): string {
    const epochInSeconds = Math.floor(Date.now() / 1000)
    const randomPart = Math.floor(Math.random() * 100000000).toString().padStart(8, '0')
    return `${epochInSeconds}${randomPart}`
}

let currentSessionId = generateSessionId()
let lastActivityTimestamp = Date.now()

// In-memory cache for settings to avoid synchronous fs.readFileSync on every event
let cachedSettings: AnalyticsSettings | null = null

// Outgoing batch buffer + offline persistence queue
const pendingBatchQueue: AptabaseEventPayload[] = []
let batchFlushTimer: NodeJS.Timeout | null = null
const offlineEventQueue: AptabaseEventPayload[] = []
let offlineQueueLoaded = false
let isFlushingOfflineQueue = false

// Ensure session ID rotates if the user was idle for more than 30 minutes
function getActiveSessionId(isUserActivity: boolean): string {
    const now = Date.now()
    if (now - lastActivityTimestamp > SESSION_IDLE_TIMEOUT_MS) {
        currentSessionId = generateSessionId()
        logAnalytics(`Session rotated after idle timeout -> ${currentSessionId}`)
    }
    if (isUserActivity) {
        lastActivityTimestamp = now
    }
    return currentSessionId
}

// Load any persisted offline events from previous sessions
function ensureOfflineQueueLoaded(): void {
    if (offlineQueueLoaded) return
    offlineQueueLoaded = true

    try {
        const queuePath = getOfflineQueuePath()
        if (fs.existsSync(queuePath)) {
            const raw = fs.readFileSync(queuePath, 'utf-8')
            const parsed = JSON.parse(raw)
            if (Array.isArray(parsed) && parsed.length > 0) {
                const validEvents = parsed.slice(0, MAX_OFFLINE_QUEUE_SIZE) as AptabaseEventPayload[]
                offlineEventQueue.push(...validEvents)
                logAnalytics(`Loaded ${validEvents.length} persisted offline events from disk`)
            }
        }
    } catch (e) {
        logAnalytics(`Failed to load offline queue from disk: ${e}`)
    }
}

// Persist offline queue to disk so events survive app restarts when offline
function saveOfflineQueueToDisk(): void {
    try {
        const queuePath = getOfflineQueuePath()
        if (offlineEventQueue.length === 0) {
            if (fs.existsSync(queuePath)) {
                fs.unlinkSync(queuePath)
            }
            return
        }
        const trimmed = offlineEventQueue.slice(-MAX_OFFLINE_QUEUE_SIZE)
        fs.writeFileSync(queuePath, JSON.stringify(trimmed), 'utf-8')
    } catch (e) {
        logAnalytics(`Failed to save offline queue to disk: ${e}`)
    }
}

// Push failed events into the offline queue and persist to disk
function enqueueOfflineEvents(events: AptabaseEventPayload[]): void {
    if (events.length === 0) return
    ensureOfflineQueueLoaded()
    offlineEventQueue.push(...events)
    if (offlineEventQueue.length > MAX_OFFLINE_QUEUE_SIZE) {
        offlineEventQueue.splice(0, offlineEventQueue.length - MAX_OFFLINE_QUEUE_SIZE)
    }
    saveOfflineQueueToDisk()
}

// Get or create analytics settings (cached in memory after first read)
function getAnalyticsSettings(): AnalyticsSettings {
    if (cachedSettings) {
        return cachedSettings
    }

    const settingsPath = getSettingsPath()

    try {
        if (fs.existsSync(settingsPath)) {
            const data = fs.readFileSync(settingsPath, 'utf-8')
            const parsed = JSON.parse(data)
            if (parsed && typeof parsed === 'object') {
                let needsSave = false

                // Ensure clientId and installDate always exist
                if (!parsed.clientId) {
                    parsed.clientId = randomUUID()
                    needsSave = true
                }
                if (!parsed.installDate) {
                    parsed.installDate = new Date().toISOString()
                    needsSave = true
                }

                // Schema v2 migration: upgrade legacy installs where consent was null or false
                if ((parsed.schemaVersion ?? 1) < CURRENT_SCHEMA_VERSION) {
                    parsed.schemaVersion = CURRENT_SCHEMA_VERSION
                    parsed.consent = true
                    needsSave = true
                }

                cachedSettings = parsed as AnalyticsSettings
                if (needsSave) {
                    saveAnalyticsSettings(cachedSettings)
                }
                return cachedSettings
            }
        }
    } catch {
        // Ignore errors, create new settings below
    }

    // Create new settings with unique anonymous client ID and first-run flag (opt-in by default)
    const newSettings: AnalyticsSettings = {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        clientId: randomUUID(),
        consent: true,
        firstRun: true,
        installDate: new Date().toISOString()
    }

    cachedSettings = newSettings
    saveAnalyticsSettings(newSettings)
    return newSettings
}

// Save analytics settings to disk and refresh in-memory cache
function saveAnalyticsSettings(settings: AnalyticsSettings): void {
    cachedSettings = settings
    const settingsPath = getSettingsPath()

    try {
        logAnalytics(`Saving settings to: ${settingsPath}, consent: ${settings.consent}`)
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2))
        logAnalytics(`Settings saved successfully`)
    } catch (e) {
        logAnalytics(`ERROR saving settings: ${e}`)
    }
}

// Check if user has consented to analytics (enabled by default unless explicitly disabled)
export function hasAnalyticsConsent(): boolean {
    return getAnalyticsSettings().consent !== false
}

// Check if user has been asked about analytics
export function hasBeenAskedAboutAnalytics(): boolean {
    return true
}

// Set analytics consent
export function setAnalyticsConsent(consent: boolean): void {
    logAnalytics(`setAnalyticsConsent called with: ${consent}`)
    const settings = getAnalyticsSettings()
    settings.consent = consent
    settings.schemaVersion = CURRENT_SCHEMA_VERSION
    saveAnalyticsSettings(settings)

    // When user consents, immediately trigger initial install & launch telemetry
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

// Log helper (development only)
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

// Core Aptabase event tracking function (with persistent clientId + debounced batching)
export function trackEvent(eventName: string, parameters?: Record<string, unknown>): void {
    const settings = getAnalyticsSettings()

    // Only send if user has opted in
    if (settings.consent === false) {
        logAnalytics(`Skipped ${eventName}: No consent`)
        return
    }

    ensureOfflineQueueLoaded()

    const isUserActivity = eventName !== 'session_ping'
    const sessionId = getActiveSessionId(isUserActivity)

    const enrichedProps = sanitizeProps({
        client_id: settings.clientId,
        install_date: settings.installDate ? settings.installDate.slice(0, 10) : undefined,
        ...parameters
    })

    const eventPayload: AptabaseEventPayload = {
        timestamp: new Date().toISOString(),
        sessionId,
        eventName,
        systemProps: {
            locale: app.getLocale?.() || 'en-US',
            osName: process.platform === 'win32' ? 'Windows' : process.platform === 'darwin' ? 'macOS' : 'Linux',
            osVersion: os.release(),
            deviceModel: os.arch(),
            isDebug: false, // Ensures events display in standard Aptabase dashboard views
            appVersion: app.getVersion(),
            sdkVersion: 'carboncode-aptabase@2.0.0'
        },
        props: enrichedProps
    }

    logAnalytics(`Queued event: ${eventName} (session=${sessionId}, client=${settings.clientId.slice(0, 8)})`)
    queueEventForBatch(eventPayload)
}

// Add event to outgoing batch buffer and flush either when full or after 2.5s debounce
function queueEventForBatch(event: AptabaseEventPayload): void {
    pendingBatchQueue.push(event)

    if (pendingBatchQueue.length >= MAX_BATCH_SIZE) {
        flushPendingBatch()
        return
    }

    if (!batchFlushTimer) {
        batchFlushTimer = setTimeout(() => {
            batchFlushTimer = null
            flushPendingBatch()
        }, BATCH_FLUSH_DELAY_MS)
        batchFlushTimer.unref()
    }
}

// Flush currently buffered outgoing events in batches of up to 25
export function flushPendingBatch(): void {
    if (batchFlushTimer) {
        clearTimeout(batchFlushTimer)
        batchFlushTimer = null
    }

    while (pendingBatchQueue.length > 0) {
        const batch = pendingBatchQueue.splice(0, MAX_BATCH_SIZE)
        sendAptabaseBatch(batch)
    }
}

// Send batch of events to Aptabase via HTTPS POST
function sendAptabaseBatch(events: AptabaseEventPayload[]): void {
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
        const status = res.statusCode || 0
        logAnalytics(`Aptabase response (${events.length} events): ${status} ${res.statusMessage}`)

        if (status >= 200 && status < 300) {
            // Success! Flush any persisted offline events next
            flushOfflineQueue()
        } else if (status === 429 || status >= 500) {
            // Rate-limited or transient server error: re-queue for retry
            logAnalytics(`Aptabase transient error (${status}), re-queueing ${events.length} events`)
            enqueueOfflineEvents(events)
        }
        res.resume() // consume response stream
    })

    req.on('error', (e) => {
        logAnalytics(`Aptabase network error: ${e.message}`)
        enqueueOfflineEvents(events)
    })

    req.on('timeout', () => {
        req.destroy(new Error('Request timed out'))
        logAnalytics('Aptabase request timeout')
    })

    req.write(postData)
    req.end()
}

// Flush any queued offline events in batches of up to 25
function flushOfflineQueue(): void {
    ensureOfflineQueueLoaded()
    if (isFlushingOfflineQueue || offlineEventQueue.length === 0) return
    isFlushingOfflineQueue = true

    const batch = offlineEventQueue.splice(0, MAX_BATCH_SIZE)
    saveOfflineQueueToDisk()

    if (batch.length > 0) {
        logAnalytics(`Flushing ${batch.length} offline queued events`)
        sendAptabaseBatch(batch)
    }
    isFlushingOfflineQueue = false
}

// Graceful shutdown hook: persist or flush any remaining events before app exits
export function flushAndSaveOnQuit(): void {
    if (batchFlushTimer) {
        clearTimeout(batchFlushTimer)
        batchFlushTimer = null
    }
    if (heartbeatTimer) {
        clearInterval(heartbeatTimer)
        heartbeatTimer = null
    }

    if (pendingBatchQueue.length > 0) {
        const remaining = pendingBatchQueue.splice(0, pendingBatchQueue.length)
        // Save to disk first in case process exits before HTTPS completes, then attempt immediate flush
        enqueueOfflineEvents(remaining)
        flushOfflineQueue()
    } else {
        saveOfflineQueueToDisk()
    }
}

// --- Public Tracking Functions ---

// Smart heartbeat: keeps live users & session duration accurate without inflating idle overnight sessions
let heartbeatTimer: NodeJS.Timeout | null = null

export function startHeartbeat(): void {
    if (heartbeatTimer) return
    // Check every 10 minutes
    heartbeatTimer = setInterval(() => {
        const timeSinceLastActivity = Date.now() - lastActivityTimestamp
        const isWindowFocused = BrowserWindow.getFocusedWindow() !== null

        // Only send heartbeat if the user is actively focused on CarbonCode or interacted within the last 15m
        if (isWindowFocused || timeSinceLastActivity <= HEARTBEAT_ACTIVE_WINDOW_MS) {
            if (isWindowFocused) {
                lastActivityTimestamp = Date.now()
            }
            trackEvent('session_ping', {
                version: app.getVersion(),
                uptime_seconds: Math.floor(process.uptime()),
                focused: isWindowFocused
            })
        } else {
            logAnalytics('Skipped session_ping: app unfocused and idle > 15m')
        }
    }, 10 * 60 * 1000)
    heartbeatTimer.unref()
}

export function trackAppLaunch(): void {
    const settings = getAnalyticsSettings()
    settings.lastLaunchDate = new Date().toISOString()

    if (settings.firstRun !== false) {
        trackEvent('app_installed', {
            os: process.platform,
            arch: process.arch,
            release: os.release(),
            version: app.getVersion()
        })
        settings.firstRun = false
    }

    saveAnalyticsSettings(settings)

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

export function trackProjectCreated(templateId: string, templateName?: string): void {
    trackEvent('project_created', { template_id: templateId, template_name: templateName || templateId })
}

export function trackCodeImageExported(language: string, action: string, theme: string): void {
    trackEvent('code_image_exported', { language, action, theme })
}

export function trackFeatureUsed(featureName: string, meta?: Record<string, unknown>): void {
    trackEvent(`feature_${featureName}`, meta)
}


