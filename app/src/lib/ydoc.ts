import * as Y from 'yjs';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { WebsocketProvider } from 'y-websocket';

function uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
    const binary = window.atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}

export interface TerminalLine {
    type: 'stdout' | 'stderr' | 'info' | 'success';
    text: string;
    time: number;
    runId: string;
    user?: string;
}

export interface RoomDoc {
    doc: Y.Doc;
    provider: WebsocketProvider | null;
    files: Y.Map<Y.Text>;
    terminal: Y.Array<TerminalLine>;
    destroy: () => void;
}

export function setAwarenessUser(provider: any, user: { name?: string, color: string, avatarUrl?: string }) {
    if (!provider?.awareness) return;
    provider.awareness.setLocalStateField('user', user);
}

const roomDocCache = new Map<string, { doc: RoomDoc; refs: number }>();

export function createRoomDoc(roomId: string): RoomDoc {
    const existing = roomDocCache.get(roomId);
    if (existing) {
        existing.refs++;
        return existing.doc;
    }

    const doc = new Y.Doc();
    const files = doc.getMap<Y.Text>('files');
    const terminal = doc.getArray<TerminalLine>('terminal');

    // Use local WebSocket server in dev, fallback to demos server in production
    const wsHost = window.location.hostname === 'localhost' || window.location.hostname.match(/^192\.168\./) || window.location.hostname.match(/^10\./) 
        ? `ws://${window.location.hostname}:1234`
        : 'wss://demos.yjs.dev/ws';
    const provider = new WebsocketProvider(wsHost, `codesync-${roomId}`, doc);

    if (isSupabaseConfigured) {
        // Auto-save mechanism: save full Y.Doc state to snapshots table
        let timeout: any;
        doc.on('update', (_update, origin) => {
            // If the update came from a remote peer, that peer will handle the auto-save.
            if (provider && origin === provider) return;
            // Ignore updates that come from loading the initial database snapshot
            if (origin === 'db-load') return;

            clearTimeout(timeout);
            timeout = setTimeout(async () => {
                const updateBytes = Y.encodeStateAsUpdate(doc);
                const content = uint8ArrayToBase64(updateBytes);
                
                // Save the full document state vector as a special snapshot
                const { error } = await supabase.from('snapshots').insert({
                    room_id: roomId,
                    file_name: '.yjs-state',
                    content,
                    label: 'System Auto-save',
                    author: 'system'
                });
                if (error) console.error('Supabase Auto-save Error:', error);
            }, 500); // Save after 500ms of inactivity
        });

        // Fetch initial state
        supabase.from('snapshots')
            .select('*')
            .eq('room_id', roomId)
            .eq('file_name', '.yjs-state')
            .order('created_at', { ascending: false })
            .limit(1)
            .then(({ data, error }) => {
                if (error) {
                    console.error('Supabase Fetch Error:', error);
                }
                
                if (files.size > 0) return; // Already received state from another peer
                
                if (data && data.length > 0) {
                    const snap = data[0];
                    if (snap.content) {
                        try {
                            const updateBytes = base64ToUint8Array(snap.content);
                            Y.applyUpdate(doc, updateBytes, 'db-load');
                        } catch (e) {
                            console.error('Failed to restore Yjs state from DB', e);
                        }
                    }
                } else {
                    // No state found, brand new room
                    doc.transact(() => {
                        const defaultText = new Y.Text();
                        defaultText.insert(0, '// Welcome to CodeSync\n// Start coding and invite collaborators!\n');
                        files.set('main.js', defaultText);
                    });
                }
            });
    }

    const roomDoc = {
        doc,
        provider,
        files,
        terminal,
        destroy: () => {
            const cached = roomDocCache.get(roomId);
            if (cached) {
                cached.refs--;
                if (cached.refs <= 0) {
                    provider?.destroy();
                    doc.destroy();
                    roomDocCache.delete(roomId);
                }
            }
        }
    };

    roomDocCache.set(roomId, { doc: roomDoc, refs: 1 });
    return roomDoc;
}
