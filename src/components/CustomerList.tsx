import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  MapPin,
  Phone,
  MessageCircle,
  ExternalLink,
  Edit,
  Trash2,
  Filter,
  Navigation,
  Compass,
} from 'lucide-react';
import { Customer, Driver, User } from '../types';
import { openPlatformMap } from '../lib/maps';
import { openWazeNavigation } from '../lib/waze';
import { ConfirmModal } from './ConfirmModal';
import { WazeFallbackModal } from './WazeFallbackModal';

interface CustomerListProps {
  customers: Customer[];
  drivers: Driver[];
  user?: User | null;
  onOpenAddCustomer: () => void;
  onSelectCustomer: (customer: Customer) => void;
  onEditCustomer: (customer: Customer) => void;
  onDeleteCustomer: (customer: Customer) => void;
  onSendToDriver: (customer: Customer) => void;
}

type FilterType = 'all' | 'today' | 'has_location' | 'no_location';

export const CustomerList: React.FC<CustomerListProps> = ({
  customers,
  drivers,
  user,
  onOpenAddCustomer,
  onSelectCustomer,
  onEditCustomer,
  onDeleteCustomer,
  onSendToDriver,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [wazeFallbackTarget, setWazeFallbackTarget] = useState<Customer | null>(null);
  const todayStr = new Date().toISOString().split('T')[0];

  const canAdd = user?.permissions?.canAddCustomers !== false;
  const canEdit = user?.permissions?.canEditCustomers !== false;
  const canDelete = user?.permissions?.canDeleteCustomers !== false;
  const canSendWhatsApp = user?.permissions?.canSendWhatsApp !== false;
  const canOpenMap = user?.permissions?.canOpenMap !== false;

  const handleWaze = (targetCustomer: Customer) => {
    if (!targetCustomer.location) return;
    openWazeNavigation(targetCustomer.location.lat, targetCustomer.location.lng, () => {
      setWazeFallbackTarget(targetCustomer);
    });
  };

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.phone.replace(/[^\d]/g, '').includes(q.replace(/[^\d]/g, '')) ||
        c.address.toLowerCase().includes(q) ||
        (c.note && c.note.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (filter === 'today') return c.createdAt.startsWith(todayStr);
      if (filter === 'has_location') return !!c.location;
      if (filter === 'no_location') return !c.location;

      return true;
    });
  }, [customers, searchQuery, filter, todayStr]);

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Müştərilər
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Ümumi {customers.length} müştəri qeydiyyatdadır
          </p>
        </div>

        {canAdd && (
          <button
            onClick={onOpenAddCustomer}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni müştəri</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Ad, telefon və ya ünvan üzrə axtar..."
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition"
        />
      </div>

      {/* Filter Tabs (Responsive 2x2 grid on mobile, 4 in a row on sm/md - No horizontal scroll!) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`py-2.5 px-3 rounded-xl text-xs font-semibold text-center truncate transition border ${
            filter === 'all'
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-transparent hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          Hamısı ({customers.length})
        </button>
        <button
          onClick={() => setFilter('today')}
          className={`py-2.5 px-3 rounded-xl text-xs font-semibold text-center truncate transition border ${
            filter === 'today'
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-transparent hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          Bu gün
        </button>
        <button
          onClick={() => setFilter('has_location')}
          className={`py-2.5 px-3 rounded-xl text-xs font-semibold text-center truncate transition border ${
            filter === 'has_location'
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-transparent hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          Konumu var
        </button>
        <button
          onClick={() => setFilter('no_location')}
          className={`py-2.5 px-3 rounded-xl text-xs font-semibold text-center truncate transition border ${
            filter === 'no_location'
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-transparent hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          Konumu yoxdur
        </button>
      </div>

      {/* Customer Cards List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Heç bir müştəri tapılmadı
            </p>
          </div>
        ) : (
          filtered.map((customer) => (
            <div
              key={customer.id}
              className="p-4 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-sm hover:shadow-md transition space-y-3"
            >
              {/* Top Row: Avatar, Name, Phone, GPS indicator */}
              <div
                onClick={() => onSelectCustomer(customer)}
                className="flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden shadow-inner">
                    {customer.photoUrl ? (
                      <img
                        src={customer.photoUrl}
                        alt={customer.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      customer.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                      {customer.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      {customer.phone}
                    </p>
                  </div>
                </div>

                {customer.location ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Konum var</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                    Konum yoxdur
                  </span>
                )}
              </div>

              {/* Address / Note */}
              <div
                onClick={() => onSelectCustomer(customer)}
                className="text-xs text-slate-600 dark:text-slate-300 cursor-pointer line-clamp-1 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl"
              >
                📍 {customer.address || 'Ünvan qeyd edilməyib'}
                {customer.note && (
                  <span className="block text-slate-400 dark:text-slate-500 text-[11px] mt-0.5">
                    Qeyd: {customer.note}
                  </span>
                )}
              </div>

              {/* Actions Bar (WhatsApp, Xəritədə aç, Zəng et, Redaktə, Sil) */}
              <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-700/60">
                {canSendWhatsApp && (
                  <button
                    onClick={() => onSendToDriver(customer)}
                    className="flex-1 py-2 px-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition border border-emerald-200 dark:border-emerald-800"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>
                )}

                {canOpenMap && customer.location && (
                  <button
                    onClick={() => handleWaze(customer)}
                    className="p-2 rounded-xl text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/50 border border-sky-200 dark:border-sky-800 transition active:scale-95 cursor-pointer"
                    title="Waze ilə get"
                  >
                    <Compass className="w-4 h-4" />
                  </button>
                )}

                <a
                  href={`tel:${customer.phone}`}
                  className="p-2 rounded-xl text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-900 transition"
                  title="Zəng et"
                >
                  <Phone className="w-4 h-4" />
                </a>

                {canEdit && (
                  <button
                    onClick={() => onEditCustomer(customer)}
                    className="p-2 rounded-xl text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                    title="Redaktə et"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                )}

                {canDelete && (
                  <button
                    onClick={() => setCustomerToDelete(customer)}
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

      {/* Delete Customer Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(customerToDelete)}
        title="Müştərini silmək istəyirsiniz?"
        description={`"${customerToDelete?.name}" adlı müştəri silinəcək və Zibil qutusuna göndəriləcək.`}
        confirmText="Sil"
        cancelText="İmtina"
        variant="danger"
        onConfirm={() => {
          if (customerToDelete) {
            onDeleteCustomer(customerToDelete);
            setCustomerToDelete(null);
          }
        }}
        onClose={() => setCustomerToDelete(null)}
      />

      {/* Waze Fallback Modal */}
      {wazeFallbackTarget?.location && (
        <WazeFallbackModal
          isOpen={Boolean(wazeFallbackTarget)}
          onClose={() => setWazeFallbackTarget(null)}
          lat={wazeFallbackTarget.location.lat}
          lng={wazeFallbackTarget.location.lng}
          customerName={wazeFallbackTarget.name}
          address={wazeFallbackTarget.address}
        />
      )}
    </div>
  );
};
