import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Camera,
  Navigation,
  Map as MapIcon,
  Check,
  X,
  MapPin,
  Loader2,
  Trash2,
  UserCheck,
  AlertTriangle,
} from 'lucide-react';
import { Customer, CustomerLocation, User } from '../types';
import { getCurrentDeviceLocation, reverseGeocode } from '../lib/maps';
import { MapPickerModal } from './MapPickerModal';
import { Api } from '../lib/api';

interface CustomerFormModalProps {
  initialCustomer?: Customer | null;
  currentUser?: User | null;
  users?: User[];
  onSave: (data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'> & { userId?: string }) => Promise<void>;
  onClose: () => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
];

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  initialCustomer,
  currentUser,
  users: propUsers,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState(initialCustomer?.name || '');
  const [phone, setPhone] = useState(initialCustomer?.phone || '+994 ');
  const [address, setAddress] = useState(initialCustomer?.address || '');
  const [note, setNote] = useState(initialCustomer?.note || '');
  const [photoUrl, setPhotoUrl] = useState(initialCustomer?.photoUrl || '');
  const [location, setLocation] = useState<CustomerLocation | null>(
    initialCustomer?.location || null
  );
  const [ownerId, setOwnerId] = useState<string>(
    initialCustomer?.userId || currentUser?.id || ''
  );

