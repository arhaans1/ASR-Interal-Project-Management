
import { useState, useEffect } from 'react';
import { User } from '@/types/database';
import { X, Plus, Trash2, Edit2, Shield, User as UserIcon, Loader2, Save, Key } from 'lucide-react';


interface TeamManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function TeamManagementModal({ isOpen, onClose }: TeamManagementModalProps) {
    const [activeTab, setActiveTab] = useState<'profile' | 'team'>('profile');
    const [users, setUsers] = useState<User[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null); // Details of logged in user

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Profile Form State
    const [profileUsername, setProfileUsername] = useState('');
    const [profilePassword, setProfilePassword] = useState('');

    // New Team Member Form State
    const [newUserUsername, setNewUserUsername] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [isCreatingUser, setIsCreatingUser] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchCurrentUser();
            if (activeTab === 'team') {
                fetchUsers();
            }
        }
    }, [isOpen, activeTab]);

    const fetchCurrentUser = async () => {
        try {
            const res = await fetch('/api/auth/me');
            const data = await res.json();
            if (data.user) {
                setCurrentUser(data.user);
                setProfileUsername(data.user.username);
            }
        } catch (e) {
            console.error("Failed to fetch current user");
        }
    };

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

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profilePassword && profileUsername === currentUser?.username) {
            return; // No changes
        }

        try {
            setIsLoading(true);
            setError('');
            setSuccess('');

            const res = await fetch(`/api/users/${currentUser.userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: profileUsername,
                    password: profilePassword || undefined
                }),
            });

            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setSuccess('Profile updated successfully!');
            // Update session? Ideally yes, but tricky client-side.
            // For now, let's just assume it worked.
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsLoading(true);
            setError('');

            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: newUserUsername,
                    password: newUserPassword,
                    role: 'admin'
                })
            });

            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setSuccess('Team member created!');
            setNewUserUsername('');
            setNewUserPassword('');
            setIsCreatingUser(false);
            fetchUsers(); // Refresh list
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm('Are you sure you want to remove this admin user?')) return;

        try {
            const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            fetchUsers();
        } catch (err: any) {
            setError(err.message);
        }
    };

    if (!isOpen) return null;

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
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 bg-gray-50/50 shrink-0">
                    <button
                        onClick={() => { setActiveTab('profile'); setError(''); setSuccess(''); }}
                        className={`flex-1 py-4 text-sm font-bold text-center border-b-2 transition-colors ${activeTab === 'profile' ? 'border-indigo-500 text-indigo-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                            }`}
                    >
                        My Profile
                    </button>
                    <button
                        onClick={() => { setActiveTab('team'); setError(''); setSuccess(''); }}
                        className={`flex-1 py-4 text-sm font-bold text-center border-b-2 transition-colors ${activeTab === 'team' ? 'border-indigo-500 text-indigo-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                            }`}
                    >
                        Manage Team
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="mb-4 p-3 bg-emerald-50 text-emerald-600 text-sm rounded-xl border border-emerald-100">
                            {success}
                        </div>
                    )}

                    {activeTab === 'profile' && (
                        <form onSubmit={handleUpdateProfile} className="space-y-6 max-w-md mx-auto py-4">
                            <div className="text-center mb-6">
                                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
                                    <UserIcon className="w-10 h-10 text-gray-400" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-900">{profileUsername}</h3>
                                <p className="text-sm text-gray-500">Admin</p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Username</label>
                                    <input
                                        type="text"
                                        value={profileUsername}
                                        onChange={(e) => setProfileUsername(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all font-medium text-slate-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">New Password</label>
                                    <div className="relative">
                                        <input
                                            type="text" // Visible as per typical requirement, or password? Let's do text for simplicity/visibility request
                                            value={profilePassword}
                                            onChange={(e) => setProfilePassword(e.target.value)}
                                            placeholder="Leave blank to keep current"
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all font-medium text-slate-900"
                                        />
                                        <Key className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                                >
                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Update Profile
                                </button>
                            </div>
                        </form>
                    )}

                    {activeTab === 'team' && (
                        <div className="space-y-6">
                            {/* Add New User */}
                            {!isCreatingUser ? (
                                <button
                                    onClick={() => setIsCreatingUser(true)}
                                    className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center gap-2 text-gray-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all font-bold"
                                >
                                    <Plus className="w-5 h-5" />
                                    Add New Team Member
                                </button>
                            ) : (
                                <form onSubmit={handleCreateUser} className="bg-gray-50 rounded-2xl p-4 border border-gray-200 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="font-bold text-slate-900">New Admin User</h4>
                                        <button type="button" onClick={() => setIsCreatingUser(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="text-xs font-bold text-gray-500">Username</label>
                                            <input required type="text" value={newUserUsername} onChange={e => setNewUserUsername(e.target.value)} className="w-full mt-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500">Password</label>
                                            <input required type="text" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} className="w-full mt-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm" />
                                        </div>
                                    </div>
                                    <button disabled={isLoading} type="submit" className="w-full py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-black">
                                        {isLoading ? 'Creating...' : 'Create Account'}
                                    </button>
                                </form>
                            )}

                            {/* User List */}
                            <div className="space-y-2">
                                {users.map(user => (
                                    <div key={user.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-gray-200 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold text-xs ring-1 ring-indigo-100">
                                                {user.username.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900 text-sm">{user.username}</div>
                                                <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Admin</div>
                                            </div>
                                        </div>
                                        {currentUser?.userId !== user.id ? (
                                            <button
                                                onClick={() => handleDeleteUser(user.id)}
                                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Remove User"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        ) : (
                                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded font-medium">You</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
