// src/hooks/useTables.js
import { useState, useEffect } from 'react'
import {
  collection, doc, onSnapshot, setDoc, addDoc,
  serverTimestamp, runTransaction
} from 'firebase/firestore'
import { db, auth } from '../firebase'

function uid()       { return auth.currentUser?.uid }
function tablesCol() { return collection(db, 'clubs', uid(), 'tables') }
function billsCol()  { return collection(db, 'clubs', uid(), 'bills')  }
function counterRef(){ return doc(db, 'clubs', uid(), 'settings', 'billCounter') }

// Sequential bill number: CT-YYYYMMDD-001, 002, ...
// runTransaction ensures two simultaneous checkouts never get the same number.
// The counter never resets — #42 today means #43 tomorrow.
async function getNextBillNumber() {
  const d    = new Date()
  const date = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`
  let seq = 1
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(counterRef())
      seq = snap.exists() ? (snap.data().count || 0) + 1 : 1
      tx.set(counterRef(), { count: seq }, { merge: true })
    })
  } catch (e) {
    seq = Math.floor(Date.now() / 1000) % 10000
  }
  return `CT-${date}-${String(seq).padStart(3, '0')}`
}

export function useTables(settingsTables) {
  const [tableStates, setTableStates] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid()) { setLoading(false); return }
    const unsub = onSnapshot(tablesCol(), (snap) => {
      const states = {}
      snap.forEach(d => { states[d.id] = d.data() })
      setTableStates(states)
      setLoading(false)
    })
    return unsub
  }, [])

  const tables = (settingsTables || []).map(t => ({
    ...t,
    status:      tableStates[t.id]?.status      ?? 'available',
    elapsed:     tableStates[t.id]?.elapsed      ?? 0,
    startTime:   tableStates[t.id]?.startTime    ?? null,
    lateMinutes: tableStates[t.id]?.lateMinutes  ?? 0,
    canteen:     tableStates[t.id]?.canteen      ?? [],
    customer:    tableStates[t.id]?.customer     ?? null,
  }))

  async function updateTable(tableId, updates) {
    if (!uid()) return
    await setDoc(doc(tablesCol(), String(tableId)), updates, { merge: true })
  }

  async function startTable(tableId, customer, lateMinutes = 0) {
    await updateTable(tableId, {
      status: 'running', startTime: Date.now(), elapsed: 0,
      lateMinutes: lateMinutes || 0, canteen: [], customer: customer ?? null,
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

  async function removeCanteenItem(tableId, currentCanteen, index) {
    await updateTable(tableId, { canteen: currentCanteen.filter((_, i) => i !== index) })
  }

  async function updateCustomer(tableId, customer) {
    await updateTable(tableId, { customer })
  }

  // ── Table checkout ────────────────────────────────────────────
  async function checkoutTable(table, billData) {
    if (!uid()) return

    const now          = Date.now()
    const billNumber   = await getNextBillNumber()
    const lateMs       = (table.lateMinutes || 0) * 60 * 1000
    const checkInTime  = new Date(now - table.elapsed * 1000 - lateMs)
    const checkOutTime = new Date(now)

    await addDoc(billsCol(), {
      billType:     'table',           // distinguishes from canteen-only bills
      billNumber,
      tableId:      String(table.id),
      tableName:    table.name,
      tableType:    table.type,
      tableSize:    table.size,
      elapsed:      table.elapsed,
      lateMinutes:  table.lateMinutes || 0,
      ratePerMin:   table.ratePerMin,
      tableCharge:  billData.tableCharge,
      canteen:      table.canteen,
      canteenTotal: billData.canteenTotal,
      discount:     billData.discount || 0,
      total:        billData.total,
      paymentMode:  billData.paymentMode,
      cashAmount:   billData.cashAmount   || 0,
      upiAmount:    billData.upiAmount    || 0,
      pendingAmount:billData.pendingAmount || 0,
      customer:     table.customer ?? null,
      checkInTime:  checkInTime.toISOString(),
      checkOutTime: checkOutTime.toISOString(),
      createdAt:    serverTimestamp(),
    })

    await updateTable(String(table.id), {
      status: 'available', elapsed: 0, startTime: null,
      lateMinutes: 0, canteen: [], customer: null,
    })

    return billNumber
  }

  // ── Standalone canteen checkout (no table session) ─────────────
  // This is for walk-in customers who just buy snacks/drinks.
  async function saveCanteenBill(items, billData) {
    if (!uid()) return

    const billNumber   = await getNextBillNumber()
    const checkOutTime = new Date().toISOString()

    await addDoc(billsCol(), {
      billType:     'canteen',         // canteen-only sale
      billNumber,
      tableName:    'Canteen',
      tableId:      'canteen',
      tableCharge:  0,
      elapsed:      0,
      canteen:      items,
      canteenTotal: billData.canteenTotal,
      discount:     billData.discount || 0,
      total:        billData.total,
      paymentMode:  billData.paymentMode,
      cashAmount:   billData.cashAmount   || 0,
      upiAmount:    billData.upiAmount    || 0,
      pendingAmount:billData.pendingAmount || 0,
      customer:     billData.customer || null,
      checkInTime:  checkOutTime,
      checkOutTime: checkOutTime,
      createdAt:    serverTimestamp(),
    })

    return billNumber
  }

  return {
    tables, loading,
    startTable, pauseTable, resumeTable,
    addCanteenItems, removeCanteenItem, updateCustomer,
    checkoutTable, saveCanteenBill,
  }
}