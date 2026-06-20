import * as Y from 'yjs'
import { WebrtcProvider } from 'y-webrtc'

export interface RoomDoc {
  doc: Y.Doc
  provider: WebrtcProvider
  /** Y.Map<fileName, Y.Text> — one Y.Text per file */
  files: Y.Map<Y.Text>
  /** Y.Array of terminal output lines */
  terminal: Y.Array<TerminalLine>
  destroy: () => void
}

export interface TerminalLine {
  type: 'stdout' | 'stderr' | 'info' | 'success'
  text: string
  time: number
  runId: string
  user?: string
}

/**
 * Creates the shared Y.Doc and WebRTC provider for a room.
 * Also sets up the canonical shared data structures used across features.
 */
export function createRoomDoc(roomId: string): RoomDoc {
  const doc      = new Y.Doc()
  const provider = new WebrtcProvider(roomId, doc, {
    // Public signaling server — fine for a dev tool
    signaling: ['wss://signaling.yjs.dev', 'wss://y-webrtc-signaling-eu.herokuapp.com'],
  })

  const files   = doc.getMap<Y.Text>('files')
  const terminal = doc.getArray<TerminalLine>('terminal')

  // Seed a default file if none exist
  if (files.size === 0) {
    const defaultText = new Y.Text()
    defaultText.insert(0, '// Welcome to CodeSync\n// Start coding and invite collaborators!\n')
    files.set('main.js', defaultText)
  }

  return {
    doc,
    provider,
    files,
    terminal,
    destroy: () => {
      provider.destroy()
      doc.destroy()
    },
  }
}
