'use client';

import React, { useState, useEffect } from 'react';

interface Lang {
  common: Record<string, string>;
  admin: Record<string, string>;
}

export default function AdminLayout({
  children,
  lang,
}: {
  children: React.ReactNode;
  lang: Lang;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = sessionStorage.getItem('admin_token');
    if (saved) setToken(saved);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">{lang.common.loading}</p>
      </div>
    );
  }

  if (!token) {
    return <LoginForm lang={lang} onLogin={(t) => { setToken(t); sessionStorage.setItem('admin_token', t); }} />;
  }

  return (
    <AdminContext.Provider value={{ token, lang, logout: () => { setToken(null); sessionStorage.removeItem('admin_token'); } }}>
      {children}
    </AdminContext.Provider>
  );
}

// Context
interface AdminContextType {
  token: string;
  lang: Lang;
  logout: () => void;
}

export const AdminContext = React.createContext<AdminContextType>({
  token: '',
  lang: { common: {}, admin: {} },
  logout: () => {},
});

export function useAdmin() {
  return React.useContext(AdminContext);
}

// Login Form
function LoginForm({ lang, onLogin }: { lang: Lang; onLogin: (token: string) => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const t = lang.admin;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok) {
        onLogin(data.token);
      } else {
        setError(data.error);
      }
    } catch {
      setError(lang.common.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-8 border">
          <h1 className="text-2xl font-bold text-center mb-6">{t.login_title}</h1>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1 text-gray-700">{t.password}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t.password_placeholder}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-gray-900 text-white rounded-md font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? lang.common.loading : t.login}
          </button>
        </form>
      </div>
    </div>
  );
}
