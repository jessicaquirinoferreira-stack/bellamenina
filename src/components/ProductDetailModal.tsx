import { useEffect, useState } from 'react';
import {
  Bell,
  Check,
  MessageCircle,
  Minus,
  Play,
  Plus,
  ShoppingBag,
  X,
  ZoomIn,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import type { ProductSwatch } from '../types/store';
import {
  buildWhatsAppProductMessage,
  buildWhatsAppUrl,
  formatBRL,
  getEffectivePrice,
} from '../utils/commerce';

export function ProductDetailModal() {
  const {
    selectedProduct,
    setSelectedProduct,
    addToCart,
    settings,
    customerWaitlist,
    addToWaitlist,
  } = useStore();
  const [activeMediaIdx, setActiveMediaIdx] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });
  const [selectedSwatch, setSelectedSwatch] = useState<ProductSwatch | undefined>();
  const [quantity, setQuantity] = useState(1);
  const [addedFeedback, setAddedFeedback] = useState(false);
  const [waitlistFeedback, setWaitlistFeedback] = useState(false);

  useEffect(() => {
    if (selectedProduct) {
      setActiveMediaIdx(0);
      setShowVideo(false);
      setZoomed(false);
      setQuantity(1);
      setSelectedSwatch(selectedProduct.swatches?.[0]);
      setAddedFeedback(false);
      setWaitlistFeedback(false);
    }
  }, [selectedProduct]);

  if (!selectedProduct) return null;

  const images = selectedProduct.images?.length ? selectedProduct.images : [];
  const effectivePrice = getEffectivePrice(selectedProduct);
  const hasPromo =
    typeof selectedProduct.promoPrice === 'number' &&
    selectedProduct.promoPrice > 0 &&
    selectedProduct.promoPrice < selectedProduct.price;
  const outOfStock = selectedProduct.stock <= 0;
  const inWaitlist = customerWaitlist.some((w) => w.productId === selectedProduct.id);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!zoomed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setZoomOrigin({ x, y });
  };

  const handleBuyNow = () => {
    if (outOfStock) return;
    addToCart(selectedProduct, quantity, selectedSwatch);
    setAddedFeedback(true);
    setSelectedProduct(null);
  };

  const handleWaitlist = async () => {
    await addToWaitlist(selectedProduct);
    setWaitlistFeedback(true);
  };

  const whatsappBuyUrl = buildWhatsAppUrl(
    settings.whatsappNumber,
    buildWhatsAppProductMessage(selectedProduct, quantity, selectedSwatch?.name)
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-[#1A1216]/55 flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={selectedProduct.name}
    >
      <div className="relative w-full max-w-4xl bg-white rounded-2xl border border-[#F1DCE4] shadow-xl overflow-hidden my-auto">
        <button
          type="button"
          onClick={() => setSelectedProduct(null)}
          aria-label="Fechar detalhes do produto"
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white border border-[#F1DCE4] flex items-center justify-center text-[#1A1216] hover:text-[#FF2D6F] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Gallery Column */}
          <div className="p-6 bg-[#FFF9FB] border-b md:border-b-0 md:border-r border-[#F1DCE4] flex flex-col gap-4">
            <div
              onClick={() => !showVideo && setZoomed((z) => !z)}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setZoomed(false)}
              className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-white border border-[#F1DCE4] cursor-zoom-in"
            >
              {showVideo && selectedProduct.videoUrl ? (
                <video
                  src={selectedProduct.videoUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-cover"
                />
              ) : images[activeMediaIdx] ? (
                <img
                  src={images[activeMediaIdx]}
                  alt={`${selectedProduct.name} - foto ${activeMediaIdx + 1}`}
                  referrerPolicy="no-referrer"
                  className={`w-full h-full object-cover transition-transform duration-200 ${
                    zoomed ? 'scale-175' : 'scale-100'
                  }`}
                  style={
                    zoomed
                      ? { transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%` }
                      : undefined
                  }
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm text-[#6B545E]">
                  Sem imagem disponível
                </div>
              )}

              {!showVideo && images[activeMediaIdx] && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoomed((z) => !z);
                  }}
                  aria-label="Alternar zoom na foto"
                  className="absolute bottom-3 right-3 px-2.5 py-1.5 rounded-lg bg-white/95 border border-[#F1DCE4] text-xs font-medium text-[#1A1216] inline-flex items-center gap-1"
                >
                  <ZoomIn className="w-3.5 h-3.5 text-[#FF2D6F]" />
                  <span>{zoomed ? 'Reduzir' : 'Zoom'}</span>
                </button>
              )}
            </div>

            {/* Unlimited Thumbnails + Optional Product Video */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {images.map((imgUrl, idx) => (
                <button
                  key={`${imgUrl}-${idx}`}
                  type="button"
                  onClick={() => {
                    setShowVideo(false);
                    setActiveMediaIdx(idx);
                  }}
                  aria-label={`Selecionar foto ${idx + 1}`}
                  className={`w-16 h-14 rounded-lg overflow-hidden border-2 shrink-0 cursor-pointer ${
                    !showVideo && activeMediaIdx === idx
                      ? 'border-[#FF2D6F]'
                      : 'border-[#F1DCE4] opacity-80 hover:opacity-100'
                  }`}
                >
                  <img
                    src={imgUrl}
                    alt={`${selectedProduct.name} miniatura ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}

              {selectedProduct.videoUrl && (
                <button
                  type="button"
                  onClick={() => setShowVideo(true)}
                  aria-label="Reproduzir vídeo do produto"
                  className={`w-16 h-14 rounded-lg border-2 shrink-0 flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold cursor-pointer ${
                    showVideo
                      ? 'border-[#FF2D6F] bg-[#FFF5F8] text-[#FF2D6F]'
                      : 'border-[#F1DCE4] bg-white text-[#1A1216]'
                  }`}
                >
                  <Play className="w-4 h-4" />
                  <span>Vídeo</span>
                </button>
              )}
            </div>
          </div>

          {/* Contiguous Purchase Module */}
          <div className="p-6 sm:p-8 flex flex-col justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-xs text-[#6B545E] mb-2">
                <span>{selectedProduct.category}</span>
                <span aria-hidden="true">·</span>
                <span>{selectedProduct.brand}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">{selectedProduct.sku}</span>
              </div>

              <h2 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#1A1216] leading-tight">
                {selectedProduct.name}
              </h2>

              <div className="mt-4 flex items-baseline gap-3 tabular-nums">
                <span className="text-2xl font-bold text-[#FF2D6F]">
                  {formatBRL(effectivePrice)}
                </span>
                {hasPromo && (
                  <span className="text-sm text-[#6B545E] line-through">
                    {formatBRL(selectedProduct.price)}
                  </span>
                )}
              </div>

              <p className="mt-4 text-sm text-[#4A3840] leading-relaxed">
                {selectedProduct.description}
              </p>

              {/* Swatches Selector */}
              {selectedProduct.swatches && selectedProduct.swatches.length > 0 && (
                <div className="mt-5">
                  <div className="text-xs font-medium text-[#6B545E] mb-2">
                    Cor / Variação:{' '}
                    <span className="text-[#1A1216] font-semibold">
                      {selectedSwatch?.name || selectedProduct.swatches[0].name}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    {selectedProduct.swatches.map((swatch) => {
                      const active = selectedSwatch?.name === swatch.name;
                      return (
                        <button
                          key={swatch.name}
                          type="button"
                          onClick={() => setSelectedSwatch(swatch)}
                          aria-label={`Selecionar cor ${swatch.name}`}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                            active
                              ? 'border-[#1A1216] bg-[#FFF5F8] text-[#1A1216]'
                              : 'border-[#F1DCE4] bg-white text-[#6B545E] hover:border-[#FF2D6F]'
                          }`}
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-white ring-1 ring-[#E2C8D1]"
                            style={{ backgroundColor: swatch.hex }}
                          />
                          <span>{swatch.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Stock & Weight info */}
              <div className="mt-5 pt-4 border-t border-[#F9EEF2] text-xs text-[#6B545E] flex flex-wrap items-center gap-3 tabular-nums">
                <span>
                  Disponibilidade:{' '}
                  <strong className={outOfStock ? 'text-[#B31248]' : 'text-[#1A1216]'}>
                    {outOfStock ? 'Esgotado' : `${selectedProduct.stock} em estoque`}
                  </strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>Peso para frete: {selectedProduct.weightGrams}g</span>
              </div>
            </div>

            {/* Buy Actions: Comprar + Comprar no WhatsApp (or Lista de Espera if out of stock) */}
            <div className="space-y-2.5 pt-2">
              {outOfStock ? (
                <button
                  type="button"
                  onClick={handleWaitlist}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold text-white bg-[#1A1216] hover:bg-[#FF2D6F] transition-colors cursor-pointer"
                >
                  <Bell className="w-4 h-4" />
                  <span>
                    {inWaitlist || waitlistFeedback
                      ? 'Adicionado à Lista de Espera'
                      : 'Avise-me quando chegar (Lista de Espera)'}
                  </span>
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="inline-flex items-center border border-[#F1DCE4] rounded-xl bg-white">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      aria-label="Diminuir quantidade"
                      className="p-3 text-[#1A1216] hover:text-[#FF2D6F] cursor-pointer"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-9 text-center text-sm font-semibold tabular-nums">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setQuantity((q) => Math.min(selectedProduct.stock || 99, q + 1))
                      }
                      aria-label="Aumentar quantidade"
                      className="p-3 text-[#1A1216] hover:text-[#FF2D6F] cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleBuyNow}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold text-white bg-[#FF2D6F] hover:bg-[#E01E5D] transition-colors cursor-pointer"
                  >
                    {addedFeedback ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Adicionado à Sacola</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-4 h-4" />
                        <span>Comprar</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              <a
                href={whatsappBuyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-semibold text-[#1F9D55] bg-[#F2FBF6] border border-[#C6EED8] hover:bg-[#1F9D55] hover:text-white transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Comprar no WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
