import React, { useState } from 'react';
import { UserCheck, X, AlertTriangle, Loader2 } from 'lucide-react';
import { Customer, User } from '../types';

interface ChangeOwnerModalProps {
  isOpen: boolean;
  customer: Customer | null;
  users: User[];
  currentUserId: string;
  onClose: () => void;
  onSave: (customerId: string, newOwnerId: string) => Promise<void>;
}

export const ChangeOwnerModal: React.FC<ChangeOwnerModalProps> = ({
  isOpen,
  customer,
  users,
  currentUserId,
  onClose,
  onSave,
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync selectedUserId when modal opens
  React.useEffect(() => {
    if (customer) {
      setSelectedUserId(customer.userId);
      setIsConfirming(false);
      setError(null);
    }
  }, [customer, isOpen]);

  if (!isOpen || !customer) return null;

  // Filter only active users (excluding current admin if desired, or all active users)
  const activeUsers = users.filter((u) => u.status === 'active' && u.role !== 'driver');
  const currentOwner = users.find((u) => u.id === customer.userId);
  const currentOwnerName = customer.userOwnerName || currentOwner?.name || 'Naməlum';
  const newOwner = users.find((u) => u.id === selectedUserId);
  const newOwnerName = newOwner?.name || 'Naməlum';

  const isChanged = selectedUserId && selectedUserId !== customer.userId;

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isChanged) {
      onClose();
      return;
    }
    // Show confirmation step
    setIsConfirming(true);
  };

  const handleConfirmChange = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await onSave(customer.id, selectedUserId);
      setIsConfirming(false);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Sahib dəyişdirilərkən xəta baş verdi.');
      setIsConfirming(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Müştərinin Sahibini Dəyiş
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        {!isConfirming ? (
          <form onSubmit={handleInitialSubmit} className="p-5 space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-xs">
                {error}
              </div>
            )}

            {/* Customer Summary */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Müştəri:</span>
                <span className="font-bold text-slate-900 dark:text-white">{customer.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Telefon:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{customer.phone}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700/40">
                <span className="text-slate-500 dark:text-slate-400">Hazırkı sahibi:</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">{currentOwnerName}</span>
              </div>
            </div>

            {/* Owner Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Sahibini dəyiş:
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              >
                {activeUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} {u.id === customer.userId ? '(Hazırkı sahibi)' : ''}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                Sahibi dəyişdirildikdə bu müştəri yalnız yeni istifadəçinin kabinetində və sürücünün həmin qrupunda görünəcək.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                İmtina
              </button>
              <button
                type="submit"
                disabled={!isChanged}
                className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-md transition ${
                  isChanged
                    ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20 cursor-pointer'
                    : 'bg-slate-400 opacity-60 cursor-not-allowed'
                }`}
              >
                Yadda saxla
              </button>
            </div>
          </form>
        ) : (
          /* Confirmation Step (Requirement 4) */
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <div className="text-xs font-medium">
                Müştərinin sahibini dəyişmək istəyirsiniz?
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2 text-xs">
              <div>
                <span className="text-slate-400 dark:text-slate-500">Müştəri: </span>
                <span className="font-bold text-slate-900 dark:text-white">{customer.name}</span>
              </div>
              <div className="flex items-center gap-2 pt-1 border-t border-slate-200 dark:border-slate-700/40">
                <span className="line-through text-slate-400">{currentOwnerName}</span>
                <span className="text-slate-400 font-bold">→</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">{newOwnerName}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Bu əməliyyat dərhal qeydə alınacaq və sistem loglarına əlavə ediləcək.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsConfirming(false)}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                İmtina
              </button>
              <button
                type="button"
                onClick={handleConfirmChange}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Dəyişdirilir...</span>
                  </>
                ) : (
                  <span>Sahibi dəyiş</span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
