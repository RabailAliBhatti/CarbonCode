import { useState, useCallback } from 'react'
import { FileTab } from '../components/TabBar'

// Default C++ template
const DEFAULT_CODE = `#include <iostream>
#include <vector>
#include <string>

using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    cout << "Welcome to CarbonCode!" << endl;
    
    // Your code here
    vector<int> numbers = {1, 2, 3, 4, 5};
    
    cout << "Numbers: ";
    for (int num : numbers) {
        cout << num << " ";
    }
    cout << endl;
    
    return 0;
}
`

// Generate unique ID
const generateId = () => `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

// Get file name from path
const getFileName = (filePath: string | null) => {
    if (!filePath) return 'Untitled'
    const parts = filePath.split(/[\\/]/)
    return parts[parts.length - 1]
}

export function useFileManager() {
    const [tabs, setTabs] = useState<FileTab[]>([])

    // Active tab ID or null if no tabs
    const [activeTabId, setActiveTabId] = useState<string | null>(null)

    // Get active tab
    const activeTab = tabs.find(tab => tab.id === activeTabId) || null

    // Create new tab
    const createNewTab = useCallback(() => {
        const newTab: FileTab = {
            id: generateId(),
            fileName: 'Untitled',
            filePath: null,
            content: DEFAULT_CODE,
            isDirty: false,
            language: 'cpp'
        }
        setTabs(prev => [...prev, newTab])
        setActiveTabId(newTab.id)
        return newTab
    }, [])

    // Open file in new tab or existing tab
    const openFile = useCallback((filePath: string, content: string) => {
        // Check if file is already open
        const existingTab = tabs.find(tab => tab.filePath === filePath)
        if (existingTab) {
            setActiveTabId(existingTab.id)
            return existingTab
        }

        // Create new tab for this file
        const newTab: FileTab = {
            id: generateId(),
            fileName: getFileName(filePath),
            filePath,
            content,
            isDirty: false,
            language: 'cpp'
        }
        setTabs(prev => [...prev, newTab])
        setActiveTabId(newTab.id)
        return newTab
    }, [tabs])

    // Update tab content
    const updateTabContent = useCallback((tabId: string, content: string) => {
        setTabs(prev => prev.map(tab => {
            if (tab.id === tabId) {
                const isDirty = content !== tab.content || tab.isDirty
                return { ...tab, content, isDirty: tab.filePath ? content !== tab.content : isDirty }
            }
            return tab
        }))
    }, [])

    // Mark tab as saved
    const markTabSaved = useCallback((tabId: string, filePath: string) => {
        setTabs(prev => prev.map(tab => {
            if (tab.id === tabId) {
                return {
                    ...tab,
                    filePath,
                    fileName: getFileName(filePath),
                    isDirty: false
                }
            }
            return tab
        }))
    }, [])

    // Close tab
    const closeTab = useCallback(async (tabId: string): Promise<boolean> => {
        // Remove tab
        const newTabs = tabs.filter(t => t.id !== tabId)
        setTabs(newTabs)

        // If closing active tab, switch to adjacent tab or null
        if (activeTabId === tabId) {
            if (newTabs.length > 0) {
                const closedIndex = tabs.findIndex(t => t.id === tabId)
                const newActiveIndex = Math.min(closedIndex, newTabs.length - 1)
                setActiveTabId(newTabs[newActiveIndex].id)
            } else {
                setActiveTabId(null)
            }
        }

        return true
    }, [tabs, activeTabId])

    // Switch to tab
    const switchToTab = useCallback((tabId: string) => {
        setActiveTabId(tabId)
    }, [])

    // Check if any tab has unsaved changes
    const hasUnsavedChanges = tabs.some(tab => tab.isDirty)

    // Get tab by ID
    const getTab = useCallback((tabId: string) => {
        return tabs.find(t => t.id === tabId)
    }, [tabs])

    return {
        tabs,
        activeTab,
        activeTabId,
        createNewTab,
        openFile,
        updateTabContent,
        markTabSaved,
        closeTab,
        switchToTab,
        hasUnsavedChanges,
        getTab,
        setActiveTabId
    }
}

export type FileManager = ReturnType<typeof useFileManager>
