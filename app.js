/* ==========================================
   app.js - Ristorante Sabrina PWA v2
   + Sistema PIN per accesso sicuro
   + Bacheca dal backend Google Sheets
   + Turni: colazione / pranzo / cena
   ========================================== */
'use strict';

// ===== CONFIG =====
const API_URL = 'https://script.google.com/macros/s/AKfycbwbDz9DA_o58i07lcLFH-MOu_A45Wo0-2lGHx2fNAaoxvYyA79x8ictrRPsJxCFuVn2Tg/exec';

// PIN personali (4 cifre) - modificabili qui
const PIN_UTENTI = {
  'Giancarlo': '1234',
  'Sabrina':   '2345',
  'Cecilia':   '3456',
  'Marco':     '4567',
  'Elena':     '5678',
  'Luca':      '6789'
};

// Mappa nomi fogli Google Sheets
const FOGLI = {
  bacheca:  'PostBacheca',
  ordini:   'Ordini',
  turni:    'TurniSala',
  attivita: 'Attivita'
};

// ===== STATE =====
const state = {
  utente: null,
  ruolo:  null,
  bacheca:  [],
  ordini:   [],
  turni:    [],
  attivita: []
};

const $ = id => document.getElementById(id);

function oggi() {
  return new Date().toLocaleDateString('it-IT', { day:'2-digit', month:'2-digit', year:'numeric' });
}
function ora() {
  return new Date().toLocaleTimeString('it-IT', { hour:'2-digit', minute:'2-digit' });
}

// ===== API =====
async function apiGet(foglio) {
  try {
    const res = await fetch(API_URL + '?azione=leggi&foglio=' + encodeURIComponent(foglio));
    const json = await res.json();
    if (json.ok) return json.righe || [];
    console.warn('apiGet errore:', json.errore);
    return [];
  } catch(e) {
    console.warn('apiGet fetch error:', e);
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
    console.warn('apiPost error:', e);
    return { ok: false };
  }
}

// ===== LOGIN con PIN =====
$('btn-login').addEventListener('click', async () => {
  const nome = $('sel-nome').value;
  const pin  = $('inp-pin').value.trim();

  $('pin-errore').classList.add('hidden');
  $('pin-occupato').classList.add('hidden');

  if (!nome) { alert('Seleziona il tuo nome.'); return; }
  if (!pin)  { alert('Inserisci il tuo PIN.'); return; }

  if (pin !== PIN_UTENTI[nome]) {
    $('pin-errore').classList.remove('hidden');
    $('inp-pin').value = '';
    $('inp-pin').focus();
    return;
  }

  const sessioneKey = 'sessione_' + nome;
  const sessioneId  = Date.now().toString();
  localStorage.setItem(sessioneKey, sessioneId);
  localStorage.setItem('sessione_corrente_nome', nome);
  localStorage.setItem('sessione_corrente_id',   sessioneId);

  state.utente = nome;
  state.ruolo  = 'operatore';
  $('header-utente').textContent = nome;
  $('inp-pin').value = '';
  showScreen('screen-app');
  await caricaTutto();
});

$('btn-logout').addEventListener('click', () => {
  if (state.utente) localStorage.removeItem('sessione_' + state.utente);
  localStorage.removeItem('sessione_corrente_nome');
  localStorage.removeItem('sessione_corrente_id');
  state.utente = null;
  state.ruolo  = null;
  $('sel-nome').value = '';
  showScreen('screen-login');
});

// ===== SCREENS =====
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
}

// ===== NAV =====
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    $('sec-' + btn.dataset.target).classList.add('active');
  });
});

