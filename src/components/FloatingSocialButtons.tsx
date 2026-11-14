import { useStore } from '../context/StoreContext';
import { buildWhatsAppUrl } from '../utils/commerce';

interface FloatingSocialButtonsProps {
  visible: boolean;
}

export function FloatingSocialButtons({ visible }: FloatingSocialButtonsProps) {
  const { settings } = useStore();

  if (!visible) return null;

  const instagramHref =
    settings.instagramUrl?.trim() || 'https://instagram.com/bellameninamakeup_';
  const whatsappHref = buildWhatsAppUrl(
    settings.whatsappNumber,
    settings.whatsappWelcome
  );

  return (
    <aside
      aria-label="Redes sociais oficiais da loja"
      className="fixed right-3 bottom-3 sm:right-5 sm:bottom-5 z-30 flex flex-col items-end gap-2.5 pointer-events-none no-print"
    >
      {/* Official Instagram Button */}
      <a
        href={instagramHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Instagram oficial @bellameninamakeup_"
        className="group pointer-events-auto relative flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF2D6F] rounded-2xl"
      >
        <span className="hidden md:inline-block opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all duration-200 px-2.5 py-1 rounded-lg bg-[#1A1216] text-white text-[11px] font-medium whitespace-nowrap shadow-sm pointer-events-none">
          @bellameninamakeup_
        </span>
        <span
          className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-md hover:shadow-lg transition-transform duration-200 group-hover:-translate-y-0.5"
          style={{
            background:
              'radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)',
          }}
        >
          {/* Official Instagram Glyph */}
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="w-6 h-6 text-white"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
            <circle cx="12" cy="12" r="4.2" />
            <circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" stroke="none" />
          </svg>
        </span>
      </a>

      {/* Official WhatsApp Button */}
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="WhatsApp oficial Bella Menina Makeup"
        className="group pointer-events-auto relative flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] rounded-full"
      >
        <span className="hidden md:inline-block opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 translate-x-1 group-hover:translate-x-0 transition-all duration-200 px-2.5 py-1 rounded-lg bg-[#1A1216] text-white text-[11px] font-medium whitespace-nowrap shadow-sm pointer-events-none">
          WhatsApp Oficial
        </span>
        <span className="w-11 h-11 rounded-full bg-[#25D366] hover:bg-[#1EBE5D] text-white flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-200 group-hover:-translate-y-0.5">
          {/* Official WhatsApp Glyph */}
          <svg
            viewBox="0 0 32 32"
            aria-hidden="true"
            className="w-6 h-6 fill-current"
          >
            <path d="M16.01 3.2c-7.06 0-12.8 5.74-12.8 12.8 0 2.26.59 4.46 1.71 6.4L3.1 28.9l6.68-1.75a12.74 12.74 0 0 0 6.23 1.61h.01c7.05 0 12.79-5.74 12.79-12.8 0-3.42-1.33-6.64-3.75-9.05a12.73 12.73 0 0 0-9.05-3.71zm0 23.4h-.01a10.6 10.6 0 0 1-5.41-1.48l-.39-.23-3.96 1.04 1.06-3.86-.25-.4a10.58 10.58 0 0 1-1.63-5.67c0-5.85 4.76-10.61 10.61-10.61 2.83 0 5.5 1.1 7.5 3.1a10.54 10.54 0 0 1 3.1 7.51c0 5.85-4.76 10.6-10.62 10.6zm5.82-7.95c-.32-.16-1.89-.93-2.18-1.04-.29-.11-.5-.16-.72.16-.21.32-.82 1.04-1.01 1.25-.19.21-.37.24-.69.08-.32-.16-1.35-.5-2.57-1.59-.95-.85-1.59-1.9-1.78-2.22-.19-.32-.02-.49.14-.65.14-.14.32-.37.48-.56.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.72-1.73-.98-2.37-.26-.62-.52-.54-.72-.55h-.61c-.21 0-.56.08-.85.4-.29.32-1.12 1.09-1.12 2.66 0 1.57 1.14 3.09 1.3 3.3.16.21 2.25 3.44 5.45 4.82.76.33 1.36.53 1.82.67.76.24 1.46.21 2.01.13.61-.09 1.89-.77 2.16-1.52.27-.75.27-1.39.19-1.52-.08-.13-.29-.21-.61-.37z" />
          </svg>
        </span>
      </a>
    </aside>
  );
}
