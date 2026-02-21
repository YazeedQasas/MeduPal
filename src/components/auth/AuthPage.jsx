import React, { useState } from 'react';
import './auth-gradient.css';
import { useAuth } from '../../context/AuthContext';

export default function AuthPage({ setActiveTab }) {
    const [mode, setMode] = useState('signin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [localError, setLocalError] = useState(null);

    const { signIn, signUpStudent, authError } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setLocalError(null);

        try {
            if (mode === 'signin') {
                const { error } = await signIn({ email, password });
                if (error) {
                    setLocalError(error.message || 'Unable to sign in.');
                    return;
                }
            } else {
                const { error } = await signUpStudent({ email, password, fullName });
                if (error) {
                    setLocalError(error.message || 'Unable to create account.');
                    return;
                }
            }
            setActiveTab('dashboard');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center py-12 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 animate-gradient-x overflow-hidden relative">
            <div className="w-full max-w-md bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 rounded-2xl p-8 shadow-lg backdrop-blur-sm relative z-10">
                <div className="flex items-center justify-between gap-3 mb-6">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setActiveTab('landing')}
                            className="w-10 h-10 flex items-center justify-center rounded-full bg-secondary text-secondary-foreground hover:opacity-90 transition flex-shrink-0"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                            </svg>
                        </button>
                        <h2 className="text-2xl font-bold">{mode === 'signin' ? 'Sign in' : 'Create account'}</h2>
                    </div>
                    <button
                        type="button"
                        onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                        className="underline-offset-2 underline text-sm text-muted-foreground"
                    >
                        {mode === 'signin' ? 'Create account' : 'Sign in'}
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="auth-email" className="block text-sm font-medium text-white">Email</label>
                        <input
                            id="auth-email"
                            type="email"
                            required
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="mt-2 w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-white/30 focus:border-white/60 focus:outline-none transition"
                        />
                    </div>

                    <div>
                        <label htmlFor="auth-password" className="block text-sm font-medium text-white">Password</label>
                        <input
                            id="auth-password"
                            type="password"
                            required
                            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-2 w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-white/30 focus:border-white/60 focus:outline-none transition"
                        />
                    </div>

                    {mode === 'signup' && (
                        <div>
                            <label htmlFor="auth-name" className="block text-sm font-medium text-white">Name</label>
                            <input
                                id="auth-name"
                                type="text"
                                required
                                autoComplete="name"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="mt-2 w-full px-4 py-2 rounded-lg bg-slate-700/50 border border-white/30 focus:border-white/60 focus:outline-none transition"
                            />
                        </div>
                    )}

                    {(localError || authError) && (
                        <p className="text-sm text-red-400">{localError || authError}</p>
                    )}

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full px-4 py-2 rounded-full bg-white text-black font-medium hover:bg-gray-100 transition shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {submitting ? (mode === 'signin' ? 'Signing in...' : 'Creating account...') : (mode === 'signin' ? 'Sign in' : 'Create account')}
                        </button>
                    </div>
                </form>

                <div className="mt-6 text-center text-sm text-muted-foreground">
                    By continuing you agree to our terms and privacy.
                </div>
            </div>
        </div>
    );
}
