import { useState, useCallback, useEffect } from 'react'
import * as Y from 'yjs'
import { getLanguageFromFilename, getFileIcon } from '@/features/editor/languageMap'

export interface FileEntry {
  name:     string
  language: string
  icon:     string
}

interface UseFilesReturn {
  files:       FileEntry[]
  activeFile:  string | null
  setActive:   (name: string) => void
  getYText:    (name: string) => Y.Text | null
  addFile:     (name: string) => void
  deleteFile:  (name: string) => void
  renameFile:  (oldName: string, newName: string) => void
}

/**
 * Manages the multi-file workspace backed by a Y.Map<Y.Text>.
 * Each file's content is a separate Y.Text so Yjs syncs them independently.
 */
export function useFiles(yFiles: Y.Map<Y.Text> | null): UseFilesReturn {
  const [files,      setFiles]      = useState<FileEntry[]>([])
  const [activeFile, setActiveFile] = useState<string | null>(null)

  // Sync file list from Y.Map on any change
  useEffect(() => {
    if (!yFiles) return

    const refresh = () => {
      const entries: FileEntry[] = []
      yFiles.forEach((_text, name) => {
        entries.push({
          name,
          language: getLanguageFromFilename(name),
          icon:     getFileIcon(name),
        })
      })
      entries.sort((a, b) => a.name.localeCompare(b.name))
      setFiles(entries)

      // Auto-select first file
      setActiveFile(prev => {
        if (prev && yFiles.has(prev)) return prev
        return entries[0]?.name ?? null
      })
    }

    yFiles.observe(refresh)
    refresh()

    return () => yFiles.unobserve(refresh)
  }, [yFiles])

  const setActive = useCallback((name: string) => {
    setActiveFile(name)
  }, [])

  const getYText = useCallback((name: string): Y.Text | null => {
    return yFiles?.get(name) ?? null
  }, [yFiles])

  const addFile = useCallback((name: string) => {
    if (!yFiles || !name.trim() || yFiles.has(name)) return
    yFiles.set(name, new Y.Text())
    setActiveFile(name)
  }, [yFiles])

  const deleteFile = useCallback((name: string) => {
    if (!yFiles || yFiles.size <= 1) return // keep at least one file
    yFiles.delete(name)
  }, [yFiles])

  const renameFile = useCallback((oldName: string, newName: string) => {
    if (!yFiles || !newName.trim() || yFiles.has(newName)) return
    const text = yFiles.get(oldName)
    if (!text) return

    // Y.Doc transaction: delete old, create new with same content
    const content = text.toString()
    yFiles.doc?.transact(() => {
      yFiles.delete(oldName)
      const newText = new Y.Text()
      newText.insert(0, content)
      yFiles.set(newName, newText)
    })

    setActiveFile(prev => prev === oldName ? newName : prev)
  }, [yFiles])

  return { files, activeFile, setActive, getYText, addFile, deleteFile, renameFile }
}
