'use client';

import { Client } from '@/types/database';
import { CategoryWithTasks } from '@/hooks/useCategories';
import TaskSection from './TaskSection';
import TextBox from './TextBox';
import { Copy, Settings, Building2 } from 'lucide-react';

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

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Onboarding':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'In-Process':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'On-Hold':
      return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'Ads Launched':
      return 'bg-green-100 text-green-700 border-green-200';
    case 'Closed':
      return 'bg-gray-100 text-gray-700 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
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
    <div className="flex-1 h-screen overflow-y-auto bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
              <div className="flex items-center gap-2 mt-2">
                <Building2 className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">{client.business_name}</span>
              </div>
            </div>
            <span
              className={`px-4 py-1.5 rounded-full text-sm font-medium border ${getStatusColor(
                client.status
              )}`}
            >
              {client.status}
            </span>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tasks Section - Takes 2 columns */}
          <div className="lg:col-span-2">
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
            />
            <TextBox
              title="Notes"
              value={client.notes}
              onChange={(value) => onUpdateClient({ notes: value })}
              placeholder="Add notes here..."
            />
          </div>
        </div>

        {/* Actions Section */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Actions
          </h3>
          <div className="flex gap-3">
            <button
              onClick={onClone}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all font-medium shadow-sm"
            >
              <Copy className="w-4 h-4" />
              Clone Client
            </button>
            <button
              onClick={onUpdateStatus}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all font-medium shadow-md hover:shadow-lg"
            >
              <Settings className="w-4 h-4" />
              Update Status
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
