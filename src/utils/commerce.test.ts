import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildWhatsAppOrderMessage,
  buildWhatsAppProductMessage,
  buildWhatsAppUrl,
  calculateCartWeightGrams,
  calculateDashboardMetrics,
  calculateProfileCompleteness,
  calculateSubtotal,
  computeCorreiosRatesByCep,
  DEFAULT_SHIPPING_CONFIG,
  exportCustomersCSV,
  formatBRL,
  formatCEP,
  formatCPF,
  validateAndApplyCoupon,
} from './commerce';
import type { CartItem, Coupon, CustomerProfile, Order, Product } from '../types/store';

const sampleProduct: Product = {
  id: 'p1',
  name: 'Gloss Charm Cereja Glow',
  description: 'Brilho labial hidratante com pingente de cereja.',
  price: 24.9,
  promoPrice: 19.9,
  stock: 5,
  sku: 'GLS-CHR-01',
  category: 'Gloss',
  brand: 'Bella Menina',
  tags: ['gloss', 'charm'],
  weightGrams: 85,
  images: ['/img1.jpg'],
  swatches: [{ name: 'Cereja', hex: '#FF2D6F' }],
  status: 'active',
  salesCount: 42,
  createdAt: '2026-11-01T10:00:00.000Z',
  updatedAt: '2026-11-01T10:00:00.000Z',
};

test('formatBRL, formatCEP, and formatCPF format Brazilian currency, postal codes, and CPF', () => {
  assert.match(formatBRL(19.9), /R\$\s*19,90/);
  assert.equal(formatCEP('74470538'), '74470-538');
  assert.equal(formatCPF('12345678901'), '123.456.789-01');
});

test('calculateProfileCompleteness returns 100% for complete customer and partial percentage when missing fields', () => {
  const full = calculateProfileCompleteness({
    name: 'Mariana Oliveira',
    email: 'mariana@bellacliente.com',
    cpf: '123.456.789-01',
    birthDate: '1998-05-14',
    phone: '(62) 99812-4410',
  });
  assert.equal(full.percentage, 100);
  assert.equal(full.missingFields.length, 0);

  const partial = calculateProfileCompleteness({
    name: 'Ana',
    email: 'ana@x.com',
    phone: '(62) 99999-0000',
  });
  assert.equal(partial.percentage, 60);
  assert.deepEqual(partial.missingFields, ['CPF', 'Data de nascimento']);
});

test('calculateSubtotal uses promoPrice when lower than price and calculateCartWeightGrams enforces minimum 300g', () => {
  const items: CartItem[] = [{ product: sampleProduct, quantity: 2 }];
  assert.equal(calculateSubtotal(items), 39.8);
  assert.equal(calculateCartWeightGrams(items), 300);

  const heavyItems: CartItem[] = [{ product: { ...sampleProduct, weightGrams: 450 }, quantity: 3 }];
  assert.equal(calculateCartWeightGrams(heavyItems), 1350);
});

test('validateAndApplyCoupon handles percent, fixed, minimum purchase, and expired coupons', () => {
  const now = new Date('2026-11-14T12:00:00.000Z');
  const percentCoupon: Coupon = {
    id: 'c1',
    code: 'BELLA10',
    type: 'percent',
    value: 10,
    minPurchase: 30,
    maxUses: 100,
    usedCount: 2,
    expiresAt: '2026-12-31T23:59:59.000Z',
    active: true,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  };

  assert.deepEqual(validateAndApplyCoupon(percentCoupon, 50, now), {
    valid: true,
    discount: 5,
  });

  const belowMin = validateAndApplyCoupon(percentCoupon, 20, now);
  assert.equal(belowMin.valid, false);
  assert.match(belowMin.reason || '', /Compra mínima/);

  const expired = validateAndApplyCoupon(
    { ...percentCoupon, expiresAt: '2026-10-01T00:00:00.000Z' },
    50,
    now
  );
  assert.equal(expired.valid, false);
});

test('computeCorreiosRatesByCep includes Goiânia Express/Pickup for 74xxx, national PAC/SEDEX for SP, and free shipping threshold', () => {
  const goianiaRates = computeCorreiosRatesByCep('74470-538', 350, 'Goiânia', 'GO');
  assert.ok(goianiaRates.some((r) => r.service === 'MOTOBOY_GOIANIA'));
  assert.ok(goianiaRates.some((r) => r.service === 'RETIRADA'));
  assert.ok(goianiaRates.some((r) => r.service === 'PAC'));
  assert.ok(goianiaRates.some((r) => r.service === 'SEDEX'));

  const spRates = computeCorreiosRatesByCep('01310-100', 500, 'São Paulo', 'SP');
  assert.equal(spRates.some((r) => r.service === 'MOTOBOY_GOIANIA'), false);
  assert.equal(spRates.length, 2);

  const freeSpRates = computeCorreiosRatesByCep(
    '01310-100',
    500,
    'São Paulo',
    'SP',
    { ...DEFAULT_SHIPPING_CONFIG, freeShippingMinSubtotal: 150 },
    200
  );
  assert.equal(freeSpRates.find((r) => r.service === 'PAC')?.price, 0);
});

