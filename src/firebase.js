import { initializeApp } from 'firebase/app'
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

// ─────────────────────────────────────────────────────────────────────
// Replace every value below with your actual Firebase project config.
// Firebase Console → Project Settings → Your apps → Config object
//
// NO storageBucket needed — we store the UPI QR as a base64 string
// directly in Firestore, so no Firebase Storage (paid plan) required.
// ─────────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCwPDS8VH-13bsPE6lCuFaaDhLcK1shENI",
  authDomain: "cuetrack-420c7.firebaseapp.com",
  projectId: "cuetrack-420c7",
  storageBucket: "cuetrack-420c7.firebasestorage.app",
  messagingSenderId: "667878450739",
  appId: "1:667878450739:web:7def0ff90af4fb76e56546"
}

const app = initializeApp(firebaseConfig)

// Firestore — the main database (tables, sessions, bills, settings)
export const db = getFirestore(app)

// Auth — owner login
export const auth = getAuth(app)

// ── Offline persistence ───────────────────────────────────────────
// Mirrors all Firestore data to the browser's IndexedDB so the app
// keeps working during power cuts / internet drops.
// When connection returns, all changes sync automatically.
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('CueTrack: Offline mode unavailable (multiple tabs open)')
  } else if (err.code === 'unimplemented') {
    console.warn('CueTrack: This browser does not support offline mode')
  }
})