import { useEffect, useRef, useCallback } from 'react'
import MonacoEditor from '@monaco-editor/react'
import type * as monaco from 'monaco-editor'
import * as Y from 'yjs'
import { MonacoBinding } from 'y-monaco'
import type { WebrtcProvider } from 'y-webrtc'
import { applyRemoteCursors, clearRemoteCursors } from './cursorDecorations'
import type { Collaborator } from '@/hooks/usePresence'

interface Props {
  yText:         Y.Text | null
  language:      string
  provider:      WebrtcProvider | null
  collaborators: Collaborator[]
  readOnly:      boolean
  theme:         'dark' | 'light'
  onCursorChange?: (pos: { lineNumber: number; column: number } | null) => void
  onSelectionChange?: (sel: Collaborator['selection']) => void
  onContentChange?: (content: string) => void
}

/**
 * Monaco Editor wrapper.
 * - Binds Monaco model to a Y.Text via MonacoBinding for CRDT sync
 * - Re-binds when the active file changes (yText prop)
 * - Renders remote user cursors via deltaDecorations
 * - Reports cursor/selection changes to the parent for awareness updates
 */
export default function MonacoWrapper({
  yText,
  language,
  provider,
  collaborators,
  readOnly,
  theme,
  onCursorChange,
  onSelectionChange,
  onContentChange,
}: Props) {
  const editorRef  = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const bindingRef = useRef<MonacoBinding | null>(null)

  const rebind = useCallback(() => {
    if (!editorRef.current || !yText || !provider) return

    // Tear down the previous binding cleanly
    bindingRef.current?.destroy()
    bindingRef.current = null
    clearRemoteCursors(editorRef.current)

    const model = editorRef.current.getModel()
    if (!model) return

    bindingRef.current = new MonacoBinding(
      yText,
      model,
      new Set([editorRef.current]),
      provider.awareness,
    )

    // Immediately report current content so parent has it even before first keystroke
    onContentChange?.(editorRef.current.getValue())
  }, [yText, provider])

  // Rebind whenever the active file (yText) changes
  useEffect(() => {
    rebind()
  }, [rebind])

  // Update remote cursors whenever collaborators change
  useEffect(() => {
    if (!editorRef.current) return
    applyRemoteCursors(
      editorRef.current,
      collaborators.map(c => ({
        clientId:  c.clientId,
        name:      c.name,
        color:     c.color,
        lineNumber: c.cursor?.lineNumber ?? 0,
        column:     c.cursor?.column     ?? 0,
        selection:  c.selection,
      })),
    )
  }, [collaborators])

  const handleMount = useCallback((editor: monaco.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor

    // Cursor position → awareness
    editor.onDidChangeCursorPosition(e => {
      onCursorChange?.({ lineNumber: e.position.lineNumber, column: e.position.column })
    })

    // Selection → awareness
    editor.onDidChangeCursorSelection(e => {
      const { selectionStartLineNumber, selectionStartColumn, positionLineNumber, positionColumn } = e.selection
      onSelectionChange?.({
        startLineNumber: selectionStartLineNumber,
        startColumn:     selectionStartColumn,
        endLineNumber:   positionLineNumber,
        endColumn:       positionColumn,
      })
    })

    // Content change → parent callback (for AI etc.)
    editor.onDidChangeModelContent(() => {
      onContentChange?.(editor.getValue())
    })

    rebind()
  }, [rebind, onCursorChange, onSelectionChange, onContentChange])

  return (
    <MonacoEditor
      height="100%"
      width="100%"
      language={language}
      theme={theme === 'dark' ? 'vs-dark' : 'vs'}
      options={{
        readOnly,
        fontSize:         14,
        fontFamily:       "'JetBrains Mono', 'Fira Code', monospace",
        fontLigatures:    true,
        lineHeight:       22,
        minimap:          { enabled: true, scale: 1 },
        scrollBeyondLastLine: false,
        renderWhitespace: 'selection',
        bracketPairColorization: { enabled: true },
        guides: { bracketPairs: true },
        padding:          { top: 12, bottom: 12 },
        smoothScrolling:  true,
        cursorBlinking:   'smooth',
        cursorSmoothCaretAnimation: 'on',
        wordWrap:         'off',
        automaticLayout:  true,
      }}
      onMount={handleMount}
    />
  )
}
