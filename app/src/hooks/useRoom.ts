import { useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { generateRoomId, recordRecentRoom } from '@/features/rooms/roomUtils';
import { setLocalRole } from '@/features/rooms/RoomPermissions';
import type { Role } from '@/features/rooms/RoomPermissions';
interface RoomData {
    id: string;
    name: string;
    owner_id: string | null;
    language: string;
    created_at: string;
    last_active: string;
    edit_count: number;
}
interface UseRoomReturn {
    loading: boolean;
    error: string | null;
    createRoom: (name: string, userId?: string) => Promise<string | null>;
    joinRoom: (id: string, userId?: string) => Promise<boolean>;
    getMyRooms: (userId: string) => Promise<RoomData[]>;
    getUserRole: (roomId: string, userId: string) => Promise<Role>;
    incrementEditCount: (roomId: string) => Promise<void>;
}
export function useRoom(): UseRoomReturn {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const createRoom = useCallback(async (name: string, userId?: string): Promise<string | null> => {
        setLoading(true);
        setError(null);
        try {
            const id = generateRoomId();
            if (isSupabaseConfigured && userId) {
                const { error: roomErr } = await supabase
                    .from('rooms')
                    .insert({ id, name, owner_id: userId });
                if (roomErr)
                    throw new Error(roomErr.message);
                await supabase.from('room_members').insert({
                    room_id: id,
                    user_id: userId,
                    role: 'owner',
                });
                setLocalRole(id, userId, 'owner');
            }
            recordRecentRoom({ id, name, lastVisited: Date.now() });
            return id;
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to create room');
            return null;
        }
        finally {
            setLoading(false);
        }
    }, []);
    const joinRoom = useCallback(async (id: string, userId?: string): Promise<boolean> => {
        setLoading(true);
        setError(null);
        try {
            if (isSupabaseConfigured && userId) {
                const { data, error: fetchErr } = await supabase
                    .from('rooms')
                    .select('id, name')
                    .eq('id', id)
                    .single();
                if (fetchErr || !data)
                    throw new Error('Room not found');
                await supabase.from('room_members').upsert({
                    room_id: id,
                    user_id: userId,
                    role: 'editor',
                }, { onConflict: 'room_id,user_id', ignoreDuplicates: true });
                setLocalRole(id, userId, 'editor');
                recordRecentRoom({ id, name: data.name, lastVisited: Date.now() });
            }
            else {
                recordRecentRoom({ id, name: id, lastVisited: Date.now() });
            }
            return true;
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to join room');
            return false;
        }
        finally {
            setLoading(false);
        }
    }, []);
    const getMyRooms = useCallback(async (userId: string): Promise<RoomData[]> => {
        if (!isSupabaseConfigured)
            return [];
        const { data } = await supabase
            .from('room_members')
            .select('rooms(*)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        return (data ?? []).map((d: any) => d.rooms as RoomData).filter(Boolean);
    }, []);
    const getUserRole = useCallback(async (roomId: string, userId: string): Promise<Role> => {
        if (!isSupabaseConfigured)
            return 'editor';
        const { data } = await supabase
            .from('room_members')
            .select('role')
            .eq('room_id', roomId)
            .eq('user_id', userId)
            .single();
        return (data?.role as Role) ?? 'viewer';
    }, []);
    const incrementEditCount = useCallback(async (roomId: string): Promise<void> => {
        if (!isSupabaseConfigured)
            return;
        await supabase.rpc('increment_edit_count', { room_id: roomId });
    }, []);
    return { loading, error, createRoom, joinRoom, getMyRooms, getUserRole, incrementEditCount };
}
