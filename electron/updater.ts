// electron/updater.ts
// Native, zero-dependency background auto-updater for CarbonCode via GitHub Releases

import https from 'https'
import http from 'http'
import * as fs from 'fs'
import * as path from 'path'
import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { spawn } from 'child_process'

const GITHUB_OWNER = 'RabailAliBhatti'
const GITHUB_REPO = 'CarbonCode'

export interface UpdateInfo {
    status: 'checking' | 'update-available' | 'up-to-date' | 'downloading' | 'update-downloaded' | 'error'
    currentVersion: string
    newVersion?: string
    releaseNotes?: string
    downloadUrl?: string
    downloadPercent?: number
    errorMessage?: string
}

let currentStatus: UpdateInfo = {
    status: 'up-to-date',
    currentVersion: app.getVersion()
}

let downloadedInstallerPath: string | null = null
let isDownloading = false
let mainWindowRef: BrowserWindow | null = null

export function initUpdater(window: BrowserWindow): void {
    mainWindowRef = window

    // Register IPC handlers
    ipcMain.handle('updater:check', async (_, manual?: boolean) => {
        return checkForUpdates(manual ?? false)
    })

    ipcMain.handle('updater:download', async (_, customUrl?: string) => {
        return downloadUpdate(customUrl)
    })

    ipcMain.handle('updater:install', async () => {
        return installUpdate()
    })

    ipcMain.handle('updater:get-status', () => {
        return currentStatus
    })

    // Automatic silent check 10 seconds after launch
    setTimeout(() => {
        checkForUpdates(false).catch(() => {})
    }, 10000)

    // Check periodically every 4 hours
    setInterval(() => {
        checkForUpdates(false).catch(() => {})
    }, 4 * 60 * 60 * 1000)
}

function broadcastStatus(info: Partial<UpdateInfo>): void {
    currentStatus = {
        ...currentStatus,
        ...info,
        currentVersion: app.getVersion()
    }
    if (mainWindowRef && !mainWindowRef.isDestroyed()) {
        mainWindowRef.webContents.send('updater:status-changed', currentStatus)
    }
}

// Compare semantic versions (e.g., "4.2.0" vs "4.1.0")
function isNewerVersion(latest: string, current: string): boolean {
    const cleanLatest = latest.replace(/^v/i, '').trim()
    const cleanCurrent = current.replace(/^v/i, '').trim()

    const parse = (v: string) => v.split('.').map(n => parseInt(n, 10) || 0)
    const lParts = parse(cleanLatest)
    const cParts = parse(cleanCurrent)

    for (let i = 0; i < Math.max(lParts.length, cParts.length); i++) {
        const l = lParts[i] || 0
        const c = cParts[i] || 0
        if (l > c) return true
        if (l < c) return false
    }
    return false
}

