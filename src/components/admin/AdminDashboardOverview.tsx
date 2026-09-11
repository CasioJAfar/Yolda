import React, { useMemo } from 'react';
import {
  Users,
  UserCheck,
  Truck,
  MessageCircle,
  Activity,
  Calendar,
  Trash2,
  MapPin,
  Clock,
  ArrowRight,
  TrendingUp,
  Wifi,
} from 'lucide-react';
import { AuditLog, AdminSection, User } from '../../types';
import { isUserOnline } from '../../lib/userPresence';

interface AdminDashboardOverviewProps {
  stats: {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    totalCustomers: number;
    todayCustomers: number;
    totalDrivers: number;
    activeDrivers: number;
    todayDispatches: number;
    todayOperations: number;
    deletedCustomersCount: number;
    regions: Record<string, number>;
    recentLogs: AuditLog[];
    userActivities: Array<{
      id: string;
      name: string;
      role: string;
      status: string;
      customerCount: number;
      driverCount: number;
      dispatchCount: number;
      lastLoginAt?: string;
      lastActiveAt?: string;
      isOnline?: boolean;
    }>;
  } | null;
  users?: User[];
  onNavigate: (section: AdminSection) => void;
  onViewUser: (userId: string) => void;
}

export const AdminDashboardOverview: React.FC<AdminDashboardOverviewProps> = ({
  stats,
  users,
  onNavigate,
  onViewUser,
}) => {
  const onlineUsersCount = useMemo(() => {
    if (users && users.length > 0) {
      return users.filter((u) => isUserOnline(u)).length;
    }
    return 0;
  }, [users]);

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <Activity className="w-6 h-6 animate-spin mr-2" />
        <span>Statistik məlumatlar yüklənir...</span>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Ümumi İstifadəçilər',
      value: stats.totalUsers,
      subtext: `${onlineUsersCount} onlayn • ${stats.activeUsers} aktiv`,
      icon: UserCheck,
      color: 'blue',
      section: 'users' as AdminSection,
    },
    {
      title: 'Ümumi Müştərilər',
      value: stats.totalCustomers,
      subtext: 'Bütün istifadəçilər üzrə',
      icon: Users,
      color: 'indigo',
      section: 'customers' as AdminSection,
    },
    {
      title: 'Bugünkü Müştərilər',
      value: stats.todayCustomers,
      subtext: 'Bu gün əlavə edilənlər',
      icon: Calendar,
      color: 'emerald',
      section: 'customers' as AdminSection,
    },
    {
      title: 'Ümumi Sürücülər',
      value: stats.totalDrivers,
      subtext: `${stats.activeDrivers} aktiv sürücü`,
      icon: Truck,
      color: 'amber',
      section: 'drivers' as AdminSection,
    },
    {
      title: 'Bugünkü WhatsApp Göndərişləri',
      value: stats.todayDispatches,
      subtext: 'Sürücülərə ötürülən konumlar',
      icon: MessageCircle,
      color: 'emerald',
      section: 'history' as AdminSection,
    },
    {
      title: 'Bugünkü Əməliyyatlar',
      value: stats.todayOperations,
      subtext: 'Qeydə alınan sistem logları',
      icon: Activity,
      color: 'purple',
      section: 'logs' as AdminSection,
    },
    {
      title: 'Silinmiş Müştərilər',
      value: stats.deletedCustomersCount,
      subtext: 'Zibil qutusunda bərpa gözləyir',
      icon: Trash2,
      color: stats.deletedCustomersCount > 0 ? 'rose' : 'slate',
      section: 'trash' as AdminSection,
    },
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      case 'indigo':
        return 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800';
      case 'emerald':
        return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800';
      case 'amber':
        return 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800';
      case 'purple':
        return 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800';
      case 'rose':
        return 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800';
      default:
        return 'bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 rounded-2xl p-6 text-white shadow-lg shadow-blue-900/10">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-blue-200">
            SaaS İdarəetmə Paneli
          </span>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight mt-1">
            Xoş gəlmisiniz, Sistem Administratoru
          </h1>
          <p className="text-xs sm:text-sm text-blue-100/80 mt-1 max-w-xl">
            Burada bütün istifadəçilərin müştərilərini, sürücülərini, icazələrini və təhlükəsizlik loglarını mərkəzləşdirilmiş şəkildə idarə edə bilərsiniz.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('users')}
            className="px-4 py-2 bg-white text-blue-700 hover:bg-blue-50 rounded-xl text-xs font-semibold shadow-sm transition"
          >
            İstifadəçiləri İdarə Et
          </button>
          <button
            onClick={() => onNavigate('trash')}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold backdrop-blur-sm transition"
          >
            Zibil Qutusu ({stats.deletedCustomersCount})
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              onClick={() => onNavigate(card.section)}
              className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {card.title}
                </span>
                <div className={`p-2 rounded-xl border ${getColorClasses(card.color)}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                  {card.value}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 truncate">
                  {card.subtext}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Two Column Layout: User Activity + Recent Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: User Activity Cards */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                İstifadəçi Aktivliyi və Məlumat Ayrılığı
              </h3>
            </div>
            <button
              onClick={() => onNavigate('users')}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <span>Hamısı</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-2">
            {stats.userActivities.map((u) => {
              const matchedUser = users?.find((usr) => usr.id === u.id);
              const online = matchedUser ? isUserOnline(matchedUser) : Boolean(u.isOnline);
              return (
                <div
                  key={u.id}
                  onClick={() => onViewUser(u.id)}
                  className="py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 -mx-2 px-2 rounded-xl transition cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      {online && (
                        <span
                          className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900 animate-pulse"
                          title="İndi Onlayndır"
                        />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold text-slate-900 dark:text-white">
                          {u.name}
                        </span>
                        {online && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Onlayn
                          </span>
                        )}
                        {u.role === 'admin' ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 rounded">
                            Admin
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium px-1.5 py-0.2 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 rounded">
                            İstifadəçi
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {u.customerCount} müştəri • {u.driverCount} sürücü • {u.dispatchCount} göndəriş
                      </div>
                    </div>
                  </div>

                <div className="text-right">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      u.status === 'active'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                    }`}
                  >
                    {u.status === 'active' ? 'Aktiv' : 'Deaktiv'}
                  </span>
                  <div className="text-[10px] text-slate-400 mt-1">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('az-AZ') : 'Giriş yoxdur'}
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        </div>

        {/* Right: Son Əməliyyatlar (Recent Logs) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Son Sistem Əməliyyatları (Loglar)
              </h3>
            </div>
            <button
              onClick={() => onNavigate('logs')}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <span>Bütün Loglar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3 mt-3 overflow-y-auto max-h-[340px] pr-1">
            {stats.recentLogs && stats.recentLogs.length > 0 ? (
              stats.recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition border border-transparent hover:border-slate-200 dark:hover:border-slate-800"
                >
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {log.userName}
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 flex-shrink-0">
                        <Clock className="w-3 h-3" />
                        {new Date(log.timestamp).toLocaleTimeString('az-AZ', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 font-medium truncate">
                      {log.action}: {log.targetName || log.details}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                      {log.details}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-xs text-slate-400">
                Hələ heç bir əməliyyat qeydə alınmayıb.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Region Distribution & Security info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h4 className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
              Şəhər və Rayonlar üzrə Müştəri Bölgüsü
            </h4>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
            {Object.entries(stats.regions).map(([region, count]) => (
              <div
                key={region}
                className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/50 dark:border-slate-700/50 text-center"
              >
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {region}
                </div>
                <div className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                  {count}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
              <h4 className="font-bold text-xs uppercase tracking-wider">Təhlükəsizlik Vəziyyəti</h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Verilənlər bazası səviyyəsində çoxistifadəçili təcrid aktivdir. Hər bir adi istifadəçi yalnız özünə aid müştəri və sürücüləri görür.
            </p>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
            Soft Delete (Zəbil qutusu) və Audit Log mexanizmi işləkdir.
          </div>
        </div>
      </div>
    </div>
  );
};
