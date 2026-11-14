import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, RotateCcw, Send, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import type { Product } from '../types/store';
import { buildWhatsAppUrl, formatBRL, getEffectivePrice } from '../utils/commerce';

const ASSISTANT_NAME = 'Camila';
const ASSISTANT_AVATAR =
  '/src/assets/images/assistant_camila_portrait_1794671722862.jpg';

interface ChatMessage {
  id: string;
  sender: 'assistant' | 'user';
  text: string;
  showSocials?: boolean;
  recommendedProducts?: Product[];
}

interface VirtualAssistantProps {
  visible: boolean;
}

const QUICK_PROMPTS = [
  'Entregas e frete',
  'Makes a partir de R$ 5',
  'Endereço e horário',
  'Redes sociais',
] as const;

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .toLowerCase()
    .trim();
}

const STOPWORDS = new Set([
  'tem',
  'com',
  'para',
  'por',
  'que',
  'qual',
  'quais',
  'quero',
  'gostaria',
  'sobre',
  'voce',
  'voces',
  'loja',
  'produto',
  'produtos',
  'uma',
  'uns',
  'umas',
]);

export function VirtualAssistant({ visible }: VirtualAssistantProps) {
  const { settings, activeProducts, coupons, setSelectedProduct } = useStore();
  const [open, setOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const instagramHref =
    settings.instagramUrl?.trim() || 'https://instagram.com/bellameninamakeup_';
  const whatsappHref = buildWhatsAppUrl(
    settings.whatsappNumber,
    settings.whatsappWelcome
  );

  const initialGreeting = useMemo<ChatMessage>(
    () => ({
      id: 'welcome',
      sender: 'assistant',
      text: `Oi! Eu sou a ${ASSISTANT_NAME}, consultora virtual da ${settings.storeName}. Posso tirar dúvidas rápidas sobre entregas em Goiânia e Correios, makes a partir de R$ 5,00, horário da loja ou te conectar direto com nossas redes sociais!`,
      showSocials: true,
    }),
    [settings.storeName]
  );

  const [messages, setMessages] = useState<ChatMessage[]>([initialGreeting]);

  useEffect(() => {
    if (!visible && open) {
      setOpen(false);
    }
  }, [visible, open]);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  const buildReply = (rawQuery: string): ChatMessage => {
    const q = normalizeText(rawQuery);
    const id = `ast-${Date.now()}`;

    // 1. Social Media / Contact / Human Atendimento
    if (
      /\b(insta|instagram|whats|whatsapp|zap|rede|redes|social|sociais|tiktok|facebook|contato|falar|atendimento|atendente|humano)\b/.test(
        q
      )
    ) {
      return {
        id,
        sender: 'assistant',
        text: `Nosso atendimento humano e todas as novidades diárias acontecem no Instagram @bellameninamakeup_ e no WhatsApp oficial! Escolha por onde prefere falar com a nossa equipe:`,
        showSocials: true,
      };
    }

    // 2. Shipping / Freight / Delivery / CEP
    if (
      /\b(frete|entrega|entregas|correios|pac|sedex|motoboy|cep|envio|enviar|retirar|retirada|prazo|goiania|regiao|brasil)\b/.test(
        q
      )
    ) {
      const expressFee = settings.shippingConfig?.goianiaExpressFee ?? 12;
      const freeMin = settings.shippingConfig?.freeShippingMinSubtotal ?? 199;
      return {
        id,
        sender: 'assistant',
        text: `Fazemos entrega expressa por motoboy em Goiânia e região (taxa base ${formatBRL(
          expressFee
        )}), retirada gratuita no Residencial Solar Ville e envio para todo o Brasil via Correios PAC e SEDEX — é só colocar seu CEP na Sacola! Pedidos a partir de ${formatBRL(
          freeMin
        )} ganham frete grátis na modalidade elegível. Se quiser combinar entrega personalizada, chama no WhatsApp:`,
        showSocials: true,
      };
    }

    // 3. Budget / R$ 5 / Coupons / Promotions
    if (
      /\b(5|cinco|barato|achadinho|achadinhos|preco|precos|valor|promo|promocao|desconto|cupom|cupons)\b/.test(
        q
      )
    ) {
      const budgetItems = [...activeProducts]
        .sort((a, b) => getEffectivePrice(a) - getEffectivePrice(b))
        .slice(0, 2);
      const activeCoupon = coupons.find((c) => c.active);
      const couponHint = activeCoupon
        ? ` Também temos o cupom ativo ${activeCoupon.code} para você usar na Sacola!`
        : '';
      return {
        id,
        sender: 'assistant',
        text: `Temos achadinhos incríveis a partir de R$ 5,00 todos os dias!${couponHint} Veja algumas opções com precinho especial ou acompanhe as reposições nos Stories do Instagram:`,
        recommendedProducts: budgetItems,
        showSocials: true,
      };
    }

    // 4. Address & Business Hours
    if (
      /\b(endereco|onde|fica|local|loja|fisica|bairro|solar ville|horario|hora|abre|fecha|funciona|sabado)\b/.test(
        q
      )
    ) {
      return {
        id,
        sender: 'assistant',
        text: `Nossa loja fica na Alameda Higino Pires Martins, Residencial Solar Ville, Goiânia – GO, CEP 74470-538. Horário: ${settings.businessHours}. Antes de vir, você pode confirmar estoque pelo WhatsApp ou ver novidades no Instagram:`,
        showSocials: true,
      };
    }

    // 5. Payment Methods
    if (
      /\b(pix|cartao|credito|debito|parcela|parcelamento|pagar|pagamento|dinheiro)\b/.test(
        q
      )
    ) {
      const pixPct = settings.paymentConfig?.pixDiscountPercent ?? 5;
      const maxInst = settings.paymentConfig?.maxInstallments ?? 6;
      return {
        id,
        sender: 'assistant',
        text: `Aceitamos Pix (com ${pixPct}% de desconto), cartão de crédito em até ${maxInst}x, débito e pagamento combinado via WhatsApp. Quer fechar seu pedido com nossa equipe?`,
        showSocials: true,
      };
    }

    // 6. Product / Category Search from Live Catalog
    const tokens = q
      .split(/\s+/)
      .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
    if (tokens.length > 0) {
      const matches = activeProducts
        .filter((p) => {
          const hay = normalizeText(
            `${p.name} ${p.category} ${p.brand} ${(p.tags || []).join(' ')}`
          );
          return tokens.some((tok) => hay.includes(tok));
        })
        .slice(0, 2);

      if (matches.length > 0) {
        return {
          id,
          sender: 'assistant',
          text: `Encontrei ${
            matches.length === 1 ? 'este item' : 'estes itens'
          } no catálogo agora! Você também pode pedir vídeo ou swatch real no nosso Instagram e WhatsApp:`,
          recommendedProducts: matches,
          showSocials: true,
        };
      }
    }

    // 7. Helpful Default Fallback Always Pointing to Social Channels
    return {
      id,
      sender: 'assistant',
      text: `Posso te ajudar com entregas e frete, achadinhos a partir de R$ 5,00, endereço em Goiânia ou formas de pagamento! Para consultoria completa de tons e novidades em tempo real, acompanhe nosso Instagram @bellameninamakeup_ ou chame no WhatsApp:`,
      showSocials: true,
    };
  };

  const handleSend = (textToSend?: string) => {
    const clean = (textToSend ?? input).trim();
    if (!clean) return;
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: clean,
    };
    const reply = buildReply(clean);
    setMessages((prev) => [...prev, userMsg, reply]);
    if (!textToSend) setInput('');
  };

  if (!visible) return null;

  return (
    <aside
      aria-label="Assistente virtual Camila"
      className="fixed left-3 bottom-3 sm:left-5 sm:bottom-5 z-30 pointer-events-none no-print"
    >
      {open ? (
        <div
          role="dialog"
          aria-label={`Conversa com ${ASSISTANT_NAME}, assistente virtual`}
          className="pointer-events-auto w-[calc(100vw-24px)] sm:w-[348px] max-h-[min(480px,74vh)] bg-white rounded-2xl border border-[#F1DCE4] shadow-xl flex flex-col overflow-hidden"
        >
          {/* Compact Assistant Header */}
          <div className="px-4 py-3 bg-[#FFF9FB] border-b border-[#F1DCE4] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-full overflow-hidden border border-[#F1DCE4] bg-[#FFF5F8] shrink-0 flex items-center justify-center">
                {!avatarError ? (
                  <img
                    src={ASSISTANT_AVATAR}
                    alt={`${ASSISTANT_NAME} – Assistente Bella Menina`}
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarError(true)}
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <span className="text-xs font-semibold text-[#FF2D6F]">CM</span>
                )}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[#1A1216] truncate">
                  {ASSISTANT_NAME}
                </div>
                <div className="text-[11px] text-[#6B545E] truncate">
                  Consultora Bella Menina Makeup
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setMessages([initialGreeting])}
                aria-label="Reiniciar conversa"
                className="p-1.5 rounded-lg text-[#6B545E] hover:text-[#FF2D6F] hover:bg-white transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Minimizar assistente Camila"
                className="p-1.5 rounded-lg text-[#6B545E] hover:text-[#1A1216] hover:bg-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-white text-xs"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-[#FF2D6F] text-white rounded-br-sm'
                      : 'bg-[#FFF9FB] text-[#1A1216] border border-[#F1DCE4] rounded-bl-sm'
                  }`}
                >
                  <p>{msg.text}</p>

                  {msg.recommendedProducts && msg.recommendedProducts.length > 0 && (
                    <div className="mt-2.5 space-y-1.5">
                      {msg.recommendedProducts.map((prod) => (
                        <button
                          key={prod.id}
                          type="button"
                          onClick={() => {
                            setOpen(false);
                            setSelectedProduct(prod);
                          }}
                          className="w-full p-2 rounded-xl bg-white border border-[#F1DCE4] hover:border-[#FF2D6F] flex items-center gap-2.5 text-left transition-colors cursor-pointer"
                        >
                          <img
                            src={prod.images[0]}
                            alt={prod.name}
                            referrerPolicy="no-referrer"
                            className="w-9 h-9 rounded-lg object-cover bg-[#FFF5F8] shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="text-[11px] font-semibold text-[#1A1216] truncate">
                              {prod.name}
                            </div>
                            <div className="text-[11px] font-semibold text-[#FF2D6F] tabular-nums">
                              {formatBRL(getEffectivePrice(prod))}
                            </div>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-[#6B545E] shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}

                  {msg.showSocials && (
                    <div className="mt-2.5 pt-2 border-t border-[#F1DCE4] flex flex-wrap gap-1.5">
                      <a
                        href={instagramHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-[#F1DCE4] hover:border-[#FF2D6F] text-[11px] font-semibold text-[#1A1216] transition-colors"
                      >
                        <span
                          className="w-3.5 h-3.5 rounded flex items-center justify-center text-white shrink-0"
                          style={{
                            background:
                              'radial-gradient(circle at 30% 107%, #fdf497 0%, #fd5949 45%, #d6249f 60%, #285AEB 90%)',
                          }}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                            className="w-2.5 h-2.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.4"
                          >
                            <rect x="3" y="3" width="18" height="18" rx="5" />
                            <circle cx="12" cy="12" r="4" />
                          </svg>
                        </span>
                        <span>Instagram</span>
                      </a>

                      <a
                        href={whatsappHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#1EBE5D] text-[11px] font-semibold text-white transition-colors"
                      >
                        <span>WhatsApp</span>
                      </a>

                      {settings.tiktokUrl && (
                        <a
                          href={settings.tiktokUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-white border border-[#F1DCE4] hover:border-[#1A1216] text-[11px] font-semibold text-[#1A1216] transition-colors"
                        >
                          TikTok
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Topic Buttons */}
          <div className="px-3 py-2 bg-[#FFF9FB] border-t border-[#F1DCE4] flex items-center gap-1.5 overflow-x-auto">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => handleSend(prompt)}
                className="px-2.5 py-1 rounded-lg bg-white border border-[#F1DCE4] hover:border-[#FF2D6F] hover:text-[#FF2D6F] text-[11px] font-medium text-[#4A3840] whitespace-nowrap shrink-0 transition-colors cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-2.5 bg-white border-t border-[#F1DCE4] flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Pergunte para a ${ASSISTANT_NAME}...`}
              aria-label={`Mensagem para ${ASSISTANT_NAME}`}
              className="flex-1 min-w-0 px-3 py-2 text-xs bg-[#FFF9FB] border border-[#F1DCE4] rounded-xl focus:outline-none focus:border-[#FF2D6F]"
            />
            <button
              type="submit"
              aria-label="Enviar pergunta"
              disabled={!input.trim()}
              className="p-2 rounded-xl bg-[#FF2D6F] hover:bg-[#E01E5D] disabled:opacity-45 text-white transition-colors shrink-0 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      ) : (
        /* Unobtrusive Bottom-Left Corner Launcher */
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Falar com ${ASSISTANT_NAME}, assistente virtual da Bella Menina Makeup`}
          className="group pointer-events-auto inline-flex items-center gap-2.5 p-1 sm:pr-3.5 sm:py-1 sm:pl-1 rounded-full bg-white/95 backdrop-blur-sm border border-[#F1DCE4] hover:border-[#FF2D6F] shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
        >
          <span className="w-10 h-10 rounded-full overflow-hidden border border-[#F1DCE4] bg-[#FFF5F8] shrink-0 flex items-center justify-center">
            {!avatarError ? (
              <img
                src={ASSISTANT_AVATAR}
                alt={ASSISTANT_NAME}
                referrerPolicy="no-referrer"
                onError={() => setAvatarError(true)}
                className="w-full h-full object-cover object-top"
              />
            ) : (
              <span className="text-xs font-semibold text-[#FF2D6F]">CM</span>
            )}
          </span>
          <span className="hidden sm:flex flex-col items-start text-left leading-tight">
            <span className="text-xs font-semibold text-[#1A1216]">
              {ASSISTANT_NAME}
            </span>
            <span className="text-[11px] text-[#6B545E]">
              Dúvidas e redes
            </span>
          </span>
        </button>
      )}
    </aside>
  );
}
