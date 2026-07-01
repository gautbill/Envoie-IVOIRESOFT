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
  Smartphone,
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
  ArrowUpDown,
  BarChart3,
  FileText
} from 'lucide-react';
import { Contact, AppConfig, Versement, EnvoisLog } from '../types';

interface CRMProps {
  contacts: Contact[];
  config: AppConfig | null;
  onRefresh: () => void;
  setActiveTab: (tab: string) => void;
  logs: EnvoisLog[];
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

export default function CRM({ contacts, config, onRefresh, setActiveTab, logs }: CRMProps) {
  // State variables
  const [viewType, setViewType] = useState<'kanban' | 'list'>('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedActivity, setSelectedActivity] = useState('All');
  const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string>('All');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isPortfolioAnalysisModalOpen, setIsPortfolioAnalysisModalOpen] = useState(false);
  const [portfolioAnalysis, setPortfolioAnalysis] = useState('');
  const [loadingPortfolioAnalysis, setLoadingPortfolioAnalysis] = useState(false);

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
  const [editStatutPaiement, setEditStatutPaiement] = useState<'non_paye' | 'avance' | 'solde'>('non_paye');
  const [editAvance, setEditAvance] = useState(0);
  const [activeModalTab, setActiveModalTab] = useState<'ai' | 'payments' | 'invoice' | 'logs'>('ai');
  const [editVersements, setEditVersements] = useState<Versement[]>([]);
  const [newVersementMontant, setNewVersementMontant] = useState<number | ''>('');
  const [newVersementMode, setNewVersementMode] = useState<Versement['mode']>('wave');
  const [newVersementCommentaire, setNewVersementCommentaire] = useState('');

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

      const status = c.crm_statut_paiement || 'non_paye';
      const matchesPaymentStatus = selectedPaymentStatus === 'All' || status === selectedPaymentStatus;

      return matchesSearch && matchesActivity && matchesPaymentStatus;
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

  const contactLogs = useMemo(() => {
    if (!selectedContact) return [];
    return logs.filter(l => l.contact_id === selectedContact.id);
  }, [selectedContact, logs]);

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
          crm_etape: editEtape,
          crm_avance: Number(editAvance),
          crm_statut_paiement: editStatutPaiement,
          crm_versements: editVersements
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
          crm_etape: editEtape,
          crm_avance: Number(editAvance),
          crm_statut_paiement: editStatutPaiement
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
        setEditStatutPaiement(data.crm_statut_paiement || 'non_paye');
        setEditAvance(data.crm_avance || 0);
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

  // Run Portfolio Analysis
  const handleRunPortfolioAnalysis = async () => {
    setLoadingPortfolioAnalysis(true);
    setIsPortfolioAnalysisModalOpen(true);
    setPortfolioAnalysis('');
    try {
      const res = await fetch('/api/crm/portfolio-analysis', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setPortfolioAnalysis(data.analysis || 'Aucune analyse générée.');
      } else {
        setPortfolioAnalysis(`Une erreur est survenue: ${data.error || 'Erreur serveur.'}`);
      }
    } catch (e) {
      setPortfolioAnalysis("Impossible de se connecter à l'API d'analyse de portefeuille.");
    } finally {
      setLoadingPortfolioAnalysis(false);
    }
  };

  const handleAddVersement = () => {
    if (!newVersementMontant || Number(newVersementMontant) <= 0) {
      alert("Veuillez entrer un montant valide supérieur à 0.");
      return;
    }
    const amount = Number(newVersementMontant);
    const dateStr = new Date().toISOString().split('T')[0];
    const recuNo = `REC-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newV: Versement = {
      id: Math.random().toString(36).substring(2, 9),
      montant: amount,
      date: dateStr,
      mode: newVersementMode,
      recu_numero: recuNo,
      commentaire: newVersementCommentaire
    };

    const updatedList = [...editVersements, newV];
    setEditVersements(updatedList);
    setNewVersementMontant('');
    setNewVersementCommentaire('');

    // Automatically recalculate editAvance & editStatutPaiement
    const totalV = updatedList.reduce((acc, curr) => acc + curr.montant, 0);
    setEditAvance(totalV);
    if (totalV >= editValeur) {
      setEditStatutPaiement('solde');
    } else if (totalV > 0) {
      setEditStatutPaiement('avance');
    } else {
      setEditStatutPaiement('non_paye');
    }
  };

  const handleDeleteVersement = (vId: string) => {
    const updatedList = editVersements.filter(v => v.id !== vId);
    setEditVersements(updatedList);
    const totalV = updatedList.reduce((acc, curr) => acc + curr.montant, 0);
    setEditAvance(totalV);
    if (totalV >= editValeur) {
      setEditStatutPaiement('solde');
    } else if (totalV > 0) {
      setEditStatutPaiement('avance');
    } else {
      setEditStatutPaiement('non_paye');
    }
  };

  const handlePrintReceipt = (contact: Contact) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const remainingToPay = Math.max(0, editValeur - (editStatutPaiement === 'solde' ? editValeur : editAvance));
    const statusText = editStatutPaiement === 'solde' ? 'SOLDÉ / PAYÉ ENTIÈREMENT' : editStatutPaiement === 'avance' ? 'AVANCE PERÇUE' : 'EN ATTENTE DE PAIEMENT';
    const statusColor = editStatutPaiement === 'solde' ? '#10b981' : editStatutPaiement === 'avance' ? '#f59e0b' : '#ef4444';

    const paymentsRows = editVersements.map(v => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 8px; font-family: monospace; font-size: 11px;">${v.date}</td>
        <td style="padding: 8px; font-weight: bold; font-size: 11px;">${formatFCFA(v.montant)}</td>
        <td style="padding: 8px; text-transform: uppercase; font-size: 11px;">${v.mode.replace('_', ' ')}</td>
        <td style="padding: 8px; font-family: monospace; color: #64748b; font-size: 11px;">${v.recu_numero}</td>
      </tr>
    `).join('') || `<tr><td colspan="4" style="padding: 12px; text-align: center; color: #94a3b8; font-style: italic; font-size: 11px;">Aucun versement enregistré.</td></tr>`;

    printWindow.document.write(`
      <html>
        <head>
          <title>Facture / Reçu - ${contact.entreprise}</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; padding: 40px; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
            .logo { font-size: 24px; font-weight: 800; color: #0f172a; letter-spacing: -1px; }
            .badge { display: inline-block; padding: 4px 8px; font-size: 11px; font-weight: bold; border-radius: 4px; color: white; text-transform: uppercase; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 30px; }
            th { background-color: #f8fafc; text-align: left; padding: 10px; font-size: 11px; text-transform: uppercase; color: #64748b; }
            td { padding: 10px; font-size: 12px; }
            .totals { margin-left: auto; width: 300px; margin-top: 30px; border-top: 2px solid #e2e8f0; padding-top: 15px; }
            .total-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; }
            .footer { text-align: center; margin-top: 60px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="header">
            <div>
              <div class="logo">IVOIRESOFT <span style="color: #3b82f6;">CI</span></div>
              <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Solutions Digitales & CRM intégrés</div>
              <div style="font-size: 11px; color: #64748b;">Cocody, Abidjan, Côte d'Ivoire</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 18px; font-weight: bold; color: #0f172a;">FACTURE / REÇU DE PAIEMENT</div>
              <div style="font-size: 11px; color: #64748b; margin-top: 4px; font-family: monospace;">Date: ${new Date().toLocaleDateString('fr-FR')}</div>
              <div style="font-size: 11px; color: #64748b; font-family: monospace;">Ref: FA-${contact.id.substring(0, 8).toUpperCase()}</div>
              <div style="margin-top: 8px;">
                <span class="badge" style="background-color: ${statusColor};">${statusText}</span>
              </div>
            </div>
          </div>

          <div class="grid">
            <div>
              <div style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">Émetteur :</div>
              <div style="font-size: 13px; font-weight: bold; margin-top: 4px;">IvoireSoft Côte d'Ivoire S.A.</div>
              <div style="font-size: 11px; color: #475569; margin-top: 2px;">Plateau, Rue du Commerce</div>
              <div style="font-size: 11px; color: #475569;">Abidjan, Côte d'Ivoire</div>
              <div style="font-size: 11px; color: #475569;">Email: contact@ivoiresoft.ci</div>
            </div>
            <div>
              <div style="font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase;">Destinataire :</div>
              <div style="font-size: 13px; font-weight: bold; margin-top: 4px;">${contact.entreprise}</div>
              <div style="font-size: 11px; color: #475569; margin-top: 2px;">Secteur: ${contact.activite}</div>
              <div style="font-size: 11px; color: #475569;">Tél: ${contact.telephone}</div>
            </div>
          </div>

          <div style="margin-top: 30px;">
            <h3 style="font-size: 13px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; text-transform: uppercase; color: #334155;">Description de l'Affaire</h3>
            <table>
              <thead>
                <tr>
                  <th>Prestation / Projet</th>
                  <th style="text-align: right;">Montant Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="font-weight: bold;">Contrat de Services Digitaux / Campagnes de Communication - ${contact.entreprise}</td>
                  <td style="text-align: right; font-weight: bold; font-family: monospace;">${formatFCFA(editValeur)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style="margin-top: 40px;">
            <h3 style="font-size: 13px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; text-transform: uppercase; color: #334155;">Historique des Versements Reçus (Paiement Échelonné)</h3>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Montant Reçu</th>
                  <th>Mode de Paiement</th>
                  <th>N° de Reçu</th>
                </tr>
              </thead>
              <tbody>
                ${paymentsRows}
              </tbody>
            </table>
          </div>

          <div class="totals">
            <div class="total-row">
              <span style="color: #64748b;">Valeur Totale Contrat:</span>
              <span style="font-family: monospace; font-weight: bold;">${formatFCFA(editValeur)}</span>
            </div>
            <div class="total-row">
              <span style="color: #64748b;">Total Déjà Encaissé:</span>
              <span style="font-family: monospace; font-weight: bold; color: #10b981;">${formatFCFA(editStatutPaiement === 'solde' ? editValeur : editAvance)}</span>
            </div>
            <div class="total-row" style="font-size: 14px; font-weight: bold; border-top: 1px dashed #e2e8f0; padding-top: 8px; margin-top: 4px;">
              <span>Reste à Payer:</span>
              <span style="font-family: monospace; color: ${remainingToPay > 0 ? '#f59e0b' : '#10b981'};">${formatFCFA(remainingToPay)}</span>
            </div>
          </div>

          <div class="footer">
            <p>Merci pour votre confiance ! Pour toute question concernant cette facture, contactez notre service comptable.</p>
            <p style="font-size: 9px; margin-top: 15px; color: #cbd5e1;">IvoireSoft Côte d'Ivoire - R.C.C.M. CI-ABJ-2026-B-1234 - Cocody, Abidjan</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Custom premium Markdown to React parser
  const renderBoldText = (text: string) => {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, i) => i % 2 === 1 ? <strong key={i} className="text-blue-400 font-bold">{part}</strong> : part);
  };

  const parseMarkdownToHTML = (md: string) => {
    if (!md) return null;
    return md.split('\n').map((line, idx) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('###')) {
        return <h3 key={idx} className="text-[11px] font-bold text-emerald-400 font-mono uppercase mt-4 mb-2 tracking-wider flex items-center gap-1.5">{trimmed.replace(/^###\s*/, '')}</h3>;
      }
      if (trimmed.startsWith('##')) {
        return <h2 key={idx} className="text-xs font-bold text-white uppercase tracking-widest mt-5 mb-3 border-b border-white/5 pb-1.5 font-mono">{trimmed.replace(/^##\s*/, '')}</h2>;
      }
      if (trimmed.startsWith('#')) {
        return <h1 key={idx} className="text-sm font-extrabold text-white tracking-tight mt-6 mb-4 flex items-center gap-2">{trimmed.replace(/^#\s*/, '')}</h1>;
      }
      if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
        const content = trimmed.replace(/^[-•]\s*/, '');
        return <li key={idx} className="text-[11px] text-white/80 list-disc ml-4 my-1.5 leading-relaxed">{renderBoldText(content)}</li>;
      }
      if (/^\d+\.\s*/.test(trimmed)) {
        const content = trimmed.replace(/^\d+\.\s*/, '');
        return <li key={idx} className="text-[11px] text-white/80 list-decimal ml-4 my-1.5 leading-relaxed">{renderBoldText(content)}</li>;
      }
      if (trimmed === '') {
        return <div key={idx} className="h-2" />;
      }
      return <p key={idx} className="text-[11px] text-white/70 leading-relaxed my-1.5">{renderBoldText(trimmed)}</p>;
    });
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Entreprise',
      'Telephone',
      'Secteur',
      'Canal Actif',
      'Etape CRM',
      'Valeur Estimée (FCFA)',
      'Statut Paiement',
      'Avance Reçue (FCFA)',
      'Reste à Payer (FCFA)',
      'Notes CRM',
      'Score IA'
    ];
    
    const rows = filteredSortedContacts.map(c => {
      const remaining = Math.max(0, (c.crm_valeur || 0) - (c.crm_statut_paiement === 'solde' ? (c.crm_valeur || 0) : (c.crm_avance || 0)));
      return [
        c.entreprise.replace(/"/g, '""'),
        c.telephone,
        c.activite.replace(/"/g, '""'),
        c.canal_actif || 'whatsapp',
        c.crm_etape || 'nouveau',
        c.crm_valeur || 0,
        c.crm_statut_paiement || 'non_paye',
        c.crm_avance || 0,
        remaining,
        (c.crm_notes || '').replace(/\n/g, ' ').replace(/"/g, '""'),
        c.crm_score_ia !== undefined ? c.crm_score_ia : ''
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `pipeline_crm_ivoiresoft_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export XLSX (.xlsx)
  const handleExportXLSX = () => {
    const data = filteredSortedContacts.map(c => {
      const remaining = Math.max(0, (c.crm_valeur || 0) - (c.crm_statut_paiement === 'solde' ? (c.crm_valeur || 0) : (c.crm_avance || 0)));
      return {
        'Entreprise': c.entreprise,
        'Téléphone': c.telephone,
        'Secteur d\'Activité': c.activite,
        'Canal Actif': c.canal_actif || 'whatsapp',
        'Étape CRM': c.crm_etape || 'nouveau',
        'Valeur Estimée (FCFA)': c.crm_valeur || 0,
        'Statut Paiement': c.crm_statut_paiement || 'non_paye',
        'Avance Reçue (FCFA)': c.crm_avance || 0,
        'Reste à Payer (FCFA)': remaining,
        'Notes CRM': c.crm_notes || '',
        'Score d\'Intérêt IA (%)': c.crm_score_ia !== undefined ? c.crm_score_ia : ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Pipeline CRM');
    XLSX.writeFile(workbook, `pipeline_crm_ivoiresoft_${new Date().toISOString().split('T')[0]}.xlsx`);
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

  // Calculs financiers pour le suivi de facturation (Avances, Soldes, Restes à payer)
  const totalCollected = crmContactsOnly.reduce((sum, c) => {
    if (c.crm_statut_paiement === 'solde') return sum + (c.crm_valeur || 0);
    if (c.crm_statut_paiement === 'avance') return sum + (c.crm_avance || 0);
    return sum;
  }, 0);

  const totalRemainingToCollect = crmContactsOnly.reduce((sum, c) => {
    if (c.crm_statut_paiement === 'solde') return sum;
    if (c.crm_statut_paiement === 'avance') return sum + Math.max(0, (c.crm_valeur || 0) - (c.crm_avance || 0));
    return sum + (c.crm_valeur || 0);
  }, 0);

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
            onClick={handleExportXLSX}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/30 rounded text-xs font-bold transition-all cursor-pointer font-mono"
            title="Exporter les contacts au format Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            EXPORT EXCEL (.XLSX)
          </button>

          <button
            onClick={handleRunPortfolioAnalysis}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-300 border border-emerald-500/20 hover:border-emerald-500/40 rounded text-xs font-bold transition-all cursor-pointer font-mono"
          >
            <Brain className="w-3.5 h-3.5" />
            ANALYSE IA
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

      {/* SECTION PAIEMENT & FACTURATION */}
      <div className="bg-[#0A0C16] border border-white/5 rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-emerald-500/10 text-emerald-400 rounded">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
            <h2 className="text-xs font-bold text-white uppercase font-mono tracking-wider">Suivi Financier & Recouvrement Trésorerie</h2>
          </div>
          
          <button
            onClick={handleRunPortfolioAnalysis}
            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/30 rounded text-[10px] font-bold uppercase font-mono transition-all cursor-pointer"
          >
            <Sparkles className="w-3 h-3" />
            Plan d'action Recouvrement IA
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Métriques à gauche */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-3.5">
            <div className="bg-[#0F121D] p-3.5 rounded-lg border border-white/5 flex-1 flex flex-col justify-center">
              <span className="text-[10px] font-bold text-white/40 uppercase font-mono tracking-wider block">Total Encaissé</span>
              <div className="text-xl font-bold text-emerald-400 font-mono mt-1.5">{formatFCFA(totalCollected)}</div>
              <p className="text-[9px] font-mono text-white/30 mt-1">Avances reçues + contrats entièrement soldés</p>
            </div>
            <div className="bg-[#0F121D] p-3.5 rounded-lg border border-white/5 flex-1 flex flex-col justify-center">
              <span className="text-[10px] font-bold text-white/40 uppercase font-mono tracking-wider block">Reste à Percevoir</span>
              <div className="text-xl font-bold text-yellow-500 font-mono mt-1.5">{formatFCFA(totalRemainingToCollect)}</div>
              <p className="text-[9px] font-mono text-white/30 mt-1">Solde restant à recouvrer sur les deals conclus</p>
            </div>
            <div className="bg-[#0F121D] p-3.5 rounded-lg border border-white/5 flex-1 flex flex-col justify-center">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-white/40 uppercase font-mono tracking-wider block">Taux de Recouvrement</span>
                <span className="text-xs font-mono font-bold text-blue-400">
                  {totalValue > 0 ? Math.round((totalCollected / totalValue) * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mt-2">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-1000" 
                  style={{ width: `${totalValue > 0 ? Math.round((totalCollected / totalValue) * 100) : 0}%` }}
                />
              </div>
              <p className="text-[9px] font-mono text-white/30 mt-1.5">Fonds déjà encaissés par rapport au volume total</p>
            </div>
          </div>

          {/* Graphique de Trésorerie à droite */}
          <div className="lg:col-span-7 bg-[#0F121D] p-4 rounded-lg border border-white/5 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
              <span className="text-[10px] font-bold text-white/60 uppercase font-mono tracking-wider flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
                Analyse des Rentrées par Secteur d'Activité
              </span>
              <span className="text-[9px] font-mono text-white/40 uppercase">Aperçu Trésorerie</span>
            </div>

            {/* Custom Interactive Treasury Chart */}
            <div className="space-y-3 py-1">
              {(() => {
                // Calculate dynamic collections per sector
                const sectorsMap: Record<string, { total: number; collected: number }> = {};
                contacts.forEach(c => {
                  if (c.crm_etape && c.crm_valeur) {
                    const sector = c.activite || 'Autre';
                    if (!sectorsMap[sector]) {
                      sectorsMap[sector] = { total: 0, collected: 0 };
                    }
                    sectorsMap[sector].total += c.crm_valeur;
                    
                    const col = c.crm_statut_paiement === 'solde' 
                      ? c.crm_valeur 
                      : (c.crm_avance || 0);
                    sectorsMap[sector].collected += col;
                  }
                });

                const sectorsList = Object.entries(sectorsMap).map(([name, data]) => ({
                  name,
                  total: data.total,
                  collected: data.collected,
                  remaining: Math.max(0, data.total - data.collected),
                  percent: data.total > 0 ? Math.round((data.collected / data.total) * 100) : 0
                })).sort((a, b) => b.total - a.total).slice(0, 4); // top 4 sectors

                if (sectorsList.length === 0) {
                  return (
                    <div className="h-32 flex flex-col items-center justify-center text-center text-white/20 text-[10px] font-mono gap-1.5">
                      <TrendingUp className="w-5 h-5 text-white/10" />
                      Pas de données financières disponibles
                    </div>
                  );
                }

                return (
                  <div className="space-y-2.5">
                    {sectorsList.map(sec => (
                      <div key={sec.name} className="space-y-1 group">
                        <div className="flex justify-between text-[10px] font-mono">
                          <span className="text-white/80 font-bold group-hover:text-blue-400 transition-colors">{sec.name}</span>
                          <span className="text-white/45">
                            <span className="text-emerald-400 font-bold">{formatFCFA(sec.collected)}</span>
                            <span className="mx-1">/</span>
                            <span>{formatFCFA(sec.total)}</span>
                          </span>
                        </div>
                        
                        {/* Stacked interactive horizontal bar */}
                        <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden flex relative">
                          <div 
                            className="h-full bg-emerald-500/80 group-hover:bg-emerald-400 transition-all duration-500 rounded-l-full"
                            style={{ width: `${sec.percent}%` }}
                            title={`Encaissé: ${sec.percent}%`}
                          />
                          <div 
                            className="h-full bg-yellow-500/60 group-hover:bg-yellow-400 transition-all duration-500 rounded-r-full"
                            style={{ width: `${100 - sec.percent}%` }}
                            title={`Reste à percevoir: ${100 - sec.percent}%`}
                          />
                        </div>
                        <div className="flex justify-between text-[8px] font-mono text-white/30 pt-0.5">
                          <span>{sec.percent}% Recouvré</span>
                          <span>Reste: {formatFCFA(sec.remaining)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            <div className="flex items-center justify-between text-[8px] font-mono text-white/30 border-t border-white/5 pt-1.5">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Encaissé
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 ml-1.5" /> Reste à percevoir
              </span>
              <span>Devise : FCFA (CFA)</span>
            </div>
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
            value={selectedPaymentStatus}
            onChange={(e) => setSelectedPaymentStatus(e.target.value)}
            className="w-full bg-[#08090D] border border-white/10 rounded px-3 py-1.5 text-xs text-white/80 focus:outline-none focus:border-blue-500 transition-colors font-mono"
          >
            <option value="All">Tous les statuts de paiement</option>
            <option value="non_paye">❌ Non Payé / En attente</option>
            <option value="avance">💵 Avance / Reste à payer</option>
            <option value="solde">✅ Soldé / Entièrement Payé</option>
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
                          setEditStatutPaiement(lead.crm_statut_paiement || 'non_paye');
                          setEditAvance(lead.crm_avance || 0);
                          setEditVersements(lead.crm_versements || []);
                          setActiveModalTab('ai');
                          setNewVersementMontant('');
                          setNewVersementCommentaire('');
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

                        {/* Suivi financier badge */}
                        {lead.crm_valeur !== undefined && lead.crm_valeur > 0 && (
                          <div className="mt-2.5 pt-2 border-t border-white/5 flex flex-wrap items-center gap-1.5 justify-between">
                            {lead.crm_statut_paiement === 'solde' ? (
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 font-bold">
                                ✅ SOLDÉ
                              </span>
                            ) : lead.crm_statut_paiement === 'avance' ? (
                              <div className="flex flex-col gap-0.5 w-full">
                                <div className="flex items-center justify-between">
                                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/10 font-bold">
                                    💵 AVANCE
                                  </span>
                                  <span className="text-[9px] font-mono font-bold text-yellow-500">
                                    {formatFCFA(lead.crm_avance)}
                                  </span>
                                </div>
                                <span className="text-[8px] font-mono text-white/40 self-end mt-0.5">
                                  Reste: {formatFCFA(Math.max(0, lead.crm_valeur - (lead.crm_avance || 0)))}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/10 font-bold">
                                ❌ NON PAYÉ
                              </span>
                            )}
                          </div>
                        )}

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
                  <th className="px-5 py-3.5">Statut Paiement</th>
                  <th className="px-5 py-3.5 text-center">Score Prédictif IA</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {filteredSortedContacts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-white/30 font-mono">
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
                        <td className="px-5 py-3.5 font-mono">
                          {lead.crm_statut_paiement === 'solde' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 uppercase">
                              ✅ Soldé
                            </span>
                          ) : lead.crm_statut_paiement === 'avance' ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/10 uppercase w-fit">
                                💵 Avance
                              </span>
                              <span className="text-[10px] text-white/50 font-bold mt-1">
                                Payé: {formatFCFA(lead.crm_avance)}
                              </span>
                              <span className="text-[9px] text-white/30">
                                Reste: {formatFCFA(Math.max(0, (lead.crm_valeur || 0) - (lead.crm_avance || 0)))}
                              </span>
                            </div>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/10 uppercase">
                              ❌ Non Payé
                            </span>
                          )}
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
                              setEditStatutPaiement(lead.crm_statut_paiement || 'non_paye');
                              setEditAvance(lead.crm_avance || 0);
                              setEditVersements(lead.crm_versements || []);
                              setActiveModalTab('ai');
                              setNewVersementMontant('');
                              setNewVersementCommentaire('');
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
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setEditValeur(val);
                      if (editStatutPaiement === 'solde') {
                        setEditAvance(val);
                      }
                    }}
                    className="w-full bg-[#08090D] border border-white/10 rounded px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Section Suivi Financier */}
                <div className="bg-[#0A0C16] border border-white/5 rounded-lg p-3 space-y-2.5">
                  <span className="text-[9px] font-bold text-emerald-400 font-mono uppercase block mb-0.5">💰 Suivi Financier</span>
                  
                  <div>
                    <label className="text-[9px] font-bold text-white/40 font-mono block mb-1">Statut du Paiement</label>
                    <select
                      value={editStatutPaiement}
                      onChange={(e) => {
                        const val = e.target.value as 'non_paye' | 'avance' | 'solde';
                        setEditStatutPaiement(val);
                        if (val === 'solde') {
                          setEditAvance(editValeur);
                        } else if (val === 'non_paye') {
                          setEditAvance(0);
                        }
                      }}
                      className="w-full bg-[#08090D] border border-white/10 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                    >
                      <option value="non_paye">❌ Non Payé / En attente</option>
                      <option value="avance">💵 Avance Versée / Reste à payer</option>
                      <option value="solde">✅ Soldé / Entièrement Payé</option>
                    </select>
                  </div>

                  {editStatutPaiement === 'avance' && (
                    <div>
                      <label className="text-[9px] font-bold text-white/40 font-mono block mb-1">Montant de l'avance reçue (FCFA)</label>
                      <input
                        type="number"
                        value={editAvance}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setEditAvance(val);
                        }}
                        className="w-full bg-[#08090D] border border-white/10 rounded px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-[9px] font-bold text-white/40 font-mono block mb-0.5">Reste à payer (FCFA)</label>
                    <div className="w-full bg-[#08090D]/50 border border-white/5 rounded px-2.5 py-1.5 text-xs font-mono font-bold text-yellow-500/90">
                      {formatFCFA(Math.max(0, editValeur - (editStatutPaiement === 'solde' ? editValeur : editAvance)))}
                    </div>
                  </div>
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

            {/* Column 2: Intelligent Tabs Panel (Right - 7 cols) */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
              
              {/* Tab Navigation */}
              <div className="flex items-center justify-between border-b border-white/5 pb-2 flex-wrap gap-2">
                <div className="flex items-center gap-1 bg-[#08090D] p-1 rounded-lg border border-white/5">
                  <button
                    type="button"
                    onClick={() => setActiveModalTab('ai')}
                    className={`px-3 py-1.5 rounded-md text-[10px] font-bold font-mono uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeModalTab === 'ai' ? 'bg-purple-600 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Brain className="w-3.5 h-3.5" />
                    Analyse IA
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveModalTab('payments')}
                    className={`px-3 py-1.5 rounded-md text-[10px] font-bold font-mono uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeModalTab === 'payments' ? 'bg-emerald-600 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    Versements ({editVersements.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveModalTab('invoice')}
                    className={`px-3 py-1.5 rounded-md text-[10px] font-bold font-mono uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeModalTab === 'invoice' ? 'bg-blue-600 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Facture / Relance
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveModalTab('logs')}
                    className={`px-3 py-1.5 rounded-md text-[10px] font-bold font-mono uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeModalTab === 'logs' ? 'bg-indigo-600 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Échanges ({contactLogs.length})
                  </button>
                </div>
                
                {selectedContact.crm_score_ia !== undefined && activeModalTab === 'ai' && (
                  <div className="flex items-center gap-1 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20 font-mono text-xs text-purple-300 font-extrabold">
                    Score: {selectedContact.crm_score_ia}%
                  </div>
                )}
              </div>

              {/* TAB 1: AI PANEL */}
              {activeModalTab === 'ai' && (
                <div className="flex-1 flex flex-col justify-between space-y-4">
                  <div className="flex-1 bg-[#08090D] border border-white/5 rounded-xl p-4 min-h-[220px] flex flex-col justify-between overflow-y-auto max-h-[300px] font-mono text-xs text-white/90">
                    {selectedContact.crm_analyse_ia ? (
                      <div className="space-y-3.5 text-left">
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
                      type="button"
                      onClick={() => handleAnalyzeIA(selectedContact)}
                      disabled={analyzingId === selectedContact.id}
                      className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded text-xs font-bold font-mono transition-all cursor-pointer shadow-md"
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${analyzingId === selectedContact.id ? 'animate-spin' : ''}`} />
                      {analyzingId === selectedContact.id ? 'ANALYSE...' : '✨ ANALYSER LE LEAD IA'}
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: VERSEMENTS / MULTI-PAIEMENTS */}
              {activeModalTab === 'payments' && (
                <div className="flex-1 flex flex-col space-y-4">
                  {/* Payments List */}
                  <div className="flex-1 bg-[#08090D] border border-white/5 rounded-xl p-4 min-h-[200px] max-h-[250px] overflow-y-auto space-y-2.5">
                    <span className="text-[9px] font-bold text-emerald-400 font-mono uppercase tracking-wider block border-b border-white/5 pb-1">
                      Historique des encaissements ({editVersements.length})
                    </span>

                    {editVersements.length === 0 ? (
                      <div className="text-center py-10 text-white/20 text-[10px] font-sans">
                        <DollarSign className="w-6 h-6 mx-auto text-white/5 mb-1.5" />
                        Aucun versement enregistré pour cette affaire.<br />Saisissez un versement ci-dessous pour commencer.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {editVersements.map((v) => (
                          <div key={v.id} className="bg-white/[2%] border border-white/5 hover:border-white/10 p-2.5 rounded flex items-center justify-between text-[11px] font-mono">
                            <div className="space-y-0.5 text-left">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-emerald-400 font-bold">{formatFCFA(v.montant)}</span>
                                <span className="text-[9px] px-1.5 py-0.2 bg-white/5 text-white/60 rounded uppercase">{v.mode.replace('_', ' ')}</span>
                                <span className="text-[9px] text-white/40">{v.date}</span>
                              </div>
                              <div className="text-[10px] text-white/50 font-sans">
                                {v.commentaire ? v.commentaire : 'Versement échelonné'} · <span className="font-mono text-[9px] text-white/30">{v.recu_numero}</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteVersement(v.id)}
                              className="p-1 text-white/40 hover:text-red-400 rounded transition-colors cursor-pointer"
                              title="Supprimer ce versement"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add payment form */}
                  <div className="bg-[#0A0C16] border border-white/5 rounded-xl p-3.5 space-y-3">
                    <span className="text-[10px] font-bold text-white/60 font-mono uppercase block">Enregistrer un versement échelonné</span>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      <div className="sm:col-span-5">
                        <label className="text-[8px] font-mono text-white/40 block mb-0.5 uppercase">Montant du versement (FCFA)</label>
                        <input
                          type="number"
                          value={newVersementMontant}
                          onChange={(e) => setNewVersementMontant(e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="Montant en FCFA"
                          className="w-full bg-[#08090D] border border-white/10 rounded px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div className="sm:col-span-4">
                        <label className="text-[8px] font-mono text-white/40 block mb-0.5 uppercase">Mode de Paiement</label>
                        <select
                          value={newVersementMode}
                          onChange={(e) => setNewVersementMode(e.target.value as Versement['mode'])}
                          className="w-full bg-[#08090D] border border-white/10 rounded px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                        >
                          <option value="wave">Wave</option>
                          <option value="orange_money">Orange Money</option>
                          <option value="mtn_money">MTN MoMo</option>
                          <option value="virement">Virement bancaire</option>
                          <option value="cheque">Chèque</option>
                          <option value="espece">Espèces</option>
                        </select>
                      </div>

                      <div className="sm:col-span-3 flex items-end">
                        <button
                          type="button"
                          onClick={handleAddVersement}
                          className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold font-mono transition-all cursor-pointer shadow"
                        >
                          + AJOUTER
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-[8px] font-mono text-white/40 block mb-0.5 uppercase">Commentaire / Notes de transaction (Facultatif)</label>
                      <input
                        type="text"
                        value={newVersementCommentaire}
                        onChange={(e) => setNewVersementCommentaire(e.target.value)}
                        placeholder="Ex: Acompte de démarrage, versement n°2, etc."
                        className="w-full bg-[#08090D] border border-white/10 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: FACTURE & RELANCES */}
              {activeModalTab === 'invoice' && (
                <div className="flex-1 flex flex-col space-y-4 text-left">
                  {(() => {
                    const remaining = Math.max(0, editValeur - (editStatutPaiement === 'solde' ? editValeur : editAvance));
                    
                    // Messages templates
                    const textAmical = `Bonjour, IvoireSoft CI vous remercie pour votre confiance. Petit rappel amical concernant notre projet : un solde de ${formatFCFA(remaining)} reste à régler. Wave / Orange Money / Virement acceptés. Merci !`;
                    const textFormel = `Bonjour ${selectedContact.entreprise}. Nous vous rappelons que le solde de ${formatFCFA(remaining)} reste à régulariser pour vos prestations digitales. Merci de procéder au paiement d'ici la fin de semaine. IvoireSoft CI.`;

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 flex-1">
                        
                        {/* 1-Click Reminder Section */}
                        <div className="md:col-span-6 bg-[#08090D] border border-white/5 rounded-xl p-3.5 space-y-3 flex flex-col justify-between">
                          <div>
                            <span className="text-[9px] font-bold text-blue-400 font-mono uppercase block border-b border-white/5 pb-1 mb-2">
                              📢 Relance de Paiement en 1-Clic
                            </span>

                            {remaining === 0 ? (
                              <div className="text-center py-10 text-emerald-400 font-mono text-xs">
                                <Check className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
                                Contrat entièrement soldé !<br />Pas de relance requise.
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {/* Amical option */}
                                <div className="p-2.5 bg-white/[2%] border border-white/5 rounded hover:border-white/10 transition-all text-[11px]">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-blue-400 font-bold font-mono text-[9px] uppercase">Rappel Amical</span>
                                    <div className="flex gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          navigator.clipboard.writeText(textAmical);
                                          alert("Message copié !");
                                        }}
                                        className="text-[9px] font-mono text-white/50 hover:text-white cursor-pointer underline"
                                      >
                                        Copier
                                      </button>
                                      <span className="text-white/20">|</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const phoneFormatted = selectedContact.telephone.replace(/\s+/g, '');
                                          window.open(`https://wa.me/${phoneFormatted}?text=${encodeURIComponent(textAmical)}`, '_blank');
                                        }}
                                        className="text-[9px] font-mono text-emerald-400 hover:text-emerald-300 cursor-pointer font-bold"
                                      >
                                        WhatsApp
                                      </button>
                                    </div>
                                  </div>
                                  <p className="text-white/70 leading-relaxed italic">{textAmical}</p>
                                </div>

                                {/* Formel option */}
                                <div className="p-2.5 bg-white/[2%] border border-white/5 rounded hover:border-white/10 transition-all text-[11px]">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-yellow-500 font-bold font-mono text-[9px] uppercase">Rappel Officiel / Formel</span>
                                    <div className="flex gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          navigator.clipboard.writeText(textFormel);
                                          alert("Message copié !");
                                        }}
                                        className="text-[9px] font-mono text-white/50 hover:text-white cursor-pointer underline"
                                      >
                                        Copier
                                      </button>
                                      <span className="text-white/20">|</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const phoneFormatted = selectedContact.telephone.replace(/\s+/g, '');
                                          window.open(`https://wa.me/${phoneFormatted}?text=${encodeURIComponent(textFormel)}`, '_blank');
                                        }}
                                        className="text-[9px] font-mono text-emerald-400 hover:text-emerald-300 cursor-pointer font-bold"
                                      >
                                        WhatsApp
                                      </button>
                                    </div>
                                  </div>
                                  <p className="text-white/70 leading-relaxed italic">{textFormel}</p>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="text-[9px] font-mono text-white/40 leading-relaxed">
                            💡 Cliquez sur <strong>WhatsApp</strong> pour ouvrir une discussion directe pré-remplie avec le prospect à Abidjan.
                          </div>
                        </div>

                        {/* Invoice Preview Card */}
                        <div className="md:col-span-6 bg-[#0B0D18] border border-white/10 rounded-xl p-4 flex flex-col justify-between space-y-3 shadow-inner">
                          <div className="space-y-2.5">
                            <span className="text-[9px] font-bold text-white/40 font-mono uppercase block border-b border-white/5 pb-1">
                              Aperçu Document Facturation
                            </span>

                            <div className="bg-white text-slate-900 rounded-lg p-3.5 shadow-lg space-y-3 text-[10px] leading-tight font-sans text-left relative overflow-hidden">
                              {/* PAID status stamp */}
                              <div className="absolute top-2.5 right-2.5 rotate-12 border-2 px-1.5 py-0.5 rounded font-mono font-black text-[9px] tracking-widest uppercase" style={{
                                borderColor: editStatutPaiement === 'solde' ? '#10b981' : editStatutPaiement === 'avance' ? '#f59e0b' : '#ef4444',
                                color: editStatutPaiement === 'solde' ? '#10b981' : editStatutPaiement === 'avance' ? '#f59e0b' : '#ef4444'
                              }}>
                                {editStatutPaiement === 'solde' ? 'SOLDÉ' : editStatutPaiement === 'avance' ? 'AVANCE' : 'DÛ'}
                              </div>

                              <div className="space-y-0.5">
                                <div className="font-extrabold text-xs tracking-tight text-slate-950">IVOIRESOFT CI</div>
                                <div className="text-[8px] text-slate-400">Cocody, Abidjan · Côte d'Ivoire</div>
                              </div>

                              <div className="border-t border-slate-100 pt-2 grid grid-cols-2 gap-2 text-[8px]">
                                <div>
                                  <span className="font-bold text-slate-400 block uppercase">Client:</span>
                                  <span className="font-bold text-slate-800">{selectedContact.entreprise}</span>
                                </div>
                                <div className="text-right">
                                  <span className="font-bold text-slate-400 block uppercase">Facture:</span>
                                  <span className="font-mono text-slate-800 font-bold">FA-{selectedContact.id.substring(0,6).toUpperCase()}</span>
                                </div>
                              </div>

                              <table className="w-full text-left text-[8px] mt-2 border-t border-slate-100">
                                <thead>
                                  <tr className="border-b border-slate-100">
                                    <th className="py-1 text-slate-400">Description</th>
                                    <th className="py-1 text-right text-slate-400">Montant</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td className="py-1 text-slate-800 font-bold">Contrat de Prestation Digitale</td>
                                    <td className="py-1 text-right font-mono font-bold text-slate-900">{formatFCFA(editValeur)}</td>
                                  </tr>
                                </tbody>
                              </table>

                              <div className="border-t border-slate-100 pt-1.5 space-y-1 text-[8px] text-right">
                                <div className="flex justify-between">
                                  <span className="text-slate-400">Montant total:</span>
                                  <span className="font-mono font-bold text-slate-800">{formatFCFA(editValeur)}</span>
                                </div>
                                <div className="flex justify-between text-emerald-600 font-bold">
                                  <span>Total versé:</span>
                                  <span className="font-mono">{formatFCFA(editStatutPaiement === 'solde' ? editValeur : editAvance)}</span>
                                </div>
                                <div className="flex justify-between text-slate-950 font-extrabold border-t border-slate-100 pt-1">
                                  <span>Reste à payer:</span>
                                  <span className="font-mono">{formatFCFA(remaining)}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handlePrintReceipt(selectedContact)}
                            className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded text-xs font-bold font-mono transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                          >
                            <FileText className="w-4 h-4" />
                            IMPRIMER LA FACTURE OFFICIELLE (PDF)
                          </button>
                        </div>

                      </div>
                    );
                  })()}
                </div>
              )}

              {activeModalTab === 'logs' && (
                <div className="flex-1 flex flex-col space-y-4 text-left">
                  {/* Status Summary Banner */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#08090D] border border-white/5 p-3 rounded-xl font-mono text-xs">
                    <div className="space-y-0.5">
                      <span className="text-white/40 block text-[9px] uppercase font-bold">Canal Actif</span>
                      <span className="text-white font-bold uppercase">{selectedContact.canal_actif === 'les_deux' ? 'SMS & WhatsApp' : selectedContact.canal_actif}</span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-white/40 block text-[9px] uppercase font-bold">Statut SMS</span>
                      <span className={`font-bold uppercase ${
                        selectedContact.statut_sms === 'envoye' ? 'text-emerald-400' :
                        selectedContact.statut_sms === 'erreur' ? 'text-red-400' : 'text-blue-400'
                      }`}>
                        {selectedContact.statut_sms === 'envoye' ? '✅ Envoyé' :
                         selectedContact.statut_sms === 'erreur' ? '❌ Erreur' : '⏳ Nouveau'}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-white/40 block text-[9px] uppercase font-bold">Statut WhatsApp</span>
                      <span className={`font-bold uppercase ${
                        selectedContact.statut_wa === 'termine' ? 'text-emerald-400' :
                        selectedContact.statut_wa === 'hors_whatsapp' ? 'text-orange-400' :
                        selectedContact.statut_wa === 'erreur' ? 'text-red-400' : 'text-blue-400'
                      }`}>
                        {selectedContact.statut_wa === 'termine' ? '✅ Terminé' :
                         selectedContact.statut_wa === 'hors_whatsapp' ? '⚠️ Hors WA' :
                         selectedContact.statut_wa === 'erreur' ? '❌ Erreur' : `⏳ ${selectedContact.statut_wa}`}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-white/40 block text-[9px] uppercase font-bold">Relances WA</span>
                      <span className="text-white font-bold">{selectedContact.nb_relances} / 3</span>
                    </div>
                  </div>

                  {/* List of Logs */}
                  <div className="flex-1 bg-[#08090D] border border-white/5 rounded-xl p-4 min-h-[300px] max-h-[400px] overflow-y-auto space-y-3.5">
                    <span className="text-[9px] font-bold text-indigo-400 font-mono uppercase tracking-wider block border-b border-white/5 pb-1 mb-2">
                      Historique complet des échanges ({contactLogs.length})
                    </span>

                    {contactLogs.length === 0 ? (
                      <div className="text-center py-16 text-white/20 text-[11px]">
                        <MessageSquare className="w-8 h-8 mx-auto text-white/5 mb-2 animate-pulse" />
                        Aucun envoi automatique ou manuel enregistré pour ce contact.<br />
                        Les échanges (SMS et WhatsApp) s'afficheront ici au fur et à mesure des campagnes.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {[...contactLogs]
                          .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
                          .map((log) => {
                            const isSms = log.canal === 'sms';
                            const formattedDate = log.created_at 
                              ? new Date(log.created_at).toLocaleString('fr-FR', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : '-';

                            return (
                              <div key={log.id} className="bg-[#101323] border border-white/5 hover:border-white/10 rounded-lg p-3.5 space-y-2.5 transition-all">
                                {/* Header of log */}
                                <div className="flex items-center justify-between flex-wrap gap-2 text-[10px] font-mono">
                                  <div className="flex items-center gap-2">
                                    <div className={`p-1 rounded ${
                                      isSms ? 'bg-orange-500/10 text-orange-400' : 'bg-green-500/10 text-green-400'
                                    }`}>
                                      {isSms ? <Smartphone className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
                                    </div>
                                    <span className="font-extrabold uppercase tracking-wide text-white/80">
                                      {isSms ? 'SMS' : 'WhatsApp'}
                                    </span>
                                    <span className="text-white/30">•</span>
                                    <span className="px-1.5 py-0.2 bg-white/5 text-white/60 rounded text-[9px] uppercase font-bold">
                                      {log.type_envoi === 'premier_contact' ? 'Premier Contact' :
                                       log.type_envoi === 'relance_1' ? 'Relance 1' :
                                       log.type_envoi === 'relance_2' ? 'Relance 2' :
                                       log.type_envoi === 'relance_3' ? 'Relance 3' : log.type_envoi}
                                    </span>
                                    {log.campagne_nom && (
                                      <>
                                        <span className="text-white/30">•</span>
                                        <span className="text-blue-400 font-semibold">
                                          Campagne: {log.campagne_nom}
                                        </span>
                                      </>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span className="text-white/40">{formattedDate}</span>
                                    <span className={`px-2 py-0.2 rounded font-bold uppercase text-[8px] ${
                                      log.statut === 'envoye' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                      log.statut === 'hors_whatsapp' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                                      'bg-red-500/10 text-red-400 border border-red-500/20'
                                    }`}>
                                      {log.statut === 'envoye' ? 'Succès' :
                                       log.statut === 'hors_whatsapp' ? 'Hors WA' : 'Échec'}
                                    </span>
                                  </div>
                                </div>

                                {/* Message bubble */}
                                {log.message && (
                                  <div className="bg-black/25 rounded-lg p-2.5 border border-white/5 text-white/80 font-sans text-xs whitespace-pre-line leading-relaxed">
                                    {log.message}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </div>
              )}

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

      {/* PORTFOLIO ANALYSIS MODAL */}
      {isPortfolioAnalysisModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#101323] w-full max-w-2xl rounded-xl border border-white/10 p-6 space-y-5 shadow-2xl overflow-y-auto max-h-[85vh]">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-emerald-500/10 text-emerald-400 rounded">
                  <Brain className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">Plan stratégique de recouvrement IA</h3>
                  <p className="text-[10px] text-white/50 font-mono">Généré par Gemini IA - Directeur Commercial</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsPortfolioAnalysisModalOpen(false)} 
                className="text-white/45 hover:text-white cursor-pointer bg-white/5 p-1 rounded hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {loadingPortfolioAnalysis ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-4">
                  <div className="w-10 h-10 border-2 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin" />
                  <div className="text-center space-y-1">
                    <p className="text-xs font-bold text-white font-mono uppercase tracking-wider animate-pulse">Analyse stratégique en cours...</p>
                    <p className="text-[10px] text-white/40 font-mono">Compilation des données du CRM, des encaissements et des impayés</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-[#08090D] rounded-xl border border-white/5 p-5 text-left leading-relaxed">
                    <div className="markdown-body space-y-3 prose prose-invert max-w-none">
                      {parseMarkdownToHTML(portfolioAnalysis)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 bg-[#0F121D] rounded-lg border border-white/5 p-3 font-mono text-[10px] text-white/40">
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-blue-500" />
                      <span>Analyse 100% sécurisée basée sur vos données locales</span>
                    </div>
                    <span>IvoireSoft Smart Engine</span>
                  </div>

                  <div className="flex justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        const blob = new Blob([portfolioAnalysis], { type: 'text/markdown;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.setAttribute('href', url);
                        link.setAttribute('download', `plan_action_recouvrement_ia_${new Date().toISOString().split('T')[0]}.md`);
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className="px-4 py-2 bg-[#0F121D] hover:bg-white/5 text-white rounded font-mono text-xs font-bold transition-all border border-white/10 cursor-pointer"
                    >
                      Télécharger le Rapport (.md)
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPortfolioAnalysisModalOpen(false)}
                      className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded font-mono text-xs font-bold transition-all cursor-pointer shadow-lg"
                    >
                      FERMER LE RAPPORT
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
