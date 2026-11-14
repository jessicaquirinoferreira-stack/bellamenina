import { useMemo, useState } from 'react';
import { ImagePlus, Loader2, Pencil, Plus, Trash2, Video } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import type { Product, ProductSwatch } from '../../types/store';
import { formatBRL } from '../../utils/commerce';

const EMPTY_FORM: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'salesCount'> = {
  name: '',
  description: '',
  price: 19.9,
  promoPrice: null,
  stock: 20,
  sku: '',
  category: 'Batom',
  brand: 'Bella Menina',
  tags: [],
  weightGrams: 100,
  images: [],
  videoUrl: '',
  swatches: [{ name: 'Rosa Glow', hex: '#FF2D6F' }],
  status: 'active',
  isNew: true,
};

export function AdminProducts() {
  const { categories, products, saveProduct, deleteProduct, uploadDeviceFile } = useStore();
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [tagsInput, setTagsInput] = useState('');
  const [swatchName, setSwatchName] = useState('');
  const [swatchHex, setSwatchHex] = useState('#FF2D6F');
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const categoryOptions = useMemo(() => {
    const names = [...categories]
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((c) => c.name);
    for (const p of products) {
      if (p.category && !names.includes(p.category)) names.push(p.category);
    }
    return names;
  }, [categories, products]);

  const visibleProducts = useMemo(() => {
    if (filterCategory === 'all') return products;
    return products.filter((p) => p.category === filterCategory);
  }, [products, filterCategory]);

  const startNew = () => {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      category:
        filterCategory !== 'all'
          ? filterCategory
          : categoryOptions[0] || 'Batom',
      sku: `BM-${Math.floor(100 + Math.random() * 899)}`,
    });
    setTagsInput('');
    setFormOpen(true);
    setFeedbackMsg(null);
  };

  const startEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      description: p.description,
      price: p.price,
      promoPrice: p.promoPrice ?? null,
      stock: p.stock,
      sku: p.sku,
      category: p.category,
      brand: p.brand,
      tags: p.tags || [],
      weightGrams: p.weightGrams || 100,
      images: p.images || [],
      videoUrl: p.videoUrl || '',
      swatches: p.swatches || [],
      status: p.status,
      isNew: Boolean(p.isNew),
    });
    setTagsInput((p.tags || []).join(', '));
    setFormOpen(true);
    setFeedbackMsg(null);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingMedia(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of Array.from(files)) {
        const res = await uploadDeviceFile(file);
        uploadedUrls.push(res.url);
      }
      setForm((prev) => ({ ...prev, images: [...prev.images, ...uploadedUrls] }));
      setFeedbackMsg('Fotos enviadas do dispositivo para Vercel Blob com sucesso!');
    } catch (err) {
      setFeedbackMsg(err instanceof Error ? err.message : 'Erro no upload das fotos.');
    } finally {
      setUploadingMedia(false);
      e.target.value = '';
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMedia(true);
    try {
      const res = await uploadDeviceFile(file);
      setForm((prev) => ({ ...prev, videoUrl: res.url }));
      setFeedbackMsg('Vídeo do produto enviado com sucesso!');
    } catch (err) {
      setFeedbackMsg(err instanceof Error ? err.message : 'Erro no upload do vídeo.');
    } finally {
      setUploadingMedia(false);
      e.target.value = '';
    }
  };

  const handleAddSwatch = () => {
    if (!swatchName.trim()) return;
    const next: ProductSwatch = { name: swatchName.trim(), hex: swatchHex };
    setForm((prev) => ({ ...prev, swatches: [...prev.swatches, next] }));
    setSwatchName('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.sku.trim()) {
      setFeedbackMsg('Preencha o nome e o SKU do produto.');
      return;
    }
    if (form.images.length === 0) {
      setFeedbackMsg('Envie pelo menos 1 foto do seu dispositivo.');
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const existing = products.find((p) => p.id === editingId);
      const payload: Product = {
        id: editingId || `prod-${Date.now()}`,
        name: form.name.trim(),
        description: form.description.trim() || form.name.trim(),
        price: Number(form.price),
        promoPrice:
          form.promoPrice && Number(form.promoPrice) > 0
            ? Number(form.promoPrice)
            : null,
        stock: Math.max(0, Number(form.stock)),
        sku: form.sku.trim(),
        category: form.category,
        brand: form.brand.trim() || 'Bella Menina',
        tags: tagsInput
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
          .slice(0, 10),
        weightGrams: Math.max(10, Number(form.weightGrams) || 100),
        images: form.images,
        ...(form.videoUrl ? { videoUrl: form.videoUrl } : {}),
        swatches: form.swatches,
        status: form.status,
        isNew: Boolean(form.isNew),
        salesCount: existing?.salesCount || 0,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      };
      await saveProduct(payload);
      setFormOpen(false);
      setFeedbackMsg('Produto salvo e atualizado no site em tempo real!');
    } catch (err) {
      setFeedbackMsg(err instanceof Error ? err.message : 'Erro ao salvar produto.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-[#1A1216]">
            Catálogo de Produtos ({visibleProducts.length})
          </h3>
          <p className="text-xs text-[#6B545E]">
            Upload ilimitado de fotos + 1 vídeo por produto diretamente do dispositivo via Vercel Blob.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filtrar produtos por categoria"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 rounded-lg text-xs bg-white border border-[#F1DCE4] focus:outline-none focus:border-[#FF2D6F]"
          >
            <option value="all">Todas as categorias ({products.length})</option>
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={startNew}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#FF2D6F] hover:bg-[#E01E5D] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Produto</span>
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-3 rounded-lg bg-[#FFF5F8] border border-[#F1DCE4] text-xs font-medium text-[#B31248]">
          {feedbackMsg}
        </div>
      )}

      {formOpen && (
        <form
          onSubmit={handleSave}
          className="p-5 rounded-xl border border-[#F1DCE4] bg-[#FFF9FB] space-y-4"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-[#1A1216]">
              {editingId ? 'Editar Produto' : 'Cadastrar Novo Produto'}
            </h4>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="text-xs text-[#6B545E] hover:text-[#1A1216] cursor-pointer"
            >
              Cancelar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label htmlFor="prod-name" className="block text-xs font-medium text-[#6B545E] mb-1">
                Nome do Produto *
              </label>
              <input
                id="prod-name"
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-[#F1DCE4] rounded-lg"
              />
            </div>
            <div>
              <label htmlFor="prod-sku" className="block text-xs font-medium text-[#6B545E] mb-1">
                SKU *
              </label>
              <input
                id="prod-sku"
                type="text"
                required
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
                className="w-full px-3 py-2 text-sm font-mono bg-white border border-[#F1DCE4] rounded-lg"
              />
            </div>

            <div>
              <label htmlFor="prod-price" className="block text-xs font-medium text-[#6B545E] mb-1">
                Preço (R$) *
              </label>
              <input
                id="prod-price"
                type="number"
                step="0.01"
                min="0"
                required
                value={form.price}
                onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm bg-white border border-[#F1DCE4] rounded-lg tabular-nums"
              />
            </div>

            <div>
              <label htmlFor="prod-promo" className="block text-xs font-medium text-[#6B545E] mb-1">
                Preço Promocional (opcional)
              </label>
              <input
                id="prod-promo"
                type="number"
                step="0.01"
                min="0"
                value={form.promoPrice ?? ''}
                onChange={(e) =>
                  setForm({
                    ...form,
                    promoPrice: e.target.value ? Number(e.target.value) : null,
                  })
                }
                className="w-full px-3 py-2 text-sm bg-white border border-[#F1DCE4] rounded-lg tabular-nums"
              />
            </div>

            <div>
              <label htmlFor="prod-stock" className="block text-xs font-medium text-[#6B545E] mb-1">
                Estoque *
              </label>
              <input
                id="prod-stock"
                type="number"
                min="0"
                required
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm bg-white border border-[#F1DCE4] rounded-lg tabular-nums"
              />
            </div>

            <div>
              <label htmlFor="prod-cat" className="block text-xs font-medium text-[#6B545E] mb-1">
                Categoria *
              </label>
              <select
                id="prod-cat"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-[#F1DCE4] rounded-lg"
              >
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="prod-brand" className="block text-xs font-medium text-[#6B545E] mb-1">
                Marca
              </label>
              <input
                id="prod-brand"
                type="text"
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-[#F1DCE4] rounded-lg"
              />
            </div>

            <div>
              <label htmlFor="prod-weight" className="block text-xs font-medium text-[#6B545E] mb-1">
                Peso (gramas para Correios)
              </label>
              <input
                id="prod-weight"
                type="number"
                min="10"
                value={form.weightGrams}
                onChange={(e) => setForm({ ...form, weightGrams: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm bg-white border border-[#F1DCE4] rounded-lg tabular-nums"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="prod-tags" className="block text-xs font-medium text-[#6B545E] mb-1">
                Tags (separadas por vírgula)
              </label>
              <input
                id="prod-tags"
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="gloss, charm, novidade"
                className="w-full px-3 py-2 text-sm bg-white border border-[#F1DCE4] rounded-lg"
              />
            </div>

            <div>
              <label htmlFor="prod-status" className="block text-xs font-medium text-[#6B545E] mb-1">
                Status
              </label>
              <select
                id="prod-status"
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as 'active' | 'inactive' })
                }
                className="w-full px-3 py-2 text-sm bg-white border border-[#F1DCE4] rounded-lg"
              >
                <option value="active">Ativo (Visível no site)</option>
                <option value="inactive">Inativo (Oculto)</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="prod-desc" className="block text-xs font-medium text-[#6B545E] mb-1">
              Descrição Rica
            </label>
            <textarea
              id="prod-desc"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-white border border-[#F1DCE4] rounded-lg"
            />
          </div>

          {/* Device Media Upload -> Vercel Blob */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-white border border-[#F1DCE4] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#1A1216]">
                  Fotos do Produto ({form.images.length})
                </span>
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FFF5F8] text-[#FF2D6F] hover:bg-[#FF2D6F] hover:text-white transition-colors cursor-pointer">
                  {uploadingMedia ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ImagePlus className="w-3.5 h-3.5" />
                  )}
                  <span>Enviar do Dispositivo</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                {form.images.map((url, idx) => (
                  <div key={`${url}-${idx}`} className="relative w-16 h-16 rounded-lg overflow-hidden border border-[#F1DCE4]">
                    <img
                      src={url}
                      alt={`Foto ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          images: prev.images.filter((_, i) => i !== idx),
                        }))
                      }
                      aria-label={`Remover foto ${idx + 1}`}
                      className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-white/90 text-[#B31248] flex items-center justify-center text-[10px] font-bold cursor-pointer"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-[#F1DCE4] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#1A1216]">
                  Vídeo do Produto (máx. 1)
                </span>
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FFF5F8] text-[#FF2D6F] hover:bg-[#FF2D6F] hover:text-white transition-colors cursor-pointer">
                  <Video className="w-3.5 h-3.5" />
                  <span>Enviar Vídeo</span>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleVideoUpload}
                    className="hidden"
                  />
                </label>
              </div>
              {form.videoUrl ? (
                <div className="flex items-center justify-between gap-2 text-xs text-[#1A1216] bg-[#FFF9FB] p-2 rounded-lg border border-[#F1DCE4]">
                  <span className="truncate">{form.videoUrl}</span>
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, videoUrl: '' }))}
                    className="text-[#B31248] font-semibold cursor-pointer"
                  >
                    Remover
                  </button>
                </div>
              ) : (
                <p className="text-xs text-[#6B545E]">Nenhum vídeo anexado.</p>
              )}
            </div>
          </div>

          {/* Swatches Editor */}
          <div className="p-4 rounded-xl bg-white border border-[#F1DCE4] space-y-2">
            <span className="text-xs font-semibold text-[#1A1216]">
              Variações / Swatches de Cor
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="Nome da cor (ex: Cereja)"
                value={swatchName}
                onChange={(e) => setSwatchName(e.target.value)}
                className="px-3 py-1.5 text-xs border border-[#F1DCE4] rounded-lg"
              />
              <input
                type="color"
                value={swatchHex}
                onChange={(e) => setSwatchHex(e.target.value)}
                aria-label="Cor do swatch"
                className="w-8 h-8 rounded border border-[#F1DCE4] cursor-pointer"
              />
              <button
                type="button"
                onClick={handleAddSwatch}
                className="px-3 py-1.5 text-xs font-semibold border border-[#F1DCE4] rounded-lg hover:border-[#FF2D6F] cursor-pointer"
              >
                Adicionar Tom
              </button>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {form.swatches.map((sw, idx) => (
                <span
                  key={`${sw.name}-${idx}`}
                  className="inline-flex items-center gap-1.5 text-xs text-[#1A1216] pr-2"
                >
                  <span
                    className="w-3 h-3 rounded-full border border-[#E2C8D1]"
                    style={{ backgroundColor: sw.hex }}
                  />
                  <span>{sw.name}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        swatches: prev.swatches.filter((_, i) => i !== idx),
                      }))
                    }
                    className="text-[#9E8892] hover:text-[#B31248] cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="inline-flex items-center gap-2 text-xs font-medium text-[#1A1216] cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(form.isNew)}
                onChange={(e) => setForm({ ...form, isNew: e.target.checked })}
              />
              <span>Destacar como Novidade no catálogo</span>
            </label>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#FF2D6F] hover:bg-[#E01E5D] disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'Salvando...' : 'Salvar Produto'}
            </button>
          </div>
        </form>
      )}

      {/* Products Table */}
      <div className="rounded-xl border border-[#F1DCE4] bg-white overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#F1DCE4] bg-[#FFF9FB] text-[#6B545E]">
              <th className="py-3 px-4 font-medium">Produto</th>
              <th className="py-3 px-3 font-medium">SKU</th>
              <th className="py-3 px-3 font-medium">Categoria</th>
              <th className="py-3 px-3 font-medium">Preço</th>
              <th className="py-3 px-3 font-medium">Estoque</th>
              <th className="py-3 px-3 font-medium">Status</th>
              <th className="py-3 px-4 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F9EEF2]">
            {visibleProducts.map((p) => (
              <tr key={p.id}>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={p.images[0]}
                      alt={p.name}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-lg object-cover bg-[#FFF5F8] shrink-0"
                    />
                    <span className="font-semibold text-[#1A1216]">{p.name}</span>
                  </div>
                </td>
                <td className="py-3 px-3 font-mono text-[#6B545E]">{p.sku}</td>
                <td className="py-3 px-3 text-[#6B545E]">{p.category}</td>
                <td className="py-3 px-3 font-semibold tabular-nums">
                  {p.promoPrice ? formatBRL(p.promoPrice) : formatBRL(p.price)}
                </td>
                <td className="py-3 px-3 tabular-nums">{p.stock}</td>
                <td className="py-3 px-3">
                  <span
                    className={
                      p.status === 'active'
                        ? 'text-[#1F9D55] font-semibold'
                        : 'text-[#6B545E]'
                    }
                  >
                    {p.status === 'active' ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => startEdit(p)}
                      aria-label={`Editar ${p.name}`}
                      className="p-1.5 rounded-lg text-[#6B545E] hover:text-[#FF2D6F] hover:bg-[#FFF5F8] cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteProduct(p.id)}
                      aria-label={`Excluir ${p.name}`}
                      className="p-1.5 rounded-lg text-[#6B545E] hover:text-[#B31248] hover:bg-[#FFF5F8] cursor-pointer"
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
