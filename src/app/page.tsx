'use client';

import { useState, useEffect } from 'react';
import { useClients } from '@/hooks/useClients';
import { useCategories } from '@/hooks/useCategories';
import { Client, ClientStatus } from '@/types/database';
import Sidebar from '@/components/Sidebar';
import ClientDetail from '@/components/ClientDetail';
import ClientModal from '@/components/ClientModal';
import { Users } from 'lucide-react';

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
    loading: categoriesLoading,
    createCategory,
    updateCategory,
    deleteCategory,
    createTask,
    updateTask,
    deleteTask,
    toggleTask,
    refreshCategories,
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
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
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
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-10 h-10 text-indigo-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              No Client Selected
            </h2>
            <p className="text-gray-500 mb-4">
              Select a client from the sidebar or create a new one
            </p>
            <button
              onClick={handleAddNew}
              className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all font-medium shadow-md hover:shadow-lg"
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
    </div>
  );
}
