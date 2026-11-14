import { useState } from 'react';
import { Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { BrandLogo } from './BrandLogo';

interface NavbarProps {
  onSelectCategoryNav: (category: string) => void;
  onFocusSearch?: () => void;
}

export function Navbar({ onSelectCategoryNav, onFocusSearch }: NavbarProps) {
  const {
    cartCount,
    setCartOpen,
    currentUser,
    setActiveView,
    openAccountOrLogin,
  } = useStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { label: 'Catálogo', href: '#catalogo', category: 'Todos' },
    { label: 'Novidades', href: '#catalogo', category: 'Novidades' },
    { label: 'Em Alta', href: '#em-alta', category: '' },
    { label: 'Cestas', href: '#catalogo', category: 'Cestas' },
    { label: 'Entregas', href: '#entregas', category: '' },
  ];

  const handleNavClick = (item: (typeof navItems)[number]) => {
    setActiveView('store');
    if (item.category) {
      onSelectCategoryNav(item.category);
    }
    setMobileOpen(false);
  };

  const accountLabel =
    currentUser?.role === 'admin'
      ? 'Painel Admin'
      : currentUser
      ? currentUser.name.split(' ')[0]
      : 'Minha Conta';

  return (
    <header className="sticky top-0 z-40 bg-white/95 border-b border-[#F1DCE4]">
      <div className="max-w-[1280px] mx-auto px-3 sm:px-8 h-16 flex items-center justify-between gap-2 md:gap-8">
        {/* Zone 1: Single-element Brand Emblem & Title */}
        <a
          href="#top"
          onClick={() => setActiveView('store')}
          className="whitespace-nowrap shrink-0 flex items-center min-w-0"
        >
          <BrandLogo size="sm" />
        </a>

        {/* Zone 2: Clean Single-line Nav Links */}
        <nav
          aria-label="Navegação principal"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-[#6B545E]"
        >
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={() => handleNavClick(item)}
              className="hover:text-[#FF2D6F] transition-colors whitespace-nowrap shrink-0 py-1 border-b border-transparent hover:border-[#FF2D6F]"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Zone 3: Search, Account & Bag */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {onFocusSearch && (
            <button
              type="button"
              onClick={() => {
                setActiveView('store');
                onFocusSearch();
              }}
              aria-label="Buscar produtos"
              className="hidden sm:inline-flex items-center justify-center p-2 rounded-lg text-[#6B545E] hover:text-[#FF2D6F] hover:bg-[#FFF5F8] transition-colors cursor-pointer"
            >
              <Search className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={openAccountOrLogin}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs font-semibold text-[#1A1216] bg-[#FFF5F8] hover:bg-[#FCE7EF] border border-[#F1DCE4] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <User className="w-3.5 h-3.5 text-[#FF2D6F] shrink-0" />
            <span className="sm:hidden max-w-[60px] truncate">
              {currentUser ? accountLabel : 'Conta'}
            </span>
            <span className="hidden sm:inline max-w-[96px] truncate">
              {accountLabel}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="inline-flex items-center gap-1 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold text-white bg-[#FF2D6F] hover:bg-[#E01E5D] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Sacola</span>
            <span className="tabular-nums">({cartCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
            className="md:hidden p-1.5 rounded-lg text-[#1A1216] hover:bg-[#FFF5F8] transition-colors"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav
          aria-label="Menu mobile"
          className="md:hidden border-t border-[#F1DCE4] bg-white px-4 py-3 flex flex-col gap-2"
        >
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={() => handleNavClick(item)}
              className="py-2 text-sm font-medium text-[#1A1216] hover:text-[#FF2D6F] transition-colors"
            >
              {item.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}
