import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api.js";

function formatEuro(n) { return new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR"}).format(n||0); }

export default function History() {
  const [computi, setComputi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  const load = () => api.computi.list().then(setComputi).catch(()=>{}).finally(()=>setLoading(false));
  useEffect(()=>{ load(); },[]);

  const handleDelete = async (id) => {
    if (!confirm("Eliminare questo computo?")) return;
    setDeleting(id);
    try { await api.computi.delete(id); setComputi(c => c.filter(x=>x.id!==id)); }
    catch {} finally { setDeleting(null); }
  };

  return (
    <div style={{ padding:"36px 40px", minHeight:"100vh" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:32 }}>
        <div>
          <h1 style={{ fontFamily:"'Bebas Neue',cursive", fontSize:36, letterSpacing:3, color:"#f1f5f9" }}>Storico Computi</h1>
          <p style={{ color:"#64748b", marginTop:4 }}>{computi.length} computi salvati</p>
        </div>
        <Link to="/nuovo" style={{ padding:"12px 20px", background:"linear-gradient(135deg,#f59e0b,#d97706)", border:"none", borderRadius:10, textDecoration:"none", fontFamily:"'Bebas Neue',cursive", fontSize:16, letterSpacing:2, color:"#0f172a" }}>
          + Nuovo Computo
        </Link>
      </div>

      {loading && <div style={{ color:"#64748b", textAlign:"center", marginTop:60 }}>Caricamento...</div>}

      {!loading && computi.length === 0 && (
        <div style={{ textAlign:"center", marginTop:80 }}>
          <div style={{ fontSize:64, marginBottom:16 }}>📂</div>
          <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:28, color:"#334155", letterSpacing:2 }}>Nessun computo salvato</div>
          <p style={{ color:"#475569", marginTop:8 }}>Crea il tuo primo computo metrico</p>
          <Link to="/nuovo" style={{ display:"inline-block", marginTop:20, padding:"14px 28px", background:"linear-gradient(135deg,#f59e0b,#d97706)", borderRadius:10, textDecoration:"none", fontFamily:"'Bebas Neue',cursive", fontSize:18, letterSpacing:2, color:"#0f172a" }}>
            Nuovo Computo
          </Link>
        </div>
      )}

      {computi.length > 0 && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {/* Header row */}
          <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 100px", gap:16, padding:"10px 20px", color:"#475569", fontSize:11, letterSpacing:1.5, textTransform:"uppercase" }}>
            <span>Titolo</span><span>Regione</span><span>Anno</span><span style={{textAlign:"right"}}>Totale</span><span></span>
          </div>

          {computi.map(c => (
            <div key={c.id} style={{ background:"rgba(15,23,42,0.7)", border:"1px solid rgba(51,65,85,0.4)", borderRadius:12, padding:"18px 20px", display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr 100px", gap:16, alignItems:"center", transition:"border-color 0.15s" }}
              onMouseEnter={e=>e.currentTarget.style.borderColor="#475569"}
              onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(51,65,85,0.4)"}
            >
              <div>
                <Link to={`/storico/${c.id}`} style={{ color:"#e2e8f0", textDecoration:"none", fontWeight:500, fontSize:15 }}>
                  {c.titolo}
                </Link>
                <div style={{ color:"#64748b", fontSize:12, marginTop:2 }}>{new Date(c.created_at).toLocaleDateString("it-IT", { day:"2-digit", month:"long", year:"numeric" })}</div>
              </div>
              <div style={{ color:"#94a3b8", fontSize:14 }}>{c.regione}</div>
              <div style={{ color:"#94a3b8", fontSize:14 }}>{c.anno}</div>
              <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:20, color:"#10b981", textAlign:"right", letterSpacing:1 }}>{formatEuro(c.totale)}</div>
              <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                <Link to={`/storico/${c.id}`} style={{ padding:"6px 12px", background:"rgba(245,158,11,0.1)", border:"1px solid rgba(245,158,11,0.3)", borderRadius:6, textDecoration:"none", color:"#f59e0b", fontSize:12, fontWeight:600 }}>
                  Apri
                </Link>
                <button onClick={()=>handleDelete(c.id)} disabled={deleting===c.id} style={{ padding:"6px 10px", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:6, cursor:"pointer", color:"#f87171", fontSize:13 }}>
                  {deleting===c.id ? "..." : "🗑"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
