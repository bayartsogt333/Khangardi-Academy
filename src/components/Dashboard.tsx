import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { AdminEnrollmentPanel } from './AdminEnrollmentPanel'
import { AdminCourseBuilder } from './AdminCourseBuilder'

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
        <section className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
                <header className="rounded-3xl border border-slate-800/80 bg-slate-900/80 p-5 shadow-2xl shadow-black/30 backdrop-blur xl:p-6">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-2">
                            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">Signed in</span>
                            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                                Welcome, {profile?.displayName}
                            </h1>
                            <p className="max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                                {profile?.role === 'admin'
                                    ? 'Administrator access enabled. Manage courses, sections, and lessons below.'
                                    : 'Your learner workspace is ready.'}
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:flex-row sm:items-center">
                            <div className="flex items-center gap-3 rounded-2xl bg-slate-900 px-4 py-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-indigo-400 text-sm font-black text-slate-950">
                                    {initials}
                                </div>
                                <div>
                                    <strong className="block text-sm font-medium text-white">{profile?.displayName}</strong>
                                    <span className="block text-sm text-slate-400">{profile?.email}</span>
                                </div>
                            </div>

                            <Link
                                to={profile?.role === 'admin' ? '/learn' : '/learn'}
                                className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-medium text-slate-100 transition hover:-translate-y-0.5 hover:border-cyan-400/60 hover:text-white"
                            >
                                Learning space
                            </Link>

                            <button
                                type="button"
                                onClick={logout}
                                className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-medium text-slate-100 transition hover:-translate-y-0.5 hover:border-cyan-400/60 hover:text-white"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </header>

                <div className="grid gap-4 md:grid-cols-3">
                    <article className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/20">
                        <span className="text-xs uppercase tracking-[0.24em] text-cyan-300">Role</span>
                        <h2 className="mt-3 text-2xl font-semibold text-white">
                            {profile?.role === 'admin' ? 'Admin studio' : 'Student space'}
                        </h2>
                        <p className="mt-2 text-sm text-slate-400">
                            {profile?.role === 'admin'
                                ? 'Create, edit, delete, and reorder course content.'
                                : 'Browse published courses and continue enrolled lessons.'}
                        </p>
                    </article>

                    <article className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/20">
                        <span className="text-xs uppercase tracking-[0.24em] text-cyan-300">Access</span>
                        <h2 className="mt-3 text-2xl font-semibold text-white">
                            {profile?.role === 'admin' ? 'Full control' : 'Enrollment gated'}
                        </h2>
                        <p className="mt-2 text-sm text-slate-400">
                            Student course trees open after enrollment; admins can preview everything.
                        </p>
                    </article>

                    <article className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/20">
                        <span className="text-xs uppercase tracking-[0.24em] text-cyan-300">Learning</span>
                        <h2 className="mt-3 text-2xl font-semibold text-white">Separate course route</h2>
                        <p className="mt-2 text-sm text-slate-400">
                            Open the catalog and study page from the dedicated learner route.
                        </p>
                    </article>
                </div>

                {profile?.role === 'admin' ? (
                    <div className="grid gap-6">
                        <AdminEnrollmentPanel />
                        <AdminCourseBuilder />
                    </div>
                ) : (
                    <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 text-sm text-slate-400" />
                )}
            </div>
        </section>
    )
}
