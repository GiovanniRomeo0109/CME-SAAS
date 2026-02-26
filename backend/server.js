require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
}));

// Stripe webhook: raw body prima del JSON parser
app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));
app.use(express.json({ limit: "1mb" }));

// Rate limiting
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: { error: "Troppe richieste, riprova tra 15 minuti" } });
const aiLimiter  = rateLimit({ windowMs: 60 * 60 * 1000, max: 20, message: { error: "Limite analisi AI raggiunto, riprova tra un'ora" } });

app.use("/api/", apiLimiter);
app.use("/api/ai/", aiLimiter);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth",    require("./routes/auth"));
app.use("/api/ai",      require("./routes/ai"));
app.use("/api/computi", require("./routes/computi"));
app.use("/api/stripe",  require("./routes/stripe"));

// Health check
app.get("/health", (req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

// ── 404 & Error handlers ──────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: "Endpoint non trovato" }));
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Errore interno del server" });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🏗️  CME Agent Backend avviato su porta ${PORT}`);
  console.log(`   ENV: ${process.env.NODE_ENV || "development"}`);
  console.log(`   DB:  ${process.env.DB_PATH || "data.db"}\n`);
});
const path = require("path");
app.use(express.static(path.join(__dirname, "../frontend/dist")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/dist/index.html"));
});