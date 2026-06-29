import * as fs from 'fs';
import * as path from 'path';
import { Contact, Campagne, EnvoisLog, AppConfig } from '../src/types';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  deleteDoc, 
  getDoc,
  writeBatch,
  Firestore
} from 'firebase/firestore';

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

// Firebase configuration
let app: any = null;
let firestoreDb: Firestore | null = null;

const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
if (fs.existsSync(configPath)) {
  try {
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    app = initializeApp(firebaseConfig);
    firestoreDb = getFirestore(app);
    console.log("Firebase Firestore initialized successfully on backend.");
  } catch (err) {
    console.error("Failed to initialize Firebase:", err);
  }
} else {
  console.warn("firebase-applet-config.json not found. Falling back to local db.json");
}

let cachedData: DatabaseSchema = {
  contacts: [],
  campagnes: [],
  envois_log: [],
  config: { ...DEFAULT_CONFIG }
};
let isInitialized = false;

export class DB {
  private static readDataFromFile(): DatabaseSchema {
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

  private static writeDataToFile(data: DatabaseSchema): void {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error("Error writing db.json file:", err);
    }
  }

  private static async writeDocToFirestore(collectionName: string, docId: string, data: any): Promise<void> {
    if (!firestoreDb) return;
    try {
      await setDoc(doc(firestoreDb, collectionName, docId), data);
    } catch (err) {
      console.error(`Error writing to Firestore (${collectionName}/${docId}):`, err);
    }
  }

  private static async deleteDocFromFirestore(collectionName: string, docId: string): Promise<void> {
    if (!firestoreDb) return;
    try {
      await deleteDoc(doc(firestoreDb, collectionName, docId));
    } catch (err) {
      console.error(`Error deleting from Firestore (${collectionName}/${docId}):`, err);
    }
  }

  private static async batchWriteDocs(collectionName: string, items: any[]): Promise<void> {
    if (!firestoreDb || items.length === 0) return;
    try {
      const chunks = [];
      for (let i = 0; i < items.length; i += 500) {
        chunks.push(items.slice(i, i + 500));
      }
      for (const chunk of chunks) {
        const batch = writeBatch(firestoreDb);
        for (const item of chunk) {
          const docRef = doc(firestoreDb, collectionName, item.id);
          batch.set(docRef, item);
        }
        await batch.commit();
      }
    } catch (err) {
      console.error(`Error batch writing to Firestore (${collectionName}):`, err);
    }
  }

  public static async init(): Promise<void> {
    if (isInitialized) return;

    if (firestoreDb) {
      try {
        console.log("Loading data from Firebase Firestore...");
        
        // 1. Load config
        const configDocRef = doc(firestoreDb, 'config', 'global_config');
        const configDoc = await getDoc(configDocRef);
        if (configDoc.exists()) {
          cachedData.config = { ...DEFAULT_CONFIG, ...configDoc.data() as AppConfig };
        } else {
          await setDoc(configDocRef, DEFAULT_CONFIG);
          cachedData.config = { ...DEFAULT_CONFIG };
        }

        // 2. Load contacts
        const contactsColRef = collection(firestoreDb, 'contacts');
        const contactsSnapshot = await getDocs(contactsColRef);
        if (!contactsSnapshot.empty) {
          const loadedContacts: Contact[] = [];
          contactsSnapshot.forEach(doc => {
            loadedContacts.push(doc.data() as Contact);
          });
          cachedData.contacts = loadedContacts;
        } else {
          console.log("Seeding initial contacts to Firestore...");
          const seeded = SEED_CONTACTS.map(c => ({
            ...c,
            id: makeId(),
            created_at: new Date().toISOString(),
          }));
          cachedData.contacts = seeded;
          await this.batchWriteDocs('contacts', seeded);
        }

        // 3. Load campagnes
        const campagnesColRef = collection(firestoreDb, 'campagnes');
        const campagnesSnapshot = await getDocs(campagnesColRef);
        const loadedCampagnes: Campagne[] = [];
        campagnesSnapshot.forEach(doc => {
          loadedCampagnes.push(doc.data() as Campagne);
        });
        cachedData.campagnes = loadedCampagnes;

        // 4. Load logs
        const logsColRef = collection(firestoreDb, 'envois_log');
        const logsSnapshot = await getDocs(logsColRef);
        const loadedLogs: EnvoisLog[] = [];
        logsSnapshot.forEach(doc => {
          loadedLogs.push(doc.data() as EnvoisLog);
        });
        cachedData.envois_log = loadedLogs;

        isInitialized = true;
        console.log(`Firebase Firestore loaded: ${cachedData.contacts.length} contacts, ${cachedData.campagnes.length} campaigns, ${cachedData.envois_log.length} logs.`);
        return;
      } catch (err) {
        console.error("Error loading from Firestore, falling back to db.json:", err);
      }
    }

    console.log("Falling back to local db.json...");
    cachedData = this.readDataFromFile();
    isInitialized = true;
  }

