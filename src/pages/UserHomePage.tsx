import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate /*, useLocation */ } from 'react-router-dom'
import { loadPublishedCourses } from '../api/courses'
import { useAuth } from '../context/AuthContext'
import type { CourseRecord } from '../types/course'
import SiteHeader from '../components/SiteHeader'

function ArrowIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 shrink-0">
            <path fill="currentColor" d="M13.5 5 12.1 6.4l4.1 4.1H4v2h12.2l-4.1 4.1L13.5 18 20 11.5 13.5 5Z" />
        </svg>
    )
}

export function UserHomePage() {
    const { profile, logout } = useAuth()
    const navigate = useNavigate()
    const [courses, setCourses] = useState<CourseRecord[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [busyRoute, setBusyRoute] = useState<'classroom' | 'community' | 'admin' | 'home' | ''>('')

    useEffect(() => {
        let active = true

        void (async () => {
            try {
                const nextCourses = await loadPublishedCourses()
                if (active) {
                    setCourses(nextCourses)
                }
            } catch (courseError) {
                const firebaseError = courseError as { message?: string }
                if (active) {
                    setError(firebaseError.message || 'Хичээлүүдийг ачаалж чадсангүй.')
                }
            } finally {
                if (active) {
                    setLoading(false)
                }
            }
        })()

        return () => {
            active = false
        }
    }, [])

    const featuredCourses = useMemo(() => courses.slice(0, 3), [courses])

    // const location = useLocation()

    const handleNavigate = useCallback(
        (route: 'classroom' | 'community' | 'admin' | 'home') => {
            if (busyRoute) return

            setBusyRoute(route)
            if (route === 'admin') navigate('/admin')
            else if (route === 'classroom') navigate('/classroom')
            else if (route === 'community') navigate('/community')
            else navigate('/')
        },
        [busyRoute, navigate],
    )

    // const pathname = location.pathname
    // const isClassroom = pathname.startsWith('/class') || pathname.startsWith('/learn')
    // const isCommunity = pathname.startsWith('/community')


    return (
        <main className="min-h-screen bg-slate-950 text-slate-100">
            <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
                <SiteHeader profile={profile} onLogout={logout} />

                {error ? (
                    <p className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                        {error}
                    </p>
                ) : null}

                <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                    <article className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-black/20">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">Сургалтын орчин</span>
                                <h2 className="mt-2 text-2xl font-semibold text-white">Сургалтаа үргэлжлүүлээрэй</h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleNavigate('classroom')}
                                className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-medium text-slate-100 transition hover:-translate-y-0.5 hover:border-cyan-400/60 hover:text-white"
                            >
                                <ArrowIcon />
                                <span>Сургалт</span>
                            </button>
                        </div>

                        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {loading ? (
                                Array.from({ length: 3 }).map((_, index) => (
                                    <div key={index} className="h-64 animate-pulse rounded-3xl border border-slate-800 bg-slate-950/60" />
                                ))
                            ) : featuredCourses.length ? (
                                featuredCourses.map((course) => (
                                    <div key={course.id} className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/70">
                                        <div className="relative aspect-video bg-slate-950">
                                            {course.thumbnailURL ? (
                                                <img src={course.thumbnailURL} alt={course.title} className="h-full w-full object-cover" />
                                            ) : (
                                                <div className="flex h-full items-center justify-center text-sm text-slate-500">Зураггүй</div>
                                            )}
                                        </div>
                                        <div className="space-y-3 p-4">
                                            <div>
                                                <h3 className="text-lg font-semibold text-white">{course.title}</h3>
                                                <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-400">{course.description}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleNavigate('classroom')}
                                                className="inline-flex items-center gap-2 rounded-2xl bg-linear-to-r from-cyan-400 to-indigo-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:from-cyan-300 hover:to-indigo-300"
                                            >
                                                <span>Сургалт руу очих</span>
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6 text-sm text-slate-400 md:col-span-2 xl:col-span-3">
                                    Одоогоор нийтлэгдсэн хичээл алга.
                                </div>
                            )}
                        </div>
                    </article>

                    <article className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-black/20">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">Хамт олон</span>
                                <h2 className="mt-2 text-2xl font-semibold text-white">Холбоотой байгаарай</h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleNavigate('community')}
                                className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-medium text-slate-100 transition hover:-translate-y-0.5 hover:border-cyan-400/60 hover:text-white"
                            >
                                <ArrowIcon />
                                <span>Хамт олон</span>
                            </button>
                        </div>

                        <div className="mt-5 space-y-4">
                            <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
                                <div className="text-sm font-semibold text-white">Зар мэдээ</div>
                                <p className="mt-2 text-sm leading-6 text-slate-400">
                                    Шинэ пост, хичээлийн шинэчлэлт, хамтын орчны зурвасууд энд харагдана.
                                </p>
                            </div>
                            <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
                                <div className="text-sm font-semibold text-white">Суралцах бүлгүүд</div>
                                <p className="mt-2 text-sm leading-6 text-slate-400">
                                    Хамтын орчноос ангийнхан, багийнхаа гишүүдийг олж, явцаа хуваалцаарай.
                                </p>
                            </div>
                            <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
                                <div className="text-sm font-semibold text-white">Түргэн хандалт</div>
                                <p className="mt-2 text-sm leading-6 text-slate-400">
                                    Дээд цэсний товчлуураар хүссэн үедээ сургалтын орчин эсвэл хамтын орчин руу шилжинэ.
                                </p>
                            </div>
                        </div>
                    </article>
                </section>
            </section>
        </main>
    )
}
