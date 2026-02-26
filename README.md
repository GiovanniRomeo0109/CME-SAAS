# 🏗️ CME Agent — SaaS Platform

**Computo Metrico Estimativo generato da AI**  
Analisi automatica di capitolati, planimetrie e prezziari regionali italiani.

---

## Stack tecnologico

| Layer | Tecnologia |
|-------|-----------|
| Backend | Node.js + Express |
| Database | SQLite (better-sqlite3) |
| Auth | JWT (30 giorni) |
| Pagamenti | Stripe Subscriptions |
| AI | Claude API (Anthropic) |
| Frontend | React 18 + Vite |
| PDF Export | jsPDF + jsPDF-autotable |
| Deploy | Railway |

---

## Struttura del progetto

```
cme-saas/
├── backend/
│   ├── server.js          # Express server principale
│   ├── db.js              # SQLite schema e helpers
│   ├── middleware/
│   │   └── auth.js        # JWT middleware
│   ├── routes/
│   │   ├── auth.js        # Register, login, profilo
│   │   ├── ai.js          # Proxy sicuro Anthropic API
│   │   ├── computi.js     # CRUD computi
│   │   └── stripe.js      # Checkout, portal, webhook
│   ├── .env.example
│   ├── package.json
│   └── railway.toml
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── main.jsx
    │   ├── lib/
    │   │   ├── api.js     # Client API
    │   │   └── auth.jsx   # Auth context
    │   ├── components/
    │   │   └── Layout.jsx # Sidebar navigation
    │   └── pages/
    │       ├── Login.jsx
    │       ├── Register.jsx
    │       ├── Dashboard.jsx
    │       ├── CMEAgent.jsx   # Workflow principale
    │       ├── History.jsx
    │       ├── ComputeDetail.jsx
    │       └── Pricing.jsx
    ├── index.html
    ├── package.json
    └── vite.config.js
```

---

## Setup locale (sviluppo)

### 1. Backend

```bash
cd backend
cp .env.example .env
# Compila il file .env con le tue chiavi
npm install
npm run dev
# → http://localhost:3001
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

Il proxy Vite reindirizza automaticamente `/api/*` al backend su `:3001`.

---

## Variabili d'ambiente backend (.env)

```env
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://tuo-dominio.com

# Genera con: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=...64_caratteri_casuali...

# Dashboard Anthropic → https://console.anthropic.com/api-keys
ANTHROPIC_API_KEY=sk-ant-...

# Dashboard Stripe → https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Crea i prodotti su Stripe → Products → Add product
STRIPE_PRICE_BASE=price_...    # €29/mese
STRIPE_PRICE_PRO=price_...     # €79/mese
STRIPE_PRICE_STUDIO=price_...  # €199/mese
```

---

## Deploy su Railway

### Backend

1. Crea un nuovo progetto su [railway.app](https://railway.app)
2. Connetti il repo GitHub (cartella `backend`)
3. Aggiungi tutte le variabili d'ambiente dal pannello Railway
4. Railway rileva automaticamente Node.js e usa `railway.toml`
5. **Aggiungi un volume** Railway per la persistenza del DB:
   - Mount path: `/data`
   - Aggiorna `.env`: `DB_PATH=/data/cme.db`

### Frontend

1. Nuovo progetto Railway (o usa Vercel per semplicità)
2. Connetti il repo (cartella `frontend`)
3. Build command: `npm run build`
4. Output: `dist`
5. Aggiungi variabile: `VITE_API_URL=https://tuo-backend.railway.app/api`

### Stripe Webhook

Dopo il deploy del backend:
```bash
# Installa Stripe CLI
stripe listen --forward-to https://tuo-backend.railway.app/api/stripe/webhook

# Oppure configura l'endpoint sul Dashboard Stripe:
# https://dashboard.stripe.com/webhooks
# URL: https://tuo-backend.railway.app/api/stripe/webhook
# Events: checkout.session.completed, customer.subscription.updated,
#          customer.subscription.deleted, invoice.payment_failed
```

---

## API Endpoints

### Auth
| Metodo | Path | Descrizione |
|--------|------|-------------|
| POST | `/api/auth/register` | Registrazione |
| POST | `/api/auth/login` | Login |
| GET  | `/api/auth/me` | Profilo utente (🔒) |
| PUT  | `/api/auth/me` | Aggiorna profilo (🔒) |

### AI
| Metodo | Path | Descrizione |
|--------|------|-------------|
| POST | `/api/ai/analizza` | Analisi multifile → CME (🔒) |

Form fields: `capitolato` (file), `planimetria` (file), `prezziario` (file, opz.), `regione`, `anno`

### Computi
| Metodo | Path | Descrizione |
|--------|------|-------------|
| GET  | `/api/computi` | Lista computi (🔒) |
| GET  | `/api/computi/:id` | Dettaglio (🔒) |
| POST | `/api/computi` | Salva computo (🔒) |
| PUT  | `/api/computi/:id` | Aggiorna (🔒) |
| DELETE | `/api/computi/:id` | Elimina (🔒) |

### Stripe
| Metodo | Path | Descrizione |
|--------|------|-------------|
| POST | `/api/stripe/checkout` | Avvia checkout (🔒) |
| POST | `/api/stripe/portal` | Portale abbonamento (🔒) |
| POST | `/api/stripe/webhook` | Webhook Stripe (public) |

---

## Piani e limiti

| Piano | Prezzo | Computi/mese |
|-------|--------|-------------|
| Free | €0 | 3 |
| Base | €29 | 30 |
| Pro | €79 | Illimitati |
| Studio | €199 | Illimitati + multi-utente |

---

## Funzionalità chiave

- **Analisi AI capitolato**: estrazione automatica di tutte le voci d'opera da PDF/DOCX
- **Analisi planimetria**: rilevamento misure da immagini JPG/PNG (superfici, perimetri, aperture)
- **Prezziario regionale**: 20 regioni italiane, anni 2022-2025, con possibilità di caricare prezziario personalizzato
- **CME completo**: codice, descrizione, UM, quantità, prezzo unitario, importo, totali con IVA
- **Export PDF professionale**: layout A4 landscape, header brandizzato, tabella completa, riepilogo economico
- **Export CSV**: compatibile con Excel e software gestionali
- **Storico computi**: salvataggio, consultazione e eliminazione
- **Autenticazione JWT**: registrazione, login, gestione profilo
- **Pagamenti Stripe**: abbonamenti con upgrade/downgrade via Customer Portal
- **Rate limiting**: protezione API da abusi
- **Webhook idempotente**: gestione sicura degli eventi Stripe

---

## Personalizzazioni consigliate

1. **Logo** → sostituisci "CME Agent" in `Layout.jsx` con il tuo brand
2. **Prezzi** → modifica `PLANS` in `Pricing.jsx` e i price ID in Stripe
3. **Email** → integra SendGrid/Resend per conferma registrazione e notifiche
4. **Multi-lingua** → aggiungi i18n se il target include clienti non italiani
5. **DWG** → integra un microservizio Python con `ezdxf` per parsing reale dei file DWG

---

## Licenza

Progetto proprietario — tutti i diritti riservati.
