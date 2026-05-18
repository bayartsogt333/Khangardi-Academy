import { useEffect, useMemo, useState } from 'react'
import { loadCourseTree, loadPublishedCourses } from '../api/courses'
import type { CourseRecord, LessonRecord, SectionRecord } from '../types/course'

type CourseTree = {
    course: CourseRecord | null
    sections: Array<SectionRecord & { lessons: LessonRecord[] }>
}

function youtubeEmbedUrl(videoId?: string | null) {
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null
}

export function StudentCourseViewer() {
    const [courses, setCourses] = useState<CourseRecord[]>([])
    const [tree, setTree] = useState<CourseTree>({ course: null, sections: [] })
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
    const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
    const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const selectedCourse = tree.course
    const selectedSection = tree.sections.find((section) => section.id === selectedSectionId) ?? null
    const selectedLesson = selectedSection?.lessons.find((lesson) => lesson.id === selectedLessonId) ?? null

    const lessonCount = useMemo(
        () => tree.sections.reduce((total, section) => total + section.lessons.length, 0),
        [tree.sections],
    )

    const loadViewer = async (preferredCourseId?: string | null) => {
        setLoading(true)
        setError('')

        try {
            const nextCourses = await loadPublishedCourses()
            setCourses(nextCourses)

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
            setLoading(false)
        }
    }

    useEffect(() => {
        void loadViewer()
    }, [])

    useEffect(() => {
        if (!selectedCourseId) return

        void (async () => {
            try {
                const nextTree = await loadCourseTree(selectedCourseId)
                if (!nextTree) {
                    setTree({ course: null, sections: [] })
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

                const nextSection = nextTree.sections.find((section) => section.id === selectedSectionId) ?? nextTree.sections[0] ?? null
                const nextLesson = nextSection?.lessons.find((lesson) => lesson.id === selectedLessonId) ?? nextSection?.lessons[0] ?? null
                setSelectedSectionId(nextSection?.id ?? null)
                setSelectedLessonId(nextLesson?.id ?? null)
            } catch (viewerError) {
                const firebaseError = viewerError as { message?: string }
                setError(firebaseError.message || 'Failed to refresh course.')
            }
        })()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCourseId])

    const handleCourseSelect = (courseId: string) => {
        setSelectedCourseId(courseId)
        setSelectedSectionId(null)
        setSelectedLessonId(null)
        void loadViewer(courseId)
    }

    const handleSectionSelect = (sectionId: string) => {
        const section = tree.sections.find((item) => item.id === sectionId)
        setSelectedSectionId(sectionId)
        setSelectedLessonId(section?.lessons[0]?.id ?? null)
    }

    const handleLessonSelect = (lessonId: string) => {
        setSelectedLessonId(lessonId)
    }

    if (loading) {
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
                                >
                                    <span>{course.title}</span>
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
                                <p>{selectedLesson?.notes || 'Open a lesson to view notes and video playback.'}</p>

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
                            </article>
                        </section>
                    </div>
                </div>
            )}
        </section>
    )
}
