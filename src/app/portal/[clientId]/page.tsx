'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Client, Category, Task } from '@/types/database';
import { Users, FileText, Link as LinkIcon, LogOut } from 'lucide-react';
import { getSession, logout } from '@/lib/auth';

// Reuse components but possibly with read-only modifications
// Since TaskSection handles isReadOnly via prop? No, I need to add that prop first.
// Or I can just render a simplified view here to avoid modifying TaskSection too much.
// But utilizing TaskSection is better for consistency.
// Let's modify TaskSection to accept `isReadOnly`.

// Wait, I need to modify TaskSection first to support `isReadOnly`.
// In Step 1502 (Plan), I listed: "[MODIFY] src/components/TaskSection.tsx: Add isReadOnly prop to hide edit controls."

// I will write this file assuming TaskSection has isReadOnly prop.
// I will then update TaskSection.

import TaskSection from '@/components/TaskSection';
import TextBox from '@/components/TextBox';

export default function ClientPortalPage() {
    const params = useParams();
    const clientId = params.clientId as string;
    const router = useRouter();

    const [client, setClient] = useState<Client | null>(null);
    const [categories, setCategories] = useState<any[]>([]); // Using any for simplicity in fetch wrapper
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Logout handler
    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' }); // We need a logout API too? Or just client side cookie delete?
        // Let's implement client side deletion via server action or API.
        // Simpler: Just route to login and let middleware/page handle cleanup? 
        // Actually, I defined `logout()` in `src/lib/auth.ts` but that's server side (cookies).
        // So I need an API route for logout or a server action.
        // I will implement a quick logout API.
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
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Portal Header */}
            <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-40 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                        <Users className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 tracking-tight">{client.name}</h1>
                        <p className="text-xs text-gray-500 font-medium">Client Portal</p>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-50 hover:text-red-600 rounded-lg transition-colors text-sm font-semibold"
                >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                </button>
            </header>

            <main className="flex-1 p-4 md:p-6 lg:p-8 w-full">
                <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)]">
                    {/* Tasks (ReadOnly) - Takes mostly full width now */}
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
                            isReadOnly={true}
                        />
                    </div>

                    {/* Info Panel - Links Only */}
                    <div className="w-full lg:w-80 flex-shrink-0 space-y-6">
                        {/* Links */}
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 font-bold text-gray-900 flex items-center gap-2">
                                <LinkIcon className="w-4 h-4 text-gray-400" /> Important Links
                            </div>
                            <div className="p-6 text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                                {client.important_links || <span className="text-gray-400 italic">No links shared.</span>}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
