import { useRef, useState } from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { Navbar } from './components/Navbar';
import { StorefrontHome } from './components/StorefrontHome';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CartDrawer } from './components/CartDrawer';
import { LoginModal } from './components/LoginModal';
import { CustomerAccount } from './components/CustomerAccount';
import { AdminPanel } from './components/AdminPanel';
import { CinematicIntro } from './components/CinematicIntro';
import { FloatingSocialButtons } from './components/FloatingSocialButtons';
import { VirtualAssistant } from './components/VirtualAssistant';

function AppContent() {
  const {
    activeView,
    adminSession,
    currentUser,
    settings,
    openAdminOrLogin,
    cartOpen,
    selectedProduct,
    loginModalOpen,
  } = useStore();
  const [activeCategory, setActiveCategory] = useState<string>('Todos');
  const [introDone, setIntroDone] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const floatingVisible =
    introDone &&
    activeView !== 'admin' &&
    !cartOpen &&
    !selectedProduct &&
    !loginModalOpen;

  const handleFocusSearch = () => {
    window.setTimeout(() => {
      document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' });
      searchInputRef.current?.focus();
    }, 60);
  };

  // Admin view: exclusive full-page Admin workspace (admin never sees customer area)
  if (activeView === 'admin' && adminSession.authenticated) {
    return (
      <div className="min-h-screen bg-[#FFF9FB] text-[#1A1216] flex flex-col">
        <AdminPanel />
        <LoginModal />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#1A1216] flex flex-col">
      {!introDone && (
        <CinematicIntro
          storeName={settings.storeName}
          slogan={settings.slogan}
          onComplete={() => setIntroDone(true)}
        />
      )}

      <Navbar
        onSelectCategoryNav={setActiveCategory}
        onFocusSearch={handleFocusSearch}
      />

      <main className="flex-1">
        {activeView === 'account' && currentUser?.role === 'customer' ? (
          <CustomerAccount />
        ) : (
          <StorefrontHome
            activeCategory={activeCategory}
            onChangeCategory={setActiveCategory}
            searchInputRef={searchInputRef}
          />
        )}
      </main>

      {activeView === 'account' && currentUser?.role === 'customer' && (
        <footer className="border-t border-[#EFE5E3] bg-white py-4 px-4 text-center">
          <p className="text-xs text-[#735D65]">
            © {new Date().getFullYear()} {settings.storeName}. Todos os direitos
            reservados.
          </p>
        </footer>
      )}

      <FloatingSocialButtons visible={floatingVisible} />
      <VirtualAssistant visible={floatingVisible} />

      <ProductDetailModal />
      <CartDrawer />
      <LoginModal />
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}
