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

// --- Firestore Cloud Persistence & Realtime Sync Helpers ---

export const FirebaseSync = {
  // Sync a single customer to Firestore
  async saveCustomer(customer: Customer): Promise<void> {
    const path = `customers/${customer.id}`;
    try {
      await setDoc(doc(db, 'customers', customer.id), {
        ...customer,
        _syncedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  // Batch sync customers
  async saveAllCustomers(customers: Customer[]): Promise<void> {
    for (const c of customers) {
      await this.saveCustomer(c);
    }
  },

  // Delete customer from Firestore
  async deleteCustomer(customerId: string): Promise<void> {
    const path = `customers/${customerId}`;
    try {
      await deleteDoc(doc(db, 'customers', customerId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  // Sync users
  async saveUser(user: User): Promise<void> {
    const path = `users/${user.id}`;
    try {
      await setDoc(doc(db, 'users', user.id), {
        ...user,
        _syncedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  // Sync drivers
  async saveDriver(driver: Driver): Promise<void> {
    const path = `drivers/${driver.id}`;
    try {
      await setDoc(doc(db, 'drivers', driver.id), {
        ...driver,
        _syncedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  // Sync dispatch record
  async saveDispatch(dispatch: DispatchRecord): Promise<void> {
    const path = `dispatches/${dispatch.id}`;
    try {
      await setDoc(doc(db, 'dispatches', dispatch.id), {
        ...dispatch,
        _syncedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  // Sync audit log
  async saveAuditLog(log: AuditLog): Promise<void> {
    const path = `audit_logs/${log.id}`;
    try {
      await setDoc(doc(db, 'audit_logs', log.id), {
        ...log,
        _syncedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  // Pull customers from Firestore
  async fetchCustomersFromFirestore(): Promise<Customer[]> {
    try {
      const snap = await getDocs(collection(db, 'customers'));
      const list: Customer[] = [];
      snap.forEach((d) => {
        list.push(d.data() as Customer);
      });
      return list;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'customers');
      return [];
    }
  },
};
