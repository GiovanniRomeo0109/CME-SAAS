import { useState } from "react";
import { useAuth } from "../lib/auth.jsx";
import { api } from "../lib/api.js";

const PLANS = [
  {
    id: "free", name: "Free", price: 0, color: "#64748b",
    features: ["3 computi al mese", "Tutte le regioni", "Export CSV", "Supporto community"],
    cta: "Piano attuale", disabled: true,
  },
  {
    id: "base", name: "Base", price: 29, color: "#3b82f6",
    features: ["30 computi al mese", "Tutte le regioni", "Export PDF professionale", "Salvataggio storico illimitato", "Email support"],
    cta: "Attiva Base",
  },
  {
    id: "pro", name: "Pro", price: 79, color: "#10b981", popular: true,
    features: ["Computi illimitati", "Tutte le regioni", "Export PDF + CSV", "Storico illimitato", "Prezziario personalizzato", "Priorità support"],
    cta: "Attiva Pro",
  },
  {
    id: "studio", name: "Studio", price: 199, color: "#f59e0b",
    features: ["Tutto di Pro", "Multi-utente (5 seat)", "White label", "API access", "Account manager dedicato"],
    cta: "Attiva Studio",
  },
];

export default function Pricing() {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState("");

  const checkout = async (plan) => {
    if (plan === "free" || plan === user?.plan) return;
    setLoading(plan); setError("");
    try {
      const { url } = await api.stripe.checkout(plan);
      window.location.href = url;
    } catch (err) {
      setError(err.message);
      setLoading(null);
    }
  };

  const portal = async () => {
    setLoading("portal");
    try {
      const { url } = await api.stripe.portal();
      window.location.href = url;
    } catch (err) {
      setError(err.message);
      setLoading(null);
    }
  };

  return (
    <div style={{ padding:"36px 40px", minHeight:"100vh", background:"linear-gradient(180deg,rgba(245,158,11,0.04) 0%,transparent 300px)" }}>
      <div style={{ textAlign:"center", marginBottom:48 }}>
        <h1 style={{ fontFamily:"'Bebas Neue',cursive", fontSize:48, letterSpacing:4, color:"#f1f5f9" }}>Piani e Prezzi</h1>
        <p style={{ color:"#64748b", marginTop:8, fontSize:15 }}>Scegli il piano adatto al tuo studio professionale</p>
        <div style={{ display:"inline-flex", alignItems:"center", gap:8, marginTop:12, padding:"8px 16px", background:"rgba(16,185,129,0.08)", border:"1px solid rgba(16,185,129,0.2)", borderRadius:20 }}>
          <span style={{ fontSize:12, color:"#10b981" }}>Piano attuale:</span>
          <span style={{ fontFamily:"'Bebas Neue',cursive", fontSize:16, color:"#10b981", letterSpacing:1 }}>{user?.plan?.toUpperCase()}</span>
        </div>
      </div>

      {error && (
        <div style={{ maxWidth:480, margin:"0 auto 24px", padding:"12px 16px", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:8, color:"#f87171", fontSize:13, textAlign:"center" }}>
          {error}
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))", gap:20, maxWidth:1080, margin:"0 auto" }}>
        {PLANS.map(plan => {
          const isCurrentPlan = user?.plan === plan.id;
          return (
            <div key={plan.id} style={{
              background: plan.popular ? `linear-gradient(180deg,rgba(16,185,129,0.08),rgba(15,23,42,0.9))` : "rgba(15,23,42,0.7)",
              border: `2px solid ${plan.popular ? "rgba(16,185,129,0.4)" : isCurrentPlan ? `rgba(${plan.color.slice(1).match(/../g)?.map(h=>parseInt(h,16)).join(",")},0.4)` : "rgba(51,65,85,0.4)"}`,
              borderRadius:16, padding:"28px", position:"relative", display:"flex", flexDirection:"column", gap:0,
            }}>
              {plan.popular && (
                <div style={{ position:"absolute", top:-12, left:"50%", transform:"translateX(-50%)", background:"#10b981", color:"#0f172a", fontSize:11, fontWeight:700, padding:"4px 16px", borderRadius:20, letterSpacing:1.5 }}>
                  PIÙ SCELTO
                </div>
              )}
              {isCurrentPlan && (
                <div style={{ position:"absolute", top:-12, right:16, background:"#334155", color:"#94a3b8", fontSize:11, fontWeight:600, padding:"4px 12px", borderRadius:20 }}>
                  PIANO ATTUALE
                </div>
              )}

              <div style={{ marginBottom:20 }}>
                <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:24, letterSpacing:3, color: plan.color }}>{plan.name}</div>
                <div style={{ display:"flex", alignItems:"baseline", gap:4, marginTop:8 }}>
                  <span style={{ fontFamily:"'Bebas Neue',cursive", fontSize:48, color:"#f1f5f9", letterSpacing:1 }}>€{plan.price}</span>
                  {plan.price > 0 && <span style={{ color:"#64748b", fontSize:14 }}>/mese</span>}
                  {plan.price === 0 && <span style={{ color:"#64748b", fontSize:14 }}>gratis</span>}
                </div>
              </div>

              <div style={{ flex:1, marginBottom:24 }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                    <span style={{ color: plan.color, fontSize:14, flexShrink:0 }}>✓</span>
                    <span style={{ color:"#94a3b8", fontSize:13 }}>{f}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => checkout(plan.id)}
                disabled={isCurrentPlan || loading === plan.id || plan.id === "free"}
                style={{
                  width:"100%", padding:"13px",
                  background: isCurrentPlan ? "rgba(51,65,85,0.4)" : `rgba(${plan.color.match(/\d+/g)?.join(",") || "100,116,139"},0.15)`,
                  border: `1px solid ${isCurrentPlan ? "#334155" : plan.color + "60"}`,
                  borderRadius:10, cursor: isCurrentPlan || plan.id==="free" ? "default" : "pointer",
                  fontFamily:"'Bebas Neue',cursive", fontSize:16, letterSpacing:2,
                  color: isCurrentPlan ? "#64748b" : plan.color,
                  transition:"all 0.2s",
                }}
                onMouseEnter={e => { if(!isCurrentPlan && plan.id!=="free") e.target.style.background = `${plan.color}25`; }}
                onMouseLeave={e => e.target.style.background = isCurrentPlan ? "rgba(51,65,85,0.4)" : `rgba(${plan.color.match(/\d+/g)?.join(",") || "100,116,139"},0.15)`}
              >
                {loading === plan.id ? "Caricamento..." : isCurrentPlan ? "Piano attuale" : plan.cta}
              </button>
            </div>
          );
        })}
      </div>

      {user?.plan !== "free" && (
        <div style={{ textAlign:"center", marginTop:36 }}>
          <button onClick={portal} disabled={loading === "portal"} style={{ padding:"12px 24px", background:"transparent", border:"1px solid #334155", borderRadius:10, cursor:"pointer", color:"#94a3b8", fontSize:14 }}>
            {loading === "portal" ? "..." : "⚙️ Gestisci abbonamento / Fatture"}
          </button>
        </div>
      )}

      <div style={{ maxWidth:560, margin:"48px auto 0", padding:"24px", background:"rgba(15,23,42,0.5)", border:"1px solid rgba(51,65,85,0.3)", borderRadius:14, textAlign:"center" }}>
        <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:20, color:"#94a3b8", letterSpacing:2, marginBottom:12 }}>Domande frequenti</div>
        <div style={{ fontSize:13, color:"#64748b", lineHeight:1.8 }}>
          <strong style={{ color:"#94a3b8" }}>Posso cancellare in qualsiasi momento?</strong> Sì, nessun vincolo.<br/>
          <strong style={{ color:"#94a3b8" }}>I dati dei miei computi sono al sicuro?</strong> I tuoi computi sono privati e cifrati.<br/>
          <strong style={{ color:"#94a3b8" }}>Fattura elettronica disponibile?</strong> Sì, tramite il portale Stripe.
        </div>
      </div>
    </div>
  );
}
