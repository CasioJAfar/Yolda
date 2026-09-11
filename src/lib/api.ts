import { Customer, Driver, DispatchRecord, User, UserPermissions, AuditLog, DriverUserInfo, DRIVER_PERMISSIONS, ADMIN_PERMISSIONS, DEFAULT_USER_PERMISSIONS, Order, OrderStatus, AppNotification } from '../types';
import { FirebaseSync } from './firebase';

const STORAGE_KEYS = {
  USER: 'musteri_gps_user',
};

// Isolated storage keys per user
function getCustomerStorageKey(): string {
  const user = getStoredUser();
  return user ? `musteri_gps_customers_${user.id}` : 'musteri_gps_customers_guest';
}

function getDriverStorageKey(): string {
  const user = getStoredUser();
  return user ? `musteri_gps_drivers_${user.id}` : 'musteri_gps_drivers_guest';
}

function getDispatchStorageKey(): string {
  const user = getStoredUser();
  return user ? `musteri_gps_dispatches_${user.id}` : 'musteri_gps_dispatches_guest';
}

// Helper to get active user
export function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: User | null) {
  if (user) {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEYS.USER);
  }
}

// Request helper with user header
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const user = getStoredUser();
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (user) {
    headers.set('x-user-id', user.id);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errMessage = 'Sorğu zamanı xəta baş verdi.';
    try {
      const errData = await response.json();
      if (errData.error) errMessage = errData.error;
    } catch {
      // fallback
    }
    throw new Error(errMessage);
  }

  return response.json();
}

