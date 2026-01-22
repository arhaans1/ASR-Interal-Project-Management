'use client';

import { useState } from 'react';
import { Client } from '@/types/database';
import { ChevronDown, ChevronRight, Plus, Users } from 'lucide-react';

interface SidebarProps {
  activeClients: Client[];
  inactiveClients: Client[];
  selectedClientId: string | null;
  onSelectClient: (client: Client) => void;
  onAddNew: () => void;
}

export default function Sidebar({
  activeClients,
  inactiveClients,
  selectedClientId,
  onSelectClient,
  onAddNew,
}: SidebarProps) {
  const [activeExpanded, setActiveExpanded] = useState(true);
  const [inactiveExpanded, setInactiveExpanded] = useState(true);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Onboarding':
        return 'bg-blue-100 text-blue-700';
      case 'In-Process':
        return 'bg-yellow-100 text-yellow-700';
      case 'On-Hold':
        return 'bg-orange-100 text-orange-700';
      case 'Ads Launched':
        return 'bg-green-100 text-green-700';
      case 'Closed':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const ClientItem = ({ client }: { client: Client }) => (
    <button
      onClick={() => onSelectClient(client)}
      className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 hover:bg-indigo-50 group ${
        selectedClientId === client.id
          ? 'bg-indigo-100 border-l-4 border-indigo-500'
          : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium text-gray-800 truncate flex-1">
          {client.name}
        </span>
      </div>
      <div className="flex items-center gap-2 mt-1">
        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(client.status)}`}>
          {client.status}
        </span>
      </div>
    </button>
  );

  return (
    <div className="w-72 h-screen bg-white border-r border-gray-200 flex flex-col shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg text-gray-800">ASR Media Pro</span>
        </div>
        <button
          onClick={onAddNew}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-2.5 rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg"
        >
          <Plus className="w-4 h-4" />
          <span className="font-medium">Add New Client</span>
        </button>
      </div>

      {/* Client Lists */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* Active Section */}
        <div className="mb-4">
          <button
            onClick={() => setActiveExpanded(!activeExpanded)}
            className="w-full flex items-center gap-2 px-2 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 transition-colors"
          >
            {activeExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            <span>Active</span>
            <span className="ml-auto bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">
              {activeClients.length}
            </span>
          </button>
          {activeExpanded && (
            <div className="space-y-1 mt-1">
              {activeClients.length === 0 ? (
                <p className="text-sm text-gray-400 px-3 py-2">No active clients</p>
              ) : (
                activeClients.map((client) => (
                  <ClientItem key={client.id} client={client} />
                ))
              )}
            </div>
          )}
        </div>

        {/* Inactive/Closed Section */}
        <div>
          <button
            onClick={() => setInactiveExpanded(!inactiveExpanded)}
            className="w-full flex items-center gap-2 px-2 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 transition-colors"
          >
            {inactiveExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            <span>Inactive / Closed</span>
            <span className="ml-auto bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
              {inactiveClients.length}
            </span>
          </button>
          {inactiveExpanded && (
            <div className="space-y-1 mt-1">
              {inactiveClients.length === 0 ? (
                <p className="text-sm text-gray-400 px-3 py-2">No inactive clients</p>
              ) : (
                inactiveClients.map((client) => (
                  <ClientItem key={client.id} client={client} />
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
