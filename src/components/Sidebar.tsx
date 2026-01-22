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

  // Helper to map status to new CSS variable-based utility classes
  const getStatusDotColor = (status: string) => {
    switch (status) {
      case 'Onboarding':
        return 'bg-[var(--status-onboarding-text)]';
      case 'In-Process':
        return 'bg-[var(--status-process-text)]';
      case 'On-Hold':
        return 'bg-[var(--status-hold-text)]';
      case 'Ads Launched':
        return 'bg-[var(--status-ads-text)]';
      case 'Closed':
        return 'bg-[var(--status-closed-text)]';
      default:
        return 'bg-gray-500';
    }
  };

  const ClientItem = ({ client }: { client: Client }) => (
    <button
      onClick={() => onSelectClient(client)}
      className={`w-full text-left px-4 py-3.5 rounded-2xl transition-all duration-200 group relative overflow-hidden ${selectedClientId === client.id
        ? 'bg-white shadow-sm ring-1 ring-black/5'
        : 'hover:bg-white/60 hover:shadow-sm'
        }`}
    >
      <div className="flex items-center justify-between z-10 relative">
        <span className={`font-medium truncate flex-1 transition-colors ${selectedClientId === client.id ? 'text-gray-900' : 'text-gray-600 group-hover:text-gray-900'
          }`}>
          {client.name}
        </span>
        {selectedClientId === client.id && (
          <div className={`w-2 h-2 rounded-full ${getStatusDotColor(client.status)}`} />
        )}
      </div>
    </button>
  );

  return (
    <div className="w-80 shrink-0 h-screen bg-[#f8fafc] border-r border-gray-200/60 flex flex-col">
      {/* Header */}
      <div className="p-6 pb-2">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center">
            <Users className="w-5 h-5 text-indigo-500" />
          </div>
          <span className="font-bold text-xl text-gray-800 tracking-tight">ASR Media</span>
        </div>

        <button
          onClick={onAddNew}
          className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-3.5 rounded-2xl hover:border-indigo-300 hover:text-indigo-600 transition-all duration-200 shadow-sm group"
        >
          <Plus className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 transition-colors" />
          <span className="font-semibold text-sm">New Client</span>
        </button>
      </div>

      {/* Client Lists */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {/* Active Section */}
        <div>
          <button
            onClick={() => setActiveExpanded(!activeExpanded)}
            className="w-full flex items-center justify-between px-2 py-2 mb-2 text-xs font-bold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors"
          >
            <span>Active Projects</span>
            <span className="bg-white border border-gray-200 text-gray-500 text-[10px] px-2 py-0.5 rounded-full shadow-sm">
              {activeClients.length}
            </span>
          </button>

          <div className={`space-y-1 transition-all duration-300 ${activeExpanded ? 'opacity-100 max-h-[1000px]' : 'opacity-0 max-h-0 overflow-hidden'}`}>
            {activeClients.length === 0 ? (
              <p className="text-sm text-gray-400 px-3 py-2 italic">No active projects</p>
            ) : (
              activeClients.map((client) => (
                <ClientItem key={client.id} client={client} />
              ))
            )}
          </div>
        </div>

        {/* Inactive/Closed Section */}
        <div>
          <button
            onClick={() => setInactiveExpanded(!inactiveExpanded)}
            className="w-full flex items-center justify-between px-2 py-2 mb-2 text-xs font-bold text-gray-400 uppercase tracking-wider hover:text-gray-600 transition-colors"
          >
            <span>Archived</span>
            <span className="bg-white border border-gray-200 text-gray-500 text-[10px] px-2 py-0.5 rounded-full shadow-sm">
              {inactiveClients.length}
            </span>
          </button>

          <div className={`space-y-1 transition-all duration-300 ${inactiveExpanded ? 'opacity-100 max-h-[1000px]' : 'opacity-0 max-h-0 overflow-hidden'}`}>
            {inactiveClients.length === 0 ? (
              <p className="text-sm text-gray-400 px-3 py-2 italic">No archived projects</p>
            ) : (
              inactiveClients.map((client) => (
                <ClientItem key={client.id} client={client} />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer Profile/Settings placeholder could go here */}
      <div className="p-4 border-t border-gray-200/60">
        <div className="text-xs text-center text-gray-400 font-medium">
          v0.2.0 • ASR Internal
        </div>
      </div>
    </div>
  );
}
