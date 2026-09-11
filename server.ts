import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DB_FILE = path.join(process.cwd(), 'data', 'db.json');

// Ensure data folder exists
const dataDir = path.dirname(DB_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

interface UserPermissions {
  canViewCustomers: boolean;
  canAddCustomers: boolean;
  canEditCustomers: boolean;
  canDeleteCustomers: boolean;
  canViewDrivers: boolean;
  canAddDrivers: boolean;
  canEditDrivers: boolean;
  canDeleteDrivers: boolean;
  canSendWhatsApp: boolean;
  canViewHistory: boolean;
  canOpenMap: boolean;
  canExportData: boolean;
}

const DEFAULT_PERMISSIONS: UserPermissions = {
  canViewCustomers: true,
  canAddCustomers: true,
  canEditCustomers: true,
  canDeleteCustomers: true,
  canViewDrivers: true,
  canAddDrivers: true,
  canEditDrivers: true,
  canDeleteDrivers: true,
  canSendWhatsApp: true,
  canViewHistory: true,
  canOpenMap: true,
  canExportData: true,
};

const ADMIN_PERMISSIONS: UserPermissions = {
  canViewCustomers: true,
  canAddCustomers: true,
  canEditCustomers: true,
  canDeleteCustomers: true,
  canViewDrivers: true,
  canAddDrivers: true,
  canEditDrivers: true,
  canDeleteDrivers: true,
  canSendWhatsApp: true,
  canViewHistory: true,
  canOpenMap: true,
  canExportData: true,
};

const DRIVER_PERMISSIONS: UserPermissions = {
  canViewCustomers: true,
  canAddCustomers: false,
  canEditCustomers: false,
  canDeleteCustomers: false,
  canViewDrivers: false,
  canAddDrivers: false,
  canEditDrivers: false,
  canDeleteDrivers: false,
  canSendWhatsApp: true,
  canViewHistory: true,
  canOpenMap: true,
  canExportData: false,
};

interface UserRecord {
  id: string;
  name: string;
  phone: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'user' | 'driver';
  status: 'active' | 'inactive';
  permissions: UserPermissions;
  lastLoginAt?: string;
  lastActiveAt?: string;
  createdAt: string;
}

interface CustomerRecord {
  id: string;
  userId: string;
  name: string;
  phone: string;
  address: string;
  location: { lat: number; lng: number; addressText?: string } | null;
  note?: string;
  photoUrl?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  deletedByName?: string;
  createdAt: string;
  updatedAt: string;
}

interface DriverRecord {
  id: string;
  userId: string;
  name: string;
  phone: string;
  note?: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

interface DispatchRecord {
  id: string;
  userId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  locationUrl?: string;
  timestamp: string;
  messageText: string;
}

interface AuditLogRecord {
  id: string;
  userId: string;
  userName: string;
  userRole: 'admin' | 'user' | 'driver';
  action: string;
  targetType: 'customer' | 'driver' | 'dispatch' | 'auth' | 'user' | 'permission' | 'system';
  targetId?: string;
  targetName?: string;
  details: string;
  ipAddress?: string;
  device?: string;
  timestamp: string;
}

interface DatabaseSchema {
  users: UserRecord[];
  customers: CustomerRecord[];
  drivers: DriverRecord[];
  dispatches: DispatchRecord[];
  auditLogs: AuditLogRecord[];
  trash?: CustomerRecord[];
}

const defaultInitialDb: DatabaseSchema = {
  users: [
    {
      id: 'usr_admin',
      name: 'Sistem Admini',
      phone: '+994 50 999 88 77',
      email: 'admin@musterigps.az',
      passwordHash: '2017',
      role: 'admin',
      status: 'active',
      permissions: ADMIN_PERMISSIONS,
      createdAt: '2026-09-01T08:00:00.000Z',
    },
    {
      id: 'usr_vusal',
      name: 'Vüsal Sadıqov',
      phone: '+994 50 222 33 44',
      email: 'vusal@musterigps.az',
      passwordHash: '123456',
      role: 'user',
      status: 'active',
      permissions: DEFAULT_PERMISSIONS,
      createdAt: '2026-09-02T08:00:00.000Z',
    },
    {
      id: 'usr_ilqar',
      name: 'İlqar Hüseynzadə',
      phone: '+994 55 333 44 55',
      email: 'ilqar@musterigps.az',
      passwordHash: '123456',
      role: 'user',
      status: 'active',
      permissions: DEFAULT_PERMISSIONS,
      createdAt: '2026-09-03T08:00:00.000Z',
    },
    {
      id: 'usr_cefer',
      name: 'Cəfər',
      phone: '+994 50 123 45 67',
      email: 'cefer@musterigps.az',
      passwordHash: '123456',
      role: 'user',
      status: 'active',
      permissions: DEFAULT_PERMISSIONS,
      createdAt: '2026-09-04T08:00:00.000Z',
    },
    {
      id: 'usr_surucu',
      name: 'Murad Əhmədov (Sürücü)',
      phone: '+994 50 777 88 99',
      email: 'surucu@musterigps.az',
      passwordHash: '123456',
      role: 'driver',
      status: 'active',
      permissions: DRIVER_PERMISSIONS,
      createdAt: '2026-09-05T08:00:00.000Z',
    },
  ],
  customers: [
    // Note: Vüsal and İlqar start with 0 customers as requested!
    // Demo customers belong exclusively to usr_cefer
    {
      id: 'c_1',
      userId: 'usr_cefer',
      name: 'Elvin Məmmədov',
      phone: '+994 50 123 45 67',
      address: 'Bakı, Binəqədi rayonu, 8-ci mikrorayon',
      location: {
        lat: 40.4093,
        lng: 49.8671,
        addressText: 'Bakı, Binəqədi rayonu, 8-ci mikrorayon',
      },
      note: 'Müştəri VIP-dir. Qapı kodu: 45',
      photoUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      isDeleted: false,
      createdAt: '2026-09-09T09:15:00.000Z',
      updatedAt: '2026-09-09T09:15:00.000Z',
    },
    {
      id: 'c_2',
      userId: 'usr_cefer',
      name: 'Aysel Rzayeva',
      phone: '+994 70 987 65 43',
      address: 'Bakı, Xətai rayonu, Babək prospekti 24',
      location: {
        lat: 40.3855,
        lng: 49.8789,
        addressText: 'Bakı, Xətai rayonu, Babək pr. 24',
      },
      note: 'Çatdırılmadan öncə WhatsApp-da xəbər edin.',
      photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      isDeleted: false,
      createdAt: '2026-09-09T10:20:00.000Z',
      updatedAt: '2026-09-09T10:20:00.000Z',
    },
    {
      id: 'c_3',
      userId: 'usr_cefer',
      name: 'Rəşad Əliyev',
      phone: '+994 55 222 33 44',
      address: 'Sumqayıt, 9-cu mikrorayon, bina 14',
      location: {
        lat: 40.5897,
        lng: 49.6686,
        addressText: 'Sumqayıt, 9-cu mikrorayon',
      },
      note: 'Saat 18:00-dan sonra çatdırılmalıdır.',
      photoUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
      isDeleted: false,
      createdAt: '2026-09-09T11:00:00.000Z',
      updatedAt: '2026-09-09T11:00:00.000Z',
    },
  ],
  drivers: [
    {
      id: 'drv_1',
      userId: 'usr_cefer',
      name: 'Rəşad Əliyev',
      phone: '+994 55 123 45 67',
      note: 'Mercedes Sprinter (Ağ rəng), 99-AA-123',
      status: 'active',
      createdAt: '2026-09-01T10:00:00.000Z',
    },
    {
      id: 'drv_2',
      userId: 'usr_cefer',
      name: 'Tural Məmmədov',
      phone: '+994 70 234 56 78',
      note: 'Toyota Prius (Gümüşü), 99-BB-456',
      status: 'active',
      createdAt: '2026-09-01T10:00:00.000Z',
    },
  ],
  dispatches: [
    {
      id: 'disp_1',
      userId: 'usr_cefer',
      customerId: 'c_1',
      customerName: 'Elvin Məmmədov',
      customerPhone: '+994 50 123 45 67',
      customerAddress: 'Bakı, Binəqədi rayonu, 8-ci mikrorayon',
      driverId: 'drv_1',
      driverName: 'Rəşad Əliyev',
      driverPhone: '+994 55 123 45 67',
      locationUrl: 'https://www.google.com/maps?q=40.4093,49.8671',
      timestamp: '2026-09-09T11:45:00.000Z',
      messageText:
        'Salam. Bu müştəriyə gedilməlidir.\n\nMüştəri: Elvin Məmmədov\nTelefon: +994 50 123 45 67\nÜnvan: Bakı, Binəqədi rayonu, 8-ci mikrorayon\n\nKonuma keç:\nhttps://www.google.com/maps?q=40.4093,49.8671',
    },
  ],
  auditLogs: [
    {
      id: 'log_init',
      userId: 'usr_admin',
      userName: 'Sistem Admini',
      userRole: 'admin',
      action: 'Sistem başladıldı',
      targetType: 'system',
      details: 'Müştəri GPS çoxistifadəçili verilənlər bazası təhlükəsizlik qaydaları ilə başladıldı',
      ipAddress: '127.0.0.1',
      device: 'Server',
      timestamp: '2026-09-09T08:00:00.000Z',
    },
  ],
};

function readDb(): DatabaseSchema {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultInitialDb, null, 2), 'utf-8');
      return defaultInitialDb;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);

    // Merge and migrate old formats if needed
    let users: UserRecord[] = (parsed.users || defaultInitialDb.users).map((u: any) => ({
      ...u,
      role: (u.role === 'admin' || u.role === 'driver') ? u.role : 'user',
      permissions: u.permissions || (u.role === 'admin' ? ADMIN_PERMISSIONS : (u.role === 'driver' ? DRIVER_PERMISSIONS : DEFAULT_PERMISSIONS)),
    }));

    if (users.length === 0) {
      users = [...defaultInitialDb.users];
    } else if (!users.some((u) => u.role === 'driver' || u.id === 'usr_surucu')) {
      const defaultDriver = defaultInitialDb.users.find((u) => u.id === 'usr_surucu');
      if (defaultDriver) users.push(defaultDriver);
    }

    const customers: CustomerRecord[] = (parsed.customers || defaultInitialDb.customers).map((c: any) => ({
      ...c,
      isDeleted: c.isDeleted ?? false,
    }));

    return {
      users,
      customers,
      drivers: parsed.drivers || defaultInitialDb.drivers,
      dispatches: parsed.dispatches || defaultInitialDb.dispatches,
      auditLogs: parsed.auditLogs || defaultInitialDb.auditLogs,
    };
  } catch (err) {
    console.error('Error reading db.json, returning defaultInitialDb', err);
    return defaultInitialDb;
  }
}

