import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  X,
  MapPin,
  User as UserIcon,
  Phone,
  FileText,
  Compass,
  Check,
  Search,
  AlertCircle,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { Customer, Order } from '../types';
import { Api } from '../lib/api';

interface OrderCreateModalProps {
  customers: Customer[];
  onClose: () => void;
  onOrderCreated: (order: Order) => void;
}

export const OrderCreateModal: React.FC<OrderCreateModalProps> = ({
  customers,
  onClose,
  onOrderCreated,
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState<number>(40.4093);
  const [lng, setLng] = useState<number>(49.8671);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Filtered customer list for live search dropdown
  const filteredCustomers = customers.filter((c) => {
    if (!customerName.trim()) return true;
    const query = customerName.toLowerCase();
    return (
      c.name.toLowerCase().includes(query) ||
      c.phone.includes(query) ||
      (c.address && c.address.toLowerCase().includes(query))
    );
  });

  const handleSelectCustomer = (c: Customer) => {
    setSelectedCustomerId(c.id);
    setCustomerName(c.name);
    setPhone(c.phone || '');
    setAddress(c.address || '');
    setIsDropdownOpen(false);

    if (c.location?.lat && c.location?.lng) {
      setLat(c.location.lat);
      setLng(c.location.lng);
      if (mapInstanceRef.current && markerRef.current) {
        mapInstanceRef.current.setView([c.location.lat, c.location.lng], 15);
        markerRef.current.setLatLng([c.location.lat, c.location.lng]);
      }
    }
  };

  // Get current device GPS location
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Brauzeriniz GPS konumunu dəstəkləmir.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const newLat = pos.coords.latitude;
        const newLng = pos.coords.longitude;
        setLat(newLat);
        setLng(newLng);
        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.setView([newLat, newLng], 16);
          markerRef.current.setLatLng([newLat, newLng]);
        }
      },
      (err) => {
        setIsLocating(false);
        console.warn('Geolocation error:', err);
        alert('Cari konum əldə edilə bilmədi: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Initialize Map with draggable pin
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: 13,
        zoomControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      const pinIcon = L.divIcon({
        className: 'order-create-pin',
        html: `
          <div style="background-color: #ef4444; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 4px 10px rgba(239, 68, 68, 0.5); border: 2.5px solid #fff;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      const marker = L.marker([lat, lng], {
        icon: pinIcon,
        draggable: true,
      }).addTo(map);

      marker.on('dragend', () => {
        const position = marker.getLatLng();
        setLat(position.lat);
        setLng(position.lng);
      });

      map.on('click', (e: L.LeafletMouseEvent) => {
        marker.setLatLng(e.latlng);
        setLat(e.latlng.lat);
        setLng(e.latlng.lng);
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;

      setTimeout(() => {
        map.invalidateSize();
      }, 200);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setErrorMsg('Zəhmət olmasa müştəri adını daxil edin və ya siyahıdan seçin.');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg('Müştərinin telefon nömrəsi qeyd olunmalıdır.');
      return;
    }
    if (!address.trim()) {
      setErrorMsg('Çatdırılma ünvanı qeyd olunmalıdır.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const created = await Api.createOrder({
        customerId: selectedCustomerId || undefined,
        customerName: customerName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        location: {
          lat,
          lng,
          addressText: address.trim(),
        },
        note: note.trim(),
      });

      onOrderCreated(created);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Sifariş yaradılarkən xəta baş verdi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/70 dark:bg-slate-900/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Yeni Sifariş Yarat
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sifariş yerləşdirildikdə bütün sürücülərə bildiriş gedəcək
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Customer Selection & Search Dropdown */}
          <div ref={dropdownRef} className="relative">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Müştəri Adı *</span>
              </label>
              {selectedCustomerId && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomerId('');
                    setCustomerName('');
                    setPhone('');
                    setAddress('');
                  }}
                  className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline"
                >
                  Təmizlə
                </button>
              )}
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                required
                value={customerName}
                onFocus={() => setIsDropdownOpen(true)}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  setSelectedCustomerId('');
                  setIsDropdownOpen(true);
                }}
                placeholder="Müştəri adını yazın və ya siyahıdan axtarın..."
                className="w-full pl-9 pr-9 py-2.5 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
              />
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Live Search Customer Dropdown List */}
            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden z-30 max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/60 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="p-2 bg-slate-50 dark:bg-slate-800/80 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Müştərilərin Siyahısı ({filteredCustomers.length})</span>
                  <span className="text-[10px] lowercase text-blue-600 font-medium">seçmək üçün toxunun</span>
                </div>

                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map((c) => (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => handleSelectCustomer(c)}
                      className={`w-full p-2.5 text-left hover:bg-blue-50 dark:hover:bg-blue-950/40 text-xs flex items-center justify-between transition ${
                        selectedCustomerId === c.id ? 'bg-blue-50/80 dark:bg-blue-950/60' : ''
                      }`}
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                          <span>{c.name}</span>
                          {c.hasActiveOrder && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                              aktiv sifariş
                            </span>
                          )}
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 text-[11px] truncate flex items-center gap-2 mt-0.5">
                          <span>{c.phone}</span>
                          {c.address && <span>• {c.address}</span>}
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-1.5">
                        {c.location ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 flex items-center gap-0.5">
                            <MapPin className="w-2.5 h-2.5" />
                            <span>Konum var</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Konum yox</span>
                        )}
                        {selectedCustomerId === c.id && (
                          <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">
                    <p className="font-semibold text-slate-700 dark:text-slate-300">
                      Müştəri tapılmadı
                    </p>
                    <p className="text-[11px] mt-1">
                      "{customerName}" adı ilə yeni müştəri kimi sifariş verə bilərsiniz.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Telefon Nömrəsi *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+994 50 123 45 67"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Çatdırılma Ünvanı *
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Məs: Nərimanov r., Təbriz küç. 45"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Map Location Picker */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <span>Xəritədə GPS nöqtəsi (Waze və kuryer üçün):</span>
              </label>
              <button
                type="button"
                onClick={handleGetCurrentLocation}
                disabled={isLocating}
                className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>{isLocating ? 'Alınır...' : 'Cari GPS nöqtəsi'}</span>
              </button>
            </div>
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner">
              <div ref={mapContainerRef} className="w-full h-44 z-0" />
              <div className="absolute bottom-2 left-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm text-[10px] font-mono px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 z-10 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{lat.toFixed(5)}, {lng.toFixed(5)}</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Dəqiq çatdırılma üçün pini xəritədə qapının ağzına qoya bilərsiniz.
            </p>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Sürücü üçün qeyd (istəyə bağlı):
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Məs: Blok 2, mərtəbə 5, qapı zəngi işləmir..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Submit Button: "Sifariş ver" */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Ləğv et
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 sm:flex-initial px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isSubmitting ? 'Sifariş verilir...' : 'Sifariş ver'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
