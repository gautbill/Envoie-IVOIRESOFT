import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { DB } from "./server/db";
import { tickSMS, tickWA, startScheduler, lastSmsRun, lastWaRun, isSmsRunning, isWaRunning, formatPhoneNumber } from "./server/cron";
import { generateMessage, analyzeCrmLead } from "./server/ai";
import { Contact, Campagne, EnvoisLog } from "./src/types";

async function startServer() {
  // Initialize Database (loads from Firebase or local db.json fallback)
  await DB.init();

  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Start background campaign cron scheduler
  startScheduler();

  // --- API ROUTES ---

  // Dashboard Stats
  app.get("/api/dashboard-stats", (req, res) => {
    try {
      const contacts = DB.getContacts();
      const campaigns = DB.getCampagnes();
      const logs = DB.getLogs();
      const config = DB.getConfig();

      const todayStr = new Date().toISOString().split('T')[0];

      // Reset today's counts if date changed
      if (config.date_reset_sms !== todayStr) {
        DB.updateConfig({ date_reset_sms: todayStr, nb_envoyes_sms: '0' });
        config.nb_envoyes_sms = '0';
      }
      if (config.date_reset_wa !== todayStr) {
        DB.updateConfig({ date_reset_wa: todayStr, nb_envoyes_wa: '0' });
        config.nb_envoyes_wa = '0';
      }

      const smsSent = parseInt(config.nb_envoyes_sms) || 0;
      const smsQuota = parseInt(config.quota_sms) || 200;
      const waSent = parseInt(config.nb_envoyes_wa) || 0;
      const waQuota = parseInt(config.quota_wa) || 100;

      const totalContacts = contacts.length;

      // Restants
      const activeSmsCamps = campaigns.filter(c => c.canal === 'sms' && c.statut === 'active');
      const activeSmsCats = activeSmsCamps.flatMap(c => c.categories || []);
      const contactsRestantsSms = contacts.filter(c => 
        c.statut_sms === 'nouveau' && 
        (activeSmsCats.length === 0 || activeSmsCats.includes(c.activite))
      ).length;

      const activeWaCamps = campaigns.filter(c => c.canal === 'whatsapp' && c.statut === 'active');
      const activeWaCats = activeWaCamps.flatMap(c => c.categories || []);
      const contactsRestantsWa = contacts.filter(c => 
        c.statut_wa === 'nouveau' && 
        (activeWaCats.length === 0 || activeWaCats.includes(c.activite))
      ).length;

      // WA Breakdown
      const breakdownWa = {
        nouveau: contacts.filter(c => c.statut_wa === 'nouveau').length,
        envoye: contacts.filter(c => c.statut_wa === 'envoye').length,
        relance_1: contacts.filter(c => c.statut_wa === 'relance_1').length,
        relance_2: contacts.filter(c => c.statut_wa === 'relance_2').length,
        relance_3: contacts.filter(c => c.statut_wa === 'relance_3').length,
        termine: contacts.filter(c => c.statut_wa === 'termine').length,
        hors_whatsapp: contacts.filter(c => c.statut_wa === 'hors_whatsapp').length,
        erreur: contacts.filter(c => c.statut_wa === 'erreur').length,
      };

      // Cron States
      const now = new Date();
      const currentHour = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;
      
      const smsCronStatus = smsSent >= smsQuota ? 'quota_atteint' : 
                            (currentHour >= (config.heure_debut_sms || '09:00') && currentHour <= '18:00' && activeSmsCamps.length > 0 ? 'actif' : 'attente');
      
      const waCronStatus = waSent >= waQuota ? 'quota_atteint' : 
                           (currentHour >= (config.heure_debut_wa || '10:00') && currentHour <= '18:00' && activeWaCamps.length > 0 ? 'actif' : 'attente');

      // Weekly Activity (7 last days)
      const weeklyActivity = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayLabel = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
        const dateStr = d.toISOString().split('T')[0];

        // Count logs for this date
        const dayLogs = logs.filter(l => l.created_at.startsWith(dateStr));
        const smsCount = dayLogs.filter(l => l.canal === 'sms' && l.statut === 'envoye').length;
        // Since SMS are sent in batches, if there are batch logs, count actual numbers sent or count log entry
        // Let's count log entries. But wait, since SMS log covers the batch, let's count the number of successfully messaged contacts on that day
        const dayContactsSms = contacts.filter(c => c.date_envoi_sms === dateStr && c.statut_sms === 'envoye').length;
        const dayContactsWa = contacts.filter(c => c.date_envoi_wa === dateStr && c.statut_wa !== 'erreur' && c.statut_wa !== 'nouveau').length;

        weeklyActivity.push({
          date: dayLabel,
          sms: dayContactsSms,
          whatsapp: dayContactsWa,
        });
      }

      res.json({
        smsEnvoyesAujourdHui: smsSent,
        smsQuota,
        waEnvoyesAujourdHui: waSent,
        waQuota,
        totalContacts,
        contactsRestantsSms,
        contactsRestantsWa,
        breakdownWa,
        cronSmsState: {
          status: smsCronStatus,
          nextRunSeconds: isSmsRunning ? 0 : 30,
        },
        cronWaState: {
          status: waCronStatus,
          nextRunSeconds: isWaRunning ? 0 : 30,
        },
        recentLogs: logs.slice(-10).reverse(),
        weeklyActivity,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Contacts APIs
  app.get("/api/contacts", (req, res) => {
    try {
      const contacts = DB.getContacts();
      res.json(contacts);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/contacts/:id", (req, res) => {
    try {
      const contact = DB.getContactById(req.params.id);
      if (!contact) return res.status(404).json({ error: "Contact non trouvé" });
      res.json(contact);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/contacts", (req, res) => {
    try {
      const { entreprise, telephone, activite, canal_actif } = req.body;
      if (!entreprise || !telephone || !activite) {
        return res.status(400).json({ error: "Champs obligatoires manquants" });
      }
      const newContact = DB.createContact({
        entreprise,
        telephone,
        activite,
        statut_sms: 'nouveau',
        statut_wa: 'nouveau',
        date_envoi_sms: null,
        date_envoi_wa: null,
        nb_relances: 0,
        message_sms: null,
        message_wa: null,
        relance1_wa: null,
        relance2_wa: null,
        relance3_wa: null,
        canal_actif: canal_actif || 'les_deux',
      });
      res.status(201).json(newContact);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/contacts/:id", (req, res) => {
    try {
      const updated = DB.updateContact(req.params.id, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/contacts/:id", (req, res) => {
    try {
      DB.deleteContact(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/contacts/:id/analyze-crm", async (req, res) => {
    try {
      const contact = DB.getContactById(req.params.id);
      if (!contact) return res.status(404).json({ error: "Contact non trouvé" });

      const analysis = await analyzeCrmLead({
        entreprise: contact.entreprise,
        activite: contact.activite,
        statut_wa: contact.statut_wa,
        statut_sms: contact.statut_sms,
        nb_relances: contact.nb_relances,
        crm_notes: contact.crm_notes,
        crm_valeur: contact.crm_valeur
      });

      const updated = DB.updateContact(req.params.id, {
        crm_score_ia: analysis.score,
        crm_analyse_ia: analysis.analyse
      });

      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Manual Instant Envois
  app.post("/api/contacts/:id/send-sms-now", async (req, res) => {
    try {
      const contact = DB.getContactById(req.params.id);
      if (!contact) return res.status(404).json({ error: "Contact non trouvé" });

      const { message } = req.body;
      if (!message) return res.status(400).json({ error: "Message requis" });

      const config = DB.getConfig();
      const todayStr = new Date().toISOString().split('T')[0];
      const mobile = formatPhoneNumber(contact.telephone);

      let apiSuccess = false;
      let apiResponse: any = {};

      if (!config.smslab_apikey || !config.smslab_device) {
        apiSuccess = true;
        apiResponse = { status: "success", mode: "demo_simulation" };
      } else {
        try {
          const formData = new URLSearchParams();
          formData.append('message', message);
          formData.append('mobile_number', mobile);
          formData.append('device', config.smslab_device);

          const response = await fetch('https://sms.ivoiresoftci.com/api/v1/sms/send', {
            method: 'POST',
            headers: {
              'apikey': config.smslab_apikey,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData,
          });
          apiResponse = await response.json();
          apiSuccess = response.ok && (apiResponse.status === 'success' || apiResponse.success === true);
        } catch (err: any) {
          apiResponse = { error: err.message };
        }
      }

      if (apiSuccess) {
        DB.updateContact(contact.id, {
          statut_sms: 'envoye',
          date_envoi_sms: todayStr,
          message_sms: message,
        });

        DB.createLog({
          contact_id: contact.id,
          campagne_id: null,
          canal: 'sms',
          type_envoi: 'premier_contact',
          statut: 'envoye',
          message,
          numeros_batch: mobile,
          reponse_api: apiResponse,
        });

        // Increment quota count
        const currentSent = parseInt(config.nb_envoyes_sms) || 0;
        DB.updateConfig({ nb_envoyes_sms: String(currentSent + 1) });

        res.json({ success: true, message: "SMS envoyé avec succès !" });
      } else {
        DB.updateContact(contact.id, { statut_sms: 'erreur' });
        DB.createLog({
          contact_id: contact.id,
          campagne_id: null,
          canal: 'sms',
          type_envoi: 'premier_contact',
          statut: 'erreur',
          message,
          numeros_batch: mobile,
          reponse_api: apiResponse,
        });
        res.status(500).json({ error: "Échec d'envoi SMSLab API", detail: apiResponse });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/contacts/:id/send-wa-now", async (req, res) => {
    try {
      const contact = DB.getContactById(req.params.id);
      if (!contact) return res.status(404).json({ error: "Contact non trouvé" });

      const config = DB.getConfig();
      const todayStr = new Date().toISOString().split('T')[0];

      // Determine the next relance type
      let type: 'premier_contact' | 'relance_1' | 'relance_2' | 'relance_3' = 'premier_contact';
      let nextRelanceCount = 0;
      let targetStatus: Contact['statut_wa'] = 'envoye';

      if (contact.statut_wa === 'envoye') {
        type = 'relance_1';
        targetStatus = 'relance_1';
        nextRelanceCount = 1;
      } else if (contact.statut_wa === 'relance_1') {
        type = 'relance_2';
        targetStatus = 'relance_2';
        nextRelanceCount = 2;
      } else if (contact.statut_wa === 'relance_2') {
        type = 'relance_3';
        targetStatus = 'termine';
        nextRelanceCount = 3;
      }

      // Generate message
      const generatedMsg = await generateMessage({
        secteur: contact.activite,
        entreprise: contact.entreprise,
        type: type,
      });

      const mobile = formatPhoneNumber(contact.telephone);
      const chatId = `${mobile}@c.us`;

      let apiSuccess = false;
      let apiResponse: any = {};

      if (!config.greenapi_instance || !config.greenapi_token) {
        apiSuccess = true;
        apiResponse = { status: "success", mode: "demo_simulation" };
      } else {
        try {
          const fileUrl = config.greenapi_image_url || 'https://drive.usercontent.google.com/download?id=1PZDCXr2lEmFPjUIItm1EI6WU8MxURVmR&export=view&authuser=0';
          const response = await fetch(`https://7107.api.greenapi.com/waInstance${config.greenapi_instance}/sendFileByUrl/${config.greenapi_token}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chatId: chatId,
              urlFile: fileUrl,
              fileName: "ivoiresoft_digital.jpg",
              caption: generatedMsg,
            }),
          });
          apiResponse = await response.json();
          if (response.ok && apiResponse.idMessage) {
            apiSuccess = true;
          } else if (apiResponse.message && apiResponse.message.toLowerCase().includes("not registered")) {
            apiSuccess = false;
            targetStatus = 'hors_whatsapp';
          }
        } catch (err: any) {
          apiResponse = { error: err.message };
        }
      }

      if (apiSuccess) {
        const contactUpdates: Partial<Contact> = {
          statut_wa: targetStatus,
          date_envoi_wa: todayStr,
          nb_relances: nextRelanceCount,
        };

        if (type === 'premier_contact') contactUpdates.message_wa = generatedMsg;
        else if (type === 'relance_1') contactUpdates.relance1_wa = generatedMsg;
        else if (type === 'relance_2') contactUpdates.relance2_wa = generatedMsg;
        else if (type === 'relance_3') contactUpdates.relance3_wa = generatedMsg;

        DB.updateContact(contact.id, contactUpdates);

        DB.createLog({
          contact_id: contact.id,
          campagne_id: null,
          canal: 'whatsapp',
          type_envoi: type,
          statut: 'envoye',
          message: generatedMsg,
          numeros_batch: null,
          reponse_api: apiResponse,
        });

        // Increment WA count
        const currentSent = parseInt(config.nb_envoyes_wa) || 0;
        DB.updateConfig({ nb_envoyes_wa: String(currentSent + 1) });

        res.json({ success: true, message: "WhatsApp envoyé avec succès !", text: generatedMsg });
      } else {
        const isNotRegistered = targetStatus === 'hors_whatsapp';
        const finalStatus = isNotRegistered ? 'hors_whatsapp' : 'erreur';

        DB.updateContact(contact.id, { statut_wa: finalStatus });

        DB.createLog({
          contact_id: contact.id,
          campagne_id: null,
          canal: 'whatsapp',
          type_envoi: type,
          statut: finalStatus,
          message: generatedMsg,
          numeros_batch: null,
          reponse_api: apiResponse,
        });

        res.status(500).json({ 
          error: isNotRegistered ? "Numéro non enregistré sur WhatsApp" : "Échec d'envoi Green API", 
          detail: apiResponse 
        });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Time machine simulation helper for debugging relances (subtract 3 days from date_envoi_wa)
  app.post("/api/contacts/:id/advance-time-relance", (req, res) => {
    try {
      const contact = DB.getContactById(req.params.id);
      if (!contact) return res.status(404).json({ error: "Contact non trouvé" });

      const fakeSentDate = new Date();
      fakeSentDate.setDate(fakeSentDate.getDate() - 3.5); // 3.5 days ago to guarantee passing <= today - 3 days
      const fakeDateStr = fakeSentDate.toISOString().split('T')[0];

      const updated = DB.updateContact(contact.id, {
        date_envoi_wa: fakeDateStr,
      });

      res.json({ 
        success: true, 
        message: `Délai de 3 jours simulé pour "${contact.entreprise}". La date du dernier envoi WA est passée au ${fakeDateStr}.`, 
        contact: updated 
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Config APIs
  app.get("/api/config", (req, res) => {
    try {
      const config = DB.getConfig();
      res.json(config);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/config", (req, res) => {
    try {
      const updated = DB.updateConfig(req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Campagnes APIs
  app.get("/api/campagnes", (req, res) => {
    try {
      const camps = DB.getCampagnes();
      res.json(camps);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/campagnes", (req, res) => {
    try {
      const { nom, canal, categories, message_sms_fixe, utiliser_ia, quota_jour, heure_demarrage } = req.body;
      if (!nom || !canal || !categories) {
        return res.status(400).json({ error: "Champs obligatoires manquants" });
      }

      const config = DB.getConfig();
      const defaultQuota = canal === 'sms' ? 200 : 100;
      const defaultHeure = canal === 'sms' ? (config.heure_debut_sms || '09:00') : (config.heure_debut_wa || '10:00');

      const newCamp = DB.createCampagne({
        nom,
        canal,
        categories,
        message_sms_fixe: canal === 'sms' ? (message_sms_fixe || "") : null,
        utiliser_ia: canal === 'whatsapp' ? (utiliser_ia ?? true) : false,
        statut: 'brouillon',
        quota_jour: quota_jour || defaultQuota,
        nb_envoyes_aujourd_hui: 0,
        heure_demarrage: heure_demarrage || defaultHeure,
        batch_size: canal === 'sms' ? 20 : 1,
        intervalle_minutes: 2,
        date_reset_quota: new Date().toISOString().split('T')[0],
      });
      res.status(201).json(newCamp);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/campagnes/:id", (req, res) => {
    try {
      const updated = DB.updateCampagne(req.params.id, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/campagnes/:id", (req, res) => {
    try {
      DB.deleteCampagne(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Logs API
  app.get("/api/logs", (req, res) => {
    try {
      const logs = DB.getLogs();
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Trigger Crons
  app.post("/api/cron/trigger-sms", async (req, res) => {
    const result = await tickSMS(true);
    res.json(result);
  });

  app.post("/api/cron/trigger-wa", async (req, res) => {
    const result = await tickWA(true);
    res.json(result);
  });

  // Preview AI Message Generator API (for UI preview button)
  app.post("/api/ai/preview-message", async (req, res) => {
    try {
      const { secteur, entreprise, type } = req.body;
      if (!secteur || !entreprise) {
        return res.status(400).json({ error: "secteur et entreprise sont requis" });
      }
      const text = await generateMessage({
        secteur,
        entreprise,
        type: type || 'premier_contact',
      });
      res.json({ text });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Public Google Sheet CSV importer
  app.post("/api/contacts/import-sheets", async (req, res) => {
    try {
      const config = DB.getConfig();
      const sheetId = config.sheets_id_contacts || req.body.sheetId;

      if (!sheetId) {
        return res.status(400).json({ error: "L'ID Google Sheets n'est pas configuré dans les paramètres." });
      }

      // We use the public export URL to retrieve the CSV
      const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
      const response = await fetch(sheetUrl);
      
      if (!response.ok) {
        return res.status(400).json({ error: "Impossible de récupérer le Google Sheet. Vérifiez que le document est partagé avec 'Tous les utilisateurs disposant du lien' en tant que Lecteur." });
      }

      const csvText = await response.text();
      const lines = csvText.split(/\r?\n/);
      
      if (lines.length <= 1) {
        return res.status(400).json({ error: "Le Google Sheet semble vide." });
      }

      // Parse CSV
      const importedContacts: Omit<Contact, 'id' | 'created_at'>[] = [];
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

      // Helper to strip quotes
      const cleanCell = (cell: string) => {
        if (!cell) return '';
        return cell.replace(/^["']|["']$/g, '').trim();
      };

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        // Simple CSV cell splitter (handles some quotes)
        const cells = lines[i].split(',').map(cleanCell);
        
        // Map columns (support flexible indexes or standard Entreprises, Telephones, Activites)
        const entreprise = cells[0];
        const telephone = cells[1];
        const activite = cells[2];

        if (entreprise && telephone && activite) {
          importedContacts.push({
            entreprise,
            telephone,
            activite,
            statut_sms: 'nouveau',
            statut_wa: 'nouveau',
            date_envoi_sms: null,
            date_envoi_wa: null,
            nb_relances: 0,
            message_sms: null,
            message_wa: null,
            relance1_wa: null,
            relance2_wa: null,
            relance3_wa: null,
            canal_actif: 'les_deux',
          });
        }
      }

      if (importedContacts.length === 0) {
        return res.status(400).json({ error: "Aucun contact valide trouvé dans le Google Sheet. Format requis: Entreprise, Téléphone, Activité" });
      }

      const stats = DB.bulkUpsertContacts(importedContacts);
      res.json({ 
        success: true, 
        message: `Importation Google Sheets réussie !`, 
        stats: {
          imported: stats.imported,
          updated: stats.updated,
          totalParsed: importedContacts.length
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Direct CSV Upload/Paste importer
  app.post("/api/contacts/import-csv", (req, res) => {
    try {
      const { csvText } = req.body;
      if (!csvText) {
        return res.status(400).json({ error: "Contenu CSV vide" });
      }

      const lines = csvText.split(/\r?\n/);
      if (lines.length === 0) {
        return res.status(400).json({ error: "Aucune ligne trouvée" });
      }

      const importedContacts: Omit<Contact, 'id' | 'created_at'>[] = [];
      const cleanCell = (cell: string) => {
        if (!cell) return '';
        return cell.replace(/^["']|["']$/g, '').trim();
      };

      // Check separator (comma or semicolon)
      const separator = lines[0].includes(';') ? ';' : ',';

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Skip header if it is likely headers
        if (i === 0 && (line.toLowerCase().includes('entreprise') || line.toLowerCase().includes('telephone') || line.toLowerCase().includes('activité') || line.toLowerCase().includes('activite'))) {
          continue;
        }

        const cells = line.split(separator).map(cleanCell);
        const entreprise = cells[0];
        const telephone = cells[1];
        const activite = cells[2] || 'Général';

        if (entreprise && telephone) {
          importedContacts.push({
            entreprise,
            telephone,
            activite,
            statut_sms: 'nouveau',
            statut_wa: 'nouveau',
            date_envoi_sms: null,
            date_envoi_wa: null,
            nb_relances: 0,
            message_sms: null,
            message_wa: null,
            relance1_wa: null,
            relance2_wa: null,
            relance3_wa: null,
            canal_actif: 'les_deux',
          });
        }
      }

      if (importedContacts.length === 0) {
        return res.status(400).json({ error: "Aucun contact valide trouvé. Format requis: Entreprise, Téléphone, Activité (optionnel)" });
      }

      const stats = DB.bulkUpsertContacts(importedContacts);
      res.json({
        success: true,
        message: `Importation CSV réussie !`,
        stats: {
          imported: stats.imported,
          updated: stats.updated,
          totalParsed: importedContacts.length
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Bulk import existing contacts into CRM
  app.post("/api/contacts/bulk-crm-import", (req, res) => {
    try {
      const { ids } = req.body;
      if (!ids || !Array.isArray(ids)) {
        return res.status(400).json({ error: "Le paramètre ids doit être un tableau d'identifiants" });
      }

      if (ids.length === 0) {
        return res.status(400).json({ error: "Le tableau d'identifiants est vide" });
      }

      const stats = DB.bulkImportToCrm(ids);
      res.json({
        success: true,
        message: `${stats.imported} contacts importés avec succès dans le CRM !`,
        stats: {
          imported: stats.imported,
          total: ids.length
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Direct bulk JSON array import
  app.post("/api/contacts/import-bulk", (req, res) => {
    try {
      const { contacts } = req.body;
      if (!contacts || !Array.isArray(contacts)) {
        return res.status(400).json({ error: "Le paramètre contacts doit être un tableau d'objets" });
      }

      if (contacts.length === 0) {
        return res.status(400).json({ error: "Le tableau de contacts est vide" });
      }

      const importedContacts: Omit<Contact, 'id' | 'created_at'>[] = [];
      for (const item of contacts) {
        if (item.entreprise && item.telephone) {
          importedContacts.push({
            entreprise: String(item.entreprise).trim(),
            telephone: String(item.telephone).trim(),
            activite: String(item.activite || 'Général').trim(),
            statut_sms: item.statut_sms || 'nouveau',
            statut_wa: item.statut_wa || 'nouveau',
            date_envoi_sms: item.date_envoi_sms || null,
            date_envoi_wa: item.date_envoi_wa || null,
            nb_relances: typeof item.nb_relances === 'number' ? item.nb_relances : 0,
            message_sms: item.message_sms || null,
            message_wa: item.message_wa || null,
            relance1_wa: item.relance1_wa || null,
            relance2_wa: item.relance2_wa || null,
            relance3_wa: item.relance3_wa || null,
            canal_actif: item.canal_actif || 'les_deux',
            crm_etape: item.crm_etape || undefined,
            crm_valeur: typeof item.crm_valeur === 'number' ? item.crm_valeur : undefined,
            crm_notes: item.crm_notes || undefined,
            crm_score_ia: typeof item.crm_score_ia === 'number' ? item.crm_score_ia : undefined,
            crm_analyse_ia: item.crm_analyse_ia || undefined
          });
        }
      }

      if (importedContacts.length === 0) {
        return res.status(400).json({ error: "Aucun contact valide trouvé dans les données fournies. Format requis: entreprise, telephone" });
      }

      const stats = DB.bulkUpsertContacts(importedContacts);
      res.json({
        success: true,
        message: `${importedContacts.length} contacts traités avec succès !`,
        stats: {
          imported: stats.imported,
          updated: stats.updated,
          totalParsed: importedContacts.length
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Clean-up db.json contacts back to default state
  app.post("/api/contacts/reset-database", (req, res) => {
    try {
      DB.deleteContact('all'); // Not implemented directly but we can overwrite
      const DB_FILE = path.join(process.cwd(), 'db.json');
      if (fs.existsSync(DB_FILE)) {
        fs.unlinkSync(DB_FILE);
      }
      const contacts = DB.getContacts(); // Reinitializes
      res.json({ success: true, message: "Base de données réinitialisée aux contacts d'origine." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
