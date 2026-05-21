import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { UserProfile } from '../types/auth'

type AdminHeaderProps = {
    profile: UserProfile | null | undefined
    onLogout: () => void
    activePage: 'studio' | 'enrollments'
    pendingCount?: number
}

export function AdminHeader({ profile, onLogout, activePage, pendingCount = 0 }: AdminHeaderProps) {
    const navigate = useNavigate()

    const displayName = profile?.displayName || 'Админ'
    const email = profile?.email || ''
    const initials = useMemo(() => {
        return (
            displayName
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0]?.toUpperCase() ?? '')
                .join('') || 'A'
        )
    }, [displayName])

    const navButtonClass = (isActive: boolean) =>
        `min-w-[10rem] flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-medium transition-colors ${isActive ? 'bg-cyan-400/12 text-white ring-1 ring-cyan-400/25' : 'bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white'
        }`

    return (
        <header className="rounded-3xl border border-slate-800/80 bg-slate-950/80 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.24)] xl:p-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-indigo-400 text-lg font-black text-slate-950 shadow-lg shadow-cyan-500/15">
                        {initials}
                    </div>
                    <div className="space-y-1">
                        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/8 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-200">
                            Админы самбар
                        </div>
                        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{displayName}</h1>
                        <p className="text-sm leading-7 text-slate-300 sm:text-base">{email}</p>
                    </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 xl:flex xl:flex-row xl:items-center">
                    <button
                        type="button"
                        onClick={() => navigate('/admin')}
                        className={navButtonClass(activePage === 'studio')}
                    >
                        Курсийн студи
                    </button>

                    <button
                        type="button"
                        onClick={() => navigate('/admin/enrollments')}
                        className={navButtonClass(activePage === 'enrollments')}
                    >
                        <span className="inline-flex items-center">
                            <span>Бүртгэлийн удирдлага</span>
                            <span className={`ml-2 inline-flex w-8 items-center justify-center rounded-full px-2 py-1 text-xs font-semibold text-white ${pendingCount > 0 ? 'bg-rose-500' : 'bg-transparent'}`} aria-hidden>
                                {pendingCount > 0 ? pendingCount : <span className="opacity-0">0</span>}
                            </span>
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => navigate('/classroom')}
                        className={navButtonClass(false)}
                    >
                        <span>Сургалт</span>
                    </button>

                    <button
                        type="button"
                        onClick={onLogout}
                        className="min-w-[10rem] rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-slate-200 transition-colors hover:bg-rose-500/10 hover:text-white"
                    >
                        Гарах
                    </button>
                </div>
            </div>
        </header>
    )
}