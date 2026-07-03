import React, { useState, useEffect } from 'react';
import { 
  Home, 
  Users, 
  Send, 
  Clock, 
  TrendingUp, 
  Settings, 
  MessageSquare, 
  Smartphone,
  RefreshCw,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Briefcase,
  LogOut,
  Sun,
  Moon
} from 'lucide-react';

import Dashboard from './components/Dashboard';
import Contacts from './components/Contacts';
import EnvoiCategories from './components/EnvoiCategories';
import Campagnes from './components/Campagnes';
import Statistiques from './components/Statistiques';
import Parametres from './components/Parametres';
import GestionRelances from './components/GestionRelances';
import CRM from './components/CRM';
import Login from './components/Login';

import { Contact, Campagne, EnvoisLog, AppConfig, DashboardStats } from './types';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('ivoiresoft_auth') === 'true';
  });
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('ivoiresoft_theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('ivoiresoft_theme', theme);
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, [theme]);
  
  // App States
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [campagnes, setCampagnes] = useState<Campagne[]>([]);
  const [logs, setLogs] = useState<EnvoisLog[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Global Refresh function
  const fetchData = async () => {
    if (!localStorage.getItem('ivoiresoft_auth')) return;
    setLoading(true);
    try {
      const [resContacts, resCamps, resLogs, resConfig, resStats] = await Promise.all([
        fetch('/api/contacts'),
        fetch('/api/campagnes'),
        fetch('/api/logs'),
        fetch('/api/config'),
        fetch('/api/dashboard-stats')
      ]);

      if (resContacts.ok) setContacts(await resContacts.json());
      if (resCamps.ok) setCampagnes(await resCamps.json());
      if (resLogs.ok) setLogs(await resLogs.json());
      if (resConfig.ok) setConfig(await resConfig.json());
      if (resStats.ok) setStats(await resStats.json());
    } catch (err) {
      console.error("Error fetching data from server APIs:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchData();
    
    // Set up auto-refresh every 15 seconds to sync background campaign runs
    const interval = setInterval(() => {
      fetchData();
    }, 15000);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const [timeString, setTimeString] = useState("");
  const [syncingSheets, setSyncingSheets] = useState(false);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const hours = String(now.getUTCHours()).padStart(2, '0');
      const minutes = String(now.getUTCMinutes()).padStart(2, '0');
      const seconds = String(now.getUTCSeconds()).padStart(2, '0');
      setTimeString(`Abidjan UTC • ${hours}:${minutes}:${seconds}`);
    };
    updateClock();
    const clockInterval = setInterval(updateClock, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  const handleSyncSheets = async () => {
    setSyncingSheets(true);
    try {
      const res = await fetch('/api/contacts/import-sheets', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        alert(`Synchronisation Sheets réussie !\n• Nouveaux contacts importés : ${data.stats?.imported || 0}\n• Contacts mis à jour : ${data.stats?.updated || 0}`);
        fetchData();
      } else {
        alert(`Erreur de synchronisation : ${data.error || 'Inconnue'}`);
      }
    } catch (e) {
      alert("Impossible de se connecter à l'API de synchronisation");
    } finally {
      setSyncingSheets(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('ivoiresoft_auth');
    localStorage.removeItem('ivoiresoft_user_email');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-[#08090D] flex flex-col font-sans select-none text-[#F1F5F9]">
      
      {/* TOP HEADER STATUS PANEL */}
      <header className="bg-[#0E111A]/95 border-b border-white/5 sticky top-0 z-40 px-6 py-3 flex flex-wrap items-center justify-between gap-4 backdrop-blur-md">
        
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/15 text-blue-400 rounded-lg border border-blue-500/30 shadow-inner flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              IvoireSoft CI <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded font-mono font-medium">v1.2</span>
            </h1>
            <p className="text-[10px] text-white/50 font-mono tracking-tight uppercase">SMS & WhatsApp Automation Console</p>
          </div>
        </div>

        {/* Dynamic UTC Clock */}
        <div className="hidden lg:flex items-center gap-2 bg-[#141824] px-3 py-1 rounded border border-white/5 font-mono text-[11px] text-white/60">
          <Clock className="w-3.5 h-3.5 text-blue-400" />
          <span>{timeString || "Abidjan UTC..."}</span>
        </div>

        {/* Live Active Quotas Tracker & Sheets Sync */}
        <div className="flex items-center gap-3 ml-auto flex-wrap sm:flex-nowrap">
          
          {stats && config && (
            <div className="flex items-center gap-3">
              
              {/* SMS Quota Header */}
              <div className="bg-[#0F121D] rounded-lg px-3 py-1.5 border border-white/5 flex items-center gap-2.5 w-36">
                <div className="p-1 bg-orange-500/10 text-orange-400 rounded">
                  <Smartphone className="w-3 h-3" />
                </div>
                <div className="flex-1 space-y-0.5">
                  <div className="flex justify-between text-[9px] text-white/50 font-semibold font-mono">
                    <span>SMS</span>
                    <span>{stats.smsEnvoyesAujourdHui}/{stats.smsQuota}</span>
                  </div>
                  <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                    <div className="bg-orange-500 h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(100, (stats.smsEnvoyesAujourdHui / stats.smsQuota) * 100)}%` }} />
                  </div>
                </div>
              </div>

              {/* WhatsApp Quota Header */}
              <div className="bg-[#0F121D] rounded-lg px-3 py-1.5 border border-white/5 flex items-center gap-2.5 w-36">
                <div className="p-1 bg-green-500/10 text-green-400 rounded">
                  <MessageSquare className="w-3 h-3" />
                </div>
                <div className="flex-1 space-y-0.5">
                  <div className="flex justify-between text-[9px] text-white/50 font-semibold font-mono">
                    <span>WHATSAPP</span>
                    <span>{stats.waEnvoyesAujourdHui}/{stats.waQuota}</span>
                  </div>
                  <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                    <div className="bg-green-500 h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(100, (stats.waEnvoyesAujourdHui / stats.waQuota) * 100)}%` }} />
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Theme Toggle Button */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex items-center justify-center p-1.5 bg-[#1E2235] hover:bg-[#252A42] border border-[#2D3250] rounded text-gray-300 hover:text-white transition-all cursor-pointer"
            title={theme === 'dark' ? "Passer au thème clair" : "Passer au thème sombre"}
            id="theme-toggle-button"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-blue-400" />
            )}
          </button>

          {/* Sync Google Sheets Button */}
          <button
            onClick={handleSyncSheets}
            disabled={syncingSheets}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded text-xs font-bold transition-all shadow-lg shadow-blue-500/10 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncingSheets ? 'animate-spin' : ''}`} />
            {syncingSheets ? "Sync..." : "Sync Sheets"}
          </button>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/15 hover:bg-red-600/30 text-red-400 border border-red-500/20 hover:border-red-500/40 rounded text-xs font-bold transition-all cursor-pointer font-sans"
            title="Se déconnecter"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Déconnexion</span>
          </button>

        </div>

      </header>

      {/* CORE WORKSPACE */}
      <div className="flex-1 flex flex-col md:flex-row">
        
        {/* SIDEBAR NAVIGATION */}
        <aside className="bg-[#0E111A]/90 border-r border-white/5 md:w-60 p-4 space-y-1.5 flex flex-row md:flex-col shrink-0 overflow-x-auto md:overflow-x-visible">
          
          {/* Decorative Brand Header */}
          <div className="hidden md:flex items-center gap-2.5 pb-5 border-b border-white/5 mb-4 px-2">
            <div className="w-8 h-8 bg-blue-600/20 text-blue-400 rounded border border-blue-500/30 flex items-center justify-center font-mono font-bold text-sm shadow-md">IS</div>
            <div>
              <h2 className="font-bold tracking-tight text-xs text-white leading-tight">IvoireSoft CI</h2>
              <span className="text-[9px] text-blue-400 font-mono tracking-wider font-semibold uppercase">PROSPECT CORE</span>
            </div>
          </div>
          
          {[
            { id: 'dashboard', name: 'Tableau de Bord', icon: Home },
            { id: 'contacts', name: 'Base Contacts', icon: Users },
            { id: 'crm', name: 'Pipeline CRM', icon: Briefcase, badge: 'Intelligent' },
            { id: 'envoi-categories', name: 'Envoi Catégories', icon: Send, badge: 'Principal' },
            { id: 'relances', name: 'Gestion Relances', icon: RefreshCw, badge: 'WhatsApp' },
            { id: 'campagnes', name: 'Suivi Campagnes', icon: Clock },
            { id: 'statistiques', name: 'Statistiques', icon: TrendingUp },
            { id: 'parametres', name: 'Paramètres APIs', icon: Settings },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs font-semibold transition-all whitespace-nowrap cursor-pointer border ${
                  isActive 
                    ? 'bg-blue-600/10 border-blue-500/30 text-blue-400 font-bold shadow-md shadow-blue-500/5' 
                    : 'text-white/60 hover:text-white hover:bg-white/5 border-transparent'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-white/40'}`} />
                  <span>{item.name}</span>
                </div>
                {item.badge && !isActive && (
                  <span className="text-[8px] bg-violet-500/10 border border-violet-500/20 text-violet-400 px-1 py-0.5 rounded font-bold uppercase tracking-wider">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Divider */}
          <div className="hidden md:block border-t border-white/5 my-4" />

          {/* Sidebar Logout Button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded transition-all cursor-pointer whitespace-nowrap md:mt-auto"
          >
            <LogOut className="w-4 h-4 text-red-400/70" />
            <span>Déconnexion</span>
          </button>

        </aside>

        {/* WORKSPACE AREA */}
        <main className="flex-1 p-6 sm:p-8 overflow-y-auto max-w-full">
          
          {/* TAB ROUTING */}
          {activeTab === 'dashboard' && (
            <Dashboard 
              stats={stats} 
              loading={loading} 
              onRefresh={fetchData} 
              setActiveTab={setActiveTab} 
            />
          )}

          {activeTab === 'contacts' && (
            <Contacts 
              contacts={contacts} 
              onRefresh={fetchData} 
              config={config}
            />
          )}

          {activeTab === 'crm' && (
            <CRM 
              contacts={contacts} 
              config={config} 
              onRefresh={fetchData} 
              setActiveTab={setActiveTab} 
              logs={logs}
            />
          )}

          {activeTab === 'envoi-categories' && (
            <EnvoiCategories 
              contacts={contacts} 
              config={config} 
              onRefresh={fetchData} 
              setActiveTab={setActiveTab} 
            />
          )}

          {activeTab === 'campagnes' && (
            <Campagnes 
              campagnes={campagnes} 
              logs={logs} 
              onRefresh={fetchData} 
              setActiveTab={setActiveTab} 
            />
          )}

          {activeTab === 'relances' && (
            <GestionRelances 
              contacts={contacts} 
              config={config} 
              onRefresh={fetchData} 
              setActiveTab={setActiveTab} 
            />
          )}

          {activeTab === 'statistiques' && (
            <Statistiques 
              contacts={contacts} 
              logs={logs} 
            />
          )}

          {activeTab === 'parametres' && (
            <Parametres 
              config={config} 
              onRefresh={fetchData} 
            />
          )}

        </main>

      </div>

    </div>
  );
}
