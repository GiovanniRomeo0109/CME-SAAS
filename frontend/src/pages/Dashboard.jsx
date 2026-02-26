import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth.jsx";
import { api } from "../lib/api.js";

const PLAN_LIMITS = { free: 3, base: 30, pro: 9999, studio: 9999 };
const PLAN_COLOR  = { free: "#64748b", base: "#3b82f6", pro: "#10b981", studio: "#f59e0b" };

function StatCard({ icon, label, value, sub, accent }) {
  return (
    <div style={{ background: "rgba(15,23,42,0.7)", border: `1px solid ${accent ? "rgba(245,158,11,0.25)" : "rgba(51,65,85,0.5)"}`, borderRadius: 14, padding: "24px", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 24 }}>{icon}</div>
      <div style={{ fontSize: 13, color: "#64748b", textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: 32, fontFamily: "'Bebas Neue',cursive", letterSpacing: 2, color: accent ? "#f59e0b" : "#e2e8f0" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#475569" }}>{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [computi, setComputi] = useState([]);
  const limit = PLAN_LIMITS[user?.plan] || 3;
  const used  = user?.computi_used || 0;
  const pct   = Math.min((used / limit) * 100, 100);

  useEffect(() => {
    api.computi.list().then(setComputi).catch(() => {});
  }, []);

  const recent = computi.slice(0, 5);

  return (
    <div style={{ padding: "36px 40px", minHeight: "100vh", background: "linear-gradient(180deg,rgba(245,158,11,0.04) 0%,transparent 300px)" }}>
      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <h1 style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 36, letterSpacing: 3, color: "#f1f5f9" }}>
          Ciao, {user?.name?.split(" ")[0]} 👋
        </h1>
        <p style={{ color: "#64748b", marginTop: 4 }}>Benvenuto nel tuo pannello CME Agent</p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16, marginBottom: 36 }}>
        <StatCard icon="📊" label="Computi totali" value={computi.length} sub="nella tua libreria" />
        <StatCard icon="⚡" label="Computi usati" value={`${used}/${limit === 9999 ? "∞" : limit}`} sub={`Piano ${user?.plan?.toUpperCase()}`} accent />
        <StatCard icon="💶" label="Ultimo totale" value={computi[0] ? `€${computi[0].totale?.toLocaleString("it-IT")}` : "—"} sub={computi[0]?.titolo || "nessun computo"} />
        <StatCard icon="🗺️" label="Regioni" value={new Set(computi.map(c => c.regione)).size || 0} sub="presidi di lavoro" />
      </div>

      {/* Utilizzo */}
      {limit < 9999 && (
        <div style={{ background: "rgba(15,23,42,0.7)", border: "1px solid rgba(51,65,85,0.4)", borderRadius: 14, padding: "24px", marginBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ color: "#94a3b8", fontSize: 14 }}>Utilizzo piano {user?.plan?.toUpperCase()}</span>
            <span style={{ color: "#f59e0b", fontWeight: 600, fontFamily: "'Bebas Neue',cursive", letterSpacing: 1, fontSize: 16 }}>{used} / {limit} computi</span>
          </div>
          <div style={{ height: 8, background: "#1e293b", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: pct > 80 ? "#ef4444" : "#f59e0b", borderRadius: 4, transition: "width 0.5s" }} />
          </div>
          {pct > 80 && (
            <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#f87171", fontSize: 13 }}>Stai esaurendo i computi del mese</span>
              <Link to="/pricing" style={{ color: "#f59e0b", fontWeight: 600, textDecoration: "none", fontSize: 13 }}>Aggiorna piano →</Link>
            </div>
          )}
        </div>
      )}

      {/* Quick actions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 36 }}>
        <Link to="/nuovo" style={{ textDecoration: "none" }}>
          <div style={{
            background: "linear-gradient(135deg,rgba(245,158,11,0.12),rgba(245,158,11,0.06))",
            border: "1px solid rgba(245,158,11,0.25)", borderRadius: 14, padding: "28px",
            display: "flex", alignItems: "center", gap: 16, cursor: "pointer", transition: "all 0.2s",
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(245,158,11,0.5)"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(245,158,11,0.25)"}
          >
            <div style={{ fontSize: 36 }}>🏗️</div>
            <div>
              <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 20, letterSpacing: 2, color: "#f59e0b" }}>Nuovo Computo</div>
              <div style={{ color: "#64748b", fontSize: 13, marginTop: 2 }}>Analisi AI di capitolati e planimetrie</div>
            </div>
          </div>
        </Link>
        <Link to="/storico" style={{ textDecoration: "none" }}>
          <div style={{
            background: "rgba(15,23,42,0.7)", border: "1px solid rgba(51,65,85,0.4)",
            borderRadius: 14, padding: "28px", display: "flex", alignItems: "center", gap: 16,
            cursor: "pointer", transition: "all 0.2s",
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "#475569"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(51,65,85,0.4)"}
          >
            <div style={{ fontSize: 36 }}>📂</div>
            <div>
              <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 20, letterSpacing: 2, color: "#f1f5f9" }}>Storico Computi</div>
              <div style={{ color: "#64748b", fontSize: 13, marginTop: 2 }}>{computi.length} computi salvati</div>
            </div>
          </div>
        </Link>
      </div>

      {/* Recent */}
      {recent.length > 0 && (
        <div>
          <h2 style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 22, letterSpacing: 2, color: "#94a3b8", marginBottom: 16 }}>Ultimi computi</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recent.map(c => (
              <Link key={c.id} to={`/storico/${c.id}`} style={{ textDecoration: "none" }}>
                <div style={{
                  background: "rgba(15,23,42,0.6)", border: "1px solid rgba(51,65,85,0.4)",
                  borderRadius: 10, padding: "14px 18px", display: "flex", justifyContent: "space-between",
                  alignItems: "center", transition: "all 0.15s",
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "#475569"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(51,65,85,0.4)"}
                >
                  <div>
                    <div style={{ color: "#e2e8f0", fontWeight: 500, fontSize: 14 }}>{c.titolo}</div>
                    <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>{c.regione} · {c.anno} · {new Date(c.created_at).toLocaleDateString("it-IT")}</div>
                  </div>
                  <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 18, color: "#10b981", letterSpacing: 1 }}>
                    €{Number(c.totale).toLocaleString("it-IT")}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
