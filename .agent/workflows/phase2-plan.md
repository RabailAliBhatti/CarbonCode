---
description: Phase 2 Implementation Plan for CarbonCode
---

# CarbonCode Phase 2 - Implementation Plan

## Overview
This document outlines the Phase 2 features and their implementation order.

## Features to Implement

### Priority 1: Multiple File Tabs
- [ ] Create TabBar component
- [ ] Track open files in state
- [ ] Switch between tabs
- [ ] Close tabs with unsaved warning
- [ ] Show dot indicator for unsaved files

### Priority 2: File Explorer (Side Panel)
- [ ] Create FileExplorer component
- [ ] Folder tree view
- [ ] Open files on click
- [ ] Resizable panel
- [ ] Toggle visibility (Ctrl+B)

### Priority 3: Find & Replace
- [ ] Create FindReplace component
- [ ] Search current file (Ctrl+F)
- [ ] Replace functionality (Ctrl+H)
- [ ] Case sensitive option
- [ ] Regex support

### Priority 4: Settings Panel  
- [ ] Create Settings modal
- [ ] Font size adjustment
- [ ] Font family selection
- [ ] Tab size setting
- [ ] Auto-save toggle
- [ ] Theme selection (future)

### Priority 5: Recent Files
- [ ] Store recent files in localStorage
- [ ] Show in welcome screen
- [ ] Quick access from File menu

### Priority 6: Input Support for Programs
- [ ] Add input field below output
- [ ] Pass stdin to running programs
- [ ] Handle interactive I/O

## Build & Distribution

### Standard Installer (Without MinGW)
- Build with electron-builder
- Output: `CarbonCode-Setup.exe`
- Size: ~80-100MB

### Bundled Installer (With MinGW)
- Include portable MinGW in extraResources
- Auto-configure PATH
- Output: `CarbonCode-Full-Setup.exe`
- Size: ~400-500MB

## File Structure Changes

```
src/
├── components/
│   ├── Editor.tsx          (existing)
│   ├── TabBar.tsx          (new)
│   ├── FileExplorer.tsx    (new)
│   ├── FindReplace.tsx     (new)
│   ├── SettingsModal.tsx   (new)
│   ├── Toolbar.tsx         (existing)
│   ├── OutputPanel.tsx     (existing)
│   ├── StatusBar.tsx       (existing)
│   └── WelcomeScreen.tsx   (existing)
├── hooks/
│   └── useFileManager.ts   (new - file state management)
├── App.tsx
└── main.tsx
```

## Implementation Order
1. TabBar + Multi-file state management
2. File Explorer
3. Build standard installer
4. Find & Replace
5. Settings Panel
6. Recent Files
7. Build MinGW-bundled installer
