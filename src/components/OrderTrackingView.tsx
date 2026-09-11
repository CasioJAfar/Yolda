import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  X,
  MapPin,
  Truck,
  Phone,
  MessageCircle,
  Navigation,
  Compass,
  CheckCircle2,
  Clock,
  Radio,
  Gauge,
  ExternalLink,
  ChevronLeft,
  AlertTriangle,
  Send,
} from 'lucide-react';
import { Order, User, ActiveDispatch, RoutePoint } from '../types';
import { FirebaseSync } from '../lib/firebase';
import { Api } from '../lib/api';
import { locationTracker } from '../lib/locationTracker';
import { openWhatsApp } from '../lib/whatsapp';
import { openWazeNavigation } from '../lib/waze';

interface OrderTrackingViewProps {
  order: Order;
  user: User | null;
  onClose: () => void;
  onOrderUpdated?: (updatedOrder: Order) => void;
}

function calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const dLng = toRad(lng2 - lng1);
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);

  const y = Math.sin(dLng) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function getCompassDirectionName(deg: number): string {
  if (deg >= 337.5 || deg < 22.5) return 'Şimal (↑)';
  if (deg >= 22.5 && deg < 67.5) return 'Şimal-Şərq (↗)';
  if (deg >= 67.5 && deg < 112.5) return 'Şərq (→)';
  if (deg >= 112.5 && deg < 157.5) return 'Cənub-Şərq (↘)';
  if (deg >= 157.5 && deg < 202.5) return 'Cənub (↓)';
  if (deg >= 202.5 && deg < 247.5) return 'Cənub-Qərb (↙)';
  if (deg >= 247.5 && deg < 292.5) return 'Qərb (←)';
  return 'Şimal-Qərb (↖)';
}

