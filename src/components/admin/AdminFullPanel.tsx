import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  LayoutDashboard,
  Users,
  Truck,
  History,
  Trash2,
  FileText,
  ShieldCheck,
  Settings,
  ArrowLeft,
  Search,
  Filter,
  RefreshCw,
  Database,
  Lock,
  UserCheck,
  X,
} from 'lucide-react';
import { User, Customer, Driver, DispatchRecord, AuditLog, AdminSection, UserPermissions } from '../../types';
import { Api } from '../../lib/api';
import { matchQuery } from '../../lib/search';
import { AdminSidebar } from './AdminSidebar';
import { AdminDashboardOverview } from './AdminDashboardOverview';
import { AdminUsersTab } from './AdminUsersTab';
import { AdminTrashTab } from './AdminTrashTab';
import { AdminLogsTab } from './AdminLogsTab';
import { UserProfileModal } from './UserProfileModal';
import { AdminPermissionsModal } from './AdminPermissionsModal';
import { CreateUserModal } from './CreateUserModal';
import { EditUserModal } from './EditUserModal';
import { ConfirmModal } from '../ConfirmModal';
import { ChangeOwnerModal } from '../ChangeOwnerModal';

interface AdminFullPanelProps {
  currentUser: User;
  onExitAdmin: () => void;
  onRefreshAll?: () => void;
}

