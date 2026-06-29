import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
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

  // Sorting state
  const [sortBy, setSortBy] = useState<'entreprise' | 'created_at' | 'activite'>('entreprise');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

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

  // File import states (Excel / CSV)
  const [uploadMode, setUploadMode] = useState<'file' | 'text'>('file');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [excelSheets, setExcelSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [mappedFields, setMappedFields] = useState<{
    entreprise: string;
    telephone: string;
    activite: string;
  }>({ entreprise: '', telephone: '', activite: '' });
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [importStats, setImportStats] = useState<{ imported: number; updated: number; total: number } | null>(null);

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

  // Excel / CSV File processing
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    setImportFile(file);
    setProgressPercent(0);
    setImportStats(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        setExcelSheets(workbook.SheetNames);
        const sheetName = workbook.SheetNames[0];
        setSelectedSheet(sheetName);
        parseWorksheet(workbook.Sheets[sheetName], workbook);
      } catch (err) {
        alert("Erreur de lecture du fichier Excel/CSV : " + err);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSheetChange = (sheetName: string) => {
    setSelectedSheet(sheetName);
    if (importFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          parseWorksheet(workbook.Sheets[sheetName], workbook);
        } catch (err) {
          alert("Erreur de lecture de l'onglet : " + err);
        }
      };
      reader.readAsArrayBuffer(importFile);
    }
  };

  const parseWorksheet = (sheet: any, workbook: any) => {
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    if (rawData.length === 0) {
      alert("La feuille sélectionnée est vide.");
      return;
    }

    // Find first non-empty row to use as headers
    let headerRowIndex = 0;
    let headers: string[] = [];
    for (let i = 0; i < Math.min(10, rawData.length); i++) {
      const row = rawData[i];
      if (row && row.length > 0 && row.some(cell => typeof cell === 'string' || typeof cell === 'number')) {
        headerRowIndex = i;
        headers = row.map(h => String(h ?? '').trim());
        break;
      }
    }

    setExcelHeaders(headers);

    // Auto-detect mappings based on header name matches
    const autoMapping = { entreprise: '', telephone: '', activite: '' };
    headers.forEach((h) => {
      const lowerH = h.toLowerCase();
      if (lowerH.includes('entreprise') || lowerH.includes('société') || lowerH.includes('societe') || lowerH.includes('nom') || lowerH.includes('company') || lowerH.includes('compagny') || lowerH.includes('client')) {
        autoMapping.entreprise = h;
      } else if (lowerH.includes('téléphone') || lowerH.includes('telephone') || lowerH.includes('tel') || lowerH.includes('phone') || lowerH.includes('mobile') || lowerH.includes('numéro') || lowerH.includes('numero')) {
        autoMapping.telephone = h;
      } else if (lowerH.includes('activité') || lowerH.includes('activite') || lowerH.includes('secteur') || lowerH.includes('tag') || lowerH.includes('catégorie') || lowerH.includes('categorie') || lowerH.includes('type') || lowerH.includes('industry')) {
        autoMapping.activite = h;
      }
    });

    // Fallbacks
    if (!autoMapping.entreprise && headers.length > 0) autoMapping.entreprise = headers[0];
    if (!autoMapping.telephone && headers.length > 1) autoMapping.telephone = headers[1];
    if (!autoMapping.activite && headers.length > 2) autoMapping.activite = headers[2];

    setMappedFields(autoMapping);

    // Parse data rows
    const rows: any[] = [];
    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
      const rawRow = rawData[i];
      if (!rawRow || rawRow.length === 0) continue;
      
      const rowObj: any = {};
      headers.forEach((h, colIdx) => {
        rowObj[h] = rawRow[colIdx] !== undefined ? rawRow[colIdx] : '';
      });
      rows.push(rowObj);
    }
    setParsedRows(rows);
  };

  const handleBulkImportSubmit = async () => {
    if (!mappedFields.entreprise || !mappedFields.telephone) {
      alert("Veuillez mapper au moins les colonnes Entreprise et Téléphone.");
      return;
    }

    setImporting(true);
    setProgressPercent(1);
    setImportStats(null);

    // Map and normalize rows
    const formattedContacts = parsedRows.map(row => {
      return {
        entreprise: String(row[mappedFields.entreprise] || '').trim(),
        telephone: String(row[mappedFields.telephone] || '').trim(),
        activite: mappedFields.activite ? String(row[mappedFields.activite] || 'Général').trim() : 'Général',
        canal_actif: 'les_deux',
        statut_sms: 'nouveau',
        statut_wa: 'nouveau',
        nb_relances: 0,
      };
    }).filter(c => c.entreprise && c.telephone);

    if (formattedContacts.length === 0) {
      alert("Aucun contact valide à importer. Vérifiez votre mappage de colonnes.");
      setImporting(false);
      return;
    }

    // Batch upload with chunks of 3000
    const chunkSize = 3000;
    let totalImported = 0;
    let totalUpdated = 0;

    try {
      for (let i = 0; i < formattedContacts.length; i += chunkSize) {
        const chunk = formattedContacts.slice(i, i + chunkSize);
        const res = await fetch('/api/contacts/import-bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contacts: chunk })
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Une erreur est survenue lors de l'importation.");
        }

        const resData = await res.json();
        totalImported += resData.stats?.imported || 0;
        totalUpdated += resData.stats?.updated || 0;

        const progress = Math.min(100, Math.round(((i + chunk.length) / formattedContacts.length) * 100));
        setProgressPercent(progress);
      }

      setImportStats({
        imported: totalImported,
        updated: totalUpdated,
        total: formattedContacts.length
      });
      onRefresh();
    } catch (err: any) {
      alert("Erreur lors de l'importation : " + err.message);
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

  // Sort handler
  const handleSort = (field: 'entreprise' | 'created_at' | 'activite') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Filter and sort contacts
  const filteredContacts = useMemo(() => {
    const list = contacts.filter(c => {
      const matchesSearch = 
        c.entreprise.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.telephone.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.activite.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesActivity = selectedActivity === 'All' || c.activite === selectedActivity;
      const matchesSms = selectedSmsStatus === 'All' || c.statut_sms === selectedSmsStatus;
      const matchesWa = selectedWaStatus === 'All' || c.statut_wa === selectedWaStatus;

      return matchesSearch && matchesActivity && matchesSms && matchesWa;
    });

    return list.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'entreprise') {
        comparison = a.entreprise.localeCompare(b.entreprise, 'fr', { sensitivity: 'base' });
      } else if (sortBy === 'activite') {
        comparison = a.activite.localeCompare(b.activite, 'fr', { sensitivity: 'base' });
      } else if (sortBy === 'created_at') {
        comparison = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [contacts, searchTerm, selectedActivity, selectedSmsStatus, selectedWaStatus, sortBy, sortOrder]);

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
            onClick={() => {
              setIsCsvModalOpen(true);
              setImportFile(null);
              setExcelHeaders([]);
              setParsedRows([]);
              setProgressPercent(0);
              setImportStats(null);
              setUploadMode('file');
            }}
            disabled={importing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-950/40 hover:bg-violet-900/40 text-violet-300 border border-violet-500/20 hover:border-violet-500/40 rounded text-xs font-bold transition-all cursor-pointer font-mono"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            IMPORTER EXCEL / CSV
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
      <div className="bg-[#0F121D]/90 rounded-xl p-4 border border-white/5 shadow-lg grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 backdrop-blur-md">
        
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

        {/* Sorting Dropdown */}
        <div>
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field as any);
              setSortOrder(order as any);
              setCurrentPage(1);
            }}
            className="w-full bg-[#08090D] border border-white/10 rounded px-3 py-1.5 text-xs text-white/80 focus:outline-none focus:border-blue-500 transition-colors font-mono"
          >
            <option value="entreprise-asc">🏢 Nom (A ➔ Z) [Croissant]</option>
            <option value="entreprise-desc">🏢 Nom (Z ➔ A) [Décroissant]</option>
            <option value="activite-asc">🏷️ Activité (A ➔ Z)</option>
            <option value="activite-desc">🏷️ Activité (Z ➔ A)</option>
            <option value="created_at-asc">📅 Date (Du - au +)</option>
            <option value="created_at-desc">📅 Date (Du + au -)</option>
          </select>
        </div>

      </div>

      {/* TABLE LIST VIEW */}
      <div className="bg-[#0F121D]/90 rounded-xl border border-white/5 shadow-lg overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-[#08090D] text-[10px] font-bold uppercase tracking-wider text-white/50 font-mono">
                <th 
                  onClick={() => handleSort('entreprise')}
                  className="px-5 py-3.5 cursor-pointer hover:bg-white/5 transition-colors select-none group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Entreprise</span>
                    <ArrowUpDown className={`w-3 h-3 transition-colors ${
                      sortBy === 'entreprise' ? 'text-blue-400' : 'text-white/20 group-hover:text-white/40'
                    }`} />
                    {sortBy === 'entreprise' && (
                      <span className="text-[9px] text-blue-400/60 lowercase font-normal">
                        ({sortOrder === 'asc' ? 'croissant' : 'décroissant'})
                      </span>
                    )}
                  </div>
                </th>
                <th className="px-5 py-3.5">Téléphone</th>
                <th 
                  onClick={() => handleSort('activite')}
                  className="px-5 py-3.5 cursor-pointer hover:bg-white/5 transition-colors select-none group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Activité</span>
                    <ArrowUpDown className={`w-3 h-3 transition-colors ${
                      sortBy === 'activite' ? 'text-blue-400' : 'text-white/20 group-hover:text-white/40'
                    }`} />
                    {sortBy === 'activite' && (
                      <span className="text-[9px] text-blue-400/60 lowercase font-normal">
                        ({sortOrder === 'asc' ? 'croissant' : 'décroissant'})
                      </span>
                    )}
                  </div>
                </th>
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

      {/* UNIFIED EXCEL / CSV IMPORTER MODAL */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1E2235] w-full max-w-2xl rounded-xl border border-[#2D3250] shadow-2xl p-6 overflow-hidden relative flex flex-col max-h-[95vh]">
            <button 
              onClick={() => setIsCsvModalOpen(false)} 
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2 font-mono">
              <FileSpreadsheet className="w-5 h-5 text-violet-400 animate-pulse" />
              IMPORTER DES CONTACTS
            </h3>
            
            <p className="text-xs text-gray-400 mb-4 font-mono">
              Importez vos fichiers de prospection (.xlsx, .xls, .csv) ou collez directement du texte brut.
            </p>

            {/* TAB SELECTOR */}
            <div className="flex border-b border-[#2D3250] mb-4">
              <button
                type="button"
                onClick={() => {
                  setUploadMode('file');
                  setImportStats(null);
                }}
                className={`px-4 py-2 text-xs font-bold font-mono border-b-2 transition-all cursor-pointer ${
                  uploadMode === 'file' 
                    ? 'border-violet-500 text-white bg-violet-500/5' 
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                FICHIER EXCEL / CSV (.xlsx, .csv)
              </button>
              <button
                type="button"
                onClick={() => {
                  setUploadMode('text');
                  setImportStats(null);
                }}
                className={`px-4 py-2 text-xs font-bold font-mono border-b-2 transition-all cursor-pointer ${
                  uploadMode === 'text' 
                    ? 'border-violet-500 text-white bg-violet-500/5' 
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                COLLER DU TEXTE CSV
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-4 font-sans">
              
              {importStats ? (
                /* SUCCESS STATS DISPLAY */
                <div className="bg-emerald-950/30 border border-emerald-500/20 p-5 rounded-lg text-center space-y-4">
                  <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                    <Check className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-emerald-400">Importation terminée avec succès !</h4>
                    <p className="text-xs text-gray-400 mt-1">Vos contacts ont été intégrés à la base.</p>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 bg-black/20 p-3 rounded border border-white/5 font-mono text-xs">
                    <div>
                      <span className="block text-gray-400 text-[10px] uppercase">Lignes traitées</span>
                      <span className="text-base font-bold text-white">{importStats.total}</span>
                    </div>
                    <div>
                      <span className="block text-emerald-400 text-[10px] uppercase">Nouveaux</span>
                      <span className="text-base font-bold text-emerald-400">+{importStats.imported}</span>
                    </div>
                    <div>
                      <span className="block text-yellow-400 text-[10px] uppercase">Mis à jour</span>
                      <span className="text-base font-bold text-yellow-400">~{importStats.updated}</span>
                    </div>
                  </div>

                  <div className="flex justify-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setImportStats(null);
                        setImportFile(null);
                        setExcelHeaders([]);
                        setParsedRows([]);
                        setProgressPercent(0);
                      }}
                      className="px-4 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded text-xs font-mono font-bold transition-all"
                    >
                      IMPORTER AUTRE FICHIER
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCsvModalOpen(false)}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-black rounded text-xs font-mono font-bold transition-all"
                    >
                      FERMER
                    </button>
                  </div>
                </div>
              ) : uploadMode === 'file' ? (
                /* FILE MODE UPLOADER */
                <div className="space-y-4">
                  {!importFile ? (
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragOver(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) processFile(file);
                      }}
                      className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                        isDragOver 
                          ? 'border-violet-500 bg-violet-500/5' 
                          : 'border-[#2D3250] hover:border-violet-500/30 bg-[#131520] hover:bg-white/[1%]'
                      }`}
                      onClick={() => document.getElementById('excelFileInput')?.click()}
                    >
                      <input
                        type="file"
                        id="excelFileInput"
                        accept=".xlsx,.xls,.csv"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                      <Upload className="w-10 h-10 text-violet-400/60 mb-3" />
                      <p className="text-sm font-semibold text-white">Glissez-déposez votre fichier ici</p>
                      <p className="text-xs text-gray-400 mt-1">ou cliquez pour parcourir vos dossiers</p>
                      <p className="text-[10px] text-gray-500 mt-3 font-mono">Formats acceptés : .xlsx, .xls, .csv</p>
                    </div>
                  ) : (
                    /* FILE LOADED & MAPPING STEP */
                    <div className="space-y-4 bg-[#131520] p-4 rounded-lg border border-[#2D3250]">
                      <div className="flex items-center justify-between border-b border-[#2D3250] pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-violet-500/10 text-violet-400 rounded-lg">
                            <FileSpreadsheet className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white truncate max-w-xs">{importFile.name}</p>
                            <p className="text-[10px] text-gray-500 font-mono">{(importFile.size / 1024).toFixed(1)} KB — {parsedRows.length} lignes trouvées</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setImportFile(null);
                            setExcelHeaders([]);
                            setParsedRows([]);
                          }}
                          className="p-1 bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 rounded transition-all"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* SHEET SELECTOR FOR EXCEL WITH MULTIPLE SHEETS */}
                      {excelSheets.length > 1 && (
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-400 font-mono">Onglet actif du fichier Excel</label>
                          <select
                            value={selectedSheet}
                            onChange={(e) => handleSheetChange(e.target.value)}
                            className="w-full bg-[#1E2235] border border-[#2D3250] rounded-lg p-2 text-xs text-white focus:outline-none focus:border-violet-500 font-mono"
                          >
                            {excelSheets.map(name => (
                              <option key={name} value={name}>{name}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* COLUMN MAPPING CONTROLS */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono border-b border-[#2D3250]/40 pb-1.5 flex items-center justify-between">
                          <span>Mappage des colonnes</span>
                          <span className="text-[10px] text-violet-400 lowercase">Associez les colonnes de votre fichier</span>
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {/* ENTREPRISE MAP */}
                          <div className="space-y-1">
                            <label className="text-[11px] text-gray-400 font-bold block flex items-center gap-1 font-mono">
                              Entreprise <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={mappedFields.entreprise}
                              onChange={(e) => setMappedFields(prev => ({ ...prev, entreprise: e.target.value }))}
                              className="w-full bg-[#1E2235] border border-[#2D3250] rounded p-2 text-xs text-white focus:outline-none focus:border-violet-500 font-mono"
                            >
                              <option value="">-- Choisir la colonne --</option>
                              {excelHeaders.map(h => (
                                <option key={h} value={h}>{h}</option>
                              ))}
                            </select>
                          </div>

                          {/* TELEPHONE MAP */}
                          <div className="space-y-1">
                            <label className="text-[11px] text-gray-400 font-bold block flex items-center gap-1 font-mono">
                              Téléphone <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={mappedFields.telephone}
                              onChange={(e) => setMappedFields(prev => ({ ...prev, telephone: e.target.value }))}
                              className="w-full bg-[#1E2235] border border-[#2D3250] rounded p-2 text-xs text-white focus:outline-none focus:border-violet-500 font-mono"
                            >
                              <option value="">-- Choisir la colonne --</option>
                              {excelHeaders.map(h => (
                                <option key={h} value={h}>{h}</option>
                              ))}
                            </select>
                          </div>

                          {/* ACTIVITE MAP */}
                          <div className="space-y-1">
                            <label className="text-[11px] text-gray-400 block font-bold font-mono">
                              Secteur d'activité
                            </label>
                            <select
                              value={mappedFields.activite}
                              onChange={(e) => setMappedFields(prev => ({ ...prev, activite: e.target.value }))}
                              className="w-full bg-[#1E2235] border border-[#2D3250] rounded p-2 text-xs text-white focus:outline-none focus:border-violet-500 font-mono"
                            >
                              <option value="">-- Valeur par défaut (Général) --</option>
                              {excelHeaders.map(h => (
                                <option key={h} value={h}>{h}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* DATA PREVIEW */}
                      {parsedRows.length > 0 && (
                        <div className="space-y-1.5">
                          <label className="text-[11px] text-gray-400 block font-bold font-mono">Aperçu (premières lignes)</label>
                          <div className="bg-black/25 rounded border border-[#2D3250] overflow-x-auto text-[10px] font-mono">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-[#1E2235] text-white/50 border-b border-[#2D3250]">
                                  <th className="p-2 font-bold border-r border-[#2D3250]">Entreprise</th>
                                  <th className="p-2 font-bold border-r border-[#2D3250]">Téléphone</th>
                                  <th className="p-2 font-bold">Activité</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#2D3250]/40 text-white/70">
                                {parsedRows.slice(0, 3).map((row, idx) => (
                                  <tr key={idx} className="hover:bg-white/[1%]">
                                    <td className="p-2 border-r border-[#2D3250]/40 max-w-[120px] truncate">
                                      {mappedFields.entreprise ? String(row[mappedFields.entreprise] || '') : <span className="text-gray-600">-</span>}
                                    </td>
                                    <td className="p-2 border-r border-[#2D3250]/40">
                                      {mappedFields.telephone ? String(row[mappedFields.telephone] || '') : <span className="text-gray-600">-</span>}
                                    </td>
                                    <td className="p-2 max-w-[120px] truncate">
                                      {mappedFields.activite ? String(row[mappedFields.activite] || '') : <span className="text-gray-500">Général</span>}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* LOADING / CHUNKED PROGRESS BAR */}
                      {importing && progressPercent > 0 && (
                        <div className="space-y-1.5 pt-2 animate-pulse">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-violet-400 font-bold">Importation et dédoublonnage en cours...</span>
                            <span className="text-white font-bold">{progressPercent}%</span>
                          </div>
                          <div className="w-full bg-[#1E2235] h-2 rounded-full overflow-hidden border border-[#2D3250]">
                            <div 
                              className="bg-gradient-to-r from-violet-500 to-indigo-500 h-full transition-all duration-300"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                          <p className="text-[9px] text-gray-500 font-mono text-center">
                            Traitement par lots de 3 000 contacts pour une performance optimale.
                          </p>
                        </div>
                      )}

                      {/* BOTTOM ACTIONS */}
                      <div className="flex justify-end gap-3 pt-3 border-t border-[#2D3250]/40">
                        <button
                          type="button"
                          disabled={importing}
                          onClick={() => {
                            setImportFile(null);
                            setExcelHeaders([]);
                            setParsedRows([]);
                          }}
                          className="px-4 py-2 bg-transparent text-gray-400 hover:text-white text-xs font-bold font-mono disabled:opacity-30 cursor-pointer"
                        >
                          ANNULER
                        </button>
                        <button
                          type="button"
                          disabled={importing || !mappedFields.entreprise || !mappedFields.telephone}
                          onClick={handleBulkImportSubmit}
                          className="px-5 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold font-mono shadow-md disabled:opacity-40 transition-all cursor-pointer"
                        >
                          {importing ? `IMPORTATION (${progressPercent}%)` : `LANCER L'IMPORTATION`}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* RAW CSV TEXT MODE */
                <form onSubmit={handleCsvImport} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-400 font-mono">Coller votre texte au format CSV</label>
                    <textarea
                      rows={10}
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
                      className="px-4 py-2 bg-transparent text-gray-400 hover:text-white text-xs font-bold font-mono cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={importing || !csvText.trim()}
                      className="px-5 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold font-mono shadow-md disabled:opacity-50 transition-all cursor-pointer"
                    >
                      {importing ? "Importation..." : "Importer Contacts"}
                    </button>
                  </div>
                </form>
              )}
            </div>
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
