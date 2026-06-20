import type { WebrtcProvider } from 'y-webrtc';
export interface AwarenessUser {
    name: string;
    color: string;
    avatarUrl?: string;
}
// Use neutral grey shades for collaborator indicators
export const USER_COLORS = [
    '#0b0b0b', '#2b2b2b', '#4b4b4b', '#6b6b6b',
    '#8b8b8b', '#ababab', '#cbcbcb', '#ebebeb',
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
