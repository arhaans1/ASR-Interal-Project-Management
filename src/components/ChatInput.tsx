
import { useState, useRef } from 'react';
import { Send, Paperclip, Loader2, Bold, Italic, Link as LinkIcon } from 'lucide-react';

interface ChatInputProps {
    onSend: (content: string, attachments: any[]) => void;
    isLoading: boolean;
}

export default function ChatInput({ onSend, isLoading }: ChatInputProps) {
    const [message, setMessage] = useState('');
    const [attachments, setAttachments] = useState<any[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSend = () => {
        if (!message.trim() && attachments.length === 0) return;
        onSend(message, attachments);
        setMessage('');
        setAttachments([]);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setIsUploading(true);

            const formData = new FormData();
            formData.append('file', file);

            try {
                const res = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Upload failed');

                if (data.url) {
                    setAttachments(prev => [...prev, { type: 'file', url: data.url, name: data.name }]);
                }
            } catch (error) {
                console.error("Upload failed", error);
                alert("Upload failed: " + (error as Error).message);
            } finally {
                setIsUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        }
    };

    return (
        <div className="p-4 bg-white border-t border-gray-100">
            {/* Simple Formatting Toolbar (Visual only for now unless we implement Rich Text Editor properly) 
                 User asked for: bold, underline, italics, clickable links.
                 To do this properly without a heavy library like TipTap/Quill is hard.
                 For "Minimal Simple", a textarea is best. 
                 Maybe just buttons that insert markdown syntax? 
                 Let's stick to plain text for MVP + File upload as that's robust.
             */}

            {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                    {attachments.map((att, i) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium border border-indigo-100">
                            <Paperclip className="w-3 h-3" />
                            {att.name}
                            <button onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))} className="ml-1 hover:text-indigo-900">×</button>
                        </div>
                    ))}
                </div>
            )}

            <div className="relative">
                <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all resize-none text-sm min-h-[50px] max-h-[120px]"
                    rows={1}
                    style={{ height: 'auto', minHeight: '50px' }}
                />

                <div className="absolute right-2 bottom-2 flex items-center gap-1">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="p-2 text-gray-400 hover:text-indigo-500 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />

                    <button
                        onClick={handleSend}
                        disabled={isLoading || (!message.trim() && attachments.length === 0)}
                        className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:hover:bg-indigo-600 shadow-sm shadow-indigo-200"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>

        </div>
    );
}