export const OrderTrackingView: React.FC<OrderTrackingViewProps> = ({
  order: initialOrder,
  user,
  onClose,
  onOrderUpdated,
}) => {
  const [order, setOrder] = useState<Order>(initialOrder);
  const [activeDispatch, setActiveDispatch] = useState<ActiveDispatch | null>(null);
  const [isDelivering, setIsDelivering] = useState(false);
  const [deliverySuccess, setDeliverySuccess] = useState(false);

  // Issue modal
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueReason, setIssueReason] = useState('Müştəri qapını açmır və ya zəngə cavab vermir');
  const [isSubmittingIssue, setIsSubmittingIssue] = useState(false);
  const [issueSuccessMsg, setIssueSuccessMsg] = useState('');

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const customerMarkerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const guideLineRef = useRef<L.Polyline | null>(null);

  const prevCoordsRef = useRef<{ lat: number; lng: number } | null>(null);

  const isAssignedDriver =
    user?.role === 'driver' &&
    (order.assignedDriverId === user.id || order.assignedDriverName === user.name);

  // 1. Subscribe to real-time order & activeDispatch from Firestore
  useEffect(() => {
    const unsubOrder = FirebaseSync.subscribeOrders(user, (ordersList) => {
      const found = ordersList.find((o) => o.id === order.id);
      if (found) {
        setOrder(found);
        if (onOrderUpdated) onOrderUpdated(found);
      }
    });

    const unsubActive = FirebaseSync.subscribeActiveDispatch(order.id, (dispatchData) => {
      if (dispatchData) {
        setActiveDispatch(dispatchData);
      }
    });

    return () => {
      unsubOrder();
      unsubActive();
    };
  }, [order.id, user]);

  const driverCoords =
    activeDispatch?.currentLocation?.lat && activeDispatch?.currentLocation?.lng
      ? { lat: activeDispatch.currentLocation.lat, lng: activeDispatch.currentLocation.lng }
      : order.driverLocation?.lat && order.driverLocation?.lng
      ? { lat: order.driverLocation.lat, lng: order.driverLocation.lng }
      : null;

  const customerCoords = order.location
    ? { lat: order.location.lat, lng: order.location.lng }
    : { lat: 40.4093, lng: 49.8671 };

  // Calculate direction / heading angle
  let calculatedBearing = 0;
  if (activeDispatch?.currentLocation?.heading !== undefined && activeDispatch.currentLocation.heading !== null) {
    calculatedBearing = activeDispatch.currentLocation.heading;
  } else if (prevCoordsRef.current && driverCoords) {
    calculatedBearing = calculateBearing(
      prevCoordsRef.current.lat,
      prevCoordsRef.current.lng,
      driverCoords.lat,
      driverCoords.lng
    );
  } else if (driverCoords && customerCoords) {
    calculatedBearing = calculateBearing(
      driverCoords.lat,
      driverCoords.lng,
      customerCoords.lat,
      customerCoords.lng
    );
  }

  // Calculate distance
  let distanceKm: number | null = null;
  if (driverCoords && customerCoords) {
    const R = 6371;
    const dLat = ((customerCoords.lat - driverCoords.lat) * Math.PI) / 180;
    const dLon = ((customerCoords.lng - driverCoords.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((driverCoords.lat * Math.PI) / 180) *
        Math.cos((customerCoords.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    distanceKm = Math.round(R * c * 10) / 10;
  }

  // 2. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialCenter: [number, number] = driverCoords
        ? [driverCoords.lat, driverCoords.lng]
        : [customerCoords.lat, customerCoords.lng];

      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: 14,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // Customer Pin
      const customerIcon = L.divIcon({
        className: 'custom-customer-pin',
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 36px; height: 36px; background: rgba(239, 68, 68, 0.25); border-radius: 50%; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="width: 32px; height: 32px; background: #ef4444; border: 3px solid #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 4px 10px rgba(0,0,0,0.35);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const custMarker = L.marker([customerCoords.lat, customerCoords.lng], {
        icon: customerIcon,
      }).addTo(map);

      custMarker.bindPopup(`
        <div style="font-family: sans-serif; padding: 2px;">
          <div style="font-weight: bold; font-size: 13px; color: #0f172a;">${order.customerName}</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">📍 ${order.address}</div>
          <div style="font-size: 11px; color: #2563eb; font-weight: 600; margin-top: 4px;">📞 ${order.phone}</div>
        </div>
      `);
      customerMarkerRef.current = custMarker;

      // Traveled route polyline (vivid blue line)
      const poly = L.polyline([], {
        color: '#2563eb',
        weight: 5,
        opacity: 0.9,
        lineJoin: 'round',
        lineCap: 'round',
      }).addTo(map);
      polylineRef.current = poly;

      // Guidance line to destination
      const guide = L.polyline([], {
        color: '#3b82f6',
        weight: 3,
        dashArray: '8, 8',
        opacity: 0.6,
      }).addTo(map);
      guideLineRef.current = guide;

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 3. Update driver marker with directional heading & polyline
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const points: RoutePoint[] =
      activeDispatch?.routePoints && activeDispatch.routePoints.length > 0
        ? activeDispatch.routePoints
        : order.routePoints || [];

    const latLngs: [number, number][] = points.map((p) => [p.lat, p.lng]);

    if (driverCoords) {
      const driverLatLng: [number, number] = [driverCoords.lat, driverCoords.lng];

      const driverSpeed =
        activeDispatch?.currentLocation?.speed ||
        order.driverLocation?.speed ||
        0;

      // Directional rotated car marker
      const driverIcon = L.divIcon({
        className: 'custom-driver-vehicle',
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 46px; height: 46px; background: rgba(37, 99, 235, 0.25); border-radius: 50%; animation: pulse 2s infinite;"></div>
            <div style="width: 38px; height: 38px; background: #2563eb; border: 3px solid #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.45); transform: rotate(${calculatedBearing}deg); transition: transform 0.4s ease;">
              <!-- Navigation Direction Arrow / Car -->
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
              </svg>
            </div>
            ${
              driverSpeed > 0
                ? `<div style="position: absolute; top: -16px; background: #0f172a; color: white; padding: 1px 6px; border-radius: 8px; font-size: 10px; font-weight: bold; white-space: nowrap;">${driverSpeed} km/s</div>`
                : ''
            }
          </div>
        `,
        iconSize: [46, 46],
        iconAnchor: [23, 23],
      });

      if (!driverMarkerRef.current) {
        const marker = L.marker(driverLatLng, { icon: driverIcon }).addTo(map);
        marker.bindPopup(`
          <div style="font-family: sans-serif; padding: 2px;">
            <div style="font-weight: bold; font-size: 13px; color: #1e40af;">🚚 ${order.assignedDriverName || 'Sürücü'}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Status: Canlı İzlənilir (15s GPS)</div>
            <div style="font-size: 11px; color: #0284c7; font-weight: 600; margin-top: 2px;">İstiqamət: ${getCompassDirectionName(calculatedBearing)}</div>
            ${driverSpeed > 0 ? `<div style="font-size: 11px; color: #0f172a; font-weight: 600;">Sürət: ${driverSpeed} km/s</div>` : ''}
          </div>
        `);
        driverMarkerRef.current = marker;
      } else {
        driverMarkerRef.current.setLatLng(driverLatLng);
        driverMarkerRef.current.setIcon(driverIcon);
      }

      prevCoordsRef.current = driverCoords;

      if (
        latLngs.length === 0 ||
        latLngs[latLngs.length - 1][0] !== driverLatLng[0] ||
        latLngs[latLngs.length - 1][1] !== driverLatLng[1]
      ) {
        latLngs.push(driverLatLng);
      }

      if (guideLineRef.current) {
        guideLineRef.current.setLatLngs([driverLatLng, [customerCoords.lat, customerCoords.lng]]);
      }
    }

    if (polylineRef.current) {
      polylineRef.current.setLatLngs(latLngs);
    }

    if (driverCoords) {
      const bounds = L.latLngBounds([
        [driverCoords.lat, driverCoords.lng],
        [customerCoords.lat, customerCoords.lng],
      ]);
      map.fitBounds(bounds, { padding: [70, 70], maxZoom: 16 });
    }
  }, [driverCoords?.lat, driverCoords?.lng, calculatedBearing, activeDispatch?.routePoints?.length]);

  // Handle "Təhvil verdim"
  const handleDeliverOrder = async () => {
    if (!user) return;
    const confirmDel = window.confirm(
      `"${order.customerName}" sifarişini təhvil verdiyinizi təsdiq edirsiniz?`
    );
    if (!confirmDel) return;

    setIsDelivering(true);
    try {
      locationTracker.stopTracking();
      const res = await FirebaseSync.deliverOrderAndFinalize(
        order.id,
        {
          id: user.id,
          name: user.name,
          phone: user.phone,
        },
        driverCoords || undefined
      );

      if (res.success && res.order) {
        setOrder(res.order);
        setDeliverySuccess(true);
        if (onOrderUpdated) onOrderUpdated(res.order);
        setTimeout(() => {
          onClose();
        }, 2200);
      } else {
        alert(res.error || 'Çatdırılma qeydə alına bilmədi.');
      }
    } catch (err: any) {
      alert('Xəta: ' + err.message);
    } finally {
      setIsDelivering(false);
    }
  };

  // Handle "Müştəri yerində yoxdur"
  const handleReportIssue = async () => {
    if (!user) return;
    setIsSubmittingIssue(true);
    try {
      const res = await Api.reportDeliveryIssue(
        order.id,
        {
          id: user.id,
          name: user.name,
          phone: user.phone,
        },
        issueReason
      );

      if (res.success) {
        setIssueSuccessMsg('Sifarişi yaradan istifadəçiyə təcili bildiriş göndərildi!');
        setShowIssueModal(false);
        setTimeout(() => setIssueSuccessMsg(''), 6000);
      } else {
        alert(res.error || 'Xəta baş verdi');
      }
    } catch (e: any) {
      alert('Xəta: ' + e.message);
    } finally {
      setIsSubmittingIssue(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 overflow-hidden md:m-4 md:rounded-3xl md:shadow-2xl md:border md:border-slate-800">
        {/* Top App Bar */}
        <div className="p-3.5 sm:p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Canlı İzləmə Xəritəsi
                </h2>
                <span className="font-mono text-xs text-slate-400">
                  {order.orderNumber || ''}
                </span>
                {order.status === 'in_transit' || order.status === 'claimed' ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                    Canlı Hərəkətdədir
                  </span>
                ) : order.status === 'delivered' ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Çatdırıldı
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                    Açıq
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Müştəri: <span className="font-semibold text-slate-800 dark:text-slate-200">{order.customerName}</span> • {order.address}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Delivery Issue Banner if exists */}
        {order.deliveryIssue && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950 border-b border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs flex items-center justify-between gap-3 px-5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <div>
                <span className="font-bold">Müştəri yerində yoxdur!</span> Sürücü {order.deliveryIssue.driverName}: "{order.deliveryIssue.reason}"
              </div>
            </div>
            {order.deliveryIssue.driverPhone && (
              <a
                href={`tel:${order.deliveryIssue.driverPhone}`}
                className="px-3 py-1 rounded-lg bg-rose-600 text-white font-bold text-xs shrink-0 flex items-center gap-1 shadow-sm"
              >
                <Phone className="w-3 h-3" />
                <span>Sürücüyə zəng et</span>
              </a>
            )}
          </div>
        )}

        {issueSuccessMsg && (
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950 border-b border-emerald-200 text-emerald-800 dark:text-emerald-200 text-xs font-semibold text-center">
            {issueSuccessMsg}
          </div>
        )}

        {/* Map Container & Realtime Overlays */}
        <div className="relative flex-1 bg-slate-100 dark:bg-slate-950">
          <div ref={mapContainerRef} className="w-full h-full z-0" />

          {/* Direction & Speed Floating HUD */}
          <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
            <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/30">
                <Compass className="w-5 h-5" style={{ transform: `rotate(${calculatedBearing}deg)` }} />
              </div>
              <div className="text-xs">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  İstiqamət
                </div>
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                  <span>{getCompassDirectionName(calculatedBearing)}</span>
                  <span className="text-[10px] text-slate-400 font-mono">({Math.round(calculatedBearing)}°)</span>
                </div>
              </div>
            </div>

            {distanceKm !== null && (
              <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg text-xs flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span className="text-slate-500">Qalan məsafə:</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">
                  {distanceKm} km
                </span>
              </div>
            )}
          </div>

          {/* Delivery Success Modal Overlay */}
          {deliverySuccess && (
            <div className="absolute inset-0 z-30 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl max-w-sm w-full text-center space-y-3 shadow-2xl border border-emerald-500">
                <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Sifariş Təhvil Verildi!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Canlı izləmə tamamlandı və sifarişi yaradan istifadəçiyə bildiriş göndərildi.
                </p>
                <button
                  onClick={onClose}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 transition"
                >
                  Tamamla & Bağla
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Action Bar */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-10 shrink-0 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Customer Details */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-rose-500" />
                  <span>MÜŞTƏRİ</span>
                </div>
                <div className="font-bold text-slate-900 dark:text-white text-sm truncate">
                  {order.customerName}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {order.address}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 pl-2">
                <a
                  href={`tel:${order.phone}`}
                  className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition"
                  title="Müştəriyə zəng et"
                >
                  <Phone className="w-4 h-4" />
                </a>
                <button
                  onClick={() => openWhatsApp(order.phone, `Salam ${order.customerName}, sifarişiniz haqqında.`)}
                  className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition"
                  title="WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Driver Details */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                  <Truck className="w-3 h-3 text-blue-500" />
                  <span>SÜRÜCÜ</span>
                </div>
                <div className="font-bold text-slate-900 dark:text-white text-sm truncate">
                  {order.assignedDriverName || 'Təyin olunmayıb'}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {order.assignedDriverPhone || 'Nömrə yoxdur'}
                </div>
              </div>

              {order.assignedDriverPhone && (
                <div className="flex items-center gap-1.5 shrink-0 pl-2">
                  <a
                    href={`tel:${order.assignedDriverPhone}`}
                    className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition"
                    title="Sürücüyə zəng et"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() =>
                      openWhatsApp(order.assignedDriverPhone!, `Salam ${order.assignedDriverName}, sifariş haqqında.`)
                    }
                    className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition"
                    title="WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Action Row for Driver */}
          {(isAssignedDriver || user?.role === 'admin') && order.status !== 'delivered' && (
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
              {/* Waze Navigation Button */}
              <button
                onClick={() => openWazeNavigation(customerCoords.lat, customerCoords.lng)}
                className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-sky-500 hover:bg-sky-600 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-md shadow-sky-500/25 flex items-center justify-center gap-2 transition"
              >
                <Compass className="w-4 h-4" />
                <span>Müştərinin konumunu Waze-ə göndər</span>
              </button>

              {/* Customer Not Found Button */}
              <button
                onClick={() => setShowIssueModal(true)}
                className="w-full sm:w-auto py-3 px-4 rounded-2xl bg-rose-500 hover:bg-rose-600 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-md shadow-rose-500/25 flex items-center justify-center gap-2 transition whitespace-nowrap"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Müştəri yerində yoxdur</span>
              </button>

              {/* Təhvil verdim Button */}
              <button
                onClick={handleDeliverOrder}
                disabled={isDelivering}
                className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isDelivering ? 'Təhvil verilir...' : 'Təhvil verdim'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Issue Modal inside Tracking View */}
      {showIssueModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-rose-200 dark:border-rose-900/60 p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Müştəri Yerində Yoxdur
                </h3>
                <p className="text-xs text-slate-500">
                  Sifarişi yaradan şəxsə dərhal xəbərdarlıq gedəcək
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Səbəb:
              </label>
              <select
                value={issueReason}
                onChange={(e) => setIssueReason(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl mb-2"
              >
                <option value="Müştəri qapını açmır və ya zəngə cavab vermir">
                  Müştəri qapını açmır və ya zəngə cavab vermir
                </option>
                <option value="Ünvan düzgün deyil və ya tapılmır">
                  Ünvan düzgün deyil və ya tapılmır
                </option>
                <option value="Müştəri sifarişdən imtina etdi">
                  Müştəri sifarişdən imtina etdi
                </option>
                <option value="Müştəri başqa yerdədir / vaxt tələb edir">
                  Müştəri başqa yerdədir / vaxt tələb edir
                </option>
              </select>

              <textarea
                rows={2}
                value={issueReason}
                onChange={(e) => setIssueReason(e.target.value)}
                placeholder="Əlavə qeyd..."
                className="w-full p-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowIssueModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Geri
              </button>
              <button
                type="button"
                disabled={isSubmittingIssue}
                onClick={handleReportIssue}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl active:scale-95 disabled:opacity-50"
              >
                {isSubmittingIssue ? 'Göndərilir...' : 'Bildiriş Göndər'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
