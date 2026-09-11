import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  Navigation,
  Search,
  AlertCircle,
  Radio,
  Eye,
  XCircle,
  Compass,
  AlertTriangle,
  HelpCircle,
  MessageCircle,
} from 'lucide-react';
import { Order, Customer, Driver, User, OrderStatus } from '../types';
import { Api } from '../lib/api';
import { FirebaseSync } from '../lib/firebase';
import { OrderCreateModal } from './OrderCreateModal';
import { OrderTrackingView } from './OrderTrackingView';
import { locationTracker } from '../lib/locationTracker';
import { openWhatsApp } from '../lib/whatsapp';
import { openWazeNavigation } from '../lib/waze';

interface OrdersViewProps {
  user: User | null;
  customers: Customer[];
  drivers: Driver[];
  allUsers?: User[];
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  user,
  customers,
  drivers,
  allUsers,
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'open' | 'active' | 'delivered'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTrackingOrder, setSelectedTrackingOrder] = useState<Order | null>(null);
  const [claimingOrderId, setClaimingOrderId] = useState<string | null>(null);
  const [deliveringOrderId, setDeliveringOrderId] = useState<string | null>(null);
  const [claimFeedback, setClaimFeedback] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Delivery Issue Dialog state
  const [issueModalOrder, setIssueModalOrder] = useState<Order | null>(null);
  const [issueReason, setIssueReason] = useState('Müştəri qapını açmır və ya zəngə cavab vermir');
  const [isSubmittingIssue, setIsSubmittingIssue] = useState(false);

  const isDriver = user?.role === 'driver';
  const isAdmin = user?.role === 'admin';

  // Active driver order for real-time 15s GPS streaming
  const activeDriverOrder = orders.find(
    (o) =>
      isDriver &&
      (o.status === 'claimed' || o.status === 'in_transit') &&
      (o.assignedDriverId === user?.id || o.assignedDriverName === user?.name)
  );

  // Subscribe to real-time orders in Firestore
  useEffect(() => {
    setIsLoading(true);
    const unsub = FirebaseSync.subscribeOrders(user, (realtimeOrders) => {
      setOrders(realtimeOrders);
      setIsLoading(false);
    });

    return () => unsub();
  }, [user]);

  // When driver has an active claimed order, stream GPS coordinates every 15s to Firestore
  useEffect(() => {
    if (!isDriver || !activeDriverOrder || !user) {
      if (locationTracker.isTracking()) {
        locationTracker.stopTracking();
      }
      return;
    }

    locationTracker.startTracking({
      orderId: activeDriverOrder.id,
      driverId: user.id,
      driverName: user.name,
      driverPhone: user.phone,
      customerName: activeDriverOrder.customerName,
      customerPhone: activeDriverOrder.phone,
      customerAddress: activeDriverOrder.address,
      customerLocation: activeDriverOrder.location,
      createdByUserId: activeDriverOrder.createdByUserId,
    });

    return () => {
      locationTracker.stopTracking();
    };
  }, [isDriver, activeDriverOrder?.id, user?.id]);

  // Handle Driver "Qəbul et"
  const handleClaim = async (targetOrder: Order) => {
    if (!user) return;
    setClaimingOrderId(targetOrder.id);
    setClaimFeedback(null);

    let currentDriverLocation: { lat: number; lng: number } | undefined;
    if (navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 4000,
          });
        });
        currentDriverLocation = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
      } catch {
        // Continue even if GPS times out
      }
    }

    const res = await Api.claimOrder(targetOrder.id, {
      id: user.id,
      name: user.name,
      phone: user.phone,
      location: currentDriverLocation,
    });

    setClaimingOrderId(null);

    if (res.success && res.order) {
      setClaimFeedback({
        type: 'success',
        msg: `Sifarişi qəbul etdiniz! Canlı GPS izləməsi aktivləşdirildi. İndi müştərinin konumunu Waze-ə göndərə bilərsiniz.`,
      });
      setSelectedTrackingOrder(res.order);
      setTimeout(() => setClaimFeedback(null), 6000);
    } else {
      setClaimFeedback({
        type: 'error',
        msg: res.error || 'Bu sifariş artıq başqa sürücü tərəfindən götürülüb.',
      });
      setTimeout(() => setClaimFeedback(null), 6000);
    }
  };

  // Handle Driver "İmtina et" (hides order from this driver only)
  const handleDismissOrder = async (ord: Order) => {
    if (!user) return;
    const confirmDismiss = window.confirm(
      `"${ord.customerName}" sifarişini qəbul etməkdən imtina etmək istəyirsiniz? Sifariş sizin siyahınızdan gizlədiləcək, digər sürücülər üçün açıq qalacaq.`
    );
    if (!confirmDismiss) return;

    try {
      await Api.dismissOrder(ord.id, user.id);
      setOrders((prev) => prev.filter((o) => o.id !== ord.id));
    } catch (err: any) {
      console.warn('Dismiss order error:', err);
    }
  };

  // Handle Driver "Təhvil verdim"
  const handleDeliver = async (ord: Order) => {
    if (!user) return;
    const confirmDeliver = window.confirm(
      `"${ord.customerName}" sifarişini təhvil verdiyinizi ("Təhvil verdim") təsdiqləyirsiniz? Sifarişi yaradan şəxsə çatdırıldı bildirişi gedəcək.`
    );
    if (!confirmDeliver) return;

    setDeliveringOrderId(ord.id);
    try {
      locationTracker.stopTracking();
      const lastCoords = locationTracker.getLastCoords();
      const res = await FirebaseSync.deliverOrderAndFinalize(
        ord.id,
        {
          id: user.id,
          name: user.name,
          phone: user.phone,
        },
        lastCoords ? { lat: lastCoords.lat, lng: lastCoords.lng } : undefined
      );

      if (res.success && res.order) {
        setClaimFeedback({
          type: 'success',
          msg: `Sifariş uğurla təhvil verildi! Canlı izləmə tamamlandı və sifarişi yaradana bildiriş çatdırıldı.`,
        });
        setTimeout(() => setClaimFeedback(null), 6000);
      } else {
        alert(res.error || 'Çatdırılma qeydə alına bilmədi.');
      }
    } catch (err: any) {
      console.error('Deliver error:', err);
      alert('Xəta baş verdi: ' + err.message);
    } finally {
      setDeliveringOrderId(null);
    }
  };

  // Handle Driver "Müştəri yerində yoxdur" submit
  const handleSubmitDeliveryIssue = async () => {
    if (!issueModalOrder || !user) return;
    setIsSubmittingIssue(true);

    try {
      const res = await Api.reportDeliveryIssue(
        issueModalOrder.id,
        {
          id: user.id,
          name: user.name,
          phone: user.phone,
        },
        issueReason
      );

      if (res.success) {
        setClaimFeedback({
          type: 'error',
          msg: `Sifarişi yaradan istifadəçiyə təcili bildiriş göndərildi: "Müştəri yerində yoxdur / Malı təhvil vermək olmur". İstifadəçi sizə kömək edəcək.`,
        });
        setIssueModalOrder(null);
        setTimeout(() => setClaimFeedback(null), 7000);
      } else {
        alert(res.error || 'Bildiriş göndərilə bilmədi.');
      }
    } catch (err: any) {
      alert('Xəta: ' + err.message);
    } finally {
      setIsSubmittingIssue(false);
    }
  };

  // Filtered orders
  const filteredOrders = orders.filter((o) => {
    if (activeFilter === 'open' && o.status !== 'open') return false;
    if (activeFilter === 'active' && o.status !== 'claimed' && o.status !== 'in_transit') return false;
    if (activeFilter === 'delivered' && o.status !== 'delivered') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = o.customerName.toLowerCase().includes(q);
      const matchAddress = o.address.toLowerCase().includes(q);
      const matchPhone = o.phone.includes(q);
      const matchDriver = (o.assignedDriverName || '').toLowerCase().includes(q);
      const matchNumber = (o.orderNumber || '').toLowerCase().includes(q);
      return matchName || matchAddress || matchPhone || matchDriver || matchNumber;
    }
    return true;
  });

  const openOrdersCount = orders.filter((o) => o.status === 'open').length;
  const activeOrdersCount = orders.filter((o) => o.status === 'claimed' || o.status === 'in_transit').length;
  const deliveredOrdersCount = orders.filter((o) => o.status === 'delivered').length;

  return (
    <div className="space-y-4 sm:space-y-6 pb-24 animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Package className="w-5 h-5" />
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Sifarişlər
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              {isDriver
                ? 'Açıq sifarişləri qəbul edin və ya imtina edin, Waze ilə yola düşün və canlı çatdırın'
                : 'Müştəriləriniz üçün sifariş yaradın və sürücünün hərəkətini canlı xəritədə izləyin'}
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Sifariş Yarat</span>
          </button>
        </div>

        {/* Global Feedback Banner */}
        {claimFeedback && (
          <div
            className={`mt-4 p-3 rounded-2xl text-xs sm:text-sm font-semibold flex items-center gap-2 border animate-in fade-in duration-200 ${
              claimFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800'
            }`}
          >
            {claimFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{claimFeedback.msg}</span>
          </div>
        )}

        {/* Active Driver Banner */}
        {activeDriverOrder && (
          <div className="mt-4 p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-blue-500 animate-ping shrink-0" />
              <div>
                <div className="text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                  <span>Aktiv Çatdırılma: {activeDriverOrder.customerName}</span>
                </div>
                <div className="text-[11px] text-blue-700 dark:text-blue-300 truncate max-w-md">
                  📍 {activeDriverOrder.address} • Canlı GPS Firestore-a göndərilir
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() =>
                  openWazeNavigation(
                    activeDriverOrder.location.lat,
                    activeDriverOrder.location.lng
                  )
                }
                className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-sky-500/25 transition"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Waze</span>
              </button>

              <button
                onClick={() => setSelectedTrackingOrder(activeDriverOrder)}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-blue-500/25 transition"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Xəritədə İzlə</span>
              </button>

              <button
                onClick={() => handleDeliver(activeDriverOrder)}
                disabled={deliveringOrderId === activeDriverOrder.id}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-emerald-500/25 transition active:scale-95"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Təhvil verdim</span>
              </button>

              <button
                onClick={() => {
                  setIssueModalOrder(activeDriverOrder);
                  setIssueReason('Müştəri qapını açmır və ya zəngə cavab vermir');
                }}
                className="px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-rose-500/25 transition"
                title="Müştəri yerində yoxdur"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Müştəri yoxdur</span>
              </button>
            </div>
          </div>
        )}

        {/* Filters & Search */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                activeFilter === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              Hamısı ({orders.length})
            </button>
            <button
              onClick={() => setActiveFilter('open')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                activeFilter === 'open'
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-amber-50'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>Açıq / Gözləyən ({openOrdersCount})</span>
            </button>
            <button
              onClick={() => setActiveFilter('active')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                activeFilter === 'active'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-blue-50'
              }`}
            >
              <Truck className="w-3 h-3" />
              <span>Yolda / Aktiv ({activeOrdersCount})</span>
            </button>
            <button
              onClick={() => setActiveFilter('delivered')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                activeFilter === 'delivered'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-emerald-50'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Çatdırılanlar ({deliveredOrdersCount})</span>
            </button>
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Müştəri, nömrə, ünvan axtar..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Orders Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 text-sm flex flex-col items-center justify-center gap-2">
          <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span>Sifarişlər yüklənir...</span>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-800">
          <Package className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700 dark:text-slate-300 text-base">
            Sifariş tapılmadı
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {isDriver
              ? 'Hal-hazırda sizə aid və ya açıq gözləyən yeni sifariş yoxdur.'
              : 'Yeni sifariş yarat düyməsinə klikləyərək müştəriniz üçün ilk sifarişi yaradın.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((ord) => {
            const isClaimedByMe =
              isDriver &&
              (ord.assignedDriverId === user?.id || ord.assignedDriverName === user?.name);

            return (
              <div
                key={ord.id}
                className={`bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border transition-all hover:shadow-md flex flex-col justify-between space-y-3.5 ${
                  ord.status === 'open'
                    ? 'border-amber-200/90 dark:border-amber-900/60 shadow-amber-500/5'
                    : isClaimedByMe
                    ? 'border-blue-300 dark:border-blue-800 shadow-blue-500/5 ring-1 ring-blue-500/20'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                {/* Card Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-400">
                        {ord.orderNumber || 'SİFARİŞ'}
                      </span>
                      {ord.status === 'open' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                          Açıq (Sürücü gözləyir)
                        </span>
                      )}
                      {ord.status === 'claimed' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800 flex items-center gap-1">
                          <Truck className="w-3 h-3" />
                          Sürücü qəbul etdi
                        </span>
                      )}
                      {ord.status === 'in_transit' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300 dark:border-purple-800 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                          Yoldadır
                        </span>
                      )}
                      {ord.status === 'delivered' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Təhvil verildi
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-slate-900 dark:text-white text-base mt-1">
                      {ord.customerName}
                    </h3>
                  </div>

                  <span className="text-[11px] text-slate-400 font-mono">
                    {new Date(ord.createdAt).toLocaleTimeString('az-AZ', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <a
                      href={`tel:${ord.phone}`}
                      className="font-medium hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      {ord.phone}
                    </a>
                  </div>

                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{ord.address}</span>
                  </div>

                  {ord.note && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 pl-5 italic line-clamp-2">
                      Qeyd: {ord.note}
                    </div>
                  )}

                  {/* Delivery Issue Alert Box if reported */}
                  {ord.deliveryIssue && (
                    <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex flex-col gap-1 mt-1">
                      <div className="font-bold flex items-center gap-1 text-[11px] text-rose-700 dark:text-rose-300">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                        <span>MÜŞTƏRİ YERİNDƏ YOXDUR!</span>
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        Sürücü {ord.deliveryIssue.driverName}: "{ord.deliveryIssue.reason}"
                      </p>
                      {ord.deliveryIssue.driverPhone && (
                        <div className="flex items-center gap-2 pt-1 border-t border-rose-200 dark:border-rose-800/60 text-[11px]">
                          <span>Sürücü ilə əlaqə:</span>
                          <a
                            href={`tel:${ord.deliveryIssue.driverPhone}`}
                            className="font-bold underline text-blue-600 dark:text-blue-400"
                          >
                            {ord.deliveryIssue.driverPhone}
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Assigned driver badge */}
                  {ord.assignedDriverName && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400">Sürücü:</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        {ord.assignedDriverName} {isClaimedByMe && '(Siz)'}
                      </span>
                    </div>
                  )}

                  <div className="text-[10px] text-slate-400 dark:text-slate-500">
                    Sifarişi yazan: {ord.createdByUserName}
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                  {/* DRIVER ACTIONS ON OPEN ORDER: "Qəbul et" and "İmtina et" */}
                  {isDriver && ord.status === 'open' ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleClaim(ord)}
                        disabled={claimingOrderId === ord.id}
                        className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/25 flex items-center justify-center gap-1.5 transition active:scale-95 disabled:opacity-50"
                      >
                        <Truck className="w-4 h-4" />
                        <span>{claimingOrderId === ord.id ? 'Götürülür...' : 'Qəbul et'}</span>
                      </button>

                      <button
                        onClick={() => handleDismissOrder(ord)}
                        className="py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 font-bold text-xs border border-slate-200 dark:border-slate-700 transition active:scale-95 flex items-center justify-center gap-1.5"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>İmtina et</span>
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* DRIVER ACTIONS ON CLAIMED/IN_TRANSIT ORDER */}
                      {isClaimedByMe && (ord.status === 'claimed' || ord.status === 'in_transit') && (
                        <div className="flex flex-col gap-2">
                          {/* Waze Button */}
                          <button
                            onClick={() =>
                              openWazeNavigation(ord.location.lat, ord.location.lng)
                            }
                            className="w-full py-2.5 px-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm shadow-sky-500/20 transition active:scale-95"
                          >
                            <Compass className="w-4 h-4" />
                            <span>Müştərinin konumunu Waze-ə göndər</span>
                          </button>

                          <div className="grid grid-cols-2 gap-2">
                            {/* Deliver Button */}
                            <button
                              onClick={() => handleDeliver(ord)}
                              disabled={deliveringOrderId === ord.id}
                              className="py-2.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/20 transition active:scale-95 disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>{deliveringOrderId === ord.id ? 'Bitir...' : 'Təhvil verdim'}</span>
                            </button>

                            {/* Customer Not Found Button */}
                            <button
                              onClick={() => {
                                setIssueModalOrder(ord);
                                setIssueReason('Müştəri qapını açmır və ya zəngə cavab vermir');
                              }}
                              className="py-2.5 px-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-rose-500/20 transition active:scale-95"
                            >
                              <AlertTriangle className="w-4 h-4" />
                              <span>Müştəri yoxdur</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* MAIN USER & ADMIN BUTTONS: "Canlı İzlə" */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedTrackingOrder(ord)}
                          className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                            ord.status === 'claimed' || ord.status === 'in_transit'
                              ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/25 active:scale-95'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600'
                          }`}
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>Canlı İzlə</span>
                        </button>

                        {/* WhatsApp to customer */}
                        <button
                          onClick={() =>
                            openWhatsApp(
                              ord.phone,
                              `Salam, sifarişiniz haqqında: ${ord.orderNumber}`
                            )
                          }
                          className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 hover:bg-emerald-100 transition border border-emerald-200 dark:border-emerald-800"
                          title="Müştəriyə WhatsApp yaz"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </button>

                        {/* If Admin wants to complete delivery */}
                        {isAdmin &&
                          (ord.status === 'claimed' || ord.status === 'in_transit') &&
                          !isClaimedByMe && (
                            <button
                              onClick={() => handleDeliver(ord)}
                              className="p-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 transition text-xs font-bold"
                              title="Təhvil verildi olaraq qeyd et"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* "Müştəri yerində yoxdur" Modal Dialog */}
      {issueModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-rose-200 dark:border-rose-900/60 p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 flex items-center justify-center font-bold">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Müştəri Yerində Yoxdur
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Sifarişi yaradan istifadəçiyə kömək üçün bildiriş göndəriləcək
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/70 rounded-2xl text-xs space-y-1 border border-slate-200 dark:border-slate-700">
              <div className="font-bold text-slate-800 dark:text-slate-200">
                Müştəri: {issueModalOrder.customerName}
              </div>
              <div className="text-slate-500">Ünvan: {issueModalOrder.address}</div>
              <div className="text-blue-600 font-semibold">Telefon: {issueModalOrder.phone}</div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Səbəb və ya vəziyyət qeydi:
              </label>
              <select
                value={issueReason}
                onChange={(e) => setIssueReason(e.target.value)}
                className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:border-rose-500 mb-2"
              >
                <option value="Müştəri qapını açmır və ya zəngə cavab vermir">
                  Müştəri qapını açmır və ya zəngə cavab vermir
                </option>
                <option value="Ünvan düzgün deyil və ya tapılmır">
                  Ünvan düzgün deyil və ya tapılmır
                </option>
                <option value="Müştəri sifarişdən imtina etdi">
                  Müştəri sifarişdən imtina etdi
                </option>
                <option value="Müştəri başqa yerdədir / vaxt tələb edir">
                  Müştəri başqa yerdədir / vaxt tələb edir
                </option>
              </select>

              <textarea
                rows={2}
                value={issueReason}
                onChange={(e) => setIssueReason(e.target.value)}
                placeholder="Ətraflı qeyd yazın..."
                className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIssueModalOrder(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Geri
              </button>
              <button
                type="button"
                disabled={isSubmittingIssue}
                onClick={handleSubmitDeliveryIssue}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-lg shadow-rose-600/25 active:scale-95 disabled:opacity-50"
              >
                {isSubmittingIssue ? 'Göndərilir...' : 'İstifadəçiyə Bildiriş Göndər'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Order Modal */}
      {showCreateModal && (
        <OrderCreateModal
          customers={customers}
          onClose={() => setShowCreateModal(false)}
          onOrderCreated={(created) => {
            setOrders((prev) => [created, ...prev]);
            setSelectedTrackingOrder(created);
          }}
        />
      )}

      {/* Live Tracking & Route Modal */}
      {selectedTrackingOrder && (
        <OrderTrackingView
          order={selectedTrackingOrder}
          user={user}
          onClose={() => setSelectedTrackingOrder(null)}
          onOrderUpdated={(updated) => {
            setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
          }}
        />
      )}
    </div>
  );
};
