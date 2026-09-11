import React, { useState } from 'react';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Phone,
  MessageCircle,
  MapPin,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Navigation,
  Compass,
  Clock,
  Send,
  UserCheck,
} from 'lucide-react';
import { Customer, DispatchRecord, Driver, User } from '../types';
import { openPlatformMap, getGoogleMapsUrl } from '../lib/maps';
import { openWazeNavigation } from '../lib/waze';
import { ConfirmModal } from './ConfirmModal';
import { WazeFallbackModal } from './WazeFallbackModal';
import { ChangeOwnerModal } from './ChangeOwnerModal';
import { Api } from '../lib/api';

interface CustomerDetailModalProps {
  customer: Customer;
  drivers: Driver[];
  dispatches: DispatchRecord[];
  user?: User | null;
  allUsers?: User[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpenSendToDriver: () => void;
  onOwnerChanged?: (updatedCustomer: Customer) => void;
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  customer: initialCustomer,
  dispatches,
  user,
  allUsers: propUsers,
  onClose,
  onEdit,
  onDelete,
  onOpenSendToDriver,
  onOwnerChanged,
}) => {
  const [customer, setCustomer] = useState<Customer>(initialCustomer);
  const [copiedLocation, setCopiedLocation] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showWazeFallback, setShowWazeFallback] = useState(false);
  const [isChangeOwnerOpen, setIsChangeOwnerOpen] = useState(false);
  const [userList, setUserList] = useState<User[]>(propUsers || []);

  const isAdmin = user?.role === 'admin';
  const canEdit = user?.permissions?.canEditCustomers !== false;
  const canDelete = user?.permissions?.canDeleteCustomers !== false;
  const canSendWhatsApp = user?.permissions?.canSendWhatsApp !== false;
  const canOpenMap = user?.permissions?.canOpenMap !== false;

  React.useEffect(() => {
    setCustomer(initialCustomer);
  }, [initialCustomer]);

  React.useEffect(() => {
    if (isAdmin && (!propUsers || propUsers.length === 0)) {
      Api.getAdminUsers().then(setUserList).catch(console.error);
    } else if (propUsers) {
      setUserList(propUsers);
    }
  }, [isAdmin, propUsers]);

  const handleSaveNewOwner = async (customerId: string, newOwnerId: string) => {
    const updated = await Api.updateCustomerOwner(customerId, newOwnerId);
    setCustomer(updated);
    if (onOwnerChanged) {
      onOwnerChanged(updated);
    }
  };

  // Filter history for this customer
  const customerHistory = dispatches.filter((dp) => dp.customerId === customer.id);

  const handleCopyLocation = () => {
    if (!customer.location) return;
    const text = `${customer.location.lat}, ${customer.location.lng}`;
    navigator.clipboard.writeText(text);
    setCopiedLocation(true);
    setTimeout(() => setCopiedLocation(false), 2000);
  };

  const handleOpenWaze = () => {
    if (!customer.location) return;
    openWazeNavigation(customer.location.lat, customer.location.lng, () => {
      setShowWazeFallback(true);
    });
  };

  const handleOpenMap = () => {
    if (!customer.location) return;
    openPlatformMap(customer.location.lat, customer.location.lng);
  };

  return (
    <div className="fixed inset-0 z-40 bg-slate-900/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
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
            Müştəri detalları
          </h2>
          {canEdit && (
            <button
              onClick={onEdit}
              className="p-2 -mr-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Redaktə et"
            >
              <Edit className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Customer Avatar & Name Card */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold text-xl overflow-hidden shadow-md shrink-0">
              {customer.photoUrl ? (
                <img
                  src={customer.photoUrl}
                  alt={customer.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                customer.name.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {customer.name}
              </h3>
              <div className="mt-1">
                {customer.location ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                    <MapPin className="w-3 h-3" />
                    <span>Konum var</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    <span>Konum yoxdur</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Info Details List */}
          <div className="space-y-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 text-xs">
            {/* Phone */}
            <div>
              <span className="text-slate-400 dark:text-slate-500 font-medium">Telefon</span>
              <div className="mt-0.5 font-semibold text-slate-900 dark:text-white text-sm font-mono flex items-center justify-between">
                <span>{customer.phone}</span>
                <a
                  href={`tel:${customer.phone}`}
                  className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Zəng</span>
                </a>
              </div>
            </div>

            {/* Address */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60">
              <span className="text-slate-400 dark:text-slate-500 font-medium">Ünvan</span>
              <div className="mt-0.5 font-medium text-slate-800 dark:text-slate-200">
                {customer.address || 'Ünvan daxil edilməyib'}
              </div>
            </div>

            {/* Note */}
            {customer.note && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60">
                <span className="text-slate-400 dark:text-slate-500 font-medium">Qeyd</span>
                <div className="mt-0.5 text-slate-700 dark:text-slate-300">
                  {customer.note}
                </div>
              </div>
            )}

            {/* Owner Section (Requirement 1, 4, 5) */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
              <div>
                <span className="text-slate-400 dark:text-slate-500 font-medium">Sahibi</span>
                <div className="mt-0.5 font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-blue-500" />
                  <span>{customer.userOwnerName || 'Naməlum'}</span>
                </div>
              </div>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setIsChangeOwnerOpen(true)}
                  className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-300 rounded-lg text-xs font-semibold border border-blue-200 dark:border-blue-800 transition cursor-pointer"
                >
                  Sahibini dəyiş
                </button>
              )}
            </div>
          </div>

          {/* Map Preview Box (Mockup #6 style) */}
          {customer.location && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-blue-500" />
                  <span>Dəqiq GPS Konumu</span>
                </span>
                <button
                  type="button"
                  onClick={handleCopyLocation}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  {copiedLocation ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLocation ? 'Kopyalandı' : 'Konumu kopyala'}</span>
                </button>
              </div>

              {/* Visual Map preview card */}
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 h-36 flex flex-col items-center justify-center">
                {/* Visual map background pattern */}
                <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px]" />

                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-rose-500 text-white shadow-lg flex items-center justify-center animate-bounce mb-1">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 bg-white/90 dark:bg-slate-900/90 px-2 py-0.5 rounded-md shadow-sm border border-slate-200 dark:border-slate-700">
                    {customer.location.lat.toFixed(5)}, {customer.location.lng.toFixed(5)}
                  </span>
                </div>

                {/* Waze Navigation Button Overlay */}
                <button
                  type="button"
                  onClick={handleOpenWaze}
                  className="absolute bottom-2.5 right-2.5 z-10 px-3.5 py-2 bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-sky-500/30 flex items-center gap-2 transition active:scale-95 cursor-pointer"
                  title="Waze ilə get"
                >
                  <Compass className="w-4 h-4 text-white" />
                  <span>Waze ilə get</span>
                </button>
              </div>
            </div>
          )}

          {/* Dispatch History for this Customer */}
          <div>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-2">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Sürücüyə göndərmə tarixçəsi</span>
            </span>

            {customerHistory.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                Bu müştəri hələ heç bir sürücüyə göndərilməyib.
              </div>
            ) : (
              <div className="space-y-2">
                {customerHistory.map((hist) => (
                  <div
                    key={hist.id}
                    className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        Sürücü: {hist.driverName}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {new Date(hist.timestamp).toLocaleDateString('az-AZ')} •{' '}
                        {new Date(hist.timestamp).toLocaleTimeString('az-AZ', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      WhatsApp ilə göndərildi
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions (Matching Mockup #6) */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 space-y-2 shrink-0">
          {canSendWhatsApp && (
            <button
              onClick={onOpenSendToDriver}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition"
            >
              <MessageCircle className="w-5 h-5" />
              <span>Sürücüyə WhatsApp-la göndər</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <a
              href={`tel:${customer.phone}`}
              className="flex-1 py-2.5 px-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition"
            >
              <Phone className="w-4 h-4" />
              <span>Zəng et</span>
            </a>

            {canEdit && (
              <button
                onClick={onEdit}
                className="flex-1 py-2.5 px-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition"
              >
                <Edit className="w-4 h-4" />
                <span>Redaktə et</span>
              </button>
            )}

            {canDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex-1 py-2.5 px-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition"
              >
                <Trash2 className="w-4 h-4" />
                <span>Sil</span>
              </button>
            )}
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={showDeleteConfirm}
          title="Müştərini silmək istəyirsiniz?"
          description={`"${customer.name}" adlı müştəri silinəcək və Zibil qutusuna göndəriləcək.`}
          confirmText="Sil"
          cancelText="İmtina"
          variant="danger"
          onConfirm={() => {
            setShowDeleteConfirm(false);
            onDelete();
          }}
          onClose={() => setShowDeleteConfirm(false)}
        />

        {/* Waze Fallback Modal */}
        {customer.location && (
          <WazeFallbackModal
            isOpen={showWazeFallback}
            onClose={() => setShowWazeFallback(false)}
            lat={customer.location.lat}
            lng={customer.location.lng}
            customerName={customer.name}
            address={customer.address}
          />
        )}

        {/* Admin: Change Customer Owner Modal (Requirement 1, 4, 5) */}
        {isAdmin && (
          <ChangeOwnerModal
            isOpen={isChangeOwnerOpen}
            customer={customer}
            users={userList}
            currentUserId={user?.id || ''}
            onClose={() => setIsChangeOwnerOpen(false)}
            onSave={handleSaveNewOwner}
          />
        )}
      </div>
    </div>
  );
};
