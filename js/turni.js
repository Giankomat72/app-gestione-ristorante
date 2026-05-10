// turni.js - Gestione turni sala ristorante

// Riferimento alla sezione turni
let turniSection = null;
let utentiMap = new Map();
let turniCorrente = [];

// Inizializza modulo turni
function initTurni() {
  turniSection = document.getElementById('turniSection');
  
  if (!turniSection) {
    console.error('Sezione turni non trovata');
    return;
  }
  
  // Gestori eventi
  const btnNuovoTurno = document.getElementById('btnNuovoTurno');
  if (btnNuovoTurno) {
    btnNuovoTurno.addEventListener('click', mostraFormNuovoTurno);
  }
  
  const filtroSettimana = document.getElementById('filtroSettimana');
  if (filtroSettimana) {
    filtroSettimana.addEventListener('change', handleFiltroSettimana);
  }
  
  console.log('Modulo turni inizializzato');
}

// Carica turni della settimana
async function loadTurni() {
  try {
    // Mostra loading
    showLoading(true);
    
    // Carica utenti per riferimenti
    const utenti = await window.API.getUtenti();
    utentiMap.clear();
    utenti.forEach(u => utentiMap.set(u.id, u));
    
    // Calcola range settimana corrente
    const oggi = new Date();
    const { lunedi, domenica } = getSettimanaCorrente(oggi);
    
    // Carica turni
    const turni = await window.API.getTurni(
      formatDateISO(lunedi),
      formatDateISO(domenica)
    );
    
    turniCorrente = turni;
    
    // Renderizza calendario
    renderCalendarioTurni(lunedi, turni);
    
    showLoading(false);
  } catch (error) {
    console.error('Errore caricamento turni:', error);
    window.App.showNotification('Errore caricamento turni', 'error');
    showLoading(false);
  }
}

// Renderizza calendario turni settimanale
function renderCalendarioTurni(lunediDate, turni) {
  const container = document.getElementById('calendarioTurni');
  if (!container) return;
  
  container.innerHTML = '';
  
  // Crea tabella calendario
  const table = document.createElement('table');
  table.className = 'turni-calendar';
  
  // Header con giorni della settimana
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  headerRow.innerHTML = '<th>Persona</th>';
  
  const giorniSettimana = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
  for (let i = 0; i < 7; i++) {
    const data = new Date(lunediDate);
    data.setDate(data.getDate() + i);
    
    const th = document.createElement('th');
    th.innerHTML = `${giorniSettimana[i]}<br><small>${data.getDate()}/${data.getMonth()+1}</small>`;
    headerRow.appendChild(th);
  }
  thead.appendChild(headerRow);
  table.appendChild(thead);
  
  // Body con righe per ogni persona
  const tbody = document.createElement('tbody');
  
  // Ordina utenti per reparto sala
  const utentiSala = Array.from(utentiMap.values())
    .filter(u => u.reparto === 'Sala' && u.attivo)
    .sort((a, b) => a.cognome.localeCompare(b.cognome));
  
  utentiSala.forEach(utente => {
    const row = document.createElement('tr');
    
    // Colonna nome
    const tdNome = document.createElement('td');
    tdNome.className = 'nome-utente';
    tdNome.textContent = `${utente.nome} ${utente.cognome}`;
    row.appendChild(tdNome);
    
    // Colonne giorni
    for (let i = 0; i < 7; i++) {
      const data = new Date(lunediDate);
      data.setDate(data.getDate() + i);
      const dataISO = formatDateISO(data);
      
      const td = document.createElement('td');
      td.className = 'turno-cell';
      td.dataset.utenteId = utente.id;
      td.dataset.data = dataISO;
      
      // Trova turno per questa data e utente
      const turno = turni.find(t => 
        t.utenteId === utente.id && t.data === dataISO
      );
      
      if (turno) {
        td.innerHTML = `
          <div class="turno-info turno-${turno.turno.toLowerCase()}">
            <div class="turno-tipo">${turno.turno}</div>
            <div class="turno-ore">${turno.oraInizio}-${turno.oraFine}</div>
            ${turno.note ? `<div class="turno-note">${turno.note}</div>` : ''}
          </div>
        `;
        td.classList.add('has-turno');
      } else {
        td.innerHTML = '<div class="turno-vuoto">-</div>';
      }
      
      // Click per modificare
      td.addEventListener('click', () => handleClickTurno(utente, dataISO, turno));
      
      row.appendChild(td);
    }
    
    tbody.appendChild(row);
  });
  
  table.appendChild(tbody);
  container.appendChild(table);
}

