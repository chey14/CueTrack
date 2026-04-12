// src/hooks/useBills.js
//
// Reads all completed bills from Firestore.
// Used by the Analytics page to show real revenue data.
//
// Firestore path: clubs/{uid}/bills/{billId}
// Each bill has: tableId, tableName, elapsed, total, paymentMode,
//                canteenTotal, createdAt, customer

import { useState, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { db, auth } from '../firebase'

export function useBills() {
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const uid = auth.currentUser?.uid
    if (!uid) { setLoading(false); return }

    // Order by createdAt descending = newest bills first
    const q = query(
      collection(db, 'clubs', uid, 'bills'),
      orderBy('createdAt', 'desc')
    )

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        // Convert Firestore Timestamp to JS Date for easy manipulation
        createdAt: d.data().createdAt?.toDate?.() ?? new Date(),
      }))
      setBills(data)
      setLoading(false)
    })
    return unsub
  }, [])

  return { bills, loading }
}