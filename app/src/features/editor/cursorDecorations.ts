import type * as monaco from 'monaco-editor';
export interface RemoteCursor {
    clientId: number;
    name: string;
    color: string;
    lineNumber: number;
    column: number;
    selection?: {
        startLineNumber: number;
        startColumn: number;
        endLineNumber: number;
        endColumn: number;
    } | null;
}
const decorationMap = new Map<number, string[]>();
export function applyRemoteCursors(editor: monaco.editor.IStandaloneCodeEditor, cursors: RemoteCursor[]): void {
    const allOldIds: string[] = [];
    decorationMap.forEach(ids => allOldIds.push(...ids));
    const newDecorations: monaco.editor.IModelDeltaDecoration[] = [];
    for (const cursor of cursors) {
        if (!cursor.lineNumber || !cursor.column)
            continue;
        const hex = cursor.color;
        const alpha = '33';
        newDecorations.push({
            range: {
                startLineNumber: cursor.lineNumber,
                startColumn: cursor.column,
                endLineNumber: cursor.lineNumber,
                endColumn: cursor.column + 1,
            },
            options: {
                className: `remote-cursor-${cursor.clientId}`,
                beforeContentClassName: `remote-cursor-caret-${cursor.clientId}`,
                hoverMessage: { value: `**${cursor.name}**` },
                stickiness: 1,
            },
        });
        if (cursor.selection) {
            const { startLineNumber, startColumn, endLineNumber, endColumn } = cursor.selection;
            if (startLineNumber !== endLineNumber ||
                startColumn !== endColumn) {
                newDecorations.push({
                    range: { startLineNumber, startColumn, endLineNumber, endColumn },
                    options: {
                        className: `remote-selection-${cursor.clientId}`,
                        stickiness: 1,
                    },
                });
            }
        }
        ensureCursorStyle(cursor.clientId, hex, alpha);
    }
    const newIds = editor.deltaDecorations(allOldIds, newDecorations);
    decorationMap.clear();
    let offset = 0;
    for (const cursor of cursors) {
        const count = cursor.selection ? 2 : 1;
        decorationMap.set(cursor.clientId, newIds.slice(offset, offset + count));
        offset += count;
    }
}
export function clearRemoteCursors(editor: monaco.editor.IStandaloneCodeEditor): void {
    const allIds: string[] = [];
    decorationMap.forEach(ids => allIds.push(...ids));
    editor.deltaDecorations(allIds, []);
    decorationMap.clear();
}
const injectedStyles = new Set<number>();
function ensureCursorStyle(clientId: number, hex: string, selAlpha: string): void {
    if (injectedStyles.has(clientId))
        return;
    injectedStyles.add(clientId);
    const style = document.createElement('style');
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
  `;
    document.head.appendChild(style);
}
