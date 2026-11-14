import { useMemo, useState } from 'react';
import { Minus, Plus, Printer, Search, ShoppingBag, Trash2 } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import type { Order, Product } from '../../types/store';
import { formatBRL, getEffectivePrice } from '../../utils/commerce';

interface PosLine {
  product: Product;
  quantity: number;
}

export function AdminPOS() {
  const { activeProducts, submitOrder } = useStore();
  const [search, setSearch] = useState('');
  const [lines, setLines] = useState<PosLine[]>([]);
  const [discountBRL, setDiscountBRL] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Pix');
  const [customerName, setCustomerName] = useState('Cliente Balcão');
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<Order | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return activeProducts;
    return activeProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [activeProducts, search]);

  const addLine = (product: Product) => {
    if (product.stock <= 0) return;
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.product.id === product.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = {
          ...copy[idx],
          quantity: Math.min(product.stock, copy[idx].quantity + 1),
        };
        return copy;
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const subtotal = useMemo(
    () =>
      lines.reduce(
        (acc, l) => acc + getEffectivePrice(l.product) * l.quantity,
        0
      ),
    [lines]
  );

  const safeDiscount = Math.min(subtotal, Math.max(0, Number(discountBRL) || 0));
  const total = Math.max(0, Math.round((subtotal - safeDiscount) * 100) / 100);

  const handleCompletePOS = async () => {
    if (lines.length === 0) return;
    setSubmitting(true);
    try {
      const saved = await submitOrder({
        orderNumber: `PDV-${Math.floor(1000 + Math.random() * 9000)}`,
        customerName: customerName.trim() || 'Cliente Balcão',
        customerPhone: '(62) 99999-4321',
        items: lines.map((l) => ({
          productId: l.product.id,
          name: l.product.name,
          sku: l.product.sku,
          unitPrice: getEffectivePrice(l.product),
          quantity: l.quantity,
        })),
        subtotal: Math.round(subtotal * 100) / 100,
        discount: safeDiscount,
        shippingCost: 0,
        shippingMethod: 'Retirada Balcão – Goiânia/GO',
        total,
        origin: 'balcao',
        paymentMethod,
        status: 'delivered',
      });
      setReceipt(saved);
      setLines([]);
      setDiscountBRL(0);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Product Picker */}
      <div className="lg:col-span-3 space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 text-[#6B545E] absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar produto por nome ou SKU no balcão..."
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-[#F1DCE4] rounded-xl focus:outline-none focus:border-[#FF2D6F]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[480px] overflow-y-auto pr-1">
          {filtered.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={p.stock <= 0}
              onClick={() => addLine(p)}
              className="text-left p-3 rounded-xl border border-[#F1DCE4] bg-white hover:border-[#FF2D6F] transition-colors flex items-center gap-3 disabled:opacity-50 cursor-pointer"
            >
              <img
                src={p.images[0]}
                alt={p.name}
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-lg object-cover bg-[#FFF5F8] shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-[#1A1216] truncate">
                  {p.name}
                </div>
                <div className="text-[11px] text-[#6B545E] font-mono">
                  {p.sku} · Estoque: {p.stock}
                </div>
                <div className="text-xs font-bold text-[#FF2D6F] tabular-nums mt-0.5">
                  {formatBRL(getEffectivePrice(p))}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* POS Register & Receipt */}
      <div className="lg:col-span-2 p-5 rounded-xl border border-[#F1DCE4] bg-white flex flex-col justify-between gap-4">
        {receipt ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#FFF9FB] border border-dashed border-[#D8B4C2] font-mono text-xs space-y-2">
              <div className="text-center font-bold text-sm text-[#1A1216]">
                BELLA MENINA MAKEUP
              </div>
              <div className="text-center text-[11px] text-[#6B545E]">
                Al. Higino Pires Martins · Goiânia – GO
              </div>
              <div className="border-t border-dashed border-[#D8B4C2] pt-2">
                <div>Recibo: #{receipt.orderNumber}</div>
                <div>Cliente: {receipt.customerName}</div>
                <div>Pagamento: {receipt.paymentMethod}</div>
              </div>
              <div className="border-t border-dashed border-[#D8B4C2] pt-2 space-y-1">
                {receipt.items.map((it) => (
                  <div key={it.productId} className="flex justify-between">
                    <span>
                      {it.quantity}x {it.name.slice(0, 22)}
                    </span>
                    <span>{formatBRL(it.unitPrice * it.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-dashed border-[#D8B4C2] pt-2 space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatBRL(receipt.subtotal)}</span>
                </div>
                {receipt.discount > 0 && (
                  <div className="flex justify-between">
                    <span>Desconto</span>
                    <span>-{formatBRL(receipt.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm">
                  <span>TOTAL</span>
                  <span>{formatBRL(receipt.total)}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold text-[#1A1216] border border-[#F1DCE4] hover:border-[#FF2D6F] cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Cupom</span>
              </button>
              <button
                type="button"
                onClick={() => setReceipt(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#FF2D6F] hover:bg-[#E01E5D] cursor-pointer"
              >
                Nova Venda
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#1A1216]">
                <ShoppingBag className="w-4 h-4 text-[#FF2D6F]" />
                <span>Venda Presencial (PDV)</span>
              </div>

              {lines.length === 0 ? (
                <p className="text-xs text-[#6B545E] py-8 text-center">
                  Clique nos produtos ao lado para adicionar ao caixa.
                </p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {lines.map((line) => (
                    <div
                      key={line.product.id}
                      className="flex items-center justify-between gap-2 text-xs p-2 rounded-lg bg-[#FFF9FB] border border-[#F1DCE4]"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{line.product.name}</div>
                        <div className="text-[#6B545E] tabular-nums">
                          {formatBRL(getEffectivePrice(line.product))} un.
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setLines((prev) =>
                              prev
                                .map((l) =>
                                  l.product.id === line.product.id
                                    ? { ...l, quantity: l.quantity - 1 }
                                    : l
                                )
                                .filter((l) => l.quantity > 0)
                            )
                          }
                          aria-label="Diminuir item PDV"
                          className="p-1 hover:text-[#FF2D6F] cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-5 text-center font-semibold tabular-nums">
                          {line.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => addLine(line.product)}
                          aria-label="Aumentar item PDV"
                          className="p-1 hover:text-[#FF2D6F] cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setLines((prev) =>
                              prev.filter((l) => l.product.id !== line.product.id)
                            )
                          }
                          aria-label="Remover item PDV"
                          className="p-1 text-[#9E8892] hover:text-[#B31248] cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <div>
                  <label htmlFor="pos-customer" className="block text-[11px] text-[#6B545E] mb-1">
                    Cliente
                  </label>
                  <input
                    id="pos-customer"
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-[#F1DCE4] rounded-lg"
                  />
                </div>
                <div>
                  <label htmlFor="pos-discount" className="block text-[11px] text-[#6B545E] mb-1">
                    Desconto (R$)
                  </label>
                  <input
                    id="pos-discount"
                    type="number"
                    min="0"
                    step="0.5"
                    value={discountBRL}
                    onChange={(e) => setDiscountBRL(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs border border-[#F1DCE4] rounded-lg tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="pos-payment" className="block text-[11px] text-[#6B545E] mb-1">
                  Forma de Pagamento
                </label>
                <select
                  id="pos-payment"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-[#F1DCE4] rounded-lg bg-white"
                >
                  <option value="Pix">Pix</option>
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Cartão de Crédito">Cartão de Crédito</option>
                  <option value="Cartão de Débito">Cartão de Débito</option>
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-[#F1DCE4] space-y-3">
              <div className="flex justify-between items-baseline tabular-nums">
                <span className="text-xs text-[#6B545E]">Total no Caixa</span>
                <span className="text-xl font-bold text-[#1A1216]">
                  {formatBRL(total)}
                </span>
              </div>
              <button
                type="button"
                disabled={lines.length === 0 || submitting}
                onClick={handleCompletePOS}
                className="w-full py-2.5 rounded-xl text-xs font-semibold text-white bg-[#FF2D6F] hover:bg-[#E01E5D] disabled:opacity-50 cursor-pointer"
              >
                {submitting ? 'Registrando...' : 'Finalizar Venda & Gerar Recibo'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
