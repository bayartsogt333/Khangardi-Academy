import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { AdminCourseBuilder } from './AdminCourseBuilder'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../api/firebase'
import { loadAdminCourses } from '../api/courses'
import { AdminHeader } from './AdminHeader'

export function Dashboard() {
    const { logout, profile } = useAuth()

    const [pendingCount, setPendingCount] = useState(0)

    useEffect(() => {
        if (profile?.role !== 'admin') return

        let cancelled = false
        const unsubs: Array<() => void> = []
        const countsByCourse = new Map<string, number>()

        void loadAdminCourses().then((courses) => {
            if (cancelled) return

            if (!courses.length) {
                setPendingCount(0)
                return
            }

            const updateTotal = () => {
                if (cancelled) return

                const total = Array.from(countsByCourse.values()).reduce((sum, value) => sum + value, 0)
                setPendingCount(total)
            }

            courses.forEach((course) => {
                const courseQuery = query(collection(db, 'courses', course.id, 'enrollments'), where('status', '==', 'pending'))
                const unsub = onSnapshot(courseQuery, (snapshot) => {
                    countsByCourse.set(course.id, snapshot.size)
                    updateTotal()
                })

                unsubs.push(unsub)
            })
        })

        return () => {
            cancelled = true
            unsubs.forEach((unsub) => unsub())
        }
    }, [profile?.role])

    return (
        <section className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
                <AdminHeader profile={profile} onLogout={logout} activePage="studio" pendingCount={pendingCount} />

                <div className="grid gap-6 md:grid-cols-3">
                    <article className="relative overflow-hidden rounded-4xl bg-gradient-to-br from-indigo-800/60 via-cyan-600/30 to-slate-900/70 p-6 shadow-2xl">
                        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-to-br from-white/6 to-white/2 blur-xl opacity-30" />
                        <div className="relative z-10">
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="text-xs uppercase tracking-[0.24em] text-cyan-100">Role</span>
                                    <h2 className="mt-3 text-2xl font-semibold text-white">
                                        {profile?.role === 'admin' ? 'Admin studio' : 'Student space'}
                                    </h2>
                                </div>
                                <div className="rounded-full bg-white/6 px-3 py-1 text-sm font-semibold text-white">Premium</div>
                            </div>
                            <p className="mt-4 text-sm text-slate-200">
                                {profile?.role === 'admin'
                                    ? 'Create, edit, delete, and reorder course content.'
                                    : 'Browse published courses and continue enrolled lessons.'}
                            </p>
                        </div>
                    </article>

                    <article className="relative overflow-hidden rounded-4xl bg-gradient-to-br from-cyan-900/40 via-slate-900/40 to-slate-800/60 p-6 shadow-2xl">
                        <div className="absolute -left-10 -bottom-10 h-36 w-36 rounded-full bg-gradient-to-br from-white/4 to-white/6 blur-lg opacity-25" />
                        <div className="relative z-10">
                            <span className="text-xs uppercase tracking-[0.24em] text-cyan-100">Access</span>
                            <h2 className="mt-3 text-2xl font-semibold text-white">
                                {profile?.role === 'admin' ? 'Full control' : 'Enrollment gated'}
                            </h2>
                            <p className="mt-4 text-sm text-slate-200">
                                Student course trees open after enrollment; admins can preview everything.
                            </p>
                        </div>
                    </article>

                    <article className="relative overflow-hidden rounded-4xl bg-gradient-to-br from-slate-800/60 via-indigo-700/20 to-cyan-700/10 p-6 shadow-2xl">
                        <div className="absolute left-0 top-0 h-2 w-full bg-gradient-to-r from-cyan-400 to-indigo-400 opacity-60" />
                        <div className="relative z-10">
                            <span className="text-xs uppercase tracking-[0.24em] text-cyan-100">Learning</span>
                            <h2 className="mt-3 text-2xl font-semibold text-white">Separate course route</h2>
                            <p className="mt-4 text-sm text-slate-200">
                                Open the catalog and study page from the dedicated learner route.
                            </p>
                        </div>
                    </article>
                </div>

                {profile?.role === 'admin' ? (
                    <div className="grid gap-6">
                        <AdminCourseBuilder />
                    </div>
                ) : (
                    <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 text-sm text-slate-400" />
                )}
            </div>
        </section>
    )
}
