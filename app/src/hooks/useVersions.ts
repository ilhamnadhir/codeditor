import { useState, useCallback } from 'react'
import * as Y from 'yjs'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export interface Snapshot {
  id:         string
  room_id:    string
  file_name:  string
  content:    string
  label:      string
  created_at: string
  author:     string
}

interface UseVersionsReturn {
  snapshots:      Snapshot[]
  loading:        boolean
  saveSnapshot:   (roomId: string, fileName: string, yText: Y.Text, label?: string, userId?: string) => Promise<void>
  loadSnapshots:  (roomId: string, fileName: string) => Promise<void>
  restoreSnapshot:(snapshot: Snapshot, yText: Y.Text) => void
  deleteSnapshot: (id: string) => Promise<void>
}

export function useVersions(): UseVersionsReturn {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [loading,   setLoading]   = useState(false)

  const saveSnapshot = useCallback(async (
    roomId:   string,
    fileName: string,
    yText:    Y.Text,
    label    = '',
    userId?: string,
  ) => {
    const content = yText.toString()
    if (!content.trim()) return

    const snap: Omit<Snapshot, 'id' | 'created_at'> = {
      room_id:   roomId,
      file_name: fileName,
      content,
      label:     label || `Snapshot ${new Date().toLocaleTimeString()}`,
      author:    userId ?? 'anonymous',
    }

    if (isSupabaseConfigured) {
      await supabase.from('snapshots').insert({
        ...snap,
        created_by: userId,
      })
    } else {
      // LocalStorage fallback
      const key  = `cs_snaps_${roomId}_${fileName}`
      const list = getLocalSnapshots(key)
      list.unshift({
        ...snap,
        id:         crypto.randomUUID(),
        created_at: new Date().toISOString(),
      })
      localStorage.setItem(key, JSON.stringify(list.slice(0, 50)))
    }
  }, [])

  const loadSnapshots = useCallback(async (roomId: string, fileName: string) => {
    setLoading(true)
    try {
      if (isSupabaseConfigured) {
        const { data } = await supabase
          .from('snapshots')
          .select('*')
          .eq('room_id',   roomId)
          .eq('file_name', fileName)
          .order('created_at', { ascending: false })
          .limit(50)

        setSnapshots(data ?? [])
      } else {
        const key = `cs_snaps_${roomId}_${fileName}`
        setSnapshots(getLocalSnapshots(key))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const restoreSnapshot = useCallback((snapshot: Snapshot, yText: Y.Text) => {
    // Transactional replacement — Yjs will sync this to all peers
    yText.doc?.transact(() => {
      yText.delete(0, yText.length)
      yText.insert(0, snapshot.content)
    })
  }, [])

  const deleteSnapshot = useCallback(async (id: string) => {
    if (isSupabaseConfigured) {
      await supabase.from('snapshots').delete().eq('id', id)
    }
    setSnapshots(prev => prev.filter(s => s.id !== id))
  }, [])

  return { snapshots, loading, saveSnapshot, loadSnapshots, restoreSnapshot, deleteSnapshot }
}

function getLocalSnapshots(key: string): Snapshot[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '[]')
  } catch {
    return []
  }
}
