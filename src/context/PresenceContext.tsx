'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { usePathname } from 'next/navigation';

export interface UserPresence {
    userId: string;
    username: string;
    location: string; // URL path or ID
    online_at: string;
}

interface PresenceContextType {
    onlineUsers: UserPresence[];
    currentUser: any;
}

const PresenceContext = createContext<PresenceContextType>({
    onlineUsers: [],
    currentUser: null,
});

export function PresenceProvider({ children }: { children: ReactNode }) {
    const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const pathname = usePathname();

    // 1. Fetch Current User
    useEffect(() => {
        fetch('/api/auth/me')
            .then((res) => res.json())
            .then((data) => {
                if (data.user) setCurrentUser(data.user);
            })
            .catch((err) => console.error('Failed to fetch user for presence', err));
    }, []);

    // 2. Realtime Subscription
    useEffect(() => {
        if (!currentUser) return;

        const channel = supabase.channel('global-presence', {
            config: {
                presence: {
                    key: currentUser.id,
                },
            },
        });

        channel
            .on('presence', { event: 'sync' }, () => {
                const newState = channel.presenceState<UserPresence>();
                const users: UserPresence[] = [];

                for (const key in newState) {
                    if (newState[key].length > 0) {
                        // Take the most recent state for this user
                        // If a user has multiple tabs, we usually want the most recent 'active' one 
                        // or just list them once.
                        // Let's sort by online_at descending to get latest
                        const sorted = newState[key].sort((a, b) =>
                            new Date(b.online_at).getTime() - new Date(a.online_at).getTime()
                        );
                        users.push(sorted[0]);
                    }
                }
                setOnlineUsers(users);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        userId: currentUser.id,
                        username: currentUser.username,
                        location: pathname, // Track current path
                        online_at: new Date().toISOString(),
                    });
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUser, pathname]); // Re-track when pathname changes!

    // 3. Update Location on Path Change
    useEffect(() => {
        if (!currentUser) return;

        // We need to re-track to update the location in the presence state.
        // The dependency [pathname] in the main effect handles this re-subscription/tracking mechanism 
        // because `channel.track` can be called anytime, but usually requires an active channel.
        // The simplest way to ensure 'track' is called with new location is to tear down and recreating 
        // the channel or just calling track on the existing channel.
        //
        // Optimization: Don't tear down channel, just update track.
        // But `supabase.channel` cache might complicate things.
        // Let's rely on the dependency array above tearing down and reconnecting. 
        // It's robust for "location change".
        //
        // Actually, 'channel' object needs to be same. 
        // Let's Refactor slightly for cleaner "update" without reconnect.
    }, [pathname]);

    return (
        <PresenceContext.Provider value={{ onlineUsers, currentUser }}>
            {children}
        </PresenceContext.Provider>
    );
}

export const usePresence = () => useContext(PresenceContext);
