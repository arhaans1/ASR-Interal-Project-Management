'use client';

import { useState, useEffect } from 'react';
import { useClients } from '@/hooks/useClients';
import { useCategories } from '@/hooks/useCategories';
import { Client, ClientStatus } from '@/types/database';
import Sidebar from '@/components/Sidebar';
import ClientDetail from '@/components/ClientDetail';
import ClientModal from '@/components/ClientModal';
import { Users } from 'lucide-react';

import Link from 'next/link';
import TeamManagementModal from '@/components/TeamManagementModal';

export default function Home() {
  const {
    clients,
    loading: clientsLoading,
    isCloning, // Capture isCloning
    error,
    createClient,
    updateClient,
    deleteClient,
    cloneClient,
  } = useClients();

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');

  // Listen for team settings event
  useEffect(() => {
    const handleOpenTeamSettings = () => setIsTeamModalOpen(true);
    window.addEventListener('openTeamSettings', handleOpenTeamSettings);

    return () => {
      window.removeEventListener('openTeamSettings', handleOpenTeamSettings);
    }
  }, []);

  const {
    categories,
    loading: categoriesLoading,
    createCategory,
    updateCategory,
    deleteCategory,
    createTask,
    updateTask,
    deleteTask,
    toggleTask,
    reorderTask,
    reorderCategory,
    moveTask,
    refreshCategories,
  } = useCategories(selectedClient?.id || null);

  // Update selected client when clients change
  useEffect(() => {
    if (selectedClient) {
      const updated = clients.find(
        (c) => c.id === selectedClient.id
      );
      if (updated) {
        setSelectedClient(updated);
      }
    }
  }, [clients, selectedClient]);

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
    status: ClientStatus,
    username?: string,
    password?: string
  ) => {
    if (modalMode === 'create') {
      const newClient = await createClient(name, businessName, status, username, password);
      if (newClient) {
        setSelectedClient(newClient);
      }
    } else if (modalMode === 'edit' && selectedClient) {
      await updateClient(selectedClient.id, {
        name,
        business_name: businessName,
        status,
        username,
        password,
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
    updates: any // Accept any updates (name, completed, assigned_to, etc.)
  ) => {
    // If updates is a string (legacy), wrap it. Otherwise pass as is.
    const payload = typeof updates === 'string' ? { name: updates } : updates;
    await updateTask(categoryId, taskId, payload);
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
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium">Loading workspace...</p>
        </div>
      </div>
    );
  }

  // Error State for Debugging
  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-red-100">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 text-red-500">⚠️</div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all font-semibold"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 relative">
      {/* Global Loading Overlay (Cloning) */}
      {isCloning && (
        <div className="absolute inset-0 z-50 bg-white/50 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-gray-900 font-bold">Cloning Client...</p>
            <p className="text-sm text-gray-500">This may take a moment</p>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <Sidebar
        clients={clients}
        selectedClientId={selectedClient?.id || null}
        onSelectClient={handleSelectClient}
        onAddNew={handleAddNew}
      />

      {/* Main Content */}
      {selectedClient ? (
        categoriesLoading ? (
          <div className="flex-1 flex flex-col h-screen overflow-hidden items-center justify-center">
            <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500 font-medium">Loading workspace...</p>
          </div>
        ) : (
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
            onReorderCategory={reorderCategory}
            onReorderTask={reorderTask}
            onMoveTask={moveTask}
            onDelete={async (id) => {
              const success = await deleteClient(id);
              if (success) setSelectedClient(null);
            }}
          />
        )
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center bg-white p-12 rounded-3xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.05)] ring-1 ring-black/5 max-w-md w-full mx-4">
            <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
              <Users className="w-10 h-10 text-slate-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3 tracking-tight">
              No Client Selected
            </h2>
            <p className="text-gray-500 mb-8 leading-relaxed">
              Select a client from the sidebar to manage their tasks, or create a new client to get started.
            </p>
            <button
              onClick={handleAddNew}
              className="px-8 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all font-semibold shadow-lg hover:shadow-xl ring-1 ring-white/20"
            >
              Add New Client
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
      <TeamManagementModal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
      />
    </div>
  );
}
