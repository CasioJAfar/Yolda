import React, { useState } from 'react';
import {
  UserCheck,
  Plus,
  Search,
  Key,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Eye,
  Trash2,
  Phone,
  Clock,
  Activity,
  Edit,
} from 'lucide-react';
import { User } from '../../types';
import { ConfirmModal } from '../ConfirmModal';

interface AdminUsersTabProps {
  users: User[];
  onOpenCreateUser: () => void;
  onViewProfile: (user: User) => void;
  onOpenPermissions: (user: User) => void;
  onResetPassword: (user: User) => void;
  onToggleStatus: (userId: string, currentStatus: 'active' | 'inactive') => void;
  onDeleteUser: (userId: string) => void;
  onEditUser?: (user: User) => void;
}

export const AdminUsersTab: React.FC<AdminUsersTabProps> = ({
  users,
  onOpenCreateUser,
  onViewProfile,
  onOpenPermissions,
  onResetPassword,
  onToggleStatus,
  onDeleteUser,
  onEditUser,
}) => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    const matchQ =
      u.name.toLowerCase().includes(q) ||
      u.phone.includes(q) ||
      u.id.toLowerCase().includes(q) ||
      (u.email && u.email.toLowerCase().includes(q));
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchQ && matchRole;
  });

  const handleConfirmDelete = () => {
    if (userToDelete) {
      onDeleteUser(userToDelete.id);
      setUserToDelete(null);
    }
  };

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return 'Daxil olmayıb';
    const date = new Date(isoString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const timeStr = date.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' });
    if (isToday) {
      return `Bu gün, ${timeStr}`;
    }
    return `${date.toLocaleDateString('az-AZ', { day: '2-digit', month: '2-digit' })} ${timeStr}`;
  };

  return (
    <div className="space-y-4">
      {/* Header with Search and Create Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex flex-1 items-center gap-2 sm:gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="İstifadəçi adı, İD və ya telefon axtar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="px-2.5 sm:px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">Bütün Rollar</option>
            <option value="admin">Admin</option>
            <option value="user">İstifadəçi</option>
          </select>
        </div>

        <button
          onClick={onOpenCreateUser}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni İstifadəçi Əlavə Et</span>
        </button>
      </div>

      {/* MOBILE VIEW: CARD UI (No horizontal scroll!) */}
      <div className="block md:hidden space-y-3">
        {filteredUsers.length > 0 ? (
          filteredUsers.map((u) => (
            <div
              key={u.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm space-y-3"
            >
              {/* Card Header: User Avatar, Name, Role, Status */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold text-sm flex items-center justify-center shrink-0">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                      <span>{u.name}</span>
                      {u.role === 'admin' && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                          Admin
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      ID: {u.id}
                    </div>
                  </div>
                </div>

                {/* Status Pill Toggle */}
                <button
                  type="button"
                  onClick={() => onToggleStatus(u.id, u.status)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition shrink-0 ${
                    u.status === 'active'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                  }`}
                  title="Statusu dəyiş"
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      u.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                  />
                  {u.status === 'active' ? 'Aktiv' : 'Deaktiv'}
                </button>
              </div>

              {/* Stats Grid inside Card */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                    Müştərilər
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    {u.customerCount ?? 0}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                    Sürücülər
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    {u.driverCount ?? 0}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                    Son giriş
                  </span>
                  <span className="text-slate-700 dark:text-slate-300 text-[11px] font-medium">
                    {formatDateTime(u.lastLoginAt)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                    Son aktivlik
                  </span>
                  <span className="text-slate-700 dark:text-slate-300 text-[11px] font-medium">
                    {formatDateTime(u.lastActiveAt || u.lastLoginAt)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                {onEditUser && (
                  <button
                    type="button"
                    onClick={() => onEditUser(u)}
                    className="flex-1 py-2 px-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition"
                    title="İstifadəçini redaktə et"
                  >
                    <Edit className="w-3.5 h-3.5 text-blue-500" />
                    <span>Redaktə</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onViewProfile(u)}
                  className="p-2 rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition"
                  title="Profilə bax"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => onOpenPermissions(u)}
                  className="p-2 rounded-xl text-purple-600 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 transition"
                  title="İcazələr"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => onResetPassword(u)}
                  className="p-2 rounded-xl text-amber-600 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 transition"
                  title="Şifrəni yenilə"
                >
                  <Key className="w-4 h-4" />
                </button>

                {u.role !== 'admin' && (
                  <button
                    type="button"
                    onClick={() => setUserToDelete(u)}
                    className="p-2 rounded-xl text-rose-600 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 transition"
                    title="Sil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-8 text-center text-slate-400 text-xs">
            Heç bir istifadəçi tapılmadı.
          </div>
        )}
      </div>

      {/* DESKTOP VIEW: CLEAN TABLE */}
      <div className="hidden md:block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <th className="py-3.5 px-4">İstifadəçi</th>
              <th className="py-3.5 px-4">İD / Telefon</th>
              <th className="py-3.5 px-4">Rol</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-center">Müştəri</th>
              <th className="py-3.5 px-4 text-center">Sürücü</th>
              <th className="py-3.5 px-4">Son Giriş</th>
              <th className="py-3.5 px-4 text-right">Əməliyyatlar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((u) => (
                <tr
                  key={u.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                >
                  {/* Name & Avatar */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {u.name}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {u.email || u.phone}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* ID / Phone */}
                  <td className="py-3.5 px-4">
                    <div className="font-mono text-slate-800 dark:text-slate-200 font-semibold">
                      {u.id}
                    </div>
                    <div className="text-[11px] text-slate-400">{u.phone}</div>
                  </td>

                  {/* Role */}
                  <td className="py-3.5 px-4">
                    {u.role === 'admin' ? (
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                        Admin
                      </span>
                    ) : (
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        İstifadəçi
                      </span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4">
                    <button
                      type="button"
                      onClick={() => onToggleStatus(u.id, u.status)}
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold transition ${
                        u.status === 'active'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 hover:bg-emerald-200'
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 hover:bg-rose-200'
                      }`}
                      title="Statusu dəyişmək üçün klikləyin"
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          u.status === 'active' ? 'bg-emerald-600' : 'bg-rose-600'
                        }`}
                      />
                      {u.status === 'active' ? 'Aktiv' : 'Deaktiv'}
                    </button>
                  </td>

                  {/* Customer Count */}
                  <td className="py-3.5 px-4 text-center font-semibold text-slate-900 dark:text-white">
                    {u.customerCount ?? 0}
                  </td>

                  {/* Driver Count */}
                  <td className="py-3.5 px-4 text-center text-slate-600 dark:text-slate-400">
                    {u.driverCount ?? 0}
                  </td>

                  {/* Last Login */}
                  <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 text-[11px]">
                    {formatDateTime(u.lastLoginAt)}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {onEditUser && (
                        <button
                          type="button"
                          onClick={() => onEditUser(u)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition"
                          title="İstifadəçini redaktə et"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onViewProfile(u)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition"
                        title="İstifadəçi profilinə bax"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenPermissions(u)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/50 transition"
                        title="İcazələri dəyiş"
                      >
                        <ShieldCheck className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onResetPassword(u)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition"
                        title="Şifrəni yenilə"
                      >
                        <Key className="w-4 h-4" />
                      </button>
                      {u.role !== 'admin' && (
                        <button
                          type="button"
                          onClick={() => setUserToDelete(u)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
                          title="İstifadəçini sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                  Heç bir istifadəçi tapılmadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Delete User Confirmation Dialog */}
      <ConfirmModal
        isOpen={Boolean(userToDelete)}
        title="Bu istifadəçini silmək istədiyinizə əminsiniz?"
        description={`"${userToDelete?.name}" adlı istifadəçi və sistem icazələri bazadan silinəcək.`}
        confirmText="Sil"
        cancelText="İmtina"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onClose={() => setUserToDelete(null)}
      />
    </div>
  );
};
