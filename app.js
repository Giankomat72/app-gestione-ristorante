/* ==========================================
   app.js - Ristorante Sabrina PWA
   Gestione Login, Navigazione, CRUD
   Backend: Google Sheets via Apps Script
   ========================================== */

'use strict';

// ===== CONFIG BACKEND =====
const API_URL = 'https://script.google.com/macros/s/AKfycbwbDz9DA_o58i07lcLFH-MOu_A45Wo0-2lGHx2fNAaoxvYyA79x8ictrRPsJxCFuVn2Tg/exec';

// ===== STATE LOCALE =====
const state = {
  utente: null,
  ruolo: null,
  bacheca: [],
  ordini: [],
  turni: [],
  attivita: []
};

function oggi() {
  return new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function ora() {
  return new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}
function uid() {
  return Date.now() + Math.random().toString(36).slice(2, 6);
}

// ===== DOM REFS =====
const $ = id => document.getElementById(id);

// ===== API HELPERS =====
async function apiGet(foglio) {
  try {
    const res = await fetch(API_URL + '?azione=leggi&foglio=' + foglio);
    const json = await res.json();
    return json.ok ? json.righe : [];
  } catch(e) {
    console.warn('API GET error:', e);
    return [];
  }
}

async function apiPost(azione, foglio, dati) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ azione, foglio, dati })
    });
    return await res.json();
  } catch(e) {
    console.warn('API POST error:', e);
    return { ok: false };
  }
}

// ===== LOGIN =====
$('btn-login').addEventListener('click', async () => {
  const nome  = $('sel-nome').value;
  const ruolo = $('sel-ruolo').value;
  if (!nome || !ruolo) { alert('Seleziona nome e ruolo.'); return; }
  state.utente = nome;
  state.ruolo  = ruolo;
  $('header-utente').textContent = nome + ' (' + ruolo + ')';
  showScreen('screen-app');
  await caricaTutto();
});

$('btn-logout').addEventListener('click', () => {
  state.utente = null;
  state.ruolo  = null;
  $('sel-nome').value  = '';
  $('sel-ruolo').value = '';
  showScreen('screen-login');
});

// ===== SCREENS =====
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
}

// ===== BOTTOM NAV =====
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    $('sec-' + btn.dataset.target).classList.add('active');
  });
});

// ===== CARICA TUTTO DAL BACKEND =====
async function caricaTutto() {
  mostraLoading(true);
  const [bacheca, ordini, turni, attivita] = await Promise.all([
    apiGet('Bacheca'),
    apiGet('Ordini'),
    apiGet('TurniSala'),
    apiGet('Attivita')
  ]);
  state.bacheca  = bacheca  || [];
  state.ordini   = ordini   || [];
  state.turni    = turni    || [];
  state.attivita = attivita || [];
  mostraLoading(false);
  renderAll();
}

function mostraLoading(attivo) {
  // Indicatore minimo
  const h = $('header-utente');
  if (h) h.style.opacity = attivo ? '0.5' : '1';
}

function renderAll() {
  renderBacheca();
  renderOrdini();
  renderTurni();
  renderAttivita();
}

// ===========================
// BACHECA
// ===========================
function renderBacheca() {
  const list = $('bacheca-list');
  if (!state.bacheca.length) {
    list.innerHTML = '<div class="empty-state">Nessun messaggio in bacheca</div>';
    return;
  }
  list.innerHTML = state.bacheca.slice().reverse().map(p => `
    <div class="card">
      <div class="card-meta">${p.Autore || p.autore || ''} &bull; ${p.DataOra || p.data || ''}</div>
      <div class="card-body">${p.Testo || p.testo || ''}</div>
    </div>
  `).join('');
}

$('btn-new-post').addEventListener('click', () => toggle('form-post'));
$('btn-cancel-post').addEventListener('click', () => { hide('form-post'); $('txt-post').value = ''; });
$('btn-save-post').addEventListener('click', async () => {
  const testo = $('txt-post').value.trim();
  if (!testo) return;
  const dati = { Autore: state.utente, Testo: testo, DataOra: oggi() + ' ' + ora() };
  const res = await apiPost('aggiungi', 'Bacheca', dati);
  if (res.ok) {
    state.bacheca.push({ ...dati, ID: res.id });
    $('txt-post').value = '';
    hide('form-post');
    renderBacheca();
  } else {
    alert('Errore salvataggio.');
  }
});

// ===========================
// ORDINI
// ===========================
function renderOrdini() {
  const list = $('ordini-list');
  if (!state.ordini.length) {
    list.innerHTML = '<div class="empty-state">Nessun ordine attivo</div>';
    return;
  }
  list.innerHTML = state.ordini.slice().reverse().map(o => `
    <div class="card">
      <div class="card-meta">Tavolo ${o.Tavolo || o.tavolo || '?'} &bull; ${o.Cameriere || o.autore || ''} &bull; ${o.OraOrdine || o.ora || ''}</div>
      <div class="card-body">${o.Ordine || o.testo || ''}</div>
    </div>
  `).join('');
}

