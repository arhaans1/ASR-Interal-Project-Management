'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Login failed');
            }

            // Redirect based on role
            if (data.role === 'admin') {
                router.push('/');
            } else if (data.role === 'client' && data.clientId) {
                router.push(`/portal/${data.clientId}`);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex items-center justify-center p-4">
            {/* Mesh Gradient Background */}
            <div className="absolute inset-0 bg-[#FAFAFA] -z-20" />
            <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-purple-50/50 to-transparent -z-10" />

            <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 p-8 md:p-10 animate-in fade-in zoom-in-95 duration-300">
                <div className="flex flex-col items-center mb-10">
                    <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg ring-4 ring-slate-50 mb-4">
                        <span className="text-white font-bold text-3xl">A</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Welcome Back</h1>
                    <p className="text-gray-500 text-sm mt-2">Sign in to access your workspace</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl font-medium flex items-center justify-center text-center animate-in shake">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 ml-1">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-gray-800 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all outline-none"
                            placeholder="Enter your username"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 ml-1">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-gray-800 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all outline-none"
                            placeholder="Enter your password"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm tracking-wide shadow-lg hover:shadow-xl hover:bg-slate-800 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Signing in...
                            </>
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
