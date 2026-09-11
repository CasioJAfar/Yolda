import { User, Driver } from '../types';

/**
 * Determines whether a user is currently online based on isOnline flag
 * and the last active heartbeat timestamp (within 2.5 minutes).
 */
export function isUserOnline(user: User | null | undefined): boolean {
  if (!user) return false;
  if (user.isOnline === false) return false;
  const timestamp = user.lastActiveAt || user.lastLoginAt;
  if (!timestamp) return false;

  const lastActive = new Date(timestamp).getTime();
  if (isNaN(lastActive)) return false;

  // Active within the last 2.5 minutes (150,000 ms)
  const diffMs = Date.now() - lastActive;
  return diffMs >= 0 && diffMs < 150000;
}

/**
 * Determines whether a driver is currently online based on isOnline flag,
 * active status, and last active timestamp (within 3 minutes).
 */
export function isDriverOnline(driver: Driver | null | undefined, allUsers?: User[]): boolean {
  if (!driver) return false;
  if (driver.status === 'inactive') return false;

  // 1. Check driver's direct lastActive or isOnline field in Firestore 'drivers' collection
  const driverTime = driver.lastActive || driver.lastActiveAt;
  if (driverTime) {
    const time = new Date(driverTime).getTime();
    if (!isNaN(time) && Date.now() - time < 180000) {
      return driver.isOnline !== false;
    }
  }

  // 2. Cross-reference with User collection if driver is also a registered user
  if (allUsers && allUsers.length > 0) {
    const cleanPhone = driver.phone.replace(/[^\d]/g, '');
    const cleanName = driver.name.toLowerCase().trim();
    const matchedUser = allUsers.find((u) => {
      if (u.role === 'driver' || u.id === driver.id || u.id === driver.userId) return true;
      const uPhone = u.phone.replace(/[^\d]/g, '');
      if (cleanPhone && uPhone && (uPhone.includes(cleanPhone) || cleanPhone.includes(uPhone))) return true;
      return u.name.toLowerCase().trim() === cleanName;
    });

    if (matchedUser) {
      return isUserOnline(matchedUser);
    }
  }

  // If driver has isOnline true and recent update
  if (driver.isOnline === true) {
    return true;
  }

  return false;
}

/**
 * Returns a human-friendly label for a driver's presence state.
 */
export function getDriverPresenceLabel(driver: Driver | null | undefined, allUsers?: User[]): string {
  if (!driver) return 'Məlum deyil';
  if (isDriverOnline(driver, allUsers)) {
    return 'İndi onlayndır';
  }

  const timestamp = driver.lastActive || driver.lastActiveAt;
  if (!timestamp) return 'Oflayn';

  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (isNaN(diffMs)) return 'Oflayn';

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);

  if (diffMinutes <= 1) return 'Bayaq aktiv idi';
  if (diffMinutes < 60) return `${diffMinutes} dəq əvvəl`;
  if (diffHours < 24) return `${diffHours} saat əvvəl`;

  return `${date.toLocaleDateString('az-AZ', { day: '2-digit', month: '2-digit' })} ${date.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })}`;
}

/**
 * Returns a human-friendly label for a user's presence state.
 */
export function getUserPresenceLabel(user: User | null | undefined): string {
  if (!user) return 'Məlum deyil';
  if (isUserOnline(user)) {
    return 'İndi onlayndır';
  }

  const timestamp = user.lastActiveAt || user.lastLoginAt;
  if (!timestamp) return 'Daxil olmayıb';

  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (isNaN(diffMs)) return 'Məlum deyil';

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes <= 1) return 'Bayaq aktiv idi';
  if (diffMinutes < 60) return `${diffMinutes} dəq əvvəl`;
  if (diffHours < 24) return `${diffHours} saat əvvəl`;
  if (diffDays === 1) return 'Dünən';
  if (diffDays < 7) return `${diffDays} gün əvvəl`;

  return `${date.toLocaleDateString('az-AZ', { day: '2-digit', month: '2-digit' })} ${date.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })}`;
}
