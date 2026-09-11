import React, { useState, useEffect } from 'react';
import {
  Truck,
  Users,
  Radio,
  Clock,
  MapPin,
  Phone,
  MessageCircle,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Shield,
  Smartphone,
  Navigation,
} from 'lucide-react';
import { Driver, User } from '../../types';
import { isDriverOnline, isUserOnline, getDriverPresenceLabel, getUserPresenceLabel } from '../../lib/userPresence';
import { openWhatsApp } from '../../lib/whatsapp';
import { FirebaseSync } from '../../lib/firebase';

interface AdminOnlineDriversTabProps {
  drivers: Driver[];
  users: User[];
  onRefresh?: () => void;
}

export const AdminOnlineDriversTab: React.FC<AdminOnlineDriversTabProps> = ({
  drivers: initialDrivers,
  users: initialUsers,
  onRefresh,
}) => {
  const [drivers, setDrivers] = useState<Driver[]>(initialDrivers);
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'drivers' | 'staff'>('all');
  const [isSyncing, setIsSyncing] = useState(false);

  // Subscribe to real-time driver updates from Firestore
  useEffect(() => {
    const unsubDrivers = FirebaseSync.subscribeDrivers((updatedDrivers) => {
      setDrivers(updatedDrivers);
    });
    return () => unsubDrivers();
  }, []);

  // Compute presence
  const onlineDrivers = drivers.filter((d) => isDriverOnline(d, users));
  const offlineDrivers = drivers.filter((d) => !isDriverOnline(d, users));
  const onlineUsers = users.filter((u) => isUserOnline(u));

  // Merge list for viewing
  const items = [
    ...drivers.map((d) => ({
      id: d.id,
      name: d.name,
      phone: d.phone,
      type: 'driver' as const,
      isOnline: isDriverOnline(d, users),
      lastActive: d.lastActive || '',
      presenceLabel: getDriverPresenceLabel(d, users),
      currentOrderId: d.currentOrderId,
      note: d.note,
    })),
    ...users
      .filter((u) => u.role !== 'driver')
      .map((u) => ({
        id: u.id,
        name: u.name,
        phone: u.phone,
        type: 'staff' as const,
        role: u.role,
        isOnline: isUserOnline(u),
        lastActive: u.lastActive || u.lastLogin || '',
        presenceLabel: getUserPresenceLabel(u),
        currentOrderId: undefined,
        note: u.username ? `@${u.username}` : undefined,
      })),
  ];

  // Filtering
  const filtered = items.filter((item) => {
    if (filterRole === 'drivers' && item.type !== 'driver') return false;
    if (filterRole === 'staff' && item.type !== 'staff') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchPhone = item.phone.includes(q);
      return matchName || matchPhone;
    }
    return true;
  });

  // Sort: online first, then by last active
  filtered.sort((a, b) => {
    if (a.isOnline && !b.isOnline) return -1;
    if (!a.isOnline && b.isOnline) return 1;
    return (b.lastActive || '').localeCompare(a.lastActive || '');
  });

  return (
    <div className="space-y-5">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 text-white p-5 rounded-3xl border border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight">
              Canlı Onlayn İstifadəçilər & Sürücülər
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Firestore realtime listener vasitəsilə komandanın canlı aktivlik vəziyyəti
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={() => {
                setIsSyncing(true);
                onRefresh();
                setTimeout(() => setIsSyncing(false), 800);
              }}
              disabled={isSyncing}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Yenilə</span>
            </button>
          )}
        </div>
      </div>

      {/* Overview Stat Widgets */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold mb-1">
            <span>Onlayn Sürücülər</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-emerald-300">
            {onlineDrivers.length}
          </div>
          <p className="text-[11px] text-emerald-500/80 mt-0.5">Sifariş üçün hazırdır</p>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
            <span>Oflayn Sürücülər</span>
            <Truck className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-black text-slate-300">
            {offlineDrivers.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Son aktivlik qeydə alınıb</p>
        </div>

        <div className="p-4 bg-blue-950/40 border border-blue-800/60 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-blue-400 font-semibold mb-1">
            <span>Onlayn İşçilər / Adminlər</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-blue-300">
            {onlineUsers.length}
          </div>
          <p className="text-[11px] text-blue-500/80 mt-0.5">Paneldə aktivdir</p>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
            <span>Ümumi Qeydiyyat</span>
            <Shield className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-black text-white">
            {drivers.length + users.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Bütün heyət</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setFilterRole('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              filterRole === 'all'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Hamısı ({items.length})
          </button>
          <button
            onClick={() => setFilterRole('drivers')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              filterRole === 'drivers'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Sürücülər ({drivers.length})
          </button>
          <button
            onClick={() => setFilterRole('staff')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              filterRole === 'staff'
                ? 'bg-purple-600 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Dispetçer / Adminlər ({users.length})
          </button>
        </div>

        <div className="relative min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Ada və ya telefona görə axtar..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Realtime User / Driver Cards */}
      <div className="space-y-2.5">
        {filtered.length === 0 ? (
          <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 text-xs">
            Axtarışa uyğun istifadəçi tapılmadı
          </div>
        ) : (
          filtered.map((item) => {
            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  item.isOnline
                    ? 'bg-slate-900/90 border-emerald-500/30 hover:border-emerald-500/60 shadow-sm'
                    : 'bg-slate-900/50 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* Avatar + Dot */}
                  <div className="relative shrink-0">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm ${
                        item.type === 'driver'
                          ? 'bg-blue-950/60 text-blue-400 border border-blue-800/60'
                          : 'bg-purple-950/60 text-purple-400 border border-purple-800/60'
                      }`}
                    >
                      {item.name.charAt(0).toUpperCase()}
                    </div>
                    {/* Live Green/Grey Dot */}
                    <span
                      className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
                        item.isOnline
                          ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
                          : 'bg-slate-600'
                      }`}
                    >
                      {item.isOnline && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      )}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-white text-sm truncate">
                        {item.name}
                      </h4>
                      {/* Role Badge */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          item.type === 'driver'
                            ? 'bg-blue-950/80 text-blue-300 border-blue-800/60'
                            : 'bg-purple-950/80 text-purple-300 border-purple-800/60'
                        }`}
                      >
                        {item.type === 'driver' ? 'Sürücü' : (item as any).role || 'İşçi'}
                      </span>

                      {/* Online status badge */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          item.isOnline
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/80'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            item.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                          }`}
                        />
                        {item.isOnline ? 'Onlayn' : 'Oflayn'}
                      </span>

                      {item.currentOrderId && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800/80 flex items-center gap-1">
                          <Truck className="w-3 h-3" />
                          <span>Sifarişdədir</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap font-mono">
                      <span>{item.phone}</span>
                      <span>•</span>
                      <span className="text-slate-400">{item.presenceLabel}</span>
                    </div>

                    {item.note && (
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">
                        {item.note}
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick actions for admin */}
                <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                  <button
                    onClick={() => openWhatsApp(item.phone, 'Salam')}
                    className="p-2 bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-800/60 rounded-xl transition"
                    title="WhatsApp ilə yaz"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>
                  <a
                    href={`tel:${item.phone}`}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl transition"
                    title="Zəng et"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
