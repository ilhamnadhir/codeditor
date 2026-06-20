import * as Y from 'yjs';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { WebrtcProvider } from 'y-webrtc';

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
    provider: any | null; // WebrtcProvider
    files: Y.Map<Y.Text>;
    terminal: Y.Array<TerminalLine>;
    destroy: () => void;
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

    if (!isSupabaseConfigured && files.size === 0) {
        const defaultText = new Y.Text();
        defaultText.insert(0, '// Welcome to CodeSync\n// Start coding and invite collaborators!\n');
        files.set('main.js', defaultText);
    }

    let provider: any = null;
    
    // We use WebRTC for ultra-low latency peer-to-peer real-time sync (bypassing any server rate limits).
    // The signaling servers simply introduce the peers; all code data flows directly browser-to-browser.
    provider = new WebrtcProvider(`codesync-room-${roomId}`, doc, {
        signaling: [
            'wss://signaling.yjs.dev',
            'wss://y-webrtc-signaling-eu.herokuapp.com'
        ]
    });

    if (isSupabaseConfigured) {
        // Auto-save mechanism: save full Y.Doc state to snapshots table
        let timeout: any;
        doc.on('update', (_update, origin) => {
            // Ignore updates that come from loading the initial database snapshot
            // and ignore updates coming from the WebRTC provider (remote peers)
            if (origin === 'db-load' || origin === provider) return;

            clearTimeout(timeout);
            timeout = setTimeout(async () => {
                const updateBytes = Y.encodeStateAsUpdate(doc);
                const content = uint8ArrayToBase64(updateBytes);
                
                const { error } = await supabase.from('snapshots').insert({
                    room_id: roomId,
                    file_name: '.yjs-state',
                    content,
                    label: 'System Auto-save',
                    author: 'system'
                });
                if (error) console.error('Supabase Auto-save Error:', error);
            }, 1000); // Save after 1s of inactivity to database
        });

        // Fetch initial state from database
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
                
                if (files.size > 0) return; // Already received state from another WebRTC peer
                
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
