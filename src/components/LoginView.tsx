import React, { useState } from 'react';
import { Lock, Eye, EyeOff, AlertCircle, ArrowRight, User as UserIcon } from 'lucide-react';
import { Api } from '../lib/api';
import { User } from '../types';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('İD və şifrə daxil edilməlidir.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const { user } = await Api.login(identifier.trim(), password);
      onLoginSuccess(user);
    } catch (err: any) {
      setError(err.message || 'İD və ya şifrə yalnışdır.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white flex flex-col justify-between p-4 sm:p-6">
      {/* Top spacer */}
      <div className="w-full pt-4 flex justify-end">
        <span className="text-xs px-2.5 py-1 rounded-full bg-blue-900/50 text-blue-300 border border-blue-700/50 font-medium">
          Azərbaycan dili
        </span>
      </div>

      <div className="w-full max-w-md mx-auto my-auto py-6">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-blue-600 shadow-xl shadow-blue-600/30 mb-4 ring-8 ring-blue-500/20 active:scale-95 transition"
            title="Səhifəni yenilə"
          >
            <span className="text-3xl font-black tracking-wider text-white">Y</span>
          </button>
          <h1
            onClick={() => window.location.reload()}
            className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-1 cursor-pointer hover:opacity-90 transition"
            title="Səhifəni yenilə"
          >
            YOLDA
          </h1>
          <p className="text-sm text-slate-400">
            Sürətli və etibarlı idarəetmə sistemi
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-850/90 backdrop-blur-xl border border-slate-700/80 rounded-2xl sm:rounded-3xl p-6 sm:p-7 shadow-2xl">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* ID Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                İD
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="İD daxil edin"
                  required
                  autoFocus
                  autoComplete="username"
                  className="w-full pl-10 pr-3 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Şifrə
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Şifrənizi daxil edin"
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-900"
                />
                <span>Məni xatırla</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50 mt-2"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Daxil ol</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="text-center mt-6 text-xs text-slate-500">
          Yolda v1.0 • Təhlükəsiz Müştəri və Sürücü İdarəetməsi
        </div>
      </div>
    </div>
  );
};
