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
    const res  = await fetch(API_URL + '?azione=leggi&foglio=' + encodeURIComponent(foglio));
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

  // Nascondi errori precedenti
  $('pin-errore').classList.add('hidden');
  $('pin-occupato').classList.add('hidden');

  if (!nome) { alert('Seleziona il tuo nome.'); return; }
  if (!pin)  { alert('Inserisci il tuo PIN.'); return; }

  // Verifica PIN
  if (pin !== PIN_UTENTI[nome]) {
    $('pin-errore').classList.remove('hidden');
    $('inp-pin').value = '';
    $('inp-pin').focus();
    return;
  }

  // Segna sessione attiva in localStorage
  const sessioneKey = 'sessione_' + nome;
  const sessioneId  = Date.now().toString();
  const sessioneEsistente = localStorage.getItem(sessioneKey);

  // Se c'e' gia' una sessione attiva (stesso browser) la sovrascriviamo
  // (protezione base: impedisce login doppio sullo stesso dispositivo)
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
  // Rimuovi sessione
  if (state.utente) {
    localStorage.removeItem('sessione_' + state.utente);
  }
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
    apiGet('Bacheca'),
    apiGet('Ordini'),
    apiGet('TurniSala'),
    apiGet('Attivita')
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
    list.innerHTML = '<div class="empty-state">Nessun messaggio in bacheca</div>';
    return;
  }
  list.innerHTML = state.bacheca.slice().reverse().map(p => {
    const autore = p.Autore || p.autore || '';
    const data   = p.DataOra || p.data  || '';
    const testo  = p.Testo   || p.testo || '';
    return '<div class="card"><div class="card-meta">' + autore + ' &bull; ' + data + '</div><div class="card-body">' + testo + '</div></div>';
  }).join('');
}

$('btn-new-post').addEventListener('click', () => toggle('form-post'));
$('btn-cancel-post').addEventListener('click', () => { hide('form-post'); $('txt-post').value = ''; });
$('btn-save-post').addEventListener('click', async () => {
  const testo = $('txt-post').value.trim();
  if (!testo) return;
  const dati = { Autore: state.utente, Testo: testo, DataOra: oggi() + ' ' + ora() };
  const btn = $('btn-save-post');
  btn.disabled = true;
  btn.textContent = 'Salvo...';
  const res = await apiPost('aggiungi', 'Bacheca', dati);
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
    list.innerHTML = '<div class="empty-state">Nessun ordine attivo</div>';
    return;
  }
  list.innerHTML = state.ordini.slice().reverse().map(o => {
    const tavolo = o.Tavolo    || o.tavolo || '?';
    const chi    = o.Cameriere || o.autore || '';
    const orario = o.OraOrdine || o.ora    || '';
    const testo  = o.Ordine    || o.testo  || '';
    return '<div class="card"><div class="card-meta">Tavolo ' + tavolo + ' &bull; ' + chi + ' &bull; ' + orario + '</div><div class="card-body">' + testo + '</div></div>';
  }).join('');
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
    $('txt-tavolo').value=''; $('txt-ordine').value='';
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
    list.innerHTML = '<div class="empty-state">Nessun turno registrato</div>';
    return;
  }
  const byDate = {};
  state.turni.forEach(t => {
    const k = t.DataTurno || t.data || '?';
    if (!byDate[k]) byDate[k] = [];
    byDate[k].push(t);
  });
  // Ordine fisso per turno
  const ordine = ['colazione', 'pranzo', 'cena'];
  list.innerHTML = Object.keys(byDate).sort().reverse().map(data => {
    const righe = ordine.filter(t => byDate[data].some(r => (r.TipoTurno||r.tipo||'').toLowerCase() === t));
    return '<div class="card"><div class="card-meta" style="font-weight:700;color:var(--accent-h)">' + data + '</div>' +
      righe.map(turno => {
        const persone = byDate[data]
          .filter(r => (r.TipoTurno||r.tipo||'').toLowerCase() === turno)
          .map(r => r.NomePersona || r.utente || '')
          .join(', ');
        return '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px"><span class="card-body">' +
          (TURNO_EMOJI[turno]||'') + ' ' + turno.charAt(0).toUpperCase()+turno.slice(1) +
          '</span><span style="color:var(--text-muted);font-size:13px">' + persone + '</span></div>';
      }).join('') + '</div>';
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
  list.innerHTML = state.attivita.map(a => {
    const testo  = a.Descrizione || a.testo    || '';
    const chi    = a.AssegnatoA  || a.autore   || '';
    const data   = a.DataCreazione||a.data     || '';
    const prior  = (a.Priorita   || a.priorita || 'normale').toLowerCase();
    const fatto  = a.Completata === 'si' || a.done;
    return '<div class="card" style="' + (fatto?'opacity:.5':'') + '">' +
      '<div class="card-body" style="' + (fatto?'text-decoration:line-through':'') + '">' + testo + '</div>' +
      '<div style="display:flex;justify-content:space-between;margin-top:8px">' +
        '<span class="card-meta">' + chi + ' &bull; ' + data + '</span>' +
        '<span class="card-tag ' + prior + '">' + prior + '</span>' +
      '</div></div>';
  }).join('');
}

$('btn-new-task').addEventListener('click', () => toggle('form-task'));
$('btn-cancel-task').addEventListener('click', () => { hide('form-task'); $('txt-task').value=''; });
$('btn-save-task').addEventListener('click', async () => {
  const testo  = $('txt-task').value.trim();
  const prior  = $('sel-task-priorita').value;
  if (!testo) { alert('Inserisci la descrizione.'); return; }
  const dati = { Descrizione: testo, Priorita: prior, AssegnatoA: state.utente, Completata: 'no', DataCreazione: oggi() };
  const res = await apiPost('aggiungi', 'Attivita', dati);
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
