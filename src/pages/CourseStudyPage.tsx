import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
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
import SiteHeader from '../components/SiteHeader'
import { ChevronDown } from 'lucide-react'
import type { CourseRecord, LessonRecord, SectionRecord } from '../types/course'

type CourseTree = {
    course: CourseRecord | null
    sections: Array<SectionRecord & { lessons: LessonRecord[] }>
}

function youtubeEmbedUrl(videoId?: string | null) {
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null
}

function LinkGlyph() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 shrink-0">
            <path
                fill="currentColor"
                d="M10.59 13.41a1 1 0 0 0 1.41 0l2.59-2.59a3 3 0 0 0-4.24-4.24L8 9.53a1 1 0 1 0 1.41 1.41l2.35-2.35a1 1 0 1 1 1.41 1.41l-2.59 2.59a1 1 0 0 0 0 1.41Zm2.82-2.82a1 1 0 0 0-1.41 0l-2.59 2.59a3 3 0 1 0 4.24 4.24l1.94-1.94a1 1 0 1 0-1.41-1.41l-1.94 1.94a1 1 0 1 1-1.41-1.41l2.59-2.59a1 1 0 0 0 0-1.41Z"
            />
        </svg>
    )
}

function CheckGlyph() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 shrink-0 text-emerald-300">
            <path fill="currentColor" d="M9.2 16.2 4.9 11.9l1.4-1.4 2.9 2.9 8.5-8.5 1.4 1.4-9.9 9.9Z" />
        </svg>
    )
}

