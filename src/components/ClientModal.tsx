'use client';

import { useState, useEffect } from 'react';
import { X, ChevronDown, FolderOpen, PlayCircle, FileText, ListChecks } from 'lucide-react';
import { Client, ClientStatus, FunnelType, User } from '@/types/database';
import { useWorkspace } from '@/hooks/useWorkspace';
import { FUNNEL_TYPES, FUNNEL_TEMPLATES, templateTaskCount } from '@/lib/funnelTemplates';

export interface ClientFormValues {
  name: string;
  businessName: string;
  status: ClientStatus;
  username: string;
  password: string;
  funnel_type: FunnelType | null;
  operator_id: string | null;
  drive_folder_url: string | null;
  onboarding_video_url: string | null;
  onboarding_form_url: string | null;
  // What to do with the funnel's task template: nothing, add it, or swap the card's tasks for it
  templateMode: 'none' | 'add' | 'replace';
}

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: ClientFormValues) => void;
  client?: Client | null;
  mode: 'create' | 'edit';
}


const inputClass =
  'w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none';
const labelClass = 'block text-xs font-semibold text-slate-600 mb-1.5';
const sectionTitleClass = 'text-[11px] font-bold text-slate-400 uppercase tracking-[0.12em] mb-3';

export default function ClientModal({
  isOpen,
  onClose,
  onSubmit,
  client,
  mode,
}: ClientModalProps) {
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<ClientStatus>('Active');
  const [funnelType, setFunnelType] = useState<FunnelType | null>(null);
  const [operatorId, setOperatorId] = useState('');
  const [driveUrl, setDriveUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [templateChoice, setTemplateChoice] = useState<'none' | 'add' | 'replace'>('none');
  const [operators, setOperators] = useState<User[]>([]);
  const [usernameError, setUsernameError] = useState('');
  const [checking, setChecking] = useState(false);

  // Sections come from Team Settings. A card keeps its current one even if that is hidden.
  const { settings } = useWorkspace();
  const statusOptions = settings.sections
    .filter((section) => !section.hidden || section.name === status)
    .map((section) => section.name);
  if (status && !statusOptions.includes(status)) statusOptions.push(status);

  useEffect(() => {
    if (client && mode === 'edit') {
      setName(client.name);
      setBusinessName(client.business_name);
      setUsername(client.username || '');
      setPassword(''); // Stored passwords are hashed and never shown; type a new one to change it
      setStatus(client.status);
      setFunnelType(client.funnel_type || null);
      setOperatorId(client.operator_id || '');
      setDriveUrl(client.drive_folder_url || '');
      setVideoUrl(client.onboarding_video_url || '');
      setFormUrl(client.onboarding_form_url || '');
    } else {
      setName('');
      setBusinessName('');
      setUsername('');
      setPassword('');
      setStatus('Active');
      setFunnelType(null);
      setOperatorId('');
      setDriveUrl('');
      setVideoUrl('');
      setFormUrl('');
    }
    setTemplateChoice('none');
    setUsernameError('');
  }, [client, mode, isOpen]);

  // Operators to choose from
  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/users')
      .then((res) => (res.ok ? res.json() : []))
      .then((users: User[]) => setOperators((users || []).filter((u) => u.role === 'operator' || u.role === 'member_operator')))
      .catch(() => setOperators([]));
  }, [isOpen]);

  const isProject = status !== 'Team Members';
  // New cards always get the template. Existing cards only when asked.
  const templateMode: 'none' | 'add' | 'replace' =
    !funnelType || !isProject ? 'none' : mode === 'create' ? 'add' : templateChoice;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && businessName.trim()) {
      // A portal username belongs to one person only, or sign-in could open the wrong project.
      // An unchanged username on an existing card is left alone.
      const wanted = username.trim();
      if (wanted && !(mode === 'edit' && wanted === (client?.username || ''))) {
        setChecking(true);
        setUsernameError('');
        try {
          const res = await fetch(
            `/api/clients/username?username=${encodeURIComponent(wanted)}${mode === 'edit' && client ? `&exclude=${client.id}` : ''}`,
            { cache: 'no-store' }
          );
          const body = await res.json().catch(() => ({}));
          if (!res.ok) {
            setUsernameError('Could not check the username. Please try again.');
            return;
          }
          if (body.taken) {
            setUsernameError(`"${wanted}" is already used by another client or team member. Choose a different username.`);
            return;
          }
        } catch {
          setUsernameError('Could not check the username. Please try again.');
          return;
        } finally {
          setChecking(false);
        }
      }

      if (
        templateMode === 'replace' &&
        !confirm(`Replace every category and task on ${name.trim()}'s card with the ${funnelType} template? Current tasks and their ticks will be deleted.`)
      ) {
        return;
      }
      onSubmit({
        name: name.trim(),
        businessName: businessName.trim(),
        status,
        username: username.trim(),
        password: password.trim(),
        funnel_type: isProject ? funnelType : null,
        operator_id: isProject && operatorId ? operatorId : null,
        drive_folder_url: driveUrl.trim() || null,
        onboarding_video_url: videoUrl.trim() || null,
        onboarding_form_url: formUrl.trim() || null,
        templateMode,
      });
      onClose();
    }
  };

  if (!isOpen) return null;

  const template = funnelType ? FUNNEL_TEMPLATES[funnelType] : null;

  return (
    <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 ring-1 ring-slate-900/5">
        {/* Header */}
        <div className="px-7 pt-6 pb-5 flex items-start justify-between border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {mode === 'create' ? 'New client' : 'Edit client'}
            </h2>
            <p className="text-slate-500 text-sm mt-0.5">
              {mode === 'create'
                ? 'Set up the card, the portal login and who runs the project.'
                : 'Update the card, portal login and project settings.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 -mr-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
          <div className="px-7 py-6 space-y-7 overflow-y-auto">
            {/* Details */}
            <section>
              <p className={sectionTitleClass}>Client</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="client-name" className={labelClass}>Client name</label>
                  <input
                    id="client-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="client-business" className={labelClass}>Business name</label>
                  <input
                    id="client-business"
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Acme Corp"
                    className={inputClass}
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="client-status" className={labelClass}>Status</label>
                  <div className="relative">
                    <select
                      id="client-status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as ClientStatus)}
                      className={`${inputClass} appearance-none cursor-pointer pr-10`}
                    >
                      {statusOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>
            </section>

            {/* Project */}
            {isProject && (
              <section>
                <p className={sectionTitleClass}>Project</p>

                <label className={labelClass}>Funnel type</label>
                <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-xl" role="radiogroup" aria-label="Funnel type">
                  {[{ value: null, label: 'None' }, ...FUNNEL_TYPES.map((f) => ({ value: f.value, label: f.value }))].map((option) => {
                    const active = funnelType === option.value;
                    return (
                      <button
                        key={option.label}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setFunnelType(option.value as FunnelType | null)}
                        className={`py-2 rounded-lg text-sm font-semibold transition-all ${active
                          ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5'
                          : 'text-slate-500 hover:text-slate-800'
                          }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>

                {template && funnelType && (
                  <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3.5">
                    <div className="flex items-start gap-2.5">
                      <ListChecks className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                      <div className="min-w-0 text-sm">
                        {mode === 'create' ? (
                          <p className="font-semibold text-indigo-950">
                            {templateTaskCount(funnelType)} tasks will be pre-listed on this card
                          </p>
                        ) : (
                          <div>
                            <label htmlFor="client-template" className="font-semibold text-indigo-950">
                              {templateTaskCount(funnelType)}-task {funnelType} template
                            </label>
                            <select
                              id="client-template"
                              value={templateChoice}
                              onChange={(e) => setTemplateChoice(e.target.value as 'none' | 'add' | 'replace')}
                              className="mt-1.5 w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg text-sm text-slate-900 outline-none focus:border-indigo-500"
                            >
                              <option value="none">Keep this card&rsquo;s tasks as they are</option>
                              <option value="add">Add the template tasks below the current ones</option>
                              <option value="replace">Replace all current tasks with the template</option>
                            </select>
                          </div>
                        )}
                        <p className="text-indigo-900/70 mt-1 leading-relaxed">
                          {template.map((c) => `${c.name} (${c.tasks.length})`).join(' · ')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <label htmlFor="client-operator" className={labelClass}>Operator</label>
                  <div className="relative">
                    <select
                      id="client-operator"
                      value={operatorId}
                      onChange={(e) => setOperatorId(e.target.value)}
                      className={`${inputClass} appearance-none cursor-pointer pr-10`}
                    >
                      <option value="">Choose operator…</option>
                      {operators.map((op) => (
                        <option key={op.id} value={op.id}>
                          {op.username}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  {operators.length === 0 && (
                    <p className="text-xs text-slate-500 mt-1.5">
                      No operators yet. Create one in Team Settings › Manage Team.
                    </p>
                  )}
                </div>
              </section>
            )}

            {/* Portal access */}
            <section>
              <p className={sectionTitleClass}>Client portal login</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="client-username" className={labelClass}>Username</label>
                  <input
                    id="client-username"
                    type="text"
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); setUsernameError(''); }}
                    placeholder="username"
                    autoComplete="off"
                    aria-invalid={Boolean(usernameError)}
                    className={`${inputClass} ${usernameError ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10' : ''}`}
                  />
                </div>
                <div>
                  <label htmlFor="client-password" className={labelClass}>{mode === 'edit' && client?.password ? 'New password' : 'Password'}</label>
                  <input
                    id="client-password"
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'edit' && client?.password ? 'Leave blank to keep current' : 'password'}
                    autoComplete="off"
                    className={inputClass}
                  />
                </div>
              </div>
              {usernameError && (
                <p role="alert" className="mt-2 text-xs font-medium text-red-600">{usernameError}</p>
              )}
            </section>

            {/* Onboarding links */}
            {isProject && (
              <section>
                <p className={sectionTitleClass}>Onboarding links shown in the portal</p>
                <div className="space-y-3">
                  {[
                    { id: 'client-drive', icon: FolderOpen, label: 'Google Drive folder', value: driveUrl, set: setDriveUrl, placeholder: 'https://drive.google.com/drive/folders/…' },
                    { id: 'client-video', icon: PlayCircle, label: 'Start Here video', value: videoUrl, set: setVideoUrl, placeholder: 'Drive, YouTube, Loom or Vimeo link' },
                    { id: 'client-form', icon: FileText, label: 'On-Boarding Worksheet', value: formUrl, set: setFormUrl, placeholder: 'https://docs.google.com/document/d/…' },
                  ].map((field) => (
                    <div key={field.id}>
                      <label htmlFor={field.id} className={labelClass}>{field.label}</label>
                      <div className="relative">
                        <field.icon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          id={field.id}
                          type="url"
                          value={field.value}
                          onChange={(e) => field.set(e.target.value)}
                          placeholder={field.placeholder}
                          className={`${inputClass} pl-10`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 px-7 py-4 border-t border-slate-100 bg-slate-50/60 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={checking}
              className="flex-1 px-5 py-2.5 bg-slate-900 disabled:opacity-60 text-white rounded-xl hover:bg-slate-800 transition-colors text-sm font-semibold shadow-sm"
            >
              {mode === 'create' ? 'Create client' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
