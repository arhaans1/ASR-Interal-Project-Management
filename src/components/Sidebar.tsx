import { useState, useRef, useEffect } from 'react';
import { Client } from '@/types/database';
import { ChevronRight, Plus, Users, Layout, Rocket, Archive, Copy, MessageSquare, BellRing, Folder, ListChecks } from 'lucide-react';
import { useGlobalChatNotifications } from '@/hooks/useGlobalChatNotifications';
import WorkspaceSwitcher from './WorkspaceSwitcher';
import { prefetchCategories } from '@/hooks/useCategories';
import { useWorkspace } from '@/hooks/useWorkspace';

const TEAM_SECTION = 'Team Members';
const SECTION_ICONS: Record<string, typeof Layout> = { Active: Layout, Launched: Rocket, [TEAM_SECTION]: Users, Templates: Copy, Archived: Archive };

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

  // Who is signed in, and which sections the workspace shows
  const { user, settings } = useWorkspace();
  const isOperator = Boolean(user?.isOperator);
  const isAdmin = Boolean(user?.isAdmin);

  // Which sections are open
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (section: string) => {
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

  // Sections in the order set in Team Settings. Hidden ones are left out. Only admins see
  // the Team Members section; everyone else gets "My Tasks" for their own board.
  const visibleSections = settings.sections.filter(
    (section) => !section.hidden && (section.name !== TEAM_SECTION || isAdmin)
  );
  const knownSections = new Set(settings.sections.map((section) => section.name));

  const myBoard = !isAdmin && user?.boardId ? clients.find((c) => c.id === user.boardId) ?? null : null;

  // Cards whose status matches no section at all
  const uncategorizedClients = clients.filter(c => !knownSections.has(c.status));

  const ClientItem = ({ client }: { client: Client }) => (
    <button
      onClick={() => onSelectClient(client)}
      onMouseEnter={() => prefetchCategories([client.id])}
      onFocus={() => prefetchCategories([client.id])}
      className={`w-full text-left px-2.5 py-2 rounded-xl transition-colors duration-150 group relative overflow-hidden flex items-center gap-3 ${selectedClientId === client.id
        ? 'bg-slate-900 text-white shadow-sm'
        : 'hover:bg-slate-100 hover:text-gray-900'
        }`}
    >
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0 transition-colors ${selectedClientId === client.id
        ? 'bg-white/15 text-white'
        : 'bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-slate-900'
        }`}>
        {client.name.trim().slice(0, 2).toUpperCase()}
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
      aria-expanded={isExpanded}
      className={`w-full flex items-center justify-between px-2.5 py-2 mb-1 rounded-lg text-[11px] font-bold uppercase tracking-[0.1em] transition-colors hover:bg-slate-50 ${isExpanded ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
    >
      <div className="flex items-center gap-2">
        <Icon className={`w-3.5 h-3.5 ${isExpanded ? 'text-slate-900' : 'text-gray-400'}`} />
        <span>{title}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={`bg-slate-100 text-[10px] px-2 py-0.5 rounded-full font-bold tabular-nums ${isExpanded ? 'text-slate-900' : 'text-slate-500'}`}>
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

      <div className="w-80 shrink-0 h-screen bg-white border-r border-slate-200/80 flex flex-col z-20 relative">
        {/* Header */}
        <div className="p-6 pb-2">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-xl">A</span>
            </div>
            <div>
              <h1 className="font-bold text-lg text-slate-900 tracking-tight leading-tight">ASR Media Pro</h1>
              <p className="text-xs text-slate-500 font-medium">Project Manager</p>
            </div>
          </div>

          {isOperator && (
            <div className="mb-3 -mt-4">
              <WorkspaceSwitcher current="team" />
            </div>
          )}

          <button
            onClick={onAddNew}
            className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 text-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            Add New Client
          </button>
        </div>

        {/* Client Lists */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
        >

          {/* My Tasks: a team member's own board */}
          {user && !isAdmin && (
            myBoard ? (
              <button
                onClick={() => onSelectClient(myBoard)}
                onMouseEnter={() => prefetchCategories([myBoard.id])}
                className={`w-full text-left px-2.5 py-2.5 rounded-xl transition-colors duration-150 flex items-center gap-3 ${selectedClientId === myBoard.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-900'
                  }`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${selectedClientId === myBoard.id ? 'bg-white/15 text-white' : 'bg-white text-indigo-600 ring-1 ring-slate-200'}`}>
                  <ListChecks className="w-4 h-4" />
                </div>
                <span className="font-semibold text-sm">My Tasks</span>
              </button>
            ) : (
              <div className="px-3 py-2.5 rounded-xl bg-slate-50 text-xs text-slate-500 leading-relaxed">
                <span className="font-semibold text-slate-700">My Tasks</span> is not set up yet. Ask an admin to create a Team Members card named “{user.username}”.
              </div>
            )
          )}

          {visibleSections.map((section) => {
            const sectionClients = clients.filter(c => c.status === section.name);
            const expanded = Boolean(expandedSections[section.name]);
            return (
              <div key={section.name}>
                <SectionHeader
                  title={section.name}
                  count={sectionClients.length}
                  isExpanded={expanded}
                  onClick={() => toggleSection(section.name)}
                  icon={SECTION_ICONS[section.name] ?? Folder}
                />
                <div className={`space-y-1 transition-all duration-300 origin-top ${expanded ? 'opacity-100 mb-4' : 'opacity-0 max-h-0 overflow-hidden'}`}>
                  {sectionClients.map(client => <ClientItem key={client.id} client={client} />)}
                </div>
              </div>
            );
          })}

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
        <div className="p-4 border-t border-slate-200/80">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('openTeamSettings'))}
            className="w-full flex items-center justify-between px-3 py-2 text-gray-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all group mb-4"
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
            v0.3.0 • ASR Internal
          </div>
        </div>
      </div>
    </>
  );
}
