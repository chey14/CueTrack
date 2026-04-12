// src/hooks/useClubSettings.js
//
// How the QR upload works (FREE, no paid plan):
// ─────────────────────────────────────────────
// Cloudinary has a free "unsigned upload" feature.
// You create a free account, create an "upload preset" set to "unsigned",
// and anyone can upload to your cloud using just your cloud name + preset name.
// No API key needed — the preset name IS the permission.
// Free tier: 25GB storage, 25GB bandwidth/month. More than enough.
//
// Setup (takes 3 minutes):
// 1. cloudinary.com → Sign up free
// 2. Dashboard → Settings → Upload → Add upload preset
// 3. Set "Signing mode" to "Unsigned" → Save
// 4. Copy your Cloud Name (top of dashboard) and Preset Name
// 5. Paste them into CLOUDINARY_CLOUD and CLOUDINARY_PRESET below

import { useState, useEffect } from 'react'
import { doc, setDoc, onSnapshot } from 'firebase/firestore'
import { db, auth } from '../firebase'

// ── Replace these two values after setting up your free Cloudinary account ──
const CLOUDINARY_CLOUD  = 'dtpceolfi'    // e.g. 'dxyz123abc'
const CLOUDINARY_PRESET = 'crgnm7ic' // e.g. 'cuetrack_unsigned'
// ────────────────────────────────────────────────────────────────────────────

function settingsRef() {
  const uid = auth.currentUser?.uid
  if (!uid) return null
  return doc(db, 'clubs', uid, 'settings', 'main')
}

// Resize + compress image to base64 (for storing in Firestore as fallback)
function imageFileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const MAX = 500
        const scale = Math.min(MAX / img.width, MAX / img.height, 1)
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.onerror = reject
      img.src = e.target.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Upload to Cloudinary unsigned — returns a permanent public URL
async function uploadToCloudinary(file) {
  if (CLOUDINARY_CLOUD === 'YOUR_CLOUD_NAME') return null  // not configured yet
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', CLOUDINARY_PRESET)
  // Optional: tag images so you can find them in the Cloudinary dashboard
  formData.append('tags', 'upi_qr,cuetrack')
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`,
    { method: 'POST', body: formData }
  )
  const data = await res.json()
  // data.secure_url is a permanent HTTPS link to the image — works in WhatsApp
  return data?.secure_url || null
}

export function useClubSettings() {
  const [settings, setSettings] = useState({
    clubName:      '',
    ownerWhatsapp: '',
    upiId:         '',
    upiQrBase64:   '',    // base64 fallback — shown on screen
    upiQrUrl:      '',    // Cloudinary URL — sent in WhatsApp messages
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

  useEffect(() => {
    const ref = settingsRef()
    if (!ref) { setLoading(false); return }
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) setSettings(prev => ({ ...prev, ...snap.data() }))
      setLoading(false)
    })
    return unsub
  }, [])

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

  // Upload QR image:
  // 1. Always save base64 to Firestore (works immediately, shown on screen)
  // 2. Also try to upload to Cloudinary for a public URL (needed for WhatsApp)
  async function saveQrImage(file) {
    if (!file) return
    setUploadingQr(true)
    try {
      // Step 1: base64 for on-screen display (always works)
      const base64 = await imageFileToBase64(file)

      // Step 2: try Cloudinary for a WhatsApp-sendable URL
      let qrUrl = null
      try {
        qrUrl = await uploadToCloudinary(file)
      } catch (e) {
        console.warn('Cloudinary upload failed:', e)
      }

      // Save both — base64 for display, URL for WhatsApp
      await saveSettings({
        upiQrBase64: base64,
        upiQrUrl:    qrUrl || '',
      })
      return { base64, url: qrUrl }
    } finally {
      setUploadingQr(false)
    }
  }

  // The club's public view URL — customers scan a QR of this link
  // It uses the owner's Firebase UID so each club has a unique URL
  function getClubViewUrl() {
    const uid = auth.currentUser?.uid
    if (!uid) return null
    return `${window.location.origin}/club/${uid}`
  }

  return { settings, loading, saving, saveSettings, saveQrImage, uploadingQr, getClubViewUrl }
}