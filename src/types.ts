export interface Contact {
  id: string;
  entreprise: string;
  telephone: string;
  activite: string;
  statut_sms: 'nouveau' | 'envoye' | 'erreur';
  statut_wa: 'nouveau' | 'envoye' | 'relance_1' | 'relance_2' | 'relance_3' | 'termine' | 'hors_whatsapp' | 'erreur';
  date_envoi_sms: string | null; // YYYY-MM-DD
  date_envoi_wa: string | null;  // YYYY-MM-DD
  nb_relances: number;
  message_sms: string | null;
  message_wa: string | null;
  relance1_wa: string | null;
  relance2_wa: string | null;
  relance3_wa: string | null;
  canal_actif: 'sms' | 'whatsapp' | 'les_deux';
  created_at: string;
  
  // CRM optional fields
  crm_etape?: 'nouveau' | 'contacte' | 'discussion' | 'proposition' | 'gagne' | 'perdu';
  crm_valeur?: number;
  crm_notes?: string;
  crm_score_ia?: number;
  crm_analyse_ia?: string;
}

export interface Campagne {
  id: string;
  nom: string;
  canal: 'sms' | 'whatsapp';
  categories: string[];
  message_sms_fixe: string | null;
  utiliser_ia: boolean;
  statut: 'brouillon' | 'active' | 'pausee' | 'terminee';
  quota_jour: number;
  nb_envoyes_aujourd_hui: number;
  heure_demarrage: string;
  batch_size: number;
  intervalle_minutes: number;
  date_reset_quota: string | null;
  created_at: string;
}

export interface EnvoisLog {
  id: string;
  contact_id: string | null;
  contact_entreprise?: string;
  campagne_id: string | null;
  campagne_nom?: string;
  canal: 'sms' | 'whatsapp';
  type_envoi: 'premier_contact' | 'relance_1' | 'relance_2' | 'relance_3';
  statut: 'envoye' | 'erreur' | 'hors_whatsapp';
  message: string | null;
  numeros_batch: string | null;
  reponse_api: any;
  created_at: string;
}

export interface AppConfig {
  nb_envoyes_sms: string;
  nb_envoyes_wa: string;
  quota_sms: string;
  quota_wa: string;
  heure_debut_sms: string;
  heure_debut_wa: string;
  batch_size_sms: string;
  intervalle_sms_minutes: string;
  intervalle_wa_minutes: string;
  date_reset_sms: string;
  date_reset_wa: string;
  openai_key: string;
  smslab_apikey: string;
  smslab_device: string;
  greenapi_instance: string;
  greenapi_token: string;
  greenapi_image_url: string;
  sheets_id_contacts: string;
  [key: string]: string;
}

export interface DashboardStats {
  smsEnvoyesAujourdHui: number;
  smsQuota: number;
  waEnvoyesAujourdHui: number;
  waQuota: number;
  totalContacts: number;
  contactsRestantsSms: number;
  contactsRestantsWa: number;
  breakdownWa: {
    nouveau: number;
    envoye: number;
    relance_1: number;
    relance_2: number;
    relance_3: number;
    termine: number;
    hors_whatsapp: number;
    erreur: number;
  };
  cronSmsState: {
    status: 'actif' | 'attente' | 'quota_atteint';
    nextRunSeconds: number;
  };
  cronWaState: {
    status: 'actif' | 'attente' | 'quota_atteint';
    nextRunSeconds: number;
  };
  recentLogs: EnvoisLog[];
  weeklyActivity: {
    date: string;
    sms: number;
    whatsapp: number;
  }[];
}
