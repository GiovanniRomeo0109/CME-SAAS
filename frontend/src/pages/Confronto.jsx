import { useState, useRef, useEffect } from "react";
import { api } from "../lib/api.js";

function fEuro(n) { return new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR"}).format(n||0); }
function fNum(n,d=2) { return Number(n||0).toLocaleString("it-IT",{maximumFractionDigits:d}); }

const STATO_CFG = {
  ok:                     { label:"✓ Corretto",          bg:"rgba(16,185,129,0.12)", border:"rgba(16,185,129,0.35)", text:"#10b981" },
  quantita_diversa:       { label:"⚠ Quantità diversa",  bg:"rgba(245,158,11,0.10)", border:"rgba(245,158,11,0.35)", text:"#f59e0b" },
  prezzo_diverso:         { label:"⚠ Prezzo diverso",    bg:"rgba(245,158,11,0.10)", border:"rgba(245,158,11,0.35)", text:"#f59e0b" },
  entrambi_diversi:       { label:"✕ Entrambi diversi",  bg:"rgba(239,68,68,0.10)",  border:"rgba(239,68,68,0.35)",  text:"#ef4444" },
  mancante_in_riferimento:{ label:"? Non nel rif.",      bg:"rgba(139,92,246,0.10)", border:"rgba(139,92,246,0.35)", text:"#a78bfa" },
};

function StatoBadge({ stato }) {
  const c = STATO_CFG[stato] || STATO_CFG.ok;
  return (
    <span style={{ fontSize:11, fontWeight:700, padding:"3px 9px", borderRadius:12,
      background:c.bg, border:`1px solid ${c.border}`, color:c.text, whiteSpace:"nowrap" }}>
      {c.label}
    </span>
  );
}

function DropZone({ label, accept, icon, file, onFile, hint }) {
  const ref = useRef();
  const [drag, setDrag] = useState(false);
  return (
    <div onClick={() => ref.current.click()}
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); onFile(e.dataTransfer.files[0]); }}
      style={{ border:`2px dashed ${drag?"#f59e0b":file?"#10b981":"#334155"}`, borderRadius:10,
        padding:"22px 20px", textAlign:"center", cursor:"pointer",
        background: drag?"rgba(245,158,11,0.05)":file?"rgba(16,185,129,0.05)":"rgba(15,23,42,0.4)",
        transition:"all 0.2s" }}>
      <input ref={ref} type="file" accept={accept} style={{display:"none"}} onChange={e=>onFile(e.target.files[0])} />
      <div style={{fontSize:28,marginBottom:6}}>{file?"✅":icon}</div>
      <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:16,color:file?"#10b981":"#94a3b8",letterSpacing:1}}>
        {file ? file.name : label}
      </div>
      {!file && hint && <div style={{fontSize:11,color:"#475569",marginTop:4}}>{hint}</div>}
    </div>
  );
}

