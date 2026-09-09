import React, { useState } from 'react';
import {
  FileText,
  Search,
  Filter,
  Clock,
  User,
  Shield,
  Laptop,
  Smartphone,
  Globe,
  RefreshCw,
  Calendar,
  Layers,
  Trash2,
} from 'lucide-react';
import { AuditLog } from '../../types';
import { ConfirmModal } from '../ConfirmModal';

interface AdminLogsTabProps {
  logs: AuditLog[];
  onRefresh: () => void;
  onDeleteLogs?: (options: { all?: boolean; ids?: string[] }) => Promise<void>;
  loading?: boolean;
}

export const AdminLogsTab: React.FC<AdminLogsTabProps> = ({
  logs,
  onRefresh,
  onDeleteLogs,
  loading,
}) => {
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<string>('all');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'filtered' | 'all'>('filtered');
  const [isAllConfirmStep, setIsAllConfirmStep] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const todayStr = new Date().toDateString();

  const filteredLogs = logs.filter((l) => {
    const q = search.toLowerCase();
    const matchQ =
      l.userName.toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q) ||
      l.details.toLowerCase().includes(q) ||
      (l.targetName && l.targetName.toLowerCase().includes(q));

    if (!matchQ) return false;

    if (filterMode === 'all') return true;

    if (filterMode === 'today') {
      const logDate = new Date(l.timestamp).toDateString();
      return logDate === todayStr;
    }

    if (filterMode === 'customer') {
      return l.targetType === 'customer';
    }

    if (filterMode === 'driver') {
      return l.targetType === 'driver';
    }

    if (filterMode === 'user') {
      return l.targetType === 'user' || l.targetType === 'auth' || l.targetType === 'permission';
    }

    if (filterMode === 'whatsapp') {
      return l.targetType === 'dispatch' || l.action.toLowerCase().includes('whatsapp') || l.details.toLowerCase().includes('whatsapp');
    }

    if (filterMode === 'delete') {
      return l.action.toLowerCase().includes('sil') || l.details.toLowerCase().includes('sil');
    }

    if (filterMode === 'restore') {
      return l.action.toLowerCase().includes('bərpa') || l.details.toLowerCase().includes('bərpa');
    }

    return true;
  });

  const handleStartDelete = () => {
    setDeleteMode(filterMode === 'all' && !search ? 'all' : 'filtered');
    setIsAllConfirmStep(false);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (deleteMode === 'all' && !isAllConfirmStep) {
      // Prompt second strict confirmation step
      setIsAllConfirmStep(true);
      return;
    }

    if (!onDeleteLogs) return;
    setIsDeleting(true);
    try {
      if (deleteMode === 'all') {
        await onDeleteLogs({ all: true });
      } else {
        await onDeleteLogs({ ids: filteredLogs.map((l) => l.id) });
      }
      setIsDeleteModalOpen(false);
      setIsAllConfirmStep(false);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const getActionBadgeClass = (action: string, targetType: string) => {
    const act = action.toLowerCase();
    if (act.includes('sil')) {
      return 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800';
    }
    if (act.includes('bərpa')) {
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    }
    if (targetType === 'dispatch' || act.includes('whatsapp')) {
      return 'bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300 border-green-200 dark:border-green-800';
    }
    if (targetType === 'driver') {
      return 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    }
    if (targetType === 'auth') {
      return 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    }
    return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Header */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="İstifadəçi adı, əməliyyat və ya detal axtar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Cəmi: <b className="text-slate-900 dark:text-white">{filteredLogs.length}</b> log
            </span>
            <button
              onClick={onRefresh}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Yenilə</span>
            </button>
            {onDeleteLogs && (
              <button
                type="button"
                onClick={handleStartDelete}
                disabled={loading || logs.length === 0}
                className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold border border-rose-200 dark:border-rose-800 transition disabled:opacity-50"
                title="Logları sil"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Logları sil</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills - Responsive 2x4 on mobile, flexible wrap on larger screens (No horizontal scrolling!) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:flex lg:flex-wrap gap-1.5 text-xs">
          {[
            { id: 'all', label: 'Hamısı' },
            { id: 'today', label: 'Bu gün' },
            { id: 'customer', label: 'Müştəri' },
            { id: 'driver', label: 'Sürücü' },
            { id: 'user', label: 'İstifadəçi' },
            { id: 'whatsapp', label: 'WhatsApp' },
            { id: 'delete', label: 'Silinmə' },
            { id: 'restore', label: 'Bərpa' },
          ].map((tab) => {
            const isActive = filterMode === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilterMode(tab.id)}
                className={`w-full py-2 px-2.5 rounded-xl font-medium text-center truncate transition text-xs border ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-transparent hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* MOBILE VIEW: CARD UI (No horizontal scrolling!) */}
      <div className="block md:hidden space-y-3">
        {filteredLogs.length > 0 ? (
          filteredLogs.map((log) => {
            const date = new Date(log.timestamp);
            const dateStr = date.toLocaleDateString('az-AZ');
            const timeStr = date.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' });

            return (
              <div
                key={log.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm space-y-2.5"
              >
                {/* Header: User & Timestamp */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0">
                      {log.userName.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white text-xs">
                      👤 {log.userName}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{dateStr} • {timeStr}</span>
                  </div>
                </div>

                {/* Operation details */}
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400 text-[11px]">Əməliyyat:</span>
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-lg text-[11px] font-semibold border ${getActionBadgeClass(
                        log.action,
                        log.targetType
                      )}`}
                    >
                      {log.action}
                    </span>
                  </div>

                  {log.targetName && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-400 text-[11px]">Hədəf:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {log.targetName}
                      </span>
                    </div>
                  )}

                  <div className="pt-1 text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                    {log.details}
                  </div>
                </div>

                {/* Device and IP */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5 font-mono">
                  <span>{log.device || 'Naməlum cihaz'}</span>
                  <span>IP: {log.ip || '127.0.0.1'}</span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-8 text-center text-slate-400 text-xs">
            Axtarışa uyğun log tapılmadı.
          </div>
        )}
      </div>

      {/* DESKTOP VIEW: CLEAN TABLE */}
      <div className="hidden md:block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <th className="py-3.5 px-4">Tarix və Saat</th>
              <th className="py-3.5 px-4">İstifadəçi</th>
              <th className="py-3.5 px-4">Əməliyyat</th>
              <th className="py-3.5 px-4">Detallar</th>
              <th className="py-3.5 px-4">Cihaz və IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log) => {
                const date = new Date(log.timestamp);
                return (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                  >
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                      <div>{date.toLocaleDateString('az-AZ')}</div>
                      <div className="text-slate-400">{date.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>

                    <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {log.userName.charAt(0).toUpperCase()}
                        </div>
                        <span>{log.userName}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-lg text-[11px] font-semibold border ${getActionBadgeClass(
                          log.action,
                          log.targetType
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300 max-w-md">
                      {log.targetName && (
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {log.targetName}
                        </div>
                      )}
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {log.details}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-[11px] text-slate-400 font-mono">
                      <div>{log.device || 'Veb'}</div>
                      <div className="text-slate-500">{log.ip || '127.0.0.1'}</div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                  Heç bir log tapılmadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Primary Log Delete Choice Modal */}
      {isDeleteModalOpen && !isAllConfirmStep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Logları sil
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Hansı logları silmək istəyirsiniz?
                </p>
              </div>
            </div>

            <div className="space-y-2 mb-5">
              <label
                onClick={() => setDeleteMode('filtered')}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                  deleteMode === 'filtered'
                    ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/30'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="deleteMode"
                    checked={deleteMode === 'filtered'}
                    onChange={() => setDeleteMode('filtered')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Filtirlənmiş loglar ({filteredLogs.length})
                  </span>
                </div>
              </label>

              <label
                onClick={() => setDeleteMode('all')}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                  deleteMode === 'all'
                    ? 'border-rose-500 bg-rose-50/60 dark:bg-rose-950/30'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="deleteMode"
                    checked={deleteMode === 'all'}
                    onChange={() => setDeleteMode('all')}
                    className="text-rose-600 focus:ring-rose-500"
                  />
                  <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">
                    Bütün logları sil ({logs.length})
                  </span>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                İmtina
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting || (deleteMode === 'filtered' && filteredLogs.length === 0)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition disabled:opacity-50"
              >
                {deleteMode === 'all' ? 'Növbəti addım' : 'Sil'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Secondary Strict Confirmation for "Bütün logları sil" */}
      <ConfirmModal
        isOpen={isDeleteModalOpen && isAllConfirmStep}
        title="Bütün logları sil"
        message="Bütün əməliyyat logları həmişəlik silinəcək. Davam etmək istəyirsiniz?"
        confirmText="Bəli, hamısını sil"
        cancelText="İmtina"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setIsAllConfirmStep(false);
        }}
      />
    </div>
  );
};
