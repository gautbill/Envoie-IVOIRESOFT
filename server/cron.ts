import { DB } from "./db";
import { generateMessage } from "./ai";
import { Contact, Campagne, EnvoisLog } from "../src/types";

// Keep track of cron intervals and state
export let lastSmsRun: string | null = null;
export let lastWaRun: string | null = null;
export let isSmsRunning = false;
export let isWaRunning = false;

// Helper to format Côte d'Ivoire numbers (+225 XX XX XX XX or 07 XX XX XX to 225XXXXXXXX)
export function formatPhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, ''); // Keep only digits
  if (cleaned.startsWith('225')) {
    return cleaned;
  }
  // If it starts with 0 (like 07, 05, 01) and has 10 digits
  if (cleaned.length === 10) {
    return '225' + cleaned;
  }
  // Standard default
  if (cleaned.length === 8) {
    return '22507' + cleaned; // Assume modern prefix fallback
  }
  return cleaned;
}

// Tick SMS campaigns
export async function tickSMS(manual = false): Promise<{ success: boolean; message: string; count?: number }> {
  if (isSmsRunning) {
    return { success: false, message: "Le cron SMS est déjà en cours d'exécution." };
  }
  isSmsRunning = true;
  lastSmsRun = new Date().toISOString();

  try {
    const config = DB.getConfig();
    const todayStr = new Date().toISOString().split('T')[0];

    // Reset quota if date changed
    if (config.date_reset_sms !== todayStr) {
      DB.updateConfig({
        date_reset_sms: todayStr,
        nb_envoyes_sms: '0',
      });
      config.nb_envoyes_sms = '0';
      config.date_reset_sms = todayStr;
    }

    const quota = parseInt(config.quota_sms) || 200;
    const sentToday = parseInt(config.nb_envoyes_sms) || 0;

    if (sentToday >= quota) {
      isSmsRunning = false;
      return { success: false, message: "Quota SMS journalier atteint aujourd'hui." };
    }

    // Find active SMS campaigns
    const activeCampaigns = DB.getCampagnes().filter(c => c.canal === 'sms' && c.statut === 'active');
    if (activeCampaigns.length === 0) {
      isSmsRunning = false;
      return { success: false, message: "Aucune campagne SMS active trouvée." };
    }

    // Process first active campaign
    const campagne = activeCampaigns[0];
    const categories = campagne.categories || [];
    const batchSize = parseInt(config.batch_size_sms) || 20;

    // Filter contacts belonging to the campaign's categories with statut_sms = 'nouveau'
    const allContacts = DB.getContacts();
    const eligibleContacts = allContacts.filter(c => 
      c.statut_sms === 'nouveau' && 
      categories.includes(c.activite)
    ).slice(0, batchSize);

    if (eligibleContacts.length === 0) {
      // Complete campaign if no more contacts
      DB.updateCampagne(campagne.id, { statut: 'terminee' });
      isSmsRunning = false;
      return { success: true, message: `Campagne "${campagne.nom}" terminée. Plus de contacts éligibles.`, count: 0 };
    }

    // Format numbers
    const phoneNumbers = eligibleContacts.map(c => formatPhoneNumber(c.telephone));
    const mobileNumberStr = phoneNumbers.join(',');
    const messageText = campagne.message_sms_fixe || "Message IvoireSoft CI";

    let apiSuccess = false;
    let apiResponse: any = {};

    // Check if SMSLab credentials exist
    if (!config.smslab_apikey || !config.smslab_device) {
      // SIMULATE IN DEMO MODE
      apiSuccess = true;
      apiResponse = {
        status: "success",
        mode: "demo_simulation",
        message: "Clés API SMSLab manquantes. Envoi simulé avec succès.",
        batch_id: "smslab-sim-" + Math.floor(Math.random() * 1000000),
      };
    } else {
      // REAL API CALL
      try {
        const formData = new URLSearchParams();
        formData.append('message', messageText);
        formData.append('mobile_number', mobileNumberStr);
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
        // Assuming status 200 or response contains success indication
        if (response.ok && (apiResponse.status === 'success' || apiResponse.success === true)) {
          apiSuccess = true;
        } else {
          apiSuccess = false;
        }
      } catch (err: any) {
        apiSuccess = false;
        apiResponse = { error: err.message || "Erreur réseau lors de l'appel SMSLab" };
      }
    }

    if (apiSuccess) {
      // Update contacts and config
      const updatedCount = eligibleContacts.length;
      for (const contact of eligibleContacts) {
        DB.updateContact(contact.id, {
          statut_sms: 'envoye',
          date_envoi_sms: todayStr,
          message_sms: messageText,
        });

        // Insert into log
        DB.createLog({
          contact_id: contact.id,
          campagne_id: campagne.id,
          canal: 'sms',
          type_envoi: 'premier_contact',
          statut: 'envoye',
          message: messageText,
          numeros_batch: mobileNumberStr,
          reponse_api: apiResponse,
        });
      }

      // Update campaigns count
      DB.updateCampagne(campagne.id, {
        nb_envoyes_aujourd_hui: campagne.nb_envoyes_aujourd_hui + updatedCount,
      });

      // Update config
      const newTotalSent = sentToday + updatedCount;
      DB.updateConfig({
        nb_envoyes_sms: String(newTotalSent),
      });

      isSmsRunning = false;
      return { 
        success: true, 
        message: `Batch SMS envoyé avec succès à ${updatedCount} contacts.`, 
        count: updatedCount 
      };
    } else {
      // Mark as error
      for (const contact of eligibleContacts) {
        DB.updateContact(contact.id, {
          statut_sms: 'erreur',
        });

        DB.createLog({
          contact_id: contact.id,
          campagne_id: campagne.id,
          canal: 'sms',
          type_envoi: 'premier_contact',
          statut: 'erreur',
          message: messageText,
          numeros_batch: mobileNumberStr,
          reponse_api: apiResponse,
        });
      }

      isSmsRunning = false;
      return { success: false, message: "Échec de l'envoi du batch SMS via SMSLab API." };
    }
  } catch (e: any) {
    console.error("Error in SMS tick:", e);
    isSmsRunning = false;
    return { success: false, message: e.message || "Une erreur est survenue lors du cron SMS." };
  }
}

