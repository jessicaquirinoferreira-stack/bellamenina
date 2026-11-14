import { type RefObject, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Instagram,
  MapPin,
  MessageCircle,
  Search,
  Sparkles,
  Star,
  Truck,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import type { Product } from '../types/store';
import { CATEGORY_IMAGES, GENERATED_IMAGES, OFFICIAL_LOGO_URL } from '../data/seedCatalog';
import { BrandLogo } from './BrandLogo';
import { ProductCard } from './ProductCard';
import { buildWhatsAppUrl, formatBRL, getEffectivePrice } from '../utils/commerce';

const HIGHLIGHT_TABS = ['Todos', 'Novidades', 'A partir de R$ 5'] as const;

const FEATURED_BRANDS = [
  { name: 'Bella Menina Exclusive', note: 'Glosses com Charms' },
  { name: 'Bella Menina Atelier', note: 'Body Splash & Fragrâncias' },
  { name: 'Bella Menina Pro', note: 'Bases & Paletas' },
  { name: 'Bella Menina Care', note: 'Máscaras & Skincare' },
  { name: 'Bella Menina Gift', note: 'Cestas Presenteáveis' },
] as const;

const INSTAGRAM_POSTS = [
  {
    id: 'ig-1',
    image: GENERATED_IMAGES.glossCharm,
    caption: 'Gloss Glow com Charms colecionáveis de Cereja & Soda Pop',
    category: 'Gloss',
  },
  {
    id: 'ig-2',
    image: GENERATED_IMAGES.bodySplash,
    caption: 'Body Splash Rosé Lumière · fixação suave o dia inteiro',
    category: 'Body Splash',
  },
  {
    id: 'ig-3',
    image: GENERATED_IMAGES.batomVelvet,
    caption: 'Swatches reais do Batom Velvet Matte em vários tons de pele',
    category: 'Batom',
  },
  {
    id: 'ig-4',
    image: GENERATED_IMAGES.cosmeticos,
    caption: 'Paleta Trio Blush & Iluminador Rosé · brilho micronizado',
    category: 'Cosméticos',
  },
  {
    id: 'ig-5',
    image: GENERATED_IMAGES.cestaPresente,
    caption: 'Cestas artesanais com laço de cetim prontas para presentear',
    category: 'Cestas',
  },
  {
    id: 'ig-6',
    image: GENERATED_IMAGES.acessorios,
    caption: 'Pincéis macios e espelhos pocket para sua nécessaire',
    category: 'Acessórios',
  },
] as const;

interface HeroSlide {
  id: string;
  image: string;
  title: string;
  category: string;
  priceText: string;
  product?: Product;
}

interface StorefrontHomeProps {
  activeCategory: string;
  onChangeCategory: (category: string) => void;
  searchInputRef?: RefObject<HTMLInputElement | null>;
}

export function StorefrontHome({
  activeCategory,
  onChangeCategory,
  searchInputRef,
}: StorefrontHomeProps) {
  const {
    categories,
    activeProducts,
    settings,
    feedbacks,
    openAdminOrLogin,
    setSelectedProduct,
  } = useStore();
  const prefersReducedMotion = useReducedMotion();

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [categories]
  );

  const categoryTabs = useMemo(
    () => [...HIGHLIGHT_TABS, ...sortedCategories.map((c) => c.name)],
    [sortedCategories]
  );

  useEffect(() => {
    if (
      activeCategory &&
      !HIGHLIGHT_TABS.includes(activeCategory as (typeof HIGHLIGHT_TABS)[number]) &&
      sortedCategories.length > 0 &&
      !sortedCategories.some((c) => c.name === activeCategory)
    ) {
      onChangeCategory('Todos');
    }
  }, [activeCategory, sortedCategories, onChangeCategory]);

  const [searchQuery, setSearchQuery] = useState('');
  const [priceRange, setPriceRange] = useState('all');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc'>(
    'featured'
  );
  const [slideIndex, setSlideIndex] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);
  const [failedCategoryImgs, setFailedCategoryImgs] = useState<
    Record<string, boolean>
  >({});

  // Slideshow dynamically sourced from registered active products
  const heroSlides = useMemo<HeroSlide[]>(() => {
    const productSlides = activeProducts
      .filter((p) => p.images && p.images.length > 0 && p.images[0])
      .map((p) => ({
        id: p.id,
        image: p.images[0],
        title: p.name,
        category: p.category,
        priceText: formatBRL(getEffectivePrice(p)),
        product: p,
      }));

    if (productSlides.length > 0) return productSlides;

    return [
      {
        id: 'default-hero',
        image: settings.heroBannerUrl || GENERATED_IMAGES.heroEditorial,
        title: settings.storeName,
        category: 'Coleção Bella Menina',
        priceText: 'A partir de R$ 5,00',
      },
    ];
  }, [activeProducts, settings.heroBannerUrl, settings.storeName]);

  const safeSlideIndex = slideIndex % heroSlides.length;
  const activeSlide = heroSlides[safeSlideIndex];

  useEffect(() => {
    if (heroSlides.length <= 1 || heroPaused || prefersReducedMotion) return;
    const timer = window.setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % heroSlides.length);
    }, 4800);
    return () => window.clearInterval(timer);
  }, [heroSlides.length, heroPaused, prefersReducedMotion]);

  const brands = useMemo(() => {
    const set = new Set<string>();
    activeProducts.forEach((p) => {
      if (p.brand) set.add(p.brand);
    });
    return Array.from(set).sort();
  }, [activeProducts]);

  const bestSellers = useMemo(
    () =>
      [...activeProducts]
        .sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0))
        .slice(0, 3),
    [activeProducts]
  );

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = activeProducts.filter((p) => {
      const price = getEffectivePrice(p);

      if (activeCategory === 'Novidades' && !p.isNew) return false;
      if (activeCategory === 'A partir de R$ 5' && price > 15) return false;
      if (
        activeCategory !== 'Todos' &&
        activeCategory !== 'Novidades' &&
        activeCategory !== 'A partir de R$ 5' &&
        p.category !== activeCategory
      ) {
        return false;
      }

      if (selectedBrand !== 'all' && p.brand !== selectedBrand) return false;

      if (priceRange === 'up-to-15' && price > 15) return false;
      if (priceRange === '15-to-40' && (price <= 15 || price > 40)) return false;
      if (priceRange === 'above-40' && price <= 40) return false;

      if (q) {
        const hay = `${p.name} ${p.description} ${p.brand} ${p.category} ${(
          p.tags || []
        ).join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (sortBy === 'price-asc') {
      return [...list].sort(
        (a, b) => getEffectivePrice(a) - getEffectivePrice(b)
      );
    }
    if (sortBy === 'price-desc') {
      return [...list].sort(
        (a, b) => getEffectivePrice(b) - getEffectivePrice(a)
      );
    }
    return [...list].sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0));
  }, [
    activeProducts,
    activeCategory,
    selectedBrand,
    priceRange,
    searchQuery,
    sortBy,
  ]);

  const whatsappDirectUrl = buildWhatsAppUrl(
    settings.whatsappNumber,
    settings.whatsappWelcome
  );

  const resetFilters = () => {
    onChangeCategory('Todos');
    setSearchQuery('');
    setPriceRange('all');
    setSelectedBrand('all');
    setSortBy('featured');
  };

  const jumpToCatalogWithBrand = (brandName: string) => {
    onChangeCategory('Todos');
    setSelectedBrand(brandName);
    document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' });
  };

  const jumpToCatalogWithCategory = (category: string) => {
    setSelectedBrand('all');
    onChangeCategory(category);
    document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div id="top">
      {/* 1. Storefront Hero with Full-Bleed Registered Products Slideshow Background */}
      <section
        onMouseEnter={() => setHeroPaused(true)}
        onMouseLeave={() => setHeroPaused(false)}
        className="relative overflow-hidden border-b border-[#F1DCE4] bg-[#1A1216] min-h-[500px] lg:min-h-[560px] flex items-center"
      >
        {/* Background Cross-Fading Slideshow of Registered Products */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none select-none overflow-hidden"
        >
          <AnimatePresence initial={false} mode="sync">
            <motion.img
              key={activeSlide.id + activeSlide.image}
              src={activeSlide.image}
              alt={activeSlide.title}
              fetchPriority="high"
              decoding="async"
              referrerPolicy="no-referrer"
              initial={
                prefersReducedMotion
                  ? { opacity: 0 }
                  : { opacity: 0, scale: 1.07 }
              }
              animate={
                prefersReducedMotion
                  ? { opacity: 1 }
                  : { opacity: 1, scale: 1.0 }
              }
              exit={
                prefersReducedMotion
                  ? { opacity: 0, transition: { duration: 0.2 } }
                  : {
                      opacity: 0,
                      scale: 0.98,
                      transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] },
                    }
              }
              transition={{
                opacity: { duration: 0.85, ease: [0.16, 1, 0.3, 1] },
                scale: { duration: 5.2, ease: 'easeOut' },
              }}
              className="absolute inset-0 w-full h-full object-cover object-center"
            />
          </AnimatePresence>

          {/* Measured Contrast Scrim for Guaranteed AA/AAA Legibility */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#1A1216]/90 via-[#1A1216]/70 to-[#1A1216]/35" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1A1216]/70 via-transparent to-[#1A1216]/25" />
        </div>

        {/* Hero Foreground Content */}
        <div className="relative z-10 w-full max-w-[1280px] mx-auto px-4 sm:px-8 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
          <div className="lg:col-span-7 flex flex-col justify-center gap-6">
            <div className="text-xs font-medium text-[#F9D5E3] flex flex-wrap items-center gap-2">
              <span>@bellameninamakeup_</span>
              <span aria-hidden="true">·</span>
              <span>Goiânia – GO</span>
              <span aria-hidden="true">·</span>
              <span className="text-[#FF6B9C] font-semibold">
                Makes a partir de R$ 5,00
              </span>
            </div>

            <h1 className="font-editorial text-4xl sm:text-5xl lg:text-[54px] font-semibold text-white leading-[1.08] tracking-tight text-balance">
              {settings.slogan}
            </h1>

            <p className="text-base text-white/90 leading-relaxed max-w-xl">
              Curadoria diária de glosses com charms colecionáveis, body splash,
              batons aveludados, máscaras, bases, hidratantes, cestas
              presenteáveis e bonés com precinhos irresistíveis. Entrega rápida
              em Goiânia e envio para todo o Brasil via Correios.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <a
                href="#catalogo"
                className="inline-flex items-center justify-center px-6 py-3.5 rounded-xl text-sm font-semibold text-white bg-[#FF2D6F] hover:bg-[#E01E5D] transition-colors whitespace-nowrap"
              >
                Explorar Catálogo
              </a>
              <a
                href={whatsappDirectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-sm font-semibold text-[#1A1216] bg-white hover:bg-[#FFF5F8] transition-colors whitespace-nowrap"
              >
                <MessageCircle className="w-4 h-4 text-[#1F9D55]" />
                <span>Atendimento WhatsApp</span>
              </a>
            </div>

            <div className="pt-4 border-t border-white/15 grid grid-cols-3 gap-4 text-xs text-white">
              <div>
                <div className="font-semibold tabular-nums">
                  A partir de R$ 5,00
                </div>
                <div className="text-white/75 mt-0.5">Achadinhos diários</div>
              </div>
              <div>
                <div className="font-semibold">Goiânia & Região</div>
                <div className="text-white/75 mt-0.5">Entrega expressa</div>
              </div>
              <div>
                <div className="font-semibold">PAC & SEDEX</div>
                <div className="text-white/75 mt-0.5">Cálculo real no CEP</div>
              </div>
            </div>
          </div>

          {/* Right/Bottom Interactive Product Spotlight & Slideshow Controls */}
          <div className="lg:col-span-5 flex flex-col lg:items-end justify-end gap-3">
            <div className="w-full max-w-sm rounded-2xl bg-black/55 border border-white/15 p-4 text-white space-y-3">
              <div className="flex items-center justify-between gap-2 text-[11px] text-white/75">
                <span>Produto em destaque</span>
                <span className="tabular-nums">
                  {safeSlideIndex + 1} / {heroSlides.length}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <img
                  src={activeSlide.image}
                  alt={activeSlide.title}
                  referrerPolicy="no-referrer"
                  className="w-14 h-14 rounded-xl object-cover border border-white/20 shrink-0 bg-[#FFF5F8]"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] text-[#FF85AE] font-medium truncate">
                    {activeSlide.category}
                  </div>
                  <div className="text-sm font-semibold text-white truncate">
                    {activeSlide.title}
                  </div>
                  <div className="text-xs font-semibold text-white/90 tabular-nums mt-0.5">
                    {activeSlide.priceText}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/15">
                {activeSlide.product ? (
                  <button
                    type="button"
                    onClick={() => setSelectedProduct(activeSlide.product!)}
                    className="text-xs font-semibold text-[#FF85AE] hover:text-white inline-flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>Ver detalhes</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <a
                    href="#catalogo"
                    className="text-xs font-semibold text-[#FF85AE] hover:text-white inline-flex items-center gap-1 transition-colors"
                  >
                    <span>Ver catálogo</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                )}

                {heroSlides.length > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setSlideIndex(
                          (prev) =>
                            (prev - 1 + heroSlides.length) % heroSlides.length
                        )
                      }
                      aria-label="Foto anterior do hero"
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/25 text-white transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setSlideIndex((prev) => (prev + 1) % heroSlides.length)
                      }
                      aria-label="Próxima foto do hero"
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/25 text-white transition-colors cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Categories & Brands Discovery Strip (Each Category Displays Its Name + Real Product Photo Below) */}
      <section className="border-b border-[#F1DCE4] bg-white py-10">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <div className="text-xs font-medium text-[#FF2D6F] mb-0.5">
                Navegue por Departamento
              </div>
              <h2 className="font-editorial text-2xl font-semibold text-[#1A1216]">
                Categorias & Linhas Bella Menina
              </h2>
            </div>
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-semibold text-[#6B545E] hover:text-[#FF2D6F] inline-flex items-center gap-1 self-start sm:self-auto cursor-pointer"
            >
              <span>Ver todos os {activeProducts.length} produtos</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {sortedCategories.map((categoryItem) => {
              const category = categoryItem.name;
              const isSelected = activeCategory === category;
              const categoryProducts = activeProducts.filter(
                (p) => p.category === category
              );
              const count = categoryProducts.length;
              const matchedProductImage =
                categoryItem.imageUrl ||
                categoryProducts.find((p) => p.images?.[0])?.images?.[0] ||
                CATEGORY_IMAGES[category];
              const hasImgError = Boolean(failedCategoryImgs[category]);

              return (
                <button
                  key={categoryItem.id}
                  type="button"
                  onClick={() => jumpToCatalogWithCategory(category)}
                  className={`group p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-2.5 cursor-pointer ${
                    isSelected
                      ? 'bg-[#FF2D6F] text-white border-[#FF2D6F] shadow-sm'
                      : 'bg-[#FFF9FB] text-[#1A1216] border-[#F1DCE4] hover:border-[#FF2D6F] hover:-translate-y-0.5'
                  }`}
                >
                  {/* Category Name & Item Count Above */}
                  <div>
                    <div className="text-sm font-semibold truncate">
                      {category}
                    </div>
                    <div
                      className={`text-[11px] mt-0.5 tabular-nums ${
                        isSelected ? 'text-white/85' : 'text-[#6B545E]'
                      }`}
                    >
                      {count} {count === 1 ? 'item' : 'itens'}
                    </div>
                  </div>

                  {/* Corresponding Real Product Photo Below Category Name */}
                  <div className="aspect-[4/3] w-full rounded-lg overflow-hidden bg-white border border-black/5">
                    {!hasImgError && matchedProductImage ? (
                      <img
                        src={matchedProductImage}
                        alt={`Produtos da categoria ${category}`}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setFailedCategoryImgs((prev) => ({
                            ...prev,
                            [category]: true,
                          }))
                        }
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#FFF5F8] to-[#FCE7EF] p-2 text-center">
                        <Sparkles className="w-5 h-5 text-[#FF2D6F] mb-1" />
                        <span className="text-[11px] font-medium text-[#6B545E]">
                          {category}
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Curated Brand Strip */}
          <div className="pt-2 border-t border-[#F9EEF2] flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-medium text-[#6B545E]">
              Linhas assinadas:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {FEATURED_BRANDS.map((brand) => (
                <button
                  key={brand.name}
                  type="button"
                  onClick={() => jumpToCatalogWithBrand(brand.name)}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition-colors cursor-pointer ${
                    selectedBrand === brand.name
                      ? 'bg-[#1A1216] text-white border-[#1A1216]'
                      : 'bg-white text-[#4A3840] border-[#F1DCE4] hover:border-[#FF2D6F] hover:text-[#FF2D6F]'
                  }`}
                >
                  <span className="font-semibold">{brand.name}</span>
                  <span className="hidden md:inline text-[11px] opacity-75">
                    {' '}
                    · {brand.note}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. "Tá todo mundo comprando" Best Sellers */}
      {bestSellers.length > 0 && (
        <section
          id="em-alta"
          className="border-b border-[#F1DCE4] bg-[#FFF9FB] py-14"
        >
          <div className="max-w-[1280px] mx-auto px-4 sm:px-8 space-y-7">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div>
                <div className="text-xs font-medium text-[#FF2D6F] mb-1 inline-flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Ranking da Loja</span>
                </div>
                <h2 className="font-editorial text-3xl font-semibold text-[#1A1216]">
                  Tá todo mundo comprando
                </h2>
              </div>
              <p className="text-xs text-[#6B545E] max-w-md">
                Os queridinhos que saem todos os dias em Goiânia e nas caixinhas
                enviadas pelos Correios.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {bestSellers.map((product) => (
                <ProductCard key={`top-${product.id}`} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 4. Full Interactive Catalog */}
      <section
        id="catalogo"
        className="max-w-[1280px] mx-auto px-4 sm:px-8 py-14 space-y-8"
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="text-xs font-medium text-[#FF2D6F] mb-1">
              Destaques & Coleções
            </div>
            <h2 className="font-editorial text-3xl font-semibold text-[#1A1216]">
              Catálogo Bella Menina
            </h2>
          </div>

          {/* Search, Price, Brand & Sort Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 sm:w-56">
              <Search className="w-4 h-4 text-[#6B545E] absolute left-3 top-2.5" />
              <input
                ref={searchInputRef}
                type="search"
                aria-label="Buscar produtos no catálogo"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar gloss, splash, base..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#F1DCE4] rounded-lg focus:outline-none focus:border-[#FF2D6F]"
              />
            </div>

            <select
              aria-label="Filtrar por faixa de preço"
              value={priceRange}
              onChange={(e) => setPriceRange(e.target.value)}
              className="px-3 py-2 text-xs bg-white border border-[#F1DCE4] rounded-lg focus:outline-none focus:border-[#FF2D6F]"
            >
              <option value="all">Todos os preços</option>
              <option value="up-to-15">Até R$ 15,00</option>
              <option value="15-to-40">R$ 15 a R$ 40</option>
              <option value="above-40">Acima de R$ 40</option>
            </select>

            <select
              aria-label="Filtrar por marca"
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="px-3 py-2 text-xs bg-white border border-[#F1DCE4] rounded-lg focus:outline-none focus:border-[#FF2D6F]"
            >
              <option value="all">Todas as marcas</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            <select
              aria-label="Ordenar produtos"
              value={sortBy}
              onChange={(e) =>
                setSortBy(
                  e.target.value as 'featured' | 'price-asc' | 'price-desc'
                )
              }
              className="px-3 py-2 text-xs bg-white border border-[#F1DCE4] rounded-lg focus:outline-none focus:border-[#FF2D6F]"
            >
              <option value="featured">Mais desejados</option>
              <option value="price-asc">Menor preço</option>
              <option value="price-desc">Maior preço</option>
            </select>
          </div>
        </div>

        {/* Dynamic Store Category Tabs + Highlights */}
        <div
          role="tablist"
          aria-label="Categorias da loja"
          className="flex items-center gap-1.5 p-1.5 bg-[#FFF5F8] border border-[#F1DCE4] rounded-xl overflow-x-auto"
        >
          {categoryTabs.map((cat) => {
            const active = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onChangeCategory(cat)}
                className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-[#FF2D6F] text-white shadow-xs'
                    : 'text-[#6B545E] hover:text-[#1A1216] hover:bg-white'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Product Grid */}
        {filteredProducts.length === 0 ? (
          <div className="py-16 text-center rounded-2xl border border-[#F1DCE4] bg-[#FFF9FB] space-y-3">
            <p className="font-editorial text-xl text-[#1A1216]">
              Nenhum item encontrado com esses filtros
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#FF2D6F] hover:bg-[#E01E5D] cursor-pointer"
            >
              Limpar filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* 5. Secondary Banner + Goiânia Delivery & Customer Feedback */}
      <section
        id="entregas"
        className="border-t border-[#F1DCE4] bg-[#FFF9FB] py-14"
      >
        <div className="max-w-[1280px] mx-auto px-4 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Editorial Banner & Goiânia Location */}
          <div className="lg:col-span-6 bg-white rounded-2xl border border-[#F1DCE4] overflow-hidden flex flex-col">
            <div className="aspect-[16/9] w-full bg-transparent overflow-hidden p-6 sm:p-8 flex items-center justify-center border-b border-[#F9EEF2]">
              <img
                src={settings.logoUrl || OFFICIAL_LOGO_URL}
                alt={`${settings.storeName} – Logo Oficial`}
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain bg-transparent"
              />
            </div>
            <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between gap-5">
              <div className="space-y-3">
                <div className="text-xs font-medium text-[#FF2D6F]">
                  Entregas & Loja Física
                </div>
                <h2 className="font-editorial text-2xl font-semibold text-[#1A1216]">
                  De Goiânia para todo o Brasil
                </h2>
                <p className="text-sm text-[#4A3840] leading-relaxed">
                  Retire seu pedido no Residencial Solar Ville, receba via
                  motoboy em Goiânia e região metropolitana ou envie para
                  qualquer CEP do Brasil com cálculo automático dos Correios.
                </p>
              </div>

              <div className="pt-4 border-t border-[#F9EEF2] space-y-2 text-xs text-[#4A3840]">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-[#FF2D6F] shrink-0 mt-0.5" />
                  <span>
                    Alameda Higino Pires Martins, Residencial Solar Ville,
                    Goiânia – GO, CEP 74470-538
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Truck className="w-4 h-4 text-[#C99E52] shrink-0 mt-0.5" />
                  <span>{settings.businessHours}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Feedbacks Section */}
          <div
            id="feedback"
            className="lg:col-span-6 flex flex-col justify-between gap-4"
          >
            <div className="mb-1">
              <div className="text-xs font-medium text-[#FF2D6F] mb-1">
                Feedback Real
              </div>
              <h2 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#1A1216]">
                Quem usa, recomenda
              </h2>
            </div>

            <div className="space-y-4 flex-1 flex flex-col justify-center">
              {feedbacks
                .filter((f) => f.approved)
                .slice(0, 3)
                .map((fb) => (
                  <blockquote
                    key={fb.id}
                    className="p-5 rounded-2xl bg-white border border-[#F1DCE4] space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-0.5 text-[#C99E52]">
                        {Array.from({ length: fb.rating }).map((_, i) => (
                          <Star
                            key={i}
                            className="w-3.5 h-3.5 fill-[#C99E52] text-[#C99E52]"
                          />
                        ))}
                      </div>
                      <span className="text-xs text-[#6B545E]">
                        {fb.productName}
                      </span>
                    </div>
                    <p className="text-sm text-[#1A1216] leading-relaxed">
                      “{fb.comment}”
                    </p>
                    <footer className="text-xs text-[#6B545E]">
                      <strong className="text-[#1A1216]">
                        {fb.customerName}
                      </strong>{' '}
                      · {fb.neighborhood}
                    </footer>
                  </blockquote>
                ))}
            </div>
          </div>
        </div>
      </section>

      {/* 6. Instagram Showcase @bellameninamakeup_ */}
      <section className="border-t border-[#F1DCE4] bg-white py-14">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <div className="text-xs font-medium text-[#FF2D6F] mb-1 inline-flex items-center gap-1.5">
                <Instagram className="w-3.5 h-3.5" />
                <span>@bellameninamakeup_</span>
              </div>
              <h2 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#1A1216]">
                Nosso feed diário de achadinhos
              </h2>
            </div>

            <a
              href={settings.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#1A1216] bg-[#FFF5F8] border border-[#F1DCE4] hover:border-[#FF2D6F] hover:text-[#FF2D6F] transition-colors self-start sm:self-auto"
            >
              <Instagram className="w-4 h-4 text-[#FF2D6F]" />
              <span>Seguir @bellameninamakeup_</span>
            </a>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {INSTAGRAM_POSTS.map((post) => (
              <button
                key={post.id}
                type="button"
                onClick={() => jumpToCatalogWithCategory(post.category)}
                className="group relative aspect-square rounded-2xl overflow-hidden border border-[#F1DCE4] bg-[#FFF5F8] text-left cursor-pointer"
              >
                <img
                  src={post.image}
                  alt={post.caption}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1A1216]/75 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
                  <span className="text-[11px] font-medium text-white line-clamp-2">
                    {post.caption}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Complete Institutional Footer + Discreet Centered Admin Link */}
      <footer className="border-t border-[#F1DCE4] bg-[#FFF9FB]">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-8 py-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
          <div className="space-y-3">
            <BrandLogo size="md" />
            <p className="text-xs text-[#6B545E] leading-relaxed">
              {settings.footerText}
            </p>
            <p className="text-xs text-[#6B545E]">
              Alameda Higino Pires Martins, Residencial Solar Ville, Goiânia –
              GO, CEP 74470-538
            </p>
          </div>

          <div className="space-y-2.5">
            <div className="text-xs font-semibold text-[#1A1216]">
              Atendimento & Redes
            </div>
            <div className="flex flex-col gap-1.5 text-xs text-[#6B545E]">
              <a
                href={settings.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-[#FF2D6F]"
              >
                <Instagram className="w-3.5 h-3.5" />
                <span>Instagram @bellameninamakeup_</span>
              </a>
              <a
                href={whatsappDirectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-[#FF2D6F]"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp Oficial da Loja</span>
              </a>
              {settings.tiktokUrl && (
                <a
                  href={settings.tiktokUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#FF2D6F]"
                >
                  TikTok Bella Menina
                </a>
              )}
              {settings.facebookUrl && (
                <a
                  href={settings.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#FF2D6F]"
                >
                  Facebook Bella Menina
                </a>
              )}
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="text-xs font-semibold text-[#1A1216]">
              Envios & Pagamento
            </div>
            <p className="text-xs text-[#6B545E] leading-relaxed">
              Entregas em Goiânia e Região via motoboy, retirada no Solar Ville
              e envios nacionais via Correios PAC e SEDEX. Aceitamos Pix,
              cartões e pedido assistido via WhatsApp.
            </p>
            <p className="text-[11px] text-[#6B545E]">
              {settings.businessHours}
            </p>
          </div>
        </div>

        {/* Discreet Copyright */}
        <div className="border-t border-[#EFE5E3] bg-white pt-5 pb-16 sm:pb-6 px-4 text-center">
          <p className="text-xs text-[#735D65]">
            © {new Date().getFullYear()} {settings.storeName}. Todos os direitos
            reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
