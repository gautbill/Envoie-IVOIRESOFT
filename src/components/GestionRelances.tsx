import React, { useState } from 'react';
import { 
  Clock, 
  Search, 
  Smartphone, 
  MessageSquare, 
  Calendar, 
  ChevronRight, 
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Sparkles,
  Play,
  Eye,
  X,
  Send,
  Sliders,
  ChevronLeft
} from 'lucide-react';
import { Contact, AppConfig } from '../types';

interface GestionRelancesProps {
  contacts: Contact[];
  config: AppConfig | null;
  onRefresh: () => void;
  setActiveTab: (tab: string) => void;
}

export default function GestionRelances({ contacts, config, onRefresh, setActiveTab }: GestionRelancesProps) {
  // Filters & State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedActivity, setSelectedActivity] = useState('All');
  const [activeFilterTab, setActiveFilterTab] = useState<'all' | 'due' | 'waiting' | 'completed'>('all');
  
  // Interactive Simulator State
  const [simSector, setSimSector] = useState('Restaurants');
  const [simStage, setSimStage] = useState<'premier_contact' | 'relance_1' | 'relance_2' | 'relance_3'>('relance_1');
  const [simulatedMsg, setSimulatedMsg] = useState('');
  const [simulating, setSimulating] = useState(false);

  // Modals & Details State
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [sendingRelanceId, setSendingRelanceId] = useState<string | null>(null);
  const [acceleratingId, setAcceleratingId] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Helper to calculate exact days elapsed
  const getElapsedDays = (dateStr: string | null): number => {
    if (!dateStr) return 0;
    const lastSent = new Date(dateStr);
    const now = new Date();
    
    const d1 = Date.UTC(lastSent.getFullYear(), lastSent.getMonth(), lastSent.getDate());
    const d2 = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    
    return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
  };

  // Check if contact is in the WA follow-up cycle
  const isInCycle = (c: Contact) => {
    return ['envoye', 'relance_1', 'relance_2'].includes(c.statut_wa) && c.nb_relances < 3;
  };

  // 1. Calculate general stats
  const activeCycleContacts = contacts.filter(isInCycle);
  
  const dueContacts = activeCycleContacts.filter(c => {
    const elapsed = getElapsedDays(c.date_envoi_wa);
    return elapsed >= 3;
  });

  const waitingContacts = activeCycleContacts.filter(c => {
    const elapsed = getElapsedDays(c.date_envoi_wa);
    return elapsed < 3;
  });

  const completedContacts = contacts.filter(c => c.statut_wa === 'termine');

  // 2. Filter contacts based on search and filters
  const filteredContacts = contacts.filter(c => {
    // Search filter
    const matchesSearch = 
      c.entreprise.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.telephone.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.activite.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Sector filter
    const matchesActivity = selectedActivity === 'All' || c.activite === selectedActivity;

    // Relance status filter tab
    let matchesTab = false;
    if (activeFilterTab === 'all') {
      matchesTab = isInCycle(c) || c.statut_wa === 'termine';
    } else if (activeFilterTab === 'due') {
      matchesTab = isInCycle(c) && getElapsedDays(c.date_envoi_wa) >= 3;
    } else if (activeFilterTab === 'waiting') {
      matchesTab = isInCycle(c) && getElapsedDays(c.date_envoi_wa) < 3;
    } else if (activeFilterTab === 'completed') {
      matchesTab = c.statut_wa === 'termine';
    }

    return matchesSearch && matchesActivity && matchesTab;
  });

  // Unique list of activities/sectors for the selector
  const activities = Array.from(new Set(contacts.map(c => c.activite))).filter(Boolean);

  // Pagination slice
  const totalPages = Math.ceil(filteredContacts.length / itemsPerPage);
  const paginatedContacts = filteredContacts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Execute manual follow-up now
  const handleTriggerRelance = async (contact: Contact) => {
    setSendingRelanceId(contact.id);
    try {
      const res = await fetch(`/api/contacts/${contact.id}/send-wa-now`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Relance envoyée avec succès à "${contact.entreprise}" !\nMessage généré par l'IA :\n\n${data.text || ''}`);
        onRefresh();
      } else {
        alert(`Erreur d'envoi : ${data.error || 'Inconnue'}`);
      }
    } catch (e) {
      alert("Impossible de se connecter à l'API de relance.");
    } finally {
      setSendingRelanceId(null);
    }
  };

  // Accelerate time by 3 days for simulation / debugging
  const handleSimulateTimeMachine = async (id: string) => {
    setAcceleratingId(id);
    try {
      const res = await fetch(`/api/contacts/${id}/advance-time-relance`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        onRefresh();
      } else {
        alert(`Erreur de simulation : ${data.error || 'Inconnue'}`);
      }
    } catch (e) {
      alert("Impossible de connecter à la machine temporelle.");
    } finally {
      setAcceleratingId(null);
    }
  };

  // Simulate AI template generation
  const handlePreviewAI = async () => {
    setSimulating(true);
    setSimulatedMsg('');
    try {
      const res = await fetch('/api/ai/preview-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secteur: simSector,
          entreprise: "Entreprise Test S.A.",
          type: simStage
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSimulatedMsg(data.text);
      } else {
        setSimulatedMsg(`Erreur : ${data.error || 'Inconnue'}`);
      }
    } catch (e) {
      setSimulatedMsg("Impossible de générer la prévisualisation.");
    } finally {
      setSimulating(false);
    }
  };

  const getStatusBadgeAndLabel = (status: Contact['statut_wa'], nb: number) => {
    switch (status) {
      case 'envoye':
        return {
          label: `Étape 1 : Contacté (J+0)`,
          color: 'text-blue-400 bg-blue-500/10 border-blue-500/20'
        };
      case 'relance_1':
        return {
          label: `Étape 2 : Relancé 1 fois (J+3)`,
          color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20'
        };
      case 'relance_2':
        return {
          label: `Étape 3 : Relancé 2 fois (J+6)`,
          color: 'text-orange-400 bg-orange-500/10 border-orange-500/20'
        };
      case 'relance_3':
      case 'termine':
        return {
          label: `Étape 4 : Cycle Terminé (3 Relances)`,
          color: 'text-green-400 bg-green-500/10 border-green-500/20'
        };
      default:
        return {
          label: `Statut inconnu : ${status}`,
          color: 'text-white/40 bg-white/5 border-white/10'
        };
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white uppercase font-mono tracking-wider">Suivi & Gestions des Relances</h1>
          <p className="text-white/45 text-xs font-mono">Gérez et suivez le tunnel d'engagement intelligent sur WhatsApp</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('envoi-categories')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0F121D] hover:bg-white/5 text-white/70 border border-white/10 rounded text-xs font-bold transition-all cursor-pointer font-mono"
          >
            <Send className="w-3.5 h-3.5" />
            LANCER UNE NOUVELLE CAMPAGNE
          </button>
        </div>
      </div>

      {/* STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Active Followers */}
        <div className="bg-[#0F121D]/90 p-4 rounded-xl border border-white/5 backdrop-blur-md">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-white/40 uppercase font-mono tracking-wider">En cours d'engagement</span>
            <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded border border-blue-500/20">
              <RefreshCw className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-white">{activeCycleContacts.length}</span>
            <span className="text-[10px] font-mono text-white/40">leads actifs</span>
          </div>
          <p className="text-[9px] text-white/30 font-mono mt-1">Reçoivent la séquence automatique WhatsApp</p>
        </div>

        {/* Due Right Now */}
        <div className="bg-[#0F121D]/90 p-4 rounded-xl border border-white/5 backdrop-blur-md">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-orange-400 uppercase font-mono tracking-wider">Relances dues (J+3 échu)</span>
            <div className="p-1.5 bg-orange-500/10 text-orange-400 rounded border border-orange-500/20 animate-pulse">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-orange-400">{dueContacts.length}</span>
            <span className="text-[10px] font-mono text-orange-400/60">prêtes</span>
          </div>
          <p className="text-[9px] text-orange-400/40 font-mono mt-1">Prêtes pour envoi immédiat ou auto-cron</p>
        </div>

        {/* Pending delays */}
        <div className="bg-[#0F121D]/90 p-4 rounded-xl border border-white/5 backdrop-blur-md">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-blue-400 uppercase font-mono tracking-wider">En attente de délai</span>
            <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded border border-blue-500/20">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-blue-400">{waitingContacts.length}</span>
            <span className="text-[10px] font-mono text-blue-400/60">leads</span>
          </div>
          <p className="text-[9px] text-blue-400/40 font-mono mt-1">Délai d'attente de 3 jours non écoulé</p>
        </div>

        {/* Cycles completed */}
        <div className="bg-[#0F121D]/90 p-4 rounded-xl border border-white/5 backdrop-blur-md">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-green-400 uppercase font-mono tracking-wider">Cycles terminés</span>
            <div className="p-1.5 bg-green-500/10 text-green-400 rounded border border-green-500/20">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-green-400">{completedContacts.length}</span>
            <span className="text-[10px] font-mono text-green-400/60">finalisés</span>
          </div>
          <p className="text-[9px] text-green-400/40 font-mono mt-1">Séquence entière WhatsApp effectuée</p>
        </div>

      </div>

      {/* FILTER & CONTROL PANEL */}
      <div className="bg-[#0F121D]/90 rounded-xl p-4 border border-white/5 shadow-lg space-y-4 backdrop-blur-md">
        
        {/* Header tabs for Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-2.5">
          <div className="flex items-center gap-1.5 bg-black/30 p-1 rounded-lg border border-white/5">
            {[
              { id: 'all', label: 'Toutes', count: activeCycleContacts.length + completedContacts.length },
              { id: 'due', label: 'Dues (J+3+)', count: dueContacts.length, highlight: true },
              { id: 'waiting', label: 'En attente', count: waitingContacts.length },
              { id: 'completed', label: 'Terminées', count: completedContacts.length },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveFilterTab(tab.id as any); setCurrentPage(1); }}
                className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeFilterTab === tab.id
                    ? 'bg-blue-600/10 border border-blue-500/30 text-blue-400'
                    : 'text-white/40 hover:text-white border border-transparent'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded font-bold text-[9px] ${
                  activeFilterTab === tab.id
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    : tab.highlight && tab.count > 0
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/20 animate-pulse'
                      : 'bg-white/5 text-white/55 border border-white/5'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-white/40 text-[11px] font-mono">
            <Sliders className="w-3.5 h-3.5 text-blue-400" />
            <span>CRITÈRE D'AUTOMATION : INTERVALLE DE 3 JOURS MINIMUM</span>
          </div>
        </div>

        {/* Inputs row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Search bar */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-white/45">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Entreprise, téléphone, activité..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full bg-[#08090D] border border-white/10 rounded px-3 pl-9 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors font-mono"
            />
          </div>

          {/* Activity selector */}
          <div>
            <select
              value={selectedActivity}
              onChange={(e) => { setSelectedActivity(e.target.value); setCurrentPage(1); }}
              className="w-full bg-[#08090D] border border-white/10 rounded px-3 py-1.5 text-xs text-white/80 focus:outline-none focus:border-blue-500 transition-colors font-mono"
            >
              <option value="All">Tous les secteurs d'activité ({activities.length})</option>
              {activities.map((act) => (
                <option key={act} value={act}>{act}</option>
              ))}
            </select>
          </div>
        </div>

      </div>

      {/* CORE LEADS LIST */}
      <div className="bg-[#0F121D]/90 rounded-xl border border-white/5 shadow-lg overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-[#08090D] text-[10px] font-bold uppercase tracking-wider text-white/50 font-mono">
                <th className="px-5 py-3.5">Prospect</th>
                <th className="px-5 py-3.5">Étape Séquence</th>
                <th className="px-5 py-3.5 text-center">Nombre Relances</th>
                <th className="px-5 py-3.5">Dernier Message</th>
                <th className="px-5 py-3.5">Délai écoulé</th>
                <th className="px-5 py-3.5 text-right">Actions de Relance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {paginatedContacts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-white/30 font-mono">
                    <AlertCircle className="w-6 h-6 text-white/25 mx-auto mb-2" />
                    Aucun lead dans cette catégorie ne correspond aux filtres.
                  </td>
                </tr>
              ) : (
                paginatedContacts.map((contact) => {
                  const elapsedDays = getElapsedDays(contact.date_envoi_wa);
                  const isDue = elapsedDays >= 3 && isInCycle(contact);
                  const statusInfo = getStatusBadgeAndLabel(contact.statut_wa, contact.nb_relances);

                  return (
                    <tr key={contact.id} className="hover:bg-white/[2%] transition-colors group">
                      
                      {/* Company & Phone */}
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-white text-xs">{contact.entreprise}</div>
                        <div className="font-mono text-[10px] text-white/50 mt-0.5">{contact.telephone}</div>
                        <div className="inline-block px-1.5 py-0.2 rounded text-[8px] font-mono font-bold bg-[#08090D] border border-white/5 text-white/40 uppercase mt-1">
                          {contact.activite}
                        </div>
                      </td>

                      {/* Current Séquence Stage */}
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </td>

                      {/* Number of follow-ups */}
                      <td className="px-5 py-3.5 text-center font-mono font-bold">
                        <span className={`px-2 py-0.5 rounded text-[11px] ${
                          contact.nb_relances === 0 ? 'text-white/40 bg-white/5' :
                          contact.nb_relances === 1 ? 'text-yellow-500 bg-yellow-500/5 border border-yellow-500/10' :
                          contact.nb_relances === 2 ? 'text-orange-400 bg-orange-500/5 border border-orange-500/10' :
                          'text-green-400 bg-green-500/5 border border-green-500/10'
                        }`}>
                          {contact.nb_relances} / 3
                        </span>
                      </td>

                      {/* Last Send Date */}
                      <td className="px-5 py-3.5 font-mono text-[11px] text-white/70">
                        {contact.date_envoi_wa ? (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-green-400" />
                            <span>{contact.date_envoi_wa}</span>
                          </div>
                        ) : (
                          <span className="text-white/30">-</span>
                        )}
                      </td>

                      {/* Days Elapsed Countdown */}
                      <td className="px-5 py-3.5 font-mono">
                        {!contact.date_envoi_wa ? (
                          <span className="text-white/30">-</span>
                        ) : isInCycle(contact) ? (
                          <div className="flex flex-col gap-0.5">
                            <span className={`text-[11px] font-bold ${isDue ? 'text-orange-400' : 'text-blue-400'}`}>
                              {elapsedDays} jours écoulés
                            </span>
                            {isDue ? (
                              <span className="text-[9px] uppercase tracking-wide text-orange-400 font-bold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-ping" />
                                ÉCHUE / PRÊTE (J+3+)
                              </span>
                            ) : (
                              <span className="text-[9px] uppercase tracking-wide text-blue-400/60 font-semibold">
                                Attente ({3 - elapsedDays} j restants)
                              </span>
                            )}
                          </div>
                        ) : contact.statut_wa === 'termine' ? (
                          <span className="text-green-400 font-bold text-[10px] uppercase">Complété</span>
                        ) : (
                          <span className="text-white/40 font-bold text-[10px] uppercase">{contact.statut_wa}</span>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex justify-end items-center gap-1.5">
                          
                          {/* Time Machine Debug Simulator Button */}
                          {isInCycle(contact) && !isDue && (
                            <button
                              onClick={() => handleSimulateTimeMachine(contact.id)}
                              disabled={acceleratingId === contact.id}
                              className="px-2 py-1 bg-blue-950/20 hover:bg-blue-900/40 text-blue-400 border border-blue-500/15 rounded text-[10px] font-bold font-mono tracking-tight transition-all cursor-pointer disabled:opacity-40"
                              title="Simuler un passage du temps de 3 jours pour ce prospect"
                            >
                              {acceleratingId === contact.id ? "TIME..." : "⏩ ACCÉLÉRER J+3"}
                            </button>
                          )}

                          {/* Trigger Relance Button */}
                          {isInCycle(contact) && (
                            <button
                              onClick={() => handleTriggerRelance(contact)}
                              disabled={sendingRelanceId === contact.id}
                              className={`px-3 py-1 rounded text-[10px] font-bold font-mono uppercase tracking-tight transition-all flex items-center gap-1 cursor-pointer shadow-md ${
                                isDue 
                                  ? 'bg-orange-500 hover:bg-orange-400 text-black' 
                                  : 'bg-[#121622] hover:bg-white/5 text-white/55 border border-white/5'
                              }`}
                            >
                              <Play className="w-3 h-3 fill-current" />
                              {sendingRelanceId === contact.id ? "RELA..." : "RELANCER MAINTENANT"}
                            </button>
                          )}

                          {/* View History Eye Icon */}
                          <button
                            onClick={() => {
                              setSelectedContact(contact);
                              setIsDetailModalOpen(true);
                            }}
                            className="p-1.5 bg-[#08090D] hover:bg-white/5 border border-white/5 hover:border-white/10 text-white/50 hover:text-white rounded transition-colors cursor-pointer"
                            title="Historique des messages envoyés"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION PANEL */}
        {totalPages > 1 && (
          <div className="px-5 py-3.5 bg-[#08090D] border-t border-white/5 flex items-center justify-between font-mono">
            <span className="text-[11px] text-white/40">
              INDEX RELANCES : {paginatedContacts.length} / {filteredContacts.length} prospects
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="px-2.5 py-1 bg-white/[2%] text-white/60 hover:text-white rounded border border-white/10 text-[10px] uppercase font-bold transition-colors disabled:opacity-30 cursor-pointer"
              >
                Précédent
              </button>
              <span className="text-[10px] text-blue-400 font-bold bg-[#0F121D] px-2.5 py-1 rounded border border-white/5">
                PAGE {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="px-2.5 py-1 bg-white/[2%] text-white/60 hover:text-white rounded border border-white/10 text-[10px] uppercase font-bold transition-colors disabled:opacity-30 cursor-pointer"
              >
                Suivant
              </button>
            </div>
          </div>
        )}

      </div>

      {/* IA TEMPLATE PREVIEW SIMULATOR */}
      <div className="bg-[#0F121D]/90 rounded-xl p-5 border border-white/5 shadow-lg space-y-4 backdrop-blur-md">
        <div className="flex items-center gap-2 border-b border-white/5 pb-3">
          <div className="p-1.5 bg-blue-600/15 text-blue-400 rounded-lg border border-blue-500/20">
            <Sparkles className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">Simulateur d'Accroche Relance IA</h3>
            <p className="text-white/45 text-[10px] font-mono">Testez en direct comment l'IA formule ses messages de relance personnalisés</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Controls column */}
          <div className="space-y-3 md:col-span-1">
            <div>
              <label className="text-[10px] font-bold text-white/50 uppercase font-mono block mb-1.5">Secteur / Activité</label>
              <select
                value={simSector}
                onChange={(e) => setSimSector(e.target.value)}
                className="w-full bg-[#08090D] border border-white/10 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              >
                <option value="Restaurants">Restaurants</option>
                <option value="BTP">BTP</option>
                <option value="Agences immobilières">Agences immobilières</option>
                <option value="Transports">Transports</option>
                <option value="Salons de coiffure">Salons de coiffure</option>
                <option value="Général">Général / Autre</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-white/50 uppercase font-mono block mb-1.5">Étape du cycle</label>
              <div className="space-y-1.5">
                {[
                  { id: 'premier_contact', label: '1. Message Initial (J+0)' },
                  { id: 'relance_1', label: '2. Relance 1 (J+3)' },
                  { id: 'relance_2', label: '3. Relance 2 (J+6)' },
                  { id: 'relance_3', label: '4. Relance de Clôture (J+9)' },
                ].map(stage => (
                  <label
                    key={stage.id}
                    className={`flex items-center gap-2 px-3 py-2 border rounded text-xs font-mono cursor-pointer transition-all ${
                      simStage === stage.id 
                        ? 'bg-blue-600/10 border-blue-500/30 text-blue-400 font-bold' 
                        : 'bg-black/25 border-white/5 text-white/50 hover:text-white/80'
                    }`}
                  >
                    <input
                      type="radio"
                      name="simStage"
                      checked={simStage === stage.id}
                      onChange={() => setSimStage(stage.id as any)}
                      className="sr-only"
                    />
                    <span>{stage.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={handlePreviewAI}
              disabled={simulating}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold transition-all cursor-pointer font-mono"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${simulating ? 'animate-spin' : ''}`} />
              {simulating ? "GÉNÉRATION..." : "PRÉVISUALISER L'ACCROCHE"}
            </button>
          </div>

          {/* Result view column */}
          <div className="md:col-span-2 flex flex-col h-full min-h-[220px]">
            <div className="text-[10px] font-bold text-white/50 uppercase font-mono mb-1.5">Rendu IA Personnalisé</div>
            <div className="flex-1 bg-[#08090D] border border-white/5 rounded-lg p-4 font-mono text-xs text-white/85 flex flex-col justify-between overflow-y-auto max-h-[260px]">
              {simulatedMsg ? (
                <p className="whitespace-pre-line leading-relaxed">{simulatedMsg}</p>
              ) : (
                <div className="m-auto text-center space-y-2 text-white/30 py-6">
                  <Sparkles className="w-8 h-8 mx-auto text-white/10" />
                  <p className="text-[11px]">Choisissez un secteur et une étape, puis cliquez sur générer pour simuler l'accroche IA.</p>
                </div>
              )}
              {simulatedMsg && (
                <div className="border-t border-white/5 pt-2 mt-4 flex items-center justify-between text-[9px] text-white/40">
                  <span>Modèle: GPT-4/Gemini Auto-tuning</span>
                  <span>Inclut l'image : ivoiresoft_digital.jpg</span>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* DETAIL HISTORY MODAL */}
      {isDetailModalOpen && selectedContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1E2235] w-full max-w-2xl rounded-xl border border-[#2D3250] p-6 relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsDetailModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white cursor-pointer">
              <X className="w-5 h-5" />
            </button>
            
            <div className="border-b border-[#2D3250] pb-4 mb-5">
              <h3 className="text-xl font-bold text-white font-mono">{selectedContact.entreprise}</h3>
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-400 font-mono">
                <span>📞 {selectedContact.telephone}</span>
                <span>📁 {selectedContact.activite}</span>
                <span>📅 Créé le {new Date(selectedContact.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="space-y-6">
              
              {/* Statuts Summary */}
              <div className="bg-[#131520] rounded-xl p-4 border border-[#252A42] grid grid-cols-2 gap-4 font-mono">
                <div>
                  <span className="text-[10px] text-white/40 font-bold uppercase block">Statut WhatsApp</span>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs font-bold text-white uppercase bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
                      {selectedContact.statut_wa.replace('_', ' ')}
                    </span>
                  </div>
                  {selectedContact.date_envoi_wa && (
                    <span className="text-[10px] text-white/50 mt-1.5 block">Dernier envoi : {selectedContact.date_envoi_wa}</span>
                  )}
                </div>

                <div>
                  <span className="text-[10px] text-white/40 font-bold uppercase block">Cycle de Relances</span>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="text-xs text-blue-400 font-bold bg-[#1E2235] px-2 py-0.5 rounded border border-[#2D3250]">
                      {selectedContact.nb_relances} / 3 Relances envoyées
                    </span>
                  </div>
                </div>
              </div>

              {/* SÉQUENCE DES MESSAGES ENVOYÉS */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider border-b border-[#2D3250] pb-1">Messages de la Séquence</h4>
                
                {/* Message Initial */}
                <div className="bg-[#131520] rounded-lg p-4 border border-[#252A42] space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-blue-400 font-mono uppercase">Étape 1 : Message Initial (J+0)</span>
                    <span className="text-[10px] text-white/40 font-mono">
                      {selectedContact.date_envoi_wa ? "Envoyé" : "Non envoyé"}
                    </span>
                  </div>
                  {selectedContact.message_wa ? (
                    <p className="text-xs text-white/80 font-mono whitespace-pre-line bg-black/20 p-2.5 rounded border border-[#2D3250] leading-relaxed">
                      {selectedContact.message_wa}
                    </p>
                  ) : (
                    <p className="text-xs text-white/30 font-mono italic">Aucun message initial enregistré.</p>
                  )}
                </div>

                {/* Relance 1 */}
                <div className="bg-[#131520] rounded-lg p-4 border border-[#252A42] space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-yellow-500 font-mono uppercase">Étape 2 : Relance 1 (J+3)</span>
                    <span className="text-[10px] text-white/40 font-mono">
                      {selectedContact.nb_relances >= 1 ? "Envoyée" : "En attente"}
                    </span>
                  </div>
                  {selectedContact.relance1_wa ? (
                    <p className="text-xs text-white/80 font-mono whitespace-pre-line bg-black/20 p-2.5 rounded border border-[#2D3250] leading-relaxed">
                      {selectedContact.relance1_wa}
                    </p>
                  ) : (
                    <p className="text-xs text-white/30 font-mono italic">En attente d'envoi de la relance 1.</p>
                  )}
                </div>

                {/* Relance 2 */}
                <div className="bg-[#131520] rounded-lg p-4 border border-[#252A42] space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-orange-400 font-mono uppercase">Étape 3 : Relance 2 (J+6)</span>
                    <span className="text-[10px] text-white/40 font-mono">
                      {selectedContact.nb_relances >= 2 ? "Envoyée" : "En attente"}
                    </span>
                  </div>
                  {selectedContact.relance2_wa ? (
                    <p className="text-xs text-white/80 font-mono whitespace-pre-line bg-black/20 p-2.5 rounded border border-[#2D3250] leading-relaxed">
                      {selectedContact.relance2_wa}
                    </p>
                  ) : (
                    <p className="text-xs text-white/30 font-mono italic">En attente d'envoi de la relance 2.</p>
                  )}
                </div>

                {/* Relance 3 */}
                <div className="bg-[#131520] rounded-lg p-4 border border-[#252A42] space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-green-400 font-mono uppercase">Étape 4 : Relance Finale (J+9)</span>
                    <span className="text-[10px] text-white/40 font-mono">
                      {selectedContact.nb_relances >= 3 ? "Envoyée" : "En attente"}
                    </span>
                  </div>
                  {selectedContact.relance3_wa ? (
                    <p className="text-xs text-white/80 font-mono whitespace-pre-line bg-black/20 p-2.5 rounded border border-[#2D3250] leading-relaxed">
                      {selectedContact.relance3_wa}
                    </p>
                  ) : (
                    <p className="text-xs text-white/30 font-mono italic">En attente d'envoi de la relance finale de clôture.</p>
                  )}
                </div>

              </div>

            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[#2D3250]">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 bg-[#131520] hover:bg-[#252A42] text-white rounded text-xs font-bold font-mono uppercase border border-white/5 transition-colors cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
