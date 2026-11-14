import { useState } from 'react';
import { Lock, Mail, UserPlus, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { BrandLogo } from './BrandLogo';
import { formatCPF, formatPhoneBR } from '../utils/commerce';

export function LoginModal() {
  const {
    loginModalOpen,
    setLoginModalOpen,
    loginHint,
    loginWithCredentials,
    registerCustomer,
    loginWithGoogle,
  } = useStore();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Registration fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regCpf, setRegCpf] = useState('');
  const [regBirthDate, setRegBirthDate] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loginModalOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await loginWithCredentials(email, password);
      if (!res.ok) {
        setError(res.error || 'Não foi possível entrar.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await registerCustomer({
        name: regName,
        email: regEmail,
        password: regPassword,
        phone: regPhone,
        cpf: regCpf,
        birthDate: regBirthDate,
      });
      if (!res.ok) {
        setError(res.error || 'Não foi possível concluir o cadastro.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await loginWithGoogle();
      if (!res.ok) {
        setError(res.error || 'Não foi possível autenticar com Google.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#1A1216]/60 flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Acesso à Conta Bella Menina Makeup"
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl border border-[#F1DCE4] shadow-2xl overflow-hidden my-auto">
        <button
          type="button"
          onClick={() => setLoginModalOpen(false)}
          aria-label="Fechar janela de login"
          className="absolute top-4 right-4 p-2 rounded-full text-[#6B545E] hover:text-[#1A1216] hover:bg-[#FFF5F8] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 sm:p-8 space-y-5">
          <div className="flex flex-col items-center text-center gap-2">
            <BrandLogo size="lg" showWordmark={false} />
            <h2 className="font-editorial text-2xl font-semibold text-[#1A1216]">
              {mode === 'login' ? 'Entrar na Bella Menina' : 'Criar Minha Conta'}
            </h2>
            <p className="text-xs text-[#6B545E] leading-relaxed max-w-xs">
              {loginHint ||
                'Acesse seus pedidos, endereços salvos e lista de espera em um único login.'}
            </p>
          </div>

          {/* Mode Tabs */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-[#FFF5F8] rounded-xl border border-[#F1DCE4]">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-[#1A1216] shadow-xs'
                  : 'text-[#6B545E] hover:text-[#1A1216]'
              }`}
            >
              Já tenho conta
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                mode === 'register'
                  ? 'bg-white text-[#1A1216] shadow-xs'
                  : 'text-[#6B545E] hover:text-[#1A1216]'
              }`}
            >
              Criar cadastro
            </button>
          </div>

          {mode === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label htmlFor="auth-email" className="block text-xs font-medium text-[#6B545E] mb-1">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#9E8892] absolute left-3 top-3" />
                  <input
                    id="auth-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seuemail@exemplo.com"
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-[#F1DCE4] rounded-xl focus:outline-none focus:border-[#FF2D6F]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="auth-password" className="block text-xs font-medium text-[#6B545E] mb-1">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#9E8892] absolute left-3 top-3" />
                  <input
                    id="auth-password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-[#F1DCE4] rounded-xl focus:outline-none focus:border-[#FF2D6F]"
                  />
                </div>
              </div>

              {error && (
                <p className="text-xs font-medium text-[#B31248] bg-[#FFF5F8] p-3 rounded-xl border border-[#F1DCE4]">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-[#FF2D6F] hover:bg-[#E01E5D] disabled:opacity-60 transition-colors cursor-pointer"
              >
                {submitting ? 'Autenticando...' : 'Entrar'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div>
                <label htmlFor="reg-name" className="block text-xs font-medium text-[#6B545E] mb-1">
                  Nome completo *
                </label>
                <input
                  id="reg-name"
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Mariana Oliveira"
                  className="w-full px-3 py-2 text-sm border border-[#F1DCE4] rounded-xl focus:outline-none focus:border-[#FF2D6F]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label htmlFor="reg-email" className="block text-xs font-medium text-[#6B545E] mb-1">
                    E-mail *
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="voce@email.com"
                    className="w-full px-3 py-2 text-sm border border-[#F1DCE4] rounded-xl focus:outline-none focus:border-[#FF2D6F]"
                  />
                </div>
                <div>
                  <label htmlFor="reg-phone" className="block text-xs font-medium text-[#6B545E] mb-1">
                    WhatsApp *
                  </label>
                  <input
                    id="reg-phone"
                    type="tel"
                    required
                    value={regPhone}
                    onChange={(e) => setRegPhone(formatPhoneBR(e.target.value))}
                    placeholder="(62) 99999-0000"
                    className="w-full px-3 py-2 text-sm border border-[#F1DCE4] rounded-xl focus:outline-none focus:border-[#FF2D6F]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label htmlFor="reg-cpf" className="block text-xs font-medium text-[#6B545E] mb-1">
                    CPF (opcional)
                  </label>
                  <input
                    id="reg-cpf"
                    type="text"
                    value={regCpf}
                    onChange={(e) => setRegCpf(formatCPF(e.target.value))}
                    placeholder="000.000.000-00"
                    className="w-full px-3 py-2 text-sm font-mono border border-[#F1DCE4] rounded-xl focus:outline-none focus:border-[#FF2D6F]"
                  />
                </div>
                <div>
                  <label htmlFor="reg-birth" className="block text-xs font-medium text-[#6B545E] mb-1">
                    Nascimento
                  </label>
                  <input
                    id="reg-birth"
                    type="date"
                    value={regBirthDate}
                    onChange={(e) => setRegBirthDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#F1DCE4] rounded-xl focus:outline-none focus:border-[#FF2D6F]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="reg-pass" className="block text-xs font-medium text-[#6B545E] mb-1">
                  Criar senha (mínimo 6 caracteres) *
                </label>
                <input
                  id="reg-pass"
                  type="password"
                  required
                  minLength={6}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-sm border border-[#F1DCE4] rounded-xl focus:outline-none focus:border-[#FF2D6F]"
                />
              </div>

              {error && (
                <p className="text-xs font-medium text-[#B31248] bg-[#FFF5F8] p-3 rounded-xl border border-[#F1DCE4]">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white bg-[#FF2D6F] hover:bg-[#E01E5D] disabled:opacity-60 transition-colors cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>{submitting ? 'Criando conta...' : 'Concluir Cadastro'}</span>
              </button>
            </form>
          )}

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-[#F1DCE4]" />
            <span className="shrink mx-3 text-[11px] text-[#9E8892]">ou</span>
            <div className="flex-grow border-t border-[#F1DCE4]" />
          </div>

          <button
            type="button"
            disabled={submitting}
            onClick={handleGoogle}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-[#1A1216] bg-white border border-[#F1DCE4] hover:border-[#FF2D6F] transition-colors cursor-pointer"
          >
            Continuar com Google
          </button>
        </div>
      </div>
    </div>
  );
}
