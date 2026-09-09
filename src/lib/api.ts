import { Customer, Driver, DispatchRecord, User, UserPermissions, AuditLog, DriverUserInfo, DRIVER_PERMISSIONS } from '../types';

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
      return data;
    } catch (err: any) {
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

  // --- Customers (Isolated per user) ---
  async getCustomers(userIdFilter?: string): Promise<Customer[]> {
    const endpoint = userIdFilter ? `/api/customers?userId=${encodeURIComponent(userIdFilter)}` : '/api/customers';
    try {
      const list = await apiRequest<Customer[]>(endpoint);
      if (!userIdFilter) {
        localStorage.setItem(getCustomerStorageKey(), JSON.stringify(list));
      }
      return list;
    } catch (err) {
      if (!userIdFilter) {
        const raw = localStorage.getItem(getCustomerStorageKey());
        return raw ? JSON.parse(raw) : [];
      }
      return [];
    }
  },

  async createCustomer(customer: Omit<Customer, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Customer> {
    const user = getStoredUser();
    const newCustomer: Customer = {
      ...customer,
      id: `c_${Date.now()}`,
      userId: user?.id || 'usr_unknown',
      userOwnerName: user?.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const created = await apiRequest<Customer>('/api/customers', {
        method: 'POST',
        body: JSON.stringify(customer),
      });
      const existing = await Api.getCustomers();
      localStorage.setItem(getCustomerStorageKey(), JSON.stringify([created, ...existing.filter((c) => c.id !== created.id)]));
      return created;
    } catch (err) {
      const existing = await Api.getCustomers();
      localStorage.setItem(getCustomerStorageKey(), JSON.stringify([newCustomer, ...existing]));
      return newCustomer;
    }
  },

  async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer> {
    try {
      const updated = await apiRequest<Customer>(`/api/customers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      const existing = await Api.getCustomers();
      const list = existing.map((c) => (c.id === id ? updated : c));
      localStorage.setItem(getCustomerStorageKey(), JSON.stringify(list));
      return updated;
    } catch (err) {
      const existing = await Api.getCustomers();
      const list = existing.map((c) => (c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c));
      localStorage.setItem(getCustomerStorageKey(), JSON.stringify(list));
      return list.find((c) => c.id === id)!;
    }
  },

  // Soft delete customer (moves to trash)
  async deleteCustomer(id: string): Promise<{ success: boolean; id: string }> {
    try {
      await apiRequest(`/api/customers/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('API delete customer offline', err);
    }
    const existing = await Api.getCustomers();
    const list = existing.filter((c) => c.id !== id);
    localStorage.setItem(getCustomerStorageKey(), JSON.stringify(list));
    return { success: true, id };
  },

  // --- TRASH (Soft-deleted, Admin only) ---
  async getTrash(): Promise<Customer[]> {
    return apiRequest<Customer[]>('/api/trash');
  },

  async restoreCustomer(id: string): Promise<{ success: boolean; customer: Customer }> {
    return apiRequest<{ success: boolean; customer: Customer }>(`/api/trash/${id}/restore`, {
      method: 'POST',
    });
  },

  async permanentDeleteCustomer(id: string): Promise<{ success: boolean }> {
    return apiRequest<{ success: boolean }>(`/api/trash/${id}/permanent`, {
      method: 'DELETE',
    });
  },

  // --- Drivers (Isolated per user) ---
  async getDrivers(): Promise<Driver[]> {
    try {
      const list = await apiRequest<Driver[]>('/api/drivers');
      localStorage.setItem(getDriverStorageKey(), JSON.stringify(list));
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
      id: `drv_${Date.now()}`,
      userId: user?.id || 'usr_unknown',
      userOwnerName: user?.name,
      createdAt: new Date().toISOString(),
    };

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
      localStorage.setItem(getDriverStorageKey(), JSON.stringify([newDriver, ...existing]));
      return newDriver;
    }
  },

  async updateDriver(id: string, updates: Partial<Driver>): Promise<Driver> {
    try {
      const updated = await apiRequest<Driver>(`/api/drivers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      const existing = await Api.getDrivers();
      const list = existing.map((d) => (d.id === id ? updated : d));
      localStorage.setItem(getDriverStorageKey(), JSON.stringify(list));
      return updated;
    } catch (err) {
      const existing = await Api.getDrivers();
      const list = existing.map((d) => (d.id === id ? { ...d, ...updates } : d));
      localStorage.setItem(getDriverStorageKey(), JSON.stringify(list));
      return list.find((d) => d.id === id)!;
    }
  },

  async deleteDriver(id: string): Promise<{ success: boolean; id: string }> {
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

  // --- Dispatches (WhatsApp Send History) ---
  async getDispatches(): Promise<DispatchRecord[]> {
    try {
      const list = await apiRequest<DispatchRecord[]>('/api/dispatches');
      localStorage.setItem(getDispatchStorageKey(), JSON.stringify(list));
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
      id: `disp_${Date.now()}`,
      userId: user?.id || 'usr_unknown',
      userOwnerName: user?.name,
      timestamp: new Date().toISOString(),
    };

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
    return apiRequest<AuditLog[]>(url);
  },

  async recordClientLog(action: string, targetType: string, details: string, targetId?: string, targetName?: string): Promise<void> {
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
    return apiRequest<User[]>('/api/admin/users');
  },

  async createAdminUser(user: {
    name: string;
    phone: string;
    email: string;
    password: string;
    role?: 'admin' | 'user';
    permissions?: UserPermissions;
  }): Promise<User> {
    return apiRequest<User>('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(user),
    });
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
