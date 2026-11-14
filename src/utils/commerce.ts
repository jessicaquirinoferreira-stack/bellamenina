import type {
  CartItem,
  Coupon,
  CustomerProfile,
  DashboardMetrics,
  Order,
  Product,
  ShippingAddress,
  ShippingConfig,
  ShippingOption,
} from '../types/store';

export const STORE_ORIGIN_CEP = '74470538'; // Goiânia – GO

export const DEFAULT_SHIPPING_CONFIG: ShippingConfig = {
  originCep: STORE_ORIGIN_CEP,
  goianiaExpressFee: 12.0,
  freeShippingMinSubtotal: 199.0,
  enableGoianiaExpress: true,
  enableStorePickup: true,
  enableCorreiosPac: true,
  enableCorreiosSedex: true,
  extraHandlingDays: 0,
};

export function formatBRL(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(safe);
}

export function sanitizeDigits(input: string): string {
  return (input || '').replace(/\D/g, '');
}

export function formatCEP(input: string): string {
  const digits = sanitizeDigits(input).slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function formatCPF(input: string): string {
  const digits = sanitizeDigits(input).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function formatPhoneBR(input: string): string {
  const digits = sanitizeDigits(input).slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function calculateProfileCompleteness(
  profile: Partial<CustomerProfile> | null | undefined
): { percentage: number; missingFields: string[] } {
  if (!profile) {
    return {
      percentage: 0,
      missingFields: ['Nome completo', 'E-mail', 'CPF', 'Data de nascimento', 'Telefone'],
    };
  }
  const checks: { label: string; ok: boolean }[] = [
    { label: 'Nome completo', ok: Boolean(profile.name && profile.name.trim().length >= 3) },
    { label: 'E-mail', ok: Boolean(profile.email && profile.email.includes('@')) },
    { label: 'CPF', ok: sanitizeDigits(profile.cpf || '').length === 11 },
    { label: 'Data de nascimento', ok: Boolean(profile.birthDate && profile.birthDate.trim().length >= 8) },
    { label: 'Telefone / WhatsApp', ok: sanitizeDigits(profile.phone || '').length >= 10 },
  ];
  const passed = checks.filter((c) => c.ok).length;
  const percentage = Math.round((passed / checks.length) * 100);
  const missingFields = checks.filter((c) => !c.ok).map((c) => c.label);
  return { percentage, missingFields };
}

export function getEffectivePrice(product: Pick<Product, 'price' | 'promoPrice'>): number {
  if (
    typeof product.promoPrice === 'number' &&
    product.promoPrice > 0 &&
    product.promoPrice < product.price
  ) {
    return product.promoPrice;
  }
  return product.price;
}

export function calculateSubtotal(items: CartItem[]): number {
  const total = items.reduce((acc, item) => {
    return acc + getEffectivePrice(item.product) * Math.max(0, item.quantity);
  }, 0);
  return Math.round(total * 100) / 100;
}

export function calculateCartWeightGrams(items: CartItem[]): number {
  const grams = items.reduce((acc, item) => {
    const unitWeight = Math.max(20, item.product.weightGrams || 100);
    return acc + unitWeight * Math.max(0, item.quantity);
  }, 0);
  return Math.max(300, grams);
}

export function validateAndApplyCoupon(
  coupon: Coupon | null | undefined,
  subtotal: number,
  now: Date = new Date()
): { valid: boolean; discount: number; reason?: string } {
  if (!coupon) {
    return { valid: false, discount: 0, reason: 'Cupom não encontrado.' };
  }
  if (!coupon.active) {
    return { valid: false, discount: 0, reason: 'Este cupom está desativado.' };
  }
  if (coupon.usedCount >= coupon.maxUses) {
    return { valid: false, discount: 0, reason: 'Este cupom atingiu o limite de usos.' };
  }
  if (coupon.expiresAt) {
    const exp = new Date(coupon.expiresAt);
    if (!Number.isNaN(exp.getTime()) && exp.getTime() < now.getTime()) {
      return { valid: false, discount: 0, reason: 'Este cupom está expirado.' };
    }
  }
  if (subtotal < coupon.minPurchase) {
    return {
      valid: false,
      discount: 0,
      reason: `Compra mínima de ${formatBRL(coupon.minPurchase)} para este cupom.`,
    };
  }

  let discount =
    coupon.type === 'percent' ? (subtotal * coupon.value) / 100 : coupon.value;
  discount = Math.min(subtotal, Math.max(0, Math.round(discount * 100) / 100));

  return { valid: true, discount };
}

/**
 * Computes distance-calibrated Correios PAC & SEDEX tariff estimates from Goiânia (CEP 74xxx)
 * when external carrier endpoints are unreachable, plus Goiânia local delivery & optional store pickup.
 */
export function computeCorreiosRatesByCep(
  destCepRaw: string,
  weightGrams: number,
  city?: string,
  state?: string,
  config: ShippingConfig = DEFAULT_SHIPPING_CONFIG,
  subtotal = 0
): ShippingOption[] {
  const cep = sanitizeDigits(destCepRaw);
  const weightKg = Math.max(0.3, weightGrams / 1000);
  const extraKgSteps = Math.max(0, Math.ceil(weightKg - 1));
  const prefix1 = Number(cep[0] || 7);
  const prefix2 = Number(cep.slice(0, 2) || 74);
  const extraDays = Math.max(0, Number(config.extraHandlingDays || 0));

  const isGoianiaMetro =
    prefix2 === 74 ||
    prefix2 === 75 ||
    (city ? /goi[aâ]nia|aparecida de goi[aâ]nia|senador canedo|trindade/i.test(city) : false);

  let pacBase = 24.9;
  let pacDays = 6;
  let sedexBase = 41.5;
  let sedexDays = 3;

  if (prefix2 >= 70 && prefix2 <= 76) {
    pacBase = isGoianiaMetro ? 15.9 : 19.9;
    pacDays = isGoianiaMetro ? 2 : 4;
    sedexBase = isGoianiaMetro ? 21.9 : 29.9;
    sedexDays = isGoianiaMetro ? 1 : 2;
  } else if (prefix1 === 0 || prefix1 === 1 || prefix1 === 2 || prefix1 === 3) {
    pacBase = 25.4;
    pacDays = 6;
    sedexBase = 44.9;
    sedexDays = 3;
  } else if (prefix1 === 8 || prefix1 === 9) {
    pacBase = 28.9;
    pacDays = 7;
    sedexBase = 51.9;
    sedexDays = 3;
  } else if (prefix1 === 4 || prefix1 === 5) {
    pacBase = 34.5;
    pacDays = 9;
    sedexBase = 62.9;
    sedexDays = 4;
  } else {
    pacBase = 38.9;
    pacDays = 10;
    sedexBase = 69.9;
    sedexDays = 5;
  }

  const qualifiesFree =
    config.freeShippingMinSubtotal > 0 && subtotal >= config.freeShippingMinSubtotal;

  const pacPrice = qualifiesFree
    ? 0
    : Math.round((pacBase + extraKgSteps * 5.8) * 100) / 100;
  const sedexPrice = Math.round((sedexBase + extraKgSteps * 9.5) * 100) / 100;

  const options: ShippingOption[] = [];

  if (
    config.enableGoianiaExpress &&
    (isGoianiaMetro || (state === 'GO' && /goi/i.test(city || '')))
  ) {
    options.push({
      code: 'GOIANIA_EXPRESS',
      service: 'MOTOBOY_GOIANIA',
      label: 'Entrega Expressa Goiânia & Região',
      price: qualifiesFree ? 0 : Number(config.goianiaExpressFee ?? 12.0),
      deliveryDays: 1,
      estimateText: qualifiesFree
        ? 'Frete Grátis · Hoje ou até 1 dia útil (Motoboy)'
        : 'Hoje ou até 1 dia útil (Motoboy)',
      providerSource: 'local-goiania',
    });
  }

  if (config.enableCorreiosPac) {
    const totalPacDays = pacDays + extraDays;
    options.push({
      code: '03298',
      service: 'PAC',
      label: 'Correios PAC',
      price: pacPrice,
      deliveryDays: totalPacDays,
      estimateText: qualifiesFree
        ? `Frete Grátis · Entrega em até ${totalPacDays} dias úteis`
        : `Entrega em até ${totalPacDays} dias úteis`,
      providerSource: 'tabela-correios',
    });
  }

  if (config.enableCorreiosSedex) {
    const totalSedexDays = sedexDays + extraDays;
    options.push({
      code: '03220',
      service: 'SEDEX',
      label: 'Correios SEDEX',
      price: sedexPrice,
      deliveryDays: totalSedexDays,
      estimateText: `Entrega em até ${totalSedexDays} dias úteis`,
      providerSource: 'tabela-correios',
    });
  }

  if (config.enableStorePickup && isGoianiaMetro) {
    options.push({
      code: 'RETIRADA_SOLAR_VILLE',
      service: 'RETIRADA',
      label: 'Retirar na Loja (Solar Ville – Goiânia)',
      price: 0,
      deliveryDays: 0,
      estimateText: 'Disponível hoje após confirmação',
      providerSource: 'local-goiania',
    });
  }

  return options;
}

export function buildWhatsAppOrderMessage(params: {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  items: CartItem[];
  address: ShippingAddress;
  shipping?: ShippingOption | null;
  subtotal: number;
  discount: number;
  couponCode?: string;
  total: number;
  templateIntro?: string;
}): string {
  const {
    orderNumber,
    customerName,
    customerPhone,
    items,
    address,
    shipping,
    subtotal,
    discount,
    couponCode,
    total,
    templateIntro,
  } = params;

  const intro =
    templateIntro?.trim() ||
    'Olá, Bella Menina Makeup! Gostaria de finalizar meu pedido:';

  const lines = items.map((item) => {
    const unit = getEffectivePrice(item.product);
    const swatchTxt = item.selectedSwatch ? ` (${item.selectedSwatch.name})` : '';
    return `• ${item.quantity}x ${item.product.name}${swatchTxt} — ${formatBRL(
      unit * item.quantity
    )}`;
  });

  const addrLine = `${address.street}, nº ${address.number}${
    address.complement ? ` (${address.complement})` : ''
  } – ${address.neighborhood}, ${address.city}/${address.state} – CEP ${formatCEP(
    address.cep
  )}`;

  const parts = [
    `${intro}`,
    '',
    `*Pedido:* #${orderNumber}`,
    `*Cliente:* ${customerName}`,
    `*WhatsApp:* ${customerPhone}`,
    '',
    '*Itens da sacola:*',
    ...lines,
    '',
    `*Subtotal:* ${formatBRL(subtotal)}`,
  ];

  if (discount > 0) {
    parts.push(
      `*Desconto${couponCode ? ` (${couponCode})` : ''}:* -${formatBRL(discount)}`
    );
  }

  if (shipping) {
    parts.push(
      `*Frete (${shipping.label}):* ${formatBRL(shipping.price)} (${shipping.estimateText})`
    );
  }

  parts.push(`*Total:* ${formatBRL(total)}`);
  parts.push('');
  parts.push(`*Endereço de entrega:* ${addrLine}`);

  return parts.join('\n');
}

export function buildWhatsAppProductMessage(
  product: Product,
  quantity = 1,
  swatchName?: string
): string {
  const unit = getEffectivePrice(product);
  const total = unit * quantity;
  return [
    'Olá, Bella Menina Makeup! Quero comprar este produto:',
    '',
    `*Produto:* ${product.name} (${product.sku})`,
    swatchName ? `*Variação:* ${swatchName}` : '',
    `*Quantidade:* ${quantity}x`,
    `*Valor estimado:* ${formatBRL(total)}`,
    '',
    'Pode me ajudar a finalizar pelo WhatsApp?',
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildWhatsAppUrl(phoneRaw: string, message: string): string {
  let digits = sanitizeDigits(phoneRaw);
  if (!digits.startsWith('55') && digits.length <= 11) {
    digits = `55${digits}`;
  }
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function exportCustomersCSV(customers: CustomerProfile[]): string {
  const headers = ['ID', 'Nome', 'Email', 'CPF', 'Nascimento', 'Telefone', 'Status', 'Enderecos', 'Cadastro'];
  const escapeCell = (val: string) => `"${String(val || '').replace(/"/g, '""')}"`;
  const rows = customers.map((c) => [
    c.id,
    c.name,
    c.email,
    c.cpf || '',
    c.birthDate || '',
    c.phone,
    c.blocked ? 'Bloqueado' : 'Ativo',
    String(c.addresses?.length || 0),
    c.createdAt,
  ]);
  return [headers, ...rows].map((row) => row.map(escapeCell).join(';')).join('\n');
}

export function calculateDashboardMetrics(
  orders: Order[],
  products: Product[],
  now: Date = new Date()
): DashboardMetrics {
  const validOrders = orders.filter((o) => o.status !== 'cancelled');

  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfDay.getDate() - 6);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  let dailySales = 0;
  let weeklySales = 0;
  let monthlySales = 0;
  let totalRevenue = 0;

  const ordersByOrigin = { site: 0, whatsapp: 0, balcao: 0 };
  const productAgg = new Map<string, { name: string; sku: string; units: number; revenue: number }>();

  const dayBuckets: { key: string; label: string; total: number; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(startOfDay);
    d.setDate(startOfDay.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    dayBuckets.push({ key, label, total: 0, count: 0 });
  }
  const bucketMap = new Map(dayBuckets.map((b) => [b.key, b]));

  for (const order of validOrders) {
    const dt = new Date(order.createdAt);
    const total = Number(order.total) || 0;
    totalRevenue += total;

    if (dt >= startOfDay) dailySales += total;
    if (dt >= startOfWeek) weeklySales += total;
    if (dt >= startOfMonth) monthlySales += total;

    if (order.origin === 'site') ordersByOrigin.site += 1;
    else if (order.origin === 'whatsapp') ordersByOrigin.whatsapp += 1;
    else if (order.origin === 'balcao') ordersByOrigin.balcao += 1;

    const dateKey = Number.isNaN(dt.getTime()) ? '' : dt.toISOString().slice(0, 10);
    const bucket = bucketMap.get(dateKey);
    if (bucket) {
      bucket.total = Math.round((bucket.total + total) * 100) / 100;
      bucket.count += 1;
    }

    for (const item of order.items) {
      const key = item.productId || item.sku || item.name;
      const existing = productAgg.get(key) || {
        name: item.name,
        sku: item.sku,
        units: 0,
        revenue: 0,
      };
      existing.units += item.quantity;
      existing.revenue = Math.round((existing.revenue + item.unitPrice * item.quantity) * 100) / 100;
      productAgg.set(key, existing);
    }
  }

  const topSellingProducts = Array.from(productAgg.values())
    .sort((a, b) => b.units - a.units)
    .slice(0, 5);

  const lowStockProducts = products
    .filter((p) => p.status === 'active' && p.stock <= 8)
    .sort((a, b) => a.stock - b.stock);

  const totalOrders = validOrders.length;
  const averageTicket = totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0;

  return {
    dailySales: Math.round(dailySales * 100) / 100,
    weeklySales: Math.round(weeklySales * 100) / 100,
    monthlySales: Math.round(monthlySales * 100) / 100,
    totalOrders,
    averageTicket,
    lowStockProducts,
    topSellingProducts,
    ordersByOrigin,
    last7DaysRevenue: dayBuckets.map(({ label, total, count }) => ({ label, total, count })),
  };
}
