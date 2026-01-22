'use client';

import { useState } from 'react';
import { Client } from '@/types/database';
import { ChevronDown, Plus, Briefcase } from 'lucide-react';

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

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'Onboarding':
        return 'bg-blue-50 text-blue-600';
      case 'In-Process':
        return 'bg-amber-50 text-amber-600';
      case 'On-Hold':
        return 'bg-orange-50 text-orange-600';
      case 'Ads Launched':
        return 'bg-emerald-50 text-emerald-600';
      case 'Closed':
        return 'bg-slate-100 text-slate-500';
      default:
        return 'bg-slate-100 text-slate-500';
    }
  };

  const ClientItem = ({ client }: { client: Client }) => (
    <button
      onClick={() => onSelectClient(client)}
      className={`w-full text-left p-4 rounded-2xl transition-all duration-200 group ${
        selectedClientId === client.id
          ? 'bg-white shadow-lg shadow-indigo-100/50 border-l-4 border-indigo-500'
          : 'hover:bg-white/60'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          selectedClientId === client.id
            ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white'
            : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-500'
        }`}>
          <Briefcase className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-semibold truncate ${
            selectedClientId === client.id ? 'text-slate-800' : 'text-slate-700'
          }`}>
            {client.name}
          </p>
          <span className={`inline-block mt-1 text-xs font-medium px-2.5 py-1 rounded-full ${getStatusStyles(client.status)}`}>
            {client.status}
          </span>
        </div>
      </div>
    </button>
  );

  return (
    <div className="w-80 h-screen bg-white/40 backdrop-blur-xl border-r border-white/50 flex flex-col">
      {/* Header */}
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <span className="text-white font-bold text-xl">A</span>
          </div>
          <div>
            <h1 className="font-bold text-xl text-slate-800">ASR Media Pro</h1>
            <p className="text-sm text-slate-400">Project Manager</p>
          </div>
        </div>

        <button
          onClick={onAddNew}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-6 py-4 rounded-2xl hover:from-indigo-600 hover:to-purple-600 transition-all duration-200 shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 hover:-translate-y-0.5"
        >
          <Plus className="w-5 h-5" />
          <span className="font-semibold">Add New Client</span>
        </button>
      </div>

      {/* Client Lists */}
      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {/* Active Section */}
        <div className="mb-6">
          <button
            onClick={() => setActiveExpanded(!activeExpanded)}
            className="w-full flex items-center gap-3 px-3 py-3 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors"
          >
            <div className={`w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center transition-transform ${activeExpanded ? 'rotate-0' : '-rotate-90'}`}>
              <ChevronDown className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="uppercase tracking-wider text-xs">Active Clients</span>
            <span className="ml-auto bg-emerald-100 text-emerald-600 text-xs font-bold px-2.5 py-1 rounded-full">
              {activeClients.length}
            </span>
          </button>

          {activeExpanded && (
            <div className="space-y-2 mt-2">
              {activeClients.length === 0 ? (
                <p className="text-sm text-slate-400 px-4 py-6 text-center bg-slate-50 rounded-2xl">
                  No active clients yet
                </p>
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
            className="w-full flex items-center gap-3 px-3 py-3 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors"
          >
            <div className={`w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center transition-transform ${inactiveExpanded ? 'rotate-0' : '-rotate-90'}`}>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </div>
            <span className="uppercase tracking-wider text-xs">Inactive / Closed</span>
            <span className="ml-auto bg-slate-100 text-slate-500 text-xs font-bold px-2.5 py-1 rounded-full">
              {inactiveClients.length}
            </span>
          </button>

          {inactiveExpanded && (
            <div className="space-y-2 mt-2">
              {inactiveClients.length === 0 ? (
                <p className="text-sm text-slate-400 px-4 py-6 text-center bg-slate-50 rounded-2xl">
                  No inactive clients
                </p>
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
