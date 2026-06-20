import type { WebrtcProvider } from 'y-webrtc';
export interface AwarenessUser {
    name: string;
    color: string;
    avatarUrl?: string;
}
export const USER_COLORS = [
    '#6366f1', '#22c55e', '#f59e0b', '#ef4444',
    '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6',
];
export function getColorForIndex(index: number): string {
    return USER_COLORS[index % USER_COLORS.length];
}
export function setAwarenessUser(provider: WebrtcProvider, user: AwarenessUser): void {
    provider.awareness.setLocalStateField('user', user);
    provider.awareness.setLocalStateField('ping', Date.now());
}
export function setAwarenessCursor(provider: WebrtcProvider, cursor: {
    lineNumber: number;
    column: number;
} | null, selection?: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
} | null): void {
    provider.awareness.setLocalStateField('cursor', cursor);
    provider.awareness.setLocalStateField('selection', selection ?? null);
    provider.awareness.setLocalStateField('ping', Date.now());
}
