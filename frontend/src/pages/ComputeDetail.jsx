import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api.js";

function formatEuro(n) { return new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR"}).format(n||0); }

async function exportPDF(computo) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ orientation:"landscape", unit:"mm", format:"a4" });
  doc.setFillColor(15,23,42); doc.rect(0,0,297,40,"F");
  doc.setTextColor(245,158,11); doc.setFontSize(26); doc.setFont("helvetica","bold");
  doc.text("COMPUTO METRICO ESTIMATIVO", 14, 20);
  doc.setFontSize(10); doc.setTextColor(150,150,170);
  doc.text(`${computo.titolo} · ${computo.regione} · ${computo.anno}`, 14, 30);
  autoTable(doc, {
    startY:46,
    head:[["#","Codice","Descrizione","U.M.","Quantità","Prezzo €","Importo €"]],
    body: computo.rows_json.map((r,i)=>[i+1,r.codice||"",r.descrizione,r.um, Number(r.quantita).toLocaleString("it-IT",{maximumFractionDigits:2}), Number(r.prezzoUnitario).toLocaleString("it-IT",{minimumFractionDigits:2}), Number(r.importo).toLocaleString("it-IT",{minimumFractionDigits:2})]),
    foot:[["","","","","","TOTALE NETTO", Number(computo.totale).toLocaleString("it-IT",{minimumFractionDigits:2})]],
    headStyles:{fillColor:[30,41,59],textColor:[245,158,11],fontStyle:"bold"},
    footStyles:{fillColor:[30,41,59],textColor:[245,158,11],fontStyle:"bold",fontSize:11},
    bodyStyles:{fontSize:9,textColor:[200,210,220]}, styles:{fillColor:[15,23,42]},
    alternateRowStyles:{fillColor:[20,30,50]},
  });
  doc.save(`CME_${computo.titolo.replace(/\s+/g,"_")}.pdf`);
}

export default function ComputeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    api.computi.get(id).then(setData).catch(()=>navigate("/storico")).finally(()=>setLoading(false));
  },[id]);

  if (loading) return <div style={{padding:40,color:"#64748b"}}>Caricamento...</div>;
  if (!data) return null;

  const rows = data.rows_json;

  return (
    <div style={{ padding:"36px 40px", minHeight:"100vh" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:32 }}>
        <div>
          <Link to="/storico" style={{ color:"#64748b", textDecoration:"none", fontSize:13, display:"block", marginBottom:8 }}>← Storico</Link>
          <h1 style={{ fontFamily:"'Bebas Neue',cursive", fontSize:32, letterSpacing:2, color:"#f1f5f9" }}>{data.titolo}</h1>
          <p style={{ color:"#64748b", fontSize:13, marginTop:4 }}>{data.regione} · {data.anno} · {rows.length} voci · {new Date(data.created_at).toLocaleDateString("it-IT")}</p>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:36, color:"#10b981", letterSpacing:1 }}>{formatEuro(data.totale)}</div>
          <div style={{ color:"#64748b", fontSize:12 }}>Totale netto lavori</div>
        </div>
      </div>

      <div style={{ background:"rgba(15,23,42,0.7)", border:"1px solid rgba(51,65,85,0.4)", borderRadius:16, overflow:"hidden", marginBottom:24 }}>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead>
              <tr style={{ background:"#1e293b" }}>
                {["#","Codice","Descrizione","U.M.","Quantità","Prezzo unit.","Importo"].map(c=>(
                  <th key={c} style={{ padding:"12px 14px", textAlign:"left", fontFamily:"'Bebas Neue',cursive", letterSpacing:1.5, fontSize:12, color:"#f59e0b", borderBottom:"1px solid #334155" }}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r,i)=>(
                <tr key={i} style={{ background: i%2===0?"rgba(15,23,42,0.4)":"rgba(30,41,59,0.3)" }}>
                  <td style={{ padding:"10px 14px", color:"#64748b" }}>{i+1}</td>
                  <td style={{ padding:"10px 14px", color:"#f59e0b", fontFamily:"monospace", fontSize:11 }}>{r.codice||"—"}</td>
                  <td style={{ padding:"10px 14px", color:"#e2e8f0", maxWidth:300 }}>{r.descrizione}</td>
                  <td style={{ padding:"10px 14px", color:"#94a3b8", textAlign:"center" }}>{r.um}</td>
                  <td style={{ padding:"10px 14px", color:"#e2e8f0", textAlign:"right" }}>{Number(r.quantita).toLocaleString("it-IT",{maximumFractionDigits:2})}</td>
                  <td style={{ padding:"10px 14px", color:"#e2e8f0", textAlign:"right" }}>{formatEuro(r.prezzoUnitario)}</td>
                  <td style={{ padding:"10px 14px", color:"#10b981", textAlign:"right", fontWeight:700 }}>{formatEuro(r.importo)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background:"#1e293b", borderTop:"2px solid #f59e0b" }}>
                <td colSpan={6} style={{ padding:"14px", fontFamily:"'Bebas Neue',cursive", fontSize:16, letterSpacing:2, color:"#f59e0b" }}>TOTALE NETTO LAVORI</td>
                <td style={{ padding:"14px", textAlign:"right", fontFamily:"'Bebas Neue',cursive", fontSize:22, color:"#10b981" }}>{formatEuro(data.totale)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:24 }}>
        {[["Importo netto",data.totale,false],["Spese gen. (15%)",data.totale*0.15,false],["Utile (10%)",data.totale*0.10,false],["IVA 10%",data.totale*1.25*0.10,false],["Imponibile",data.totale*1.25,false],["TOTALE CON IVA",data.totale*1.25*1.10,true]].map(([l,v,g])=>(
          <div key={l} style={{ background:"rgba(15,23,42,0.6)", border:`1px solid ${g?"rgba(245,158,11,0.3)":"rgba(51,65,85,0.4)"}`, borderRadius:10, padding:"14px", textAlign:"center" }}>
            <div style={{ fontSize:11, color:"#64748b", textTransform:"uppercase", letterSpacing:1, marginBottom:4 }}>{l}</div>
            <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:g?20:16, color:g?"#f59e0b":"#e2e8f0" }}>{formatEuro(v)}</div>
          </div>
        ))}
      </div>

      {data.note && <div style={{ padding:"12px 16px", background:"rgba(139,92,246,0.07)", border:"1px solid rgba(139,92,246,0.2)", borderRadius:8, fontSize:13, color:"#94a3b8", marginBottom:20 }}>📝 {data.note}</div>}

      <div style={{ display:"flex", gap:12 }}>
        <button onClick={()=>exportPDF(data)} style={{ padding:"12px 20px", background:"transparent", border:"1px solid #f59e0b", borderRadius:8, cursor:"pointer", color:"#f59e0b", fontWeight:600, fontSize:14 }}>📄 Esporta PDF</button>
      </div>
    </div>
  );
}
