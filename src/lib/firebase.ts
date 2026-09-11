import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  collection,
  setDoc,
  updateDoc,
  getDocs,
  deleteDoc,
  runTransaction,
  onSnapshot
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  Customer,
  Driver,
  DispatchRecord,
  User,
  AuditLog,
  Order,
  OrderStatus,
  RoutePoint,
  AppNotification,
  ActiveDispatch,
} from '../types';

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

  // Update customer active order flag
  async setCustomerActiveOrder(customerId: string, hasActiveOrder: boolean, activeOrderId: string | null = null): Promise<void> {
    if (!customerId) return;
    try {
      await updateDoc(doc(db, 'customers', customerId), sanitizeForFirestore({
        hasActiveOrder,
        activeOrderId,
        updatedAt: new Date().toISOString(),
        _syncedAt: new Date().toISOString(),
      }));
    } catch (err) {
      console.warn('[Firebase] setCustomerActiveOrder error:', err);
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

  // Update user online presence heartbeat
  async updateUserPresence(userId: string, isOnline: boolean): Promise<void> {
    if (!userId) return;
    try {
      await setDoc(
        doc(db, 'users', userId),
        {
          isOnline,
          lastActiveAt: new Date().toISOString(),
          _syncedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (error) {
      // Non-blocking for offline cases
      console.warn('[Firebase] Presence update error:', error);
    }
  },

  // Update driver presence & lastActive timestamp in 'drivers' collection
  async updateDriverPresence(
    driverId: string,
    isOnline: boolean,
    lastActive?: string,
    currentOrderId?: string | null
  ): Promise<void> {
    if (!driverId) return;
    const now = lastActive || new Date().toISOString();
    try {
      const dataToMerge: Record<string, any> = {
        isOnline,
        lastActive: now,
        lastActiveAt: now,
        _syncedAt: now,
      };
      if (currentOrderId !== undefined) {
        dataToMerge.currentOrderId = currentOrderId;
      }
      await setDoc(doc(db, 'drivers', driverId), dataToMerge, { merge: true });
    } catch (error) {
      console.warn('[Firebase] Driver presence update error:', error);
    }
  },

  // --- Orders & Realtime Live Delivery System ---

  // Save / create an order
  async saveOrder(order: Order): Promise<void> {
    const path = `orders/${order.id}`;
    try {
      const sanitized = sanitizeForFirestore({
        ...order,
        _syncedAt: new Date().toISOString(),
      });
      await setDoc(doc(db, 'orders', order.id), sanitized, { merge: true });
      if (order.customerId) {
        await this.setCustomerActiveOrder(order.customerId, true, order.id);
      }
      console.log(`[Firebase] Sifariş buluda yazıldı: ${order.id}`);

      // Bütün aktiv sürücülərə dərhal bildiriş göndər
      this.notifyDriversNewOrder(order).catch((e) =>
        console.warn('Driver notif error:', e)
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      throw error;
    }
  },

  // Notify all drivers when a new order is placed
  async notifyDriversNewOrder(order: Order): Promise<void> {
    try {
      const snap = await getDocs(collection(db, 'users'));
      const notifPromises: Promise<any>[] = [];
      const now = new Date().toISOString();
      snap.forEach((uDoc) => {
        const u = uDoc.data();
        if (u.role === 'driver' || u.role === 'admin') {
          const notif: AppNotification = {
            id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            recipientUserId: uDoc.id,
            title: '🔔 Yeni Sifariş Var!',
            message: `Müştəri: ${order.customerName}, Ünvan: ${order.address}. Sifarişlər bölməsindən qəbul edə bilərsiniz.`,
            orderId: order.id,
            type: 'new_order',
            isRead: false,
            timestamp: now,
          };
          notifPromises.push(this.saveNotification(notif));
        }
      });
      await Promise.all(notifPromises);
    } catch (err) {
      console.warn('notifyDriversNewOrder error:', err);
    }
  },

  // Report delivery issue: "Müştəri yerində yoxdur"
  async reportDeliveryIssue(
    orderId: string,
    driver: { id: string; name: string; phone?: string },
    reason: string
  ): Promise<{ success: boolean; error?: string; order?: Order }> {
    const orderRef = doc(db, 'orders', orderId);
    try {
      const orderSnap = await getDoc(orderRef);
      if (!orderSnap.exists()) {
        return { success: false, error: 'Sifariş tapılmadı.' };
      }
      const orderData = orderSnap.data() as Order;
      const now = new Date().toISOString();

      const issue = {
        reportedAt: now,
        reason: reason || 'Müştəri yerində yoxdur / təhvil verilə bilmədi',
        driverName: driver.name,
        driverPhone: driver.phone || '',
      };

      const newHistory = [
        ...(orderData.history || []),
        {
          id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          action: 'in_transit' as const,
          actionText: `⚠️ Sürücü ${driver.name} bildirdi: Müştəri yerində yoxdur!`,
          driverId: driver.id,
          driverName: driver.name,
          driverPhone: driver.phone || '',
          timestamp: now,
          note: reason,
        },
      ];

      const updatePayload = {
        deliveryIssue: issue,
        history: newHistory,
        updatedAt: now,
        _syncedAt: now,
      };

      await updateDoc(orderRef, sanitizeForFirestore(updatePayload));
      const updatedOrder = { ...orderData, ...updatePayload } as Order;

      // Sifarişi yazan istifadəçiyə yüksək prioritetli bildiriş göndər
      try {
        await this.saveNotification({
          id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          recipientUserId: orderData.createdByUserId,
          title: '⚠️ Təcili! Sürücü malı təhvil verə bilmədi!',
          message: `Sürücü ${driver.name} müştəri ${orderData.customerName}-nı ünvanda tapa bilmədi (Müştəri yerində yoxdur). Səbəb: "${reason}". Zəhmət olmasa sürücüyə kömək edin! Tel: ${driver.phone || 'Nömrə qeyd edilməyib'}`,
          orderId: orderData.id,
          type: 'order_issue',
          isRead: false,
          timestamp: now,
        });
      } catch (e) {
        console.warn('Notification save error:', e);
      }

      return { success: true, order: updatedOrder };
    } catch (err: any) {
      console.error('reportDeliveryIssue error:', err);
      return { success: false, error: err.message };
    }
  },

  // Driver dismisses an open order ("İmtina et"): hides from this driver only
  async dismissOrderForDriver(
    orderId: string,
    driverId: string
  ): Promise<{ success: boolean; error?: string }> {
    const orderRef = doc(db, 'orders', orderId);
    try {
      const snap = await getDoc(orderRef);
      if (!snap.exists()) return { success: false, error: 'Sifariş tapılmadı.' };
      const orderData = snap.data() as Order;
      const existing = orderData.rejectedDriverIds || [];
      if (!existing.includes(driverId)) {
        const now = new Date().toISOString();
        await updateDoc(
          orderRef,
          sanitizeForFirestore({
            rejectedDriverIds: [...existing, driverId],
            updatedAt: now,
            _syncedAt: now,
          })
        );
      }
      return { success: true };
    } catch (err: any) {
      console.warn('dismissOrderForDriver error:', err);
      return { success: false, error: err.message };
    }
  },

  // Claim order: "Mən apararam"
  // Uses atomic transaction so that if two drivers tap at the same time, only ONE wins!
  async claimOrder(
    orderId: string,
    driver: { id: string; name: string; phone?: string; location?: { lat: number; lng: number } }
  ): Promise<{ success: boolean; error?: string; order?: Order }> {
    const orderRef = doc(db, 'orders', orderId);
    try {
      const claimedOrder = await runTransaction(db, async (transaction) => {
        const orderSnap = await transaction.get(orderRef);
        if (!orderSnap.exists()) {
          throw new Error('Sifariş tapılmadı.');
        }
        const currentData = orderSnap.data() as Order;
        if (currentData.status !== 'open') {
          throw new Error('Bu sifariş artıq başqa sürücü tərəfindən qəbul edilib.');
        }

        const now = new Date().toISOString();
        const newHistory = [
          ...(currentData.history || []),
          {
            id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            action: 'claimed' as const,
            actionText: `${driver.name} sifarişi götürdü ("Mən apararam")`,
            driverId: driver.id,
            driverName: driver.name,
            driverPhone: driver.phone || '',
            timestamp: now,
          },
        ];

        const updatePayload: Record<string, any> = {
          status: 'claimed',
          assignedDriverId: driver.id,
          assignedDriverName: driver.name,
          assignedDriverPhone: driver.phone || '',
          claimedAt: now,
          updatedAt: now,
          history: newHistory,
          _syncedAt: now,
        };

        if (driver.location) {
          updatePayload.driverLocation = {
            lat: driver.location.lat,
            lng: driver.location.lng,
            updatedAt: now,
          };
          updatePayload.routePoints = [
            ...(currentData.routePoints || []),
            {
              lat: driver.location.lat,
              lng: driver.location.lng,
              timestamp: now,
            },
          ];
        }

        transaction.update(orderRef, sanitizeForFirestore(updatePayload));
        return { ...currentData, ...updatePayload } as Order;
      });

      // Notify the USER who created the order
      try {
        await this.saveNotification({
          id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          recipientUserId: claimedOrder.createdByUserId,
          title: 'Sürücü sifarişi götürdü',
          message: `Müştəri sifarişinizi ${driver.name} götürdü. Xəritədən canlı izləyə bilərsiniz.`,
          orderId: claimedOrder.id,
          type: 'order_claimed',
          isRead: false,
          timestamp: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('Notification save error:', e);
      }

      // Update driver active timestamp and currentOrderId
      await this.updateDriverPresence(driver.id, true, new Date().toISOString(), claimedOrder.id);

      return { success: true, order: claimedOrder };
    } catch (err: any) {
      console.warn('Order claim failed:', err.message);
      return { success: false, error: err.message || 'Sifariş götürülə bilmədi.' };
    }
  },

  // Reject order: "İmtina edirəm" / "Sifarişdən imtina et"
  // Reverts the order to 'open' so other drivers can immediately see and claim it!
  async rejectOrder(
    orderId: string,
    driver: { id: string; name: string; phone?: string },
    reason?: string
  ): Promise<{ success: boolean; error?: string; order?: Order }> {
    const orderRef = doc(db, 'orders', orderId);
    try {
      const orderSnap = await getDoc(orderRef);
      if (!orderSnap.exists()) {
        return { success: false, error: 'Sifariş tapılmadı.' };
      }
      const currentData = orderSnap.data() as Order;
      const now = new Date().toISOString();

      const newHistory = [
        ...(currentData.history || []),
        {
          id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          action: 'rejected' as const,
          actionText: `${driver.name} sifarişdən imtina etdi`,
          driverId: driver.id,
          driverName: driver.name,
          driverPhone: driver.phone || '',
          timestamp: now,
          note: reason || 'Sürücü imtina etdi. Sifariş yenidən bütün sürücülər üçün açıqdır.',
        },
      ];

      const updatePayload = {
        status: 'open',
        assignedDriverId: null,
        assignedDriverName: null,
        assignedDriverPhone: null,
        claimedAt: null,
        updatedAt: now,
        history: newHistory,
        _syncedAt: now,
      };

      await updateDoc(orderRef, sanitizeForFirestore(updatePayload));
      const updatedOrder = { ...currentData, ...updatePayload } as Order;

      // Notify the USER who created the order
      try {
        await this.saveNotification({
          id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          recipientUserId: currentData.createdByUserId,
          title: 'Sürücü sifarişdən imtina etdi',
          message: `${driver.name} sifarişdən imtina etdi. Sifariş yenidən digər sürücülər üçün açıqdır.`,
          orderId: currentData.id,
          type: 'order_rejected',
          isRead: false,
          timestamp: now,
        });
      } catch (e) {
        console.warn('Notification save error:', e);
      }

      // Reset driver currentOrderId
      await this.updateDriverPresence(driver.id, true, now, null);

      return { success: true, order: updatedOrder };
    } catch (err: any) {
      console.error('Order reject failed:', err);
      return { success: false, error: err.message };
    }
  },

  // Update order status (e.g. 'in_transit' -> 'delivered')
  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    driver?: { id: string; name: string; phone?: string },
    note?: string
  ): Promise<void> {
    const orderRef = doc(db, 'orders', orderId);
    try {
      const orderSnap = await getDoc(orderRef);
      if (!orderSnap.exists()) return;
      const currentData = orderSnap.data() as Order;
      const now = new Date().toISOString();

      let actionText = '';
      if (status === 'in_transit') actionText = `${driver?.name || 'Sürücü'} yola düşdü`;
      else if (status === 'delivered') actionText = `${driver?.name || 'Sürücü'} sifarişi çatdırdı`;
      else if (status === 'cancelled') actionText = 'Sifariş ləğv edildi';
      else actionText = `Status: ${status}`;

      const newHistory = [
        ...(currentData.history || []),
        {
          id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          action: status as any,
          actionText,
          driverId: driver?.id,
          driverName: driver?.name,
          driverPhone: driver?.phone,
          timestamp: now,
          note,
        },
      ];

      const updatePayload: Record<string, any> = {
        status,
        updatedAt: now,
        history: newHistory,
        _syncedAt: now,
      };

      await updateDoc(orderRef, sanitizeForFirestore(updatePayload));

      // Notify the USER
      if (status === 'delivered' || status === 'in_transit') {
        try {
          await this.saveNotification({
            id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            recipientUserId: currentData.createdByUserId,
            title: status === 'delivered' ? 'Sifariş çatdırıldı!' : 'Sürücü yoldadır',
            message:
              status === 'delivered'
                ? `Müştəri sifarişiniz ${driver?.name || 'sürücü'} tərəfindən uğurla çatdırıldı.`
                : `${driver?.name || 'Sürücü'} müştərinin ünvanına doğru yola çıxdı.`,
            orderId: currentData.id,
            type: status === 'delivered' ? 'order_delivered' : 'order_in_transit',
            isRead: false,
            timestamp: now,
          });
        } catch (e) {
          console.warn('Notif error', e);
        }
      }

      if (status === 'delivered' && driver?.id) {
        await this.updateDriverPresence(driver.id, true, now, null);
      }
    } catch (err) {
      console.warn('Status update error:', err);
    }
  },

  // Periodically record GPS points during active delivery
  async updateOrderDriverLocation(
    orderId: string,
    lat: number,
    lng: number,
    speed?: number
  ): Promise<void> {
    const orderRef = doc(db, 'orders', orderId);
    try {
      const orderSnap = await getDoc(orderRef);
      if (!orderSnap.exists()) return;
      const currentData = orderSnap.data() as Order;
      const now = new Date().toISOString();

      const newPoint: RoutePoint = { lat, lng, timestamp: now, speed };
      const routePoints = [...(currentData.routePoints || []), newPoint];

      // Keep maximum 300 points for smooth route history
      const trimmedPoints = routePoints.length > 300 ? routePoints.slice(routePoints.length - 300) : routePoints;

      await updateDoc(
        orderRef,
        sanitizeForFirestore({
          driverLocation: { lat, lng, updatedAt: now },
          routePoints: trimmedPoints,
          updatedAt: now,
          _syncedAt: now,
        })
      );
    } catch (err) {
      console.warn('Location update error:', err);
    }
  },

  // --- Active Dispatches (Real-time Live GPS Tracking every 15s) ---

  async saveActiveDispatch(dispatch: ActiveDispatch): Promise<void> {
    const dispatchId = dispatch.id || dispatch.orderId;
    const path = `activeDispatches/${dispatchId}`;
    try {
      const sanitized = sanitizeForFirestore({
        ...dispatch,
        _syncedAt: new Date().toISOString(),
      });
      await setDoc(doc(db, 'activeDispatches', dispatchId), sanitized, { merge: true });
    } catch (err) {
      console.warn('[Firebase] saveActiveDispatch error:', err);
    }
  },

  async updateActiveDispatchLocation(
    dispatchId: string,
    coords: { lat: number; lng: number; speed?: number; heading?: number }
  ): Promise<void> {
    const docRef = doc(db, 'activeDispatches', dispatchId);
    try {
      const snap = await getDoc(docRef);
      const now = new Date().toISOString();
      const newPoint: RoutePoint = {
        lat: coords.lat,
        lng: coords.lng,
        speed: coords.speed,
        timestamp: now,
      };

      if (snap.exists()) {
        const data = snap.data() as ActiveDispatch;
        const currentPoints = data.routePoints || [];
        const updatedPoints = [...currentPoints, newPoint];
        const trimmed = updatedPoints.length > 400 ? updatedPoints.slice(updatedPoints.length - 400) : updatedPoints;

        await updateDoc(
          docRef,
          sanitizeForFirestore({
            currentLocation: {
              lat: coords.lat,
              lng: coords.lng,
              speed: coords.speed || 0,
              heading: coords.heading || 0,
              updatedAt: now,
            },
            routePoints: trimmed,
            updatedAt: now,
            _syncedAt: now,
          })
        );
      }
    } catch (err) {
      console.warn('[Firebase] updateActiveDispatchLocation error:', err);
    }
  },

  subscribeActiveDispatch(
    dispatchId: string,
    onUpdate: (dispatch: ActiveDispatch | null) => void
  ): () => void {
    try {
      return onSnapshot(
        doc(db, 'activeDispatches', dispatchId),
        (snap) => {
          if (snap.exists()) {
            onUpdate({ id: snap.id, ...(snap.data() as any) } as ActiveDispatch);
          } else {
            onUpdate(null);
          }
        },
        (err) => console.warn('[Firebase] Active dispatch listener error:', err)
      );
    } catch {
      return () => {};
    }
  },

  subscribeActiveDispatches(onUpdate: (dispatches: ActiveDispatch[]) => void): () => void {
    try {
      return onSnapshot(
        collection(db, 'activeDispatches'),
        (snap) => {
          const list: ActiveDispatch[] = [];
          snap.forEach((d) => {
            list.push({ id: d.id, ...(d.data() as any) } as ActiveDispatch);
          });
          onUpdate(list);
        },
        (err) => console.warn('[Firebase] Active dispatches listener error:', err)
      );
    } catch {
      return () => {};
    }
  },

  async deleteActiveDispatch(dispatchId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'activeDispatches', dispatchId));
    } catch (err) {
      console.warn('[Firebase] deleteActiveDispatch error:', err);
    }
  },

  // Finalize order delivery: "Təhvil verdim" / "Çatdırıldı"
  async deliverOrderAndFinalize(
    orderId: string,
    driver: { id: string; name: string; phone?: string },
    finalLocation?: { lat: number; lng: number }
  ): Promise<{ success: boolean; order?: Order; dispatchRecord?: DispatchRecord; error?: string }> {
    const orderRef = doc(db, 'orders', orderId);
    try {
      const orderSnap = await getDoc(orderRef);
      if (!orderSnap.exists()) {
        return { success: false, error: 'Sifariş tapılmadı.' };
      }
      const orderData = orderSnap.data() as Order;
      const now = new Date().toISOString();

      // Check activeDispatch for recorded GPS points
      let routePoints = orderData.routePoints || [];
      try {
        const activeSnap = await getDoc(doc(db, 'activeDispatches', orderId));
        if (activeSnap.exists()) {
          const activeData = activeSnap.data() as ActiveDispatch;
          if (activeData.routePoints && activeData.routePoints.length > routePoints.length) {
            routePoints = activeData.routePoints;
          }
        }
      } catch (e) {
        console.warn('Active dispatch fetch error:', e);
      }

      if (finalLocation) {
        routePoints = [
          ...routePoints,
          { lat: finalLocation.lat, lng: finalLocation.lng, timestamp: now },
        ];
      }

      // Calculate approximate distance (km) and duration (mins)
      let distanceKm = 0;
      for (let i = 0; i < routePoints.length - 1; i++) {
        const p1 = routePoints[i];
        const p2 = routePoints[i + 1];
        const R = 6371; // Earth radius in km
        const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
        const dLon = ((p2.lng - p1.lng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((p1.lat * Math.PI) / 180) *
            Math.cos((p2.lat * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        distanceKm += R * c;
      }
      distanceKm = Math.round(distanceKm * 100) / 100;

      const startTime = orderData.claimedAt || orderData.createdAt;
      const durationMinutes = Math.max(
        1,
        Math.round((new Date(now).getTime() - new Date(startTime).getTime()) / 60000)
      );

      const newHistory = [
        ...(orderData.history || []),
        {
          id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          action: 'delivered' as const,
          actionText: `${driver.name} sifarişi təhvil verdi ("Çatdırıldı")`,
          driverId: driver.id,
          driverName: driver.name,
          driverPhone: driver.phone || '',
          timestamp: now,
          note: `Çatdırılma tamamlandı. Məsafə: ${distanceKm} km, Müddət: ${durationMinutes} dəq.`,
        },
      ];

      const updatePayload: Record<string, any> = {
        status: 'delivered',
        deliveredAt: now,
        updatedAt: now,
        history: newHistory,
        routePoints,
        _syncedAt: now,
      };

      if (finalLocation) {
        updatePayload.driverLocation = {
          lat: finalLocation.lat,
          lng: finalLocation.lng,
          updatedAt: now,
        };
      }

      await updateDoc(orderRef, sanitizeForFirestore(updatePayload));
      const updatedOrder = { ...orderData, ...updatePayload } as Order;

      // Update customer active order status
      if (orderData.customerId) {
        await this.setCustomerActiveOrder(orderData.customerId, false, null);
      }

      // Create permanent DispatchRecord in dispatches collection for DispatchHistoryView
      const dispatchRecordId = `disp_${orderData.id}`;
      const dispatchRecord: DispatchRecord = {
        id: dispatchRecordId,
        orderId: orderData.id,
        customerId: orderData.customerId || `cust_${Date.now()}`,
        customerName: orderData.customerName,
        customerPhone: orderData.phone,
        customerAddress: orderData.address,
        customerLocation: orderData.location,
        driverId: driver.id,
        driverName: driver.name,
        driverPhone: driver.phone || '',
        userId: orderData.createdByUserId || 'usr_unknown',
        userOwnerName: orderData.createdByUserName || 'Sistem',
        startLocation: routePoints.length > 0 ? { lat: routePoints[0].lat, lng: routePoints[0].lng } : undefined,
        deliveredLocation: finalLocation || (routePoints.length > 0 ? { lat: routePoints[routePoints.length - 1].lat, lng: routePoints[routePoints.length - 1].lng } : orderData.location),
        routePoints,
        durationMinutes,
        distanceKm,
        deliveredAt: now,
        timestamp: now,
        locationUrl: `https://www.google.com/maps?q=${orderData.location.lat},${orderData.location.lng}`,
        messageText: `Sifariş ${orderData.orderNumber || ''} çatdırıldı: ${orderData.customerName} - ${orderData.address}`,
      };

      await this.saveDispatch(dispatchRecord);

      // Clean up from activeDispatches
      await this.deleteActiveDispatch(orderId);

      // Notify the USER who created the order
      try {
        await this.saveNotification({
          id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          recipientUserId: orderData.createdByUserId,
          title: 'Sifariş çatdırıldı! ✅',
          message: `Sürücü ${driver.name} müştəri ${orderData.customerName}-nın sifarişini uğurla təhvil verdi.`,
          orderId: orderData.id,
          type: 'order_delivered',
          isRead: false,
          timestamp: now,
        });
      } catch (e) {
        console.warn('Notification save error:', e);
      }

      // Reset driver currentOrderId
      await this.updateDriverPresence(driver.id, true, now, null);

      return { success: true, order: updatedOrder, dispatchRecord };
    } catch (err: any) {
      console.error('deliverOrderAndFinalize error:', err);
      return { success: false, error: err.message || 'Çatdırılma tamamlana bilmədi.' };
    }
  },

  // Fetch orders from Firestore with role-based filtering
  async fetchOrdersFromFirestore(user?: User | null): Promise<Order[]> {
    try {
      const snap = await getDocs(collection(db, 'orders'));
      const list: Order[] = [];
      snap.forEach((d) => {
        const data = d.data() as Order;
        const id = data?.id || d.id;
        if (id) {
          list.push({ ...data, id });
        }
      });

      let filtered = list;
      if (user) {
        if (user.role === 'admin') {
          // Admin sees all
        } else if (user.role === 'driver') {
          // Drivers see open orders (except ones they dismissed) OR orders assigned to them
          filtered = filtered.filter(
            (o) =>
              (o.status === 'open' && (!o.rejectedDriverIds || !o.rejectedDriverIds.includes(user.id))) ||
              o.assignedDriverId === user.id ||
              o.assignedDriverName === user.name
          );
        } else {
          // Normal user sees orders they created
          filtered = filtered.filter(
            (o) => o.createdByUserId === user.id || o.createdByUserName === user.name
          );
        }
      }

      filtered.sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
      return filtered;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'orders');
      return [];
    }
  },

  // Real-time listener for orders
  subscribeOrders(
    user: User | null,
    onUpdate: (orders: Order[]) => void
  ): () => void {
    try {
      return onSnapshot(
        collection(db, 'orders'),
        (snap) => {
          const list: Order[] = [];
          snap.forEach((d) => {
            const data = d.data() as Order;
            const id = data?.id || d.id;
            if (id) {
              list.push({ ...data, id });
            }
          });

          let filtered = list;
          if (user) {
            if (user.role === 'admin') {
              // Admin sees everything
            } else if (user.role === 'driver') {
              // Drivers see:
              // 1. Open orders (except ones dismissed by this driver)
              // 2. Orders currently assigned to this driver
              filtered = filtered.filter(
                (o) =>
                  (o.status === 'open' && (!o.rejectedDriverIds || !o.rejectedDriverIds.includes(user.id))) ||
                  o.assignedDriverId === user.id ||
                  o.assignedDriverName === user.name
              );
            } else {
              // Normal users see orders they created
              filtered = filtered.filter(
                (o) => o.createdByUserId === user.id || o.createdByUserName === user.name
              );
            }
          }

          filtered.sort(
            (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
          );
          onUpdate(filtered);
        },
        (err) => console.warn('[Firebase] Orders dinləmə xətası:', err)
      );
    } catch {
      return () => {};
    }
  },

  // In-app Notifications
  async saveNotification(notification: AppNotification): Promise<void> {
    const path = `notifications/${notification.id}`;
    try {
      const sanitized = sanitizeForFirestore({
        ...notification,
        _syncedAt: new Date().toISOString(),
      });
      await setDoc(doc(db, 'notifications', notification.id), sanitized, { merge: true });
    } catch (error) {
      console.warn('Save notif error:', error);
    }
  },

  subscribeNotifications(
    userId: string,
    onUpdate: (notifications: AppNotification[]) => void
  ): () => void {
    try {
      return onSnapshot(
        collection(db, 'notifications'),
        (snap) => {
          const list: AppNotification[] = [];
          snap.forEach((d) => {
            const data = d.data() as AppNotification;
            const id = data?.id || d.id;
            if (id && (data.recipientUserId === userId || data.recipientUserId === 'all')) {
              list.push({ ...data, id });
            }
          });
          list.sort(
            (a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
          );
          onUpdate(list);
        },
        (err) => console.warn('[Firebase] Notifications dinləmə xətası:', err)
      );
    } catch {
      return () => {};
    }
  },

  async markNotificationRead(notificationId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        isRead: true,
        _syncedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Mark notif read error:', e);
    }
  },

  async fetchUsersFromFirestore(): Promise<User[]> {
    try {
      const snap = await getDocs(collection(db, 'users'));
      const map = new Map<string, User>();
      snap.forEach((d) => {
        const data = d.data() as User;
        const id = data?.id || d.id;
        if (id) {
          map.set(id, { ...data, id });
        }
      });
      return Array.from(map.values());
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
          const map = new Map<string, User>();
          snap.forEach((d) => {
            const data = d.data() as User;
            const id = data?.id || d.id;
            if (id) {
              map.set(id, { ...data, id });
            }
          });
          onUpdate(Array.from(map.values()));
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
