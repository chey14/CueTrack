import { initializeApp } from 'firebase/app'
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyCwPDS8VH-13bsPE6lCuFaaDhLcK1shENI",
  authDomain: "cuetrack-420c7.firebaseapp.com",
  projectId: "cuetrack-420c7",
  storageBucket: "cuetrack-420c7.firebasestorage.app",
  messagingSenderId: "667878450739",
  appId: "1:667878450739:web:7def0ff90af4fb76e56546"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)

// This is what makes the app work offline
enableIndexedDbPersistence(db).catch((err) => {
  console.log('Offline persistence error:', err.code)
})