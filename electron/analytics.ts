// electron/analytics.ts
// Analytics Service - Transparent opt-in usage tracking with GA4 Measurement Protocol

import https from 'https'
import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { randomUUID } from 'crypto'

// GA4 Configuration
const MEASUREMENT_ID = 'G-B7G7W5YQ7M'
const API_SECRET = process.env.VITE_GA4_API_SECRET || ''

// Settings file path
const getSettingsPath = () => path.join(app.getPath('userData'), 'analytics-settings.json')

interface AnalyticsSettings {
    clientId: string
    consent: boolean | null  // null = not asked yet, true = opted in, false = opted out
}

// Get or create analytics settings
function getAnalyticsSettings(): AnalyticsSettings {
    const settingsPath = getSettingsPath()

    try {
        if (fs.existsSync(settingsPath)) {
            const data = fs.readFileSync(settingsPath, 'utf-8')
            return JSON.parse(data)
        }
    } catch {
        // Ignore errors, create new settings
    }

    // Create new settings with unique client ID
    const newSettings: AnalyticsSettings = {
        clientId: randomUUID(),
        consent: null
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
    } catch (e) {
        // ignore log failures silently
    }
}

// Core event tracking function
function trackEvent(eventName: string, parameters?: Record<string, unknown>): void {
    const settings = getAnalyticsSettings()

    // Log intent
    logAnalytics(`Attempting to track: ${eventName}. Consent: ${settings.consent}`)

    // Only send if user has opted in
    if (!hasAnalyticsConsent()) {
        logAnalytics(`Skipped ${eventName}: No consent`)
        return
    }

    const payload = {
        client_id: settings.clientId,
        events: [
            {
                name: eventName,
                params: {
                    ...parameters,
                    app_version: app.getVersion(),
                    platform: process.platform,
                    session_id: Date.now().toString(), // Add session_id for better reporting
                    engagement_time_msec: 100 // Required for "user engagement" metrics
                }
            }
        ]
    }

    const postData = JSON.stringify(payload)

    const options = {
        hostname: 'www.google-analytics.com',
        port: 443,
        path: `/mp/collect?measurement_id=${MEASUREMENT_ID}&api_secret=${API_SECRET}`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    }

    const req = https.request(options, (res) => {
        logAnalytics(`Sent ${eventName}: Status ${res.statusCode}`)
        // Silently handle response
    })

    req.on('error', (e) => {
        logAnalytics(`Error sending ${eventName}: ${e.message}`)
        // Silently handle errors (e.g., offline)
    })

    req.write(postData)
    req.end()
}

// --- Public Tracking Functions ---

export function trackAppLaunch(): void {
    trackEvent('app_launch')
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

export function trackCodeRun(language: string, lineCount: number): void {
    trackEvent('code_run', { language, line_count: lineCount })
}

export function trackCodeRunError(language: string, lineCount: number, errorMessage: string): void {
    trackEvent('code_run_error', { language, line_count: lineCount, error_short: errorMessage.substring(0, 100) })
}

export function trackDebugStarted(language: string): void {
    trackEvent('debug_started', { language })
}
