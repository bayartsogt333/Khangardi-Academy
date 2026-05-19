import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import type { UserProfile } from '../types/auth'

type AdminHeaderProps = {
    profile: UserProfile | null | undefined
    onLogout: () => void
    activePage: 'studio' | 'enrollments'
    pendingCount?: number
}

export function AdminHeader({ profile, onLogout, activePage, pendingCount = 0 }: AdminHeaderProps) {
    const navigate = useNavigate()
    const [busyTarget, setBusyTarget] = useState<string | null>(null)

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
                    <button
                        type="button"
                        onClick={() => {
                            setBusyTarget('/classroom')
                            navigate('/classroom')
                        }}
                        disabled={(busyTarget !== null && busyTarget !== '/classroom')}
                        className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-medium text-slate-100 transition hover:-translate-y-0.5 hover:border-cyan-400/60 hover:text-white"
                    >
                        <span className="inline-flex items-center gap-2">
                            {busyTarget === '/classroom' ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" /> : null}
                            <span>Learning space</span>
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            if (activePage === 'enrollments') return
                            setBusyTarget('/admin/enrollments')
                            navigate('/admin/enrollments')
                        }}
                        disabled={activePage === 'enrollments' || (busyTarget !== null && busyTarget !== '/admin/enrollments')}
                        className={`relative rounded-2xl border px-4 py-3 text-sm font-medium transition hover:-translate-y-0.5 hover:border-cyan-400/60 hover:text-white ${activePage === 'enrollments' ? 'border-cyan-400/60 bg-cyan-400/10 text-white' : 'border-slate-700 bg-slate-900 text-slate-100'}`}
                    >
                        <span className="inline-flex items-center gap-2">
                            {busyTarget === '/admin/enrollments' ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" /> : null}
                            <span>Enrollment admin</span>
                        </span>
                        {pendingCount > 0 ? (
                            <span className="absolute -top-2 -right-2 inline-flex items-center justify-center rounded-full bg-rose-500 px-2 py-1 text-xs font-semibold text-white">
                                {pendingCount}
                            </span>
                        ) : null}
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            if (activePage === 'studio') return
                            setBusyTarget('/admin')
                            navigate('/admin')
                        }}
                        disabled={activePage === 'studio' || (busyTarget !== null && busyTarget !== '/admin')}
                        className={`rounded-2xl border px-4 py-3 text-sm font-medium transition hover:-translate-y-0.5 hover:border-cyan-400/60 hover:text-white ${activePage === 'studio' ? 'border-cyan-400/60 bg-cyan-400/10 text-white' : 'border-slate-700 bg-slate-900 text-slate-100'}`}
                    >
                        <span className="inline-flex items-center gap-2">
                            {busyTarget === '/admin' ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" /> : null}
                            <span>Admin studio</span>
                        </span>
                    </button>

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