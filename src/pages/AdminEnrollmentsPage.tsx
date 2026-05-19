import { useCallback, useEffect, useMemo, useState } from 'react'
import { approveEnrollment, loadCourseEnrollments, rejectEnrollment, removeEnrollment } from '../api/enrollments'
import { loadAllUsers } from '../api/users'
import { loadAdminCourses } from '../api/courses'
import type { CourseRecord, EnrollmentRecord } from '../types/course'
import type { UserProfile } from '../types/auth'
import { collection, onSnapshot, query } from 'firebase/firestore'
import { db } from '../api/firebase'
import { AdminHeader } from '../components/AdminHeader'
import { useAuth } from '../context/AuthContext'

export function AdminEnrollmentsPage() {
    const { profile, logout } = useAuth()
    const [courses, setCourses] = useState<CourseRecord[]>([])
    const [users, setUsers] = useState<UserProfile[]>([])
    const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([])
    const [loading, setLoading] = useState(true)
    const [busyId, setBusyId] = useState('')
    const [error, setError] = useState('')
    const [view, setView] = useState<'pending' | 'all'>('pending')

    const refresh = useCallback(async () => {
        setLoading(true)
        setError('')

        try {
            const [nextCourses, nextUsers] = await Promise.all([loadAdminCourses(), loadAllUsers()])
            setCourses(nextCourses)
            setUsers(nextUsers)

            // Load enrollments for all courses and flatten them so pending requests show in one list
            const enrollmentsByCourse = await Promise.all(nextCourses.map((c) => loadCourseEnrollments(c.id)))
            const allEnrollments = enrollmentsByCourse.flat()
            setEnrollments(allEnrollments)
        } catch (panelError) {
            const firebaseError = panelError as { message?: string }
            setError(firebaseError.message || 'Failed to load enrollment page.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        void refresh()

        let cancelled = false
        const unsubs: Array<() => void> = []
        const latestByCourse = new Map<string, EnrollmentRecord[]>()

        void loadAdminCourses().then((loadedCourses) => {
            if (cancelled) return

            loadedCourses.forEach((course) => {
                const courseQuery = query(collection(db, 'courses', course.id, 'enrollments'))
                const unsub = onSnapshot(courseQuery, (snapshot) => {
                    if (cancelled) return

                    const courseEnrollments = snapshot.docs.map((docItem) => ({

                        ...(docItem.data() as EnrollmentRecord), id: docItem.id,
                    })) as EnrollmentRecord[]

                    latestByCourse.set(course.id, courseEnrollments)
                    setEnrollments(Array.from(latestByCourse.values()).flat())
                }, (err) => {
                    if (!cancelled) {
                        setError(err.message || 'Failed to subscribe to enrollments.')
                    }
                })

                unsubs.push(unsub)
            })
        })

        return () => {
            cancelled = true
            unsubs.forEach((unsub) => unsub())
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Map userId -> array of enrollments (across courses)
    const pendingEnrollments = useMemo(() => enrollments.filter((item) => item.status === 'pending'), [enrollments])
    const approvedEnrollments = useMemo(() => enrollments.filter((item) => item.status === 'approved'), [enrollments])
    const rejectedEnrollments = useMemo(() => enrollments.filter((item) => item.status === 'rejected'), [enrollments])

    const coursesById = useMemo(() => {
        const map = new Map<string, CourseRecord>()
        for (const course of courses) {
            map.set(course.id, course)
        }
        return map
    }, [courses])

    const enrollmentByUser = useMemo(() => {
        const map = new Map<string, EnrollmentRecord[]>()
        for (const e of enrollments) {
            const list = map.get(e.userId) ?? []
            list.push(e)
            map.set(e.userId, list)
        }
        return map
    }, [enrollments])

    const handleApprove = useCallback(async (courseIdParam: string, userId: string) => {
        if (!courseIdParam) return

        setBusyId(`${courseIdParam}:${userId}`)
        setError('')

        try {
            await approveEnrollment(courseIdParam, userId)
            await refresh()
        } catch (actionError) {
            const firebaseError = actionError as { message?: string }
            setError(firebaseError.message || 'Failed to approve enrollment.')
        } finally {
            setBusyId('')
        }
    }, [refresh])

    const handleReject = useCallback(async (courseIdParam: string, userId: string) => {
        if (!courseIdParam) return

        setBusyId(`${courseIdParam}:${userId}`)
        setError('')

        try {
            await rejectEnrollment(courseIdParam, userId)
            await refresh()
        } catch (actionError) {
            const firebaseError = actionError as { message?: string }
            setError(firebaseError.message || 'Failed to reject enrollment.')
        } finally {
            setBusyId('')
        }
    }, [refresh])

    const handleRevoke = useCallback(async (courseIdParam: string, userId: string) => {
        if (!courseIdParam) return

        setBusyId(`${courseIdParam}:${userId}`)
        setError('')

        try {
            await removeEnrollment(courseIdParam, userId)
            await refresh()
        } catch (actionError) {
            const firebaseError = actionError as { message?: string }
            setError(firebaseError.message || 'Failed to revoke enrollment.')
        } finally {
            setBusyId('')
        }
    }, [refresh])

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100">
            <section className="relative z-10 mx-auto w-full max-w-7xl px-4 py-6">
                <AdminHeader profile={profile} onLogout={logout} activePage="enrollments" pendingCount={pendingEnrollments.length} />

                {loading ? (
                    <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
                        Loading courses and users…
                    </div>
                ) : null}

                <div className="mt-4 rounded-3xl border border-slate-800/80 bg-gradient-to-br from-slate-900/90 to-slate-950/90 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-2xl">
                            <div className="inline-flex items-center rounded-full border border-cyan-400/20 bg-cyan-400/8 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-200">
                                Enrollment admin
                            </div>
                            <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">Manage access and requests</h2>
                            <p className="mt-2 text-sm leading-7 text-slate-400">
                                Pending requests stay front and center. Switch to all users when you need to grant or revoke access directly.
                            </p>
                        </div>

                        <div className="flex gap-2 rounded-2xl border border-slate-800 bg-slate-950/70 p-2">
                            <button
                                type="button"
                                onClick={() => setView('pending')}
                                className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${view === 'pending' ? 'bg-cyan-400/10 text-white ring-1 ring-cyan-400/20' : 'text-slate-300 hover:bg-slate-900 hover:text-white'}`}
                            >
                                Pending
                            </button>
                            <button
                                type="button"
                                onClick={() => setView('all')}
                                className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${view === 'all' ? 'bg-cyan-400/10 text-white ring-1 ring-cyan-400/20' : 'text-slate-300 hover:bg-slate-900 hover:text-white'}`}
                            >
                                All users
                            </button>
                        </div>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                            <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Pending</div>
                            <div className="mt-2 text-2xl font-semibold text-white">{pendingEnrollments.length}</div>
                        </div>
                        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                            <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Approved</div>
                            <div className="mt-2 text-2xl font-semibold text-white">{approvedEnrollments.length}</div>
                        </div>
                        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                            <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Rejected</div>
                            <div className="mt-2 text-2xl font-semibold text-white">{rejectedEnrollments.length}</div>
                        </div>
                    </div>
                </div>

                {error ? <p className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</p> : null}

                <div className="mt-4 grid gap-4">
                    {view === 'pending' ? (
                        <div className="space-y-3">
                            <h2 className="text-lg font-semibold text-white">Pending requests</h2>
                            {pendingEnrollments.length ? (
                                <ul className="grid gap-3">
                                    {pendingEnrollments.map((item) => (
                                        <li key={`${item.courseId}:${item.userId}`} className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4 shadow-[0_18px_40px_rgba(0,0,0,0.16)] transition-colors hover:border-slate-700">
                                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="text-sm font-semibold text-white">{item.displayName || item.email || item.userId}</span>
                                                        <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.24em] text-cyan-200">
                                                            Pending
                                                        </span>
                                                    </div>
                                                    <div className="mt-2 text-sm text-slate-400">
                                                        requested access to <span className="text-slate-200">{coursesById.get(item.courseId)?.title || item.courseId}</span>
                                                    </div>
                                                </div>

                                                <div className="flex gap-2 self-start lg:self-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleApprove(item.courseId, item.userId)}
                                                        disabled={busyId === `${item.courseId}:${item.userId}`}
                                                        className="rounded-2xl bg-gradient-to-r from-cyan-400 to-indigo-400 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:from-cyan-300 hover:to-indigo-300 disabled:cursor-wait disabled:opacity-60"
                                                    >
                                                        {busyId === `${item.courseId}:${item.userId}` ? 'Approving…' : 'Approve'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleReject(item.courseId, item.userId)}
                                                        disabled={busyId === `${item.courseId}:${item.userId}`}
                                                        className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-100 transition hover:border-rose-400/40 hover:bg-rose-500/15 disabled:cursor-wait disabled:opacity-60"
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-4 text-sm text-slate-400">No pending requests.</p>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <h2 className="text-lg font-semibold text-white">All users</h2>
                            {users.length ? users.map((user) => {
                                const userEnrollments = enrollmentByUser.get(user.uid) ?? []

                                return (
                                    <div key={user.uid} className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4 shadow-[0_16px_36px_rgba(0,0,0,0.12)]">
                                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                            <div>
                                                <div className="font-semibold text-white">{user.displayName}</div>
                                                <div className="text-sm text-slate-400">{user.email}</div>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2">
                                                {courses.map((c) => {
                                                    const enrollment = userEnrollments.find((ue) => ue.courseId === c.id) ?? null
                                                    const status = enrollment?.status ?? 'none'
                                                    const short = c.title.length > 18 ? `${c.title.slice(0, 15)}…` : c.title

                                                    return (
                                                        <div key={c.id} className="flex items-center gap-2 whitespace-nowrap rounded-full border border-slate-800 bg-slate-950/70 px-3 py-1 text-xs font-medium">
                                                            <span className={`${status === 'approved' ? 'text-emerald-300' : status === 'pending' ? 'text-amber-300' : 'text-slate-500'}`}>{status === 'approved' ? '✓' : status === 'pending' ? '…' : '—'}</span>
                                                            <span className="text-slate-200">{short}</span>
                                                            {status === 'approved' ? (
                                                                <button type="button" onClick={() => handleRevoke(c.id, user.uid)} disabled={busyId === `${c.id}:${user.uid}`} className="ml-1 rounded-full border border-rose-500/20 bg-rose-500/10 px-2 py-1 text-[10px] text-rose-100 transition hover:border-rose-400/40 disabled:cursor-wait disabled:opacity-60">Revoke</button>
                                                            ) : (
                                                                <button type="button" onClick={() => handleApprove(c.id, user.uid)} disabled={busyId === `${c.id}:${user.uid}`} className="ml-1 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 text-[10px] text-cyan-100 transition hover:border-cyan-300/40 disabled:cursor-wait disabled:opacity-60">Grant</button>
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )
                            }) : (
                                <p className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-4 text-sm text-slate-400">No users found.</p>
                            )}
                        </div>
                    )}
                </div>
            </section>
        </main>
    )
}
