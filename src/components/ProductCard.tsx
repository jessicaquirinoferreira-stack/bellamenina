import { useState } from 'react';
import { motion } from 'motion/react';
import { Check, Plus, Sparkles } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import type { Product } from '../types/store';
import { formatBRL, getEffectivePrice } from '../utils/commerce';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart, setSelectedProduct } = useStore();
  const [imgError, setImgError] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const effectivePrice = getEffectivePrice(product);
  const hasPromo =
    typeof product.promoPrice === 'number' &&
    product.promoPrice > 0 &&
    product.promoPrice < product.price;
  const outOfStock = product.stock <= 0;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (outOfStock) return;
    addToCart(product, 1, product.swatches?.[0]);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1400);
  };

  return (
    <motion.article
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      onClick={() => setSelectedProduct(product)}
      className="group flex flex-col bg-white border border-[#EFE5E3] rounded-2xl overflow-hidden shadow-[0_8px_30px_rgba(26,21,23,0.03)] hover:shadow-[0_14px_40px_rgba(26,21,23,0.08)] transition-all cursor-pointer"
    >
      {/* Product Image Area with Portrait Aspect Ratio */}
      <div className="relative aspect-[4/5] w-full bg-[#F7F2F0] overflow-hidden">
        {!imgError && product.images?.[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-[#F7F2F0] to-[#EFE5E3]">
            <Sparkles className="w-7 h-7 text-[#D43673] mb-2" />
            <span className="text-xs font-medium text-[#735D65]">{product.name}</span>
          </div>
        )}

        {/* Floating Wishlist / New Badge */}
        {product.isNew && (
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-md text-[10px] font-semibold text-[#D43673] tracking-wide uppercase shadow-xs">
            Novidade
          </span>
        )}
      </div>

      {/* Card Body */}
      <div className="p-4 sm:p-5 flex flex-col flex-1 justify-between gap-3 bg-white">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-[#9E8892] mb-1 truncate">
            {product.category} · {product.brand}
          </div>

          <h3 className="text-sm font-semibold text-[#1A1517] leading-snug line-clamp-2 group-hover:text-[#D43673] transition-colors">
            {product.name}
          </h3>

          {/* Color Swatches Preview */}
          {product.swatches && product.swatches.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2.5">
              {product.swatches.slice(0, 4).map((sw) => (
                <span
                  key={sw.name}
                  title={sw.name}
                  className="w-3 h-3 rounded-full border border-white ring-1 ring-[#D7C2CC]"
                  style={{ backgroundColor: sw.hex }}
                />
              ))}
              {product.swatches.length > 4 && (
                <span className="text-[10px] text-[#735D65]">
                  +{product.swatches.length - 4}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Price + Action Baseline */}
        <div className="pt-3 border-t border-[#F2ECE9] flex items-center justify-between gap-2">
          <div className="flex flex-col tabular-nums">
            <span className="text-sm sm:text-base font-bold text-[#1A1517]">
              {formatBRL(effectivePrice)}
            </span>
            {hasPromo && (
              <span className="text-[11px] text-[#9E8892] line-through">
                {formatBRL(product.price)}
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={outOfStock}
            onClick={handleQuickAdd}
            aria-label={`Adicionar ${product.name} à sacola`}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              outOfStock
                ? 'bg-[#F2ECE9] text-[#9E8892] cursor-not-allowed'
                : justAdded
                ? 'bg-[#1A1517] text-white shadow-xs'
                : 'bg-[#FAF6F5] text-[#1A1517] hover:bg-[#D43673] hover:text-white border border-[#EFE5E3] hover:border-[#D43673]'
            }`}
          >
            {justAdded ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Adicionado</span>
              </>
            ) : outOfStock ? (
              <span>Esgotado</span>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Comprar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </motion.article>
  );
}
