export interface UserPermissions {
  // Müştərilər
  canViewCustomers: boolean;
  canAddCustomers: boolean;
  canEditCustomers: boolean;
  canDeleteCustomers: boolean;
  // Sürücülər
  canViewDrivers: boolean;
  canAddDrivers: boolean;
  canEditDrivers: boolean;
  canDeleteDrivers: boolean;
  // WhatsApp
  canSendWhatsApp: boolean;
  // Tarixçə
  canViewHistory: boolean;
  // Digər
  canOpenMap: boolean;
  canExportData: boolean;
}

export const DEFAULT_USER_PERMISSIONS: UserPermissions = {
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
};

export const ADMIN_PERMISSIONS: UserPermissions = {
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
};

export const DRIVER_PERMISSIONS: UserPermissions = {
  canViewCustomers: true,
  canAddCustomers: false,
  canEditCustomers: false,
  canDeleteCustomers: false,
  canViewDrivers: false,
  canAddDrivers: false,
  canEditDrivers: false,
  canDeleteDrivers: false,
  canSendWhatsApp: true,
  canViewHistory: true,
  canOpenMap: true,
  canExportData: false,
};

export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: 'admin' | 'user' | 'driver';
  status: 'active' | 'inactive';
  permissions: UserPermissions;
  customerCount?: number;
  driverCount?: number;
  dispatchCount?: number;
  lastLoginAt?: string;
  lastActiveAt?: string;
  isOnline?: boolean;
  createdAt: string;
}

export interface DriverUserInfo {
  id: string;
  name: string;
  phone?: string;
  customerCount: number;
}

export interface CustomerLocation {
  lat: number;
  lng: number;
  addressText?: string;
}

export interface Customer {
  id: string;
  ownerId?: string; // Account-based UID in Firestore
  userId: string; // Multi-user isolation
  userOwnerName?: string; // Displayed in admin panel
  name: string;
  phone: string;
  address: string;
  location: CustomerLocation | null;
  note?: string;
  photoUrl?: string;
  hasActiveOrder?: boolean;
  activeOrderId?: string | null;
  // Soft Delete fields
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  deletedByName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Driver {
  id: string;
  ownerId?: string;
  userId: string;
  userOwnerName?: string;
  name: string;
  phone: string;
  note?: string;
  status: 'active' | 'inactive';
  lastActive?: string;
  lastActiveAt?: string;
  isOnline?: boolean;
  latitude?: number;
  longitude?: number;
  currentOrderId?: string | null;
  createdAt: string;
}

export type OrderStatus = 'open' | 'claimed' | 'in_transit' | 'delivered' | 'cancelled';

export interface RoutePoint {
  lat: number;
  lng: number;
  timestamp: string;
  speed?: number;
}

export interface OrderStatusHistoryItem {
  id: string;
  action: 'created' | 'claimed' | 'rejected' | 'in_transit' | 'delivered' | 'cancelled';
  actionText: string;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  timestamp: string;
  note?: string;
}

export interface Order {
  id: string;
  orderNumber?: string;
  customerId?: string; // Reference to existing customer
  customerName: string;
  phone: string;
  address: string;
  location: {
    lat: number;
    lng: number;
    addressText?: string;
  };
  note?: string;
  createdByUserId: string;
  createdByUserName: string;
  createdByUserPhone?: string;
  createdAt: string;
  updatedAt: string;
  status: OrderStatus;
  assignedDriverId?: string | null;
  assignedDriverName?: string | null;
  assignedDriverPhone?: string | null;
  claimedAt?: string | null;
  driverLocation?: {
    lat: number;
    lng: number;
    updatedAt: string;
    speed?: number;
    heading?: number;
  } | null;
  routePoints?: RoutePoint[];
  history: OrderStatusHistoryItem[];
  rejectedDriverIds?: string[];
  deliveredAt?: string | null;
  deliveryIssue?: {
    reportedAt: string;
    reason: string;
    driverName: string;
    driverPhone?: string;
  } | null;
}

export interface ActiveDispatch {
  id: string; // Order or dispatch ID
  orderId: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  customerLocation?: { lat: number; lng: number };
  driverId: string;
  driverName: string;
  driverPhone?: string;
  currentLocation: {
    lat: number;
    lng: number;
    speed?: number;
    heading?: number;
    updatedAt: string;
  };
  routePoints: RoutePoint[];
  status: 'claimed' | 'in_transit' | 'delivered';
  startedAt: string;
  updatedAt: string;
  createdByUserId?: string;
}

export interface AppNotification {
  id: string;
  recipientUserId: string; // 'all' or specific user ID
  title: string;
  message: string;
  orderId?: string;
  type: 'order_claimed' | 'order_rejected' | 'order_in_transit' | 'order_delivered' | 'info';
  isRead: boolean;
  timestamp: string;
}

export interface DispatchRecord {
  id: string;
  ownerId?: string;
  userId: string;
  userOwnerName?: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  locationUrl?: string;
  timestamp: string;
  messageText: string;
  // Route history and polyline metrics
  orderId?: string;
  customerLocation?: { lat: number; lng: number };
  startLocation?: { lat: number; lng: number };
  deliveredLocation?: { lat: number; lng: number };
  routePoints?: RoutePoint[];
  durationMinutes?: number;
  distanceKm?: number;
  deliveredAt?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: 'admin' | 'user' | 'driver';
  action: string; // e.g. "Müştəri əlavə etdi"
  targetType: 'customer' | 'driver' | 'dispatch' | 'order' | 'auth' | 'user' | 'permission' | 'system';
  targetId?: string;
  targetName?: string;
  details: string;
  ipAddress?: string;
  device?: string;
  timestamp: string;
}

export type ActiveTab = 'home' | 'customers' | 'drivers' | 'orders' | 'map' | 'history' | 'admin' | 'settings';

export type AdminSection =
  | 'dashboard'
  | 'users'
  | 'online-drivers'
  | 'customers'
  | 'drivers'
  | 'orders'
  | 'history'
  | 'trash'
  | 'logs'
  | 'permissions'
  | 'settings';
