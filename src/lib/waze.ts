/**
 * Waze Navigation and Deeplinking Utilities
 */

export interface NavigationTarget {
  lat: number;
  lng: number;
  customerName?: string;
  address?: string;
}

/**
 * Universal Waze navigation URL that works across Android, iOS, and Web.
 * Format: https://waze.com/ul?ll=<lat>,<lng>&navigate=yes
 */
export function getWazeUrl(lat: number, lng: number): string {
  return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
}

/**
 * Native Waze app scheme for mobile deep linking
 * Format: waze://?ll=<lat>,<lng>&navigate=yes
 */
export function getWazeDeepLink(lat: number, lng: number): string {
  return `waze://?ll=${lat},${lng}&navigate=yes`;
}

/**
 * Alternative map URL (Google Maps or Apple Maps)
 */
export function getAlternativeMapUrl(lat: number, lng: number): string {
  const isIOS = /iPad|iPhone|iPod/i.test(navigator.userAgent);
  if (isIOS) {
    return `https://maps.apple.com/?q=${lat},${lng}`;
  }
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

/**
 * Smart Waze navigation initiator with automatic mobile detection and fallback
 */
export function openWazeNavigation(
  lat: number,
  lng: number,
  onFallbackNeeded?: () => void
): void {
  const isIOS = /iPad|iPhone|iPod/i.test(navigator.userAgent);
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isMobile = isIOS || isAndroid || /Mobi|Tablet/i.test(navigator.userAgent);

  const universalUrl = getWazeUrl(lat, lng);
  const deepLink = getWazeDeepLink(lat, lng);

  if (isMobile) {
    let appOpened = false;

    // Listen for page hiding/blur indicating OS switched to Waze app
    const onVisibilityChange = () => {
      if (document.hidden) {
        appOpened = true;
      }
    };

    const onBlur = () => {
      appOpened = true;
    };

    document.addEventListener('visibilitychange', onVisibilityChange, { once: true });
    window.addEventListener('blur', onBlur, { once: true });

    // Attempt to open native Waze application
    if (isAndroid) {
      // On Android, attempting deep link scheme:
      window.location.href = deepLink;
    } else if (isIOS) {
      // On iOS Safari, window.location with scheme:
      window.location.href = deepLink;
    } else {
      window.location.href = deepLink;
    }

    // Set fallback timeout if user is still on this screen after 1.4s
    setTimeout(() => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onBlur);

      // If document is still visible, the Waze app is likely not installed
      if (!appOpened && !document.hidden) {
        if (onFallbackNeeded) {
          onFallbackNeeded();
        } else {
          // Open web/universal URL in new tab as fallback
          window.open(universalUrl, '_blank', 'noopener,noreferrer');
        }
      }
    }, 1400);
  } else {
    // Desktop Web browser: open official Waze Live Map directly
    window.open(universalUrl, '_blank', 'noopener,noreferrer');
  }
}
