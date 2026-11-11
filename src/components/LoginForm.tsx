'use client';
import BrandLogo from '@/components/BrandLogo';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function LoginForm({ variant = 'team' }: { variant?: 'team' | 'client' }) {
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
            } else if (data.role === 'operator') {
                router.push('/operator');
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
        <div className="relative h-screen overflow-y-auto bg-slate-950 flex items-center justify-center p-4">
            {/* Soft brand glow */}
            <div className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-indigo-600/30 blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-violet-600/20 blur-3xl" />

            <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 md:p-10 animate-in">
                <div className="flex flex-col items-center mb-8">
                    <BrandLogo theme="light" size={128} priority className="mb-2 h-32 w-32" />
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                        {variant === 'client' ? 'Client Portal' : 'ASR Media Pro'}
                    </h1>
                    <p className="text-slate-500 text-sm mt-1.5 text-center">
                        {variant === 'client'
                            ? 'Sign in with the username and password shared by the ASR Media Pro team'
                            : 'Sign in to your workspace or client portal'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl font-medium flex items-center justify-center text-center animate-in shake">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label htmlFor="login-username" className="text-sm font-semibold text-gray-700 ml-1">Username</label>
                        <input
                            id="login-username"
                            autoComplete="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-gray-800 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all outline-none"
                            placeholder="Enter your username"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="login-password" className="text-sm font-semibold text-gray-700 ml-1">Password</label>
                        <input
                            id="login-password"
                            autoComplete="current-password"
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
                        className="w-full py-3.5 bg-slate-900 text-white rounded-2xl font-semibold text-sm shadow-sm hover:bg-slate-800 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
