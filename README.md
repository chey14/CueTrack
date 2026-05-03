# CueTrack 🎱

**Smart snooker & pool club management — built for local Indian clubs.**

[![Live](https://img.shields.io/badge/live-cuetrack.vercel.app-22c55e?style=flat-square)](https://cuetrack.vercel.app)
[![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react)](https://react.dev)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-f59e0b?style=flat-square&logo=firebase)](https://firebase.google.com)
[![PWA](https://img.shields.io/badge/PWA-offline--first-7c3aed?style=flat-square)](https://web.dev/progressive-web-apps/)
[![License](https://img.shields.io/badge/license-MIT-lightgrey?style=flat-square)](LICENSE)

---

## Overview

CueTrack is a free, production-deployed club management SaaS adopted by **4+ snooker and pool clubs near VIT Vellore**, serving over **400 daily visitors** across Cues and Cushions Cafe, The House of Pool, and The OX Snooker.

It replaces paper notebooks with a real-time digital dashboard — automating table billing, canteen tracking, revenue analytics, and customer receipts. Built offline-first so power cuts and internet drops never interrupt operations.

> *Built by a player who watched club owners lose revenue to manual errors every day. Identified the problem firsthand, interviewed real owners, and shipped a working product used by real businesses.*

---

## Live Deployment

| URL | Description |
|---|---|
| `cuetrack.vercel.app` | Owner dashboard & landing page |
| `cuetrack.vercel.app/club/:uid` | Customer live view (scan club QR) |
| `cuetrack.vercel.app/login` | Owner login & access request |

---

## Feature Set

### Core Operations
| Feature | Description |
|---|---|
| **Live table dashboard** | All tables on one screen — green = available, amber = running, blue = paused. Real-time cost updates every second |
| **Auto billing** | Session cost computed from `startTime` delta, not per-second writes. Zero manual calculation |
| **Canteen add-ons** | Link food & drinks to any running session. Merged into final bill automatically |
| **Customer details** | Optional name + WhatsApp per session. Editable mid-session via "Edit" button on table card |
| **Late check-in** | Record late arrivals — extra time is charged silently without appearing on the customer bill |
| **Canteen delete** | Remove a wrongly added item from a running session before checkout |

### Billing & Payments
| Feature | Description |
|---|---|
| **4 payment modes** | Cash / UPI / UPI + Cash (split) / Paid + Pending |
| **Split payment** | Enter cash and UPI amounts — validates they sum to total before confirming |
| **Paid + Pending** | Record partial payment; pending amount tracked separately |
| **PIN-protected discount** | Owner sets a private PIN in Settings; only PIN-holders can apply discounts |
| **Sequential bill numbers** | Format: `CT-YYYYMMDD-001`, globally sequential — never resets, never repeats |
| **Check-in / check-out times** | Shown on every bill and in transaction history |
| **Rounded amounts** | All bills display to nearest rupee — no decimal confusion |

### WhatsApp Integration
| Feature | Description |
|---|---|
| **Bill receipt** | Itemised bill sent to customer's WhatsApp on checkout — includes club name, table, time, canteen, total |
| **UPI QR link** | Auto-generates a scannable UPI deep-link QR with the exact bill amount pre-filled |
| **Canteen receipt** | Standalone canteen sales also send WhatsApp receipts with optional customer name |
| **Daily summary** | Owner taps one button — yesterday's revenue, sessions, and top table sent to their WhatsApp |

### Standalone Canteen Sales
| Feature | Description |
|---|---|
| **No-table billing** | Sell canteen items to walk-in customers without starting a table session |
| **Full checkout** | Same 4 payment modes, discount, customer name, WhatsApp receipt as table checkout |
| **Saved to history** | Appears in bill history tagged as "Canteen sale" — included in all revenue analytics |

### Analytics & Reporting
| Feature | Description |
|---|---|
| **Today's revenue** | Live card showing today vs yesterday with % change |
| **Table vs canteen split** | Today and this month broken down by table revenue and canteen revenue separately |
| **Monthly trend chart** | Last 6 months bar chart with current month highlighted |
| **Monthly KPIs** | This month / last month / 6-month average / projected annual revenue |
| **Peak hour heatmap** | All-time revenue by hour of day — shows busiest periods |
| **Table performance** | Per-table revenue and session count for current month |
| **Payment breakdown** | Cash vs UPI vs pending totals per month |
| **Bill history** | All transactions grouped by date (Today / Yesterday / older). Filter by payment mode |
| **Discount tracking** | Discounted bills shown with discount amount in history |
| **CSV export** | Full transaction history exported with: Bill No, Date, Check-in, Check-out, Duration, Table, Rate, Charges, Canteen, Discount, Total, Payment, Customer |

### Canteen & Inventory
| Feature | Description |
|---|---|
| **Menu management** | Add / edit / delete canteen items with name, price, category |
| **Stock tracking** | Each item has a stock quantity visible on the menu card |
| **PIN-protected inventory** | "Restock inventory" requires owner PIN — staff cannot manipulate stock numbers |
| **Bulk restock panel** | One click to unlock all items for simultaneous restocking |
| **Per-item stock edit** | Individual PIN unlock per item for single-item corrections |
| **Stock alerts** | Items show amber (low: ≤3) or red (out of stock) status |
| **Inventory value** | Total current inventory value shown in stats |

### Access Control & Onboarding
| Feature | Description |
|---|---|
| **Gated registration** | No public sign-up. New owners submit a WhatsApp request form with club details |
| **Manual verification** | Owner reviews each request, verifies legitimacy, creates account via Firebase Console |
| **Owner PIN** | Separate PIN (stored device-local) for sensitive actions: discounts and inventory edits |
| **Staff vs owner** | Staff can operate tables and billing. Owner controls settings, analytics, inventory |

### Customer View (QR)
| Feature | Description |
|---|---|
| **Unique club URL** | Each club gets `/club/:uid` — permanent, based on Firebase UID, never changes |
| **QR code generated** | Settings page generates a printable QR and download link automatically |
| **Live table status** | Customers see all tables: available, running, or paused |
| **Live timer & cost** | Running tables show live countdown and current total cost |
| **Read-only** | No buttons — customers can only view, not control anything |
| **No login required** | Works on any phone browser, no app download |

### Offline & Reliability
| Feature | Description |
|---|---|
| **Offline-first PWA** | Firestore IndexedDB persistence — app works during power cuts and internet drops |
| **Auto-sync** | All offline writes queue and sync automatically when connection returns |
| **Installable** | Can be installed as a PWA on any phone or tablet (Add to Home Screen) |
| **Refresh-safe routing** | `vercel.json` SPA config — no 404 on page refresh or direct URL access |

---

## Architecture

### Why these technical decisions matter

**`startTime` delta billing — not per-second writes**
Timers store a `startTime` timestamp and compute elapsed locally as `Date.now() - startTime`. This means one Firestore write on start instead of one every second — reducing daily writes by ~99% and keeping the entire platform within Firebase's free tier at scale across multiple clubs.

**Multi-tenant Firestore schema**
All data lives under `clubs/{uid}/` — each owner's tables, bills, and settings are fully isolated. New clubs onboard in under 15 minutes with zero manual database configuration.

**Base64 QR in Firestore instead of Firebase Storage**
UPI QR images are resized to ≤500px and stored as base64 strings in Firestore. Eliminates Firebase Storage (which requires the paid Blaze plan) — the entire platform runs on the free Spark plan.

**Sequential bill numbers via atomic Firestore transaction**
`runTransaction` ensures two simultaneous checkouts never receive the same bill number. Counter never resets — bill `CT-20260417-041` is always followed by `-042`.

**Device-local owner PIN**
The owner PIN is stored in `localStorage` (not Firestore) — it never leaves the device, cannot be read by staff on other devices, and doesn't appear in any database. Correctly scoped for its purpose.

### Data structure

```
Firestore
└── clubs/
    └── {uid}/                         ← owner's Firebase Auth UID
        ├── settings/
        │   ├── main                   ← clubName, upiId, upiQrBase64, tables[], ownerWhatsapp
        │   └── billCounter            ← { count: 41 }  (atomic sequential counter)
        ├── tables/
        │   ├── {tableId}              ← status, startTime, elapsed, canteen[], customer, lateMinutes
        │   └── ...
        └── bills/
            ├── {autoId}               ← billType, billNumber, tableCharge, canteenTotal,
            │                             discount, total, paymentMode, cashAmount, upiAmount,
            │                             pendingAmount, customer, checkInTime, checkOutTime,
            │                             elapsed, createdAt
            └── ...
```

### Infrastructure cost: ₹0/month

| Service | Usage | Cost |
|---|---|---|
| Firebase Firestore | Tables, bills, settings | Free (Spark) |
| Firebase Auth | Owner login | Free (Spark) |
| Vercel | Frontend hosting | Free |
| api.qrserver.com | QR code generation | Free |
| api.whatsapp.com | Bill receipts (wa.me links) | Free |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 · Vite · Tailwind CSS v4 |
| Database | Firebase Firestore (real-time + offline IndexedDB) |
| Auth | Firebase Authentication (email/password) |
| Hosting | Vercel (auto-deploys on `git push`) |
| Fonts | Plus Jakarta Sans · Inter |

---

## Project Structure

```
cuetrack/
├── public/
│   └── manifest.json              # PWA manifest
├── src/
│   ├── pages/
│   │   ├── Landing.jsx            # Public marketing site (7 sections)
│   │   ├── Login.jsx              # Owner login + access request form
│   │   ├── Dashboard.jsx          # App shell — sidebar navigation
│   │   └── ClubView.jsx           # Customer live view (/club/:uid)
│   ├── components/
│   │   ├── Tables.jsx             # Live table cards, billing, canteen, checkout
│   │   ├── Analytics.jsx          # Revenue charts, history, CSV export
│   │   ├── Canteen.jsx            # Menu + PIN-protected inventory
│   │   └── Settings.jsx           # Club config, UPI, PIN, club QR
│   ├── hooks/
│   │   ├── useClubSettings.js     # Firestore settings read/write + QR upload
│   │   ├── useTables.js           # Live table state, checkout, canteen bills
│   │   └── useBills.js            # Transaction history from Firestore
│   ├── context/
│   │   └── AuthContext.jsx        # Global Firebase Auth state
│   ├── firebase.js                # Firebase init + offline persistence
│   ├── App.jsx                    # Route definitions
│   ├── main.jsx                   # React entry point
│   └── index.css                  # Design system — dark theme, CSS variables
├── vercel.json                    # SPA routing — prevents 404 on refresh
├── .env                           # Firebase config (not committed)
├── .env.example                   # Config template
└── vite.config.js                 # Vite + Tailwind config
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Firebase project (free Spark plan)

### 1. Clone

```bash
git clone https://github.com/YOUR_USERNAME/cuetrack.git
cd cuetrack
npm install
```

### 2. Environment variables

```bash
cp .env.example .env
```

Edit `.env`:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

Get these from: Firebase Console → Project Settings → Your apps → Config.

### 3. Firebase setup (free)

In Firebase Console, enable:
- **Firestore Database** → Create → Start in test mode
- **Authentication** → Email/Password → Enable

### 4. Run locally

```bash
npm run dev
# Open http://localhost:5173
```

### 5. Deploy

```bash
# Push to GitHub — Vercel auto-deploys
git add . && git commit -m "deploy" && git push origin main
```

After first Vercel deploy: Firebase Console → Authentication → Settings → Authorized domains → add your Vercel domain.

---

## Owner Onboarding Flow

CueTrack uses gated access — no public sign-up.

1. New owner visits the site and fills the **"Request access"** form (name, club, city, phone, number of tables)
2. Form opens WhatsApp with their details pre-filled → sent to the admin number
3. Admin verifies the club is legitimate
4. Admin creates their account: Firebase Console → Authentication → Users → Add user
5. Admin sends them their email + temporary password via WhatsApp
6. Owner logs in → their club URL (`/club/:uid`) and QR code are auto-generated immediately

**To set the PIN on a new device:** Settings → Owner PIN → Change PIN (default: `1234`)

---

## Clubs Using CueTrack

| Club | Location | Tables | Daily Visitors |
|---|---|---|---|
| Cues and Cushions Cafe | Vellore | — | ~100 |
| The House of Pool | Vellore | — | ~100 |
| The OX Snooker | Vellore | — | ~100 |
| + 1 more | Vellore area | — | ~100 |

**Total: 4+ clubs · 400+ daily visitors · ₹0/month infrastructure cost**

---

## Roadmap

### Completed ✅
- Live table dashboard with real-time timers
- Auto billing (per-minute and per-hour rates)
- Canteen add-ons per session with delete
- 4 payment modes: Cash / UPI / Split / Paid+Pending
- WhatsApp bill receipts with UPI QR link
- Standalone canteen sales with full checkout
- PIN-protected discounts and inventory management
- Offline-first PWA (works during power cuts)
- Firebase Firestore real-time persistence
- Sequential bill numbers (never resets)
- Check-in / check-out time on every bill
- Late check-in (charges extra, invisible on bill)
- Revenue analytics — today, monthly, 6-month trend
- Table vs canteen revenue split
- Peak hour heatmap
- Bill history grouped by date with CSV export
- Customer live view via club QR code
- Gated owner onboarding via WhatsApp verification
- Owner PIN for discounts and inventory

### Planned 📋
- Member / credit tracking (Khatabook style)
- Table bookings and advance reservations
- Automated daily WhatsApp summary (requires WhatsApp Business API)
- Multi-staff roles with granular permissions
- Subscription tier after proving value at scale

---

## License

MIT — free to use, modify, and distribute.

---

*Built with ❤️ near VIT Vellore. Solving a real problem, one club at a time.*