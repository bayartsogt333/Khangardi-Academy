import { useMemo } from 'react'
import { useAuth } from '../context/AuthContext'

export function Dashboard() {
    const { logout, profile } = useAuth()

    const initials = useMemo(() => {
        const displayName = profile?.displayName || 'KA'
        return displayName
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase() ?? '')
            .join('')
    }, [profile?.displayName])

    return (
        <section className="dashboard-shell">
            <header className="dashboard-topbar">
                <div>
                    <span className="eyebrow">Signed in</span>
                    <h1>Welcome, {profile?.displayName}</h1>
                    <p>{profile?.role === 'admin' ? 'Administrator access enabled.' : 'User workspace ready.'}</p>
                </div>

                <div className="profile-chip">
                    <div className="avatar">{initials}</div>
                    <div>
                        <strong>{profile?.displayName}</strong>
                        <span>{profile?.email}</span>
                    </div>
                    <button type="button" onClick={logout}>
                        Logout
                    </button>
                </div>
            </header>

            <div className="dashboard-grid">
                <article className="dashboard-card dashboard-card--highlight">
                    <span className="card-kicker">Role</span>
                    <h2>{profile?.role === 'admin' ? 'Admin control center' : 'Student workspace'}</h2>
                    <p>
                        This account is authenticated through Firebase and its role is resolved from Firestore.
                    </p>
                </article>

                <article className="dashboard-card">
                    <span className="card-kicker">Classroom</span>
                    <h2>Courses, lessons, and enrollment</h2>
                    <p>Next step: protect lesson documents by role and enrollment status.</p>
                </article>

                <article className="dashboard-card">
                    <span className="card-kicker">Community</span>
                    <h2>Posts, comments, and reactions</h2>
                    <p>Next step: bind a Firestore feed to authenticated post creation.</p>
                </article>

                <article className="dashboard-card dashboard-card--wide">
                    <span className="card-kicker">Storage</span>
                    <h2>Avatar and media uploads are ready</h2>
                    <p>
                        The Firebase Storage client is wired, so you can add profile images, attachments, and
                        post media without reworking the auth layer.
                    </p>
                </article>
            </div>
        </section>
    )
}
