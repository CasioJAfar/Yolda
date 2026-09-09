import React, { useState } from 'react';
import {
  ArrowLeft,
  X,
  Send,
  Copy,
  Check,
  Truck,
  ExternalLink,
  MessageCircle,
  AlertCircle,
} from 'lucide-react';
import { Customer, Driver } from '../types';
import { formatWhatsAppMessage, openWhatsApp } from '../lib/whatsapp';
import { Api } from '../lib/api';

interface SendToDriverModalProps {
  customer: Customer;
  drivers: Driver[];
  onClose: () => void;
  onDispatchSuccess?: () => void;
}

export const SendToDriverModal: React.FC<SendToDriverModalProps> = ({
  customer,
  drivers,
  onClose,
  onDispatchSuccess,
}) => {
  const [selectedDriverId, setSelectedDriverId] = useState<string>(
    drivers[0]?.id || ''
  );
  const [copied, setCopied] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const selectedDriver = drivers.find((d) => d.id === selectedDriverId);
  const formattedMessage = formatWhatsAppMessage(customer, selectedDriver?.name);

  const handleSendWhatsApp = async () => {
    setIsSending(true);

    try {
      // 1. Open WhatsApp
      const recipientPhone = selectedDriver ? selectedDriver.phone : '';
      openWhatsApp(recipientPhone, formattedMessage);

      // 2. Record dispatch in database / history
      await Api.recordDispatch({
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerAddress: customer.address,
        driverId: selectedDriver?.id || 'none',
        driverName: selectedDriver?.name || 'Ümumi WhatsApp',
        driverPhone: selectedDriver?.phone || '',
        locationUrl: customer.location
          ? `https://waze.com/ul?ll=${customer.location.lat},${customer.location.lng}&navigate=yes`
          : '',
        messageText: formattedMessage,
      });

      if (onDispatchSuccess) {
        onDispatchSuccess();
      }
    } catch (err) {
      console.error('Error logging dispatch', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(formattedMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
          <button
            onClick={onClose}
            className="p-2 -ml-2 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Sürücüyə göndər
          </h2>
          <button
            onClick={onClose}
            className="p-2 -mr-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* Customer Summary Card */}
          <div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">
              Müştəri
            </span>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 overflow-hidden flex items-center justify-center font-bold text-sm shrink-0">
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
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-slate-900 dark:text-white text-sm truncate">
                  {customer.name}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  {customer.phone}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400 truncate mt-0.5">
                  {customer.address || 'Ünvan daxil edilməyib'}
                </div>
              </div>
            </div>
          </div>

          {/* Drivers List (Radio Selection) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Sürücü seçin
              </span>
              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                {drivers.filter((d) => d.status === 'active').length} aktiv sürücü
              </span>
            </div>

            {drivers.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 dark:bg-slate-800 rounded-xl">
                Qeydiyyatdan keçmiş sürücü yoxdur. Birbaşa WhatsApp-da paylaşa bilərsiniz.
              </div>
            ) : (
              <div className="space-y-2">
                {drivers.map((driver) => {
                  const isSelected = selectedDriverId === driver.id;
                  return (
                    <label
                      key={driver.id}
                      onClick={() => setSelectedDriverId(driver.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                        isSelected
                          ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 dark:border-blue-500 shadow-sm'
                          : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-300 shrink-0">
                          {driver.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                            {driver.name}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                            {driver.phone}
                          </div>
                          {driver.note && (
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                              {driver.note}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="ml-3 shrink-0">
                        <input
                          type="radio"
                          name="driver"
                          checked={isSelected}
                          onChange={() => setSelectedDriverId(driver.id)}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* WhatsApp Message Live Preview (Mockup #7 Style) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Hazır WhatsApp Mesajı
              </span>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Kopyalandı' : 'Kopyala'}</span>
              </button>
            </div>

            {/* Chat Bubble container */}
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl font-sans text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed relative shadow-sm">
              {formattedMessage}

              <div className="mt-2 text-right text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                ✓✓ Avtomatik formalaşdırılıb
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 space-y-2 shrink-0">
          <button
            onClick={handleSendWhatsApp}
            disabled={isSending}
            className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition"
          >
            <MessageCircle className="w-5 h-5" />
            <span>
              {selectedDriver
                ? `${selectedDriver.name} ilə WhatsApp-da aç`
                : 'WhatsApp ilə göndər'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleCopyMessage}
            className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs rounded-xl flex items-center justify-center gap-2 transition"
          >
            <Copy className="w-4 h-4" />
            <span>{copied ? 'Mesaj kopyalandı!' : 'Mesaj mətini kopyala'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
