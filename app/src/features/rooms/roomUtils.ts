import { nanoid } from 'nanoid'

/** Generate an 8-character room ID. e.g. 'xK9mP2qR' */
export function generateRoomId(): string {
  return nanoid(8)
}

/** Full shareable URL for a room */
export function getRoomUrl(roomId: string): string {
  return `${window.location.origin}/room/${roomId}`
}

/** Copy the room URL to clipboard. Returns true on success. */
export async function copyRoomUrl(roomId: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(getRoomUrl(roomId))
    return true
  } catch {
    return false
  }
}

/** Recent rooms stored in localStorage (for Landing page quick-access) */
const RECENT_KEY = 'cs_recent_rooms'

export interface RecentRoom {
  id: string
  name: string
  lastVisited: number
}

export function getRecentRooms(): RecentRoom[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function recordRecentRoom(room: RecentRoom): void {
  const existing = getRecentRooms().filter(r => r.id !== room.id)
  const updated  = [room, ...existing].slice(0, 8)
  localStorage.setItem(RECENT_KEY, JSON.stringify(updated))
}

export function removeRecentRoom(id: string): void {
  const updated = getRecentRooms().filter(r => r.id !== id)
  localStorage.setItem(RECENT_KEY, JSON.stringify(updated))
}
