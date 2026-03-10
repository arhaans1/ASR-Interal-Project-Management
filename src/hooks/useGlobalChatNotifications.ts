'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Client } from '@/types/database';

export function useGlobalChatNotifications(clients: Client[]) {
    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
    const [permissionDenied, setPermissionDenied] = useState(false);
    const previousTotalUnread = useRef(0);

    useEffect(() => {
        // Request notification permissions
        if ('Notification' in window) {
            if (Notification.permission === 'default') {
                Notification.requestPermission().then(permission => {
                    if (permission === 'denied') {
                        setPermissionDenied(true);
                    }
                });
            } else if (Notification.permission === 'denied') {
                setPermissionDenied(true);
            }
        }

        const checkGlobalUnread = async () => {
            // Don't poll if no clients
            if (!clients || clients.length === 0) return;

            try {
                // Fetch recent messages across all clients (limit to avoid huge payloads)
                // We only really need to know if there's anything newer than the local last read timestamp
                const clientIds = clients.map(c => c.id);

                const { data: messages, error } = await supabase
                    .from('chat_messages')
                    .select('id, client_id, created_at, content')
                    .in('client_id', clientIds)
                    // Look at the last week to be safe, or just limit to 100 recent
                    .order('created_at', { ascending: false })
                    .limit(200);

                if (error) throw error;
                if (!messages) return;

                const newUnreadCounts: Record<string, number> = {};
                let currentTotalUnread = 0;

                clients.forEach(client => {
                    const lastReadStr = localStorage.getItem(`chat_last_read_${client.id}`);
                    const lastReadDate = lastReadStr ? new Date(lastReadStr) : new Date(0);

                    const unreadMsgs = messages.filter(
                        m => m.client_id === client.id && new Date(m.created_at) > lastReadDate
                    );

                    if (unreadMsgs.length > 0) {
                        newUnreadCounts[client.id] = unreadMsgs.length;
                        currentTotalUnread += unreadMsgs.length;
                    }
                });

                setUnreadCounts(newUnreadCounts);

                // If total unread went up compared to previous check, alert!
                if (currentTotalUnread > previousTotalUnread.current) {
                    playNotificationAlert(currentTotalUnread);
                }

                // Update document title and icon based on having ANY unread messages
                updateDocumentContext(currentTotalUnread);

                previousTotalUnread.current = currentTotalUnread;

            } catch (err) {
                console.error('Failed to fetch global unread chats:', err);
            }
        };

        // Listen for manual read events from ChatModal/ClientDetail
        const handleChatRead = () => {
            // Trigger an immediate re-check to clear badges
            checkGlobalUnread();
        };

        window.addEventListener('chat_read_updated', handleChatRead);

        // Initial check
        checkGlobalUnread();

        // Poll every 10 seconds
        const interval = setInterval(checkGlobalUnread, 10000);

        return () => {
            clearInterval(interval);
            window.removeEventListener('chat_read_updated', handleChatRead);
            // reset doc title if unmounting
            updateDocumentContext(0);
        };
    }, [clients]);

    const playNotificationAlert = (count: number) => {
        // 1. Play Sound
        try {
            // Short pop sound base64
            const popSound = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU5LjE2LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAOAAAEcAAZGRkZGRkZGRkZGRkZGRkZGRkZGRkZJycnJycnJycnJycnJycnJycnJycnMzMzMzMzMzMzMzMzMzMzMzMzMzMzT09PT09PT09PT09PT09PT09PT09PWVlZWVlZWVlZWVlZWVlZWVlZWVlZYWFhYWFhYWFhYWFhYWFhYWFhYWFhcXFxcXFxcXFxcXFxcXFxcXFxcXF3d3d3d3d3d3d3d3d3d3d3d3d3d3eHh4eHh4eHh4eHh4eHh4eHh4eHh4mJiYmJiYmJiYmJiYmJiYmJiYmJicnJycnJycnJycnJycnJycnJycnJ1NTU1NTU1NTU1NTU1NTU1NTU1NTU3d3d3d3d3d3d3d3d3d3d3d3d3d3d6enp6enp6enp6enp6enp6enp6enp+fn5+fn5+fn5+fn5+fn5+fn5+fn5AAAAAExhdmM1OS4xOAAL//OEAAAAAAwBkQQAAMwAAA0gAABZSAyZk/4oAAf/8f///0T/RP9E/0R9QAAABN//h4eAP/OEAeAAAnGQU1gAAMAAANSAAAQZ0CDEm/4gAAf/x/4YwZ1E/yIgAAAALn/18//PEAcAAAmk4cMgAAMAAANSAAAQk2LgA0+4kAD/8H0NTEk30sAAAi//7T//OEAoAAAj2QXswAAMAAANSAAAQDMC/E3/4QAv/yP/2P//iAAAAAiD/6wAA//PEAsAAAikYXkwAAMAAANSAAAQy0LcBw+IcP/+L/yqjK//sAAAAkZ/90A//OEA0AAAiUYXUgAAMAAANSAAAQnKLiAQ/4MB/+N/+Z4+f//8AAAiT/8oAA//PEA8AAAim4WkgAAMAAANSAAAQaYLSBQ/IH//7/85qf/+6AAAKP/7z//OEBMAAAimYXcgAAMAAANSAAAQeGK6gA+YL/8//y/T/+bAAAAoV/64AAP/PEBUAAAiE4WMAAAMAAANSAAAQK+KmgA94L/8H/xjD/+VAAAARr/6YAA//OEBkAAAhqYVsAAAMAAANSAAAQLSKigE9IP/4v/iS//tAAAAI8//sAAP/PEB0AAAhSYVMAAAMAAANSAAAQHgKagA8YM/8b/xH//jQAAACG//kAAP/OECIAAQhaYU0AAAMAAANSAAAQGAKKAE7wE//+z/9c//8MAAAAJh/+GA//PECUAQQheYWIAOygAANSAAACxM9AAAR///9v//7f/hQAAAAAAAAAAI//mAA=';

            const playPop = () => {
                const audio = new Audio(popSound);
                audio.volume = 0.5;
                audio.play().catch(e => console.error("Audio play failed (maybe autoplay policy?):", e));
            };

            // Play 3 times for better noticeability
            playPop();
            setTimeout(playPop, 200);
            setTimeout(playPop, 400);

        } catch (e) {
            console.error(e);
        }

        // 2. Trigger OS Notification
        if ('Notification' in window && Notification.permission === 'granted') {
            try {
                new Notification('ASR Media Pro', {
                    body: `You have ${count} unread team chat message${count > 1 ? 's' : ''}!`,
                    icon: '/favicon-unread.png' // Usually helps to have an absolute or public path here
                });
            } catch (e) {
                console.error("OS Notification failed", e);
            }
        }
    };

    const updateDocumentContext = (count: number) => {
        // Update Title
        const baseTitle = 'ASR Internal'; // Basic original title approx
        if (count > 0) {
            document.title = `(${count}) ${baseTitle}`;
        } else {
            document.title = baseTitle;
        }

        // Update Favicon
        // Find the link element
        let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
        if (!link) {
            link = document.createElement('link');
            link.type = 'image/x-icon';
            link.rel = 'shortcut icon';
            document.getElementsByTagName('head')[0].appendChild(link);
        }

        if (count > 0) {
            // You can use a generic data URI with a red dot, or refer to a real file in /public/favicon-unread.ico
            // We will assume a file /favicon-unread.ico exists, falling back to a quick data URI for immediate effect
            link.href = '/favicon-unread.ico'; // Will create this later or use fallback
        } else {
            link.href = '/favicon.ico';
        }
    };

    return {
        unreadCounts,
        permissionDenied
    };
}
