import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    isConfigured: boolean;
    signInWithGoogle: () => Promise<void>;
    signInWithGitHub: () => Promise<void>;
    signOut: () => Promise<void>;
    displayName: string;
    avatarUrl: string | null;
}
const AuthContext = createContext<AuthContextType | null>(null);
export function AuthProvider({ children }: {
    children: React.ReactNode;
}) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        if (!isSupabaseConfigured) {
            setLoading(false);
            return;
        }
        supabase.auth.getSession().then(({ data }) => {
            setSession(data.session);
            setUser(data.session?.user ?? null);
            setLoading(false);
        });
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
        });
        return () => subscription.unsubscribe();
    }, []);
    const signInWithGoogle = useCallback(async () => {
        if (!isSupabaseConfigured)
            return;
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: `${window.location.origin}/dashboard` },
        });
    }, []);
    const signInWithGitHub = useCallback(async () => {
        if (!isSupabaseConfigured)
            return;
        await supabase.auth.signInWithOAuth({
            provider: 'github',
            options: { redirectTo: `${window.location.origin}/dashboard` },
        });
    }, []);
    const signOut = useCallback(async () => {
        if (!isSupabaseConfigured)
            return;
        await supabase.auth.signOut();
    }, []);
    const meta = user?.user_metadata ?? {};
    const displayName = (meta.full_name ?? meta.name ?? meta.user_name ?? user?.email?.split('@')[0] ?? 'Anonymous') as string;
    const avatarUrl = (meta.avatar_url ?? null) as string | null;
    return (<AuthContext.Provider value={{
            user, session, loading,
            isConfigured: isSupabaseConfigured,
            signInWithGoogle, signInWithGitHub, signOut,
            displayName, avatarUrl,
        }}>
      {children}
    </AuthContext.Provider>);
}
export function useAuth(): AuthContextType {
    const ctx = useContext(AuthContext);
    if (!ctx)
        throw new Error('useAuth must be used inside <AuthProvider>');
    return ctx;
}
