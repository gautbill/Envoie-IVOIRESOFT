import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  TrendingUp,
  Award,
  DollarSign,
  Briefcase,
  Search,
  Plus,
  Download,
  Upload,
  Sparkles,
  LayoutGrid,
  List,
  Edit2,
  Trash2,
  Phone,
  MessageSquare,
  X,
  Shield,
  Check,
  AlertCircle,
  Brain,
  ChevronRight,
  User,
  Users,
  Activity,
  ArrowRight,
  FileSpreadsheet,
  ArrowUpDown
} from 'lucide-react';
import { Contact, AppConfig } from '../types';

interface CRMProps {
  contacts: Contact[];
  config: AppConfig | null;
  onRefresh: () => void;
  setActiveTab: (tab: string) => void;
}

const STAGES = [
  { id: 'nouveau', label: 'Nouveau', color: 'border-blue-500/30 text-blue-400 bg-blue-500/5' },
  { id: 'contacte', label: 'Contacté', color: 'border-indigo-500/30 text-indigo-400 bg-indigo-500/5' },
  { id: 'discussion', label: 'En Discussion', color: 'border-yellow-500/30 text-yellow-400 bg-yellow-500/5' },
  { id: 'proposition', label: 'Proposition Envoyée', color: 'border-purple-500/30 text-purple-400 bg-purple-500/5' },
  { id: 'gagne', label: 'Gagné', color: 'border-green-500/30 text-green-400 bg-green-500/5' },
  { id: 'perdu', label: 'Perdu', color: 'border-red-500/30 text-red-400 bg-red-500/5' }
] as const;

type StageId = typeof STAGES[number]['id'];

