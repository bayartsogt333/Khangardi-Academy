import { Link } from 'react-router-dom'
import type { UserProfile } from '../types/auth'

type AdminHeaderProps = {
    profile: UserProfile | null | undefined
    onLogout: () => void
    activePage: 'studio' | 'enrollments'
    pendingCount?: number
}

export function AdminHeader({ profile, onLogout, activePage, pendingCount = 0 }: AdminHeaderProps) {
    const displayName = profile?.displayName || 'Admin'
    const email = profile?.email || ''
    const initials = displayName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('') || 'A'

    return (
        <header className="rounded-3xl border border-slate-800/80 bg-slate-900/80 p-5 shadow-2xl shadow-black/30 backdrop-blur xl:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-indigo-400 text-lg font-black text-slate-950">
                        {initials}
                    </div>
                    <div className="space-y-1">
                        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">Admin</span>
                        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{displayName}</h1>
                        <p className="text-sm leading-7 text-slate-300 sm:text-base">{email}</p>
                    </div>
                </div>

                <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:flex-row sm:items-center">
                    <Link
                        to="/learn"
                        className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-medium text-slate-100 transition hover:-translate-y-0.5 hover:border-cyan-400/60 hover:text-white"
                    >
                        Learning space
                    </Link>

                    <Link
                        to="/admin/enrollments"
                        className={`relative rounded-2xl border px-4 py-3 text-sm font-medium transition hover:-translate-y-0.5 hover:border-cyan-400/60 hover:text-white ${activePage === 'enrollments' ? 'border-cyan-400/60 bg-cyan-400/10 text-white' : 'border-slate-700 bg-slate-900 text-slate-100'}`}
                    >
                        Enrollment admin
                        {pendingCount > 0 ? (
                            <span className="absolute -top-2 -right-2 inline-flex items-center justify-center rounded-full bg-rose-500 px-2 py-1 text-xs font-semibold text-white">
                                {pendingCount}
                            </span>
                        ) : null}
                    </Link>

                    <Link
                        to="/admin"
                        className={`rounded-2xl border px-4 py-3 text-sm font-medium transition hover:-translate-y-0.5 hover:border-cyan-400/60 hover:text-white ${activePage === 'studio' ? 'border-cyan-400/60 bg-cyan-400/10 text-white' : 'border-slate-700 bg-slate-900 text-slate-100'}`}
                    >
                        Admin studio
                    </Link>

                    <button
                        type="button"
                        onClick={onLogout}
                        className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-medium text-slate-100 transition hover:-translate-y-0.5 hover:border-cyan-400/60 hover:text-white"
                    >
                        Logout
                    </button>
                </div>
            </div>
        </header>
    )
}