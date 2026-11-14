import { useMemo, useState } from 'react';
import {
  ArrowUpDown,
  FolderOpen,
  ImagePlus,
  Layers,
  Loader2,
  PackagePlus,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { CATEGORY_IMAGES } from '../../data/seedCatalog';
import type { CategoryItem, Product, ProductSwatch } from '../../types/store';
import { formatBRL } from '../../utils/commerce';

interface CategoryFormState {
  id?: string;
  name: string;
  imageUrl: string;
  order: number;
}

interface ItemFormState {
  id?: string;
  name: string;
  sku: string;
  price: number;
  promoPrice: number | null;
  stock: number;
  category: string;
  brand: string;
  weightGrams: number;
  description: string;
  images: string[];
  swatches: ProductSwatch[];
  status: 'active' | 'inactive';
  isNew: boolean;
}

export function AdminCategories() {
  const {
    categories,
    products,
    saveCategory,
    deleteCategory,
    saveProduct,
    deleteProduct,
    uploadDeviceFile,
  } = useStore();

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [categories]
  );

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(() => {
    return sortedCategories[0]?.id || '';
  });

  const selectedCategory = useMemo(() => {
    return (
      sortedCategories.find((c) => c.id === selectedCategoryId) ||
      sortedCategories[0] ||
      null
    );
  }, [sortedCategories, selectedCategoryId]);

  // Category Create / Edit Form
  const [catFormOpen, setCatFormOpen] = useState(false);
  const [catForm, setCatForm] = useState<CategoryFormState>({
    name: '',
    imageUrl: '',
    order: sortedCategories.length,
  });
  const [catSaving, setCatSaving] = useState(false);
  const [uploadingCatImg, setUploadingCatImg] = useState(false);
  const [catFeedback, setCatFeedback] = useState<string | null>(null);

  // Category Delete Inline Confirmation
  const [confirmDeleteCatId, setConfirmDeleteCatId] = useState<string | null>(null);
  const [reassignTarget, setReassignTarget] = useState<string>('');
  const [deletingCat, setDeletingCat] = useState(false);

  // Item (Product inside Selected Category) Create / Edit Form
  const [itemFormOpen, setItemFormOpen] = useState(false);
  const [itemForm, setItemForm] = useState<ItemFormState | null>(null);
  const [itemSaving, setItemSaving] = useState(false);
  const [uploadingItemImg, setUploadingItemImg] = useState(false);
  const [confirmDeleteProdId, setConfirmDeleteProdId] = useState<string | null>(null);
  const [itemFeedback, setItemFeedback] = useState<string | null>(null);

  const productsCountByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of products) {
      map[p.category] = (map[p.category] || 0) + 1;
    }
    return map;
  }, [products]);

  const selectedCategoryProducts = useMemo(() => {
    if (!selectedCategory) return [];
    return products.filter((p) => p.category === selectedCategory.name);
  }, [products, selectedCategory]);

  const startNewCategory = () => {
    setCatForm({
      name: '',
      imageUrl: '',
      order: sortedCategories.length,
    });
    setCatFormOpen(true);
    setCatFeedback(null);
  };

  const startEditCategory = (cat: CategoryItem) => {
    setCatForm({
      id: cat.id,
      name: cat.name,
      imageUrl: cat.imageUrl || CATEGORY_IMAGES[cat.name] || '',
      order: cat.order ?? 0,
    });
    setCatFormOpen(true);
    setCatFeedback(null);
  };

  const handleCatPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCatImg(true);
    try {
      const res = await uploadDeviceFile(file);
      setCatForm((prev) => ({ ...prev, imageUrl: res.url }));
      setCatFeedback('Foto da categoria enviada com sucesso!');
    } catch (err) {
      setCatFeedback(err instanceof Error ? err.message : 'Erro ao enviar foto.');
    } finally {
      setUploadingCatImg(false);
      e.target.value = '';
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = catForm.name.trim();
    if (cleanName.length < 2) {
      setCatFeedback('Informe um nome com pelo menos 2 caracteres.');
      return;
    }
    setCatSaving(true);
    setCatFeedback(null);
    try {
      const saved = await saveCategory({
        ...(catForm.id ? { id: catForm.id } : {}),
        name: cleanName,
        imageUrl: catForm.imageUrl.trim(),
        order: Number(catForm.order) || 0,
      });
      setSelectedCategoryId(saved.id);
      setCatFormOpen(false);
      setCatFeedback(
        catForm.id
          ? `Categoria "${saved.name}" atualizada e sincronizada na loja!`
          : `Categoria "${saved.name}" adicionada ao catálogo!`
      );
    } catch (err) {
      setCatFeedback(err instanceof Error ? err.message : 'Erro ao salvar categoria.');
    } finally {
      setCatSaving(false);
    }
  };

  const initiateDeleteCategory = (cat: CategoryItem) => {
    const other = sortedCategories.find((c) => c.id !== cat.id);
    setReassignTarget(other ? other.name : '');
    setConfirmDeleteCatId(cat.id);
    setCatFeedback(null);
  };

  const handleConfirmDeleteCategory = async (cat: CategoryItem) => {
    setDeletingCat(true);
    try {
      const count = productsCountByCategory[cat.name] || 0;
      await deleteCategory(cat.id, count > 0 && reassignTarget ? reassignTarget : undefined);
      setConfirmDeleteCatId(null);
      if (selectedCategory?.id === cat.id) {
        const nextCat = sortedCategories.find((c) => c.id !== cat.id);
        setSelectedCategoryId(nextCat?.id || '');
      }
      setCatFeedback(`Categoria "${cat.name}" removida com sucesso.`);
    } catch (err) {
      setCatFeedback(err instanceof Error ? err.message : 'Erro ao remover categoria.');
    } finally {
      setDeletingCat(false);
    }
  };

  // Item CRUD inside the selected category
  const startNewItemInCategory = () => {
    if (!selectedCategory) return;
    const defaultImg =
      selectedCategory.imageUrl || CATEGORY_IMAGES[selectedCategory.name] || '';
    setItemForm({
      name: '',
      sku: `BM-${Math.floor(100 + Math.random() * 899)}`,
      price: 19.9,
      promoPrice: null,
      stock: 15,
      category: selectedCategory.name,
      brand: 'Bella Menina',
      weightGrams: 100,
      description: '',
      images: defaultImg ? [defaultImg] : [],
      swatches: [{ name: 'Rosa Glow', hex: '#FF2D6F' }],
      status: 'active',
      isNew: true,
    });
    setItemFormOpen(true);
    setItemFeedback(null);
  };

  const startEditItem = (p: Product) => {
    setItemForm({
      id: p.id,
      name: p.name,
      sku: p.sku,
      price: p.price,
      promoPrice: p.promoPrice ?? null,
      stock: p.stock,
      category: p.category,
      brand: p.brand || 'Bella Menina',
      weightGrams: p.weightGrams || 100,
      description: p.description || '',
      images: p.images || [],
      swatches: p.swatches || [],
      status: p.status,
      isNew: Boolean(p.isNew),
    });
    setItemFormOpen(true);
    setItemFeedback(null);
  };

  const handleItemPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !itemForm) return;
    setUploadingItemImg(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const res = await uploadDeviceFile(file);
        urls.push(res.url);
      }
      setItemForm((prev) =>
        prev ? { ...prev, images: [...prev.images, ...urls] } : prev
      );
      setItemFeedback('Foto do item enviada com sucesso!');
    } catch (err) {
      setItemFeedback(err instanceof Error ? err.message : 'Erro no upload da foto.');
    } finally {
      setUploadingItemImg(false);
      e.target.value = '';
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm) return;
    if (!itemForm.name.trim() || !itemForm.sku.trim()) {
      setItemFeedback('Informe o nome e o SKU do item.');
      return;
    }
    if (itemForm.images.length === 0) {
      setItemFeedback('Adicione pelo menos 1 foto do item.');
      return;
    }

    setItemSaving(true);
    try {
      const now = new Date().toISOString();
      const existing = itemForm.id
        ? products.find((p) => p.id === itemForm.id)
        : undefined;
      const payload: Product = {
        id: itemForm.id || `prod-${Date.now()}`,
        name: itemForm.name.trim(),
        description: itemForm.description.trim() || itemForm.name.trim(),
        price: Number(itemForm.price),
        promoPrice:
          itemForm.promoPrice && Number(itemForm.promoPrice) > 0
            ? Number(itemForm.promoPrice)
            : null,
        stock: Math.max(0, Number(itemForm.stock)),
        sku: itemForm.sku.trim(),
        category: itemForm.category,
        brand: itemForm.brand.trim() || 'Bella Menina',
        tags: existing?.tags || [itemForm.category.toLowerCase()],
        weightGrams: Math.max(10, Number(itemForm.weightGrams) || 100),
        images: itemForm.images,
        ...(existing?.videoUrl ? { videoUrl: existing.videoUrl } : {}),
        swatches: itemForm.swatches,
        status: itemForm.status,
        isNew: Boolean(itemForm.isNew),
        salesCount: existing?.salesCount || 0,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      };
      await saveProduct(payload);
      setItemFormOpen(false);
      setItemForm(null);
      setItemFeedback(
        itemForm.id
          ? `Item "${payload.name}" atualizado na categoria ${payload.category}!`
          : `Item "${payload.name}" adicionado em ${payload.category}!`
      );
    } catch (err) {
      setItemFeedback(err instanceof Error ? err.message : 'Erro ao salvar item.');
    } finally {
      setItemSaving(false);
    }
  };

  const handleConfirmDeleteItem = async (product: Product) => {
    try {
      await deleteProduct(product.id);
      setConfirmDeleteProdId(null);
      setItemFeedback(`Item "${product.name}" removido de ${product.category}.`);
    } catch (err) {
      setItemFeedback(err instanceof Error ? err.message : 'Erro ao remover item.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-[#1A1216]">
            Categorias & Itens por Categoria ({sortedCategories.length})
          </h3>
          <p className="text-xs text-[#6B545E]">
            Adicione, edite ou remova categorias da loja e gerencie os produtos dentro de cada categoria em tempo real.
          </p>
        </div>

        <button
          type="button"
          onClick={startNewCategory}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#FF2D6F] hover:bg-[#E01E5D] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Categoria</span>
        </button>
      </div>

      {catFeedback && (
        <div className="p-3 rounded-lg bg-[#FFF5F8] border border-[#F1DCE4] text-xs font-medium text-[#B31248] flex items-center justify-between gap-2">
          <span>{catFeedback}</span>
          <button
            type="button"
            onClick={() => setCatFeedback(null)}
            aria-label="Fechar aviso"
            className="text-[#6B545E] hover:text-[#1A1216] cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Create / Edit Category Form */}
      {catFormOpen && (
        <form
          onSubmit={handleSaveCategory}
          className="p-5 rounded-xl border border-[#F1DCE4] bg-white space-y-4 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-[#1A1216] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#FF2D6F]" />
              <span>{catForm.id ? 'Editar Categoria' : 'Adicionar Nova Categoria'}</span>
            </h4>
            <button
              type="button"
              onClick={() => setCatFormOpen(false)}
              className="text-xs text-[#6B545E] hover:text-[#1A1216] cursor-pointer"
            >
              Cancelar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div className="sm:col-span-2">
              <label htmlFor="cat-name-input" className="block text-xs font-medium text-[#6B545E] mb-1">
                Nome da Categoria *
              </label>
              <input
                id="cat-name-input"
                type="text"
                required
                minLength={2}
                maxLength={60}
                placeholder="Ex: Iluminadores, Sombras, Kits Presente..."
                value={catForm.name}
                onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-[#FFF9FB] border border-[#F1DCE4] rounded-lg focus:outline-none focus:border-[#FF2D6F]"
              />
            </div>

            <div>
              <label htmlFor="cat-order-input" className="block text-xs font-medium text-[#6B545E] mb-1">
                <span className="inline-flex items-center gap-1">
                  <ArrowUpDown className="w-3 h-3" /> Ordem na Loja
                </span>
              </label>
              <input
                id="cat-order-input"
                type="number"
                min={0}
                value={catForm.order}
                onChange={(e) => setCatForm({ ...catForm, order: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm bg-[#FFF9FB] border border-[#F1DCE4] rounded-lg tabular-nums focus:outline-none focus:border-[#FF2D6F]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            <div className="sm:col-span-8">
              <label htmlFor="cat-img-url" className="block text-xs font-medium text-[#6B545E] mb-1">
                Foto da Categoria (URL ou Upload do Dispositivo)
              </label>
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                <input
                  id="cat-img-url"
                  type="text"
                  placeholder="https://... ou envie do dispositivo"
                  value={catForm.imageUrl}
                  onChange={(e) => setCatForm({ ...catForm, imageUrl: e.target.value })}
                  className="flex-1 min-w-0 px-3 py-2 text-xs bg-[#FFF9FB] border border-[#F1DCE4] rounded-lg focus:outline-none focus:border-[#FF2D6F]"
                />
                <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-[#FFF5F8] text-[#FF2D6F] border border-[#F1DCE4] hover:bg-[#FF2D6F] hover:text-white transition-colors whitespace-nowrap cursor-pointer">
                  {uploadingCatImg ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ImagePlus className="w-3.5 h-3.5" />
                  )}
                  <span>Enviar Foto</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCatPhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="sm:col-span-4 flex items-center justify-between sm:justify-end gap-3">
              <div className="w-14 h-12 rounded-lg overflow-hidden border border-[#F1DCE4] bg-[#FFF5F8] flex items-center justify-center shrink-0">
                {catForm.imageUrl ? (
                  <img
                    src={catForm.imageUrl}
                    alt="Preview da categoria"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Sparkles className="w-4 h-4 text-[#FF2D6F]" />
                )}
              </div>
              <button
                type="submit"
                disabled={catSaving}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#FF2D6F] hover:bg-[#E01E5D] disabled:opacity-50 cursor-pointer"
              >
                {catSaving ? 'Salvando...' : catForm.id ? 'Salvar Alterações' : 'Criar Categoria'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Split Workspace: Categories List (Left) & Items inside Selected Category (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Categories Directory */}
        <div className="lg:col-span-5 rounded-xl border border-[#F1DCE4] bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-[#F1DCE4] bg-[#FFF9FB] flex items-center justify-between">
            <span className="text-xs font-semibold text-[#1A1216]">
              Todas as Categorias ({sortedCategories.length})
            </span>
            <span className="text-[11px] text-[#6B545E]">Clique para gerenciar itens</span>
          </div>

          <div className="divide-y divide-[#F9EEF2] max-h-[640px] overflow-y-auto">
            {sortedCategories.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#6B545E]">
                Nenhuma categoria cadastrada. Crie a primeira acima.
              </div>
            ) : (
              sortedCategories.map((cat) => {
                const isSelected = selectedCategory?.id === cat.id;
                const count = productsCountByCategory[cat.name] || 0;
                const thumb = cat.imageUrl || CATEGORY_IMAGES[cat.name];
                const isConfirmingDelete = confirmDeleteCatId === cat.id;

                return (
                  <div
                    key={cat.id}
                    className={`p-3 transition-colors ${
                      isSelected ? 'bg-[#FFF5F8]' : 'hover:bg-[#FFF9FB]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCategoryId(cat.id);
                          setItemFormOpen(false);
                          setItemFeedback(null);
                        }}
                        className="flex-1 min-w-0 flex items-center gap-3 text-left cursor-pointer"
                      >
                        <div className="w-11 h-11 rounded-lg overflow-hidden border border-[#F1DCE4] bg-white shrink-0 flex items-center justify-center">
                          {thumb ? (
                            <img
                              src={thumb}
                              alt={cat.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Sparkles className="w-4 h-4 text-[#FF2D6F]" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-sm font-semibold truncate ${
                                isSelected ? 'text-[#B31248]' : 'text-[#1A1216]'
                              }`}
                            >
                              {cat.name}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#6B545E] tabular-nums">
                            {count} {count === 1 ? 'item' : 'itens'} · Ordem #{cat.order + 1}
                          </div>
                        </div>
                      </button>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => startEditCategory(cat)}
                          aria-label={`Editar categoria ${cat.name}`}
                          className="p-1.5 rounded-lg text-[#6B545E] hover:text-[#FF2D6F] hover:bg-white cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => initiateDeleteCategory(cat)}
                          aria-label={`Remover categoria ${cat.name}`}
                          className="p-1.5 rounded-lg text-[#6B545E] hover:text-[#B31248] hover:bg-white cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {isConfirmingDelete && (
                      <div className="mt-3 p-3 rounded-lg bg-white border border-[#F1DCE4] space-y-2.5 text-xs">
                        <p className="font-medium text-[#1A1216]">
                          Remover a categoria <strong>{cat.name}</strong>?
                        </p>
                        {count > 0 && sortedCategories.length > 1 && (
                          <div>
                            <label className="block text-[11px] text-[#6B545E] mb-1">
                              Esta categoria possui {count} {count === 1 ? 'item' : 'itens'}. Mover para:
                            </label>
                            <select
                              value={reassignTarget}
                              onChange={(e) => setReassignTarget(e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs bg-[#FFF9FB] border border-[#F1DCE4] rounded-lg"
                            >
                              {sortedCategories
                                .filter((other) => other.id !== cat.id)
                                .map((other) => (
                                  <option key={other.id} value={other.name}>
                                    {other.name}
                                  </option>
                                ))}
                              <option value="">Não mover (manter apenas em Todos)</option>
                            </select>
                          </div>
                        )}
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteCatId(null)}
                            className="px-3 py-1.5 rounded-lg text-xs text-[#6B545E] hover:bg-[#FFF5F8] cursor-pointer"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            disabled={deletingCat}
                            onClick={() => handleConfirmDeleteCategory(cat)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#B31248] hover:bg-[#930C39] disabled:opacity-50 cursor-pointer"
                          >
                            {deletingCat ? 'Removendo...' : 'Confirmar Exclusão'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Items inside Selected Category */}
        <div className="lg:col-span-7 rounded-xl border border-[#F1DCE4] bg-white overflow-hidden">
          {selectedCategory ? (
            <>
              <div className="px-5 py-4 border-b border-[#F1DCE4] bg-[#FFF9FB] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg overflow-hidden border border-[#F1DCE4] bg-white shrink-0 flex items-center justify-center">
                    {selectedCategory.imageUrl || CATEGORY_IMAGES[selectedCategory.name] ? (
                      <img
                        src={selectedCategory.imageUrl || CATEGORY_IMAGES[selectedCategory.name]}
                        alt={selectedCategory.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FolderOpen className="w-4 h-4 text-[#FF2D6F]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-[#1A1216] truncate">
                      Itens em: {selectedCategory.name}
                    </h4>
                    <p className="text-[11px] text-[#6B545E] tabular-nums">
                      {selectedCategoryProducts.length}{' '}
                      {selectedCategoryProducts.length === 1
                        ? 'item cadastrado'
                        : 'itens cadastrados'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={startNewItemInCategory}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-[#FF2D6F] hover:bg-[#E01E5D] cursor-pointer"
                >
                  <PackagePlus className="w-3.5 h-3.5" />
                  <span>Adicionar Item nesta Categoria</span>
                </button>
              </div>

              {itemFeedback && (
                <div className="mx-5 mt-4 p-3 rounded-lg bg-[#FFF5F8] border border-[#F1DCE4] text-xs font-medium text-[#B31248] flex items-center justify-between gap-2">
                  <span>{itemFeedback}</span>
                  <button
                    type="button"
                    onClick={() => setItemFeedback(null)}
                    aria-label="Fechar aviso do item"
                    className="text-[#6B545E] hover:text-[#1A1216] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Inline Add / Edit Item Form inside Category */}
              {itemFormOpen && itemForm && (
                <form
                  onSubmit={handleSaveItem}
                  className="m-5 p-4 rounded-xl border border-[#F1DCE4] bg-[#FFF9FB] space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-semibold text-[#1A1216]">
                      {itemForm.id
                        ? `Editar Item (${itemForm.name})`
                        : `Novo Item em "${selectedCategory.name}"`}
                    </h5>
                    <button
                      type="button"
                      onClick={() => {
                        setItemFormOpen(false);
                        setItemForm(null);
                      }}
                      className="text-xs text-[#6B545E] hover:text-[#1A1216] cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label htmlFor="cat-item-name" className="block text-[11px] font-medium text-[#6B545E] mb-1">
                        Nome do Item *
                      </label>
                      <input
                        id="cat-item-name"
                        type="text"
                        required
                        value={itemForm.name}
                        onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                        className="w-full px-3 py-2 text-xs bg-white border border-[#F1DCE4] rounded-lg"
                      />
                    </div>

                    <div>
                      <label htmlFor="cat-item-sku" className="block text-[11px] font-medium text-[#6B545E] mb-1">
                        SKU *
                      </label>
                      <input
                        id="cat-item-sku"
                        type="text"
                        required
                        value={itemForm.sku}
                        onChange={(e) => setItemForm({ ...itemForm, sku: e.target.value })}
                        className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#F1DCE4] rounded-lg"
                      />
                    </div>

                    <div>
                      <label htmlFor="cat-item-cat" className="block text-[11px] font-medium text-[#6B545E] mb-1">
                        Categoria
                      </label>
                      <select
                        id="cat-item-cat"
                        value={itemForm.category}
                        onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
                        className="w-full px-3 py-2 text-xs bg-white border border-[#F1DCE4] rounded-lg"
                      >
                        {sortedCategories.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label htmlFor="cat-item-price" className="block text-[11px] font-medium text-[#6B545E] mb-1">
                        Preço (R$) *
                      </label>
                      <input
                        id="cat-item-price"
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={itemForm.price}
                        onChange={(e) => setItemForm({ ...itemForm, price: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-xs bg-white border border-[#F1DCE4] rounded-lg tabular-nums"
                      />
                    </div>

                    <div>
                      <label htmlFor="cat-item-promo" className="block text-[11px] font-medium text-[#6B545E] mb-1">
                        Preço Promocional
                      </label>
                      <input
                        id="cat-item-promo"
                        type="number"
                        step="0.01"
                        min="0"
                        value={itemForm.promoPrice ?? ''}
                        onChange={(e) =>
                          setItemForm({
                            ...itemForm,
                            promoPrice: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        className="w-full px-3 py-2 text-xs bg-white border border-[#F1DCE4] rounded-lg tabular-nums"
                      />
                    </div>

                    <div>
                      <label htmlFor="cat-item-stock" className="block text-[11px] font-medium text-[#6B545E] mb-1">
                        Estoque *
                      </label>
                      <input
                        id="cat-item-stock"
                        type="number"
                        min="0"
                        required
                        value={itemForm.stock}
                        onChange={(e) => setItemForm({ ...itemForm, stock: Number(e.target.value) })}
                        className="w-full px-3 py-2 text-xs bg-white border border-[#F1DCE4] rounded-lg tabular-nums"
                      />
                    </div>

                    <div>
                      <label htmlFor="cat-item-status" className="block text-[11px] font-medium text-[#6B545E] mb-1">
                        Status
                      </label>
                      <select
                        id="cat-item-status"
                        value={itemForm.status}
                        onChange={(e) =>
                          setItemForm({
                            ...itemForm,
                            status: e.target.value as 'active' | 'inactive',
                          })
                        }
                        className="w-full px-3 py-2 text-xs bg-white border border-[#F1DCE4] rounded-lg"
                      >
                        <option value="active">Ativo (Visível no site)</option>
                        <option value="inactive">Inativo (Oculto)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="cat-item-desc" className="block text-[11px] font-medium text-[#6B545E] mb-1">
                      Descrição
                    </label>
                    <textarea
                      id="cat-item-desc"
                      rows={2}
                      value={itemForm.description}
                      onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#F1DCE4] rounded-lg"
                    />
                  </div>

                  {/* Photos */}
                  <div className="p-3 rounded-lg bg-white border border-[#F1DCE4] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-[#1A1216]">
                        Fotos do Item ({itemForm.images.length})
                      </span>
                      <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#FFF5F8] text-[#FF2D6F] hover:bg-[#FF2D6F] hover:text-white transition-colors cursor-pointer">
                        {uploadingItemImg ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <ImagePlus className="w-3 h-3" />
                        )}
                        <span>Enviar Foto</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleItemPhotoUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {itemForm.images.map((url, idx) => (
                        <div
                          key={`${url}-${idx}`}
                          className="relative w-12 h-12 rounded-lg overflow-hidden border border-[#F1DCE4]"
                        >
                          <img
                            src={url}
                            alt={`Foto ${idx + 1}`}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setItemForm((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      images: prev.images.filter((_, i) => i !== idx),
                                    }
                                  : prev
                              )
                            }
                            aria-label={`Remover foto ${idx + 1}`}
                            className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-white/90 text-[#B31248] flex items-center justify-center text-[10px] font-bold cursor-pointer"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={itemSaving}
                      className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#FF2D6F] hover:bg-[#E01E5D] disabled:opacity-50 cursor-pointer"
                    >
                      {itemSaving ? 'Salvando...' : 'Salvar Item'}
                    </button>
                  </div>
                </form>
              )}

              {/* Category Items List */}
              <div className="divide-y divide-[#F9EEF2]">
                {selectedCategoryProducts.length === 0 ? (
                  <div className="p-8 text-center space-y-2">
                    <p className="text-xs text-[#6B545E]">
                      Nenhum item cadastrado em <strong>{selectedCategory.name}</strong> ainda.
                    </p>
                    <button
                      type="button"
                      onClick={startNewItemInCategory}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-[#FF2D6F] bg-[#FFF5F8] border border-[#F1DCE4] hover:border-[#FF2D6F] cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar primeiro item</span>
                    </button>
                  </div>
                ) : (
                  selectedCategoryProducts.map((item) => (
                    <div key={item.id} className="p-4 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={item.images[0]}
                            alt={item.name}
                            referrerPolicy="no-referrer"
                            className="w-12 h-12 rounded-lg object-cover border border-[#F1DCE4] bg-[#FFF5F8] shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-[#1A1216] truncate">
                              {item.name}
                            </div>
                            <div className="text-[11px] text-[#6B545E] flex flex-wrap items-center gap-2 mt-0.5">
                              <span className="font-mono">{item.sku}</span>
                              <span>·</span>
                              <span className="font-semibold text-[#1A1216] tabular-nums">
                                {item.promoPrice ? formatBRL(item.promoPrice) : formatBRL(item.price)}
                              </span>
                              <span>·</span>
                              <span className="tabular-nums">Estoque: {item.stock}</span>
                              <span>·</span>
                              <span
                                className={
                                  item.status === 'active'
                                    ? 'text-[#1F9D55] font-medium'
                                    : 'text-[#6B545E]'
                                }
                              >
                                {item.status === 'active' ? 'Ativo' : 'Inativo'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => startEditItem(item)}
                            aria-label={`Editar item ${item.name}`}
                            className="p-1.5 rounded-lg text-[#6B545E] hover:text-[#FF2D6F] hover:bg-[#FFF5F8] cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteProdId(item.id)}
                            aria-label={`Remover item ${item.name}`}
                            className="p-1.5 rounded-lg text-[#6B545E] hover:text-[#B31248] hover:bg-[#FFF5F8] cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {confirmDeleteProdId === item.id && (
                        <div className="p-2.5 rounded-lg bg-[#FFF9FB] border border-[#F1DCE4] flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="text-[#1A1216]">
                            Remover <strong>{item.name}</strong> do catálogo?
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteProdId(null)}
                              className="px-2.5 py-1 rounded text-[#6B545E] hover:bg-white cursor-pointer"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleConfirmDeleteItem(item)}
                              className="px-2.5 py-1 rounded font-semibold text-white bg-[#B31248] hover:bg-[#930C39] cursor-pointer"
                            >
                              Remover Item
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-xs text-[#6B545E]">
              Selecione ou crie uma categoria ao lado para gerenciar os itens dela.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
