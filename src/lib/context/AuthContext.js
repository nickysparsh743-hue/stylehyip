'use client';

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { createSupabaseBrowserClient } from '../supabase/client';

const AuthContext = createContext(null);

const normalizeRole = (value) => {
    if (!value || typeof value !== 'string') {
        return null;
    }
    return value.trim().toLowerCase();
};

export function AuthProvider({ children }) {
    const [supabase] = useState(() => createSupabaseBrowserClient());
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [role, setRole] = useState(null);
    const [loading, setLoading] = useState(true);

    const loadProfile = useCallback(async (userId, metadataRole) => {
        if (!userId) {
            setProfile(null);
            setRole(null);
            return null;
        }

        const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
        if (error) {
            console.error(error);
            setProfile(null);
            setRole(null);
            return null;
        }

        const nextProfile = data || null;
        const nextRole = normalizeRole(nextProfile?.role) || normalizeRole(metadataRole);
        setProfile(nextProfile);
        setRole(nextRole);
        return nextProfile;
    }, [supabase]);

    useEffect(() => {
        let subscription;

        async function loadSession() {
            const {
                data: { session },
            } = await supabase.auth.getSession();
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            if (currentUser) {
                await loadProfile(currentUser.id, currentUser.user_metadata?.role);
            } else {
                setProfile(null);
                setRole(null);
            }
            setLoading(false);

            subscription = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
                const nextUser = nextSession?.user ?? null;
                setUser(nextUser);
                if (nextUser) {
                    await loadProfile(nextUser.id, nextUser.user_metadata?.role);
                } else {
                    setProfile(null);
                    setRole(null);
                }
            });
        }

        loadSession();

        return () => {
            if (subscription?.data?.subscription) {
                subscription.data.subscription.unsubscribe();
            }
        };
    }, [loadProfile, supabase]);

    const signUp = async () => {
        return { error: new Error('Public registration is disabled. Please sign in with an invitation from the store admin.') };
    };

    const signIn = async ({ email, password }) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error || !data?.user) {
            return { data, error };
        }

        setUser(data.user);
        const nextProfile = await loadProfile(data.user.id, data.user.user_metadata?.role);
        return { data, error, profile: nextProfile };
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        setRole(null);
    };

    const refreshProfile = async (userId = user?.id) => {
        return loadProfile(userId);
    };

    const value = useMemo(
        () => ({ user, profile, role, loading, signUp, signIn, signOut, supabase, refreshProfile }),
        [user, profile, role, loading, supabase, refreshProfile]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}
