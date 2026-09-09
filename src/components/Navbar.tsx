import React from 'react';
import {
  MapPin,
  Moon,
  Sun,
  Smartphone,
  Monitor,
  LogOut,
  User as UserIcon,
  Shield,
  Wifi,
  WifiOff,
  Code2,
  Settings,
} from 'lucide-react';
import { User } from '../types';

interface NavbarProps {
  user: User | null;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  isMobileFrame: boolean;
  onToggleMobileFrame: () => void;
  isOnline: boolean;
  onOpenSettings: () => void;
  onOpenFlutterExport: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  darkMode,
  onToggleDarkMode,
  isMobileFrame,
  onToggleMobileFrame,
  isOnline,
  onOpenSettings,
  onOpenFlutterExport,
  onLogout,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Brand - Click to reload page */}
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-3 text-left group cursor-pointer hover:opacity-90 active:scale-95 transition-all p-1 -ml-1 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          title="Ana səhifəni yenilə"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/30 group-hover:bg-blue-700 transition">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-white text-base tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                Müştəri GPS
              </span>
              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                v1.0
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
              Müştərilər və Sürücü GPS idarəetməsi
            </p>
          </div>
        </button>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Online/Offline status */}
          <div
            title={isOnline ? 'İnternet bağlantısı aktivdir' : 'Offline rejim (Yaddaşdan işləyir)'}
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              isOnline
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
            }`}
          >
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span>{isOnline ? 'Onlayn' : 'Oflayn'}</span>
          </div>

          {/* Flutter Code Modal Trigger */}
          <button
            onClick={onOpenFlutterExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition"
            title="Flutter layihə fayllarını göstər / Yüklə"
          >
            <Code2 className="w-4 h-4 text-blue-500" />
            <span className="hidden sm:inline">Flutter Kodu</span>
          </button>

          {/* Device Frame Toggle */}
          <button
            onClick={onToggleMobileFrame}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title={isMobileFrame ? 'Tam ekran Web rejiminə keç' : 'Telefon görünüşü rejiminə keç'}
          >
            {isMobileFrame ? <Monitor className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
          </button>

          {/* Dark / Light Toggle */}
          <button
            onClick={onToggleDarkMode}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title={darkMode ? 'İşıqlı rejimə keç' : 'Qaranlıq rejimə keç'}
          >
            {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
          </button>

          {/* User Profile / Settings */}
          {user && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700">
              <button
                onClick={onOpenSettings}
                className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition text-left"
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                  {user.role === 'admin' ? <Shield className="w-4 h-4" /> : user.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden lg:block">
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-none">
                    {user.name}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 capitalize">
                    {user.role === 'admin' ? 'Admin' : 'İstifadəçi'}
                  </div>
                </div>
              </button>

              <button
                onClick={onLogout}
                className="p-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                title="Çıxış"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
