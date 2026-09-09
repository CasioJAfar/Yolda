import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin, Navigation, Search, MessageCircle, Phone, ExternalLink, Compass } from 'lucide-react';
import { Customer } from '../types';
import { DEFAULT_MAP_CENTER, openPlatformMap } from '../lib/maps';
import { openWazeNavigation } from '../lib/waze';
import { WazeFallbackModal } from './WazeFallbackModal';

interface AllCustomersMapViewProps {
  customers: Customer[];
  onSelectCustomer: (customer: Customer) => void;
  onSendToDriver: (customer: Customer) => void;
}

export const AllCustomersMapView: React.FC<AllCustomersMapViewProps> = ({
  customers,
  onSelectCustomer,
  onSendToDriver,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPinCustomer, setSelectedPinCustomer] = useState<Customer | null>(null);
  const [wazeFallbackCustomer, setWazeFallbackCustomer] = useState<Customer | null>(null);

  const handleWaze = (target: Customer) => {
    if (!target.location) return;
    openWazeNavigation(target.location.lat, target.location.lng, () => {
      setWazeFallbackCustomer(target);
    });
  };

  const customersWithLocation = customers.filter((c) => !!c.location);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    const initialCenter =
      customersWithLocation[0]?.location
        ? [customersWithLocation[0].location.lat, customersWithLocation[0].location.lng]
        : [DEFAULT_MAP_CENTER.lat, DEFAULT_MAP_CENTER.lng];

    const map = L.map(mapContainerRef.current, {
      center: initialCenter as L.LatLngExpression,
      zoom: 12,
      zoomControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    // Add markers for all customers
    const markers: L.Marker[] = [];

    customersWithLocation.forEach((customer) => {
      if (!customer.location) return;

      const customIcon = L.divIcon({
        className: 'customer-map-pin',
        html: `
          <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer;">
            <div style="background-color: #2563EB; color: white; padding: 3px 8px; border-radius: 8px; font-size: 11px; font-weight: bold; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.3); margin-bottom: 2px;">
              ${customer.name}
            </div>
            <div style="background-color: #10B981; width: 22px; height: 22px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 8px rgba(0,0,0,0.3); border: 2px solid white;">
              <div style="width: 6px; height: 6px; background-color: white; border-radius: 50%;"></div>
            </div>
          </div>
        `,
        iconSize: [80, 50],
        iconAnchor: [40, 50],
      });

      const marker = L.marker([customer.location.lat, customer.location.lng], {
        icon: customIcon,
      }).addTo(map);

      marker.on('click', () => {
        setSelectedPinCustomer(customer);
        map.flyTo([customer.location!.lat, customer.location!.lng], 15);
      });

      markers.push(marker);
    });

    // If multiple markers exist, fit bounds
    if (markers.length > 1) {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.2));
    }

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(timer);
      map.remove();
    };
  }, [customersWithLocation.length]);

  const handleFocusCustomer = (customer: Customer) => {
    if (!customer.location || !mapInstanceRef.current) return;
    setSelectedPinCustomer(customer);
    mapInstanceRef.current.flyTo([customer.location.lat, customer.location.lng], 16);
  };

  return (
    <div className="space-y-3 pb-20">
      {/* Header & stats */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Müştərilər Xəritədə
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {customersWithLocation.length} müştərinin dəqiq GPS koordinatları var
          </p>
        </div>
      </div>

      {/* Quick customer selection buttons - Responsive grid/wrap (Zero horizontal scrolling!) */}
      {customersWithLocation.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 max-h-36 overflow-y-auto pr-1">
          {customersWithLocation.map((c) => (
            <button
              key={c.id}
              onClick={() => handleFocusCustomer(c)}
              className={`w-full py-2 px-2.5 rounded-xl text-xs font-semibold truncate transition flex items-center justify-center gap-1.5 border ${
                selectedPinCustomer?.id === c.id
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60'
              }`}
              title={c.name}
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="truncate">{c.name}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="text-xs text-slate-400 dark:text-slate-500 py-1">
          Xəritədə göstəriləcək GPS konumu olan müştəri yoxdur.
        </div>
      )}

      {/* Map Container */}
      <div className="relative w-full h-[60vh] sm:h-[68vh] rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Selected Customer Overlay Card */}
        {selectedPinCustomer && (
          <div className="absolute left-4 right-4 bottom-4 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl max-w-md mx-auto animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">
                  {selectedPinCustomer.name.charAt(0).toUpperCase()}
                </div>
                <div className="truncate">
                  <div className="font-bold text-slate-900 dark:text-white text-xs truncate">
                    {selectedPinCustomer.name}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    {selectedPinCustomer.phone}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedPinCustomer(null)}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 truncate mb-3">
              📍 {selectedPinCustomer.address || 'Ünvan qeyd edilməyib'}
            </p>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleWaze(selectedPinCustomer)}
                className="py-2 px-2 bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1 shadow-sm transition active:scale-95 cursor-pointer"
                title="Waze ilə get"
              >
                <Compass className="w-3.5 h-3.5" />
                <span className="truncate">Waze ilə get</span>
              </button>

              <button
                type="button"
                onClick={() => onSendToDriver(selectedPinCustomer)}
                className="py-2 px-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span className="truncate">Sürücü</span>
              </button>

              <button
                type="button"
                onClick={() => onSelectCustomer(selectedPinCustomer)}
                className="py-2 px-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition"
              >
                <span className="truncate">Detallar</span>
              </button>
            </div>
          </div>
        )}

        {/* Waze Fallback Modal */}
        {wazeFallbackCustomer?.location && (
          <WazeFallbackModal
            isOpen={Boolean(wazeFallbackCustomer)}
            onClose={() => setWazeFallbackCustomer(null)}
            lat={wazeFallbackCustomer.location.lat}
            lng={wazeFallbackCustomer.location.lng}
            customerName={wazeFallbackCustomer.name}
            address={wazeFallbackCustomer.address}
          />
        )}
      </div>
    </div>
  );
};
