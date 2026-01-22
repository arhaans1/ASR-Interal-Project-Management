'use client';

import { useState, useEffect } from 'react';
import { useClients } from '@/hooks/useClients';
import { useCategories } from '@/hooks/useCategories';
import { Client, ClientStatus } from '@/types/database';
import Sidebar from '@/components/Sidebar';
import ClientDetail from '@/components/ClientDetail';
import ClientModal from '@/components/ClientModal';
import { Briefcase, Plus, Sparkles } from 'lucide-react';

export default function Home() {
  const {
    activeClients,
    inactiveClients,
    loading: clientsLoading,
    createClient,
    updateClient,
    cloneClient,
  } = useClients();

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');

  const {
    categories,
    createCategory,
    updateCategory,
    deleteCategory,
    createTask,
    updateTask,
    deleteTask,
    toggleTask,
  } = useCategories(selectedClient?.id || null);

  // Update selected client when clients change
  useEffect(() => {
    if (selectedClient) {
      const updated = [...activeClients, ...inactiveClients].find(
        (c) => c.id === selectedClient.id
      );
      if (updated) {
        setSelectedClient(updated);
      }
    }
  }, [activeClients, inactiveClients, selectedClient]);

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
  };

  const handleAddNew = () => {
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleUpdateStatus = () => {
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (
    name: string,
    businessName: string,
    status: ClientStatus
  ) => {
    if (modalMode === 'create') {
      const newClient = await createClient(name, businessName, status);
      if (newClient) {
        setSelectedClient(newClient);
      }
    } else if (modalMode === 'edit' && selectedClient) {
      await updateClient(selectedClient.id, {
        name,
        business_name: businessName,
        status,
      });
    }
  };

  const handleClone = async () => {
    if (selectedClient) {
      const cloned = await cloneClient(selectedClient);
      if (cloned) {
        setSelectedClient(cloned);
      }
    }
  };

  const handleUpdateClientField = async (updates: Partial<Client>) => {
    if (selectedClient) {
      await updateClient(selectedClient.id, updates);
    }
  };

  const handleCreateCategory = async (name: string) => {
    await createCategory(name);
  };

  const handleUpdateCategory = async (categoryId: string, name: string) => {
    await updateCategory(categoryId, name);
  };

  const handleDeleteCategory = async (categoryId: string) => {
    await deleteCategory(categoryId);
  };

  const handleCreateTask = async (categoryId: string, name: string) => {
    await createTask(categoryId, name);
  };

  const handleUpdateTask = async (
    categoryId: string,
    taskId: string,
    name: string
  ) => {
    await updateTask(categoryId, taskId, { name });
  };

  const handleDeleteTask = async (categoryId: string, taskId: string) => {
    await deleteTask(categoryId, taskId);
  };

  const handleToggleTask = async (
    categoryId: string,
    taskId: string,
    completed: boolean
  ) => {
    await toggleTask(categoryId, taskId, completed);
  };

  if (clientsLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse shadow-lg shadow-indigo-200">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <p className="text-slate-500 font-medium">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <Sidebar
        activeClients={activeClients}
        inactiveClients={inactiveClients}
        selectedClientId={selectedClient?.id || null}
        onSelectClient={handleSelectClient}
        onAddNew={handleAddNew}
      />

      {/* Main Content */}
      {selectedClient ? (
        <ClientDetail
          client={selectedClient}
          categories={categories}
          onUpdateClient={handleUpdateClientField}
          onClone={handleClone}
          onUpdateStatus={handleUpdateStatus}
          onCreateCategory={handleCreateCategory}
          onUpdateCategory={handleUpdateCategory}
          onDeleteCategory={handleDeleteCategory}
          onCreateTask={handleCreateTask}
          onUpdateTask={handleUpdateTask}
          onDeleteTask={handleDeleteTask}
          onToggleTask={handleToggleTask}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-8">
            <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-indigo-200">
              <Briefcase className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-slate-800 mb-3">
              Welcome to ASR Media Pro
            </h2>
            <p className="text-slate-500 mb-8 leading-relaxed">
              Select a client from the sidebar to view their details, or create a new client to get started with your project management.
            </p>
            <button
              onClick={handleAddNew}
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-2xl hover:from-indigo-600 hover:to-purple-600 transition-all font-semibold shadow-xl shadow-indigo-200 hover:shadow-2xl hover:shadow-indigo-300 hover:-translate-y-1"
            >
              <Plus className="w-5 h-5" />
              Add Your First Client
            </button>
          </div>
        </div>
      )}

      {/* Client Modal */}
      <ClientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
        client={modalMode === 'edit' ? selectedClient : null}
        mode={modalMode}
      />
    </div>
  );
}
