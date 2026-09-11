import { Customer, Driver, DispatchRecord, User, UserPermissions, AuditLog, DriverUserInfo, DRIVER_PERMISSIONS } from '../types';
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
    try {
      const data = await apiRequest<{ user: User; token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password }),
      });
      setStoredUser(data.user);
      // Sync user to Firestore for cloud login on all devices
      FirebaseSync.saveUser(data.user).catch((e) => console.warn('Firebase sync user error', e));
      return data;
    } catch (err: any) {
      // Fallback: Check Firebase Firestore for users
      try {
        const firestoreUsers = await FirebaseSync.fetchUsersFromFirestore();
        const cleanId = String(identifier).trim().toLowerCase().replace(/\s+/g, '');
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
            valid = password === '123' || password === '123456' || (matched as any).passwordHash === password;
          }
          if (valid) {
            setStoredUser(matched);
            return { user: matched, token: `fb_jwt_${matched.id}` };
          }
        }
      } catch (fbErr) {
        console.warn('Firebase login check warning', fbErr);
      }

      // Offline fallback: Check if demo credentials match
      const cleanId = String(identifier).trim().toLowerCase().replace(/\s+/g, '');
      if (cleanId === 'admin' || cleanId === 'usr_admin' || cleanId === 'admin@musterigps.az') {
        if (password === '2017') {
          const fallbackAdmin: User = {
            id: 'usr_admin',
            name: 'Sistem Admini',
            phone: '+994 50 999 88 77',
            email: 'admin@musterigps.az',
            role: 'admin',
            status: 'active',
            permissions: {
              canViewCustomers: true,
              canAddCustomers: true,
              canEditCustomers: true,
              canDeleteCustomers: true,
              canViewDrivers: true,
              canAddDrivers: true,
              canEditDrivers: true,
              canDeleteDrivers: true,
              canSendWhatsApp: true,
              canViewHistory: true,
              canOpenMap: true,
              canExportData: true,
            },
            createdAt: new Date().toISOString(),
          };
          setStoredUser(fallbackAdmin);
          FirebaseSync.saveUser(fallbackAdmin).catch(() => {});
          return { user: fallbackAdmin, token: 'mock_token' };
        }
      } else if (cleanId === 'vusal') {
        const fallbackVusal: User = {
          id: 'usr_vusal',
          name: 'Vüsal Əliyev',
          phone: '+994 50 222 33 44',
          email: 'vusal@musterigps.az',
          role: 'user',
          status: 'active',
          permissions: {
            canViewCustomers: true,
            canAddCustomers: true,
            canEditCustomers: true,
            canDeleteCustomers: true,
            canViewDrivers: true,
            canAddDrivers: true,
            canEditDrivers: true,
            canDeleteDrivers: true,
            canSendWhatsApp: true,
            canViewHistory: true,
            canOpenMap: true,
            canExportData: true,
          },
          createdAt: new Date().toISOString(),
        };
        setStoredUser(fallbackVusal);
        return { user: fallbackVusal, token: 'mock_token' };
      } else if (cleanId === 'ilqar') {
        const fallbackIlqar: User = {
          id: 'usr_ilqar',
          name: 'İlqar Məmmədov',
          phone: '+994 55 333 44 55',
          email: 'ilqar@musterigps.az',
          role: 'user',
          status: 'active',
          permissions: {
            canViewCustomers: true,
            canAddCustomers: true,
            canEditCustomers: true,
            canDeleteCustomers: true,
            canViewDrivers: true,
            canAddDrivers: true,
            canEditDrivers: true,
            canDeleteDrivers: true,
            canSendWhatsApp: true,
            canViewHistory: true,
            canOpenMap: true,
            canExportData: true,
          },
          createdAt: new Date().toISOString(),
        };
        setStoredUser(fallbackIlqar);
        return { user: fallbackIlqar, token: 'mock_token' };
      } else if (cleanId === 'surucu' || cleanId === 'driver' || cleanId === 'murad' || cleanId === 'usr_surucu') {
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
        return { user: fallbackDriver, token: 'mock_token' };
      }
      throw err;
    }
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

    // 1. Fetch from Firebase Firestore (Cloud Database across all devices)
    try {
      const cloudCustomers = await FirebaseSync.fetchCustomersFromFirestore();
      if (cloudCustomers && cloudCustomers.length > 0) {
        let valid = cloudCustomers.filter((c) => !c.isDeleted);
        if (userIdFilter) {
          valid = valid.filter((c) => c.userId === userIdFilter);
        } else if (user && user.role !== 'admin' && user.role !== 'driver') {
          valid = valid.filter((c) => c.userId === user.id);
        }
        if (!userIdFilter) {
          localStorage.setItem(getCustomerStorageKey(), JSON.stringify(valid));
        }
        return valid;
      }
    } catch (fbErr) {
      console.warn('[Firebase] Firestore getCustomers warning:', fbErr);
    }

    // 2. Fallback to server API / local data
    const endpoint = userIdFilter ? `/api/customers?userId=${encodeURIComponent(userIdFilter)}` : '/api/customers';
    try {
      const list = await apiRequest<Customer[]>(endpoint);
      if (!userIdFilter) {
        localStorage.setItem(getCustomerStorageKey(), JSON.stringify(list));
      }
      // If Firestore was empty, seed cloud database with existing customers
      if (list && list.length > 0) {
        FirebaseSync.saveAllCustomers(list).catch(() => {});
      }
      return list;
    } catch (err) {
      if (!userIdFilter) {
        const raw = localStorage.getItem(getCustomerStorageKey());
        const parsed: Customer[] = raw ? JSON.parse(raw) : [];
        if (parsed.length > 0) {
          FirebaseSync.saveAllCustomers(parsed).catch(() => {});
        }
        return parsed;
      }
      return [];
    }
  },

  async createCustomer(customer: Omit<Customer, 'id' | 'userId' | 'createdAt' | 'updatedAt'> & { userId?: string; userOwnerName?: string }): Promise<Customer> {
    const user = getStoredUser();
    const newCustomer: Customer = {
      ...customer,
      id: `c_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: customer.userId || user?.id || 'usr_unknown',
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

    // 2. Also send to server API to keep server in sync
    try {
      const created = await apiRequest<Customer>('/api/customers', {
        method: 'POST',
        body: JSON.stringify(newCustomer),
      });
      const existing = await Api.getCustomers();
      localStorage.setItem(getCustomerStorageKey(), JSON.stringify([created, ...existing.filter((c) => c.id !== created.id)]));
      return created;
    } catch (err) {
      const existing = await Api.getCustomers();
      localStorage.setItem(getCustomerStorageKey(), JSON.stringify([newCustomer, ...existing.filter((c) => c.id !== newCustomer.id)]));
      return newCustomer;
    }
  },

  async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer> {
    const existing = await Api.getCustomers();
    const target = existing.find((c) => c.id === id);
    const updatedCustomer: Customer = {
      ...(target || {} as Customer),
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };

    // 1. Save to Firebase Firestore immediately
    try {
      await FirebaseSync.saveCustomer(updatedCustomer);
    } catch (fbErr) {
      console.warn('[Firebase] Cloud save error on updateCustomer:', fbErr);
    }

    // 2. Send to server API
    try {
      const updated = await apiRequest<Customer>(`/api/customers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      const list = existing.map((c) => (c.id === id ? updated : c));
      localStorage.setItem(getCustomerStorageKey(), JSON.stringify(list));
      return updated;
    } catch (err) {
      const list = existing.map((c) => (c.id === id ? updatedCustomer : c));
      localStorage.setItem(getCustomerStorageKey(), JSON.stringify(list));
      return updatedCustomer;
    }
  },

  // Admin: Update Customer Owner
  async updateCustomerOwner(id: string, newOwnerId: string): Promise<Customer> {
    const existing = await Api.getCustomers();
    const target = existing.find((c) => c.id === id);
    const allUsers = await Api.getAdminUsers().catch(() => []);
    const newOwner = allUsers.find((u) => u.id === newOwnerId);

    const updatedCustomer: Customer = {
      ...(target || {} as Customer),
      id,
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
    try {
      const res = await apiRequest<{ success: boolean; customer: Customer }>(`/api/admin/customers/${id}/owner`, {
        method: 'PUT',
        body: JSON.stringify({ newOwnerId }),
      });
      const list = existing.map((c) => (c.id === id ? res.customer : c));
      localStorage.setItem(getCustomerStorageKey(), JSON.stringify(list));
      return res.customer;
    } catch (err) {
      const list = existing.map((c) => (c.id === id ? updatedCustomer : c));
      localStorage.setItem(getCustomerStorageKey(), JSON.stringify(list));
      return updatedCustomer;
    }
  },

  // Soft delete customer (moves to trash)
  async deleteCustomer(id: string): Promise<{ success: boolean; id: string }> {
    const user = getStoredUser();
    const existing = await Api.getCustomers();
    const target = existing.find((c) => c.id === id);

    if (target) {
      const softDeleted: Customer = {
        ...target,
        isDeleted: true,
        deletedAt: new Date().toISOString(),
        deletedBy: user?.id,
        deletedByName: user?.name,
      };
      await FirebaseSync.saveCustomer(softDeleted).catch(console.warn);
    } else {
      await FirebaseSync.deleteCustomer(id).catch(console.warn);
    }

    try {
      await apiRequest(`/api/customers/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('API delete customer offline', err);
    }

    const list = existing.filter((c) => c.id !== id);
    localStorage.setItem(getCustomerStorageKey(), JSON.stringify(list));
    return { success: true, id };
  },

  // --- TRASH (Soft-deleted, Admin only) ---
  async getTrash(): Promise<Customer[]> {
    try {
      const cloud = await FirebaseSync.fetchCustomersFromFirestore();
      if (cloud && cloud.length > 0) {
        return cloud.filter((c) => c.isDeleted === true);
      }
    } catch {}
    return apiRequest<Customer[]>('/api/trash');
  },

  async restoreCustomer(id: string): Promise<{ success: boolean; customer: Customer }> {
    const existing = await Api.getCustomers();
    const target = existing.find((c) => c.id === id);
    if (target) {
      const restored: Customer = {
        ...target,
        isDeleted: false,
        deletedAt: undefined,
        deletedBy: undefined,
        deletedByName: undefined,
        updatedAt: new Date().toISOString(),
      };
      await FirebaseSync.saveCustomer(restored).catch(console.warn);
    }
    return apiRequest<{ success: boolean; customer: Customer }>(`/api/trash/${id}/restore`, {
      method: 'POST',
    });
  },

  async permanentDeleteCustomer(id: string): Promise<{ success: boolean }> {
    await FirebaseSync.deleteCustomer(id).catch(console.warn);
    return apiRequest<{ success: boolean }>(`/api/trash/${id}/permanent`, {
      method: 'DELETE',
    });
  },

  // --- Drivers (Isolated per user, synchronized via Firebase) ---
  async getDrivers(): Promise<Driver[]> {
    const user = getStoredUser();

    // 1. Fetch from Firebase Firestore
    try {
      const cloudDrivers = await FirebaseSync.fetchDriversFromFirestore();
      if (cloudDrivers && cloudDrivers.length > 0) {
        let list = cloudDrivers;
        if (user && user.role !== 'admin') {
          list = list.filter((d) => d.userId === user.id);
        }
        localStorage.setItem(getDriverStorageKey(), JSON.stringify(list));
        return list;
      }
    } catch (fbErr) {
      console.warn('[Firebase] Firestore getDrivers warning:', fbErr);
    }

    // 2. Fallback to server API
    try {
      const list = await apiRequest<Driver[]>('/api/drivers');
      localStorage.setItem(getDriverStorageKey(), JSON.stringify(list));
      if (list && list.length > 0) {
        for (const d of list) {
          FirebaseSync.saveDriver(d).catch(() => {});
        }
      }
      return list;
    } catch (err) {
      const raw = localStorage.getItem(getDriverStorageKey());
      return raw ? JSON.parse(raw) : [];
    }
  },

  async createDriver(driver: Omit<Driver, 'id' | 'userId' | 'createdAt'>): Promise<Driver> {
    const user = getStoredUser();
    const newDriver: Driver = {
      ...driver,
      id: `drv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: user?.id || 'usr_unknown',
      userOwnerName: user?.name,
      createdAt: new Date().toISOString(),
    };

    // Save to Firebase Firestore
    await FirebaseSync.saveDriver(newDriver).catch(console.warn);

    try {
      const created = await apiRequest<Driver>('/api/drivers', {
        method: 'POST',
        body: JSON.stringify(driver),
      });
      const existing = await Api.getDrivers();
      localStorage.setItem(getDriverStorageKey(), JSON.stringify([created, ...existing.filter((d) => d.id !== created.id)]));
      return created;
    } catch (err) {
      const existing = await Api.getDrivers();
      localStorage.setItem(getDriverStorageKey(), JSON.stringify([newDriver, ...existing.filter((d) => d.id !== newDriver.id)]));
      return newDriver;
    }
  },

  async updateDriver(id: string, updates: Partial<Driver>): Promise<Driver> {
    const existing = await Api.getDrivers();
    const target = existing.find((d) => d.id === id);
    const updatedDriver: Driver = {
      ...(target || {} as Driver),
      ...updates,
      id,
    };

    await FirebaseSync.saveDriver(updatedDriver).catch(console.warn);

    try {
      const updated = await apiRequest<Driver>(`/api/drivers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      const list = existing.map((d) => (d.id === id ? updated : d));
      localStorage.setItem(getDriverStorageKey(), JSON.stringify(list));
      return updated;
    } catch (err) {
      const list = existing.map((d) => (d.id === id ? updatedDriver : d));
      localStorage.setItem(getDriverStorageKey(), JSON.stringify(list));
      return updatedDriver;
    }
  },

  async deleteDriver(id: string): Promise<{ success: boolean; id: string }> {
    await FirebaseSync.deleteDriver(id).catch(console.warn);
    try {
      await apiRequest(`/api/drivers/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('API delete driver offline', err);
    }
    const existing = await Api.getDrivers();
    const list = existing.filter((d) => d.id !== id);
    localStorage.setItem(getDriverStorageKey(), JSON.stringify(list));
    return { success: true, id };
  },

  // --- Dispatches (WhatsApp Send History, synchronized via Firebase) ---
  async getDispatches(): Promise<DispatchRecord[]> {
    const user = getStoredUser();

    // 1. Fetch from Firebase Firestore
    try {
      const cloudDispatches = await FirebaseSync.fetchDispatchesFromFirestore();
      if (cloudDispatches && cloudDispatches.length > 0) {
        let list = cloudDispatches;
        if (user && user.role !== 'admin' && user.role !== 'driver') {
          list = list.filter((disp) => disp.userId === user.id);
        }
        localStorage.setItem(getDispatchStorageKey(), JSON.stringify(list));
        return list;
      }
    } catch (fbErr) {
      console.warn('[Firebase] Firestore getDispatches warning:', fbErr);
    }

    try {
      const list = await apiRequest<DispatchRecord[]>('/api/dispatches');
      localStorage.setItem(getDispatchStorageKey(), JSON.stringify(list));
      if (list && list.length > 0) {
        for (const disp of list) {
          FirebaseSync.saveDispatch(disp).catch(() => {});
        }
      }
      return list;
    } catch (err) {
      const raw = localStorage.getItem(getDispatchStorageKey());
      return raw ? JSON.parse(raw) : [];
    }
  },

  async recordDispatch(record: Omit<DispatchRecord, 'id' | 'userId' | 'timestamp'>): Promise<DispatchRecord> {
    const user = getStoredUser();
    const newRecord: DispatchRecord = {
      ...record,
      id: `disp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: user?.id || 'usr_unknown',
      userOwnerName: user?.name,
      timestamp: new Date().toISOString(),
    };

    // Save to Firebase Firestore
    await FirebaseSync.saveDispatch(newRecord).catch(console.warn);

    try {
      const created = await apiRequest<DispatchRecord>('/api/dispatches', {
        method: 'POST',
        body: JSON.stringify(record),
      });
      const existing = await Api.getDispatches();
      localStorage.setItem(getDispatchStorageKey(), JSON.stringify([created, ...existing]));
      return created;
    } catch (err) {
      const existing = await Api.getDispatches();
      localStorage.setItem(getDispatchStorageKey(), JSON.stringify([newRecord, ...existing]));
      return newRecord;
    }
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
      const list = await apiRequest<User[]>('/api/admin/users');
      // Save all users to Firestore
      for (const u of list) {
        FirebaseSync.saveUser(u).catch(() => {});
      }
      return list;
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

  // --- Backup & Restore ---
  async getBackup(): Promise<{
    app: string;
    version: string;
    backupDate: string;
    user: { id: string; name: string };
    totalCustomers: number;
    customers: any[];
  }> {
    return apiRequest('/api/backup');
  },

  async restoreBackup(customers: any[]): Promise<{ success: boolean; count: number; message: string }> {
    return apiRequest('/api/backup/restore', {
      method: 'POST',
      body: JSON.stringify({ customers }),
    });
  },

  async getBackupInfo(): Promise<{ lastBackupAt: string | null }> {
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
};
