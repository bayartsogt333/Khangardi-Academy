import { useEffect, useState } from 'react'
import Snowfall from './Snowfall'
import { useNavigate, useLocation } from 'react-router-dom'
import type { UserProfile } from '../types/auth'

type SiteHeaderProps = {
    profile: UserProfile | null | undefined
    onLogout: () => void
}

export function SiteHeader({ profile, onLogout }: SiteHeaderProps) {
    const navigate = useNavigate()
    const location = useLocation()
    const pathname = location.pathname
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    const isHome = pathname === '/'
    const isClassroom = pathname.startsWith('/class') || pathname.startsWith('/learn')
    const isCommunity = pathname.startsWith('/community')
    const isAdmin = pathname.startsWith('/admin')

    const displayName = profile?.displayName || 'Member'

    useEffect(() => {
        setMobileMenuOpen(false)
    }, [pathname])

    const [snowfallEnabled, setSnowfallEnabled] = useState<boolean>(() => {
        try {
            const raw = localStorage.getItem('khangardi.snowfall')
            return raw === '1'
        } catch {
            return false
        }
    })

    useEffect(() => {
        try {
            localStorage.setItem('khangardi.snowfall', snowfallEnabled ? '1' : '0')
        } catch { }
    }, [snowfallEnabled])

    return (
        <>
            {snowfallEnabled ? <Snowfall /> : null}
            <header className="relative z-10 rounded-3xl border border-slate-800/80 bg-slate-900/80 p-5 shadow-2xl shadow-black/30 backdrop-blur xl:p-6">
                <div className="flex items-center justify-between gap-4 lg:hidden">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-indigo-400 text-lg font-black text-slate-950">
                            {displayName.split(' ').map((s) => s[0]).slice(0, 2).join('')}
                        </div>
                        <div className="space-y-1">
                            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">Khangardi Academy</div>
                            <div className="text-lg font-semibold text-white">Welcome, {displayName}</div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setMobileMenuOpen((current) => !current)}
                        className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-cyan-400/60 hover:text-white"
                        aria-expanded={mobileMenuOpen}
                        aria-label="Toggle navigation menu"
                    >
                        {mobileMenuOpen ? 'Close' : 'Menu'}
                    </button>
                </div>

                <div
                    className={`grid overflow-hidden transition-all duration-300 ease-out lg:hidden ${mobileMenuOpen ? 'mt-5 grid-rows-[1fr] opacity-100' : 'mt-0 grid-rows-[0fr] opacity-0'}`}
                    aria-hidden={!mobileMenuOpen}
                >
                    <div className="min-h-0">
                        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                            <div className="flex flex-col gap-3">
                                <button
                                    type="button"
                                    onClick={() => navigate('/')}
                                    className={`rounded-2xl px-4 py-3 text-sm font-medium transition ${isHome ? 'border-cyan-400/60 bg-cyan-400/10 text-white' : 'border border-slate-700 bg-slate-900 text-slate-100 hover:border-cyan-400/60 hover:text-white'}`}
                                >
                                    Home
                                </button>

                                <button
                                    type="button"
                                    onClick={() => navigate('/classroom')}
                                    className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${isClassroom ? 'border-cyan-400/60 bg-cyan-400/10 text-white' : 'border border-slate-700 bg-slate-900 text-slate-100 hover:border-cyan-400/60 hover:text-white'}`}
                                >
                                    Classroom
                                </button>

                                <button
                                    type="button"
                                    onClick={() => navigate('/community')}
                                    className={`rounded-2xl px-4 py-3 text-sm font-medium transition ${isCommunity ? 'border-cyan-400/60 bg-cyan-400/10 text-white' : 'border border-slate-700 bg-slate-900 text-slate-100 hover:border-cyan-400/60 hover:text-white'}`}
                                >
                                    Community
                                </button>

                                {profile?.role === 'admin' ? (
                                    <button
                                        type="button"
                                        onClick={() => navigate('/admin')}
                                        className={`rounded-2xl px-4 py-3 text-sm font-medium transition ${isAdmin ? 'border-cyan-400/60 bg-cyan-400/10 text-white' : 'border border-slate-700 bg-slate-900 text-slate-100 hover:border-cyan-400/60 hover:text-white'}`}
                                    >
                                        Admin
                                    </button>
                                ) : null}

                                <button
                                    type="button"
                                    onClick={onLogout}
                                    className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-medium text-slate-100 transition hover:border-cyan-400/60 hover:text-white"
                                >
                                    Logout
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="hidden flex-col gap-5 lg:flex lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-indigo-400 text-lg font-black text-slate-950">
                            {displayName.split(' ').map((s) => s[0]).slice(0, 2).join('')}
                        </div>
                        <div className="space-y-1">
                            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">Khangardi Academy</div>
                            <div className="text-lg font-semibold text-white">Welcome, {displayName}</div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:flex-row sm:items-center">
                        <button
                            type="button"
                            onClick={() => navigate('/')}
                            className={`rounded-2xl px-4 py-3 text-sm font-medium transition ${isHome ? 'border-cyan-400/60 bg-cyan-400/10 text-white' : 'border border-slate-700 bg-slate-900 text-slate-100 hover:-translate-y-0.5 hover:border-cyan-400/60 hover:text-white'}`}
                        >
                            Home
                        </button>

                        <button
                            type="button"
                            onClick={() => navigate('/classroom')}
                            className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${isClassroom ? 'border-cyan-400/60 bg-cyan-400/10 text-white' : 'border border-slate-700 bg-slate-900 text-slate-100 hover:-translate-y-0.5 hover:border-cyan-400/60 hover:text-white'}`}
                        >
                            Classroom
                        </button>

                        <button
                            type="button"
                            onClick={() => navigate('/community')}
                            className={`rounded-2xl px-4 py-3 text-sm font-medium transition ${isCommunity ? 'border-cyan-400/60 bg-cyan-400/10 text-white' : 'border border-slate-700 bg-slate-900 text-slate-100 hover:-translate-y-0.5 hover:border-cyan-400/60 hover:text-white'}`}
                        >
                            Community
                        </button>

                        {profile?.role === 'admin' ? (
                            <button
                                type="button"
                                onClick={() => navigate('/admin')}
                                className={`rounded-2xl px-4 py-3 text-sm font-medium transition ${isAdmin ? 'border-cyan-400/60 bg-cyan-400/10 text-white' : 'border border-slate-700 bg-slate-900 text-slate-100 hover:-translate-y-0.5 hover:border-cyan-400/60 hover:text-white'}`}
                            >
                                Admin
                            </button>
                        ) : null}

                        <button
                            type="button"
                            onClick={onLogout}
                            className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-medium text-slate-100 transition hover:-translate-y-0.5 hover:border-cyan-400/60 hover:text-white"
                        >
                            Logout
                        </button>
                        <button
                            type="button"
                            onClick={() => setSnowfallEnabled((s) => !s)}
                            aria-pressed={snowfallEnabled}
                            title={snowfallEnabled ? 'Disable snowfall' : 'Enable snowfall'}
                            className={`ml-2 rounded-2xl border px-3 py-2 text-sm transition ${snowfallEnabled ? 'border-cyan-400/60 bg-cyan-400/10 text-white' : 'border-slate-700 bg-slate-900 text-slate-100 hover:border-cyan-400/60 hover:text-white'}`}
                        >
                            ❄️
                        </button>
                    </div>
                </div>
            </header>
        </>
    )
}

export default SiteHeader
