const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { db } = require("../db");
const auth = require("../middleware/auth");

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "30d" });
}

// POST /api/auth/register
router.post("/register", (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name)
    return res.status(400).json({ error: "Campi obbligatori mancanti" });
  if (password.length < 8)
    return res.status(400).json({ error: "Password minimo 8 caratteri" });

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) return res.status(409).json({ error: "Email già registrata" });

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    "INSERT INTO users (email, password, name) VALUES (?, ?, ?)"
  ).run(email, hash, name);

  const token = signToken(result.lastInsertRowid);
  const user = db.prepare("SELECT id, email, name, plan, computi_used, created_at FROM users WHERE id = ?")
    .get(result.lastInsertRowid);

  res.status(201).json({ token, user });
});

// POST /api/auth/login
router.post("/login", (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: "Credenziali non valide" });

  const token = signToken(user.id);
  const { password: _, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

// GET /api/auth/me
router.get("/me", auth, (req, res) => {
  const { password: _, ...safeUser } = req.user;
  res.json(safeUser);
});

// PUT /api/auth/me
router.put("/me", auth, (req, res) => {
  const { name, password } = req.body;
  if (name) db.prepare("UPDATE users SET name = ? WHERE id = ?").run(name, req.user.id);
  if (password) {
    if (password.length < 8)
      return res.status(400).json({ error: "Password minimo 8 caratteri" });
    const hash = bcrypt.hashSync(password, 10);
    db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hash, req.user.id);
  }
  const updated = db.prepare("SELECT id, email, name, plan, computi_used, created_at FROM users WHERE id = ?")
    .get(req.user.id);
  res.json(updated);
});

module.exports = router;