// ===== CARICA DATI =====
async function caricaTutto() {
  const [bacheca, ordini, turni, attivita] = await Promise.all([
    apiGet(FOGLI.bacheca),
    apiGet(FOGLI.ordini),
    apiGet(FOGLI.turni),
    apiGet(FOGLI.attivita)
  ]);
  state.bacheca  = bacheca  || [];
  state.ordini   = ordini   || [];
  state.turni    = turni    || [];
  state.attivita = attivita || [];
  renderAll();
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
    list.innerHTML = '<p class="empty-msg">Nessun messaggio in bacheca</p>';
    return;
  }
  list.innerHTML = state.bacheca.slice().reverse().map(p => {
    const autore = p.Autore || p.autore || '';
    const data   = p.DataOra || p.data  || '';
    const testo  = p.Testo  || p.testo  || '';
    const urgente = p.Urgente === 'si' ? ' <span class="badge badge-urgente">URGENTE</span>' : '';
    return `<div class="card post-card">
      <div class="post-meta">${autore} &bull; ${data}${urgente}</div>
      <div class="post-testo">${testo}</div>
    </div>`;
  }).join('');
}

$('btn-new-post').addEventListener('click', () => toggle('form-post'));
$('btn-cancel-post').addEventListener('click', () => { hide('form-post'); $('txt-post').value = ''; });
$('btn-save-post').addEventListener('click', async () => {
  const testo = $('txt-post').value.trim();
  if (!testo) return;
  const dati = {
    Autore: state.utente,
    Testo: testo,
    DataOra: oggi() + ' ' + ora(),
    Categoria: 'generale',
    Urgente: 'no',
    Fissato: 'no',
    Reparto: 'tutti'
  };
  const btn = $('btn-save-post');
  btn.disabled = true;
  btn.textContent = 'Salvo...';
  const res = await apiPost('aggiungi', FOGLI.bacheca, dati);
  btn.disabled = false;
  btn.textContent = 'Pubblica';
  if (res.ok) {
    state.bacheca.push({ ...dati, ID: res.id });
    $('txt-post').value = '';
    hide('form-post');
    renderBacheca();
  } else {
    alert('Errore salvataggio. Controlla la connessione.');
  }
});

// ===========================
// ORDINI
// ===========================
function renderOrdini() {
  const list = $('ordini-list');
  if (!state.ordini.length) {
    list.innerHTML = '<p class="empty-msg">Nessun ordine attivo</p>';
    return;
  }
  list.innerHTML = state.ordini.slice().reverse().map(o => {
    const tavolo  = o.Tavolo    || o.tavolo  || '?';
    const chi     = o.Cameriere || o.Autore  || '';
    const orario  = o.OraOrdine || o.DataOra || '';
    const testo   = o.Ordine    || o.Testo   || '';
    return `<div class="card">
      <div class="post-meta">Tavolo ${tavolo} &bull; ${chi} &bull; ${orario}</div>
      <div class="post-testo">${testo}</div>
    </div>`;
  }).join('');
}

$('btn-new-ordine').addEventListener('click', () => toggle('form-ordine'));
$('btn-cancel-ordine').addEventListener('click', () => { hide('form-ordine'); $('txt-tavolo').value=''; $('txt-ordine').value=''; });
$('btn-save-ordine').addEventListener('click', async () => {
  const tavolo = $('txt-tavolo').value;
  const testo  = $('txt-ordine').value.trim();
  if (!tavolo || !testo) { alert('Inserisci tavolo e ordine.'); return; }
  const dati = {
    Tavolo:     tavolo,
    Ordine:     testo,
    Cameriere:  state.utente,
    OraOrdine:  ora(),
    DataOra:    oggi() + ' ' + ora(),
    Stato:      'aperto',
    Reparto:    'sala'
  };
  const res = await apiPost('aggiungi', FOGLI.ordini, dati);
  if (res.ok) {
    state.ordini.push({ ...dati, ID: res.id });
    $('txt-tavolo').value='';
    $('txt-ordine').value='';
    hide('form-ordine');
    renderOrdini();
  } else { alert('Errore salvataggio.'); }
});

// ===========================
// TURNI (colazione / pranzo / cena)
// ===========================
const TURNO_EMOJI = { colazione: '☕', pranzo: '🌞', cena: '🌙' };