test('buildWhatsAppOrderMessage, buildWhatsAppProductMessage, and buildWhatsAppUrl generate formatted Portuguese links', () => {
  const msg = buildWhatsAppOrderMessage({
    orderNumber: 'BM-1042',
    customerName: 'Ana Clara',
    customerPhone: '(62) 99999-1234',
    items: [{ product: sampleProduct, quantity: 1, selectedSwatch: { name: 'Cereja', hex: '#FF2D6F' } }],
    address: {
      cep: '74470538',
      street: 'Alameda Higino Pires Martins',
      number: '120',
      neighborhood: 'Residencial Solar Ville',
      city: 'Goiânia',
      state: 'GO',
    },
    shipping: {
      code: '03220',
      service: 'SEDEX',
      label: 'Correios SEDEX',
      price: 21.9,
      deliveryDays: 1,
      estimateText: 'Entrega em até 1 dia útil',
      providerSource: 'tabela-correios',
    },
    subtotal: 19.9,
    discount: 0,
    total: 41.8,
  });

  assert.match(msg, /#BM-1042/);
  assert.match(msg, /Gloss Charm Cereja Glow \(Cereja\)/);
  assert.match(msg, /74470-538/);

  const prodMsg = buildWhatsAppProductMessage(sampleProduct, 2, 'Cereja');
  assert.match(prodMsg, /GLS-CHR-01/);
  assert.match(prodMsg, /2x/);

  const url = buildWhatsAppUrl('62999998888', msg);
  assert.ok(url.startsWith('https://wa.me/5562999998888?text='));
});

test('exportCustomersCSV exports clean semicolon-delimited CSV rows', () => {
  const customers: CustomerProfile[] = [
    {
      id: 'c1',
      name: 'Mariana',
      email: 'mariana@test.com',
      cpf: '123.456.789-01',
      birthDate: '1998-05-14',
      phone: '(62) 99999-0000',
      role: 'customer',
      blocked: false,
      addresses: [],
      createdAt: '2026-11-01T10:00:00.000Z',
      updatedAt: '2026-11-01T10:00:00.000Z',
    },
  ];
  const csv = exportCustomersCSV(customers);
  assert.match(csv, /"Mariana";"mariana@test.com"/);
});

test('calculateDashboardMetrics aggregates sales, ticket, origins, and low stock accurately', () => {
  const now = new Date('2026-11-14T15:00:00.000Z');
  const orders: Order[] = [
    {
      id: 'o1',
      orderNumber: 'BM-1001',
      customerName: 'Julia',
      customerPhone: '62999990000',
      items: [{ productId: 'p1', name: sampleProduct.name, sku: sampleProduct.sku, unitPrice: 19.9, quantity: 2 }],
      subtotal: 39.8,
      discount: 0,
      shippingCost: 12,
      shippingMethod: 'Motoboy',
      total: 51.8,
      origin: 'site',
      paymentMethod: 'Pix',
      status: 'confirmed',
      createdAt: '2026-11-14T12:00:00.000Z',
      updatedAt: '2026-11-14T12:00:00.000Z',
    },
    {
      id: 'o2',
      orderNumber: 'BM-1002',
      customerName: 'Balcão',
      customerPhone: '62999991111',
      items: [{ productId: 'p1', name: sampleProduct.name, sku: sampleProduct.sku, unitPrice: 19.9, quantity: 1 }],
      subtotal: 19.9,
      discount: 0,
      shippingCost: 0,
      shippingMethod: 'Retirada Balcão',
      total: 19.9,
      origin: 'balcao',
      paymentMethod: 'Cartão',
      status: 'delivered',
      createdAt: '2026-11-12T14:00:00.000Z',
      updatedAt: '2026-11-12T14:00:00.000Z',
    },
  ];

  const metrics = calculateDashboardMetrics(orders, [sampleProduct], now);
  assert.equal(metrics.dailySales, 51.8);
  assert.equal(metrics.weeklySales, 71.7);
  assert.equal(metrics.monthlySales, 71.7);
  assert.equal(metrics.totalOrders, 2);
  assert.equal(metrics.averageTicket, 35.85);
  assert.equal(metrics.ordersByOrigin.site, 1);
  assert.equal(metrics.ordersByOrigin.balcao, 1);
  assert.equal(metrics.lowStockProducts.length, 1);
  assert.equal(metrics.topSellingProducts[0].units, 3);
});
