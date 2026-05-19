import './App.css'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthPanel } from './components/AuthPanel'
import { Dashboard } from './components/Dashboard'
import { LearningHomePage } from './pages/LearningHomePage'
import { CourseStudyPage } from './pages/CourseStudyPage'
import { AdminEnrollmentsPage } from './pages/AdminEnrollmentsPage'
import { CommunityPage } from './pages/CommunityPage'
import { UserHomePage } from './pages/UserHomePage'
import { AuthProvider, useAuth } from './context/AuthContext'

function RequireAdmin({ children }: { children: React.ReactNode }) {
    const { profile } = useAuth()

    if (profile?.role !== 'admin') {
        return <Navigate to="/home" replace />
    }

    return children
}

function AppContent() {
    const { loading, profile } = useAuth()

    if (loading) {
        return (
            <main className="app-loading" aria-busy="true" aria-live="polite">
                <div className="loading-card">
                    <span className="eyebrow">Khangardi Academy</span>
                    <h1>Loading secure session...</h1>
                    <p>Checking Firebase auth state and profile access.</p>
                </div>
            </main>
        )
    }

    if (!profile) {
        return <main>{<AuthPanel />}</main>
    }

    return (
        <BrowserRouter>
            <Routes>
                <Route
                    path="/"
                    element={<Navigate to={profile.role === 'admin' ? '/admin' : '/home'} replace />}
                />
                <Route
                    path="/admin"
                    element={
                        <RequireAdmin>
                            <Dashboard />
                        </RequireAdmin>
                    }
                />
                <Route
                    path="/admin/enrollments"
                    element={
                        <RequireAdmin>
                            <AdminEnrollmentsPage />
                        </RequireAdmin>
                    }
                />
                <Route path="/home" element={<UserHomePage />} />
                <Route path="/classroom" element={<LearningHomePage />} />
                <Route path="/learn" element={<LearningHomePage />} />
                <Route path="/community" element={<CommunityPage />} />
                <Route path="/learn/:courseId" element={<CourseStudyPage />} />
                <Route path="*" element={<Navigate to={profile.role === 'admin' ? '/admin' : '/home'} replace />} />
            </Routes>
        </BrowserRouter>
    )
}

function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    )
}

export default App
