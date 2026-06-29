import React, { useMemo } from 'react';
import { 
  BarChart, 
  PieChart, 
  TrendingUp, 
  Smartphone, 
  MessageSquare, 
  CheckCircle, 
  AlertTriangle, 
  Sparkles,
  Award,
  Zap,
  Users
} from 'lucide-react';
import { Contact, EnvoisLog } from '../types';

interface StatistiquesProps {
  contacts: Contact[];
  logs: EnvoisLog[];
}

export default function Statistiques({ contacts, logs }: StatistiquesProps) {
  
  // Calculate visual metrics
  const metrics = useMemo(() => {
    const totalLogs = logs.length;
    const smsLogs = logs.filter(l => l.canal === 'sms');
    const waLogs = logs.filter(l => l.canal === 'whatsapp');

    const smsSuccess = smsLogs.filter(l => l.statut === 'envoye').length;
    const smsFailed = smsLogs.filter(l => l.statut === 'erreur').length;

    const waSuccess = waLogs.filter(l => l.statut === 'envoye').length;
    const waFailed = waLogs.filter(l => l.statut === 'erreur').length;
    const waNotRegistered = waLogs.filter(l => l.statut === 'hors_whatsapp').length;

    // Success Rates
    const smsRate = smsLogs.length > 0 ? Math.round((smsSuccess / smsLogs.length) * 100) : 100;
    const waRate = waLogs.length > 0 ? Math.round((waSuccess / waLogs.length) * 100) : 100;

    // Contact Conversion
    const totalContacts = contacts.length;
    const contactsContacted = contacts.filter(c => c.statut_sms === 'envoye' || c.statut_wa !== 'nouveau').length;
    const contactRate = totalContacts > 0 ? Math.round((contactsContacted / totalContacts) * 100) : 0;

    // Sectors Performance
    const sectorStats: { [key: string]: { total: number, contacted: number } } = {};
    contacts.forEach(c => {
      if (!sectorStats[c.activite]) {
        sectorStats[c.activite] = { total: 0, contacted: 0 };
      }
      sectorStats[c.activite].total++;
      if (c.statut_sms === 'envoye' || c.statut_wa !== 'nouveau') {
        sectorStats[c.activite].contacted++;
      }
    });

    const sectorsArray = Object.keys(sectorStats).map(name => ({
      name,
      total: sectorStats[name].total,
      contacted: sectorStats[name].contacted,
      percent: Math.round((sectorStats[name].contacted / sectorStats[name].total) * 100) || 0
    })).sort((a, b) => b.percent - a.percent);

    return {
      totalLogs,
      smsTotal: smsLogs.length,
      smsSuccess,
      smsFailed,
      smsRate,
      waTotal: waLogs.length,
      waSuccess,
      waFailed,
      waNotRegistered,
      waRate,
      totalContacts,
      contactsContacted,
      contactRate,
      sectorsArray,
    };
  }, [contacts, logs]);

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div>
        <h1 className="text-2xl font-bold text-white">Analytique & Statistiques</h1>
        <p className="text-gray-400 text-sm">Visualisez les performances d'envoi et les taux d'engagement de vos campagnes.</p>
      </div>

      {/* METRIC ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Taux de pénétration base */}
        <div className="bg-[#1E2235] p-5 rounded-xl border border-[#2D3250] shadow-lg relative overflow-hidden flex flex-col justify-between h-36">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs text-gray-400 font-medium uppercase">Taux de Pénétration</span>
              <h3 className="text-2xl font-bold text-white font-mono">{metrics.contactRate}%</h3>
            </div>
            <div className="p-2 bg-violet-500/10 text-violet-500 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-gray-400 font-sans">{metrics.contactsContacted} prospects contactés sur {metrics.totalContacts} au total.</p>
          <div className="w-full bg-[#131520] h-1.5 rounded-full overflow-hidden">
            <div className="bg-violet-500 h-full" style={{ width: `${metrics.contactRate}%` }} />
          </div>
        </div>

        {/* Délivrabilité SMS */}
        <div className="bg-[#1E2235] p-5 rounded-xl border border-[#2D3250] shadow-lg relative overflow-hidden flex flex-col justify-between h-36">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs text-gray-400 font-medium uppercase">Délivrabilité SMS</span>
              <h3 className="text-2xl font-bold text-white font-mono">{metrics.smsRate}%</h3>
            </div>
            <div className="p-2 bg-orange-500/10 text-orange-500 rounded-lg">
              <Smartphone className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-gray-400 font-sans">{metrics.smsSuccess} SMS délivrés avec succès, {metrics.smsFailed} échecs.</p>
          <div className="w-full bg-[#131520] h-1.5 rounded-full overflow-hidden">
            <div className="bg-orange-500 h-full" style={{ width: `${metrics.smsRate}%` }} />
          </div>
        </div>

        {/* Délivrabilité WhatsApp */}
        <div className="bg-[#1E2235] p-5 rounded-xl border border-[#2D3250] shadow-lg relative overflow-hidden flex flex-col justify-between h-36">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs text-gray-400 font-medium uppercase">Succès d'envoi WA</span>
              <h3 className="text-2xl font-bold text-white font-mono">{metrics.waRate}%</h3>
            </div>
            <div className="p-2 bg-green-500/10 text-green-500 rounded-lg">
              <MessageSquare className="w-5 h-5" />
            </div>
          </div>
          <p className="text-xs text-gray-400 font-sans">{metrics.waSuccess} WA envoyés, {metrics.waNotRegistered} hors-WA, {metrics.waFailed} erreurs.</p>
          <div className="w-full bg-[#131520] h-1.5 rounded-full overflow-hidden">
            <div className="bg-green-500 h-full" style={{ width: `${metrics.waRate}%` }} />
          </div>
        </div>

      </div>

      {/* DETAILED CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Sectors performance list */}
        <div className="bg-[#1E2235] rounded-xl p-5 border border-[#2D3250] shadow-lg">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-1.5">
            <Award className="w-5 h-5 text-violet-400" />
            Taux de contact par Secteur d'activité
          </h3>
          
          <div className="space-y-4 max-h-[320px] overflow-y-auto pr-2">
            {metrics.sectorsArray.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">
                Aucun secteur répertorié.
              </div>
            ) : (
              metrics.sectorsArray.map((sector, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-gray-300">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-violet-500" />
                      {sector.name}
                    </span>
                    <span className="font-mono">{sector.percent}% <span className="text-gray-500 font-normal">({sector.contacted}/{sector.total})</span></span>
                  </div>
                  <div className="w-full bg-[#131520] h-3 rounded-full overflow-hidden border border-[#252A42] flex">
                    <div 
                      className="bg-gradient-to-r from-violet-600 to-indigo-500 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${sector.percent}%` }} 
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Global summary breakdown */}
        <div className="bg-[#1E2235] rounded-xl p-5 border border-[#2D3250] shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-1.5">
              <Zap className="w-5 h-5 text-green-400" />
              Répartition globale des communications
            </h3>

            <div className="space-y-4 font-mono text-xs">
              
              {/* SMS success */}
              <div className="bg-[#131520] p-3 rounded-lg border border-[#252A42] flex justify-between items-center">
                <span className="text-gray-400 font-semibold flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-orange-500" />
                  SMS Délivrés avec succès
                </span>
                <span className="text-white font-bold">{metrics.smsSuccess}</span>
              </div>

              {/* WA success */}
              <div className="bg-[#131520] p-3 rounded-lg border border-[#252A42] flex justify-between items-center">
                <span className="text-gray-400 font-semibold flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-green-500" />
                  WhatsApp Délivrés (avec IA ✨)
                </span>
                <span className="text-white font-bold">{metrics.waSuccess}</span>
              </div>

              {/* WA hors whatsapp */}
              <div className="bg-[#131520] p-3 rounded-lg border border-[#252A42] flex justify-between items-center">
                <span className="text-gray-400 font-semibold flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-yellow-500" />
                  Numéros non inscrits WhatsApp
                </span>
                <span className="text-white font-bold">{metrics.waNotRegistered}</span>
              </div>

              {/* General errors */}
              <div className="bg-[#131520] p-3 rounded-lg border border-[#252A42] flex justify-between items-center">
                <span className="text-gray-400 font-semibold flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-red-500" />
                  Échecs de livraison API (SMS + WA)
                </span>
                <span className="text-white font-bold">{metrics.smsFailed + metrics.waFailed}</span>
              </div>

            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#2D3250] bg-violet-950/15 p-3 rounded-lg border border-violet-500/10 flex items-center gap-2.5 text-xs text-gray-400">
            <Sparkles className="w-5 h-5 text-violet-400 shrink-0" />
            <span>Les relances automatiques à J+3, J+6 et J+9 multiplient par 2,8 le taux de réponse moyen par rapport à un envoi unique !</span>
          </div>
        </div>

      </div>

    </div>
  );
}
