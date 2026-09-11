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

// --- Firestore Cloud Persistence & Realtime Sync Helpers ---

export const FirebaseSync = {
  // Sync a single customer to Firestore
  async saveCustomer(customer: Customer): Promise<void> {
    const path = `customers/${customer.id}`;
    try {
      const sanitized = sanitizeForFirestore({
        ...customer,
        _syncedAt: new Date().toISOString(),
      });
      await setDoc(doc(db, 'customers', customer.id), sanitized, { merge: true });
      console.log(`[Firebase] Müştəri buluda yazıldı: ${customer.name} (${customer.id})`);
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

  // Pull customers from Firestore
  async fetchCustomersFromFirestore(): Promise<Customer[]> {
    try {
      const snap = await getDocs(collection(db, 'customers'));
      const list: Customer[] = [];
      snap.forEach((d) => {
        const data = d.data() as Customer;
        if (data && data.id) {
          list.push(data);
        }
      });
      // Sort newest first
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      return list;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'customers');
      return [];
    }
  },

  // Real-time listener for customers
  subscribeCustomers(onUpdate: (customers: Customer[]) => void): () => void {
    try {
      return onSnapshot(
        collection(db, 'customers'),
        (snap) => {
          const list: Customer[] = [];
          snap.forEach((d) => {
            const data = d.data() as Customer;
            if (data && data.id) {
              list.push(data);
            }
          });
          list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          onUpdate(list);
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

  // Sync drivers
  async saveDriver(driver: Driver): Promise<void> {
    const path = `drivers/${driver.id}`;
    try {
      const sanitized = sanitizeForFirestore({
        ...driver,
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

  async fetchDriversFromFirestore(): Promise<Driver[]> {
    try {
      const snap = await getDocs(collection(db, 'drivers'));
      const list: Driver[] = [];
      snap.forEach((d) => {
        const data = d.data() as Driver;
        if (data && data.id) list.push(data);
      });
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      return list;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'drivers');
      return [];
    }
  },

  subscribeDrivers(onUpdate: (drivers: Driver[]) => void): () => void {
    try {
      return onSnapshot(
        collection(db, 'drivers'),
        (snap) => {
          const list: Driver[] = [];
          snap.forEach((d) => {
            const data = d.data() as Driver;
            if (data && data.id) list.push(data);
          });
          list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          onUpdate(list);
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
    try {
      const sanitized = sanitizeForFirestore({
        ...dispatch,
        _syncedAt: new Date().toISOString(),
      });
      await setDoc(doc(db, 'dispatches', dispatch.id), sanitized, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async fetchDispatchesFromFirestore(): Promise<DispatchRecord[]> {
    try {
      const snap = await getDocs(collection(db, 'dispatches'));
      const list: DispatchRecord[] = [];
      snap.forEach((d) => {
        const data = d.data() as DispatchRecord;
        if (data && data.id) list.push(data);
      });
      list.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
      return list;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'dispatches');
      return [];
    }
  },

  subscribeDispatches(onUpdate: (dispatches: DispatchRecord[]) => void): () => void {
    try {
      return onSnapshot(
        collection(db, 'dispatches'),
        (snap) => {
          const list: DispatchRecord[] = [];
          snap.forEach((d) => {
            const data = d.data() as DispatchRecord;
            if (data && data.id) list.push(data);
          });
          list.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
          onUpdate(list);
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
