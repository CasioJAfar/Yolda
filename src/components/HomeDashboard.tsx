import React, { useState, useMemo } from 'react';
import {
  Users,
  UserCheck,
  Truck,
  Search,
  Plus,
  MapPin,
  Phone,
  ChevronRight,
  MessageCircle,
  Clock,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { Customer, Driver, User } from '../types';

interface HomeDashboardProps {
  user: User | null;
  customers: Customer[];
  drivers: Driver[];
  onOpenAddCustomer: () => void;
  onSelectCustomer: (customer: Customer) => void;
  onQuickSendToDriver: (customer: Customer) => void;
  onNavigateToTab: (tab: 'customers' | 'drivers' | 'map' | 'history') => void;
}

type FilterType = 'all' | 'today' | 'has_location' | 'no_location';

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  user,
  customers,
  drivers,
  onOpenAddCustomer,
  onSelectCustomer,
  onQuickSendToDriver,
  onNavigateToTab,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  // Today calculations
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAddedCount = customers.filter((c) => c.createdAt.startsWith(todayStr)).length;
  const activeDriversCount = drivers.filter((d) => d.status === 'active').length;

  // Filtered customers
  const canAddCustomers = user?.permissions?.canAddCustomers !== false;
  const canSendWhatsApp = user?.permissions?.canSendWhatsApp !== false;

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.phone.replace(/[^\d]/g, '').includes(q.replace(/[^\d]/g, '')) ||
        c.address.toLowerCase().includes(q) ||
        (c.note && c.note.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (activeFilter === 'today') {
        return c.createdAt.startsWith(todayStr);
      }
      if (activeFilter === 'has_location') {
        return !!c.location;
      }
      if (activeFilter === 'no_location') {
        return !c.location;
      }
      return true;
    });
  }, [customers, searchQuery, activeFilter, todayStr]);

  return (
    <div className="space-y-5 pb-20">
      {/* Top Greeting Card (Mockup #2 style) */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-blue-500/20">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'M'}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-900 dark:text-white text-base">
                {user?.name || 'Cəfər'}
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                {user?.role === 'admin' ? 'Admin' : 'İstifadəçi'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Xoş gəldiniz • Müştəri GPS Paneli
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigateToTab('map')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-semibold border border-blue-200 dark:border-blue-900/60 transition"
          title="Xəritədə bax"
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>Xəritə</span>
        </button>
      </div>

      {/* Stats Cards (Mockup #2 style: Ümumi müştərilər 124, Bu gün əlavə olunan 3, Aktiv sürücülər 5) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {/* Total Customers */}
        <div
          onClick={() => onNavigateToTab('customers')}
          className="p-4 bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-2xl shadow-lg shadow-blue-600/20 cursor-pointer hover:scale-[1.02] transition"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-blue-100">
              Ümumi müştərilər
            </span>
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
              <Users className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="text-2xl font-black tracking-tight">{customers.length}</div>
        </div>

        {/* Today Added */}
        <div
          onClick={() => setActiveFilter('today')}
          className="p-4 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white rounded-2xl shadow-lg shadow-emerald-600/20 cursor-pointer hover:scale-[1.02] transition"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-emerald-100">
              Bu gün əlavə olunan
            </span>
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
              <UserCheck className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="text-2xl font-black tracking-tight">{todayAddedCount}</div>
        </div>

        {/* Active Drivers */}
        <div
          onClick={() => onNavigateToTab('drivers')}
          className="col-span-2 sm:col-span-1 p-4 bg-slate-800 text-white rounded-2xl shadow-md border border-slate-700 cursor-pointer hover:scale-[1.02] transition"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-300">
              Aktiv sürücülər
            </span>
            <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center">
              <Truck className="w-4 h-4 text-blue-400" />
            </div>
          </div>
          <div className="text-2xl font-black tracking-tight text-white">
            {activeDriversCount}
          </div>
        </div>
      </div>

      {/* Search Input (Mockup #2 style) */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Müştəri adı, telefon, ünvan..."
          className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            Təmizlə
          </button>
        )}
      </div>

      {/* Filter Tabs (Responsive 2x2 grid on mobile, 4 across on sm/md - No horizontal scroll!) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          onClick={() => setActiveFilter('all')}
          className={`py-2.5 px-3 rounded-xl text-xs font-semibold text-center truncate transition border ${
            activeFilter === 'all'
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-transparent hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          Hamısı ({customers.length})
        </button>

        <button
          onClick={() => setActiveFilter('today')}
          className={`py-2.5 px-3 rounded-xl text-xs font-semibold text-center truncate transition border ${
            activeFilter === 'today'
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-transparent hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          Bu gün ({todayAddedCount})
        </button>

        <button
          onClick={() => setActiveFilter('has_location')}
          className={`py-2.5 px-3 rounded-xl text-xs font-semibold text-center truncate transition border ${
            activeFilter === 'has_location'
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-transparent hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          Konumu var ({customers.filter((c) => !!c.location).length})
        </button>

        <button
          onClick={() => setActiveFilter('no_location')}
          className={`py-2.5 px-3 rounded-xl text-xs font-semibold text-center truncate transition border ${
            activeFilter === 'no_location'
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-transparent hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          Konumu yoxdur ({customers.filter((c) => !c.location).length})
        </button>
      </div>

      {/* Prominent "+ Yeni müştəri əlavə et" Button (Mockup #2) */}
      {canAddCustomers && (
        <button
          onClick={onOpenAddCustomer}
          className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold text-sm rounded-2xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition"
        >
          <Plus className="w-5 h-5" />
          <span>+ Yeni müştəri əlavə et</span>
        </button>
      )}

      {/* Customers List Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-slate-900 dark:text-white text-base">
            Müştərilər
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {filteredCustomers.length} müştəri tapıldı
          </span>
        </div>

        {filteredCustomers.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800">
            <Users className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Heç bir müştəri tapılmadı
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Axtarış sözünü dəyişin və ya yeni müştəri əlavə edin.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                onClick={() => onSelectCustomer(customer)}
                className="p-3.5 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 rounded-2xl shadow-sm hover:shadow-md transition cursor-pointer flex items-center justify-between gap-3 group"
              >
                {/* Left: Avatar & Text */}
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
                  <div className="min-w-0 truncate">
                    <div className="font-bold text-slate-900 dark:text-white text-sm truncate">
                      {customer.name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      {customer.phone}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 truncate mt-0.5">
                      {customer.address || 'Ünvan qeyd edilməyib'}
                    </div>
                  </div>
                </div>

                {/* Right: GPS indicator & WhatsApp quick send & Arrow */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Quick Send to driver button */}
                  {canSendWhatsApp && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuickSendToDriver(customer);
                      }}
                      title="Sürücüyə WhatsApp ilə göndər"
                      className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 transition"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  )}

                  {/* Location status badge */}
                  {customer.location ? (
                    <div
                      title="Dəqiq GPS Konumu var"
                      className="w-7 h-7 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center"
                    >
                      <MapPin className="w-4 h-4" />
                    </div>
                  ) : (
                    <div
                      title="Konum qeyd olunmayıb"
                      className="w-7 h-7 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center"
                    >
                      <MapPin className="w-4 h-4 opacity-30" />
                    </div>
                  )}

                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
