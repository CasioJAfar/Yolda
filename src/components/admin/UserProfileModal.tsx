import React, { useState, useEffect } from 'react';
import {
  X,
  User as UserIcon,
  Shield,
  Phone,
  Mail,
  Calendar,
  Clock,
  Users,
  Truck,
  MessageCircle,
  Key,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Trash2,
} from 'lucide-react';
import { User, Customer, Driver, AuditLog } from '../../types';
import { Api } from '../../lib/api';

interface UserProfileModalProps {
  user: User;
  onClose: () => void;
  onToggleStatus: (userId: string, currentStatus: 'active' | 'inactive') => void;
  onOpenPermissions: (user: User) => void;
  onResetPassword: (user: User) => void;
  onDeleteUser: (userId: string) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  onClose,
  onToggleStatus,
  onOpenPermissions,
  onResetPassword,
  onDeleteUser,
}) => {
  const [activeTab, setActiveTab] = useState<'customers' | 'drivers' | 'logs'>('customers');
  const [userCustomers, setUserCustomers] = useState<Customer[]>([]);
  const [userLogs, setUserLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, [user.id]);

  const loadUserData = async () => {
    setLoading(true);
    try {
      const [customers, logs] = await Promise.all([
        Api.getCustomers(user.id),
        Api.getAuditLogs({ userId: user.id, limit: 50 }),
      ]);
      setUserCustomers(customers.filter((c) => c.userId === user.id));
      setUserLogs(logs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white font-bold text-xl flex items-center justify-center shadow-md shadow-blue-500/20">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{user.name}</h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    user.role === 'admin'
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                  }`}
                >
                  {user.role === 'admin' ? 'Admin' : 'İstifadəçi'}
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    user.status === 'active'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                  }`}
                >
                  {user.status === 'active' ? 'Aktiv' : 'Deaktiv'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" />
                  {user.phone}
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" />
                  {user.email}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Qeydiyyat: {new Date(user.createdAt).toLocaleDateString('az-AZ')}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Action Toolbar */}
        <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleStatus(user.id, user.status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                user.status === 'active'
                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100'
                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
              }`}
            >
              {user.status === 'active' ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              <span>{user.status === 'active' ? 'Deaktiv et' : 'Aktivləşdir'}</span>
            </button>

            <button
              onClick={() => onOpenPermissions(user)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
              <span>İcazələri Dəyiş</span>
            </button>

            <button
              onClick={() => onResetPassword(user)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition"
            >
              <Key className="w-3.5 h-3.5 text-amber-500" />
              <span>Şifrəni Yenilə</span>
            </button>
          </div>

          <button
            onClick={() => onDeleteUser(user.id)}
            className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition"
            title="İstifadəçini Sil"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* User Metric Badges */}
        <div className="grid grid-cols-3 gap-3 p-6 pb-2">
          <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-2xl border border-blue-100 dark:border-blue-900/50 text-center">
            <div className="text-xl font-bold text-blue-700 dark:text-blue-300">
              {userCustomers.length}
            </div>
            <div className="text-[11px] text-blue-600/80 dark:text-blue-400 mt-0.5">
              Məxsus Müştərilər
            </div>
          </div>

          <div className="bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 text-center">
            <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
              {user.driverCount || 0}
            </div>
            <div className="text-[11px] text-emerald-600/80 dark:text-emerald-400 mt-0.5">
              Məxsus Sürücülər
            </div>
          </div>

          <div className="bg-purple-50 dark:bg-purple-950/30 p-3 rounded-2xl border border-purple-100 dark:border-purple-900/50 text-center">
            <div className="text-xl font-bold text-purple-700 dark:text-purple-300">
              {user.dispatchCount || 0}
            </div>
            <div className="text-[11px] text-purple-600/80 dark:text-purple-400 mt-0.5">
              WhatsApp Göndərişləri
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="px-6 border-b border-slate-200 dark:border-slate-800 flex gap-4">
          <button
            onClick={() => setActiveTab('customers')}
            className={`py-3 text-xs font-semibold border-b-2 transition ${
              activeTab === 'customers'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            Müştəriləri ({userCustomers.length})
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`py-3 text-xs font-semibold border-b-2 transition ${
              activeTab === 'logs'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            Fəaliyyət Logları ({userLogs.length})
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="text-center py-10 text-slate-400 text-xs">Məlumatlar yüklənir...</div>
          ) : activeTab === 'customers' ? (
            userCustomers.length > 0 ? (
              <div className="space-y-2">
                {userCustomers.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-xs text-slate-900 dark:text-white">
                        {c.name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {c.phone} • {c.address}
                      </div>
                    </div>
                    {c.location && (
                      <span className="text-[10px] font-medium px-2 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded">
                        GPS Var
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-xs text-slate-400">
                Bu istifadəçinin hələ heç bir müştərisi yoxdur (Müştəri sayı = 0).
              </div>
            )
          ) : (
            userLogs.length > 0 ? (
              <div className="space-y-2">
                {userLogs.map((l) => (
                  <div
                    key={l.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {l.action}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(l.timestamp).toLocaleString('az-AZ')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                      {l.details}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-xs text-slate-400">
                Bu istifadəçiyə aid əməliyyat logu tapılmadı.
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
