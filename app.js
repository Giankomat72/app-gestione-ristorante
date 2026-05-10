/* ==========================================
   app.js - Ristorante Sabrina PWA
   Gestione Login, Navigazione, CRUD locale
   ========================================== */

'use strict';

// ===== STATE =====
const state = {
  utente: null,
  ruolo: null,
  bacheca: [
    { id: 1, autore: 'Sistema', data: oggi(), testo: 'Benvenuti nell\'app di gestione Ristorante Sabrina!' }
  ],
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

// ===== LOGIN =====
$('btn-login').addEventListener('click', () => {
  const nome  = $('sel-nome').value;
  const ruolo = $('sel-ruolo').value;
  if (!nome || !ruolo) {
    alert('Seleziona nome e ruolo per continuare.');
    return;
  }
  state.utente = nome;
  state.ruolo  = ruolo;
  $('header-utente').textContent = nome + ' (' + ruolo + ')';
  showScreen('screen-app');
  renderAll();
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
    const target = btn.dataset.target;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    $('sec-' + target).classList.add('active');
  });
});

// ===== RENDER ALL =====
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
      <div class="card-meta">${p.autore} &bull; ${p.data} ${p.ora || ''}</div>
      <div class="card-body">${p.testo}</div>
    </div>
  `).join('');
}

$('btn-new-post').addEventListener('click', () => {
  toggle('form-post');
});

$('btn-cancel-post').addEventListener('click', () => {
  hide('form-post');
  $('txt-post').value = '';
});

$('btn-save-post').addEventListener('click', () => {
  const testo = $('txt-post').value.trim();
  if (!testo) return;
  state.bacheca.push({ id: uid(), autore: state.utente, data: oggi(), ora: ora(), testo });
  $('txt-post').value = '';
  hide('form-post');
  renderBacheca();
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
      <div class="card-meta">Tavolo ${o.tavolo} &bull; ${o.autore} &bull; ${o.ora}</div>
      <div class="card-body">${o.testo}</div>
      <button class="btn-secondary" style="margin-top:8px;font-size:12px;padding:4px 10px" onclick="chiudiOrdine('${o.id}')">
        Chiudi ordine
      </button>
    </div>
  `).join('');
}

window.chiudiOrdine = function(id) {
  state.ordini = state.ordini.filter(o => o.id !== id);
  renderOrdini();
};

$('btn-new-ordine').addEventListener('click', () => toggle('form-ordine'));
$('btn-cancel-ordine').addEventListener('click', () => {
  hide('form-ordine');
  $('txt-tavolo').value = '';
  $('txt-ordine').value = '';
});

$('btn-save-ordine').addEventListener('click', () => {
  const tavolo = $('txt-tavolo').value;
  const testo  = $('txt-ordine').value.trim();
  if (!tavolo || !testo) { alert('Inserisci tavolo e descrizione ordine.'); return; }
  state.ordini.push({ id: uid(), tavolo, testo, autore: state.utente, ora: ora() });
  $('txt-tavolo').value = '';
  $('txt-ordine').value = '';
  hide('form-ordine');
  renderOrdini();
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
  // Raggruppa per data
  const byDate = {};
  state.turni.forEach(t => {
    if (!byDate[t.data]) byDate[t.data] = [];
    byDate[t.data].push(t);
  });
  list.innerHTML = Object.keys(byDate).sort().reverse().map(data => `
    <div class="card">
      <div class="card-meta" style="font-weight:700;color:var(--accent-h)">${data}</div>
      ${byDate[data].map(t => `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px">
          <span class="card-body">${t.utente}</span>
          <span class="card-tag ${t.tipo}">${t.tipo}</span>
        </div>
      `).join('')}
    </div>
  `).join('');
}

$('btn-new-turno').addEventListener('click', () => {
  $('txt-data').value = new Date().toISOString().split('T')[0];
  toggle('form-turno');
});
$('btn-cancel-turno').addEventListener('click', () => hide('form-turno'));
$('btn-save-turno').addEventListener('click', () => {
  const data   = $('txt-data').value;
  const tipo   = $('sel-turno-tipo').value;
  const utente = $('sel-turno-utente').value;
  if (!data) { alert('Seleziona una data.'); return; }
  // Evita duplicati
  const dup = state.turni.find(t => t.data === data && t.tipo === tipo && t.utente === utente);
  if (dup) { alert('Turno gia\' presente.'); return; }
  state.turni.push({ id: uid(), data, tipo, utente });
  hide('form-turno');
  renderTurni();
});

// ===========================
// ATTIVITA
// ===========================
function renderAttivita() {
  const list = $('attivita-list');
  const attive = state.attivita.filter(a => !a.done);
  const fatte  = state.attivita.filter(a => a.done);
  if (!state.attivita.length) {
    list.innerHTML = '<div class="empty-state">Nessuna attivita\' in corso</div>';
    return;
  }
  const renderItem = a => `
    <div class="card" style="${a.done ? 'opacity:.5' : ''}">
      <div style="display:flex;align-items:center;gap:10px">
        <input type="checkbox" ${a.done ? 'checked' : ''}
          onchange="toggleTask('${a.id}')"
          style="width:18px;height:18px;cursor:pointer;accent-color:var(--accent)" />
        <span class="card-body" style="${a.done ? 'text-decoration:line-through' : ''}">${a.testo}</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:8px">
        <span class="card-meta">${a.autore} &bull; ${a.data}</span>
        <span class="card-tag ${a.priorita}">${a.priorita}</span>
      </div>
    </div>
  `;
  list.innerHTML =
    attive.map(renderItem).join('') +
    (fatte.length ? '<div class="card-meta" style="margin:12px 0 6px">Completate</div>' + fatte.map(renderItem).join('') : '');
}

window.toggleTask = function(id) {
  const t = state.attivita.find(a => a.id === id);
  if (t) t.done = !t.done;
  renderAttivita();
};

$('btn-new-task').addEventListener('click', () => toggle('form-task'));
$('btn-cancel-task').addEventListener('click', () => {
  hide('form-task');
  $('txt-task').value = '';
});

$('btn-save-task').addEventListener('click', () => {
  const testo    = $('txt-task').value.trim();
  const priorita = $('sel-task-priorita').value;
  if (!testo) { alert('Inserisci la descrizione dell\'attivita\'.'); return; }
  state.attivita.push({ id: uid(), testo, priorita, done: false, autore: state.utente, data: oggi() });
  $('txt-task').value = '';
  hide('form-task');
  renderAttivita();
});

// ===== UTILS =====
function toggle(id) {
  const el = $(id);
  el.classList.toggle('hidden');
}

function hide(id) {
  $(id).classList.add('hidden');
}

// ===== PWA SERVICE WORKER =====
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js')
      .catch(err => console.warn('SW non registrato:', err));
  });
}
