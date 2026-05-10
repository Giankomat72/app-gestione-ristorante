// app.js - Gestione principale applicazione PWA Gestione Ristorante

// Configurazione globale
const CONFIG = {
  SPREADSHEET_ID: '', // Inserire ID dello Spreadsheet Google Sheets
  API_KEY: '', // Inserire API Key di Google
  SCOPES: 'https://www.googleapis.com/auth/spreadsheets',
  VERSION: '1.0.0'
};

// Stato applicazione
const AppState = {
  currentSection: 'home',
  userData: null,
  isOnline: navigator.onLine,
  lastSync: null
};

// Inizializzazione app
document.addEventListener('DOMContentLoaded', async () => {
  console.log('App Gestione Ristorante - Avvio');
  
  // Registra Service Worker
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      console.log('Service Worker registrato:', registration);
    } catch (error) {
      console.error('Errore registrazione Service Worker:', error);
    }
  }
  
  // Inizializza interfaccia
  initUI();
  
  // Gestione stato online/offline
  window.addEventListener('online', handleOnlineStatus);
  window.addEventListener('offline', handleOnlineStatus);
  
  // Carica dati utente salvati
  loadUserData();
  
  // Mostra sezione home
  showSection('home');
});

// Inizializzazione interfaccia utente
function initUI() {
  // Gestione navigazione menu
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = link.dataset.section;
      showSection(section);
      updateActiveNav(link);
    });
  });
  
  // Pulsante refresh
  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', handleRefresh);
  }
  
  // Aggiorna stato connessione UI
  updateConnectionStatus();
}

// Mostra sezione specifica
function showSection(sectionName) {
  // Nascondi tutte le sezioni
  const sections = document.querySelectorAll('.section');
  sections.forEach(section => {
    section.classList.remove('active');
  });
  
  // Mostra sezione selezionata
  const targetSection = document.getElementById(sectionName + 'Section');
  if (targetSection) {
    targetSection.classList.add('active');
    AppState.currentSection = sectionName;
    
    // Carica dati sezione
    loadSectionData(sectionName);
  }
}

// Carica dati per sezione specifica
async function loadSectionData(sectionName) {
  switch(sectionName) {
    case 'turni':
      if (typeof loadTurni === 'function') {
        await loadTurni();
      }
      break;
    case 'bacheca':
      if (typeof loadBacheca === 'function') {
        await loadBacheca();
      }
      break;
    case 'ordini':
      if (typeof loadOrdini === 'function') {
        await loadOrdini();
      }
      break;
    case 'attivita':
      if (typeof loadAttivita === 'function') {
        await loadAttivita();
      }
      break;
  }
}

// Aggiorna navigazione attiva
function updateActiveNav(activeLink) {
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => link.classList.remove('active'));
  activeLink.classList.add('active');
}

// Gestione stato online/offline
function handleOnlineStatus() {
  AppState.isOnline = navigator.onLine;
  updateConnectionStatus();
  
  if (AppState.isOnline) {
    console.log('Connessione ripristinata');
    showNotification('Connessione ripristinata', 'success');
    syncData();
  } else {
    console.log('Connessione persa');
    showNotification('Modalità offline attivata', 'warning');
  }
}

// Aggiorna indicatore connessione UI
function updateConnectionStatus() {
  const statusIndicator = document.getElementById('connectionStatus');
  if (statusIndicator) {
    statusIndicator.className = AppState.isOnline ? 'status-online' : 'status-offline';
    statusIndicator.textContent = AppState.isOnline ? 'Online' : 'Offline';
  }
}

// Sincronizzazione dati
async function syncData() {
  if (!AppState.isOnline) return;
  
  try {
    console.log('Sincronizzazione dati...');
    // Qui verrà implementata la sincronizzazione con Google Sheets
    AppState.lastSync = new Date();
    showNotification('Dati sincronizzati', 'success');
  } catch (error) {
    console.error('Errore sincronizzazione:', error);
    showNotification('Errore sincronizzazione dati', 'error');
  }
}

// Refresh manuale
async function handleRefresh() {
  showNotification('Aggiornamento in corso...', 'info');
  await syncData();
  await loadSectionData(AppState.currentSection);
}

// Carica dati utente
function loadUserData() {
  const savedUser = localStorage.getItem('userData');
  if (savedUser) {
    AppState.userData = JSON.parse(savedUser);
  }
}

// Salva dati utente
function saveUserData(userData) {
  AppState.userData = userData;
  localStorage.setItem('userData', JSON.stringify(userData));
}

// Sistema notifiche
function showNotification(message, type = 'info') {
  // Crea elemento notifica
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  
  // Aggiungi al DOM
  document.body.appendChild(notification);
  
  // Mostra con animazione
  setTimeout(() => notification.classList.add('show'), 10);
  
  // Rimuovi dopo 3 secondi
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Utility: formatta data
function formatDate(date) {
  if (!(date instanceof Date)) date = new Date(date);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// Utility: formatta ora
function formatTime(date) {
  if (!(date instanceof Date)) date = new Date(date);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

// Utility: formatta data e ora
function formatDateTime(date) {
  return `${formatDate(date)} ${formatTime(date)}`;
}

// Export per altri moduli
window.App = {
  showSection,
  showNotification,
  formatDate,
  formatTime,
  formatDateTime,
  state: AppState,
  config: CONFIG
};
