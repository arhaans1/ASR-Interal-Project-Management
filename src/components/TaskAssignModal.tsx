'use client';

import { useState, useEffect, useRef } from 'react';
import { User, Check, Search, X } from 'lucide-react';

interface TaskAssignModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAssign: (teamMemberId: string, teamMemberName: string) => void;
    currentAssigneeId?: string | null;
    taskId: string;
}

export default function TaskAssignModal({
    isOpen,
    onClose,
    onAssign,
    currentAssigneeId,
}: TaskAssignModalProps) {
    const [teamMembers, setTeamMembers] = useState<{ id: string; name: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            fetchTeamMembers();
        }
    }, [isOpen]);

    // Click outside listener
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    const fetchTeamMembers = async () => {
        setLoading(true);
        try {
            // Names only: what is on each person's board stays private.
            const res = await fetch('/api/team-boards');
            if (!res.ok) throw new Error('Failed to load the team');
            setTeamMembers(await res.json());
        } catch (err) {
            console.error('Failed to fetch team members', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredMembers = teamMembers.filter(m =>
        m.name.toLowerCase().includes(search.toLowerCase())
    );

    const getInitials = (name: string) => name.slice(0, 1).toUpperCase();
    const getRandomColor = (name: string) => {
        const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-teal-500'];
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div
                ref={modalRef}
                className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
            >
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <User className="w-4 h-4 text-indigo-600" />
                        Assign Task
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                        <X className="w-4 h-4 text-gray-500" />
                    </button>
                </div>

                <div className="p-3">
                    <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search team..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                            autoFocus
                        />
                    </div>

                    <div className="max-h-[300px] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                        {loading ? (
                            <div className="text-center py-6 text-gray-400 text-sm">Loading team...</div>
                        ) : filteredMembers.length === 0 ? (
                            <div className="text-center py-6 text-gray-400 text-sm">No members found</div>
                        ) : (
                            filteredMembers.map(member => (
                                <button
                                    key={member.id}
                                    onClick={() => onAssign(member.id, member.name)}
                                    className={`w-full flex items-center justify-between p-3 rounded-xl hover:bg-indigo-50 transition-all group ${currentAssigneeId === member.id ? 'bg-indigo-50 ring-1 ring-indigo-500/30' : ''}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm ${getRandomColor(member.name)}`}>
                                            {getInitials(member.name)}
                                        </div>
                                        <span className={`font-medium ${currentAssigneeId === member.id ? 'text-indigo-700' : 'text-gray-700'}`}>
                                            {member.name}
                                        </span>
                                    </div>
                                    {currentAssigneeId === member.id && (
                                        <Check className="w-4 h-4 text-indigo-600" />
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