// Tick WhatsApp campaigns
export async function tickWA(manual = false): Promise<{ success: boolean; message: string; contact?: any }> {
  if (isWaRunning) {
    return { success: false, message: "Le cron WhatsApp est déjà en cours d'exécution." };
  }
  isWaRunning = true;
  lastWaRun = new Date().toISOString();

  try {
    const config = DB.getConfig();
    const todayStr = new Date().toISOString().split('T')[0];

    // Reset quota if date changed
    if (config.date_reset_wa !== todayStr) {
      DB.updateConfig({
        date_reset_wa: todayStr,
        nb_envoyes_wa: '0',
      });
      config.nb_envoyes_wa = '0';
      config.date_reset_wa = todayStr;
    }

    const quota = parseInt(config.quota_wa) || 100;
    const sentToday = parseInt(config.nb_envoyes_wa) || 0;

    if (sentToday >= quota) {
      isWaRunning = false;
      return { success: false, message: "Quota WhatsApp journalier atteint aujourd'hui." };
    }

    // Find active WhatsApp campaigns
    const activeCampaigns = DB.getCampagnes().filter(c => c.canal === 'whatsapp' && c.statut === 'active');
    if (activeCampaigns.length === 0) {
      isWaRunning = false;
      return { success: false, message: "Aucune campagne WhatsApp active trouvée." };
    }

    const campagne = activeCampaigns[0];
    const categories = campagne.categories || [];

    // PRIORITÉ 1: Relances éligibles (WhatsApp uniquement)
    // - statut_wa IN ('envoye', 'relance_1', 'relance_2')
    // - nb_relances < 3
    // - date_envoi_wa <= TODAY - 3 days
    const allContacts = DB.getContacts();
    let selectedContact: Contact | null = null;
    let typeEnvoi: 'premier_contact' | 'relance_1' | 'relance_2' | 'relance_3' = 'premier_contact';
    let targetStatus: Contact['statut_wa'] = 'envoye';
    let nextRelanceCount = 0;

    // Check for relances first
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const eligibleRelance = allContacts.find(c => {
      if (!c.date_envoi_wa || !categories.includes(c.activite)) return false;
      
      const lastSentDate = new Date(c.date_envoi_wa);
      const isTimePassed = lastSentDate <= threeDaysAgo;
      
      const isStatusEligible = ['envoye', 'relance_1', 'relance_2'].includes(c.statut_wa);
      const isCountEligible = c.nb_relances < 3;

      return isStatusEligible && isCountEligible && isTimePassed;
    });

    if (eligibleRelance) {
      selectedContact = eligibleRelance;
      const currentRelance = eligibleRelance.nb_relances; // 0, 1, or 2
      nextRelanceCount = currentRelance + 1;

      if (nextRelanceCount === 1) {
        typeEnvoi = 'relance_1';
        targetStatus = 'relance_1';
      } else if (nextRelanceCount === 2) {
        typeEnvoi = 'relance_2';
        targetStatus = 'relance_2';
      } else {
        typeEnvoi = 'relance_3';
        targetStatus = 'termine'; // Once 3rd relance is sent, the cycle is complete ('termine')
      }
    } else {
      // PRIORITÉ 2: Nouveaux contacts
      const eligibleNew = allContacts.find(c => 
        c.statut_wa === 'nouveau' && 
        categories.includes(c.activite)
      );

      if (eligibleNew) {
        selectedContact = eligibleNew;
        typeEnvoi = 'premier_contact';
        targetStatus = 'envoye';
        nextRelanceCount = 0;
      }
    }

    if (!selectedContact) {
      // Check if any campaign categories have remaining "nouveau" contacts
      const remainingNew = allContacts.filter(c => c.statut_wa === 'nouveau' && categories.includes(c.activite));
      const remainingRelances = allContacts.filter(c => 
        ['envoye', 'relance_1', 'relance_2'].includes(c.statut_wa) && 
        c.nb_relances < 3 && 
        categories.includes(c.activite)
      );

      if (remainingNew.length === 0 && remainingRelances.length === 0) {
        // Complete campaign
        DB.updateCampagne(campagne.id, { statut: 'terminee' });
        isWaRunning = false;
        return { success: true, message: `Campagne WhatsApp "${campagne.nom}" terminée.` };
      }

      isWaRunning = false;
      return { success: true, message: "Aucun contact prêt pour WhatsApp à cet instant (en attente du délai de 3 jours pour les relances)." };
    }

    // Generate WhatsApp Message using OpenAI / Gemini / Fallback
    const generatedMsg = await generateMessage({
      secteur: selectedContact.activite,
      entreprise: selectedContact.entreprise,
      type: typeEnvoi,
    });

    // Format WhatsApp recipient
    // Green API requires format 225XXXXXXXXX@c.us
    const formattedTel = formatPhoneNumber(selectedContact.telephone);
    const chatId = `${formattedTel}@c.us`;

    let apiSuccess = false;
    let apiResponse: any = {};

    // Check if Green API credentials exist
    if (!config.greenapi_instance || !config.greenapi_token) {
      // SIMULATE IN DEMO MODE
      apiSuccess = true;
      apiResponse = {
        idMessage: "greenapi-sim-" + Math.floor(Math.random() * 1000000),
        status: "success",
        mode: "demo_simulation",
        message: "Clés API Green API manquantes. Envoi simulé avec succès.",
      };
    } else {
      // REAL GREEN API CALL
      try {
        const fileUrl = config.greenapi_image_url || 'https://drive.usercontent.google.com/download?id=1PZDCXr2lEmFPjUIItm1EI6WU8MxURVmR&export=view&authuser=0';
        const url = `https://7107.api.greenapi.com/waInstance${config.greenapi_instance}/sendFileByUrl/${config.greenapi_token}`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
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
          // Green API returns this if the number has no WhatsApp account
          apiSuccess = false;
          targetStatus = 'hors_whatsapp';
        } else {
          apiSuccess = false;
        }
      } catch (err: any) {
        apiSuccess = false;
        apiResponse = { error: err.message || "Erreur réseau lors de l'appel Green API" };
      }
    }

    if (apiSuccess) {
      // Prepare contact updates
      const contactUpdates: Partial<Contact> = {
        statut_wa: targetStatus,
        date_envoi_wa: todayStr,
        nb_relances: nextRelanceCount,
      };

      // Save generated message to appropriate column
      if (typeEnvoi === 'premier_contact') {
        contactUpdates.message_wa = generatedMsg;
      } else if (typeEnvoi === 'relance_1') {
        contactUpdates.relance1_wa = generatedMsg;
      } else if (typeEnvoi === 'relance_2') {
        contactUpdates.relance2_wa = generatedMsg;
      } else if (typeEnvoi === 'relance_3') {
        contactUpdates.relance3_wa = generatedMsg;
      }

      // Update contact
      DB.updateContact(selectedContact.id, contactUpdates);

      // Create log
      DB.createLog({
        contact_id: selectedContact.id,
        campagne_id: campagne.id,
        canal: 'whatsapp',
        type_envoi: typeEnvoi,
        statut: 'envoye',
        message: generatedMsg,
        numeros_batch: null,
        reponse_api: apiResponse,
      });

      // Update campaign stats
      DB.updateCampagne(campagne.id, {
        nb_envoyes_aujourd_hui: campagne.nb_envoyes_aujourd_hui + 1,
      });

      // Update config
      const newTotalSent = sentToday + 1;
      DB.updateConfig({
        nb_envoyes_wa: String(newTotalSent),
      });

      isWaRunning = false;
      return {
        success: true,
        message: `WhatsApp (${typeEnvoi}) envoyé à "${selectedContact.entreprise}" avec succès.`,
        contact: selectedContact,
      };
    } else {
      // If the number was not registered on WhatsApp
      const isNotRegistered = targetStatus === 'hors_whatsapp';
      
      const finalStatus = isNotRegistered ? 'hors_whatsapp' : 'erreur';

      DB.updateContact(selectedContact.id, {
        statut_wa: finalStatus,
      });

      DB.createLog({
        contact_id: selectedContact.id,
        campagne_id: campagne.id,
        canal: 'whatsapp',
        type_envoi: typeEnvoi,
        statut: isNotRegistered ? 'hors_whatsapp' : 'erreur',
        message: generatedMsg,
        numeros_batch: null,
        reponse_api: apiResponse,
      });

      isWaRunning = false;
      return {
        success: false,
        message: isNotRegistered 
          ? `Le numéro de "${selectedContact.entreprise}" n'est pas enregistré sur WhatsApp (hors_whatsapp).`
          : `Échec de l'envoi WhatsApp à "${selectedContact.entreprise}" via Green API.`,
      };
    }
  } catch (e: any) {
    console.error("Error in WA tick:", e);
    isWaRunning = false;
    return { success: false, message: e.message || "Une erreur est survenue lors du cron WhatsApp." };
  }
}

