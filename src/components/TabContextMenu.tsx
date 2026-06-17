import { useEffect, useRef } from 'react'
import type { FileTab } from './TabBar'

interface TabContextMenuProps {
    x: number
    y: number
    tab: FileTab
    totalTabs: number
    hasSavedTabs: boolean
    onClose: () => void
    onCloseTab: () => void
    onCloseOthers: () => void
    onCloseAll: () => void
    onCloseSaved: () => void
    onSave: () => void
    onSaveAs: () => void
    onReveal: () => void
    onCopyPath: () => void
    onCopyFileName: () => void
    onDuplicate: () => void
}

const ITEM_BASE = 'w-full text-left px-3 py-1.5 text-sm text-text-primary hover:bg-editor-highlight transition-colors flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent'
const SEP = 'my-1 border-t border-editor-border'

function MenuItem({
    label,
    disabled,
    title,
    onClick,
}: {
    label: string
    disabled?: boolean
    title?: string
    onClick: () => void
}) {
    return (
        <button
            className={ITEM_BASE}
            disabled={disabled}
            onClick={onClick}
            title={title}
        >
            <span>{label}</span>
        </button>
    )
}

function TabContextMenu(props: TabContextMenuProps) {
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const onDown = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                props.onClose()
            }
        }
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') props.onClose()
        }
        document.addEventListener('mousedown', onDown)
        document.addEventListener('keydown', onKey)
        return () => {
            document.removeEventListener('mousedown', onDown)
            document.removeEventListener('keydown', onKey)
        }
    }, [props.onClose])

    const wrap = (fn: () => void) => () => {
        fn()
        props.onClose()
    }

    const hasPath = props.tab.filePath !== null
    const noPathTitle = 'No file path'

    return (
        <div
            ref={ref}
            role="menu"
            style={{ position: 'fixed', top: props.y, left: props.x, zIndex: 50 }}
            className="min-w-[220px] bg-editor-sidebar border border-editor-border rounded-md shadow-xl py-1"
            onContextMenu={(e) => e.preventDefault()}
        >
            <MenuItem label="Close"           onClick={wrap(props.onCloseTab)} />
            <MenuItem label="Close Others"    disabled={props.totalTabs < 2} onClick={wrap(props.onCloseOthers)} />
            <MenuItem label="Close All"       disabled={props.totalTabs < 1} onClick={wrap(props.onCloseAll)} />
            <MenuItem label="Close Saved"     disabled={!props.hasSavedTabs} onClick={wrap(props.onCloseSaved)} />

            <div className={SEP} />

            <MenuItem label="Save"            disabled={!props.tab.isDirty} onClick={wrap(props.onSave)} />
            <MenuItem label="Save As"         onClick={wrap(props.onSaveAs)} />

            <div className={SEP} />

            <MenuItem label="Reveal in File Explorer" disabled={!hasPath} title={hasPath ? undefined : noPathTitle} onClick={wrap(props.onReveal)} />
            <MenuItem label="Copy Path"       disabled={!hasPath} title={hasPath ? undefined : noPathTitle} onClick={wrap(props.onCopyPath)} />
            <MenuItem label="Copy File Name"  onClick={wrap(props.onCopyFileName)} />

            <div className={SEP} />

            <MenuItem label="Duplicate"       onClick={wrap(props.onDuplicate)} />
        </div>
    )
}

export default TabContextMenu