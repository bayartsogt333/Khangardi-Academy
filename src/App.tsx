import './App.css'
import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthPanel } from './components/AuthPanel'
import { UserHomePage } from './pages/UserHomePage'
import { AuthProvider, useAuth } from './context/AuthContext'

const Dashboard = lazy(() => import('./components/Dashboard').then((module) => ({ default: module.Dashboard })))
const LearningHomePage = lazy(() => import('./pages/LearningHomePage').then((module) => ({ default: module.LearningHomePage })))
const CourseStudyPage = lazy(() => import('./pages/CourseStudyPage').then((module) => ({ default: module.CourseStudyPage })))
const AdminEnrollmentsPage = lazy(() => import('./pages/AdminEnrollmentsPage').then((module) => ({ default: module.AdminEnrollmentsPage })))
const CommunityPage = lazy(() => import('./pages/CommunityPage').then((module) => ({ default: module.CommunityPage })))

function RouteFallback() {
    return (
        <main className="app-loading" aria-busy="true" aria-live="polite">
            <div className="loading-card">
                <span className="eyebrow">Khangardi Academy</span>
                <h1>Loading page...</h1>
                <p>Preparing the selected section.</p>
            </div>
        </main>
    )
}

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
            <Suspense fallback={<RouteFallback />}>
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
            </Suspense>
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
