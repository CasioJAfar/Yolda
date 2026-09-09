export interface LatLng {
  lat: number;
  lng: number;
}

export interface DeviceLocationResult {
  lat: number;
  lng: number;
  accuracy: number; // in meters
}

// Default center: Baku, Azerbaijan
export const DEFAULT_MAP_CENTER: LatLng = {
  lat: 40.4093,
  lng: 49.8671,
};

export function getGoogleMapsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export function getAppleMapsUrl(lat: number, lng: number): string {
  return `https://maps.apple.com/?q=${lat},${lng}`;
}

export function getWazeUrl(lat: number, lng: number): string {
  return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
}

/**
 * Open native map based on platform
 */
export function openPlatformMap(lat: number, lng: number): void {
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isIOS) {
    window.open(getAppleMapsUrl(lat, lng), '_blank');
  } else {
    window.open(getGoogleMapsUrl(lat, lng), '_blank');
  }
}

/**
 * Get device GPS coordinates with accuracy
 */
export function getCurrentDeviceLocation(): Promise<DeviceLocationResult> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Cihazınızda GPS xidməti dəstəklənmir.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy || 10,
        });
      },
      (error) => {
        let msg = 'GPS koordinatları alına bilmədi.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Konum icazəsi verilmədi. Konumu avtomatik müəyyən etmək mümkün deyil. Zəhmət olmasa cihazınızın ayarlarından konum icazəsini aktivləşdirin.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Konum məlumatı hazırda əlçatan deyil. Zəhmət olmasa GPS-in açıq olduğundan əmin olun.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Konum sorğusu vaxt bitdi. Açıq əraziyə keçib yenidən cəhd edin.';
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

/**
 * Reverse geocode latitude/longitude to address string using OpenStreetMap Nominatim
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'az,en',
        },
      }
    );
    if (!res.ok) throw new Error('Geocoding request failed');
    const data = await res.json();
    if (data && data.display_name) {
      // Create concise format
      const parts = data.display_name.split(',');
      return parts.slice(0, 3).join(', ').trim();
    }
  } catch (e) {
    console.warn('Geocoding failed, returning fallback coordinates text', e);
  }
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}
