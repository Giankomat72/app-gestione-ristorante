/* ===========================================
   app.js - Ristorante Sabrina PWA v3
   + Pulsanti azione: completa attivita, chiudi ordine, refresh
   =========================================== */
'use strict';

const API_URL = 'https://script.google.com/macros/s/AKfycbwbDz9DA_o58i07lcLFH-MOu_A45Wo0-2lGHx2fNAaoxvYyA79x8ictrRPsJxCFuVn2Tg/exec';
const PIN_UTENTI = {'Giancarlo':'1234', 'Sabrina':'2345', 'Cecilia':'3456', 'Marco':'4567', 'Elena':'5678', 'Luca':'6789'};
const FOGLI = {bacheca:'PostBacheca', ordini:'Ordini', turni:'TurniSala', attivita:'Attivita'};
const state = {utente:null, ruolo:null, bacheca:[], ordini:[], turni:[], attivita:[]};
const $ = id => document.getElementById(id);

function oggi() { return new Date().toLocaleDateString('it-IT', {day:'2-digit',month:'2-digit',year:'numeric'}); }
function ora() { return new Date().toLocaleTimeString('it-IT', {hour:'2-digit',minute:'2-digit'}); }

function formatData(raw) {
  if (!raw) return '';
  var s=String(raw);
  if (/^\\d{2}\\/\\d{2}\\/\\d{4}/.test(s)) return s.substring(0,10);
  var m=s.match(/^(\\d{4})-(\\d{2})-(\\d{2})/);
  if (m) return m[3]+'/'+m[2]+'/'+m[1];
  try {var d=new Date(s); if (!isNaN(d)) return d.toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit',year:'numeric'});} catch(e){}
  return s;
}

async function apiGet(foglio) {
  try {
    const res=await fetch(API_URL+'?azione=leggi&foglio='+encodeURIComponent(foglio));
    const json=await res.json();
    if (json.ok) return json.righe||[];
    console.warn('apiGet errore:',json.errore);
    return [];
  } catch(e) { console.warn('apiGet fetch error:',e); return []; }
}

async function apiPost(azione, foglio, dati, id) {
  try {
    const body={azione, foglio, dati};
    if (id) body.id=id;
    const res=await fetch(API_URL, {method:'POST', body:JSON.stringify(body)});
    return await res.json();
  } catch(e) { console.warn('apiPost error:',e); return {ok:false}; }
}

$('btn-login').addEventListener('click', async () => {
  const nome=$('sel-nome').value, pin=$('inp-pin').value.trim();
  $('pin-errore').classList.add('hidden');
  $('pin-occupato').classList.add('hidden');
  if (!nome) { alert('Seleziona il tuo nome.'); return; }
  if (!pin)  { alert('Inserisci il tuo PIN.'); return; }
  if (pin!==PIN_UTENTI[nome]) {
    $('pin-errore').classList.remove('hidden');
    $('inp-pin').value=''; $('inp-pin').focus();
    return;
  }
  const sessioneKey='sessione_'+nome, sessioneId=Date.now().toString();
  localStorage.setItem(sessioneKey, sessioneId);
  localStorage.setItem('sessione_corrente_nome', nome);
  localStorage.setItem('sessione_corrente_id', sessioneId);
  state.utente=nome; state.ruolo='operatore';
  $('header-utente').textContent=nome;
  $('inp-pin').value='';
  showScreen('screen-app');
  await caricaTutto();
});

$('btn-logout').addEventListener('click', () => {
  if (state.utente) localStorage.removeItem('sessione_'+state.utente);
  localStorage.removeItem('sessione_corrente_nome');
  localStorage.removeItem('sessione_corrente_id');
  state.utente=null; state.ruolo=null;
  $('sel-nome').value='';
  showScreen('screen-login');
});

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  $(id).classList.add('active');
}

document.querySelectorAll('.nav-btn').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
    $('sec-'+btn.dataset.target).classList.add('active');
  });
});

