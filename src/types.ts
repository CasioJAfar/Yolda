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
  createdAt: string;
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
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: 'admin' | 'user' | 'driver';
  action: string; // e.g. "Müştəri əlavə etdi"
  targetType: 'customer' | 'driver' | 'dispatch' | 'auth' | 'user' | 'permission' | 'system';
  targetId?: string;
  targetName?: string;
  details: string;
  ipAddress?: string;
  device?: string;
  timestamp: string;
}

export type ActiveTab = 'home' | 'customers' | 'drivers' | 'map' | 'history' | 'admin' | 'settings';

export type AdminSection =
  | 'dashboard'
  | 'users'
  | 'customers'
  | 'drivers'
  | 'history'
  | 'trash'
  | 'logs'
  | 'permissions'
  | 'settings';
