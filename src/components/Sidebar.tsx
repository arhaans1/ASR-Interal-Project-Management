import { useState, useRef, useEffect } from 'react';
import { Client } from '@/types/database';
import { ChevronRight, Plus, Users, Layout, Rocket, Archive, Copy, MessageSquare, BellRing } from 'lucide-react';
import { useGlobalChatNotifications } from '@/hooks/useGlobalChatNotifications';

interface SidebarProps {
  clients: Client[];
  selectedClientId: string | null;
  onSelectClient: (client: Client) => void;
  onAddNew: () => void;
}

export default function Sidebar({
  clients,
  selectedClientId,
  onSelectClient,
  onAddNew,
}: SidebarProps) {
  const { unreadCounts, permissionDenied } = useGlobalChatNotifications(clients);
  console.log('Sidebar received clients:', clients); // Debug log

  // State for expanded sections
  const [expandedSections, setExpandedSections] = useState({
    active: false,
    launched: false,
    team: false,
    templates: false,
    archived: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Helper to map status to new CSS variable-based utility classes
  const getStatusDotColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-amber-500'; // Now Orange
      case 'Launched':
        return 'bg-emerald-500'; // Now Green
      case 'Team Members':
        return 'bg-blue-500';
      case 'Templates':
        return 'bg-indigo-500';
      case 'Archived':
        return 'bg-gray-400';
      default:
        return 'bg-amber-500'; // Default for mismatch/uncategorized
    }
  };

  // Filter clients into groups
  const activeClients = clients.filter(c => c.status === 'Active');
  const launchedClients = clients.filter(c => c.status === 'Launched');
  const teamClients = clients.filter(c => c.status === 'Team Members');
  const templateClients = clients.filter(c => c.status === 'Templates');
  const archivedClients = clients.filter(c => c.status === 'Archived');

  // Find any clients that don't fit into the above categories
  const uncategorizedClients = clients.filter(c =>
    !['Active', 'Launched', 'Team Members', 'Templates', 'Archived'].includes(c.status)
  );

  const ClientItem = ({ client }: { client: Client }) => (
    <button
      onClick={() => onSelectClient(client)}
      className={`w-full text-left px-3 py-2 rounded-full transition-all duration-300 group relative overflow-hidden flex items-center gap-3 ${selectedClientId === client.id
        ? 'bg-slate-900 text-white shadow-lg scale-[1.02] ring-1 ring-black/5'
        : 'hover:bg-white/60 hover:shadow-sm hover:text-gray-900'
        }`}
    >
      <div className={`p-1.5 rounded-full transition-colors duration-300 shrink-0 ${selectedClientId === client.id
        ? 'bg-white text-slate-900'
        : 'bg-white/50 text-gray-400 group-hover:bg-white group-hover:text-slate-900'
        }`}>
        <Users className="w-4 h-4" />
      </div>

      <div className="flex items-center justify-between z-10 relative flex-1 min-w-0">
        <span className={`font-semibold truncate text-sm transition-colors pr-2 ${selectedClientId === client.id ? 'text-white' : 'text-gray-600 group-hover:text-slate-900'
          }`}>
          {client.name}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {unreadCounts[client.id] > 0 && (
            <div className="flex items-center justify-center p-1 bg-rose-500 rounded-full animate-pulse shadow-md relative" title={`${unreadCounts[client.id]} unread messages`}>
              <MessageSquare className="w-3 h-3 text-white fill-rose-500" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-slate-900 border border-white text-[8px] font-bold text-white">
                {unreadCounts[client.id] > 9 ? '9+' : unreadCounts[client.id]}
              </span>
            </div>
          )}
          <div className={`w-1.5 h-1.5 rounded-full ${getStatusDotColor(client.status)} ${selectedClientId === client.id ? 'ring-2 ring-slate-900' : ''}`} />
        </div>
      </div>
    </button>
  );

  const SectionHeader = ({ title, count, isExpanded, onClick, icon: Icon }: any) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2 mb-1 text-xs font-bold uppercase tracking-wider transition-colors ${isExpanded ? 'text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
    >
      <div className="flex items-center gap-2">
        <Icon className={`w-3.5 h-3.5 ${isExpanded ? 'text-slate-900' : 'text-gray-400'}`} />
        <span>{title}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={`bg-white border border-gray-200 text-[10px] px-2 py-0.5 rounded-full shadow-sm font-bold ${isExpanded ? 'text-slate-900' : 'text-gray-500'}`}>
          {count}
        </span>
        <ChevronRight className={`w-3 h-3 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
      </div>
    </button>
  );

  // Scroll Persistence
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Restore scroll position
    const savedScroll = sessionStorage.getItem('sidebar-scroll-position');
    if (scrollRef.current && savedScroll) {
      scrollRef.current.scrollTop = parseInt(savedScroll, 10);
    }

    // Save scroll position handler
    const handleScroll = () => {
      if (scrollRef.current) {
        sessionStorage.setItem('sidebar-scroll-position', scrollRef.current.scrollTop.toString());
      }
    };

    const element = scrollRef.current;
    element?.addEventListener('scroll', handleScroll);
    return () => element?.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* Mandatory Notification Request Blocker */}
      {permissionDenied && (
        <div className="fixed inset-0 z-[99999] bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center outline outline-1 outline-gray-200">
            <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-md shadow-blue-100">
              <BellRing className="w-8 h-8 animate-bounce" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Notifications Required</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              This application requires browser notifications to ensure our team never misses critical chat updates. Please allow notifications in your browser settings and then refresh the page.
            </p>
            <p className="text-xs text-slate-400 mt-2">
              (Click the padlock or settings icon next to the URL bar to fix this)
            </p>
          </div>
        </div>
      )}

      <div className="w-80 shrink-0 h-screen glass-panel border-r-0 flex flex-col z-20 relative">
        {/* Header */}
        <div className="p-6 pb-2">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center shadow-lg ring-1 ring-white/20">
              <span className="text-white font-bold text-xl">A</span>
            </div>
            <div>
              <h1 className="font-bold text-xl text-slate-900 tracking-tight leading-tight">ASR Media Pro</h1>
              <p className="text-xs text-gray-500 font-medium">Project Manager</p>
            </div>
          </div>

          <button
            onClick={onAddNew}
            className="w-full py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-full transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-sm font-semibold tracking-wide border border-slate-800"
          >
            <Plus className="w-4 h-4" />
            Add New Client
          </button>
        </div>

        {/* Client Lists */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-6 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent"
        >

          {/* Active Section */}
          <div>
            <SectionHeader
              title="Active"
              count={activeClients.length}
              isExpanded={expandedSections.active}
              onClick={() => toggleSection('active')}
              icon={Layout}
            />
            <div className={`space-y-1 transition-all duration-300 origin-top ${expandedSections.active ? 'opacity-100 max-h-[1000px] mb-4' : 'opacity-0 max-h-0 overflow-hidden'}`}>
              {activeClients.map(client => <ClientItem key={client.id} client={client} />)}
            </div>
          </div>

          {/* Launched Section */}
          <div>
            <SectionHeader
              title="Launched"
              count={launchedClients.length}
              isExpanded={expandedSections.launched}
              onClick={() => toggleSection('launched')}
              icon={Rocket}
            />
            <div className={`space-y-1 transition-all duration-300 origin-top ${expandedSections.launched ? 'opacity-100 max-h-[1000px] mb-4' : 'opacity-0 max-h-0 overflow-hidden'}`}>
              {launchedClients.map(client => <ClientItem key={client.id} client={client} />)}
            </div>
          </div>

          {/* Team Members Section */}
          <div>
            <SectionHeader
              title="Team Members"
              count={teamClients.length}
              isExpanded={expandedSections.team}
              onClick={() => toggleSection('team')}
              icon={Users}
            />
            <div className={`space-y-1 transition-all duration-300 origin-top ${expandedSections.team ? 'opacity-100 max-h-[1000px] mb-4' : 'opacity-0 max-h-0 overflow-hidden'}`}>
              {teamClients.map(client => <ClientItem key={client.id} client={client} />)}
            </div>
          </div>

          {/* Templates Section */}
          <div>
            <SectionHeader
              title="Templates"
              count={templateClients.length}
              isExpanded={expandedSections.templates}
              onClick={() => toggleSection('templates')}
              icon={Copy}
            />
            <div className={`space-y-1 transition-all duration-300 origin-top ${expandedSections.templates ? 'opacity-100 max-h-[1000px] mb-4' : 'opacity-0 max-h-0 overflow-hidden'}`}>
              {templateClients.map(client => <ClientItem key={client.id} client={client} />)}
            </div>
          </div>

          {/* Archived Section */}
          <div>
            <SectionHeader
              title="Archived"
              count={archivedClients.length}
              isExpanded={expandedSections.archived}
              onClick={() => toggleSection('archived')}
              icon={Archive}
            />
            <div className={`space-y-1 transition-all duration-300 origin-top ${expandedSections.archived ? 'opacity-100 max-h-[1000px]' : 'opacity-0 max-h-0 overflow-hidden'}`}>
              {archivedClients.map(client => <ClientItem key={client.id} client={client} />)}
            </div>
          </div>

          {/* Uncategorized Section (Hidden if empty) */}
          {uncategorizedClients.length > 0 && (
            <div>
              <div className="flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wider text-amber-600">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                <span>Needs Attention</span>
              </div>
              <div className="space-y-1 mt-1">
                {uncategorizedClients.map(client => <ClientItem key={client.id} client={client} />)}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200/60">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('openTeamSettings'))}
            className="w-full flex items-center justify-between px-3 py-2 text-gray-400 hover:text-slate-900 hover:bg-white/50 rounded-xl transition-all group mb-4"
          >
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-gray-100 rounded-lg group-hover:bg-indigo-100 transition-colors">
                <Users className="w-3.5 h-3.5 text-gray-500 group-hover:text-indigo-600" />
              </div>
              <span className="text-xs font-bold text-gray-500 group-hover:text-slate-900 uppercase tracking-wide">Team Settings</span>
            </div>
            <ChevronRight className="w-3 h-3 text-gray-300 group-hover:text-slate-900 transition-transform group-hover:translate-x-0.5" />
          </button>

          <div className="text-xs text-center text-gray-400 font-medium">
            v0.2.2 • ASR Internal
          </div>
        </div>
      </div>
    </>
  );
}