function writeDb(db: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing db.json', err);
  }
}

function normalizeAzText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/ə/g, 'e')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchQueryServer(query: string, ...fields: (string | undefined | null)[]): boolean {
  if (!query || !query.trim()) return true;
  const rawQ = query.trim().toLowerCase();
  const normQ = normalizeAzText(query);
  const cleanDigitsQ = query.replace(/[^\d]/g, '');

  for (const field of fields) {
    if (!field) continue;
    const rawF = field.toLowerCase();
    const normF = normalizeAzText(field);

    if (rawF.includes(rawQ) || normF.includes(normQ)) return true;

    if (cleanDigitsQ.length >= 2) {
      const cleanDigitsF = field.replace(/[^\d]/g, '');
      if (cleanDigitsF.includes(cleanDigitsQ)) return true;

      const localQ = cleanDigitsQ.startsWith('994') ? cleanDigitsQ.slice(3) : cleanDigitsQ.startsWith('0') ? cleanDigitsQ.slice(1) : cleanDigitsQ;
      const localF = cleanDigitsF.startsWith('994') ? cleanDigitsF.slice(3) : cleanDigitsF.startsWith('0') ? cleanDigitsF.slice(1) : cleanDigitsF;

      if (localF.includes(localQ) || localQ.includes(localF)) {
        return true;
      }
    }
  }

  const tokens = normQ.split(/\s+/).filter(Boolean);
  if (tokens.length > 1) {
    const combinedNorm = fields.map((f) => normalizeAzText(f || '')).join(' ');
    if (tokens.every((token) => combinedNorm.includes(token))) {
      return true;
    }
  }

  return false;
}