async function caricaTutto() {
  const [bacheca,ordini,turni,attivita]=await Promise.all([
    apiGet(FOGLI.bacheca), apiGet(FOGLI.ordini), apiGet(FOGLI.turni), apiGet(FOGLI.attivita)
  ]);
  state.bacheca=bacheca||[]; state.ordini=ordini||[]; state.turni=turni||[]; state.attivita=attivita||[];
  renderAll();
}

function renderAll() { renderBacheca(); renderOrdini(); renderTurni(); renderAttivita(); }

function renderBacheca() {
  const list=$('bacheca-list');
  if (!state.bacheca.length) { list.innerHTML='<p class="empty-msg">Nessun messaggio in bacheca</p>'; return; }
  list.innerHTML=state.bacheca.slice().reverse().map(p=> {
    const autore=p.Autore||p.autore||'', data=p.DataOra||p.data||'', testo=p.Testo||p.testo||'';
    const urgente=(p.Urgente||'').toString().toLowerCase()==='si'?' <span class="badge badge-urgente">URGENTE</span>':'';
    return `<div class="card post-card"><div class="post-meta">${autore} &bull; ${data}${urgente}</div><div class="post-testo">${testo}</div></div>`;
  }).join('');
}
$('btn-new-post').addEventListener('click',()=>toggle('form-post'));
$('btn-cancel-post').addEventListener('click',()=>{hide('form-post');$('txt-post').value='';});
$('btn-save-post').addEventListener('click',async()=>{
  const testo=$('txt-post').value.trim(); if (!testo) return;
  const dati={Autore:state.utente, Testo:testo, DataOra:oggi()+' '+ora(), Categoria:'generale', Urgente:'no', Fissato:'no', Reparto:'tutti'};
  const btn=$('btn-save-post'); btn.disabled=true; btn.textContent='Salvo...';
  const res=await apiPost('aggiungi', FOGLI.bacheca, dati);
  btn.disabled=false; btn.textContent='Pubblica';
  if (res.ok) { state.bacheca.push({...dati,ID:res.id}); $('txt-post').value=''; hide('form-post'); renderBacheca(); }
  else alert('Errore salvataggio. Controlla la connessione.');
});

function renderOrdini() {
  const list=$('ordini-list');
  if (!state.ordini.length) { list.innerHTML='<p class="empty-msg">Nessun ordine attivo</p>'; return; }
  list.innerHTML=state.ordini.slice().reverse().map(o=> {
    const art=o.Articolo||o.articolo||'?', qta=o.Quantita||o.quantita||'', chi=o.Autore||o.autore||'', data=o.DataOra||o.data||'';
    const stato=(o.Stato||'aperto').toLowerCase(), urgente=(o.Urgente||'').toLowerCase()==='si';
    const badgeClass=stato.includes('ordinare')?'badge-aperto':(stato.includes('evaso')||stato.includes('completato')?'badge-ok':'badge-normale');
    const badgeUrgente=urgente?' <span class="badge badge-urgente">URGENTE</span>':'';
    const id=o.ID||o.id||'';
    const btnChiudi=stato.includes('ordinare')?`<button class="btn-mini" onclick="chiudiOrdine('${id}')">Evaso</button>`:'';
    return `<div class="card"><div class="post-meta"><strong>${art}</strong> &bull; ${qta} &bull; ${chi} &bull; ${data} <span class="badge ${badgeClass}">${stato}</span>${badgeUrgente}</div>${btnChiudi}</div>`;
  }).join('');
}
window.chiudiOrdine=async function(id) {
  if (!confirm('Segnare come evaso?')) return;
  const res=await apiPost('aggiorna', FOGLI.ordini, {Stato:'Evaso', PresoInCarico:state.utente, DataEvasione:oggi()+' '+ora()}, id);
  if (res.ok) { const idx=state.ordini.findIndex(o=>(o.ID||o.id)===id); if (idx>=0) {state.ordini[idx].Stato='Evaso'; state.ordini[idx].PresoInCarico=state.utente;} renderOrdini(); }
  else alert('Errore aggiornamento.');
};
$('btn-new-ordine').addEventListener('click',()=>toggle('form-ordine'));
$('btn-cancel-ordine').addEventListener('click',()=>{hide('form-ordine');$('txt-tavolo').value='';$('txt-ordine').value='';});
$('btn-save-ordine').addEventListener('click',async()=>{
  const tavolo=$('txt-tavolo').value, testo=$('txt-ordine').value.trim();
  if (!tavolo||!testo) {alert('Inserisci tavolo e ordine.'); return;}
  const dati={Tavolo:tavolo, Ordine:testo, Cameriere:state.utente, OraOrdine:ora(), DataOra:oggi()+' '+ora(), Stato:'aperto', Reparto:'sala'};
  const res=await apiPost('aggiungi', FOGLI.ordini, dati);
  if (res.ok) { state.ordini.push({...dati,ID:res.id}); $('txt-tavolo').value=''; $('txt-ordine').value=''; hide('form-ordine'); renderOrdini(); }
  else alert('Errore salvataggio.');
});

