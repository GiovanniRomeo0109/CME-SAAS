const router = require("express").Router();
const Stripe = require("stripe");
const { db } = require("../db");
const auth = require("../middleware/auth");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PRICE_IDS = {
  base:   process.env.STRIPE_PRICE_BASE,   // €29/mese
  pro:    process.env.STRIPE_PRICE_PRO,    // €79/mese
  studio: process.env.STRIPE_PRICE_STUDIO, // €199/mese
};

// POST /api/stripe/checkout  { plan: 'base'|'pro'|'studio' }
router.post("/checkout", auth, async (req, res) => {
  const { plan } = req.body;
  if (!PRICE_IDS[plan]) return res.status(400).json({ error: "Piano non valido" });

  try {
    let customerId = req.user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        name: req.user.name,
        metadata: { userId: req.user.id },
      });
      customerId = customer.id;
      db.prepare("UPDATE users SET stripe_customer_id = ? WHERE id = ?").run(customerId, req.user.id);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: PRICE_IDS[plan], quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL}/dashboard?payment=success`,
      cancel_url: `${process.env.FRONTEND_URL}/pricing?payment=cancelled`,
      metadata: { userId: req.user.id, plan },
      locale: "it",
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    res.status(500).json({ error: "Errore Stripe" });
  }
});

// POST /api/stripe/portal  (gestione abbonamento)
router.post("/portal", auth, async (req, res) => {
  if (!req.user.stripe_customer_id)
    return res.status(400).json({ error: "Nessun abbonamento attivo" });

  const session = await stripe.billingPortal.sessions.create({
    customer: req.user.stripe_customer_id,
    return_url: `${process.env.FRONTEND_URL}/dashboard`,
  });
  res.json({ url: session.url });
});

// POST /api/stripe/webhook
router.post("/webhook", (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Idempotency check
  const already = db.prepare("SELECT id FROM stripe_events WHERE id = ?").get(event.id);
  if (already) return res.json({ received: true });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const { userId, plan } = session.metadata;
        db.prepare("UPDATE users SET plan = ?, stripe_subscription_id = ?, computi_used = 0 WHERE id = ?")
          .run(plan, session.subscription, userId);
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object;
        // Piano aggiornato: trova priceId e mappa a piano
        const priceId = sub.items?.data?.[0]?.price?.id;
        const plan = Object.entries(PRICE_IDS).find(([, v]) => v === priceId)?.[0];
        if (plan) {
          db.prepare("UPDATE users SET plan = ? WHERE stripe_subscription_id = ?").run(plan, sub.id);
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        db.prepare("UPDATE users SET plan = 'free', stripe_subscription_id = NULL WHERE stripe_subscription_id = ?")
          .run(sub.id);
        break;
      }
      case "invoice.payment_failed": {
        // Opzionale: notifica email utente
        console.warn("Payment failed for subscription:", event.data.object.subscription);
        break;
      }
    }

    db.prepare("INSERT INTO stripe_events (id, type) VALUES (?, ?)").run(event.id, event.type);
    res.json({ received: true });
  } catch (err) {
    console.error("Webhook handler error:", err);
    res.status(500).json({ error: "Webhook processing error" });
  }
});

module.exports = router;
