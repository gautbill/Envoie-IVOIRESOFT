import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Smartphone, 
  MessageSquare, 
  MoreVertical, 
  Eye, 
  Edit, 
  Trash2, 
  Upload, 
  Database,
  X,
  Check,
  Calendar,
  Zap,
  ArrowUpDown,
  FileSpreadsheet
} from 'lucide-react';
import { Contact } from '../types';

interface ContactsProps {
  contacts: Contact[];
  onRefresh: () => void;
  config: any;
}

export default function Contacts({ contacts, onRefresh, config }: ContactsProps) {
  // Filters & State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedActivity, setSelectedActivity] = useState('All');
  const [selectedSmsStatus, setSelectedSmsStatus] = useState('All');
  const [selectedWaStatus, setSelectedWaStatus] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeContact, setActiveContact] = useState<Contact | null>(null);

  // Instant action state
  const [isSmsSendOpen, setIsSmsSendOpen] = useState(false);
  const [customSmsText, setCustomSmsText] = useState("Bonjour, IvoireSoft CI vous accompagne dans la digitalisation de votre entreprise. Contactez-nous au +225 0769999998 !");
  const [sendingInstant, setSendingInstant] = useState(false);

  // Form State for Add / Edit
  const [formCompany, setFormCompany] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formActivity, setFormActivity] = useState('Restaurants');
  const [formCanal, setFormCanal] = useState<'sms' | 'whatsapp' | 'les_deux'>('les_deux');

  // CSV paste state
  const [csvText, setCsvText] = useState('');
  const [importing, setImporting] = useState(false);

  // Get distinct activities for filters
  const activities = useMemo(() => {
    const list = new Set(contacts.map(c => c.activite));
    return ['All', ...Array.from(list)];
  }, [contacts]);

  // Handle manual contact creation
  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCompany || !formPhone || !formActivity) return;

    try {
      const response = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entreprise: formCompany,
          telephone: formPhone,
          activite: formActivity,
          canal_actif: formCanal,
        }),
      });

      if (response.ok) {
        setIsAddModalOpen(false);
        resetForm();
        onRefresh();
      } else {
        const err = await response.json();
        alert(`Erreur: ${err.error}`);
      }
    } catch (e) {
      alert("Erreur lors de l'ajout du contact");
    }
  };

  // Reset form
  const resetForm = () => {
    setFormCompany('');
    setFormPhone('');
    setFormActivity('Restaurants');
    setFormCanal('les_deux');
  };

  // Delete contact
  const handleDeleteContact = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce contact ?")) return;
    try {
      const res = await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        onRefresh();
        if (activeContact?.id === id) setIsDetailModalOpen(false);
      }
    } catch (e) {
      alert("Erreur de suppression");
    }
  };

  // Trigger Google Sheet Import
  const handleGoogleSheetsImport = async () => {
    setImporting(true);
    try {
      const res = await fetch('/api/contacts/import-sheets', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        alert(`${data.message}\nContacts importés: ${data.stats.imported}\nMis à jour: ${data.stats.updated}`);
        onRefresh();
      } else {
        alert(`Erreur: ${data.error}`);
      }
    } catch (e) {
      alert("Erreur lors de la synchronisation Google Sheets");
    } finally {
      setImporting(false);
    }
  };

  // Trigger CSV text import
  const handleCsvImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvText.trim()) return;

    setImporting(true);
    try {
      const res = await fetch('/api/contacts/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`${data.message}\nContacts importés: ${data.stats.imported}\nMis à jour: ${data.stats.updated}`);
        setIsCsvModalOpen(false);
        setCsvText('');
        onRefresh();
      } else {
        alert(`Erreur: ${data.error}`);
      }
    } catch (err) {
      alert("Erreur d'importation CSV");
    } finally {
      setImporting(false);
    }
  };

  // Time-machine debugging helper: Advance last WA sent date by 3 days
  const handleTimeMachine = async (id: string) => {
    try {
      const response = await fetch(`/api/contacts/${id}/advance-time-relance`, { method: 'POST' });
      const data = await response.json();
      alert(data.message);
      onRefresh();
      if (activeContact?.id === id) {
        setActiveContact(data.contact);
      }
    } catch (err) {
      alert("Erreur lors de la simulation de relance");
    }
  };

  // Send Single SMS immediately
  const handleSendSmsNow = async () => {
    if (!activeContact) return;
    setSendingInstant(true);
    try {
      const response = await fetch(`/api/contacts/${activeContact.id}/send-sms-now`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: customSmsText }),
      });
      const data = await response.json();
      if (response.ok) {
        alert(data.message);
        setIsSmsSendOpen(false);
        onRefresh();
      } else {
        alert(`Erreur: ${data.error}`);
      }
    } catch (err) {
      alert("Erreur lors de l'envoi du SMS");
    } finally {
      setSendingInstant(false);
    }
  };

  // Send Single WhatsApp (generated dynamically) immediately
  const handleSendWaNow = async (contact: Contact) => {
    if (!confirm(`Générer par IA et envoyer un WhatsApp à "${contact.entreprise}" immédiatement ?`)) return;
    setSendingInstant(true);
    try {
      const response = await fetch(`/api/contacts/${contact.id}/send-wa-now`, { method: 'POST' });
      const data = await response.json();
      if (response.ok) {
        alert(`${data.message}\n\nMessage envoyé:\n${data.text}`);
        onRefresh();
      } else {
        alert(`Erreur: ${data.error}`);
      }
    } catch (err) {
      alert("Erreur d'envoi WhatsApp");
    } finally {
      setSendingInstant(false);
    }
  };

  // Filter contacts
  const filteredContacts = useMemo(() => {
    return contacts.filter(c => {
      const matchesSearch = 
        c.entreprise.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.telephone.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.activite.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesActivity = selectedActivity === 'All' || c.activite === selectedActivity;
      const matchesSms = selectedSmsStatus === 'All' || c.statut_sms === selectedSmsStatus;
      const matchesWa = selectedWaStatus === 'All' || c.statut_wa === selectedWaStatus;

      return matchesSearch && matchesActivity && matchesSms && matchesWa;
    });
  }, [contacts, searchTerm, selectedActivity, selectedSmsStatus, selectedWaStatus]);

  // Paginated contacts
  const paginatedContacts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredContacts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredContacts, currentPage]);

  const totalPages = Math.ceil(filteredContacts.length / itemsPerPage) || 1;

  // View contact modal helper
  const openDetailModal = (contact: Contact) => {
    setActiveContact(contact);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER ACTION ROAD */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white uppercase font-mono tracking-wider">Contacts Prospection</h1>
          <p className="text-white/45 text-xs font-mono">Index général et état des relances par lead</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          
          <button
            onClick={handleGoogleSheetsImport}
            disabled={importing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#122A1E] hover:bg-[#1A3D2B] text-green-400 border border-green-500/20 hover:border-green-500/40 rounded text-xs font-bold transition-all cursor-pointer font-mono"
          >
            <Database className="w-3.5 h-3.5" />
            {importing ? "SYNC EN COURS..." : "SYNC GOOGLE SHEETS"}
          </button>

          <button
            onClick={() => setIsCsvModalOpen(true)}
            disabled={importing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0F121D] hover:bg-white/5 text-white/70 border border-white/10 rounded text-xs font-bold transition-all cursor-pointer font-mono"
          >
            <Upload className="w-3.5 h-3.5" />
            COLLER UN CSV
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-500 hover:bg-blue-400 text-black rounded text-xs font-bold transition-all cursor-pointer shadow-md font-mono"
          >
            <Plus className="w-3.5 h-3.5 text-black" />
            NOUVEAU CONTACT
          </button>

        </div>
      </div>

      {/* FILTER PANEL */}
      <div className="bg-[#0F121D]/90 rounded-xl p-4 border border-white/5 shadow-lg grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 backdrop-blur-md">
        
        {/* Search Input */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-white/45">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Entreprise, téléphone, tag..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full bg-[#08090D] border border-white/10 rounded px-3 pl-9 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors font-mono"
          />
        </div>

        {/* Activity Select */}
        <div>
          <select
            value={selectedActivity}
            onChange={(e) => { setSelectedActivity(e.target.value); setCurrentPage(1); }}
            className="w-full bg-[#08090D] border border-white/10 rounded px-3 py-1.5 text-xs text-white/80 focus:outline-none focus:border-blue-500 transition-colors font-mono"
          >
            <option value="All">Toutes les activités (Tout)</option>
            {activities.filter(a => a !== 'All').map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>

        {/* SMS Status Filter */}
        <div>
          <select
            value={selectedSmsStatus}
            onChange={(e) => { setSelectedSmsStatus(e.target.value); setCurrentPage(1); }}
            className="w-full bg-[#08090D] border border-white/10 rounded px-3 py-1.5 text-xs text-white/80 focus:outline-none focus:border-blue-500 transition-colors font-mono"
          >
            <option value="All">Statut SMS (Tous)</option>
            <option value="nouveau">Nouveau</option>
            <option value="envoye">Envoyé</option>
            <option value="erreur">Erreur</option>
          </select>
        </div>

        {/* WA Status Filter */}
        <div>
          <select
            value={selectedWaStatus}
            onChange={(e) => { setSelectedWaStatus(e.target.value); setCurrentPage(1); }}
            className="w-full bg-[#08090D] border border-white/10 rounded px-3 py-1.5 text-xs text-white/80 focus:outline-none focus:border-blue-500 transition-colors font-mono"
          >
            <option value="All">Statut WhatsApp (Tous)</option>
            <option value="nouveau">Nouveau</option>
            <option value="envoye">Premier contact envoyé</option>
            <option value="relance_1">Relance 1 (J+3)</option>
            <option value="relance_2">Relance 2 (J+6)</option>
            <option value="relance_3">Relance 3 (J+9)</option>
            <option value="termine">Cycle terminé</option>
            <option value="hors_whatsapp">Hors WhatsApp</option>
            <option value="erreur">Erreur d'envoi</option>
          </select>
        </div>

      </div>

      {/* TABLE LIST VIEW */}
      <div className="bg-[#0F121D]/90 rounded-xl border border-white/5 shadow-lg overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-[#08090D] text-[10px] font-bold uppercase tracking-wider text-white/50 font-mono">
                <th className="px-5 py-3.5">Entreprise</th>
                <th className="px-5 py-3.5">Téléphone</th>
                <th className="px-5 py-3.5">Activité</th>
                <th className="px-5 py-3.5">Canal SMS</th>
                <th className="px-5 py-3.5">Canal WhatsApp</th>
                <th className="px-5 py-3.5">Dernier Envoi</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {paginatedContacts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-gray-500">
                    Aucun prospect ne correspond aux filtres appliqués.
                  </td>
                </tr>
              ) : (
                paginatedContacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-white/[2%] transition-colors group">
                    
                    {/* Company */}
                    <td className="px-5 py-3 font-bold text-white">
                      {contact.entreprise}
                    </td>
                    
                    {/* Telephone */}
                    <td className="px-5 py-3 font-mono text-white/70">
                      {contact.telephone}
                    </td>

                    {/* Activity */}
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-[#08090D] text-white/60 border border-white/5">
                        {contact.activite}
                      </span>
                    </td>

                    {/* SMS Status */}
                    <td className="px-5 py-3 font-mono text-[10px] font-bold">
                      {contact.statut_sms === 'nouveau' && (
                        <span className="text-white/40 flex items-center gap-1">⚫ NOUVEAU</span>
                      )}
                      {contact.statut_sms === 'envoye' && (
                        <span className="text-orange-400 flex items-center gap-1">📤 ENVOYÉ</span>
                      )}
                      {contact.statut_sms === 'erreur' && (
                        <span className="text-red-400 flex items-center gap-1">⚠️ ERREUR</span>
                      )}
                    </td>

                    {/* WhatsApp Status */}
                    <td className="px-5 py-3 font-mono text-[10px] font-bold">
                      {contact.statut_wa === 'nouveau' && (
                        <span className="text-white/40 flex items-center gap-1">⚫ NOUVEAU</span>
                      )}
                      {contact.statut_wa === 'envoye' && (
                        <span className="text-blue-400 flex items-center gap-1">📤 CONTACTÉ (J+0)</span>
                      )}
                      {contact.statut_wa === 'relance_1' && (
                        <span className="text-yellow-500 flex items-center gap-1">🔄 RELANCE 1</span>
                      )}
                      {contact.statut_wa === 'relance_2' && (
                        <span className="text-orange-400 flex items-center gap-1">🔄 RELANCE 2</span>
                      )}
                      {contact.statut_wa === 'relance_3' && (
                        <span className="text-purple-400 flex items-center gap-1">🔄 RELANCE 3</span>
                      )}
                      {contact.statut_wa === 'termine' && (
                        <span className="text-green-400 flex items-center gap-1">✅ TERMINE</span>
                      )}
                      {contact.statut_wa === 'hors_whatsapp' && (
                        <span className="text-amber-500 flex items-center gap-1">❌ HORS WA</span>
                      )}
                      {contact.statut_wa === 'erreur' && (
                        <span className="text-red-400 flex items-center gap-1">⚠️ ERREUR</span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="px-5 py-3 text-[10px] text-white/50 font-mono">
                      {contact.date_envoi_wa ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-green-400 font-bold">WA: {contact.date_envoi_wa}</span>
                          {contact.date_envoi_sms && <span className="text-orange-400 font-bold">SMS: {contact.date_envoi_sms}</span>}
                        </div>
                      ) : contact.date_envoi_sms ? (
                        <span className="text-orange-400 font-bold">SMS: {contact.date_envoi_sms}</span>
                      ) : (
                        "-"
                      )}
                    </td>

                    {/* ACTIONS */}
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <div className="flex justify-end gap-1.5">
                        
                        <button
                          onClick={() => openDetailModal(contact)}
                          className="p-1.5 bg-[#08090D] hover:bg-white/5 border border-white/5 hover:border-white/10 text-white/50 hover:text-white rounded transition-colors cursor-pointer"
                          title="Historique & Détails"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            setActiveContact(contact);
                            setIsSmsSendOpen(true);
                          }}
                          className="p-1.5 bg-orange-950/20 hover:bg-orange-900/30 text-orange-400 border border-orange-500/10 hover:border-orange-500/20 rounded transition-colors cursor-pointer"
                          title="Envoyer SMS manuel"
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleSendWaNow(contact)}
                          disabled={sendingInstant}
                          className="p-1.5 bg-green-950/20 hover:bg-green-900/30 text-green-400 border border-green-500/10 hover:border-green-500/20 rounded transition-colors disabled:opacity-50 cursor-pointer"
                          title="Envoyer WhatsApp IA"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>

                        {['envoye', 'relance_1', 'relance_2'].includes(contact.statut_wa) && (
                          <button
                            onClick={() => handleTimeMachine(contact.id)}
                            className="p-1.5 bg-blue-950/20 hover:bg-blue-900/30 text-blue-400 border border-blue-500/10 hover:border-blue-500/20 rounded transition-colors cursor-pointer"
                            title="Avancer le temps de 3 jours"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteContact(contact.id)}
                          className="p-1.5 bg-red-950/20 hover:bg-red-900/30 text-red-400 border border-red-500/10 hover:border-red-500/20 rounded transition-colors cursor-pointer"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION PANEL */}
        {totalPages > 1 && (
          <div className="px-5 py-3.5 bg-[#08090D] border-t border-white/5 flex items-center justify-between font-mono">
            <span className="text-[11px] text-white/40">
              INDEX: {paginatedContacts.length} / {filteredContacts.length} prospects
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

      {/* CSV IMPORTER MODAL */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1E2235] w-full max-w-lg rounded-xl border border-[#2D3250] shadow-2xl p-6 overflow-hidden relative">
            <button onClick={() => setIsCsvModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Upload className="w-5 h-5 text-violet-400" />
              Copier-coller des Contacts au format CSV
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              Entrez les informations de vos prospects une ligne par prospect. Les colonnes doivent être séparées par des virgules ou des points-virgules.
              Le format requis est : <code className="text-violet-400">Entreprise, Téléphone, Activité</code>
            </p>
            <form onSubmit={handleCsvImport} className="space-y-4">
              <div>
                <textarea
                  rows={8}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder="Maquis Chez Koffi, +225 0701111111, Restaurants&#10;Construire CI SARL, +225 0505555555, BTP&#10;Prestige Immobilier, +225 0501000001, Agences immobilières"
                  className="w-full bg-[#131520] border border-[#2D3250] rounded-lg p-3 text-sm text-white font-mono focus:outline-none focus:border-violet-500 transition-colors placeholder:text-gray-600 placeholder:text-xs"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCsvModalOpen(false)}
                  className="px-4 py-2 bg-transparent text-gray-400 hover:text-white text-sm"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={importing || !csvText.trim()}
                  className="px-5 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-lg text-sm font-semibold shadow-md disabled:opacity-50 transition-all"
                >
                  {importing ? "Importation en cours..." : "Importer Contacts"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANUAL ADD MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1E2235] w-full max-w-md rounded-xl border border-[#2D3250] p-6 relative shadow-2xl">
            <button onClick={() => setIsAddModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white mb-4">Ajouter un Prospect</h3>
            <form onSubmit={handleAddContact} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase block mb-1">Nom de l'Entreprise</label>
                <input
                  type="text"
                  required
                  value={formCompany}
                  onChange={(e) => setFormCompany(e.target.value)}
                  placeholder="Ex: Ivoire Digital Shop"
                  className="w-full bg-[#131520] border border-[#2D3250] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase block mb-1">Téléphone (+225)</label>
                <input
                  type="text"
                  required
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="Ex: +225 07 00 00 00 00"
                  className="w-full bg-[#131520] border border-[#2D3250] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 uppercase block mb-1">Secteur / Activité</label>
                <select
                  value={formActivity}
                  onChange={(e) => setFormActivity(e.target.value)}
                  className="w-full bg-[#131520] border border-[#2D3250] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors"
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
                <label className="text-xs font-semibold text-gray-400 uppercase block mb-1">Canal Actif</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5 text-xs text-gray-300">
                    <input type="radio" name="canal_actif" checked={formCanal === 'les_deux'} onChange={() => setFormCanal('les_deux')} />
                    Les deux
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-gray-300">
                    <input type="radio" name="canal_actif" checked={formCanal === 'sms'} onChange={() => setFormCanal('sms')} />
                    SMS seul
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-gray-300">
                    <input type="radio" name="canal_actif" checked={formCanal === 'whatsapp'} onChange={() => setFormCanal('whatsapp')} />
                    WhatsApp seul
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-gray-400 text-sm">Annuler</button>
                <button type="submit" className="px-5 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg text-sm font-semibold">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SMS INSTANT SEND MODAL */}
      {isSmsSendOpen && activeContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1E2235] w-full max-w-md rounded-xl border border-[#2D3250] p-6 relative">
            <button onClick={() => setIsSmsSendOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-1.5">
              <Smartphone className="w-5 h-5 text-orange-500" />
              SMS Instantané : {activeContact.entreprise}
            </h3>
            <p className="text-xs text-gray-400 mb-4">Saisissez le message fixe à envoyer immédiatement au numéro {activeContact.telephone}.</p>
            <div className="space-y-4">
              <div>
                <textarea
                  rows={4}
                  value={customSmsText}
                  onChange={(e) => setCustomSmsText(e.target.value)}
                  className="w-full bg-[#131520] border border-[#2D3250] rounded-lg p-3 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors"
                />
                <div className="text-right text-[10px] text-gray-500 mt-1">
                  Caractères : {customSmsText.length}
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setIsSmsSendOpen(false)} className="px-4 py-2 text-gray-400 text-sm">Annuler</button>
                <button
                  onClick={handleSendSmsNow}
                  disabled={sendingInstant}
                  className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                >
                  {sendingInstant ? "Envoi..." : "Envoyer maintenant"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL VIEW MODAL (HISTORIQUE MESSAGES) */}
      {isDetailModalOpen && activeContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1E2235] w-full max-w-2xl rounded-xl border border-[#2D3250] p-6 relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsDetailModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            
            <div className="border-b border-[#2D3250] pb-4 mb-5">
              <h3 className="text-xl font-bold text-white">{activeContact.entreprise}</h3>
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-400 font-mono">
                <span>📞 {activeContact.telephone}</span>
                <span>📁 {activeContact.activite}</span>
                <span>📅 Ajouté le {new Date(activeContact.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="space-y-6">
              
              {/* Statuts Summary */}
              <div className="bg-[#131520] rounded-xl p-4 border border-[#252A42] grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-gray-500 font-medium block">Statut SMS</span>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-sm font-semibold text-white uppercase">
                      {activeContact.statut_sms}
                    </span>
                    {activeContact.date_envoi_sms && (
                      <span className="text-xs text-gray-500">({activeContact.date_envoi_sms})</span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-xs text-gray-500 font-medium block">Statut WhatsApp</span>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-sm font-semibold text-white uppercase">
                      {activeContact.statut_wa.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-gray-400 bg-[#1E2235] px-1.5 py-0.5 rounded border border-[#2D3250] font-mono">
                      Relances: {activeContact.nb_relances}/3
                    </span>
                  </div>
                  {activeContact.date_envoi_wa && (
                    <span className="text-[11px] text-gray-500 mt-1 block">Dernier envoi : {activeContact.date_envoi_wa}</span>
                  )}
                </div>
              </div>

              {/* Debug helpers inside detail modal */}
              <div className="bg-violet-950/20 border border-violet-500/10 rounded-lg p-3 flex justify-between items-center">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-violet-400 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5" />
                    Console de simulation temporelle (Debug)
                  </span>
                  <p className="text-[10px] text-gray-400">Pour tester le cron-relances sans attendre 3 jours, reculez la date d'envoi de WhatsApp.</p>
                </div>
                <button
                  onClick={() => handleTimeMachine(activeContact.id)}
                  disabled={!['envoye', 'relance_1', 'relance_2'].includes(activeContact.statut_wa)}
                  className="px-3 py-1 bg-violet-600 hover:bg-violet-500 text-white rounded text-xs font-semibold transition-colors disabled:opacity-30"
                >
                  Reculer date de 3j
                </button>
              </div>

              {/* Messages History */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Historique de communication</h4>
                
                {/* SMS communication */}
                {activeContact.message_sms && (
                  <div className="bg-[#131520] rounded-xl p-4 border-l-4 border-orange-500 border-y border-r border-[#2D3250]">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-orange-400 font-semibold flex items-center gap-1">
                        <Smartphone className="w-3.5 h-3.5" />
                        Message SMS (Saisi Fixe)
                      </span>
                      <span className="text-[10px] text-gray-500 font-mono">{activeContact.date_envoi_sms}</span>
                    </div>
                    <p className="text-xs text-gray-300 font-mono bg-[#1E2235]/40 p-2.5 rounded border border-[#252A42]">
                      {activeContact.message_sms}
                    </p>
                  </div>
                )}

                {/* WA communications */}
                {activeContact.message_wa && (
                  <div className="bg-[#131520] rounded-xl p-4 border-l-4 border-green-500 border-y border-r border-[#2D3250]">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-green-400 font-semibold flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5" />
                        WhatsApp Premier Contact (Généré par IA ✨)
                      </span>
                      <span className="text-[10px] text-gray-500 font-mono">Date de départ</span>
                    </div>
                    <p className="text-xs text-gray-300 whitespace-pre-line bg-[#1E2235]/40 p-2.5 rounded border border-[#252A42]">
                      {activeContact.message_wa}
                    </p>
                  </div>
                )}

                {activeContact.relance1_wa && (
                  <div className="bg-[#131520] rounded-xl p-4 border-l-4 border-yellow-500 border-y border-r border-[#2D3250]">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-yellow-500 font-semibold flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5" />
                        WhatsApp Relance 1 (Rappel doux par IA ✨)
                      </span>
                    </div>
                    <p className="text-xs text-gray-300 whitespace-pre-line bg-[#1E2235]/40 p-2.5 rounded border border-[#252A42]">
                      {activeContact.relance1_wa}
                    </p>
                  </div>
                )}

                {activeContact.relance2_wa && (
                  <div className="bg-[#131520] rounded-xl p-4 border-l-4 border-amber-600 border-y border-r border-[#2D3250]">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-amber-600 font-semibold flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5" />
                        WhatsApp Relance 2 (Urgence / Preuve sociale par IA ✨)
                      </span>
                    </div>
                    <p className="text-xs text-gray-300 whitespace-pre-line bg-[#1E2235]/40 p-2.5 rounded border border-[#252A42]">
                      {activeContact.relance2_wa}
                    </p>
                  </div>
                )}

                {activeContact.relance3_wa && (
                  <div className="bg-[#131520] rounded-xl p-4 border-l-4 border-purple-400 border-y border-r border-[#2D3250]">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-purple-400 font-semibold flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5" />
                        WhatsApp Relance 3 (Dernier contact par IA ✨)
                      </span>
                    </div>
                    <p className="text-xs text-gray-300 whitespace-pre-line bg-[#1E2235]/40 p-2.5 rounded border border-[#252A42]">
                      {activeContact.relance3_wa}
                    </p>
                  </div>
                )}

                {!activeContact.message_sms && !activeContact.message_wa && (
                  <div className="text-center py-6 text-gray-500 text-xs italic">
                    Aucune communication n'a encore été envoyée à ce prospect.
                  </div>
                )}

              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
