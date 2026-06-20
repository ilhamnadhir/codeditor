import type * as monaco from 'monaco-editor'

export interface RemoteCursor {
  clientId: number
  name: string
  color: string
  lineNumber: number
  column: number
  selection?: {
    startLineNumber: number
    startColumn: number
    endLineNumber: number
    endColumn: number
  } | null
}

// Track decoration IDs per client so we can clean them up properly
const decorationMap = new Map<number, string[]>()

/**
 * Apply remote user cursors and selections to the Monaco editor.
 * Uses deltaDecorations for efficient updates — only changed cursors are re-rendered.
 */
export function applyRemoteCursors(
  editor: monaco.editor.IStandaloneCodeEditor,
  cursors: RemoteCursor[],
): void {
  // Collect all old decoration IDs
  const allOldIds: string[] = []
  decorationMap.forEach(ids => allOldIds.push(...ids))

  const newDecorations: monaco.editor.IModelDeltaDecoration[] = []

  for (const cursor of cursors) {
    if (!cursor.lineNumber || !cursor.column) continue

    const hex   = cursor.color
    const alpha = '33' // 20% opacity for selection bg

    // Cursor line decoration (thin vertical bar)
    newDecorations.push({
      range: {
        startLineNumber: cursor.lineNumber,
        startColumn:     cursor.column,
        endLineNumber:   cursor.lineNumber,
        endColumn:       cursor.column + 1,
      },
      options: {
        className:        `remote-cursor-${cursor.clientId}`,
        beforeContentClassName: `remote-cursor-caret-${cursor.clientId}`,
        hoverMessage:     { value: `**${cursor.name}**` },
        stickiness: 1, // NeverGrowsWhenTypingAtEdges
      },
    })

    // Selection decoration
    if (cursor.selection) {
      const { startLineNumber, startColumn, endLineNumber, endColumn } = cursor.selection
      if (
        startLineNumber !== endLineNumber ||
        startColumn !== endColumn
      ) {
        newDecorations.push({
          range: { startLineNumber, startColumn, endLineNumber, endColumn },
          options: {
            className: `remote-selection-${cursor.clientId}`,
            stickiness: 1,
          },
        })
      }
    }

    // Inject CSS for this cursor's color (idempotent)
    ensureCursorStyle(cursor.clientId, hex, alpha)
  }

  // Apply all decorations at once
  const newIds = editor.deltaDecorations(allOldIds, newDecorations)

  // Rebuild the decoration map
  decorationMap.clear()
  let offset = 0
  for (const cursor of cursors) {
    const count = cursor.selection ? 2 : 1
    decorationMap.set(cursor.clientId, newIds.slice(offset, offset + count))
    offset += count
  }
}

/** Clear all remote cursor decorations (e.g. when file switches) */
export function clearRemoteCursors(
  editor: monaco.editor.IStandaloneCodeEditor,
): void {
  const allIds: string[] = []
  decorationMap.forEach(ids => allIds.push(...ids))
  editor.deltaDecorations(allIds, [])
  decorationMap.clear()
}

const injectedStyles = new Set<number>()

function ensureCursorStyle(clientId: number, hex: string, selAlpha: string): void {
  if (injectedStyles.has(clientId)) return
  injectedStyles.add(clientId)

  const style = document.createElement('style')
  style.textContent = `
    .remote-cursor-${clientId} {
      border-left: 2px solid ${hex};
    }
    .remote-cursor-caret-${clientId}::before {
      content: '';
      position: absolute;
      top: 0;
      left: -1px;
      width: 2px;
      height: 100%;
      background: ${hex};
    }
    .remote-selection-${clientId} {
      background: ${hex}${selAlpha};
    }
  `
  document.head.appendChild(style)
}
