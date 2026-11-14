import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import multer from 'multer';
import { put } from '@vercel/blob';
import { createServer as createViteServer } from 'vite';
import {
  INITIAL_ADMIN_LOGS,
  INITIAL_CATEGORIES,
  INITIAL_COUPONS,
  INITIAL_CUSTOMERS,
  INITIAL_FEEDBACKS,
  INITIAL_ORDERS,
  INITIAL_PRODUCTS,
  INITIAL_SETTINGS,
  INITIAL_WAITLIST,
} from './src/data/seedCatalog';
import {
  computeCorreiosRatesByCep,
  DEFAULT_SHIPPING_CONFIG,
  sanitizeDigits,
  STORE_ORIGIN_CEP,
} from './src/utils/commerce';
import type {
  AdminActivityLog,
  CategoryItem,
  Coupon,
  CustomerProfile,
  Feedback,
  Order,
  Product,
  ShippingOption,
  StoreSettings,
  UserRole,
  WaitlistEntry,
} from './src/types/store';

const PORT = 3000;
const ROOT_DIR = process.cwd();
const UPLOADS_DIR = path.join(ROOT_DIR, 'uploads');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const DB_FILE = path.join(DATA_DIR, 'store-db.json');
const ADMIN_EMAIL = 'admin@x.com';
const ADMIN_PASS = 'admin4321';
const ALLOWED_ADMIN_GOOGLE = 'nonhu2490@gmail.com';
const SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET || 'bella-menina-makeup-goiania-secret-2026';

fs.mkdirSync(UPLOADS_DIR, { recursive: true });
fs.mkdirSync(DATA_DIR, { recursive: true });

interface StoredCustomer extends CustomerProfile {
  passwordHash?: string;
}

interface StoreDB {
  categories: CategoryItem[];
  products: Product[];
  orders: Order[];
  coupons: Coupon[];
  settings: StoreSettings;
  feedbacks: Feedback[];
  customers: StoredCustomer[];
  waitlist: WaitlistEntry[];
  adminLogs: AdminActivityLog[];
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored?: string): boolean {
  if (!stored || !stored.includes(':')) return false;
  const [salt, keyHex] = stored.split(':');
  const keyBuf = Buffer.from(keyHex, 'hex');
  const derived = crypto.scryptSync(password, salt, 64);
  if (keyBuf.length !== derived.length) return false;
  return crypto.timingSafeEqual(keyBuf, derived);
}

function toPublicCustomer(c: StoredCustomer): CustomerProfile {
  const { passwordHash: _ph, ...safe } = c;
  return safe;
}

