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

// LOGIN HANDLER
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

  // BACHECA
  $('btn-new-post').addEventListener('click',()=>toggle('form-post'));
  $('btn-cancel-post').addEventListener('click',()=>{hide('form-post');$('txt-post').value='';});
  $('btn-save-post').addEventListener('click',async()=>{
    const testo=$('txt-post').value.trim();
    if (!testo) {alert('Inserisci un messaggio.'); return;}
    const dati={Messaggio:testo, Utente:state.utente, DataOra:ora()};
    const res=await apiPost('aggiungi', FOGLI.bacheca, dati);
    if (res.ok) { state.bacheca.push({...dati,ID:res.id}); hide('form-post'); $('txt-post').value=''; renderBacheca(); }
    else alert('Errore nel salvataggio.');
  });

  // ORDINI
  $('btn-new-ordine').addEventListener('click',()=>toggle('form-ordine'));
  $('btn-cancel-ordine').addEventListener('click',()=>{hide('form-ordine');$('txt-tavolo').value='';$('txt-ordine').value='';});
  $('btn-save-ordine').addEventListener('click',async()=>{
    const tavolo=$('txt-tavolo').value.trim(), testo=$('txt-ordine').value.trim();
    if (!tavolo||!testo) {alert('Inserisci tavolo e ordine.'); return;}
    const dati={Tavolo:tavolo, Ordine:testo, Cameriere:state.utente, OrdineOra:ora(), DataPa:oggi()+'+ '+ora(), Stato:'aperto', Reparto:'sala'};
    const res=await apiPost('aggiungi', FOGLI.ordini, dati);
    if (res.ok) { state.ordini.push({...dati,ID:res.id}); $('txt-tavolo').value=''; $('txt-ordine').value=''; hide('form-ordine'); renderOrdini(); }
    else alert('Errore salvataggio.');
  });

  // TURNI
  $('btn-new-turno').addEventListener('click',()=>{$('txt-data').value=new Date().toISOString().split('T')[0]; toggle('form-turno');});
  $('btn-cancel-turno').addEventListener('click',()=>hide('form-turno'));
  $('btn-save-turno').addEventListener('click',async()=>{
    const data=$('txt-data').value, tipo=$('sel-turno-tipo').value, utente=$('sel-turno-utente').value;
    if (!data) {alert('Seleziona una data.'); return;}
    const dup=state.turni.find(t=>chiaveTurno(t.DataTurno)==data&&t.TipoTurno==tipo);
    if (dup) {alert('Turno gia presente.'); return;}
    const dati={DataTurno:data, TipoTurno:tipo, NomePersona:utente, Reparto:'sala'};
    const res=await apiPost('aggiungi', FOGLI.turni, dati);
    if (res.ok) { state.turni.push({...dati,ID:res.id}); hide('form-turno'); renderTurni(); }
    else alert('Errore salvataggio.');
  });

  // ATTIVITA
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