function renderTurni() {
  const list = $('turni-list');
  if (!state.turni.length) {
    list.innerHTML = '<p class="empty-msg">Nessun turno registrato</p>';
    return;
  }
  const byDate = {};
  state.turni.forEach(t => {
    const k = t.DataTurno || t.data || '?';
    if (!byDate[k]) byDate[k] = [];
    byDate[k].push(t);
  });
  const ordine = ['colazione', 'pranzo', 'cena'];
  list.innerHTML = Object.keys(byDate).sort().reverse().map(data => {
    return `<div class="card turno-giorno">
      <div class="turno-data">${data}</div>
      ${ordine.map(turno => {
        const persone = byDate[data]
          .filter(r => (r.TipoTurno||r.tipo||'').toLowerCase() === turno)
          .map(r => r.NomePersona || r.utente || '')
          .join(', ');
        return `<div class="turno-riga">
          <span class="turno-label">${TURNO_EMOJI[turno]||''} ${turno.charAt(0).toUpperCase()+turno.slice(1)}</span>
          <span class="turno-persone">${persone || '—'}</span>
        </div>`;
      }).join('')}
    </div>`;
  }).join('');
}

$('btn-new-turno').addEventListener('click', () => {
  $('txt-data').value = new Date().toISOString().split('T')[0];
  toggle('form-turno');
});
$('btn-cancel-turno').addEventListener('click', () => hide('form-turno'));
$('btn-save-turno').addEventListener('click', async () => {
  const data   = $('txt-data').value;
  const tipo   = $('sel-turno-tipo').value;
  const utente = $('sel-turno-utente').value;
  if (!data) { alert('Seleziona una data.'); return; }
  const dup = state.turni.find(t =>
    (t.DataTurno||t.data) === data &&
    (t.TipoTurno||t.tipo||'').toLowerCase() === tipo &&
    (t.NomePersona||t.utente) === utente
  );
  if (dup) { alert('Turno gia presente per questa persona.'); return; }
  const dati = { DataTurno: data, TipoTurno: tipo, NomePersona: utente, Reparto: 'Sala' };
  const res = await apiPost('aggiungi', FOGLI.turni, dati);
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
    list.innerHTML = '<p class="empty-msg">Nessuna attivita in corso</p>';
    return;
  }
  list.innerHTML = state.attivita.map(a => {
    const testo = a.Descrizione || a.testo  || '';
    const chi   = a.AssegnatoA  || a.autore || '';
    const data  = a.DataCreazione||a.data   || '';
    const prior = (a.Priorita || a.priorita || 'normale').toLowerCase();
    const fatto = a.Completata === 'si' || a.done;
    return `<div class="card task-card ${fatto ? 'task-fatto' : ''}">
      <div class="task-testo ${fatto ? 'task-strikethrough' : ''}">${testo}</div>
      <div class="task-meta">
        <span>${chi} &bull; ${data}</span>
        <span class="badge badge-${prior}">${prior}</span>
      </div>
    </div>`;
  }).join('');
}

$('btn-new-task').addEventListener('click',    () => toggle('form-task'));
$('btn-cancel-task').addEventListener('click', () => { hide('form-task'); $('txt-task').value=''; });
$('btn-save-task').addEventListener('click', async () => {
  const testo = $('txt-task').value.trim();
  const prior = $('sel-task-priorita').value;
  if (!testo) { alert('Inserisci la descrizione.'); return; }
  const dati = {
    Descrizione: testo,
    Priorita: prior,
    AssegnatoA: state.utente,
    Completata: 'no',
    DataCreazione: oggi()
  };
  const res = await apiPost('aggiungi', FOGLI.attivita, dati);
  if (res.ok) {
    state.attivita.push({ ...dati, ID: res.id });
    $('txt-task').value='';
    hide('form-task');
    renderAttivita();
  } else { alert('Errore salvataggio.'); }
});

// ===== UTILS =====
function toggle(id) { $(id).classList.toggle('hidden'); }
function hide(id)   { $(id).classList.add('hidden'); }

// ===== SERVICE WORKER =====
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js')
      .catch(e => console.warn('SW:', e));
  });
}
