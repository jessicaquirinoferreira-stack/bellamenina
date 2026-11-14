import { useMemo, useState } from 'react';
import {
  Activity,
  Boxes,
  CreditCard,
  Download,
  Package,
  Save,
  Search,
  Truck,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import type { OrderStatus, PaymentConfig, ShippingConfig } from '../../types/store';
import { DEFAULT_SHIPPING_CONFIG, formatBRL } from '../../utils/commerce';

type OpsSubTab = 'orders' | 'stock' | 'shipping' | 'payment' | 'logs';

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  shipped: 'Enviado',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

export function AdminOperations() {
  const {
    orders,
    products,
    settings,
    adminLogs,
    updateOrderDetails,
    updateProductStock,
    saveSettings,
  } = useStore();

  const [subTab, setSubTab] = useState<OpsSubTab>('orders');
  const [orderSearch, setOrderSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [trackingDrafts, setTrackingDrafts] = useState<Record<string, string>>({});

  const [stockSearch, setStockSearch] = useState('');
  const [shippingForm, setShippingForm] = useState<ShippingConfig>(
    settings.shippingConfig || DEFAULT_SHIPPING_CONFIG
  );
  const [paymentForm, setPaymentForm] = useState<PaymentConfig>(
    settings.paymentConfig || {
      enablePix: true,
      pixKey: 'bellameninamakeup@pix.com.br',
      pixDiscountPercent: 5,
      enableCreditCard: true,
      maxInstallments: 6,
      enableDebitCard: true,
      enableCashOnDelivery: true,
    }
  );
  const [feedback, setFeedback] = useState<string | null>(null);

  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (!q) return true;
      return (
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerPhone.toLowerCase().includes(q) ||
        (o.trackingCode || '').toLowerCase().includes(q)
      );
    });
  }, [orders, orderSearch, statusFilter]);

  const filteredProducts = useMemo(() => {
    const q = stockSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [products, stockSearch]);

  const handleSaveTracking = async (orderId: string, fallback: string) => {
    const code = trackingDrafts[orderId] ?? fallback;
    await updateOrderDetails(orderId, { trackingCode: code });
    setFeedback('Código de rastreio salvo em tempo real!');
  };

  const handleSaveShipping = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveSettings({ shippingConfig: shippingForm });
    setFeedback('Configurações de frete atualizadas em tempo real!');
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveSettings({ paymentConfig: paymentForm });
    setFeedback('Configurações de pagamento atualizadas em tempo real!');
  };

  const subTabs: { id: OpsSubTab; label: string; icon: React.ReactNode }[] = [
    { id: 'orders', label: 'Pedidos & Rastreio', icon: <Package className="w-3.5 h-3.5" /> },
    { id: 'stock', label: 'Estoque em Tempo Real', icon: <Boxes className="w-3.5 h-3.5" /> },
    { id: 'shipping', label: 'Frete & Correios', icon: <Truck className="w-3.5 h-3.5" /> },
    { id: 'payment', label: 'Pagamentos', icon: <CreditCard className="w-3.5 h-3.5" /> },
    { id: 'logs', label: 'Logs & Backup', icon: <Activity className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-white border border-[#F1DCE4] rounded-xl">
          {subTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setSubTab(t.id);
                setFeedback(null);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                subTab === t.id
                  ? 'bg-[#FF2D6F] text-white'
                  : 'text-[#6B545E] hover:text-[#1A1216] hover:bg-[#FFF5F8]'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <a
          href="/api/admin/backup"
          download
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-[#1A1216] bg-white border border-[#F1DCE4] hover:border-[#FF2D6F]"
        >
          <Download className="w-3.5 h-3.5 text-[#FF2D6F]" />
          <span>Backup Completo (JSON)</span>
        </a>
      </div>

      {feedback && (
        <div className="p-3 rounded-lg bg-[#FFF5F8] border border-[#F1DCE4] text-xs font-medium text-[#B31248]">
          {feedback}
        </div>
      )}

      {/* 1. Orders Control */}
      {subTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-[#6B545E] absolute left-3 top-2.5" />
              <input
                type="search"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Buscar pedido, cliente ou rastreio..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#F1DCE4] rounded-lg"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filtrar pedidos por status"
              className="px-3 py-2 text-xs bg-white border border-[#F1DCE4] rounded-lg"
            >
              <option value="all">Todos os status</option>
              {Object.entries(STATUS_LABELS).map(([k, lbl]) => (
                <option key={k} value={k}>
                  {lbl}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-xl border border-[#F1DCE4] bg-white overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#F1DCE4] bg-[#FFF9FB] text-[#6B545E]">
                  <th className="py-3 px-4 font-medium">Pedido</th>
                  <th className="py-3 px-3 font-medium">Cliente</th>
                  <th className="py-3 px-3 font-medium">Total</th>
                  <th className="py-3 px-3 font-medium">Rastreio</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F9EEF2]">
                {filteredOrders.map((ord) => (
                  <tr key={ord.id}>
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-[#1A1216]">
                        #{ord.orderNumber}
                      </div>
                      <div className="text-[11px] text-[#6B545E] capitalize">
                        {ord.origin} · {new Date(ord.createdAt).toLocaleDateString('pt-BR')}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-[#1A1216]">{ord.customerName}</div>
                      <div className="text-[11px] text-[#6B545E]">{ord.customerPhone}</div>
                    </td>
                    <td className="py-3 px-3 font-semibold tabular-nums">
                      {formatBRL(ord.total)}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={trackingDrafts[ord.id] ?? (ord.trackingCode || '')}
                          onChange={(e) =>
                            setTrackingDrafts((prev) => ({
                              ...prev,
                              [ord.id]: e.target.value.toUpperCase(),
                            }))
                          }
                          placeholder="Código Correios"
                          className="w-32 px-2 py-1 text-xs font-mono border border-[#F1DCE4] rounded"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveTracking(ord.id, ord.trackingCode || '')}
                          className="px-2.5 py-1 rounded text-[11px] font-semibold bg-[#FFF5F8] text-[#B31248] hover:bg-[#FF2D6F] hover:text-white cursor-pointer"
                        >
                          Salvar
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={ord.status}
                        onChange={(e) =>
                          updateOrderDetails(ord.id, {
                            status: e.target.value as OrderStatus,
                          })
                        }
                        aria-label={`Status pedido ${ord.orderNumber}`}
                        className="px-2 py-1 text-xs border border-[#F1DCE4] rounded bg-white"
                      >
                        {Object.entries(STATUS_LABELS).map(([k, lbl]) => (
                          <option key={k} value={k}>
                            {lbl}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. Real-time Stock Management */}
      {subTab === 'stock' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-[#6B545E] absolute left-3 top-2.5" />
            <input
              type="search"
              value={stockSearch}
              onChange={(e) => setStockSearch(e.target.value)}
              placeholder="Filtrar estoque por produto, SKU ou categoria..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#F1DCE4] rounded-lg"
            />
          </div>

          <div className="rounded-xl border border-[#F1DCE4] bg-white overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#F1DCE4] bg-[#FFF9FB] text-[#6B545E]">
                  <th className="py-3 px-4 font-medium">SKU</th>
                  <th className="py-3 px-3 font-medium">Produto</th>
                  <th className="py-3 px-3 font-medium">Categoria</th>
                  <th className="py-3 px-3 font-medium">Saldo Atual</th>
                  <th className="py-3 px-4 text-right font-medium">Ajuste Rápido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F9EEF2]">
                {filteredProducts.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 px-4 font-mono text-[#6B545E]">{p.sku}</td>
                    <td className="py-3 px-3 font-semibold text-[#1A1216]">{p.name}</td>
                    <td className="py-3 px-3 text-[#6B545E]">{p.category}</td>
                    <td className="py-3 px-3 tabular-nums font-bold">
                      <span
                        className={
                          p.stock === 0
                            ? 'text-[#B31248]'
                            : p.stock <= 8
                            ? 'text-[#D97706]'
                            : 'text-[#1F9D55]'
                        }
                      >
                        {p.stock} un.
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateProductStock(p.id, Math.max(0, p.stock - 1))}
                          className="px-2 py-1 rounded border border-[#F1DCE4] hover:border-[#FF2D6F] cursor-pointer"
                        >
                          -1
                        </button>
                        <button
                          type="button"
                          onClick={() => updateProductStock(p.id, p.stock + 5)}
                          className="px-2 py-1 rounded border border-[#F1DCE4] hover:border-[#FF2D6F] cursor-pointer"
                        >
                          +5
                        </button>
                        <button
                          type="button"
                          onClick={() => updateProductStock(p.id, p.stock + 20)}
                          className="px-2 py-1 rounded bg-[#FFF5F8] text-[#B31248] font-semibold cursor-pointer"
                        >
                          +20
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Shipping Config */}
      {subTab === 'shipping' && (
        <form
          onSubmit={handleSaveShipping}
          className="p-5 rounded-xl border border-[#F1DCE4] bg-white space-y-4"
        >
          <h4 className="text-sm font-semibold text-[#1A1216]">
            Configurações de Frete & Correios
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block text-[#6B545E] mb-1">CEP de Origem</label>
              <input
                type="text"
                value={shippingForm.originCep}
                onChange={(e) => setShippingForm({ ...shippingForm, originCep: e.target.value })}
                className="w-full px-3 py-2 font-mono border border-[#F1DCE4] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[#6B545E] mb-1">Taxa Motoboy Goiânia (R$)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={shippingForm.goianiaExpressFee}
                onChange={(e) =>
                  setShippingForm({ ...shippingForm, goianiaExpressFee: Number(e.target.value) })
                }
                className="w-full px-3 py-2 border border-[#F1DCE4] rounded-lg tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[#6B545E] mb-1">Frete Grátis a partir de (R$)</label>
              <input
                type="number"
                step="1"
                min="0"
                value={shippingForm.freeShippingMinSubtotal}
                onChange={(e) =>
                  setShippingForm({
                    ...shippingForm,
                    freeShippingMinSubtotal: Number(e.target.value),
                  })
                }
                className="w-full px-3 py-2 border border-[#F1DCE4] rounded-lg tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[#6B545E] mb-1">Dias extras de preparação</label>
              <input
                type="number"
                min="0"
                max="10"
                value={shippingForm.extraHandlingDays}
                onChange={(e) =>
                  setShippingForm({ ...shippingForm, extraHandlingDays: Number(e.target.value) })
                }
                className="w-full px-3 py-2 border border-[#F1DCE4] rounded-lg tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2">
            {[
              { key: 'enableGoianiaExpress' as const, label: 'Motoboy Goiânia' },
              { key: 'enableStorePickup' as const, label: 'Retirada Solar Ville' },
              { key: 'enableCorreiosPac' as const, label: 'Correios PAC' },
              { key: 'enableCorreiosSedex' as const, label: 'Correios SEDEX' },
            ].map((item) => (
              <label
                key={item.key}
                className="flex items-center gap-2 p-3 rounded-xl border border-[#F1DCE4] bg-[#FFF9FB] cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={shippingForm[item.key]}
                  onChange={(e) =>
                    setShippingForm({ ...shippingForm, [item.key]: e.target.checked })
                  }
                />
                <span className="font-medium text-[#1A1216]">{item.label}</span>
              </label>
            ))}
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#FF2D6F] hover:bg-[#E01E5D] cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Regras de Frete</span>
          </button>
        </form>
      )}

      {/* 4. Payment Config */}
      {subTab === 'payment' && (
        <form
          onSubmit={handleSavePayment}
          className="p-5 rounded-xl border border-[#F1DCE4] bg-white space-y-4"
        >
          <h4 className="text-sm font-semibold text-[#1A1216]">
            Configurações de Pagamento
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-[#6B545E] mb-1">Chave Pix Oficial</label>
              <input
                type="text"
                value={paymentForm.pixKey}
                onChange={(e) => setPaymentForm({ ...paymentForm, pixKey: e.target.value })}
                className="w-full px-3 py-2 border border-[#F1DCE4] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-[#6B545E] mb-1">Desconto no Pix (%)</label>
              <input
                type="number"
                min="0"
                max="30"
                value={paymentForm.pixDiscountPercent}
                onChange={(e) =>
                  setPaymentForm({ ...paymentForm, pixDiscountPercent: Number(e.target.value) })
                }
                className="w-full px-3 py-2 border border-[#F1DCE4] rounded-lg tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[#6B545E] mb-1">Máx. Parcelas Cartão</label>
              <input
                type="number"
                min="1"
                max="12"
                value={paymentForm.maxInstallments}
                onChange={(e) =>
                  setPaymentForm({ ...paymentForm, maxInstallments: Number(e.target.value) })
                }
                className="w-full px-3 py-2 border border-[#F1DCE4] rounded-lg tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2">
            {[
              { key: 'enablePix' as const, label: 'Aceitar Pix' },
              { key: 'enableCreditCard' as const, label: 'Cartão de Crédito' },
              { key: 'enableDebitCard' as const, label: 'Cartão de Débito' },
              { key: 'enableCashOnDelivery' as const, label: 'Dinheiro na Entrega' },
            ].map((item) => (
              <label
                key={item.key}
                className="flex items-center gap-2 p-3 rounded-xl border border-[#F1DCE4] bg-[#FFF9FB] cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={paymentForm[item.key]}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, [item.key]: e.target.checked })
                  }
                />
                <span className="font-medium text-[#1A1216]">{item.label}</span>
              </label>
            ))}
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#FF2D6F] hover:bg-[#E01E5D] cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Formas de Pagamento</span>
          </button>
        </form>
      )}

      {/* 5. Admin Activity Logs */}
      {subTab === 'logs' && (
        <div className="rounded-xl border border-[#F1DCE4] bg-white overflow-hidden">
          <div className="p-4 border-b border-[#F1DCE4] bg-[#FFF9FB] flex items-center justify-between">
            <h4 className="text-sm font-semibold text-[#1A1216]">
              Logs de Atividades do Administrador ({adminLogs.length})
            </h4>
            <span className="text-xs text-[#6B545E]">Auditoria em tempo real</span>
          </div>
          <div className="divide-y divide-[#F9EEF2] max-h-[420px] overflow-y-auto">
            {adminLogs.map((log) => (
              <div key={log.id} className="p-3.5 text-xs flex flex-wrap justify-between gap-2">
                <div>
                  <span className="font-semibold text-[#1A1216]">{log.action}</span>
                  <span className="text-[#6B545E]"> · {log.details}</span>
                </div>
                <div className="text-[#6B545E] font-mono tabular-nums">
                  {log.actorEmail} · {new Date(log.createdAt).toLocaleString('pt-BR')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