export function CourseStudyPage() {
    const { courseId } = useParams()
    const { logout, profile } = useAuth()
    const isAdmin = useMemo(() => profile?.role === 'admin', [profile?.role])
    const [course, setCourse] = useState<CourseRecord | null>(null)
    const [tree, setTree] = useState<CourseTree>({ course: null, sections: [] })
    const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
    const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)
    const [openSectionIds, setOpenSectionIds] = useState<string[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [enrollmentSavingId, setEnrollmentSavingId] = useState('')
    const [error, setError] = useState('')
    const [hasAccess, setHasAccess] = useState(false)
    const [enrollmentStatus, setEnrollmentStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null)
    const [enrollments, setEnrollments] = useState<Array<{ id: string; courseId: string; userId: string; displayName?: string | null; email?: string | null }>>([])
    const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([])

    const completedLessonIdSet = useMemo(() => new Set(completedLessonIds), [completedLessonIds])
    const openSectionIdSet = useMemo(() => new Set(openSectionIds), [openSectionIds])
    const selectedSection = useMemo(
        () => tree.sections.find((section) => section.id === selectedSectionId) ?? null,
        [selectedSectionId, tree.sections],
    )
    const selectedLesson = useMemo(
        () => selectedSection?.lessons.find((lesson) => lesson.id === selectedLessonId) ?? null,
        [selectedLessonId, selectedSection],
    )
    const selectedLessonCompleted = selectedLesson ? completedLessonIdSet.has(selectedLesson.id) : false
    const lessonCount = useMemo(
        () => tree.sections.reduce((total, section) => total + section.lessons.length, 0),
        [tree.sections],
    )
    const initialLoading = loading && !course && !tree.sections.length

    const completionPercent = useMemo(() => {
        if (lessonCount === 0) return 0
        return Math.round((completedLessonIds.length / lessonCount) * 100)
    }, [completedLessonIds.length, lessonCount])

    const canAccess = isAdmin || hasAccess

    const loadStudy = useCallback(async () => {
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
                setOpenSectionIds([])
                return
            }

            const enrollment = profile ? await loadEnrollment(courseId, profile.uid) : null
            setEnrollmentStatus(enrollment?.status ?? null)
            const permitted = isAdmin || enrollment?.status === 'approved'
            setHasAccess(permitted)

            if (!permitted) {
                setTree({ course: nextCourse, sections: [] })
                setSelectedSectionId(null)
                setSelectedLessonId(null)
                setOpenSectionIds([])
                return
            }

            const nextTree = await loadCourseTree(courseId)
            if (!nextTree) {
                setTree({ course: nextCourse, sections: [] })
                setOpenSectionIds([])
                return
            }

            setTree({ course: nextCourse, sections: nextTree.sections })

            const nextSection = nextTree.sections[0] ?? null
            const nextLesson = nextSection?.lessons[0] ?? null
            setSelectedSectionId(nextSection?.id ?? null)
            setSelectedLessonId(nextLesson?.id ?? null)
            setOpenSectionIds(nextSection?.id ? [nextSection.id] : [])

            if (isAdmin) {
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
    }, [courseId, isAdmin, profile?.uid])

    useEffect(() => {
        void loadStudy()
    }, [loadStudy])

    const handleRequestAccess = useCallback(async () => {
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
    }, [courseId, loadStudy, profile])

    const handleCancelRequest = useCallback(async () => {
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
    }, [courseId, loadStudy, profile])

    const handleRemoveEnrollment = useCallback(async (userId: string) => {
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
    }, [courseId])

    const handleToggleLessonProgress = useCallback(async () => {
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
    }, [courseId, profile, selectedLesson, selectedLessonCompleted])

    const handleToggleSection = useCallback(
        (section: SectionRecord & { lessons: LessonRecord[] }) => {
            const wasOpen = openSectionIdSet.has(section.id)

            setOpenSectionIds((current) =>
                current.includes(section.id) ? current.filter((id) => id !== section.id) : [...current, section.id],
            )

            if (!wasOpen) {
                setSelectedSectionId(section.id)
                setSelectedLessonId(section.lessons[0]?.id ?? null)
            }
        },
        [openSectionIdSet],
    )

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100">
            <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
                {initialLoading ? (
                    <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
                        Loading course…
                    </div>
                ) : loading ? (
                    <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
                        Loading course content…
                    </div>
                ) : null}
                <SiteHeader profile={profile} onLogout={logout} />

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
                                            onClick={() => handleToggleSection(section)}
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
                                            <div className="flex items-center gap-3">
                                                <small className="text-xs uppercase tracking-[0.24em] text-slate-400">
                                                    {section.lessons.length} lessons
                                                </small>
                                                <ChevronDown
                                                    className={`h-4 w-4 text-slate-400 transition ${openSectionIdSet.has(section.id) ? 'rotate-180 text-cyan-300' : ''}`}
                                                />
                                            </div>
                                        </button>

                                        {openSectionIdSet.has(section.id) ? (
                                            <div className="space-y-2 pl-4">
                                                {section.lessons.map((lesson, lessonIndex) => (
                                                    <button
                                                        key={lesson.id}
                                                        type="button"
                                                        onClick={() => setSelectedLessonId(lesson.id)}
                                                        className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${lesson.id === selectedLessonId
                                                            ? 'border-indigo-400/40 bg-indigo-400/10 text-white'
                                                            : 'border-slate-800 bg-slate-950/70 text-slate-100 hover:border-slate-700'
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <span className="w-8 text-xs font-semibold text-slate-400">{lessonIndex + 1}.</span>
                                                            <span className="font-medium text-white">{lesson.title}</span>
                                                        </div>
                                                        <small className="text-xs uppercase tracking-[0.24em] text-slate-500">
                                                            {completedLessonIdSet.has(lesson.id) ? (
                                                                <span className="inline-flex items-center gap-2 text-emerald-300" aria-label="Completed" title="Completed">
                                                                    <CheckGlyph />
                                                                </span>
                                                            ) : (
                                                                ''
                                                            )}
                                                        </small>
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
                                    <span className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300">Notes</span>
                                    {selectedLesson?.notesTitle ? (
                                        <h3 className="text-lg font-semibold text-cyan-100">{selectedLesson.notesTitle}</h3>
                                    ) : null}
                                    <p className="max-w-3xl text-sm leading-7 text-slate-300">
                                        {selectedLesson?.notes || 'Choose a lesson from the section list to see notes and video.'}
                                    </p>
                                </div>

                                {selectedLesson?.resourceLinks.length ? (
                                    <div className="mt-6 space-y-3 border-t border-slate-800 pt-5">
                                        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Links</div>
                                        <ul className="space-y-2 text-sm">
                                            {selectedLesson.resourceLinks.map((link) => (
                                                <li key={`${link.title}-${link.url}`}>
                                                    <a
                                                        href={link.url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-2 rounded-full border border-cyan-400/15 bg-cyan-400/8 px-3 py-2 text-cyan-200 transition hover:border-cyan-300/40 hover:bg-cyan-400/12 hover:text-cyan-100"
                                                    >
                                                        <LinkGlyph />
                                                        <span>{link.title || link.url}</span>
                                                    </a>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ) : null}
                            </article>

                            <div className="flex flex-wrap gap-3">
                                {!isAdmin && selectedLesson ? (
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

                        {isAdmin ? (
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
