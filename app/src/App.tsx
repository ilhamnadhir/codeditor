import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider }    from '@/features/auth/AuthContext'
import ProtectedRoute      from '@/features/auth/ProtectedRoute'
import Landing             from '@/pages/Landing'
import LoginPage           from '@/pages/LoginPage'
import Dashboard           from '@/pages/Dashboard'
import EditorPage          from '@/pages/EditorPage'
import NotFound            from '@/pages/NotFound'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/"           element={<Landing />} />
          <Route path="/login"      element={<LoginPage />} />
          <Route path="/dashboard"  element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          <Route path="/room/:roomId" element={
            <ProtectedRoute><EditorPage /></ProtectedRoute>
          } />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
