import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import Snowfall from './Snowfall'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Snowflake } from 'lucide-react'
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

    const isHome = pathname === '/' || pathname === '/home'
    const isClassroom = pathname.startsWith('/class') || pathname.startsWith('/learn')
    const isCommunity = pathname.startsWith('/community')
    const isAdmin = pathname.startsWith('/admin')
    const isLessonPage = /^\/learn\/[^/]+\/lessons\/[^/]+$/.test(pathname)

    const displayName = profile?.displayName || 'Гишүүн'
    const initials = useMemo(() => displayName.split(' ').map((s) => s[0]).slice(0, 2).join(''), [displayName])

    const goHome = useCallback(() => navigate('/'), [navigate])
    const goClassroom = useCallback(() => navigate('/classroom'), [navigate])
    const goCommunity = useCallback(() => navigate('/community'), [navigate])
    const goAdmin = useCallback(() => navigate('/admin'), [navigate])
    const goBackFromLesson = useCallback(() => {
        const match = pathname.match(/^\/learn\/([^/]+)\/lessons\/[^/]+$/)
        navigate(match ? `/learn/${match[1]}` : '/classroom')
    }, [navigate, pathname])
    const toggleMobileMenu = useCallback(() => setMobileMenuOpen((current) => !current), [])
    const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), [])
    const toggleSnowfall = useCallback(() => setSnowfallEnabled((current) => !current), [])

    useEffect(() => {
        closeMobileMenu()
    }, [closeMobileMenu, pathname])

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
                    {isLessonPage ? (
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={goBackFromLesson}
                                className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 transition hover:border-cyan-400/60 hover:text-white"
                                aria-label="Буцах"
                                title="Буцах"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </button>
                            <button type="button" onClick={goHome} className="space-y-1 text-left">
                                <div className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">Khangardi Academy</div>
                            </button>
                        </div>
                    ) : (
                        <button type="button" onClick={goHome} className="flex items-center gap-4 text-left">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-cyan-400 to-indigo-400 text-lg font-black text-slate-950">
                                {initials}
                            </div>
                            <div className="space-y-1">
                                <div className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">Khangardi Academy</div>
                                <div className="text-lg font-semibold text-white">Тавтай морил, {displayName}</div>
                            </div>
                        </button>
                    )}
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={toggleSnowfall}
                            aria-pressed={snowfallEnabled}
                            title={snowfallEnabled ? 'Цастай горим унтраах' : 'Цастай горим асаах'}
                            className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-3 text-sm font-medium transition ${snowfallEnabled ? 'border-cyan-400/60 bg-cyan-400/10 text-white' : 'border-slate-700 bg-slate-900 text-slate-100 hover:border-cyan-400/60 hover:text-white'}`}
                        >
                            <Snowflake className={`h-4 w-4 ${snowfallEnabled ? 'animate-pulse text-cyan-200' : 'text-slate-400'}`} />
                            <span className="hidden sm:inline">Цастай горим</span>
                        </button>
                        <button
                            type="button"
                            onClick={toggleMobileMenu}
                            className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-cyan-400/60 hover:text-white"
                            aria-expanded={mobileMenuOpen}
                            aria-label="Цэсийг асаах эсвэл хаах"
                        >
                            {mobileMenuOpen ? 'Хаах' : 'Цэс'}
                        </button>
                    </div>
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
                                    onClick={goHome}
                                    className={`nav-button px-4 py-3 text-sm font-medium ${isHome ? 'active' : ''}`}
                                >
                                    Нүүр
                                </button>

                                <button
                                    type="button"
                                    onClick={goClassroom}
                                    className={`nav-button px-4 py-3 text-sm font-semibold ${isClassroom ? 'active' : ''}`}
                                >
                                    Сургалт
                                </button>

                                <button
                                    type="button"
                                    onClick={goCommunity}
                                    className={`nav-button px-4 py-3 text-sm font-medium ${isCommunity ? 'active' : ''}`}
                                >
                                    Хамт олон
                                </button>

                                {profile?.role === 'admin' ? (
                                    <button
                                        type="button"
                                        onClick={goAdmin}
                                        className={`nav-button px-4 py-3 text-sm font-medium ${isAdmin ? 'active' : ''}`}
                                    >
                                        Админ
                                    </button>
                                ) : null}

                                <button
                                    type="button"
                                    onClick={onLogout}
                                    className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-medium text-slate-100 transition hover:border-cyan-400/60 hover:text-white"
                                >
                                    Гарах
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="hidden flex-col gap-5 lg:flex lg:flex-row lg:items-center lg:justify-between">
                    {isLessonPage ? (
                        <div className="flex items-center gap-4">
                            <button
                                type="button"
                                onClick={goBackFromLesson}
                                className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 transition hover:border-cyan-400/60 hover:text-white"
                                aria-label="Буцах"
                                title="Буцах"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </button>
                            <button type="button" onClick={goHome} className="space-y-1 text-left">
                                <div className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">Khangardi Academy</div>
                                <div className="text-sm font-medium text-slate-300">Хичээлээс буцах</div>
                            </button>
                        </div>
                    ) : (
                        <button type="button" onClick={goHome} className="flex items-center gap-4 text-left">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-cyan-400 to-indigo-400 text-lg font-black text-slate-950">
                                {initials}
                            </div>
                            <div className="space-y-1">
                                <div className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">Khangardi Academy</div>
                                <div className="text-lg font-semibold text-white">Тавтай морил, {displayName}</div>
                            </div>
                        </button>
                    )}

                    <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:flex-row sm:items-center">
                        <button
                            type="button"
                            onClick={goHome}
                            className={`nav-button px-4 py-3 text-sm font-medium ${isHome ? 'active' : ''}`}
                        >
                            Нүүр
                        </button>

                        <button
                            type="button"
                            onClick={goClassroom}
                            className={`nav-button px-4 py-3 text-sm font-semibold ${isClassroom ? 'active' : ''}`}
                        >
                            Сургалт
                        </button>

                        <button
                            type="button"
                            onClick={goCommunity}
                            className={`nav-button px-4 py-3 text-sm font-medium ${isCommunity ? 'active' : ''}`}
                        >
                            Хамт олон
                        </button>

                        {profile?.role === 'admin' ? (
                            <button
                                type="button"
                                onClick={goAdmin}
                                className={`nav-button px-4 py-3 text-sm font-medium ${isAdmin ? 'active' : ''}`}
                            >
                                Админ
                            </button>
                        ) : null}

                        <button
                            type="button"
                            onClick={onLogout}
                            className={`nav-button px-4 py-3 text-sm font-medium`}
                        >
                            Гарах
                        </button>
                        <button
                            type="button"
                            onClick={toggleSnowfall}
                            aria-pressed={snowfallEnabled}
                            title={snowfallEnabled ? 'Disable winter mode' : 'Enable winter mode'}
                            className={`ml-2 inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm transition ${snowfallEnabled ? 'border-cyan-400/60 bg-cyan-400/10 text-white' : 'border-slate-700 bg-slate-900 text-slate-100 hover:border-cyan-400/60 hover:text-white'}`}
                        >
                            <Snowflake className={`h-4 w-4 ${snowfallEnabled ? 'animate-pulse text-cyan-200' : 'text-slate-400'}`} />
                        </button>
                    </div>
                </div>
            </header>
        </>
    )
}

export default memo(SiteHeader)
