import { useEffect, useMemo, useState } from 'react'
import { approveEnrollment, loadCourseEnrollments, rejectEnrollment, removeEnrollment } from '../api/enrollments'
import { loadAllUsers } from '../api/users'
import { loadAdminCourses } from '../api/courses'
import type { CourseRecord, EnrollmentRecord } from '../types/course'
import type { UserProfile } from '../types/auth'
import { Link } from 'react-router-dom'
import { collectionGroup, onSnapshot } from 'firebase/firestore'
import { db } from '../api/firebase'

export function AdminEnrollmentsPage() {
    const [courses, setCourses] = useState<CourseRecord[]>([])
    const [users, setUsers] = useState<UserProfile[]>([])
    const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([])
    const [courseId, setCourseId] = useState('')
    const [loading, setLoading] = useState(true)
    const [busyId, setBusyId] = useState('')
    const [error, setError] = useState('')
    const [view, setView] = useState<'pending' | 'all'>('pending')

    const refresh = async (preferredCourseId?: string) => {
        setLoading(true)
        setError('')

        try {
            const [nextCourses, nextUsers] = await Promise.all([loadAdminCourses(), loadAllUsers()])
            setCourses(nextCourses)
            setUsers(nextUsers)

            const nextCourseId = preferredCourseId || courseId || nextCourses[0]?.id || ''
            setCourseId(nextCourseId)

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
    }

    useEffect(() => {
        void refresh()

        // subscribe to live enrollment updates across all courses
        const unsub = onSnapshot(collectionGroup(db, 'enrollments'), (snapshot) => {
            const live = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as EnrollmentRecord[]
            setEnrollments(live)
        }, (err) => {
            setError(err.message || 'Failed to subscribe to enrollments.')
        })

        return () => unsub()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Map userId -> array of enrollments (across courses)
    const enrollmentByUser = useMemo(() => {
        const map = new Map<string, EnrollmentRecord[]>()
        for (const e of enrollments) {
            const list = map.get(e.userId) ?? []
            list.push(e)
            map.set(e.userId, list)
        }
        return map
    }, [enrollments])

    const handleApprove = async (courseIdParam: string, userId: string) => {
        if (!courseIdParam) return

        setBusyId(`${courseIdParam}:${userId}`)
        setError('')

        try {
            await approveEnrollment(courseIdParam, userId)
            await refresh(courseIdParam)
        } catch (actionError) {
            const firebaseError = actionError as { message?: string }
            setError(firebaseError.message || 'Failed to approve enrollment.')
        } finally {
            setBusyId('')
        }
    }

    const handleReject = async (courseIdParam: string, userId: string) => {
        if (!courseIdParam) return

        setBusyId(`${courseIdParam}:${userId}`)
        setError('')

        try {
            await rejectEnrollment(courseIdParam, userId)
            await refresh(courseIdParam)
        } catch (actionError) {
            const firebaseError = actionError as { message?: string }
            setError(firebaseError.message || 'Failed to reject enrollment.')
        } finally {
            setBusyId('')
        }
    }

    const handleRevoke = async (courseIdParam: string, userId: string) => {
        if (!courseIdParam) return

        setBusyId(`${courseIdParam}:${userId}`)
        setError('')

        try {
            await removeEnrollment(courseIdParam, userId)
            await refresh(courseIdParam)
        } catch (actionError) {
            const firebaseError = actionError as { message?: string }
            setError(firebaseError.message || 'Failed to revoke enrollment.')
        } finally {
            setBusyId('')
        }
    }

    if (loading) {
        return (
            <main className="min-h-screen bg-slate-950 text-slate-100">
                <section className="mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-4 py-8">
                    <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 text-center shadow-2xl shadow-black/30">
                        <div className="text-xs uppercase tracking-[0.3em] text-cyan-300">Enrollment admin</div>
                        <h1 className="mt-3 text-3xl font-semibold text-white">Loading…</h1>
                        <p className="mt-3 text-sm leading-7 text-slate-400">Fetching courses and users.</p>
                        <p className="mt-4 text-sm text-slate-400">Return to <Link to="/admin">Admin studio</Link>.</p>
                    </div>
                </section>
            </main>
        )
    }

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100">
            <section className="mx-auto w-full max-w-7xl px-4 py-6">
                <header className="mb-6 rounded-3xl border border-slate-800/80 bg-slate-900/80 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">Enrollment admin</div>
                            <h1 className="mt-2 text-2xl font-semibold text-white">Manage access and requests</h1>
                            <p className="mt-1 text-sm text-slate-400">Default view shows pending requests; switch to all users to grant access directly.</p>
                        </div>
                        <div>
                            <Link to="/admin" className="text-sm text-slate-300">← Admin studio</Link>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300">
                                <button
                                    onClick={() => setView('pending')}
                                    className={`${view === 'pending' ? 'font-semibold text-white' : 'text-slate-300'}`}
                                >Pending</button>
                                <button
                                    onClick={() => setView('all')}
                                    className={`ml-3 ${view === 'all' ? 'font-semibold text-white' : 'text-slate-300'}`}
                                >All users</button>
                            </div>
                        </div>
                    </div>
                </header>

                {error ? <p className="mb-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</p> : null}

                <div className="grid gap-4">
                    {view === 'pending' ? (
                        <div className="space-y-3">
                            <h2 className="text-lg font-semibold text-white">Pending requests</h2>
                            {enrollments.filter((e) => e.status === 'pending').length ? (
                                <ul className="space-y-2">
                                    {enrollments
                                        .filter((e) => e.status === 'pending')
                                        .map((item) => (
                                            <li key={`${item.courseId}:${item.userId}`} className="flex items-center justify-between gap-3">
                                                <div className="text-sm text-slate-200">
                                                    • {item.displayName || item.email || item.userId}
                                                    <span className="ml-2 text-xs text-slate-400">requested</span>
                                                    <span className="mx-2 text-xs text-slate-300">{courses.find(c => c.id === item.courseId)?.title || item.courseId}</span>
                                                </div>

                                                <div className="flex gap-2">
                                                    <button onClick={() => handleApprove(item.courseId, item.userId)} disabled={busyId === `${item.courseId}:${item.userId}`} className="rounded-full bg-gradient-to-r from-cyan-400 to-indigo-400 px-3 py-1 text-xs font-semibold text-slate-950">{busyId === `${item.courseId}:${item.userId}` ? '…' : 'Approve'}</button>
                                                    <button onClick={() => handleReject(item.courseId, item.userId)} disabled={busyId === `${item.courseId}:${item.userId}`} className="rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-100">Reject</button>
                                                </div>
                                            </li>
                                        ))}
                                </ul>
                            ) : (
                                <p className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-400">No pending requests.</p>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <h2 className="text-lg font-semibold text-white">All users</h2>
                            {users.length ? users.map((user) => {
                                const userEnrollments = enrollmentByUser.get(user.uid) ?? []

                                return (
                                    <div key={user.uid} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
                                        <div>
                                            <div className="font-semibold text-white">{user.displayName}</div>
                                            <div className="text-sm text-slate-400">{user.email}</div>
                                        </div>

                                        <div className="flex items-center gap-2 overflow-x-auto">
                                            {courses.map((c) => {
                                                const enrollment = userEnrollments.find((ue) => ue.courseId === c.id) ?? null
                                                const status = enrollment?.status ?? 'none'
                                                const short = c.title.length > 18 ? `${c.title.slice(0, 15)}…` : c.title

                                                return (
                                                    <div key={c.id} className="flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium" style={{ background: status === 'approved' ? 'rgba(16,185,129,0.08)' : status === 'pending' ? 'rgba(245,158,11,0.06)' : 'rgba(148,163,184,0.02)' }}>
                                                        <span className={`${status === 'approved' ? 'text-emerald-300' : status === 'pending' ? 'text-amber-300' : 'text-slate-400'}`}>{status === 'approved' ? '✓' : status === 'pending' ? '…' : '—'}</span>
                                                        <span className="text-slate-200">{short}</span>
                                                        {status === 'approved' ? (
                                                            <button onClick={() => handleRevoke(c.id, user.uid)} disabled={busyId === `${c.id}:${user.uid}`} className="ml-2 text-rose-200 text-[10px]">Revoke</button>
                                                        ) : (
                                                            <button onClick={() => handleApprove(c.id, user.uid)} disabled={busyId === `${c.id}:${user.uid}`} className="ml-2 text-cyan-200 text-[10px]">Grant</button>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )
                            }) : (
                                <p className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-400">No users found.</p>
                            )}
                        </div>
                    )}
                </div>
            </section>
        </main>
    )
}
