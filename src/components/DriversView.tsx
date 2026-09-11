import React, { useState, useMemo } from 'react';
import {
  Truck,
  Plus,
  Search,
  Phone,
  MessageCircle,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Driver, User } from '../types';
import { openWhatsApp } from '../lib/whatsapp';
import { ConfirmModal } from './ConfirmModal';
import { matchQuery } from '../lib/search';

interface DriversViewProps {
  drivers: Driver[];
  user?: User | null;
  onOpenAddDriver: () => void;
  onEditDriver: (driver: Driver) => void;
  onDeleteDriver: (driver: Driver) => void;
  onToggleStatus: (driver: Driver) => void;
}

export const DriversView: React.FC<DriversViewProps> = ({
  drivers,
  user,
  onOpenAddDriver,
  onEditDriver,
  onDeleteDriver,
  onToggleStatus,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [driverToDelete, setDriverToDelete] = useState<Driver | null>(null);

  const canAdd = user?.permissions?.canAddDrivers !== false;
  const canEdit = user?.permissions?.canEditDrivers !== false;
  const canDelete = user?.permissions?.canDeleteDrivers !== false;
  const canSendWhatsApp = user?.permissions?.canSendWhatsApp !== false;

  const filtered = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return drivers;
    return drivers.filter((d) => {
      return (
        matchQuery(d.name, q) ||
        matchQuery(d.phone, q) ||
        matchQuery(d.note || '', q) ||
        matchQuery(d.userOwnerName || '', q)
      );
    });
  }, [drivers, searchQuery]);

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Sürücülər
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {drivers.filter((d) => d.status === 'active').length} aktiv sürücü qeydiyyatdadır
          </p>
        </div>

        {canAdd && (
          <button
            onClick={onOpenAddDriver}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni sürücü</span>
          </button>
        )}
      </div>

      {/* Search Input (Mockup #8) */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Sürücü adı və ya nömrəsi..."
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition"
        />
      </div>

      {/* Drivers List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800">
            <Truck className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Sürücü tapılmadı
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Yeni sürücü əlavə edin ki, müştəri konumlarını göndərə biləsiniz.
            </p>
          </div>
        ) : (
          filtered.map((driver) => (
            <div
              key={driver.id}
              className="p-4 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-sm hover:shadow-md transition space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold text-sm shrink-0 shadow-inner">
                    {driver.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                      {driver.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      {driver.phone}
                    </p>
                    {driver.note && (
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                        {driver.note}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => onToggleStatus(driver)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold transition flex items-center gap-1 ${
                    driver.status === 'active'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                  }`}
                  title="Statusu dəyişmək üçün klikləyin"
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      driver.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'
                    }`}
                  />
                  <span>{driver.status === 'active' ? 'Aktiv' : 'Deaktiv'}</span>
                </button>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-700/60">
                {canSendWhatsApp && (
                  <button
                    onClick={() => openWhatsApp(driver.phone, 'Salam')}
                    className="flex-1 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition border border-emerald-200 dark:border-emerald-800"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>
                )}

                <a
                  href={`tel:${driver.phone}`}
                  className="p-2 rounded-xl text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-900 transition"
                  title="Zəng et"
                >
                  <Phone className="w-4 h-4" />
                </a>

                {canEdit && (
                  <button
                    onClick={() => onEditDriver(driver)}
                    className="p-2 rounded-xl text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                    title="Redaktə et"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                )}

                {canDelete && (
                  <button
                    onClick={() => setDriverToDelete(driver)}
                    className="p-2 rounded-xl text-rose-500 hover:text-rose-600 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 transition"
                    title="Sil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Delete Driver Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(driverToDelete)}
        title="Sürücünü silmək istəyirsiniz?"
        description={`"${driverToDelete?.name}" adlı sürücü bazadan silinəcək.`}
        confirmText="Sil"
        cancelText="İmtina"
        variant="danger"
        onConfirm={() => {
          if (driverToDelete) {
            onDeleteDriver(driverToDelete);
            setDriverToDelete(null);
          }
        }}
        onClose={() => setDriverToDelete(null)}
      />
    </div>
  );
};
