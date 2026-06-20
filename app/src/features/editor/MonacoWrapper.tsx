import { useEffect, useRef, useCallback } from 'react';
import MonacoEditor from '@monaco-editor/react';
import type * as monaco from 'monaco-editor';
import * as Y from 'yjs';
import { MonacoBinding } from 'y-monaco';
import type { WebrtcProvider } from 'y-webrtc';
import { applyRemoteCursors, clearRemoteCursors } from './cursorDecorations';
import type { Collaborator } from '@/hooks/usePresence';
interface Props {
    yText: Y.Text | null;
    language: string;
    provider: WebrtcProvider | null;
    collaborators: Collaborator[];
    readOnly: boolean;
    theme: 'dark' | 'light';
    onCursorChange?: (pos: {
        lineNumber: number;
        column: number;
    } | null) => void;
    onSelectionChange?: (sel: Collaborator['selection']) => void;
    onContentChange?: (content: string) => void;
}
export default function MonacoWrapper({ yText, language, provider, collaborators, readOnly, theme, onCursorChange, onSelectionChange, onContentChange, }: Props) {
    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const bindingRef = useRef<MonacoBinding | null>(null);
    const rebind = useCallback(() => {
        if (!editorRef.current || !yText || !provider)
            return;
        bindingRef.current?.destroy();
        bindingRef.current = null;
        clearRemoteCursors(editorRef.current);
        const model = editorRef.current.getModel();
        if (!model)
            return;
        bindingRef.current = new MonacoBinding(yText, model, new Set([editorRef.current]), provider.awareness);
        onContentChange?.(editorRef.current.getValue());
    }, [yText, provider]);
    useEffect(() => {
        rebind();
    }, [rebind]);
    useEffect(() => {
        if (!editorRef.current)
            return;
        applyRemoteCursors(editorRef.current, collaborators.map(c => ({
            clientId: c.clientId,
            name: c.name,
            color: c.color,
            lineNumber: c.cursor?.lineNumber ?? 0,
            column: c.cursor?.column ?? 0,
            selection: c.selection,
        })));
    }, [collaborators]);
    const handleMount = useCallback((editor: monaco.editor.IStandaloneCodeEditor) => {
        editorRef.current = editor;
        editor.onDidChangeCursorPosition(e => {
            onCursorChange?.({ lineNumber: e.position.lineNumber, column: e.position.column });
        });
        editor.onDidChangeCursorSelection(e => {
            const { selectionStartLineNumber, selectionStartColumn, positionLineNumber, positionColumn } = e.selection;
            onSelectionChange?.({
                startLineNumber: selectionStartLineNumber,
                startColumn: selectionStartColumn,
                endLineNumber: positionLineNumber,
                endColumn: positionColumn,
            });
        });
        editor.onDidChangeModelContent(() => {
            onContentChange?.(editor.getValue());
        });
        rebind();
    }, [rebind, onCursorChange, onSelectionChange, onContentChange]);
    return (<MonacoEditor height="100%" width="100%" language={language} theme={theme === 'dark' ? 'vs-dark' : 'vs'} options={{
            readOnly,
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fontLigatures: true,
            lineHeight: 22,
            minimap: { enabled: true, scale: 1 },
            scrollBeyondLastLine: false,
            renderWhitespace: 'selection',
            bracketPairColorization: { enabled: true },
            guides: { bracketPairs: true },
            padding: { top: 12, bottom: 12 },
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            wordWrap: 'off',
            automaticLayout: true,
        }} onMount={handleMount}/>);
}
