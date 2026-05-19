import { useEffect, useState } from 'react'
import { useNavigate /*, useLocation */ } from 'react-router-dom'
import { loadPublishedCourses } from '../api/courses'
import { useAuth } from '../context/AuthContext'
import type { CourseRecord } from '../types/course'
import SiteHeader from '../components/SiteHeader'
import { BookOpen, CheckCircle2 } from 'lucide-react'

export function LearningHomePage() {
    const { logout, profile } = useAuth()
    const navigate = useNavigate()
    // const location = useLocation()
    // const pathname = location.pathname
    // const isClassroom = pathname.startsWith('/class') || pathname.startsWith('/learn')
    const [courses, setCourses] = useState<CourseRecord[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [openCourseId, setOpenCourseId] = useState('')

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
                    setError(firebaseError.message || 'Failed to load courses.')
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

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100">
            <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
                <SiteHeader profile={profile} onLogout={logout} />

                <section className="grid gap-4 sm:grid-cols-3">
                    <article className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/20">
                        <div className="text-xs uppercase tracking-[0.24em] text-cyan-300">Catalog</div>
                        <div className="mt-3 text-3xl font-semibold text-white">{courses.length}</div>
                        <p className="mt-2 text-sm text-slate-400">Published courses available to students.</p>
                    </article>
                    <article className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/20">
                        <div className="text-xs uppercase tracking-[0.24em] text-cyan-300">Profile</div>
                        <div className="mt-3 flex items-center gap-3 text-3xl font-semibold text-white">
                            <span>{profile?.role}</span>
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(74,222,128,0.15)]" />
                                Active
                            </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-400">Your current access level.</p>
                    </article>
                    <article className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/20">
                        <div className="text-xs uppercase tracking-[0.24em] text-cyan-300">Access</div>
                        <div className="mt-3 flex items-center gap-2 text-3xl font-semibold text-white">
                            <BookOpen className="h-7 w-7 text-cyan-300" />
                            <span>Study</span>
                        </div>
                        <p className="mt-2 text-sm text-slate-400">Continue a course page to request or keep studying.</p>
                    </article>
                </section>

                {error ? (
                    <p className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                        {error}
                    </p>
                ) : null}

                {loading ? (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {Array.from({ length: 6 }).map((_, index) => (
                            <div
                                key={index}
                                className="h-64 animate-pulse rounded-3xl border border-slate-800 bg-slate-900/60"
                            />
                        ))}
                    </div>
                ) : courses.length ? (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {courses.map((course) => (
                            <button
                                key={course.id}
                                type="button"
                                onClick={() => {
                                    setOpenCourseId(course.id)
                                    navigate(`/learn/${course.id}`)
                                }}
                                disabled={openCourseId !== '' && openCourseId !== course.id}
                                className="group overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70 text-left shadow-xl shadow-black/20 transition hover:-translate-y-1 hover:border-cyan-400/40 disabled:cursor-wait"
                            >
                                <div className="relative aspect-[16/9] overflow-hidden bg-slate-950">
                                    {course.thumbnailURL ? (
                                        <img
                                            src={course.thumbnailURL}
                                            alt={course.title}
                                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className="flex h-full items-center justify-center text-sm text-slate-500">
                                            No thumbnail
                                        </div>
                                    )}
                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent p-4">
                                        <span className="inline-flex rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200">
                                            {course.status}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-4 p-5">
                                    <div>
                                        <h2 className="text-xl font-semibold text-white">{course.title}</h2>
                                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-400">
                                            {course.description}
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                                        <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1">
                                            {course.category || 'Category'}
                                        </span>
                                        <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1">
                                            {course.level || 'Level'}
                                        </span>
                                    </div>

                                    <div className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-400 to-indigo-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:from-cyan-300 hover:to-indigo-300">
                                        <span className="inline-flex items-center gap-2">
                                            {openCourseId === course.id ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" /> : null}
                                            <CheckCircle2 className="h-4 w-4" />
                                            <span>Continue course</span>
                                        </span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 text-center shadow-xl shadow-black/20">
                        <h2 className="text-2xl font-semibold text-white">Nothing is live yet</h2>
                        <p className="mt-3 text-sm leading-7 text-slate-400">
                            Ask an admin to publish a course and it will appear here automatically.
                        </p>
                    </div>
                )}
            </section>
        </main>
    )
}