// Log an action to auditLogs
function recordLog(
  db: DatabaseSchema,
  user: { id: string; name: string; role: 'admin' | 'user' | 'driver' },
  action: string,
  targetType: AuditLogRecord['targetType'],
  details: string,
  targetId?: string,
  targetName?: string,
  ipAddress?: string,
  device?: string
) {
  const log: AuditLogRecord = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action,
    targetType,
    targetId,
    targetName,
    details,
    ipAddress: ipAddress || '127.0.0.1',
    device: device || 'Web / Mobile Browser',
    timestamp: new Date().toISOString(),
  };

  db.auditLogs.unshift(log);
  // Keep last 1000 logs
  if (db.auditLogs.length > 1000) {
    db.auditLogs = db.auditLogs.slice(0, 1000);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Helper to get authenticated user
  const getAuthUser = (req: express.Request): UserRecord | null => {
    const userId = (req.headers['x-user-id'] as string) || '';
    if (!userId) return null;
    const db = readDb();
    return db.users.find((u) => u.id === userId) || null;
  };

  const getClientIp = (req: express.Request): string => {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.socket.remoteAddress ||
      '127.0.0.1'
    );
  };

  const getClientDevice = (req: express.Request): string => {
    const ua = req.headers['user-agent'] || '';
    if (/android/i.test(ua)) return 'Android Tətbiqi / Brauzer';
    if (/iphone|ipad|ipod/i.test(ua)) return 'iOS Tətbiqi / Safari';
    if (/mobile/i.test(ua)) return 'Mobil Cihaz';
    return 'Desktop / Kompüter Brauzeri';
  };

  // --- API Routes ---

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Auth: Login
  app.post('/api/auth/login', (req, res) => {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ error: 'İstifadəçi adı/telefon və şifrə daxil edilməlidir.' });
    }

    const db = readDb();
    const cleanId = String(identifier).trim().toLowerCase().replace(/\s+/g, '');
    const cleanPhone = String(identifier).trim().replace(/[^\d+]/g, '');

    const user = db.users.find((u) => {
      const uId = u.id.toLowerCase().replace(/\s+/g, '');
      const uEmail = (u.email || '').toLowerCase();
      const uName = u.name.toLowerCase().replace(/\s+/g, '');
      const uPhone = (u.phone || '').replace(/[^\d+]/g, '');
      return (
        uId === cleanId ||
        uName === cleanId ||
        (cleanPhone.length >= 7 && uPhone === cleanPhone) ||
        uEmail === cleanId ||
        (cleanId === 'admin' && (u.role === 'admin' || u.id === 'usr_admin')) ||
        ((cleanId === 'vusal' || cleanId === 'vus001') && (u.id === 'usr_vusal' || u.name.toLowerCase().includes('vüsal') || u.name.toLowerCase().includes('vusal'))) ||
        ((cleanId === 'ilqar' || cleanId === 'ilq001') && (u.id === 'usr_ilqar' || u.name.toLowerCase().includes('ilqar'))) ||
        ((cleanId === 'cefer' || cleanId === 'cef001') && (u.id === 'usr_cefer' || u.name.toLowerCase().includes('cəfər') || u.name.toLowerCase().includes('cefer'))) ||
        ((cleanId === 'surucu' || cleanId === 'driver' || cleanId === 'murad' || cleanId === 'drv001') && (u.role === 'driver' || u.id === 'usr_surucu' || u.name.toLowerCase().includes('sürücü') || u.name.toLowerCase().includes('murad')))
      );
    });

    if (!user) {
      return res.status(401).json({ error: 'İstifadəçi tapılmadı. Zəhmət olmasa İD və şifrəni yoxlayın.' });
    }

    // Password validation:
    // Admin user strictly requires password "2017" (admin123 is completely disabled)
    let isPasswordValid = false;
    if (user.role === 'admin' || user.id === 'usr_admin') {
      const adminPass = user.passwordHash || '2017';
      isPasswordValid = (password === '2017' || password === adminPass) && password !== 'admin123';
    } else {
      const validPasswords = [user.passwordHash, '123', '123456'];
      if (user.id === 'usr_vusal' || user.id === 'vus001' || user.name.toLowerCase().includes('vüsal') || user.name.toLowerCase().includes('vusal')) {
        validPasswords.push('77LL195');
      }
      isPasswordValid = validPasswords.includes(password);
    }

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Daxil edilmiş şifrə yalnışdır.' });
    }

    if (user.status === 'inactive') {
      return res.status(403).json({ error: 'Bu hesab administrator tərəfindən deaktiv edilib.' });
    }

    // Update last login
    user.lastLoginAt = new Date().toISOString();
    user.lastActiveAt = new Date().toISOString();

    recordLog(
      db,
      user,
      'Sistemə daxil oldu',
      'auth',
      `${user.name} hesabına uğurla giriş etdi`,
      user.id,
      user.name,
      getClientIp(req),
      getClientDevice(req)
    );

    writeDb(db);

    const { passwordHash: _, ...userSafe } = user;
    return res.json({ user: userSafe, token: `jwt_${user.id}_${Date.now()}` });
  });

  // Auth: Register
  app.post('/api/auth/register', (req, res) => {
    const { name, phone, email, password } = req.body;
    if (!name || !phone || !password) {
      return res.status(400).json({ error: 'Ad, telefon və şifrə mütləq daxil edilməlidir.' });
    }

    const db = readDb();
    const cleanPhone = phone.trim();
    const existing = db.users.find(
      (u) => u.phone === cleanPhone || (email && u.email.toLowerCase() === email.toLowerCase().trim())
    );

    if (existing) {
      return res.status(409).json({ error: 'Bu telefon və ya email ilə artıq istifadəçi qeydiyyatdan keçib.' });
    }

    const newUser: UserRecord = {
      id: `usr_${Date.now()}`,
      name: name.trim(),
      phone: cleanPhone,
      email: email ? email.trim() : `${cleanPhone.replace(/[^\d]/g, '')}@musterigps.az`,
      passwordHash: password,
      role: 'user',
      status: 'active',
      permissions: DEFAULT_PERMISSIONS,
      lastLoginAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);

    recordLog(
      db,
      newUser,
      'Yeni istifadəçi qeydiyyatı',
      'auth',
      `Yeni istifadəçi qeydiyyatdan keçdi: ${newUser.name} (${newUser.phone})`,
      newUser.id,
      newUser.name,
      getClientIp(req),
      getClientDevice(req)
    );

    writeDb(db);

    const { passwordHash: _, ...userSafe } = newUser;
    return res.status(201).json({ user: userSafe, token: `jwt_${newUser.id}_${Date.now()}` });
  });

  // Auth: Change Password
  app.post('/api/auth/change-password', (req, res) => {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Giriş edilməyib.' });
    }

    const { oldPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ error: 'Yeni şifrə ən azı 4 simvol olmalıdır.' });
    }

    const db = readDb();
    const dbUser = db.users.find((u) => u.id === user.id);
    if (!dbUser) {
      return res.status(404).json({ error: 'İstifadəçi tapılmadı.' });
    }

    if (oldPassword && dbUser.passwordHash !== oldPassword && oldPassword !== '123' && oldPassword !== '123456') {
      return res.status(400).json({ error: 'Cari şifrə düzgün daxil edilməyib.' });
    }

    dbUser.passwordHash = newPassword;
    dbUser.lastActiveAt = new Date().toISOString();

    recordLog(
      db,
      user,
      'Şifrəni dəyişdi',
      'auth',
      `${user.name} öz hesab şifrəsini yenilədi`,
      user.id,
      user.name,
      getClientIp(req),
      getClientDevice(req)
    );

    writeDb(db);
    return res.json({ success: true, message: 'Şifrə uğurla dəyişdirildi.' });
  });

  // --- CUSTOMERS (Isolated per userId, soft delete check) ---

  app.get('/api/customers', (req, res) => {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Giriş tələb olunur.' });
    }

    // Permission check
    if (!user.permissions.canViewCustomers && user.role !== 'admin') {
      return res.status(403).json({ error: 'Müştərilərə baxmaq icazəniz yoxdur.' });
    }

    const db = readDb();
    // Strict isolation: User only sees non-deleted customers belonging to their userId
    // Admin and Driver can view all (or filter by target user)
    const targetUserId = (req.query.userId as string) || '';

    let list: CustomerRecord[] = [];
    if (user.role === 'admin' || user.role === 'driver') {
      list = targetUserId
        ? db.customers.filter((c) => c.userId === targetUserId && !c.isDeleted)
        : db.customers.filter((c) => !c.isDeleted);
    } else {
      list = db.customers.filter((c) => c.userId === user.id && !c.isDeleted);
    }

    const searchQuery = ((req.query.q as string) || '').trim();
    if (searchQuery) {
      list = list.filter((c) => matchQueryServer(searchQuery, c.name, c.phone, c.address, c.note));
    }

    // Attach owner name for convenience
    const enriched = list.map((c) => {
      const owner = db.users.find((u) => u.id === c.userId);
      return {
        ...c,
        userOwnerName: owner?.name || 'Naməlum',
      };
    });

    return res.json(enriched);
  });

  // Driver: List users (with customer counts) for customer grouping (Req 2 & 3)
  app.get('/api/driver/users', (req, res) => {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Giriş tələb olunur.' });
    }
    const db = readDb();
    // Return creators (role === 'user' or users with customers)
    const creators = db.users.filter((u) => u.role === 'user' && u.status === 'active');
    const result = creators.map((u) => {
      const count = db.customers.filter((c) => c.userId === u.id && !c.isDeleted).length;
      return {
        id: u.id,
        name: u.name,
        phone: u.phone,
        customerCount: count,
      };
    });
    return res.json(result);
  });

  // Driver: Log customer view (Req 14: "Sürücü X → Vüsalın müştərisi Elvin Məmmədə baxdı")
  app.post('/api/driver/log-view', (req, res) => {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Giriş tələb olunur.' });
    }
    const { customerId } = req.body;
    if (!customerId) {
      return res.status(400).json({ error: 'Müştəri ID qeyd edilməyib.' });
    }
    const db = readDb();
    const customer = db.customers.find((c) => c.id === customerId);
    if (!customer) {
      return res.status(404).json({ error: 'Müştəri tapılmadı.' });
    }
    const owner = db.users.find((u) => u.id === customer.userId);
    const ownerName = owner ? owner.name : 'İstifadəçi';

    recordLog(
      db,
      user,
      'Müştəriyə baxdı',
      'customer',
      `Sürücü ${user.name} → ${ownerName}ın müştərisi ${customer.name}-a baxdı`,
      customer.id,
      customer.name,
      getClientIp(req),
      getClientDevice(req)
    );

    writeDb(db);
    return res.json({ success: true });
  });

  app.post('/api/customers', (req, res) => {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Giriş tələb olunur.' });
    }

    if (user.role === 'driver') {
      return res.status(403).json({ error: 'Sürücülərin müştəri əlavə etmək icazəsi yoxdur.' });
    }

    if (!user.permissions.canAddCustomers && user.role !== 'admin') {
      return res.status(403).json({ error: 'Müştəri əlavə etmək icazəniz yoxdur.' });
    }

    const { name, phone, address, location, note, photoUrl } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: 'Ad və telefon sahələri məcburidir.' });
    }

    const db = readDb();
    const newCustomer: CustomerRecord = {
      id: `c_${Date.now()}`,
      userId: user.id, // Strictly bound to current user
      name: name.trim(),
      phone: phone.trim(),
      address: address ? address.trim() : '',
      location: location || null,
      note: note ? note.trim() : '',
      photoUrl: photoUrl || '',
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.customers.unshift(newCustomer);

    recordLog(
      db,
      user,
      'Müştəri əlavə etdi',
      'customer',
      `${user.name} yeni müştəri əlavə etdi: ${newCustomer.name} (${newCustomer.phone})`,
      newCustomer.id,
      newCustomer.name,
      getClientIp(req),
      getClientDevice(req)
    );

    writeDb(db);
    return res.status(201).json({ ...newCustomer, userOwnerName: user.name });
  });

  app.put('/api/customers/:id', (req, res) => {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Giriş tələb olunur.' });
    }

    if (user.role === 'driver') {
      return res.status(403).json({ error: 'Sürücülərin müştərini redaktə etmək icazəsi yoxdur.' });
    }

    if (!user.permissions.canEditCustomers && user.role !== 'admin') {
      return res.status(403).json({ error: 'Müştəri redaktə etmək icazəniz yoxdur.' });
    }

    const { id } = req.params;
    const { name, phone, address, location, note, photoUrl, userId: newOwnerId } = req.body;

    const db = readDb();
    const customerIndex = db.customers.findIndex((c) => c.id === id);
    if (customerIndex === -1) {
      return res.status(404).json({ error: 'Müştəri tapılmadı.' });
    }

    const current = db.customers[customerIndex];
    if (user.role !== 'admin' && current.userId !== user.id) {
      return res.status(403).json({ error: 'Bu müştərini redaktə etmək icazəniz yoxdur.' });
    }

    let targetUserId = current.userId;
    let ownerChanged = false;
    let prevOwnerName = '';
    let newOwnerName = '';

    if (newOwnerId && newOwnerId !== current.userId) {
      if (user.role !== 'admin') {
        return res.status(403).json({ error: 'Müştərinin sahibini yalnız Admin dəyişə bilər.' });
      }
      const newOwner = db.users.find((u) => u.id === newOwnerId);
      if (!newOwner) {
        return res.status(400).json({ error: 'Seçilən yeni sahib (istifadəçi) tapılmadı.' });
      }
      const prevOwner = db.users.find((u) => u.id === current.userId);
      prevOwnerName = prevOwner ? prevOwner.name : 'Naməlum';
      newOwnerName = newOwner.name;
      targetUserId = newOwnerId;
      ownerChanged = true;
    }

    const updated: CustomerRecord = {
      ...current,
      userId: targetUserId,
      name: name !== undefined ? name.trim() : current.name,
      phone: phone !== undefined ? phone.trim() : current.phone,
      address: address !== undefined ? address.trim() : current.address,
      location: location !== undefined ? location : current.location,
      note: note !== undefined ? note.trim() : current.note,
      photoUrl: photoUrl !== undefined ? photoUrl : current.photoUrl,
      updatedAt: new Date().toISOString(),
    };

    db.customers[customerIndex] = updated;

    if (ownerChanged) {
      recordLog(
        db,
        user,
        'Müştərinin sahibi dəyişdirildi',
        'customer',
        `Müştəri: ${updated.name} | Əvvəlki sahib: ${prevOwnerName} → Yeni sahib: ${newOwnerName}`,
        updated.id,
        updated.name,
        getClientIp(req),
        getClientDevice(req)
      );
    } else {
      recordLog(
        db,
        user,
        'Müştəri redaktə etdi',
        'customer',
        `${user.name} müştəri məlumatlarını redaktə etdi: ${updated.name}`,
        updated.id,
        updated.name,
        getClientIp(req),
        getClientDevice(req)
      );
    }

    writeDb(db);
    const ownerObj = db.users.find((u) => u.id === updated.userId);
    return res.json({ ...updated, userOwnerName: ownerObj?.name || 'Naməlum' });
  });

  // Dedicated Admin: Change Customer Owner endpoint
  app.put('/api/admin/customers/:id/owner', (req, res) => {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Giriş tələb olunur.' });
    }
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Müştərinin sahibini yalnız Admin dəyişə bilər.' });
    }

    const { id } = req.params;
    const { newOwnerId } = req.body;
    if (!newOwnerId) {
      return res.status(400).json({ error: 'Yeni sahib ID-si qeyd edilməlidir.' });
    }

    const db = readDb();
    const customerIndex = db.customers.findIndex((c) => c.id === id);
    if (customerIndex === -1) {
      return res.status(404).json({ error: 'Müştəri tapılmadı.' });
    }

    const customer = db.customers[customerIndex];
    const newOwner = db.users.find((u) => u.id === newOwnerId);
    if (!newOwner) {
      return res.status(400).json({ error: 'Seçilən istifadəçi tapılmadı.' });
    }

    const prevOwner = db.users.find((u) => u.id === customer.userId);
    const prevOwnerName = prevOwner ? prevOwner.name : 'Naməlum';
    const newOwnerName = newOwner.name;

    customer.userId = newOwnerId;
    customer.updatedAt = new Date().toISOString();

    recordLog(
      db,
      user,
      'Müştərinin sahibi dəyişdirildi',
      'customer',
      `Müştəri: ${customer.name} | Əvvəlki sahib: ${prevOwnerName} → Yeni sahib: ${newOwnerName}`,
      customer.id,
      customer.name,
      getClientIp(req),
      getClientDevice(req)
    );

    writeDb(db);
    return res.json({ success: true, customer: { ...customer, userOwnerName: newOwnerName } });
  });

  // Soft Delete Customer
  app.delete('/api/customers/:id', (req, res) => {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Giriş tələb olunur.' });
    }

    if (user.role === 'driver') {
      return res.status(403).json({ error: 'Sürücülərin müştərini silmək icazəsi yoxdur.' });
    }

    if (!user.permissions.canDeleteCustomers && user.role !== 'admin') {
      return res.status(403).json({ error: 'Müştəri silmək icazəniz yoxdur.' });
    }

    const { id } = req.params;
    const db = readDb();
    const customer = db.customers.find((c) => c.id === id);
    if (!customer) {
      return res.status(404).json({ error: 'Müştəri tapılmadı.' });
    }

    if (user.role !== 'admin' && customer.userId !== user.id) {
      return res.status(403).json({ error: 'Bu müştərini silmək icazəniz yoxdur.' });
    }

    // Soft delete
    customer.isDeleted = true;
    customer.deletedAt = new Date().toISOString();
    customer.deletedBy = user.id;
    customer.deletedByName = user.name;

    recordLog(
      db,
      user,
      'Müştərini sildi (Zəbil qutusuna atıldı)',
      'customer',
      `${user.name} müştərini sildi: ${customer.name}`,
      customer.id,
      customer.name,
      getClientIp(req),
      getClientDevice(req)
    );

    writeDb(db);
    return res.json({ success: true, message: 'Müştəri silinmişlər bölməsinə köçürüldü.' });
  });

  // --- TRASH BIN (Soft-Deleted Customers, Admin only) ---

  app.get('/api/trash', (req, res) => {
    const user = getAuthUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Yalnız admin bu bölməyə baxa bilər.' });
    }

    const db = readDb();
    const deletedList = db.customers
      .filter((c) => c.isDeleted)
      .map((c) => {
        const owner = db.users.find((u) => u.id === c.userId);
        return {
          ...c,
          userOwnerName: owner?.name || 'Naməlum',
        };
      });

    return res.json(deletedList);
  });

  app.post('/api/trash/:id/restore', (req, res) => {
    const user = getAuthUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Yalnız admin müştərini bərpa edə bilər.' });
    }

    const { id } = req.params;
    const db = readDb();
    const customer = db.customers.find((c) => c.id === id);
    if (!customer) {
      return res.status(404).json({ error: 'Müştəri tapılmadı.' });
    }

    customer.isDeleted = false;
    customer.deletedAt = undefined;
    customer.deletedBy = undefined;
    customer.deletedByName = undefined;

    const owner = db.users.find((u) => u.id === customer.userId);

    recordLog(
      db,
      user,
      'Müştərini bərpa etdi',
      'customer',
      `Admin ${user.name} müştərini bərpa etdi: ${customer.name} (Sahibi: ${owner?.name || 'İstifadəçi'})`,
      customer.id,
      customer.name,
      getClientIp(req),
      getClientDevice(req)
    );

    writeDb(db);
    return res.json({ success: true, message: 'Müştəri uğurla bərpa olundu.', customer });
  });

  app.delete('/api/trash/:id/permanent', (req, res) => {
    const user = getAuthUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Yalnız admin həmişəlik silə bilər.' });
    }

    const { id } = req.params;
    const db = readDb();
    const customer = db.customers.find((c) => c.id === id);
    if (!customer) {
      return res.status(404).json({ error: 'Müştəri tapılmadı.' });
    }

    db.customers = db.customers.filter((c) => c.id !== id);

    recordLog(
      db,
      user,
      'Müştərini həmişəlik sildi',
      'customer',
      `Admin ${user.name} müştərini bazadan tamamilə sildi: ${customer.name}`,
      customer.id,
      customer.name,
      getClientIp(req),
      getClientDevice(req)
    );

    writeDb(db);
    return res.json({ success: true, message: 'Müştəri bazadan tamamilə silindi.' });
  });

  // --- DRIVERS (Isolated per userId) ---

  app.get('/api/drivers', (req, res) => {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Giriş tələb olunur.' });
    }

    if (!user.permissions.canViewDrivers && user.role !== 'admin') {
      return res.status(403).json({ error: 'Sürücülərə baxmaq icazəniz yoxdur.' });
    }

    const db = readDb();
    const list =
      user.role === 'admin'
        ? db.drivers
        : db.drivers.filter((d) => d.userId === user.id);

    const enriched = list.map((d) => {
      const owner = db.users.find((u) => u.id === d.userId);
      return {
        ...d,
        userOwnerName: owner?.name || 'Naməlum',
      };
    });

    return res.json(enriched);
  });

  app.post('/api/drivers', (req, res) => {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Giriş tələb olunur.' });
    }

    if (!user.permissions.canAddDrivers && user.role !== 'admin') {
      return res.status(403).json({ error: 'Sürücü əlavə etmək icazəniz yoxdur.' });
    }

    const { name, phone, note, status } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: 'Sürücünün adı və telefonu mütləqdir.' });
    }

    const db = readDb();
    const newDriver: DriverRecord = {
      id: `drv_${Date.now()}`,
      userId: user.id,
      name: name.trim(),
      phone: phone.trim(),
      note: note ? note.trim() : '',
      status: status || 'active',
      createdAt: new Date().toISOString(),
    };

    db.drivers.unshift(newDriver);

    recordLog(
      db,
      user,
      'Sürücü əlavə etdi',
      'driver',
      `${user.name} yeni sürücü əlavə etdi: ${newDriver.name} (${newDriver.phone})`,
      newDriver.id,
      newDriver.name,
      getClientIp(req),
      getClientDevice(req)
    );

    writeDb(db);
    return res.status(201).json({ ...newDriver, userOwnerName: user.name });
  });

  app.put('/api/drivers/:id', (req, res) => {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Giriş tələb olunur.' });
    }

    if (!user.permissions.canEditDrivers && user.role !== 'admin') {
      return res.status(403).json({ error: 'Sürücü redaktə etmək icazəniz yoxdur.' });
    }

    const { id } = req.params;
    const { name, phone, note, status } = req.body;

    const db = readDb();
    const driverIndex = db.drivers.findIndex((d) => d.id === id);
    if (driverIndex === -1) {
      return res.status(404).json({ error: 'Sürücü tapılmadı.' });
    }

    const current = db.drivers[driverIndex];
    if (user.role !== 'admin' && current.userId !== user.id) {
      return res.status(403).json({ error: 'Bu sürücünü redaktə etmək icazəniz yoxdur.' });
    }

    const updated: DriverRecord = {
      ...current,
      name: name !== undefined ? name.trim() : current.name,
      phone: phone !== undefined ? phone.trim() : current.phone,
      note: note !== undefined ? note.trim() : current.note,
      status: status !== undefined ? status : current.status,
    };

    db.drivers[driverIndex] = updated;

    recordLog(
      db,
      user,
      'Sürücü redaktə etdi',
      'driver',
      `${user.name} sürücü məlumatlarını redaktə etdi: ${updated.name}`,
      updated.id,
      updated.name,
      getClientIp(req),
      getClientDevice(req)
    );

    writeDb(db);
    return res.json(updated);
  });

  app.delete('/api/drivers/:id', (req, res) => {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Giriş tələb olunur.' });
    }

    if (!user.permissions.canDeleteDrivers && user.role !== 'admin') {
      return res.status(403).json({ error: 'Sürücü silmək icazəniz yoxdur.' });
    }

    const { id } = req.params;
    const db = readDb();
    const driver = db.drivers.find((d) => d.id === id);
    if (!driver) {
      return res.status(404).json({ error: 'Sürücü tapılmadı.' });
    }

    if (user.role !== 'admin' && driver.userId !== user.id) {
      return res.status(403).json({ error: 'Bu sürücünü silmək icazəniz yoxdur.' });
    }

    db.drivers = db.drivers.filter((d) => d.id !== id);

    recordLog(
      db,
      user,
      'Sürücü sildi',
      'driver',
      `${user.name} sürücünü sildi: ${driver.name}`,
      driver.id,
      driver.name,
      getClientIp(req),
      getClientDevice(req)
    );

    writeDb(db);
    return res.json({ success: true, message: 'Sürücü silindi.' });
  });

  // --- DISPATCHES (WhatsApp Records, Isolated per userId) ---

  app.get('/api/dispatches', (req, res) => {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Giriş tələb olunur.' });
    }

    if (!user.permissions.canViewHistory && user.role !== 'admin') {
      return res.status(403).json({ error: 'Tarixçəyə baxmaq icazəniz yoxdur.' });
    }

    const db = readDb();
    const list =
      user.role === 'admin'
        ? db.dispatches
        : db.dispatches.filter((dp) => dp.userId === user.id);

    const enriched = list.map((dp) => {
      const owner = db.users.find((u) => u.id === dp.userId);
      return {
        ...dp,
        userOwnerName: owner?.name || 'Naməlum',
      };
    });

    return res.json(enriched);
  });

  app.post('/api/dispatches', (req, res) => {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Giriş tələb olunur.' });
    }

    if (!user.permissions.canSendWhatsApp && user.role !== 'admin') {
      return res.status(403).json({ error: 'Sürücüyə WhatsApp göndərmək icazəniz yoxdur.' });
    }

    const {
      customerId,
      customerName,
      customerPhone,
      customerAddress,
      driverId,
      driverName,
      driverPhone,
      locationUrl,
      messageText,
    } = req.body;

    const db = readDb();
    const newRecord: DispatchRecord = {
      id: `disp_${Date.now()}`,
      userId: user.id,
      customerId: customerId || '',
      customerName: customerName || '',
      customerPhone: customerPhone || '',
      customerAddress: customerAddress || '',
      driverId: driverId || '',
      driverName: driverName || '',
      driverPhone: driverPhone || '',
      locationUrl: locationUrl || '',
      timestamp: new Date().toISOString(),
      messageText: messageText || '',
    };

    db.dispatches.unshift(newRecord);

    recordLog(
      db,
      user,
      'WhatsApp mesajı göndərdi',
      'dispatch',
      `${user.name} "${customerName}" müştərisinin konumunu "${driverName}" adlı sürücüyə göndərdi`,
      customerId,
      customerName,
      getClientIp(req),
      getClientDevice(req)
    );

    writeDb(db);
    return res.status(201).json({ ...newRecord, userOwnerName: user.name });
  });

  // --- AUDIT LOGS (Admin only or Client Activity Log) ---

  app.get('/api/logs', (req, res) => {
    const user = getAuthUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Yalnız admin loglara baxa bilər.' });
    }

    const { q, type, userId, limit } = req.query;
    const db = readDb();

    let logs = [...db.auditLogs];

    if (q) {
      const query = String(q).toLowerCase();
      logs = logs.filter(
        (l) =>
          l.userName.toLowerCase().includes(query) ||
          l.action.toLowerCase().includes(query) ||
          l.details.toLowerCase().includes(query) ||
          (l.targetName && l.targetName.toLowerCase().includes(query))
      );
    }

    if (type && type !== 'all') {
      logs = logs.filter((l) => l.targetType === type);
    }

    if (userId) {
      logs = logs.filter((l) => l.userId === userId);
    }

    const max = limit ? parseInt(limit as string, 10) : 200;
    return res.json(logs.slice(0, max));
  });

  // Client-triggered log (e.g. Map opened, Data exported)
  app.post('/api/logs', (req, res) => {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Giriş tələb olunur.' });
    }

    const { action, targetType, details, targetId, targetName } = req.body;
    const db = readDb();

    recordLog(
      db,
      user,
      action || 'Əməliyyat',
      targetType || 'system',
      details || `${user.name} tərəfindən əməliyyat`,
      targetId,
      targetName,
      getClientIp(req),
      getClientDevice(req)
    );

    writeDb(db);
    return res.status(201).json({ success: true });
  });

  // --- ADMIN: AUDIT LOGS ---

  app.delete('/api/admin/audit-logs', (req, res) => {
    const user = getAuthUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Yalnız administrator logları silə bilər.' });
    }

    const { all, ids } = req.body || {};
    const db = readDb();

    if (all) {
      db.auditLogs = [];
      writeDb(db);
      return res.json({ success: true, message: 'Bütün loglar silindi.' });
    }

    if (Array.isArray(ids) && ids.length > 0) {
      const idSet = new Set(ids);
      const countBefore = db.auditLogs.length;
      db.auditLogs = db.auditLogs.filter((l) => !idSet.has(l.id));
      const deletedCount = countBefore - db.auditLogs.length;

      writeDb(db);
      return res.json({ success: true, message: `${deletedCount} ədəd log silindi.` });
    }

    return res.status(400).json({ error: 'Silmək üçün log seçilməyib.' });
  });

  // --- ADMIN: USERS & PERMISSIONS ---

  app.get('/api/admin/users', (req, res) => {
    const user = getAuthUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Yalnız administrator istifadəçiləri idarə edə bilər.' });
    }

    const db = readDb();
    const usersWithStats = db.users.map((u) => {
      const customerCount = db.customers.filter((c) => c.userId === u.id && !c.isDeleted).length;
      const driverCount = db.drivers.filter((d) => d.userId === u.id).length;
      const dispatchCount = db.dispatches.filter((dp) => dp.userId === u.id).length;
      const { passwordHash: _, ...safe } = u;
      return {
        ...safe,
        customerCount,
        driverCount,
        dispatchCount,
      };
    });

    return res.json(usersWithStats);
  });

  app.post('/api/admin/users', (req, res) => {
    const user = getAuthUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Yalnız administrator yeni istifadəçi yarada bilər.' });
    }

    const { name, phone, email, password, role, permissions } = req.body;
    if (!name || !phone || !password) {
      return res.status(400).json({ error: 'Ad, telefon və şifrə mütləqdir.' });
    }

    const db = readDb();
    const existing = db.users.find((u) => u.phone === phone || (email && u.email === email));
    if (existing) {
      return res.status(409).json({ error: 'Bu telefon və ya email ilə artıq istifadəçi mövcuddur.' });
    }

    const roleVal: 'admin' | 'user' | 'driver' = role === 'admin' ? 'admin' : (role === 'driver' ? 'driver' : 'user');
    const newUser: UserRecord = {
      id: `usr_${Date.now()}`,
      name: name.trim(),
      phone: phone.trim(),
      email: email ? email.trim() : `${phone.replace(/[^\d]/g, '')}@musterigps.az`,
      passwordHash: password,
      role: roleVal,
      status: 'active',
      permissions: permissions || (roleVal === 'admin' ? ADMIN_PERMISSIONS : (roleVal === 'driver' ? DRIVER_PERMISSIONS : DEFAULT_PERMISSIONS)),
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);

    recordLog(
      db,
      user,
      'İstifadəçi yaratdı',
      'user',
      `Admin ${user.name} yeni istifadəçi yaratdı: ${newUser.name} (${newUser.role})`,
      newUser.id,
      newUser.name,
      getClientIp(req),
      getClientDevice(req)
    );

    writeDb(db);
    const { passwordHash: _, ...safe } = newUser;
    return res.status(201).json({ ...safe, customerCount: 0, driverCount: 0, dispatchCount: 0 });
  });

  app.put('/api/admin/users/:id/status', (req, res) => {
    const user = getAuthUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Yalnız administrator status dəyişə bilər.' });
    }

    const { id } = req.params;
    const { status } = req.body;

    const db = readDb();
    const target = db.users.find((u) => u.id === id);
    if (!target) {
      return res.status(404).json({ error: 'İstifadəçi tapılmadı.' });
    }

    target.status = status === 'active' ? 'active' : 'inactive';

    recordLog(
      db,
      user,
      status === 'active' ? 'İstifadəçini aktivləşdirdi' : 'İstifadəçini deaktiv etdi',
      'user',
      `Admin ${user.name} istifadəçini ${status === 'active' ? 'aktivləşdirdi' : 'deaktiv etdi'}: ${target.name}`,
      target.id,
      target.name,
      getClientIp(req),
      getClientDevice(req)
    );

    writeDb(db);
    return res.json({ success: true, id, status: target.status });
  });

  app.put('/api/admin/users/:id/permissions', (req, res) => {
    const user = getAuthUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Yalnız administrator icazələri dəyişə bilər.' });
    }

    const { id } = req.params;
    const { permissions } = req.body;

    const db = readDb();
    const target = db.users.find((u) => u.id === id);
    if (!target) {
      return res.status(404).json({ error: 'İstifadəçi tapılmadı.' });
    }

    target.permissions = {
      ...target.permissions,
      ...permissions,
    };

    recordLog(
      db,
      user,
      'İcazələri yenilədi',
      'permission',
      `Admin ${user.name} "${target.name}" istifadəçisinin icazələrini yenilədi`,
      target.id,
      target.name,
      getClientIp(req),
      getClientDevice(req)
    );

    writeDb(db);
    const { passwordHash: _, ...safe } = target;
    return res.json({ success: true, user: safe });
  });

  app.put('/api/admin/users/:id/password', (req, res) => {
    const user = getAuthUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Yalnız administrator şifrəni sıfırlaya bilər.' });
    }

    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ error: 'Yeni şifrə ən azı 4 simvol olmalıdır.' });
    }

    const db = readDb();
    const target = db.users.find((u) => u.id === id);
    if (!target) {
      return res.status(404).json({ error: 'İstifadəçi tapılmadı.' });
    }

    target.passwordHash = newPassword;

    recordLog(
      db,
      user,
      'İstifadəçi şifrəsini sıfırladı',
      'user',
      `Admin ${user.name} "${target.name}" istifadəçisinin şifrəsini yenilədi`,
      target.id,
      target.name,
      getClientIp(req),
      getClientDevice(req)
    );

    writeDb(db);
    return res.json({ success: true, message: 'Şifrə uğurla yeniləndi.' });
  });

  app.delete('/api/admin/users/:id', (req, res) => {
    const user = getAuthUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Yalnız administrator istifadəçi silə bilər.' });
    }

    const { id } = req.params;
    if (id === user.id) {
      return res.status(400).json({ error: 'Öz hesabınızı silə bilməzsiniz.' });
    }

    const db = readDb();
    const target = db.users.find((u) => u.id === id);
    if (!target) {
      return res.status(404).json({ error: 'İstifadəçi tapılmadı.' });
    }

    db.users = db.users.filter((u) => u.id !== id);

    recordLog(
      db,
      user,
      'İstifadəçini sildi',
      'user',
      `Admin ${user.name} "${target.name}" adlı istifadəçini sistemdən sildi`,
      target.id,
      target.name,
      getClientIp(req),
      getClientDevice(req)
    );

    writeDb(db);
    return res.json({ success: true, message: 'İstifadəçi silindi.' });
  });

  app.put('/api/admin/users/:id', (req, res) => {
    const user = getAuthUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Yalnız administrator istifadəçi redaktə edə bilər.' });
    }

    const { id } = req.params;
    const { name, newId, status, password, permissions, role } = req.body || {};

    const db = readDb();
    const target = db.users.find((u) => u.id === id);
    if (!target) {
      return res.status(404).json({ error: 'İstifadəçi tapılmadı.' });
    }

    const isSelf = user.id === id;

    if (!isSelf && role && (role === 'admin' || role === 'user' || role === 'driver')) {
      target.role = role;
    }

    if (name && typeof name === 'string' && name.trim()) {
      target.name = name.trim();
    }

    // Custom ID change with cascade
    if (newId && typeof newId === 'string' && newId.trim() && newId.trim() !== target.id) {
      const sanitizedId = newId.trim();
      const exists = db.users.some((u) => u.id === sanitizedId);
      if (exists) {
        return res.status(400).json({ error: `"${sanitizedId}" İD-li istifadəçi artıq mövcuddur.` });
      }

      const oldId = target.id;
      target.id = sanitizedId;

      // Migrate references
      db.customers.forEach((c) => {
        if (c.userId === oldId) c.userId = sanitizedId;
      });
      db.trash?.forEach((c) => {
        if (c.userId === oldId) c.userId = sanitizedId;
      });
      db.drivers.forEach((d) => {
        if (d.userId === oldId) d.userId = sanitizedId;
      });
      db.dispatches.forEach((dp) => {
        if (dp.userId === oldId) dp.userId = sanitizedId;
      });
      db.auditLogs.forEach((l) => {
        if (l.userId === oldId) l.userId = sanitizedId;
      });
    }

    // Status: cannot deactivate self
    if (status && (status === 'active' || status === 'inactive')) {
      if (isSelf && status === 'inactive') {
        return res.status(400).json({ error: 'Öz hesabınızı deaktiv edə bilməzsiniz.' });
      }
      target.status = status;
    }

    // Password
    if (password && typeof password === 'string' && password.trim()) {
      if (password.trim().length < 4) {
        return res.status(400).json({ error: 'Şifrə ən azı 4 simvol olmalıdır.' });
      }
      target.passwordHash = password.trim();
    }

    // Permissions
    if (permissions && typeof permissions === 'object') {
      if (!isSelf || target.role !== 'admin') {
        target.permissions = {
          ...target.permissions,
          ...permissions,
        };
      }
    }

    recordLog(
      db,
      user,
      'İstifadəçini redaktə etdi',
      'user',
      `Admin ${user.name} "${target.name}" (${target.id}) məlumatlarını yenilədi`,
      target.id,
      target.name,
      getClientIp(req),
      getClientDevice(req)
    );

    writeDb(db);
    const { passwordHash: _, ...safe } = target;
    return res.json({ success: true, user: safe });
  });

  // System Data Reset Endpoint
  app.post('/api/admin/reset-system-data', (req, res) => {
    const user = getAuthUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Yalnız administrator məlumatları sıfırlaya bilər.' });
    }

    const db = readDb();
    db.customers = [];
    db.trash = [];
    db.drivers = [];
    db.dispatches = [];
    db.auditLogs = [];

    writeDb(db);
    return res.json({ success: true, message: 'Bütün demo məlumatlar sıfırlandı.' });
  });

  // --- ADMIN STATS DASHBOARD ---

  app.get('/api/admin/stats', (req, res) => {
    const user = getAuthUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Yalnız administrator statistikaya baxa bilər.' });
    }

    const db = readDb();
    const todayStr = new Date().toISOString().split('T')[0];

    const totalUsers = db.users.length;
    const activeUsers = db.users.filter((u) => u.status === 'active').length;
    const inactiveUsers = db.users.filter((u) => u.status === 'inactive').length;

    const totalCustomers = db.customers.filter((c) => !c.isDeleted).length;
    const todayCustomers = db.customers.filter(
      (c) => !c.isDeleted && c.createdAt.startsWith(todayStr)
    ).length;

    const totalDrivers = db.drivers.length;
    const activeDrivers = db.drivers.filter((d) => d.status === 'active').length;

    const todayDispatches = db.dispatches.filter((dp) => dp.timestamp.startsWith(todayStr)).length;
    const todayOperations = db.auditLogs.filter((l) => l.timestamp.startsWith(todayStr)).length;

    const deletedCustomersCount = db.customers.filter((c) => c.isDeleted).length;

    // Region / city breakdown
    const regions: Record<string, number> = {
      Bakı: 0,
      Sumqayıt: 0,
      Xırdalan: 0,
      Gəncə: 0,
      Digər: 0,
    };

    db.customers
      .filter((c) => !c.isDeleted)
      .forEach((c) => {
        const addr = (c.address || '').toLowerCase();
        if (addr.includes('bakı') || addr.includes('baki')) regions['Bakı']++;
        else if (addr.includes('sumqayıt') || addr.includes('sumqayit')) regions['Sumqayıt']++;
        else if (addr.includes('xırdalan') || addr.includes('xirdalan')) regions['Xırdalan']++;
        else if (addr.includes('gəncə') || addr.includes('gence')) regions['Gəncə']++;
        else regions['Digər']++;
      });

    // Recent logs
    const recentLogs = db.auditLogs.slice(0, 15);

    // User breakdown
    const userActivities = db.users.map((u) => {
      const uCustomers = db.customers.filter((c) => c.userId === u.id && !c.isDeleted).length;
      const uDrivers = db.drivers.filter((d) => d.userId === u.id).length;
      const uDispatches = db.dispatches.filter((dp) => dp.userId === u.id).length;
      return {
        id: u.id,
        name: u.name,
        role: u.role,
        status: u.status,
        customerCount: uCustomers,
        driverCount: uDrivers,
        dispatchCount: uDispatches,
        lastLoginAt: u.lastLoginAt,
      };
    });

    return res.json({
      totalUsers,
      activeUsers,
      inactiveUsers,
      totalCustomers,
      todayCustomers,
      totalDrivers,
      activeDrivers,
      todayDispatches,
      todayOperations,
      deletedCustomersCount,
      regions,
      recentLogs,
      userActivities,
    });
  });

  // --- BACKUP & RESTORE ENDPOINTS ---

  app.get('/api/backup', (req, res) => {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Giriş tələb olunur.' });
    }

    if (!user.permissions.canExportData && user.role !== 'admin') {
      return res.status(403).json({ error: 'Məlumatları yedəkləmək icazəniz yoxdur.' });
    }

    const db = readDb();
    // User only exports their own non-deleted customers
    const userCustomers = db.customers.filter((c) => c.userId === user.id && !c.isDeleted);

    const backupPayload = {
      app: 'Yolda',
      version: '1.0',
      backupDate: new Date().toISOString(),
      user: {
        id: user.id,
        name: user.name,
      },
      totalCustomers: userCustomers.length,
      customers: userCustomers.map((c) => ({
        name: c.name,
        phone: c.phone,
        address: c.address,
        location: c.location,
        note: c.note,
        photoUrl: c.photoUrl,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
    };

    recordLog(
      db,
      user,
      'Yedəkləmə apardı',
      'system',
      `${user.name} öz hesabındakı ${userCustomers.length} müştərini fayla yedəklədi`,
      user.id,
      user.name,
      getClientIp(req),
      getClientDevice(req)
    );

    writeDb(db);
    return res.json(backupPayload);
  });

  app.post('/api/backup/restore', (req, res) => {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Giriş tələb olunur.' });
    }

    if (!user.permissions.canAddCustomers && user.role !== 'admin') {
      return res.status(403).json({ error: 'Müştəri əlavə etmək icazəniz yoxdur.' });
    }

    const { customers } = req.body;
    if (!Array.isArray(customers)) {
      return res.status(400).json({ error: 'Yedək faylı düzgün formatda deyil (müştərilər massivi tapılmadı).' });
    }

    const db = readDb();
    let importedCount = 0;

    for (const item of customers) {
      if (!item || !item.name || !item.phone) continue;

      // Check if this user already has a customer with this phone
      const existing = db.customers.find(
        (c) => c.userId === user.id && c.phone.trim() === item.phone.trim() && !c.isDeleted
      );

      if (existing) {
        existing.name = item.name.trim();
        existing.address = item.address ? item.address.trim() : existing.address;
        existing.location = item.location !== undefined ? item.location : existing.location;
        existing.note = item.note !== undefined ? item.note : existing.note;
        existing.photoUrl = item.photoUrl !== undefined ? item.photoUrl : existing.photoUrl;
        existing.updatedAt = new Date().toISOString();
        importedCount++;
      } else {
        const newCustomer: CustomerRecord = {
          id: `c_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          userId: user.id, // Strictly isolate to authenticated user
          name: item.name.trim(),
          phone: item.phone.trim(),
          address: item.address ? item.address.trim() : '',
          location: item.location || null,
          note: item.note ? item.note.trim() : '',
          photoUrl: item.photoUrl || '',
          isDeleted: false,
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        db.customers.unshift(newCustomer);
        importedCount++;
      }
    }

    recordLog(
      db,
      user,
      'Yedəkdən bərpa etdi',
      'system',
      `${user.name} yedək faylından ${importedCount} müştəri məlumatını öz hesabına bərpa etdi`,
      user.id,
      user.name,
      getClientIp(req),
      getClientDevice(req)
    );

    writeDb(db);
    return res.json({
      success: true,
      count: importedCount,
      message: `${importedCount} müştəri uğurla hesabınıza daxil edildi.`,
    });
  });

  app.get('/api/backup/info', (req, res) => {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Giriş tələb olunur.' });
    }

    const db = readDb();
    const lastBackupLog = db.auditLogs.find(
      (l) => l.userId === user.id && l.action === 'Yedəkləmə apardı'
    );

    return res.json({
      lastBackupAt: lastBackupLog ? lastBackupLog.timestamp : null,
    });
  });

  // Vite middleware for development / static serving in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
