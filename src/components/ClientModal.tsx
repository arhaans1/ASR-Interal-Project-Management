'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Client, ClientStatus } from '@/types/database';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, businessName: string, status: ClientStatus, username?: string, password?: string) => void;
  client?: Client | null;
  mode: 'create' | 'edit';
}

const statusOptions: ClientStatus[] = [
  'Active',
  'Launched',
  'Team Members',
  'Templates',
  'Archived',
];

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

  useEffect(() => {
    if (client && mode === 'edit') {
      setName(client.name);
      setBusinessName(client.business_name);
      setUsername(client.username || '');
      setPassword(client.password || ''); // Note: In real app, don't populate password back
      setStatus(client.status);
    } else {
      setName('');
      setBusinessName('');
      setUsername('');
      setPassword('');
      setStatus('Active');
    }
  }, [client, mode, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && businessName.trim()) {
      onSubmit(name.trim(), businessName.trim(), status, username.trim(), password.trim());
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-100">
        {/* Header */}
        <div className="px-8 pt-8 pb-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
              {mode === 'create' ? 'New Client' : 'Edit Client'}
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              {mode === 'create' ? 'Add a new client to your workspace' : 'Update client details'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-gray-50 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 pt-2 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 ml-1">
                Client Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-gray-800 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 ml-1">
                Business Name
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Acme Corp"
                className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-gray-800 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 ml-1">
                Status
              </label>
              <div className="relative">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ClientStatus)}
                  className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-gray-800 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none appearance-none cursor-pointer"
                >
                  {statusOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {/* Custom Arrow */}
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Client Portal Access</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 ml-1">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username"
                  className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-gray-800 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 ml-1">
                  Password
                </label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="password"
                  className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-gray-800 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                />
              </div>
            </div>
          </div>



          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-5 py-3.5 border border-gray-200 text-gray-600 rounded-2xl hover:bg-gray-50 hover:text-gray-800 transition-colors font-semibold shadow-sm hover:shadow-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-5 py-3.5 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all font-semibold shadow-lg hover:shadow-xl ring-1 ring-white/20"
            >
              {mode === 'create' ? 'Create Client' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div >
    </div >
  );
}
