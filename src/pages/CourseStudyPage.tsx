import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { loadCourseById, loadCourseTree } from '../api/courses'
import {
    cancelEnrollmentRequest,
    loadCourseEnrollments,
    loadEnrollment,
    removeEnrollment,
    requestEnrollment,
} from '../api/enrollments'
import { clearLessonProgress, loadLessonProgress, markLessonComplete } from '../api/lessonProgress'
import { useAuth } from '../context/AuthContext'
import type { CourseRecord, LessonRecord, SectionRecord } from '../types/course'

type CourseTree = {
    course: CourseRecord | null
    sections: Array<SectionRecord & { lessons: LessonRecord[] }>
}

function youtubeEmbedUrl(videoId?: string | null) {
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null
}

export function CourseStudyPage() {
    const { courseId } = useParams()
    const { logout, profile } = useAuth()
    const [course, setCourse] = useState<CourseRecord | null>(null)
    const [tree, setTree] = useState<CourseTree>({ course: null, sections: [] })
    const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
    const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [enrollmentSavingId, setEnrollmentSavingId] = useState('')
    const [error, setError] = useState('')
    const [hasAccess, setHasAccess] = useState(false)
    const [enrollmentStatus, setEnrollmentStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null)
    const [enrollments, setEnrollments] = useState<Array<{ id: string; courseId: string; userId: string; displayName?: string | null; email?: string | null }>>([])
    const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([])

    const selectedSection = tree.sections.find((section) => section.id === selectedSectionId) ?? null
    const selectedLesson = selectedSection?.lessons.find((lesson) => lesson.id === selectedLessonId) ?? null
    const selectedLessonCompleted = selectedLesson ? completedLessonIds.includes(selectedLesson.id) : false
    const lessonCount = useMemo(
        () => tree.sections.reduce((total, section) => total + section.lessons.length, 0),
        [tree.sections],
    )
    const initialLoading = loading && !course && !tree.sections.length

    const completionPercent = useMemo(() => {
        if (lessonCount === 0) return 0
        return Math.round((completedLessonIds.length / lessonCount) * 100)
    }, [completedLessonIds.length, lessonCount])

    const canAccess = profile?.role === 'admin' || hasAccess

    const loadStudy = async () => {
        if (!courseId) {
            setError('Missing course id.')
            setLoading(false)
            return
        }

        setLoading(true)
        setError('')

        try {
            const nextCourse = await loadCourseById(courseId)
            setCourse(nextCourse)

            if (!nextCourse) {
                setTree({ course: null, sections: [] })
                setHasAccess(false)
                return
            }

            const enrollment = profile ? await loadEnrollment(courseId, profile.uid) : null
            setEnrollmentStatus(enrollment?.status ?? null)
            const permitted = profile?.role === 'admin' || enrollment?.status === 'approved'
            setHasAccess(permitted)

            if (!permitted) {
                setTree({ course: nextCourse, sections: [] })
                setSelectedSectionId(null)
                setSelectedLessonId(null)
                return
            }

            const nextTree = await loadCourseTree(courseId)
            if (!nextTree) {
                setTree({ course: nextCourse, sections: [] })
                return
            }

            setTree({ course: nextCourse, sections: nextTree.sections })

            const nextSection = nextTree.sections[0] ?? null
            const nextLesson = nextSection?.lessons[0] ?? null
            setSelectedSectionId(nextSection?.id ?? null)
            setSelectedLessonId(nextLesson?.id ?? null)

            if (profile?.role === 'admin') {
                setEnrollments(await loadCourseEnrollments(courseId))
            } else if (profile) {
                const lessonIds = nextTree.sections.flatMap((section) => section.lessons.map((lesson) => lesson.id))
                const completionFlags = await Promise.all(
                    lessonIds.map(async (lessonId) => [lessonId, await loadLessonProgress(courseId, profile.uid, lessonId)] as const),
                )
                setCompletedLessonIds(completionFlags.filter(([, completed]) => completed).map(([lessonId]) => lessonId))
            }
        } catch (studyError) {
            const firebaseError = studyError as { message?: string }
            setError(firebaseError.message || 'Failed to load the course.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        void loadStudy()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [courseId, profile?.uid])

    const handleRequestAccess = async () => {
        if (!profile || !courseId) return

        setSaving(true)
        setError('')

        try {
            await requestEnrollment(courseId, profile.uid, profile.displayName, profile.email)
            await loadStudy()
        } catch (enrollError) {
            const firebaseError = enrollError as { message?: string }
            setError(firebaseError.message || 'Failed to send request.')
        } finally {
            setSaving(false)
        }
    }

    const handleCancelRequest = async () => {
        if (!profile || !courseId) return

        setSaving(true)
        setError('')

        try {
            await cancelEnrollmentRequest(courseId, profile.uid)
            setEnrollmentStatus(null)
            setHasAccess(false)
            await loadStudy()
        } catch (cancelError) {
            const firebaseError = cancelError as { message?: string }
            setError(firebaseError.message || 'Failed to cancel request.')
        } finally {
            setSaving(false)
        }
    }

    const handleRemoveEnrollment = async (userId: string) => {
        if (!courseId || !window.confirm('Remove this enrollment?')) return

        setEnrollmentSavingId(userId)
        setError('')

        try {
            await removeEnrollment(courseId, userId)
            setEnrollments((current) => current.filter((item) => item.userId !== userId))
        } catch (removeError) {
            const firebaseError = removeError as { message?: string }
            setError(firebaseError.message || 'Failed to remove enrollment.')
        } finally {
            setEnrollmentSavingId('')
        }
    }

    const handleToggleLessonProgress = async () => {
        if (!courseId || !profile || !selectedLesson) return

        setSaving(true)
        setError('')

        try {
            if (selectedLessonCompleted) {
                await clearLessonProgress(courseId, profile.uid, selectedLesson.id)
                setCompletedLessonIds((current) => current.filter((lessonId) => lessonId !== selectedLesson.id))
            } else {
                await markLessonComplete(courseId, profile.uid, selectedLesson.id)
                setCompletedLessonIds((current) => [...current, selectedLesson.id])
            }
        } catch (progressError) {
            const firebaseError = progressError as { message?: string }
            setError(firebaseError.message || 'Failed to update lesson progress.')
        } finally {
            setSaving(false)
        }
    }

    if (initialLoading) {
        return (
            <main className="min-h-screen bg-slate-950 text-slate-100">
                <section className="mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-4 py-8">
                    <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 text-center shadow-2xl shadow-black/30">
                        <div className="text-xs uppercase tracking-[0.3em] text-cyan-300">Learning space</div>
                        <h1 className="mt-3 text-3xl font-semibold text-white">Loading course…</h1>
                        <p className="mt-3 text-sm leading-7 text-slate-400">Fetching course details and access state.</p>
                    </div>
                </section>
            </main>
        )
    }

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100">
            <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
                {loading ? (
                    <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
                        Loading course content…
                    </div>
                ) : null}
                <header className="rounded-3xl border border-slate-800/80 bg-slate-900/80 p-5 shadow-2xl shadow-black/30 backdrop-blur xl:p-6">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-2">
                            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">
                                Course study
                            </span>
                            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                                {course?.title || 'Course not found'}
                            </h1>
                            <p className="max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                                {course?.description || 'This course is not available right now.'}
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:flex-row sm:items-center">
                            {profile?.role === 'admin' ? (
                                <Link
                                    to="/admin"
                                    className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-medium text-slate-100 transition hover:-translate-y-0.5 hover:border-cyan-400/60 hover:text-white"
                                >
                                    Admin studio
                                </Link>
                            ) : null}

                            <Link
                                to="/learn"
                                className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-medium text-slate-100 transition hover:-translate-y-0.5 hover:border-cyan-400/60 hover:text-white"
                            >
                                Back to catalog
                            </Link>
                            <button
                                type="button"
                                onClick={logout}
                                className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-medium text-slate-100 transition hover:-translate-y-0.5 hover:border-cyan-400/60 hover:text-white"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </header>

                {error ? (
                    <p className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                        {error}
                    </p>
                ) : null}

                <section className="grid gap-4 sm:grid-cols-3">
                    <article className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/20">
                        <div className="text-xs uppercase tracking-[0.24em] text-cyan-300">Status</div>
                        <div className="mt-3 text-3xl font-semibold text-white">{course?.status || 'published'}</div>
                        <p className="mt-2 text-sm text-slate-400">Live course availability.</p>
                    </article>
                    <article className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/20">
                        <div className="text-xs uppercase tracking-[0.24em] text-cyan-300">Sections</div>
                        <div className="mt-3 text-3xl font-semibold text-white">{tree.sections.length}</div>
                        <p className="mt-2 text-sm text-slate-400">Content groups in this course.</p>
                    </article>
                    <article className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/20">
                        <div className="text-xs uppercase tracking-[0.24em] text-cyan-300">Lessons</div>
                        <div className="mt-3 text-3xl font-semibold text-white">{lessonCount}</div>
                        <p className="mt-2 text-sm text-slate-400">Total lessons available to study.</p>
                    </article>
                </section>

                {course && !canAccess ? (
                    <section className="grid gap-6 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-black/20 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
                        <div className="space-y-3">
                            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">
                                Enrollment request
                            </span>
                            <h2 className="text-2xl font-semibold text-white">Request access to continue</h2>
                            <p className="max-w-2xl text-sm leading-7 text-slate-300">
                                This course is published, but your account has not been approved yet. Send a request and an admin
                                will approve or reject it.
                            </p>
                            <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                                <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1">
                                    {enrollmentStatus || 'no request'}
                                </span>
                            </div>
                        </div>

                        <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Course access</div>
                                    <div className="mt-1 text-lg font-semibold text-white">{course.title}</div>
                                </div>
                                {enrollmentStatus === 'pending' ? (
                                    <button
                                        type="button"
                                        onClick={handleCancelRequest}
                                        disabled={saving}
                                        className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-100 transition hover:-translate-y-0.5 hover:border-rose-400/40 disabled:cursor-wait disabled:opacity-60"
                                    >
                                        {saving ? 'Cancelling…' : 'Cancel request'}
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleRequestAccess}
                                        disabled={saving}
                                        className="rounded-2xl bg-gradient-to-r from-cyan-400 to-indigo-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:from-cyan-300 hover:to-indigo-300 disabled:cursor-wait disabled:opacity-60"
                                    >
                                        {saving ? 'Sending…' : enrollmentStatus === 'rejected' ? 'Request again' : 'Request access'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </section>
                ) : null}

                {course && canAccess ? (
                    <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
                        <aside className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-black/20">
                            <div className="space-y-2">
                                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">Sections</span>
                                <h2 className="text-2xl font-semibold text-white">Course structure</h2>
                            </div>

                            <div className="mt-5 space-y-3">
                                {tree.sections.map((section, sectionIndex) => (
                                    <div key={section.id} className="space-y-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedSectionId(section.id)
                                                setSelectedLessonId(section.lessons[0]?.id ?? null)
                                            }}
                                            className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${section.id === selectedSectionId
                                                ? 'border-cyan-400/40 bg-cyan-400/10 text-white'
                                                : 'border-slate-800 bg-slate-950/70 text-slate-100 hover:border-slate-700'
                                                }`}
                                        >
                                            <div>
                                                <div className="font-semibold text-white">{sectionIndex + 1}. {section.title}</div>
                                                <div className="text-sm text-slate-400">
                                                    {section.description || 'Section overview'}
                                                </div>
                                            </div>
                                            <small className="text-xs uppercase tracking-[0.24em] text-slate-400">
                                                {section.lessons.length} lessons
                                            </small>
                                        </button>

                                        {section.id === selectedSectionId ? (
                                            <div className="space-y-2 pl-4">
                                                {section.lessons.map((lesson, lessonIndex) => (
                                                    <button
                                                        key={lesson.id}
                                                        type="button"
                                                        onClick={() => setSelectedLessonId(lesson.id)}
                                                        className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${lesson.id === selectedLessonId
                                                            ? 'border-indigo-400/40 bg-indigo-400/10 text-white'
                                                            : completedLessonIds.includes(lesson.id)
                                                                ? 'border-emerald-400/25 bg-emerald-400/8 text-emerald-50 hover:border-emerald-300/40'
                                                                : 'border-slate-800 bg-slate-950/70 text-slate-100 hover:border-slate-700'
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <span className={`w-8 text-xs font-semibold ${completedLessonIds.includes(lesson.id) ? 'text-emerald-300' : 'text-slate-400'}`}>{lessonIndex + 1}.</span>
                                                            <span className={`font-medium ${completedLessonIds.includes(lesson.id) ? 'text-emerald-100' : 'text-white'}`}>{lesson.title}</span>
                                                        </div>
                                                        <small className={`text-xs uppercase tracking-[0.24em] ${completedLessonIds.includes(lesson.id) ? 'text-emerald-200' : 'text-slate-500'}`}>Open</small>
                                                    </button>
                                                ))}
                                            </div>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        </aside>

                        <section className="space-y-6">
                            <article className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-black/20">
                                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="space-y-3">
                                        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">
                                            Selected lesson
                                        </span>
                                        <h2 className="text-3xl font-semibold text-white">
                                            {selectedLesson?.title || 'Pick a lesson'}
                                        </h2>
                                        {selectedLesson?.resourceLinks.length ? (
                                            <div className="space-y-2">
                                                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Links</div>
                                                <ul className="space-y-1 text-sm">
                                                    {selectedLesson.resourceLinks.map((link) => (
                                                        <li key={`${link.title}-${link.url}`}>
                                                            <a href={link.url} target="_blank" rel="noreferrer" className="text-cyan-300 underline decoration-cyan-300/40 underline-offset-4">
                                                                {link.title || link.url}
                                                            </a>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ) : null}
                                        {lessonCount > 0 ? (
                                            <div className="mt-3 w-full max-w-md">
                                                <div className="mb-1 text-xs text-slate-400">Progress — {completionPercent}%</div>
                                                <div className="h-2 w-full rounded-full bg-slate-800">
                                                    <div className="h-2 rounded-full bg-emerald-400" style={{ width: `${completionPercent}%` }} />
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>

                                    <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                                        <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1">
                                            {selectedSection?.title || 'Section'}
                                        </span>
                                        <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1">
                                            {course.category || 'Category'}
                                        </span>
                                        <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1">
                                            {course.level || 'Level'}
                                        </span>
                                    </div>
                                </div>
                            </article>

                            <article className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/80 shadow-xl shadow-black/20">
                                {youtubeEmbedUrl(selectedLesson?.youtubeVideoId) ? (
                                    <div className="aspect-video w-full">
                                        <iframe
                                            src={youtubeEmbedUrl(selectedLesson?.youtubeVideoId) ?? undefined}
                                            title={selectedLesson?.title || 'Lesson video'}
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                            className="h-full w-full border-0"
                                        />
                                    </div>
                                ) : (
                                    <div className="flex min-h-[320px] items-center justify-center px-6 text-center text-slate-400">
                                        No video selected yet.
                                    </div>
                                )}
                            </article>

                            <article className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl shadow-black/20">
                                <div className="space-y-3">
                                    <span className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">
                                        Notes
                                    </span>
                                    {selectedLesson?.notesTitle ? (
                                        <h3 className="text-lg font-semibold text-cyan-100">{selectedLesson.notesTitle}</h3>
                                    ) : null}
                                    <p className="max-w-3xl text-sm leading-7 text-slate-300">
                                        {selectedLesson?.notes || 'Choose a lesson from the section list to see notes and video.'}
                                    </p>
                                </div>
                            </article>

                            <div className="flex flex-wrap gap-3">
                                {profile?.role !== 'admin' && selectedLesson ? (
                                    <button
                                        type="button"
                                        onClick={handleToggleLessonProgress}
                                        className="rounded-2xl bg-gradient-to-r from-cyan-400 to-indigo-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:from-cyan-300 hover:to-indigo-300"
                                    >
                                        {selectedLessonCompleted ? 'Mark incomplete' : 'Mark complete'}
                                    </button>
                                ) : null}
                            </div>
                        </section>

                        {profile?.role === 'admin' ? (
                            <aside className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl shadow-black/20 lg:col-span-2">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">
                                            Enrollment management
                                        </span>
                                        <h3 className="mt-2 text-2xl font-semibold text-white">Enrolled students</h3>
                                    </div>
                                    <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs uppercase tracking-[0.24em] text-slate-300">
                                        {enrollments.length} students
                                    </span>
                                </div>

                                <div className="mt-5 grid gap-3">
                                    {enrollments.length ? enrollments.map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:flex-row sm:items-center sm:justify-between"
                                        >
                                            <div>
                                                <div className="font-semibold text-white">
                                                    {item.displayName || item.email || item.userId}
                                                </div>
                                                <div className="text-sm text-slate-400">{item.email || item.userId}</div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => handleRemoveEnrollment(item.userId)}
                                                disabled={enrollmentSavingId === item.userId}
                                                className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-100 transition hover:-translate-y-0.5 hover:border-rose-400/40 disabled:cursor-wait disabled:opacity-60"
                                            >
                                                {enrollmentSavingId === item.userId ? 'Removing…' : 'Remove'}
                                            </button>
                                        </div>
                                    )) : (
                                        <p className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-400">
                                            No one is enrolled yet.
                                        </p>
                                    )}
                                </div>
                            </aside>
                        ) : null}
                    </div>
                ) : null}
            </section>
        </main>
    )
}
