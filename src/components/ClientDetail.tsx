'use client';

import { Client } from '@/types/database';
import { CategoryWithTasks } from '@/hooks/useCategories';
import TaskSection from './TaskSection';
import TextBox from './TextBox';
import { Copy, Settings, Building2, Briefcase } from 'lucide-react';

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

const getStatusStyles = (status: string) => {
  switch (status) {
    case 'Onboarding':
      return 'bg-blue-100 text-blue-700';
    case 'In-Process':
      return 'bg-amber-100 text-amber-700';
    case 'On-Hold':
      return 'bg-orange-100 text-orange-700';
    case 'Ads Launched':
      return 'bg-emerald-100 text-emerald-700';
    case 'Closed':
      return 'bg-slate-100 text-slate-600';
    default:
      return 'bg-slate-100 text-slate-600';
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
      <div className="max-w-7xl mx-auto p-8">
        {/* Header Card */}
        <div className="bg-white rounded-3xl p-8 shadow-sm mb-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                <Briefcase className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-800">{client.name}</h1>
                <div className="flex items-center gap-2 mt-2">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-500 font-medium">{client.business_name}</span>
                </div>
              </div>
            </div>
            <span
              className={`px-5 py-2 rounded-full text-sm font-semibold ${getStatusStyles(
                client.status
              )}`}
            >
              {client.status}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mt-8 pt-6 border-t border-slate-100">
            <button
              onClick={onClone}
              className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all font-semibold"
            >
              <Copy className="w-5 h-5" />
              Clone Client
            </button>
            <button
              onClick={onUpdateStatus}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all font-semibold shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 hover:-translate-y-0.5"
            >
              <Settings className="w-5 h-5" />
              Update Status
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Tasks Section - Takes 2 columns */}
          <div className="xl:col-span-2">
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

          {/* Right Side - Important Links & Notes */}
          <div className="space-y-6">
            <TextBox
              title="Important Links"
              value={client.important_links}
              onChange={(value) => onUpdateClient({ important_links: value })}
              placeholder="Add important links here..."
              icon="link"
            />
            <TextBox
              title="Notes"
              value={client.notes}
              onChange={(value) => onUpdateClient({ notes: value })}
              placeholder="Add notes here..."
              icon="note"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
