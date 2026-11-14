import { useState } from 'react';
import {
  ArrowLeft,
  BarChart3,
  Database,
  Layers,
  LogOut,
  Package,
  Settings,
  ShieldCheck,
  Store,
  TicketPercent,
  Users,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { AdminDashboard } from './admin/AdminDashboard';
import { AdminCategories } from './admin/AdminCategories';
import { AdminProducts } from './admin/AdminProducts';
import { AdminPOS } from './admin/AdminPOS';
import { AdminCoupons } from './admin/AdminCoupons';
import { AdminCustomers } from './admin/AdminCustomers';
import { AdminOperations } from './admin/AdminOperations';
import { AdminSettings } from './admin/AdminSettings';

type AdminTab =
  | 'dashboard'
  | 'categories'
  | 'products'
  | 'pos'
  | 'coupons'
  | 'customers'
  | 'operations'
  | 'settings';

export function AdminPanel() {
  const { adminOpen, adminSession, setActiveView, logout } = useStore();
  const [tab, setTab] = useState<AdminTab>('dashboard');

  if (!adminOpen || !adminSession.authenticated) return null;

  const tabs: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'categories', label: 'Categorias', icon: <Layers className="w-4 h-4" /> },
    { id: 'products', label: 'Produtos', icon: <Package className="w-4 h-4" /> },
    { id: 'pos', label: 'PDV de Balcão', icon: <Store className="w-4 h-4" /> },
    { id: 'coupons', label: 'Cupons', icon: <TicketPercent className="w-4 h-4" /> },
    { id: 'customers', label: 'Clientes', icon: <Users className="w-4 h-4" /> },
    { id: 'operations', label: 'Operações & Dados', icon: <Database className="w-4 h-4" /> },
    { id: 'settings', label: 'Configurações & WhatsApp', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div
      className="min-h-screen bg-[#FFF9FB] flex flex-col"
      aria-label="Painel Administrativo Bella Menina Makeup"
    >
      {/* Top Admin Header */}
      <div className="bg-white border-b border-[#F1DCE4] no-print">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-[#FF2D6F]" />
            <div>
              <h1 className="font-editorial text-xl sm:text-2xl font-semibold text-[#1A1216]">
                Painel Administrativo · Bella Menina Makeup
              </h1>
              <p className="text-xs text-[#6B545E]">
                Controle total em tempo real · Conectado como {adminSession.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setActiveView('store')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-[#1A1216] bg-white border border-[#F1DCE4] hover:border-[#FF2D6F] cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Ver Loja</span>
            </button>
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-[#B31248] bg-[#FFF5F8] border border-[#F1DCE4] hover:bg-[#FF2D6F] hover:text-white transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="max-w-[1360px] mx-auto px-4 sm:px-8 pb-3 flex items-center gap-2 overflow-x-auto">
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-[#FF2D6F] text-white'
                    : 'text-[#6B545E] hover:text-[#1A1216] hover:bg-[#FFF5F8]'
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Admin Workspace */}
      <div className="flex-1 max-w-[1360px] w-full mx-auto px-4 sm:px-8 py-6">
        {tab === 'dashboard' && <AdminDashboard />}
        {tab === 'categories' && <AdminCategories />}
        {tab === 'products' && <AdminProducts />}
        {tab === 'pos' && <AdminPOS />}
        {tab === 'coupons' && <AdminCoupons />}
        {tab === 'customers' && <AdminCustomers />}
        {tab === 'operations' && <AdminOperations />}
        {tab === 'settings' && <AdminSettings />}
      </div>
    </div>
  );
}
