import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  updatePassword,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
  validateFirestoreConnection,
} from '../lib/firebase';
import {
  INITIAL_ADMIN_LOGS,
  INITIAL_CATEGORIES,
  INITIAL_COUPONS,
  INITIAL_FEEDBACKS,
  INITIAL_PRODUCTS,
  INITIAL_SETTINGS,
} from '../data/seedCatalog';
import type {
  AdminActivityLog,
  AuthSessionUser,
  CartItem,
  CategoryItem,
  Coupon,
  CustomerProfile,
  Feedback,
  Order,
  Product,
  ProductSwatch,
  StoreSettings,
  WaitlistEntry,
} from '../types/store';

export type AppView = 'store' | 'account' | 'admin';

interface AdminSession {
  authenticated: boolean;
  email: string | null;
  viaFirebase: boolean;
}

interface StoreContextValue {
  categories: CategoryItem[];
  products: Product[];
  activeProducts: Product[];
  coupons: Coupon[];
  orders: Order[];
  customers: CustomerProfile[];
  adminLogs: AdminActivityLog[];
  settings: StoreSettings;
  feedbacks: Feedback[];
  loading: boolean;
  cart: CartItem[];
  cartCount: number;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  addToCart: (product: Product, quantity?: number, swatch?: ProductSwatch) => void;
  updateCartQty: (productId: string, swatchName: string | undefined, quantity: number) => void;
  removeFromCart: (productId: string, swatchName?: string) => void;
  clearCart: () => void;
  selectedProduct: Product | null;
  setSelectedProduct: (product: Product | null) => void;

  // Unified Auth & View Routing
  currentUser: AuthSessionUser | null;
  customerProfile: CustomerProfile | null;
  customerWaitlist: WaitlistEntry[];
  activeView: AppView;
  setActiveView: (view: AppView) => void;
  loginModalOpen: boolean;
  setLoginModalOpen: (open: boolean) => void;
  loginHint: string | null;
  openAccountOrLogin: () => void;
  openAdminOrLogin: () => void;

  adminSession: AdminSession;
  adminOpen: boolean;
  setAdminOpen: (open: boolean) => void;

