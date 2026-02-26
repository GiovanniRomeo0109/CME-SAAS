import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";
import { useAuth } from "../lib/auth.jsx";

const REGIONS = ["Abruzzo","Basilicata","Calabria","Campania","Emilia-Romagna","Friuli-Venezia Giulia","Lazio","Liguria","Lombardia","Marche","Molise","Piemonte","Puglia","Sardegna","Sicilia","Toscana","Trentino-Alto Adige","Umbria","Valle d'Aosta","Veneto"];
const STEPS = ["Capitolato","Planimetria","Prezziario","Revisione Misure","Computo"];

function formatEuro(n) { return new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR"}).format(n||0); }

function DropZone({ label, accept, icon, file, onFile, hint }) {
  const ref = useRef();
  const [drag, setDrag] = useState(false);
  return (
    <div onClick={() => ref.current.click()}
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); onFile(e.dataTransfer.files[0]); }}
      style={{ border: `2px dashed ${drag ? "#f59e0b" : file ? "#10b981" : "#334155"}`, borderRadius: 12, padding: "32px 24px", textAlign: "center", cursor: "pointer", background: drag ? "rgba(245,158,11,0.05)" : file ? "rgba(16,185,129,0.05)" : "rgba(15,23,42,0.4)", transition: "all 0.2s" }}>
      <input ref={ref} type="file" accept={accept} style={{ display: "none" }} onChange={e => onFile(e.target.files[0])} />
      <div style={{ fontSize: 36, marginBottom: 8 }}>{file ? "✅" : icon}</div>
      <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 18, color: file ? "#10b981" : "#94a3b8", letterSpacing: 1 }}>{file ? file.name : label}</div>
      {file && <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{(file.size/1024).toFixed(1)} KB</div>}
      {!file && hint && <div style={{ fontSize: 12, color: "#475569", marginTop: 6 }}>{hint}</div>}
    </div>
  );
}

