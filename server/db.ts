import * as fs from 'fs';
import * as path from 'path';
import { Contact, Campagne, EnvoisLog, AppConfig } from '../src/types';

const DB_FILE = path.join(process.cwd(), 'db.json');

interface DatabaseSchema {
  contacts: Contact[];
  campagnes: Campagne[];
  envois_log: EnvoisLog[];
  config: AppConfig;
}

const DEFAULT_CONFIG: AppConfig = {
  nb_envoyes_sms: '0',
  nb_envoyes_wa: '0',
  quota_sms: '200',
  quota_wa: '100',
  heure_debut_sms: '09:00',
  heure_debut_wa: '10:00',
  batch_size_sms: '20',
  intervalle_sms_minutes: '2',
  intervalle_wa_minutes: '2',
  date_reset_sms: new Date().toISOString().split('T')[0],
  date_reset_wa: new Date().toISOString().split('T')[0],
  openai_key: '',
  smslab_apikey: '',
  smslab_device: '',
  greenapi_instance: '',
  greenapi_token: '',
  greenapi_image_url: 'https://drive.usercontent.google.com/download?id=1PZDCXr2lEmFPjUIItm1EI6WU8MxURVmR&export=view&authuser=0',
  sheets_id_contacts: '',
};

const SEED_CONTACTS: Omit<Contact, 'id' | 'created_at'>[] = [
  // Restaurants
  {
    entreprise: 'Maquis Chez Koffi',
    telephone: '+225 07 01 11 11 11',
    activite: 'Restaurants',
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
  },
  {
    entreprise: 'Restaurant Le Plateau',
    telephone: '+225 05 02 22 22 22',
    activite: 'Restaurants',
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
  },
  {
    entreprise: 'Fast-food Yamousso',
    telephone: '+225 01 03 33 33 33',
    activite: 'Restaurants',
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
  },
  {
    entreprise: 'Snack Bar Cocody',
    telephone: '+225 07 04 44 44 44',
    activite: 'Restaurants',
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
  },
  // BTP
  {
    entreprise: 'Construire CI SARL',
    telephone: '+225 05 05 55 55 55',
    activite: 'BTP',
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
  },
  {
    entreprise: 'BTP Yao & Frères',
    telephone: '+225 07 06 66 66 66',
    activite: 'BTP',
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
  },
  {
    entreprise: 'Société Abidjan Bâtiment',
    telephone: '+225 01 07 77 77 77',
    activite: 'BTP',
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
  },
  {
    entreprise: 'Travaux Publics Kouame',
    telephone: '+225 05 08 88 88 88',
    activite: 'BTP',
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
  },
  // Agences immobilières
  {
    entreprise: "Immo Côte d'Ivoire",
    telephone: '+225 07 09 99 99 91',
    activite: 'Agences immobilières',
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
  },
  {
    entreprise: 'Prestige Immobilier',
    telephone: '+225 05 01 00 00 01',
    activite: 'Agences immobilières',
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
  },
  {
    entreprise: 'Habitat Plus CI',
    telephone: '+225 01 02 00 00 02',
    activite: 'Agences immobilières',
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
  },
  {
    entreprise: 'Invest Immobilier',
    telephone: '+225 07 03 00 00 03',
    activite: 'Agences immobilières',
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
  },
  // Transports
  {
    entreprise: 'Transport Rapide CI',
    telephone: '+225 05 04 00 00 04',
    activite: 'Transports',
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
  },
  {
    entreprise: 'VTC Abidjan Express',
    telephone: '+225 07 05 00 00 05',
    activite: 'Transports',
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
  },
  {
    entreprise: 'Logistique Ivoire',
    telephone: '+225 01 06 00 00 06',
    activite: 'Transports',
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
  },
  {
    entreprise: 'Taxi Plus Cocody',
    telephone: '+225 05 07 00 00 07',
    activite: 'Transports',
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
  },
  // Salons de coiffure
  {
    entreprise: 'Beauté Africaine Coiffure',
    telephone: '+225 07 08 00 00 08',
    activite: 'Salons de coiffure',
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
  },
  {
    entreprise: 'Salon Élégance Marcory',
    telephone: '+225 01 09 00 00 09',
    activite: 'Salons de coiffure',
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
  },
  {
    entreprise: 'Coiffure Mode CI',
    telephone: '+225 05 01 00 00 10',
    activite: 'Salons de coiffure',
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
  },
  {
    entreprise: 'Tendance Beauté Yopougon',
    telephone: '+225 07 02 00 00 11',
    activite: 'Salons de coiffure',
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
  }
];

// Helper to generate IDs
function makeId(): string {
  return Math.random().toString(36).substring(2, 9) + '-' + Math.random().toString(36).substring(2, 9);
}

