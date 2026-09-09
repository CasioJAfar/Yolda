import React, { useState } from 'react';
import {
  X,
  Edit,
  Save,
  Lock,
  User as UserIcon,
  Shield,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Hash,
} from 'lucide-react';
import { User, UserPermissions } from '../../types';

interface EditUserModalProps {
  user: User;
  currentUser?: User | null;
  onClose: () => void;
  onSave: (
    userId: string,
    data: {
      name?: string;
      newId?: string;
      status?: 'active' | 'inactive';
      password?: string;
      permissions?: UserPermissions;
    }
  ) => Promise<void>;
}

export const EditUserModal: React.FC<EditUserModalProps> = ({
  user,
  currentUser,
  onClose,
  onSave,
}) => {
  const isEditingSelf = currentUser?.id === user.id;

  const [name, setName] = useState(user.name);
  const [customId, setCustomId] = useState(user.id);
  const [status, setStatus] = useState<'active' | 'inactive'>(user.status);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [permissions, setPermissions] = useState<UserPermissions>({
    ...user.permissions,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const togglePermission = (key: keyof UserPermissions) => {
    if (isEditingSelf && user.role === 'admin') return;
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSelectAll = (val: boolean) => {
    if (isEditingSelf && user.role === 'admin') return;
    setPermissions({
      canViewCustomers: val,
      canAddCustomers: val,
      canEditCustomers: val,
      canDeleteCustomers: val,
      canViewDrivers: val,
      canAddDrivers: val,
      canEditDrivers: val,
      canDeleteDrivers: val,
      canSendWhatsApp: val,
      canViewHistory: val,
      canOpenMap: val,
      canExportData: val,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('İstifadəçi adı boş ola bilməz.');
      return;
    }
    if (!customId.trim()) {
      setError('İstifadəçi İD-si boş ola bilməz.');
      return;
    }
    if (newPassword.trim() && newPassword.trim().length < 4) {
      setError('Yeni şifrə ən azı 4 simvol olmalıdır.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onSave(user.id, {
        name: name.trim(),
        newId: customId.trim() !== user.id ? customId.trim() : undefined,
        status: isEditingSelf ? 'active' : status,
        password: newPassword.trim() ? newPassword.trim() : undefined,
        permissions: isEditingSelf && user.role === 'admin' ? user.permissions : permissions,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Dəyişiklikləri yadda saxlayarkən xəta baş verdi.');
    } finally {
      setLoading(false);
    }
  };

  const permissionItems: Array<{
    key: keyof UserPermissions;
    label: string;
    group: 'customer' | 'driver' | 'other';
  }> = [
    { key: 'canViewCustomers', label: 'Müştərilərə baxış', group: 'customer' },
    { key: 'canAddCustomers', label: 'Müştəri əlavə etmək', group: 'customer' },
    { key: 'canEditCustomers', label: 'Müştəri redaktə etmək', group: 'customer' },
    { key: 'canDeleteCustomers', label: 'Müştəri silmək', group: 'customer' },

    { key: 'canViewDrivers', label: 'Sürücülərə baxış', group: 'driver' },
    { key: 'canAddDrivers', label: 'Sürücü əlavə etmək', group: 'driver' },
    { key: 'canEditDrivers', label: 'Sürücü redaktə etmək', group: 'driver' },
    { key: 'canDeleteDrivers', label: 'Sürücü silmək', group: 'driver' },

    { key: 'canSendWhatsApp', label: 'WhatsApp göndərmək', group: 'other' },
    { key: 'canViewHistory', label: 'Tarixçəyə baxış', group: 'other' },
    { key: 'canOpenMap', label: 'Xəritəyə baxış', group: 'other' },
    { key: 'canExportData', label: 'Məlumatları köçürmək', group: 'other' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Edit className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                İstifadəçini Redaktə Et
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {user.name} ({user.id})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
              <XCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isEditingSelf && (
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-700 dark:text-amber-300 text-[11px]">
              Təhlükəsizlik üçün öz admin hesabınızın statusunu və icazələrini dəyişə bilməzsiniz.
            </div>
          )}

          {/* Adı və İD */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                İstifadəçinin Adı *
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Məs: Vüsal Əliyev"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                İstifadəçinin İD-si *
              </label>
              <div className="relative">
                <Hash className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={customId}
                  onChange={(e) => setCustomId(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Məs: usr_vusal"
                />
              </div>
            </div>
          </div>

          {/* Status & Şifrə */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Status */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Hesab Statusu
              </label>
              <select
                value={status}
                disabled={isEditingSelf}
                onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
              >
                <option value="active">Aktiv (Sistemə daxil ola bilər)</option>
                <option value="inactive">Deaktiv (Bloklanıb)</option>
              </select>
            </div>

            {/* Şifrə (Gizli input) */}
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Yeni Şifrə <span className="text-slate-400 font-normal">(istəyə görə)</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Dəyişməmək üçün boş buraxın"
                  className="w-full pl-9 pr-9 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* İcazələr (Permissions) */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-blue-500" />
                İcazələr (Permissions)
              </span>
              {!isEditingSelf && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectAll(true)}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                  >
                    Hamısını seç
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <button
                    type="button"
                    onClick={() => handleSelectAll(false)}
                    className="text-[11px] text-slate-500 hover:underline font-semibold"
                  >
                    Təmizlə
                  </button>
                </div>
              )}
            </div>

            {/* Permission Checkboxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
              {permissionItems.map((item) => {
                const checked = !!permissions[item.key];
                return (
                  <label
                    key={item.key}
                    onClick={() => togglePermission(item.key)}
                    className={`flex items-center gap-2.5 p-2 rounded-xl border cursor-pointer select-none transition ${
                      checked
                        ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/60 text-blue-900 dark:text-blue-200 font-semibold'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    } ${isEditingSelf && user.role === 'admin' ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={isEditingSelf && user.role === 'admin'}
                      onChange={() => {}}
                      className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                    />
                    <span className="text-[11px] truncate">{item.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Footer Submit Button */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              İmtina
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-md shadow-blue-500/20 transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Yadda saxlanılır...' : 'Yadda saxla'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