// Gestisci click su cella turno
function handleClickTurno(utente, data, turnoEsistente) {
  // Mostra dialog per modificare/creare turno
  const dialog = document.getElementById('dialogTurno');
  if (!dialog) return;
  
  // Popola form
  document.getElementById('turnoUtente').textContent = `${utente.nome} ${utente.cognome}`;
  document.getElementById('turnoData').value = data;
  document.getElementById('turnoTipo').value = turnoEsistente?.turno || 'Mattina';
  document.getElementById('turnoOraInizio').value = turnoEsistente?.oraInizio || '09:00';
  document.getElementById('turnoOraFine').value = turnoEsistente?.oraFine || '15:00';
  document.getElementById('turnoNote').value = turnoEsistente?.note || '';
  
  // Salva riferimenti
  dialog.dataset.utenteId = utente.id;
  dialog.dataset.data = data;
  dialog.dataset.turnoId = turnoEsistente?.id || '';
  
  // Mostra dialog
  dialog.classList.add('show');
}

// Salva turno
async function salvaTurno() {
  const dialog = document.getElementById('dialogTurno');
  
  const turnoData = {
    utenteId: dialog.dataset.utenteId,
    data: dialog.dataset.data,
    turno: document.getElementById('turnoTipo').value,
    oraInizio: document.getElementById('turnoOraInizio').value,
    oraFine: document.getElementById('turnoOraFine').value,
    note: document.getElementById('turnoNote').value
  };
  
  // TODO: Implementare scrittura su Google Sheets
  console.log('Salva turno:', turnoData);
  
  window.App.showNotification('Turno salvato (demo)', 'success');
  
  // Chiudi dialog
  dialog.classList.remove('show');
  
  // Ricarica turni
  await loadTurni();
}

// Elimina turno
async function eliminaTurno() {
  const dialog = document.getElementById('dialogTurno');
  const turnoId = dialog.dataset.turnoId;
  
  if (!turnoId) {
    window.App.showNotification('Nessun turno da eliminare', 'warning');
    return;
  }
  
  if (!confirm('Eliminare questo turno?')) {
    return;
  }
  
  // TODO: Implementare eliminazione su Google Sheets
  console.log('Elimina turno:', turnoId);
  
  window.App.showNotification('Turno eliminato (demo)', 'success');
  
  // Chiudi dialog
  dialog.classList.remove('show');
  
  // Ricarica turni
  await loadTurni();
}

// Mostra form nuovo turno
function mostraFormNuovoTurno() {
  // Apri dialog in modalità creazione
  const dialog = document.getElementById('dialogTurno');
  if (!dialog) return;
  
  // Reset form
  document.getElementById('turnoUtente').textContent = 'Seleziona utente';
  document.getElementById('turnoData').value = formatDateISO(new Date());
  document.getElementById('turnoTipo').value = 'Mattina';
  document.getElementById('turnoOraInizio').value = '09:00';
  document.getElementById('turnoOraFine').value = '15:00';
  document.getElementById('turnoNote').value = '';
  
  dialog.dataset.utenteId = '';
  dialog.dataset.turnoId = '';
  
  dialog.classList.add('show');
}

// Gestisci cambio filtro settimana
function handleFiltroSettimana(e) {
  const offset = parseInt(e.target.value);
  const oggi = new Date();
  oggi.setDate(oggi.getDate() + (offset * 7));
  
  const { lunedi } = getSettimanaCorrente(oggi);
  
  // Ricarica con nuova settimana
  loadTurniSettimana(lunedi);
}

// Carica turni per settimana specifica
async function loadTurniSettimana(lunedi) {
  try {
    showLoading(true);
    
    const domenica = new Date(lunedi);
    domenica.setDate(domenica.getDate() + 6);
    
    const turni = await window.API.getTurni(
      formatDateISO(lunedi),
      formatDateISO(domenica)
    );
    
    turniCorrente = turni;
    renderCalendarioTurni(lunedi, turni);
    
    showLoading(false);
  } catch (error) {
    console.error('Errore caricamento turni settimana:', error);
    window.App.showNotification('Errore caricamento turni', 'error');
    showLoading(false);
  }
}

// Utility: ottieni lunedì e domenica della settimana
function getSettimanaCorrente(data) {
  const d = new Date(data);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  
  const lunedi = new Date(d.setDate(diff));
  const domenica = new Date(lunedi);
  domenica.setDate(domenica.getDate() + 6);
  
  return { lunedi, domenica };
}

// Utility: formatta data in ISO (YYYY-MM-DD)
function formatDateISO(date) {
  if (!(date instanceof Date)) date = new Date(date);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Mostra/nascondi loading
function showLoading(show) {
  const loading = document.getElementById('turniLoading');
  if (loading) {
    loading.style.display = show ? 'block' : 'none';
  }
}

// Inizializza quando il DOM è pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTurni);
} else {
  initTurni();
}

// Export funzioni pubbliche
window.Turni = {
  load: loadTurni,
  salva: salvaTurno,
  elimina: eliminaTurno
};
