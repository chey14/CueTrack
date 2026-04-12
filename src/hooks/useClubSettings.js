// src/hooks/useClubSettings.js
//
// Reads/writes club settings from Firestore.
// QR image is stored as a base64 data URL string directly in Firestore
// — no Firebase Storage (paid plan) required.
//
// A base64 string looks like: "data:image/png;base64,iVBORw0KGgo..."
// Firestore can hold up to 1MB per field, and a QR image compressed to
// ~200-400KB base64 is well within that limit.

import { useState, useEffect } from 'react'
import { doc, setDoc, onSnapshot } from 'firebase/firestore'
import { db, auth } from '../firebase'

// Firestore path: clubs/{uid}/settings/main
function settingsRef() {
  const uid = auth.currentUser?.uid
  if (!uid) return null
  return doc(db, 'clubs', uid, 'settings', 'main')
}

// Compress and convert an image File to a base64 string.
// We resize it to max 400x400 pixels first to keep the size small
// (a QR code doesn't need to be large — it just needs to be scannable).
function imageFileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        // Draw onto a canvas, max 400px wide/tall
        const MAX = 400
        const scale = Math.min(MAX / img.width, MAX / img.height, 1)
        const w = Math.round(img.width  * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width  = w
        canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        // quality 0.75 = good enough for scanning, smaller file size
        resolve(canvas.toDataURL('image/jpeg', 0.75))
      }
      img.onerror = reject
      img.src = e.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function useClubSettings() {
  const [settings, setSettings] = useState({
    clubName:      '',
    ownerWhatsapp: '',
    upiId:         '',
    upiQrBase64:   '',   // base64 string of the QR image — stored in Firestore
    tables: [
      { id: '1', name: 'Pool Table 1',    type: 'Pool',    size: 'Regular', ratePerMin: 3.33 },
      { id: '2', name: 'Pool Table 2',    type: 'Pool',    size: 'Regular', ratePerMin: 3.33 },
      { id: '3', name: 'Snooker Table 1', type: 'Snooker', size: 'Large',   ratePerMin: 5.00 },
      { id: '4', name: 'Snooker Table 2', type: 'Snooker', size: 'Large',   ratePerMin: 5.00 },
    ],
  })
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState(false)
  const [uploadingQr, setUploadingQr] = useState(false)

  // Real-time listener — fires immediately with saved data, then on every change
  useEffect(() => {
    const ref = settingsRef()
    if (!ref) { setLoading(false); return }

    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setSettings(prev => ({ ...prev, ...snap.data() }))
      }
      setLoading(false)
    })
    return unsub
  }, [])

  // Save any settings fields to Firestore
  async function saveSettings(updates) {
    const ref = settingsRef()
    if (!ref) return
    setSaving(true)
    try {
      await setDoc(ref, updates, { merge: true })
      setSettings(prev => ({ ...prev, ...updates }))
    } finally {
      setSaving(false)
    }
  }

  // Convert the picked image file to base64, then save to Firestore
  async function saveQrImage(file) {
    if (!file) return
    setUploadingQr(true)
    try {
      const base64 = await imageFileToBase64(file)
      await saveSettings({ upiQrBase64: base64 })
      return base64
    } finally {
      setUploadingQr(false)
    }
  }

  return { settings, loading, saving, saveSettings, saveQrImage, uploadingQr }
}