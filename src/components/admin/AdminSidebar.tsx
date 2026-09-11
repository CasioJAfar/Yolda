import React from 'react';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Truck,
  History,
  Trash2,
  FileText,
  ShieldCheck,
  Settings,
  ArrowLeft,
  Radio,
  Package,
} from 'lucide-react';
import { AdminSection } from '../../types';

interface AdminSidebarProps {
  currentSection: AdminSection;
  onSelectSection: (section: AdminSection) => void;
  trashCount: number;
  onExitAdmin: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentSection,
  onSelectSection,
  trashCount,
  onExitAdmin,
}) => {
  const menuItems: { id: AdminSection; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'online-drivers', label: 'Canlı Onlayn Sürücülər', icon: Radio },
    { id: 'orders', label: 'Bütün Sifarişlər', icon: Package },
    { id: 'users', label: 'İstifadəçilər', icon: UserCheck },
    { id: 'customers', label: 'Bütün Müştərilər', icon: Users },
    { id: 'drivers', label: 'Bütün Sürücülər', icon: Truck },
    { id: 'history', label: 'Göndəriş Tarixçəsi', icon: History },
    { id: 'trash', label: 'Zibil qutusu', icon: Trash2, badge: trashCount },
    { id: 'logs', label: 'Sistem Logları', icon: FileText },
    { id: 'permissions', label: 'İcazələr', icon: ShieldCheck },
    { id: 'settings', label: 'Sistem Ayarları', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 border-r border-slate-800 flex flex-col flex-shrink-0 min-h-full">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="font-bold text-white text-base tracking-tight">Admin İdarəetmə</h2>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">SaaS İdarəetmə Paneli</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectSection(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-white text-blue-700' : 'bg-rose-500 text-white'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Return Button */}
      <div className="p-3 border-t border-slate-800">
        <button
          onClick={onExitAdmin}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Əsas Tətbiqə Qayıt</span>
        </button>
      </div>
    </aside>
  );
};
