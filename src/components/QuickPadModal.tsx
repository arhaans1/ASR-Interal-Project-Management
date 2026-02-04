'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Plus, Trash2, Loader2, StickyNote } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import QuickPadEditor from './QuickPadEditor';

interface QuickPadModalProps {
    isOpen: boolean;
    onClose: () => void;
    clientId: string;
}

interface Note {
    id: string;
    title: string;
    content: string;
    drawing_data: string;
    updated_at: string;
}

export default function QuickPadModal({ isOpen, onClose, clientId }: QuickPadModalProps) {
    const [notes, setNotes] = useState<Note[]>([]);
    const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch Notes
    const fetchNotes = useCallback(async () => {
        if (!clientId) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('quick_notes')
            .select('*')
            .eq('client_id', clientId)
            .order('updated_at', { ascending: false });

        if (!error && data) {
            setNotes(data);
            if (data.length > 0 && !selectedNoteId) {
                setSelectedNoteId(data[0].id);
            }
        }
        setLoading(false);
    }, [clientId, selectedNoteId]);

    useEffect(() => {
        if (isOpen) {
            fetchNotes();
        }
    }, [isOpen, fetchNotes]);

    const handleCreateNote = async () => {
        const { data, error } = await supabase
            .from('quick_notes')
            .insert({
                client_id: clientId,
                title: 'Untitled Note',
                content: '',
                drawing_data: ''
            })
            .select()
            .single();

        if (!error && data) {
            setNotes([data, ...notes]);
            setSelectedNoteId(data.id);
        }
    };

    const handleDeleteNote = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const { error } = await supabase.from('quick_notes').delete().eq('id', id);
        if (!error) {
            const remaining = notes.filter(n => n.id !== id);
            setNotes(remaining);
            if (selectedNoteId === id) {
                setSelectedNoteId(remaining.length > 0 ? remaining[0].id : null);
            }
        }
    };

    const handleSave = async (content: string, drawing: string) => {
        if (!selectedNoteId) return;

        // NO AUTO-TITLE Generation. Use current title.

        setIsSaving(true);
        // Optimistic update
        setNotes(prev => prev.map(n => n.id === selectedNoteId ? { ...n, content, drawing_data: drawing, updated_at: new Date().toISOString() } : n));

        await supabase
            .from('quick_notes')
            .update({
                content,
                drawing_data: drawing,
                updated_at: new Date().toISOString()
            })
            .eq('id', selectedNoteId);

        setIsSaving(false);
    };

    const handleUpdateTitle = async (newTitle: string) => {
        if (!selectedNoteId) return;

        // Update local
        setNotes(prev => prev.map(n => n.id === selectedNoteId ? { ...n, title: newTitle } : n));

        // Debounce Save to DB (optional, but for simplicity direct update or debounce)
        await supabase
            .from('quick_notes')
            .update({ title: newTitle })
            .eq('id', selectedNoteId);
    }

    const selectedNote = notes.find(n => n.id === selectedNoteId);
    const filteredNotes = notes.filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div className="relative bg-[#F8FAFC] w-full max-w-6xl h-[85vh] rounded-3xl shadow-2xl flex overflow-hidden ring-1 ring-white/20 animate-in fade-in zoom-in-95 duration-200">

                {/* Sidebar */}
                <div className="w-72 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                        <button
                            onClick={handleCreateNote}
                            className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2.5 px-4 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95"
                        >
                            <Plus className="w-5 h-5" />
                            <span>Create new</span>
                        </button>
                    </div>

                    <div className="p-2">
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-1 p-2">
                        {loading && notes.length === 0 ? (
                            <div className="flex items-center justify-center py-10 text-gray-400">
                                <Loader2 className="w-6 h-6 animate-spin" />
                            </div>
                        ) : filteredNotes.length === 0 ? (
                            <div className="text-center py-10 text-gray-400 text-sm">
                                No notes found
                            </div>
                        ) : (
                            filteredNotes.map(note => (
                                <div
                                    key={note.id}
                                    onClick={() => setSelectedNoteId(note.id)}
                                    className={`group flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all ${selectedNoteId === note.id
                                            ? 'bg-gray-100 shadow-sm border border-gray-200'
                                            : 'hover:bg-white hover:shadow-sm border border-transparent'
                                        }`}
                                >
                                    <div className="mt-1 p-1.5 bg-white rounded-lg border border-gray-100 shadow-sm">
                                        <StickyNote className={`w-4 h-4 ${selectedNoteId === note.id ? 'text-blue-500' : 'text-gray-400'}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className={`font-semibold text-sm truncate ${selectedNoteId === note.id ? 'text-gray-900' : 'text-gray-700'}`}>
                                            {note.title || 'Untitled Note'}
                                        </h4>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {new Date(note.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            {note.content ? ' • ' + note.content.replace(/<[^>]*>/g, '').slice(0, 15) + '...' : ' • Blank'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={(e) => handleDeleteNote(note.id, e)}
                                        className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Main Editor Area */}
                <div className="flex-1 flex flex-col bg-[#F8FAFC]">
                    <div className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-6 flex-shrink-0">
                        {/* Editable Title */}
                        {selectedNote ? (
                            <input
                                type="text"
                                value={selectedNote.title}
                                onChange={(e) => handleUpdateTitle(e.target.value)}
                                placeholder="Untitled Note"
                                className="font-semibold text-gray-700 text-lg bg-transparent border-none focus:outline-none focus:ring-0 placeholder-gray-300 w-full max-w-md"
                            />
                        ) : (
                            <span className="font-semibold text-gray-500 text-lg">Select a note</span>
                        )}

                        <div className="flex items-center gap-4">
                            {isSaving && <span className="text-xs text-gray-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Saving...</span>}
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 p-6 overflow-hidden">
                        {selectedNote ? (
                            <QuickPadEditor
                                key={selectedNote.id} // Force remount on note switch
                                initialContent={selectedNote.content}
                                initialDrawing={selectedNote.drawing_data}
                                onSave={handleSave}
                            />
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                <StickyNote className="w-16 h-16 mb-4 opacity-20" />
                                <p className="font-medium">Select or create a note to start</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
