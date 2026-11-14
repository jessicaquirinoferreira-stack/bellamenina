import { useState } from 'react';
import { ImagePlus, Loader2, Save } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export function AdminSettings() {
  const { settings, saveSettings, uploadDeviceFile } = useStore();
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleFile = async (
    field: 'logoUrl' | 'heroBannerUrl' | 'secondaryBannerUrl',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingField(field);
    try {
      const res = await uploadDeviceFile(file);
      setForm((prev) => ({ ...prev, [field]: res.url }));
      setStatusMsg('Mídia enviada do dispositivo com sucesso! Clique em Salvar Configurações.');
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Erro no upload.');
    } finally {
      setUploadingField(null);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);
    try {
      await saveSettings(form);
      setStatusMsg('Configurações salvas e aplicadas no site em tempo real!');
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {statusMsg && (
        <div className="p-3 rounded-lg bg-[#FFF5F8] border border-[#F1DCE4] text-xs font-medium text-[#B31248]">
          {statusMsg}
        </div>
      )}

      {/* WhatsApp Section */}
      <div className="p-5 rounded-xl border border-[#F1DCE4] bg-white space-y-4">
        <h3 className="text-sm font-semibold text-[#1A1216]">
          Configurações de WhatsApp
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="set-wa-num" className="block text-xs text-[#6B545E] mb-1">
              Número Oficial da Loja (com DDI 55 + DDD)
            </label>
            <input
              id="set-wa-num"
              type="text"
              value={form.whatsappNumber}
              onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })}
              className="w-full px-3 py-2 text-sm font-mono border border-[#F1DCE4] rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="set-hours" className="block text-xs text-[#6B545E] mb-1">
              Horário de Funcionamento
            </label>
            <input
              id="set-hours"
              type="text"
              value={form.businessHours}
              onChange={(e) => setForm({ ...form, businessHours: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#F1DCE4] rounded-lg"
            />
          </div>
        </div>
        <div>
          <label htmlFor="set-wa-welcome" className="block text-xs text-[#6B545E] mb-1">
            Mensagem Padrão de Boas-vindas
          </label>
          <textarea
            id="set-wa-welcome"
            rows={2}
            value={form.whatsappWelcome}
            onChange={(e) => setForm({ ...form, whatsappWelcome: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-[#F1DCE4] rounded-lg"
          />
        </div>
        <div>
          <label htmlFor="set-wa-order" className="block text-xs text-[#6B545E] mb-1">
            Mensagem Automática de Pedido Recebido
          </label>
          <textarea
            id="set-wa-order"
            rows={2}
            value={form.whatsappOrderTemplate}
            onChange={(e) => setForm({ ...form, whatsappOrderTemplate: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-[#F1DCE4] rounded-lg"
          />
        </div>
      </div>

      {/* Social Links & Brand */}
      <div className="p-5 rounded-xl border border-[#F1DCE4] bg-white space-y-4">
        <h3 className="text-sm font-semibold text-[#1A1216]">
          Redes Sociais, Marca & Rodapé
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="set-name" className="block text-xs text-[#6B545E] mb-1">
              Nome da Loja
            </label>
            <input
              id="set-name"
              type="text"
              value={form.storeName}
              onChange={(e) => setForm({ ...form, storeName: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#F1DCE4] rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="set-slogan" className="block text-xs text-[#6B545E] mb-1">
              Slogan
            </label>
            <input
              id="set-slogan"
              type="text"
              value={form.slogan}
              onChange={(e) => setForm({ ...form, slogan: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#F1DCE4] rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="set-ig" className="block text-xs text-[#6B545E] mb-1">
              Instagram
            </label>
            <input
              id="set-ig"
              type="text"
              value={form.instagramUrl}
              onChange={(e) => setForm({ ...form, instagramUrl: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#F1DCE4] rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="set-tt" className="block text-xs text-[#6B545E] mb-1">
              TikTok
            </label>
            <input
              id="set-tt"
              type="text"
              value={form.tiktokUrl}
              onChange={(e) => setForm({ ...form, tiktokUrl: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#F1DCE4] rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="set-fb" className="block text-xs text-[#6B545E] mb-1">
              Facebook
            </label>
            <input
              id="set-fb"
              type="text"
              value={form.facebookUrl}
              onChange={(e) => setForm({ ...form, facebookUrl: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#F1DCE4] rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="set-color" className="block text-xs text-[#6B545E] mb-1">
              Cor Principal
            </label>
            <div className="flex items-center gap-2">
              <input
                id="set-color"
                type="color"
                value={form.primaryColor}
                onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                className="w-10 h-9 border border-[#F1DCE4] rounded cursor-pointer"
              />
              <span className="text-xs font-mono text-[#6B545E]">{form.primaryColor}</span>
            </div>
          </div>
        </div>
        <div>
          <label htmlFor="set-footer" className="block text-xs text-[#6B545E] mb-1">
            Texto do Rodapé
          </label>
          <input
            id="set-footer"
            type="text"
            value={form.footerText}
            onChange={(e) => setForm({ ...form, footerText: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-[#F1DCE4] rounded-lg"
          />
        </div>
      </div>

      {/* Banners & Logo Upload (Device -> Vercel Blob) */}
      <div className="p-5 rounded-xl border border-[#F1DCE4] bg-white space-y-4">
        <h3 className="text-sm font-semibold text-[#1A1216]">
          Banners, Logo (Upload do Dispositivo) & SEO
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { field: 'logoUrl' as const, label: 'Logo da Loja' },
            { field: 'heroBannerUrl' as const, label: 'Banner Principal' },
            { field: 'secondaryBannerUrl' as const, label: 'Banner Secundário' },
          ].map((item) => (
            <div
              key={item.field}
              className="p-3 rounded-xl border border-[#F1DCE4] bg-[#FFF9FB] space-y-2"
            >
              <div className="text-xs font-semibold text-[#1A1216]">{item.label}</div>
              {form[item.field] && (
                <img
                  src={form[item.field]}
                  alt={item.label}
                  referrerPolicy="no-referrer"
                  className="w-full h-24 object-cover rounded-lg border border-[#F1DCE4]"
                />
              )}
              <label className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold bg-white border border-[#F1DCE4] hover:border-[#FF2D6F] cursor-pointer">
                {uploadingField === item.field ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FF2D6F]" />
                ) : (
                  <ImagePlus className="w-3.5 h-3.5 text-[#FF2D6F]" />
                )}
                <span>Enviar do Dispositivo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFile(item.field, e)}
                  className="hidden"
                />
              </label>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label htmlFor="set-seo-title" className="block text-xs text-[#6B545E] mb-1">
              SEO Título
            </label>
            <input
              id="set-seo-title"
              type="text"
              value={form.seoTitle}
              onChange={(e) => setForm({ ...form, seoTitle: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#F1DCE4] rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="set-seo-desc" className="block text-xs text-[#6B545E] mb-1">
              SEO Descrição (Meta Description)
            </label>
            <input
              id="set-seo-desc"
              type="text"
              value={form.seoDescription}
              onChange={(e) => setForm({ ...form, seoDescription: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[#F1DCE4] rounded-lg"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-semibold text-white bg-[#FF2D6F] hover:bg-[#E01E5D] disabled:opacity-50 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Salvando...' : 'Salvar Todas as Configurações'}</span>
        </button>
      </div>
    </form>
  );
}
