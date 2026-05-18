import { useEffect, useMemo, useState } from 'react'
import { approveEnrollment, loadCourseEnrollments, rejectEnrollment, removeEnrollment } from '../api/enrollments'
import { loadAllUsers as loadUsers } from '../api/users'
import { loadAdminCourses } from '../api/courses'
import type { CourseRecord, EnrollmentRecord } from '../types/course'
import type { UserProfile } from '../types/auth'

export function AdminEnrollmentPanel() {
    const [courses, setCourses] = useState<CourseRecord[]>([])
    const [users, setUsers] = useState<UserProfile[]>([])
    const [enrollments, setEnrollments] = useState<EnrollmentRecord[]>([])
    const [courseId, setCourseId] = useState('')
    const [loading, setLoading] = useState(true)
    const [busyId, setBusyId] = useState('')
    const [error, setError] = useState('')


    const refresh = async (preferredCourseId?: string) => {
        setLoading(true)
        setError('')

        try {
            const [nextCourses, nextUsers] = await Promise.all([loadAdminCourses(), loadUsers()])
            setCourses(nextCourses)
            setUsers(nextUsers)

            const nextCourseId = preferredCourseId || courseId || nextCourses[0]?.id || ''
            setCourseId(nextCourseId)

            if (nextCourseId) {
                setEnrollments(await loadCourseEnrollments(nextCourseId))
            } else {
                setEnrollments([])
            }
        } catch (panelError) {
            const firebaseError = panelError as { message?: string }
            setError(firebaseError.message || 'Failed to load enrollment panel.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        void refresh()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const enrollmentByUser = useMemo(() => {
        return new Map(enrollments.map((item) => [item.userId, item]))
    }, [enrollments])

    const counts = useMemo(() => {
        return enrollments.reduce(
            (accumulator, item) => {
                accumulator[item.status] += 1
                return accumulator
            },
            { pending: 0, approved: 0, rejected: 0 },
        )
    }, [enrollments])

    const handleApprove = async (userId: string) => {
        if (!courseId) return

        setBusyId(userId)
        setError('')

        try {
            await approveEnrollment(courseId, userId)
            await refresh(courseId)
        } catch (actionError) {
            const firebaseError = actionError as { message?: string }
            setError(firebaseError.message || 'Failed to approve enrollment.')
        } finally {
            setBusyId('')
        }
    }

    const handleReject = async (userId: string) => {
        if (!courseId) return

        setBusyId(userId)
        setError('')

        try {
            await rejectEnrollment(courseId, userId)
            await refresh(courseId)
        } catch (actionError) {
            const firebaseError = actionError as { message?: string }
            setError(firebaseError.message || 'Failed to reject enrollment.')
        } finally {
            setBusyId('')
        }
    }

    const handleRemove = async (userId: string) => {
        if (!courseId || !window.confirm('Remove this user access/request?')) return

        setBusyId(userId)
        setError('')

        try {
            await removeEnrollment(courseId, userId)
            await refresh(courseId)
        } catch (actionError) {
            const firebaseError = actionError as { message?: string }
            setError(firebaseError.message || 'Failed to remove enrollment.')
        } finally {
            setBusyId('')
        }
    }

    if (loading) {
        return (
            <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-black/20">
                <div className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">Enrollment control</div>
                <p className="mt-3 text-sm text-slate-400">Loading users and requests…</p>
            </section>
        )
    }

    return (
        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-black/20">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <span className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">
                        Enrollment control
                    </span>
                    <h2 className="mt-2 text-2xl font-semibold text-white">Approve course access requests</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-400">
                        Choose a course, review every user, and approve or reject requests. Only approved users can open the
                        lesson tree.
                    </p>
                </div>

                <div className="min-w-[260px]">
                    <label className="grid gap-2 text-sm text-slate-300">
                        <span className="text-xs uppercase tracking-[0.24em] text-slate-400">Course</span>
                        <select
                            value={courseId}
                            onChange={(event) => {
                                setCourseId(event.target.value)
                                void refresh(event.target.value)
                            }}
                            className="rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/60"
                        >
                            {courses.map((course) => (
                                <option key={course.id} value={course.id}>
                                    {course.title}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>
            </div>

            {error ? <p className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</p> : null}

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <article className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
                    <div className="text-xs uppercase tracking-[0.24em] text-cyan-300">Pending</div>
                    <div className="mt-2 text-3xl font-semibold text-white">{counts.pending}</div>
                </article>
                <article className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
                    <div className="text-xs uppercase tracking-[0.24em] text-cyan-300">Approved</div>
                    <div className="mt-2 text-3xl font-semibold text-white">{counts.approved}</div>
                </article>
                <article className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
                    <div className="text-xs uppercase tracking-[0.24em] text-cyan-300">Rejected</div>
                    <div className="mt-2 text-3xl font-semibold text-white">{counts.rejected}</div>
                </article>
            </div>

            <div className="mt-6 grid gap-3">
                {users.length ? users.map((user) => {
                    const enrollment = enrollmentByUser.get(user.uid) ?? null
                    const status = enrollment?.status ?? 'none'

                    return (
                        <div
                            key={user.uid}
                            className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 lg:flex-row lg:items-center lg:justify-between"
                        >
                            <div>
                                <div className="font-semibold text-white">{user.displayName}</div>
                                <div className="text-sm text-slate-400">{user.email}</div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs uppercase tracking-[0.24em] text-slate-300">
                                        {user.role}
                                    </span>
                                    <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.24em] ${status === 'approved' ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100' : status === 'pending' ? 'border-amber-400/20 bg-amber-400/10 text-amber-100' : status === 'rejected' ? 'border-rose-400/20 bg-rose-400/10 text-rose-100' : 'border-slate-700 bg-slate-900 text-slate-300'}`}>
                                        {status}
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleApprove(user.uid)}
                                    disabled={busyId === user.uid}
                                    className="rounded-2xl bg-gradient-to-r from-cyan-400 to-indigo-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:from-cyan-300 hover:to-indigo-300 disabled:cursor-wait disabled:opacity-60"
                                >
                                    {busyId === user.uid && status !== 'approved' ? 'Working…' : status === 'approved' ? 'Approved' : 'Approve'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleReject(user.uid)}
                                    disabled={busyId === user.uid}
                                    className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-100 transition hover:-translate-y-0.5 hover:border-rose-400/40 disabled:cursor-wait disabled:opacity-60"
                                >
                                    Reject
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleRemove(user.uid)}
                                    disabled={busyId === user.uid}
                                    className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:-translate-y-0.5 hover:border-cyan-400/60 hover:text-white disabled:cursor-wait disabled:opacity-60"
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    )
                }) : (
                    <p className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-400">
                        No users found.
                    </p>
                )}
            </div>
        </section>
    )
}
