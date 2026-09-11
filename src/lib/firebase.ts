import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  collection,
  setDoc,
  getDocs,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Customer, Driver, DispatchRecord, User, AuditLog } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

// Initialize Firebase App singleton
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// CRITICAL: Must specify firestoreDatabaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Connection test on initial boot
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('Firebase Firestore bağlantısı uğurludur.');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase bağlantısı offline rejimdədir.');
    } else {
      console.warn('Firebase test connection:', error);
    }
    return false;
  }
}

// Initial test connection immediately
testFirestoreConnection();

// Sanitize objects for Firestore by removing undefined values
export function sanitizeForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        clean[key] = sanitizeForFirestore(value);
      } else {
        clean[key] = value;
      }
    }
  }
  return clean;
}

// --- Deduplication & Validation Helper ---
export function deduplicateById<T extends { id: string }>(items: T[]): T[] {
  if (!Array.isArray(items)) return [];
  const map = new Map<string, T>();
  for (const item of items) {
    if (item && item.id) {
      map.set(item.id, item);
    }
  }
  return Array.from(map.values());
}

// --- Firestore Cloud Persistence & Realtime Sync Helpers ---

export const FirebaseSync = {
  // Sync a single customer to Firestore (guaranteeing ownerId & userId)
  async saveCustomer(customer: Customer): Promise<void> {
    const path = `customers/${customer.id}`;
    const ownerId = customer.ownerId || customer.userId || 'usr_unknown';
    const userId = customer.userId || customer.ownerId || 'usr_unknown';
    try {
      const sanitized = sanitizeForFirestore({
        ...customer,
        ownerId,
        userId,
        _syncedAt: new Date().toISOString(),
      });
      await setDoc(doc(db, 'customers', customer.id), sanitized, { merge: true });
      console.log(`[Firebase] Müştəri buluda yazıldı: ${customer.name} (owner: ${ownerId})`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      throw error;
    }
  },

  // Batch sync customers
  async saveAllCustomers(customers: Customer[]): Promise<void> {
    for (const c of customers) {
      try {
        await this.saveCustomer(c);
      } catch (err) {
        console.warn(`[Firebase] Batch müştəri xətası: ${c.id}`, err);
      }
    }
  },

  // Delete customer from Firestore
  async deleteCustomer(customerId: string): Promise<void> {
    const path = `customers/${customerId}`;
    try {
      await deleteDoc(doc(db, 'customers', customerId));
      console.log(`[Firebase] Müştəri buluddan silindi: ${customerId}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Pull customers from Firestore with account isolation
  async fetchCustomersFromFirestore(user?: User | null): Promise<Customer[]> {
    try {
      const snap = await getDocs(collection(db, 'customers'));
      const map = new Map<string, Customer>();
      snap.forEach((d) => {
        const data = d.data() as Customer;
        const id = data?.id || d.id;
        if (id) {
          // Normalize ownerId and userId
          const ownerId = data.ownerId || data.userId;
          const userId = data.userId || data.ownerId;
          map.set(id, { ...data, id, ownerId, userId });
        }
      });
      let filtered = Array.from(map.values()).filter((c) => !c.isDeleted);
      if (user && user.role !== 'admin' && user.role !== 'driver') {
        filtered = filtered.filter((c) => c.ownerId === user.id || c.userId === user.id);
      }
      // Sort newest first
      filtered.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      return filtered;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'customers');
      return [];
    }
  },

  // Real-time listener for customers with account-based live sync
  subscribeCustomers(
    userOrUpdate: User | null | ((customers: Customer[]) => void),
    maybeUpdate?: (customers: Customer[]) => void
  ): () => void {
    const user = typeof userOrUpdate === 'function' ? null : userOrUpdate;
    const onUpdate = typeof userOrUpdate === 'function' ? userOrUpdate : maybeUpdate || (() => {});

    try {
      return onSnapshot(
        collection(db, 'customers'),
        (snap) => {
          const map = new Map<string, Customer>();
          snap.forEach((d) => {
            const data = d.data() as Customer;
            const id = data?.id || d.id;
            if (id) {
              const ownerId = data.ownerId || data.userId;
              const userId = data.userId || data.ownerId;
              map.set(id, { ...data, id, ownerId, userId });
            }
          });
          let filtered = Array.from(map.values()).filter((c) => !c.isDeleted);
          if (user && user.role !== 'admin' && user.role !== 'driver') {
            filtered = filtered.filter((c) => c.ownerId === user.id || c.userId === user.id);
          }
          filtered.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          onUpdate(filtered);
        },
        (err) => {
          console.warn('[Firebase] Realtime müştəri dinləmə xətası:', err);
        }
      );
    } catch (err) {
      console.warn('[Firebase] Realtime müştəri abunəliyi xətası:', err);
      return () => {};
    }
  },

  // Real-time listener for Trash (soft-deleted customers)
  subscribeTrash(
    user: User | null,
    onUpdate: (trashedCustomers: Customer[]) => void
  ): () => void {
    try {
      return onSnapshot(
        collection(db, 'customers'),
        (snap) => {
          const map = new Map<string, Customer>();
          snap.forEach((d) => {
            const data = d.data() as Customer;
            const id = data?.id || d.id;
            if (id && data.isDeleted === true) {
              const ownerId = data.ownerId || data.userId;
              const userId = data.userId || data.ownerId;
              map.set(id, { ...data, id, ownerId, userId });
            }
          });
          let filtered = Array.from(map.values());
          if (user && user.role !== 'admin') {
            filtered = filtered.filter((c) => c.ownerId === user.id || c.userId === user.id);
          }
          filtered.sort(
            (a, b) =>
              new Date(b.deletedAt || b.updatedAt || 0).getTime() -
              new Date(a.deletedAt || a.updatedAt || 0).getTime()
          );
          onUpdate(filtered);
        },
        (err) => console.warn('[Firebase] Realtime trash listener error:', err)
      );
    } catch {
      return () => {};
    }
  },

  // Sync drivers
  async saveDriver(driver: Driver): Promise<void> {
    const path = `drivers/${driver.id}`;
    const ownerId = driver.ownerId || driver.userId || 'usr_unknown';
    const userId = driver.userId || driver.ownerId || 'usr_unknown';
    try {
      const sanitized = sanitizeForFirestore({
        ...driver,
        ownerId,
        userId,
        _syncedAt: new Date().toISOString(),
      });
      await setDoc(doc(db, 'drivers', driver.id), sanitized, { merge: true });
      console.log(`[Firebase] Sürücü buluda yazıldı: ${driver.name}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async deleteDriver(driverId: string): Promise<void> {
    const path = `drivers/${driverId}`;
    try {
      await deleteDoc(doc(db, 'drivers', driverId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async fetchDriversFromFirestore(user?: User | null): Promise<Driver[]> {
    try {
      const snap = await getDocs(collection(db, 'drivers'));
      const map = new Map<string, Driver>();
      snap.forEach((d) => {
        const data = d.data() as Driver;
        const id = data?.id || d.id;
        if (id) {
          const ownerId = data.ownerId || data.userId;
          const userId = data.userId || data.ownerId;
          map.set(id, { ...data, id, ownerId, userId });
        }
      });
      let filtered = Array.from(map.values());
      if (user && user.role !== 'admin') {
        filtered = filtered.filter((d) => d.ownerId === user.id || d.userId === user.id);
      }
      filtered.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      return filtered;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'drivers');
      return [];
    }
  },

  subscribeDrivers(
    userOrUpdate: User | null | ((drivers: Driver[]) => void),
    maybeUpdate?: (drivers: Driver[]) => void
  ): () => void {
    const user = typeof userOrUpdate === 'function' ? null : userOrUpdate;
    const onUpdate = typeof userOrUpdate === 'function' ? userOrUpdate : maybeUpdate || (() => {});

    try {
      return onSnapshot(
        collection(db, 'drivers'),
        (snap) => {
          const map = new Map<string, Driver>();
          snap.forEach((d) => {
            const data = d.data() as Driver;
            const id = data?.id || d.id;
            if (id) {
              const ownerId = data.ownerId || data.userId;
              const userId = data.userId || data.ownerId;
              map.set(id, { ...data, id, ownerId, userId });
            }
          });
          let filtered = Array.from(map.values());
          if (user && user.role !== 'admin') {
            filtered = filtered.filter((d) => d.ownerId === user.id || d.userId === user.id);
          }
          filtered.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          onUpdate(filtered);
        },
        (err) => console.warn('[Firebase] Sürücü dinləmə xətası', err)
      );
    } catch {
      return () => {};
    }
  },

  // Sync dispatch record
  async saveDispatch(dispatch: DispatchRecord): Promise<void> {
    const path = `dispatches/${dispatch.id}`;
    const ownerId = dispatch.ownerId || dispatch.userId || 'usr_unknown';
    const userId = dispatch.userId || dispatch.ownerId || 'usr_unknown';
    try {
      const sanitized = sanitizeForFirestore({
        ...dispatch,
        ownerId,
        userId,
        _syncedAt: new Date().toISOString(),
      });
      await setDoc(doc(db, 'dispatches', dispatch.id), sanitized, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async fetchDispatchesFromFirestore(user?: User | null): Promise<DispatchRecord[]> {
    try {
      const snap = await getDocs(collection(db, 'dispatches'));
      const map = new Map<string, DispatchRecord>();
      snap.forEach((d) => {
        const data = d.data() as DispatchRecord;
        const id = data?.id || d.id;
        if (id) {
          const ownerId = data.ownerId || data.userId;
          const userId = data.userId || data.ownerId;
          map.set(id, { ...data, id, ownerId, userId });
        }
      });
      let filtered = Array.from(map.values());
      if (user && user.role !== 'admin' && user.role !== 'driver') {
        filtered = filtered.filter((disp) => disp.ownerId === user.id || disp.userId === user.id);
      }
      filtered.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
      return filtered;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'dispatches');
      return [];
    }
  },

  subscribeDispatches(
    userOrUpdate: User | null | ((dispatches: DispatchRecord[]) => void),
    maybeUpdate?: (dispatches: DispatchRecord[]) => void
  ): () => void {
    const user = typeof userOrUpdate === 'function' ? null : userOrUpdate;
    const onUpdate = typeof userOrUpdate === 'function' ? userOrUpdate : maybeUpdate || (() => {});

    try {
      return onSnapshot(
        collection(db, 'dispatches'),
        (snap) => {
          const map = new Map<string, DispatchRecord>();
          snap.forEach((d) => {
            const data = d.data() as DispatchRecord;
            const id = data?.id || d.id;
            if (id) {
              const ownerId = data.ownerId || data.userId;
              const userId = data.userId || data.ownerId;
              map.set(id, { ...data, id, ownerId, userId });
            }
          });
          let filtered = Array.from(map.values());
          if (user && user.role !== 'admin' && user.role !== 'driver') {
            filtered = filtered.filter((disp) => disp.ownerId === user.id || disp.userId === user.id);
          }
          filtered.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
          onUpdate(filtered);
        },
        (err) => console.warn('[Firebase] Göndəriş dinləmə xətası', err)
      );
    } catch {
      return () => {};
    }
  },

  // Sync users
  async saveUser(user: User & { passwordHash?: string }): Promise<void> {
    const path = `users/${user.id}`;
    try {
      const sanitized = sanitizeForFirestore({
        ...user,
        _syncedAt: new Date().toISOString(),
      });
      await setDoc(doc(db, 'users', user.id), sanitized, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async fetchUsersFromFirestore(): Promise<User[]> {
    try {
      const snap = await getDocs(collection(db, 'users'));
      const list: User[] = [];
      snap.forEach((d) => {
        const data = d.data() as User;
        if (data && data.id) list.push(data);
      });
      return list;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users');
      return [];
    }
  },

  subscribeUsers(onUpdate: (users: User[]) => void): () => void {
    try {
      return onSnapshot(
        collection(db, 'users'),
        (snap) => {
          const list: User[] = [];
          snap.forEach((d) => {
            const data = d.data() as User;
            if (data && data.id) list.push(data);
          });
          onUpdate(list);
        },
        (err) => console.warn('[Firebase] Users dinləmə xətası', err)
      );
    } catch {
      return () => {};
    }
  },

  // Centralized Cloud Backups
  async saveBackup(backup: any): Promise<void> {
    const backupId = backup.id || `backup_${Date.now()}`;
    const path = `backups/${backupId}`;
    try {
      const sanitized = sanitizeForFirestore({
        ...backup,
        id: backupId,
        createdAt: new Date().toISOString(),
      });
      await setDoc(doc(db, 'backups', backupId), sanitized, { merge: true });
      console.log(`[Firebase] Backup buluda yazıldı: ${backupId}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async fetchBackupsFromFirestore(): Promise<any[]> {
    try {
      const snap = await getDocs(collection(db, 'backups'));
      const list: any[] = [];
      snap.forEach((d) => {
        const data = d.data();
        if (data) list.push(data);
      });
      list.sort(
        (a, b) =>
          new Date(b.createdAt || b.backupDate || 0).getTime() -
          new Date(a.createdAt || a.backupDate || 0).getTime()
      );
      return list;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'backups');
      return [];
    }
  },

  // Sync audit log
  async saveAuditLog(log: AuditLog): Promise<void> {
    const path = `audit_logs/${log.id}`;
    try {
      const sanitized = sanitizeForFirestore({
        ...log,
        _syncedAt: new Date().toISOString(),
      });
      await setDoc(doc(db, 'audit_logs', log.id), sanitized, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async fetchAuditLogsFromFirestore(): Promise<AuditLog[]> {
    try {
      const snap = await getDocs(collection(db, 'audit_logs'));
      const list: AuditLog[] = [];
      snap.forEach((d) => {
        const data = d.data() as AuditLog;
        if (data && data.id) list.push(data);
      });
      list.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
      return list;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'audit_logs');
      return [];
    }
  },
};
