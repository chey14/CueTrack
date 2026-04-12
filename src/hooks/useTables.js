// src/hooks/useTables.js
//
// This hook manages all table session data in Firestore.
// Structure in Firestore:
//   clubs/{uid}/tables/{tableId}   ← live table state (status, timer, etc.)
//   clubs/{uid}/bills/{billId}     ← completed bill records
//
// The onSnapshot listener means all changes sync in real-time —
// if you have two devices open (e.g. tablet at desk + phone in pocket),
// both show the same live state.

import { useState, useEffect } from 'react'
import {
  collection, doc, onSnapshot, setDoc, addDoc,
  serverTimestamp, writeBatch
} from 'firebase/firestore'
import { db, auth } from '../firebase'

function uid() { return auth.currentUser?.uid }
function tablesCol() { return collection(db, 'clubs', uid(), 'tables') }
function billsCol()  { return collection(db, 'clubs', uid(), 'bills')  }

export function useTables(settingsTables) {
  // tableStates: { [tableId]: { status, elapsed, startTime, canteen, customer } }
  const [tableStates, setTableStates] = useState({})
  const [loading, setLoading] = useState(true)

  // Real-time listener on the tables sub-collection
  useEffect(() => {
    if (!uid()) { setLoading(false); return }

    const unsub = onSnapshot(tablesCol(), (snap) => {
      const states = {}
      snap.forEach(docSnap => {
        states[docSnap.id] = docSnap.data()
      })
      setTableStates(states)
      setLoading(false)
    })
    return unsub
  }, [])

  // Merge settings tables with live Firestore states
  // settingsTables = [ { id, name, type, size, ratePerMin } ]
  // For each, we pull in the live status from Firestore (or default to available)
  const tables = (settingsTables || []).map(t => ({
    ...t,
    status:    tableStates[t.id]?.status    ?? 'available',
    elapsed:   tableStates[t.id]?.elapsed   ?? 0,
    startTime: tableStates[t.id]?.startTime ?? null,
    canteen:   tableStates[t.id]?.canteen   ?? [],
    customer:  tableStates[t.id]?.customer  ?? null,
  }))

  // Write a table state update to Firestore
  // writeBatch isn't needed for single writes, but setDoc with merge is perfect
  async function updateTable(tableId, updates) {
    if (!uid()) return
    const ref = doc(tablesCol(), String(tableId))
    await setDoc(ref, updates, { merge: true })
  }

  async function startTable(tableId, customer) {
    await updateTable(tableId, {
      status: 'running',
      startTime: Date.now(),
      elapsed: 0,
      canteen: [],
      customer: customer ?? null,
    })
  }

  async function pauseTable(tableId, currentElapsed) {
    await updateTable(tableId, { status: 'paused', elapsed: currentElapsed })
  }

  async function resumeTable(tableId) {
    await updateTable(tableId, { status: 'running' })
  }

  async function addCanteenItems(tableId, currentCanteen, newItems) {
    await updateTable(tableId, { canteen: [...currentCanteen, ...newItems] })
  }

  // Checkout: save a bill record, then reset the table
  async function checkoutTable(table, paymentMode, total) {
    if (!uid()) return

    // 1. Save the completed bill to the bills collection
    // addDoc auto-generates a unique ID for each bill
    await addDoc(billsCol(), {
      tableId:    String(table.id),
      tableName:  table.name,
      tableType:  table.type,
      tableSize:  table.size,
      elapsed:    table.elapsed,
      ratePerMin: table.ratePerMin,
      tableCharge: parseFloat((table.elapsed * table.ratePerMin / 60).toFixed(2)),
      canteen:    table.canteen,
      canteenTotal: parseFloat(table.canteen.reduce((s, i) => s + i.price, 0).toFixed(2)),
      total:      parseFloat(total.toFixed(2)),
      paymentMode,
      customer:   table.customer ?? null,
      createdAt:  serverTimestamp(),  // Firestore server timestamp — reliable across timezones
    })

    // 2. Reset the table back to available
    await updateTable(String(table.id), {
      status: 'available',
      elapsed: 0,
      startTime: null,
      canteen: [],
      customer: null,
    })
  }

  return { tables, loading, startTable, pauseTable, resumeTable, addCanteenItems, checkoutTable }
}