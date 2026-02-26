const router = require("express").Router();
const { db } = require("../db");
const auth = require("../middleware/auth");

// GET /api/computi - lista computi utente
router.get("/", auth, (req, res) => {
  const rows = db.prepare(
    "SELECT id, titolo, regione, anno, totale, created_at FROM computi WHERE user_id = ? ORDER BY created_at DESC"
  ).all(req.user.id);
  res.json(rows);
});

// GET /api/computi/:id - dettaglio computo
router.get("/:id", auth, (req, res) => {
  const row = db.prepare("SELECT * FROM computi WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: "Computo non trovato" });
  res.json({ ...row, rows_json: JSON.parse(row.rows_json) });
});

// POST /api/computi - salva nuovo computo
router.post("/", auth, (req, res) => {
  const { titolo, regione, anno, rows, totale, note } = req.body;
  if (!titolo || !rows || !totale)
    return res.status(400).json({ error: "Campi obbligatori mancanti" });

  const result = db.prepare(
    "INSERT INTO computi (user_id, titolo, regione, anno, rows_json, totale, note) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(req.user.id, titolo, regione, anno, JSON.stringify(rows), totale, note || "");

  res.status(201).json({ id: result.lastInsertRowid, message: "Computo salvato" });
});

// PUT /api/computi/:id - aggiorna titolo e note
router.put("/:id", auth, (req, res) => {
  const { titolo, note } = req.body;
  const existing = db.prepare("SELECT id FROM computi WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ error: "Computo non trovato" });

  db.prepare("UPDATE computi SET titolo = ?, note = ?, updated_at = datetime('now') WHERE id = ?")
    .run(titolo, note, req.params.id);
  res.json({ message: "Aggiornato" });
});

// DELETE /api/computi/:id
router.delete("/:id", auth, (req, res) => {
  const result = db.prepare("DELETE FROM computi WHERE id = ? AND user_id = ?").run(req.params.id, req.user.id);
  if (result.changes === 0) return res.status(404).json({ error: "Computo non trovato" });
  res.json({ message: "Eliminato" });
});

module.exports = router;
