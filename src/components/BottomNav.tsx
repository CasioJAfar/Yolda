import React from 'react';
import { Home, Users, Truck, Map, History, Shield } from 'lucide-react';
import { ActiveTab, User } from '../types';

interface BottomNavProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  user: User | null;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onChangeTab, user }) => {
  const tabs: { id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'home', label: 'Əsas', icon: Home },
    { id: 'customers', label: 'Müştərilər', icon: Users },
    { id: 'drivers', label: 'Sürücülər', icon: Truck },
    { id: 'map', label: 'Xəritə', icon: Map },
    { id: 'history', label: 'Tarixçə', icon: History },
  ];

  // Only show Admin tab to admin role
  if (user?.role === 'admin') {
    tabs.push({ id: 'admin', label: 'Admin', icon: Shield });
  }

  return (
    <nav
      id="floating-bottom-nav"
      className="fixed bottom-4 sm:bottom-6 left-0 right-0 z-40 px-3 sm:px-4 pointer-events-none flex justify-center"
      aria-label="Aşağı Naviqasiya Menyu"
    >
      <div className="pointer-events-auto w-full max-w-[420px] bg-white/92 dark:bg-slate-900/92 backdrop-blur-2xl border border-slate-200/90 dark:border-slate-800/90 rounded-full shadow-[0_12px_36px_-6px_rgba(15,23,42,0.18)] dark:shadow-[0_16px_40px_-6px_rgba(0,0,0,0.65)] p-1.5 flex items-center justify-between transition-all duration-300">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`nav-btn-${tab.id}`}
              onClick={() => onChangeTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 sm:px-2 rounded-full transition-all duration-200 select-none group relative ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 scale-[1.02]'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
              }`}
            >
              <Icon
                className={`w-5 h-5 mb-0.5 transition-transform duration-200 ${
                  isActive ? 'scale-110 stroke-[2.4]' : 'group-hover:scale-105 stroke-[1.9]'
                }`}
              />
              <span
                className={`text-[10.5px] leading-tight font-medium tracking-tight truncate max-w-full ${
                  isActive ? 'text-white font-semibold' : ''
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