// Fetch latest release from GitHub API
export async function checkForUpdates(manual: boolean = false): Promise<UpdateInfo> {
    broadcastStatus({ status: 'checking', errorMessage: undefined })

    return new Promise((resolve) => {
        const options: https.RequestOptions = {
            hostname: 'api.github.com',
            path: `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
            headers: {
                'User-Agent': 'CarbonCode-Desktop-App',
                'Accept': 'application/vnd.github.v3+json'
            },
            timeout: 15000
        }

        const req = https.get(options, (res) => {
            if (res.statusCode === 404) {
                const info: UpdateInfo = {
                    status: 'up-to-date',
                    currentVersion: app.getVersion()
                }
                broadcastStatus(info)
                resolve(info)
                return
            }

            if (res.statusCode !== 200) {
                const info: UpdateInfo = {
                    status: 'error',
                    currentVersion: app.getVersion(),
                    errorMessage: `GitHub returned status ${res.statusCode}`
                }
                broadcastStatus(info)
                resolve(info)
                return
            }

            let rawData = ''
            res.on('data', chunk => { rawData += chunk })
            res.on('end', () => {
                try {
                    const release = JSON.parse(rawData)
                    const tagName = release.tag_name || ''
                    const isNewer = isNewerVersion(tagName, app.getVersion())

                    if (isNewer) {
                        // Find Windows executable installer asset matching installation type
                        const assets: Array<{ name: string; browser_download_url: string; size: number }> = release.assets || []
                        const isBundledMinGW = fs.existsSync(path.join(process.resourcesPath, 'mingw64'))
                        
                        let installerAsset = assets.find(a => {
                            const n = a.name.toLowerCase()
                            return n.endsWith('.exe') && (isBundledMinGW ? n.includes('full') : (n.includes('lite') || n.includes('setup')))
                        })
                        if (!installerAsset) {
                            installerAsset = assets.find(a => a.name.toLowerCase().endsWith('.exe'))
                        }

                        if (!installerAsset) {
                            const info: UpdateInfo = {
                                status: 'up-to-date',
                                currentVersion: app.getVersion()
                            }
                            broadcastStatus(info)
                            resolve(info)
                            return
                        }

                        const info: UpdateInfo = {
                            status: 'update-available',
                            currentVersion: app.getVersion(),
                            newVersion: tagName,
                            releaseNotes: release.body || '',
                            downloadUrl: installerAsset.browser_download_url
                        }
                        broadcastStatus(info)
                        resolve(info)
                    } else {
                        const info: UpdateInfo = {
                            status: 'up-to-date',
                            currentVersion: app.getVersion(),
                            newVersion: tagName
                        }
                        broadcastStatus(info)
                        resolve(info)
                    }
                } catch (e: any) {
                    const info: UpdateInfo = {
                        status: 'error',
                        currentVersion: app.getVersion(),
                        errorMessage: `Failed to parse release data: ${e.message}`
                    }
                    broadcastStatus(info)
                    resolve(info)
                }
            })
        })

        req.on('error', (err) => {
            const info: UpdateInfo = {
                status: manual ? 'error' : 'up-to-date',
                currentVersion: app.getVersion(),
                errorMessage: err.message
            }
            broadcastStatus(info)
            resolve(info)
        })

        req.on('timeout', () => {
            req.destroy()
            const info: UpdateInfo = {
                status: manual ? 'error' : 'up-to-date',
                currentVersion: app.getVersion(),
                errorMessage: 'Connection timed out while checking for updates'
            }
            broadcastStatus(info)
            resolve(info)
        })
    })
}

// Download file following redirects
function downloadWithRedirects(urlStr: string, destPath: string, onProgress: (percent: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
        let maxRedirects = 5

        function get(url: string) {
            const client = url.startsWith('https:') ? https : http
            const req = client.get(url, { headers: { 'User-Agent': 'CarbonCode-Desktop-App' } }, (res) => {
                // Handle HTTP redirects (GitHub Releases redirect to AWS S3 / objects.githubusercontent.com)
                if (res.statusCode && [301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
                    if (--maxRedirects <= 0) {
                        return reject(new Error('Too many redirects'))
                    }
                    return get(res.headers.location)
                }

                if (res.statusCode !== 200) {
                    return reject(new Error(`Download failed with HTTP ${res.statusCode}`))
                }

                const totalBytes = parseInt(res.headers['content-length'] || '0', 10)
                let receivedBytes = 0

                const fileStream = fs.createWriteStream(destPath)
                res.on('data', (chunk) => {
                    receivedBytes += chunk.length
                    if (totalBytes > 0) {
                        const percent = Math.min(100, Math.round((receivedBytes / totalBytes) * 100))
                        onProgress(percent)
                    }
                })

                res.pipe(fileStream)

                fileStream.on('finish', () => {
                    fileStream.close()
                    resolve()
                })

                fileStream.on('error', (err) => {
                    fs.unlink(destPath, () => {})
                    reject(err)
                })
            })

            req.on('error', (err) => {
                fs.unlink(destPath, () => {})
                reject(err)
            })
        }

        get(urlStr)
    })
}

// Download update installer to temp directory
export async function downloadUpdate(url?: string): Promise<boolean> {
    const downloadUrl = url || currentStatus.downloadUrl
    if (!downloadUrl) {
        broadcastStatus({ status: 'error', errorMessage: 'No download URL available' })
        return false
    }

    if (isDownloading) return true
    isDownloading = true

    broadcastStatus({ status: 'downloading', downloadPercent: 0 })

    const tempDir = app.getPath('temp')
    const fileName = `CarbonCode-Update-${currentStatus.newVersion || 'latest'}.exe`
    const targetPath = path.join(tempDir, fileName)

    try {
        await downloadWithRedirects(downloadUrl, targetPath, (percent) => {
            broadcastStatus({ status: 'downloading', downloadPercent: percent })
        })

        downloadedInstallerPath = targetPath
        isDownloading = false
        broadcastStatus({ status: 'update-downloaded', downloadPercent: 100 })
        return true
    } catch (err: any) {
        isDownloading = false
        broadcastStatus({ status: 'error', errorMessage: `Download error: ${err.message}` })
        return false
    }
}

// Run downloaded installer and exit
export async function installUpdate(): Promise<boolean> {
    if (!downloadedInstallerPath || !fs.existsSync(downloadedInstallerPath)) {
        broadcastStatus({ status: 'error', errorMessage: 'Installer not found on disk' })
        return false
    }

    try {
        let launched = false

        if (process.platform === 'win32') {
            // Windows NSIS installers configured with perMachine: true require administrator privileges.
            // Direct child_process.spawn fails with ERROR_ELEVATION_REQUIRED (740), mapped by libuv to EACCES.
            // Launch via PowerShell Start-Process with -Verb RunAs to trigger Windows UAC elevation cleanly.
            launched = await new Promise<boolean>((resolve) => {
                const escapedPath = downloadedInstallerPath!.replace(/'/g, "''")
                const ps = spawn('powershell.exe', [
                    '-NoProfile',
                    '-WindowStyle', 'Hidden',
                    '-Command',
                    `Start-Process -FilePath '${escapedPath}' -Verb RunAs`
                ], {
                    detached: true,
                    stdio: 'ignore'
                })

                let settled = false

                ps.on('error', (err) => {
                    console.warn('[Updater] PowerShell launch failed, trying cmd start fallback:', err)
                    if (!settled) {
                        settled = true
                        resolve(false)
                    }
                })

                ps.unref()

                // Give process a moment to ensure it didn't fail synchronously on spawn
                setTimeout(() => {
                    if (!settled) {
                        settled = true
                        resolve(true)
                    }
                }, 400)
            })

            // Fallback: cmd.exe start (which delegates to Windows ShellExecuteEx)
            if (!launched) {
                launched = await new Promise<boolean>((resolve) => {
                    const cmd = spawn('cmd.exe', ['/c', 'start', '""', downloadedInstallerPath!], {
                        detached: true,
                        stdio: 'ignore',
                        windowsHide: true
                    })

                    let settled = false

                    cmd.on('error', (err) => {
                        console.error('[Updater] cmd.exe fallback launch failed:', err)
                        if (!settled) {
                            settled = true
                            resolve(false)
                        }
                    })

                    cmd.unref()

                    setTimeout(() => {
                        if (!settled) {
                            settled = true
                            resolve(true)
                        }
                    }, 400)
                })
            }

            // Fallback 3: Electron shell.openPath
            if (!launched) {
                const openErr = await shell.openPath(downloadedInstallerPath)
                launched = !openErr
            }
        } else {
            // macOS / Linux: use Electron shell.openPath
            const openErr = await shell.openPath(downloadedInstallerPath)
            launched = !openErr
        }

        if (!launched) {
            broadcastStatus({ status: 'error', errorMessage: 'Could not launch the installer. Please run it manually from Temp.' })
            return false
        }

        // Cleanly exit application to release executable file locks so the installer can overwrite files
        setTimeout(() => {
            app.quit()
            setTimeout(() => {
                app.exit(0)
            }, 1200)
        }, 500)

        return true
    } catch (e: any) {
        console.error('[Updater] installUpdate exception:', e)
        broadcastStatus({ status: 'error', errorMessage: `Failed to launch installer: ${e.message}` })
        return false
    }
}
