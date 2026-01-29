
import { User, Paperclip } from 'lucide-react';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

interface ChatMessage {
    id: string;
    username: string;
    content: string;
    created_at: string;
    user_id: string;
    attachments?: { type: string; url: string; name: string }[];
}

interface ChatBubbleProps {
    message: ChatMessage;
    isCurrentUser: boolean;
}

export default function ChatBubble({ message, isCurrentUser }: ChatBubbleProps) {
    // Format date in IST
    const date = new Date(message.created_at);
    // Convert to IST if needed, or if browser locale handles it. 
    // User specifically asked for IST. 'en-IN' locale usually defaults to proper formatted time if system is IST, 
    // but to be safe lets force timezone display or just rely on standard formatter 'pp' which is clear.
    // For specific IST request:
    const timeString = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    const dateString = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });

    return (
        <div className={`flex gap-3 mb-4 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isCurrentUser ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
                <User className="w-4 h-4" />
            </div>

            <div className={`flex flex-col max-w-[80%] ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-2 mb-1 px-1">
                    <span className="text-xs font-bold text-gray-600">{message.username}</span>
                    <span className="text-[10px] text-gray-400">{dateString} at {timeString}</span>
                </div>

                <div className={`px-4 py-3 rounded-2xl shadow-sm text-sm whitespace-pre-wrap ${isCurrentUser
                    ? 'bg-indigo-600 text-white rounded-tr-sm'
                    : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm'
                    }`}>
                    {message.content.split(/(\s+)/).map((part, i) => {
                        const urlRegex = /^(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.(com|org|net|io|co|in|ai|app|dev)[^\s]*)$/i;
                        if (urlRegex.test(part)) {
                            let href = part;
                            if (!href.startsWith('http')) href = 'https://' + href;
                            return (
                                <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="underline opacity-80 hover:opacity-100" style={{ textDecorationColor: 'currentColor' }}>{part}</a>
                            );
                        }
                        return part;
                    })}
                </div>

                {/* Attachments */}
                {message.attachments && message.attachments.length > 0 && (
                    <div className={`mt-2 flex flex-wrap gap-2 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                        {message.attachments.map((att, idx) => (
                            <a
                                key={idx}
                                href={att.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors border ${isCurrentUser
                                    ? 'bg-indigo-50 border-indigo-100 text-indigo-700 hover:bg-indigo-100'
                                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                <Paperclip className="w-3 h-3" />
                                <span className="truncate max-w-[150px]">{att.name}</span>
                            </a>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
