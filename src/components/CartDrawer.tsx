import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Loader2,
  MessageCircle,
  Minus,
  Plus,
  ShoppingBag,
  Tag,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import type { Order, ShippingAddress, ShippingOption } from '../types/store';
import {
  buildWhatsAppOrderMessage,
  buildWhatsAppUrl,
  calculateCartWeightGrams,
  calculateSubtotal,
  formatBRL,
  formatCEP,
  formatPhoneBR,
  getEffectivePrice,
  sanitizeDigits,
  validateAndApplyCoupon,
} from '../utils/commerce';

export function CartDrawer() {
  const {
    cart,
    cartOpen,
    setCartOpen,
    updateCartQty,
    removeFromCart,
    clearCart,
    coupons,
    settings,
    customerProfile,
    submitOrder,
  } = useStore();

  const [couponInput, setCouponInput] = useState('');
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [couponFeedback, setCouponFeedback] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Pix');

  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<ShippingOption | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmedOrder, setConfirmedOrder] = useState<{
    order: Order;
    whatsappUrl: string;
  } | null>(null);

  // Auto-fill customer profile & default address when logged in
  useEffect(() => {
    if (!customerProfile) return;
    setCustomerName((prev) => prev || customerProfile.name);
    setCustomerPhone((prev) => prev || customerProfile.phone);
    const defaultAddr =
      customerProfile.addresses?.find((a) => a.isDefault) || customerProfile.addresses?.[0];
    if (defaultAddr) {
      setCep((prev) => prev || formatCEP(defaultAddr.cep));
      setStreet((prev) => prev || defaultAddr.street);
      setNumber((prev) => prev || defaultAddr.number);
      setComplement((prev) => prev || defaultAddr.complement || '');
      setNeighborhood((prev) => prev || defaultAddr.neighborhood);
      setCity((prev) => prev || defaultAddr.city);
      setState((prev) => prev || defaultAddr.state);
    }
  }, [customerProfile]);

  const subtotal = useMemo(() => calculateSubtotal(cart), [cart]);
  const weightGrams = useMemo(() => calculateCartWeightGrams(cart), [cart]);

  const appliedCoupon = useMemo(
    () =>
      appliedCode
        ? coupons.find((c) => c.code.toUpperCase() === appliedCode.toUpperCase()) || null
        : null,
    [appliedCode, coupons]
  );

  const couponEval = useMemo(() => {
    if (!appliedCoupon) return { valid: false, discount: 0 };
    return validateAndApplyCoupon(appliedCoupon, subtotal);
  }, [appliedCoupon, subtotal]);

  const discount = couponEval.valid ? couponEval.discount : 0;
  const shippingCost = selectedShipping ? selectedShipping.price : 0;
  const total = Math.max(0, Math.round((subtotal - discount + shippingCost) * 100) / 100);

  // Payment options governed by Admin settings
  const paymentCfg = settings.paymentConfig || {
    enablePix: true,
    pixKey: '',
    pixDiscountPercent: 5,
    enableCreditCard: true,
    maxInstallments: 6,
    enableDebitCard: true,
    enableCashOnDelivery: true,
  };

  useEffect(() => {
    const cleanCep = sanitizeDigits(cep);
    if (cleanCep.length !== 8) {
      setShippingOptions([]);
      setSelectedShipping(null);
      setCepError(null);
      return;
    }

    let cancelled = false;
    setCepLoading(true);
    setCepError(null);

    (async () => {
      try {
        let resolvedCity = city;
        let resolvedState = state;
        const cepRes = await fetch(`/api/cep/${cleanCep}`);
        if (cepRes.ok) {
          const addr = await cepRes.json();
          if (!cancelled) {
            if (addr.street) setStreet(addr.street);
            if (addr.neighborhood) setNeighborhood(addr.neighborhood);
            if (addr.city) {
              setCity(addr.city);
              resolvedCity = addr.city;
            }
            if (addr.state) {
              setState(addr.state);
              resolvedState = addr.state;
            }
          }
        } else if (!cancelled) {
          setCepError('CEP não encontrado no ViaCEP; preencha o endereço manualmente.');
        }

        const shipRes = await fetch('/api/shipping/correios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            destCep: cleanCep,
            weightGrams,
            city: resolvedCity,
            state: resolvedState,
            subtotal,
          }),
        });
        if (shipRes.ok && !cancelled) {
          const data = await shipRes.json();
          const opts = (data.options || []) as ShippingOption[];
          setShippingOptions(opts);
          if (opts.length > 0) {
            setSelectedShipping(opts[0]);
          }
        }
      } catch {
        if (!cancelled) {
          setCepError('Não foi possível consultar os Correios agora. Tente novamente.');
        }
      } finally {
        if (!cancelled) setCepLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cep, weightGrams, subtotal]);

  if (!cartOpen) return null;

  const handleApplyCoupon = () => {
    const clean = couponInput.trim().toUpperCase();
    if (!clean) return;
    const found = coupons.find((c) => c.code.toUpperCase() === clean);
    const res = validateAndApplyCoupon(found, subtotal);
    if (!res.valid) {
      setAppliedCode(null);
      setCouponFeedback(res.reason || 'Cupom inválido.');
    } else {
      setAppliedCode(clean);
      setCouponFeedback(`Cupom ${clean} aplicado: -${formatBRL(res.discount)}`);
    }
  };

  const handleFinalize = async (origin: 'site' | 'whatsapp') => {
    setFormError(null);
    if (cart.length === 0) return;

    if (!customerName.trim() || sanitizeDigits(customerPhone).length < 10) {
      setFormError('Informe seu nome completo e telefone/WhatsApp com DDD.');
      return;
    }
    if (
      sanitizeDigits(cep).length !== 8 ||
      !street.trim() ||
      !number.trim() ||
      !city.trim() ||
      !state.trim()
    ) {
      setFormError('Preencha o CEP e o endereço completo (rua, número, bairro, cidade e UF).');
      return;
    }
    if (!selectedShipping) {
      setFormError('Selecione uma opção de frete (PAC, SEDEX ou Goiânia Express).');
      return;
    }

    const address: ShippingAddress = {
      cep: formatCEP(cep),
      street: street.trim(),
      number: number.trim(),
      complement: complement.trim(),
      neighborhood: neighborhood.trim() || 'Centro',
      city: city.trim(),
      state: state.trim().toUpperCase().slice(0, 2),
    };

    const orderNumber = `BM-${Math.floor(1000 + Math.random() * 9000)}`;
    setSubmitting(true);
    try {
      const saved = await submitOrder({
        orderNumber,
        ...(customerProfile ? { customerId: customerProfile.id, customerEmail: customerProfile.email } : {}),
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        address,
        items: cart.map((i) => ({
          productId: i.product.id,
          name: i.product.name,
          sku: i.product.sku,
          unitPrice: getEffectivePrice(i.product),
          quantity: i.quantity,
          swatchName: i.selectedSwatch?.name,
        })),
        subtotal,
        discount,
        shippingCost,
        shippingMethod: selectedShipping.label,
        ...(couponEval.valid && appliedCode ? { couponCode: appliedCode } : {}),
        total,
        origin,
        paymentMethod,
        status: 'pending',
      });

      const waMsg = buildWhatsAppOrderMessage({
        orderNumber: saved.orderNumber,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        items: cart,
        address,
        shipping: selectedShipping,
        subtotal,
        discount,
        couponCode: appliedCode || undefined,
        total,
        templateIntro: settings.whatsappOrderTemplate,
      });
      const whatsappUrl = buildWhatsAppUrl(settings.whatsappNumber, waMsg);

      clearCart();
      setConfirmedOrder({ order: saved, whatsappUrl });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao finalizar pedido.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#1A1216]/50"
      role="dialog"
      aria-modal="true"
      aria-label="Sacola de Compras e Checkout"
    >
      <div className="w-full max-w-lg bg-white h-full flex flex-col border-l border-[#F1DCE4] shadow-2xl">
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-[#F1DCE4] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-[#FF2D6F]" />
            <h2 className="font-editorial text-xl font-semibold text-[#1A1216]">
              Sua Sacola
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setConfirmedOrder(null);
              setCartOpen(false);
            }}
            aria-label="Fechar sacola"
            className="p-2 rounded-lg text-[#6B545E] hover:text-[#1A1216] hover:bg-[#FFF5F8] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {confirmedOrder ? (
            <div className="p-6 rounded-2xl bg-[#FFF5F8] border border-[#F1DCE4] space-y-4 text-center">
              <CheckCircle2 className="w-10 h-10 text-[#FF2D6F] mx-auto" />
              <div>
                <h3 className="font-editorial text-2xl font-semibold text-[#1A1216]">
                  Pedido #{confirmedOrder.order.orderNumber} Confirmado
                </h3>
                <p className="text-sm text-[#6B545E] mt-1">
                  Obrigado por escolher a Bella Menina Makeup! Seu pedido foi registrado.
                </p>
              </div>
              <div className="text-left text-xs bg-white p-4 rounded-xl border border-[#F1DCE4] space-y-1.5 tabular-nums">
                <div className="flex justify-between">
                  <span className="text-[#6B545E]">Frete:</span>
                  <span className="font-medium">{confirmedOrder.order.shippingMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B545E]">Pagamento:</span>
                  <span className="font-medium">{confirmedOrder.order.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B545E]">Total:</span>
                  <span className="font-bold text-[#FF2D6F]">
                    {formatBRL(confirmedOrder.order.total)}
                  </span>
                </div>
              </div>
              <a
                href={confirmedOrder.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white bg-[#1F9D55] hover:bg-[#178246] transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Enviar Resumo no WhatsApp da Loja</span>
              </a>
              <button
                type="button"
                onClick={() => {
                  setConfirmedOrder(null);
                  setCartOpen(false);
                }}
                className="w-full py-2.5 text-xs font-semibold text-[#6B545E] hover:text-[#1A1216] cursor-pointer"
              >
                Continuar comprando
              </button>
            </div>
          ) : cart.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <ShoppingBag className="w-10 h-10 text-[#D8B4C2] mx-auto" />
              <p className="font-editorial text-lg text-[#1A1216]">
                Sua sacola está vazia
              </p>
              <p className="text-sm text-[#6B545E]">
                Explore nossas makes a partir de R$ 5,00 e glosses com charms!
              </p>
            </div>
          ) : (
            <>
              {/* Cart Items */}
              <div className="space-y-3">
                {cart.map((item) => {
                  const price = getEffectivePrice(item.product);
                  return (
                    <div
                      key={`${item.product.id}-${item.selectedSwatch?.name || 'default'}`}
                      className="flex gap-3.5 p-3 rounded-xl border border-[#F1DCE4] bg-white"
                    >
                      <img
                        src={item.product.images[0]}
                        alt={item.product.name}
                        referrerPolicy="no-referrer"
                        className="w-16 h-16 rounded-lg object-cover bg-[#FFF5F8] shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-semibold text-[#1A1216] truncate">
                            {item.product.name}
                          </h3>
                          <button
                            type="button"
                            onClick={() =>
                              removeFromCart(item.product.id, item.selectedSwatch?.name)
                            }
                            aria-label={`Remover ${item.product.name}`}
                            className="text-[#9E8892] hover:text-[#FF2D6F] p-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {item.selectedSwatch && (
                          <div className="text-xs text-[#6B545E] mt-0.5">
                            Tom: {item.selectedSwatch.name}
                          </div>
                        )}
                        <div className="mt-2 flex items-center justify-between">
                          <div className="inline-flex items-center border border-[#F1DCE4] rounded-lg">
                            <button
                              type="button"
                              onClick={() =>
                                updateCartQty(
                                  item.product.id,
                                  item.selectedSwatch?.name,
                                  item.quantity - 1
                                )
                              }
                              aria-label={`Diminuir quantidade de ${item.product.name}`}
                              className="px-2 py-1 text-xs hover:text-[#FF2D6F] cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="px-2 text-xs font-semibold tabular-nums">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                updateCartQty(
                                  item.product.id,
                                  item.selectedSwatch?.name,
                                  item.quantity + 1
                                )
                              }
                              aria-label={`Aumentar quantidade de ${item.product.name}`}
                              className="px-2 py-1 text-xs hover:text-[#FF2D6F] cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <span className="text-sm font-bold text-[#1A1216] tabular-nums">
                            {formatBRL(price * item.quantity)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Coupon Box */}
              <div className="p-4 rounded-xl bg-[#FFF9FB] border border-[#F1DCE4] space-y-2">
                <label
                  htmlFor="coupon-code-input"
                  className="text-xs font-semibold text-[#1A1216] flex items-center gap-1.5"
                >
                  <Tag className="w-3.5 h-3.5 text-[#FF2D6F]" />
                  <span>Cupom de desconto (ex: BELLA10)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    id="coupon-code-input"
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="Digite seu cupom"
                    className="flex-1 px-3 py-2 text-sm bg-white border border-[#F1DCE4] rounded-lg focus:outline-none focus:border-[#FF2D6F]"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="px-4 py-2 text-xs font-semibold text-[#1A1216] bg-white border border-[#F1DCE4] rounded-lg hover:border-[#FF2D6F] cursor-pointer"
                  >
                    Aplicar
                  </button>
                </div>
                {couponFeedback && (
                  <p className="text-xs text-[#B31248] font-medium">{couponFeedback}</p>
                )}
              </div>

              {/* Checkout Form & Correios CEP */}
              <div className="space-y-4">
                <h3 className="font-editorial text-lg font-semibold text-[#1A1216]">
                  Dados para Entrega & Checkout
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="chk-name" className="block text-xs font-medium text-[#6B545E] mb-1">
                      Nome completo *
                    </label>
                    <input
                      id="chk-name"
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Maria Silva"
                      className="w-full px-3 py-2 text-sm border border-[#F1DCE4] rounded-lg focus:outline-none focus:border-[#FF2D6F]"
                    />
                  </div>
                  <div>
                    <label htmlFor="chk-phone" className="block text-xs font-medium text-[#6B545E] mb-1">
                      Telefone / WhatsApp *
                    </label>
                    <input
                      id="chk-phone"
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(formatPhoneBR(e.target.value))}
                      placeholder="(62) 99999-0000"
                      className="w-full px-3 py-2 text-sm border border-[#F1DCE4] rounded-lg focus:outline-none focus:border-[#FF2D6F]"
                    />
                  </div>
                </div>

                {/* CEP Auto-Lookup + Correios */}
                <div>
                  <label htmlFor="chk-cep" className="block text-xs font-medium text-[#6B545E] mb-1">
                    CEP para cálculo automático Correios (PAC / SEDEX) *
                  </label>
                  <div className="relative">
                    <input
                      id="chk-cep"
                      type="text"
                      value={cep}
                      onChange={(e) => setCep(formatCEP(e.target.value))}
                      placeholder="74470-538"
                      maxLength={9}
                      className="w-full px-3 py-2 text-sm font-mono border border-[#F1DCE4] rounded-lg focus:outline-none focus:border-[#FF2D6F]"
                    />
                    {cepLoading && (
                      <Loader2 className="w-4 h-4 text-[#FF2D6F] animate-spin absolute right-3 top-2.5" />
                    )}
                  </div>
                  {cepError && <p className="text-xs text-[#B31248] mt-1">{cepError}</p>}
                </div>

                {/* Correios Shipping Options */}
                {shippingOptions.length > 0 && (
                  <div className="space-y-2" data-testid="shipping-options-list">
                    <div className="text-xs font-semibold text-[#1A1216] flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-[#FF2D6F]" />
                      <span>Opções de Entrega (Peso total: {weightGrams}g)</span>
                    </div>
                    {shippingOptions.map((opt) => {
                      const chosen = selectedShipping?.code === opt.code;
                      return (
                        <button
                          key={opt.code}
                          type="button"
                          onClick={() => setSelectedShipping(opt)}
                          className={`w-full text-left p-3 rounded-xl border flex items-center justify-between transition-colors cursor-pointer ${
                            chosen
                              ? 'border-[#FF2D6F] bg-[#FFF5F8]'
                              : 'border-[#F1DCE4] bg-white hover:border-[#D8B4C2]'
                          }`}
                        >
                          <div>
                            <div className="text-xs font-semibold text-[#1A1216]">
                              {opt.label}
                            </div>
                            <div className="text-[11px] text-[#6B545E]">
                              {opt.estimateText}
                            </div>
                          </div>
                          <span className="text-sm font-bold text-[#1A1216] tabular-nums">
                            {opt.price === 0 ? 'Grátis' : formatBRL(opt.price)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2.5">
                  <div className="col-span-2">
                    <label htmlFor="chk-street" className="block text-xs font-medium text-[#6B545E] mb-1">
                      Rua / Avenida *
                    </label>
                    <input
                      id="chk-street"
                      type="text"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-[#F1DCE4] rounded-lg focus:outline-none focus:border-[#FF2D6F]"
                    />
                  </div>
                  <div>
                    <label htmlFor="chk-number" className="block text-xs font-medium text-[#6B545E] mb-1">
                      Número *
                    </label>
                    <input
                      id="chk-number"
                      type="text"
                      value={number}
                      onChange={(e) => setNumber(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-[#F1DCE4] rounded-lg focus:outline-none focus:border-[#FF2D6F]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label htmlFor="chk-comp" className="block text-xs font-medium text-[#6B545E] mb-1">
                      Complemento
                    </label>
                    <input
                      id="chk-comp"
                      type="text"
                      value={complement}
                      onChange={(e) => setComplement(e.target.value)}
                      placeholder="Qd / Lt / Apto"
                      className="w-full px-3 py-2 text-sm border border-[#F1DCE4] rounded-lg focus:outline-none focus:border-[#FF2D6F]"
                    />
                  </div>
                  <div>
                    <label htmlFor="chk-neigh" className="block text-xs font-medium text-[#6B545E] mb-1">
                      Bairro *
                    </label>
                    <input
                      id="chk-neigh"
                      type="text"
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-[#F1DCE4] rounded-lg focus:outline-none focus:border-[#FF2D6F]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div className="col-span-2">
                    <label htmlFor="chk-city" className="block text-xs font-medium text-[#6B545E] mb-1">
                      Cidade *
                    </label>
                    <input
                      id="chk-city"
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-[#F1DCE4] rounded-lg focus:outline-none focus:border-[#FF2D6F]"
                    />
                  </div>
                  <div>
                    <label htmlFor="chk-state" className="block text-xs font-medium text-[#6B545E] mb-1">
                      UF *
                    </label>
                    <input
                      id="chk-state"
                      type="text"
                      maxLength={2}
                      value={state}
                      onChange={(e) => setState(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 text-sm border border-[#F1DCE4] rounded-lg focus:outline-none focus:border-[#FF2D6F]"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="chk-payment" className="block text-xs font-medium text-[#6B545E] mb-1">
                    Forma de pagamento
                  </label>
                  <select
                    id="chk-payment"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-[#F1DCE4] rounded-lg focus:outline-none focus:border-[#FF2D6F]"
                  >
                    {paymentCfg.enablePix && (
                      <option value="Pix">
                        Pix{paymentCfg.pixDiscountPercent > 0 ? ` (${paymentCfg.pixDiscountPercent}% OFF disponível)` : ''}
                      </option>
                    )}
                    {paymentCfg.enableCreditCard && (
                      <option value="Cartão de Crédito">
                        Cartão de Crédito (até {paymentCfg.maxInstallments}x)
                      </option>
                    )}
                    {paymentCfg.enableDebitCard && (
                      <option value="Cartão de Débito">Cartão de Débito</option>
                    )}
                    {paymentCfg.enableCashOnDelivery && (
                      <option value="Dinheiro na Entrega">Dinheiro na Entrega</option>
                    )}
                  </select>
                </div>

                {formError && (
                  <p className="text-xs font-medium text-[#B31248] bg-[#FFF5F8] p-3 rounded-lg border border-[#F1DCE4]">
                    {formError}
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Sticky Totals & Checkout Buttons */}
        {cart.length > 0 && !confirmedOrder && (
          <div className="p-6 border-t border-[#F1DCE4] bg-[#FFF9FB] space-y-3">
            <div className="space-y-1 text-sm tabular-nums">
              <div className="flex justify-between text-[#6B545E]">
                <span>Subtotal</span>
                <span>{formatBRL(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-[#1F9D55] font-medium">
                  <span>Desconto ({appliedCode})</span>
                  <span>-{formatBRL(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-[#6B545E]">
                <span>Frete ({selectedShipping?.label || 'Informe o CEP'})</span>
                <span>
                  {selectedShipping
                    ? shippingCost === 0
                      ? 'Grátis'
                      : formatBRL(shippingCost)
                    : '—'}
                </span>
              </div>
              <div className="flex justify-between text-base font-bold text-[#1A1216] pt-1.5 border-t border-[#F1DCE4]">
                <span>Total</span>
                <span>{formatBRL(total)}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleFinalize('whatsapp')}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-[#FF2D6F] hover:bg-[#E01E5D] disabled:opacity-60 transition-colors cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>{submitting ? 'Processando...' : 'Finalizar pelo WhatsApp'}</span>
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={() => handleFinalize('site')}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-[#1A1216] bg-white border border-[#F1DCE4] hover:border-[#FF2D6F] transition-colors cursor-pointer"
              >
                Confirmar Pedido Direto no Site
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
