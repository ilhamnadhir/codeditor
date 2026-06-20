import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
export interface RoomDoc {
    doc: Y.Doc;
    provider: WebrtcProvider;
    files: Y.Map<Y.Text>;
    terminal: Y.Array<TerminalLine>;
    destroy: () => void;
}
export interface TerminalLine {
    type: 'stdout' | 'stderr' | 'info' | 'success';
    text: string;
    time: number;
    runId: string;
    user?: string;
}
export function createRoomDoc(roomId: string): RoomDoc {
    const doc = new Y.Doc();
    const provider = new WebrtcProvider(roomId, doc, {
        signaling: ['wss://signaling.yjs.dev', 'wss://y-webrtc-signaling-eu.herokuapp.com'],
    });
    const files = doc.getMap<Y.Text>('files');
    const terminal = doc.getArray<TerminalLine>('terminal');
    if (files.size === 0) {
        const defaultText = new Y.Text();
        defaultText.insert(0, '// Welcome to CodeSync\n// Start coding and invite collaborators!\n');
        files.set('main.js', defaultText);
    }
    return {
        doc,
        provider,
        files,
        terminal,
        destroy: () => {
            provider.destroy();
            doc.destroy();
        },
    };
}
