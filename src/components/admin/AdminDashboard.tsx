import { useMemo } from 'react';
import { AlertTriangle, BarChart3, PackageCheck, ShoppingBag, TrendingUp } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import type { OrderStatus } from '../../types/store';
import { calculateDashboardMetrics, formatBRL } from '../../utils/commerce';

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  shipped: 'Enviado',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

export function AdminDashboard() {
  const { orders, products, updateOrderStatus } = useStore();

  const metrics = useMemo(
    () => calculateDashboardMetrics(orders, products),
    [orders, products]
  );

  const maxDayRev = Math.max(
    1,
    ...metrics.last7DaysRevenue.map((d) => d.total)
  );
  const totalOrigins = Math.max(
    1,
    metrics.ordersByOrigin.site +
      metrics.ordersByOrigin.whatsapp +
      metrics.ordersByOrigin.balcao
  );

  return (
    <div className="space-y-6">
      {/* 4-column KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-[#F1DCE4] bg-white">
          <div className="flex items-center justify-between text-xs font-medium text-[#6B545E]">
            <span>Vendas do Dia</span>
            <TrendingUp className="w-4 h-4 text-[#FF2D6F]" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#1A1216] tabular-nums">
            {formatBRL(metrics.dailySales)}
          </div>
          <div className="mt-1 text-xs text-[#6B545E] tabular-nums">
            Semana: {formatBRL(metrics.weeklySales)}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-[#F1DCE4] bg-white">
          <div className="flex items-center justify-between text-xs font-medium text-[#6B545E]">
            <span>Vendas do Mês</span>
            <BarChart3 className="w-4 h-4 text-[#FF2D6F]" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#1A1216] tabular-nums">
            {formatBRL(metrics.monthlySales)}
          </div>
          <div className="mt-1 text-xs text-[#6B545E] tabular-nums">
            {metrics.totalOrders} pedidos válidos
          </div>
        </div>

        <div className="p-4 rounded-xl border border-[#F1DCE4] bg-white">
          <div className="flex items-center justify-between text-xs font-medium text-[#6B545E]">
            <span>Ticket Médio</span>
            <ShoppingBag className="w-4 h-4 text-[#C99E52]" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#1A1216] tabular-nums">
            {formatBRL(metrics.averageTicket)}
          </div>
          <div className="mt-1 text-xs text-[#6B545E]">
            Média por venda concluída
          </div>
        </div>

        <div className="p-4 rounded-xl border border-[#F1DCE4] bg-white">
          <div className="flex items-center justify-between text-xs font-medium text-[#6B545E]">
            <span>Estoque Baixo</span>
            <AlertTriangle className="w-4 h-4 text-[#D97706]" />
          </div>
          <div className="mt-2 text-2xl font-bold text-[#1A1216] tabular-nums">
            {metrics.lowStockProducts.length}
          </div>
          <div className="mt-1 text-xs text-[#6B545E]">
            Produtos com ≤ 8 unidades
          </div>
        </div>
      </div>

      {/* Revenue Chart + Origins */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-5 rounded-xl border border-[#F1DCE4] bg-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-[#1A1216]">
                Faturamento dos Últimos 7 Dias
              </h3>
              <p className="text-xs text-[#6B545E]">
                Atualização em tempo real (Site + WhatsApp + PDV Balcão)
              </p>
            </div>
          </div>

          <div className="h-48 flex items-end gap-3 pt-4">
            {metrics.last7DaysRevenue.map((day) => {
              const pct = Math.max(6, Math.round((day.total / maxDayRev) * 100));
              return (
                <div
                  key={day.label}
                  className="flex-1 flex flex-col items-center gap-2 h-full justify-end"
                >
                  <span className="text-[11px] font-medium text-[#6B545E] tabular-nums">
                    {day.total > 0 ? formatBRL(day.total) : '—'}
                  </span>
                  <div className="w-full max-w-[44px] flex-1 flex items-end">
                    <div
                      className="w-full rounded-t-lg bg-[#FF2D6F] transition-all duration-300"
                      style={{ height: `${pct}%`, opacity: day.total > 0 ? 1 : 0.18 }}
                      title={`${day.label}: ${formatBRL(day.total)} (${day.count} pedidos)`}
                    />
                  </div>
                  <span className="text-[11px] text-[#6B545E] tabular-nums">
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Origin Breakdown & Low Stock */}
        <div className="p-5 rounded-xl border border-[#F1DCE4] bg-white space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-[#1A1216] mb-3">
              Origem dos Pedidos
            </h3>
            <div className="space-y-3 text-xs">
              {[
                { label: 'Site (Checkout)', count: metrics.ordersByOrigin.site, color: '#FF2D6F' },
                { label: 'WhatsApp', count: metrics.ordersByOrigin.whatsapp, color: '#1F9D55' },
                { label: 'PDV de Balcão', count: metrics.ordersByOrigin.balcao, color: '#C99E52' },
              ].map((row) => {
                const widthPct = Math.round((row.count / totalOrigins) * 100);
                return (
                  <div key={row.label} className="space-y-1">
                    <div className="flex justify-between tabular-nums">
                      <span className="text-[#1A1216] font-medium">{row.label}</span>
                      <span className="text-[#6B545E]">
                        {row.count} ({widthPct}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-[#FFF5F8] overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${widthPct}%`, backgroundColor: row.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-[#F9EEF2]">
            <h3 className="text-sm font-semibold text-[#1A1216] mb-2">
              Alerta de Estoque Baixo
            </h3>
            {metrics.lowStockProducts.length === 0 ? (
              <p className="text-xs text-[#6B545E] flex items-center gap-1.5">
                <PackageCheck className="w-4 h-4 text-[#1F9D55]" />
                <span>Todo o estoque está saudável.</span>
              </p>
            ) : (
              <ul className="space-y-1.5 text-xs">
                {metrics.lowStockProducts.slice(0, 4).map((p) => (
                  <li key={p.id} className="flex justify-between items-center gap-2">
                    <span className="truncate text-[#1A1216]">{p.name}</span>
                    <span className="font-mono font-semibold text-[#B31248] tabular-nums shrink-0">
                      {p.stock} un.
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Top Selling & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="p-5 rounded-xl border border-[#F1DCE4] bg-white">
          <h3 className="text-sm font-semibold text-[#1A1216] mb-3">
            Produtos Mais Vendidos
          </h3>
          {metrics.topSellingProducts.length === 0 ? (
            <p className="text-xs text-[#6B545E]">Nenhuma venda registrada ainda.</p>
          ) : (
            <div className="space-y-3">
              {metrics.topSellingProducts.map((item, idx) => (
                <div
                  key={item.sku || item.name}
                  className="flex items-center justify-between gap-2 text-xs pb-2 border-b border-[#F9EEF2] last:border-b-0"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-[#1A1216] truncate">
                      {idx + 1}. {item.name}
                    </div>
                    <div className="text-[#6B545E] tabular-nums">
                      {item.units} unidades vendidas
                    </div>
                  </div>
                  <span className="font-semibold text-[#FF2D6F] tabular-nums shrink-0">
                    {formatBRL(item.revenue)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 p-5 rounded-xl border border-[#F1DCE4] bg-white overflow-x-auto">
          <h3 className="text-sm font-semibold text-[#1A1216] mb-3">
            Pedidos Recentes
          </h3>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#F1DCE4] text-[#6B545E]">
                <th className="py-2 pr-3 font-medium">Pedido</th>
                <th className="py-2 pr-3 font-medium">Cliente</th>
                <th className="py-2 pr-3 font-medium">Origem</th>
                <th className="py-2 pr-3 font-medium">Total</th>
                <th className="py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F9EEF2]">
              {orders.slice(0, 8).map((order) => (
                <tr key={order.id}>
                  <td className="py-2.5 pr-3 font-mono font-semibold text-[#1A1216]">
                    #{order.orderNumber}
                  </td>
                  <td className="py-2.5 pr-3 text-[#1A1216]">{order.customerName}</td>
                  <td className="py-2.5 pr-3 capitalize text-[#6B545E]">{order.origin}</td>
                  <td className="py-2.5 pr-3 font-semibold tabular-nums">
                    {formatBRL(order.total)}
                  </td>
                  <td className="py-2.5">
                    <select
                      aria-label={`Status do pedido ${order.orderNumber}`}
                      value={order.status}
                      onChange={(e) =>
                        updateOrderStatus(order.id, e.target.value as OrderStatus)
                      }
                      className="px-2 py-1 text-xs border border-[#F1DCE4] rounded-md bg-white focus:outline-none focus:border-[#FF2D6F]"
                    >
                      {Object.entries(STATUS_LABELS).map(([val, label]) => (
                        <option key={val} value={val}>
                          {label}
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
    </div>
  );
}
