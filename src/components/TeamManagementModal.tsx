'use client';

import { useEffect, useState } from 'react';
import { User, UserRole } from '@/types/database';
import { ArrowDown, ArrowUp, Edit2, Eye, EyeOff, Key, Loader2, Plus, Save, Shield, Trash2, User as UserIcon, X } from 'lucide-react';
import { refreshWorkspace, saveWorkspaceSettings, useWorkspace } from '@/hooks/useWorkspace';
import { BUILT_IN_SECTIONS, MAX_SECTION_NAME, SidebarSection } from '@/lib/sections';

interface TeamManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    // How many clients sit in each sidebar section
    sectionCounts?: Record<string, number>;
}

type Tab = 'profile' | 'team' | 'sidebar';

// users.role holds two things at once: admin or team member, and whether they are an operator.
const isAdminRole = (role?: string) => role !== 'member' && role !== 'member_operator';
const isOperatorRole = (role?: string) => role === 'operator' || role === 'member_operator';
const toRole = (admin: boolean, operator: boolean): UserRole =>
    admin ? (operator ? 'operator' : 'admin') : operator ? 'member_operator' : 'member';
const roleLabel = (role?: string) =>
    `${isAdminRole(role) ? 'Admin' : 'Team member'}${isOperatorRole(role) ? ' · Operator' : ''}`;

