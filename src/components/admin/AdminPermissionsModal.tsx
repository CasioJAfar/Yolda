import React, { useState } from 'react';
import { X, ShieldCheck, Check, Save } from 'lucide-react';
import { User, UserPermissions } from '../../types';

interface AdminPermissionsModalProps {
  user: User;
  onClose: () => void;
  onSave: (userId: string, permissions: UserPermissions) => Promise<void>;
}

export const AdminPermissionsModal: React.FC<AdminPermissionsModalProps> = ({
  user,
  onClose,
  onSave,
}) => {
  const [permissions, setPermissions] = useState<UserPermissions>({
    ...user.permissions,
  });
  const [saving, setSaving] = useState(false);

  const toggle = (key: keyof UserPermissions) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(user.id, permissions);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                İcazələrin İdarə Edilməsi
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                İstifadəçi: <span className="font-semibold text-slate-700 dark:text-slate-300">{user.name}</span> ({user.role})
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

        {/* Permission Sections */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* Müştərilər */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
              Müştəri Əməliyyatları
            </h4>
            <div className="space-y-2">
              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Müştərilərə baxa bilər
                </span>
                <input
                  type="checkbox"
                  checked={permissions.canViewCustomers}
                  onChange={() => toggle('canViewCustomers')}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Yeni müştəri əlavə edə bilər
                </span>
                <input
                  type="checkbox"
                  checked={permissions.canAddCustomers}
                  onChange={() => toggle('canAddCustomers')}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Müştəri məlumatlarını redaktə edə bilər
                </span>
                <input
                  type="checkbox"
                  checked={permissions.canEditCustomers}
                  onChange={() => toggle('canEditCustomers')}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Müştərini silə bilər (Zəbil qutusuna göndərmək)
                </span>
                <input
                  type="checkbox"
                  checked={permissions.canDeleteCustomers}
                  onChange={() => toggle('canDeleteCustomers')}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
              </label>
            </div>
          </div>

          {/* Sürücülər */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
              Sürücü Əməliyyatları
            </h4>
            <div className="space-y-2">
              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Sürücülərə baxa bilər
                </span>
                <input
                  type="checkbox"
                  checked={permissions.canViewDrivers}
                  onChange={() => toggle('canViewDrivers')}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Yeni sürücü əlavə edə bilər
                </span>
                <input
                  type="checkbox"
                  checked={permissions.canAddDrivers}
                  onChange={() => toggle('canAddDrivers')}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Sürücünü redaktə edə bilər
                </span>
                <input
                  type="checkbox"
                  checked={permissions.canEditDrivers}
                  onChange={() => toggle('canEditDrivers')}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Sürücünü silə bilər
                </span>
                <input
                  type="checkbox"
                  checked={permissions.canDeleteDrivers}
                  onChange={() => toggle('canDeleteDrivers')}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
              </label>
            </div>
          </div>

          {/* WhatsApp & Xəritə */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
              WhatsApp və Digər İcazələr
            </h4>
            <div className="space-y-2">
              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Sürücüyə WhatsApp göndərə bilər
                </span>
                <input
                  type="checkbox"
                  checked={permissions.canSendWhatsApp}
                  onChange={() => toggle('canSendWhatsApp')}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Öz göndəriş tarixçəsinə baxa bilər
                </span>
                <input
                  type="checkbox"
                  checked={permissions.canViewHistory}
                  onChange={() => toggle('canViewHistory')}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Konumu xəritədə aça bilər
                </span>
                <input
                  type="checkbox"
                  checked={permissions.canOpenMap}
                  onChange={() => toggle('canOpenMap')}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Müştəri məlumatlarını ixrac edə bilər (JSON/Flutter)
                </span>
                <input
                  type="checkbox"
                  checked={permissions.canExportData}
                  onChange={() => toggle('canExportData')}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 bg-slate-50 dark:bg-slate-800/50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            İmtina
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 disabled:opacity-50 transition"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Yadda saxlanılır...' : 'Yadda Saxla'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
