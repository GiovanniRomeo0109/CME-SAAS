const jwt = require("jsonwebtoken");
const { db } = require("../db");

module.exports = function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer "))
    return res.status(401).json({ error: "Token mancante" });

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(payload.userId);
    if (!user) return res.status(401).json({ error: "Utente non trovato" });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Token non valido" });
  }
};