export const Api = {
  // --- Auth ---
  async login(identifier: string, password: string): Promise<{ user: User; token: string }> {
    const cleanId = String(identifier).trim().toLowerCase().replace(/\s+/g, '');

    // 1. Check Firebase Firestore directly (Centralized Account Database across all devices)
    try {
      const firestoreUsers = await FirebaseSync.fetchUsersFromFirestore();
      const matched = firestoreUsers.find((u) => {
        const uCleanId = u.id.toLowerCase().replace(/\s+/g, '');
        const uCleanPhone = u.phone.replace(/[^\d]/g, '');
        const uCleanEmail = (u.email || '').toLowerCase().replace(/\s+/g, '');
        const uCleanName = u.name.toLowerCase().replace(/\s+/g, '');
        const idDigits = cleanId.replace(/[^\d]/g, '');
        return (
          uCleanId === cleanId ||
          (idDigits && uCleanPhone.includes(idDigits)) ||
          uCleanEmail === cleanId ||
          uCleanName === cleanId
        );
      });

      if (matched) {
        if (matched.status === 'inactive') {
          throw new Error('Bu hesab administrator tərəfindən deaktiv edilib.');
        }
        let valid = false;
        if (matched.role === 'admin' || matched.id === 'usr_admin') {
          valid = password === '2017';
        } else {
          valid =
            password === '123' ||
            password === '123456' ||
            (matched as any).passwordHash === password;
        }
        if (valid) {
          setStoredUser(matched);
          return { user: matched, token: `fb_jwt_${matched.id}` };
        } else {
          throw new Error('Daxil edilən şifrə yanlışdır.');
        }
      }
    } catch (fbErr: any) {
      if (fbErr.message && (fbErr.message.includes('deaktiv') || fbErr.message.includes('şifrə'))) {
        throw fbErr;
      }
      console.warn('Firebase login check warning', fbErr);
    }

    // 2. Try server auth endpoint
    try {
      const data = await apiRequest<{ user: User; token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password }),
      });
      setStoredUser(data.user);
      FirebaseSync.saveUser(data.user).catch(() => {});
      return data;
    } catch (err: any) {
      if (err.message && (err.message.includes('deaktiv') || err.message.includes('şifrə'))) {
        throw err;
      }
    }

    // 3. Fallback: Check known demo accounts, authenticate and seed to Firestore
    if (cleanId === 'admin' || cleanId === 'usr_admin' || cleanId === 'admin@musterigps.az') {
      if (password === '2017') {
        const fallbackAdmin: User = {
          id: 'usr_admin',
          name: 'Sistem Admini',
          phone: '+994 50 999 88 77',
          email: 'admin@musterigps.az',
          role: 'admin',
          status: 'active',
          permissions: ADMIN_PERMISSIONS,
          createdAt: new Date().toISOString(),
        };
        setStoredUser(fallbackAdmin);
        FirebaseSync.saveUser(fallbackAdmin).catch(() => {});
        return { user: fallbackAdmin, token: 'fb_jwt_usr_admin' };
      }
    } else if (cleanId === 'vusal' || cleanId === 'usr_vusal') {
      if (password === '123' || password === '123456') {
        const fallbackVusal: User = {
          id: 'usr_vusal',
          name: 'Vüsal Əliyev',
          phone: '+994 50 222 33 44',
          email: 'vusal@musterigps.az',
          role: 'user',
          status: 'active',
          permissions: DEFAULT_USER_PERMISSIONS,
          createdAt: new Date().toISOString(),
        };
        setStoredUser(fallbackVusal);
        FirebaseSync.saveUser(fallbackVusal).catch(() => {});
        return { user: fallbackVusal, token: 'fb_jwt_usr_vusal' };
      }
    } else if (cleanId === 'cefer' || cleanId === 'usr_cefer') {
      if (password === '123' || password === '123456') {
        const fallbackCefer: User = {
          id: 'usr_cefer',
          name: 'Cəfər',
          phone: '+994 50 406 64 25',
          email: 'cefer@musterigps.az',
          role: 'user',
          status: 'active',
          permissions: DEFAULT_USER_PERMISSIONS,
          createdAt: new Date().toISOString(),
        };
        setStoredUser(fallbackCefer);
        FirebaseSync.saveUser(fallbackCefer).catch(() => {});
        return { user: fallbackCefer, token: 'fb_jwt_usr_cefer' };
      }
    } else if (cleanId === 'ilqar' || cleanId === 'usr_ilqar') {
      if (password === '123' || password === '123456') {
        const fallbackIlqar: User = {
          id: 'usr_ilqar',
          name: 'İlqar Məmmədov',
          phone: '+994 55 333 44 55',
          email: 'ilqar@musterigps.az',
          role: 'user',
          status: 'active',
          permissions: DEFAULT_USER_PERMISSIONS,
          createdAt: new Date().toISOString(),
        };
        setStoredUser(fallbackIlqar);
        FirebaseSync.saveUser(fallbackIlqar).catch(() => {});
        return { user: fallbackIlqar, token: 'fb_jwt_usr_ilqar' };
      }
    } else if (cleanId === 'surucu' || cleanId === 'driver' || cleanId === 'murad' || cleanId === 'usr_surucu') {
      if (password === '123' || password === '123456') {
        const fallbackDriver: User = {
          id: 'usr_surucu',
          name: 'Murad Əhmədov (Sürücü)',
          phone: '+994 50 777 88 99',
          email: 'surucu@musterigps.az',
          role: 'driver',
          status: 'active',
          permissions: DRIVER_PERMISSIONS,
          createdAt: new Date().toISOString(),
        };
        setStoredUser(fallbackDriver);
        FirebaseSync.saveUser(fallbackDriver).catch(() => {});
        return { user: fallbackDriver, token: 'fb_jwt_usr_surucu' };
      }
    }

    throw new Error('İstifadəçi adı və ya şifrə yanlışdır.');
  },

  async register(name: string, phone: string, email: string, password: string): Promise<{ user: User; token: string }> {
    const data = await apiRequest<{ user: User; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, phone, email, password }),
    });
    setStoredUser(data.user);
    return data;
  },

  async changePassword(oldPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    return apiRequest('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword }),
    });
  },

  getCurrentUser(): User | null {
    return getStoredUser();
  },

  logout(): void {
    setStoredUser(null);
  },

  // --- Customers (Isolated per user, synchronized via Firebase Firestore Cloud) ---
  async getCustomers(userIdFilter?: string): Promise<Customer[]> {
    const user = getStoredUser();

    // 1. PRIMARY SOURCE OF TRUTH: Firebase Firestore Cloud Database
    try {
      const cloudCustomers = await FirebaseSync.fetchCustomersFromFirestore();
      if (cloudCustomers) {
        let valid = cloudCustomers.filter((c) => !c.isDeleted);
        if (userIdFilter) {
          valid = valid.filter((c) => c.ownerId === userIdFilter || c.userId === userIdFilter);
        } else if (user && user.role !== 'admin' && user.role !== 'driver') {
          valid = valid.filter((c) => c.ownerId === user.id || c.userId === user.id);
        }
        return valid;
      }
    } catch (fbErr) {
      console.warn('[Firebase] Firestore getCustomers warning:', fbErr);
    }

    // 2. Fallback to server API only if Firestore network fails
    const endpoint = userIdFilter ? `/api/customers?userId=${encodeURIComponent(userIdFilter)}` : '/api/customers';
    try {
      return await apiRequest<Customer[]>(endpoint);
    } catch (err) {
      console.warn('Network fallback failed', err);
      return [];
    }
  },

  async createCustomer(
    customer: Omit<Customer, 'id' | 'userId' | 'createdAt' | 'updatedAt'> & {
      ownerId?: string;
      userId?: string;
      userOwnerName?: string;
    }
  ): Promise<Customer> {
    const user = getStoredUser();
    const targetUserId = customer.ownerId || customer.userId || user?.id || 'usr_unknown';
    const newCustomer: Customer = {
      ...customer,
      id: `c_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      ownerId: targetUserId,
      userId: targetUserId,
      userOwnerName: customer.userOwnerName || user?.name || 'Naməlum',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. Save directly to Firebase Firestore first (Guaranteed Cloud Persistence across devices)
    try {
      await FirebaseSync.saveCustomer(newCustomer);
    } catch (fbErr) {
      console.warn('[Firebase] Cloud save error on createCustomer:', fbErr);
    }

    // 2. Also send to server API to keep server in sync in background
    apiRequest<Customer>('/api/customers', {
      method: 'POST',
      body: JSON.stringify(newCustomer),
    }).catch(() => {});

    return newCustomer;
  },

  async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer> {
    const all = await FirebaseSync.fetchCustomersFromFirestore();
    const target = all.find((c) => c.id === id);
    const updatedCustomer: Customer = {
      ...(target || ({} as Customer)),
      ...updates,
      id,
      ownerId: target?.ownerId || target?.userId || updates.ownerId || updates.userId,
      userId: target?.userId || target?.ownerId || updates.userId || updates.ownerId || 'usr_unknown',
      updatedAt: new Date().toISOString(),
    };

    // 1. Save to Firebase Firestore immediately
    try {
      await FirebaseSync.saveCustomer(updatedCustomer);
    } catch (fbErr) {
      console.warn('[Firebase] Cloud save error on updateCustomer:', fbErr);
    }

    // 2. Send to server API in background
    apiRequest<Customer>(`/api/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }).catch(() => {});

    return updatedCustomer;
  },

  // Admin: Update Customer Owner
  async updateCustomerOwner(id: string, newOwnerId: string): Promise<Customer> {
    const all = await FirebaseSync.fetchCustomersFromFirestore();
    const target = all.find((c) => c.id === id);
    const allUsers = await Api.getAdminUsers().catch(() => []);
    const newOwner = allUsers.find((u) => u.id === newOwnerId);

    const updatedCustomer: Customer = {
      ...(target || ({} as Customer)),
      id,
      ownerId: newOwnerId,
      userId: newOwnerId,
      userOwnerName: newOwner?.name || target?.userOwnerName || 'Naməlum',
      updatedAt: new Date().toISOString(),
    };

    // 1. Save to Firebase Firestore immediately
    try {
      await FirebaseSync.saveCustomer(updatedCustomer);
    } catch (fbErr) {
      console.warn('[Firebase] Cloud save error on updateCustomerOwner:', fbErr);
    }

    // 2. Also send to server API
    apiRequest<{ success: boolean; customer: Customer }>(`/api/admin/customers/${id}/owner`, {
      method: 'PUT',
      body: JSON.stringify({ newOwnerId }),
    }).catch(() => {});

    return updatedCustomer;
  },

  // Soft delete customer (moves to trash in Firestore)
  async deleteCustomer(id: string): Promise<{ success: boolean; id: string }> {
    const user = getStoredUser();
    const all = await FirebaseSync.fetchCustomersFromFirestore();
    const target = all.find((c) => c.id === id);

    if (target) {
      const softDeleted: Customer = {
        ...target,
        isDeleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy: user?.id,
        deletedByName: user?.name,
        updatedAt: new Date().toISOString(),
      };
      await FirebaseSync.saveCustomer(softDeleted).catch(console.warn);
    } else {
      await FirebaseSync.deleteCustomer(id).catch(console.warn);
    }

    apiRequest(`/api/customers/${id}`, { method: 'DELETE' }).catch(() => {});
    return { success: true, id };
  },

  // --- TRASH (Soft-deleted in Firestore) ---
  async getTrash(): Promise<Customer[]> {
    const user = getStoredUser();
    try {
      const cloud = await FirebaseSync.fetchCustomersFromFirestore();
      let trashed = cloud.filter((c) => c.isDeleted === true);
      if (user && user.role !== 'admin') {
        trashed = trashed.filter((c) => c.ownerId === user.id || c.userId === user.id);
      }
      return trashed;
    } catch {
      return [];
    }
  },

  async restoreCustomer(id: string): Promise<{ success: boolean; customer: Customer }> {
    const all = await FirebaseSync.fetchCustomersFromFirestore();
    const target = all.find((c) => c.id === id);
    if (!target) throw new Error('Müştəri tapılmadı');

    const restored: Customer = {
      ...target,
      isDeleted: false,
      deletedAt: undefined,
      deletedBy: undefined,
      deletedByName: undefined,
      updatedAt: new Date().toISOString(),
    };
    await FirebaseSync.saveCustomer(restored).catch(console.warn);

    apiRequest<{ success: boolean; customer: Customer }>(`/api/trash/${id}/restore`, {
      method: 'POST',
    }).catch(() => {});

    return { success: true, customer: restored };
  },

  async permanentDeleteCustomer(id: string): Promise<{ success: boolean }> {
    await FirebaseSync.deleteCustomer(id).catch(console.warn);
    apiRequest<{ success: boolean }>(`/api/trash/${id}/permanent`, {
      method: 'DELETE',
    }).catch(() => {});
    return { success: true };
  },

  // --- Drivers (Isolated per user, synchronized via Firebase) ---
  async getDrivers(): Promise<Driver[]> {
    const user = getStoredUser();

    // 1. Fetch from Firebase Firestore
    try {
      const cloudDrivers = await FirebaseSync.fetchDriversFromFirestore();
      if (cloudDrivers) {
        let list = cloudDrivers;
        if (user && user.role !== 'admin') {
          list = list.filter((d) => d.ownerId === user.id || d.userId === user.id);
        }
        return list;
      }
    } catch (fbErr) {
      console.warn('[Firebase] Firestore getDrivers warning:', fbErr);
    }

    // 2. Fallback to server API
    try {
      return await apiRequest<Driver[]>('/api/drivers');
    } catch (err) {
      return [];
    }
  },

  async createDriver(
    driver: Omit<Driver, 'id' | 'userId' | 'createdAt'> & { ownerId?: string; userId?: string }
  ): Promise<Driver> {
    const user = getStoredUser();
    const targetUserId = driver.ownerId || driver.userId || user?.id || 'usr_unknown';
    const newDriver: Driver = {
      ...driver,
      id: `drv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      ownerId: targetUserId,
      userId: targetUserId,
      userOwnerName: user?.name,
      createdAt: new Date().toISOString(),
    };

    // Save to Firebase Firestore
    await FirebaseSync.saveDriver(newDriver).catch(console.warn);

    apiRequest<Driver>('/api/drivers', {
      method: 'POST',
      body: JSON.stringify(newDriver),
    }).catch(() => {});

    return newDriver;
  },

  async updateDriver(id: string, updates: Partial<Driver>): Promise<Driver> {
    const all = await FirebaseSync.fetchDriversFromFirestore();
    const target = all.find((d) => d.id === id);
    const updatedDriver: Driver = {
      ...(target || ({} as Driver)),
      ...updates,
      id,
      ownerId: target?.ownerId || target?.userId || updates.ownerId || updates.userId,
      userId: target?.userId || target?.ownerId || updates.userId || updates.ownerId || 'usr_unknown',
    };

    await FirebaseSync.saveDriver(updatedDriver).catch(console.warn);

    apiRequest<Driver>(`/api/drivers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }).catch(() => {});

    return updatedDriver;
  },

  async deleteDriver(id: string): Promise<{ success: boolean; id: string }> {
    await FirebaseSync.deleteDriver(id).catch(console.warn);
    apiRequest(`/api/drivers/${id}`, { method: 'DELETE' }).catch(() => {});
    return { success: true, id };
  },

  // --- Dispatches (WhatsApp Send History, synchronized via Firebase) ---
  async getDispatches(): Promise<DispatchRecord[]> {
    const user = getStoredUser();

    // 1. Fetch from Firebase Firestore
    try {
      const cloudDispatches = await FirebaseSync.fetchDispatchesFromFirestore();
      if (cloudDispatches) {
        let list = cloudDispatches;
        if (user && user.role !== 'admin' && user.role !== 'driver') {
          list = list.filter((disp) => disp.ownerId === user.id || disp.userId === user.id);
        }
        return list;
      }
    } catch (fbErr) {
      console.warn('[Firebase] Firestore getDispatches warning:', fbErr);
    }

    try {
      return await apiRequest<DispatchRecord[]>('/api/dispatches');
    } catch (err) {
      return [];
    }
  },

  async recordDispatch(
    record: Omit<DispatchRecord, 'id' | 'userId' | 'timestamp'> & { ownerId?: string; userId?: string }
  ): Promise<DispatchRecord> {
    const user = getStoredUser();
    const targetUserId = record.ownerId || record.userId || user?.id || 'usr_unknown';
    const newRecord: DispatchRecord = {
      ...record,
      id: `disp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      ownerId: targetUserId,
      userId: targetUserId,
      userOwnerName: user?.name,
      timestamp: new Date().toISOString(),
    };

    // Save to Firebase Firestore
    await FirebaseSync.saveDispatch(newRecord).catch(console.warn);

    apiRequest<DispatchRecord>('/api/dispatches', {
      method: 'POST',
      body: JSON.stringify(newRecord),
    }).catch(() => {});

    return newRecord;
  },

  // --- Audit Logs ---
  async getAuditLogs(params?: { q?: string; type?: string; userId?: string; limit?: number }): Promise<AuditLog[]> {
    const query = new URLSearchParams();
    if (params?.q) query.set('q', params.q);
    if (params?.type) query.set('type', params.type);
    if (params?.userId) query.set('userId', params.userId);
    if (params?.limit) query.set('limit', String(params.limit));

    const url = `/api/logs?${query.toString()}`;
    try {
      return await apiRequest<AuditLog[]>(url);
    } catch {
      return FirebaseSync.fetchAuditLogsFromFirestore();
    }
  },

  async recordClientLog(
    action: string,
    targetType: 'user' | 'driver' | 'customer' | 'dispatch' | 'auth' | 'permission' | 'system',
    details: string,
    targetId?: string,
    targetName?: string
  ): Promise<void> {
    const user = getStoredUser();
    const logItem: AuditLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      action,
      targetType,
      targetId,
      targetName,
      details,
      userId: user?.id || 'usr_unknown',
      userName: user?.name || 'Naməlum',
      userRole: user?.role || 'user',
      timestamp: new Date().toISOString(),
    };
    FirebaseSync.saveAuditLog(logItem).catch(() => {});

    try {
      await apiRequest('/api/logs', {
        method: 'POST',
        body: JSON.stringify({ action, targetType, details, targetId, targetName }),
      });
    } catch {
      // Non-blocking log
    }
  },

  // --- Admin User & Permissions ---
  async getAdminUsers(): Promise<User[]> {
    try {
      const fbUsers = await FirebaseSync.fetchUsersFromFirestore();
      const fbMap = new Map<string, User>();
      for (const u of fbUsers) {
        if (u && u.id) fbMap.set(u.id, u);
      }

      let list = await apiRequest<User[]>('/api/admin/users').catch(() => []);
      if (!list || list.length === 0) {
        return fbUsers;
      }

      // Merge online presence & Firestore data
      const mergedList = list.map((u) => {
        const fbUser = fbMap.get(u.id);
        return {
          ...u,
          isOnline: fbUser?.isOnline !== undefined ? fbUser.isOnline : u.isOnline,
          lastActiveAt: fbUser?.lastActiveAt || u.lastActiveAt,
        };
      });

      return mergedList;
    } catch (err) {
      const fbUsers = await FirebaseSync.fetchUsersFromFirestore();
      if (fbUsers && fbUsers.length > 0) {
        return fbUsers;
      }
      throw err;
    }
  },

  async createAdminUser(user: {
    name: string;
    phone: string;
    email: string;
    password: string;
    role?: 'admin' | 'user';
    permissions?: UserPermissions;
  }): Promise<User> {
    const res = await apiRequest<User>('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(user),
    });
    // Save to Firebase Firestore
    await FirebaseSync.saveUser({ ...res, passwordHash: user.password } as any).catch(console.warn);
    return res;
  },

  async toggleUserStatus(id: string, status: 'active' | 'inactive'): Promise<{ success: boolean; id: string; status: string }> {
    return apiRequest(`/api/admin/users/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  async updateUserPermissions(id: string, permissions: Partial<UserPermissions>): Promise<{ success: boolean; user: User }> {
    return apiRequest<{ success: boolean; user: User }>(`/api/admin/users/${id}/permissions`, {
      method: 'PUT',
      body: JSON.stringify({ permissions }),
    });
  },

  async resetUserPassword(id: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    return apiRequest<{ success: boolean; message: string }>(`/api/admin/users/${id}/password`, {
      method: 'PUT',
      body: JSON.stringify({ newPassword }),
    });
  },

  async deleteAdminUser(id: string): Promise<{ success: boolean; message: string }> {
    return apiRequest<{ success: boolean; message: string }>(`/api/admin/users/${id}`, {
      method: 'DELETE',
    });
  },

  async updateAdminUser(
    id: string,
    data: {
      name?: string;
      newId?: string;
      status?: 'active' | 'inactive';
      password?: string;
      permissions?: UserPermissions;
    }
  ): Promise<{ success: boolean; user: User }> {
    return apiRequest<{ success: boolean; user: User }>(`/api/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteAuditLogs(options: { all?: boolean; ids?: string[] }): Promise<{ success: boolean; message: string }> {
    return apiRequest<{ success: boolean; message: string }>('/api/admin/audit-logs', {
      method: 'DELETE',
      body: JSON.stringify(options),
    });
  },

  async getAdminStats(): Promise<{
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
    }>;
  }> {
    return apiRequest('/api/admin/stats');
  },

  // --- Backup & Restore (Centralized in Firebase Firestore) ---
  async getBackup(): Promise<{
    app: string;
    version: string;
    backupDate: string;
    user: { id: string; name: string };
    totalCustomers: number;
    customers: any[];
  }> {
    const user = getStoredUser();
    const allCustomers = await FirebaseSync.fetchCustomersFromFirestore();
    const backupData = {
      id: `backup_${Date.now()}`,
      app: 'MusteriGPS',
      version: '2.0.0',
      backupDate: new Date().toISOString(),
      user: { id: user?.id || 'usr_admin', name: user?.name || 'Sistem Admini' },
      totalCustomers: allCustomers.length,
      customers: allCustomers,
    };
    await FirebaseSync.saveBackup(backupData).catch(console.warn);
    return backupData;
  },

  async restoreBackup(customers: any[]): Promise<{ success: boolean; count: number; message: string }> {
    if (!Array.isArray(customers) || customers.length === 0) {
      throw new Error('Bərpa etmək üçün müştəri siyahısı tapılmadı.');
    }
    // Write directly to Firebase Firestore
    await FirebaseSync.saveAllCustomers(customers);

    apiRequest('/api/backup/restore', {
      method: 'POST',
      body: JSON.stringify({ customers }),
    }).catch(() => {});

    return {
      success: true,
      count: customers.length,
      message: `${customers.length} müştəri Firebase Firestore bulud bazasına uğurla bərpa edildi.`,
    };
  },

  async getBackupInfo(): Promise<{ lastBackupAt: string | null }> {
    try {
      const backups = await FirebaseSync.fetchBackupsFromFirestore();
      if (backups && backups.length > 0) {
        return { lastBackupAt: backups[0].createdAt || backups[0].backupDate || null };
      }
    } catch {}
    return apiRequest('/api/backup/info');
  },

  // --- Driver Specific ---
  async getDriverUsers(): Promise<DriverUserInfo[]> {
    return apiRequest<DriverUserInfo[]>('/api/driver/users');
  },

  async logDriverCustomerView(customerId: string): Promise<{ success: boolean }> {
    return apiRequest<{ success: boolean }>('/api/driver/log-view', {
      method: 'POST',
      body: JSON.stringify({ customerId }),
    });
  },

  // --- Orders & Live Tracking API ---
  async getOrders(): Promise<Order[]> {
    const user = getStoredUser();
    try {
      const orders = await FirebaseSync.fetchOrdersFromFirestore(user);
      return orders;
    } catch {
      return [];
    }
  },

  async createOrder(orderData: {
    customerId?: string;
    customerName: string;
    phone: string;
    address: string;
    location: { lat: number; lng: number; addressText?: string };
    note?: string;
  }): Promise<Order> {
    const user = getStoredUser();
    const now = new Date().toISOString();
    const orderNumber = `SF-${Math.floor(100000 + Math.random() * 900000)}`;
    const newOrder: Order = {
      id: `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      orderNumber,
      customerId: orderData.customerId,
      customerName: orderData.customerName,
      phone: orderData.phone,
      address: orderData.address,
      location: orderData.location,
      note: orderData.note || '',
      createdByUserId: user?.id || 'usr_guest',
      createdByUserName: user?.name || 'İstifadəçi',
      createdByUserPhone: user?.phone || '',
      createdAt: now,
      updatedAt: now,
      status: 'open',
      history: [
        {
          id: `hist_${Date.now()}`,
          action: 'created',
          actionText: `${user?.name || 'İstifadəçi'} sifariş yaratdı`,
          timestamp: now,
        },
      ],
      routePoints: [],
    };

    await FirebaseSync.saveOrder(newOrder);

    // Audit log
    await this.logAudit({
      action: 'Yeni sifariş yaratdı',
      targetType: 'order',
      targetId: newOrder.id,
      targetName: `${newOrder.orderNumber} (${newOrder.customerName})`,
      details: `${newOrder.customerName} üçün ${newOrder.address} ünvanına yeni sifariş açıldı.`,
    });

    return newOrder;
  },

  async claimOrder(
    orderId: string,
    driver: { id: string; name: string; phone?: string; location?: { lat: number; lng: number } }
  ): Promise<{ success: boolean; error?: string; order?: Order }> {
    const result = await FirebaseSync.claimOrder(orderId, driver);
    if (result.success) {
      await this.logAudit({
        action: 'Sifarişi götürdü ("Mən apararam")',
        targetType: 'order',
        targetId: orderId,
        details: `${driver.name} sifarişi təhvil aldı və çatdırmaq üçün götürdü.`,
      });
    }
    return result;
  },

  async rejectOrder(
    orderId: string,
    driver: { id: string; name: string; phone?: string },
    reason?: string
  ): Promise<{ success: boolean; error?: string; order?: Order }> {
    const result = await FirebaseSync.rejectOrder(orderId, driver, reason);
    if (result.success) {
      await this.logAudit({
        action: 'Sifarişdən imtina etdi',
        targetType: 'order',
        targetId: orderId,
        details: `${driver.name} sifarişdən imtina etdi. Sifariş yenidən bütün sürücülər üçün açıldı.`,
      });
    }
    return result;
  },

  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    driver?: { id: string; name: string; phone?: string },
    note?: string
  ): Promise<void> {
    await FirebaseSync.updateOrderStatus(orderId, status, driver, note);
    await this.logAudit({
      action: `Sifariş statusu yeniləndi: ${status}`,
      targetType: 'order',
      targetId: orderId,
      details: `${driver?.name || 'Sürücü'} sifarişin statusunu "${status}" olaraq dəyişdi.`,
    });
  },

  async updateOrderDriverLocation(
    orderId: string,
    lat: number,
    lng: number,
    speed?: number
  ): Promise<void> {
    await FirebaseSync.updateOrderDriverLocation(orderId, lat, lng, speed);
  },

  async dismissOrder(orderId: string, driverId: string): Promise<{ success: boolean; error?: string }> {
    return await FirebaseSync.dismissOrderForDriver(orderId, driverId);
  },

  async reportDeliveryIssue(
    orderId: string,
    driver: { id: string; name: string; phone?: string },
    reason: string
  ): Promise<{ success: boolean; error?: string; order?: Order }> {
    const res = await FirebaseSync.reportDeliveryIssue(orderId, driver, reason);
    if (res.success) {
      await this.logAudit({
        action: 'Müştəri yerində yoxdur bildirişi',
        targetType: 'order',
        targetId: orderId,
        details: `${driver.name} bildirdi ki, müştəri yerində yoxdur: ${reason}`,
      });
    }
    return res;
  },
};