const TURNO_EMOJI={colazione:'☕',pranzo:'🌞',cena:'🌙'}, GIORNI_IT=['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
function formatDataTurno(raw) {
  var s=String(raw||''), m=s.match(/^(\\d{4})-(\\d{2})-(\\d{2})/);
  if (m) { var d=new Date(m[1],parseInt(m[2])-1,parseInt(m[3])); return GIORNI_IT[d.getDay()]+' '+m[3]+'/'+m[2]+'/'+m[1]; }
  var m2=s.match(/^(\\d{2})\\/(\\d{2})\\/(\\d{4})/);
  if (m2) { var d2=new Date(m2[3],parseInt(m2[2])-1,parseInt(m2[1])); return GIORNI_IT[d2.getDay()]+' '+s.substring(0,10); }
  return s;
}
function chiaveTurno(raw) {
  var s=String(raw||''), m=s.match(/^(\\d{4})-(\\d{2})-(\\d{2})/);
  if (m) return m[0];
  var m2=s.match(/^(\\d{2})\\/(\\d{2})\\/(\\d{4})/);
  if (m2) return m2[3]+'-'+m2[2]+'-'+m2[1];
  return s;
}
function renderTurni() {
  const list=$('turni-list');
  if (!state.turni.length) { list.innerHTML='<p class="empty-msg">Nessun turno registrato</p>'; return; }
  const byDate={};
  state.turni.forEach(t=>{
    const rawData=t.DataTurno||t.data||'?', k=chiaveTurno(rawData);
    if (!byDate[k]) byDate[k]={label:formatDataTurno(rawData), righe:[]};
    byDate[k].righe.push(t);
  });
  const ordine=['colazione','pranzo','cena'];
  list.innerHTML=Object.keys(byDate).sort().reverse().map(k=>{
    const giorno=byDate[k];
    return `<div class="card turno-giorno"><div class="turno-data">${giorno.label}</div>${ordine.map(turno=>{
      const persone=giorno.righe.filter(r=>(r.TipoTurno||r.tipo||'').toLowerCase()===turno).map(r=>r.NomePersona||r.utente||'').filter(Boolean).join(', ');
      return `<div class="turno-riga"><span class="turno-label">${TURNO_EMOJI[turno]||''} ${turno.charAt(0).toUpperCase()+turno.slice(1)}</span><span class="turno-persone">${persone||'<em style="opacity:.5">nessuno</em>'}</span></div>`;
    }).join('')}</div>`;
  }).join('');
}
$('btn-new-turno').addEventListener('click',()=>{$('txt-data').value=new Date().toISOString().split('T')[0]; toggle('form-turno');});
$('btn-cancel-turno').addEventListener('click',()=>hide('form-turno'));
$('btn-save-turno').addEventListener('click',async()=>{
  const data=$('txt-data').value, tipo=$('sel-turno-tipo').value, utente=$('sel-turno-utente').value;
  if (!data) {alert('Seleziona una data.'); return;}
  const dup=state.turni.find(t=>chiaveTurno(t.DataTurno||t.data)===data&&(t.TipoTurno||t.tipo||'').toLowerCase()===tipo&&(t.NomePersona||t.utente)===utente);
  if (dup) {alert('Turno gia presente per questa persona.'); return;}
  const dati={DataTurno:data, TipoTurno:tipo, NomePersona:utente, Reparto:'Sala'};
  const res=await apiPost('aggiungi', FOGLI.turni, dati);
  if (res.ok) { state.turni.push({...dati,ID:res.id}); hide('form-turno'); renderTurni(); }
  else alert('Errore salvataggio.');
});

function renderAttivita() {
  const list=$('attivita-list');
  if (!state.attivita.length) { list.innerHTML='<p class="empty-msg">Nessuna attivita in corso</p>'; return; }
  const sorted=state.attivita.slice().sort((a,b)=>{
    const fa=(a.Completata||a.Stato||'').toLowerCase().includes('complet');
    const fb=(b.Completata||b.Stato||'').toLowerCase().includes('complet');
    if (fa!==fb) return fa?1:-1;
    const pa=(a.Priorita||'normale').toLowerCase(), pb=(b.Priorita||'normale').toLowerCase();
    const pord={urgente:0, alta:1, normale:2};
    return (pord[pa]||2)-(pord[pb]||2);
  });
  list.innerHTML=sorted.map(a=>{
    const testo=a.Descrizione||a.Testo||a.testo||'', chi=a.AssegnatoA||a.Autore||a.autore||'';
    const data=formatData(a.DataCreazione||a.data||''), prior=(a.Priorita||'normale').toLowerCase();
    const fatto=(a.Completata||a.Stato||'').toLowerCase().includes('complet');
    const id=a.ID||a.id||'';
    const btnCompleta=!fatto?`<button class="btn-mini" onclick="completaTask('${id}')">Completa</button>`:'';
    return `<div class="card task-card ${fatto?'task-fatto':''}"><div class="task-testo ${fatto?'task-strikethrough':''}">${testo}</div><div class="task-meta"><span>${chi}${data?' &bull; '+data:''}</span><span class="badge badge-${prior}">${prior}</span></div>${btnCompleta}</div>`;
  }).join('');
}
window.completaTask=async function(id) {
  if (!confirm('Segnare come completata?')) return;
  const res=await apiPost('aggiorna', FOGLI.attivita, {Completata:'si', Stato:'Completata', DataCompletamento:oggi()}, id);
  if (res.ok) { const idx=state.attivita.findIndex(a=>(a.ID||a.id)===id); if (idx>=0) {state.attivita[idx].Completata='si'; state.attivita[idx].Stato='Completata';} renderAttivita(); }
  else alert('Errore aggiornamento.');
};
$('btn-new-task').addEventListener('click',()=>toggle('form-task'));
$('btn-cancel-task').addEventListener('click',()=>{hide('form-task');$('txt-task').value='';});
$('btn-save-task').addEventListener('click',async()=>{
  const testo=$('txt-task').value.trim(), prior=$('sel-task-priorita').value;
  if (!testo) {alert('Inserisci la descrizione.'); return;}
  const dati={Descrizione:testo, Priorita:prior, AssegnatoA:state.utente, Completata:'no', Stato:'Da fare', DataCreazione:oggi()};
  const res=await apiPost('aggiungi', FOGLI.attivita, dati);
  if (res.ok) { state.attivita.push({...dati,ID:res.id}); $('txt-task').value=''; hide('form-task'); renderAttivita(); }
  else alert('Errore salvataggio.');
});

function toggle(id) { $(id).classList.toggle('hidden'); }
function hide(id) { $(id).classList.add('hidden'); }

if ('serviceWorker' in navigator) { window.addEventListener('load',()=>{ navigator.serviceWorker.register('service-worker.js').catch(e=>console.warn('SW:',e)); }); }
