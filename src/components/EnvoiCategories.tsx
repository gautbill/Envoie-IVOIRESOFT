import React, { useState, useMemo, useEffect } from 'react';
import { 
  Check, 
  Smartphone, 
  MessageSquare, 
  Sparkles, 
  AlertCircle, 
  Clock, 
  ChevronRight, 
  ChevronLeft, 
  Send, 
  Play,
  Calendar,
  AlertTriangle,
  RefreshCw,
  X,
  FileImage
} from 'lucide-react';
import { Contact, AppConfig } from '../types';

interface EnvoiCategoriesProps {
  contacts: Contact[];
  config: AppConfig | null;
  onRefresh: () => void;
  setActiveTab: (tab: string) => void;
}

export default function EnvoiCategories({ contacts, config, onRefresh, setActiveTab }: EnvoiCategoriesProps) {
  const [step, setStep] = useState(1);

  // --- STEP 1: TARGETING ---
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [allCatsSelected, setAllCatsSelected] = useState(false);

  // Categories list with counts
  const categoryCounts = useMemo(() => {
    const counts: { [key: string]: { total: number, sms: number, wa: number } } = {};
    contacts.forEach(c => {
      if (!counts[c.activite]) {
        counts[c.activite] = { total: 0, sms: 0, wa: 0 };
      }
      counts[c.activite].total++;
      if (c.statut_sms === 'nouveau') counts[c.activite].sms++;
      if (c.statut_wa === 'nouveau') counts[c.activite].wa++;
    });
    return counts;
  }, [contacts]);

  const [catSortBy, setCatSortBy] = useState<'alpha' | 'count-asc'>('alpha');

  const distinctCategories = useMemo(() => {
    const categories = Object.keys(categoryCounts);
    if (catSortBy === 'alpha') {
      return [...categories].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
    } else {
      return [...categories].sort((a, b) => {
        const countA = categoryCounts[a]?.total || 0;
        const countB = categoryCounts[b]?.total || 0;
        return countA - countB;
      });
    }
  }, [categoryCounts, catSortBy]);

  const handleSelectCat = (cat: string) => {
    setAllCatsSelected(false);
    if (selectedCats.includes(cat)) {
      setSelectedCats(selectedCats.filter(c => c !== cat));
    } else {
      setSelectedCats([...selectedCats, cat]);
    }
  };

  const handleSelectAllCats = () => {
    if (allCatsSelected) {
      setSelectedCats([]);
      setAllCatsSelected(false);
    } else {
      setSelectedCats([...distinctCategories]);
      setAllCatsSelected(true);
    }
  };

  // Contacts counts for selected categories
  const targetSmsCount = useMemo(() => {
    return contacts.filter(c => 
      c.statut_sms === 'nouveau' && 
      selectedCats.includes(c.activite)
    ).length;
  }, [contacts, selectedCats]);

  const targetWaCount = useMemo(() => {
    return contacts.filter(c => 
      c.statut_wa === 'nouveau' && 
      selectedCats.includes(c.activite)
    ).length;
  }, [contacts, selectedCats]);


  // --- STEP 2: CHANNEL CHOICE ---
  const [channel, setChannel] = useState<'sms' | 'whatsapp' | null>(null);


  // --- STEP 3: MESSAGE ---
  const [smsMessage, setSmsMessage] = useState("Bonjour, IvoireSoft CI vous propose d'automatiser vos ventes et booster votre relation client. Appelez-nous au +225 0769999998 !");
  const [useIaMessage, setUseIaMessage] = useState(true);
  const [manualWaMessage, setManualWaMessage] = useState("");
  const [aiPreviewMessage, setAiPreviewMessage] = useState("");
  const [generatingPreview, setGeneratingPreview] = useState(false);

  // Fetch AI message preview
  const generateAiPreview = async () => {
    if (selectedCats.length === 0) return;
    setGeneratingPreview(true);
    try {
      const response = await fetch('/api/ai/preview-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secteur: selectedCats[0], // Use first selected category for preview
          entreprise: "Entreprise Cible",
          type: "premier_contact"
        })
      });
      const data = await response.json();
      if (response.ok) {
        setAiPreviewMessage(data.text);
      } else {
        alert(`Erreur: ${data.error}`);
      }
    } catch (err) {
      alert("Erreur de génération d'aperçu par l'IA");
    } finally {
      setGeneratingPreview(false);
    }
  };

  // Trigger preview generation when WhatsApp channel is chosen and useIaMessage is checked
  useEffect(() => {
    if (step === 3 && channel === 'whatsapp' && useIaMessage && !aiPreviewMessage && selectedCats.length > 0) {
      generateAiPreview();
    }
  }, [step, channel, useIaMessage]);


  // --- STEP 4: PLANNING ---
  const [scheduleMode, setScheduleMode] = useState<'auto' | 'immediat'>('auto');
  const [startTime, setStartTime] = useState('09:00');
  const [planningDays, setPlanningDays] = useState({
    Lundi: true, Mardi: true, Mercredi: true, Jeudi: true, Vendredi: true, Samedi: true
  });

  // Set default hours based on channel selection
  useEffect(() => {
    if (channel === 'sms') {
      setStartTime(config?.heure_debut_sms || '09:00');
    } else if (channel === 'whatsapp') {
      setStartTime(config?.heure_debut_wa || '10:00');
    }
  }, [channel, config]);

  const handleToggleDay = (day: string) => {
    setPlanningDays(prev => ({
      ...prev,
      [day as keyof typeof prev]: !prev[day as keyof typeof prev]
    }));
  };


  // --- STEP 5: FINAL LAUNCH ---
  const [campaignName, setCampaignName] = useState("");
  const [launching, setLaunching] = useState(false);
  const [launchProgress, setLaunchProgress] = useState(0);
  const [launchStatusText, setLaunchStatusText] = useState("");

  const handleLaunchCampaign = async () => {
    if (!campaignName.trim()) {
      alert("Veuillez saisir un nom pour votre campagne.");
      return;
    }

    setLaunching(true);

    if (scheduleMode === 'auto') {
      // 1. CREATE PERSISTENT AUTOMATED CAMPAIGN
      try {
        const response = await fetch('/api/campagnes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nom: campaignName,
            canal: channel,
            categories: selectedCats,
            message_sms_fixe: channel === 'sms' ? smsMessage : null,
            utiliser_ia: channel === 'whatsapp' ? useIaMessage : false,
            heure_demarrage: startTime,
          })
        });

        if (response.ok) {
          const camp = await response.json();
          // Activate immediately so background cron grabs it
          await fetch(`/api/campagnes/${camp.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ statut: 'active' })
          });

          setLaunchProgress(100);
          setLaunchStatusText("Campagne automatique programmée et activée avec succès !");
          setTimeout(() => {
            onRefresh();
            setActiveTab('campagnes');
          }, 1500);
        } else {
          const err = await response.json();
          alert(`Erreur: ${err.error}`);
          setLaunching(false);
        }
      } catch (err) {
        alert("Erreur de création de la campagne");
        setLaunching(false);
      }
    } else {
      // 2. IMMEDIATE MANUAL LAUNCH (Simulate sequential campaign ticks in real time with progress)
      setLaunchProgress(10);
      setLaunchStatusText("Lancement de la campagne immédiate...");

      try {
        // Create campaign first
        const createRes = await fetch('/api/campagnes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nom: campaignName,
            canal: channel,
            categories: selectedCats,
            message_sms_fixe: channel === 'sms' ? smsMessage : null,
            utiliser_ia: channel === 'whatsapp' ? useIaMessage : false,
          })
        });

        if (!createRes.ok) {
          const err = await createRes.json();
          alert(`Erreur : ${err.error}`);
          setLaunching(false);
          return;
        }

        const camp = await createRes.json();
        // Activate
        await fetch(`/api/campagnes/${camp.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ statut: 'active' })
        });

        // Trigger manual tick run based on selected channels
        let sendCount = 0;
        const triggerUrl = channel === 'sms' ? '/api/cron/trigger-sms' : '/api/cron/trigger-wa';
        const totalToTarget = channel === 'sms' ? targetSmsCount : targetWaCount;
        const totalRuns = channel === 'sms' ? Math.ceil(totalToTarget / 20) : Math.min(10, totalToTarget); // Limit demo instant run

        setLaunchStatusText(`Envois en cours (Envoi du batch 1 de ${totalRuns})...`);
        setLaunchProgress(30);

        for (let i = 0; i < totalRuns; i++) {
          const tickRes = await fetch(triggerUrl, { method: 'POST' });
          const tickData = await tickRes.json();
          
          if (tickRes.ok && tickData.success) {
            sendCount += (channel === 'sms' ? tickData.count || 20 : 1);
          }
          
          const progressStep = Math.round(30 + ((i + 1) / totalRuns) * 60);
          setLaunchProgress(progressStep);
          setLaunchStatusText(`Envois en cours (Envoi du batch ${i+2 > totalRuns ? totalRuns : i+2} de ${totalRuns})...`);
          
          // Brief pause between loops for UI realism
          await new Promise(r => setTimeout(r, 1000));
        }

        // Close campaign
        await fetch(`/api/campagnes/${camp.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ statut: 'terminee' })
        });

        setLaunchProgress(100);
        setLaunchStatusText(`Envois immédiats terminés avec succès ! ${sendCount} messages envoyés.`);
        
        setTimeout(() => {
          onRefresh();
          setActiveTab('campagnes');
        }, 2000);

      } catch (err) {
        alert("Erreur d'envoi immédiat.");
        setLaunching(false);
      }
    }
  };


  // --- DURATION ESTIMATES ---
  const durationEstimate = useMemo(() => {
    if (channel === 'sms') {
      const batches = Math.ceil(targetSmsCount / 20);
      const minutes = batches * 2;
      return `${targetSmsCount} contacts = ${batches} batchs = ~${minutes} min d'envoi (1 batch toutes les 2 min)`;
    } else if (channel === 'whatsapp') {
      const minutes = targetWaCount * 2;
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${targetWaCount} contacts = ${hours > 0 ? `${hours}h` : ''}${mins} min d'envoi (1 contact toutes les 2 min)`;
    }
    return "";
  }, [channel, targetSmsCount, targetWaCount]);


  return (
    <div className="bg-[#1E2235] rounded-xl border border-[#2D3250] shadow-xl overflow-hidden max-w-4xl mx-auto flex flex-col md:flex-row min-h-[500px]">
      
      {/* LEFT PANEL : PROGRESS TABS */}
      <div className="bg-[#1A1D2D] p-6 md:w-64 border-r border-[#2D3250] space-y-6 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="text-violet-500 font-bold uppercase tracking-wider text-xs">Prospection IvoireSoft</div>
          <div className="space-y-3">
            {[
              "Ciblage des contacts",
              "Choix du canal",
              "Rédiger le message",
              "Planification",
              "Validation & Lancement"
            ].map((name, i) => {
              const currentIdx = i + 1;
              const isActive = step === currentIdx;
              const isPast = step > currentIdx;

              return (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-semibold ${
                    isActive ? 'bg-violet-600 text-white shadow shadow-violet-500/50' : 
                    isPast ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 
                    'bg-[#131520] text-gray-500 border border-[#2D3250]'
                  }`}>
                    {isPast ? <Check className="w-3.5 h-3.5" /> : currentIdx}
                  </div>
                  <span className={`${isActive ? 'text-white font-semibold' : isPast ? 'text-gray-300' : 'text-gray-500'}`}>
                    {name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Small targets indicator in sidebar */}
        {selectedCats.length > 0 && (
          <div className="bg-[#131520] p-3 rounded-lg border border-[#252A42] text-xs text-gray-400 space-y-1.5">
            <div className="font-semibold text-gray-300">Cibles choisies :</div>
            <div className="flex flex-wrap gap-1">
              {selectedCats.map(c => (
                <span key={c} className="bg-[#1E2235] px-1.5 py-0.5 rounded text-[10px] text-violet-400">{c}</span>
              ))}
            </div>
            <div className="pt-1.5 border-t border-[#252A42] flex justify-between font-mono">
              <span>SMS éligibles :</span>
              <span className="text-orange-400 font-bold">{targetSmsCount}</span>
            </div>
            <div className="flex justify-between font-mono">
              <span>WA éligibles :</span>
              <span className="text-green-400 font-bold">{targetWaCount}</span>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT PANEL : STEP INTERACTIVE PANELS */}
      <div className="flex-1 p-6 sm:p-8 flex flex-col justify-between">
        
        <div className="space-y-6">
          
          {/* STEP 1: TARGETING */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2D3250] pb-3">
                <div>
                  <h2 className="text-xl font-bold text-white">Étape 1 — Sélection des cibles</h2>
                  <p className="text-gray-400 text-xs">Ciblez les prospects d'Abidjan et de Côte d'Ivoire par secteur d'activité.</p>
                </div>
                <div className="flex items-center gap-1 bg-[#131520] p-1 rounded-lg border border-[#2D3250] text-[11px] shrink-0 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setCatSortBy('alpha')}
                    className={`px-2.5 py-1 rounded transition-all cursor-pointer font-medium ${catSortBy === 'alpha' ? 'bg-violet-600 text-white shadow shadow-violet-500/30 font-semibold' : 'text-gray-400 hover:text-white'}`}
                  >
                    Alphabétique (A-Z)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatSortBy('count-asc')}
                    className={`px-2.5 py-1 rounded transition-all cursor-pointer font-medium ${catSortBy === 'count-asc' ? 'bg-violet-600 text-white shadow shadow-violet-500/30 font-semibold' : 'text-gray-400 hover:text-white'}`}
                  >
                    Volume (Croissant)
                  </button>
                </div>
              </div>

              {/* Selection Table */}
              <div className="space-y-3 pt-2">
                
                {/* Select All */}
                <button
                  type="button"
                  onClick={handleSelectAllCats}
                  className={`w-full p-3 rounded-xl border text-left flex items-center justify-between text-sm transition-colors ${
                    allCatsSelected 
                      ? 'bg-violet-600/10 border-violet-500/40 text-violet-300' 
                      : 'bg-[#131520] border-[#2D3250] hover:border-[#3D446B] text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-4 shadow-inner h-4 rounded border flex items-center justify-center ${allCatsSelected ? 'bg-violet-600 border-violet-500' : 'border-gray-500'}`}>
                      {allCatsSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="font-semibold">Toutes les catégories d'activité</span>
                  </div>
                  <span className="text-xs text-gray-500 font-mono">Total : {contacts.length} contacts</span>
                </button>

                {/* Individual Categories */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
                  {distinctCategories.map((cat) => {
                    const isSelected = selectedCats.includes(cat);
                    const counts = categoryCounts[cat];
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => handleSelectCat(cat)}
                        className={`p-3 rounded-xl border text-left flex items-center justify-between text-xs transition-colors ${
                          isSelected 
                            ? 'bg-violet-600/10 border-violet-500/40 text-violet-300' 
                            : 'bg-[#131520] border-[#252A42] hover:border-[#2D3250] text-gray-400'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-violet-600 border-violet-500' : 'border-gray-600'}`}>
                            {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                          <span className="font-semibold text-gray-200">{cat}</span>
                        </div>
                        <span className="font-mono text-gray-500 text-[10px]">
                          WA: {counts.wa} | SMS: {counts.sms}
                        </span>
                      </button>
                    );
                  })}
                </div>

              </div>

              {/* Warning if no contacts in categories */}
              {selectedCats.length > 0 && targetSmsCount === 0 && targetWaCount === 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 flex items-start gap-2.5 text-yellow-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Tous les contacts des catégories sélectionnées ont déjà été contactés. Ils passeront dans le cycle de relance WhatsApp si éligibles.</span>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: CHANNEL CHOICE */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-white">Étape 2 — Choix du canal d'envoi</h2>
                <p className="text-gray-400 text-xs">Sélectionnez le canal de communication pour cette campagne.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                
                {/* SMS Card */}
                <button
                  type="button"
                  onClick={() => setChannel('sms')}
                  className={`relative rounded-xl p-5 border text-left flex flex-col justify-between min-h-[180px] transition-all ${
                    channel === 'sms' 
                      ? 'bg-orange-500/10 border-orange-500 text-white shadow-lg shadow-orange-950/20' 
                      : 'bg-[#131520] border-[#2D3250] hover:border-[#3D446B] text-gray-400'
                  }`}
                >
                  <div className="space-y-2 w-full">
                    <div className="flex justify-between items-center">
                      <div className="p-2 bg-orange-500/10 text-orange-500 rounded-lg">
                        <Smartphone className="w-5 h-5" />
                      </div>
                      {channel === 'sms' && <span className="text-[10px] font-semibold uppercase tracking-wider bg-orange-500 text-white px-2 py-0.5 rounded">Sélectionné</span>}
                    </div>
                    <h3 className="font-bold text-base text-white">Canal SMS 📱</h3>
                    <p className="text-xs text-gray-400">Idéal pour les messages courts et directs. Pas de connexion internet requise chez le client.</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#2D3250] w-full flex justify-between text-[11px] text-gray-500 font-mono">
                    <span>Batch : 20 numéros</span>
                    <span>Fréq : 2 min</span>
                  </div>
                </button>

                {/* WhatsApp Card */}
                <button
                  type="button"
                  onClick={() => setChannel('whatsapp')}
                  className={`relative rounded-xl p-5 border text-left flex flex-col justify-between min-h-[180px] transition-all ${
                    channel === 'whatsapp' 
                      ? 'bg-green-500/10 border-green-500 text-white shadow-lg shadow-green-950/20' 
                      : 'bg-[#131520] border-[#2D3250] hover:border-[#3D446B] text-gray-400'
                  }`}
                >
                  <div className="space-y-2 w-full">
                    <div className="flex justify-between items-center">
                      <div className="p-2 bg-green-500/10 text-green-500 rounded-lg">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      {channel === 'whatsapp' && <span className="text-[10px] font-semibold uppercase tracking-wider bg-green-500 text-white px-2 py-0.5 rounded">Sélectionné</span>}
                    </div>
                    <h3 className="font-bold text-base text-white">Canal WhatsApp 💬</h3>
                    <p className="text-xs text-gray-400">Idéal pour des présentations visuelles riches et des relances intelligentes basées sur l'IA.</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#2D3250] w-full flex justify-between text-[11px] text-gray-500 font-mono">
                    <span className="text-violet-400 flex items-center gap-0.5"><Sparkles className="w-3 h-3" /> GPT-4o-mini IA</span>
                    <span>Relances × 3</span>
                  </div>
                </button>

              </div>
            </div>
          )}

          {/* STEP 3: MESSAGE WRITER */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-white">Étape 3 — Contenu du Message</h2>
                <p className="text-gray-400 text-xs">Configurez le message envoyé à vos prospects.</p>
              </div>

              {/* SMS FIXED MESSAGE */}
              {channel === 'sms' && (
                <div className="space-y-4 pt-2">
                  <div className="bg-orange-500/5 border border-orange-500/15 rounded-xl p-3.5 flex items-start gap-2 text-xs text-gray-400">
                    <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-white block mb-0.5">Note importante</span>
                      Ce même message fixe sera envoyé en bloc à tous les contacts sélectionnés dans vos catégories. Aucune personnalisation par IA n'est utilisée pour le canal SMS.
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-400 uppercase">Saisissez votre message SMS</label>
                    <textarea
                      rows={5}
                      value={smsMessage}
                      onChange={(e) => setSmsMessage(e.target.value)}
                      className="w-full bg-[#131520] border border-[#2D3250] rounded-lg p-3 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors"
                    />
                    <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                      <span>Recommandation : max 160 caractères</span>
                      <span>{smsMessage.length} caractères</span>
                    </div>
                  </div>

                  {/* SMS BUBBLE PREVIEW */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-gray-500 block uppercase">Prévisualisation SMS</span>
                    <div className="bg-[#2D2D2D] p-3.5 rounded-xl border border-gray-700 max-w-sm font-mono text-xs text-gray-300 relative">
                      <div className="pb-2 border-b border-gray-600/30 mb-2 flex justify-between text-[9px] text-gray-500">
                        <span>📱 Ivoiresoft SMS Gateway</span>
                        <span>1/1 SMS</span>
                      </div>
                      <p>{smsMessage}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* WHATSAPP MESSAGE (IA OR MANUAL) */}
              {channel === 'whatsapp' && (
                <div className="space-y-4 pt-1">
                  
                  {/* IA / MANUAL TOGGLE */}
                  <div className="bg-[#131520] p-1.5 rounded-xl border border-[#252A42] flex">
                    <button
                      type="button"
                      onClick={() => setUseIaMessage(true)}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                        useIaMessage ? 'bg-violet-600/20 text-violet-400 border border-violet-500/20' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Génération par IA ✨ (Recommandé)
                    </button>
                    <button
                      type="button"
                      onClick={() => setUseIaMessage(false)}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                        !useIaMessage ? 'bg-[#1E2235] text-white border border-[#2D3250]' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Écrire manuellement
                    </button>
                  </div>

                  {/* IF IA GENERATED MESSAGE */}
                  {useIaMessage ? (
                    <div className="space-y-4">
                      <div className="bg-violet-500/5 border border-violet-500/10 rounded-xl p-3.5 text-xs text-gray-400 space-y-1">
                        <span className="font-semibold text-violet-400 block">Comment fonctionne l'IA ?</span>
                        <p>Notre IA GPT-4o-mini rédigera automatiquement un message personnalisé pour chaque contact selon son secteur d'activité ({selectedCats.join(', ')}), abordant des problèmes réels et proposant des solutions adaptées de manière 100% autonome lors de l'envoi.</p>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-400 uppercase">Aperçu pour le secteur "{selectedCats[0] || "Général"}"</span>
                        <button
                          onClick={generateAiPreview}
                          disabled={generatingPreview}
                          className="text-xs font-semibold text-violet-400 hover:text-violet-300 flex items-center gap-1 disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${generatingPreview ? 'animate-spin' : ''}`} />
                          Régénérer l'aperçu
                        </button>
                      </div>

                      {/* WA IA PREVIEW BUBBLE */}
                      <div className="bg-[#101D24] p-4 rounded-xl border border-[#252A42] max-w-md shadow-2xl relative">
                        <div className="bg-[#128C7E] text-white text-[10px] font-bold px-2 py-0.5 rounded-full absolute -top-2 left-4 shadow-sm flex items-center gap-0.5">
                          <Sparkles className="w-2.5 h-2.5" /> Prévisualisation IA
                        </div>
                        <div className="space-y-3">
                          
                          {/* Drive image preview card */}
                          <div className="bg-[#1E2D35] rounded-lg border border-[#2A3942] p-1.5 overflow-hidden flex items-center gap-3">
                            <div className="p-3.5 bg-green-500/10 text-green-400 rounded-lg shrink-0">
                              <FileImage className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-semibold text-white block truncate">ivoiresoft_digital.jpg</span>
                              <span className="text-[10px] text-gray-400 block truncate">Image de campagne IvoireSoft</span>
                            </div>
                          </div>

                          {/* Message Text */}
                          {generatingPreview ? (
                            <div className="py-8 text-center text-xs text-gray-500 flex flex-col items-center gap-2">
                              <RefreshCw className="w-5 h-5 animate-spin text-violet-500" />
                              L'IA d'IvoireSoft CI rédige votre message...
                            </div>
                          ) : (
                            <p className="text-xs text-gray-300 whitespace-pre-line leading-relaxed font-sans select-text">
                              {aiPreviewMessage || "Génération en cours..."}
                            </p>
                          )}

                        </div>
                      </div>

                    </div>
                  ) : (
                    // MANUAL MESSAGE WRITER
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-400 uppercase">Saisissez votre message WhatsApp</label>
                        <textarea
                          rows={6}
                          value={manualWaMessage}
                          onChange={(e) => setManualWaMessage(e.target.value)}
                          placeholder="Bonjour ! Nous serions ravis de collaborer avec vous..."
                          className="w-full bg-[#131520] border border-[#2D3250] rounded-lg p-3 text-sm text-white focus:outline-none focus:border-green-500 transition-colors"
                        />
                        <div className="text-right text-[10px] text-gray-500">
                          {manualWaMessage.length} / 4096 caractères
                        </div>
                      </div>

                      {/* MANUAL BUBBLE PREVIEW */}
                      <div className="space-y-1.5">
                        <span className="text-xs font-semibold text-gray-500 block uppercase">Prévisualisation WhatsApp Manuel</span>
                        <div className="bg-[#101D24] p-4 rounded-xl border border-green-500/20 max-w-md relative">
                          <p className="text-xs text-gray-300 whitespace-pre-line leading-relaxed">
                            {manualWaMessage || "Saisissez votre texte ci-dessus pour prévisualiser..."}
                          </p>
                        </div>
                      </div>

                    </div>
                  )}

                </div>
              )}

            </div>
          )}

          {/* STEP 4: PLANNING */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-white">Étape 4 — Mode de Planification</h2>
                <p className="text-gray-400 text-xs">Déterminez comment et quand lancer les envois.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                
                {/* Mode Auto Card */}
                <button
                  type="button"
                  onClick={() => setScheduleMode('auto')}
                  className={`rounded-xl p-5 border text-left flex flex-col justify-between min-h-[160px] transition-all ${
                    scheduleMode === 'auto'
                      ? 'bg-violet-600/10 border-violet-500 text-white'
                      : 'bg-[#131520] border-[#2D3250] hover:border-[#3D446B] text-gray-400'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="p-2 bg-violet-500/10 text-violet-400 rounded-lg w-fit">
                      <Clock className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-base text-white">Automatique Programmé (Recommandé)</h3>
                    <p className="text-xs text-gray-400">Le système envoie automatiquement à intervalles réguliers à partir de l'heure fixée.</p>
                  </div>
                </button>

                {/* Mode Immediat Card */}
                <button
                  type="button"
                  onClick={() => setScheduleMode('immediat')}
                  className={`rounded-xl p-5 border text-left flex flex-col justify-between min-h-[160px] transition-all ${
                    scheduleMode === 'immediat'
                      ? 'bg-violet-600/10 border-violet-500 text-white'
                      : 'bg-[#131520] border-[#2D3250] hover:border-[#3D446B] text-gray-400'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="p-2 bg-violet-500/10 text-violet-400 rounded-lg w-fit">
                      <Play className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-base text-white">Lancement Immédiat</h3>
                    <p className="text-xs text-gray-400">Lancez tous les envois consécutivement dès la validation de la campagne.</p>
                  </div>
                </button>

              </div>

              {/* Mode Auto Settings */}
              {scheduleMode === 'auto' && (
                <div className="bg-[#131520] rounded-xl p-4 border border-[#252A42] space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    {/* Start Time */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-400 uppercase flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-violet-400" /> Heure de Démarrage Quotidien (Abidjan UTC)
                      </label>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="bg-[#1E2235] border border-[#2D3250] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-violet-500 w-full font-mono"
                      />
                    </div>

                    {/* Frequency info */}
                    <div className="space-y-1 text-xs text-gray-400 flex flex-col justify-center">
                      <span className="font-semibold text-white">Fréquence d'envoi fixe :</span>
                      <span>{channel === 'sms' ? "1 batch (20 numéros) toutes les 2 minutes" : "1 message WhatsApp toutes les 2 minutes"}</span>
                    </div>

                  </div>

                  {/* Planification Days */}
                  <div className="space-y-2 pt-2 border-t border-[#252A42]">
                    <span className="text-xs font-semibold text-gray-400 uppercase flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-violet-400" /> Jours d'envoi autorisés
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {Object.keys(planningDays).map((day) => {
                        const active = planningDays[day as keyof typeof planningDays];
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => handleToggleDay(day)}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                              active 
                                ? 'bg-violet-600/10 border-violet-500/40 text-violet-400' 
                                : 'bg-[#1E2235] border-[#2D3250] text-gray-500'
                            }`}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Mode Immediat settings */}
              {scheduleMode === 'immediat' && (
                <div className="bg-yellow-500/5 border border-yellow-500/15 rounded-xl p-4 flex items-start gap-3 text-xs text-gray-400">
                  <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-semibold text-yellow-500 block">Attention aux volumes</span>
                    <p>L'envoi manuel immédiat déclenchera des requêtes API consécutives pour tous les contacts éligibles de vos catégories ({channel === 'sms' ? targetSmsCount : targetWaCount} contacts).</p>
                    <p className="text-[11px] text-gray-500">Pour de gros volumes de contacts, nous recommandons fortement le mode Automatique Programmé afin de préserver la réputation de votre numéro WhatsApp auprès de Meta.</p>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* STEP 5: RECAPITULATIF & LAUNCH */}
          {step === 5 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-white">Étape 5 — Récapitulatif & Lancement</h2>
                <p className="text-gray-400 text-xs">Vérifiez les détails de la campagne avant d'ordonner le lancement.</p>
              </div>

              {/* Campaign name field */}
              <div className="space-y-1.5 bg-[#131520] p-4 rounded-xl border border-[#252A42]">
                <label className="text-xs font-semibold text-gray-400 uppercase block">Donnez un Nom à votre Campagne</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Campagne Restaurants Abidjan - Juin"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="w-full bg-[#1E2235] border border-[#2D3250] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 font-sans"
                />
              </div>

              {/* Details table */}
              <div className="bg-[#131520] rounded-xl p-4 border border-[#252A42] space-y-2.5 text-xs">
                
                <div className="flex justify-between border-b border-[#252A42] pb-2">
                  <span className="text-gray-400 font-medium">Canal choisi :</span>
                  <span className="font-bold text-white uppercase flex items-center gap-1">
                    {channel === 'sms' ? (
                      <><Smartphone className="w-3.5 h-3.5 text-orange-500" /> SMS (SMSLab)</>
                    ) : (
                      <><MessageSquare className="w-3.5 h-3.5 text-green-500" /> WhatsApp (Green API)</>
                    )}
                  </span>
                </div>

                <div className="flex justify-between border-b border-[#252A42] pb-2">
                  <span className="text-gray-400 font-medium">Secteurs ciblés :</span>
                  <span className="font-bold text-violet-400 truncate max-w-[200px]">{selectedCats.join(', ')}</span>
                </div>

                <div className="flex justify-between border-b border-[#252A42] pb-2">
                  <span className="text-gray-400 font-medium">Contacts éligibles :</span>
                  <span className="font-bold text-white font-mono">
                    {channel === 'sms' ? targetSmsCount : targetWaCount} prospects
                  </span>
                </div>

                <div className="flex justify-between border-b border-[#252A42] pb-2">
                  <span className="text-gray-400 font-medium">Mode d'exécution :</span>
                  <span className="font-bold text-white uppercase">
                    {scheduleMode === 'auto' ? `Automatique quotidien (${startTime})` : "Immédiat (Lancement direct)"}
                  </span>
                </div>

                <div className="flex justify-between pt-1">
                  <span className="text-gray-400 font-medium">Estimation de durée :</span>
                  <span className="font-bold text-violet-400 font-mono">
                    {durationEstimate}
                  </span>
                </div>

              </div>

              {/* Elegant Message Content Preview */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-gray-500 block uppercase">Aperçu du message de départ</span>
                <div className={`p-4 rounded-xl border max-w-md ${channel === 'sms' ? 'bg-[#2D2D2D] border-gray-700 font-mono text-xs' : 'bg-[#101D24] border-[#252A42] text-xs'}`}>
                  {channel === 'sms' ? (
                    <p className="text-gray-300">{smsMessage}</p>
                  ) : (
                    <p className="text-gray-300 whitespace-pre-line leading-relaxed">
                      {useIaMessage ? (aiPreviewMessage || "Génération par l'IA lors de l'envoi...") : manualWaMessage}
                    </p>
                  )}
                </div>
              </div>

              {/* Progress bar for immediate sending */}
              {launching && (
                <div className="bg-[#131520] p-4 rounded-xl border border-[#252A42] space-y-2">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>{launchStatusText}</span>
                    <span className="font-mono">{launchProgress}%</span>
                  </div>
                  <div className="w-full bg-[#1E2235] h-2.5 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-violet-600 to-indigo-600 h-full transition-all duration-300" style={{ width: `${launchProgress}%` }} />
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

        {/* BOTTOM NAVIGATION BUTTONS */}
        <div className="flex items-center justify-between border-t border-[#2D3250] pt-5 mt-6">
          
          {step > 1 ? (
            <button
              type="button"
              disabled={launching}
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 bg-[#1E2235] hover:bg-[#252A42] text-gray-300 hover:text-white rounded-lg border border-[#2D3250] transition-colors text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
              Précédent
            </button>
          ) : (
            <div /> // Spacer
          )}

          {step < 5 ? (
            <button
              type="button"
              disabled={
                (step === 1 && selectedCats.length === 0) ||
                (step === 2 && !channel) ||
                (step === 3 && channel === 'sms' && !smsMessage.trim()) ||
                (step === 3 && channel === 'whatsapp' && !useIaMessage && !manualWaMessage.trim())
              }
              onClick={() => setStep(step + 1)}
              className="px-5 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1 disabled:opacity-35"
            >
              Suivant
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={launching}
              onClick={handleLaunchCampaign}
              className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-violet-950/40 flex items-center gap-1.5 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {launching ? "Lancement..." : "🚀 Lancer la campagne"}
            </button>
          )}

        </div>

      </div>

    </div>
  );
}
