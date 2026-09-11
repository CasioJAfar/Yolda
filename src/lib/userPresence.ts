import { User } from '../types';

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
