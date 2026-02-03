'use client';

import { useState, useEffect } from 'react';
import { Client } from '@/types/database';
import { CategoryWithTasks } from '@/hooks/useCategories';
import TaskSection from './TaskSection';
import TextBox from './TextBox';
import ConfirmModal from './ConfirmModal';
import { Copy, Settings, Building2, Calendar, Link as LinkIcon, FileText, Trash2, Loader2, Share2, MessageSquare } from 'lucide-react';
import ChatModal from '@/components/ChatModal';
import ActiveUsers from '@/components/ActiveUsers';

interface ClientDetailProps {
  client: Client;
  categories: CategoryWithTasks[];
  onUpdateClient: (updates: Partial<Client>) => void;
  onClone: () => void;
  onUpdateStatus: () => void;
  onCreateCategory: (name: string) => Promise<void>;
  onUpdateCategory: (categoryId: string, name: string) => Promise<void>;
  onDeleteCategory: (categoryId: string) => Promise<void>;
  onCreateTask: (categoryId: string, name: string) => Promise<void>;
  onUpdateTask: (categoryId: string, taskId: string, updates: any) => Promise<void>;
  onDeleteTask: (categoryId: string, taskId: string) => Promise<void>;
  onToggleTask: (categoryId: string, taskId: string, completed: boolean) => Promise<void>;
  onReorderCategory: (categoryId: string, newOrderIndex: number) => Promise<boolean>;
  onReorderTask: (categoryId: string, taskId: string, newOrderIndex: number) => Promise<boolean>;
  onDelete: (id: string) => Promise<void>;
}

// Helper for mapped status colors (text only for tags usually, or full badges)
const getStatusBadgeStyles = (status: string) => {
  switch (status) {
    case 'Active':
      return 'bg-amber-100 text-amber-700'; // Now Orange
    case 'Launched':
      return 'bg-emerald-100 text-emerald-700'; // Now Green
    case 'Team Members':
      return 'bg-blue-100 text-blue-700';
    case 'Templates':
      return 'bg-indigo-100 text-indigo-700';
    case 'Archived':
      return 'bg-gray-100 text-gray-700';
    default:
      return 'bg-amber-100 text-amber-700';
  }
};