export class DB {
  private static readData(): DatabaseSchema {
    if (!fs.existsSync(DB_FILE)) {
      const data: DatabaseSchema = {
        contacts: SEED_CONTACTS.map(c => ({
          ...c,
          id: makeId(),
          created_at: new Date().toISOString(),
        })),
        campagnes: [],
        envois_log: [],
        config: { ...DEFAULT_CONFIG },
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
      return data;
    }
    try {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const data = JSON.parse(content) as DatabaseSchema;
      // Ensure config keys exist
      data.config = { ...DEFAULT_CONFIG, ...data.config };
      return data;
    } catch (e) {
      console.error('Error reading db.json, recreating...', e);
      const data: DatabaseSchema = {
        contacts: SEED_CONTACTS.map(c => ({
          ...c,
          id: makeId(),
          created_at: new Date().toISOString(),
        })),
        campagnes: [],
        envois_log: [],
        config: { ...DEFAULT_CONFIG },
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
      return data;
    }
  }

  private static writeData(data: DatabaseSchema): void {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  }

  // CONFIG API
  public static getConfig(): AppConfig {
    return this.readData().config;
  }

  public static updateConfig(updates: Partial<AppConfig>): AppConfig {
    const data = this.readData();
    data.config = { ...data.config, ...updates };
    this.writeData(data);
    return data.config;
  }

  // CONTACTS API
  public static getContacts(): Contact[] {
    return this.readData().contacts;
  }

  public static getContactById(id: string): Contact | undefined {
    return this.readData().contacts.find(c => c.id === id);
  }

  public static createContact(contact: Omit<Contact, 'id' | 'created_at'>): Contact {
    const data = this.readData();
    const newContact: Contact = {
      ...contact,
      id: makeId(),
      created_at: new Date().toISOString(),
    };
    data.contacts.push(newContact);
    this.writeData(data);
    return newContact;
  }

  public static updateContact(id: string, updates: Partial<Contact>): Contact {
    const data = this.readData();
    const index = data.contacts.findIndex(c => c.id === id);
    if (index === -1) {
      throw new Error(`Contact ${id} not found`);
    }
    data.contacts[index] = { ...data.contacts[index], ...updates };
    this.writeData(data);
    return data.contacts[index];
  }

  public static deleteContact(id: string): void {
    const data = this.readData();
    data.contacts = data.contacts.filter(c => c.id !== id);
    this.writeData(data);
  }

  public static bulkUpsertContacts(contacts: Omit<Contact, 'id' | 'created_at'>[]): { imported: number, updated: number } {
    const data = this.readData();
    let imported = 0;
    let updated = 0;

    for (const c of contacts) {
      // Find by telephone
      const formattedTel = c.telephone.replace(/\s+/g, '').replace(/^\+225/, '225');
      const existingIdx = data.contacts.findIndex(existing => {
        const existingTel = existing.telephone.replace(/\s+/g, '').replace(/^\+225/, '225');
        return existingTel === formattedTel;
      });

      if (existingIdx !== -1) {
        data.contacts[existingIdx] = {
          ...data.contacts[existingIdx],
          entreprise: c.entreprise || data.contacts[existingIdx].entreprise,
          activite: c.activite || data.contacts[existingIdx].activite,
          canal_actif: c.canal_actif || data.contacts[existingIdx].canal_actif,
        };
        updated++;
      } else {
        data.contacts.push({
          ...c,
          id: makeId(),
          created_at: new Date().toISOString(),
        });
        imported++;
      }
    }

    this.writeData(data);
    return { imported, updated };
  }

  // CAMPAGNES API
  public static getCampagnes(): Campagne[] {
    return this.readData().campagnes;
  }

  public static createCampagne(campagne: Omit<Campagne, 'id' | 'created_at'>): Campagne {
    const data = this.readData();
    const newCamp: Campagne = {
      ...campagne,
      id: makeId(),
      created_at: new Date().toISOString(),
    };
    data.campagnes.push(newCamp);
    this.writeData(data);
    return newCamp;
  }

  public static updateCampagne(id: string, updates: Partial<Campagne>): Campagne {
    const data = this.readData();
    const index = data.campagnes.findIndex(c => c.id === id);
    if (index === -1) {
      throw new Error(`Campagne ${id} not found`);
    }
    data.campagnes[index] = { ...data.campagnes[index], ...updates };
    this.writeData(data);
    return data.campagnes[index];
  }

  public static deleteCampagne(id: string): void {
    const data = this.readData();
    data.campagnes = data.campagnes.filter(c => c.id !== id);
    this.writeData(data);
  }

  // ENVOIS LOG API
  public static getLogs(): EnvoisLog[] {
    const data = this.readData();
    return data.envois_log.map(log => {
      const contact = data.contacts.find(c => c.id === log.contact_id);
      const campagne = data.campagnes.find(camp => camp.id === log.campagne_id);
      return {
        ...log,
        contact_entreprise: contact ? contact.entreprise : undefined,
        campagne_nom: campagne ? campagne.nom : undefined,
      };
    });
  }

  public static createLog(log: Omit<EnvoisLog, 'id' | 'created_at'>): EnvoisLog {
    const data = this.readData();
    const newLog: EnvoisLog = {
      ...log,
      id: makeId(),
      created_at: new Date().toISOString(),
    };
    data.envois_log.push(newLog);
    this.writeData(data);
    return newLog;
  }
}
