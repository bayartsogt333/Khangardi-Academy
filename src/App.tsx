import './App.css'
import { AuthPanel } from './components/AuthPanel'
import { Dashboard } from './components/Dashboard'
import { AuthProvider, useAuth } from './context/AuthContext'

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

    return <main>{profile ? <Dashboard /> : <AuthPanel />}</main>
}

function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    )
}

export default App
