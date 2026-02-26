import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth.jsx";

function Field({ label, type, value, onChange, placeholder }) {
  return (
    <div>
      <label style={{ fontSize: 12, color: "#94a3b8", letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 6 }}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", padding: "12px 14px", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 14, outline: "none" }} />
    </div>
  );
}

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await register(form.email, form.password, form.name);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const f = (k) => (v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0a0f1e,#0f172a)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');*{box-sizing:border-box;margin:0;padding:0;}`}</style>
      <div style={{ width: "100%", maxWidth: 420, padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 52, letterSpacing: 6, background: "linear-gradient(90deg,#f59e0b,#fbbf24)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>CME Agent</div>
          <div style={{ color: "#475569", fontSize: 13, letterSpacing: 2, marginTop: 4 }}>3 COMPUTI GRATUITI PER INIZIARE</div>
        </div>

        <div style={{ background: "rgba(15,23,42,0.8)", border: "1px solid rgba(51,65,85,0.6)", borderRadius: 16, padding: "36px 32px", backdropFilter: "blur(12px)" }}>
          <h2 style={{ fontFamily: "'Bebas Neue',cursive", fontSize: 24, letterSpacing: 2, color: "#f1f5f9", marginBottom: 28 }}>Crea il tuo account</h2>

          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Field label="Nome e Cognome" type="text" value={form.name} onChange={f("name")} placeholder="Mario Rossi" />
            <Field label="Email professionale" type="email" value={form.email} onChange={f("email")} placeholder="mario@studio.it" />
            <Field label="Password" type="password" value={form.password} onChange={f("password")} placeholder="Min. 8 caratteri" />

            {error && (
              <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 14px", color: "#f87171", fontSize: 13 }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              padding: "14px", background: loading ? "#1e293b" : "linear-gradient(135deg,#f59e0b,#d97706)",
              border: "none", borderRadius: 10, cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "'Bebas Neue',cursive", fontSize: 18, letterSpacing: 2, color: loading ? "#475569" : "#0f172a",
              marginTop: 8, boxShadow: loading ? "none" : "0 8px 24px rgba(245,158,11,0.25)",
            }}>
              {loading ? "Registrazione..." : "Inizia Gratis"}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: 24, color: "#64748b", fontSize: 13 }}>
            Hai già un account? <Link to="/login" style={{ color: "#f59e0b", textDecoration: "none", fontWeight: 600 }}>Accedi</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
