'use client';

import { useState, useEffect, useMemo } from 'react';
import { Client } from '@/types/database';
import { funnelLabel } from '@/lib/funnelTemplates';
import { summarizeProject } from '@/lib/progress';
import { CategoryWithTasks } from '@/hooks/useCategories';
import TaskSection from './TaskSection';
import TextBox from './TextBox';
import ConfirmModal from './ConfirmModal';
import { Copy, Settings, Building2, Calendar, Link as LinkIcon, FileText, Trash2, Loader2, Share2, MessageSquare, StickyNote, Check, UserCog, FolderOpen, ClipboardCheck } from 'lucide-react';
import ChatModal from '@/components/ChatModal';
import ActiveUsers from '@/components/ActiveUsers';
import QuickPadModal from './QuickPadModal';

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
  onMoveTask: (sourceCategoryId: string, targetCategoryId: string, taskId: string, newOrderIndex: number) => Promise<boolean>;
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
  onMoveTask,
  onDelete, // New prop
}: ClientDetailProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isQuickPadOpen, setIsQuickPadOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    fetch('/api/auth/me').then(res => res.json()).then(data => setCurrentUser(data.user));
  }, []);

  const [unreadCount, setUnreadCount] = useState(0);
  const [linkCopied, setLinkCopied] = useState(false);
  const [operatorName, setOperatorName] = useState<string | null>(null);

  // Name of the operator running this project
  useEffect(() => {
    setOperatorName(null);
    if (!client.operator_id) return;
    let cancelled = false;
    fetch('/api/users')
      .then((res) => (res.ok ? res.json() : []))
      .then((users: any[]) => {
        if (!cancelled) setOperatorName(users.find((u) => u.id === client.operator_id)?.username ?? null);
      })
      .catch(() => { });
    return () => { cancelled = true; };
  }, [client.operator_id]);

  // What the client still owes us, straight from the board
  const summary = useMemo(() => summarizeProject(categories), [categories]);

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

      // Notify global chat hook to clear the badge instantly
      window.dispatchEvent(new CustomEvent('chat_read_updated'));
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
            <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
              <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">{client.name}</h1>
              <span
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${getStatusBadgeStyles(
                  client.status
                )}`}
              >
                {client.status}
              </span>
              {summary.stage.key === 'pending_approval' && (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 ring-1 ring-amber-300">
                  Pending client approval
                </span>
              )}
              {client.funnel_type && (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-slate-900 text-white">
                  {funnelLabel(client.funnel_type)}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-500 text-sm font-medium">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4" />
                <span>{client.business_name}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>Started {new Date(client.created_at).toLocaleDateString()}</span>
              </div>
              {client.operator_id && (
                <div className="flex items-center gap-1.5">
                  <UserCog className="w-4 h-4" />
                  <span>Operator: {operatorName ?? '…'}</span>
                </div>
              )}
              {client.drive_folder_url && (
                <a
                  href={client.drive_folder_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 underline decoration-slate-300 underline-offset-4"
                >
                  <FolderOpen className="w-4 h-4 text-amber-500" />
                  Drive folder
                </a>
              )}
            </div>
            {summary.hasOnboarding && (
              <div
                className={`mt-3 inline-flex items-center gap-2.5 rounded-full pl-2.5 pr-3.5 py-1.5 text-xs font-semibold ring-1 ${summary.onboardingComplete
                  ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
                  : 'bg-violet-50 text-violet-800 ring-violet-200'
                  }`}
                title="Ticked by the client in their portal"
              >
                <ClipboardCheck className="w-4 h-4" />
                {summary.onboardingComplete
                  ? 'Client onboarding complete'
                  : `Client onboarding ${summary.onboardingDone} of ${summary.onboardingTasks.length}`}
                {!summary.onboardingComplete && (
                  <span className="w-20 h-1.5 rounded-full bg-violet-200 overflow-hidden">
                    <span
                      className="block h-full rounded-full bg-violet-600 transition-all duration-500"
                      style={{ width: `${(summary.onboardingDone / summary.onboardingTasks.length) * 100}%` }}
                    />
                  </span>
                )}
              </div>
            )}
          </div>


          <div className="flex items-center gap-3">
            {/* Active Users Indicator */}
            <ActiveUsers />

            <button
              onClick={() => {
                // One address for every client: they sign in and land on their own portal.
                const portalUrl = `${window.location.origin}/client-login`;
                navigator.clipboard.writeText(portalUrl);
                setLinkCopied(true);
                setTimeout(() => setLinkCopied(false), 2000);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-colors font-semibold text-sm shadow-sm whitespace-nowrap"
              title="Copy the client login link. The client signs in with the username and password on this card."
            >
              {linkCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
              {linkCopied ? 'Login link copied' : 'Share Portal'}
            </button>
            <button
              onClick={onClone}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-colors font-semibold text-sm shadow-sm"
              title="Clone Client"
            >
              <Copy className="w-4 h-4" />
              <span>Clone</span>
            </button>
            <button
              onClick={onUpdateStatus}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors font-semibold text-sm shadow-sm"
            >
              <Settings className="w-4 h-4" />
              <span>Edit</span>
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
              // Cards built from a funnel template run one phase at a time
              sequential={Boolean(client.funnel_type)}
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
              onMoveTask={onMoveTask}
            />
          </div>

          {/* Right Side - Info Cards - Takes 4 columns (1/3) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Action Buttons Row */}
            <div className="flex gap-4">
              {/* Team Chat Button */}
              <button
                onClick={() => setIsChatOpen(true)}
                className="flex-1 py-3.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-2xl transition-colors shadow-sm flex items-center justify-center gap-2.5 relative"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Open Team Chat</span>

                {/* Notification Badge */}
                {unreadCount > 0 && (
                  <div className="absolute -top-2 -right-2 flex items-center justify-center w-6 h-6 rounded-full bg-red-500 border-2 border-white text-white text-xs font-bold shadow-md z-20 animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </div>
                )}
              </button>

              {/* Quick Pad Button */}
              <button
                onClick={() => setIsQuickPadOpen(true)}
                className="flex-1 py-3.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-800 text-sm font-semibold rounded-2xl transition-colors shadow-sm flex items-center justify-center gap-2.5"
              >
                <StickyNote className="w-4 h-4 text-indigo-600" />
                <span>Open Quick Pad</span>
              </button>
            </div>

            {/* Notes */}
            <div className="glass-panel prominent-shadow rounded-2xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200/80 flex items-center gap-2.5 text-slate-900 font-bold text-sm">
                <div className="p-1.5 bg-slate-100 rounded-lg">
                  <FileText className="w-4 h-4 text-slate-600" />
                </div>
                <h3>Notes</h3>
              </div>
              <div className="p-6 pt-2">
                <TextBox
                  key={`notes-${client.id}`}
                  value={client.notes}
                  onChange={(value) => onUpdateClient({ notes: value })}
                  placeholder="Add client notes..."
                  className="bg-transparent border-0 focus:bg-transparent min-h-[200px]"
                />
              </div>
            </div>

            {/* Important Links */}
            <div className="glass-panel prominent-shadow rounded-2xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200/80 flex items-center gap-2.5 text-slate-900 font-bold text-sm">
                <div className="p-1.5 bg-slate-100 rounded-lg">
                  <LinkIcon className="w-4 h-4 text-slate-600" />
                </div>
                <h3>Important Links</h3>
              </div>
              <div className="p-6 pt-2">
                <TextBox
                  key={`links-${client.id}`}
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

      <QuickPadModal
        isOpen={isQuickPadOpen}
        onClose={() => setIsQuickPadOpen(false)}
        clientId={client.id}
      />
    </div>
  );
}
