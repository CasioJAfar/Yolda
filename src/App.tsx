import React, { useState, useEffect, useCallback } from 'react';
import { Customer, Driver, DispatchRecord, User, ActiveTab } from './types';
import { Api } from './lib/api';
import { FirebaseSync, deduplicateById } from './lib/firebase';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { LoginView } from './components/LoginView';
import { HomeDashboard } from './components/HomeDashboard';
import { CustomerList } from './components/CustomerList';
import { DriversView } from './components/DriversView';
import { OrdersView } from './components/OrdersView';
import { AllCustomersMapView } from './components/AllCustomersMapView';
import { DispatchHistoryView } from './components/DispatchHistoryView';
import { AdminPanelView } from './components/AdminPanelView';
import { CustomerFormModal } from './components/CustomerFormModal';
import { CustomerDetailModal } from './components/CustomerDetailModal';
import { SendToDriverModal } from './components/SendToDriverModal';
import { DriverFormModal } from './components/DriverFormModal';
import { UserSettingsModal } from './components/UserSettingsModal';
import { FlutterExportModal } from './components/FlutterExportModal';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  // Authentication & User State
  const [currentUser, setCurrentUser] = useState<User | null>(Api.getCurrentUser());

  // Dark Mode State
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('musteri_gps_dark');
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Mobile Mockup Frame Mode
  const [isMobileFrame, setIsMobileFrame] = useState<boolean>(() => {
    return window.innerWidth > 768;
  });

  // Online / Offline connectivity
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  // Navigation
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');

  // Application Data State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [dispatches, setDispatches] = useState<DispatchRecord[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Modals & Drawers
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);

  const [selectedCustomerDetail, setSelectedCustomerDetail] = useState<Customer | null>(null);
  const [customerToSendToDriver, setCustomerToSendToDriver] = useState<Customer | null>(null);

  const [showDriverForm, setShowDriverForm] = useState(false);
  const [driverToEdit, setDriverToEdit] = useState<Driver | null>(null);

  const [showUserSettings, setShowUserSettings] = useState(false);
  const [showFlutterExport, setShowFlutterExport] = useState(false);

  // Toast Notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Sync Dark Mode class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('musteri_gps_dark', String(darkMode));
  }, [darkMode]);

  // Online status listeners
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch Data for Current User & Connect Real-time Firestore Listeners
  const fetchData = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const [fetchedCustomers, fetchedDrivers, fetchedDispatches, fetchedUsers] = await Promise.all([
        Api.getCustomers(),
        Api.getDrivers(),
        Api.getDispatches(),
        Api.getAdminUsers().catch(() => []),
      ]);
      setCustomers(deduplicateById(fetchedCustomers));
      setDrivers(deduplicateById(fetchedDrivers));
      setDispatches(deduplicateById(fetchedDispatches));
      if (fetchedUsers && fetchedUsers.length > 0) {
        setAllUsers(fetchedUsers);
      }
    } catch (err) {
      console.error('Data loading error', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  // Real-time Heartbeat Presence updater for logged in user and driver
  useEffect(() => {
    if (!currentUser) return;

    // Send initial presence ping
    FirebaseSync.updateUserPresence(currentUser.id, true);
    if (currentUser.role === 'driver') {
      FirebaseSync.updateDriverPresence(currentUser.id, true);
    }

    // Regular heartbeat every 40 seconds
    const interval = setInterval(() => {
      if (navigator.onLine) {
        FirebaseSync.updateUserPresence(currentUser.id, true);
        if (currentUser.role === 'driver') {
          FirebaseSync.updateDriverPresence(currentUser.id, true);
        }
      }
    }, 40000);

    return () => {
      clearInterval(interval);
    };
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    // Initial fetch
    fetchData();

    // 1. Real-time Firestore live synchronization across all devices (PC, Phone, Tablet)
    const unsubscribeCustomers = FirebaseSync.subscribeCustomers(currentUser, (cloudCustomers) => {
      setCustomers(deduplicateById(cloudCustomers));
      setIsLoading(false);
    });

    const unsubscribeDrivers = FirebaseSync.subscribeDrivers(currentUser, (cloudDrivers) => {
      setDrivers(deduplicateById(cloudDrivers));
    });

    const unsubscribeDispatches = FirebaseSync.subscribeDispatches(currentUser, (cloudDispatches) => {
      setDispatches(deduplicateById(cloudDispatches));
    });

    return () => {
      unsubscribeCustomers();
      unsubscribeDrivers();
      unsubscribeDispatches();
    };
  }, [currentUser, fetchData]);

  // Handle Authentication
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setActiveTab('home');
    showToast(`Xoş gəldiniz, ${user.name}!`);
  };

  const handleLogout = () => {
    Api.logout();
    setCurrentUser(null);
    setShowUserSettings(false);
    showToast('Hesabdan çıxıldı', 'info');
  };

  // Customer Actions
  const handleSaveCustomer = async (
    data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'> & { userId?: string }
  ) => {
    if (customerToEdit) {
      const updated = await Api.updateCustomer(customerToEdit.id, data);
      setCustomers((prev) => deduplicateById(prev.map((c) => (c.id === updated.id ? updated : c))));
      if (selectedCustomerDetail?.id === updated.id) {
        setSelectedCustomerDetail(updated);
      }
      showToast('Müştəri məlumatları yeniləndi.');
    } else {
      const created = await Api.createCustomer(data as any);
      setCustomers((prev) => deduplicateById([created, ...prev]));
      showToast('Yeni müştəri əlavə edildi.');
    }
    setCustomerToEdit(null);
  };

  const handleDeleteCustomer = async (customer: Customer) => {
    await Api.deleteCustomer(customer.id);
    setCustomers((prev) => prev.filter((c) => c.id !== customer.id));
    if (selectedCustomerDetail?.id === customer.id) {
      setSelectedCustomerDetail(null);
    }
    showToast(`${customer.name} silindi.`, 'info');
  };

  // Driver Actions
  const handleSaveDriver = async (
    data: Omit<Driver, 'id' | 'userId' | 'createdAt'>
  ) => {
    if (driverToEdit) {
      const updated = await Api.updateDriver(driverToEdit.id, data);
      setDrivers((prev) => deduplicateById(prev.map((d) => (d.id === updated.id ? updated : d))));
      showToast('Sürücü məlumatları yeniləndi.');
    } else {
      const created = await Api.createDriver(data);
      setDrivers((prev) => deduplicateById([created, ...prev]));
      showToast('Yeni sürücü əlavə edildi.');
    }
    setDriverToEdit(null);
  };

  const handleDeleteDriver = async (driver: Driver) => {
    await Api.deleteDriver(driver.id);
    setDrivers((prev) => prev.filter((d) => d.id !== driver.id));
    showToast(`${driver.name} silindi.`, 'info');
  };

  const handleToggleDriverStatus = async (driver: Driver) => {
    const updated = await Api.updateDriver(driver.id, {
      status: driver.status === 'active' ? 'inactive' : 'active',
    });
    setDrivers((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
  };

  // If not logged in, display modern Login Screen
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center">
        <LoginView onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  // Render App Body with optional phone bezel frame on wide screens
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors antialiased">
      {/* Top Navigation */}
      <Navbar
        user={currentUser}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((prev) => !prev)}
        isMobileFrame={isMobileFrame}
        onToggleMobileFrame={() => setIsMobileFrame((prev) => !prev)}
        isOnline={isOnline}
        onOpenSettings={() => setShowUserSettings(true)}
        onOpenFlutterExport={() => setShowFlutterExport(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex justify-center p-0 sm:p-4">
        <div
          className={`w-full transition-all duration-300 ${
            isMobileFrame
              ? 'max-w-md bg-white dark:bg-slate-900 sm:rounded-[36px] sm:shadow-2xl sm:border sm:border-slate-200 dark:sm:border-slate-800 relative sm:my-3 min-h-[calc(100vh-6rem)] sm:min-h-[840px] flex flex-col'
              : 'max-w-3xl bg-white dark:bg-slate-900 sm:rounded-3xl sm:shadow-sm sm:border sm:border-slate-200 dark:sm:border-slate-800'
          }`}
        >
          {/* Mobile phone speaker notch for realistic preview when framed */}
          {isMobileFrame && (
            <div className="hidden sm:flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-24 h-4 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center gap-2">
                <div className="w-8 h-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
                <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700" />
              </div>
            </div>
          )}

          {/* Screen Content */}
          <div className="p-4 sm:p-5 flex-1">
            {activeTab === 'home' && (
              <HomeDashboard
                user={currentUser}
                customers={customers}
                drivers={drivers}
                allUsers={allUsers}
                onOpenAddCustomer={() => {
                  setCustomerToEdit(null);
                  setShowCustomerForm(true);
                }}
                onSelectCustomer={(c) => setSelectedCustomerDetail(c)}
                onQuickSendToDriver={(c) => setCustomerToSendToDriver(c)}
                onNavigateToTab={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === 'orders' && (
              <OrdersView
                user={currentUser}
                customers={customers}
                drivers={drivers}
                allUsers={allUsers}
              />
            )}

            {activeTab === 'customers' && (
              <CustomerList
                customers={customers}
                drivers={drivers}
                user={currentUser}
                onOpenAddCustomer={() => {
                  setCustomerToEdit(null);
                  setShowCustomerForm(true);
                }}
                onSelectCustomer={(c) => setSelectedCustomerDetail(c)}
                onEditCustomer={(c) => {
                  setCustomerToEdit(c);
                  setShowCustomerForm(true);
                }}
                onDeleteCustomer={handleDeleteCustomer}
                onSendToDriver={(c) => setCustomerToSendToDriver(c)}
              />
            )}

            {activeTab === 'drivers' && (
              <DriversView
                drivers={drivers}
                user={currentUser}
                allUsers={allUsers}
                onOpenAddDriver={() => {
                  setDriverToEdit(null);
                  setShowDriverForm(true);
                }}
                onEditDriver={(d) => {
                  setDriverToEdit(d);
                  setShowDriverForm(true);
                }}
                onDeleteDriver={handleDeleteDriver}
                onToggleStatus={handleToggleDriverStatus}
              />
            )}

            {activeTab === 'map' && (
              <AllCustomersMapView
                customers={customers}
                onSelectCustomer={(c) => setSelectedCustomerDetail(c)}
                onSendToDriver={(c) => setCustomerToSendToDriver(c)}
              />
            )}

            {activeTab === 'history' && (
              <DispatchHistoryView dispatches={dispatches} />
            )}

            {activeTab === 'admin' && currentUser.role === 'admin' && (
              <AdminPanelView
                currentUser={currentUser}
                onExitAdmin={() => setActiveTab('home')}
                onRefreshAll={fetchData}
              />
            )}
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={(tab) => setActiveTab(tab)}
        user={currentUser}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-slate-900/90 text-white rounded-2xl shadow-xl flex items-center gap-2 text-xs font-medium backdrop-blur-sm border border-slate-700 animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Modals */}
      {/* 1. Add / Edit Customer Modal */}
      {showCustomerForm && (
        <CustomerFormModal
          initialCustomer={customerToEdit}
          currentUser={currentUser}
          onSave={handleSaveCustomer}
          onClose={() => {
            setShowCustomerForm(false);
            setCustomerToEdit(null);
          }}
        />
      )}

      {/* 2. Customer Profile Details Modal */}
      {selectedCustomerDetail && (
        <CustomerDetailModal
          customer={selectedCustomerDetail}
          drivers={drivers}
          dispatches={dispatches}
          user={currentUser}
          onClose={() => setSelectedCustomerDetail(null)}
          onOwnerChanged={(updated) => {
            setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
            setSelectedCustomerDetail(updated);
            showToast(`Sahib dəyişdirildi: ${updated.userOwnerName || ''}`);
          }}
          onEdit={() => {
            setCustomerToEdit(selectedCustomerDetail);
            setShowCustomerForm(true);
            setSelectedCustomerDetail(null);
          }}
          onDelete={() => {
            handleDeleteCustomer(selectedCustomerDetail);
            setSelectedCustomerDetail(null);
          }}
          onOpenSendToDriver={() => {
            setCustomerToSendToDriver(selectedCustomerDetail);
            setSelectedCustomerDetail(null);
          }}
        />
      )}

      {/* 3. Send to Driver via WhatsApp Modal (The most critical feature) */}
      {customerToSendToDriver && (
        <SendToDriverModal
          customer={customerToSendToDriver}
          drivers={drivers}
          onClose={() => setCustomerToSendToDriver(null)}
          onDispatchSuccess={() => {
            fetchData();
            showToast('WhatsApp açıldı və göndəriş tarixçəyə əlavə edildi!');
          }}
        />
      )}

      {/* 4. Add / Edit Driver Modal */}
      {showDriverForm && (
        <DriverFormModal
          initialDriver={driverToEdit}
          onSave={handleSaveDriver}
          onClose={() => {
            setShowDriverForm(false);
            setDriverToEdit(null);
          }}
        />
      )}

      {/* 5. User Settings & Password Modal */}
      {showUserSettings && (
        <UserSettingsModal
          user={currentUser}
          onClose={() => setShowUserSettings(false)}
          onLogout={handleLogout}
          onRefreshData={fetchData}
        />
      )}

      {/* 6. Flutter Codebase & ZIP Export Modal */}
      {showFlutterExport && (
        <FlutterExportModal onClose={() => setShowFlutterExport(false)} />
      )}
    </div>
  );
}
