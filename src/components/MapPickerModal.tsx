import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Search, Crosshair, MapPin, Check, Loader2 } from 'lucide-react';
import L from 'leaflet';
import { CustomerLocation } from '../types';
import { DEFAULT_MAP_CENTER, getCurrentDeviceLocation, reverseGeocode } from '../lib/maps';

interface MapPickerModalProps {
  initialLocation: CustomerLocation | null;
  onSelectLocation: (loc: CustomerLocation) => void;
  onClose: () => void;
}

export const MapPickerModal: React.FC<MapPickerModalProps> = ({
  initialLocation,
  onSelectLocation,
  onClose,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>({
    lat: initialLocation?.lat || DEFAULT_MAP_CENTER.lat,
    lng: initialLocation?.lng || DEFAULT_MAP_CENTER.lng,
  });

  const [addressText, setAddressText] = useState<string>(
    initialLocation?.addressText || 'Bakı, Binəqədi rayonu'
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isGpsLocating, setIsGpsLocating] = useState(false);

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Custom red pin icon
    const customIcon = L.divIcon({
      className: 'custom-map-pin',
      html: `
        <div style="transform: translate(-50%, -100%); display: flex; flex-direction: column; align-items: center;">
          <div style="background-color: #EF4444; width: 34px; height: 34px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border: 2.5px solid white;">
            <div style="width: 10px; height: 10px; background-color: white; border-radius: 50%;"></div>
          </div>
          <div style="width: 10px; height: 4px; background: rgba(0,0,0,0.3); border-radius: 50%; margin-top: 2px;"></div>
        </div>
      `,
      iconSize: [34, 42],
      iconAnchor: [17, 42],
    });

    const initialLat = initialLocation?.lat || DEFAULT_MAP_CENTER.lat;
    const initialLng = initialLocation?.lng || DEFAULT_MAP_CENTER.lng;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 14,
      zoomControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker([initialLat, initialLng], {
      icon: customIcon,
      draggable: true,
    }).addTo(map);

    markerRef.current = marker;
    mapInstanceRef.current = map;

    // When map is clicked, move marker
    map.on('click', async (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      setCurrentCoords({ lat, lng });
      const addr = await reverseGeocode(lat, lng);
      setAddressText(addr);
    });

    // When marker is dragged
    marker.on('dragend', async () => {
      const pos = marker.getLatLng();
      setCurrentCoords({ lat: pos.lat, lng: pos.lng });
      const addr = await reverseGeocode(pos.lat, pos.lng);
      setAddressText(addr);
    });

    // Invalidate size after layout completes
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 300);

    return () => {
      clearTimeout(timer);
      map.remove();
    };
  }, []);

  const handleGetCurrentLocation = async () => {
    setIsGpsLocating(true);
    try {
      const coords = await getCurrentDeviceLocation();
      setCurrentCoords(coords);
      if (mapInstanceRef.current && markerRef.current) {
        mapInstanceRef.current.flyTo([coords.lat, coords.lng], 16);
        markerRef.current.setLatLng([coords.lat, coords.lng]);
      }
      const addr = await reverseGeocode(coords.lat, coords.lng);
      setAddressText(addr);
    } catch (err: any) {
      alert(err.message || 'GPS yeri alına bilmədi.');
    } finally {
      setIsGpsLocating(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery + ' Azerbaijan'
        )}&limit=1`
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const item = data[0];
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lon);
        setCurrentCoords({ lat, lng });
        setAddressText(item.display_name.split(',').slice(0, 3).join(', '));

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.flyTo([lat, lng], 16);
          markerRef.current.setLatLng([lat, lng]);
        }
      } else {
        alert('Bu ünvan tapılmadı. Xəritədə nöqtəni əl ilə seçə bilərsiniz.');
      }
    } catch (err) {
      alert('Axtarışda xəta baş verdi.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleConfirm = () => {
    onSelectLocation({
      lat: currentCoords.lat,
      lng: currentCoords.lng,
      addressText: addressText,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 h-full sm:h-[90vh] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 z-10">
          <button
            onClick={onClose}
            className="p-2 -ml-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Xəritədən konum seç
          </h2>
          <div className="w-8" />
        </div>

        {/* Search bar over map */}
        <div className="p-3 bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 z-10">
          <form onSubmit={handleSearch} className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ünvan və ya yer axtar..."
                className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center shrink-0"
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Axtar'}
            </button>
          </form>
        </div>

        {/* Map Stage */}
        <div className="relative flex-1 w-full bg-slate-100 dark:bg-slate-800">
          <div ref={mapContainerRef} className="w-full h-full z-0" />

          {/* Current GPS button overlay */}
          <button
            onClick={handleGetCurrentLocation}
            disabled={isGpsLocating}
            title="Hazırkı konumumu göstər"
            className="absolute right-4 bottom-4 z-10 w-12 h-12 rounded-full bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:scale-105 active:scale-95 transition"
          >
            {isGpsLocating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Crosshair className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Bottom Details & Confirmation */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-10 space-y-3">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Seçilmiş konum
            </span>
            <div className="flex items-center gap-2 mt-1">
              <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
              <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                {currentCoords.lat.toFixed(5)}, {currentCoords.lng.toFixed(5)}
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 truncate">
              {addressText}
            </p>
          </div>

          <button
            onClick={handleConfirm}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition"
          >
            <Check className="w-4 h-4" />
            <span>Bu konumu seç</span>
          </button>
        </div>
      </div>
    </div>
  );
};