  private static ensureInitialized(): void {
    if (!isInitialized) {
      cachedData = this.readDataFromFile();
      isInitialized = true;
    }
  }

  // CONFIG API
  public static getConfig(): AppConfig {
    this.ensureInitialized();
    return cachedData.config;
  }

  public static updateConfig(updates: Partial<AppConfig>): AppConfig {
    this.ensureInitialized();
    cachedData.config = { ...cachedData.config, ...updates };
    if (firestoreDb) {
      this.writeDocToFirestore('config', 'global_config', cachedData.config);
    } else {
      this.writeDataToFile(cachedData);
    }
    return cachedData.config;
  }

  // CONTACTS API
  public static getContacts(): Contact[] {
    this.ensureInitialized();
    return cachedData.contacts;
  }

  public static getContactById(id: string): Contact | undefined {
    this.ensureInitialized();
    return cachedData.contacts.find(c => c.id === id);
  }

  public static createContact(contact: Omit<Contact, 'id' | 'created_at'>): Contact {
    this.ensureInitialized();
    const newContact: Contact = {
      ...contact,
      id: makeId(),
      created_at: new Date().toISOString(),
    };
    cachedData.contacts.push(newContact);
    if (firestoreDb) {
      this.writeDocToFirestore('contacts', newContact.id, newContact);
    } else {
      this.writeDataToFile(cachedData);
    }
    return newContact;
  }

  public static updateContact(id: string, updates: Partial<Contact>): Contact {
    this.ensureInitialized();
    const index = cachedData.contacts.findIndex(c => c.id === id);
    if (index === -1) {
      throw new Error(`Contact ${id} not found`);
    }
    cachedData.contacts[index] = { ...cachedData.contacts[index], ...updates };
    const updated = cachedData.contacts[index];
    if (firestoreDb) {
      this.writeDocToFirestore('contacts', id, updated);
    } else {
      this.writeDataToFile(cachedData);
    }
    return updated;
  }

  public static deleteContact(id: string): void {
    this.ensureInitialized();
    if (id === 'all') {
      const oldContacts = [...cachedData.contacts];
      cachedData.contacts = [];
      if (firestoreDb) {
        Promise.all(oldContacts.map(c => deleteDoc(doc(firestoreDb!, 'contacts', c.id)))).catch(err => {
          console.error("Error batch deleting contacts on reset:", err);
        });
      } else {
        this.writeDataToFile(cachedData);
      }
      return;
    }
    
    cachedData.contacts = cachedData.contacts.filter(c => c.id !== id);
    if (firestoreDb) {
      this.deleteDocFromFirestore('contacts', id);
    } else {
      this.writeDataToFile(cachedData);
    }
  }

  public static bulkImportToCrm(ids: string[]): { imported: number } {
    this.ensureInitialized();
    let imported = 0;
    const updatedContacts: Contact[] = [];
    for (const id of ids) {
      const index = cachedData.contacts.findIndex(c => c.id === id);
      if (index !== -1) {
        if (!cachedData.contacts[index].crm_etape) {
          cachedData.contacts[index] = {
            ...cachedData.contacts[index],
            crm_etape: 'nouveau',
            crm_valeur: cachedData.contacts[index].crm_valeur !== undefined ? cachedData.contacts[index].crm_valeur : 150000,
            crm_notes: cachedData.contacts[index].crm_notes || 'Importé depuis la Base Contacts'
          };
          updatedContacts.push(cachedData.contacts[index]);
          imported++;
        }
      }
    }
    if (firestoreDb) {
      this.batchWriteDocs('contacts', updatedContacts);
    } else {
      this.writeDataToFile(cachedData);
    }
    return { imported };
  }

