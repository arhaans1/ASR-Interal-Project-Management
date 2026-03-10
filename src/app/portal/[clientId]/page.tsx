'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Client, Category, Task } from '@/types/database';
import { Users, FileText, Link as LinkIcon, LogOut, LayoutDashboard, LifeBuoy, ChevronRight, Mail } from 'lucide-react';
import TaskSection from '@/components/TaskSection';
import RichTextDisplay from '@/components/RichTextDisplay';

export default function ClientPortalPage() {
    const params = useParams();
    const clientId = params.clientId as string;
    const router = useRouter();

    const [client, setClient] = useState<Client | null>(null);
    const [categories, setCategories] = useState<any[]>([]); // Using any for simplicity in fetch wrapper
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeView, setActiveView] = useState<'tracker' | 'support'>('tracker');

    // Logout handler
    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                // 1. Fetch Client
                const { data: clientData, error: clientError } = await supabase
                    .from('clients')
                    .select('*')
                    .eq('id', clientId)
                    .single();

                if (clientError) throw clientError;
                setClient(clientData);

                // 2. Fetch Categories & Tasks
                // Step 1: Fetch Categories
                const { data: categoriesData, error: catError } = await supabase
                    .from('categories')
                    .select('*')
                    .eq('client_id', clientId)
                    .order('order_index');

                if (catError) throw catError;

                // Step 2: Fetch All Tasks for these categories
                const categoryIds = (categoriesData || []).map((c: any) => c.id);

                const { data: allTasks, error: taskError } = await supabase
                    .from('tasks')
                    .select('*')
                    .in('category_id', categoryIds)
                    .order('order_index');

                if (taskError) throw taskError;

                // Merge tasks into categories
                const categoriesWithTasks = (categoriesData || []).map((cat: any) => ({
                    ...cat,
                    tasks: (allTasks || []).filter((t: any) => t.category_id === cat.id)
                }));

                setCategories(categoriesWithTasks);

            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (clientId) {
            fetchData();
        }
    }, [clientId]);


    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-50">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error || !client) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
                    <p className="text-gray-500 mt-2">Unable to load project data.</p>
                    <button onClick={() => router.push('/login')} className="mt-4 text-indigo-600 font-medium hover:underline">Return to Login</button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar (Client Portal Version) */}
            <aside className="w-72 bg-[#0F172A]/95 text-white flex-shrink-0 flex flex-col h-screen sticky top-0 backdrop-blur-3xl border-r border-white/5 shadow-2xl z-50">
                {/* Logo Area */}
                <div className="p-6 pb-8 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.5)]">
                            <span className="font-bold text-lg text-white tracking-widest">ASR</span>
                        </div>
                        <div>
                            <h1 className="font-bold text-lg tracking-tight text-white leading-none">Portal</h1>
                            <p className="text-[10px] text-indigo-200/60 font-medium tracking-wider mt-1 uppercase">Client Access</p>
                        </div>
                    </div>
                </div>

                {/* Client Info */}
                <div className="px-6 py-6 border-b border-white/5">
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 shadow-inner">
                        <p className="text-xs text-gray-400 font-medium mb-1 uppercase tracking-wider">Logged in as</p>
                        <h3 className="font-bold text-white text-base truncate">{client.name}</h3>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    <button
                        onClick={() => setActiveView('tracker')}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group ${activeView === 'tracker'
                            ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)] ring-1 ring-indigo-400/50'
                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                            }`}
                    >
                        <LayoutDashboard className={`w-5 h-5 ${activeView === 'tracker' ? 'text-white' : 'text-slate-500 group-hover:text-indigo-400'} transition-colors`} />
                        <span className="font-semibold text-sm">Progress Tracker</span>
                        {activeView === 'tracker' && <ChevronRight className="w-4 h-4 ml-auto text-indigo-200" />}
                    </button>

                    <button
                        onClick={() => setActiveView('support')}
                        className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group ${activeView === 'support'
                            ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)] ring-1 ring-indigo-400/50'
                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                            }`}
                    >
                        <LifeBuoy className={`w-5 h-5 ${activeView === 'support' ? 'text-white' : 'text-slate-500 group-hover:text-indigo-400'} transition-colors`} />
                        <span className="font-semibold text-sm">Raise Support Ticket</span>
                        {activeView === 'support' && <ChevronRight className="w-4 h-4 ml-auto text-indigo-200" />}
                    </button>
                </nav>

                {/* Logout */}
                <div className="p-4 border-t border-white/5">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 border border-transparent transition-all duration-300 group"
                    >
                        <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        <span className="font-semibold text-sm">Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto h-screen bg-slate-50/50">
                {/* Mobile Header (Hidden on Desktop) could go here if needed */}

                <div className="p-8 lg:p-10 max-w-[1600px] mx-auto w-full">
                    {activeView === 'tracker' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div>
                                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Project Progress</h2>
                                <p className="text-slate-500 mt-1">Track your project tasks and important resources.</p>
                            </div>

                            <div className="flex flex-col xl:flex-row gap-8 h-[calc(100vh-200px)]">
                                {/* Tasks (ReadOnly) */}
                                <div className="flex-1 overflow-hidden h-full">
                                    <TaskSection
                                        categories={categories}
                                        onCreateCategory={async () => { }}
                                        onUpdateCategory={async () => { }}
                                        onDeleteCategory={async () => { }}
                                        onCreateTask={async () => { }}
                                        onUpdateTask={async () => { }}
                                        onDeleteTask={async () => { }}
                                        onToggleTask={async () => { }} // Read only!
                                        onReorderCategory={async () => false}
                                        onReorderTask={async () => false}
                                        onMoveTask={async () => false}
                                        isReadOnly={true}
                                    />
                                </div>

                                {/* Info Panel - Links Only */}
                                <div className="w-full xl:w-96 flex-shrink-0 space-y-6">
                                    {/* Links */}
                                    <div className="bg-white rounded-3xl shadow-sm border border-gray-200/60 overflow-hidden sticky top-0">
                                        <div className="bg-slate-900 px-6 py-5 border-b border-gray-100 flex items-center gap-3">
                                            <div className="p-1.5 bg-white/10 rounded-lg">
                                                <LinkIcon className="w-4 h-4 text-white" />
                                            </div>
                                            <span className="font-bold text-white text-sm tracking-wide uppercase">Important Links</span>
                                        </div>
                                        <div className="p-6 min-h-[150px]">
                                            {client.important_links ? (
                                                <RichTextDisplay content={client.important_links} />
                                            ) : (
                                                <div className="flex flex-col items-center justify-center h-24 text-gray-400 italic text-sm">
                                                    <LinkIcon className="w-8 h-8 mb-2 opacity-20" />
                                                    No links shared yet.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeView === 'support' && (
                        <div className="max-w-2xl mx-auto py-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="text-center mb-10">
                                <div className="w-20 h-20 bg-indigo-100/50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-100">
                                    <LifeBuoy className="w-10 h-10" />
                                </div>
                                <h2 className="text-4xl font-bold text-slate-900 tracking-tight mb-4">Need Help?</h2>
                                <p className="text-lg text-slate-500 leading-relaxed max-w-md mx-auto">
                                    We are here to assist you. If you have any queries, issues, or feedback, please reach out to our support team.
                                </p>
                            </div>

                            <div className="bg-white rounded-3xl p-10 shadow-xl border border-gray-100 text-center relative overflow-hidden group">
                                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500" />

                                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center justify-center gap-2">
                                    <Mail className="w-5 h-5 text-indigo-500" />
                                    Drop us an email at
                                </h3>

                                <div className="bg-slate-50 rounded-2xl p-6 border-2 border-dashed border-slate-200 group-hover:border-indigo-200 transition-colors mb-8">
                                    <a href="mailto:support@asrmediapro.com" className="text-3xl lg:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600 hover:to-indigo-500 transition-all font-mono break-all">
                                        support@asrmediapro.com
                                    </a>
                                </div>

                                <div className="text-sm text-gray-400 font-medium">
                                    Our team typically responds within 24-48 hours.
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
