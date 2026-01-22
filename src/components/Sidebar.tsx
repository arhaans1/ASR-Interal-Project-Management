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
      className={`w-full text-left px-3 py-3 rounded-full transition-all duration-300 group relative overflow-hidden flex items-center gap-3 ${selectedClientId === client.id
        ? 'bg-[#5b21b6] text-white shadow-[0_0_20px_rgba(91,33,182,0.3)] scale-[1.02]'
        : 'hover:bg-white/40 hover:shadow-sm'
        }`}
    >
      <div className={`p-2 rounded-full transition-colors duration-300 shrink-0 ${selectedClientId === client.id
        ? 'bg-white text-[#5b21b6]'
        : 'bg-white/50 text-gray-400 group-hover:bg-white group-hover:text-gray-600'
        }`}>
        <Users className="w-5 h-5" />
      </div>

      <div className="flex items-center justify-between z-10 relative flex-1 min-w-0">
        <span className={`font-semibold truncate transition-colors ${selectedClientId === client.id ? 'text-white' : 'text-gray-600 group-hover:text-gray-900'
          }`}>
          {client.name}
        </span>
        <div className={`w-2 h-2 rounded-full ${getStatusDotColor(client.status)} ${selectedClientId === client.id ? 'ring-2 ring-[#5b21b6]' : ''}`} />
      </div>
    </button>
  );

  return (
    <div className="w-80 shrink-0 h-screen glass-panel border-r-0 flex flex-col z-20 relative">
      {/* Header */}
      <div className="p-6 pb-2">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-[#5b21b6] rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(91,33,182,0.5)]">
            <span className="text-white font-bold text-xl">A</span>
          </div>
          <div>
            <h1 className="font-bold text-xl text-gray-900 tracking-tight leading-tight">ASR Media Pro</h1>
            <p className="text-xs text-gray-400 font-medium">Project Manager</p>
          </div>
        </div>

        <button
          onClick={onAddNew}
          className="w-full py-3 px-4 bg-[#5b21b6] hover:bg-[#4c1d95] text-white rounded-full transition-all shadow-[0_0_20px_rgba(91,33,182,0.3)] hover:shadow-[0_0_25px_rgba(91,33,182,0.5)] flex items-center justify-center gap-2 font-semibold tracking-wide"
        >
          <Plus className="w-5 h-5" />
          Add New Client
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