function CMETable({ rows }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "#1e293b" }}>
            {["#","Codice","Descrizione","U.M.","Quantità","Prezzo unit.","Importo"].map(c => (
              <th key={c} style={{ padding: "12px 10px", textAlign: "left", fontFamily: "'Bebas Neue',cursive", letterSpacing: 1.5, fontSize: 13, color: "#f59e0b", borderBottom: "1px solid #334155" }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "rgba(15,23,42,0.4)" : "rgba(30,41,59,0.3)" }}>
              <td style={{ padding: "10px", color: "#64748b" }}>{i+1}</td>
              <td style={{ padding: "10px", color: "#f59e0b", fontFamily: "monospace", fontSize: 12 }}>{r.codice||"—"}</td>
              <td style={{ padding: "10px", color: "#e2e8f0", maxWidth: 280 }}>{r.descrizione}</td>
              <td style={{ padding: "10px", color: "#94a3b8", textAlign: "center" }}>{r.um}</td>
              <td style={{ padding: "10px", color: "#e2e8f0", textAlign: "right" }}>{Number(r.quantita).toLocaleString("it-IT",{maximumFractionDigits:2})}</td>
              <td style={{ padding: "10px", color: "#e2e8f0", textAlign: "right" }}>{formatEuro(r.prezzoUnitario)}</td>
              <td style={{ padding: "10px", color: "#10b981", textAlign: "right", fontWeight: 700 }}>{formatEuro(r.importo)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function exportPDF(result, titolo, regione, anno) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const amber = [245, 158, 11];
  const dark  = [15, 23, 42];

  // Header
  doc.setFillColor(...dark);
  doc.rect(0, 0, 297, 40, "F");
  doc.setTextColor(...amber);
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text("COMPUTO METRICO ESTIMATIVO", 14, 20);
  doc.setFontSize(11);
  doc.setTextColor(150, 150, 170);
  doc.text(`${titolo} · Regione ${regione} · Prezziario ${anno}`, 14, 30);
  doc.text(`Generato il: ${new Date().toLocaleDateString("it-IT")} | CME Agent`, 14, 37);

  // Table
  autoTable(doc, {
    startY: 48,
    head: [["#","Codice","Descrizione lavorazione","U.M.","Quantità","Prezzo unit. €","Importo €"]],
    body: result.rows.map((r, i) => [
      i+1, r.codice||"", r.descrizione, r.um,
      Number(r.quantita).toLocaleString("it-IT",{maximumFractionDigits:2}),
      Number(r.prezzoUnitario).toLocaleString("it-IT",{minimumFractionDigits:2}),
      Number(r.importo).toLocaleString("it-IT",{minimumFractionDigits:2}),
    ]),
    foot: [["","","","","","TOTALE NETTO", Number(result.totale).toLocaleString("it-IT",{minimumFractionDigits:2})]],
    headStyles: { fillColor: [30,41,59], textColor: amber, fontStyle: "bold", fontSize: 10 },
    bodyStyles: { fontSize: 9, textColor: [200,210,220] },
    footStyles: { fillColor: [30,41,59], textColor: amber, fontStyle: "bold", fontSize: 11 },
    alternateRowStyles: { fillColor: [20,30,50] },
    styles: { fillColor: [15,23,42] },
    columnStyles: { 4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right", fontStyle: "bold" } },
  });

  // Summary box
  const finalY = doc.lastAutoTable.finalY + 10;
  const summaryData = [
    ["Importo netto lavori", result.totale],
    ["Spese generali (15%)", result.totale * 0.15],
    ["Utile d'impresa (10%)", result.totale * 0.10],
    ["Imponibile", result.totale * 1.25],
    ["IVA 10%", result.totale * 1.25 * 0.10],
    ["TOTALE CON IVA", result.totale * 1.25 * 1.10],
  ];
  doc.setFillColor(30,41,59);
  doc.roundedRect(14, finalY, 120, summaryData.length * 8 + 10, 2, 2, "F");
  summaryData.forEach(([label, val], i) => {
    const isLast = i === summaryData.length - 1;
    doc.setFontSize(isLast ? 11 : 9);
    doc.setTextColor(isLast ? amber[0] : 180, isLast ? amber[1] : 190, isLast ? amber[2] : 200);
    doc.setFont("helvetica", isLast ? "bold" : "normal");
    doc.text(label, 20, finalY + 8 + i * 8);
    doc.text(`€ ${Number(val).toLocaleString("it-IT",{minimumFractionDigits:2})}`, 128, finalY + 8 + i * 8, { align: "right" });
  });

  if (result.note) {
    doc.setFontSize(8); doc.setTextColor(100,116,139); doc.setFont("helvetica","italic");
    doc.text(`Note: ${result.note}`, 14, finalY + summaryData.length * 8 + 18, { maxWidth: 269 });
  }

  doc.save(`CME_${titolo.replace(/\s+/g,"_")}_${regione}_${anno}.pdf`);
}

function exportCSV(result, titolo, regione) {
  const header = "N.;Codice;Descrizione;U.M.;Quantità;Prezzo Unitario;Importo\n";
  const body = result.rows.map((r,i) =>
    `${i+1};${r.codice||""};${r.descrizione};${r.um};${r.quantita};${r.prezzoUnitario};${r.importo}`
  ).join("\n");
  const foot = `\n;;;;;;;\n;;;TOTALE;;;${result.totale}`;
  const blob = new Blob(["\uFEFF"+header+body+foot], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = `CME_${titolo}_${regione}.csv`; a.click();
}

export default function CMEAgent() {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [capitolato, setCapitolato] = useState(null);
  const [planimetria, setPlanimetria] = useState(null);
  const [prezziario, setPrezziario] = useState(null);
  const [region, setRegion] = useState("Lombardia");
  const [year, setYear] = useState("2024");
  const [titolo, setTitolo] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState(null);
  const [misureRevisione, setMisureRevisione] = useState(null); // misure estratte da rivedere
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Fase 1: estrai misure e mostra step revisione
  const runEstrazione = useCallback(async () => {
    setLoading(true); setError(null);
    setProgress("Analisi del capitolato e della planimetria in corso...");
    try {
      const fd = new FormData();
      fd.append("capitolato", capitolato);
      fd.append("planimetria", planimetria);
      if (prezziario) fd.append("prezziario", prezziario);
      fd.append("regione", region);
      fd.append("anno", year);
      fd.append("soloMisure", "true"); // flag per fermarsi dopo le misure

      setProgress("L'AI sta leggendo la planimetria (analisi in 4 passaggi)...");
      const data = await api.ai.analizza(fd);

      // Prepara misure piatte per la revisione
      const m = data.misure || {};
      setMisureRevisione({
        superficiePavimento:      m.superficiePavimento      || 0,
        altezzaMedia:             m.altezzaMedia             || 2.7,
        perimetro:                m.perimetro                || 0,
        superficieMuraturaEsterna:m.superficieMuraturaEsterna|| 0,
        superficieIntonaco:       m.superficieIntonaco       || 0,
        totalePorteEsterne:       m.totalePorteEsterne       || 0,
        totalePorteInterne:       m.totalePorteInterne       || 0,
        totaleFinestre:           m.totaleFinestre           || 0,
        superficieTotaleInfissi:  m.superficieTotaleInfissi  || 0,
        // Dati vani dettagliati (solo lettura)
        _vaniDettaglio: m.vani?.vani || [],
        _confidenza: m.confidenza || "media",
        _scala: m.scala?.scala || "non rilevata",
        _noteAperture: m.aperture?.note_aperture || "",
      });
      // Salva anche lavorazioni estratte per usarle dopo
      setResult({ _lavorazioni: data.lavorazioni_estratte, _partialData: data });
      setStep(3); // vai allo step revisione
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false); setProgress("");
    }
  }, [capitolato, planimetria, prezziario, region, year]);

  // Fase 2: genera CME con misure (eventualmente corrette)
  const runGenerazione = useCallback(async () => {
    setLoading(true); setError(null);
    setProgress("Generazione del Computo Metrico con le misure confermate...");
    try {
      const fd = new FormData();
      fd.append("capitolato", capitolato);
      fd.append("planimetria", planimetria);
      if (prezziario) fd.append("prezziario", prezziario);
      fd.append("regione", region);
      fd.append("anno", year);
      fd.append("misureCorrette", JSON.stringify(misureRevisione)); // misure riviste

      setProgress("L'AI sta generando il computo con le misure confermate...");
      const data = await api.ai.analizza(fd);
      setResult(data);
      setStep(4);
      await refreshUser();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false); setProgress("");
    }
  }, [capitolato, planimetria, prezziario, region, year, misureRevisione, refreshUser]);

  const saveComputo = async () => {
    if (!result || !titolo) return;
    setSaving(true);
    try {
      await api.computi.save({ titolo, regione: region, anno: year, rows: result.rows, totale: result.totale, note: result.note });
      setSaved(true);
      setTimeout(() => navigate("/storico"), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const sel = { width: "100%", padding: "12px 14px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 14, appearance: "none", cursor: "pointer" };
  const nextBtn = (disabled, onClick, label) => (
    <button disabled={disabled} onClick={onClick} style={{
      flex:1, padding:"14px 24px", background: disabled?"#1e293b":"linear-gradient(135deg,#f59e0b,#d97706)",
      border:"none", borderRadius:10, cursor: disabled?"not-allowed":"pointer",
      fontFamily:"'Bebas Neue',cursive", fontSize:18, letterSpacing:2,
      color: disabled?"#475569":"#0f172a", boxShadow: disabled?"none":"0 8px 24px rgba(245,158,11,0.25)",
    }}>{label}</button>
  );

  return (
    <div style={{ padding: "36px 40px", minHeight: "100vh", background: "linear-gradient(180deg,rgba(245,158,11,0.04) 0%,transparent 300px)" }}>
      <h1 style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 36, letterSpacing: 3, color: "#f1f5f9", marginBottom: 8 }}>Nuovo Computo</h1>
      <p style={{ color: "#64748b", marginBottom: 36 }}>Analisi AI di capitolati, planimetrie e prezziari regionali</p>

      {/* Step nav */}
      <div style={{ display: "flex", gap: 32, marginBottom: 36, paddingBottom: 24, borderBottom: "1px solid rgba(51,65,85,0.4)" }}>
        {STEPS.map((s,i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:32, height:32, borderRadius:"50%", background: i<step?"#10b981":i===step?"#f59e0b":"#1e293b", border:`2px solid ${i<step?"#10b981":i===step?"#f59e0b":"#334155"}`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue',cursive", fontSize:15, color: i<=step?"#0f172a":"#475569", flexShrink:0 }}>
              {i < step ? "✓" : i+1}
            </div>
            <span style={{ fontSize:13, color: i===step?"#f59e0b":i<step?"#10b981":"#475569", fontWeight: i===step?600:400 }}>{s}</span>
            {i<3 && <span style={{ color:"#334155", marginLeft:12 }}>›</span>}
          </div>
        ))}
      </div>

      {/* Step 0 */}
      {step===0 && (
        <div style={{ background:"rgba(15,23,42,0.7)", border:"1px solid rgba(51,65,85,0.5)", borderRadius:16, padding:32, maxWidth:640 }}>
          <h2 style={{ fontFamily:"'Bebas Neue',cursive", fontSize:24, letterSpacing:2, marginBottom:8 }}>📄 Carica il Capitolato</h2>
          <p style={{ color:"#64748b", fontSize:13, marginBottom:20 }}>PDF o Word • Il sistema estrarrà tutte le voci d'opera</p>
          <DropZone label="Trascina il capitolato o clicca" accept=".pdf,.docx,.doc" icon="📋" file={capitolato} onFile={setCapitolato} hint="Capitolato Speciale d'Appalto · PDF o DOCX" />
          <div style={{ marginTop:20 }}>
            {nextBtn(!capitolato, ()=>setStep(1), "Avanti: Planimetria →")}
          </div>
        </div>
      )}

      {/* Step 1 */}
      {step===1 && (
        <div style={{ background:"rgba(15,23,42,0.7)", border:"1px solid rgba(51,65,85,0.5)", borderRadius:16, padding:32, maxWidth:640 }}>
          <h2 style={{ fontFamily:"'Bebas Neue',cursive", fontSize:24, letterSpacing:2, marginBottom:8 }}>🗺️ Carica la Planimetria</h2>
          <p style={{ color:"#64748b", fontSize:13, marginBottom:20 }}>JPG/PNG → analisi AI automatica · DWG → misure stimate</p>
          <DropZone label="Trascina la planimetria o clicca" accept=".jpg,.jpeg,.png,.dwg" icon="📐" file={planimetria} onFile={setPlanimetria} hint="JPG/PNG per analisi automatica delle misure" />
          <div style={{ display:"flex", gap:12, marginTop:20 }}>
            <button onClick={()=>setStep(0)} style={{ padding:"14px 20px", background:"transparent", border:"1px solid #334155", borderRadius:10, cursor:"pointer", color:"#94a3b8", fontSize:14 }}>← Indietro</button>
            {nextBtn(!planimetria, ()=>setStep(2), "Avanti: Prezziario →")}
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step===2 && (
        <div style={{ background:"rgba(15,23,42,0.7)", border:"1px solid rgba(51,65,85,0.5)", borderRadius:16, padding:32, maxWidth:640 }}>
          <h2 style={{ fontFamily:"'Bebas Neue',cursive", fontSize:24, letterSpacing:2, marginBottom:8 }}>💰 Prezziario Regionale</h2>
          <p style={{ color:"#64748b", fontSize:13, marginBottom:20 }}>Seleziona regione e anno · Carica il PDF del prezziario per massima precisione</p>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
            <div>
              <label style={{ fontSize:12, color:"#94a3b8", letterSpacing:1, textTransform:"uppercase", display:"block", marginBottom:6 }}>Regione</label>
              <select value={region} onChange={e=>setRegion(e.target.value)} style={sel}>
                {REGIONS.map(r=><option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:12, color:"#94a3b8", letterSpacing:1, textTransform:"uppercase", display:"block", marginBottom:6 }}>Anno</label>
              <select value={year} onChange={e=>setYear(e.target.value)} style={sel}>
                {["2025","2024","2023","2022"].map(y=><option key={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom:16 }}>
            <label style={{ fontSize:12, color:"#94a3b8", letterSpacing:1, textTransform:"uppercase", display:"block", marginBottom:6 }}>Titolo del computo</label>
            <input value={titolo} onChange={e=>setTitolo(e.target.value)} placeholder="es: Ristrutturazione Via Roma 10, Milano"
              style={{ ...sel, border:"1px solid #334155" }} />
          </div>
          <DropZone label="Carica Prezziario PDF (opzionale)" accept=".pdf" icon="📊" file={prezziario} onFile={setPrezziario} hint="Se caricato, ha priorità sui prezzi integrati" />
          <div style={{ marginTop:8, padding:"12px 16px", background:"rgba(59,130,246,0.07)", border:"1px solid rgba(59,130,246,0.2)", borderRadius:8, fontSize:13, color:"#94a3b8" }}>
            ℹ️ Senza prezziario allegato verranno usati i prezzi integrati del prezziario LL.PP. {region} {year}.
          </div>
          <div style={{ display:"flex", gap:12, marginTop:20 }}>
            <button onClick={()=>setStep(1)} style={{ padding:"14px 20px", background:"transparent", border:"1px solid #334155", borderRadius:10, cursor:"pointer", color:"#94a3b8", fontSize:14 }}>← Indietro</button>
            {nextBtn(!region, runEstrazione, "🔍 Analizza e Rivedi Misure")}
          </div>
        </div>
      )}

      {/* Step 3 — Revisione misure */}
      {step===3 && misureRevisione && (
        <div style={{ background:"rgba(15,23,42,0.7)", border:"1px solid rgba(51,65,85,0.5)", borderRadius:16, padding:32, maxWidth:780 }}>
          <h2 style={{ fontFamily:"'Bebas Neue',cursive", fontSize:26, letterSpacing:2, marginBottom:6 }}>🔍 Revisione Misure Estratte</h2>
          <p style={{ color:"#64748b", fontSize:13, marginBottom:6 }}>
            Scala rilevata: <strong style={{color:"#f59e0b"}}>{misureRevisione._scala}</strong> &nbsp;·&nbsp;
            Confidenza: <strong style={{color: misureRevisione._confidenza==="alta"?"#10b981":"#f59e0b"}}>{misureRevisione._confidenza}</strong>
          </p>
          <p style={{ color:"#475569", fontSize:12, marginBottom:20 }}>
            ⚠️ Verifica e correggi le misure prima di generare il computo. Ogni modifica migliora la precisione del risultato finale.
          </p>

          {/* Vani dettaglio (sola lettura) */}
          {misureRevisione._vaniDettaglio?.length > 0 && (
            <div style={{ marginBottom:24 }}>
              <div style={{ fontSize:12, color:"#94a3b8", textTransform:"uppercase", letterSpacing:1, marginBottom:10 }}>Vani rilevati (verifica la correttezza)</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:8 }}>
                {misureRevisione._vaniDettaglio.map((v,i) => (
                  <div key={i} style={{ background:"rgba(15,23,42,0.6)", border:"1px solid rgba(51,65,85,0.4)", borderRadius:8, padding:"10px 14px" }}>
                    <div style={{ color:"#f59e0b", fontSize:12, fontWeight:600 }}>{v.nome}</div>
                    <div style={{ color:"#94a3b8", fontSize:12, marginTop:2 }}>{v.larghezza_m} × {v.lunghezza_m} m = <strong style={{color:"#e2e8f0"}}>{v.superficie_mq} m²</strong></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Campi editabili */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14 }}>
            {[
              { key:"superficiePavimento",       label:"Superficie pavimento",      unit:"m²" },
              { key:"altezzaMedia",              label:"Altezza media interpiano",  unit:"m"  },
              { key:"perimetro",                 label:"Perimetro esterno",         unit:"m"  },
              { key:"superficieMuraturaEsterna", label:"Muratura esterna",          unit:"m²" },
              { key:"superficieIntonaco",        label:"Intonaco interno",          unit:"m²" },
              { key:"totalePorteEsterne",        label:"Porte esterne",             unit:"cad"},
              { key:"totalePorteInterne",        label:"Porte interne",             unit:"cad"},
              { key:"totaleFinestre",            label:"Finestre totali",           unit:"cad"},
              { key:"superficieTotaleInfissi",   label:"Sup. totale infissi",       unit:"m²" },
            ].map(({ key, label, unit }) => (
              <div key={key}>
                <label style={{ fontSize:11, color:"#64748b", textTransform:"uppercase", letterSpacing:1, display:"block", marginBottom:5 }}>
                  {label} <span style={{color:"#475569"}}>({unit})</span>
                </label>
                <input
                  type="number" step="0.01"
                  value={misureRevisione[key]}
                  onChange={e => setMisureRevisione(m => ({ ...m, [key]: parseFloat(e.target.value) || 0 }))}
                  style={{ width:"100%", padding:"10px 12px", background:"#1e293b", border:"1px solid #334155", borderRadius:8, color:"#e2e8f0", fontSize:14 }}
                />
              </div>
            ))}
          </div>

          {misureRevisione._noteAperture && (
            <div style={{ marginTop:16, padding:"10px 14px", background:"rgba(245,158,11,0.07)", border:"1px solid rgba(245,158,11,0.2)", borderRadius:8, fontSize:12, color:"#94a3b8" }}>
              📝 Note AI sulle aperture: {misureRevisione._noteAperture}
            </div>
          )}

          <div style={{ display:"flex", gap:12, marginTop:24 }}>
            <button onClick={()=>setStep(2)} style={{ padding:"14px 20px", background:"transparent", border:"1px solid #334155", borderRadius:10, cursor:"pointer", color:"#94a3b8", fontSize:14 }}>← Modifica parametri</button>
            {nextBtn(false, runGenerazione, "🚀 Genera Computo con queste misure")}
          </div>
        </div>
      )}

      {/* Step 4 - Result */}
      {step===4 && result && result.rows && (
        <div style={{ background:"rgba(15,23,42,0.7)", border:"1px solid rgba(51,65,85,0.5)", borderRadius:16, padding:32 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
            <div>
              <h2 style={{ fontFamily:"'Bebas Neue',cursive", fontSize:28, letterSpacing:2 }}>📊 Computo Metrico Estimativo</h2>
              <p style={{ color:"#64748b", fontSize:13, marginTop:4 }}>{region} · {year} · {result.rows.length} voci · {result.lavorazioni_estratte} lavorazioni estratte</p>
            </div>
            <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:32, color:"#10b981", letterSpacing:1 }}>{formatEuro(result.totale)}</div>
          </div>

          <CMETable rows={result.rows} />

          {result.note && (
            <div style={{ marginTop:16, padding:"12px 16px", background:"rgba(139,92,246,0.07)", border:"1px solid rgba(139,92,246,0.2)", borderRadius:8, fontSize:13, color:"#94a3b8" }}>
              📝 {result.note}
            </div>
          )}

          {/* Summary */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginTop:24 }}>
            {[
              ["Importo netto", formatEuro(result.totale)],
              ["Spese gen. (15%)", formatEuro(result.totale*0.15)],
              ["Utile (10%)", formatEuro(result.totale*0.10)],
              ["IVA 10%", formatEuro(result.totale*1.25*0.10)],
              ["Imponibile", formatEuro(result.totale*1.25)],
              ["TOTALE CON IVA", formatEuro(result.totale*1.25*1.10)],
            ].map(([l,v],i) => (
              <div key={i} style={{ background:"rgba(15,23,42,0.6)", border:`1px solid ${i===5?"rgba(245,158,11,0.3)":"rgba(51,65,85,0.4)"}`, borderRadius:10, padding:"14px", textAlign:"center" }}>
                <div style={{ fontSize:11, color:"#64748b", textTransform:"uppercase", letterSpacing:1, marginBottom:4 }}>{l}</div>
                <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:i===5?20:16, color:i===5?"#f59e0b":i===0?"#10b981":"#e2e8f0" }}>{v}</div>
              </div>
            ))}
          </div>

          {/* Save & Export */}
          <div style={{ marginTop:24, padding:20, background:"rgba(15,23,42,0.5)", border:"1px solid rgba(51,65,85,0.4)", borderRadius:12 }}>
            <div style={{ fontSize:13, color:"#94a3b8", marginBottom:10 }}>Salva il computo nello storico</div>
            <div style={{ display:"flex", gap:12 }}>
              <input value={titolo} onChange={e=>setTitolo(e.target.value)} placeholder="Titolo del computo (obbligatorio per salvare)"
                style={{ flex:1, padding:"10px 14px", background:"#1e293b", border:"1px solid #334155", borderRadius:8, color:"#e2e8f0", fontSize:14 }} />
              <button onClick={saveComputo} disabled={!titolo||saving||saved} style={{
                padding:"10px 20px", background: saved?"#10b981":!titolo||saving?"#1e293b":"rgba(16,185,129,0.15)",
                border:`1px solid ${saved?"#10b981":!titolo||saving?"#334155":"rgba(16,185,129,0.4)"}`,
                borderRadius:8, cursor:!titolo||saving||saved?"not-allowed":"pointer",
                color: saved?"#0f172a":!titolo||saving?"#475569":"#10b981", fontWeight:600, fontSize:14, whiteSpace:"nowrap",
              }}>
                {saved ? "✓ Salvato!" : saving ? "Salvo..." : "💾 Salva nello storico"}
              </button>
            </div>
          </div>

          <div style={{ display:"flex", gap:12, marginTop:16, flexWrap:"wrap" }}>
            <button onClick={() => exportPDF(result, titolo||"CME", region, year)} style={{ padding:"12px 20px", background:"transparent", border:"1px solid #f59e0b", borderRadius:8, cursor:"pointer", color:"#f59e0b", fontWeight:600, fontSize:14 }}>
              📄 Esporta PDF professionale
            </button>
            <button onClick={() => exportCSV(result, titolo||"CME", region)} style={{ padding:"12px 20px", background:"transparent", border:"1px solid #6366f1", borderRadius:8, cursor:"pointer", color:"#6366f1", fontWeight:600, fontSize:14 }}>
              📊 Esporta CSV
            </button>
            <button onClick={() => { setStep(0); setResult(null); setCapitolato(null); setPlanimetria(null); setPrezziario(null); setSaved(false); setMisureRevisione(null); }} style={{ padding:"12px 20px", background:"transparent", border:"1px solid #475569", borderRadius:8, cursor:"pointer", color:"#64748b", fontSize:14 }}>
              🔄 Nuovo computo
            </button>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {loading && (
        <div style={{ position:"fixed", inset:0, background:"rgba(10,15,30,0.94)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", zIndex:999 }}>
          <div style={{ position:"relative", width:70, height:70, marginBottom:28 }}>
            {[0,1,2].map(i=>(
              <div key={i} style={{ position:"absolute", inset:i*10, border:`2px solid rgba(245,158,11,${0.6-i*0.15})`, borderRadius:"50%", animation:`spin${i} ${1+i*0.3}s linear infinite` }} />
            ))}
          </div>
          <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:22, letterSpacing:3, color:"#f59e0b", marginBottom:10 }}>Analisi in corso</div>
          <div style={{ color:"#64748b", fontSize:14, textAlign:"center", maxWidth:360 }}>{progress}</div>
          <style>{`@keyframes spin0{to{transform:rotate(360deg)}}@keyframes spin1{to{transform:rotate(-360deg)}}@keyframes spin2{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {error && (
        <div style={{ marginTop:20, padding:"14px 16px", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:10, color:"#f87171", fontSize:13, display:"flex", justifyContent:"space-between" }}>
          <span>❌ {error}</span>
          <button onClick={()=>setError(null)} style={{ background:"none", border:"none", color:"#f87171", cursor:"pointer" }}>✕</button>
        </div>
      )}
    </div>
  );
}
