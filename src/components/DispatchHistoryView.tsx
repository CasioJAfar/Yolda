import React from 'react';
import { History, MessageCircle, Clock, MapPin, Truck, Phone, ExternalLink } from 'lucide-react';
import { DispatchRecord } from '../types';

interface DispatchHistoryViewProps {
  dispatches: DispatchRecord[];
}

export const DispatchHistoryView: React.FC<DispatchHistoryViewProps> = ({ dispatches }) => {
  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="pt-1">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Göndəriş Tarixçəsi
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Sürücülərə WhatsApp vasitəsilə göndərilən bütün tapşırıqlar
        </p>
      </div>

      {dispatches.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800">
          <History className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Hələlik heç bir göndəriş qeydə alınmayıb
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Müştərini seçib "Sürücüyə WhatsApp-la göndər" düyməsinə basdıqda avtomatik qeyd olunacaq.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {dispatches.map((record) => {
            const dateObj = new Date(record.timestamp);
            const dateStr = dateObj.toLocaleDateString('az-AZ', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            });
            const timeStr = dateObj.toLocaleTimeString('az-AZ', {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={record.id}
                className="p-4 bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-sm space-y-2.5"
              >
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {record.customerName}
                    </span>
                    <span className="text-slate-400">→</span>
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5" />
                      {record.driverName}
                    </span>
                  </div>

                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" />
                    <span>WhatsApp</span>
                  </span>
                </div>

                {/* Details */}
                <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl space-y-1">
                  <div className="truncate">
                    📍 {record.customerAddress || 'Ünvan qeyd edilməyib'}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-800">
                    <span className="font-mono">Müştəri: {record.customerPhone}</span>
                    <span className="font-mono">Sürücü: {record.driverPhone}</span>
                  </div>
                </div>

                {/* Timestamp & Map link */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 pt-1">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {dateStr} • {timeStr}
                    </span>
                  </div>

                  {record.locationUrl && (
                    <a
                      href={record.locationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <MapPin className="w-3 h-3" />
                      <span>Konuma keç</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