  loginWithCredentials: (
    email: string,
    password: string
  ) => Promise<{ ok: boolean; role?: 'admin' | 'customer'; error?: string }>;
  registerCustomer: (data: {
    name: string;
    email: string;
    password: string;
    phone: string;
    cpf?: string;
    birthDate?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ ok: boolean; role?: 'admin' | 'customer'; error?: string }>;
  logout: () => Promise<void>;
  loginAdminWithCredentials: (
    email: string,
    password: string
  ) => Promise<{ ok: boolean; error?: string; firebaseNote?: string }>;
  loginAdminWithGoogle: () => Promise<{ ok: boolean; error?: string }>;
  logoutAdmin: () => Promise<void>;

  // Customer Self-Service
  updateCustomerProfile: (patch: Partial<CustomerProfile>) => Promise<CustomerProfile>;
  changeCustomerPassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<{ ok: boolean; error?: string }>;
  addToWaitlist: (product: Product) => Promise<void>;
  removeFromWaitlist: (productId: string) => Promise<void>;

  // Store & Admin Operations
  saveCategory: (
    category: Partial<CategoryItem> & { id?: string; name: string }
  ) => Promise<CategoryItem>;
  deleteCategory: (categoryId: string, reassignTo?: string) => Promise<void>;
  saveProduct: (product: Product) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  updateProductStock: (productId: string, stock: number) => Promise<void>;
  saveCoupon: (coupon: Coupon) => Promise<void>;
  deleteCoupon: (couponId: string) => Promise<void>;
  submitOrder: (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Order>;
  updateOrderStatus: (orderId: string, status: Order['status']) => Promise<void>;
  updateOrderDetails: (
    orderId: string,
    patch: { status?: Order['status']; trackingCode?: string }
  ) => Promise<void>;
  saveCustomerAdmin: (
    customer: Partial<CustomerProfile> & { id?: string; password?: string }
  ) => Promise<CustomerProfile>;
  deleteCustomerAdmin: (customerId: string) => Promise<void>;
  saveSettings: (next: Partial<StoreSettings>) => Promise<void>;
  uploadDeviceFile: (file: File) => Promise<{ url: string; storage: string }>;
}

const StoreContext = createContext<StoreContextValue | null>(null);
const CART_STORAGE_KEY = 'bm_cart_v1';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<CategoryItem[]>(INITIAL_CATEGORIES);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [coupons, setCoupons] = useState<Coupon[]>(INITIAL_COUPONS);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [adminLogs, setAdminLogs] = useState<AdminActivityLog[]>(INITIAL_ADMIN_LOGS);
  const [settings, setSettings] = useState<StoreSettings>(INITIAL_SETTINGS);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>(INITIAL_FEEDBACKS);
  const [loading, setLoading] = useState(true);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) return JSON.parse(saved) as CartItem[];
    } catch {
      // ignore storage failure
    }
    return [];
  });
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [serverUser, setServerUser] = useState<Omit<AuthSessionUser, 'viaFirebase'> | null>(null);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [customerWaitlist, setCustomerWaitlist] = useState<WaitlistEntry[]>([]);
  const [activeView, setActiveView] = useState<AppView>('store');
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginHint, setLoginHint] = useState<string | null>(null);

  const currentUser = useMemo<AuthSessionUser | null>(() => {
    if (serverUser) {
      return {
        ...serverUser,
        viaFirebase:
          Boolean(firebaseUser) &&
          firebaseUser?.email?.toLowerCase() === serverUser.email.toLowerCase(),
      };
    }
    if (firebaseUser?.email) {
      const email = firebaseUser.email.toLowerCase();
      const isFbAdmin = email === 'nonhu2490@gmail.com' || email === 'admin@x.com';
      return {
        id: firebaseUser.uid,
        email,
        name: firebaseUser.displayName || (isFbAdmin ? 'Administradora Bella Menina' : 'Cliente'),
        role: isFbAdmin ? 'admin' : 'customer',
        viaFirebase: true,
      };
    }
    return null;
  }, [serverUser, firebaseUser]);

  const adminSession = useMemo<AdminSession>(() => {
    const isAdminUser = currentUser?.role === 'admin';
    const fbEmail = firebaseUser?.email?.toLowerCase() || null;
    const isFbAdmin =
      Boolean(firebaseUser) &&
      (fbEmail === 'nonhu2490@gmail.com' || fbEmail === 'admin@x.com');
    return {
      authenticated: isAdminUser,
      email: isAdminUser ? currentUser.email : null,
      viaFirebase: isFbAdmin,
    };
  }, [currentUser, firebaseUser]);

  const adminOpen = activeView === 'admin' && adminSession.authenticated;

  const setAdminOpen = useCallback(
    (open: boolean) => {
      if (!open) {
        setActiveView('store');
        return;
      }
      if (currentUser?.role === 'admin') {
        setActiveView('admin');
      } else {
        setLoginHint('Acesso exclusivo para administradores da loja.');
        setLoginModalOpen(true);
      }
    },
    [currentUser]
  );

  const openAccountOrLogin = useCallback(() => {
    setLoginHint(null);
    if (!currentUser) {
      setLoginModalOpen(true);
      return;
    }
    if (currentUser.role === 'admin') {
      // Admin NEVER sees the customer area
      setActiveView('admin');
    } else {
      setActiveView('account');
    }
  }, [currentUser]);

  const openAdminOrLogin = useCallback(() => {
    if (currentUser?.role === 'admin') {
      setActiveView('admin');
      return;
    }
    setLoginHint('Entre com a conta administrativa para acessar o Painel Admin.');
    setLoginModalOpen(true);
  }, [currentUser]);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // ignore
    }
  }, [cart]);

  useEffect(() => {
    if (settings.seoTitle) {
      document.title = settings.seoTitle;
    }
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && settings.seoDescription) {
      metaDesc.setAttribute('content', settings.seoDescription);
    }
  }, [settings.seoTitle, settings.seoDescription]);

  const fetchServerState = useCallback(async () => {
    try {
      const res = await fetch('/api/store/state');
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.categories)) {
        setCategories(data.categories);
      }
      if (Array.isArray(data.products) && data.products.length > 0) {
        setProducts(data.products);
      }
      if (Array.isArray(data.coupons)) {
        setCoupons(data.coupons);
      }
      if (data.settings) {
        setSettings((prev) => ({ ...prev, ...data.settings }));
      }
      if (Array.isArray(data.feedbacks) && data.feedbacks.length > 0) {
        setFeedbacks(data.feedbacks);
      }
      if (Array.isArray(data.orders)) {
        setOrders(data.orders);
      }
      if (Array.isArray(data.customers)) {
        setCustomers(data.customers);
      }
      if (Array.isArray(data.adminLogs)) {
        setAdminLogs(data.adminLogs);
      }
      if (data.customerProfile !== undefined) {
        setCustomerProfile(data.customerProfile);
      }
      if (Array.isArray(data.customerWaitlist)) {
        setCustomerWaitlist(data.customerWaitlist);
      }
    } catch {
      // Fallback to seed/Firestore
    } finally {
      setLoading(false);
    }
  }, []);

  // Boot: restore session, validate Firestore connection, subscribe to SSE
  useEffect(() => {
    validateFirestoreConnection().catch(() => {});

    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((s) => {
        if (s?.authenticated && s?.user) {
          setServerUser(s.user);
          if (s.profile) setCustomerProfile(s.profile);
        }
      })
      .catch(() => {})
      .finally(() => {
        fetchServerState();
      });

    const evtSource = new EventSource('/api/store/stream');
    evtSource.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'sync') {
          fetchServerState();
        }
      } catch {
        // ignore
      }
    };

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
    });

    return () => {
      evtSource.close();
      unsubAuth();
    };
  }, [fetchServerState]);

  // Real-time Firestore listeners
  useEffect(() => {
    const unsubCategories = onSnapshot(
      collection(db, 'categories'),
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs
            .map((d) => ({
              ...(d.data() as Omit<CategoryItem, 'id'>),
              id: d.id,
            }))
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) as CategoryItem[];
          setCategories(list);
        }
      },
      (err) => {
        if (err.message.includes('Missing or insufficient permissions')) {
          handleFirestoreError(err, OperationType.LIST, 'categories');
        }
      }
    );

    const productsQuery = adminSession.viaFirebase
      ? collection(db, 'products')
      : query(collection(db, 'products'), where('status', '==', 'active'));

    const unsubProducts = onSnapshot(
      productsQuery,
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((d) => ({
            ...(d.data() as Omit<Product, 'id'>),
            id: d.id,
          })) as Product[];
          setProducts(list);
        }
      },
      (err) => {
        if (err.message.includes('Missing or insufficient permissions')) {
          handleFirestoreError(err, OperationType.LIST, 'products');
        }
      }
    );

    const unsubSettings = onSnapshot(
      doc(db, 'settings', 'storefront'),
      (snap) => {
        if (snap.exists()) {
          setSettings((prev) => ({ ...prev, ...(snap.data() as Partial<StoreSettings>) }));
        }
      },
      (err) => {
        if (err.message.includes('Missing or insufficient permissions')) {
          handleFirestoreError(err, OperationType.GET, 'settings/storefront');
        }
      }
    );

    const couponsQuery = adminSession.viaFirebase
      ? collection(db, 'coupons')
      : query(collection(db, 'coupons'), where('active', '==', true));

    const unsubCoupons = onSnapshot(
      couponsQuery,
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((d) => ({
            ...(d.data() as Omit<Coupon, 'id'>),
            id: d.id,
          })) as Coupon[];
          setCoupons(list);
        }
      },
      (err) => {
        if (err.message.includes('Missing or insufficient permissions')) {
          handleFirestoreError(err, OperationType.LIST, 'coupons');
        }
      }
    );

    let unsubOrders = () => {};
    let unsubCustomers = () => {};
    if (adminSession.viaFirebase) {
      unsubOrders = onSnapshot(
        collection(db, 'orders'),
        (snap) => {
          if (!snap.empty) {
            const list = snap.docs.map((d) => ({
              ...(d.data() as Omit<Order, 'id'>),
              id: d.id,
            })) as Order[];
            setOrders(list);
          }
        },
        (err) => {
          if (err.message.includes('Missing or insufficient permissions')) {
            handleFirestoreError(err, OperationType.LIST, 'orders');
          }
        }
      );

      unsubCustomers = onSnapshot(
        collection(db, 'customers'),
        (snap) => {
          if (!snap.empty) {
            const list = snap.docs.map((d) => ({
              ...(d.data() as Omit<CustomerProfile, 'id'>),
              id: d.id,
            })) as CustomerProfile[];
            setCustomers(list);
          }
        },
        (err) => {
          if (err.message.includes('Missing or insufficient permissions')) {
            handleFirestoreError(err, OperationType.LIST, 'customers');
          }
        }
      );
    }

    return () => {
      unsubCategories();
      unsubProducts();
      unsubSettings();
      unsubCoupons();
      unsubOrders();
      unsubCustomers();
    };
  }, [adminSession.viaFirebase]);

  const activeProducts = useMemo(
    () => products.filter((p) => p.status === 'active'),
    [products]
  );

  const cartCount = useMemo(
    () => cart.reduce((acc, item) => acc + item.quantity, 0),
    [cart]
  );

  const addToCart = useCallback(
    (product: Product, quantity = 1, swatch?: ProductSwatch) => {
      const chosenSwatch = swatch || product.swatches?.[0];
      setCart((prev) => {
        const idx = prev.findIndex(
          (i) =>
            i.product.id === product.id &&
            i.selectedSwatch?.name === chosenSwatch?.name
        );
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = {
            ...copy[idx],
            quantity: Math.min(product.stock || 99, copy[idx].quantity + quantity),
          };
          return copy;
        }
        return [...prev, { product, quantity, selectedSwatch: chosenSwatch }];
      });
      setCartOpen(true);
    },
    []
  );

  const updateCartQty = useCallback(
    (productId: string, swatchName: string | undefined, quantity: number) => {
      if (quantity <= 0) {
        setCart((prev) =>
          prev.filter(
            (i) =>
              !(
                i.product.id === productId &&
                i.selectedSwatch?.name === swatchName
              )
          )
        );
        return;
      }
      setCart((prev) =>
        prev.map((i) =>
          i.product.id === productId && i.selectedSwatch?.name === swatchName
            ? { ...i, quantity: Math.min(i.product.stock || 99, quantity) }
            : i
        )
      );
    },
    []
  );

  const removeFromCart = useCallback((productId: string, swatchName?: string) => {
    setCart((prev) =>
      prev.filter(
        (i) =>
          !(i.product.id === productId && i.selectedSwatch?.name === swatchName)
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  // UNIFIED LOGIN WITH CREDENTIALS
  const loginWithCredentials = useCallback(
    async (email: string, password: string) => {
      const cleanEmail = email.trim().toLowerCase();
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false, error: data.error || 'E-mail ou senha inválidos.' };
      }

      setServerUser(data.user);
      if (data.profile) setCustomerProfile(data.profile);

      await fetchServerState();
      setLoginModalOpen(false);
      setLoginHint(null);

      // Strict Role-Based Routing:
      // admin@x.com -> Painel Admin (never sees customer area)
      // normal account -> Área do Cliente (Minha Conta)
      const role = data.user.role as 'admin' | 'customer';
      setActiveView(role === 'admin' ? 'admin' : 'account');
      return { ok: true, role };
    },
    [fetchServerState]
  );

  const registerCustomer = useCallback(
    async (payload: {
      name: string;
      email: string;
      password: string;
      phone: string;
      cpf?: string;
      birthDate?: string;
    }) => {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false, error: data.error || 'Erro ao criar cadastro.' };
      }

      setServerUser(data.user);
      if (data.profile) setCustomerProfile(data.profile);

      await fetchServerState();
      setLoginModalOpen(false);
      setLoginHint(null);
      setActiveView('account');
      return { ok: true };
    },
    [fetchServerState]
  );

  const loginWithGoogle = useCallback(async () => {
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const email = cred.user.email?.toLowerCase() || '';
      const name = cred.user.displayName || 'Cliente Bella Menina';

      const res = await fetch('/api/auth/google-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: cred.user.uid,
          email,
          name,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        await signOut(auth).catch(() => {});
        return { ok: false, error: data.error || 'Falha ao validar conta Google.' };
      }

      setFirebaseUser(cred.user);
      setServerUser(data.user);
      if (data.profile) setCustomerProfile(data.profile);

      await fetchServerState();
      setLoginModalOpen(false);
      setLoginHint(null);
      const role = data.user.role as 'admin' | 'customer';
      setActiveView(role === 'admin' ? 'admin' : 'account');
      return { ok: true, role };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Falha no login com Google.',
      };
    }
  }, [fetchServerState]);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setServerUser(null);
    setCustomerProfile(null);
    setCustomerWaitlist([]);
    setOrders([]);
    setCustomers([]);
    if (auth.currentUser) {
      await signOut(auth).catch(() => {});
    }
    setActiveView('store');
    await fetchServerState();
  }, [fetchServerState]);

  const loginAdminWithCredentials = useCallback(
    async (email: string, password: string) => {
      const res = await loginWithCredentials(email, password);
      if (!res.ok) return { ok: false, error: res.error };
      if (res.role !== 'admin') {
        return { ok: false, error: 'Esta conta não possui permissão de administrador.' };
      }
      return { ok: true };
    },
    [loginWithCredentials]
  );

  const loginAdminWithGoogle = useCallback(async () => {
    const res = await loginWithGoogle();
    if (!res.ok) return { ok: false, error: res.error };
    if (res.role !== 'admin') {
      return { ok: false, error: 'Conta Google sem permissão administrativa.' };
    }
    return { ok: true };
  }, [loginWithGoogle]);

  const logoutAdmin = logout;

  // Customer Self-Service
  const updateCustomerProfile = useCallback(
    async (patch: Partial<CustomerProfile>) => {
      const res = await fetch('/api/customer/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erro ao atualizar dados.');
      }
      const updated = (await res.json()) as CustomerProfile;
      setCustomerProfile(updated);
      setServerUser((prev) => (prev ? { ...prev, name: updated.name, email: updated.email } : prev));
      return updated;
    },
    []
  );

  const changeCustomerPassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      const res = await fetch('/api/customer/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false, error: data.error || 'Não foi possível alterar a senha.' };
      }
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword).catch(() => {});
      }
      return { ok: true };
    },
    []
  );

  const addToWaitlist = useCallback(
    async (product: Product) => {
      if (!currentUser) {
        setLoginHint('Faça login para adicionar este produto à sua Lista de Espera.');
        setLoginModalOpen(true);
        return;
      }
      const res = await fetch('/api/customer/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id }),
      });
      if (res.ok) {
        const entry = (await res.json()) as WaitlistEntry;
        setCustomerWaitlist((prev) =>
          prev.some((w) => w.productId === product.id) ? prev : [entry, ...prev]
        );
      }
    },
    [currentUser]
  );

  const removeFromWaitlist = useCallback(async (productId: string) => {
    const res = await fetch(`/api/customer/waitlist/${productId}`, { method: 'DELETE' });
    if (res.ok) {
      setCustomerWaitlist((prev) => prev.filter((w) => w.productId !== productId));
    }
  }, []);

  // Store & Admin Operations
  const saveCategory = useCallback(
    async (category: Partial<CategoryItem> & { id?: string; name: string }) => {
      const isEdit = Boolean(category.id);
      const url = isEdit
        ? `/api/admin/categories/${category.id}`
        : '/api/admin/categories';
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(category),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Falha ao salvar categoria.');
      }
      const saved = (await res.json()) as CategoryItem;
      setCategories((prev) => {
        const exists = prev.some((c) => c.id === saved.id);
        const next = exists
          ? prev.map((c) => (c.id === saved.id ? saved : c))
          : [...prev, saved];
        return next.sort((a, b) => a.order - b.order);
      });
      await fetchServerState();

      if (adminSession.viaFirebase && auth.currentUser) {
        try {
          await setDoc(doc(db, 'categories', saved.id), {
            name: saved.name,
            ...(saved.imageUrl ? { imageUrl: saved.imageUrl } : {}),
            order: saved.order,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `categories/${saved.id}`);
        }
      }

      return saved;
    },
    [adminSession.viaFirebase, fetchServerState]
  );

  const deleteCategory = useCallback(
    async (categoryId: string, reassignTo?: string) => {
      const res = await fetch(`/api/admin/categories/${categoryId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reassignTo ? { reassignTo } : {}),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Falha ao remover categoria.');
      }
      setCategories((prev) => prev.filter((c) => c.id !== categoryId));
      await fetchServerState();

      if (adminSession.viaFirebase && auth.currentUser) {
        try {
          await deleteDoc(doc(db, 'categories', categoryId));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `categories/${categoryId}`);
        }
      }
    },
    [adminSession.viaFirebase, fetchServerState]
  );

  const saveProduct = useCallback(
    async (product: Product) => {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product),
      });
      if (!res.ok) throw new Error('Falha ao salvar produto.');
      const saved = (await res.json()) as Product;

      setProducts((prev) => {
        const exists = prev.some((p) => p.id === saved.id);
        return exists
          ? prev.map((p) => (p.id === saved.id ? saved : p))
          : [saved, ...prev];
      });

      if (adminSession.viaFirebase && auth.currentUser) {
        const path = `products/${saved.id}`;
        try {
          await setDoc(doc(db, 'products', saved.id), {
            name: saved.name,
            description: saved.description,
            price: saved.price,
            ...(saved.promoPrice ? { promoPrice: saved.promoPrice } : {}),
            stock: saved.stock,
            sku: saved.sku,
            category: saved.category,
            brand: saved.brand,
            tags: saved.tags.slice(0, 10),
            weightGrams: saved.weightGrams,
            images: saved.images.slice(0, 20),
            ...(saved.videoUrl ? { videoUrl: saved.videoUrl } : {}),
            swatches: saved.swatches.slice(0, 12),
            status: saved.status,
            isNew: Boolean(saved.isNew),
            salesCount: saved.salesCount || 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, path);
        }
      }
    },
    [adminSession.viaFirebase]
  );

  const deleteProduct = useCallback(
    async (productId: string) => {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Falha ao remover produto.');
      setProducts((prev) => prev.filter((p) => p.id !== productId));

      if (adminSession.viaFirebase && auth.currentUser) {
        try {
          await deleteDoc(doc(db, 'products', productId));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `products/${productId}`);
        }
      }
    },
    [adminSession.viaFirebase]
  );

  const updateProductStock = useCallback(
    async (productId: string, stock: number) => {
      const res = await fetch(`/api/admin/stock/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock }),
      });
      if (!res.ok) throw new Error('Falha ao atualizar estoque.');
      const updated = (await res.json()) as Product;
      setProducts((prev) => prev.map((p) => (p.id === productId ? updated : p)));
      await fetchServerState();
    },
    [fetchServerState]
  );

  const saveCoupon = useCallback(
    async (coupon: Coupon) => {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(coupon),
      });
      if (!res.ok) throw new Error('Falha ao salvar cupom.');
      const saved = (await res.json()) as Coupon;
      setCoupons((prev) => {
        const exists = prev.some((c) => c.id === saved.id);
        return exists
          ? prev.map((c) => (c.id === saved.id ? saved : c))
          : [saved, ...prev];
      });

      if (adminSession.viaFirebase && auth.currentUser) {
        try {
          await setDoc(doc(db, 'coupons', saved.id), {
            code: saved.code,
            type: saved.type,
            value: saved.value,
            minPurchase: saved.minPurchase,
            maxUses: saved.maxUses,
            usedCount: saved.usedCount,
            ...(saved.expiresAt ? { expiresAt: saved.expiresAt } : {}),
            active: saved.active,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `coupons/${saved.id}`);
        }
      }
    },
    [adminSession.viaFirebase]
  );

  const deleteCoupon = useCallback(
    async (couponId: string) => {
      const res = await fetch(`/api/admin/coupons/${couponId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Falha ao excluir cupom.');
      setCoupons((prev) => prev.filter((c) => c.id !== couponId));

      if (adminSession.viaFirebase && auth.currentUser) {
        try {
          await deleteDoc(doc(db, 'coupons', couponId));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `coupons/${couponId}`);
        }
      }
    },
    [adminSession.viaFirebase]
  );

  const submitOrder = useCallback(
    async (orderPayload: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });
      if (!res.ok) throw new Error('Erro ao registrar pedido.');
      const saved = (await res.json()) as Order;
      setOrders((prev) => [saved, ...prev]);
      await fetchServerState();

      try {
        await setDoc(doc(db, 'orders', saved.id), {
          orderNumber: saved.orderNumber,
          ...(saved.customerId ? { customerId: saved.customerId } : {}),
          customerName: saved.customerName,
          ...(saved.customerEmail ? { customerEmail: saved.customerEmail } : {}),
          customerPhone: saved.customerPhone,
          ...(saved.address ? { address: saved.address } : {}),
          items: saved.items,
          subtotal: saved.subtotal,
          discount: saved.discount,
          shippingCost: saved.shippingCost,
          shippingMethod: saved.shippingMethod,
          ...(saved.trackingCode ? { trackingCode: saved.trackingCode } : {}),
          ...(saved.couponCode ? { couponCode: saved.couponCode } : {}),
          total: saved.total,
          origin: saved.origin,
          paymentMethod: saved.paymentMethod,
          status: saved.status,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch {
        // Safely persisted on backend
      }

      return saved;
    },
    [fetchServerState]
  );

  const updateOrderDetails = useCallback(
    async (
      orderId: string,
      patch: { status?: Order['status']; trackingCode?: string }
    ) => {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error('Falha ao atualizar pedido.');
      const updated = (await res.json()) as Order;
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      await fetchServerState();
    },
    [fetchServerState]
  );

  const updateOrderStatus = useCallback(
    async (orderId: string, status: Order['status']) => {
      await updateOrderDetails(orderId, { status });
    },
    [updateOrderDetails]
  );

  const saveCustomerAdmin = useCallback(
    async (customer: Partial<CustomerProfile> & { id?: string; password?: string }) => {
      const isEdit = Boolean(customer.id);
      const url = isEdit ? `/api/admin/customers/${customer.id}` : '/api/admin/customers';
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customer),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Falha ao salvar cliente.');
      }
      const saved = (await res.json()) as CustomerProfile;
      setCustomers((prev) =>
        isEdit ? prev.map((c) => (c.id === saved.id ? saved : c)) : [saved, ...prev]
      );
      await fetchServerState();
      return saved;
    },
    [fetchServerState]
  );

  const deleteCustomerAdmin = useCallback(
    async (customerId: string) => {
      const res = await fetch(`/api/admin/customers/${customerId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Falha ao excluir cliente.');
      setCustomers((prev) => prev.filter((c) => c.id !== customerId));
      await fetchServerState();
    },
    [fetchServerState]
  );

  const saveSettings = useCallback(
    async (next: Partial<StoreSettings>) => {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
      if (!res.ok) throw new Error('Falha ao salvar configurações.');
      const updated = (await res.json()) as StoreSettings;
      setSettings(updated);
      await fetchServerState();

      if (adminSession.viaFirebase && auth.currentUser) {
        try {
          await setDoc(doc(db, 'settings', 'storefront'), {
            ...updated,
            updatedAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, 'settings/storefront');
        }
      }
    },
    [adminSession.viaFirebase, fetchServerState]
  );

  const uploadDeviceFile = useCallback(async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: form,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Falha ao enviar arquivo.');
    }
    return (await res.json()) as { url: string; storage: string };
  }, []);

  const value: StoreContextValue = {
    categories,
    products,
    activeProducts,
    coupons,
    orders,
    customers,
    adminLogs,
    settings,
    feedbacks,
    loading,
    cart,
    cartCount,
    cartOpen,
    setCartOpen,
    addToCart,
    updateCartQty,
    removeFromCart,
    clearCart,
    selectedProduct,
    setSelectedProduct,
    currentUser,
    customerProfile,
    customerWaitlist,
    activeView,
    setActiveView,
    loginModalOpen,
    setLoginModalOpen,
    loginHint,
    openAccountOrLogin,
    openAdminOrLogin,
    adminSession,
    adminOpen,
    setAdminOpen,
    loginWithCredentials,
    registerCustomer,
    loginWithGoogle,
    logout,
    loginAdminWithCredentials,
    loginAdminWithGoogle,
    logoutAdmin,
    updateCustomerProfile,
    changeCustomerPassword,
    addToWaitlist,
    removeFromWaitlist,
    saveCategory,
    deleteCategory,
    saveProduct,
    deleteProduct,
    updateProductStock,
    saveCoupon,
    deleteCoupon,
    submitOrder,
    updateOrderStatus,
    updateOrderDetails,
    saveCustomerAdmin,
    deleteCustomerAdmin,
    saveSettings,
    uploadDeviceFile,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