  public static bulkUpsertContacts(contacts: Omit<Contact, 'id' | 'created_at'>[]): { imported: number, updated: number } {
    this.ensureInitialized();
    let imported = 0;
    let updated = 0;
    const listToSave: Contact[] = [];

    for (const c of contacts) {
      const formattedTel = c.telephone.replace(/\s+/g, '').replace(/^\+225/, '225');
      const existingIdx = cachedData.contacts.findIndex(existing => {
        const existingTel = existing.telephone.replace(/\s+/g, '').replace(/^\+225/, '225');
        return existingTel === formattedTel;
      });

      if (existingIdx !== -1) {
        cachedData.contacts[existingIdx] = {
          ...cachedData.contacts[existingIdx],
          entreprise: c.entreprise || cachedData.contacts[existingIdx].entreprise,
          activite: c.activite || cachedData.contacts[existingIdx].activite,
          canal_actif: c.canal_actif || cachedData.contacts[existingIdx].canal_actif,
          crm_etape: c.crm_etape || cachedData.contacts[existingIdx].crm_etape,
          crm_valeur: c.crm_valeur !== undefined ? c.crm_valeur : cachedData.contacts[existingIdx].crm_valeur,
          crm_notes: c.crm_notes || cachedData.contacts[existingIdx].crm_notes,
          crm_score_ia: c.crm_score_ia !== undefined ? c.crm_score_ia : cachedData.contacts[existingIdx].crm_score_ia,
          crm_analyse_ia: c.crm_analyse_ia || cachedData.contacts[existingIdx].crm_analyse_ia,
        };
        listToSave.push(cachedData.contacts[existingIdx]);
        updated++;
      } else {
        const newContact: Contact = {
          ...c,
          id: makeId(),
          created_at: new Date().toISOString(),
        };
        cachedData.contacts.push(newContact);
        listToSave.push(newContact);
        imported++;
      }
    }

    if (firestoreDb) {
      this.batchWriteDocs('contacts', listToSave);
    } else {
      this.writeDataToFile(cachedData);
    }
    return { imported, updated };
  }

  // CAMPAGNES API
  public static getCampagnes(): Campagne[] {
    this.ensureInitialized();
    return cachedData.campagnes;
  }

  public static createCampagne(campagne: Omit<Campagne, 'id' | 'created_at'>): Campagne {
    this.ensureInitialized();
    const newCamp: Campagne = {
      ...campagne,
      id: makeId(),
      created_at: new Date().toISOString(),
    };
    cachedData.campagnes.push(newCamp);
    if (firestoreDb) {
      this.writeDocToFirestore('campagnes', newCamp.id, newCamp);
    } else {
      this.writeDataToFile(cachedData);
    }
    return newCamp;
  }

  public static updateCampagne(id: string, updates: Partial<Campagne>): Campagne {
    this.ensureInitialized();
    const index = cachedData.campagnes.findIndex(c => c.id === id);
    if (index === -1) {
      throw new Error(`Campagne ${id} not found`);
    }
    cachedData.campagnes[index] = { ...cachedData.campagnes[index], ...updates };
    const updated = cachedData.campagnes[index];
    if (firestoreDb) {
      this.writeDocToFirestore('campagnes', id, updated);
    } else {
      this.writeDataToFile(cachedData);
    }
    return updated;
  }

  public static deleteCampagne(id: string): void {
    this.ensureInitialized();
    cachedData.campagnes = cachedData.campagnes.filter(c => c.id !== id);
    if (firestoreDb) {
      this.deleteDocFromFirestore('campagnes', id);
    } else {
      this.writeDataToFile(cachedData);
    }
  }

  // ENVOIS LOG API
  public static getLogs(): EnvoisLog[] {
    this.ensureInitialized();
    const data = cachedData;
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
    this.ensureInitialized();
    const newLog: EnvoisLog = {
      ...log,
      id: makeId(),
      created_at: new Date().toISOString(),
    };
    cachedData.envois_log.push(newLog);
    if (firestoreDb) {
      this.writeDocToFirestore('envois_log', newLog.id, newLog);
    } else {
      this.writeDataToFile(cachedData);
    }
    return newLog;
  }
}
