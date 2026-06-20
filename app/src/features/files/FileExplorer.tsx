import { useState, useRef, useCallback } from 'react'
import type { FileEntry } from '@/hooks/useFiles'

interface Props {
  files:       FileEntry[]
  activeFile:  string | null
  onSelect:    (name: string) => void
  onAddFile:   (name: string) => void
  onDelete:    (name: string) => void
  onRename:    (oldName: string, newName: string) => void
}

export default function FileExplorer({
  files, activeFile, onSelect, onAddFile, onDelete, onRename,
}: Props) {
  const [adding,      setAdding]      = useState(false)
  const [newName,     setNewName]     = useState('')
  const [renamingFile, setRenamingFile] = useState<string | null>(null)
  const [renameValue,  setRenameValue] = useState('')
  const addInputRef    = useRef<HTMLInputElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)

  const startAdding = () => {
    setAdding(true)
    setNewName('')
    setTimeout(() => addInputRef.current?.focus(), 0)
  }

  const confirmAdd = () => {
    if (newName.trim()) onAddFile(newName.trim())
    setAdding(false)
    setNewName('')
  }

  const startRename = (name: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setRenamingFile(name)
    setRenameValue(name)
    setTimeout(() => renameInputRef.current?.focus(), 0)
  }

  const confirmRename = () => {
    if (renamingFile && renameValue.trim() && renameValue !== renamingFile) {
      onRename(renamingFile, renameValue.trim())
    }
    setRenamingFile(null)
  }

  const handleDelete = useCallback((name: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (files.length <= 1) return
    if (confirm(`Delete "${name}"?`)) onDelete(name)
  }, [files.length, onDelete])

  return (
    <div className="file-explorer">
      <div className="sidebar-header">
        <span className="sidebar-title">Files</span>
        <button
          className="btn btn-icon btn-ghost btn-sm"
          onClick={startAdding}
          title="New file"
          id="new-file-btn"
        >
          +
        </button>
      </div>

      {/* New file input */}
      {adding && (
        <div style={{ padding: '4px 8px' }}>
          <input
            ref={addInputRef}
            className="input-field"
            style={{ height: 28, fontSize: 12 }}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') confirmAdd()
              if (e.key === 'Escape') setAdding(false)
            }}
            onBlur={confirmAdd}
            placeholder="filename.js"
          />
        </div>
      )}

      {/* File list */}
      {files.map(file => (
        <div
          key={file.name}
          className={`file-tree-item ${activeFile === file.name ? 'active' : ''}`}
          onClick={() => onSelect(file.name)}
          id={`file-${file.name.replace(/\W/g, '-')}`}
        >
          <span className="file-icon">{file.icon}</span>

          {renamingFile === file.name ? (
            <input
              ref={renameInputRef}
              className="input-field"
              style={{ height: 22, fontSize: 12, flex: 1 }}
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') confirmRename()
                if (e.key === 'Escape') setRenamingFile(null)
              }}
              onBlur={confirmRename}
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <span className="file-name">{file.name}</span>
          )}

          {/* Per-file actions (shown on hover via CSS) */}
          <div className="file-actions">
            <button
              className="file-action-btn"
              onClick={e => startRename(file.name, e)}
              title="Rename"
            >✎</button>
            <button
              className="file-action-btn"
              onClick={e => handleDelete(file.name, e)}
              title="Delete"
              style={{ color: files.length <= 1 ? 'var(--text-faint)' : undefined }}
            >✕</button>
          </div>
        </div>
      ))}
    </div>
  )
}
