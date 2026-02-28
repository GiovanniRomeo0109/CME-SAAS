const router = require("express").Router();
const multer = require("multer");
const fetch = require("node-fetch");
const { db } = require("../db");
const auth = require("../middleware/auth");

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

async function callAnthropic(messages, system) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 4096, system, messages }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.content.map(b => b.text || "").join("");
}

function parseJSON(raw) {
  try { return JSON.parse(raw.replace(/```json|```/g, "").trim()); } catch { return null; }
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const sep = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ""));
  return lines.slice(1).map(line => {
    const cols = line.split(sep);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (cols[i] || "").trim().replace(/^"|"$/g, ""); });
    return obj;
  }).filter(r => Object.values(r).some(v => v));
}

function normalizzaRigaCSV(row) {
  const get = (...keys) => { for (const k of keys) for (const rk of Object.keys(row)) if (rk.includes(k)) return row[rk]; return ""; };
  return {
    codice: get("codice", "cod", "art"),
    descrizione: get("descrizione", "desc", "lavorazione", "voce"),
    um: get("um", "unita", "unit", "misura"),
    quantita: parseFloat((get("quantita", "quant", "qty") || "0").replace(",", ".")) || 0,
    prezzoUnitario: parseFloat((get("prezzo", "price", "pu") || "0").replace(",", ".")) || 0,
    importo: parseFloat((get("importo", "totale", "tot", "amount") || "0").replace(",", ".")) || 0,
  };
}

router.post("/analizza", auth, upload.single("computoUtente"), async (req, res) => {
  try {
    const { computoRiferimentoId, computoRiferimentoJson } = req.body;
    let righeRiferimento = [];

    if (computoRiferimentoId) {
      const row = db.prepare("SELECT * FROM computi WHERE id = ? AND user_id = ?").get(computoRiferimentoId, req.user.id);
      if (!row) return res.status(404).json({ error: "Computo di riferimento non trovato" });
      righeRiferimento = JSON.parse(row.rows_json);
    } else if (computoRiferimentoJson) {
      righeRiferimento = JSON.parse(computoRiferimentoJson);
    } else {
      return res.status(400).json({ error: "Fornire un computo di riferimento" });
    }

    let righeUtente = [];
    const file = req.file;
    if (!file) return res.status(400).json({ error: "File computo utente mancante" });

    if (file.mimetype === "application/pdf") {
      const b64 = file.buffer.toString("base64");
      const raw = await callAnthropic([{ role: "user", content: [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } },
        { type: "text", text: `Estrai TUTTE le voci di computo metrico da questo documento. Per ogni voce: codice, descrizione, um, quantita (numero), prezzoUnitario (numero), importo (numero). Rispondi SOLO con JSON array: [{"codice":"","descrizione":"","um":"","quantita":0,"prezzoUnitario":0,"importo":0}]` }
      ]}], "Sei un esperto di computi metrici italiani. Rispondi SOLO con JSON puro.");
      righeUtente = parseJSON(raw) || [];
    } else {
      const text = file.buffer.toString("utf-8");
      righeUtente = parseCSV(text).map(normalizzaRigaCSV).filter(r => r.descrizione);
    }

    if (righeUtente.length === 0) return res.status(400).json({ error: "Impossibile estrarre voci dal file. Usa CSV con intestazioni o PDF con tabella." });

    const confrontoRaw = await callAnthropic([{ role: "user", content: `
Sei un esperto estimatore edile italiano. Confronta questi due computi metrici voce per voce.

COMPUTO DI RIFERIMENTO (AI):
${JSON.stringify(righeRiferimento, null, 2)}

COMPUTO UTENTE (da verificare):
${JSON.stringify(righeUtente, null, 2)}

Per ogni voce del computo UTENTE trova la corrispondente nel RIFERIMENTO (per descrizione/codice).
Stato possibili:
- "ok": quantità e prezzo corrispondono (tolleranza 5%)
- "quantita_diversa": quantità differisce oltre 5%
- "prezzo_diverso": prezzo differisce oltre 5%
- "entrambi_diversi": sia quantità che prezzo differiscono
- "mancante_in_riferimento": voce presente solo nell'utente

Elenca anche le voci del RIFERIMENTO assenti nel computo utente in vociMancanti.

Rispondi SOLO con JSON:
{
  "righeConfronto": [{"codice":"","descrizione":"","um":"","quantitaUtente":0,"quantitaRiferimento":0,"prezzoUnitarioUtente":0,"prezzoUnitarioRiferimento":0,"importoUtente":0,"importoRiferimento":0,"stato":"ok","deltaQuantita_pct":0,"deltaPrezzo_pct":0,"deltaImporto":0,"noteAI":""}],
  "vociMancanti": [{"codice":"","descrizione":"","um":"","quantita":0,"prezzoUnitario":0,"importo":0,"noteAI":""}],
  "sommario": {"totaleVociUtente":0,"totaleVociRiferimento":0,"vociOk":0,"vociConDifferenze":0,"vociMancanti":0,"importoTotaleUtente":0,"importoTotaleRiferimento":0,"deltaImportoTotale":0,"giudizioGenerale":""}
}` }],
      "Sei un esperto estimatore edile. Rispondi SOLO con JSON puro senza markdown."
    );

    const confronto = parseJSON(confrontoRaw);
    if (!confronto) return res.status(500).json({ error: "Errore nel confronto AI. Riprova." });

    if (confronto.righeConfronto) {
      confronto.righeConfronto = confronto.righeConfronto.map(r => ({
        ...r,
        deltaImporto: Math.round(((r.importoUtente || 0) - (r.importoRiferimento || 0)) * 100) / 100,
      }));
    }

    res.json({ ...confronto, metadati: { vociRiferimento: righeRiferimento.length, vociUtente: righeUtente.length } });
  } catch (err) {
    console.error("Confronto error:", err);
    res.status(500).json({ error: err.message || "Errore interno" });
  }
});

module.exports = router;
