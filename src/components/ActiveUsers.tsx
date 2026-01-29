'use client';

import { useEffect, useState } from 'react';
import { usePresence, UserPresence } from '@/context/PresenceContext';
import { usePathname } from 'next/navigation';

export default function ActiveUsers() {
    const { onlineUsers, currentUser } = usePresence();
    const currentPath = usePathname();
    const [activeList, setActiveList] = useState<any[]>([]);

    // Simple hashing for consistent colors
    const getColor = (username: string) => {
        if (!username) return 'bg-gray-400';
        const colors = [
            'bg-red-500 text-white',
            'bg-blue-500 text-white',
            'bg-green-500 text-white',
            'bg-yellow-500 text-white',
            'bg-purple-500 text-white',
            'bg-pink-500 text-white',
            'bg-indigo-500 text-white',
            'bg-teal-500 text-white',
            'bg-orange-500 text-white',
        ];
        let hash = 0;
        for (let i = 0; i < username.length; i++) {
            hash = username.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    const getInitials = (username: string) => {
        return username ? username.slice(0, 1).toUpperCase() : '?';
    };

    useEffect(() => {
        // 1. Fetch all users (Roster)
        const fetchUsers = async () => {
            try {
                const res = await fetch('/api/users');
                if (res.ok) {
                    const data = await res.json();
                    // data.users is the array
                    const allUsers = data.users || [];

                    // 2. Merge with Online Presence
                    // We want to display EVERYONE.
                    // Status: 
                    // - Online & Same Page -> Bright + Green Dot
                    // - Online & Diff Page -> Faded + Green Dot
                    // - Offline -> Faded + Grey Dot

                    const mergedList = allUsers.map((u: any) => {
                        const onlineSession = onlineUsers.find(ou => ou.username === u.username);
                        return {
                            userId: u.id,
                            username: u.username,
                            isOnline: !!onlineSession,
                            location: onlineSession?.location || null
                        };
                    });

                    // Filter out self
                    const others = mergedList.filter((u: any) => u.username !== currentUser?.username);
                    setActiveList(others);
                }
            } catch (e) {
                console.error("Failed to fetch team roster", e);
            }
        };

        if (currentUser) {
            fetchUsers();
        }
    }, [onlineUsers, currentUser]);

    if (activeList.length === 0) return null;

    return (
        <div className="flex items-center -space-x-2 mr-2">
            {activeList.map((user) => {
                // Logic:
                // If Online: 
                //    - If Same Page: Bright, Green Dot.
                //    - If Diff Page: Faded, Green Dot.
                // If Offline:
                //    - Faded, Grey Dot.

                const isOnline = user.isOnline;
                const isOnSamePage = isOnline && user.location === currentPath;

                return (
                    <div
                        key={user.userId}
                        className={`group relative transition-all duration-300 ${isOnSamePage ? 'opacity-100 z-10' : 'opacity-40 grayscale hover:opacity-100 hover:grayscale-0'}`}
                    >
                        <div
                            className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white 
                        cursor-pointer transition-transform hover:scale-110 hover:z-20
                        ${getColor(user.username)}
                        ${isOnSamePage ? 'ring-2 ring-emerald-400 ring-offset-1' : ''}
                    `}
                            title={`${user.username} (${isOnline ? (isOnSamePage ? 'Viewing this page' : 'Online elsewhere') : 'Offline'})`}
                        >
                            {getInitials(user.username)}

                            {/* Status Dot */}
                            <div className={`absolute top-0 right-0 w-2.5 h-2.5 border-2 border-white rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                        </div>

                        {/* Custom Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-30">
                            {user.username}
                            <span className="opacity-70 ml-1 font-normal text-[9px]">
                                {isOnline ? (isOnSamePage ? '(Here)' : '(Elsewhere)') : '(Offline)'}
                            </span>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900"></div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