async function exportPDF(righe, vociMancanti, sommario, soloSelezionate) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ orientation:"landscape", unit:"mm", format:"a4" });
  doc.setFillColor(15,23,42); doc.rect(0,0,297,40,"F");
  doc.setTextColor(245,158,11); doc.setFontSize(24); doc.setFont("helvetica","bold");
  doc.text("VERIFICA COMPUTO METRICO", 14, 18);
  doc.setFontSize(10); doc.setTextColor(150,150,170);
  doc.text(`Generato il: ${new Date().toLocaleDateString("it-IT")} | CME Agent`, 14, 28);
  doc.text(`Voci verificate: ${righe.length} | ${soloSelezionate?"Solo validate":"Tutte le voci"}`, 14, 35);
  const statiLabel = { ok:"Corretto", quantita_diversa:"Qta diversa", prezzo_diverso:"Prezzo diverso", entrambi_diversi:"Entrambi diversi", mancante_in_riferimento:"Non nel rif." };
  autoTable(doc, {
    startY:46,
    head:[["Codice","Descrizione","U.M.","Qta Utente","Qta Rif.","Eu Utente","Eu Rif.","Delta","Stato","Note AI"]],
    body: righe.map(r=>[r.codice||"",r.descrizione,r.um,fNum(r.quantitaUtente),fNum(r.quantitaRiferimento),fNum(r.prezzoUnitarioUtente,2),fNum(r.prezzoUnitarioRiferimento,2),(r.deltaImporto>=0?"+":"")+fNum(r.deltaImporto,2),statiLabel[r.stato]||r.stato,r.noteAI||""]),
    headStyles:{fillColor:[30,41,59],textColor:[245,158,11],fontStyle:"bold",fontSize:8},
    bodyStyles:{fontSize:7,textColor:[200,210,220]}, styles:{fillColor:[15,23,42]},
    alternateRowStyles:{fillColor:[20,30,50]},
  });
  if (vociMancanti && vociMancanti.length>0) {
    const y = doc.lastAutoTable.finalY+10;
    doc.setFontSize(13); doc.setTextColor(245,158,11); doc.setFont("helvetica","bold");
    doc.text("VOCI MANCANTI NEL COMPUTO UTENTE", 14, y);
    autoTable(doc, {
      startY:y+6,
      head:[["Codice","Descrizione","U.M.","Quantita","Prezzo","Importo","Nota AI"]],
      body:vociMancanti.map(v=>[v.codice||"",v.descrizione,v.um,fNum(v.quantita),fNum(v.prezzoUnitario,2),fNum(v.importo,2),v.noteAI||""]),
      headStyles:{fillColor:[50,30,30],textColor:[239,68,68],fontStyle:"bold",fontSize:8},
      bodyStyles:{fontSize:7,textColor:[220,180,180]}, styles:{fillColor:[25,15,15]},
    });
  }
  const fy = doc.lastAutoTable.finalY+10;
  doc.setFontSize(10); doc.setTextColor(245,158,11); doc.setFont("helvetica","bold");
  doc.text(`Totale utente: ${fEuro(sommario.importoTotaleUtente)}  |  Totale rif.: ${fEuro(sommario.importoTotaleRiferimento)}  |  Differenza: ${fEuro(sommario.deltaImportoTotale)}`, 14, fy);
  if (sommario.giudizioGenerale) {
    doc.setFontSize(8); doc.setTextColor(150,150,170); doc.setFont("helvetica","italic");
    doc.text(sommario.giudizioGenerale, 14, fy+8, {maxWidth:269});
  }
  doc.save("Verifica_CME.pdf");
}

function exportCSV(righe, vociMancanti) {
  const header = "Codice;Descrizione;U.M.;Qta Utente;Qta Rif.;Prezzo Utente;Prezzo Rif.;Importo Utente;Importo Rif.;Delta;Stato;Note AI\n";
  const body = righe.map(r=>`${r.codice||""};${r.descrizione};${r.um};${r.quantitaUtente};${r.quantitaRiferimento};${r.prezzoUnitarioUtente};${r.prezzoUnitarioRiferimento};${r.importoUtente};${r.importoRiferimento};${r.deltaImporto};${r.stato};${r.noteAI||""}`).join("\n");
  let mancanti = "";
  if (vociMancanti && vociMancanti.length>0) {
    mancanti = "\n\nVOCI MANCANTI\nCodice;Descrizione;U.M.;Quantita;Prezzo;Importo;Nota AI\n";
    mancanti += vociMancanti.map(v=>`${v.codice||""};${v.descrizione};${v.um};${v.quantita};${v.prezzoUnitario};${v.importo};${v.noteAI||""}`).join("\n");
  }
  const blob = new Blob(["\uFEFF"+header+body+mancanti],{type:"text/csv;charset=utf-8;"});
  const a = document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="Verifica_CME.csv"; a.click();
}

