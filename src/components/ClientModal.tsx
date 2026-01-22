'use client';

import { useState, useEffect } from 'react';
import { X, User, Building2, Activity } from 'lucide-react';
import { Client, ClientStatus } from '@/types/database';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, businessName: string, status: ClientStatus) => void;
  client?: Client | null;
  mode: 'create' | 'edit';
}

const statusOptions: { value: ClientStatus; label: string; color: string }[] = [
  { value: 'Onboarding', label: 'Onboarding', color: 'bg-blue-100 text-blue-600' },
  { value: 'In-Process', label: 'In Process', color: 'bg-amber-100 text-amber-600' },
  { value: 'On-Hold', label: 'On Hold', color: 'bg-orange-100 text-orange-600' },
  { value: 'Ads Launched', label: 'Ads Launched', color: 'bg-emerald-100 text-emerald-600' },
  { value: 'Closed', label: 'Closed', color: 'bg-slate-100 text-slate-500' },
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
  const [status, setStatus] = useState<ClientStatus>('Onboarding');

  useEffect(() => {
    if (client && mode === 'edit') {
      setName(client.name);
      setBusinessName(client.business_name);
      setStatus(client.status);
    } else {
      setName('');
      setBusinessName('');
      setStatus('Onboarding');
    }
  }, [client, mode, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && businessName.trim()) {
      onSubmit(name.trim(), businessName.trim(), status);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 pt-8 pb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <User className="w-7 h-7 text-white" />
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mt-4">
            {mode === 'create' ? 'Add New Client' : 'Update Client'}
          </h2>
          <p className="text-slate-500 mt-1">
            {mode === 'create'
              ? 'Fill in the details to create a new client'
              : 'Update the client information below'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-6">
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
              <User className="w-4 h-4 text-slate-400" />
              Client Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 transition-all outline-none text-slate-700 placeholder-slate-400"
              required
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
              <Building2 className="w-4 h-4 text-slate-400" />
              Business Name
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Acme Corporation"
              className="w-full px-5 py-4 bg-slate-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 transition-all outline-none text-slate-700 placeholder-slate-400"
              required
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
              <Activity className="w-4 h-4 text-slate-400" />
              Status
            </label>
            <div className="grid grid-cols-2 gap-3">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setStatus(option.value)}
                  className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    status === option.value
                      ? `${option.color} ring-2 ring-offset-2 ring-current`
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-2xl hover:from-indigo-600 hover:to-purple-600 transition-all font-semibold shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 hover:-translate-y-0.5"
            >
              {mode === 'create' ? 'Create Client' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
