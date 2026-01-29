
import { useState, useEffect, useRef } from 'react';
import { X, MessageSquare, Minimize2, Maximize2 } from 'lucide-react';
import ChatBubble from './ChatBubble';
import ChatInput from './ChatInput';

interface ChatModalProps {
    isOpen: boolean;
    onClose: () => void;
    clientId: string;
    clientName: string;
    currentUser: any;
}

export default function ChatModal({ isOpen, onClose, clientId, clientName, currentUser }: ChatModalProps) {
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen && clientId) {
            fetchMessages();
            // Poll for new messages every 5 seconds
            const interval = setInterval(fetchMessages, 5000);
            return () => clearInterval(interval);
        }
    }, [isOpen, clientId]);

    useEffect(() => {
        // Scroll to bottom on new messages
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const fetchMessages = async () => {
        try {
            const res = await fetch(`/api/chat/${clientId}`);
            const data = await res.json();
            if (Array.isArray(data)) {
                // Check if we need to update state (simple optimization)
                setMessages(prev => {
                    if (prev.length !== data.length) return data;
                    return prev; // Assume no change if length same for now
                });
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async (content: string, attachments: any[]) => {
        try {
            const res = await fetch(`/api/chat/${clientId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: currentUser?.id, // Should handle null safe
                    username: currentUser?.username || 'Admin', // Fallback
                    content,
                    attachments
                })
            });
            const newMessage = await res.json();
            if (newMessage) {
                setMessages(prev => [...prev, newMessage]);
            }
        } catch (e) {
            console.error(e);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-[400px] h-[600px] flex flex-col overflow-hidden ring-1 ring-black/5">
                {/* Header */}
                <div className="bg-slate-900 p-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/20 rounded-lg">
                            <MessageSquare className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-sm leading-tight">{clientName}</h3>
                            <div className="flex items-center gap-1.5 pt-0.5">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                                <span className="text-[10px] text-emerald-400/80 font-medium uppercase tracking-wider">Team Chat</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 bg-slate-50 overflow-y-auto p-4" ref={scrollRef}>
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 text-center p-6">
                            <MessageSquare className="w-10 h-10 mb-2 opacity-20" />
                            <p className="text-sm font-medium">No messages yet.</p>
                            <p className="text-xs">Start the conversation!</p>
                        </div>
                    ) : (
                        messages.map(msg => (
                            <ChatBubble
                                key={msg.id}
                                message={msg}
                                isCurrentUser={msg.user_id === currentUser?.id}
                            />
                        ))
                    )}
                </div>

                {/* Input */}
                <ChatInput onSend={handleSendMessage} isLoading={false} />
            </div>
        </div>
    );
}
