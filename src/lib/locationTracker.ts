import { FirebaseSync } from './firebase';
import { RoutePoint } from '../types';

export interface LocationTrackerConfig {
  orderId: string;
  dispatchId?: string;
  driverId: string;
  driverName: string;
  driverPhone?: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  customerLocation?: { lat: number; lng: number };
  createdByUserId?: string;
}

class LocationTrackerService {
  private isRunning: boolean = false;
  private intervalId: number | null = null;
  private watchId: number | null = null;
  private currentConfig: LocationTrackerConfig | null = null;
  private lastPosition: { lat: number; lng: number; speed?: number; heading?: number } | null = null;
  private recordedPoints: RoutePoint[] = [];
  private listeners: Set<(coords: { lat: number; lng: number; speed?: number }) => void> = new Set();

  /**
   * Start tracking driver GPS coordinates every 15 seconds to Firestore activeDispatches & orders
   */
  startTracking(config: LocationTrackerConfig) {
    if (this.isRunning && this.currentConfig?.orderId === config.orderId) {
      console.log('[LocationTracker] Already tracking order:', config.orderId);
      return;
    }

    // If tracking another order, stop it first
    if (this.isRunning) {
      this.stopTracking();
    }

    this.isRunning = true;
    this.currentConfig = config;
    const dispatchId = config.dispatchId || config.orderId;
    console.log(`[LocationTracker] Starting 15s live GPS tracker for dispatch/order: ${dispatchId}`);

    if (typeof window === 'undefined' || !navigator.geolocation) {
      console.warn('[LocationTracker] Geolocation API is not supported in this environment.');
      return;
    }

    // Step 1: Initialize the activeDispatches document in Firestore immediately
    FirebaseSync.saveActiveDispatch({
      id: dispatchId,
      orderId: config.orderId,
      driverId: config.driverId,
      driverName: config.driverName,
      driverPhone: config.driverPhone,
      customerName: config.customerName || '',
      customerPhone: config.customerPhone,
      customerAddress: config.customerAddress,
      customerLocation: config.customerLocation,
      createdByUserId: config.createdByUserId,
      status: 'in_transit',
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      currentLocation: {
        lat: config.customerLocation?.lat || 40.4093,
        lng: config.customerLocation?.lng || 49.8671,
        updatedAt: new Date().toISOString(),
      },
      routePoints: [],
    });

    // Step 2: Grab immediate initial location
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.handleNewCoords(pos.coords.latitude, pos.coords.longitude, pos.coords.speed || 0, pos.coords.heading || 0);
      },
      (err) => {
        console.warn('[LocationTracker] Initial position error:', err.message);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );

    // Step 3: Use watchPosition for high-precision local updates
    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        this.lastPosition = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          speed: pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : undefined, // km/h
          heading: pos.coords.heading || undefined,
        };
        // Notify local UI subscribers immediately
        this.notifyListeners();
      },
      (err) => {
        console.warn('[LocationTracker] watchPosition error:', err.message);
      },
      { enableHighAccuracy: true, maximumAge: 6000, timeout: 12000 }
    );

    // Step 4: Interval every 15 seconds (15000 ms) as specified by user requirement
    // Writes coordinates directly to Firestore activeDispatches & orders collections
    this.intervalId = window.setInterval(() => {
      this.pushLocationToFirestore();
    }, 15000);
  }

  /**
   * Pushes current coordinates to Firestore activeDispatches and orders
   */
  private pushLocationToFirestore() {
    if (!this.isRunning || !this.currentConfig) return;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.handleNewCoords(
            pos.coords.latitude,
            pos.coords.longitude,
            pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0,
            pos.coords.heading || 0
          );
        },
        () => {
          // Fallback to last known position if current read failed
          if (this.lastPosition) {
            this.handleNewCoords(
              this.lastPosition.lat,
              this.lastPosition.lng,
              this.lastPosition.speed || 0,
              this.lastPosition.heading || 0
            );
          }
        },
        { enableHighAccuracy: true, timeout: 7000 }
      );
    } else if (this.lastPosition) {
      this.handleNewCoords(
        this.lastPosition.lat,
        this.lastPosition.lng,
        this.lastPosition.speed || 0,
        this.lastPosition.heading || 0
      );
    }
  }

  /**
   * Commits the coordinate to Firestore and updates route history
   */
  private async handleNewCoords(lat: number, lng: number, speed?: number, heading?: number) {
    if (!this.currentConfig) return;
    const dispatchId = this.currentConfig.dispatchId || this.currentConfig.orderId;
    const now = new Date().toISOString();

    this.lastPosition = { lat, lng, speed, heading };

    const point: RoutePoint = {
      lat,
      lng,
      speed,
      timestamp: now,
    };
    this.recordedPoints.push(point);

    try {
      // 1. Update Firestore activeDispatches collection every 15s
      await FirebaseSync.updateActiveDispatchLocation(dispatchId, {
        lat,
        lng,
        speed,
        heading,
      });

      // 2. Update orders collection driverLocation & routePoints
      await FirebaseSync.updateOrderDriverLocation(
        this.currentConfig.orderId,
        lat,
        lng,
        speed
      );

      // 3. Update driver presence
      if (this.currentConfig.driverId) {
        await FirebaseSync.updateDriverPresence(
          this.currentConfig.driverId,
          true,
          now,
          this.currentConfig.orderId
        );
      }

      // Notify local in-app subscribers
      this.notifyListeners();
    } catch (err) {
      console.warn('[LocationTracker] Firestore coordinate update error:', err);
    }
  }

  /**
   * Stop tracking and clean up all watchers & timers
   */
  stopTracking(): RoutePoint[] {
    console.log('[LocationTracker] Stopping live tracking.');
    this.isRunning = false;

    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.watchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    const completedPoints = [...this.recordedPoints];
    this.currentConfig = null;
    this.recordedPoints = [];
    this.lastPosition = null;

    return completedPoints;
  }

  isTracking(): boolean {
    return this.isRunning;
  }

  getActiveConfig(): LocationTrackerConfig | null {
    return this.currentConfig;
  }

  getLastCoords() {
    return this.lastPosition;
  }

  getRecordedPoints(): RoutePoint[] {
    return [...this.recordedPoints];
  }

  subscribe(listener: (coords: { lat: number; lng: number; speed?: number }) => void) {
    this.listeners.add(listener);
    if (this.lastPosition) {
      listener(this.lastPosition);
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    if (!this.lastPosition) return;
    this.listeners.forEach((l) => {
      try {
        l(this.lastPosition!);
      } catch (e) {
        console.warn('[LocationTracker] listener error:', e);
      }
    });
  }
}

export const locationTracker = new LocationTrackerService();
