import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  X,
  MapPin,
  Truck,
  Clock,
  Navigation,
  Route,
  CheckCircle2,
  Phone,
  MessageCircle,
} from 'lucide-react';
import { DispatchRecord } from '../types';

interface DispatchRouteModalProps {
  record: DispatchRecord;
  onClose: () => void;
}

export const DispatchRouteModal: React.FC<DispatchRouteModalProps> = ({
  record,
  onClose,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const routePoints = record.routePoints || [];
  const hasRoutePoints = routePoints.length > 0;

  // Extract customer destination coordinates
  const customerCoords = record.customerLocation || {
    lat: 40.4093,
    lng: 49.8671,
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialCenter: [number, number] = hasRoutePoints
        ? [routePoints[0].lat, routePoints[0].lng]
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

      // 1. Destination Marker (Customer address)
      const destIcon = L.divIcon({
        className: 'custom-dest-pin',
        html: `
          <div style="width: 32px; height: 32px; background: #ef4444; border: 3px solid #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 4px 10px rgba(0,0,0,0.35);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const destMarker = L.marker([customerCoords.lat, customerCoords.lng], {
        icon: destIcon,
      }).addTo(map);

      destMarker.bindPopup(`
        <div style="font-family: sans-serif;">
          <div style="font-weight: bold; font-size: 13px; color: #0f172a;">🎯 Çatdırılma Ünvanı</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">${record.customerName}</div>
          <div style="font-size: 11px; color: #0f172a; margin-top: 2px;">📍 ${record.customerAddress || ''}</div>
        </div>
      `);

      // 2. Traveled Route Polyline
      if (hasRoutePoints) {
        const latLngs: [number, number][] = routePoints.map((p) => [p.lat, p.lng]);

        // Draw Polyline
        const poly = L.polyline(latLngs, {
          color: '#2563eb',
          weight: 5,
          opacity: 0.9,
          lineJoin: 'round',
          lineCap: 'round',
        }).addTo(map);

        // Start Marker (First recorded GPS point)
        const startIcon = L.divIcon({
          className: 'custom-start-pin',
          html: `
            <div style="width: 30px; height: 30px; background: #10b981; border: 3px solid #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
          `,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });

        const startMarker = L.marker(latLngs[0], { icon: startIcon }).addTo(map);
        startMarker.bindPopup(`
          <div style="font-family: sans-serif;">
            <div style="font-weight: bold; font-size: 12px; color: #059669;">🚀 Başlanğıc Nöqtəsi</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Sürücü yola çıxdı</div>
          </div>
        `);

        // End / Delivered Marker
        const endIcon = L.divIcon({
          className: 'custom-end-pin',
          html: `
            <div style="width: 30px; height: 30px; background: #059669; border: 3px solid #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
          `,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });

        const endMarker = L.marker(latLngs[latLngs.length - 1], { icon: endIcon }).addTo(map);
        endMarker.bindPopup(`
          <div style="font-family: sans-serif;">
            <div style="font-weight: bold; font-size: 12px; color: #059669;">🏁 Təhvil Verildi</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Sifariş tamamlandı</div>
          </div>
        `);

        // Fit bounds to polyline
        map.fitBounds(poly.getBounds(), { padding: [50, 50], maxZoom: 16 });
      } else {
        map.setView([customerCoords.lat, customerCoords.lng], 15);
      }

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [record.id, hasRoutePoints]);

  const dateObj = new Date(record.deliveredAt || record.timestamp);
  const formattedDate = dateObj.toLocaleDateString('az-AZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const formattedTime = dateObj.toLocaleTimeString('az-AZ', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/70 dark:bg-slate-900/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Route className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Çatdırılma Marşrut Xətti
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Tamamlanıb
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {record.customerName} • Sürücü: {record.driverName}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Map Display */}
        <div className="relative w-full h-[380px] sm:h-[420px] bg-slate-100 dark:bg-slate-800">
          <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

          {!hasRoutePoints && (
            <div className="absolute top-3 right-3 z-10 p-2.5 rounded-xl bg-amber-500/90 text-white text-xs font-medium shadow-md backdrop-blur-sm flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Bu göndəriş WhatsApp ilə aparılıb (GPS xətti qeyd olunmayıb)</span>
            </div>
          )}
        </div>

        {/* Bottom Details & Statistics */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Məsafə
              </span>
              <span className="text-sm font-black text-slate-900 dark:text-white">
                {record.distanceKm ? `${record.distanceKm} km` : hasRoutePoints ? '~2.5 km' : '—'}
              </span>
            </div>

            <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Müddət
              </span>
              <span className="text-sm font-black text-slate-900 dark:text-white">
                {record.durationMinutes ? `${record.durationMinutes} dəq` : '—'}
              </span>
            </div>

            <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                GPS Nöqtələri
              </span>
              <span className="text-sm font-black text-slate-900 dark:text-white">
                {routePoints.length > 0 ? `${routePoints.length} nöqtə` : '1'}
              </span>
            </div>

            <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Tarix & Saat
              </span>
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {formattedDate} {formattedTime}
              </span>
            </div>
          </div>

          {/* Customer & Driver row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2 truncate">
              <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span className="truncate">Ünvan: {record.customerAddress || 'Qeyd edilməyib'}</span>
            </div>

            <div className="flex items-center gap-2 shrink-0 font-medium">
              <Truck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span>Sürücü: {record.driverName} ({record.driverPhone})</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
