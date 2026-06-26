import React, { useState } from 'react';
import { 
  MessageSquare, 
  Send, 
  Users, 
  UserCheck, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Settings, 
  RefreshCw, 
  TrendingUp, 
  ArrowRight,
  Database,
  Smartphone
} from 'lucide-react';
import { DashboardStats, Contact } from '../types';

interface DashboardProps {
  stats: DashboardStats | null;
  loading: boolean;
  onRefresh: () => void;
  setActiveTab: (tab: string) => void;
}

export default function Dashboard({ stats, loading, onRefresh, setActiveTab }: DashboardProps) {
  const [triggeringSms, setTriggeringSms] = useState(false);
  const [triggeringWa, setTriggeringWa] = useState(false);

  const handleTriggerSms = async () => {
    setTriggeringSms(true);
    try {
      const response = await fetch('/api/cron/trigger-sms', { method: 'POST' });
      const data = await response.json();
      alert(data.message);
      onRefresh();
    } catch (err) {
      alert("Erreur de déclenchement du cron SMS");
    } finally {
      setTriggeringSms(false);
    }
  };

  const handleTriggerWa = async () => {
    setTriggeringWa(true);
    try {
      const response = await fetch('/api/cron/trigger-wa', { method: 'POST' });
      const data = await response.json();
      alert(data.message);
      onRefresh();
    } catch (err) {
      alert("Erreur de déclenchement du cron WhatsApp");
    } finally {
      setTriggeringWa(false);
    }
  };

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  // Quota percentages
  const smsPercent = Math.min(100, Math.round((stats.smsEnvoyesAujourdHui / stats.smsQuota) * 100)) || 0;
  const waPercent = Math.min(100, Math.round((stats.waEnvoyesAujourdHui / stats.waQuota) * 100)) || 0;

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION WITH REFRESH */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Tableau de Bord</h1>
          <p className="text-gray-400 text-sm">Vue d'ensemble de vos canaux d'acquisition IvoireSoft CI.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-[#1E2235] text-gray-300 hover:text-white rounded-lg border border-[#2D3250] hover:bg-[#252A42] transition-colors text-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
          
          <button 
            onClick={() => setActiveTab('envoi-categories')}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-lg transition-all text-sm font-medium shadow-md shadow-violet-950/40"
          >
            <Send className="w-4 h-4" />
            Nouvel Envoi
          </button>
        </div>
      </div>

      {/* 4 KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* SMS Card */}
        <div className="bg-[#0F121D]/90 rounded-xl p-5 border border-white/5 hover:border-orange-500/40 hover:tech-glow-orange transition-all relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-orange-500" />
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs text-white/50 font-mono tracking-tight uppercase">SMS Envoyés / Quota</span>
              <h3 className="text-2xl font-bold text-white font-mono tracking-tight">{stats.smsEnvoyesAujourdHui} <span className="text-xs font-normal text-white/40">/ {stats.smsQuota}</span></h3>
            </div>
            <div className="p-2 bg-orange-500/10 rounded border border-orange-500/20 text-orange-400">
              <Smartphone className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-[10px] text-white/40 font-mono mb-1">
              <span>{smsPercent}% utilisé</span>
              <span>1 batch = 20 SMS</span>
            </div>
            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
              <div className="bg-orange-500 h-full rounded-full transition-all duration-500" style={{ width: `${smsPercent}%` }} />
            </div>
          </div>
        </div>

        {/* WA Card */}
        <div className="bg-[#0F121D]/90 rounded-xl p-5 border border-white/5 hover:border-green-500/40 hover:tech-glow-green transition-all relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs text-white/50 font-mono tracking-tight uppercase">WhatsApp / Quota</span>
              <h3 className="text-2xl font-bold text-white font-mono tracking-tight">{stats.waEnvoyesAujourdHui} <span className="text-xs font-normal text-white/40">/ {stats.waQuota}</span></h3>
            </div>
            <div className="p-2 bg-green-500/10 rounded border border-green-500/20 text-green-400">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-[10px] text-white/40 font-mono mb-1">
              <span>{waPercent}% utilisé</span>
              <span>Générés par IA ✨</span>
            </div>
            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
              <div className="bg-green-500 h-full rounded-full transition-all duration-500" style={{ width: `${waPercent}%` }} />
            </div>
          </div>
        </div>

        {/* Total Contacts Card */}
        <div className="bg-[#0F121D]/90 rounded-xl p-5 border border-white/5 hover:border-blue-500/40 hover:tech-glow-blue transition-all relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs text-white/50 font-mono tracking-tight uppercase">Contacts en Base</span>
              <h3 className="text-2xl font-bold text-white font-mono tracking-tight">{stats.totalContacts}</h3>
            </div>
            <div className="p-2 bg-blue-500/10 rounded border border-blue-500/20 text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-[10px] text-white/40 font-mono">
            <span className="flex items-center gap-1"><Database className="w-3.5 h-3.5 text-blue-400" /> Google Sheets / CSV</span>
            <button onClick={() => setActiveTab('contacts')} className="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-0.5 group-hover:translate-x-1 transition-transform cursor-pointer">
              Gérer <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Contacts Restants Card */}
        <div className="bg-[#0F121D]/90 rounded-xl p-5 border border-white/5 hover:border-violet-500/40 transition-all relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-violet-500" />
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs text-white/50 font-mono tracking-tight uppercase">Contacts Restants</span>
              <h3 className="text-xl font-bold text-white font-mono tracking-tight">{stats.contactsRestantsWa} <span className="text-xs font-normal text-white/40">WA</span> / {stats.contactsRestantsSms} <span className="text-xs font-normal text-white/40">SMS</span></h3>
            </div>
            <div className="p-2 bg-violet-500/10 rounded border border-violet-500/20 text-violet-400">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-[10px] text-white/40 font-mono mb-1">
              <span>Nouveaux à cibler</span>
            </div>
            <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden flex">
              <div className="bg-green-500 h-full" style={{ width: `${(stats.contactsRestantsWa / Math.max(1, stats.totalContacts)) * 100}%` }} />
              <div className="bg-orange-500 h-full" style={{ width: `${(stats.contactsRestantsSms / Math.max(1, stats.totalContacts)) * 100}%` }} />
            </div>
          </div>
        </div>

      </div>

      {/* AUTOMATION STATUS & SIMULATION TRIGGERS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Campaign Automations */}
        <div className="bg-[#0F121D]/90 rounded-xl p-5 border border-white/5 shadow-lg backdrop-blur-md">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2 uppercase font-mono tracking-wider">
            <Clock className="w-4 h-4 text-blue-400" />
            Planificateurs Automatiques (Cron API)
          </h3>
          <div className="space-y-3">
            
            {/* SMS Cron */}
            <div className="bg-[#08090D] rounded-lg p-4 border border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-3.5 h-3.5 text-orange-400" />
                  <h4 className="font-semibold text-xs text-white">SMS Gateway (SMSLab)</h4>
                  {stats.cronSmsState.status === 'actif' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-green-500/10 text-green-400 border border-green-500/20">🟢 ACTIF</span>
                  ) : stats.cronSmsState.status === 'quota_atteint' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-500/10 text-red-400 border border-red-500/20">🔴 QUOTA ATTEINT</span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">🟡 EN ATTENTE</span>
                  )}
                </div>
                <p className="text-[11px] text-white/50 font-mono">Début : 09h00 UTC • Fréquence : 1 batch (20 SMS) / 2 min</p>
              </div>
              <button
                onClick={handleTriggerSms}
                disabled={triggeringSms}
                className="w-full sm:w-auto px-3 py-1 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded text-[11px] font-bold border border-orange-500/20 transition-all cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${triggeringSms ? 'animate-spin' : ''}`} />
                Lancer Batch
              </button>
            </div>
 
            {/* WA Cron */}
            <div className="bg-[#08090D] rounded-lg p-4 border border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-green-400" />
                  <h4 className="font-semibold text-xs text-white">WhatsApp Agent (Green API)</h4>
                  {stats.cronWaState.status === 'actif' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-green-500/10 text-green-400 border border-green-500/20">🟢 ACTIF</span>
                  ) : stats.cronWaState.status === 'quota_atteint' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-500/10 text-red-400 border border-red-500/20">🔴 QUOTA ATTEINT</span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">🟡 EN ATTENTE</span>
                  )}
                </div>
                <p className="text-[11px] text-white/50 font-mono">Début : 10h00 UTC • Fréquence : 1 Prospect IA / 2 min</p>
              </div>
              <button
                onClick={handleTriggerWa}
                disabled={triggeringWa}
                className="w-full sm:w-auto px-3 py-1 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded text-[11px] font-bold border border-green-500/20 transition-all cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${triggeringWa ? 'animate-spin' : ''}`} />
                Lancer Envoi
              </button>
            </div>
 
          </div>
        </div>
 
        {/* WA LifeCycle Breakdown */}
        <div className="bg-[#0F121D]/90 rounded-xl p-5 border border-white/5 shadow-lg backdrop-blur-md">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2 uppercase font-mono tracking-wider">
            <TrendingUp className="w-4 h-4 text-green-400" />
            Cycle de Relance WhatsApp (Autonome)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            
            <div className="bg-[#08090D] rounded-lg p-2.5 border border-white/5 text-center">
              <span className="text-[10px] text-white/50 block font-mono font-semibold uppercase mb-0.5">Nouveau</span>
              <span className="text-lg font-bold text-white font-mono">{stats.breakdownWa.nouveau}</span>
              <span className="text-[9px] text-white/30 block mt-0.5">Prospects initiaux</span>
            </div>
 
            <div className="bg-[#08090D] rounded-lg p-2.5 border border-white/5 text-center">
              <span className="text-[10px] text-blue-400 block font-mono font-semibold uppercase mb-0.5">Contacté</span>
              <span className="text-lg font-bold text-blue-400 font-mono">{stats.breakdownWa.envoye}</span>
              <span className="text-[9px] text-white/30 block mt-0.5">Attente Relance 1</span>
            </div>
 
            <div className="bg-[#08090D] rounded-lg p-2.5 border border-white/5 text-center">
              <span className="text-[10px] text-yellow-500 block font-mono font-semibold uppercase mb-0.5">Relance 1</span>
              <span className="text-lg font-bold text-yellow-500 font-mono">{stats.breakdownWa.relance_1}</span>
              <span className="text-[9px] text-white/30 block mt-0.5">Après 3 jours</span>
            </div>
 
            <div className="bg-[#08090D] rounded-lg p-2.5 border border-white/5 text-center">
              <span className="text-[10px] text-orange-400 block font-mono font-semibold uppercase mb-0.5">Relance 2</span>
              <span className="text-lg font-bold text-orange-400 font-mono">{stats.breakdownWa.relance_2}</span>
              <span className="text-[9px] text-white/30 block mt-0.5">Après 6 jours</span>
            </div>
 
            <div className="bg-[#08090D] rounded-lg p-2.5 border border-white/5 text-center">
              <span className="text-[10px] text-purple-400 block font-mono font-semibold uppercase mb-0.5">Relance 3</span>
              <span className="text-lg font-bold text-purple-400 font-mono">{stats.breakdownWa.relance_3}</span>
              <span className="text-[9px] text-white/30 block mt-0.5">Après 9 jours</span>
            </div>
 
            <div className="bg-[#08090D] rounded-lg p-2.5 border border-white/5 text-center">
              <span className="text-[10px] text-green-400 block font-mono font-semibold uppercase mb-0.5">Terminé</span>
              <span className="text-lg font-bold text-green-400 font-mono">{stats.breakdownWa.termine}</span>
              <span className="text-[9px] text-white/30 block mt-0.5">Cycle complet</span>
            </div>
 
            <div className="bg-[#08090D] rounded-lg p-2.5 border border-white/5 text-center col-span-2">
              <div className="flex justify-around items-center h-full">
                <div>
                  <span className="text-[10px] text-white/40 block font-mono font-semibold uppercase">HORS WA</span>
                  <span className="text-sm font-bold text-orange-400 font-mono">{stats.breakdownWa.hors_whatsapp}</span>
                </div>
                <div className="w-px h-6 bg-white/10" />
                <div>
                  <span className="text-[10px] text-white/40 block font-mono font-semibold uppercase">ERREURS</span>
                  <span className="text-sm font-bold text-red-500 font-mono">{stats.breakdownWa.erreur}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
 
      {/* GRAPHICS & RECENT ACTIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Weekly Chart */}
        <div className="bg-[#0F121D]/90 rounded-xl p-5 border border-white/5 shadow-lg lg:col-span-7 backdrop-blur-md">
          <h3 className="text-sm font-bold text-white mb-2 uppercase font-mono tracking-wider">Volume Quotidien (7 Derniers Jours)</h3>
          <p className="text-[11px] text-white/40 font-mono">Indicateur de charge SMSLab & Green API</p>
          
          <div className="h-60 flex flex-col justify-between mt-4">
            <div className="flex-1 flex items-end justify-between gap-3 px-2">
              {stats.weeklyActivity.map((day, idx) => {
                const maxVal = Math.max(1, ...stats.weeklyActivity.map(d => d.sms + d.whatsapp));
                const smsHeight = (day.sms / maxVal) * 100;
                const waHeight = (day.whatsapp / maxVal) * 100;
 
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group h-full justify-end relative">
                    
                    {/* Tooltip */}
                    <div className="absolute opacity-0 group-hover:opacity-100 bg-[#08090D] border border-white/10 text-white text-[10px] p-2 rounded pointer-events-none transition-opacity -translate-y-16 flex flex-col gap-0.5 z-20 shadow-2xl font-mono">
                      <span className="font-bold text-white/75">{day.date}</span>
                      <span className="text-orange-400">SMS : {day.sms}</span>
                      <span className="text-green-400">WA : {day.whatsapp}</span>
                    </div>
 
                    <div className="w-full flex justify-center items-end gap-1 h-3/4">
                      {/* SMS bar */}
                      <div 
                        className="w-3 bg-orange-500 hover:bg-orange-400 rounded-t-sm transition-all duration-300" 
                        style={{ height: `${smsHeight}%` }} 
                      />
                      {/* WA bar */}
                      <div 
                        className="w-3 bg-green-500 hover:bg-green-400 rounded-t-sm transition-all duration-300" 
                        style={{ height: `${waHeight}%` }} 
                      />
                    </div>
                    
                    <span className="text-[9px] text-white/40 font-mono tracking-tight block mt-1 truncate max-w-full">{day.date}</span>
                  </div>
                );
              })}
            </div>
 
            {/* Legend */}
            <div className="border-t border-white/5 pt-3.5 mt-2 flex items-center justify-center gap-6 text-[10px] text-white/50 font-mono">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 bg-orange-500 rounded-sm" />
                <span>SMS ENVOYÉS</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-sm" />
                <span>WHATSAPP (IA)</span>
              </div>
            </div>
          </div>
        </div>
 
        {/* Recent Activity */}
        <div className="bg-[#0F121D]/90 rounded-xl p-5 border border-white/5 shadow-lg lg:col-span-5 flex flex-col backdrop-blur-md">
          <div className="flex justify-between items-center mb-4">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">Journaux Temps Réel</h3>
              <p className="text-[10px] text-white/40 font-mono">Derniers retours d'exécution</p>
            </div>
            <button 
              onClick={() => setActiveTab('campagnes')} 
              className="text-[10px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 hover:underline cursor-pointer uppercase font-mono"
            >
              Voir Tout <ArrowRight className="w-3 h-3" />
            </button>
          </div>
 
          <div className="space-y-2 overflow-y-auto flex-1 max-h-[240px] pr-1">
            {stats.recentLogs.length === 0 ? (
              <div className="text-center py-12 text-white/40 text-xs font-mono">
                Aucun envoi répertorié.
              </div>
            ) : (
              stats.recentLogs.map((log) => {
                const isSms = log.canal === 'sms';
                return (
                  <div key={log.id} className="bg-[#08090D] p-3 rounded border border-white/5 flex items-start gap-3 text-xs hover:border-white/10 transition-colors">
                    <div className={`p-1 rounded mt-0.5 ${isSms ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>
                      {isSms ? <Smartphone className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
                    </div>
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-white truncate text-xs pr-2">
                          {log.contact_entreprise || "Envoi Groupé SMS"}
                        </span>
                        <span className="text-[9px] text-white/40 font-mono shrink-0">
                          {new Date(log.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      
                      <p className="text-white/60 line-clamp-1 italic text-[11px] font-mono">
                        "{log.message}"
                      </p>
 
                      <div className="flex justify-between items-center pt-1">
                        <span className="text-[9px] text-white/40 bg-white/5 px-1.5 py-0.5 rounded border border-white/5 capitalize font-mono">
                          {log.type_envoi === 'premier_contact' ? 'Premier Contact' : log.type_envoi.replace('_', ' ')}
                        </span>
 
                        {log.statut === 'envoye' ? (
                          <span className="inline-flex items-center text-[9px] font-bold text-green-400 gap-0.5 font-mono">
                            <CheckCircle className="w-3 h-3" /> SUCCESS
                          </span>
                        ) : log.statut === 'hors_whatsapp' ? (
                          <span className="inline-flex items-center text-[9px] font-bold text-yellow-500 gap-0.5 font-mono">
                            <AlertTriangle className="w-3 h-3" /> HORS WA
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[9px] font-bold text-red-400 gap-0.5 font-mono">
                            <AlertTriangle className="w-3 h-3" /> ÉCHEC
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
 
      </div>
 
    </div>
  );
}
