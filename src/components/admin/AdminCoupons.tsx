import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import type { Coupon } from '../../types/store';
import { formatBRL } from '../../utils/commerce';

export function AdminCoupons() {
  const { coupons, saveCoupon, deleteCoupon } = useStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [type, setType] = useState<'percent' | 'fixed'>('percent');
  const [value, setValue] = useState(15);
  const [minPurchase, setMinPurchase] = useState(30);
  const [maxUses, setMaxUses] = useState(100);
  const [expiresAt, setExpiresAt] = useState('2027-12-31');
  const [saving, setSaving] = useState(false);

  const startEdit = (c: Coupon) => {
    setEditingId(c.id);
    setCode(c.code);
    setType(c.type);
    setValue(c.value);
    setMinPurchase(c.minPurchase);
    setMaxUses(c.maxUses);
    setExpiresAt(c.expiresAt ? c.expiresAt.slice(0, 10) : '2027-12-31');
  };

  const resetForm = () => {
    setEditingId(null);
    setCode('');
    setType('percent');
    setValue(15);
    setMinPurchase(30);
    setMaxUses(100);
    setExpiresAt('2027-12-31');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const existing = coupons.find((c) => c.id === editingId);
      const coupon: Coupon = {
        id: editingId || `cup-${Date.now()}`,
        code: code.trim().toUpperCase(),
        type,
        value: Math.max(1, Number(value)),
        minPurchase: Math.max(0, Number(minPurchase)),
        maxUses: Math.max(1, Number(maxUses)),
        usedCount: existing?.usedCount || 0,
        expiresAt: expiresAt ? `${expiresAt}T23:59:59.000Z` : undefined,
        active: existing ? existing.active : true,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      };
      await saveCoupon(coupon);
      resetForm();
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (c: Coupon) => {
    await saveCoupon({ ...c, active: !c.active, updatedAt: new Date().toISOString() });
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSave}
        className="p-5 rounded-xl border border-[#F1DCE4] bg-[#FFF9FB] space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#1A1216]">
            {editingId ? 'Editar Cupom de Desconto' : 'Gerar Novo Cupom de Desconto'}
          </h3>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-xs text-[#6B545E] hover:text-[#1A1216] cursor-pointer"
            >
              Cancelar edição
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div>
            <label htmlFor="cup-code" className="block text-xs text-[#6B545E] mb-1">
              Código *
            </label>
            <input
              id="cup-code"
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="GLOW15"
              className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#F1DCE4] rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="cup-type" className="block text-xs text-[#6B545E] mb-1">
              Tipo
            </label>
            <select
              id="cup-type"
              value={type}
              onChange={(e) => setType(e.target.value as 'percent' | 'fixed')}
              className="w-full px-3 py-2 text-xs bg-white border border-[#F1DCE4] rounded-lg"
            >
              <option value="percent">Percentual (%)</option>
              <option value="fixed">Valor Fixo (R$)</option>
            </select>
          </div>
          <div>
            <label htmlFor="cup-val" className="block text-xs text-[#6B545E] mb-1">
              Valor
            </label>
            <input
              id="cup-val"
              type="number"
              min="1"
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs bg-white border border-[#F1DCE4] rounded-lg tabular-nums"
            />
          </div>
          <div>
            <label htmlFor="cup-min" className="block text-xs text-[#6B545E] mb-1">
              Compra Mínima (R$)
            </label>
            <input
              id="cup-min"
              type="number"
              min="0"
              value={minPurchase}
              onChange={(e) => setMinPurchase(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs bg-white border border-[#F1DCE4] rounded-lg tabular-nums"
            />
          </div>
          <div>
            <label htmlFor="cup-uses" className="block text-xs text-[#6B545E] mb-1">
              Limite de Usos
            </label>
            <input
              id="cup-uses"
              type="number"
              min="1"
              value={maxUses}
              onChange={(e) => setMaxUses(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs bg-white border border-[#F1DCE4] rounded-lg tabular-nums"
            />
          </div>
          <div>
            <label htmlFor="cup-exp" className="block text-xs text-[#6B545E] mb-1">
              Validade
            </label>
            <input
              id="cup-exp"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-[#F1DCE4] rounded-lg"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#FF2D6F] hover:bg-[#E01E5D] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{saving ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Criar Cupom'}</span>
        </button>
      </form>

      <div className="rounded-xl border border-[#F1DCE4] bg-white overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#F1DCE4] bg-[#FFF9FB] text-[#6B545E]">
              <th className="py-3 px-4 font-medium">Código</th>
              <th className="py-3 px-3 font-medium">Desconto</th>
              <th className="py-3 px-3 font-medium">Mínimo</th>
              <th className="py-3 px-3 font-medium">Usos</th>
              <th className="py-3 px-3 font-medium">Status</th>
              <th className="py-3 px-4 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F9EEF2]">
            {coupons.map((c) => (
              <tr key={c.id}>
                <td className="py-3 px-4 font-mono font-bold text-[#1A1216]">{c.code}</td>
                <td className="py-3 px-3 tabular-nums">
                  {c.type === 'percent' ? `${c.value}%` : formatBRL(c.value)}
                </td>
                <td className="py-3 px-3 tabular-nums">{formatBRL(c.minPurchase)}</td>
                <td className="py-3 px-3 tabular-nums">
                  {c.usedCount} / {c.maxUses}
                </td>
                <td className="py-3 px-3">
                  <button
                    type="button"
                    onClick={() => toggleActive(c)}
                    className={`font-semibold cursor-pointer ${
                      c.active ? 'text-[#1F9D55]' : 'text-[#6B545E]'
                    }`}
                  >
                    {c.active ? 'Ativo (Desativar)' : 'Inativo (Ativar)'}
                  </button>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(c)}
                      aria-label={`Editar cupom ${c.code}`}
                      className="p-1.5 rounded-lg text-[#6B545E] hover:text-[#FF2D6F] cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteCoupon(c.id)}
                      aria-label={`Excluir cupom ${c.code}`}
                      className="p-1.5 rounded-lg text-[#6B545E] hover:text-[#B31248] cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