export default function CRM({ contacts, config, onRefresh, setActiveTab }: CRMProps) {
  // State variables
  const [viewType, setViewType] = useState<'kanban' | 'list'>('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedActivity, setSelectedActivity] = useState('All');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // CRM Sorting state
  const [crmSortBy, setCrmSortBy] = useState<'entreprise' | 'crm_valeur' | 'created_at'>('entreprise');
  const [crmSortOrder, setCrmSortOrder] = useState<'asc' | 'desc'>('asc');

  // IA Loading states
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  // Form states for New Lead
  const [newLead, setNewLead] = useState({
    entreprise: '',
    telephone: '',
    activite: 'Restaurants',
    crm_valeur: 0,
    crm_notes: '',
    canal_actif: 'whatsapp' as 'sms' | 'whatsapp' | 'les_deux'
  });

  // Edit fields for active contact
  const [editNotes, setEditNotes] = useState('');
  const [editValeur, setEditValeur] = useState(0);
  const [editEtape, setEditEtape] = useState<StageId>('nouveau');

  // CRM Import from Base Contacts state
  const [importing, setImporting] = useState(false);
  const [importSearchTerm, setImportSearchTerm] = useState('');
  const [selectedImportIds, setSelectedImportIds] = useState<string[]>([]);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [importStats, setImportStats] = useState<{ imported: number; total: number } | null>(null);

  // Helpers
  const formatFCFA = (val: number | undefined) => {
    if (val === undefined) return '0 F';
    return new Intl.NumberFormat('fr-FR').format(val) + ' FCFA';
  };

  // Filter and sort CRM contacts
  const filteredSortedContacts = useMemo(() => {
    const list = contacts.filter(c => {
      // Must be in CRM (has a valid crm_etape)
      if (!c.crm_etape) return false;

      const matchesSearch =
        c.entreprise.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.telephone.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.activite.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesActivity = selectedActivity === 'All' || c.activite === selectedActivity;

      return matchesSearch && matchesActivity;
    });

    return list.sort((a, b) => {
      let comparison = 0;
      if (crmSortBy === 'entreprise') {
        comparison = a.entreprise.localeCompare(b.entreprise, 'fr', { sensitivity: 'base' });
      } else if (crmSortBy === 'crm_valeur') {
        comparison = (a.crm_valeur || 0) - (b.crm_valeur || 0);
      } else if (crmSortBy === 'created_at') {
        comparison = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      }
      return crmSortOrder === 'asc' ? comparison : -comparison;
    });
  }, [contacts, searchTerm, selectedActivity, crmSortBy, crmSortOrder]);

  const getStageContacts = (stage: StageId) => {
    return filteredSortedContacts.filter(c => {
      const cStage = c.crm_etape || 'nouveau';
      return cStage === stage;
    });
  };

  const handleCrmSort = (field: 'entreprise' | 'crm_valeur' | 'created_at') => {
    if (crmSortBy === field) {
      setCrmSortOrder(crmSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setCrmSortBy(field);
      setCrmSortOrder('asc');
    }
  };

  // Drag and drop mechanics
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, stage: StageId) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (id) {
      handleMoveStage(id, stage);
    }
  };

  // Backend state updates
  const handleMoveStage = async (id: string, stage: StageId) => {
    try {
      const res = await fetch(`/api/contacts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ crm_etape: stage })
      });
      if (res.ok) {
        onRefresh();
      } else {
        alert("Erreur lors de la mise à jour de l'étape");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveDetails = async (contact: Contact) => {
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          crm_notes: editNotes,
          crm_valeur: Number(editValeur),
          crm_etape: editEtape
        })
      });
      if (res.ok) {
        setIsDetailModalOpen(false);
        onRefresh();
      } else {
        alert("Erreur lors de l'enregistrement");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Create new lead
  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLead.entreprise || !newLead.telephone) {
      alert("Veuillez remplir les champs obligatoires");
      return;
    }
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newLead,
          crm_etape: 'nouveau',
        })
      });
      if (res.ok) {
        const created = await res.json();
        // Now update optional crm fields since POST creates standard contact
        await fetch(`/api/contacts/${created.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            crm_valeur: Number(newLead.crm_valeur),
            crm_notes: newLead.crm_notes,
            crm_etape: 'nouveau'
          })
        });
        setIsCreateModalOpen(false);
        setNewLead({
          entreprise: '',
          telephone: '',
          activite: 'Restaurants',
          crm_valeur: 0,
          crm_notes: '',
          canal_actif: 'whatsapp'
        });
        onRefresh();
      } else {
        alert("Erreur de création du prospect");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Run Gemini AI Analysis
  const handleAnalyzeIA = async (contact: Contact) => {
    setAnalyzingId(contact.id);
    try {
      // Save current edits first to make sure Gemini has the latest values
      await fetch(`/api/contacts/${contact.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          crm_notes: editNotes,
          crm_valeur: Number(editValeur),
          crm_etape: editEtape
        })
      });

      const res = await fetch(`/api/contacts/${contact.id}/analyze-crm`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedContact(data);
        // Sync local states
        setEditNotes(data.crm_notes || '');
        setEditValeur(data.crm_valeur || 0);
        setEditEtape(data.crm_etape || 'nouveau');
      } else {
        alert("Une erreur est survenue lors de l'analyse IA. Vérifiez votre clé d'API.");
      }
    } catch (err) {
      console.error(err);
      alert("Impossible de joindre le service d'intelligence artificielle.");
    } finally {
      setAnalyzingId(null);
    }
  };

  // Delete Contact
  const handleDeleteContact = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer ce prospect de la base de données ?")) return;
    try {
      const res = await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setIsDetailModalOpen(false);
        onRefresh();
      } else {
        alert("Erreur de suppression");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Entreprise', 'Telephone', 'Secteur', 'Canal Actif', 'Etape CRM', 'Valeur Estimée', 'Notes CRM', 'Score IA'];
    const rows = contacts.map(c => [
      c.entreprise,
      c.telephone,
      c.activite,
      c.canal_actif,
      c.crm_etape || 'nouveau',
      c.crm_valeur || 0,
      (c.crm_notes || '').replace(/\n/g, ' '),
      c.crm_score_ia || ''
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `crm_pipeline_ivoiresoft_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CRM Automatic Import from Base Contacts
  const handleAutoCrmImport = async () => {
    const importableIds = contacts.filter(c => !c.crm_etape).map(c => c.id);
    
    setIsImportModalOpen(true);
    setImporting(true);
    setProgressPercent(10);
    setImportStats(null);

    if (importableIds.length === 0) {
      // Smooth progress update for immediate feedback
      setTimeout(() => {
        setProgressPercent(100);
        setImportStats({
          imported: 0,
          total: 0
        });
        setImporting(false);
      }, 600);
      return;
    }

    try {
      setProgressPercent(45);
      const res = await fetch('/api/contacts/bulk-crm-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: importableIds })
      });

      setProgressPercent(85);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Une erreur est survenue lors de l'importation automatique.");
      }

      const resData = await res.json();
      setProgressPercent(100);
      setImportStats({
        imported: resData.stats?.imported || 0,
        total: importableIds.length
      });
      onRefresh();
    } catch (err: any) {
      alert("Erreur lors de l'importation automatique : " + err.message);
      setIsImportModalOpen(false);
    } finally {
      setImporting(false);
    }
  };

  // Calculate Pipeline statistics
  const crmContactsOnly = contacts.filter(c => !!c.crm_etape);
  const totalValue = crmContactsOnly.reduce((sum, c) => sum + (c.crm_valeur || 0), 0);
  const activeLeadsCount = crmContactsOnly.filter(c => ['nouveau', 'contacte', 'discussion', 'proposition'].includes(c.crm_etape)).length;
  const wonCount = crmContactsOnly.filter(c => c.crm_etape === 'gagne').length;
  const lostCount = crmContactsOnly.filter(c => c.crm_etape === 'perdu').length;
  const wonValue = crmContactsOnly.filter(c => c.crm_etape === 'gagne').reduce((sum, c) => sum + (c.crm_valeur || 0), 0);
  
  const totalClosed = wonCount + lostCount;
  const winRate = totalClosed > 0 ? Math.round((wonCount / totalClosed) * 100) : 0;
  const averageDeal = crmContactsOnly.length > 0 ? Math.round(totalValue / crmContactsOnly.length) : 0;

  // Sectors for selector
  const activitiesList = Array.from(new Set(contacts.map(c => c.activite))).filter(Boolean);

  return (
    <div className="space-y-6">

      {/* HEADER WITH CONTROLS */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <h1 className="text-xl font-bold text-white uppercase font-mono tracking-wider">Pipeline commercial CRM</h1>
          <p className="text-white/45 text-xs font-mono">Suivez vos opportunités de vente, qualifiez les leads et optimisez vos deals grâce à l'IA</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center bg-[#08090D] p-1 rounded-lg border border-white/5">
            <button
              onClick={() => setViewType('kanban')}
              className={`p-1.5 rounded transition-all ${
                viewType === 'kanban' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-white/40 hover:text-white'
              }`}
              title="Vue Kanban"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewType('list')}
              className={`p-1.5 rounded transition-all ${
                viewType === 'list' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-white/40 hover:text-white'
              }`}
              title="Vue Liste"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold transition-all cursor-pointer font-mono"
          >
            <Plus className="w-4 h-4" />
            NOUVEAU LEAD
          </button>

          <button
            onClick={handleAutoCrmImport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-950/40 hover:bg-violet-900/40 text-violet-300 border border-violet-500/20 hover:border-violet-500/40 rounded text-xs font-bold transition-all cursor-pointer font-mono"
          >
            <Upload className="w-3.5 h-3.5" />
            IMPORTER BASE CONTACTS
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0F121D] hover:bg-white/5 text-white/70 border border-white/10 rounded text-xs font-bold transition-all cursor-pointer font-mono"
          >
            <Download className="w-3.5 h-3.5" />
            EXPORT CSV
          </button>
        </div>
      </div>

      {/* METRIC CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total pipeline value */}
        <div className="bg-[#0F121D]/90 p-4 rounded-xl border border-white/5 backdrop-blur-md">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-white/40 uppercase font-mono tracking-wider">Volume total Pipeline</span>
            <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded border border-blue-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex flex-col">
            <span className="text-xl font-bold text-white font-mono">{formatFCFA(totalValue)}</span>
            <span className="text-[10px] font-mono text-white/40 mt-1">{activeLeadsCount} opportunités actives</span>
          </div>
        </div>

        {/* Won Value */}
        <div className="bg-[#0F121D]/90 p-4 rounded-xl border border-white/5 backdrop-blur-md">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-green-400 uppercase font-mono tracking-wider">Deals Gagnés</span>
            <div className="p-1.5 bg-green-500/10 text-green-400 rounded border border-green-500/20">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex flex-col">
            <span className="text-xl font-bold text-green-400 font-mono">{formatFCFA(wonValue)}</span>
            <span className="text-[10px] font-mono text-green-400/60 mt-1">{wonCount} contrats signés</span>
          </div>
        </div>

        {/* Win Rate */}
        <div className="bg-[#0F121D]/90 p-4 rounded-xl border border-white/5 backdrop-blur-md">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-yellow-500 uppercase font-mono tracking-wider">Taux de Conversion</span>
            <div className="p-1.5 bg-yellow-500/10 text-yellow-500 rounded border border-yellow-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex flex-col">
            <span className="text-2xl font-bold text-white font-mono">{winRate}%</span>
            <span className="text-[10px] font-mono text-white/40 mt-1">Gagnés vs Perdus</span>
          </div>
        </div>

        {/* Average value */}
        <div className="bg-[#0F121D]/90 p-4 rounded-xl border border-white/5 backdrop-blur-md">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-indigo-400 uppercase font-mono tracking-wider">Panier Moyen</span>
            <div className="p-1.5 bg-indigo-500/10 text-indigo-400 rounded border border-indigo-500/20">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex flex-col">
            <span className="text-xl font-bold text-white font-mono">{formatFCFA(averageDeal)}</span>
            <span className="text-[10px] font-mono text-white/40 mt-1">Par prospect qualifié</span>
          </div>
        </div>

      </div>

      {/* FILTERS */}
      <div className="bg-[#0F121D]/90 p-4 rounded-xl border border-white/5 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-white/45">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Rechercher une entreprise ou un numéro de téléphone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#08090D] border border-white/10 rounded px-3 pl-9 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors font-mono"
          />
        </div>

        <div className="w-full sm:w-64">
          <select
            value={selectedActivity}
            onChange={(e) => setSelectedActivity(e.target.value)}
            className="w-full bg-[#08090D] border border-white/10 rounded px-3 py-1.5 text-xs text-white/80 focus:outline-none focus:border-blue-500 transition-colors font-mono"
          >
            <option value="All">Tous les secteurs ({activitiesList.length})</option>
            {activitiesList.map(act => (
              <option key={act} value={act}>{act}</option>
            ))}
          </select>
        </div>

        <div className="w-full sm:w-64">
          <select
            value={`${crmSortBy}-${crmSortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setCrmSortBy(field as any);
              setCrmSortOrder(order as any);
            }}
            className="w-full bg-[#08090D] border border-white/10 rounded px-3 py-1.5 text-xs text-white/80 focus:outline-none focus:border-blue-500 transition-colors font-mono"
          >
            <option value="entreprise-asc">🏢 Nom (A ➔ Z) [Croissant]</option>
            <option value="entreprise-desc">🏢 Nom (Z ➔ A)</option>
            <option value="crm_valeur-asc">💰 Valeur (Min ➔ Max) [Croissant]</option>
            <option value="crm_valeur-desc">💰 Valeur (Max ➔ Min)</option>
            <option value="created_at-asc">📅 Date (Du - au +)</option>
            <option value="created_at-desc">📅 Date (Du + au -)</option>
          </select>
        </div>
      </div>

      {/* PIPELINE VIEWS */}
      {viewType === 'kanban' ? (
        /* KANBAN VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-start overflow-x-auto pb-4">
          {STAGES.map(stage => {
            const stageLeads = getStageContacts(stage.id);
            const stageTotalVal = stageLeads.reduce((sum, c) => sum + (c.crm_valeur || 0), 0);

            return (
              <div
                key={stage.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage.id)}
                className="bg-[#08090D] border border-white/5 rounded-xl p-3 min-h-[500px] flex flex-col space-y-3"
              >
                {/* Stage Header */}
                <div className="flex flex-col border-b border-white/5 pb-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-bold font-mono px-2 py-0.5 rounded border ${stage.color}`}>
                      {stage.label}
                    </span>
                    <span className="text-[10px] font-mono text-white/30 font-bold bg-white/5 px-2 py-0.2 rounded-full">
                      {stageLeads.length}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-white/50 mt-1.5 font-bold">
                    {formatFCFA(stageTotalVal)}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[600px] pr-1">
                  {stageLeads.length === 0 ? (
                    <div className="h-24 flex items-center justify-center border border-dashed border-white/5 rounded-lg text-white/20 text-[10px] font-mono text-center px-4">
                      Déposer des leads ici
                    </div>
                  ) : (
                    stageLeads.map(lead => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                        onClick={() => {
                          setSelectedContact(lead);
                          setEditNotes(lead.crm_notes || '');
                          setEditValeur(lead.crm_valeur !== undefined ? lead.crm_valeur : 0);
                          setEditEtape(lead.crm_etape || 'nouveau');
                          setIsDetailModalOpen(true);
                        }}
                        className="bg-[#0F121D] hover:bg-white/[3%] border border-white/5 hover:border-blue-500/20 rounded-lg p-3 transition-all cursor-pointer shadow-sm relative group"
                      >
                        {/* Drag indicator in corner */}
                        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        </div>

                        {/* Company title */}
                        <h4 className="font-bold text-white text-xs tracking-tight truncate pr-4">{lead.entreprise}</h4>
                        <p className="text-[9px] font-mono text-white/40 mt-0.5">{lead.activite}</p>

                        {/* Value and Contact */}
                        <div className="mt-3.5 flex items-center justify-between">
                          <span className="text-[11px] text-blue-400 font-mono font-bold">
                            {formatFCFA(lead.crm_valeur)}
                          </span>
                          <span className="text-[9px] text-white/30 font-mono">{lead.telephone}</span>
                        </div>

                        {/* AI score tag if present */}
                        {lead.crm_score_ia !== undefined && (
                          <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between">
                            <span className="text-[8px] font-mono uppercase tracking-wider text-purple-400/80 font-bold flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5" /> Score IA
                            </span>
                            <span className={`text-[10px] font-mono font-extrabold px-1.5 py-0.2 rounded ${
                              lead.crm_score_ia >= 70 ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                              lead.crm_score_ia >= 40 ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                              'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                              {lead.crm_score_ia}%
                            </span>
                          </div>
                        )}
                        
                        {/* Status label if on relance */}
                        {lead.nb_relances > 0 && (
                          <div className="mt-1.5 text-[8px] font-mono text-white/40">
                            WhatsApp: Relance {lead.nb_relances}/3 ({lead.statut_wa})
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="bg-[#0F121D]/90 border border-white/5 rounded-xl overflow-hidden backdrop-blur-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-[#08090D] text-[10px] font-bold uppercase tracking-wider text-white/50 font-mono">
                  <th 
                    onClick={() => handleCrmSort('entreprise')}
                    className="px-5 py-3.5 cursor-pointer hover:bg-white/5 transition-colors select-none group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Entreprise</span>
                      <ArrowUpDown className={`w-3 h-3 transition-colors ${
                        crmSortBy === 'entreprise' ? 'text-blue-400' : 'text-white/20 group-hover:text-white/40'
                      }`} />
                      {crmSortBy === 'entreprise' && (
                        <span className="text-[9px] text-blue-400/60 lowercase font-normal">
                          ({crmSortOrder === 'asc' ? 'croissant' : 'décroissant'})
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-5 py-3.5">Secteur</th>
                  <th className="px-5 py-3.5">Étape Commerciale</th>
                  <th 
                    onClick={() => handleCrmSort('crm_valeur')}
                    className="px-5 py-3.5 cursor-pointer hover:bg-white/5 transition-colors select-none group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Valeur Deal</span>
                      <ArrowUpDown className={`w-3 h-3 transition-colors ${
                        crmSortBy === 'crm_valeur' ? 'text-blue-400' : 'text-white/20 group-hover:text-white/40'
                      }`} />
                      {crmSortBy === 'crm_valeur' && (
                        <span className="text-[9px] text-blue-400/60 lowercase font-normal">
                          ({crmSortOrder === 'asc' ? 'croissant' : 'décroissant'})
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-5 py-3.5 text-center">Score Prédictif IA</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {filteredSortedContacts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-white/30 font-mono">
                      Aucun lead correspondant
                    </td>
                  </tr>
                ) : (
                  filteredSortedContacts.map(lead => {
                    const stage = STAGES.find(s => s.id === (lead.crm_etape || 'nouveau'));
                    return (
                      <tr key={lead.id} className="hover:bg-white/[1%] transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-white text-xs">{lead.entreprise}</div>
                          <div className="text-[10px] text-white/40 font-mono mt-0.5">{lead.telephone}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#08090D] border border-white/5 text-white/50 font-bold uppercase">
                            {lead.activite}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${stage?.color || 'text-white bg-white/5'}`}>
                            {stage?.label || 'Nouveau'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-mono font-bold text-blue-400">
                          {formatFCFA(lead.crm_valeur)}
                        </td>
                        <td className="px-5 py-3.5 text-center font-mono font-extrabold">
                          {lead.crm_score_ia !== undefined ? (
                            <span className={`px-2 py-0.5 rounded text-[11px] ${
                              lead.crm_score_ia >= 70 ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                              lead.crm_score_ia >= 40 ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                              'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                              {lead.crm_score_ia}%
                            </span>
                          ) : (
                            <span className="text-white/20">-</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => {
                              setSelectedContact(lead);
                              setEditNotes(lead.crm_notes || '');
                              setEditValeur(lead.crm_valeur !== undefined ? lead.crm_valeur : 0);
                              setEditEtape(lead.crm_etape || 'nouveau');
                              setIsDetailModalOpen(true);
                            }}
                            className="px-2.5 py-1 bg-white/[2%] text-white/60 hover:text-white rounded border border-white/10 text-[10px] uppercase font-bold transition-all cursor-pointer font-mono"
                          >
                            Ouvrir Fiche
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DETAIL MODAL & IA SUGGESTION PANEL */}
      {isDetailModalOpen && selectedContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#101323] w-full max-w-4xl rounded-xl border border-white/10 p-6 relative max-h-[90vh] overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            <button onClick={() => setIsDetailModalOpen(false)} className="absolute top-4 right-4 text-white/40 hover:text-white cursor-pointer z-10">
              <X className="w-5 h-5" />
            </button>

            {/* Column 1: Lead Information Form (Left - 5 cols) */}
            <div className="lg:col-span-5 space-y-4 border-r border-white/5 pr-0 lg:pr-6">
              <div>
                <span className="text-[10px] font-bold text-blue-400 font-mono uppercase">FICHE PROSPECT</span>
                <h3 className="text-lg font-bold text-white tracking-tight mt-0.5">{selectedContact.entreprise}</h3>
                <span className="text-[11px] text-white/40 font-mono block mt-1">Secteur d'activité : {selectedContact.activite}</span>
              </div>

              <div className="space-y-3.5 pt-2">
                <div>
                  <label className="text-[10px] font-bold text-white/50 font-mono block mb-1">Téléphone</label>
                  <div className="flex items-center gap-2 bg-black/20 p-2 rounded border border-white/5 font-mono text-xs text-white">
                    <Phone className="w-3.5 h-3.5 text-blue-400" />
                    <span>{selectedContact.telephone}</span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-white/50 font-mono block mb-1">Étape Actuelle</label>
                  <select
                    value={editEtape}
                    onChange={(e) => setEditEtape(e.target.value as StageId)}
                    className="w-full bg-[#08090D] border border-white/10 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  >
                    {STAGES.map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-white/50 font-mono block mb-1">Valeur estimée du contrat (FCFA)</label>
                  <input
                    type="number"
                    value={editValeur}
                    onChange={(e) => setEditValeur(Number(e.target.value))}
                    className="w-full bg-[#08090D] border border-white/10 rounded px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-white/50 font-mono block mb-1">Notes commercial / Historique d'échanges</label>
                  <textarea
                    rows={4}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Saisissez vos commentaires ou compte-rendu de rendez-vous téléphonique..."
                    className="w-full bg-[#08090D] border border-white/10 rounded p-2.5 text-xs text-white focus:outline-none focus:border-blue-500 font-sans leading-relaxed"
                  />
                </div>
              </div>

              {/* Delete prospect */}
              <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleDeleteContact(selectedContact.id)}
                  className="flex items-center gap-1.5 text-red-500 hover:text-red-400 text-[10px] font-bold font-mono uppercase cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Supprimer le prospect
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleSaveDetails(selectedContact)}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold font-mono transition-colors cursor-pointer"
                  >
                    ENREGISTRER
                  </button>
                </div>
              </div>
            </div>

            {/* Column 2: Intelligent AI Panel (Right - 7 cols) */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <div className="flex items-center gap-1.5">
                  <Brain className="w-5 h-5 text-purple-400" />
                  <span className="text-xs font-bold font-mono uppercase tracking-wider text-purple-400">Assistant Stratégique IA</span>
                </div>
                
                {selectedContact.crm_score_ia !== undefined && (
                  <div className="flex items-center gap-1 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20 font-mono text-xs text-purple-300 font-extrabold">
                    Score: {selectedContact.crm_score_ia}%
                  </div>
                )}
              </div>

              {/* AI evaluation result area */}
              <div className="flex-1 bg-[#08090D] border border-white/5 rounded-xl p-4 min-h-[220px] flex flex-col justify-between overflow-y-auto max-h-[300px] font-mono text-xs text-white/90">
                {selectedContact.crm_analyse_ia ? (
                  <div className="space-y-3.5">
                    <div className="flex items-center gap-1.5 text-green-400 text-[10px] font-bold uppercase tracking-wider">
                      <Check className="w-3.5 h-3.5" /> Analyse Qualifiée par Gemini
                    </div>
                    <p className="leading-relaxed font-sans text-white/80 whitespace-pre-line text-xs">{selectedContact.crm_analyse_ia}</p>
                    
                    <div className="border-t border-white/5 pt-3 mt-4">
                      <span className="text-[9px] uppercase tracking-wider text-white/40 block mb-1">SCORE DE SIGNATURE</span>
                      <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${
                            (selectedContact.crm_score_ia || 0) >= 70 ? 'bg-green-500' :
                            (selectedContact.crm_score_ia || 0) >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${selectedContact.crm_score_ia || 0}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-white/30 block mt-1">La signature est estimée à une probabilité de {selectedContact.crm_score_ia}%.</span>
                    </div>
                  </div>
                ) : (
                  <div className="m-auto text-center space-y-3 py-6 text-white/20">
                    <Sparkles className="w-8 h-8 mx-auto text-white/10 animate-pulse" />
                    <div className="space-y-1">
                      <p className="text-[11px] font-bold">Calculateur d'opportunités IA</p>
                      <p className="text-[10px] font-sans text-white/40">Générez un score d'intérêt prédictif et des conseils de négociation pour signer ce contrat à Abidjan.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* CTA trigger AI */}
              <div className="bg-[#1A112C]/40 border border-purple-500/10 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-left">
                  <span className="text-[10px] font-bold text-purple-400 font-mono uppercase block">CONSEILS DE PITCH PERSONNALISÉS</span>
                  <p className="text-[9px] text-white/50 font-mono mt-0.5">Gemini va analyser l'activité, les notes et les statuts de relances du prospect.</p>
                </div>
                
                <button
                  onClick={() => handleAnalyzeIA(selectedContact)}
                  disabled={analyzingId === selectedContact.id}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded text-xs font-bold font-mono transition-all cursor-pointer shadow-md"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${analyzingId === selectedContact.id ? 'animate-spin' : ''}`} />
                  {analyzingId === selectedContact.id ? 'ANALYSE...' : '✨ ANALYSER LE LEAD IA'}
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* CREATE LEAD MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <form onSubmit={handleCreateLead} className="bg-[#101323] w-full max-w-md rounded-xl border border-white/10 p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-2.5">
              <span className="text-xs font-bold text-blue-400 font-mono uppercase tracking-wider">CRÉATION D'UNE OPPORTUNITÉ</span>
              <button type="button" onClick={() => setIsCreateModalOpen(false)} className="text-white/45 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="text-[10px] font-bold text-white/50 font-mono block mb-1">Nom de l'entreprise (Obligatoire)</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Restaurant Le Diplomate"
                  value={newLead.entreprise}
                  onChange={(e) => setNewLead(prev => ({ ...prev, entreprise: e.target.value }))}
                  className="w-full bg-[#08090D] border border-white/10 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-blue-500 font-sans"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-white/50 font-mono block mb-1">Téléphone portable (Format +225... Obligatoire)</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: +2250709010203"
                  value={newLead.telephone}
                  onChange={(e) => setNewLead(prev => ({ ...prev, telephone: e.target.value }))}
                  className="w-full bg-[#08090D] border border-white/10 rounded px-2.5 py-1.5 text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-white/50 font-mono block mb-1">Secteur d'activité</label>
                  <select
                    value={newLead.activite}
                    onChange={(e) => setNewLead(prev => ({ ...prev, activite: e.target.value }))}
                    className="w-full bg-[#08090D] border border-white/10 rounded px-2 py-1.5 text-white focus:outline-none focus:border-blue-500 font-mono"
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
                  <label className="text-[10px] font-bold text-white/50 font-mono block mb-1">Valeur Deal (FCFA)</label>
                  <input
                    type="number"
                    value={newLead.crm_valeur}
                    onChange={(e) => setNewLead(prev => ({ ...prev, crm_valeur: Number(e.target.value) }))}
                    className="w-full bg-[#08090D] border border-white/10 rounded px-2 py-1.5 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-white/50 font-mono block mb-1">Notes / Contexte initial</label>
                <textarea
                  rows={3}
                  placeholder="Saisissez des informations clés sur le prospect (besoins, contact, rdv)..."
                  value={newLead.crm_notes}
                  onChange={(e) => setNewLead(prev => ({ ...prev, crm_notes: e.target.value }))}
                  className="w-full bg-[#08090D] border border-white/10 rounded p-2 text-white focus:outline-none focus:border-blue-500 font-sans"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3.5 pt-3 border-t border-white/5">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-1.5 bg-black/30 hover:bg-white/5 text-white/70 border border-white/5 hover:border-white/10 rounded text-xs font-bold font-mono uppercase cursor-pointer transition-colors"
              >
                Fermer
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-bold font-mono uppercase cursor-pointer transition-colors"
              >
                Lancer l'Opportunité
              </button>
            </div>
          </form>
        </div>
      )}

      {/* UNIFIED IMPORTER MODAL VIA BASE CONTACTS */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1E2235] w-full max-w-md rounded-xl border border-[#2D3250] shadow-2xl p-6 overflow-hidden relative flex flex-col">
            <button 
              onClick={() => setIsImportModalOpen(false)} 
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2 font-mono uppercase">
              <Users className="w-5 h-5 text-violet-400 animate-pulse" />
              IMPORTATION AUTOMATIQUE CRM
            </h3>
            
            <p className="text-xs text-gray-400 mb-6 font-mono">
              Synchronisation automatique des nouveaux contacts de la base générale vers le CRM.
            </p>

            <div className="space-y-4 font-sans">
              {importing ? (
                /* LOADING PROGRESS BAR */
                <div className="space-y-4 py-4 animate-pulse">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-violet-400 font-bold">Analyse et importation en cours...</span>
                    <span className="text-white font-bold">{progressPercent}%</span>
                  </div>
                  <div className="w-full bg-[#131520] h-2 rounded-full overflow-hidden border border-[#2D3250]">
                    <div 
                      className="bg-gradient-to-r from-violet-500 to-indigo-500 h-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 font-mono text-center">
                    Filtrage automatique des contacts déjà présents dans le pipeline...
                  </p>
                </div>
              ) : importStats ? (
                /* SUCCESS STATS DISPLAY */
                <div className="space-y-4">
                  <div className="bg-emerald-950/20 border border-emerald-500/20 p-5 rounded-lg text-center space-y-4">
                    <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                      <Check className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-emerald-400">Importation CRM terminée !</h4>
                      <p className="text-xs text-gray-400 mt-1">
                        Seuls les contacts qui n'existaient pas dans le CRM ont été importés.
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 bg-black/20 p-4 rounded border border-white/5 font-mono text-xs max-w-sm mx-auto">
                      <div>
                        <span className="block text-gray-400 text-[10px] uppercase">Contacts Analysés</span>
                        <span className="text-xl font-bold text-white">{importStats.total}</span>
                      </div>
                      <div>
                        <span className="block text-emerald-400 text-[10px] uppercase">Nouveaux Importés</span>
                        <span className="text-xl font-bold text-emerald-400">
                          {importStats.imported > 0 ? `+${importStats.imported}` : '0'}
                        </span>
                      </div>
                    </div>

                    {importStats.imported > 0 ? (
                      <div className="text-xs text-emerald-300 font-mono">
                        🎉 {importStats.imported} nouveau(x) contact(s) ajouté(s) avec succès au pipeline commercial !
                      </div>
                    ) : (
                      <div className="text-xs text-yellow-400 font-mono">
                        ℹ️ Aucun nouveau contact n'a été importé (tous les contacts de la base sont déjà présents dans le CRM).
                      </div>
                    )}
                  </div>

                  <div className="flex justify-center pt-2">
                    <button
                      type="button"
                      onClick={() => setIsImportModalOpen(false)}
                      className="px-6 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-lg text-xs font-mono font-bold transition-all shadow-lg cursor-pointer w-full text-center"
                    >
                      RETOURNER AU CRM
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
