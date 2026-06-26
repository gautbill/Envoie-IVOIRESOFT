import React, { useState, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  Trash2, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Smartphone, 
  MessageSquare, 
  Plus,
  RefreshCw,
  Search,
  Eye,
  Check,
  X
} from 'lucide-react';
import { Campagne, EnvoisLog } from '../types';

interface CampagnesProps {
  campagnes: Campagne[];
  logs: EnvoisLog[];
  onRefresh: () => void;
  setActiveTab: (tab: string) => void;
}

export default function Campagnes({ campagnes, logs, onRefresh, setActiveTab }: CampagnesProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLogCamp, setSelectedLogCamp] = useState<string | null>(null);

  const handleToggleStatus = async (camp: Campagne) => {
    const nextStatus = camp.statut === 'active' ? 'suspendue' : 'active';
    try {
      const response = await fetch(`/api/campagnes/${camp.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: nextStatus })
      });
      if (response.ok) {
        onRefresh();
      } else {
        alert("Erreur de modification du statut");
      }
    } catch (err) {
      alert("Erreur réseau");
    }
  };

  const handleDeleteCampagne = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette campagne ?")) return;
    try {
      const response = await fetch(`/api/campagnes/${id}`, { method: 'DELETE' });
      if (response.ok) {
        onRefresh();
        if (selectedLogCamp === id) setSelectedLogCamp(null);
      } else {
        alert("Erreur de suppression");
      }
    } catch (err) {
      alert("Erreur réseau");
    }
  };

  const filteredCampagnes = useMemo(() => {
    return campagnes.filter(c => c.nom.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [campagnes, searchTerm]);

  // Logs for selected campaign or all logs
  const filteredLogs = useMemo(() => {
    if (selectedLogCamp) {
      return logs.filter(l => l.campagne_id === selectedLogCamp);
    }
    return logs;
  }, [logs, selectedLogCamp]);

  return (
    <div className="space-y-6">
      
      {/* HEADER ACTION */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Suivi des Campagnes</h1>
          <p className="text-gray-400 text-sm">Gérez et suivez le déroulement de vos campagnes marketing automatiques ou manuelles.</p>
        </div>
        <button
          onClick={() => setActiveTab('envoi-categories')}
          className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md"
        >
          <Plus className="w-4 h-4" />
          Créer une Campagne
        </button>
      </div>

      {/* FILTER PANEL */}
      <div className="bg-[#1E2235] p-4 rounded-xl border border-[#2D3250] shadow-lg flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:max-w-xs">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Rechercher une campagne..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#131520] border border-[#2D3250] rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-[#131520] hover:bg-[#1E2235] text-gray-300 rounded-lg border border-[#2D3250] text-xs font-semibold transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Actualiser les listes
        </button>
      </div>

      {/* LIST OF CAMPAIGNS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCampagnes.length === 0 ? (
          <div className="col-span-2 bg-[#1E2235] rounded-xl border border-[#2D3250] p-12 text-center text-gray-500 text-sm">
            Aucune campagne enregistrée pour le moment. Lancer un envoi par catégorie pour commencer !
          </div>
        ) : (
          filteredCampagnes.map((camp) => {
            const isSms = camp.canal === 'sms';
            const isActive = camp.statut === 'active';
            const isSuspended = camp.statut === 'suspendue';
            const isFinished = camp.statut === 'terminee';

            // Logs for this camp
            const campLogs = logs.filter(l => l.campagne_id === camp.id);
            const successCount = campLogs.filter(l => l.statut === 'envoye').length;
            const errorCount = campLogs.filter(l => l.statut === 'erreur').length;

            return (
              <div 
                key={camp.id} 
                className={`bg-[#1E2235] rounded-xl p-5 border shadow-lg transition-all flex flex-col justify-between ${
                  selectedLogCamp === camp.id ? 'border-violet-500 shadow-violet-950/20' : 'border-[#2D3250] hover:border-[#3D446B]'
                }`}
              >
                <div>
                  
                  {/* Title Bar */}
                  <div className="flex justify-between items-start gap-4 mb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`p-1 rounded ${isSms ? 'bg-orange-500/10 text-orange-500' : 'bg-green-500/10 text-green-500'}`}>
                          {isSms ? <Smartphone className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
                        </span>
                        <h3 className="font-bold text-white text-base leading-tight">{camp.nom}</h3>
                      </div>
                      <p className="text-[11px] text-gray-400">Secteurs : <span className="font-semibold text-violet-400">{camp.categories?.join(', ')}</span></p>
                    </div>

                    {/* Badge status */}
                    <div>
                      {isActive && <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-500/10 text-green-400 border border-green-500/20">🟢 En cours</span>}
                      {isSuspended && <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">🟡 Suspendue</span>}
                      {isFinished && <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">✅ Terminée</span>}
                      {camp.statut === 'brouillon' && <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-500/10 text-gray-400 border border-gray-500/20">⚪ Brouillon</span>}
                    </div>
                  </div>

                  {/* Settings detail */}
                  <div className="bg-[#131520] rounded-lg p-3 border border-[#252A42] grid grid-cols-2 gap-3 text-xs text-gray-400 font-mono mb-4">
                    <div>
                      <span className="text-[10px] text-gray-500 block">Planification :</span>
                      <span className="text-gray-200">{camp.heure_demarrage ? `Chaque jour à ${camp.heure_demarrage}` : "Immédiat"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 block">Quota quotidien :</span>
                      <span className="text-gray-200">{camp.quota_jour} messages</span>
                    </div>
                    {isSms && (
                      <div className="col-span-2 border-t border-[#252A42]/50 pt-2 text-[11px]">
                        <span className="text-gray-500 font-sans font-semibold">Message fixe : </span>
                        <span className="text-gray-300 italic">"{camp.message_sms_fixe}"</span>
                      </div>
                    )}
                    {!isSms && (
                      <div className="col-span-2 border-t border-[#252A42]/50 pt-2 text-[11px] text-violet-400 flex items-center gap-1 font-sans font-semibold">
                        ✨ Message personnalisé par IA autonome activé (GPT-4o-mini).
                      </div>
                    )}
                  </div>

                </div>

                {/* Statistics counts and Controls */}
                <div className="pt-4 border-t border-[#2D3250] flex items-center justify-between">
                  <div className="flex gap-4 text-xs font-mono text-gray-400">
                    <div>
                      <span className="text-green-400 font-bold">{successCount}</span> Envoyés
                    </div>
                    {errorCount > 0 && (
                      <div>
                        <span className="text-red-400 font-bold">{errorCount}</span> Échecs
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* View Logs Button */}
                    <button
                      onClick={() => setSelectedLogCamp(selectedLogCamp === camp.id ? null : camp.id)}
                      className={`p-1.5 rounded transition-colors text-xs font-semibold flex items-center gap-1 ${
                        selectedLogCamp === camp.id ? 'bg-violet-600 text-white' : 'bg-[#131520] hover:bg-[#252A42] text-gray-400 hover:text-white'
                      }`}
                      title="Afficher les logs de cette campagne"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Logs
                    </button>

                    {/* Pause/Play (Only for non-finished campaigns) */}
                    {!isFinished && (
                      <button
                        onClick={() => handleToggleStatus(camp)}
                        className={`p-1.5 rounded text-white transition-colors ${
                          isActive ? 'bg-yellow-600 hover:bg-yellow-500' : 'bg-green-600 hover:bg-green-500'
                        }`}
                        title={isActive ? "Suspendre la campagne" : "Activer la campagne"}
                      >
                        {isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      </button>
                    )}

                    {/* Delete */}
                    <button
                      onClick={() => handleDeleteCampagne(camp.id)}
                      className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                      title="Supprimer la campagne"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* DETAILED ENVOIS LOG TABLE */}
      <div className="bg-[#1E2235] rounded-xl border border-[#2D3250] shadow-lg overflow-hidden">
        <div className="p-5 border-b border-[#2D3250] flex justify-between items-center bg-[#1A1D2D]">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">
              Historique des Envois API {selectedLogCamp ? `(Campagne filtrée)` : ""}
            </h3>
            <p className="text-gray-400 text-xs">Journaux bruts des requêtes envoyées aux API SMSLab et Green API.</p>
          </div>
          {selectedLogCamp && (
            <button 
              onClick={() => setSelectedLogCamp(null)}
              className="text-xs font-semibold text-violet-400 hover:text-violet-300 flex items-center gap-1"
            >
              Effacer le filtre <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#2D3250] bg-[#131520] text-xs font-semibold uppercase text-gray-400">
                <th className="px-5 py-3">Canal</th>
                <th className="px-5 py-3">Prospect / Cible</th>
                <th className="px-5 py-3">Type Envoi</th>
                <th className="px-5 py-3">Contenu Message</th>
                <th className="px-5 py-3 font-mono">Date (UTC)</th>
                <th className="px-5 py-3">Statut API</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#252A42] text-xs">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-gray-500 italic">
                    Aucun envoi répertorié.
                  </td>
                </tr>
              ) : (
                filteredLogs.slice(-40).reverse().map((log) => {
                  const isSms = log.canal === 'sms';
                  return (
                    <tr key={log.id} className="hover:bg-[#131520]/20 transition-colors">
                      
                      <td className="px-5 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 font-semibold ${isSms ? 'text-orange-400' : 'text-green-400'}`}>
                          {isSms ? <><Smartphone className="w-3 h-3" /> SMS</> : <><MessageSquare className="w-3 h-3" /> WhatsApp</>}
                        </span>
                      </td>

                      <td className="px-5 py-3 font-semibold text-white whitespace-nowrap">
                        {log.contact_entreprise || "Envoi Groupé"}
                        {log.numeros_batch && <span className="block text-[10px] font-mono text-gray-500 font-normal">{log.numeros_batch}</span>}
                      </td>

                      <td className="px-5 py-3 capitalize text-gray-400 whitespace-nowrap">
                        {log.type_envoi === 'premier_contact' ? 'Premier Contact' : log.type_envoi.replace('_', ' ')}
                      </td>

                      <td className="px-5 py-3 max-w-xs truncate text-gray-300" title={log.message}>
                        "{log.message}"
                      </td>

                      <td className="px-5 py-3 font-mono text-gray-400 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('fr-FR')}
                      </td>

                      <td className="px-5 py-3 whitespace-nowrap">
                        {log.statut === 'envoye' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
                            <CheckCircle className="w-3 h-3 mr-0.5" /> Succès
                          </span>
                        ) : log.statut === 'hors_whatsapp' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                            <AlertTriangle className="w-3 h-3 mr-0.5" /> Hors WhatsApp
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                            <AlertTriangle className="w-3 h-3 mr-0.5" /> Échec
                          </span>
                        )}
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
