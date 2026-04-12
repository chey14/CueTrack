# CueTrack 🎱

> Snooker & pool club management software — built for local Indian clubs that still use notebooks.

[![Live Demo](https://img.shields.io/badge/live-cuetrack.vercel.app-brightgreen)](https://cuetrack.vercel.app)
[![React](https://img.shields.io/badge/React-18-blue)](https://react.dev)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-orange)](https://firebase.google.com)
[![License](https://img.shields.io/badge/license-MIT-lightgrey)](LICENSE)

---

## What is CueTrack?

CueTrack is a free, offline-first Progressive Web App that replaces paper notebooks for snooker and pool club owners. It automates table timing, billing, canteen tracking, and revenue analytics — and works even without internet, so power cuts and network drops don't stop operations.

**Built by a player, for owners.** Inspired by watching clubs near VIT Vellore manually calculate bills and lose revenue to timing errors every single day.

Currently used by **Cues and Cushions Cafe**, **The House of Pool**, and **The OX Snooker** in Vellore.

---

## Features

### Core
| Feature | Description |
|---|---|
| Live table dashboard | Real-time timers per table, color-coded by status (available / running / paused) |
| Auto billing | Session cost calculated from `startTime` delta — zero manual arithmetic |
| Canteen integration | Add food & drinks to any running session, merged into the final bill |
| WhatsApp receipt | Itemised bill sent to customer's WhatsApp on checkout, one tap |
| UPI payment QR | Auto-generates a scannable UPI deep-link QR with bill amount pre-filled |
| Offline-first PWA | Works during power cuts — Firestore IndexedDB persistence, auto-sync on reconnect |

### Owner dashboard
| Feature | Description |
|---|---|
| Revenue analytics | Today vs yesterday, monthly chart, 6-month trend, annual forecast |
| Peak hour heatmap | Visualises which hours generate the most revenue |
| Table performance | Per-table revenue and session count for the current month |
| Bill history | All transactions grouped by date (Today / Yesterday / older dates) |
| Payment breakdown | Cash vs UPI vs pending totals per month |
| Daily WhatsApp summary | One-tap send of daily revenue report to owner's WhatsApp |

### Customer view
| Feature | Description |
|---|---|
| Club live view | Public page at `/club/:uid` — customers scan club QR and see all tables live |
| Read-only | Customers see timers and running costs but cannot control anything |
| No login required | Works on any phone, no app download needed |

### Access control
| Feature | Description |
|---|---|
| Verified onboarding | New owners submit a WhatsApp request form — credentials shared only after manual verification |
| Owner-only login | No public registration — prevents unauthorised access |
| Role separation | Staff can operate tables, owners see financials and settings |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS v4 |
| Database | Firebase Firestore (real-time, offline persistence via IndexedDB) |
| Auth | Firebase Authentication (email/password) |
| Hosting | Vercel (auto-deploys on every push to `main`) |
| QR generation | api.qrserver.com (free, no account) |
| Fonts | Syne (display) + DM Sans (body) |

**Infrastructure cost: ₹0/month.** Engineered entirely within Firebase's free Spark plan — no paid services required.

---

## Architecture decisions

**`startTime` delta billing instead of per-second writes**
Timers store a `startTime` timestamp and compute elapsed time locally (`Date.now() - startTime`). This means one Firestore write on start instead of one write every second — reducing daily writes by ~99% and staying well within the free tier at scale.

**Multi-tenant Firestore schema**
Each owner's data lives under `clubs/{uid}/` — fully isolated per account, zero cross-contamination, and new clubs onboard in minutes with no manual database setup.

**base64 QR in Firestore instead of Firebase Storage**
UPI QR images are compressed to ≤400px and stored as base64 strings in Firestore. Eliminates the need for Firebase Storage (which requires the paid Blaze plan) while keeping images available offline.

**Offline-first with IndexedDB persistence**
`enableIndexedDbPersistence()` mirrors all Firestore data locally. If the internet drops mid-session, the timer keeps running and all writes queue up — they sync the moment connectivity returns. Critical for Indian clubs where power cuts are a daily reality.

---

## Project structure

```
cuetrack/
├── src/
│   ├── pages/
│   │   ├── Landing.jsx       # Public marketing site (7 sections)
│   │   ├── Login.jsx         # Owner login + access request form
│   │   ├── Dashboard.jsx     # App shell — sidebar + navigation
│   │   └── ClubView.jsx      # Customer-facing live table view (/club/:uid)
│   ├── components/
│   │   ├── Tables.jsx        # Live table cards, billing modal, canteen modal
│   │   ├── Analytics.jsx     # Revenue charts, peak hours, bill history
│   │   ├── Canteen.jsx       # Menu management with stock tracking
│   │   └── Settings.jsx      # Club config, UPI setup, club QR code
│   ├── hooks/
│   │   ├── useClubSettings.js  # Firestore settings read/write
│   │   ├── useTables.js        # Live table state management
│   │   └── useBills.js         # Transaction history from Firestore
│   ├── context/
│   │   └── AuthContext.jsx   # Global Firebase Auth state
│   ├── firebase.js           # Firebase init + offline persistence
│   ├── App.jsx               # Route definitions
│   ├── main.jsx              # React entry point
│   └── index.css             # Design system — dark theme, CSS variables
├── public/
│   └── manifest.json         # PWA manifest — makes app installable
├── .env                      # Firebase config (not committed — see .env.example)
├── .env.example              # Template for environment variables
└── vite.config.js            # Vite + Tailwind config
```

---

## Getting started

### Prerequisites
- Node.js 18+
- A Firebase project (free Spark plan is sufficient)

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/cuetrack.git
cd cuetrack
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy the example file and fill in your Firebase config:

```bash
cp .env.example .env
```

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

Get these values from: Firebase Console → Project Settings → Your apps → Config.

### 4. Enable Firebase services

In the Firebase Console:
- **Firestore Database** → Create database → Start in test mode
- **Authentication** → Get started → Email/Password → Enable

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Deployment

This project is configured for zero-config deployment on Vercel.

### Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) → Add New Project → Import your repo
3. Add the same environment variables from your `.env` file in the Vercel dashboard
4. Click Deploy — done

After your first deploy, every `git push origin main` triggers an automatic redeploy.

### After deploying

Add your Vercel domain to Firebase's authorized domains:
Firebase Console → Authentication → Settings → Authorized domains → Add domain

---

## Creating credentials for a new club owner

CueTrack uses a gated onboarding flow — owners cannot self-register. When a new owner submits the access request form on the website, you receive a WhatsApp message with their details. After verifying they're a legitimate club:

1. Firebase Console → Authentication → Users → Add user
2. Enter their email and set a temporary password
3. WhatsApp them their credentials and ask them to change the password after first login

Their club QR code (`/club/:uid`) is automatically generated on first login — unique per account, permanent.

---

## Roadmap

- [x] Live table dashboard with real-time timers
- [x] Auto billing (per-minute and per-hour rates)
- [x] Canteen add-ons per session
- [x] WhatsApp bill receipts with UPI QR
- [x] Offline-first PWA
- [x] Firebase Firestore persistence
- [x] Revenue analytics with peak hours and forecasting
- [x] Bill history grouped by date
- [x] Customer live view via club QR code
- [x] Verified owner onboarding flow
- [ ] Member credit tracking (Khatabook style)
- [ ] Table bookings and advance reservations
- [ ] Multi-staff roles with granular permissions
- [ ] Automated daily WhatsApp summary (requires WhatsApp Business API)
- [ ] Paid subscription tier after proving value

---

## License

MIT — free to use, modify, and distribute.

---

*Built with ❤️ near VIT Vellore. Solving a real problem, one club at a time.*