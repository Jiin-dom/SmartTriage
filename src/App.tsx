import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import TicketListDashboard from './pages/TicketListDashboard'
import CreateNewTicket from './pages/CreateNewTicket'
import TicketDetails from './pages/TicketDetails'
import ProfileAndSettings from './pages/ProfileAndSettings'
import AdminAnalyticsOverview from './pages/AdminAnalyticsOverview'
import UserManagement from './pages/UserManagement'
import { AuthProvider, useAuth } from './AuthContext'

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { token } = useAuth()
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return children
}

function AppRoutes() {
  const { token } = useAuth()

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={token ? <Navigate to="/dashboard" replace /> : <Login />}
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <TicketListDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tickets/create"
          element={
            <ProtectedRoute>
              <CreateNewTicket />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tickets/:id"
          element={
            <ProtectedRoute>
              <TicketDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfileAndSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <AdminAnalyticsOverview />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute>
              {token && (useAuth().user?.role === 'admin' ? <UserManagement /> : <Navigate to="/dashboard" replace />)}
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}

export default App
