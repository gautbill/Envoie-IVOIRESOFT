import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Smartphone, 
  MessageSquare, 
  Key, 
  Eye, 
  EyeOff, 
  Save, 
  Database,
  Image,
  RefreshCw,
  HelpCircle,
  AlertTriangle
} from 'lucide-react';
import { AppConfig } from '../types';

interface ParametresProps {
  config: AppConfig | null;
  onRefresh: () => void;
}

export default function Parametres({ config, onRefresh }: ParametresProps) {
  const [saving, setSaving] = useState(false);
  
  // Form values
  const [smslabApikey, setSmslabApikey] = useState("");
  const [smslabDevice, setSmslabDevice] = useState("");
  const [greenapiInstance, setGreenapiInstance] = useState("");
  const [greenapiToken, setGreenapiToken] = useState("");
  const [openaiApikey, setOpenaiApikey] = useState("");
  const [sheetsIdContacts, setSheetsIdContacts] = useState("");
  const [greenapiImageUrl, setGreenapiImageUrl] = useState("");
  
  const [quotaSms, setQuotaSms] = useState("200");
  const [quotaWa, setQuotaWa] = useState("100");
  const [heureDebutSms, setHeureDebutSms] = useState("09:00");
  const [heureDebutWa, setHeureDebutWa] = useState("10:00");

  // Passwords visibility
  const [showSmsKey, setShowSmsKey] = useState(false);
  const [showWaKey, setShowWaKey] = useState(false);
  const [showAiKey, setShowAiKey] = useState(false);

  // Sync form values on config load
  useEffect(() => {
    if (config) {
      setSmslabApikey(config.smslab_apikey || "");
      setSmslabDevice(config.smslab_device || "");
      setGreenapiInstance(config.greenapi_instance || "");
      setGreenapiToken(config.greenapi_token || "");
      setOpenaiApikey(config.openai_apikey || "");
      setSheetsIdContacts(config.sheets_id_contacts || "");
      setGreenapiImageUrl(config.greenapi_image_url || "");
      setQuotaSms(config.quota_sms || "200");
      setQuotaWa(config.quota_wa || "100");
      setHeureDebutSms(config.heure_debut_sms || "09:00");
      setHeureDebutWa(config.heure_debut_wa || "10:00");
    }
  }, [config]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smslab_apikey: smslabApikey,
          smslab_device: smslabDevice,
          greenapi_instance: greenapiInstance,
          greenapi_token: greenapiToken,
          openai_apikey: openaiApikey,
          sheets_id_contacts: sheetsIdContacts,
          greenapi_image_url: greenapiImageUrl,
          quota_sms: quotaSms,
          quota_wa: quotaWa,
          heure_debut_sms: heureDebutSms,
          heure_debut_wa: heureDebutWa,
        })
      });

      if (response.ok) {
        alert("Paramètres d'IvoireSoft CI sauvegardés avec succès !");
        onRefresh();
      } else {
        alert("Une erreur s'est produite lors de la sauvegarde.");
      }
    } catch (err) {
      alert("Erreur réseau");
    } finally {
      setSaving(false);
    }
  };

  const handleResetDatabase = async () => {
    if (!confirm("⚠️ ATTENTION : Cela supprimera tous vos contacts actuels et rechargera les prospects d'origine d'Abidjan. Confirmer ?")) return;
    try {
      const response = await fetch('/api/contacts/reset-database', { method: 'POST' });
      const data = await response.json();
      alert(data.message);
      onRefresh();
    } catch (err) {
      alert("Erreur de réinitialisation");
    }
  };

  if (!config) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-white">Paramètres Intégrations API</h1>
        <p className="text-gray-400 text-sm">Configurez vos clés d'API SMSLab, Green API, OpenAI et Google Sheets pour l'agence IvoireSoft CI.</p>
      </div>

      <form onSubmit={handleSaveConfig} className="space-y-6">
        
        {/* SMSLAB API (SMS CHANNEL) */}
        <div className="bg-[#1E2235] rounded-xl border border-[#2D3250] shadow-lg p-5 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Smartphone className="text-orange-500 w-5 h-5" />
            1. Passerelle SMS (SMSLab API)
          </h3>
          <p className="text-xs text-gray-400">
            SMSLab vous permet d'envoyer des SMS en Côte d'Ivoire. Remplissez votre clé API et l'ID de votre appareil connecté (Device ID).
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* API Key */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase">Clé API SMSLab</label>
              <div className="relative">
                <input
                  type={showSmsKey ? "text" : "password"}
                  value={smslabApikey}
                  onChange={(e) => setSmslabApikey(e.target.value)}
                  placeholder="Saisir la clé API"
                  className="w-full bg-[#131520] border border-[#2D3250] rounded-lg px-3 py-2 text-sm text-white pr-10 focus:outline-none focus:border-orange-500 transition-colors font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowSmsKey(!showSmsKey)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
                >
                  {showSmsKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Device ID */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase">Device ID (N° d'appareil)</label>
              <input
                type="text"
                value={smslabDevice}
                onChange={(e) => setSmslabDevice(e.target.value)}
                placeholder="Ex: 5"
                className="w-full bg-[#131520] border border-[#2D3250] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors font-mono"
              />
            </div>

          </div>
        </div>

        {/* GREEN API (WHATSAPP CHANNEL) */}
        <div className="bg-[#1E2235] rounded-xl border border-[#2D3250] shadow-lg p-5 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <MessageSquare className="text-green-500 w-5 h-5" />
            2. Passerelle WhatsApp (Green API Instance)
          </h3>
          <p className="text-xs text-gray-400">
            Green API gère les envois d'images et de relances automatisées sur WhatsApp.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Instance ID */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase">Instance ID</label>
              <input
                type="text"
                value={greenapiInstance}
                onChange={(e) => setGreenapiInstance(e.target.value)}
                placeholder="Ex: 1101857107"
                className="w-full bg-[#131520] border border-[#2D3250] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500 transition-colors font-mono"
              />
            </div>

            {/* Token */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase">Token Instance WhatsApp</label>
              <div className="relative">
                <input
                  type={showWaKey ? "text" : "password"}
                  value={greenapiToken}
                  onChange={(e) => setGreenapiToken(e.target.value)}
                  placeholder="Saisir le token"
                  className="w-full bg-[#131520] border border-[#2D3250] rounded-lg px-3 py-2 text-sm text-white pr-10 focus:outline-none focus:border-green-500 transition-colors font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowWaKey(!showWaKey)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
                >
                  {showWaKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Media Image URL */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-semibold text-gray-400 uppercase flex items-center gap-1">
                <Image className="w-3.5 h-3.5 text-green-500" /> URL de l'image de présentation jointe (Google Drive / Direct)
              </label>
              <input
                type="url"
                value={greenapiImageUrl}
                onChange={(e) => setGreenapiImageUrl(e.target.value)}
                placeholder="https://drive.usercontent.google.com/download?id=..."
                className="w-full bg-[#131520] border border-[#2D3250] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500 transition-colors font-mono text-xs"
              />
              <span className="text-[10px] text-gray-500 block">Cette plaquette marketing ou photo sera automatiquement jointe à l'envoi WhatsApp initial.</span>
            </div>

          </div>
        </div>

        {/* OPENAI API & GOOGLE SHEETS */}
        <div className="bg-[#1E2235] rounded-xl border border-[#2D3250] shadow-lg p-5 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Key className="text-violet-500 w-5 h-5" />
            3. IA & Base de données externe
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* OpenAI Key */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase">Clé d'API OpenAI GPT-4o-mini</label>
              <div className="relative">
                <input
                  type={showAiKey ? "text" : "password"}
                  value={openaiApikey}
                  onChange={(e) => setOpenaiApikey(e.target.value)}
                  placeholder="Ex: sk-proj-..."
                  className="w-full bg-[#131520] border border-[#2D3250] rounded-lg px-3 py-2 text-sm text-white pr-10 focus:outline-none focus:border-violet-500 transition-colors font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowAiKey(!showAiKey)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
                >
                  {showAiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <span className="text-[10px] text-gray-500 block">Sert à générer des relances et d'adapter le ton de prospection par secteur.</span>
            </div>

            {/* Google Sheets ID */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase flex items-center gap-1">
                <Database className="w-3.5 h-3.5 text-violet-400" /> ID du Tableur Google Sheets
              </label>
              <input
                type="text"
                value={sheetsIdContacts}
                onChange={(e) => setSheetsIdContacts(e.target.value)}
                placeholder="Ex: 1rS_XyZaBcDeFgHiJkLmNoPqRsTuVwXyZ"
                className="w-full bg-[#131520] border border-[#2D3250] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors font-mono"
              />
              <span className="text-[10px] text-gray-500 block">L'ID du document partagé (avec accès 'Tous disposant du lien') pour charger la liste de prospects.</span>
            </div>

          </div>
        </div>

        {/* QUOTAS & HOURS SETTINGS */}
        <div className="bg-[#1E2235] rounded-xl border border-[#2D3250] shadow-lg p-5 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Settings className="text-gray-400 w-5 h-5" />
            4. Limites de Quotas & Heures d'activité
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            
            {/* Quota SMS */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase">Quota SMS / Jour</label>
              <input
                type="number"
                value={quotaSms}
                onChange={(e) => setQuotaSms(e.target.value)}
                className="w-full bg-[#131520] border border-[#2D3250] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors font-mono"
              />
            </div>

            {/* Heure SMS */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase">Début Envoi SMS</label>
              <input
                type="time"
                value={heureDebutSms}
                onChange={(e) => setHeureDebutSms(e.target.value)}
                className="w-full bg-[#131520] border border-[#2D3250] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors font-mono"
              />
            </div>

            {/* Quota WA */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase">Quota WhatsApp / Jour</label>
              <input
                type="number"
                value={quotaWa}
                onChange={(e) => setQuotaWa(e.target.value)}
                className="w-full bg-[#131520] border border-[#2D3250] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors font-mono"
              />
            </div>

            {/* Heure WA */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase">Début Envoi WhatsApp</label>
              <input
                type="time"
                value={heureDebutWa}
                onChange={(e) => setHeureDebutWa(e.target.value)}
                className="w-full bg-[#131520] border border-[#2D3250] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors font-mono"
              />
            </div>

          </div>
        </div>

        {/* CONTROLS */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-[#2D3250]">
          
          <button
            type="button"
            onClick={handleResetDatabase}
            className="w-full sm:w-auto px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg border border-red-500/20 text-xs font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <AlertTriangle className="w-4 h-4" />
            Réinitialiser les prospects en base
          </button>

          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-violet-950/40 flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? "Sauvegarde..." : "Sauvegarder Paramètres"}
          </button>

        </div>

      </form>

    </div>
  );
}
