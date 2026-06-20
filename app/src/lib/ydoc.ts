import * as Y from 'yjs';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';


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
    provider: SupabaseProvider | null;
    files: Y.Map<Y.Text>;
    terminal: Y.Array<TerminalLine>;
    destroy: () => void;
}

/**
 * Custom Yjs Provider using Supabase Realtime Broadcast
 * Implements the standard Yjs sync protocol and awareness.
 */
export class SupabaseProvider {
    doc: Y.Doc;
    roomId: string;
    channel: RealtimeChannel;
    awareness: any;
    private localClientId: string;
    private trackTimeout: any;
    private updateBuffer: Uint8Array[] = [];
    private sendTimeout: any;

    constructor(roomId: string, doc: Y.Doc) {
        this.doc = doc;
        this.roomId = roomId;
        this.localClientId = crypto.randomUUID();
        this.awareness = {
            clientID: doc.clientID,
            getLocalState: () => this.localState,
            setLocalState: (state: any) => this.setAwarenessState(state),
            getStates: () => this.states,
            setLocalStateField: (field: string, value: any) => {
                const currentState = this.localState || {};
                this.setAwarenessState({ ...currentState, [field]: value });
            },
            on: (event: string, cb: Function) => {
                if (!this.listeners[event]) this.listeners[event] = [];
                this.listeners[event].push(cb);
            },
            off: (event: string, cb: Function) => {
                if (this.listeners[event]) {
                    this.listeners[event] = this.listeners[event].filter(l => l !== cb);
                }
            }
        };

        this.channel = supabase.channel(`yjs-${roomId}`, {
            config: {
                presence: { key: this.localClientId },
                broadcast: { ack: false }
            }
        });

        // 1. Listen for doc updates and broadcast them
        doc.on('update', this.onDocUpdate);

        // 2. Listen for remote broadcasts
        this.channel
            .on('broadcast', { event: 'update' }, this.onRemoteUpdate)
            .on('broadcast', { event: 'sync-step-1' }, this.onSyncStep1)
            .on('broadcast', { event: 'sync-step-2' }, this.onRemoteUpdate);

        // 3. Listen for presence (awareness/cursors)
        this.channel
            .on('presence', { event: 'sync' }, this.onPresenceSync)
            .on('presence', { event: 'join' }, this.onPresenceJoin)
            .on('presence', { event: 'leave' }, this.onPresenceLeave);

        this.channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                // Send Sync Step 1 to all connected clients
                const stateVector = Y.encodeStateVector(doc);
                await this.channel.send({
                    type: 'broadcast',
                    event: 'sync-step-1',
                    payload: Array.from(stateVector)
                });
                
                // Track our initial presence
                this.channel.track({ user: this.localState, clientID: this.doc.clientID });
            }
        });
    }

    private onDocUpdate = (update: Uint8Array, origin: any) => {
        if (origin !== this && origin !== 'db-load') {
            this.updateBuffer.push(update);
            if (!this.sendTimeout) {
                this.sendTimeout = setTimeout(() => {
                    if (this.updateBuffer.length > 0) {
                        const merged = Y.mergeUpdates(this.updateBuffer);
                        this.updateBuffer = [];
                        this.channel.send({
                            type: 'broadcast',
                            event: 'update',
                            payload: Array.from(merged)
                        });
                    }
                    this.sendTimeout = null;
                }, 100);
            }
        }
    };

    private onRemoteUpdate = ({ payload }: any) => {
        const update = new Uint8Array(payload);
        Y.applyUpdate(this.doc, update, this);
    };

    private onSyncStep1 = ({ payload }: any) => {
        const remoteStateVector = new Uint8Array(payload);
        const update = Y.encodeStateAsUpdate(this.doc, remoteStateVector);
        this.channel.send({
            type: 'broadcast',
            event: 'sync-step-2',
            payload: Array.from(update)
        });
    };

    // --- Awareness Implementation ---
    private localState: any = null;
    private states: Map<number, any> = new Map();
    private listeners: Record<string, Function[]> = {};

    private setAwarenessState(state: any) {
        this.localState = state;
        if (this.channel.state === 'joined') {
            // Throttle track calls to avoid Supabase rate limits (10/sec)
            if (!this.trackTimeout) {
                this.trackTimeout = setTimeout(() => {
                    this.channel.track({ user: this.localState, clientID: this.doc.clientID });
                    this.trackTimeout = null;
                }, 150);
            }
        }
        this.emitAwareness('update', { added: [], updated: [this.doc.clientID], removed: [] });
    }

    private onPresenceSync = () => {
        const state = this.channel.presenceState();
        this.updateAwarenessFromPresence(state);
    };

    private onPresenceJoin = ({ newPresences }: any) => {
        this.updateAwarenessFromPresence(this.channel.presenceState());
    };

    private onPresenceLeave = ({ leftPresences }: any) => {
        this.updateAwarenessFromPresence(this.channel.presenceState());
    };

    private updateAwarenessFromPresence(presenceState: any) {
        const updated: number[] = [];
        const added: number[] = [];
        const oldKeys = new Set(this.states.keys());

        for (const [key, presences] of Object.entries(presenceState)) {
            const p = (presences as any[])[0];
            if (!p || !p.clientID) continue;
            
            if (this.states.has(p.clientID)) {
                updated.push(p.clientID);
            } else {
                added.push(p.clientID);
            }
            this.states.set(p.clientID, p.user);
            oldKeys.delete(p.clientID);
        }

        const removed = Array.from(oldKeys);
        for (const r of removed) {
            this.states.delete(r);
        }

        if (added.length > 0 || updated.length > 0 || removed.length > 0) {
            this.emitAwareness('change', { added, updated, removed }, 'local');
            this.emitAwareness('update', { added, updated, removed }, 'local');
        }
    }

    private emitAwareness(event: string, args: any, origin?: any) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(cb => cb(args, origin));
        }
    }

    destroy() {
        this.doc.off('update', this.onDocUpdate);
        supabase.removeChannel(this.channel);
    }
}

export function createRoomDoc(roomId: string): RoomDoc {
    const doc = new Y.Doc();
    const files = doc.getMap<Y.Text>('files');
    const terminal = doc.getArray<TerminalLine>('terminal');

    if (!isSupabaseConfigured && files.size === 0) {
        const defaultText = new Y.Text();
        defaultText.insert(0, '// Welcome to CodeSync\n// Start coding and invite collaborators!\n');
        files.set('main.js', defaultText);
    }

    let provider: SupabaseProvider | null = null;
    
    if (isSupabaseConfigured) {
        provider = new SupabaseProvider(roomId, doc);
        
        // Auto-save mechanism: save full Y.Doc state to snapshots table
        let timeout: any;
        doc.on('update', (_update, origin) => {
            // If the update came from a remote peer, that peer will handle the auto-save.
            // This prevents all N connected peers from saving the exact same keystroke N times.
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

    return {
        doc,
        provider,
        files,
        terminal,
        destroy: () => {
            provider?.destroy();
            doc.destroy();
        },
    };
}
