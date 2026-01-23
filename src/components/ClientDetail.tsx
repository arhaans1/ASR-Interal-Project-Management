'use client';

import { Client } from '@/types/database';
import { CategoryWithTasks } from '@/hooks/useCategories';
import TaskSection from './TaskSection';
import TextBox from './TextBox';
import { Copy, Settings, Building2, Calendar, Link as LinkIcon, FileText } from 'lucide-react';

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
  onUpdateTask: (categoryId: string, taskId: string, name: string) => Promise<void>;
  onDeleteTask: (categoryId: string, taskId: string) => Promise<void>;
  onToggleTask: (categoryId: string, taskId: string, completed: boolean) => Promise<void>;
}

// Helper for mapped status colors (text only for tags usually, or full badges)
const getStatusBadgeStyles = (status: string) => {
  switch (status) {
    case 'Onboarding':
      return 'bg-[var(--status-onboarding-bg)] text-[var(--status-onboarding-text)]';
    case 'In-Process':
      return 'bg-[var(--status-process-bg)] text-[var(--status-process-text)]';
    case 'On-Hold':
      return 'bg-[var(--status-hold-bg)] text-[var(--status-hold-text)]';
    case 'Ads Launched':
      return 'bg-[var(--status-ads-bg)] text-[var(--status-ads-text)]';
    case 'Closed':
      return 'bg-[var(--status-closed-bg)] text-[var(--status-closed-text)]';
    default:
      return 'bg-gray-100 text-gray-700';
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
}: ClientDetailProps) {
  return (
    <div className="flex-1 h-screen overflow-y-auto">
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
            <button
              onClick={onClone}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all font-medium text-sm shadow-sm"
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
            />
          </div>

          {/* Right Side - Info Cards - Takes 4 columns (1/3) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Important Links - Monochrome */}
            <div className="glass-panel rounded-3xl shadow-[0_15px_30px_-8px_rgba(0,0,0,0.35)] ring-1 ring-black/5 overflow-hidden">
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

            {/* Notes - Monochrome */}
            <div className="glass-panel rounded-3xl shadow-[0_15px_30px_-8px_rgba(0,0,0,0.35)] ring-1 ring-black/5 overflow-hidden">
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
          </div>
        </div>
      </div>
    </div>
  );
}
