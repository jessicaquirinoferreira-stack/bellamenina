import { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { OFFICIAL_LOGO_URL } from '../data/seedCatalog';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
}

export function BrandLogo({ size = 'md', showWordmark = true }: BrandLogoProps) {
  const { settings } = useStore();
  const [imgError, setImgError] = useState(false);

  const logoSrc = settings.logoUrl || OFFICIAL_LOGO_URL;

  const badgeDimensions =
    size === 'lg'
      ? 'w-12 h-12 text-base'
      : size === 'sm'
      ? 'w-8 h-8 text-xs'
      : 'w-9 h-9 text-sm';

  const imgDimensions =
    size === 'lg'
      ? 'h-14 w-auto max-w-[140px]'
      : size === 'sm'
      ? 'h-9 sm:h-12 w-auto max-w-[40px] sm:max-w-[56px]'
      : 'h-12 w-auto max-w-[64px]';

  return (
    <span className="inline-flex items-center gap-1.5 sm:gap-2.5 shrink-0 bg-transparent">
      {!imgError && logoSrc ? (
        <img
          src={logoSrc}
          alt={settings.storeName}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className={`${imgDimensions} object-contain bg-transparent shrink-0`}
        />
      ) : (
        <span
          aria-hidden="true"
          className={`${badgeDimensions} rounded-full bg-gradient-to-br from-[#FF2D6F] to-[#D91B57] text-white font-editorial font-bold tracking-tight flex items-center justify-center ring-2 ring-[#FCE7EF] shadow-xs shrink-0`}
        >
          BM
        </span>
      )}
      {showWordmark && (
        <span className="font-editorial text-[14px] sm:text-xl font-semibold tracking-tight text-[#1A1216] whitespace-nowrap">
          {settings.storeName}
        </span>
      )}
    </span>
  );
}
