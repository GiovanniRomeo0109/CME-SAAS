const router = require("express").Router();
const multer = require("multer");
const fetch = require("node-fetch");
const { db, PLAN_LIMITS } = require("../db");
const auth = require("../middleware/auth");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const allowed = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg", "image/jpg", "image/png"];
    if (allowed.includes(file.mimetype) || file.originalname.endsWith(".dwg"))
      cb(null, true);
    else
      cb(new Error("Tipo file non supportato"));
  }
});

async function callAnthropic(messages, system) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 4096, system, messages }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.content.map(b => b.text || "").join("");
}

function parseJSON(raw) {
  try {
    return JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch { return null; }
}

// POST /api/ai/analizza
// Fields: capitolato (file), planimetria (file), prezziario (file, optional)
// Body: regione, anno
router.post("/analizza",
  auth,
  upload.fields([
    { name: "capitolato", maxCount: 1 },
    { name: "planimetria", maxCount: 1 },
    { name: "prezziario", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      // Check plan limits
      const limit = PLAN_LIMITS[req.user.plan] || 3;
      if (req.user.computi_used >= limit)
        return res.status(403).json({ error: `Limite computi raggiunto per il piano ${req.user.plan}. Aggiorna il piano.` });

      const { regione, anno, misureCorrette } = req.body;
      const capFile = req.files?.capitolato?.[0];
      const planFile = req.files?.planimetria?.[0];
      const prezFile = req.files?.prezziario?.[0];

      if (!capFile || !planFile || !regione)
        return res.status(400).json({ error: "File capitolato, planimetria e regione sono obbligatori" });

      // ── Step 1: Analisi Capitolato ──────────────────────────────────────────
      const capB64 = capFile.buffer.toString("base64");
      const capMime = capFile.mimetype === "application/pdf"
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

      const capMessages = [{
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: capMime, data: capB64 } },
          { type: "text", text: `Analizza questo capitolato d'appalto. Estrai TUTTE le lavorazioni presenti con codice (se presente), descrizione completa, unità di misura e categoria. Rispondi SOLO con JSON array: [{"codice":"","descrizione":"","um":"","categoria":""}]` }
        ]
      }];

      const capRaw = await callAnthropic(capMessages, "Sei un esperto di capitolati d'appalto edili italiani. Rispondi SOLO con JSON puro senza markdown.");
      const lavorazioni = parseJSON(capRaw) || [];

      // Se il frontend passa misure già riviste, saltare la ri-analisi planimetria
      let misure = {};
      if (misureCorrette) {
        try { misure = JSON.parse(misureCorrette); } catch { misure = {}; }
      } else {
        const isImage = planFile.mimetype.startsWith("image/");

      if (isImage) {
        const planB64 = planFile.buffer.toString("base64");
        const imgSrc = { type: "image", source: { type: "base64", media_type: planFile.mimetype, data: planB64 } };

        // -- Passaggio A: rileva scala e unità di misura --
        const scalaRaw = await callAnthropic([{
          role: "user",
          content: [imgSrc, { type: "text", text: `Analizza questa planimetria architettonica. 
Cerca la legenda della scala (es: 1:50, 1:100, 1:200) o il cartiglio in basso.
Se trovi una linea di scala con misura indicata, usala come riferimento.
Rispondi SOLO con JSON: {
  "scala": "1:100",
  "unitaMisura": "cm o mm o m",
  "scalaTrovata": true,
  "note": "dove hai trovato la scala"
}` }]
        }], "Sei un geometra esperto. Rispondi solo con JSON puro senza markdown.");
        const scalaInfo = parseJSON(scalaRaw) || { scala: "1:100", scalaTrovata: false };

        // -- Passaggio B: analisi vano per vano (superfici) --
        const vaniRaw = await callAnthropic([{
          role: "user",
          content: [imgSrc, { type: "text", text: `Sei un geometra esperto. Scala planimetria: ${scalaInfo.scala}.
Identifica e misura OGNI SINGOLO VANO separatamente.
Per ogni vano calcola la superficie netta interna (escludi lo spessore dei muri).
REGOLA IMPORTANTE: somma le superfici SOLO dei vani unici, non contare corridoi come parte dei vani adiacenti.

Rispondi SOLO con JSON:
{
  "vani": [
    {"nome": "Soggiorno", "larghezza_m": 4.5, "lunghezza_m": 5.2, "superficie_mq": 23.4},
    {"nome": "Camera da letto", "larghezza_m": 3.0, "lunghezza_m": 3.8, "superficie_mq": 11.4},
    {"nome": "Bagno", "larghezza_m": 1.8, "lunghezza_m": 2.5, "superficie_mq": 4.5},
    {"nome": "Corridoio", "larghezza_m": 1.2, "lunghezza_m": 4.0, "superficie_mq": 4.8}
  ],
  "superficie_totale_mq": 44.1,
  "altezza_media_m": 2.7,
  "note_vani": "eventuali incertezze"
}
IMPORTANTE: superficie_totale_mq deve essere la SOMMA ESATTA dei singoli vani elencati.` }]
        }], "Sei un geometra esperto. Rispondi solo con JSON puro senza markdown.");
        const vaniInfo = parseJSON(vaniRaw) || { vani: [], superficie_totale_mq: 0 };

        // Ricalcola il totale lato server per evitare errori dell'AI
        if (vaniInfo.vani?.length > 0) {
          vaniInfo.superficie_totale_mq = vaniInfo.vani.reduce((s, v) => s + (Number(v.superficie_mq) || 0), 0);
          vaniInfo.superficie_totale_mq = Math.round(vaniInfo.superficie_totale_mq * 100) / 100;
        }

        // -- Passaggio C: conta aperture (senza doppi conteggi) --
        const apertureRaw = await callAnthropic([{
          role: "user",
          content: [imgSrc, { type: "text", text: `Sei un geometra esperto. Scala planimetria: ${scalaInfo.scala}.
Conta con precisione TUTTE le aperture nella planimetria.
REGOLA ANTI-DOPPIO CONTEGGIO: ogni apertura va contata UNA SOLA VOLTA anche se è tra due vani.
Le porte interne si vedono come archi o linee inclinate, le finestre come tratti doppi sul muro.

Rispondi SOLO con JSON:
{
  "porte_esterne": [
    {"posizione": "ingresso", "larghezza_m": 0.9, "altezza_m": 2.1}
  ],
  "porte_interne": [
    {"tra": "Soggiorno-Corridoio", "larghezza_m": 0.8, "altezza_m": 2.1},
    {"tra": "Camera-Corridoio", "larghezza_m": 0.8, "altezza_m": 2.1}
  ],
  "finestre": [
    {"vano": "Soggiorno", "larghezza_m": 1.2, "altezza_m": 1.4, "quantita": 2},
    {"vano": "Camera da letto", "larghezza_m": 1.0, "altezza_m": 1.4, "quantita": 1}
  ],
  "totale_porte_esterne": 1,
  "totale_porte_interne": 2,
  "totale_finestre": 3,
  "superficie_totale_infissi_mq": 6.16,
  "note_aperture": "eventuali incertezze"
}
IMPORTANTE: totale_finestre è la somma di tutti i campi quantita. Non contare la stessa finestra due volte.` }]
        }], "Sei un geometra esperto. Rispondi solo con JSON puro senza markdown.");
        const apertureInfo = parseJSON(apertureRaw) || {};

        // Ricalcola totali aperture lato server
        if (apertureInfo.finestre?.length > 0) {
          apertureInfo.totale_finestre = apertureInfo.finestre.reduce((s, f) => s + (Number(f.quantita) || 1), 0);
          apertureInfo.superficie_totale_infissi_mq = apertureInfo.finestre.reduce(
            (s, f) => s + (Number(f.larghezza_m) || 0) * (Number(f.altezza_m) || 0) * (Number(f.quantita) || 1), 0
          );
          apertureInfo.superficie_totale_infissi_mq += (apertureInfo.porte_esterne || []).reduce(
            (s, p) => s + (Number(p.larghezza_m) || 0) * (Number(p.altezza_m) || 0), 0
          );
          apertureInfo.superficie_totale_infissi_mq = Math.round(apertureInfo.superficie_totale_infissi_mq * 100) / 100;
        }

        // -- Passaggio D: misure perimetrali --
        const perimetroRaw = await callAnthropic([{
          role: "user",
          content: [imgSrc, { type: "text", text: `Sei un geometra esperto. Scala planimetria: ${scalaInfo.scala}.
Stima il perimetro esterno dell'edificio e le superfici per intonaci e murature.
Superficie pavimento già calcolata: ${vaniInfo.superficie_totale_mq} mq.
Altezza media: ${vaniInfo.altezza_media_m || 2.7} m.

Rispondi SOLO con JSON:
{
  "perimetro_esterno_m": 28.0,
  "spessore_muri_esterni_cm": 30,
  "superficie_muratura_esterna_mq": 75.6,
  "superficie_intonaco_interno_mq": 142.0,
  "superficie_solaio_mq": ${vaniInfo.superficie_totale_mq || 0},
  "note_perimetro": "eventuali incertezze"
}` }]
        }], "Sei un geometra esperto. Rispondi solo con JSON puro senza markdown.");
        const perimetroInfo = parseJSON(perimetroRaw) || {};

        // Componi misure finali
        misure = {
          scala: scalaInfo,
          vani: vaniInfo,
          aperture: apertureInfo,
          perimetro: perimetroInfo,
          // Campi flat per compatibilità col CME
          superficiePavimento: vaniInfo.superficie_totale_mq,
          altezzaMedia: vaniInfo.altezza_media_m || 2.7,
          perimetro: perimetroInfo.perimetro_esterno_m,
          superficieMuraturaEsterna: perimetroInfo.superficie_muratura_esterna_mq,
          superficieIntonaco: perimetroInfo.superficie_intonaco_interno_mq,
          totalePorteEsterne: apertureInfo.totale_porte_esterne || 0,
          totalePorteInterne: apertureInfo.totale_porte_interne || 0,
          totaleFinestre: apertureInfo.totale_finestre || 0,
          superficieTotaleInfissi: apertureInfo.superficie_totale_infissi_mq || 0,
          confidenza: scalaInfo.scalaTrovata ? "alta" : "media",
        };
      } else {
        misure = { nota: "File DWG: misure stimate dal capitolato" };
        } // chiude if (isImage)
      } // chiude else (non misureCorrette)

      // ── Step 3: Generazione CME ─────────────────────────────────────────────
      const cmeMsgContent = [];
      if (prezFile) {
        cmeMsgContent.push({
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: prezFile.buffer.toString("base64") }
        });
      }
      cmeMsgContent.push({
        type: "text",
        text: `Crea un Computo Metrico Estimativo professionale.
LAVORAZIONI: ${JSON.stringify(lavorazioni)}
MISURE: ${JSON.stringify(misure)}
REGIONE: ${regione}, ANNO: ${anno}
${prezFile ? "Usa i prezzi dal prezziario allegato come riferimento primario." : `Usa i prezzi del Prezziario LL.PP. Regione ${regione} anno ${anno}.`}
Rispondi SOLO con JSON: {"rows":[{"codice":"","descrizione":"","um":"","quantita":0,"prezzoUnitario":0,"importo":0}],"totale":0,"note":""}`
      });

      const cmeRaw = await callAnthropic(
        [{ role: "user", content: cmeMsgContent }],
        `Sei un estimatore edile italiano esperto. Crei CME secondo D.Lgs 36/2023. Rispondi SEMPRE con JSON puro.`
      );

      const cmeData = parseJSON(cmeRaw);
      if (!cmeData?.rows) return res.status(500).json({ error: "Errore generazione computo. Riprova." });

      // Incrementa contatore uso
      db.prepare("UPDATE users SET computi_used = computi_used + 1 WHERE id = ?").run(req.user.id);

      res.json({ ...cmeData, misure, lavorazioni_estratte: lavorazioni.length });

    } catch (err) {
      console.error("AI analyze error:", err);
      res.status(500).json({ error: err.message || "Errore interno" });
    }
  }
);

module.exports = router;
