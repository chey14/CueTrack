# CueTrack 🎱

> Smart snooker & pool club management — built for local Indian clubs.

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://cuetrack.vercel.app)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

## What is CueTrack?

CueTrack is a free, offline-first club management web app built specifically for snooker and pool clubs in India. It replaces the notebook with a real-time digital dashboard that works even without internet.

**Built by a player, for club owners.** Inspired by watching owners manually write bills at a shop near VIT Vellore.

---

## Features

| Feature | Status |
|---|---|
| Live table dashboard (start/pause/stop) | ✅ Done |
| Auto billing with per-minute rates | ✅ Done |
| Canteen add-ons linked to sessions | ✅ Done |
| WhatsApp bill receipt (one tap) | ✅ Done |
| Offline-first PWA (works without internet) | ✅ Done |
| Owner & staff login (Firebase Auth) | ✅ Done |
| Revenue analytics & peak hour heatmap | ✅ Done |
| Revenue forecast & monthly comparison | ✅ Done |
| Customer live timer via QR code | 🔄 In Progress |
| Daily WhatsApp summary to owner | 🔄 Planned |
| Firestore real-time data persistence | 🔄 In Progress |
| Member/credit (Khatabook style) | 📋 Planned |

---

## Tech Stack

- **Frontend**: React 18 + Vite + Tailwind CSS v4
- **Backend / DB**: Firebase Firestore (real-time, offline sync)
- **Auth**: Firebase Authentication (email/password)
- **Hosting**: Vercel
- **Fonts**: Syne (display) + DM Sans (body)

---

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/cuetrack.git
cd cuetrack
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Firebase

1. Go to [firebase.google.com](https://firebase.google.com) → Create a project
2. Enable **Firestore Database** (test mode) and **Authentication** (Email/Password)
3. Copy your Firebase config from Project Settings → Your apps
4. Open `src/firebase.js` and paste your config

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### 5. Deploy to Vercel

```bash
npm install -g vercel
vercel
```

---

## Project Structure

```
src/
├── pages/
│   ├── Landing.jsx      # Marketing / landing page (all sections)
│   ├── Login.jsx        # Owner login & register
│   └── Dashboard.jsx    # Main app shell with sidebar
├── components/
│   ├── Tables.jsx       # Live table dashboard (core feature)
│   ├── Analytics.jsx    # Revenue charts & insights
│   ├── Canteen.jsx      # Menu management
│   └── Settings.jsx     # Club & table config
├── context/
│   └── AuthContext.jsx  # Global auth state
├── firebase.js          # Firebase init + offline persistence
├── App.jsx              # Route definitions
├── main.jsx             # React entry point
└── index.css            # Design tokens & global styles
```

---

## Roadmap

### Phase 1 (Current)
- [x] Landing page with all sections
- [x] Login/Register
- [x] Live table dashboard
- [x] Billing & canteen
- [x] Analytics (mock data)
- [x] Settings

### Phase 2 (Next — after owner feedback)
- [ ] Connect tables to Firestore (real persistence)
- [ ] Save bills to transaction history
- [ ] Customer QR live view
- [ ] Member/credit tracking

### Phase 3 (Growth)
- [ ] Daily WhatsApp summary (via WhatsApp Business API)
- [ ] Multi-club / multi-staff
- [ ] Paid subscription tier

---

## Contributing

This project is currently in active development. If you find a bug or have a suggestion, open an issue or reach out via WhatsApp (link in landing page contact form).

---

## License

MIT — free to use and modify.

---

*Built with ❤️ near VIT Vellore.*