export type ProductCategory = string;

export const ALL_PRODUCT_CATEGORIES: string[] = [
  'Body Splash',
  'Batom',
  'Gloss',
  'Cosméticos',
  'Máscaras',
  'Bases',
  'Hidratantes',
  'Cestas',
  'Bonés',
  'Acessórios',
];

export interface CategoryItem {
  id: string;
  name: string;
  imageUrl?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductSwatch {
  name: string;
  hex: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  promoPrice?: number | null;
  stock: number;
  sku: string;
  category: ProductCategory;
  brand: string;
  tags: string[];
  weightGrams: number;
  images: string[];
  videoUrl?: string;
  swatches: ProductSwatch[];
  status: 'active' | 'inactive';
  isNew?: boolean;
  salesCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedSwatch?: ProductSwatch;
}

export interface ShippingAddress {
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
}

export interface CustomerAddress extends ShippingAddress {
  id: string;
  label: string;
  recipientName?: string;
  isDefault?: boolean;
}

export interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  cpf?: string;
  birthDate?: string;
  phone: string;
  secondaryPhone?: string;
  role: 'customer';
  blocked: boolean;
  addresses: CustomerAddress[];
  createdAt: string;
  updatedAt: string;
}

export interface WaitlistEntry {
  id: string;
  customerId: string;
  customerEmail: string;
  productId: string;
  productName: string;
  productImage: string;
  productPrice: number;
  createdAt: string;
}

export interface AdminActivityLog {
  id: string;
  actorEmail: string;
  action: string;
  entityType: 'product' | 'category' | 'order' | 'customer' | 'coupon' | 'settings' | 'auth' | 'stock';
  entityId?: string;
  details: string;
  createdAt: string;
}

export interface ShippingConfig {
  originCep: string;
  goianiaExpressFee: number;
  freeShippingMinSubtotal: number;
  enableGoianiaExpress: boolean;
  enableStorePickup: boolean;
  enableCorreiosPac: boolean;
  enableCorreiosSedex: boolean;
  extraHandlingDays: number;
}

export interface PaymentConfig {
  enablePix: boolean;
  pixKey: string;
  pixDiscountPercent: number;
  enableCreditCard: boolean;
  maxInstallments: number;
  enableDebitCard: boolean;
  enableCashOnDelivery: boolean;
}

export type UserRole = 'admin' | 'customer';

export interface AuthSessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  viaFirebase: boolean;
}

export interface ShippingOption {
  code: string;
  service: 'PAC' | 'SEDEX' | 'MOTOBOY_GOIANIA' | 'RETIRADA';
  label: string;
  price: number;
  deliveryDays: number;
  estimateText: string;
  providerSource: 'correios-api' | 'cepcerto-api' | 'tabela-correios' | 'local-goiania';
}

export interface Coupon {
  id: string;
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  minPurchase: number;
  maxUses: number;
  usedCount: number;
  expiresAt?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  swatchName?: string;
}

export type OrderOrigin = 'site' | 'whatsapp' | 'balcao';
export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  orderNumber: string;
  customerId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  address?: ShippingAddress;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shippingCost: number;
  shippingMethod: string;
  trackingCode?: string;
  couponCode?: string;
  total: number;
  origin: OrderOrigin;
  paymentMethod: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface StoreSettings {
  storeName: string;
  slogan: string;
  whatsappNumber: string;
  whatsappWelcome: string;
  whatsappOrderTemplate: string;
  instagramUrl: string;
  tiktokUrl: string;
  facebookUrl: string;
  businessHours: string;
  footerText: string;
  heroBannerUrl: string;
  secondaryBannerUrl: string;
  seoTitle: string;
  seoDescription: string;
  primaryColor: string;
  logoUrl: string;
  shippingConfig?: ShippingConfig;
  paymentConfig?: PaymentConfig;
  updatedAt: string;
}

export interface Feedback {
  id: string;
  customerName: string;
  neighborhood: string;
  rating: number;
  comment: string;
  productName: string;
  approved: boolean;
  createdAt: string;
}

export interface DashboardMetrics {
  dailySales: number;
  weeklySales: number;
  monthlySales: number;
  totalOrders: number;
  averageTicket: number;
  lowStockProducts: Product[];
  topSellingProducts: { name: string; sku: string; units: number; revenue: number }[];
  ordersByOrigin: { site: number; whatsapp: number; balcao: number };
  last7DaysRevenue: { label: string; total: number; count: number }[];
}