function loadDB(): StoreDB {
  try {
    if (fs.existsSync(DB_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      if (parsed && Array.isArray(parsed.products) && parsed.settings) {
        return {
          categories:
            Array.isArray(parsed.categories) && parsed.categories.length > 0
              ? parsed.categories
              : INITIAL_CATEGORIES,
          products: parsed.products,
          orders: Array.isArray(parsed.orders) ? parsed.orders : INITIAL_ORDERS,
          coupons: Array.isArray(parsed.coupons) ? parsed.coupons : INITIAL_COUPONS,
          settings: {
            ...INITIAL_SETTINGS,
            ...parsed.settings,
            logoUrl: parsed.settings.logoUrl || INITIAL_SETTINGS.logoUrl,
            shippingConfig: {
              ...INITIAL_SETTINGS.shippingConfig,
              ...(parsed.settings.shippingConfig || {}),
            },
            paymentConfig: {
              ...INITIAL_SETTINGS.paymentConfig,
              ...(parsed.settings.paymentConfig || {}),
            },
          },
          feedbacks: Array.isArray(parsed.feedbacks) ? parsed.feedbacks : INITIAL_FEEDBACKS,
          customers: Array.isArray(parsed.customers)
            ? parsed.customers
            : INITIAL_CUSTOMERS.map((c) => ({ ...c, passwordHash: hashPassword('cliente123') })),
          waitlist: Array.isArray(parsed.waitlist) ? parsed.waitlist : INITIAL_WAITLIST,
          adminLogs: Array.isArray(parsed.adminLogs) ? parsed.adminLogs : INITIAL_ADMIN_LOGS,
        };
      }
    }
  } catch {
    // Fallback to initial seed
  }
  const initial: StoreDB = {
    categories: INITIAL_CATEGORIES,
    products: INITIAL_PRODUCTS,
    orders: INITIAL_ORDERS,
    coupons: INITIAL_COUPONS,
    settings: INITIAL_SETTINGS,
    feedbacks: INITIAL_FEEDBACKS,
    customers: INITIAL_CUSTOMERS.map((c) => ({ ...c, passwordHash: hashPassword('cliente123') })),
    waitlist: INITIAL_WAITLIST,
    adminLogs: INITIAL_ADMIN_LOGS,
  };
  fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf8');
  return initial;
}

let dbState: StoreDB = loadDB();
const sseClients = new Set<express.Response>();

function saveAndBroadcast() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbState, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to persist store-db.json:', err);
  }
  const payload = `data: ${JSON.stringify({ type: 'sync', updatedAt: Date.now() })}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(payload);
    } catch {
      sseClients.delete(res);
    }
  }
}

function appendAdminLog(
  actorEmail: string,
  action: string,
  entityType: AdminActivityLog['entityType'],
  details: string,
  entityId?: string
) {
  const entry: AdminActivityLog = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    actorEmail,
    action,
    entityType,
    ...(entityId ? { entityId } : {}),
    details,
    createdAt: new Date().toISOString(),
  };
  dbState.adminLogs = [entry, ...dbState.adminLogs].slice(0, 200);
}

interface SessionPayload {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  exp: number;
}

function signSessionToken(user: Omit<SessionPayload, 'exp'>): string {
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const body = Buffer.from(JSON.stringify({ ...user, exp })).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifyToken(token: string | undefined): SessionPayload | null {
  if (!token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
    if (data.exp && Date.now() > data.exp) return null;
    if (!data.email || (data.role !== 'admin' && data.role !== 'customer')) return null;
    return data;
  } catch {
    return null;
  }
}

function parseCookies(cookieHeader?: string): Record<string, string> {
  const map: Record<string, string> = {};
  if (!cookieHeader) return map;
  for (const pair of cookieHeader.split(';')) {
    const idx = pair.indexOf('=');
    if (idx > -1) {
      const k = pair.slice(0, idx).trim();
      const v = pair.slice(idx + 1).trim();
      map[k] = decodeURIComponent(v);
    }
  }
  return map;
}

function getSessionFromReq(req: express.Request): SessionPayload | null {
  const cookies = parseCookies(req.headers.cookie);
  const authHeader = req.headers.authorization;
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  return verifyToken(bearer || cookies['bm_session'] || cookies['bm_admin_session']);
}

function setSessionCookie(res: express.Response, token: string) {
  res.setHeader('Set-Cookie', [
    `bm_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`,
    `bm_admin_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`,
  ]);
}

function clearSessionCookies(res: express.Response) {
  res.setHeader('Set-Cookie', [
    'bm_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
    'bm_admin_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
  ]);
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const verified = getSessionFromReq(req);
  if (!verified || verified.role !== 'admin') {
    return res.status(401).json({ error: 'Acesso restrito a administradores.' });
  }
  (req as express.Request & { sessionUser?: SessionPayload }).sessionUser = verified;
  next();
}

function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const verified = getSessionFromReq(req);
  if (!verified) {
    return res.status(401).json({ error: 'Faça login para continuar.' });
  }
  (req as express.Request & { sessionUser?: SessionPayload }).sessionUser = verified;
  next();
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

async function fetchWithTimeout(url: string, init?: RequestInit, timeoutMs = 4500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function queryLiveCorreiosRates(
  destCep: string,
  weightGrams: number,
  city?: string,
  state?: string,
  subtotal = 0
): Promise<ShippingOption[]> {
  const shippingConfig = dbState.settings.shippingConfig || DEFAULT_SHIPPING_CONFIG;
  const originCep = sanitizeDigits(shippingConfig.originCep || STORE_ORIGIN_CEP) || STORE_ORIGIN_CEP;
  const safeWeightKg = Math.max(0.3, Math.round((weightGrams / 1000) * 100) / 100);
  const safeWeightGr = Math.max(300, Math.round(weightGrams));
  const localBase = computeCorreiosRatesByCep(
    destCep,
    weightGrams,
    city,
    state,
    shippingConfig,
    subtotal
  );

  // 1. Official Correios CWS API when contract credentials exist
  if (process.env.CORREIOS_USER && process.env.CORREIOS_PASSWORD) {
    try {
      const basic = Buffer.from(
        `${process.env.CORREIOS_USER}:${process.env.CORREIOS_PASSWORD}`
      ).toString('base64');
      const tokenRes = await fetchWithTimeout('https://api.correios.com.br/token/v1/autentica', {
        method: 'POST',
        headers: { Authorization: `Basic ${basic}` },
      });
      if (tokenRes.ok) {
        const tokenData = (await tokenRes.json()) as { token?: string };
        if (tokenData.token) {
          const [pacRes, sedexRes] = await Promise.all([
            fetchWithTimeout(
              `https://api.correios.com.br/preco/v1/nacional/03298?cepOrigem=${originCep}&cepDestino=${destCep}&psObjeto=${safeWeightGr}`,
              { headers: { Authorization: `Bearer ${tokenData.token}` } }
            ),
            fetchWithTimeout(
              `https://api.correios.com.br/preco/v1/nacional/03220?cepOrigem=${originCep}&cepDestino=${destCep}&psObjeto=${safeWeightGr}`,
              { headers: { Authorization: `Bearer ${tokenData.token}` } }
            ),
          ]);
          if (pacRes.ok && sedexRes.ok) {
            const pacData = (await pacRes.json()) as { pcFinal?: string };
            const sedexData = (await sedexRes.json()) as { pcFinal?: string };
            const pacVal = Number(String(pacData.pcFinal || '0').replace(',', '.'));
            const sedexVal = Number(String(sedexData.pcFinal || '0').replace(',', '.'));
            if (pacVal > 0 && sedexVal > 0) {
              return localBase.map((opt) => {
                if (opt.service === 'PAC') {
                  return { ...opt, price: opt.price === 0 ? 0 : pacVal, providerSource: 'correios-api' };
                }
                if (opt.service === 'SEDEX') {
                  return { ...opt, price: sedexVal, providerSource: 'correios-api' };
                }
                return opt;
              });
            }
          }
        }
      }
    } catch {
      // Proceed to public carrier gateway
    }
  }

  // 2 & 3. Race public CepCerto & legacy Correios XML with 2.2s timeout
  try {
    const cepCertoPromise = (async (): Promise<ShippingOption[]> => {
      const cepCertoUrl = `https://www.cepcerto.com/ws/json-frete/${originCep}/${destCep}/${safeWeightGr}/12/16/20`;
      const res = await fetchWithTimeout(cepCertoUrl, undefined, 2200);
      if (!res.ok) throw new Error('cepcerto-not-ok');
      const data = (await res.json()) as {
        valorpac?: string;
        prazopac?: string;
        valorsedex?: string;
        prazosedex?: string;
      };
      const pacPrice = Number(String(data.valorpac || '').replace(',', '.'));
      const sedexPrice = Number(String(data.valorsedex || '').replace(',', '.'));
      const pacDays = Number(data.prazopac || 0);
      const sedexDays = Number(data.prazosedex || 0);
      if (pacPrice <= 0 || sedexPrice <= 0) throw new Error('cepcerto-empty');

      return localBase.map((opt) => {
        if (opt.service === 'PAC') {
          const days = (pacDays || opt.deliveryDays) + (shippingConfig.extraHandlingDays || 0);
          return {
            ...opt,
            price: opt.price === 0 ? 0 : Math.round(pacPrice * 100) / 100,
            deliveryDays: days,
            estimateText:
              opt.price === 0
                ? `Frete Grátis · Entrega em até ${days} dias úteis`
                : `Entrega em até ${days} dias úteis`,
            providerSource: 'cepcerto-api',
          };
        }
        if (opt.service === 'SEDEX') {
          const days = (sedexDays || opt.deliveryDays) + (shippingConfig.extraHandlingDays || 0);
          return {
            ...opt,
            price: Math.round(sedexPrice * 100) / 100,
            deliveryDays: days,
            estimateText: `Entrega em até ${days} dias úteis`,
            providerSource: 'cepcerto-api',
          };
        }
        return opt;
      });
    })();

    const xmlPromise = (async (): Promise<ShippingOption[]> => {
      const xmlUrl =
        `http://ws.correios.com.br/calculador/CalcPrecoPrazo.asmx/CalcPrecoPrazo` +
        `?nCdEmpresa=&sDsSenha=&nCdServico=04510,04014&sCepOrigem=${originCep}&sCepDestino=${destCep}` +
        `&nVlPeso=${safeWeightKg}&nCdFormato=1&nVlComprimento=20&nVlAltura=12&nVlLargura=16` +
        `&nVlDiametro=0&sCdMaoPropria=n&nVlValorDeclarado=0&sCdAvisoRecebimento=n&StrRetorno=xml`;
      const xmlRes = await fetchWithTimeout(xmlUrl, undefined, 2200);
      if (!xmlRes.ok) throw new Error('xml-not-ok');
      const xml = await xmlRes.text();
      const blocks = xml.match(/<cServico>[\s\S]*?<\/cServico>/g) || [];
      const parsedRates: Partial<Record<'PAC' | 'SEDEX', { price: number; days: number }>> = {};
      for (const block of blocks) {
        const code = block.match(/<Codigo>(\d+)<\/Codigo>/)?.[1];
        const valor = Number(
          (block.match(/<Valor>([\d.,]+)<\/Valor>/)?.[1] || '0').replace('.', '').replace(',', '.')
        );
        const prazo = Number(block.match(/<PrazoEntrega>(\d+)<\/PrazoEntrega>/)?.[1] || '0');
        if (code === '04510' && valor > 0) parsedRates.PAC = { price: valor, days: prazo || 6 };
        if (code === '04014' && valor > 0) parsedRates.SEDEX = { price: valor, days: prazo || 3 };
      }
      if (!parsedRates.PAC || !parsedRates.SEDEX) throw new Error('xml-empty');

      return localBase.map((opt) => {
        if (opt.service === 'PAC' && parsedRates.PAC) {
          const days = parsedRates.PAC.days + (shippingConfig.extraHandlingDays || 0);
          return {
            ...opt,
            code: '04510',
            price: opt.price === 0 ? 0 : parsedRates.PAC.price,
            deliveryDays: days,
            estimateText:
              opt.price === 0
                ? `Frete Grátis · Entrega em até ${days} dias úteis`
                : `Entrega em até ${days} dias úteis`,
            providerSource: 'correios-api',
          };
        }
        if (opt.service === 'SEDEX' && parsedRates.SEDEX) {
          const days = parsedRates.SEDEX.days + (shippingConfig.extraHandlingDays || 0);
          return {
            ...opt,
            code: '04014',
            price: parsedRates.SEDEX.price,
            deliveryDays: days,
            estimateText: `Entrega em até ${days} dias úteis`,
            providerSource: 'correios-api',
          };
        }
        return opt;
      });
    })();

    return await Promise.any([cepCertoPromise, xmlPromise]);
  } catch {
    // Fallback to calibrated Correios tariff table
  }

  return localBase;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '6mb' }));

  app.use('/uploads', express.static(UPLOADS_DIR));
  app.use('/src/assets', express.static(path.join(ROOT_DIR, 'src/assets')));

  // Real-time Server-Sent Events stream
  app.get('/api/store/stream', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
    sseClients.add(res);
    req.on('close', () => {
      sseClients.delete(res);
    });
  });

  // Public + Role-Scoped Store State
  app.get('/api/store/state', (req, res) => {
    const session = getSessionFromReq(req);
    const isAdminUser = session?.role === 'admin';
    const isCustomerUser = session?.role === 'customer';

    let customerProfile: CustomerProfile | null = null;
    let customerOrders: Order[] = [];
    let customerWaitlist: WaitlistEntry[] = [];

    if (isCustomerUser && session) {
      const found = dbState.customers.find(
        (c) => c.id === session.id || c.email.toLowerCase() === session.email.toLowerCase()
      );
      if (found && !found.blocked) {
        customerProfile = toPublicCustomer(found);
        customerOrders = dbState.orders.filter(
          (o) =>
            o.customerId === found.id ||
            (o.customerEmail && o.customerEmail.toLowerCase() === found.email.toLowerCase())
        );
        customerWaitlist = dbState.waitlist.filter((w) => w.customerId === found.id);
      }
    }

    res.json({
      categories: [...dbState.categories].sort((a, b) => a.order - b.order),
      products: dbState.products,
      coupons: dbState.coupons,
      settings: dbState.settings,
      feedbacks: dbState.feedbacks,
      orders: isAdminUser ? dbState.orders : customerOrders,
      customers: isAdminUser ? dbState.customers.map(toPublicCustomer) : [],
      adminLogs: isAdminUser ? dbState.adminLogs : [],
      customerProfile,
      customerWaitlist,
    });
  });

  // UNIFIED AUTHENTICATION (Admin vs Customer auto-role routing)
  app.post('/api/auth/login', (req, res) => {
    const cleanEmail = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!cleanEmail || !password) {
      return res.status(400).json({ error: 'Informe e-mail e senha.' });
    }

    // 1. Pre-configured Admin credentials
    if (cleanEmail === ADMIN_EMAIL) {
      if (password !== ADMIN_PASS) {
        return res.status(401).json({ error: 'Senha de administrador incorreta.' });
      }
      const user = {
        id: 'admin-root',
        email: ADMIN_EMAIL,
        name: 'Administradora Bella Menina',
        role: 'admin' as const,
      };
      const token = signSessionToken(user);
      setSessionCookie(res, token);
      appendAdminLog(ADMIN_EMAIL, 'Login administrativo realizado', 'auth', 'Sessão iniciada via login único.');
      saveAndBroadcast();
      return res.json({ authenticated: true, user, token });
    }

    // 2. Customer lookup
    const customer = dbState.customers.find((c) => c.email.toLowerCase() === cleanEmail);
    if (!customer || !verifyPassword(password, customer.passwordHash)) {
      return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    }
    if (customer.blocked) {
      return res.status(403).json({
        error: 'Sua conta está temporariamente bloqueada. Entre em contato pelo WhatsApp da loja.',
      });
    }

    const user = {
      id: customer.id,
      email: customer.email,
      name: customer.name,
      role: 'customer' as const,
    };
    const token = signSessionToken(user);
    setSessionCookie(res, token);
    return res.json({
      authenticated: true,
      user,
      profile: toPublicCustomer(customer),
      token,
    });
  });

  app.post('/api/auth/register', (req, res) => {
    const { name, email, password, phone, cpf, birthDate } = req.body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanName = String(name || '').trim();
    const cleanPhone = String(phone || '').trim();

    if (!cleanName || !cleanEmail.includes('@') || String(password || '').length < 6) {
      return res
        .status(400)
        .json({ error: 'Preencha nome completo, e-mail válido e senha com no mínimo 6 caracteres.' });
    }
    if (cleanEmail === ADMIN_EMAIL || cleanEmail === ALLOWED_ADMIN_GOOGLE) {
      return res.status(403).json({ error: 'Este e-mail é reservado à administração.' });
    }
    if (dbState.customers.some((c) => c.email.toLowerCase() === cleanEmail)) {
      return res.status(409).json({ error: 'Já existe uma conta cadastrada com este e-mail.' });
    }

    const now = new Date().toISOString();
    const newCustomer: StoredCustomer = {
      id: `cust-${Date.now()}`,
      name: cleanName,
      email: cleanEmail,
      cpf: cpf ? String(cpf).trim() : '',
      birthDate: birthDate ? String(birthDate).trim() : '',
      phone: cleanPhone || '(62) 99999-0000',
      role: 'customer',
      blocked: false,
      addresses: [],
      passwordHash: hashPassword(String(password)),
      createdAt: now,
      updatedAt: now,
    };

    dbState.customers.unshift(newCustomer);
    saveAndBroadcast();

    const user = {
      id: newCustomer.id,
      email: newCustomer.email,
      name: newCustomer.name,
      role: 'customer' as const,
    };
    const token = signSessionToken(user);
    setSessionCookie(res, token);
    return res.status(201).json({
      authenticated: true,
      user,
      profile: toPublicCustomer(newCustomer),
      token,
    });
  });

  app.post('/api/auth/google-sync', (req, res) => {
    const cleanEmail = String(req.body?.email || '').trim().toLowerCase();
    const cleanName = String(req.body?.name || '').trim() || 'Cliente Bella Menina';
    const uid = String(req.body?.uid || '').trim();

    if (!cleanEmail) {
      return res.status(400).json({ error: 'E-mail Google inválido.' });
    }

    if (cleanEmail === ALLOWED_ADMIN_GOOGLE || cleanEmail === ADMIN_EMAIL) {
      const user = {
        id: uid || 'admin-google',
        email: cleanEmail,
        name: cleanName,
        role: 'admin' as const,
      };
      const token = signSessionToken(user);
      setSessionCookie(res, token);
      appendAdminLog(cleanEmail, 'Login Google administrativo', 'auth', 'Autenticado via Google Firebase.');
      saveAndBroadcast();
      return res.json({ authenticated: true, user, token });
    }

    let customer = dbState.customers.find((c) => c.email.toLowerCase() === cleanEmail);
    if (!customer) {
      const now = new Date().toISOString();
      customer = {
        id: uid || `cust-${Date.now()}`,
        name: cleanName,
        email: cleanEmail,
        phone: '(62) 99999-0000',
        role: 'customer',
        blocked: false,
        addresses: [],
        createdAt: now,
        updatedAt: now,
      };
      dbState.customers.unshift(customer);
      saveAndBroadcast();
    } else if (customer.blocked) {
      return res.status(403).json({
        error: 'Sua conta está bloqueada pela administração.',
      });
    }

    const user = {
      id: customer.id,
      email: customer.email,
      name: customer.name,
      role: 'customer' as const,
    };
    const token = signSessionToken(user);
    setSessionCookie(res, token);
    return res.json({
      authenticated: true,
      user,
      profile: toPublicCustomer(customer),
      token,
    });
  });

  app.get('/api/auth/session', (req, res) => {
    const verified = getSessionFromReq(req);
    if (!verified) {
      return res.json({ authenticated: false, user: null });
    }
    if (verified.role === 'customer') {
      const c = dbState.customers.find((item) => item.id === verified.id);
      if (!c || c.blocked) {
        clearSessionCookies(res);
        return res.json({ authenticated: false, user: null });
      }
      return res.json({
        authenticated: true,
        user: { id: c.id, email: c.email, name: c.name, role: 'customer' },
        profile: toPublicCustomer(c),
      });
    }
    return res.json({
      authenticated: true,
      user: { id: verified.id, email: verified.email, name: verified.name, role: verified.role },
    });
  });

  app.post('/api/auth/logout', (_req, res) => {
    clearSessionCookies(res);
    res.json({ ok: true });
  });

  // Backward-compatible admin auth endpoints
  app.post('/api/admin/login', (req, res) => {
    const cleanEmail = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (cleanEmail === ADMIN_EMAIL && password === ADMIN_PASS) {
      const user = {
        id: 'admin-root',
        email: ADMIN_EMAIL,
        name: 'Administradora Bella Menina',
        role: 'admin' as const,
      };
      const token = signSessionToken(user);
      setSessionCookie(res, token);
      return res.json({ authenticated: true, user, token });
    }
    return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
  });

  app.get('/api/admin/session', (req, res) => {
    const verified = getSessionFromReq(req);
    if (!verified || verified.role !== 'admin') {
      return res.json({ authenticated: false });
    }
    return res.json({ authenticated: true, user: verified });
  });

  app.post('/api/admin/logout', (_req, res) => {
    clearSessionCookies(res);
    res.json({ ok: true });
  });

  // Customer Self-Service Routes (Minha Conta)
  app.put('/api/customer/profile', requireAuth, (req, res) => {
    const session = (req as express.Request & { sessionUser: SessionPayload }).sessionUser;
    if (session.role !== 'customer') {
      return res.status(403).json({ error: 'Perfil exclusivo de clientes.' });
    }
    const idx = dbState.customers.findIndex((c) => c.id === session.id);
    if (idx < 0) return res.status(404).json({ error: 'Cliente não encontrado.' });

    const { name, email, cpf, birthDate, phone, secondaryPhone, addresses } = req.body || {};
    const current = dbState.customers[idx];

    const updated: StoredCustomer = {
      ...current,
      name: typeof name === 'string' && name.trim().length >= 2 ? name.trim() : current.name,
      email:
        typeof email === 'string' && email.includes('@')
          ? email.trim().toLowerCase()
          : current.email,
      cpf: typeof cpf === 'string' ? cpf.trim() : current.cpf,
      birthDate: typeof birthDate === 'string' ? birthDate.trim() : current.birthDate,
      phone: typeof phone === 'string' && phone.trim() ? phone.trim() : current.phone,
      secondaryPhone:
        typeof secondaryPhone === 'string' ? secondaryPhone.trim() : current.secondaryPhone,
      addresses: Array.isArray(addresses) ? addresses.slice(0, 10) : current.addresses,
      role: 'customer',
      blocked: current.blocked,
      updatedAt: new Date().toISOString(),
    };

    dbState.customers[idx] = updated;
    saveAndBroadcast();
    res.json(toPublicCustomer(updated));
  });

  app.post('/api/customer/password', requireAuth, (req, res) => {
    const session = (req as express.Request & { sessionUser: SessionPayload }).sessionUser;
    if (session.role !== 'customer') {
      return res.status(403).json({ error: 'Somente clientes alteram senha por aqui.' });
    }
    const idx = dbState.customers.findIndex((c) => c.id === session.id);
    if (idx < 0) return res.status(404).json({ error: 'Cliente não encontrado.' });

    const { currentPassword, newPassword } = req.body || {};
    if (String(newPassword || '').length < 6) {
      return res.status(400).json({ error: 'A nova senha deve ter no mínimo 6 caracteres.' });
    }
    const cust = dbState.customers[idx];
    if (cust.passwordHash && !verifyPassword(String(currentPassword || ''), cust.passwordHash)) {
      return res.status(401).json({ error: 'Senha atual incorreta.' });
    }

    dbState.customers[idx] = {
      ...cust,
      passwordHash: hashPassword(String(newPassword)),
      updatedAt: new Date().toISOString(),
    };
    saveAndBroadcast();
    res.json({ ok: true });
  });

  app.post('/api/customer/waitlist', requireAuth, (req, res) => {
    const session = (req as express.Request & { sessionUser: SessionPayload }).sessionUser;
    const { productId } = req.body || {};
    const prod = dbState.products.find((p) => p.id === productId);
    if (!prod) return res.status(404).json({ error: 'Produto não encontrado.' });

    const exists = dbState.waitlist.find(
      (w) => w.customerId === session.id && w.productId === prod.id
    );
    if (exists) return res.json(exists);

    const entry: WaitlistEntry = {
      id: `wl-${Date.now()}`,
      customerId: session.id,
      customerEmail: session.email,
      productId: prod.id,
      productName: prod.name,
      productImage: prod.images[0] || '',
      productPrice:
        typeof prod.promoPrice === 'number' && prod.promoPrice > 0 ? prod.promoPrice : prod.price,
      createdAt: new Date().toISOString(),
    };
    dbState.waitlist.unshift(entry);
    saveAndBroadcast();
    res.status(201).json(entry);
  });

  app.delete('/api/customer/waitlist/:productId', requireAuth, (req, res) => {
    const session = (req as express.Request & { sessionUser: SessionPayload }).sessionUser;
    dbState.waitlist = dbState.waitlist.filter(
      (w) => !(w.customerId === session.id && w.productId === req.params.productId)
    );
    saveAndBroadcast();
    res.json({ ok: true });
  });

  // Device upload -> Vercel Blob
  app.post('/api/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado do dispositivo.' });
    }

    const ext = path.extname(req.file.originalname || '') || '.bin';
    const base = path
      .basename(req.file.originalname || 'media', ext)
      .replace(/[^a-zA-Z0-9_-]/g, '-')
      .slice(0, 40);
    const filename = `bella-menina/${Date.now()}-${base}${ext}`;

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const blob = await put(filename, req.file.buffer, {
          access: 'public',
          token: process.env.BLOB_READ_WRITE_TOKEN,
          contentType: req.file.mimetype,
        });
        return res.json({
          url: blob.url,
          pathname: blob.pathname,
          storage: 'vercel-blob',
        });
      } catch (err) {
        console.error('Vercel Blob upload error:', err);
        return res.status(500).json({ error: 'Falha ao enviar arquivo para o Vercel Blob.' });
      }
    }

    const localName = `${Date.now()}-${base}${ext}`;
    fs.writeFileSync(path.join(UPLOADS_DIR, localName), req.file.buffer);
    return res.json({
      url: `/uploads/${localName}`,
      pathname: localName,
      storage: 'local-preview',
    });
  });

  // Real CEP Lookup (ViaCEP + BrasilAPI + resilient BR postal prefix fallback)
  app.get('/api/cep/:cep', async (req, res) => {
    const cep = sanitizeDigits(req.params.cep);
    if (cep.length !== 8) {
      return res.status(400).json({ error: 'CEP deve conter 8 dígitos.' });
    }

    try {
      const viaRes = await fetchWithTimeout(`https://viacep.com.br/ws/${cep}/json/`, undefined, 2500);
      if (viaRes.ok) {
        const data = (await viaRes.json()) as {
          erro?: boolean;
          logradouro?: string;
          bairro?: string;
          localidade?: string;
          uf?: string;
        };
        if (!data.erro && data.localidade) {
          return res.json({
            cep,
            street: data.logradouro || '',
            neighborhood: data.bairro || '',
            city: data.localidade || '',
            state: data.uf || '',
          });
        }
      }
    } catch {
      // Try BrasilAPI
    }

    try {
      const brRes = await fetchWithTimeout(
        `https://brasilapi.com.br/api/cep/v2/${cep}`,
        undefined,
        2500
      );
      if (brRes.ok) {
        const data = (await brRes.json()) as {
          street?: string;
          neighborhood?: string;
          city?: string;
          state?: string;
        };
        if (data.city) {
          return res.json({
            cep,
            street: data.street || '',
            neighborhood: data.neighborhood || '',
            city: data.city || '',
            state: data.state || '',
          });
        }
      }
    } catch {
      // Fallback to local postal directory
    }

    const KNOWN_CEPS: Record<
      string,
      { street: string; neighborhood: string; city: string; state: string }
    > = {
      '74470538': {
        street: 'Alameda Higino Pires Martins',
        neighborhood: 'Residencial Solar Ville',
        city: 'Goiânia',
        state: 'GO',
      },
      '74150050': {
        street: 'Rua 135',
        neighborhood: 'Setor Marista',
        city: 'Goiânia',
        state: 'GO',
      },
      '74000000': {
        street: 'Avenida Goiás',
        neighborhood: 'Setor Central',
        city: 'Goiânia',
        state: 'GO',
      },
      '01310100': {
        street: 'Avenida Paulista',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
      },
    };

    if (KNOWN_CEPS[cep]) {
      return res.json({ cep, ...KNOWN_CEPS[cep], source: 'local-directory' });
    }

    const prefix2 = Number(cep.slice(0, 2));
    if (prefix2 >= 74 && prefix2 <= 76) {
      return res.json({
        cep,
        street: '',
        neighborhood: cep.startsWith('749') ? 'Centro' : 'Setor Urbano',
        city: cep.startsWith('749') ? 'Aparecida de Goiânia' : 'Goiânia',
        state: 'GO',
        source: 'postal-prefix',
      });
    }
    if (prefix2 >= 70 && prefix2 <= 73) {
      return res.json({ cep, street: '', neighborhood: 'Plano Piloto', city: 'Brasília', state: 'DF', source: 'postal-prefix' });
    }
    if (prefix2 >= 1 && prefix2 <= 19) {
      return res.json({ cep, street: '', neighborhood: 'Centro', city: 'São Paulo', state: 'SP', source: 'postal-prefix' });
    }
    if (prefix2 >= 20 && prefix2 <= 28) {
      return res.json({ cep, street: '', neighborhood: 'Centro', city: 'Rio de Janeiro', state: 'RJ', source: 'postal-prefix' });
    }
    if (prefix2 >= 30 && prefix2 <= 39) {
      return res.json({ cep, street: '', neighborhood: 'Centro', city: 'Belo Horizonte', state: 'MG', source: 'postal-prefix' });
    }
    if (prefix2 >= 40 && prefix2 <= 48) {
      return res.json({ cep, street: '', neighborhood: 'Centro', city: 'Salvador', state: 'BA', source: 'postal-prefix' });
    }
    if (prefix2 >= 50 && prefix2 <= 56) {
      return res.json({ cep, street: '', neighborhood: 'Boa Viagem', city: 'Recife', state: 'PE', source: 'postal-prefix' });
    }
    if (prefix2 >= 60 && prefix2 <= 63) {
      return res.json({ cep, street: '', neighborhood: 'Aldeota', city: 'Fortaleza', state: 'CE', source: 'postal-prefix' });
    }
    if (prefix2 >= 80 && prefix2 <= 87) {
      return res.json({ cep, street: '', neighborhood: 'Batel', city: 'Curitiba', state: 'PR', source: 'postal-prefix' });
    }
    if (prefix2 >= 90 && prefix2 <= 99) {
      return res.json({ cep, street: '', neighborhood: 'Moinhos de Vento', city: 'Porto Alegre', state: 'RS', source: 'postal-prefix' });
    }

    return res.json({ cep, street: '', neighborhood: '', city: 'Brasil', state: 'BR', source: 'postal-prefix' });
  });

  // Real Correios PAC & SEDEX Calculation
  app.post('/api/shipping/correios', async (req, res) => {
    const { destCep, weightGrams, city, state, subtotal } = req.body || {};
    const cleanCep = sanitizeDigits(String(destCep || ''));
    if (cleanCep.length !== 8) {
      return res.status(400).json({ error: 'Informe um CEP de destino válido (8 dígitos).' });
    }
    const safeWeight = Math.max(300, Number(weightGrams) || 300);
    const safeSubtotal = Math.max(0, Number(subtotal) || 0);
    const options = await queryLiveCorreiosRates(cleanCep, safeWeight, city, state, safeSubtotal);
    const originCep =
      sanitizeDigits(dbState.settings.shippingConfig?.originCep || STORE_ORIGIN_CEP) ||
      STORE_ORIGIN_CEP;
    res.json({ originCep, destCep: cleanCep, weightGrams: safeWeight, options });
  });

  // Public + Authenticated Order Creation
  app.post('/api/orders', (req, res) => {
    const session = getSessionFromReq(req);
    const order = req.body as Order;
    if (!order || !order.customerName || !Array.isArray(order.items) || order.items.length === 0) {
      return res.status(400).json({ error: 'Dados do pedido inválidos.' });
    }
    const now = new Date().toISOString();
    const saved: Order = {
      ...order,
      id: order.id || `ord-${Date.now()}`,
      orderNumber: order.orderNumber || `BM-${Math.floor(1000 + Math.random() * 9000)}`,
      customerId: order.customerId || (session?.role === 'customer' ? session.id : undefined),
      customerEmail: order.customerEmail || (session?.role === 'customer' ? session.email : undefined),
      createdAt: now,
      updatedAt: now,
    };
    dbState.orders.unshift(saved);

    for (const item of saved.items) {
      const prod = dbState.products.find((p) => p.id === item.productId);
      if (prod) {
        prod.stock = Math.max(0, prod.stock - item.quantity);
        prod.salesCount = (prod.salesCount || 0) + item.quantity;
        prod.updatedAt = now;
      }
    }

    if (saved.couponCode) {
      const cup = dbState.coupons.find(
        (c) => c.code.toUpperCase() === saved.couponCode?.toUpperCase()
      );
      if (cup) {
        cup.usedCount += 1;
        cup.updatedAt = now;
      }
    }

    if (session?.role === 'admin') {
      appendAdminLog(
        session.email,
        `Pedido #${saved.orderNumber} registrado (${saved.origin})`,
        'order',
        `Total R$ ${saved.total.toFixed(2)} - Cliente: ${saved.customerName}`,
        saved.id
      );
    }

    saveAndBroadcast();
    res.status(201).json(saved);
  });

  // ADMIN CRUD: Products
  app.post('/api/admin/products', requireAdmin, (req, res) => {
    const actor = (req as express.Request & { sessionUser: SessionPayload }).sessionUser.email;
    const body = req.body as Product;
    const now = new Date().toISOString();
    const id = body.id || `prod-${Date.now()}`;
    const existingIdx = dbState.products.findIndex((p) => p.id === id);
    const record: Product = {
      ...body,
      id,
      createdAt: existingIdx >= 0 ? dbState.products[existingIdx].createdAt : now,
      updatedAt: now,
    };
    if (existingIdx >= 0) {
      dbState.products[existingIdx] = record;
      appendAdminLog(actor, 'Produto atualizado', 'product', `${record.name} (${record.sku})`, id);
    } else {
      dbState.products.unshift(record);
      appendAdminLog(actor, 'Produto criado', 'product', `${record.name} (${record.sku})`, id);
    }
    saveAndBroadcast();
    res.json(record);
  });

  app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
    const actor = (req as express.Request & { sessionUser: SessionPayload }).sessionUser.email;
    const target = dbState.products.find((p) => p.id === req.params.id);
    dbState.products = dbState.products.filter((p) => p.id !== req.params.id);
    appendAdminLog(
      actor,
      'Produto excluído',
      'product',
      target ? `${target.name} (${target.sku})` : req.params.id,
      req.params.id
    );
    saveAndBroadcast();
    res.json({ ok: true });
  });

  app.patch('/api/admin/stock/:productId', requireAdmin, (req, res) => {
    const actor = (req as express.Request & { sessionUser: SessionPayload }).sessionUser.email;
    const idx = dbState.products.findIndex((p) => p.id === req.params.productId);
    if (idx < 0) return res.status(404).json({ error: 'Produto não encontrado.' });
    const nextStock = Math.max(0, Math.round(Number(req.body?.stock) || 0));
    const prevStock = dbState.products[idx].stock;
    dbState.products[idx] = {
      ...dbState.products[idx],
      stock: nextStock,
      updatedAt: new Date().toISOString(),
    };
    appendAdminLog(
      actor,
      'Estoque ajustado',
      'stock',
      `${dbState.products[idx].sku}: ${prevStock} -> ${nextStock} un.`,
      dbState.products[idx].id
    );
    saveAndBroadcast();
    res.json(dbState.products[idx]);
  });

  // ADMIN CRUD: Categories
  app.post('/api/admin/categories', requireAdmin, (req, res) => {
    const actor = (req as express.Request & { sessionUser: SessionPayload }).sessionUser.email;
    const rawName = String(req.body?.name || '').trim();
    if (rawName.length < 2 || rawName.length > 60) {
      return res.status(400).json({ error: 'Nome da categoria deve ter entre 2 e 60 caracteres.' });
    }
    const duplicate = dbState.categories.find(
      (c) => c.name.toLowerCase() === rawName.toLowerCase()
    );
    if (duplicate) {
      return res.status(409).json({ error: 'Já existe uma categoria com esse nome.' });
    }
    const now = new Date().toISOString();
    const maxOrder = dbState.categories.reduce((max, c) => Math.max(max, c.order), -1);
    const id = String(req.body?.id || '').trim() || `cat-${Date.now()}`;
    const record: CategoryItem = {
      id,
      name: rawName,
      imageUrl: typeof req.body?.imageUrl === 'string' ? req.body.imageUrl.trim() : '',
      order:
        typeof req.body?.order === 'number' && Number.isFinite(req.body.order)
          ? Math.max(0, Math.round(req.body.order))
          : maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    };
    dbState.categories.push(record);
    dbState.categories.sort((a, b) => a.order - b.order);
    appendAdminLog(actor, 'Categoria criada', 'category', `${record.name}`, record.id);
    saveAndBroadcast();
    res.status(201).json(record);
  });

  app.put('/api/admin/categories/:id', requireAdmin, (req, res) => {
    const actor = (req as express.Request & { sessionUser: SessionPayload }).sessionUser.email;
    const idx = dbState.categories.findIndex((c) => c.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'Categoria não encontrada.' });

    const current = dbState.categories[idx];
    const nextName =
      req.body?.name !== undefined ? String(req.body.name).trim() : current.name;
    if (nextName.length < 2 || nextName.length > 60) {
      return res.status(400).json({ error: 'Nome da categoria deve ter entre 2 e 60 caracteres.' });
    }
    const duplicate = dbState.categories.find(
      (c) => c.id !== current.id && c.name.toLowerCase() === nextName.toLowerCase()
    );
    if (duplicate) {
      return res.status(409).json({ error: 'Já existe outra categoria com esse nome.' });
    }

    const now = new Date().toISOString();
    const updated: CategoryItem = {
      ...current,
      name: nextName,
      imageUrl:
        req.body?.imageUrl !== undefined
          ? String(req.body.imageUrl || '').trim()
          : current.imageUrl,
      order:
        typeof req.body?.order === 'number' && Number.isFinite(req.body.order)
          ? Math.max(0, Math.round(req.body.order))
          : current.order,
      updatedAt: now,
    };
    dbState.categories[idx] = updated;
    dbState.categories.sort((a, b) => a.order - b.order);

    // Cascade category rename onto products so all items follow automatically
    let renamedCount = 0;
    if (current.name !== updated.name) {
      dbState.products = dbState.products.map((p) => {
        if (p.category === current.name) {
          renamedCount += 1;
          return { ...p, category: updated.name, updatedAt: now };
        }
        return p;
      });
    }

    appendAdminLog(
      actor,
      'Categoria atualizada',
      'category',
      current.name !== updated.name
        ? `${current.name} -> ${updated.name} (${renamedCount} itens atualizados)`
        : `${updated.name}`,
      updated.id
    );
    saveAndBroadcast();
    res.json(updated);
  });

  app.delete('/api/admin/categories/:id', requireAdmin, (req, res) => {
    const actor = (req as express.Request & { sessionUser: SessionPayload }).sessionUser.email;
    const target = dbState.categories.find((c) => c.id === req.params.id);
    if (!target) return res.status(404).json({ error: 'Categoria não encontrada.' });

    const reassignTo =
      typeof req.body?.reassignTo === 'string'
        ? req.body.reassignTo.trim()
        : typeof req.query?.reassignTo === 'string'
        ? String(req.query.reassignTo).trim()
        : '';

    const now = new Date().toISOString();
    let affected = 0;
    if (reassignTo && reassignTo !== target.name) {
      dbState.products = dbState.products.map((p) => {
        if (p.category === target.name) {
          affected += 1;
          return { ...p, category: reassignTo, updatedAt: now };
        }
        return p;
      });
    }

    dbState.categories = dbState.categories.filter((c) => c.id !== req.params.id);
    appendAdminLog(
      actor,
      'Categoria excluída',
      'category',
      reassignTo
        ? `${target.name} (${affected} itens movidos para ${reassignTo})`
        : `${target.name}`,
      req.params.id
    );
    saveAndBroadcast();
    res.json({ ok: true });
  });

  // ADMIN CRUD: Coupons
  app.post('/api/admin/coupons', requireAdmin, (req, res) => {
    const actor = (req as express.Request & { sessionUser: SessionPayload }).sessionUser.email;
    const body = req.body as Coupon;
    const now = new Date().toISOString();
    const id = body.id || `cup-${Date.now()}`;
    const existingIdx = dbState.coupons.findIndex((c) => c.id === id);
    const record: Coupon = {
      ...body,
      id,
      code: body.code.toUpperCase().trim(),
      createdAt: existingIdx >= 0 ? dbState.coupons[existingIdx].createdAt : now,
      updatedAt: now,
    };
    if (existingIdx >= 0) {
      dbState.coupons[existingIdx] = record;
      appendAdminLog(actor, 'Cupom atualizado', 'coupon', `${record.code} (Ativo: ${record.active})`, id);
    } else {
      dbState.coupons.unshift(record);
      appendAdminLog(actor, 'Cupom criado', 'coupon', `${record.code}`, id);
    }
    saveAndBroadcast();
    res.json(record);
  });

  app.delete('/api/admin/coupons/:id', requireAdmin, (req, res) => {
    const actor = (req as express.Request & { sessionUser: SessionPayload }).sessionUser.email;
    const target = dbState.coupons.find((c) => c.id === req.params.id);
    dbState.coupons = dbState.coupons.filter((c) => c.id !== req.params.id);
    appendAdminLog(actor, 'Cupom excluído', 'coupon', target?.code || req.params.id, req.params.id);
    saveAndBroadcast();
    res.json({ ok: true });
  });

  // ADMIN: Orders + Tracking + Cancellation Stock Restore
  app.patch('/api/admin/orders/:id', requireAdmin, (req, res) => {
    const actor = (req as express.Request & { sessionUser: SessionPayload }).sessionUser.email;
    const idx = dbState.orders.findIndex((o) => o.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'Pedido não encontrado.' });

    const prev = dbState.orders[idx];
    const nextStatus = req.body?.status ?? prev.status;
    const nextTracking =
      req.body?.trackingCode !== undefined ? String(req.body.trackingCode).trim() : prev.trackingCode;
    const now = new Date().toISOString();

    // Restore stock when transitioning into cancelled for the first time
    if (prev.status !== 'cancelled' && nextStatus === 'cancelled') {
      for (const item of prev.items) {
        const prod = dbState.products.find((p) => p.id === item.productId);
        if (prod) {
          prod.stock += item.quantity;
          prod.updatedAt = now;
        }
      }
    }

    dbState.orders[idx] = {
      ...prev,
      ...req.body,
      status: nextStatus,
      trackingCode: nextTracking,
      updatedAt: now,
    };

    appendAdminLog(
      actor,
      'Pedido atualizado',
      'order',
      `#${prev.orderNumber} -> Status: ${nextStatus}${nextTracking ? ` · Rastreio: ${nextTracking}` : ''}`,
      prev.id
    );
    saveAndBroadcast();
    res.json(dbState.orders[idx]);
  });

  // ADMIN CRUD: Customers Management
  app.get('/api/admin/customers', requireAdmin, (_req, res) => {
    res.json(dbState.customers.map(toPublicCustomer));
  });

  app.post('/api/admin/customers', requireAdmin, (req, res) => {
    const actor = (req as express.Request & { sessionUser: SessionPayload }).sessionUser.email;
    const body = req.body as Partial<CustomerProfile> & { password?: string };
    const cleanEmail = String(body.email || '').trim().toLowerCase();
    if (!body.name || !cleanEmail.includes('@')) {
      return res.status(400).json({ error: 'Nome e e-mail válido são obrigatórios.' });
    }
    if (dbState.customers.some((c) => c.email.toLowerCase() === cleanEmail)) {
      return res.status(409).json({ error: 'Já existe cliente com este e-mail.' });
    }
    const now = new Date().toISOString();
    const record: StoredCustomer = {
      id: `cust-${Date.now()}`,
      name: body.name.trim(),
      email: cleanEmail,
      cpf: body.cpf || '',
      birthDate: body.birthDate || '',
      phone: body.phone || '(62) 99999-0000',
      secondaryPhone: body.secondaryPhone || '',
      role: 'customer',
      blocked: Boolean(body.blocked),
      addresses: Array.isArray(body.addresses) ? body.addresses : [],
      passwordHash: hashPassword(body.password || 'cliente123'),
      createdAt: now,
      updatedAt: now,
    };
    dbState.customers.unshift(record);
    appendAdminLog(actor, 'Cliente cadastrado', 'customer', `${record.name} (${record.email})`, record.id);
    saveAndBroadcast();
    res.status(201).json(toPublicCustomer(record));
  });

  app.put('/api/admin/customers/:id', requireAdmin, (req, res) => {
    const actor = (req as express.Request & { sessionUser: SessionPayload }).sessionUser.email;
    const idx = dbState.customers.findIndex((c) => c.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'Cliente não encontrado.' });

    const current = dbState.customers[idx];
    const body = req.body as Partial<CustomerProfile>;
    const updated: StoredCustomer = {
      ...current,
      name: body.name !== undefined ? String(body.name).trim() : current.name,
      email: body.email !== undefined ? String(body.email).trim().toLowerCase() : current.email,
      cpf: body.cpf !== undefined ? String(body.cpf).trim() : current.cpf,
      birthDate: body.birthDate !== undefined ? String(body.birthDate).trim() : current.birthDate,
      phone: body.phone !== undefined ? String(body.phone).trim() : current.phone,
      secondaryPhone:
        body.secondaryPhone !== undefined ? String(body.secondaryPhone).trim() : current.secondaryPhone,
      blocked: body.blocked !== undefined ? Boolean(body.blocked) : current.blocked,
      addresses: Array.isArray(body.addresses) ? body.addresses : current.addresses,
      role: 'customer',
      updatedAt: new Date().toISOString(),
    };
    dbState.customers[idx] = updated;
    appendAdminLog(
      actor,
      updated.blocked !== current.blocked
        ? updated.blocked
          ? 'Cliente bloqueado'
          : 'Cliente desbloqueado'
        : 'Cadastro de cliente editado',
      'customer',
      `${updated.name} (${updated.email})`,
      updated.id
    );
    saveAndBroadcast();
    res.json(toPublicCustomer(updated));
  });

  app.delete('/api/admin/customers/:id', requireAdmin, (req, res) => {
    const actor = (req as express.Request & { sessionUser: SessionPayload }).sessionUser.email;
    const target = dbState.customers.find((c) => c.id === req.params.id);
    dbState.customers = dbState.customers.filter((c) => c.id !== req.params.id);
    dbState.waitlist = dbState.waitlist.filter((w) => w.customerId !== req.params.id);
    appendAdminLog(
      actor,
      'Cliente excluído',
      'customer',
      target ? `${target.name} (${target.email})` : req.params.id,
      req.params.id
    );
    saveAndBroadcast();
    res.json({ ok: true });
  });

  // ADMIN: Settings, Logs & Backup Export
  app.put('/api/admin/settings', requireAdmin, (req, res) => {
    const actor = (req as express.Request & { sessionUser: SessionPayload }).sessionUser.email;
    dbState.settings = {
      ...dbState.settings,
      ...req.body,
      shippingConfig: {
        ...(dbState.settings.shippingConfig || INITIAL_SETTINGS.shippingConfig),
        ...(req.body?.shippingConfig || {}),
      },
      paymentConfig: {
        ...(dbState.settings.paymentConfig || INITIAL_SETTINGS.paymentConfig),
        ...(req.body?.paymentConfig || {}),
      },
      updatedAt: new Date().toISOString(),
    };
    appendAdminLog(actor, 'Configurações atualizadas', 'settings', 'Alterações salvas e publicadas.');
    saveAndBroadcast();
    res.json(dbState.settings);
  });

  app.get('/api/admin/logs', requireAdmin, (_req, res) => {
    res.json(dbState.adminLogs);
  });

  app.get('/api/admin/backup', requireAdmin, (req, res) => {
    const actor = (req as express.Request & { sessionUser: SessionPayload }).sessionUser.email;
    appendAdminLog(actor, 'Backup exportado', 'settings', 'Download de backup completo em JSON.');
    saveAndBroadcast();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="bella-menina-backup-${new Date().toISOString().slice(0, 10)}.json"`
    );
    res.json({
      exportedAt: new Date().toISOString(),
      store: 'Bella Menina Makeup',
      categories: dbState.categories,
      products: dbState.products,
      orders: dbState.orders,
      coupons: dbState.coupons,
      customers: dbState.customers.map(toPublicCustomer),
      waitlist: dbState.waitlist,
      settings: dbState.settings,
      feedbacks: dbState.feedbacks,
      adminLogs: dbState.adminLogs,
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(ROOT_DIR, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Bella Menina Makeup server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server failed to start:', err);
  process.exit(1);
});
