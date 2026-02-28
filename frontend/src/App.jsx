import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import CMEAgent from "./pages/CMEAgent.jsx";
import History from "./pages/History.jsx";
import ComputeDetail from "./pages/ComputeDetail.jsx";
import Pricing from "./pages/Pricing.jsx";
import Confronto from "./pages/Confronto.jsx";
import Layout from "./components/Layout.jsx";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function LoadingScreen() {
  return (
    <div style={{
      minHeight: "100vh", background: "#0a0f1e",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column", gap: 20,
    }}>
      <div style={{ fontFamily: "'Bebas Neue', cursive", fontSize: 48, letterSpacing: 6, color: "#f59e0b" }}>
        CME Agent
      </div>
      <div style={{ color: "#475569", fontSize: 14, letterSpacing: 2 }}>CARICAMENTO...</div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index            element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="nuovo"     element={<CMEAgent />} />
            <Route path="storico"   element={<History />} />
            <Route path="storico/:id" element={<ComputeDetail />} />
            <Route path="pricing"   element={<Pricing />} />
            <Route path="confronto" element={<Confronto />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
