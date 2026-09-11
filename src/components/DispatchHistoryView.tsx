import React, { useState } from 'react';
import {
  History,
  MessageCircle,
  Clock,
  MapPin,
  Truck,
  Phone,
  ExternalLink,
  Route,
  CheckCircle2,
  Navigation,
} from 'lucide-react';
import { DispatchRecord } from '../types';
import { DispatchRouteModal } from './DispatchRouteModal';

interface DispatchHistoryViewProps {
  dispatches: DispatchRecord[];
}

export const DispatchHistoryView: React.FC<DispatchHistoryViewProps> = ({ dispatches }) => {
  const [selectedRecord, setSelectedRecord] = useState<DispatchRecord | null>(null);

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="pt-1">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Göndəriş & Çatdırılma Tarixçəsi
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Sürücülərin tamamladığı sifarişlər və keçdiyi GPS marşrut xətləri (Xəritədə baxmaq üçün klikləyin)
        </p>
      </div>

      {dispatches.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800">
          <History className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Hələlik heç bir göndəriş qeydə alınmayıb
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Sürücü sifarişi çatdırdıqda və ya müştərini WhatsApp-la göndərdikdə avtomatik burada qeyd olunacaq.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {dispatches.map((record) => {
            const dateObj = new Date(record.deliveredAt || record.timestamp);
            const dateStr = dateObj.toLocaleDateString('az-AZ', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            });
            const timeStr = dateObj.toLocaleTimeString('az-AZ', {
              hour: '2-digit',
              minute: '2-digit',
            });

            const hasRoute = (record.routePoints && record.routePoints.length > 0) || !!record.deliveredAt;

            return (
              <div
                key={record.id}
                onClick={() => setSelectedRecord(record)}
                className="p-4 bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-sm space-y-2.5 transition cursor-pointer group"
              >
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                      {record.customerName}
                    </span>
                    <span className="text-slate-400">→</span>
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5" />
                      {record.driverName}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {record.distanceKm ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900 flex items-center gap-1">
                        <Navigation className="w-2.5 h-2.5" />
                        {record.distanceKm} km
                      </span>
                    ) : null}

                    {hasRoute ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Çatdırıldı</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />
                        <span>WhatsApp</span>
                      </span>
                    )}
                  </div>
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

                {/* Timestamp & Map Link / Route button */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 pt-1">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>
                      {dateStr} • {timeStr}
                    </span>
                    {record.durationMinutes ? (
                      <span className="text-slate-500 font-medium">({record.durationMinutes} dəq)</span>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRecord(record);
                    }}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-500 font-semibold flex items-center gap-1 transition"
                  >
                    <Route className="w-3.5 h-3.5" />
                    <span>Marşrut Xəttinə Bax</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Polyline Route Modal */}
      {selectedRecord && (
        <DispatchRouteModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
        />
      )}
    </div>
  );
};