export default function Confronto() {
  const [step, setStep] = useState(0);
  const [computi, setComputi] = useState([]);
  const [rifId, setRifId] = useState("");
  const [fileUtente, setFileUtente] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [risultato, setRisultato] = useState(null);
  const [error, setError] = useState(null);
  const [selezione, setSelezione] = useState({});
  const [filtroStato, setFiltroStato] = useState("tutti");
  const [mostraMancanti, setMostraMancanti] = useState(true);

  useEffect(() => { api.computi.list().then(setComputi).catch(()=>{}); }, []);

  const righeFiltrate = (risultato?.righeConfronto||[]).filter(r => {
    if (filtroStato==="tutti") return true;
    if (filtroStato==="errori") return r.stato!=="ok";
    return r.stato===filtroStato;
  });

  const toggleSelezione = (i) => setSelezione(s=>({...s,[i]:!s[i]}));
  const selezionaTutti = () => { const t={}; righeFiltrate.forEach((_,i)=>{t[i]=true;}); setSelezione(t); };
  const deselezionaTutti = () => setSelezione({});
  const righeSelezionate = (risultato?.righeConfronto||[]).filter((_,i)=>selezione[i]);
  const vociMancantiSel = mostraMancanti ? (risultato?.vociMancanti||[]) : [];

  const avviaConfronto = async () => {
    if (!rifId || !fileUtente) return;
    setLoading(true); setError(null);
    setProgress("Analisi del computo utente in corso...");
    try {
      const fd = new FormData();
      fd.append("computoRiferimentoId", rifId);
      fd.append("computoUtente", fileUtente);
      setProgress("L'AI sta confrontando le voci... (30-60 secondi)");
      const data = await api.confronto.analizza(fd);
      setRisultato(data);
      const sel = {};
      (data.righeConfronto||[]).forEach((r,i)=>{ if(r.stato==="ok") sel[i]=true; });
      setSelezione(sel);
      setStep(2);
    } catch(err) {
      setError(err.message);
    } finally {
      setLoading(false); setProgress("");
    }
  };

  const s = risultato?.sommario || {};

  const btnPrimary = (disabled, onClick, label) => (
    <button disabled={disabled} onClick={onClick} style={{
      flex:1, padding:"14px", border:"none", borderRadius:10,
      cursor:disabled?"not-allowed":"pointer",
      fontFamily:"'Bebas Neue',cursive", fontSize:18, letterSpacing:2,
      background:disabled?"#1e293b":"linear-gradient(135deg,#6366f1,#4f46e5)",
      color:disabled?"#475569":"#fff",
      boxShadow:disabled?"none":"0 8px 24px rgba(99,102,241,0.3)",
    }}>{label}</button>
  );

  return (
    <div style={{padding:"36px 40px",minHeight:"100vh",background:"linear-gradient(180deg,rgba(99,102,241,0.04) 0%,transparent 300px)",fontFamily:"'DM Sans',sans-serif",color:"#e2e8f0"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');`}</style>

      <div style={{marginBottom:32}}>
        <h1 style={{fontFamily:"'Bebas Neue',cursive",fontSize:36,letterSpacing:3,color:"#f1f5f9"}}>🔎 Verifica Computo</h1>
        <p style={{color:"#64748b",marginTop:4}}>Confronta il CME AI con il computo dell'utente e individua differenze e lavorazioni mancanti</p>
      </div>

      {/* Step indicator */}
      <div style={{display:"flex",gap:24,marginBottom:32,paddingBottom:20,borderBottom:"1px solid rgba(51,65,85,0.4)"}}>
        {["Riferimento AI","Computo utente","Analisi differenze"].map((lab,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:30,height:30,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",
              fontFamily:"'Bebas Neue',cursive",fontSize:14,flexShrink:0,
              background:i<step?"#6366f1":i===step?"#f59e0b":"#1e293b",
              border:`2px solid ${i<step?"#6366f1":i===step?"#f59e0b":"#334155"}`,
              color:i<=step?"#fff":"#475569"}}>
              {i<step?"✓":i+1}
            </div>
            <span style={{fontSize:13,color:i===step?"#f59e0b":i<step?"#6366f1":"#475569",fontWeight:i===step?600:400}}>{lab}</span>
            {i<2 && <span style={{color:"#334155",marginLeft:8}}>›</span>}
          </div>
        ))}
      </div>

      {/* STEP 0 */}
      {step===0 && (
        <div style={{background:"rgba(15,23,42,0.7)",border:"1px solid rgba(51,65,85,0.5)",borderRadius:16,padding:32,maxWidth:640}}>
          <h2 style={{fontFamily:"'Bebas Neue',cursive",fontSize:24,letterSpacing:2,marginBottom:6}}>📊 Seleziona il Computo di Riferimento</h2>
          <p style={{color:"#64748b",fontSize:13,marginBottom:24}}>Scegli il CME generato dall'AI dallo storico</p>
          {computi.length===0 ? (
            <div style={{padding:"24px",background:"rgba(99,102,241,0.07)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:10,color:"#94a3b8",fontSize:13,textAlign:"center"}}>
              Nessun computo trovato. <span style={{color:"#6366f1"}}>Genera prima un CME da "Nuovo Computo".</span>
            </div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:360,overflowY:"auto"}}>
              {computi.map(c=>(
                <div key={c.id} onClick={()=>setRifId(String(c.id))} style={{
                  padding:"14px 18px",borderRadius:10,cursor:"pointer",
                  background:rifId===String(c.id)?"rgba(99,102,241,0.12)":"rgba(15,23,42,0.5)",
                  border:`2px solid ${rifId===String(c.id)?"#6366f1":"rgba(51,65,85,0.4)"}`,
                  display:"flex",justifyContent:"space-between",alignItems:"center",transition:"all 0.15s"}}>
                  <div>
                    <div style={{color:"#e2e8f0",fontWeight:500,fontSize:14}}>{c.titolo}</div>
                    <div style={{color:"#64748b",fontSize:12,marginTop:2}}>{c.regione} · {c.anno} · {new Date(c.created_at).toLocaleDateString("it-IT")}</div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:18,color:"#10b981"}}>{fEuro(c.totale)}</div>
                    {rifId===String(c.id)&&<span style={{color:"#6366f1",fontSize:20}}>✓</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{marginTop:20}}>{btnPrimary(!rifId,()=>setStep(1),"Avanti: Carica computo utente →")}</div>
        </div>
      )}

      {/* STEP 1 */}
      {step===1 && (
        <div style={{background:"rgba(15,23,42,0.7)",border:"1px solid rgba(51,65,85,0.5)",borderRadius:16,padding:32,maxWidth:640}}>
          <h2 style={{fontFamily:"'Bebas Neue',cursive",fontSize:24,letterSpacing:2,marginBottom:6}}>📂 Carica il Computo dell'Utente</h2>
          <p style={{color:"#64748b",fontSize:13,marginBottom:20}}>CSV (separato da ; o ,) oppure PDF con tabella di computo</p>
          <DropZone label="Trascina il file o clicca per selezionare"
            accept=".csv,.txt,.pdf" icon="📄" file={fileUtente} onFile={setFileUtente}
            hint="CSV con colonne: codice; descrizione; um; quantita; prezzoUnitario; importo" />
          <div style={{marginTop:14,padding:"12px 16px",background:"rgba(99,102,241,0.07)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:8,fontSize:12,color:"#94a3b8"}}>
            <strong style={{color:"#a78bfa"}}>Formato CSV consigliato:</strong><br/>
            <code style={{fontFamily:"monospace",fontSize:11,color:"#c4b5fd"}}>codice;descrizione;um;quantita;prezzoUnitario;importo</code>
          </div>
          {error && <div style={{marginTop:12,padding:"10px 14px",background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:8,color:"#f87171",fontSize:13}}>❌ {error}</div>}
          <div style={{display:"flex",gap:12,marginTop:20}}>
            <button onClick={()=>setStep(0)} style={{padding:"14px 20px",background:"transparent",border:"1px solid #334155",borderRadius:10,cursor:"pointer",color:"#94a3b8",fontSize:14}}>← Indietro</button>
            {btnPrimary(!fileUtente, avviaConfronto, "🔍 Avvia Verifica")}
          </div>
        </div>
      )}

      {/* STEP 2 */}
      {step===2 && risultato && (
        <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:12,marginBottom:20}}>
            {[["Voci analizzate",risultato.metadati?.vociUtente||0,"#e2e8f0"],["Corrette",s.vociOk||0,"#10b981"],["Con differenze",s.vociConDifferenze||0,"#f59e0b"],["Lav. mancanti",s.vociMancanti||0,"#ef4444"],["Totale utente",fEuro(s.importoTotaleUtente),"#e2e8f0"],["Totale rif. AI",fEuro(s.importoTotaleRiferimento),"#6366f1"]].map(([label,val,col])=>(
              <div key={label} style={{background:"rgba(15,23,42,0.7)",border:"1px solid rgba(51,65,85,0.4)",borderRadius:12,padding:"14px",textAlign:"center"}}>
                <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",letterSpacing:1,marginBottom:5}}>{label}</div>
                <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,color:col}}>{val}</div>
              </div>
            ))}
          </div>

          {s.giudizioGenerale && (
            <div style={{marginBottom:16,padding:"12px 16px",background:"rgba(99,102,241,0.08)",border:"1px solid rgba(99,102,241,0.25)",borderRadius:10,fontSize:13,color:"#c4b5fd"}}>
              🤖 <strong>Valutazione AI:</strong> {s.giudizioGenerale}
            </div>
          )}

          <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center",marginBottom:14,padding:"12px 16px",background:"rgba(15,23,42,0.6)",border:"1px solid rgba(51,65,85,0.4)",borderRadius:12}}>
            <span style={{fontSize:11,color:"#64748b",textTransform:"uppercase",letterSpacing:1}}>Filtra:</span>
            {[["tutti","Tutti"],["ok","Corretti"],["errori","Con diff."],["quantita_diversa","Qta"],["prezzo_diverso","Prezzo"],["entrambi_diversi","Entrambi"],["mancante_in_riferimento","Extra"]].map(([v,l])=>(
              <button key={v} onClick={()=>setFiltroStato(v)} style={{padding:"4px 11px",borderRadius:20,cursor:"pointer",fontSize:11,fontWeight:600,background:filtroStato===v?"rgba(99,102,241,0.2)":"transparent",border:`1px solid ${filtroStato===v?"#6366f1":"#334155"}`,color:filtroStato===v?"#a78bfa":"#64748b"}}>{l}</button>
            ))}
            <div style={{flex:1}}/>
            <button onClick={selezionaTutti} style={{padding:"4px 11px",borderRadius:6,cursor:"pointer",fontSize:11,background:"transparent",border:"1px solid #334155",color:"#94a3b8"}}>Seleziona tutti</button>
            <button onClick={deselezionaTutti} style={{padding:"4px 11px",borderRadius:6,cursor:"pointer",fontSize:11,background:"transparent",border:"1px solid #334155",color:"#94a3b8"}}>Deseleziona</button>
            <span style={{fontSize:12,color:"#6366f1",fontWeight:600}}>{righeSelezionate.length} selezionate</span>
          </div>

          <div style={{background:"rgba(15,23,42,0.7)",border:"1px solid rgba(51,65,85,0.4)",borderRadius:14,overflow:"hidden",marginBottom:20}}>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead>
                  <tr style={{background:"#1e293b"}}>
                    {["✓","Codice","Descrizione","U.M.","Qta Utente","Qta Rif.","Eu Utente","Eu Rif.","Delta","Stato","Note AI"].map(c=>(
                      <th key={c} style={{padding:"11px 10px",textAlign:"left",fontFamily:"'Bebas Neue',cursive",letterSpacing:1.5,fontSize:11,color:"#6366f1",borderBottom:"1px solid #334155",whiteSpace:"nowrap"}}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {righeFiltrate.map((r,idx)=>{
                    const globalIdx = risultato.righeConfronto.indexOf(r);
                    const selezionata = !!selezione[globalIdx];
                    return (
                      <tr key={idx} onClick={()=>toggleSelezione(globalIdx)} style={{cursor:"pointer",
                        background:selezionata?"rgba(99,102,241,0.07)":idx%2===0?"rgba(15,23,42,0.4)":"rgba(30,41,59,0.3)",
                        borderLeft:`3px solid ${selezionata?"#6366f1":"transparent"}`,transition:"all 0.12s"}}>
                        <td style={{padding:"10px"}}>
                          <div style={{width:17,height:17,borderRadius:4,border:`2px solid ${selezionata?"#6366f1":"#334155"}`,background:selezionata?"#6366f1":"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
                            {selezionata&&<span style={{color:"#fff",fontSize:10}}>✓</span>}
                          </div>
                        </td>
                        <td style={{padding:"10px",color:"#f59e0b",fontFamily:"monospace",fontSize:11}}>{r.codice||"—"}</td>
                        <td style={{padding:"10px",color:"#e2e8f0",maxWidth:220}}>{r.descrizione}</td>
                        <td style={{padding:"10px",color:"#94a3b8",textAlign:"center"}}>{r.um}</td>
                        <td style={{padding:"10px",textAlign:"right",fontWeight:r.stato!=="ok"?700:400,color:r.stato==="quantita_diversa"||r.stato==="entrambi_diversi"?"#f59e0b":"#e2e8f0"}}>
                          {fNum(r.quantitaUtente)}
                          {r.deltaQuantita_pct&&Math.abs(r.deltaQuantita_pct)>5?<span style={{fontSize:10,color:"#f59e0b",marginLeft:4}}>({r.deltaQuantita_pct>0?"+":""}{fNum(r.deltaQuantita_pct,1)}%)</span>:null}
                        </td>
                        <td style={{padding:"10px",color:"#6366f1",textAlign:"right"}}>{fNum(r.quantitaRiferimento)}</td>
                        <td style={{padding:"10px",textAlign:"right",fontWeight:r.stato!=="ok"?700:400,color:r.stato==="prezzo_diverso"||r.stato==="entrambi_diversi"?"#f59e0b":"#e2e8f0"}}>{fEuro(r.prezzoUnitarioUtente)}</td>
                        <td style={{padding:"10px",color:"#6366f1",textAlign:"right"}}>{fEuro(r.prezzoUnitarioRiferimento)}</td>
                        <td style={{padding:"10px",textAlign:"right",fontWeight:700,color:r.deltaImporto>0?"#ef4444":r.deltaImporto<0?"#10b981":"#64748b"}}>
                          {r.deltaImporto>0?"+":""}{fEuro(r.deltaImporto)}
                        </td>
                        <td style={{padding:"10px"}}><StatoBadge stato={r.stato}/></td>
                        <td style={{padding:"10px",color:"#64748b",fontSize:11,maxWidth:160}}>{r.noteAI}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {risultato.vociMancanti&&risultato.vociMancanti.length>0 && (
            <div style={{marginBottom:20}}>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
                <h3 style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:2,color:"#ef4444"}}>⚠ Lavorazioni Mancanti ({risultato.vociMancanti.length})</h3>
                <button onClick={()=>setMostraMancanti(m=>!m)} style={{padding:"4px 12px",background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:12,cursor:"pointer",color:"#f87171",fontSize:12}}>{mostraMancanti?"Nascondi":"Mostra"}</button>
                <span style={{fontSize:12,color:"#64748b"}}>Nell'export: <strong style={{color:mostraMancanti?"#ef4444":"#64748b"}}>{mostraMancanti?"Sì":"No"}</strong></span>
              </div>
              {mostraMancanti && (
                <div style={{background:"rgba(15,23,42,0.6)",border:"1px solid rgba(239,68,68,0.25)",borderRadius:12,overflow:"hidden"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                    <thead>
                      <tr style={{background:"rgba(239,68,68,0.1)"}}>
                        {["Codice","Descrizione","U.M.","Quantita","Prezzo unit.","Importo","Perche e necessaria"].map(c=>(
                          <th key={c} style={{padding:"10px",textAlign:"left",color:"#f87171",fontFamily:"'Bebas Neue',cursive",letterSpacing:1,fontSize:11,borderBottom:"1px solid rgba(239,68,68,0.2)"}}>{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {risultato.vociMancanti.map((v,i)=>(
                        <tr key={i} style={{background:i%2===0?"rgba(239,68,68,0.04)":"transparent"}}>
                          <td style={{padding:"9px 10px",color:"#f87171",fontFamily:"monospace",fontSize:11}}>{v.codice||"—"}</td>
                          <td style={{padding:"9px 10px",color:"#e2e8f0",maxWidth:220}}>{v.descrizione}</td>
                          <td style={{padding:"9px 10px",color:"#94a3b8",textAlign:"center"}}>{v.um}</td>
                          <td style={{padding:"9px 10px",color:"#e2e8f0",textAlign:"right"}}>{fNum(v.quantita)}</td>
                          <td style={{padding:"9px 10px",color:"#e2e8f0",textAlign:"right"}}>{fEuro(v.prezzoUnitario)}</td>
                          <td style={{padding:"9px 10px",color:"#ef4444",textAlign:"right",fontWeight:700}}>{fEuro(v.importo)}</td>
                          <td style={{padding:"9px 10px",color:"#64748b",fontSize:11}}>{v.noteAI}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <div style={{padding:"18px 22px",background:"rgba(15,23,42,0.6)",border:"1px solid rgba(99,102,241,0.25)",borderRadius:14,display:"flex",gap:14,flexWrap:"wrap",alignItems:"center"}}>
            <div style={{flex:1}}>
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:18,letterSpacing:2,color:"#a78bfa",marginBottom:3}}>Esporta risultati validazione</div>
              <div style={{fontSize:12,color:"#64748b"}}>{righeSelezionate.length>0?righeSelezionate.length+" voci selezionate":"Tutte le voci visibili"}{mostraMancanti&&risultato.vociMancanti?.length>0?" · "+risultato.vociMancanti.length+" lavorazioni mancanti incluse":""}</div>
            </div>
            <button onClick={()=>exportPDF(righeSelezionate.length>0?righeSelezionate:righeFiltrate,vociMancantiSel,s,righeSelezionate.length>0)}
              style={{padding:"11px 18px",background:"transparent",border:"1px solid #6366f1",borderRadius:8,cursor:"pointer",color:"#6366f1",fontWeight:600,fontSize:13}}>
              📄 Esporta PDF validato
            </button>
            <button onClick={()=>exportCSV(righeSelezionate.length>0?righeSelezionate:righeFiltrate,vociMancantiSel)}
              style={{padding:"11px 18px",background:"transparent",border:"1px solid #10b981",borderRadius:8,cursor:"pointer",color:"#10b981",fontWeight:600,fontSize:13}}>
              📊 Esporta CSV validato
            </button>
            <button onClick={()=>{setStep(0);setRisultato(null);setFileUtente(null);setRifId("");setSelezione({});}}
              style={{padding:"11px 14px",background:"transparent",border:"1px solid #475569",borderRadius:8,cursor:"pointer",color:"#64748b",fontSize:13}}>
              🔄 Nuova verifica
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div style={{position:"fixed",inset:0,background:"rgba(10,15,30,0.94)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",zIndex:999}}>
          <div style={{position:"relative",width:70,height:70,marginBottom:28}}>
            {[0,1,2].map(i=>(
              <div key={i} style={{position:"absolute",inset:i*10,border:`2px solid rgba(99,102,241,${0.7-i*0.2})`,borderRadius:"50%",animation:`cspin${i} ${1+i*0.3}s linear infinite`}}/>
            ))}
          </div>
          <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:22,letterSpacing:3,color:"#6366f1",marginBottom:10}}>Verifica in corso</div>
          <div style={{color:"#64748b",fontSize:14,textAlign:"center",maxWidth:360}}>{progress}</div>
          <style>{`@keyframes cspin0{to{transform:rotate(360deg)}}@keyframes cspin1{to{transform:rotate(-360deg)}}@keyframes cspin2{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {error && step!==1 && (
        <div style={{marginTop:20,padding:"14px 16px",background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:10,color:"#f87171",fontSize:13,display:"flex",justifyContent:"space-between"}}>
          <span>❌ {error}</span>
          <button onClick={()=>setError(null)} style={{background:"none",border:"none",color:"#f87171",cursor:"pointer"}}>✕</button>
        </div>
      )}
    </div>
  );
}