$('btn-new-ordine').addEventListener('click', () => toggle('form-ordine'));
$('btn-cancel-ordine').addEventListener('click', () => { hide('form-ordine'); $('txt-tavolo').value=''; $('txt-ordine').value=''; });
$('btn-save-ordine').addEventListener('click', async () => {
  const tavolo = $('txt-tavolo').value;
  const testo  = $('txt-ordine').value.trim();
  if (!tavolo || !testo) { alert('Inserisci tavolo e ordine.'); return; }
  const dati = { Tavolo: tavolo, Ordine: testo, Cameriere: state.utente, OraOrdine: ora(), Stato: 'aperto' };
  const res = await apiPost('aggiungi', 'Ordini', dati);
  if (res.ok) {
    state.ordini.push({ ...dati, ID: res.id });
    $('txt-tavolo').value = ''; $('txt-ordine').value = '';
    hide('form-ordine');
    renderOrdini();
  } else { alert('Errore salvataggio.'); }
});

// ===========================
// TURNI
// ===========================
function renderTurni() {
  const list = $('turni-list');
  if (!state.turni.length) {
    list.innerHTML = '<div class="empty-state">Nessun turno registrato</div>';
    return;
  }
  const byDate = {};
  state.turni.forEach(t => {
    const k = t.DataTurno || t.data || '?';
    if (!byDate[k]) byDate[k] = [];
    byDate[k].push(t);
  });
  list.innerHTML = Object.keys(byDate).sort().reverse().map(data => `
    <div class="card">
      <div class="card-meta" style="font-weight:700;color:var(--accent-h)">${data}</div>
      ${byDate[data].map(t => `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px">
          <span class="card-body">${t.NomePersona || t.utente || ''}</span>
          <span class="card-tag ${(t.TipoTurno||t.tipo||'').toLowerCase()}">${t.TipoTurno || t.tipo || ''}</span>
        </div>
      `).join('')}
    </div>
  `).join('');
}

$('btn-new-turno').addEventListener('click', () => { $('txt-data').value = new Date().toISOString().split('T')[0]; toggle('form-turno'); });
$('btn-cancel-turno').addEventListener('click', () => hide('form-turno'));
$('btn-save-turno').addEventListener('click', async () => {
  const data   = $('txt-data').value;
  const tipo   = $('sel-turno-tipo').value;
  const utente = $('sel-turno-utente').value;
  if (!data) { alert('Seleziona una data.'); return; }
  const dati = { DataTurno: data, TipoTurno: tipo, NomePersona: utente, Reparto: 'Sala' };
  const res = await apiPost('aggiungi', 'TurniSala', dati);
  if (res.ok) {
    state.turni.push({ ...dati, ID: res.id });
    hide('form-turno');
    renderTurni();
  } else { alert('Errore salvataggio.'); }
});

// ===========================
// ATTIVITA
// ===========================
function renderAttivita() {
  const list = $('attivita-list');
  if (!state.attivita.length) {
    list.innerHTML = '<div class="empty-state">Nessuna attivita in corso</div>';
    return;
  }
  const renderItem = a => `
    <div class="card" style="${a.Completata==='si'||a.done?'opacity:.5':''}">
      <div style="display:flex;align-items:center;gap:10px">
        <span class="card-body" style="${a.Completata==='si'||a.done?'text-decoration:line-through':''}">${a.Descrizione||a.testo||''}</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:8px">
        <span class="card-meta">${a.AssegnatoA||a.autore||''} &bull; ${a.DataCreazione||a.data||''}</span>
        <span class="card-tag ${(a.Priorita||a.priorita||'normale').toLowerCase()}">${a.Priorita||a.priorita||'normale'}</span>
      </div>
    </div>
  `;
  list.innerHTML = state.attivita.map(renderItem).join('');
}

$('btn-new-task').addEventListener('click', () => toggle('form-task'));
$('btn-cancel-task').addEventListener('click', () => { hide('form-task'); $('txt-task').value=''; });
$('btn-save-task').addEventListener('click', async () => {
  const testo    = $('txt-task').value.trim();
  const priorita = $('sel-task-priorita').value;
  if (!testo) { alert('Inserisci la descrizione.'); return; }
  const dati = { Descrizione: testo, Priorita: priorita, AssegnatoA: state.utente, Completata: 'no', DataCreazione: oggi() };
  const res = await apiPost('aggiungi', 'Attivita', dati);
  if (res.ok) {
    state.attivita.push({ ...dati, ID: res.id });
    $('txt-task').value = '';
    hide('form-task');
    renderAttivita();
  } else { alert('Errore salvataggio.'); }
});

// ===== UTILS =====
function toggle(id) { $(id).classList.toggle('hidden'); }
function hide(id)   { $(id).classList.add('hidden'); }

// ===== PWA SERVICE WORKER =====
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js')
      .catch(err => console.warn('SW:', err));
  });
}