// Background scheduler running every 30 seconds
let cronInterval: NodeJS.Timeout | null = null;

export function startScheduler() {
  if (cronInterval) return;

  console.log("IvoireSoft Campaign Scheduler started.");
  
  // Tick every 30 seconds to check active campaigns
  cronInterval = setInterval(async () => {
    const config = DB.getConfig();
    const now = new Date();
    
    // Convert current server time to Abidjan time (UTC+0)
    // The locale time is provided by environment as UTC-7 (PDT) but the user specified Abidjan time (UTC+0).
    // Let's compute hour in UTC (Abidjan is UTC+0).
    const utcHour = now.getUTCHours();
    const utcMinute = now.getUTCMinutes();
    
    const currentHourStr = `${String(utcHour).padStart(2, '0')}:${String(utcMinute).padStart(2, '0')}`;

    // Get config times
    const startHourSms = config.heure_debut_sms || '09:00';
    const startHourWa = config.heure_debut_wa || '10:00';

    // Verify day is Mon-Sat (1 to 6)
    const dayOfWeek = now.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    const isWorkingDay = dayOfWeek >= 1 && dayOfWeek <= 6;

    if (!isWorkingDay) {
      return; // Do not send on Sundays
    }

    // 1. Run SMS Cron if active and time is appropriate (>= 9:00 and <= 18:00)
    if (currentHourStr >= startHourSms && currentHourStr <= '18:00') {
      // Find out if there's any active SMS campaigns
      const activeSmsCamps = DB.getCampagnes().filter(c => c.canal === 'sms' && c.statut === 'active');
      if (activeSmsCamps.length > 0) {
        // Run SMS tick
        await tickSMS();
      }
    }

    // 2. Run WhatsApp Cron if active and time is appropriate (>= 10:00 and <= 18:00)
    if (currentHourStr >= startHourWa && currentHourStr <= '18:00') {
      const activeWaCamps = DB.getCampagnes().filter(c => c.canal === 'whatsapp' && c.statut === 'active');
      if (activeWaCamps.length > 0) {
        // Run WA tick
        await tickWA();
      }
    }
  }, 30 * 1000);
}
