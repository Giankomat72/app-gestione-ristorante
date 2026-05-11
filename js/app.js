// app.js - Gestione PWA Ristorante Sabrina

// Configurazione
const CONFIG = {
  SCRIPT_URL: '', // URL di Google Apps Script
  USERS: [
    { name: 'Giancarlo', pin: '1234' },
    { name: 'Cecilia', pin: '5678' }
  ],
  TURNI: ['colazione', 'pranzo', 'cena']
};

// Stato applicazione
let currentUser = null;
let currentTurno = 'colazione';

// Inizializzazione
document.addEventListener('DOMContentLoaded', () => {
  console.log('App Ristorante avviata');
  initApp();
});

function initApp() {
  // Setup event listeners
  const btnLogin = document.getElementById('btn-login');
  if (btnLogin) {
    btnLogin.addEventListener('click', handleLogin);
  }
  
  // Bottoni turni
  document.querySelectorAll('.turno-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const turno = e.target.dataset.turno;
      switchTurno(turno);
    });
  });
  
  // Tab navigation
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tab = e.target.dataset.tab;
      switchTab(tab);
    });
  });
  
  // Logout
  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', handleLogout);
  }
  
  // Form disponibilità
  const formDisponibilita = document.getElementById('form-disponibilita');
  if (formDisponibilita) {
    formDisponibilita.addEventListener('submit', handleDisponibilita);
  }
  
  // Form bacheca
  const formBacheca = document.getElementById('form-bacheca');
  if (formBacheca) {
    formBacheca.addEventListener('submit', handleBacheca);
  }
}

function handleLogin(e) {
  e.preventDefault();
  
  const nome = document.getElementById('input-nome').value.trim();
  const pin = document.getElementById('input-pin').value.trim();
  
  // Verifica credenziali
  const user = CONFIG.USERS.find(u => 
    u.name.toLowerCase() === nome.toLowerCase() && u.pin === pin
  );
  
  if (user) {
    currentUser = user.name;
    document.getElementById('header-utente').textContent = user.name;
    showScreen('app');
    loadData();
  } else {
    alert('Nome utente o PIN non validi');
  }
}

function handleLogout() {
  currentUser = null;
  showScreen('login');
  document.getElementById('input-nome').value = '';
  document.getElementById('input-pin').value = '';
}

function showScreen(screen) {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
  });
  document.getElementById(`screen-${screen}`).classList.add('active');
}

function switchTurno(turno) {
  currentTurno = turno;
  document.querySelectorAll('.turno-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');
  loadData();
}

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');
  
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  document.getElementById(`tab-${tab}`).classList.add('active');
}

async function loadData() {
  if (!CONFIG.SCRIPT_URL) {
    console.log('URL Apps Script non configurato');
    return;
  }
  
  try {
    const response = await fetch(`${CONFIG.SCRIPT_URL}?action=getData&turno=${currentTurno}`);
    const data = await response.json();
    
    if (data.disponibilita) {
      displayDisponibilita(data.disponibilita);
    }
    if (data.bacheca) {
      displayBacheca(data.bacheca);
    }
  } catch (error) {
    console.error('Errore caricamento dati:', error);
  }
}

function displayDisponibilita(items) {
  const container = document.getElementById('lista-disponibilita');
  if (!container) return;
  
  container.innerHTML = '';
  items.forEach(item => {
    const div = document.createElement('div');
    div.className = 'disp-item';
    div.innerHTML = `
      <strong>${item.nome}</strong> - ${item.data}<br>
      ${item.note || ''}
    `;
    container.appendChild(div);
  });
}

function displayBacheca(messages) {
  const container = document.getElementById('lista-bacheca');
  if (!container) return;
  
  container.innerHTML = '';
  messages.forEach(msg => {
    const div = document.createElement('div');
    div.className = 'message-item';
    div.innerHTML = `
      <strong>${msg.autore}</strong> <span>${msg.data}</span><br>
      ${msg.testo}
    `;
    container.appendChild(div);
  });
}

async function handleDisponibilita(e) {
  e.preventDefault();
  
  const data = document.getElementById('input-data').value;
  const disponibile = document.getElementById('input-disponibile').checked;
  const note = document.getElementById('input-note').value;
  
  if (!CONFIG.SCRIPT_URL) {
    alert('Configurazione incompleta');
    return;
  }
  
  try {
    const response = await fetch(CONFIG.SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'addDisponibilita',
        turno: currentTurno,
        nome: currentUser,
        data: data,
        disponibile: disponibile,
        note: note
      })
    });
    
    const result = await response.json();
    if (result.success) {
      alert('Disponibilità salvata');
      loadData();
      e.target.reset();
    }
  } catch (error) {
    console.error('Errore salvataggio disponibilità:', error);
    alert('Errore durante il salvataggio');
  }
}

async function handleBacheca(e) {
  e.preventDefault();
  
  const testo = document.getElementById('input-messaggio').value;
  
  if (!CONFIG.SCRIPT_URL) {
    alert('Configurazione incompleta');
    return;
  }
  
  try {
    const response = await fetch(CONFIG.SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'addMessage',
        autore: currentUser,
        testo: testo
      })
    });
    
    const result = await response.json();
    if (result.success) {
      alert('Messaggio pubblicato');
      loadData();
      e.target.reset();
    }
  } catch (error) {
    console.error('Errore pubblicazione messaggio:', error);
    alert('Errore durante la pubblicazione');
  }
}

// Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js')
    .then(reg => console.log('Service Worker registrato', reg))
    .catch(err => console.error('Errore Service Worker', err));
}
