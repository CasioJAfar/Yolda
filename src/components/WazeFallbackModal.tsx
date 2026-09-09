import React from 'react';
import { Compass, ExternalLink, MapPin, X, AlertTriangle } from 'lucide-react';
import { getWazeUrl, getAlternativeMapUrl } from '../lib/waze';

interface WazeFallbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  lat: number;
  lng: number;
  customerName?: string;
  address?: string;
}

export const WazeFallbackModal: React.FC<WazeFallbackModalProps> = ({
  isOpen,
  onClose,
  lat,
  lng,
  customerName,
  address,
}) => {
  if (!isOpen) return null;

  const wazeWebUrl = getWazeUrl(lat, lng);
  const alternativeMapUrl = getAlternativeMapUrl(lat, lng);

  const handleOpenWazeWeb = () => {
    window.open(wazeWebUrl, '_blank', 'noopener,noreferrer');
    onClose();
  };

  const handleOpenAlternative = () => {
    window.open(alternativeMapUrl, '_blank', 'noopener,noreferrer');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200 dark:border-amber-900/60 shadow-sm shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                Waze tətbiqi cihazınızda quraşdırılmayıb.
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Naviqasiya üçün istədiyiniz seçimi edin
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Location information snippet */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 mb-5 text-xs space-y-1.5">
          {customerName && (
            <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
              <span className="text-slate-400 font-normal">Müştəri:</span>
              <span className="truncate">{customerName}</span>
            </div>
          )}
          {address && (
            <div className="flex items-start gap-1.5 text-slate-600 dark:text-slate-400">
              <span className="text-slate-400 shrink-0">Ünvan:</span>
              <span className="truncate">{address}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-mono font-medium pt-0.5">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span>
              {lat.toFixed(5)}, {lng.toFixed(5)}
            </span>
          </div>
        </div>

        {/* Action buttons as requested */}
        <div className="space-y-2.5">
          {/* 1. Open Waze */}
          <button
            type="button"
            onClick={handleOpenWazeWeb}
            className="w-full py-3 px-4 bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 transition"
          >
            <Compass className="w-4 h-4" />
            <span>Waze-i aç</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
          </button>

          {/* 2. Open Alternative Map */}
          <button
            type="button"
            onClick={handleOpenAlternative}
            className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold rounded-xl text-sm flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 transition"
          >
            <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Alternativ xəritədə aç</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
          </button>

          {/* Cancel */}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition"
          >
            İmtina
          </button>
        </div>
      </div>
    </div>
  );
};
