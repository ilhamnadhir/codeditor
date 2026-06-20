import { nanoid } from 'nanoid';
export function generateRoomId(): string {
    return nanoid(8);
}
export function getRoomUrl(roomId: string): string {
    return `${window.location.origin}/room/${roomId}`;
}
export async function copyRoomUrl(roomId: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(getRoomUrl(roomId));
        return true;
    }
    catch {
        return false;
    }
}
const RECENT_KEY = 'cs_recent_rooms';
export interface RecentRoom {
    id: string;
    name: string;
    lastVisited: number;
}
export function getRecentRooms(): RecentRoom[] {
    try {
        return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
    }
    catch {
        return [];
    }
}
export function recordRecentRoom(room: RecentRoom): void {
    const existing = getRecentRooms().filter(r => r.id !== room.id);
    const updated = [room, ...existing].slice(0, 8);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
}
export function removeRecentRoom(id: string): void {
    const updated = getRecentRooms().filter(r => r.id !== id);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
}
