import React, { useState } from 'react';
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  Search,
  User,
  Clock,
  Phone,
  MapPin,
  CheckCircle2,
} from 'lucide-react';
import { Customer } from '../../types';
import { ConfirmModal } from '../ConfirmModal';

interface AdminTrashTabProps {
  trashList: Customer[];
  onRestore: (id: string) => Promise<void>;
  onPermanentDelete: (id: string) => Promise<void>;
}

export const AdminTrashTab: React.FC<AdminTrashTabProps> = ({
  trashList,
  onRestore,
  onPermanentDelete,
}) => {
  const [search, setSearch] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [customerToDeletePermanently, setCustomerToDeletePermanently] = useState<Customer | null>(null);

  const filteredTrash = React.useMemo(() => {
    const list = trashList.filter((c) => {
      const q = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.userOwnerName && c.userOwnerName.toLowerCase().includes(q))
      );
    });
    const uniqueMap = new Map<string, Customer>();
    for (const c of list) {
      if (c && c.id && !uniqueMap.has(c.id)) {
        uniqueMap.set(c.id, c);
      }
    }
    return Array.from(uniqueMap.values());
  }, [trashList, search]);

  const handleRestore = async (id: string) => {
    setActionLoadingId(id);
    try {
      await onRestore(id);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmPermanentDelete = async () => {
    if (!customerToDeletePermanently) return;
    const id = customerToDeletePermanently.id;
    setActionLoadingId(id);
    try {
      await onPermanentDelete(id);
      setCustomerToDeletePermanently(null);
    } finally {
      setActionLoadingId(null);
    }
  };

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return 'Məlum deyil';
    const date = new Date(isoString);
    return date.toLocaleString('az-AZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      {/* Informational banner */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 p-4 rounded-2xl flex items-start gap-3 text-amber-800 dark:text-amber-300">
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
        <div className="text-xs leading-relaxed">
          <span className="font-bold">Zibil Qutusu (Soft Delete):</span> Silinmiş müştərilər bazadan dərhal itmir və burada saxlanılır. Siz müştərini <span className="font-semibold underline">Bərpa etdikdə</span> həmin müştəri avtomatik olaraq əvvəlki sahibinin hesabına qaytarılır.
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Silinmiş müştəri və ya sahibinin adını axtar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Cəmi: <span className="font-bold text-slate-900 dark:text-white">{filteredTrash.length}</span> silinmiş müştəri
        </div>
      </div>

      {/* MOBILE VIEW: CARD UI (No horizontal scrolling!) */}
      <div className="block md:hidden space-y-3">
        {filteredTrash.length > 0 ? (
          filteredTrash.map((c) => (
            <div
              key={c.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-sm space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    {c.name}
                  </h4>
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>{c.phone}</span>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  <User className="w-3 h-3" />
                  <span>{c.userOwnerName || 'Naməlum'}</span>
                </span>
              </div>

              {/* Address / Details */}
              <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{c.address || 'Ünvan qeyd edilməyib'}</span>
                </div>

                <div className="text-[11px] text-slate-400 pt-1 flex items-center justify-between">
                  <span>Silən: <b className="text-slate-600 dark:text-slate-300">{c.deletedByName || 'İstifadəçi'}</b></span>
                  <span>{formatDateTime(c.deletedAt)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => handleRestore(c.id)}
                  disabled={actionLoadingId === c.id}
                  className="py-2.5 px-3 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Bərpa et</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCustomerToDeletePermanently(c)}
                  disabled={actionLoadingId === c.id}
                  className="py-2.5 px-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Tamamilə sil</span>
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-8 text-center text-slate-400 text-xs">
            Zibil qutusunda heç bir müştəri yoxdur.
          </div>
        )}
      </div>

      {/* DESKTOP VIEW: TABLE */}
      <div className="hidden md:block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <th className="py-3.5 px-4">Müştəri Adı</th>
              <th className="py-3.5 px-4">Telefon və Ünvan</th>
              <th className="py-3.5 px-4">Əvvəlki Sahibi</th>
              <th className="py-3.5 px-4">Silən Şəxs</th>
              <th className="py-3.5 px-4">Silinmə Tarixi</th>
              <th className="py-3.5 px-4 text-right">Əməliyyatlar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {filteredTrash.length > 0 ? (
              filteredTrash.map((c) => (
                <tr
                  key={c.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                >
                  {/* Name */}
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {c.name}
                    </div>
                    {c.note && (
                      <div className="text-[11px] text-slate-400 truncate max-w-xs">
                        {c.note}
                      </div>
                    )}
                  </td>

                  {/* Phone & Address */}
                  <td className="py-3.5 px-4">
                    <div className="text-slate-700 dark:text-slate-300 font-medium">
                      {c.phone}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate max-w-xs">
                      {c.address || 'Ünvan qeyd olunmayıb'}
                    </div>
                  </td>

                  {/* Owner */}
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      <User className="w-3 h-3" />
                      {c.userOwnerName || 'Naməlum'}
                    </span>
                  </td>

                  {/* Deleted By */}
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                    {c.deletedByName || 'İstifadəçi'}
                  </td>

                  {/* Deleted At */}
                  <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 text-[11px]">
                    {formatDateTime(c.deletedAt)}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleRestore(c.id)}
                        disabled={actionLoadingId === c.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-semibold transition"
                        title="İlkin sahibinə qaytar"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Bərpa et</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCustomerToDeletePermanently(c)}
                        disabled={actionLoadingId === c.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-semibold transition"
                        title="Bazadan tamamilə sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Tamamilə sil</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                  Zibil qutusunda heç bir müştəri yoxdur.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Permanent Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(customerToDeletePermanently)}
        title="Müştərini həmişəlik silmək istəyirsiniz?"
        description={`"${customerToDeletePermanently?.name}" adlı müştəri bazadan HƏMİŞƏLİK silinəcək və bu əməliyyat geri qaytarıla bilməz!`}
        confirmText="Həmişəlik sil"
        cancelText="İmtina"
        variant="danger"
        onConfirm={handleConfirmPermanentDelete}
        onClose={() => setCustomerToDeletePermanently(null)}
      />
    </div>
  );
};