  const [userList, setUserList] = useState<User[]>(propUsers || []);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [isGettingGps, setIsGettingGps] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOwnerConfirm, setShowOwnerConfirm] = useState(false);

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    if (isAdmin && (!propUsers || propUsers.length === 0)) {
      Api.getAdminUsers().then(setUserList).catch(console.error);
    } else if (propUsers) {
      setUserList(propUsers);
    }
  }, [isAdmin, propUsers]);

  const handleCurrentGps = async () => {
    setIsGettingGps(true);
    setError(null);
    try {
      const coords = await getCurrentDeviceLocation();
      const addr = await reverseGeocode(coords.lat, coords.lng);
      setLocation({
        lat: coords.lat,
        lng: coords.lng,
        addressText: addr,
      });
      if (!address) {
        setAddress(addr);
      }
    } catch (err: any) {
      setError(err.message || 'GPS yeri alına bilmədi.');
    } finally {
      setIsGettingGps(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError('Zəhmət olmasa Ad və Telefon nömrəsini daxil edin.');
      return;
    }

    // If admin changed owner on an existing customer, show confirmation dialog
    if (isAdmin && initialCustomer && ownerId && ownerId !== initialCustomer.userId) {
      setShowOwnerConfirm(true);
      return;
    }

    await doSave();
  };

  const doSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await onSave({
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        location,
        note: note.trim(),
        photoUrl: photoUrl.trim(),
        ...(isAdmin && ownerId ? { userId: ownerId } : {}),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Yadda saxlanarkən xəta baş verdi.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setPhotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-900/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in slide-in-from-bottom duration-200">
          {/* Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
            <button
              onClick={onClose}
              className="p-2 -ml-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {initialCustomer ? 'Müştərini redaktə et' : 'Yeni müştəri əlavə et'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 -mr-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleFormSubmit} className="p-5 overflow-y-auto space-y-5 flex-1">
            {error && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-xs">
                {error}
              </div>
            )}

            {/* Photo / Avatar Section */}
            <div className="flex flex-col items-center">
              <label className="relative cursor-pointer group">
                <div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-700 group-hover:border-blue-500 overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center transition shadow-inner">
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Camera className="w-7 h-7 text-slate-400 group-hover:text-blue-500 transition" />
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <span className="absolute bottom-0 right-0 p-1.5 bg-blue-600 text-white rounded-full shadow-md">
                  <Camera className="w-3.5 h-3.5" />
                </span>
              </label>
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                Şəkil (istəyə bağlı)
              </span>

              {/* Quick avatar selection */}
              <div className="flex items-center gap-1.5 mt-2">
                {PRESET_AVATARS.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPhotoUrl(url)}
                    className={`w-6 h-6 rounded-full overflow-hidden border transition ${
                      photoUrl === url ? 'ring-2 ring-blue-500 scale-110' : 'opacity-70'
                    }`}
                  >
                    <img src={url} alt="preset" className="w-full h-full object-cover" />
                  </button>
                ))}
                {photoUrl && (
                  <button
                    type="button"
                    onClick={() => setPhotoUrl('')}
                    title="Şəkli sil"
                    className="p-1 text-slate-400 hover:text-rose-500 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Ad və soyad *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Məs: Elvin Məmmədov"
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Telefon nömrəsi *
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+994 50 123 45 67"
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              />
            </div>

            {/* Sahibi (Owner) - Only for Admin */}
            {isAdmin && (
              <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/40 rounded-2xl border border-blue-100 dark:border-blue-900/50 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <label className="text-xs font-bold text-blue-900 dark:text-blue-200">
                    Sahibi (Müştəri mənsubiyyəti):
                  </label>
                </div>
                <select
                  value={ownerId}
                  onChange={(e) => setOwnerId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 rounded-xl text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                >
                  {userList
                    .filter((u) => u.status === 'active' && u.role !== 'driver')
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} {u.id === initialCustomer?.userId ? '(Hazırkı sahibi)' : ''}
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-blue-700/80 dark:text-blue-400">
                  {initialCustomer
                    ? 'Sahibi dəyişdirdikdə təsdiq pəncərəsi göstəriləcək və loglara yazılacaq.'
                    : 'Müştərinin mənsub olacağı istifadəçini təyin edin.'}
                </p>
              </div>
            )}

            {/* Location Section */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Konum
              </label>

              {/* 2 Big comfortable buttons matching Mockup #3 */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleCurrentGps}
                  disabled={isGettingGps}
                  className="py-3 px-3 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded-xl flex flex-col items-center justify-center gap-1.5 text-xs font-semibold transition"
                >
                  {isGettingGps ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Navigation className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  )}
                  <span>Hazırkı konumumu tap</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowMapPicker(true)}
                  className="py-3 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-xl flex flex-col items-center justify-center gap-1.5 text-xs font-semibold transition"
                >
                  <MapIcon className="w-5 h-5 text-indigo-500" />
                  <span>Xəritədən seç</span>
                </button>
              </div>

              {/* Selected Location Pill */}
              {location && (
                <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <div className="text-xs font-mono font-bold text-emerald-800 dark:text-emerald-300">
                        {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                      </div>
                      {location.addressText && (
                        <div className="text-[11px] text-emerald-700 dark:text-emerald-400 truncate max-w-[220px]">
                          {location.addressText}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLocation(null)}
                    className="p-1 text-slate-400 hover:text-rose-500 transition"
                    title="Konumu sil"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Ünvan (mətn)
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Məs: Bakı, Binəqədi rayonu, 8-ci mikrorayon"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
              />
            </div>

            {/* Note */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Qeyd (istəyə bağlı)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Məs: Müştəri VIP-dir, qapı kodu 45"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition resize-none"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Saxla</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Owner Change Confirmation Modal (Requirement 4) */}
      {showOwnerConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <div className="text-xs font-semibold">
                Müştərinin sahibini dəyişmək istəyirsiniz?
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-1.5 text-xs">
              <div>
                <span className="text-slate-400">Müştəri: </span>
                <span className="font-bold text-slate-900 dark:text-white">{name}</span>
              </div>
              <div className="flex items-center gap-2 pt-1 border-t border-slate-200 dark:border-slate-700/40">
                <span className="line-through text-slate-400">
                  {userList.find((u) => u.id === initialCustomer?.userId)?.name || 'Köhnə sahib'}
                </span>
                <span className="text-slate-400 font-bold">→</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {userList.find((u) => u.id === ownerId)?.name || 'Yeni sahib'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowOwnerConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                İmtina
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowOwnerConfirm(false);
                  await doSave();
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/20 transition cursor-pointer"
              >
                Sahibi dəyiş
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Map Picker Modal */}
      {showMapPicker && (
        <MapPickerModal
          initialLocation={location}
          onSelectLocation={(loc) => {
            setLocation(loc);
            if (!address && loc.addressText) {
              setAddress(loc.addressText);
            }
          }}
          onClose={() => setShowMapPicker(false)}
        />
      )}
    </>
  );
};