export default function ClientDetail({
  client,
  categories,
  onUpdateClient,
  onClone,
  onUpdateStatus,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
  onToggleTask,
  onReorderCategory,
  onReorderTask,
  onDelete, // New prop
}: ClientDetailProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    fetch('/api/auth/me').then(res => res.json()).then(data => setCurrentUser(data.user));
  }, []);

  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Poll for unread messages
    const checkUnread = async () => {
      try {
        // Retrieve last read timestamp
        const lastRead = localStorage.getItem(`chat_last_read_${client.id}`);
        const lastReadDate = lastRead ? new Date(lastRead) : new Date(0); // Default to epoch if never read

        // Fetch latest messages (simple poll)
        // Ideally we'd have a lightweight endpoint, but getting all is "ok" for now per constraint.
        const res = await fetch(`/api/chat/${client.id}`);
        if (res.ok) {
          const messages = await res.json();

          // Count messages newer than lastRead
          const unread = messages.filter((m: any) => new Date(m.created_at) > lastReadDate).length;
          setUnreadCount(unread);
        }
      } catch (e) {
        console.error("Failed to check unread messages");
      }
    };

    checkUnread();
    const interval = setInterval(checkUnread, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [client.id, isChatOpen]); // Re-run if chat closes (to update count after reading)

  // Reset count when opening chat
  useEffect(() => {
    if (isChatOpen) {
      setUnreadCount(0);
      localStorage.setItem(`chat_last_read_${client.id}`, new Date().toISOString());
    }
  }, [isChatOpen, client.id]);


  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete(client.id);
    setIsDeleting(false);
  };
  return (
    <div className="flex-1 h-screen overflow-y-auto">
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Client?"
        message={`Are you sure you want to delete ${client.name}? This action cannot be undone.`}
        confirmLabel="Delete Client"
        isDestructive={true}
      />
      <div className="w-full h-full p-4 md:p-6 lg:p-8 relative">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{client.name}</h1>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusBadgeStyles(
                  client.status
                )}`}
              >
                {client.status}
              </span>
            </div>
            <div className="flex items-center gap-4 text-gray-500 text-sm font-medium">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4" />
                <span>{client.business_name}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>Started {new Date(client.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>


          <div className="flex items-center gap-3">
            {/* Active Users Indicator */}
            <ActiveUsers />

            <button
              onClick={() => {
                const portalUrl = `${window.location.origin}/portal/${client.id}`;
                navigator.clipboard.writeText(portalUrl);
                alert('Portal Link Copied: ' + portalUrl);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors font-semibold text-sm"
              title="Copy Share Link"
            >
              <Share2 className="w-4 h-4" />
              Share Portal
            </button>
            <button
              onClick={onClone}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all font-medium text-sm shadow-sm"
              title="Clone Client"
            >
              <Copy className="w-4 h-4" />
              <span>Clone</span>
            </button>
            <button
              onClick={onUpdateStatus}
              className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-full hover:bg-slate-800 transition-all font-medium text-sm shadow-lg ring-1 ring-white/20"
            >
              <Settings className="w-4 h-4" />
              <span>Status</span>
            </button>
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              disabled={isDeleting}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
              title="Delete Client"
            >
              {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Tasks Section - Takes 8 columns (2/3) */}
          <div className="lg:col-span-8">
            <TaskSection
              categories={categories}
              onCreateCategory={onCreateCategory}
              onUpdateCategory={onUpdateCategory}
              onDeleteCategory={onDeleteCategory}
              onCreateTask={onCreateTask}
              onUpdateTask={onUpdateTask}
              onDeleteTask={onDeleteTask}
              onToggleTask={onToggleTask}
              onReorderCategory={onReorderCategory}
              onReorderTask={onReorderTask}
            />
          </div>

          {/* Right Side - Info Cards - Takes 4 columns (1/3) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Team Chat Button */}
            <button
              onClick={() => setIsChatOpen(true)}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold rounded-2xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-3 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              <MessageSquare className="w-5 h-5 group-hover:scale-110 transition-transform relative z-10" />
              <span className="relative z-10">Open Team Chat</span>

              {/* Notification Badge */}
              {unreadCount > 0 && (
                <div className="absolute top-2 left-2 flex items-center justify-center w-6 h-6 rounded-full bg-red-500 border-2 border-white text-white text-xs font-bold shadow-md z-20 animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </div>
              )}
            </button>

            {/* Notes - Monochrome */}
            <div className="glass-panel prominent-shadow rounded-3xl overflow-hidden">
              <div className="bg-slate-900 px-6 py-4 border-b border-slate-800 flex items-center gap-2 text-white font-semibold backdrop-blur-sm">
                <div className="p-1.5 bg-white/10 rounded-lg shadow-sm ring-1 ring-white/10">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <h3>Notes</h3>
              </div>
              <div className="p-6 pt-2">
                <TextBox
                  value={client.notes}
                  onChange={(value) => onUpdateClient({ notes: value })}
                  placeholder="Add client notes..."
                  className="bg-transparent border-0 focus:bg-transparent min-h-[200px]"
                />
              </div>
            </div>

            {/* Important Links - Monochrome */}
            <div className="glass-panel prominent-shadow rounded-3xl overflow-hidden">
              <div className="bg-slate-900 px-6 py-4 border-b border-slate-800 flex items-center gap-2 text-white font-semibold backdrop-blur-sm">
                <div className="p-1.5 bg-white/10 rounded-lg shadow-sm ring-1 ring-white/10">
                  <LinkIcon className="w-4 h-4 text-white" />
                </div>
                <h3>Important Links</h3>
              </div>
              <div className="p-6 pt-2">
                <TextBox
                  value={client.important_links}
                  onChange={(value) => onUpdateClient({ important_links: value })}
                  placeholder="Paste links here..."
                  className="bg-transparent border-0 focus:bg-transparent min-h-[120px]"
                />
              </div>

            </div>
          </div>
        </div>
      </div>
      {/* Chat Modal */}
      <ChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        clientId={client.id}
        clientName={client.name}
        currentUser={currentUser}
      />
    </div>
  );
}
