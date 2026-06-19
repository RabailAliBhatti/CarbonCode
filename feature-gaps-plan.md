# CarbonCode — Feature Gap Implementation Plan

## Status of All 9 Features (verified from codebase)

| # | Feature | Status | Action |
|---|---------|--------|--------|
| 1 | Better installer | PARTIAL — shows file list, no branded UI | **Sub-Plan A** |
| 2 | Syntax highlighting | YES — Monaco with custom themes, offline workers | Done |
| 3 | Error parsing / clickable errors | PARTIAL — plain text in Errors tab, no parse/jump | **Sub-Plan C** |
| 4 | Project management | PARTIAL — folder-as-workspace only | **Sub-Plans B, D, E** |
| 5 | Auto-save | YES — 2s debounce, persisted | Done |
| 6 | Multiple tabs | YES — full lifecycle, context menu, recovery | Done |
| 7 | Dark theme | YES — VS Code-style palette + light theme | Done |
| 8 | Find & Replace | YES — case/word/regex, navigation, replace | Done |
| 9 | Integrated output panel | YES — stdout/stderr/stdin, virtualized, throttled | Done |

## Three Real Gaps

---

## Sub-Plan A — Better Installer

**Files touched:** `installer.nsh`, `package.json`, `build/installerSidebar.bmp` (new), `build/installerHeader.bmp` (new)

**Changes:**
- `installer.nsh` — add `customWelcomePage` and `customFinishPage` macros with branded titles, sidebar bitmap, "Launch CarbonCode" button
- `package.json` — add `license: "LICENSE"`, `installerSidebar`, `installerHeader` to `build.nsis`
- Generate 164×314 and 55×55 24-bit BMPs from `public/icon.png`

---

## Sub-Plan B — Find in Files (Project-wide Search)

**Files touched:**
- `electron/main.ts` — new `ipcMain.handle('fs:find-in-files', ...)` for recursive file search
- `electron/preload.ts` — expose `findInFiles`
- `src/vite-env.d.ts` — declare types
- `src/components/SearchPanel.tsx` — **NEW** — search UI with results grouped by file
- `src/App.tsx` — `Ctrl+Shift+F` handler, render SearchPanel, shared `handleLocationClick` helper

---

## Sub-Plan C — Error Parsing & Clickable Errors

**Files touched:**
- `src/utils/parseCompileErrors.ts` — **NEW** — regex parser for GCC/Clang/MSVC/Javac error formats
- `src/components/OutputPanel.tsx` — replace `<pre>` with clickable error rows
- `src/App.tsx` — call parser in `handleRun`, apply Monaco markers, wire `onErrorClick`

---

## Sub-Plan D — Recent Folders

**Files touched:**
- `src/hooks/useRecentFolders.ts` — **NEW** — localStorage-persisted recent folders (cap 8)
- `src/components/FileExplorer.tsx` — add "Recent" section
- `src/App.tsx` — call `addRecent` on folder open, pass to FileExplorer
- `electron/main.ts` + `preload.ts` — add `folder:open-by-path` IPC

---

## Sub-Plan E — `.carboncode` Project File

**Files touched:**
- `src/hooks/useProject.ts` — **NEW** — reads `<rootPath>/.carboncode`, exposes config
- `src/components/ProjectInitDialog.tsx` — **NEW** — modal to initialize project
- `src/App.tsx` — wire config reading + init prompt on folder open
- `src/hooks/useFileManager.ts` — read/write `.carboncode`

---

## Implementation Order (dependency-based)

| Step | Sub-Plan | Description |
|------|----------|-------------|
| 1 | **B** | Find in Files — sets up `handleLocationClick` that C reuses |
| 2 | **C** | Error Parsing — reuses B's navigation helper |
| 3 | **D** | Recent Folders — smallest, standalone |
| 4 | **E** | `.carboncode` — builds on recent folders flow |
| 5 | **A** | Better Installer — pure polish, no code dependencies |
