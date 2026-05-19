import { useCallback, useEffect, useMemo, useState } from 'react'
import { loadCourseTree, loadPublishedCourses } from '../api/courses'
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

export function StudentCourseViewer() {
    const [courses, setCourses] = useState<CourseRecord[]>([])
    const [tree, setTree] = useState<CourseTree>({ course: null, sections: [] })
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
    const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
    const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [selectedCourseLoadingId, setSelectedCourseLoadingId] = useState<string | null>(null)
    const [error, setError] = useState('')

    const selectedCourse = useMemo(() => tree.course, [tree.course])
    const selectedSection = useMemo(
        () => tree.sections.find((section) => section.id === selectedSectionId) ?? null,
        [selectedSectionId, tree.sections],
    )
    const selectedLesson = useMemo(
        () => selectedSection?.lessons.find((lesson) => lesson.id === selectedLessonId) ?? null,
        [selectedLessonId, selectedSection],
    )

    const lessonCount = useMemo(
        () => tree.sections.reduce((total, section) => total + section.lessons.length, 0),
        [tree.sections],
    )
    const initialLoading = loading && !courses.length && !tree.course

    const loadViewer = useCallback(async (preferredCourseId?: string | null, options?: { reloadCourses?: boolean; showLoading?: boolean }) => {
        const { reloadCourses = true, showLoading = true } = options ?? {}

        if (showLoading) {
            setLoading(true)
        }
        setError('')

        try {
            const nextCourses = reloadCourses ? await loadPublishedCourses() : courses

            if (reloadCourses) {
                setCourses(nextCourses)
            }

            const nextCourseId = preferredCourseId && nextCourses.some((course) => course.id === preferredCourseId)
                ? preferredCourseId
                : nextCourses[0]?.id ?? null

            setSelectedCourseId(nextCourseId)

            if (!nextCourseId) {
                setTree({ course: null, sections: [] })
                setSelectedSectionId(null)
                setSelectedLessonId(null)
                return
            }

            const nextTree = await loadCourseTree(nextCourseId)
            if (!nextTree) {
                setTree({ course: null, sections: [] })
                setSelectedSectionId(null)
                setSelectedLessonId(null)
                return
            }

            setTree({
                course: {
                    id: nextTree.id,
                    title: nextTree.title,
                    slug: nextTree.slug,
                    description: nextTree.description,
                    category: nextTree.category,
                    level: nextTree.level,
                    status: nextTree.status,
                    thumbnailURL: nextTree.thumbnailURL,
                    thumbnailPath: nextTree.thumbnailPath,
                    createdBy: nextTree.createdBy,
                    createdAt: nextTree.createdAt,
                    updatedAt: nextTree.updatedAt,
                },
                sections: nextTree.sections,
            })

            const firstSection = nextTree.sections[0] ?? null
            const firstLesson = firstSection?.lessons[0] ?? null
            setSelectedSectionId(firstSection?.id ?? null)
            setSelectedLessonId(firstLesson?.id ?? null)
        } catch (viewerError) {
            const firebaseError = viewerError as { message?: string }
            setError(firebaseError.message || 'Failed to load courses.')
        } finally {
            if (showLoading) {
                setLoading(false)
            }
            setSelectedCourseLoadingId(null)
        }
    }, [courses])

    useEffect(() => {
        void loadViewer(undefined, { reloadCourses: true, showLoading: true })
    }, [loadViewer])

    const handleCourseSelect = useCallback((courseId: string) => {
        setSelectedCourseId(courseId)
        setSelectedSectionId(null)
        setSelectedLessonId(null)
        setSelectedCourseLoadingId(courseId)
        void loadViewer(courseId, { reloadCourses: false, showLoading: false })
    }, [loadViewer])

    const handleSectionSelect = useCallback((sectionId: string) => {
        const section = tree.sections.find((item) => item.id === sectionId)
        setSelectedSectionId(sectionId)
        setSelectedLessonId(section?.lessons[0]?.id ?? null)
    }, [tree.sections])

    const handleLessonSelect = useCallback((lessonId: string) => {
        setSelectedLessonId(lessonId)
    }, [])

    if (initialLoading) {
        return (
            <section className="student-viewer student-viewer--loading">
                <div className="course-studio-card">
                    <span className="card-kicker">Learning space</span>
                    <h2>Loading courses…</h2>
                    <p>Fetching published courses and lesson trees.</p>
                </div>
            </section>
        )
    }

    return (
        <section className="student-viewer">
            {loading ? (
                <div className="mb-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100">
                    Loading course content…
                </div>
            ) : null}
            <header className="student-viewer__hero">
                <div>
                    <span className="eyebrow">Learning space</span>
                    <h2>Choose a course and start learning</h2>
                    <p>
                        Only published courses are visible here. Pick a section, then open a lesson to watch the video
                        and read notes.
                    </p>
                </div>

                <div className="student-viewer__stats">
                    <article>
                        <strong>{courses.length}</strong>
                        <span>Published courses</span>
                    </article>
                    <article>
                        <strong>{tree.sections.length}</strong>
                        <span>Sections</span>
                    </article>
                    <article>
                        <strong>{lessonCount}</strong>
                        <span>Lessons</span>
                    </article>
                </div>
            </header>

            {error ? <p className="form-feedback form-feedback--error">{error}</p> : null}

            {!courses.length ? (
                <article className="course-studio-card">
                    <span className="card-kicker">No published courses</span>
                    <h2>Nothing is live yet</h2>
                    <p>Ask an admin to publish a course and it will appear here automatically.</p>
                </article>
            ) : (
                <div className="student-viewer__layout">
                    <aside className="student-course-list course-studio-card">
                        <div className="panel-heading">
                            <div>
                                <span className="card-kicker">Courses</span>
                                <h3>Published catalog</h3>
                            </div>
                        </div>

                        <div className="student-list">
                            {courses.map((course) => (
                                <button
                                    key={course.id}
                                    type="button"
                                    className={course.id === selectedCourseId ? 'student-list__item active' : 'student-list__item'}
                                    onClick={() => handleCourseSelect(course.id)}
                                    disabled={selectedCourseLoadingId !== null && selectedCourseLoadingId !== course.id}
                                    aria-busy={selectedCourseLoadingId === course.id}
                                >
                                    <span className="flex items-center gap-2">
                                        {selectedCourseLoadingId === course.id ? (
                                            <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />
                                        ) : null}
                                        <span>{course.title}</span>
                                    </span>
                                    <small>{course.category || course.level || 'Course'}</small>
                                </button>
                            ))}
                        </div>
                    </aside>

                    <div className="student-content">
                        <section className="course-studio-card student-course-hero">
                            <div className="student-course-hero__copy">
                                <span className="card-kicker">Course</span>
                                <h3>{selectedCourse?.title || 'Select a course'}</h3>
                                <p>{selectedCourse?.description || 'Choose a course from the catalog to see sections and lessons.'}</p>
                                <div className="preview-meta">
                                    <span>{selectedCourse?.category || 'Category'}</span>
                                    <span>{selectedCourse?.level || 'Level'}</span>
                                    <span>{selectedCourse?.status || 'published'}</span>
                                </div>
                            </div>

                            <div className="thumbnail-preview thumbnail-preview--small">
                                {selectedCourse?.thumbnailURL ? (
                                    <img src={selectedCourse.thumbnailURL} alt={selectedCourse.title} />
                                ) : (
                                    <div>
                                        <strong>No thumbnail</strong>
                                        <span>This course has no cover image yet.</span>
                                    </div>
                                )}
                            </div>
                        </section>

                        <section className="student-sections">
                            <div className="course-studio-card">
                                <div className="panel-heading">
                                    <div>
                                        <span className="card-kicker">Sections</span>
                                        <h3>Course structure</h3>
                                    </div>
                                </div>

                                <div className="student-section-list">
                                    {tree.sections.map((section) => (
                                        <div key={section.id} className="student-section">
                                            <button
                                                type="button"
                                                className={section.id === selectedSectionId ? 'student-section__header active' : 'student-section__header'}
                                                onClick={() => handleSectionSelect(section.id)}
                                            >
                                                <div>
                                                    <strong>{section.title}</strong>
                                                    <span>{section.description || 'Section overview'}</span>
                                                </div>
                                                <small>{section.lessons.length} lessons</small>
                                            </button>

                                            {section.id === selectedSectionId ? (
                                                <div className="student-lesson-list">
                                                    {section.lessons.map((lesson) => (
                                                        <button
                                                            key={lesson.id}
                                                            type="button"
                                                            className={lesson.id === selectedLessonId ? 'student-lesson active' : 'student-lesson'}
                                                            onClick={() => handleLessonSelect(lesson.id)}
                                                        >
                                                            <span>{lesson.title}</span>
                                                            <small>{lesson.youtubeVideoId || 'Lesson'}</small>
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : null}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <article className="course-studio-card student-lesson-view">
                                <span className="card-kicker">Lesson</span>
                                <h3>{selectedLesson?.title || 'Select a lesson'}</h3>
                                {youtubeEmbedUrl(selectedLesson?.youtubeVideoId) ? (
                                    <div className="video-frame">
                                        <iframe
                                            src={youtubeEmbedUrl(selectedLesson?.youtubeVideoId) ?? undefined}
                                            title={selectedLesson?.title || 'Lesson video'}
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        />
                                    </div>
                                ) : null}

                                <div className="space-y-2">
                                    <span className="card-kicker">Notes</span>
                                    {selectedLesson?.notesTitle ? (
                                        <h4 className="text-cyan-100">{selectedLesson.notesTitle}</h4>
                                    ) : null}
                                    <p>{selectedLesson?.notes || 'Open a lesson to view notes and video playback.'}</p>
                                </div>

                                {selectedLesson?.resourceLinks.length ? (
                                    <div className="space-y-2 border-t border-slate-800 pt-5">
                                        <span className="card-kicker">Links</span>
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
                        </section>
                    </div>
                </div>
            )}
        </section>
    )
}
