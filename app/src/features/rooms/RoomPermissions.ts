export type Role = 'owner' | 'editor' | 'viewer';
export function canEdit(role: Role | null): boolean {
    return role === 'owner' || role === 'editor';
}
export function canManage(role: Role | null): boolean {
    return role === 'owner';
}
export function canView(role: Role | null): boolean {
    return role !== null;
}
const ROLES_KEY = 'cs_room_roles';
interface RoleEntry {
    roomId: string;
    userId: string;
    role: Role;
}
function loadRoles(): RoleEntry[] {
    try {
        return JSON.parse(localStorage.getItem(ROLES_KEY) ?? '[]');
    }
    catch {
        return [];
    }
}
export function setLocalRole(roomId: string, userId: string, role: Role): void {
    const roles = loadRoles().filter(r => !(r.roomId === roomId && r.userId === userId));
    roles.push({ roomId, userId, role });
    localStorage.setItem(ROLES_KEY, JSON.stringify(roles));
}
export function getLocalRole(roomId: string, userId: string): Role | null {
    return loadRoles().find(r => r.roomId === roomId && r.userId === userId)?.role ?? null;
}
