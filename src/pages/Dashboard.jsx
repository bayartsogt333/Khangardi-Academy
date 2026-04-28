import { useAuth } from '../contexts/useAuth'
import { useNavigate } from 'react-router-dom'
import { logout } from '../api/auth'

export const Dashboard = () => {
    const { user, userProfile, isAdmin } = useAuth()
    const navigate = useNavigate()

    const handleLogout = async () => {
        try {
            await logout()
            navigate('/login')
        } catch (error) {
            console.error('Logout failed:', error)
        }
    }

    return (
        <div className="min-h-screen bg-surface">
            {/* Header */}
            <header className="border-b border-white/8 bg-surface-container-lowest">
                <div className="mx-auto flex max-w-container-max items-center justify-between px-6 py-6">
                    <div>
                        <h1 className="text-headline-lg font-semibold text-on-surface">Khangardi Academy</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-body-md text-on-surface">{userProfile?.display_name || user?.email}</p>
                            {isAdmin && <p className="text-label-sm text-primary-container">Admin</p>}
                        </div>
                        <button
                            onClick={handleLogout}
                            className="rounded-md border border-white/8 bg-surface-container px-4 py-2 text-body-md font-semibold text-on-surface transition hover:bg-surface-container-high"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="mx-auto max-w-container-max px-6 py-10">
                <section className="mb-12">
                    <h2 className="mb-6 text-headline-md font-semibold text-on-surface">Dashboard</h2>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        <div className="rounded-xl border border-white/8 bg-surface-container-low p-6">
                            <h3 className="text-body-md font-semibold text-on-surface">Courses</h3>
                            <p className="mt-2 text-body-sm text-on-surface-variant">Browse available courses</p>
                            <button
                                onClick={() => navigate('/courses')}
                                className="mt-4 rounded-md bg-primary-container px-4 py-2 text-body-sm font-semibold text-on-primary transition hover:bg-primary"
                            >
                                View Courses
                            </button>
                        </div>

                        {isAdmin && (
                            <>
                                <div className="rounded-xl border border-white/8 bg-surface-container-low p-6">
                                    <h3 className="text-body-md font-semibold text-on-surface">Manage Courses</h3>
                                    <p className="mt-2 text-body-sm text-on-surface-variant">Create and edit courses</p>
                                    <button
                                        onClick={() => navigate('/admin/courses')}
                                        className="mt-4 rounded-md bg-primary-container px-4 py-2 text-body-sm font-semibold text-on-primary transition hover:bg-primary"
                                    >
                                        Go to Manager
                                    </button>
                                </div>

                                <div className="rounded-xl border border-white/8 bg-surface-container-low p-6">
                                    <h3 className="text-body-md font-semibold text-on-surface">Access Requests</h3>
                                    <p className="mt-2 text-body-sm text-on-surface-variant">Review pending requests</p>
                                    <button
                                        onClick={() => navigate('/admin/requests')}
                                        className="mt-4 rounded-md bg-primary-container px-4 py-2 text-body-sm font-semibold text-on-primary transition hover:bg-primary"
                                    >
                                        Review
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </section>
            </main>
        </div>
    )
}
