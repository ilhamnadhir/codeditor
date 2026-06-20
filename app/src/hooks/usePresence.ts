import { useEffect, useState, useCallback } from 'react';
import type { WebrtcProvider } from 'y-webrtc';
import type { AwarenessUser } from '@/lib/awareness';
export interface Collaborator {
    clientId: number;
    name: string;
    color: string;
    avatarUrl?: string;
    cursor: {
        lineNumber: number;
        column: number;
    } | null;
    selection: {
        startLineNumber: number;
        startColumn: number;
        endLineNumber: number;
        endColumn: number;
    } | null;
    latencyMs: number | null;
}
interface PresenceMetrics {
    activeUsers: number;
    editCount: number;
    latencyMs: number | null;
}
interface UsePresenceReturn {
    collaborators: Collaborator[];
    metrics: PresenceMetrics;
    updateCursor: (cursor: {
        lineNumber: number;
        column: number;
    } | null) => void;
    updateSelection: (sel: Collaborator['selection']) => void;
}
export function usePresence(provider: WebrtcProvider | null, localUser: AwarenessUser | null): UsePresenceReturn {
    const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
    const [editCount, setEditCount] = useState(0);
    useEffect(() => {
        if (!provider || !localUser)
            return;
        provider.awareness.setLocalStateField('user', localUser);
        provider.awareness.setLocalStateField('ping', Date.now());
        provider.awareness.setLocalStateField('cursor', null);
        provider.awareness.setLocalStateField('selection', null);
    }, [provider, localUser]);
    useEffect(() => {
        if (!provider)
            return;
        const awareness = provider.awareness;
        const updateCollaborators = () => {
            const states = awareness.getStates();
            const myClientId = awareness.clientID;
            const result: Collaborator[] = [];
            states.forEach((state, clientId) => {
                if (clientId === myClientId)
                    return;
                if (!state.user)
                    return;
                const theirPing = state.ping as number | undefined;
                const latencyMs = theirPing ? Math.max(0, Date.now() - theirPing) : null;
                result.push({
                    clientId,
                    name: (state.user as AwarenessUser).name ?? 'Anonymous',
                    color: (state.user as AwarenessUser).color ?? '#6366f1',
                    avatarUrl: (state.user as AwarenessUser).avatarUrl,
                    cursor: state.cursor ?? null,
                    selection: state.selection ?? null,
                    latencyMs: latencyMs !== null && latencyMs < 5000 ? latencyMs : null,
                });
            });
            setCollaborators(result);
        };
        awareness.on('change', updateCollaborators);
        updateCollaborators();
        return () => awareness.off('change', updateCollaborators);
    }, [provider]);
    useEffect(() => {
        if (!provider)
            return;
        const doc = provider.doc;
        const handleUpdate = (_update: Uint8Array, origin: unknown) => {
            if (origin === null || origin === undefined) {
                setEditCount(c => c + 1);
            }
        };
        doc.on('update', handleUpdate);
        return () => doc.off('update', handleUpdate);
    }, [provider]);
    const updateCursor = useCallback((cursor: {
        lineNumber: number;
        column: number;
    } | null) => {
        provider?.awareness.setLocalStateField('cursor', cursor);
        provider?.awareness.setLocalStateField('ping', Date.now());
    }, [provider]);
    const updateSelection = useCallback((sel: Collaborator['selection']) => {
        provider?.awareness.setLocalStateField('selection', sel);
    }, [provider]);
    const bestLatency = collaborators.reduce<number | null>((best, c) => {
        if (c.latencyMs === null)
            return best;
        return best === null ? c.latencyMs : Math.min(best, c.latencyMs);
    }, null);
    return {
        collaborators,
        metrics: {
            activeUsers: collaborators.length + 1,
            editCount,
            latencyMs: bestLatency,
        },
        updateCursor,
        updateSelection,
    };
}