function RoleFields({
    admin,
    operator,
    onAdmin,
    onOperator,
    idPrefix,
}: {
    admin: boolean;
    operator: boolean;
    onAdmin: (value: boolean) => void;
    onOperator: (value: boolean) => void;
    idPrefix: string;
}) {
    const options = [
        { value: false, title: 'Team member', hint: 'Client projects, and only their own task board (My Tasks)' },
        { value: true, title: 'Admin', hint: 'Everything: all team members’ tasks, users and settings' },
    ];
    return (
        <div className="space-y-2">
            <span className="text-xs font-bold text-gray-500">Access</span>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Access">
                {options.map((option) => (
                    <button
                        key={option.title}
                        type="button"
                        role="radio"
                        aria-checked={admin === option.value}
                        onClick={() => onAdmin(option.value)}
                        className={`text-left p-3 rounded-xl border transition-all ${admin === option.value
                            ? 'border-indigo-500 bg-white ring-4 ring-indigo-500/10'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}
                    >
                        <div className="text-sm font-bold text-slate-900">{option.title}</div>
                        <div className="text-xs text-gray-500 mt-0.5 leading-snug">{option.hint}</div>
                    </button>
                ))}
            </div>
            <label htmlFor={`${idPrefix}-operator`} className="flex items-start gap-2.5 p-3 rounded-xl border border-gray-200 bg-white cursor-pointer">
                <input
                    id={`${idPrefix}-operator`}
                    type="checkbox"
                    checked={operator}
                    onChange={(e) => onOperator(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded accent-indigo-600"
                />
                <span>
                    <span className="block text-sm font-bold text-slate-900">Operator</span>
                    <span className="block text-xs text-gray-500 leading-snug">Can be assigned client projects and gets the “My clients” dashboard</span>
                </span>
            </label>
        </div>
    );
}

export default function TeamManagementModal({ isOpen, onClose, sectionCounts = {} }: TeamManagementModalProps) {
    const { user: currentUser, settings } = useWorkspace();
    const isAdmin = Boolean(currentUser?.isAdmin);

    const [activeTab, setActiveTab] = useState<Tab>('profile');
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Profile
    const [profileUsername, setProfileUsername] = useState('');
    const [profilePassword, setProfilePassword] = useState('');

    // New user
    const [isCreatingUser, setIsCreatingUser] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newAdmin, setNewAdmin] = useState(false);
    const [newOperator, setNewOperator] = useState(false);

    // Editing a user
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [editUsername, setEditUsername] = useState('');
    const [editPassword, setEditPassword] = useState('');
    const [editAdmin, setEditAdmin] = useState(false);
    const [editOperator, setEditOperator] = useState(false);

    // Sidebar sections (a working copy until saved)
    const [sections, setSections] = useState<SidebarSection[]>([]);
    const [newSection, setNewSection] = useState('');

    const clearMessages = () => { setError(''); setSuccess(''); };

    useEffect(() => {
        if (isOpen && currentUser) setProfileUsername(currentUser.username);
    }, [isOpen, currentUser]);

    useEffect(() => {
        if (isOpen) setSections(settings.sections.map((s) => ({ ...s })));
    }, [isOpen, settings]);

    const fetchUsers = async () => {
        try {
            setIsLoading(true);
            const res = await fetch('/api/users');
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setUsers(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && activeTab === 'team' && isAdmin) fetchUsers();
    }, [isOpen, activeTab, isAdmin]);

    // A team member who lands on an admin tab goes back to their profile.
    useEffect(() => {
        if (!isAdmin && activeTab !== 'profile') setActiveTab('profile');
    }, [isAdmin, activeTab]);

    const request = async (url: string, method: string, body?: unknown) => {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: body ? JSON.stringify(body) : undefined,
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'Something went wrong');
        return data;
    };

    const run = async (work: () => Promise<void>) => {
        try {
            setIsLoading(true);
            clearMessages();
            await work();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateProfile = (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser || (!profilePassword && profileUsername === currentUser.username)) return;
        run(async () => {
            await request(`/api/users/${currentUser.userId}`, 'PUT', {
                username: profileUsername.trim(),
                password: profilePassword || undefined,
            });
            setProfilePassword('');
            setSuccess('Profile updated.');
            await refreshWorkspace();
        });
    };

    const handleCreateUser = (e: React.FormEvent) => {
        e.preventDefault();
        run(async () => {
            await request('/api/users', 'POST', {
                username: newUsername.trim(),
                password: newPassword,
                role: toRole(newAdmin, newOperator),
            });
            setSuccess(`${newUsername.trim()} added.`);
            setNewUsername('');
            setNewPassword('');
            setNewAdmin(false);
            setNewOperator(false);
            setIsCreatingUser(false);
            await fetchUsers();
        });
    };

    const startEditing = (user: User) => {
        setEditingUserId(user.id);
        setEditUsername(user.username);
        setEditPassword('');
        setEditAdmin(isAdminRole(user.role));
        setEditOperator(isOperatorRole(user.role));
        clearMessages();
    };

    const handleSaveUser = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUserId) return;
        run(async () => {
            const data = await request(`/api/users/${editingUserId}`, 'PUT', {
                username: editUsername.trim(),
                password: editPassword.trim() || undefined,
                role: toRole(editAdmin, editOperator),
            });
            setSuccess(`${data.username} updated. Access changes apply within a minute; the operator dashboard appears the next time they sign in.`);
            setEditingUserId(null);
            await Promise.all([fetchUsers(), refreshWorkspace()]);
        });
    };

    const handleDeleteUser = (user: User) => {
        if (!confirm(`Remove ${user.username}? Clients assigned to them as operator become unassigned.`)) return;
        run(async () => {
            await request(`/api/users/${user.id}`, 'DELETE');
            await fetchUsers();
        });
    };

    // ---- Sidebar sections
    const moveSection = (index: number, by: number) => {
        setSections((prev) => {
            const next = [...prev];
            const target = index + by;
            if (target < 0 || target >= next.length) return prev;
            [next[index], next[target]] = [next[target], next[index]];
            return next;
        });
    };

    const addSection = () => {
        const name = newSection.trim();
        if (!name) return;
        if (sections.some((s) => s.name.toLowerCase() === name.toLowerCase())) {
            setError(`There is already a section called "${name}".`);
            return;
        }
        clearMessages();
        setSections((prev) => [...prev, { name, hidden: false }]);
        setNewSection('');
    };

    const sectionsChanged = JSON.stringify(sections) !== JSON.stringify(settings.sections);

    const handleSaveSections = () =>
        run(async () => {
            await saveWorkspaceSettings({ sections });
            setSuccess('Sidebar updated for everyone.');
        });

    if (!isOpen) return null;

    const tabs: { id: Tab; label: string }[] = [
        { id: 'profile', label: 'My Profile' },
        ...(isAdmin ? [{ id: 'team' as Tab, label: 'Manage Team' }, { id: 'sidebar' as Tab, label: 'Sidebar' }] : []),
    ];

    const inputClass = 'w-full mt-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

            <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-slate-900 px-6 py-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/20 rounded-xl">
                            <Shield className="w-5 h-5 text-indigo-400" />
                        </div>
                        <h2 className="text-xl font-bold text-white tracking-tight">Team Settings</h2>
                    </div>
                    <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                {tabs.length > 1 && (
                    <div className="flex border-b border-gray-100 bg-gray-50/50 shrink-0">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => { setActiveTab(tab.id); clearMessages(); }}
                                className={`flex-1 py-4 text-sm font-bold text-center border-b-2 transition-colors ${activeTab === tab.id
                                    ? 'border-indigo-500 text-indigo-600 bg-white'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {error && (
                        <div role="alert" className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">{error}</div>
                    )}
                    {success && (
                        <div className="mb-4 p-3 bg-emerald-50 text-emerald-700 text-sm rounded-xl border border-emerald-100">{success}</div>
                    )}

                    {activeTab === 'profile' && (
                        <form onSubmit={handleUpdateProfile} className="space-y-6 max-w-md mx-auto py-4">
                            <div className="text-center mb-6">
                                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
                                    <UserIcon className="w-10 h-10 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900">{profileUsername}</h3>
                                <p className="text-sm text-gray-500">
                                    {currentUser ? `${currentUser.isAdmin ? 'Admin' : 'Team member'}${currentUser.isOperator ? ' · Operator' : ''}` : ''}
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="profile-username" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Username</label>
                                    <input
                                        id="profile-username"
                                        type="text"
                                        value={profileUsername}
                                        onChange={(e) => setProfileUsername(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all font-medium text-slate-900"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="profile-password" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">New Password</label>
                                    <div className="relative">
                                        <input
                                            id="profile-password"
                                            type="text"
                                            value={profilePassword}
                                            onChange={(e) => setProfilePassword(e.target.value)}
                                            placeholder="Leave blank to keep current"
                                            autoComplete="off"
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all font-medium text-slate-900"
                                        />
                                        <Key className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Update Profile
                            </button>
                        </form>
                    )}

                    {activeTab === 'team' && isAdmin && (
                        <div className="space-y-6">
                            {!isCreatingUser ? (
                                <button
                                    onClick={() => { setIsCreatingUser(true); clearMessages(); }}
                                    className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center gap-2 text-gray-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all font-bold"
                                >
                                    <Plus className="w-5 h-5" />
                                    Add user
                                </button>
                            ) : (
                                <form onSubmit={handleCreateUser} className="bg-gray-50 rounded-2xl p-4 border border-gray-200 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h4 className="font-bold text-slate-900">New user</h4>
                                        <button type="button" onClick={() => setIsCreatingUser(false)} aria-label="Cancel" className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                                    </div>
                                    <RoleFields admin={newAdmin} operator={newOperator} onAdmin={setNewAdmin} onOperator={setNewOperator} idPrefix="new" />
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="new-username" className="text-xs font-bold text-gray-500">Username</label>
                                            <input id="new-username" required type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className={inputClass} />
                                        </div>
                                        <div>
                                            <label htmlFor="new-password" className="text-xs font-bold text-gray-500">Password</label>
                                            <input id="new-password" required type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="off" className={inputClass} />
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 leading-relaxed">
                                        “My Tasks” opens the Team Members card with the same name as the username.
                                    </p>
                                    <button disabled={isLoading} type="submit" className="w-full py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-black disabled:opacity-60">
                                        {isLoading ? 'Creating...' : 'Create account'}
                                    </button>
                                </form>
                            )}

                            <div className="space-y-2">
                                {users.map((user) => editingUserId === user.id ? (
                                    <form key={user.id} onSubmit={handleSaveUser} className="p-4 bg-gray-50 border border-indigo-200 rounded-xl space-y-3">
                                        <div className="flex justify-between items-center">
                                            <h4 className="font-bold text-slate-900 text-sm">Edit {user.username}</h4>
                                            <button type="button" onClick={() => setEditingUserId(null)} aria-label="Cancel editing" className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                                        </div>
                                        <RoleFields admin={editAdmin} operator={editOperator} onAdmin={setEditAdmin} onOperator={setEditOperator} idPrefix="edit" />
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label htmlFor="edit-username" className="text-xs font-bold text-gray-500">Username</label>
                                                <input id="edit-username" required type="text" value={editUsername} onChange={(e) => setEditUsername(e.target.value)} className={inputClass} />
                                            </div>
                                            <div>
                                                <label htmlFor="edit-password" className="text-xs font-bold text-gray-500">New password</label>
                                                <input id="edit-password" type="text" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder="Leave blank to keep current" autoComplete="off" className={inputClass} />
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button type="button" onClick={() => setEditingUserId(null)} className="flex-1 py-2 bg-white border border-gray-200 text-slate-700 rounded-lg text-sm font-bold hover:bg-gray-50">Cancel</button>
                                            <button disabled={isLoading} type="submit" className="flex-1 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-black disabled:opacity-60">
                                                {isLoading ? 'Saving...' : 'Save changes'}
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <div key={user.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-gray-200 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ring-1 ${isAdminRole(user.role) ? 'bg-indigo-50 text-indigo-600 ring-indigo-100' : 'bg-slate-100 text-slate-600 ring-slate-200'}`}>
                                                {user.username.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900 text-sm">{user.username}</div>
                                                <div className={`text-[10px] font-bold uppercase tracking-wider ${isAdminRole(user.role) ? 'text-indigo-600' : 'text-gray-400'}`}>
                                                    {roleLabel(user.role)}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {currentUser?.userId === user.id && (
                                                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded font-medium mr-1">You</span>
                                            )}
                                            <button
                                                onClick={() => startEditing(user)}
                                                className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                title="Edit user"
                                                aria-label={`Edit ${user.username}`}
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            {currentUser?.userId !== user.id && (
                                                <button
                                                    onClick={() => handleDeleteUser(user)}
                                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Remove user"
                                                    aria-label={`Remove ${user.username}`}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'sidebar' && isAdmin && (
                        <div className="space-y-5">
                            <p className="text-sm text-gray-500 leading-relaxed">
                                Choose which sections show in the sidebar, in what order. Hiding a section keeps its clients; it only takes it out of view for everyone.
                            </p>

                            <ul className="space-y-2">
                                {sections.map((section, index) => {
                                    const count = sectionCounts[section.name] || 0;
                                    const builtIn = BUILT_IN_SECTIONS.includes(section.name);
                                    return (
                                        <li key={section.name} className={`flex items-center gap-2 p-3 rounded-xl border ${section.hidden ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200'}`}>
                                            <div className="flex flex-col">
                                                <button type="button" onClick={() => moveSection(index, -1)} disabled={index === 0} aria-label={`Move ${section.name} up`} className="p-0.5 text-gray-400 hover:text-slate-900 disabled:opacity-30">
                                                    <ArrowUp className="w-3.5 h-3.5" />
                                                </button>
                                                <button type="button" onClick={() => moveSection(index, 1)} disabled={index === sections.length - 1} aria-label={`Move ${section.name} down`} className="p-0.5 text-gray-400 hover:text-slate-900 disabled:opacity-30">
                                                    <ArrowDown className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className={`text-sm font-bold ${section.hidden ? 'text-gray-400' : 'text-slate-900'}`}>{section.name}</div>
                                                <div className="text-xs text-gray-500">
                                                    {count} {count === 1 ? 'card' : 'cards'}{section.hidden ? ' · hidden' : ''}
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setSections((prev) => prev.map((s, i) => (i === index ? { ...s, hidden: !s.hidden } : s)))}
                                                aria-pressed={!section.hidden}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${section.hidden
                                                    ? 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                                                    : 'bg-slate-900 text-white hover:bg-slate-800'
                                                    }`}
                                            >
                                                {section.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                {section.hidden ? 'Hidden' : 'Shown'}
                                            </button>
                                            <button
                                                type="button"
                                                disabled={builtIn || count > 0}
                                                onClick={() => setSections((prev) => prev.filter((_, i) => i !== index))}
                                                title={builtIn ? 'Built-in section: it can be hidden but not removed' : count > 0 ? 'Move its cards to another section first, or hide it' : 'Remove section'}
                                                aria-label={`Remove ${section.name}`}
                                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>

                            <div className="flex gap-2">
                                <label htmlFor="new-section" className="sr-only">New section name</label>
                                <input
                                    id="new-section"
                                    type="text"
                                    value={newSection}
                                    maxLength={MAX_SECTION_NAME}
                                    onChange={(e) => setNewSection(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSection(); } }}
                                    placeholder="New section name, e.g. On Hold"
                                    className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                                />
                                <button type="button" onClick={addSection} className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 text-slate-700 rounded-lg text-sm font-bold hover:bg-gray-50">
                                    <Plus className="w-4 h-4" />
                                    Add
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={handleSaveSections}
                                disabled={isLoading || !sectionsChanged}
                                className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-black disabled:opacity-40 flex items-center justify-center gap-2"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save sidebar
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
