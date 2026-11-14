import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  KeyRound,
  LogOut,
  MapPin,
  Package,
  Pencil,
  Plus,
  ShoppingBag,
  Trash2,
  Truck,
  User,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import type { CustomerAddress, OrderStatus } from '../types/store';
import {
  buildWhatsAppUrl,
  calculateProfileCompleteness,
  formatBRL,
  formatCEP,
  formatCPF,
  formatPhoneBR,
  getEffectivePrice,
  sanitizeDigits,
} from '../utils/commerce';

type AccountTab =
  | 'overview'
  | 'orders'
  | 'profile'
  | 'addresses'
  | 'waitlist'
  | 'password';

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Aguardando confirmação',
  confirmed: 'Pedido confirmado',
  shipped: 'Em transporte',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

export function CustomerAccount() {
  const {
    currentUser,
    customerProfile,
    orders,
    products,
    customerWaitlist,
    settings,
    setActiveView,
    logout,
    updateCustomerProfile,
    changeCustomerPassword,
    removeFromWaitlist,
    addToCart,
    setSelectedProduct,
  } = useStore();

  const [tab, setTab] = useState<AccountTab>('overview');

  // Profile Edit State
  const [name, setName] = useState(customerProfile?.name || currentUser?.name || '');
  const [email, setEmail] = useState(customerProfile?.email || currentUser?.email || '');
  const [cpf, setCpf] = useState(customerProfile?.cpf || '');
  const [birthDate, setBirthDate] = useState(customerProfile?.birthDate || '');
  const [phone, setPhone] = useState(customerProfile?.phone || '');
  const [secondaryPhone, setSecondaryPhone] = useState(customerProfile?.secondaryPhone || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  // Address Form State
  const [addrFormOpen, setAddrFormOpen] = useState(false);
  const [addrLabel, setAddrLabel] = useState('Casa');
  const [addrCep, setAddrCep] = useState('');
  const [addrStreet, setAddrStreet] = useState('');
  const [addrNumber, setAddrNumber] = useState('');
  const [addrComp, setAddrComp] = useState('');
  const [addrNeigh, setAddrNeigh] = useState('');
  const [addrCity, setAddrCity] = useState('');
  const [addrState, setAddrState] = useState('');
  const [addrDefault, setAddrDefault] = useState(true);

  // Password Change State
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passMsg, setPassMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const profileData = customerProfile || {
    id: currentUser?.id || '',
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: '',
    role: 'customer' as const,
    blocked: false,
    addresses: [],
    createdAt: '',
    updatedAt: '',
  };

  const completeness = useMemo(
    () => calculateProfileCompleteness(profileData),
    [profileData]
  );

  const sortedOrders = useMemo(
    () =>
      [...orders].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [orders]
  );
  const lastOrder = sortedOrders[0] || null;

  const openEditProfile = () => {
    setName(profileData.name);
    setEmail(profileData.email);
    setCpf(profileData.cpf || '');
    setBirthDate(profileData.birthDate || '');
    setPhone(profileData.phone || '');
    setSecondaryPhone(profileData.secondaryPhone || '');
    setProfileMsg(null);
    setTab('profile');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      await updateCustomerProfile({
        name,
        email,
        cpf,
        birthDate,
        phone,
        secondaryPhone,
      });
      setProfileMsg('Dados pessoais atualizados com sucesso!');
    } catch (err) {
      setProfileMsg(err instanceof Error ? err.message : 'Erro ao atualizar dados.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleCepLookup = async (rawCep: string) => {
    const formatted = formatCEP(rawCep);
    setAddrCep(formatted);
    const digits = sanitizeDigits(formatted);
    if (digits.length === 8) {
      const res = await fetch(`/api/cep/${digits}`).catch(() => null);
      if (res?.ok) {
        const data = await res.json();
        if (data.street) setAddrStreet(data.street);
        if (data.neighborhood) setAddrNeigh(data.neighborhood);
        if (data.city) setAddrCity(data.city);
        if (data.state) setAddrState(data.state);
      }
    }
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    const newAddr: CustomerAddress = {
      id: `addr-${Date.now()}`,
      label: addrLabel.trim() || 'Principal',
      recipientName: profileData.name,
      cep: formatCEP(addrCep),
      street: addrStreet.trim(),
      number: addrNumber.trim(),
      complement: addrComp.trim(),
      neighborhood: addrNeigh.trim(),
      city: addrCity.trim(),
      state: addrState.trim().toUpperCase().slice(0, 2),
      isDefault: addrDefault,
    };
    const prevList = profileData.addresses || [];
    const nextList = addrDefault
      ? [newAddr, ...prevList.map((a) => ({ ...a, isDefault: false }))]
      : [...prevList, newAddr];

    await updateCustomerProfile({ addresses: nextList });
    setAddrFormOpen(false);
    setAddrCep('');
    setAddrStreet('');
    setAddrNumber('');
    setAddrComp('');
    setAddrNeigh('');
    setAddrCity('');
    setAddrState('');
  };

  const handleDeleteAddress = async (addrId: string) => {
    const next = (profileData.addresses || []).filter((a) => a.id !== addrId);
    await updateCustomerProfile({ addresses: next });
  };

  const handleSetDefaultAddress = async (addrId: string) => {
    const next = (profileData.addresses || []).map((a) => ({
      ...a,
      isDefault: a.id === addrId,
    }));
    await updateCustomerProfile({ addresses: next });
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg(null);
    if (newPass.length < 6) {
      setPassMsg({ ok: false, text: 'A nova senha deve ter pelo menos 6 caracteres.' });
      return;
    }
    if (newPass !== confirmPass) {
      setPassMsg({ ok: false, text: 'A confirmação de senha não confere.' });
      return;
    }
    const res = await changeCustomerPassword(currentPass, newPass);
    if (res.ok) {
      setPassMsg({ ok: true, text: 'Senha atualizada com segurança!' });
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
    } else {
      setPassMsg({ ok: false, text: res.error || 'Erro ao alterar senha.' });
    }
  };

  const sidebarItems: {
    id: AccountTab | 'logout';
    label: string;
    icon: React.ReactNode;
  }[] = [
    { id: 'overview', label: 'Minha conta', icon: <User className="w-4 h-4" /> },
    { id: 'orders', label: 'Meus pedidos', icon: <Package className="w-4 h-4" /> },
    { id: 'profile', label: 'Meus dados', icon: <Pencil className="w-4 h-4" /> },
    { id: 'addresses', label: 'Meus endereços', icon: <MapPin className="w-4 h-4" /> },
    { id: 'waitlist', label: 'Lista de espera', icon: <Bell className="w-4 h-4" /> },
    { id: 'password', label: 'Alterar senha', icon: <KeyRound className="w-4 h-4" /> },
    { id: 'logout', label: 'Sair', icon: <LogOut className="w-4 h-4" /> },
  ];

  // SVG Green Completeness Ring (circumference 2*PI*34 ≈ 213.6)
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (completeness.percentage / 100) * circumference;

  return (
    <div className="max-w-[1280px] mx-auto px-4 sm:px-8 py-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => setActiveView('store')}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6B545E] hover:text-[#FF2D6F] mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar para a loja</span>
          </button>
          <h1 className="font-editorial text-3xl font-semibold text-[#1A1216]">
            Olá, {profileData.name.split(' ')[0] || 'Bella'}
          </h1>
        </div>
        <span className="text-xs text-[#6B545E] hidden sm:inline">
          Área do Cliente · {profileData.email}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Sidebar Menu (Exact Requested Structure) */}
        <aside className="lg:col-span-3 bg-white rounded-2xl border border-[#F1DCE4] p-2">
          <nav aria-label="Menu da Área do Cliente" className="flex flex-col gap-1">
            {sidebarItems.map((item) => {
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.id === 'logout') {
                      logout();
                    } else if (item.id === 'profile') {
                      openEditProfile();
                    } else {
                      setTab(item.id);
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors text-left cursor-pointer ${
                    item.id === 'logout'
                      ? 'text-[#B31248] hover:bg-[#FFF5F8]'
                      : active
                      ? 'bg-[#FF2D6F] text-white'
                      : 'text-[#4A3840] hover:bg-[#FFF5F8] hover:text-[#1A1216]'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Account Content */}
        <div className="lg:col-span-9 space-y-6">
          {tab === 'overview' && (
            <>
              {/* Last Order Card */}
              <section className="bg-white rounded-2xl border border-[#F1DCE4] p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#F9EEF2]">
                  <h2 className="font-editorial text-xl font-semibold text-[#1A1216]">
                    Último Pedido
                  </h2>
                  {sortedOrders.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setTab('orders')}
                      className="text-xs font-semibold text-[#FF2D6F] hover:underline cursor-pointer"
                    >
                      Ver todos os pedidos ({sortedOrders.length})
                    </button>
                  )}
                </div>

                {!lastOrder ? (
                  <div className="py-6 text-center space-y-2">
                    <p className="text-sm text-[#6B545E]">
                      Você ainda não realizou nenhum pedido com esta conta.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveView('store')}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#FF2D6F] hover:bg-[#E01E5D] cursor-pointer"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>Explorar Catálogo</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <div className="text-[#6B545E]">Pedido</div>
                      <div className="font-mono font-bold text-sm text-[#1A1216] mt-0.5">
                        #{lastOrder.orderNumber}
                      </div>
                      <div className="text-[#6B545E] mt-0.5">
                        {new Date(lastOrder.createdAt).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                    <div>
                      <div className="text-[#6B545E]">Status</div>
                      <div className="font-semibold text-[#1A1216] mt-0.5">
                        {STATUS_LABELS[lastOrder.status]}
                      </div>
                      {lastOrder.trackingCode && (
                        <div className="font-mono text-[#FF2D6F] mt-0.5">
                          Rastreio: {lastOrder.trackingCode}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-[#6B545E]">Entrega & Pagamento</div>
                      <div className="font-medium text-[#1A1216] mt-0.5">
                        {lastOrder.shippingMethod}
                      </div>
                      <div className="text-[#6B545E] mt-0.5">{lastOrder.paymentMethod}</div>
                    </div>
                    <div className="sm:text-right">
                      <div className="text-[#6B545E]">Total</div>
                      <div className="text-base font-bold text-[#FF2D6F] tabular-nums mt-0.5">
                        {formatBRL(lastOrder.total)}
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* Personal Data & Green Completeness Circle */}
              <section className="bg-white rounded-2xl border border-[#F1DCE4] p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-4 flex-1">
                    <div className="flex items-center justify-between gap-4 pb-3 border-b border-[#F9EEF2]">
                      <h2 className="font-editorial text-xl font-semibold text-[#1A1216]">
                        Meus Dados Pessoais
                      </h2>
                    </div>

                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <dt className="text-[#6B545E]">Nome completo</dt>
                        <dd className="font-semibold text-[#1A1216] mt-0.5">
                          {profileData.name || 'Não informado'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[#6B545E]">E-mail</dt>
                        <dd className="font-semibold text-[#1A1216] mt-0.5">
                          {profileData.email}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[#6B545E]">CPF</dt>
                        <dd className="font-mono font-semibold text-[#1A1216] mt-0.5">
                          {profileData.cpf || 'Não informado'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[#6B545E]">Data de nascimento</dt>
                        <dd className="font-semibold text-[#1A1216] mt-0.5">
                          {profileData.birthDate
                            ? new Date(`${profileData.birthDate}T12:00:00`).toLocaleDateString('pt-BR')
                            : 'Não informada'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[#6B545E]">Telefone / WhatsApp</dt>
                        <dd className="font-semibold text-[#1A1216] mt-0.5">
                          {profileData.phone || 'Não informado'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[#6B545E]">Telefone secundário</dt>
                        <dd className="font-semibold text-[#1A1216] mt-0.5">
                          {profileData.secondaryPhone || '—'}
                        </dd>
                      </div>
                    </dl>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={openEditProfile}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#FF2D6F] hover:bg-[#E01E5D] transition-colors cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Editar meus dados</span>
                      </button>
                    </div>
                  </div>

                  {/* Green Completeness Circle */}
                  <div className="p-5 rounded-2xl bg-[#FFF9FB] border border-[#F1DCE4] flex flex-col items-center justify-center text-center min-w-[200px] gap-2">
                    <div className="relative w-24 h-24 flex items-center justify-center">
                      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 84 84">
                        <circle
                          cx="42"
                          cy="42"
                          r={radius}
                          fill="none"
                          stroke="#E9F7EF"
                          strokeWidth="8"
                        />
                        <circle
                          cx="42"
                          cy="42"
                          r={radius}
                          fill="none"
                          stroke="#1F9D55"
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray={circumference}
                          strokeDashoffset={dashOffset}
                        />
                      </svg>
                      <span className="absolute text-lg font-bold text-[#1F9D55] tabular-nums">
                        {completeness.percentage}%
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-[#1A1216]">
                      Completude do cadastro
                    </div>
                    {completeness.missingFields.length === 0 ? (
                      <div className="text-[11px] text-[#1F9D55] font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Cadastro 100% completo</span>
                      </div>
                    ) : (
                      <div className="text-[11px] text-[#6B545E]">
                        Falta: {completeness.missingFields.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </>
          )}

          {tab === 'orders' && (
            <section className="bg-white rounded-2xl border border-[#F1DCE4] p-6 space-y-4">
              <h2 className="font-editorial text-xl font-semibold text-[#1A1216]">
                Meus Pedidos ({sortedOrders.length})
              </h2>
              {sortedOrders.length === 0 ? (
                <p className="text-sm text-[#6B545E] py-6">
                  Nenhum pedido registrado ainda nesta conta.
                </p>
              ) : (
                <div className="space-y-4">
                  {sortedOrders.map((order) => (
                    <div
                      key={order.id}
                      className="p-4 rounded-xl border border-[#F1DCE4] bg-[#FFF9FB] space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-mono font-bold text-sm text-[#1A1216]">
                            #{order.orderNumber}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="text-[#6B545E]">
                            {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-[#FF2D6F]">
                          {STATUS_LABELS[order.status]}
                        </span>
                      </div>

                      <div className="space-y-1 text-xs text-[#4A3840]">
                        {order.items.map((it, idx) => (
                          <div key={`${it.productId}-${idx}`} className="flex justify-between tabular-nums">
                            <span>
                              {it.quantity}x {it.name}
                              {it.swatchName ? ` (${it.swatchName})` : ''}
                            </span>
                            <span className="font-medium">
                              {formatBRL(it.unitPrice * it.quantity)}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-[#F1DCE4] flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 text-[#6B545E]">
                          <Truck className="w-3.5 h-3.5 text-[#FF2D6F]" />
                          <span>{order.shippingMethod}</span>
                          {order.trackingCode && (
                            <span className="font-mono font-semibold text-[#1A1216]">
                              · Rastreio: {order.trackingCode}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <a
                            href={buildWhatsAppUrl(
                              settings.whatsappNumber,
                              `Olá! Gostaria de acompanhar meu pedido #${order.orderNumber}.`
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#1F9D55] font-semibold hover:underline"
                          >
                            Acompanhar no WhatsApp
                          </a>
                          <span className="text-sm font-bold text-[#1A1216] tabular-nums">
                            {formatBRL(order.total)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {tab === 'profile' && (
            <section className="bg-white rounded-2xl border border-[#F1DCE4] p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="font-editorial text-xl font-semibold text-[#1A1216]">
                  Meus Dados
                </h2>
                <span className="text-xs font-semibold text-[#1F9D55] tabular-nums">
                  Completude: {completeness.percentage}%
                </span>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="acc-name" className="block text-xs font-medium text-[#6B545E] mb-1">
                      Nome completo *
                    </label>
                    <input
                      id="acc-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-[#F1DCE4] rounded-xl focus:outline-none focus:border-[#FF2D6F]"
                    />
                  </div>
                  <div>
                    <label htmlFor="acc-email" className="block text-xs font-medium text-[#6B545E] mb-1">
                      E-mail *
                    </label>
                    <input
                      id="acc-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-[#F1DCE4] rounded-xl focus:outline-none focus:border-[#FF2D6F]"
                    />
                  </div>
                  <div>
                    <label htmlFor="acc-cpf" className="block text-xs font-medium text-[#6B545E] mb-1">
                      CPF
                    </label>
                    <input
                      id="acc-cpf"
                      type="text"
                      value={cpf}
                      onChange={(e) => setCpf(formatCPF(e.target.value))}
                      placeholder="000.000.000-00"
                      className="w-full px-3 py-2 text-sm font-mono border border-[#F1DCE4] rounded-xl focus:outline-none focus:border-[#FF2D6F]"
                    />
                  </div>
                  <div>
                    <label htmlFor="acc-birth" className="block text-xs font-medium text-[#6B545E] mb-1">
                      Data de nascimento
                    </label>
                    <input
                      id="acc-birth"
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-[#F1DCE4] rounded-xl focus:outline-none focus:border-[#FF2D6F]"
                    />
                  </div>
                  <div>
                    <label htmlFor="acc-phone" className="block text-xs font-medium text-[#6B545E] mb-1">
                      Telefone / WhatsApp *
                    </label>
                    <input
                      id="acc-phone"
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(formatPhoneBR(e.target.value))}
                      className="w-full px-3 py-2 text-sm border border-[#F1DCE4] rounded-xl focus:outline-none focus:border-[#FF2D6F]"
                    />
                  </div>
                  <div>
                    <label htmlFor="acc-phone2" className="block text-xs font-medium text-[#6B545E] mb-1">
                      Telefone secundário
                    </label>
                    <input
                      id="acc-phone2"
                      type="tel"
                      value={secondaryPhone}
                      onChange={(e) => setSecondaryPhone(formatPhoneBR(e.target.value))}
                      className="w-full px-3 py-2 text-sm border border-[#F1DCE4] rounded-xl focus:outline-none focus:border-[#FF2D6F]"
                    />
                  </div>
                </div>

                {profileMsg && (
                  <p className="text-xs font-medium text-[#1F9D55] bg-[#F2FBF6] p-3 rounded-xl border border-[#C6EED8]">
                    {profileMsg}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={profileSaving}
                  className="px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#FF2D6F] hover:bg-[#E01E5D] disabled:opacity-50 cursor-pointer"
                >
                  {profileSaving ? 'Salvando...' : 'Salvar Meus Dados'}
                </button>
              </form>
            </section>
          )}

          {tab === 'addresses' && (
            <section className="bg-white rounded-2xl border border-[#F1DCE4] p-6 space-y-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-editorial text-xl font-semibold text-[#1A1216]">
                  Meus Endereços ({profileData.addresses?.length || 0})
                </h2>
                <button
                  type="button"
                  onClick={() => setAddrFormOpen((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#FF2D6F] hover:bg-[#E01E5D] cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Novo Endereço</span>
                </button>
              </div>

              {addrFormOpen && (
                <form
                  onSubmit={handleSaveAddress}
                  className="p-4 rounded-xl bg-[#FFF9FB] border border-[#F1DCE4] space-y-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-[#6B545E] mb-1">Identificação *</label>
                      <input
                        type="text"
                        required
                        value={addrLabel}
                        onChange={(e) => setAddrLabel(e.target.value)}
                        placeholder="Casa, Trabalho..."
                        className="w-full px-3 py-2 text-xs bg-white border border-[#F1DCE4] rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#6B545E] mb-1">CEP *</label>
                      <input
                        type="text"
                        required
                        maxLength={9}
                        value={addrCep}
                        onChange={(e) => handleCepLookup(e.target.value)}
                        placeholder="74470-538"
                        className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#F1DCE4] rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[#6B545E] mb-1">Número *</label>
                      <input
                        type="text"
                        required
                        value={addrNumber}
                        onChange={(e) => setAddrNumber(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-[#F1DCE4] rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      placeholder="Rua / Avenida *"
                      value={addrStreet}
                      onChange={(e) => setAddrStreet(e.target.value)}
                      className="px-3 py-2 text-xs bg-white border border-[#F1DCE4] rounded-lg"
                    />
                    <input
                      type="text"
                      placeholder="Complemento"
                      value={addrComp}
                      onChange={(e) => setAddrComp(e.target.value)}
                      className="px-3 py-2 text-xs bg-white border border-[#F1DCE4] rounded-lg"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Bairro *"
                      value={addrNeigh}
                      onChange={(e) => setAddrNeigh(e.target.value)}
                      className="px-3 py-2 text-xs bg-white border border-[#F1DCE4] rounded-lg"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        required
                        placeholder="Cidade *"
                        value={addrCity}
                        onChange={(e) => setAddrCity(e.target.value)}
                        className="col-span-2 px-3 py-2 text-xs bg-white border border-[#F1DCE4] rounded-lg"
                      />
                      <input
                        type="text"
                        required
                        maxLength={2}
                        placeholder="UF *"
                        value={addrState}
                        onChange={(e) => setAddrState(e.target.value.toUpperCase())}
                        className="px-3 py-2 text-xs bg-white border border-[#F1DCE4] rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <label className="inline-flex items-center gap-2 text-xs text-[#1A1216] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={addrDefault}
                        onChange={(e) => setAddrDefault(e.target.checked)}
                      />
                      <span>Definir como endereço padrão</span>
                    </label>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#FF2D6F] cursor-pointer"
                    >
                      Salvar Endereço
                    </button>
                  </div>
                </form>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(profileData.addresses || []).length === 0 ? (
                  <p className="text-xs text-[#6B545E] col-span-2">
                    Nenhum endereço salvo ainda. Adicione um para agilizar seu checkout!
                  </p>
                ) : (
                  profileData.addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className={`p-4 rounded-xl border space-y-2 text-xs ${
                        addr.isDefault
                          ? 'border-[#FF2D6F] bg-[#FFF9FB]'
                          : 'border-[#F1DCE4] bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#1A1216]">
                          {addr.label}
                          {addr.isDefault ? ' · Padrão' : ''}
                        </span>
                        <div className="flex items-center gap-2">
                          {!addr.isDefault && (
                            <button
                              type="button"
                              onClick={() => handleSetDefaultAddress(addr.id)}
                              className="text-[11px] font-medium text-[#FF2D6F] hover:underline cursor-pointer"
                            >
                              Tornar padrão
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteAddress(addr.id)}
                            aria-label={`Remover endereço ${addr.label}`}
                            className="text-[#9E8892] hover:text-[#B31248] cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-[#4A3840] leading-relaxed">
                        {addr.street}, nº {addr.number}
                        {addr.complement ? ` (${addr.complement})` : ''}
                        <br />
                        {addr.neighborhood} · {addr.city}/{addr.state} · CEP {addr.cep}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}

          {tab === 'waitlist' && (
            <section className="bg-white rounded-2xl border border-[#F1DCE4] p-6 space-y-4">
              <h2 className="font-editorial text-xl font-semibold text-[#1A1216]">
                Lista de Espera ({customerWaitlist.length})
              </h2>
              {customerWaitlist.length === 0 ? (
                <p className="text-sm text-[#6B545E] py-6">
                  Você não possui produtos na lista de espera. Quando algum item estiver esgotado,
                  clique em “Avise-me quando chegar”.
                </p>
              ) : (
                <div className="space-y-3">
                  {customerWaitlist.map((entry) => {
                    const liveProd = products.find((p) => p.id === entry.productId);
                    const available = Boolean(liveProd && liveProd.stock > 0);
                    return (
                      <div
                        key={entry.id}
                        className="p-4 rounded-xl border border-[#F1DCE4] bg-[#FFF9FB] flex flex-wrap items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={liveProd?.images?.[0] || entry.productImage}
                            alt={entry.productName}
                            referrerPolicy="no-referrer"
                            className="w-14 h-14 rounded-lg object-cover bg-white border border-[#F1DCE4]"
                          />
                          <div>
                            <div className="text-sm font-semibold text-[#1A1216]">
                              {liveProd?.name || entry.productName}
                            </div>
                            <div className="text-xs text-[#6B545E] tabular-nums">
                              {formatBRL(
                                liveProd ? getEffectivePrice(liveProd) : entry.productPrice
                              )}{' '}
                              ·{' '}
                              <span
                                className={
                                  available
                                    ? 'text-[#1F9D55] font-semibold'
                                    : 'text-[#B31248] font-medium'
                                }
                              >
                                {available ? 'Disponível novamente!' : 'Aguardando reposição'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {available && liveProd && (
                            <button
                              type="button"
                              onClick={() => {
                                addToCart(liveProd, 1, liveProd.swatches?.[0]);
                              }}
                              className="px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-[#FF2D6F] hover:bg-[#E01E5D] cursor-pointer"
                            >
                              Comprar Agora
                            </button>
                          )}
                          {liveProd && (
                            <button
                              type="button"
                              onClick={() => {
                                setActiveView('store');
                                setSelectedProduct(liveProd);
                              }}
                              className="px-3 py-2 rounded-lg text-xs font-medium text-[#1A1216] bg-white border border-[#F1DCE4] cursor-pointer"
                            >
                              Ver produto
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => removeFromWaitlist(entry.productId)}
                            aria-label="Remover da lista de espera"
                            className="p-2 text-[#9E8892] hover:text-[#B31248] cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {tab === 'password' && (
            <section className="bg-white rounded-2xl border border-[#F1DCE4] p-6 space-y-4">
              <h2 className="font-editorial text-xl font-semibold text-[#1A1216]">
                Alterar Senha
              </h2>
              <form onSubmit={handlePasswordChange} className="max-w-md space-y-3.5">
                <div>
                  <label htmlFor="cur-pass" className="block text-xs font-medium text-[#6B545E] mb-1">
                    Senha atual
                  </label>
                  <input
                    id="cur-pass"
                    type="password"
                    value={currentPass}
                    onChange={(e) => setCurrentPass(e.target.value)}
                    placeholder="Deixe vazio se entrou via Google"
                    className="w-full px-3 py-2 text-sm border border-[#F1DCE4] rounded-xl focus:outline-none focus:border-[#FF2D6F]"
                  />
                </div>
                <div>
                  <label htmlFor="new-pass" className="block text-xs font-medium text-[#6B545E] mb-1">
                    Nova senha *
                  </label>
                  <input
                    id="new-pass"
                    type="password"
                    required
                    minLength={6}
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#F1DCE4] rounded-xl focus:outline-none focus:border-[#FF2D6F]"
                  />
                </div>
                <div>
                  <label htmlFor="conf-pass" className="block text-xs font-medium text-[#6B545E] mb-1">
                    Confirmar nova senha *
                  </label>
                  <input
                    id="conf-pass"
                    type="password"
                    required
                    minLength={6}
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#F1DCE4] rounded-xl focus:outline-none focus:border-[#FF2D6F]"
                  />
                </div>

                {passMsg && (
                  <p
                    className={`text-xs font-medium p-3 rounded-xl border ${
                      passMsg.ok
                        ? 'text-[#1F9D55] bg-[#F2FBF6] border-[#C6EED8]'
                        : 'text-[#B31248] bg-[#FFF5F8] border-[#F1DCE4]'
                    }`}
                  >
                    {passMsg.text}
                  </p>
                )}

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#FF2D6F] hover:bg-[#E01E5D] cursor-pointer"
                >
                  Atualizar Senha
                </button>
              </form>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
