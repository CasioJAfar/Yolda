import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  X,
  MapPin,
  Truck,
  Phone,
  MessageCircle,
  Clock,
  CheckCircle2,
  Navigation,
  AlertTriangle,
  History,
  Compass,
  ArrowRight,
  ShieldAlert,
  Send,
} from 'lucide-react';
import { Order, User, OrderStatus } from '../types';
import { FirebaseSync } from '../lib/firebase';
import { openWhatsApp } from '../lib/whatsapp';
import { openWazeNavigation } from '../lib/waze';
import { openPlatformMap } from '../lib/maps';

interface OrderLiveTrackingModalProps {
  order: Order;
  user: User | null;
  onClose: () => void;
  onOrderUpdated?: (updated: Order) => void;
  onOpenDriverTracking?: (orderId: string) => void;
}

export const OrderLiveTrackingModal: React.FC<OrderLiveTrackingModalProps> = ({
  order: initialOrder,
  user,
  onClose,
  onOrderUpdated,
}) => {
  const [order, setOrder] = useState<Order>(initialOrder);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeViewMode, setActiveViewMode] = useState<'map' | 'history'>('map');

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  const isAssignedDriver =
    user?.role === 'driver' &&
    (order.assignedDriverId === user.id || order.assignedDriverName === user.name);

  // Subscribe to live order changes from Firestore
  useEffect(() => {
    setOrder(initialOrder);
  }, [initialOrder]);

  useEffect(() => {
    const unsub = FirebaseSync.subscribeOrders(user, (orders) => {
      const match = orders.find((o) => o.id === initialOrder.id);
      if (match) {
        setOrder(match);
        if (onOrderUpdated) onOrderUpdated(match);
      }
    });
    return () => unsub();
  }, [initialOrder.id, user, onOrderUpdated]);

  // Leaflet Map Initialization and Real-Time Marker/Route Update
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const customerLatLng: [number, number] = [
        order.location?.lat || 40.4093,
        order.location?.lng || 49.8671,
      ];

      const map = L.map(mapContainerRef.current, {
        center: customerLatLng,
        zoom: 14,
        zoomControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      // Customer Pin (Destination)
      const customerIcon = L.divIcon({
        className: 'custom-customer-pin',
        html: `
          <div style="background-color: #ef4444; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.45); border: 2.5px solid #ffffff;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      });

      L.marker(customerLatLng, { icon: customerIcon })
        .addTo(map)
        .bindPopup(
          `<b>${order.customerName}</b><br/>${order.address}<br/><a href="tel:${order.phone}">${order.phone}</a>`
        );

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    if (!map) return;

    // Update or create Driver Marker
    if (order.driverLocation) {
      const driverLatLng: [number, number] = [
        order.driverLocation.lat,
        order.driverLocation.lng,
      ];

      const driverIcon = L.divIcon({
        className: 'custom-driver-live-pin',
        html: `
          <div style="position: relative; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; inset: 0; border-radius: 50%; background-color: rgba(37, 99, 235, 0.35); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="background-color: #2563eb; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.5); border: 2.5px solid #ffffff; z-index: 10;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
                <path d="M15 18H9"/>
                <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
                <circle cx="17" cy="18" r="2"/>
                <circle cx="7" cy="18" r="2"/>
              </svg>
            </div>
          </div>
        `,
        iconSize: [42, 42],
        iconAnchor: [21, 21],
      });

      if (driverMarkerRef.current) {
        driverMarkerRef.current.setLatLng(driverLatLng);
      } else {
        driverMarkerRef.current = L.marker(driverLatLng, { icon: driverIcon })
          .addTo(map)
          .bindPopup(`<b>${order.assignedDriverName || 'Sürücü'} (Canlı)</b>`);
      }
    }

    // Update Route History Polyline
    if (order.routePoints && order.routePoints.length > 0) {
      const latLngs = order.routePoints.map((pt) => [pt.lat, pt.lng] as [number, number]);
      if (order.driverLocation) {
        latLngs.push([order.driverLocation.lat, order.driverLocation.lng]);
      }

      if (polylineRef.current) {
        polylineRef.current.setLatLngs(latLngs);
      } else {
        polylineRef.current = L.polyline(latLngs, {
          color: '#2563eb',
          weight: 5,
          opacity: 0.85,
          lineJoin: 'round',
          dashArray: order.status === 'in_transit' ? '8, 8' : undefined,
        }).addTo(map);
      }
    }

    // Auto fit bounds to show both customer and driver
    try {
      const points: [number, number][] = [];
      if (order.location?.lat && order.location?.lng) {
        points.push([order.location.lat, order.location.lng]);
      }
      if (order.driverLocation?.lat && order.driverLocation?.lng) {
        points.push([order.driverLocation.lat, order.driverLocation.lng]);
      }
      if (points.length >= 2) {
        map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 16 });
      }
    } catch {
      // safe fallback
    }

    // Leaflet container resize fix
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      // keep map instance alive during modal
    };
  }, [order.location, order.driverLocation, order.routePoints, order.status, activeViewMode]);

  // Actions
  const handleSetInTransit = async () => {
    setIsUpdating(true);
    try {
      await FirebaseSync.updateOrderStatus(
        order.id,
        'in_transit',
        {
          id: user?.id || '',
          name: user?.name || 'Sürücü',
          phone: user?.phone,
        },
        'Sürücü müştərinin ünvanına yola çıxdı.'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSetDelivered = async () => {
    setIsUpdating(true);
    try {
      await FirebaseSync.updateOrderStatus(
        order.id,
        'delivered',
        {
          id: user?.id || '',
          name: user?.name || 'Sürücü',
          phone: user?.phone,
        },
        'Sifariş müştəriyə uğurla təhvil verildi.'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleConfirmReject = async () => {
    setIsUpdating(true);
    try {
      await FirebaseSync.rejectOrder(
        order.id,
        {
          id: user?.id || '',
          name: user?.name || 'Sürücü',
          phone: user?.phone,
        },
        rejectReason.trim() || 'Sürücü sifarişdən imtina etdi.'
      );
      setShowRejectConfirm(false);
      onClose();
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (st: OrderStatus) => {
    switch (st) {
      case 'open':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            Açıq (Gözləyir)
          </span>
        );
      case 'claimed':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-300 dark:border-blue-800 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
            Sürücü götürdü
          </span>
        );
      case 'in_transit':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-300 dark:border-purple-800 flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 animate-bounce" />
            Yoldadır (Canlı)
          </span>
        );
      case 'delivered':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Çatdırıldı
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Ləğv edildi
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/70 dark:bg-slate-900/70">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Navigation className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400">
                  {order.orderNumber || 'SİFARİŞ'}
                </span>
                {getStatusBadge(order.status)}
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base truncate">
                {order.customerName}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Switcher: Xəritə / Tarixçə */}
        <div className="px-4 pt-3 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
          <button
            onClick={() => setActiveViewMode('map')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl transition ${
              activeViewMode === 'map'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Canlı Xəritə & Marşrut</span>
          </button>
          <button
            onClick={() => setActiveViewMode('history')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl transition ${
              activeViewMode === 'history'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Sifariş Tarixçəsi ({order.history?.length || 0})</span>
          </button>
        </div>

        {/* Modal Scroll Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {activeViewMode === 'map' ? (
            <>
              {/* Live Map Box */}
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner bg-slate-100 dark:bg-slate-950">
                <div ref={mapContainerRef} className="w-full h-64 sm:h-72 z-0" />

                {/* Map Floating Overlay Controls */}
                <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
                  <button
                    onClick={() => {
                      if (order.location?.lat && order.location?.lng) {
                        openWazeNavigation(order.location.lat, order.location.lng);
                      }
                    }}
                    className="p-2 bg-white/95 dark:bg-slate-900/95 text-cyan-600 dark:text-cyan-400 rounded-xl shadow-md hover:scale-105 transition border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1"
                    title="Waze ilə naviqasiya"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Waze</span>
                  </button>

                  <button
                    onClick={() => {
                      if (order.location?.lat && order.location?.lng) {
                        openPlatformMap(order.location.lat, order.location.lng);
                      }
                    }}
                    className="p-2 bg-white/95 dark:bg-slate-900/95 text-blue-600 dark:text-blue-400 rounded-xl shadow-md hover:scale-105 transition border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1"
                    title="Google Maps ilə aç"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Google Maps</span>
                  </button>
                </div>

                {/* Live Status indicator bottom chip */}
                <div className="absolute bottom-2.5 left-2.5 right-2.5 z-10">
                  <div className="bg-slate-900/90 backdrop-blur-md text-white px-3 py-2 rounded-xl text-xs flex items-center justify-between border border-slate-700 shadow-lg">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                      <span className="font-semibold text-[11px]">
                        {order.driverLocation
                          ? 'Sürücünün canlı GPS siqnalı aktivdir'
                          : 'Sürücünün GPS konumu gözlənilir...'}
                      </span>
                    </div>
                    {order.routePoints && order.routePoints.length > 0 && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        {order.routePoints.length} GPS nöqtəsi
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Driver & Assignment Details */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-blue-500/20">
                      {order.assignedDriverName
                        ? order.assignedDriverName.charAt(0).toUpperCase()
                        : 'S'}
                    </div>
                    <div>
                      <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                        Təyin edilmiş sürücü
                      </div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        {order.assignedDriverName || 'Hələ təyin olunmayıb'}
                      </div>
                    </div>
                  </div>

                  {order.assignedDriverPhone && (
                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${order.assignedDriverPhone}`}
                        className="p-2 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 hover:bg-emerald-100 transition border border-emerald-200 dark:border-emerald-800"
                        title="Zəng et"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() =>
                          openWhatsApp(order.assignedDriverPhone!, `Sifariş haqqında: ${order.orderNumber}`)
                        }
                        className="p-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 transition shadow-sm"
                        title="WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Customer Address and Note */}
                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-xs space-y-1">
                  <div className="flex items-start gap-1.5 text-slate-700 dark:text-slate-300">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                    <span>{order.address}</span>
                  </div>
                  {order.note && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 pl-5">
                      Qeyd: {order.note}
                    </div>
                  )}
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 pl-5">
                    Sifarişi yaradan: {order.createdByUserName} ({new Date(order.createdAt).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })})
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* History View */
            <div className="space-y-3">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
                Sifarişin addım-addım tarixçəsi
              </div>

              {order.history && order.history.length > 0 ? (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
                  {order.history.map((hist, idx) => (
                    <div key={hist.id || idx} className="relative text-xs">
                      {/* Timeline dot */}
                      <div
                        className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${
                          hist.action === 'claimed'
                            ? 'bg-blue-600'
                            : hist.action === 'rejected'
                            ? 'bg-rose-500'
                            : hist.action === 'delivered'
                            ? 'bg-emerald-500'
                            : 'bg-slate-400'
                        }`}
                      />
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
                        <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                          <span>{hist.actionText}</span>
                          <span className="text-[10px] text-slate-400 font-mono font-normal">
                            {new Date(hist.timestamp).toLocaleTimeString('az-AZ', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </span>
                        </div>
                        {hist.driverName && (
                          <div className="text-[11px] text-blue-600 dark:text-blue-400 font-medium mt-0.5">
                            Sürücü: {hist.driverName} {hist.driverPhone && `(${hist.driverPhone})`}
                          </div>
                        )}
                        {hist.note && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 italic">
                            "{hist.note}"
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-400">
                  Tarixçə məlumatı yoxdur.
                </div>
              )}
            </div>
          )}

          {/* Sürücünün İmtina Təsdiq Modalı / Açılan Paneli */}
          {showRejectConfirm && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-300 dark:border-rose-900 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>Sifarişdən imtina etmək istədiyinizə əminsiniz?</span>
              </div>
              <p className="text-[11px] text-rose-700/80 dark:text-rose-400">
                İmtina etdikdə sifariş dərhal digər sürücülər üçün açıq vəziyyətə keçəcək və istifadəçiyə bildiriş gedəcəkdir.
              </p>
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="İmtina səbəbi (istəyə bağlı)..."
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 rounded-xl text-slate-900 dark:text-white"
              />
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowRejectConfirm(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl font-medium"
                >
                  Geri
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  disabled={isUpdating}
                  className="px-4 py-1.5 text-xs bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold shadow-md shadow-rose-600/30"
                >
                  {isUpdating ? 'İmtina olunur...' : 'Bəli, imtina edirəm'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions (Specifically for the assigned driver) */}
        {isAssignedDriver && order.status !== 'delivered' && order.status !== 'cancelled' && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90 shrink-0 space-y-2">
            <div className="flex items-center gap-2">
              {order.status === 'claimed' && (
                <button
                  onClick={handleSetInTransit}
                  disabled={isUpdating}
                  className="flex-1 py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-600/20 flex items-center justify-center gap-2 transition active:scale-[0.98]"
                >
                  <Truck className="w-4 h-4" />
                  <span>Yola düşdüm</span>
                </button>
              )}

              {order.status === 'in_transit' && (
                <button
                  onClick={handleSetDelivered}
                  disabled={isUpdating}
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition active:scale-[0.98]"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Çatdırıldı (Tamamla)</span>
                </button>
              )}

              {!showRejectConfirm && (
                <button
                  onClick={() => setShowRejectConfirm(true)}
                  className="py-3 px-3.5 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 hover:bg-rose-100 border border-rose-200 dark:border-rose-900 text-xs font-bold transition"
                >
                  İmtina edirəm
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
