// api.js - Comunicazione con Google Sheets API

// Wrapper per le chiamate API a Google Sheets
class SheetsAPI {
  constructor(spreadsheetId, apiKey) {
    this.spreadsheetId = spreadsheetId;
    this.apiKey = apiKey;
    this.baseUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
  }

  // Leggi dati da un range specifico
  async readRange(sheetName, range) {
    try {
      const fullRange = `${sheetName}!${range}`;
      const url = `${this.baseUrl}/${this.spreadsheetId}/values/${fullRange}?key=${this.apiKey}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Errore HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      return data.values || [];
    } catch (error) {
      console.error('Errore lettura dati:', error);
      throw error;
    }
  }

  // Leggi tutto il foglio
  async readSheet(sheetName) {
    return await this.readRange(sheetName, 'A:Z');
  }

  // Scrivi dati (richiede OAuth - da implementare lato server)
  async writeRange(sheetName, range, values) {
    // Nota: Per scrivere serve OAuth2, non solo API Key
    // Questa è una versione semplificata che richiederà autenticazione
    console.warn('Scrittura richiede autenticazione OAuth2');
    
    try {
      const fullRange = `${sheetName}!${range}`;
      const url = `${this.baseUrl}/${this.spreadsheetId}/values/${fullRange}?valueInputOption=RAW`;
      
      // Qui serve un access token OAuth2
      // Per ora placeholder
      console.log('Dati da scrivere:', values);
      
      return { success: false, message: 'OAuth2 richiesto per scrittura' };
    } catch (error) {
      console.error('Errore scrittura dati:', error);
      throw error;
    }
  }

  // Aggiungi riga (append)
  async appendRow(sheetName, values) {
    console.warn('Append richiede autenticazione OAuth2');
    
    try {
      const url = `${this.baseUrl}/${this.spreadsheetId}/values/${sheetName}!A:A:append?valueInputOption=RAW`;
      
      console.log('Riga da aggiungere:', values);
      
      return { success: false, message: 'OAuth2 richiesto per append' };
    } catch (error) {
      console.error('Errore append riga:', error);
      throw error;
    }
  }
}

// Cache semplice per ridurre chiamate API
class DataCache {
  constructor(ttl = 60000) { // TTL default 1 minuto
    this.cache = new Map();
    this.ttl = ttl;
  }

  set(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  get(key) {
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    // Verifica se è scaduto
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  clear() {
    this.cache.clear();
  }

  has(key) {
    const item = this.cache.get(key);
    if (!item) return false;
    
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }
}

// Istanze globali
let sheetsAPI = null;
const dataCache = new DataCache(60000); // Cache 1 minuto

// Inizializza API
function initAPI(spreadsheetId, apiKey) {
  sheetsAPI = new SheetsAPI(spreadsheetId, apiKey);
  console.log('API Google Sheets inizializzata');
}

// Funzioni helper per ogni foglio

// UTENTI
async function getUtenti(useCache = true) {
  const cacheKey = 'utenti';
  
  if (useCache && dataCache.has(cacheKey)) {
    console.log('Utenti da cache');
    return dataCache.get(cacheKey);
  }
  
  try {
    const rows = await sheetsAPI.readSheet('Utenti');
    
    // Salta intestazione
    const utenti = rows.slice(1).map(row => ({
      id: row[0],
      nome: row[1],
      cognome: row[2],
      ruolo: row[3],
      reparto: row[4],
      attivo: row[5] === 'TRUE'
    }));
    
    dataCache.set(cacheKey, utenti);
    return utenti;
  } catch (error) {
    console.error('Errore caricamento utenti:', error);
    return [];
  }
}

// TURNI SALA
async function getTurni(dataInizio, dataFine, useCache = true) {
  const cacheKey = `turni_${dataInizio}_${dataFine}`;
  
  if (useCache && dataCache.has(cacheKey)) {
    console.log('Turni da cache');
    return dataCache.get(cacheKey);
  }
  
  try {
    const rows = await sheetsAPI.readSheet('TurniSala');
    
    const turni = rows.slice(1)
      .map(row => ({
        id: row[0],
        data: row[1],
        utenteId: row[2],
        turno: row[3],
        oraInizio: row[4],
        oraFine: row[5],
        note: row[6]
      }))
      .filter(t => {
        if (!dataInizio || !dataFine) return true;
        return t.data >= dataInizio && t.data <= dataFine;
      });
    
    dataCache.set(cacheKey, turni);
    return turni;
  } catch (error) {
    console.error('Errore caricamento turni:', error);
    return [];
  }
}

// BACHECA
async function getPostBacheca(limite = 50, useCache = true) {
  const cacheKey = `bacheca_${limite}`;
  
  if (useCache && dataCache.has(cacheKey)) {
    console.log('Post bacheca da cache');
    return dataCache.get(cacheKey);
  }
  
  try {
    const rows = await sheetsAPI.readSheet('PostBacheca');
    
    const posts = rows.slice(1)
      .map(row => ({
        id: row[0],
        utenteId: row[1],
        dataOra: row[2],
        titolo: row[3],
        testo: row[4],
        priorita: row[5]
      }))
      .slice(0, limite)
      .reverse(); // Più recenti prima
    
    dataCache.set(cacheKey, posts);
    return posts;
  } catch (error) {
    console.error('Errore caricamento bacheca:', error);
    return [];
  }
}

// COMMENTI BACHECA
async function getCommentiBacheca(postId, useCache = true) {
  const cacheKey = `commenti_${postId}`;
  
  if (useCache && dataCache.has(cacheKey)) {
    console.log('Commenti da cache');
    return dataCache.get(cacheKey);
  }
  
  try {
    const rows = await sheetsAPI.readSheet('CommentiBacheca');
    
    const commenti = rows.slice(1)
      .map(row => ({
        id: row[0],
        postId: row[1],
        utenteId: row[2],
        dataOra: row[3],
        testo: row[4]
      }))
      .filter(c => c.postId === postId);
    
    dataCache.set(cacheKey, commenti);
    return commenti;
  } catch (error) {
    console.error('Errore caricamento commenti:', error);
    return [];
  }
}

// ORDINI
async function getOrdini(stato = null, useCache = true) {
  const cacheKey = `ordini_${stato || 'tutti'}`;
  
  if (useCache && dataCache.has(cacheKey)) {
    console.log('Ordini da cache');
    return dataCache.get(cacheKey);
  }
  
  try {
    const rows = await sheetsAPI.readSheet('Ordini');
    
    const ordini = rows.slice(1)
      .map(row => ({
        id: row[0],
        data: row[1],
        fornitore: row[2],
        categoria: row[3],
        prodotto: row[4],
        quantita: row[5],
        reparto: row[6],
        priorita: row[7],
        stato: row[8],
        note: row[9]
      }))
      .filter(o => !stato || o.stato === stato);
    
    dataCache.set(cacheKey, ordini);
    return ordini;
  } catch (error) {
    console.error('Errore caricamento ordini:', error);
    return [];
  }
}

// ATTIVITÀ
async function getAttivita(data = null, useCache = true) {
  const cacheKey = `attivita_${data || 'tutte'}`;
  
  if (useCache && dataCache.has(cacheKey)) {
    console.log('Attività da cache');
    return dataCache.get(cacheKey);
  }
  
  try {
    const rows = await sheetsAPI.readSheet('Attivita');
    
    const attivita = rows.slice(1)
      .map(row => ({
        id: row[0],
        data: row[1],
        reparto: row[2],
        attivita: row[3],
        assegnatoA: row[4],
        priorita: row[5],
        stato: row[6],
        note: row[7]
      }))
      .filter(a => !data || a.data === data);
    
    dataCache.set(cacheKey, attivita);
    return attivita;
  } catch (error) {
    console.error('Errore caricamento attività:', error);
    return [];
  }
}

// Forza refresh cache
function refreshCache() {
  dataCache.clear();
  console.log('Cache svuotata');
}

// Export per altri moduli
window.API = {
  init: initAPI,
  getUtenti,
  getTurni,
  getPostBacheca,
  getCommentiBacheca,
  getOrdini,
  getAttivita,
  refreshCache
};
