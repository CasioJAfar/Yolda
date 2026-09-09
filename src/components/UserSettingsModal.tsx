import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Lock,
  LogOut,
  Shield,
  User as UserIcon,
  Phone,
  Check,
  Loader2,
  Database,
  RefreshCw,
  Download,
  Upload,
  Moon,
  Sun,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileDown,
} from 'lucide-react';
import { User } from '../types';
import { Api } from '../lib/api';

interface UserSettingsModalProps {
  user: User | null;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
  onClose: () => void;
  onLogout: () => void;
  onRefreshData: () => void;
  onBackupRestored?: () => void;
}

export const UserSettingsModal: React.FC<UserSettingsModalProps> = ({
  user,
  darkMode = false,
  onToggleDarkMode,
  onClose,
  onLogout,
  onRefreshData,
  onBackupRestored,
}) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [passMessage, setPassMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Backup & Restore state
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const [backupMessage, setBackupMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadBackupInfo();
  }, []);

  const loadBackupInfo = async () => {
    try {
      const info = await Api.getBackupInfo();
      if (info?.lastBackupAt) {
        setLastBackupAt(info.lastBackupAt);
      }
    } catch (err) {
      console.warn('Backup info error', err);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPassMessage({ text: 'Yeni şifrələr bir-biri ilə uyğun gəlmir.', isError: true });
      return;
    }
    if (newPassword.length < 4) {
      setPassMessage({ text: 'Şifrə ən azı 4 simvol olmalıdır.', isError: true });
      return;
    }

    setIsChangingPass(true);
    setPassMessage(null);

    try {
      const res = await Api.changePassword(oldPassword, newPassword);
      setPassMessage({ text: res.message || 'Şifrə uğurla yeniləndi.', isError: false });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPassMessage({ text: err.message || 'Şifrə dəyişdirilərkən xəta baş verdi.', isError: true });
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleExportBackup = async () => {
    setBackupLoading(true);
    setBackupMessage(null);
    try {
      const data = await Api.getBackup();
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `yolda_backup_${user?.name?.toLowerCase().replace(/\s+/g, '_') || 'user'}_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const nowIso = new Date().toISOString();
      setLastBackupAt(nowIso);
      setBackupMessage({
        text: `Yedəkləmə uğurla tamamlandı! ${data.totalCustomers} müştəri fayla yazıldı.`,
        isError: false,
      });
    } catch (err: any) {
      setBackupMessage({
        text: err.message || 'Yedəkləmə zamanı xəta baş verdi.',
        isError: true,
      });
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestoreFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreLoading(true);
    setBackupMessage(null);

    try {
      const fileText = await file.text();
      const parsed = JSON.parse(fileText);

      let customersToImport: any[] = [];
      if (Array.isArray(parsed)) {
        customersToImport = parsed;
      } else if (parsed && Array.isArray(parsed.customers)) {
        customersToImport = parsed.customers;
      } else {
        throw new Error('Yedək faylında müştərilər siyahısı tapılmadı.');
      }

      if (customersToImport.length === 0) {
        throw new Error('Yedək faylında heç bir müştəri qeydi yoxdur.');
      }

      const res = await Api.restoreBackup(customersToImport);
      setBackupMessage({
        text: res.message || `${res.count} müştəri uğurla hesabınıza daxil edildi.`,
        isError: false,
      });

      onRefreshData();
      if (onBackupRestored) {
        onBackupRestored();
      }
    } catch (err: any) {
      setBackupMessage({
        text: err.message || 'Yedək faylı oxunarkən xəta baş verdi.',
        isError: true,
      });
    } finally {
      setRestoreLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-md shadow-blue-500/20">
              Y
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base leading-none">
                Hesab və Ayarlar
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">Yolda İdarəetmə Sistemi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* User Account Details Card */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200/60 dark:border-slate-700/50 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-bold flex items-center justify-center text-base shadow-md shadow-blue-500/20">
                  {user?.role === 'admin' ? <Shield className="w-6 h-6" /> : user?.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm">
                    {user?.name}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    {user?.phone}
                  </div>
                  <div className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold capitalize mt-0.5">
                    {user?.role === 'admin' ? '🛡️ Administrator' : '👤 İstifadəçi'}
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                  user?.status === 'active'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    user?.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                />
                {user?.status === 'active' ? 'Aktiv' : 'Deaktiv'}
              </span>
            </div>

            {/* Account Metadata: ID, Created Date, Last Login */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300 pt-1">
              <div className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                <span className="font-semibold text-slate-400">İD:</span>
                <span className="font-mono text-slate-900 dark:text-white font-bold">
                  {user?.id}
                </span>
              </div>

              <div className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-400">Yaradılma:</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {user?.createdAt
                    ? new Date(user.createdAt).toLocaleDateString('az-AZ')
                    : 'Məlum deyil'}
                </span>
              </div>

              <div className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 sm:col-span-2">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-400">Son giriş:</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {user?.lastLoginAt
                    ? new Date(user.lastLoginAt).toLocaleString('az-AZ', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Bu seans'}
                </span>
              </div>
            </div>
          </div>

          {/* Theme Selector: Dark / Light */}
          {onToggleDarkMode && (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  Görünüş Teması
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {darkMode ? 'Qaranlıq rejim aktivdir' : 'İşıqlı rejim aktivdir'}
                </div>
              </div>
              <button
                type="button"
                onClick={onToggleDarkMode}
                className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-sm transition"
              >
                {darkMode ? (
                  <>
                    <Sun className="w-4 h-4 text-amber-400" />
                    <span>İşıqlı Rejim</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 text-slate-600" />
                    <span>Qaranlıq Rejim</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Backup & Restore Section (Yedəkləmə və Bərpa) */}
          <div className="p-4 bg-blue-50/50 dark:bg-slate-800/60 rounded-2xl border border-blue-200/60 dark:border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Müştərilərin Yedəklənməsi (Backup)
                </span>
              </div>
              {lastBackupAt && (
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  Son: {new Date(lastBackupAt).toLocaleDateString('az-AZ')}
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
              Öz hesabınızdakı bütün müştəri məlumatlarını (Ad, Telefon, Ünvan, Konum, Qeydlər) JSON faylı olaraq kompüterinizə və ya telefonunuza yükləyə, istənilən vaxt yenidən sistemə daxil edə bilərsiniz.
            </p>

            {backupMessage && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  backupMessage.isError
                    ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                    : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                }`}
              >
                {backupMessage.isError ? (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                )}
                <span>{backupMessage.text}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {/* Yedəklə */}
              <button
                type="button"
                onClick={handleExportBackup}
                disabled={backupLoading || restoreLoading}
                className="py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/20 flex items-center justify-center gap-1.5 transition disabled:opacity-50"
              >
                {backupLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>Yedəklə</span>
              </button>

              {/* Yedəyi yüklə */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={backupLoading || restoreLoading}
                className="py-2.5 px-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold shadow-sm flex items-center justify-center gap-1.5 transition disabled:opacity-50"
              >
                {restoreLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5 text-blue-600" />
                )}
                <span>Yedəyi yüklə</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleRestoreFileSelect}
              />
            </div>
          </div>

          {/* Change Password Form */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-3">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                Şifrəni Dəyiş
              </span>
            </div>

            {passMessage && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  passMessage.isError
                    ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                    : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                }`}
              >
                {passMessage.isError ? (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                )}
                <span>{passMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  Cari şifrə
                </label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  required
                  placeholder="Mövcud şifrəniz"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                    Yeni şifrə
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="Yeni şifrə"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                    Yeni şifrə təkrarı
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Təkrar daxil edin"
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isChangingPass}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {isChangingPass ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>Şifrəni Yenilə</span>
              </button>
            </form>
          </div>
        </div>

        {/* Footer with Logout */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            onClick={onRefreshData}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sinxronlaşdır</span>
          </button>

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs font-semibold transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Hesabdan Çıx</span>
          </button>
        </div>
      </div>
    </div>
  );
};
