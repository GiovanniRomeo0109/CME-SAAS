import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth.jsx";

const NAV = [
  { to: "/dashboard", icon: "⚡", label: "Dashboard" },
  { to: "/nuovo",     icon: "🏗️", label: "Nuovo Computo" },
  { to: "/storico",   icon: "📂", label: "Storico" },
  { to: "/pricing",   icon: "💎", label: "Piani" },
];

const PLAN_COLOR = { free: "#64748b", base: "#3b82f6", pro: "#10b981", studio: "#f59e0b" };
const PLAN_LABEL = { free: "FREE", base: "BASE", pro: "PRO", studio: "STUDIO" };

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0a0f1e", fontFamily: "'DM Sans', sans-serif" }}>
      {/* ── Sidebar ── */}
      <aside style={{
        width: 240, background: "rgba(15,23,42,0.9)", borderRight: "1px solid rgba(51,65,85,0.5)",
        display: "flex", flexDirection: "column", padding: "0 0 24px", position: "sticky", top: 0, height: "100vh",
        backdropFilter: "blur(12px)",
      }}>
        {/* Logo */}
        <div style={{
          padding: "28px 24px 24px", borderBottom: "1px solid rgba(51,65,85,0.4)",
        }}>
          <div style={{
            fontFamily: "'Bebas Neue', cursive", fontSize: 28, letterSpacing: 4,
            background: "linear-gradient(90deg,#f59e0b,#fbbf24)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>CME Agent</div>
          <div style={{ fontSize: 10, color: "#475569", letterSpacing: 2, marginTop: 2 }}>COMPUTO METRICO AI</div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
          {NAV.map(({ to, icon, label }) => (
            <NavLink key={to} to={to} style={({ isActive }) => ({
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 12px", borderRadius: 8, textDecoration: "none",
              fontSize: 14, fontWeight: 500,
              background: isActive ? "rgba(245,158,11,0.1)" : "transparent",
              color: isActive ? "#f59e0b" : "#94a3b8",
              borderLeft: isActive ? "2px solid #f59e0b" : "2px solid transparent",
              transition: "all 0.15s",
            })}>
              <span style={{ fontSize: 16 }}>{icon}</span> {label}
            </NavLink>
          ))}
        </nav>

        {/* User info */}
        <div style={{
          margin: "0 12px", padding: "14px", background: "rgba(15,23,42,0.6)",
          border: "1px solid rgba(51,65,85,0.4)", borderRadius: 10,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user?.name}
            </div>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: 1,
              color: PLAN_COLOR[user?.plan] || "#64748b",
              background: `rgba(${planRgb(user?.plan)},0.15)`,
              padding: "2px 8px", borderRadius: 10,
            }}>
              {PLAN_LABEL[user?.plan] || "FREE"}
            </div>
          </div>
          <div style={{ fontSize: 11, color: "#475569", marginBottom: 12, overflow: "hidden", textOverflow: "ellipsis" }}>
            {user?.email}
          </div>
          <button onClick={handleLogout} style={{
            width: "100%", padding: "8px", background: "transparent",
            border: "1px solid #334155", borderRadius: 6, cursor: "pointer",
            color: "#64748b", fontSize: 12, transition: "all 0.15s",
          }}
            onMouseEnter={e => { e.target.style.borderColor = "#ef4444"; e.target.style.color = "#ef4444"; }}
            onMouseLeave={e => { e.target.style.borderColor = "#334155"; e.target.style.color = "#64748b"; }}
          >
            Esci
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main style={{ flex: 1, overflow: "auto", color: "#e2e8f0" }}>
        <Outlet />
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; background: #1e293b; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
      `}</style>
    </div>
  );
}

function planRgb(plan) {
  return { free: "100,116,139", base: "59,130,246", pro: "16,185,129", studio: "245,158,11" }[plan] || "100,116,139";
}