export const AdminFullPanel: React.FC<AdminFullPanelProps> = ({
  currentUser,
  onExitAdmin,
  onRefreshAll,
}) => {
  const [currentSection, setCurrentSection] = useState<AdminSection>('dashboard');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [allDrivers, setAllDrivers] = useState<Driver[]>([]);
  const [allDispatches, setAllDispatches] = useState<DispatchRecord[]>([]);
  const [trashList, setTrashList] = useState<Customer[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [selectedProfileUser, setSelectedProfileUser] = useState<User | null>(null);
  const [selectedPermissionsUser, setSelectedPermissionsUser] = useState<User | null>(null);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userToResetPassword, setUserToResetPassword] = useState<User | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [passwordResetSuccess, setPasswordResetSuccess] = useState<string | null>(null);

  // Customer / Driver filter by user
  const [customerUserFilter, setCustomerUserFilter] = useState<string>('all');
  const [adminCustomerSearch, setAdminCustomerSearch] = useState<string>('');
  const [customerToChangeOwner, setCustomerToChangeOwner] = useState<Customer | null>(null);

  const handleOwnerSaved = async (customerId: string, newOwnerId: string) => {
    try {
      const updated = await Api.updateCustomerOwner(customerId, newOwnerId);
      setAllCustomers((prev) => prev.map((c) => (c.id === customerId ? updated : c)));
      setCustomerToChangeOwner(null);
      if (onRefreshAll) onRefreshAll();
      // Reload logs to reflect owner change audit log
      Api.getAuditLogs({ limit: 300 }).then(setLogs).catch(console.error);
    } catch (err: any) {
      alert(err.message || 'Sahib dəyişdirilərkən xəta baş verdi');
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [adminStats, userList, customers, drivers, dispatches, trash, auditLogs] = await Promise.all([
        Api.getAdminStats(),
        Api.getAdminUsers(),
        Api.getCustomers(),
        Api.getDrivers(),
        Api.getDispatches(),
        Api.getTrash(),
        Api.getAuditLogs({ limit: 300 }),
      ]);

      setStats(adminStats);
      setUsers(userList);
      setAllCustomers(customers);
      setAllDrivers(drivers);
      setAllDispatches(dispatches);
      setTrashList(trash);
      setLogs(auditLogs);
    } catch (err) {
      console.error('Error loading admin data', err);
    } finally {
      setLoading(false);
    }
  };

  // Status toggle
  const handleToggleStatus = async (userId: string, currentStatus: 'active' | 'inactive') => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      await Api.toggleUserStatus(userId, newStatus);
      await loadAllData();
      if (selectedProfileUser && selectedProfileUser.id === userId) {
        setSelectedProfileUser((prev) => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  // Reset password via modal
  const handleResetPassword = (user: User) => {
    setUserToResetPassword(user);
    setNewPasswordInput('');
    setPasswordResetSuccess(null);
  };

  const executePasswordReset = async () => {
    if (!userToResetPassword || !newPasswordInput.trim()) return;
    try {
      await Api.resetUserPassword(userToResetPassword.id, newPasswordInput.trim());
      setPasswordResetSuccess(`"${userToResetPassword.name}" üçün şifrə uğurla yeniləndi.`);
      setTimeout(() => {
        setUserToResetPassword(null);
        setPasswordResetSuccess(null);
      }, 1200);
      await loadAllData();
    } catch (err: any) {
      setPasswordResetSuccess(`Xəta: ${err.message || 'Şifrə yenilənmədi'}`);
    }
  };

  // Delete user via ConfirmModal
  const handleDeleteUser = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (target) {
      setUserToDelete(target);
    }
  };

  const executeDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await Api.deleteAdminUser(userToDelete.id);
      setSelectedProfileUser(null);
      setUserToDelete(null);
      await loadAllData();
    } catch (err: any) {
      console.error(err);
    }
  };

  // Save permissions
  const handleSavePermissions = async (userId: string, permissions: UserPermissions) => {
    await Api.updateUserPermissions(userId, permissions);
    await loadAllData();
    if (selectedProfileUser && selectedProfileUser.id === userId) {
      setSelectedProfileUser((prev) => prev ? { ...prev, permissions } : null);
    }
  };

  // Create user
  const handleCreateUser = async (newUserData: any) => {
    await Api.createAdminUser(newUserData);
    await loadAllData();
  };

  // Edit user
  const handleSaveEditUser = async (
    userId: string,
    data: {
      name?: string;
      newId?: string;
      status?: 'active' | 'inactive';
      password?: string;
      permissions?: UserPermissions;
    }
  ) => {
    await Api.updateAdminUser(userId, data);
    await loadAllData();
    if (onRefreshAll) onRefreshAll();
  };

  // Delete logs
  const handleDeleteLogs = async (options: { all?: boolean; ids?: string[] }) => {
    await Api.deleteAuditLogs(options);
    await loadAllData();
    if (onRefreshAll) onRefreshAll();
  };

  // Trash actions
  const handleRestoreTrash = async (id: string) => {
    try {
      await Api.restoreCustomer(id);
      await loadAllData();
      if (onRefreshAll) onRefreshAll();
    } catch (err: any) {
      alert(err.message || 'Bərpa zamanı xəta baş verdi');
    }
  };

  const handlePermanentDelete = async (id: string) => {
    try {
      await Api.permanentDeleteCustomer(id);
      await loadAllData();
      if (onRefreshAll) onRefreshAll();
    } catch (err: any) {
      alert(err.message || 'Silinmə zamanı xəta baş verdi');
    }
  };

  // View user profile from anywhere
  const handleViewUserById = (userId: string) => {
    const u = users.find((user) => user.id === userId);
    if (u) {
      setSelectedProfileUser(u);
    }
  };

  // Filter customers by user and search in all customers tab
  const filteredCustomers = useMemo(() => {
    const list = allCustomers.filter((c) => {
      if (customerUserFilter !== 'all' && c.userId !== customerUserFilter && c.ownerId !== customerUserFilter) {
        return false;
      }
      const q = adminCustomerSearch.trim();
      if (q) {
        return (
          matchQuery(c.name, q) ||
          matchQuery(c.phone, q) ||
          matchQuery(c.address || '', q) ||
          matchQuery(c.note || '', q) ||
          matchQuery(c.userOwnerName || '', q)
        );
      }
      return true;
    });
    const uniqueMap = new Map<string, Customer>();
    for (const c of list) {
      if (c && c.id && !uniqueMap.has(c.id)) {
        uniqueMap.set(c.id, c);
      }
    }
    return Array.from(uniqueMap.values());
  }, [allCustomers, customerUserFilter, adminCustomerSearch]);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col md:flex-row">
      {/* Sidebar on Desktop */}
      <div className="hidden md:block">
        <AdminSidebar
          currentSection={currentSection}
          onSelectSection={setCurrentSection}
          trashCount={trashList.length}
          onExitAdmin={onExitAdmin}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between gap-3 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={onExitAdmin}
              className="md:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-sm">
                <Shield className="w-4 h-4" />
              </div>
              <span className="font-bold text-slate-900 dark:text-white text-sm capitalize">
                {currentSection === 'dashboard'
                  ? 'İdarəetmə Paneli'
                  : currentSection === 'users'
                  ? 'İstifadəçilər'
                  : currentSection === 'customers'
                  ? 'Bütün Müştərilər'
                  : currentSection === 'drivers'
                  ? 'Bütün Sürücülər'
                  : currentSection === 'history'
                  ? 'Göndəriş Tarixçəsi'
                  : currentSection === 'trash'
                  ? 'Zibil Qutusu'
                  : currentSection === 'logs'
                  ? 'Sistem Logları'
                  : currentSection === 'permissions'
                  ? 'İcazələr Matrisi'
                  : 'Sistem Ayarları'}
              </span>
            </div>
          </div>

          {/* Quick Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={loadAllData}
              disabled={loading}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Məlumatları yenilə"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={onExitAdmin}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Əsas Tətbiqə Keç</span>
            </button>
          </div>
        </header>

        {/* Mobile Horizontal Tabs */}
        <div className="md:hidden flex items-center gap-1 overflow-x-auto p-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 no-scrollbar">
          {(
            [
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'users', label: 'İstifadəçilər' },
              { id: 'customers', label: 'Müştərilər' },
              { id: 'drivers', label: 'Sürücülər' },
              { id: 'trash', label: `Zibil (${trashList.length})` },
              { id: 'logs', label: 'Loglar' },
              { id: 'permissions', label: 'İcazələr' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setCurrentSection(t.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
                currentSection === t.id
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Section View Container */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto max-w-7xl w-full mx-auto pb-24 md:pb-8">
          {currentSection === 'dashboard' && (
            <AdminDashboardOverview
              stats={stats}
              users={users}
              onNavigate={setCurrentSection}
              onViewUser={handleViewUserById}
            />
          )}

          {currentSection === 'users' && (
            <AdminUsersTab
              users={users}
              onOpenCreateUser={() => setIsCreateUserOpen(true)}
              onViewProfile={(u) => setSelectedProfileUser(u)}
              onOpenPermissions={(u) => setSelectedPermissionsUser(u)}
              onResetPassword={handleResetPassword}
              onToggleStatus={handleToggleStatus}
              onDeleteUser={handleDeleteUser}
              onEditUser={(u) => setUserToEdit(u)}
            />
          )}

          {currentSection === 'customers' && (
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
                  {/* Search bar */}
                  <div className="relative flex-1 max-w-sm">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={adminCustomerSearch}
                      onChange={(e) => setAdminCustomerSearch(e.target.value)}
                      placeholder="Müştəri, telefon və ya sahib axtar..."
                      className="w-full pl-9 pr-8 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {adminCustomerSearch && (
                      <button
                        onClick={() => setAdminCustomerSearch('')}
                        className="p-1 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Sahibi:
                    </span>
                    <select
                      value={customerUserFilter}
                      onChange={(e) => setCustomerUserFilter(e.target.value)}
                      className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                    >
                      <option value="all">Bütün İstifadəçilər ({allCustomers.length})</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({allCustomers.filter((c) => c.userId === u.id).length})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="text-xs text-slate-500 shrink-0">
                  Göstərilir: <span className="font-bold text-slate-900 dark:text-white">{filteredCustomers.length}</span> müştəri
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredCustomers.map((c) => (
                  <div
                    key={c.id}
                    className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">{c.name}</h4>
                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{c.phone}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCustomerToChangeOwner(c)}
                          className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition flex items-center gap-1 cursor-pointer shrink-0"
                          title="Sahibini dəyiş"
                        >
                          <UserCheck className="w-3 h-3" />
                          <span>{c.userOwnerName || 'Naməlum'}</span>
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-2 line-clamp-2">{c.address || 'Ünvan qeyd edilməyib'}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2 text-slate-400">
                        <span>{new Date(c.createdAt).toLocaleDateString('az-AZ')}</span>
                        {c.location && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            GPS Var
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setCustomerToChangeOwner(c)}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Sahibini dəyiş</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentSection === 'drivers' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {allDrivers.map((d) => (
                  <div
                    key={d.id}
                    className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">{d.name}</h4>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                        Sahibi: {d.userOwnerName}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{d.phone}</p>
                    {d.note && <p className="text-[11px] text-slate-500 mt-1">{d.note}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentSection === 'history' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 font-bold text-sm">
                Bütün WhatsApp Göndəriş Tarixçəsi
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {allDispatches.map((dp) => (
                  <div key={dp.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        Müştəri: {dp.customerName} → Sürücü: {dp.driverName}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Ünvan: {dp.customerAddress} • Sahibi: <span className="font-semibold text-blue-600">{dp.userOwnerName}</span>
                      </div>
                    </div>
                    <span className="text-slate-400 text-[11px] whitespace-nowrap">
                      {new Date(dp.timestamp).toLocaleString('az-AZ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentSection === 'trash' && (
            <AdminTrashTab
              trashList={trashList}
              onRestore={handleRestoreTrash}
              onPermanentDelete={handlePermanentDelete}
            />
          )}

          {currentSection === 'logs' && (
            <AdminLogsTab
              logs={logs}
              onRefresh={loadAllData}
              onDeleteLogs={handleDeleteLogs}
              loading={loading}
            />
          )}

          {currentSection === 'permissions' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">İcazələr Sistemi İcmalı</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Hər bir istifadəçiyə verilmiş icazələr real vaxt rejimində tətbiq olunur. İcazə verilməyən əməliyyatların düymələri tətbiqdə gizlədilir və server tərəfindən bloklanır.
                </p>
              </div>

              {/* Mobile View: Card UI for Permissions */}
              <div className="block md:hidden space-y-3">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-900 dark:text-white">{u.name}</div>
                          <div className="text-[10px] text-slate-400 capitalize">{u.role === 'admin' ? 'Admin' : 'İstifadəçi'}</div>
                        </div>
                      </div>

                      <button
                        onClick={() => setSelectedPermissionsUser(u)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
                      >
                        İcazələri Tənzimlə
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-[11px] pt-1">
                      <div className={`p-2 rounded-xl border flex items-center justify-between ${u.permissions.canViewCustomers ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'}`}>
                        <span>Müştəri Baxış</span>
                        <span>{u.permissions.canViewCustomers ? '✅' : '❌'}</span>
                      </div>
                      <div className={`p-2 rounded-xl border flex items-center justify-between ${u.permissions.canAddCustomers ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'}`}>
                        <span>Müştəri Əlavə</span>
                        <span>{u.permissions.canAddCustomers ? '✅' : '❌'}</span>
                      </div>
                      <div className={`p-2 rounded-xl border flex items-center justify-between ${u.permissions.canDeleteCustomers ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'}`}>
                        <span>Müştəri Sil</span>
                        <span>{u.permissions.canDeleteCustomers ? '✅' : '❌'}</span>
                      </div>
                      <div className={`p-2 rounded-xl border flex items-center justify-between ${u.permissions.canAddDrivers ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'}`}>
                        <span>Sürücü Əlavə</span>
                        <span>{u.permissions.canAddDrivers ? '✅' : '❌'}</span>
                      </div>
                      <div className={`p-2 rounded-xl border flex items-center justify-between ${u.permissions.canSendWhatsApp ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'}`}>
                        <span>WhatsApp Göndər</span>
                        <span>{u.permissions.canSendWhatsApp ? '✅' : '❌'}</span>
                      </div>
                      <div className={`p-2 rounded-xl border flex items-center justify-between ${u.permissions.canExportData ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'}`}>
                        <span>Yedəkləmə (İxrac)</span>
                        <span>{u.permissions.canExportData ? '✅' : '❌'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop View: Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase font-bold text-slate-500">
                      <th className="py-3 px-3">İstifadəçi</th>
                      <th className="py-3 px-3 text-center">Müştəri Baxış</th>
                      <th className="py-3 px-3 text-center">Müştəri Əlavə</th>
                      <th className="py-3 px-3 text-center">Müştəri Sil</th>
                      <th className="py-3 px-3 text-center">Sürücü Əlavə</th>
                      <th className="py-3 px-3 text-center">WhatsApp Göndər</th>
                      <th className="py-3 px-3 text-right">Tənzimlə</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-3 px-3 font-semibold">{u.name} ({u.role})</td>
                        <td className="py-3 px-3 text-center">{u.permissions.canViewCustomers ? '✅' : '❌'}</td>
                        <td className="py-3 px-3 text-center">{u.permissions.canAddCustomers ? '✅' : '❌'}</td>
                        <td className="py-3 px-3 text-center">{u.permissions.canDeleteCustomers ? '✅' : '❌'}</td>
                        <td className="py-3 px-3 text-center">{u.permissions.canAddDrivers ? '✅' : '❌'}</td>
                        <td className="py-3 px-3 text-center">{u.permissions.canSendWhatsApp ? '✅' : '❌'}</td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => setSelectedPermissionsUser(u)}
                            className="px-2.5 py-1 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 rounded-lg font-medium hover:bg-blue-100"
                          >
                            Dəyiş
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {currentSection === 'settings' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-6">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Sistem və Verilənlər Bazası Tənzimləmələri</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Yolda çoxistifadəçili infrastrukturunun cari statusu
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider mb-2">
                    <Database className="w-4 h-4" />
                    <span>Məlumat Təcridi Vəziyyəti</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Hər bir müştəri və sürücü qeydi birbaşa <code className="text-blue-600 dark:text-blue-400 font-mono">userId</code> sütunu ilə saxlanılır. Backend sorğularında istifadəçi autentifikasiyası əsasında ciddi filtrasiya aparılır.
                  </p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-wider mb-2">
                    <Lock className="w-4 h-4" />
                    <span>Təhlükəsizlik və Audit Logları</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Sistemdə baş verən bütün giriş, silinmə, redaktə və WhatsApp göndərişləri IP ünvanı və cihaz məlumatı ilə birlikdə daimi audit bazasında qeyd olunur.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      {selectedProfileUser && (
        <UserProfileModal
          user={selectedProfileUser}
          onClose={() => setSelectedProfileUser(null)}
          onToggleStatus={handleToggleStatus}
          onOpenPermissions={(u) => setSelectedPermissionsUser(u)}
          onResetPassword={handleResetPassword}
          onDeleteUser={handleDeleteUser}
        />
      )}

      {selectedPermissionsUser && (
        <AdminPermissionsModal
          user={selectedPermissionsUser}
          onClose={() => setSelectedPermissionsUser(null)}
          onSave={handleSavePermissions}
        />
      )}

      {isCreateUserOpen && (
        <CreateUserModal
          onClose={() => setIsCreateUserOpen(false)}
          onCreate={handleCreateUser}
        />
      )}

      {/* Edit User Modal */}
      {userToEdit && (
        <EditUserModal
          user={userToEdit}
          currentUser={currentUser}
          onClose={() => setUserToEdit(null)}
          onSave={handleSaveEditUser}
        />
      )}

      {/* User Delete Confirmation */}
      <ConfirmModal
        isOpen={Boolean(userToDelete)}
        title="İstifadəçini silmək istəyirsiniz?"
        description={`"${userToDelete?.name}" adlı istifadəçi və ona aid məlumatlar sistemdən silinəcək.`}
        confirmText="Sil"
        cancelText="İmtina"
        variant="danger"
        onConfirm={executeDeleteUser}
        onClose={() => setUserToDelete(null)}
      />

      {/* Password Reset Modal */}
      {userToResetPassword && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Şifrəni Yenilə: {userToResetPassword.name}
            </h3>
            <p className="text-xs text-slate-500">
              Bu istifadəçi üçün yeni giriş şifrəsi təyin edin.
            </p>

            {passwordResetSuccess ? (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs font-semibold text-center">
                {passwordResetSuccess}
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Yeni şifrə daxil edin"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  autoFocus
                />
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => setUserToResetPassword(null)}
                    className="flex-1 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 transition"
                  >
                    İmtina
                  </button>
                  <button
                    onClick={executePasswordReset}
                    disabled={!newPasswordInput.trim()}
                    className="flex-1 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl shadow-md transition"
                  >
                    Yadda Saxla
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Admin Change Customer Owner Modal (Requirement 1, 4, 5) */}
      {customerToChangeOwner && (
        <ChangeOwnerModal
          isOpen={true}
          customer={customerToChangeOwner}
          users={users}
          currentUserId={currentUser.id}
          onClose={() => setCustomerToChangeOwner(null)}
          onSave={handleOwnerSaved}
        />
      )}
    </div>
  );
};
