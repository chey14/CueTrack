import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ClubView from './pages/ClubView'

// ProtectedRoute: redirects to /login if not logged in
function ProtectedRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  const { user } = useAuth()
  return (
    <Routes>
      {/* Public pages — no login needed */}
      <Route path="/"           element={<Landing />} />
      <Route path="/login"      element={user ? <Navigate to="/dashboard" replace /> : <Login />} />

      {/* Customer view — /club/:uid  (uid = owner's Firebase user ID) */}
      {/* This is the page customers see when they scan the club QR code */}
      {/* It shows live table status — read-only, no login required */}
      <Route path="/club/:uid"  element={<ClubView />} />

      {/* Owner dashboard — login required */}
      <Route path="/dashboard"  element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

      <Route path="*"           element={<Navigate to="/" replace />} />
    </Routes>
  )
}