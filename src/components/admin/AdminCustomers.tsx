import { useMemo, useState } from 'react';
import {
  Ban,
  CheckCircle2,
  Download,
  Eye,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import type { CustomerProfile } from '../../types/store';
import {
  calculateProfileCompleteness,
  exportCustomersCSV,
  formatBRL,
  formatCPF,
  formatPhoneBR,
} from '../../utils/commerce';

export function AdminCustomers() {
  const { customers, orders, saveCustomerAdmin, deleteCustomerAdmin } = useStore();
  const [search, setSearch] = useState('');
  const [inspecting, setInspecting] = useState<CustomerProfile | null>(null);
  const [editing, setEditing] = useState<Partial<CustomerProfile> & { id?: string; password?: string } | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.cpf || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q)
    );
  }, [customers, search]);

  const handleExportCSV = () => {
    const csv = exportCustomersCSV(filtered);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clientes-bella-menina-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleToggleBlock = async (c: CustomerProfile) => {
    await saveCustomerAdmin({ id: c.id, blocked: !c.blocked });
    setStatusMsg(
      !c.blocked
        ? `Cliente ${c.name} bloqueado com sucesso.`
        : `Cliente ${c.name} desbloqueado com sucesso.`
    );
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setStatusMsg(null);
    try {
      await saveCustomerAdmin(editing);
      setEditing(null);
      setStatusMsg('Cadastro de cliente salvo em tempo real!');
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Erro ao salvar cliente.');
    } finally {
      setSaving(false);
    }
  };

  const getCustomerOrders = (c: CustomerProfile) =>
    orders.filter(
      (o) =>
        o.customerId === c.id ||
        (o.customerEmail && o.customerEmail.toLowerCase() === c.email.toLowerCase()) ||
        o.customerPhone === c.phone
    );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-[#1A1216]">
            Controle Total de Clientes ({customers.length})
          </h3>
          <p className="text-xs text-[#6B545E]">
            Visualize, edite, bloqueie, exporte e acompanhe pedidos e endereços de cada cliente.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-[#1A1216] bg-white border border-[#F1DCE4] hover:border-[#FF2D6F] cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>
          <button
            type="button"
            onClick={() =>
              setEditing({
                name: '',
                email: '',
                cpf: '',
                birthDate: '',
                phone: '',
                secondaryPhone: '',
                blocked: false,
              })
            }
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#FF2D6F] hover:bg-[#E01E5D] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Cliente</span>
          </button>
        </div>
      </div>

      {/* Advanced Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-[#6B545E] absolute left-3.5 top-3" />
        <input
          type="search"
          aria-label="Buscar cliente por nome, e-mail, CPF ou telefone"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, e-mail, CPF ou telefone..."
          className="w-full pl-10 pr-4 py-2.5 text-xs bg-white border border-[#F1DCE4] rounded-xl focus:outline-none focus:border-[#FF2D6F]"
        />
      </div>

      {statusMsg && (
        <div className="p-3 rounded-lg bg-[#FFF5F8] border border-[#F1DCE4] text-xs font-medium text-[#B31248]">
          {statusMsg}
        </div>
      )}

      {/* Create / Edit Customer Form */}
      {editing && (
        <form
          onSubmit={handleSaveForm}
          className="p-5 rounded-xl border border-[#F1DCE4] bg-[#FFF9FB] space-y-4"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-[#1A1216]">
              {editing.id ? 'Editar Cadastro do Cliente' : 'Cadastrar Novo Cliente'}
            </h4>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="text-xs text-[#6B545E] hover:text-[#1A1216] cursor-pointer"
            >
              Cancelar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-[#6B545E] mb-1">Nome completo *</label>
              <input
                type="text"
                required
                value={editing.name || ''}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-[#F1DCE4] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs text-[#6B545E] mb-1">E-mail *</label>
              <input
                type="email"
                required
                value={editing.email || ''}
                onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-[#F1DCE4] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs text-[#6B545E] mb-1">Telefone / WhatsApp *</label>
              <input
                type="tel"
                required
                value={editing.phone || ''}
                onChange={(e) => setEditing({ ...editing, phone: formatPhoneBR(e.target.value) })}
                className="w-full px-3 py-2 text-xs bg-white border border-[#F1DCE4] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs text-[#6B545E] mb-1">CPF</label>
              <input
                type="text"
                value={editing.cpf || ''}
                onChange={(e) => setEditing({ ...editing, cpf: formatCPF(e.target.value) })}
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#F1DCE4] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs text-[#6B545E] mb-1">Data de Nascimento</label>
              <input
                type="date"
                value={editing.birthDate || ''}
                onChange={(e) => setEditing({ ...editing, birthDate: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-[#F1DCE4] rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs text-[#6B545E] mb-1">Telefone Secundário</label>
              <input
                type="tel"
                value={editing.secondaryPhone || ''}
                onChange={(e) =>
                  setEditing({ ...editing, secondaryPhone: formatPhoneBR(e.target.value) })
                }
                className="w-full px-3 py-2 text-xs bg-white border border-[#F1DCE4] rounded-lg"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="inline-flex items-center gap-2 text-xs text-[#1A1216] cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(editing.blocked)}
                onChange={(e) => setEditing({ ...editing, blocked: e.target.checked })}
              />
              <span>Bloquear acesso deste cliente</span>
            </label>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-[#FF2D6F] hover:bg-[#E01E5D] disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'Salvando...' : 'Salvar Cliente'}
            </button>
          </div>
        </form>
      )}

      {/* Inspect Customer Drawer/Panel */}
      {inspecting && (
        <div className="p-5 rounded-xl border border-[#FF2D6F]/40 bg-white space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h4 className="font-editorial text-lg font-semibold text-[#1A1216]">
                Ficha Completa · {inspecting.name}
              </h4>
              <p className="text-xs text-[#6B545E]">
                {inspecting.email} · {inspecting.phone} · CPF: {inspecting.cpf || '—'} ·{' '}
                Completude: {calculateProfileCompleteness(inspecting).percentage}%
              </p>
            </div>
            <button
              type="button"
              onClick={() => setInspecting(null)}
              aria-label="Fechar ficha do cliente"
              className="p-1.5 rounded-lg text-[#6B545E] hover:text-[#1A1216] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Saved Addresses */}
            <div className="p-4 rounded-xl bg-[#FFF9FB] border border-[#F1DCE4] space-y-2">
              <div className="text-xs font-semibold text-[#1A1216] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#FF2D6F]" />
                <span>Endereços Salvos ({inspecting.addresses?.length || 0})</span>
              </div>
              {(inspecting.addresses || []).length === 0 ? (
                <p className="text-xs text-[#6B545E]">Nenhum endereço cadastrado.</p>
              ) : (
                <div className="space-y-2 text-xs">
                  {inspecting.addresses.map((a) => (
                    <div key={a.id} className="p-2.5 rounded-lg bg-white border border-[#F1DCE4]">
                      <div className="font-semibold text-[#1A1216]">
                        {a.label} {a.isDefault ? '· Padrão' : ''}
                      </div>
                      <div className="text-[#4A3840]">
                        {a.street}, nº {a.number} {a.complement ? `(${a.complement})` : ''} ·{' '}
                        {a.neighborhood}, {a.city}/{a.state} · CEP {a.cep}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Customer Orders History */}
            <div className="p-4 rounded-xl bg-[#FFF9FB] border border-[#F1DCE4] space-y-2">
              <div className="text-xs font-semibold text-[#1A1216]">
                Histórico de Pedidos ({getCustomerOrders(inspecting).length})
              </div>
              {getCustomerOrders(inspecting).length === 0 ? (
                <p className="text-xs text-[#6B545E]">Nenhum pedido registrado.</p>
              ) : (
                <div className="space-y-2 text-xs max-h-48 overflow-y-auto">
                  {getCustomerOrders(inspecting).map((ord) => (
                    <div
                      key={ord.id}
                      className="p-2.5 rounded-lg bg-white border border-[#F1DCE4] flex items-center justify-between gap-2"
                    >
                      <div>
                        <div className="font-mono font-bold text-[#1A1216]">
                          #{ord.orderNumber}
                        </div>
                        <div className="text-[#6B545E]">
                          {new Date(ord.createdAt).toLocaleDateString('pt-BR')} · {ord.status}
                        </div>
                      </div>
                      <span className="font-bold text-[#FF2D6F] tabular-nums">
                        {formatBRL(ord.total)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Customers Table */}
      <div className="rounded-xl border border-[#F1DCE4] bg-white overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#F1DCE4] bg-[#FFF9FB] text-[#6B545E]">
              <th className="py-3 px-4 font-medium">Cliente</th>
              <th className="py-3 px-3 font-medium">CPF</th>
              <th className="py-3 px-3 font-medium">WhatsApp</th>
              <th className="py-3 px-3 font-medium">Pedidos</th>
              <th className="py-3 px-3 font-medium">Status</th>
              <th className="py-3 px-4 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F9EEF2]">
            {filtered.map((c) => {
              const custOrders = getCustomerOrders(c);
              return (
                <tr key={c.id}>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-[#1A1216]">{c.name}</div>
                    <div className="text-[#6B545E]">{c.email}</div>
                  </td>
                  <td className="py-3 px-3 font-mono text-[#6B545E]">{c.cpf || '—'}</td>
                  <td className="py-3 px-3 text-[#6B545E]">{c.phone}</td>
                  <td className="py-3 px-3 tabular-nums font-medium">{custOrders.length}</td>
                  <td className="py-3 px-3">
                    {c.blocked ? (
                      <span className="inline-flex items-center gap-1 text-[#B31248] font-semibold">
                        <Ban className="w-3.5 h-3.5" />
                        <span>Bloqueado</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[#1F9D55] font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Ativo</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setInspecting(c)}
                        title="Ver histórico e endereços"
                        aria-label={`Visualizar ${c.name}`}
                        className="p-1.5 rounded-lg text-[#6B545E] hover:text-[#FF2D6F] hover:bg-[#FFF5F8] cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(c)}
                        title="Editar cadastro"
                        aria-label={`Editar ${c.name}`}
                        className="p-1.5 rounded-lg text-[#6B545E] hover:text-[#FF2D6F] hover:bg-[#FFF5F8] cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleBlock(c)}
                        title={c.blocked ? 'Desbloquear cliente' : 'Bloquear cliente'}
                        aria-label={c.blocked ? `Desbloquear ${c.name}` : `Bloquear ${c.name}`}
                        className="p-1.5 rounded-lg text-[#6B545E] hover:text-[#D97706] hover:bg-[#FFF5F8] cursor-pointer"
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteCustomerAdmin(c.id)}
                        title="Excluir cadastro"
                        aria-label={`Excluir ${c.name}`}
                        className="p-1.5 rounded-lg text-[#6B545E] hover:text-[#B31248] hover:bg-[#FFF5F8] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
